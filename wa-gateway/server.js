import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  proto
} from '@whiskeysockets/baileys';
import NodeCache from 'node-cache';
import { executeWMexQuery } from '@whiskeysockets/baileys/lib/Socket/mex.js';
import express from 'express';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'node:module';

import backupRouter, { setBackupService } from './src/routes/backupRoute.js';
import explorerRouter, { setExplorerSocketGetter } from './src/routes/chatExplorerRoute.js';
import { createBackupService } from './src/services/whatsappBackupService.js';
import messageStore from './src/store/messageStore.js';
import liveChatSessionService from './src/services/liveChatSessionService.js';
import { createReconnectScheduler, describeDisconnect, describeOutgoingStatus, describeOutgoingReceipt } from './src/services/connectionDiagnostics.js';
import { metadataCache, fetchParticipatingGroups } from './src/services/whatsappMetadataCache.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const require = createRequire(import.meta.url);
const baileysVersion = require('@whiskeysockets/baileys/package.json').version;

// Reduksi logging bising internal libsignal & auto-repair session ratchet desync
let isRepairingSessions = false;
function autoRepairCorruptedSessions(reason = 'Over 2000 messages into the future') {
  if (isRepairingSessions) return;
  isRepairingSessions = true;
  console.warn(`🚨 [Gateway Auto-Heal] Terdeteksi desinkronisasi Signal Protocol (${reason}). Membersihkan session ratchet rusak...`);
  try {
    const authDir = path.join(__dirname, 'auth_info_baileys');
    let deletedCount = 0;
    if (fs.existsSync(authDir)) {
      const files = fs.readdirSync(authDir);
      for (const file of files) {
        if ((file.startsWith('session-') || file.startsWith('sender-key-')) && file.endsWith('.json')) {
          try {
            fs.unlinkSync(path.join(authDir, file));
            deletedCount++;
          } catch (_) {}
        }
      }
    }
    msgRetryCounterCache.flushAll();
    console.log(`✅ [Gateway Auto-Heal] Berhasil membersihkan ${deletedCount} session files rusak. Kredensial login creds.json tetap aman.`);
  } catch (err) {
    console.error('❌ [Gateway Auto-Heal] Gagal membersihkan session:', err.message);
  } finally {
    setTimeout(() => {
      isRepairingSessions = false;
    }, 15000);
  }
}

const originalConsoleError = console.error;
console.error = function (...args) {
  const msg = typeof args[0] === 'string' ? args[0] : (args[0]?.message || '');
  const stack = typeof args[1] === 'string' ? args[1] : (args[0]?.stack || '');
  const fullText = `${msg} ${stack}`;

  if (
    fullText.includes('Over 2000 messages into the future') ||
    fullText.includes('Bad MAC')
  ) {
    autoRepairCorruptedSessions(fullText.includes('Over 2000') ? 'Over 2000 messages into the future' : 'Bad MAC');
    return; // Reduksi spam bising di console
  }

  if (
    fullText.includes('Failed to decrypt message with any known session')
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

const logger = pino({
  level: 'warn',
  serializers: { err: describeDisconnect },
  redact: { paths: ['creds', 'keys', 'session', 'node.content', 'node.attrs.jid'], remove: true },
  hooks: {
    logMethod(inputArgs, method) {
      const msg = inputArgs[0];
      const text = typeof msg === 'string' ? msg : (inputArgs[1] || msg?.msg || '');
      if (
        typeof text === 'string' &&
        (text.includes('dropping spoofed self-only protocolMessage') ||
         text.includes('failed to decrypt message'))
      ) {
        return; // Reduksi bising sinkronisasi peer multi-device internal WhatsApp
      }
      return method.apply(this, inputArgs);
    }
  }
});
let sock = null;
let isConnected = false;
let currentQr = null;
let currentQrDataUrl = null;
let currentQrUpdatedAt = null;
let connectionGeneration = 0;
let lastDisconnectInfo = null;
let protocolVersion = null;
let protocolSource = null;
const recentOutgoingStatuses = [];
// Caches untuk Signal Protocol retry & message keys (mencegah "Waiting for this message")
const msgRetryCounterCache = new NodeCache({ stdTTL: 7200, checkperiod: 120 });
const messageMediaCache = new NodeCache({ stdTTL: 7200, checkperiod: 120 });
const userDevicesCache = new NodeCache({ stdTTL: 7200, checkperiod: 120 });
const reconnectScheduler = createReconnectScheduler(() => connectToWhatsApp());

function scheduleReconnect(delay) {
  return reconnectScheduler.schedule(delay);
}

// Initialize backup service with socket getters
const backupService = createBackupService(() => sock, () => isConnected, messageStore);
setBackupService(backupService);
setExplorerSocketGetter(
  () => sock,
  () => isConnected,
  fetchSubscribedNewsletters,
  (id, msg) => messageMediaCache.set(id, msg)
);
liveChatSessionService.setSocketGetter(
  () => sock,
  () => isConnected,
  (id, msg) => messageMediaCache.set(id, msg)
);

function formatJid(target) {
  let cleaned = String(target || '').trim();
  if (!cleaned) return null;

  // 1. Jika target berakhiran @lid
  if (cleaned.endsWith('@lid')) {
    const user = cleaned.split('@')[0];
    // Proteksi: Jika user adalah nomor telepon Indonesia (misal 628... atau 08...),
    // itu BUKAN LID melainkan nomor HP yang salah diberi suffix @lid. Ubah ke @s.whatsapp.net!
    if ((user.startsWith('62') || user.startsWith('0')) && user.length >= 10 && user.length <= 13) {
      const num = user.startsWith('0') ? '62' + user.slice(1) : user;
      return `${num}@s.whatsapp.net`;
    }
    return cleaned;
  }

  // 2. Format resmi WhatsApp (@g.us, @newsletter)
  if (
    cleaned.endsWith('@g.us') ||
    cleaned.endsWith('@newsletter')
  ) {
    return cleaned;
  }

  // 3. Jika target adalah nomor telepon (@s.whatsapp.net), periksa apakah ada mapped LID sah.
  // Jika kontak ini mengobrol melalui sesi LID, balasan WAJIB dikirimkan ke LID aslinya!
  if (cleaned.endsWith('@s.whatsapp.net')) {
    const mappedLid = messageStore.resolvePhoneToLid(cleaned);
    if (mappedLid && mappedLid.endsWith('@lid') && !mappedLid.startsWith('628') && !mappedLid.startsWith('08')) {
      console.log(`🎯 [formatJid] Menggunakan sesi aktif LID ${mappedLid} untuk nomor ${cleaned}`);
      return mappedLid;
    }
    return cleaned;
  }

  // 4. Bersihkan karakter non-digit untuk nomor telepon biasa
  cleaned = cleaned.replace(/[^\d]/g, '');
  if (!cleaned) return null;

  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }

  // Cek jika nomor ini adalah digit LID murni (LID WhatsApp umumnya 15 digit dan BUKAN nomor HP Indonesia 628...)
  if (cleaned.length >= 14 && !cleaned.startsWith('628')) {
    return `${cleaned}@lid`;
  }

  const phoneJid = `${cleaned}@s.whatsapp.net`;
  const mappedLid = messageStore.resolvePhoneToLid(phoneJid);
  if (mappedLid && mappedLid.endsWith('@lid') && !mappedLid.startsWith('628') && !mappedLid.startsWith('08')) {
    console.log(`🎯 [formatJid] Menggunakan sesi aktif LID ${mappedLid} untuk nomor ${phoneJid}`);
    return mappedLid;
  }
  return phoneJid;
}

async function connectToWhatsApp() {
  if (isConnected) return;
  reconnectScheduler.cancel();
  const generation = ++connectionGeneration;
  const previousSocket = sock;
  sock = null;
  try {
    previousSocket?.end(new Error('Replacing inactive WhatsApp socket'));
    const authDir = path.join(__dirname, 'auth_info_baileys');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    if (generation !== connectionGeneration) return;

    // Restore the version lookup and browser/auth settings used before the
    // connection regression. Keep the installed legacy library pinned.
    const versionResult = await fetchLatestBaileysVersion();
    if (generation !== connectionGeneration) return;
    protocolVersion = versionResult.version;
    protocolSource = versionResult.isLatest ? 'latest-baileys' : 'bundled-fallback';
    console.log(`[WhatsApp] Runtime: Baileys ${baileysVersion}; protocol ${protocolVersion.join('.')}; source ${protocolSource}; linked_identity=${Boolean(state.creds.me?.id)}; registered=${Boolean(state.creds.registered)}`);
    if (versionResult.error) console.warn('[WhatsApp] Pencarian versi gagal:', versionResult.error.message);

    sock = makeWASocket({
      version: protocolVersion,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      printQRInTerminal: false,
      syncFullHistory: false, // Dinonaktifkan untuk mencegah lonjakan kuota Signal dan error 2000 messages
      shouldSyncHistoryMessage: () => false,
      msgRetryCounterCache,
      userDevicesCache,
      browser: ['SIGAP BPS Gateway', 'Chrome', '1.0.0'],
      getMessage: async (key) => {
        // 1. Cek dari messageMediaCache (exact proto.IMessage untuk Signal retry handshake)
        if (key?.id) {
          const cached = messageMediaCache.get(key.id);
          if (cached) {
            console.log(`🔑 [Baileys getMessage] Retry cache HIT untuk pesan ID: ${key.id}`);
            return cached;
          }
        }
        // 2. Cek dari messageStore lokal (memeriksa file remoteJid, canonical phone, dan mapped LID)
        if (key?.id) {
          const stored = messageStore.findMessageForRetry(key);
          if (stored) {
            console.log(`🔑 [Baileys getMessage] MessageStore HIT untuk pesan ID: ${key.id}`);
            return stored;
          }
        }
        // 3. Fallback proto Message kosong agar WhatsApp retry loop tidak deadlock
        return proto.Message.fromObject({});
      },
    });
    const connectionSocket = sock;
    const isCurrentSocket = () => generation === connectionGeneration && sock === connectionSocket;
    recentOutgoingStatuses.length = 0;
    const recordOutgoingStatus = (record) => {
      if (!isCurrentSocket() || !record || messageStore.isSelfJid(record.chat_id)) return;
      const previous = recentOutgoingStatuses.at(-1);
      if (previous && previous.message_id === record.message_id && previous.status === record.status &&
          previous.recipient_id === record.recipient_id && previous.error_code === record.error_code) return;
      const event = { ...record, at: new Date().toISOString() };
      recentOutgoingStatuses.push(event);
      if (recentOutgoingStatuses.length > 20) recentOutgoingStatuses.shift();
      console.log('[WhatsApp] Status kiriman:', JSON.stringify(event));
    };
    sock.ev.on('messages.update', (updates) => {
      for (const update of updates || []) recordOutgoingStatus(describeOutgoingStatus(update));
    });
    sock.ev.on('message-receipt.update', (updates) => {
      for (const update of updates || []) recordOutgoingStatus(describeOutgoingReceipt(update));
    });

    sock.ev.on('connection.update', async (update) => {
      if (!isCurrentSocket()) return;
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        isConnected = false;
        currentQr = qr;
        currentQrUpdatedAt = new Date().toISOString();
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 7 });
          if (!isCurrentSocket()) return;
          currentQrDataUrl = qrDataUrl;
        } catch (qrErr) {
          console.error('Gagal generate QR Data URL:', qrErr.message);
        }

        console.log('\n=============================================================');
        console.log('📸 SCAN QR CODE DI BAWAH MENGGUNAKAN WHATSAPP DI HP ANDA:');
        console.log('1. Buka aplikasi WhatsApp di HP');
        console.log('2. Buka Menu / Titik Tiga -> Perangkat Tertaut -> Tautkan Perangkat');
        console.log('3. Arahkan kamera ke QR Code berikut:');
        console.log('=============================================================\n');
        qrcode.generate(qr, { small: true });
        console.log('\nMenunggu scan (QR juga tersedia di Dashboard Admin)...');
      }

      if (connection === 'close') {
        isConnected = false;
        lastDisconnectInfo = { ...describeDisconnect(lastDisconnect?.error), at: new Date().toISOString() };
        const statusCode = lastDisconnectInfo.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.warn('[WhatsApp] Koneksi ditutup:', JSON.stringify(lastDisconnectInfo));

        if (shouldReconnect) {
          const delay = scheduleReconnect();
          console.log(`🔄 [WhatsApp] Menghubungkan ulang dalam ${delay / 1000} detik (percobaan ${reconnectScheduler.attempts})...`);
        } else {
          currentQr = null;
          currentQrDataUrl = null;
          console.log('❌ [WhatsApp] Sesi keluar (Logged out). Membersihkan data lokal sesi lama...');
          try {
            const lastSession = messageStore.getSessionInfo();
            const botPhone = lastSession?.phone || (sock?.user?.id ? sock.user.id.split(':')[0].split('@')[0] : null);
            messageStore.createSafetyBackup(botPhone);
            messageStore.clearLiveStore();
            liveChatSessionService.clearSessions();
            const authDir = path.join(__dirname, 'auth_info_baileys');
            if (fs.existsSync(authDir)) {
              fs.rmSync(authDir, { recursive: true, force: true });
              fs.mkdirSync(authDir, { recursive: true });
            }
          } catch (cleanErr) {
            console.warn('Catatan pembersihan sesi logout:', cleanErr.message);
          }
          console.log('❌ [WhatsApp] Sesi keluar (Logged out). Klik Ganti Nomor di dashboard atau reset sesi untuk scan ulang.');
        }
      } else if (connection === 'open') {
        reconnectScheduler.reset();
        lastDisconnectInfo = null;
        isConnected = true;
        currentQr = null;
        currentQrDataUrl = null;
        const senderNum = sock?.user?.id ? sock.user.id.split(':')[0].split('@')[0] : 'Aktif';

        // Cek apakah nomor yang terhubung berbeda dengan nomor bot sesi sebelumnya
        try {
          const lastSession = messageStore.getSessionInfo();
          if (lastSession?.phone && senderNum && senderNum !== 'Aktif' && lastSession.phone !== senderNum) {
            console.log(`⚠️  [Gateway] Nomor bot baru terhubung (${senderNum}) berbeda dari sesi sebelumnya (${lastSession.phone})!`);
            console.log('🛡️  [Gateway] Mengarsipkan dan mengosongkan riwayat lama agar tidak tercampur ke nomor baru...');
            messageStore.createSafetyBackup(lastSession.phone);
            messageStore.clearLiveStore();
            liveChatSessionService.clearSessions();
          }
          if (senderNum && senderNum !== 'Aktif') {
            messageStore.saveSessionInfo({
              phone: senderNum,
              phone_formatted: messageStore.formatPhoneNumber(senderNum),
              connected_at: new Date().toISOString(),
              status: 'CONNECTED'
            });
          }
        } catch (sessErr) {
          console.warn('Catatan verifikasi nomor sesi:', sessErr.message);
        }

        if (sock?.user?.id || sock?.user?.lid) {
          messageStore.setMyJid(sock.user.id, sock.user.lid);
        }
        console.log('\n=============================================================');
        console.log(`✅ [WhatsApp] GATEWAY BERHASIL TERHUBUNG!`);
        console.log(`📱 Nomor Bot: ${senderNum}`);
        console.log(`🚀 Siap melayani pengiriman rilis BPS dari backend SIGAP!`);
        console.log('=============================================================\n');

        setTimeout(async () => {
          if (!isCurrentSocket() || !isConnected) return;
          // Trigger App State resync
          try {
            console.log('🔄 [Gateway] Sinkronisasi App State WhatsApp...');
            await connectionSocket.resyncAppState(['critical_block', 'critical_unblock_low', 'regular_high', 'regular_low', 'regular'], false);
          } catch (e) {
            console.warn('Catatan resyncAppState:', e.message);
          }

        }, 2500);
      }
    });

    sock.ev.on('creds.update', () => {
      if (isCurrentSocket()) return saveCreds();
    });

    // Message store: capture all incoming & outgoing messages
    sock.ev.on('messages.upsert', (upsert) => {
      if (!isCurrentSocket()) return;
      console.log(`\n📩 [Gateway] Event messages.upsert: tipe=${upsert.type}, jumlah=${upsert.messages?.length || 0}`);
      for (const m of (upsert.messages || [])) {
        if (m.key?.id && m.message) {
          messageMediaCache.set(m.key.id, m.message);
        }
        const jid = m.key?.remoteJid;
        const direction = m.key?.fromMe ? 'Keluar (dari HP/saya)' : 'Masuk (dari luar)';
        console.log(`   💬 [${direction}] Chat: ${jid} | ID: ${m.key?.id} | Nama: ${m.pushName || '-'}`);
      }
      try {
        messageStore.handleMessagesUpsert(upsert);

        // Auto-reply live chat sebelum admin ambil alih & tracking respon admin
        if (upsert.messages && Array.isArray(upsert.messages)) {
          for (const m of upsert.messages) {
            const rawJid = m.key?.remoteJid;
            if (!rawJid || messageStore.isSelfJid(rawJid)) {
              continue; // Abaikan pesan sync internal multi-device milik bot sendiri
            }
            if (m.key?.fromMe) {
              const text = m.message?.conversation ||
                m.message?.extendedTextMessage?.text ||
                m.message?.imageMessage?.caption ||
                '';
              if (liveChatSessionService.isAutomatedBotMessage(m)) {
                continue; // Abaikan pesan otomatis bot agar tidak dianggap sebagai balasan admin
              }
              if (!rawJid.endsWith('@g.us') && !rawJid.endsWith('@newsletter') && !rawJid.includes('@broadcast')) {
                liveChatSessionService.handleAdminMessageSent(rawJid, 'Admin PST', m.key?.id, text);
              }
            } else if (upsert.type === 'notify' || upsert.type === 'append') {
              liveChatSessionService.handleIncomingMessage(sock, m);
            }
          }
        }
      } catch (err) {
        console.error('❌ Error handling messages.upsert:', err);
      }
    });

    // Message store: capture history sync (initial bulk sync)
    sock.ev.on('messaging-history.set', (data) => {
      if (!isCurrentSocket()) return;
      console.log(`📥 [Gateway] Event messaging-history.set diterima!`);
      messageStore.handleHistorySync(data);
    });

    // Contacts tracking
    sock.ev.on('contacts.upsert', (contacts) => {
      if (!isCurrentSocket()) return;
      messageStore.handleContactsUpsert(contacts);
    });
    sock.ev.on('contacts.update', (contacts) => {
      if (!isCurrentSocket()) return;
      messageStore.handleContactsUpsert(contacts);
    });

    // Chats tracking (all 1-on-1 direct chats & groups)
    sock.ev.on('chats.upsert', (chats) => {
      if (!isCurrentSocket()) return;
      messageStore.handleChatsUpsert(chats);
    });
    sock.ev.on('chats.update', (updates) => {
      if (!isCurrentSocket()) return;
      messageStore.handleChatsUpsert(updates);
    });

    // Phone number share (mapping between LID and real phone number)
    sock.ev.on('chats.phoneNumberShare', (data) => {
      if (!isCurrentSocket()) return;
      console.log(`🔗 [Gateway] Nomor telepon dishare untuk LID: ${data.lid} -> ${data.jid}`);
      messageStore.handlePhoneNumberShare(data);
    });

  } catch (err) {
    if (generation !== connectionGeneration) return;
    console.error('Error saat inisialisasi Baileys:', err);
    scheduleReconnect();
  }
}

function getStatusResponse() {
  const rawPhone = sock?.user?.id ? sock.user.id.split(':')[0].split('@')[0] : null;
  let formattedPhone = null;
  if (rawPhone) {
    formattedPhone = rawPhone.startsWith('62')
      ? `+62 ${rawPhone.slice(2, 5)}-${rawPhone.slice(5, 9)}-${rawPhone.slice(9)}`
      : `+${rawPhone}`;
  }

  const actuallyConnected = Boolean(isConnected && rawPhone);

  return {
    name: 'SIGAP BPS WhatsApp Gateway (Baileys)',
    status: actuallyConnected ? 'CONNECTED' : (currentQr ? 'SCAN_QR' : 'DISCONNECTED'),
    runtime: { baileys_version: baileysVersion, protocol_version: protocolVersion, protocol_source: protocolSource },
    recent_outgoing_statuses: recentOutgoingStatuses.slice(),
    last_disconnect: lastDisconnectInfo,
    is_connected: actuallyConnected,
    phone: actuallyConnected ? rawPhone : null,
    phone_formatted: actuallyConnected ? formattedPhone : null,
    qr_waiting: !actuallyConnected && !!currentQr,
    qr_image: actuallyConnected ? null : currentQrDataUrl,
    qr_updated_at: currentQrUpdatedAt,
    instructions: actuallyConnected
      ? 'Gateway aktif dan siap digunakan.'
      : (currentQr ? 'Silakan scan QR code di Dashboard atau terminal HP.' : 'Sedang menghubungkan ke server WhatsApp...')
  };
}

// Endpoint status
app.all(['/', '/status', '/get-status'], (req, res) => {
  res.json(getStatusResponse());
});

// Endpoint: message store statistics
app.get('/message-stats', (req, res) => {
  try {
    const stats = messageStore.getMessageStats();
    res.json({ success: true, ...stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint untuk mereset sesi lama / ganti nomor WhatsApp bot
app.post(['/reset-session', '/logout', '/change-number'], async (req, res) => {
  try {
    console.log('\n🔄 [Gateway] Menerima permintaan reset sesi / ganti nomor WhatsApp bot...');
    
    // Ambil nomor bot yang sedang aktif sebelum terputus untuk penamaan arsip
    let botPhone = null;
    try {
      const lastSession = messageStore.getSessionInfo();
      botPhone = (sock?.user?.id ? sock.user.id.split(':')[0].split('@')[0] : null) || lastSession?.phone;
    } catch (e) {}

    isConnected = false;
    ++connectionGeneration;
    reconnectScheduler.reset();
    currentQr = null;
    currentQrDataUrl = null;

    const previousSocket = sock;
    sock = null;
    if (previousSocket) {
      try {
        await previousSocket.logout();
      } catch (logoutErr) {
        console.log('Catatan logout socket:', logoutErr.message);
      }
      try {
        previousSocket.end(new Error('Manual session reset requested'));
      } catch (endErr) {}
      sock = null;
    }

    // 1. Amankan riwayat pesan nomor saat ini ke arsip cadangan (ZIP)
    console.log('🛡️  [Gateway] Mengamankan riwayat obrolan nomor aktif ke arsip ZIP...');
    const backupName = messageStore.createSafetyBackup(botPhone);

    // 2. Bersihkan penyimpanan pesan, kontak, obrolan, dan sesi live agar nomor baru mulai bersih
    console.log('🧹 [Gateway] Mengosongkan data live percakapan & sesi...');
    messageStore.clearLiveStore();
    liveChatSessionService.clearSessions();

    // 3. Hapus kredensial sesi lama
    const authDir = path.join(__dirname, 'auth_info_baileys');
    if (fs.existsSync(authDir)) {
      console.log('🗑️  [Gateway] Menghapus kredensial sesi lama di:', authDir);
      fs.rmSync(authDir, { recursive: true, force: true });
      fs.mkdirSync(authDir, { recursive: true });
    }

    // Picu pembuatan koneksi baru untuk mendapatkan QR Code baru
    scheduleReconnect(1200);

    return res.json({
      success: true,
      message: 'Sesi WhatsApp berhasil direset. Silakan scan QR code baru.',
      backup_created: backupName || null,
      status: 'RESETTING'
    });
  } catch (err) {
    console.error('❌ [Gateway] Gagal mereset sesi:', err);
    return res.status(500).json({
      success: false,
      error: `Gagal mereset sesi: ${err.message}`
    });
  }
});

// Endpoint untuk membersihkan sesi Signal/ratchet yang korup (Bad MAC / 2000 messages) tanpa perlu logout (QR tetap aktif)
app.post(['/fix-sessions', '/clear-bad-sessions', '/api/whatsapp/clear-sessions'], async (req, res) => {
  try {
    console.log('\n🧹 [Gateway] Permintaan pembersihan sesi Signal corrupted...');
    const authDir = path.join(__dirname, 'auth_info_baileys');
    let deletedCount = 0;
    if (fs.existsSync(authDir)) {
      const files = fs.readdirSync(authDir);
      for (const file of files) {
        if ((file.startsWith('session-') || file.startsWith('sender-key-')) && file.endsWith('.json')) {
          try {
            fs.unlinkSync(path.join(authDir, file));
            deletedCount++;
          } catch (_) {}
        }
      }
    }
    msgRetryCounterCache.flushAll();
    console.log(`✅ [Gateway] Berhasil menghapus ${deletedCount} file session Signal. Sesi login creds tetap aman.`);

    // Reconnect socket secara mulus agar memory keystore cache dibersihkan
    if (sock && isConnected) {
      console.log('🔄 [Gateway] Merestart socket Baileys agar memory cache Signal bersih...');
      scheduleReconnect(1000);
      try {
        sock.end(new Error('Signal session cleanup requested'));
      } catch (_) {}
    }

    return res.json({
      success: true,
      message: `Berhasil membersihkan ${deletedCount} sesi kripto Signal yang rusak. Sesi login WhatsApp Anda tetap aman.`,
      deleted_sessions: deletedCount,
    });
  } catch (err) {
    console.error('❌ Gagal membersihkan sesi Signal:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Helper untuk mengambil daftar Saluran WhatsApp Resmi (@newsletter)
async function fetchSubscribedNewsletters(currentSock) {
  if (!currentSock?.query || !currentSock?.generateMessageTag) {
    return [];
  }
  return metadataCache.get(currentSock, 'newsletters', async () => {
    const raw = await executeWMexQuery(
      {},
      '6388546374527196',
      'xwa2_newsletter_subscribed',
      currentSock.query,
      currentSock.generateMessageTag
    );
    const channels = [];
    const list = Array.isArray(raw)
      ? raw
      : (raw?.newsletters || raw?.edges || raw?.nodes || []);

    for (const item of list) {
      const n = item?.node || item;
      if (n && n.id) {
        channels.push({
          id: n.id,
          name: n.name || n.thread_metadata?.name?.text || 'Saluran WhatsApp',
          type: 'channel',
          type_label: 'Saluran Resmi WhatsApp',
          is_channel: true,
          is_community: false,
          is_announce: true,
          member_count: n.subscribers || n.thread_metadata?.subscribers_count || 0,
          desc: n.description || n.thread_metadata?.description?.text || '',
          members: []
        });
      }
    }
    return channels;
  }, {
    ttlMs: 300000,
    fallback: [],
    onError: (error) => console.warn('[WhatsApp] Daftar saluran ditunda:', error.message),
  });
}

// Endpoint untuk mengambil daftar grup dan saluran WhatsApp aktif (untuk pemilihan target di Dashboard)
app.all(['/groups', '/get-groups', '/channels'], async (req, res) => {
  try {
    if (!isConnected || !sock) {
      return res.status(503).json({
        success: false,
        error: 'WhatsApp Gateway belum terhubung. Silakan scan QR code di terminal server terlebih dahulu.',
        groups: []
      });
    }

    console.log('📋 [Gateway] Mengambil daftar grup dan saluran WhatsApp yang diikuti bot...');
    const items = [];

    // 1. Ambil seluruh grup WhatsApp & Saluran Pengumuman Komunitas
    try {
      const rawGroups = await fetchParticipatingGroups(sock);
      for (const [id, g] of Object.entries(rawGroups)) {
        const participants = g.participants || [];
        const isAnnounce = Boolean(g.isCommunityAnnounce || g.announce);
        const isComm = Boolean(g.isCommunity);
        const type = isAnnounce ? 'channel' : (isComm ? 'community' : 'group');
        const typeLabel = isAnnounce
          ? 'Saluran Pengumuman Komunitas'
          : (isComm ? 'Komunitas WhatsApp' : 'Grup WhatsApp');

        items.push({
          id: id,
          name: g.subject || 'Grup Tanpa Nama',
          type: type,
          type_label: typeLabel,
          is_channel: isAnnounce,
          is_community: isComm,
          is_announce: Boolean(g.announce),
          member_count: participants.length,
          desc: g.desc ? g.desc.toString() : '',
          members: participants.map((p) => (p.id ? p.id.split('@')[0] : String(p)))
        });
      }
    } catch (grpErr) {
      console.warn('⚠️ [Gateway] Gagal mengambil rawGroups:', grpErr.message);
    }

    // 2. Ambil seluruh Saluran WhatsApp Resmi (Newsletters @newsletter)
    try {
      const newsletters = await fetchSubscribedNewsletters(sock);
      for (const ch of newsletters) {
        if (!items.some((it) => it.id === ch.id)) {
          items.push(ch);
        }
      }
    } catch (nlErr) {
      console.warn('⚠️ [Gateway] Catatan query newsletter:', nlErr.message);
    }

    // Urutkan: Saluran (channels) terlebih dahulu, lalu urutkan nama A-Z
    items.sort((a, b) => {
      if (a.is_channel && !b.is_channel) return -1;
      if (!a.is_channel && b.is_channel) return 1;
      return a.name.localeCompare(b.name);
    });

    const channelsCount = items.filter((i) => i.is_channel).length;
    const groupsCount = items.filter((i) => !i.is_channel).length;


    console.log(`✅ [Gateway] Ditemukan ${items.length} target (${channelsCount} Saluran/Channel, ${groupsCount} Grup).`);
    return res.json({
      success: true,
      groups: items,
      total: items.length,
      channels_count: channelsCount,
      groups_count: groupsCount
    });

  } catch (err) {
    console.error('❌ [Gateway] Gagal mengambil daftar target:', err);
    return res.status(500).json({
      success: false,
      error: `Gagal mengambil daftar target: ${err.message}`,
      groups: []
    });
  }
});

// Endpoint pengiriman pesan dari backend SIGAP BPS
app.post(['/webhook', '/send'], async (req, res) => {
  try {
    const { target, message, image_url } = req.body;

    if (!target) {
      return res.status(400).json({ success: false, error: 'Parameter target (nomor HP / ID Grup) wajib diisi.' });
    }

    if (!isConnected || !sock) {
      return res.status(503).json({
        success: false,
        error: 'WhatsApp Gateway belum terhubung. Silakan scan QR code di terminal server.'
      });
    }

    const jid = formatJid(target);
    if (!jid) {
      return res.status(400).json({ success: false, error: 'Format target nomor/grup tidak valid.' });
    }

    console.log(`\n📨 [Gateway] Menerima request kirim ke: ${jid}`);
    if (image_url) {
      console.log(`🖼️  [Gateway] Menyertakan Cover Image: ${image_url}`);
    }

    let sentResult;
    const cleanImageUrl = (image_url || '').trim();

    if (cleanImageUrl) {
      try {
        sentResult = await sock.sendMessage(jid, {
          image: { url: cleanImageUrl },
          caption: message || ''
        });
        if (sentResult?.key?.id && sentResult?.message) {
          messageMediaCache.set(sentResult.key.id, sentResult.message);
        }
        console.log(`✅ [Gateway] Berhasil mengirim pesan gambar + caption ke: ${jid}`);
      } catch (imgErr) {
        console.warn(`⚠️ [Gateway] Gagal mengirim gambar (${imgErr.message}), fallback kirim teks murni...`);
        sentResult = await sock.sendMessage(jid, {
          text: message || ''
        });
        if (sentResult?.key?.id && sentResult?.message) {
          messageMediaCache.set(sentResult.key.id, sentResult.message);
        }
      }
    } else {
      sentResult = await sock.sendMessage(jid, {
        text: message || ''
      });
      if (sentResult?.key?.id && sentResult?.message) {
        messageMediaCache.set(sentResult.key.id, sentResult.message);
      }
      console.log(`✅ [Gateway] Berhasil mengirim pesan teks ke: ${jid}`);
    }

    // Save outgoing message to messageStore
    try {
      const outgoingMsg = {
        key: {
          id: sentResult?.key?.id || `out-${Date.now()}`,
          remoteJid: jid,
          fromMe: true,
        },
        message: cleanImageUrl
          ? { imageMessage: { caption: message || '' } }
          : { conversation: message || '' },
        rawMessage: sentResult?.message || undefined,
        messageTimestamp: Math.floor(Date.now() / 1000),
        pushName: 'SIGAP BPS Admin',
      };
      messageStore.saveMessages(jid, [outgoingMsg]);
      if (!jid.endsWith('@g.us') && !jid.endsWith('@newsletter') && !jid.includes('@broadcast')) {
        liveChatSessionService.handleAdminMessageSent(jid, 'SIGAP BPS Admin', sentResult?.key?.id, message || '');
      }
    } catch (saveErr) {
      console.warn('⚠️ Gagal menyimpan pesan keluar ke store:', saveErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Pesan berhasil dikirim ke WhatsApp via Baileys Gateway.',
      messageId: sentResult?.key?.id || null
    });

  } catch (err) {
    console.error('❌ [Gateway] Error pengiriman:', err);
    return res.status(500).json({
      success: false,
      error: `Gagal mengirim pesan: ${err.message}`
    });
  }
});

// Jalankan HTTP server
// Serve backup files
app.use('/backups', express.static(path.join(__dirname, 'backups')));

// Register backup and explorer routers
app.use('/whatsapp', backupRouter);
app.use('/whatsapp/explorer', explorerRouter);
app.use('/media', express.static(path.join(__dirname, 'data', 'media')));

app.listen(PORT, () => {

  console.log(`\n=============================================================`);
  console.log(`🤖 SIGAP BPS WhatsApp Gateway berjalan pada port http://127.0.0.1:${PORT}`);
  console.log(`=============================================================`);
  connectToWhatsApp();
});
