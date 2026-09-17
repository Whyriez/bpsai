import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import { executeWMexQuery } from '@whiskeysockets/baileys/lib/Socket/mex.js';
import express from 'express';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const logger = pino({ level: 'silent' });
let sock = null;
let isConnected = false;
let currentQr = null;
let currentQrDataUrl = null;
let currentQrUpdatedAt = null;

function formatJid(target) {
  let cleaned = String(target || '').trim();
  if (!cleaned) return null;
  // Jika sudah berakhiran format WhatsApp valid (@g.us, @s.whatsapp.net, @newsletter)
  if (
    cleaned.endsWith('@g.us') ||
    cleaned.endsWith('@s.whatsapp.net') ||
    cleaned.endsWith('@newsletter') ||
    cleaned.includes('@')
  ) {
    return cleaned;
  }
  // Bersihkan karakter non-digit untuk nomor telepon biasa
  cleaned = cleaned.replace(/[^\d]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return `${cleaned}@s.whatsapp.net`;
}

async function connectToWhatsApp() {
  try {
    const authDir = path.join(__dirname, 'auth_info_baileys');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: state,
      logger,
      printQRInTerminal: false,
      browser: ['SIGAP BPS Gateway', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQr = qr;
        currentQrUpdatedAt = new Date().toISOString();
        try {
          currentQrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 7 });
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
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`⚠️  [WhatsApp] Terputus (alasan: ${statusCode || lastDisconnect?.error?.message || 'Unknown'})`);

        if (shouldReconnect) {
          console.log('🔄 [WhatsApp] Menghubungkan ulang dalam 5 detik...');
          setTimeout(connectToWhatsApp, 5000);
        } else {
          currentQr = null;
          currentQrDataUrl = null;
          console.log('❌ [WhatsApp] Sesi keluar (Logged out). Klik Ganti Nomor di dashboard atau reset sesi untuk scan ulang.');
        }
      } else if (connection === 'open') {
        isConnected = true;
        currentQr = null;
        currentQrDataUrl = null;
        const senderNum = sock?.user?.id ? sock.user.id.split(':')[0] : 'Aktif';
        console.log('\n=============================================================');
        console.log(`✅ [WhatsApp] GATEWAY BERHASIL TERHUBUNG!`);
        console.log(`📱 Nomor Bot: ${senderNum}`);
        console.log(`🚀 Siap melayani pengiriman rilis BPS dari backend SIGAP!`);
        console.log('=============================================================\n');
      }
    });

    sock.ev.on('creds.update', saveCreds);

  } catch (err) {
    console.error('Error saat inisialisasi Baileys:', err);
    setTimeout(connectToWhatsApp, 5000);
  }
}

function getStatusResponse() {
  const rawPhone = sock?.user?.id ? sock.user.id.split(':')[0] : null;
  let formattedPhone = null;
  if (rawPhone) {
    formattedPhone = rawPhone.startsWith('62')
      ? `+62 ${rawPhone.slice(2, 5)}-${rawPhone.slice(5, 9)}-${rawPhone.slice(9)}`
      : `+${rawPhone}`;
  }

  return {
    name: 'SIGAP BPS WhatsApp Gateway (Baileys)',
    status: isConnected ? 'CONNECTED' : (currentQr ? 'SCAN_QR' : 'DISCONNECTED'),
    is_connected: isConnected,
    phone: rawPhone,
    phone_formatted: formattedPhone,
    qr_waiting: !!currentQr,
    qr_image: currentQrDataUrl,
    qr_updated_at: currentQrUpdatedAt,
    instructions: isConnected
      ? 'Gateway aktif dan siap digunakan.'
      : (currentQr ? 'Silakan scan QR code di Dashboard atau terminal HP.' : 'Sedang menghubungkan ke server WhatsApp...')
  };
}

// Endpoint status
app.all(['/', '/status', '/get-status'], (req, res) => {
  res.json(getStatusResponse());
});

// Endpoint untuk mereset sesi lama / ganti nomor WhatsApp bot
app.post(['/reset-session', '/logout', '/change-number'], async (req, res) => {
  try {
    console.log('\n🔄 [Gateway] Menerima permintaan reset sesi / ganti nomor WhatsApp bot...');
    
    isConnected = false;
    currentQr = null;
    currentQrDataUrl = null;

    if (sock) {
      try {
        await sock.logout();
      } catch (logoutErr) {
        console.log('Catatan logout socket:', logoutErr.message);
      }
      try {
        sock.end(new Error('Manual session reset requested'));
      } catch (endErr) {}
      sock = null;
    }

    const authDir = path.join(__dirname, 'auth_info_baileys');
    if (fs.existsSync(authDir)) {
      console.log('🗑️  [Gateway] Menghapus kredensial sesi lama di:', authDir);
      fs.rmSync(authDir, { recursive: true, force: true });
      fs.mkdirSync(authDir, { recursive: true });
    }

    // Picu pembuatan koneksi baru untuk mendapatkan QR Code baru
    setTimeout(() => {
      console.log('🚀 [Gateway] Memulai inisialisasi sesi WhatsApp baru...');
      connectToWhatsApp();
    }, 1200);

    return res.json({
      success: true,
      message: 'Sesi WhatsApp berhasil direset. Silakan scan QR code baru.',
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

// Helper untuk mengambil daftar Saluran WhatsApp Resmi (@newsletter)
async function fetchSubscribedNewsletters(currentSock) {
  if (!currentSock?.query || !currentSock?.generateMessageTag) {
    return [];
  }
  try {
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
  } catch (err) {
    console.warn('ℹ️  [Gateway] Catatan query Saluran WhatsApp (@newsletter):', err.message);
    return [];
  }
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
      const rawGroups = await sock.groupFetchAllParticipating();
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
        console.log(`✅ [Gateway] Berhasil mengirim pesan gambar + caption ke: ${jid}`);
      } catch (imgErr) {
        console.warn(`⚠️ [Gateway] Gagal mengirim gambar (${imgErr.message}), fallback kirim teks murni...`);
        sentResult = await sock.sendMessage(jid, {
          text: message || ''
        });
      }
    } else {
      sentResult = await sock.sendMessage(jid, {
        text: message || ''
      });
      console.log(`✅ [Gateway] Berhasil mengirim pesan teks ke: ${jid}`);
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
app.listen(PORT, () => {
  console.log(`\n=============================================================`);
  console.log(`🤖 SIGAP BPS WhatsApp Gateway berjalan pada port http://127.0.0.1:${PORT}`);
  console.log(`=============================================================`);
  connectToWhatsApp();
});
