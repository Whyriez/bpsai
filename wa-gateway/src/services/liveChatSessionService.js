// liveChatSessionService.js — Manajemen Sesi Live Chat & Terminasi Layanan PST BPS Gorontalo
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import messageStore from '../store/messageStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SESSIONS_FILE = path.join(__dirname, '..', '..', 'data', 'live_sessions.json');
const SETTINGS_FILE = path.join(__dirname, '..', '..', 'data', 'live_settings.json');

// Default operating settings (PST BPS Provinsi Gorontalo, WITA / UTC+8)
const DEFAULT_SETTINGS = {
  autoGreetingEnabled: true,
  timezoneOffsetHours: 8, // WITA (Gorontalo)
  inactivityTimeoutMinutes: 10, // Sesi dianggap selesai / reset setelah 10 menit tidak aktif
  autoTerminateOnTimeout: true, // Otomatis terminasi sesi setelah 10 menit tanpa respon
  sendAutoTerminationMessage: true, // Kirim pesan penutup terminasi & survei SKD saat timeout 10 menit
  operatingHours: {
    // 0: Minggu, 1: Senin, ..., 5: Jumat, 6: Sabtu
    1: { name: 'Senin', open: '08:00', close: '15:30', active: true },
    2: { name: 'Selasa', open: '08:00', close: '15:30', active: true },
    3: { name: 'Rabu', open: '08:00', close: '15:30', active: true },
    4: { name: 'Kamis', open: '08:00', close: '15:30', active: true },
    5: { name: 'Jumat', open: '08:00', close: '15:00', active: true },
    6: { name: 'Sabtu', open: '00:00', close: '00:00', active: false },
    0: { name: 'Minggu', open: '00:00', close: '00:00', active: false }
  },
  links: {
    surveyUrl: 'https://s.bps.go.id/skd75',
    sigapUrl: 'https://sigap.bps7500.my.id',
    bpsWebsiteUrl: 'https://gorontalo.bps.go.id'
  }
};

let sessions = {};
let settings = { ...DEFAULT_SETTINGS };
const processingLocks = new Set(); // Prevent concurrent auto-reply per JID
let _sockGetter = () => null;
let _isConnectedGetter = () => false;

export function setSocketGetter(sockGetter, isConnectedGetter) {
  _sockGetter = sockGetter;
  _isConnectedGetter = isConnectedGetter;
}

const botMessageIds = new Set();
export function registerBotMessageId(id) {
  if (!id) return;
  botMessageIds.add(id);
  if (botMessageIds.size > 2000) {
    const first = botMessageIds.values().next().value;
    botMessageIds.delete(first);
  }
}

export function isBotMessage(id) {
  return botMessageIds.has(id);
}

function ensureDataDir() {
  const dataDir = path.dirname(SESSIONS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadSettings() {
  ensureDataDir();
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      settings = { ...DEFAULT_SETTINGS, ...parsed };
      return;
    }
  } catch (e) {
    console.warn('⚠️ [LiveChat] Gagal membaca settings:', e.message);
  }
  saveSettings();
}

function saveSettings() {
  ensureDataDir();
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) {
    console.error('❌ [LiveChat] Gagal menyimpan settings:', e.message);
  }
}

function loadSessions() {
  ensureDataDir();
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
      return;
    }
  } catch (e) {
    console.warn('⚠️ [LiveChat] Gagal membaca sessions:', e.message);
  }
  sessions = {};
}

function saveSessions() {
  ensureDataDir();
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf8');
  } catch (e) {
    console.error('❌ [LiveChat] Gagal menyimpan sessions:', e.message);
  }
}

export function clearSessions() {
  sessions = {};
  try {
    ensureDataDir();
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify({}, null, 2), 'utf8');
    console.log('🧹 [LiveChat] Sesi percakapan live berhasil dikosongkan.');
  } catch (e) {
    console.error('❌ [LiveChat] Gagal mengosongkan sessions:', e.message);
  }
}

// Inisialisasi awal
loadSettings();
loadSessions();

/**
 * Mendapatkan waktu lokal Gorontalo (WITA / UTC+8)
 */
export function getLocalGorontaloDate(date = new Date()) {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const offset = settings.timezoneOffsetHours || 8;
  return new Date(utc + (3600000 * offset));
}

/**
 * Mendapatkan sapaan waktu otomatis (pagi, siang, sore, malam)
 */
export function getTimeGreeting(localDate = getLocalGorontaloDate()) {
  const hours = localDate.getHours();
  if (hours >= 5 && hours < 11) return 'pagi';
  if (hours >= 11 && hours < 15) return 'siang';
  if (hours >= 15 && hours < 18) return 'sore';
  return 'malam';
}

/**
 * Mengecek apakah saat ini masuk jam operasional layanan PST BPS Gorontalo
 */
export function isWithinOperatingHours(localDate = getLocalGorontaloDate()) {
  const day = localDate.getDay();
  const schedule = settings.operatingHours?.[day];
  if (!schedule || !schedule.active) return false;

  const currentMinutes = localDate.getHours() * 60 + localDate.getMinutes();
  const [openH, openM] = schedule.open.split(':').map(Number);
  const [closeH, closeM] = schedule.close.split(':').map(Number);

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

/**
 * Menghasilkan teks estimasi hari & tanggal operasional berikutnya
 * Contoh: "Senin, 16 Oktober 2026 pukul 08.00 WITA"
 */
export function getNextOperatingSchedule(localDate = getLocalGorontaloDate()) {
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Cari hari kerja berikutnya
  let nextDate = new Date(localDate);
  for (let i = 1; i <= 7; i++) {
    nextDate.setDate(nextDate.getDate() + 1);
    const day = nextDate.getDay();
    const sched = settings.operatingHours?.[day];
    if (sched && sched.active) {
      const dayName = dayNames[day];
      const d = nextDate.getDate();
      const m = monthNames[nextDate.getMonth()];
      const y = nextDate.getFullYear();
      return `${dayName}, ${d} ${m} ${y} pukul ${sched.open} WITA`;
    }
  }
  return 'hari kerja berikutnya saat jam layanan dibuka';
}

/**
 * 1. Pesan Pembuka (PST BPS Provinsi Gorontalo)
 */
export function buildOpeningMessage(greeting = getTimeGreeting()) {
  return (
`Selamat ${greeting}.
Terima kasih telah menghubungi PST BPS Provinsi Gorontalo
Mohon kesediaannya untuk mengisi data berikut ya Kak 😊
Nama : 
Pekerjaan : 
Instansi/Asal : `
  );
}

/**
 * 2. Pesan Follow Up (Jika pesan masuk di luar jam layanan)
 */
export function buildOutOfHoursMessage(greeting = getTimeGreeting()) {
  return (
`Selamat ${greeting}.
Mohon maaf atas keterlambatan respons kami dikarenakan pesan Anda masuk di luar jam operasional petugas layanan kami.
Terima kasih telah bersedia menunggu. Sebelumnya, mohon kesediaannya terlebih dahulu untuk menginformasikan:
Nama : 
Pekerjaan : 
Asal Instansi : `
  );
}

/**
 * 3. Pesan Penundaan (Jika Permintaan Data Membutuhkan Proses Pengolahan Terlebih Dahulu)
 */
export function buildDelayMessage(greeting = getTimeGreeting()) {
  return (
`Selamat ${greeting} Kak. Data yang Kakak butuhkan memerlukan proses penyiapan terlebih dahulu oleh tim teknis kami dalam waktu maksimal 3 (hari) kerja. Kami akan menghubungi Kakak kembali melalui nomor ini setelah data tersebut siap diserahkan.
Terima kasih atas pengertian dan kesediaan Kakak untuk menunggu 😊`
  );
}

/**
 * 4. Pesan Konfirmasi (Jika Permintaan telah diberikan)
 */
export function buildConfirmationMessage(topic = 'konsultasi data') {
  const cleanTopic = (topic || 'konsultasi data').trim();
  return (
`Bagaimana Kak, terkait penjelasan mengenai ${cleanTopic} tadi, apakah sudah cukup jelas?
Kalau dirasa masih ada poin yang kurang jelas atau ada yang ingin ditanyakan lagi, silakan disampaikan saja, ya. 😊`
  );
}

/**
 * 5. Pesan Penutup (Jika Layanan Telah Selesai - Dengan Konfirmasi) -> TERMINASI UTAMA
 */
export function buildClosingCompletedMessage(topic = 'konsultasi data') {
  const cleanTopic = (topic || 'konsultasi data').trim();
  const surveyUrl = settings.links?.surveyUrl || 'https://s.bps.go.id/skd75';
  return (
`Terima kasih banyak telah menghubungi nomor layanan PST BPS Provinsi Gorontalo. Dengan ini, konsultasi terkait ${cleanTopic} kami akhiri ya Kak. Agar kami bisa terus memberikan pelayanan yang lebih baik, mohon bantuannya untuk mengisi survei kepuasan singkat di tautan ini: ${surveyUrl}

Semoga informasi yang kami sampaikan bermanfaat. Selamat melanjutkan aktivitas dan sehat selalu! 👏 😊`
  );
}

/**
 * 6. Pesan Penutup (Jika Jam Layanan Telah Selesai) -> TERMINASI JAM LAYANAN
 */
export function buildClosingEndOfDayMessage(nextSchedule = null) {
  const schedule = nextSchedule || getNextOperatingSchedule();
  const sigapUrl = settings.links?.sigapUrl || 'https://sigap.bps7500.my.id';
  const bpsUrl = settings.links?.bpsWebsiteUrl || 'https://gorontalo.bps.go.id';

  return (
`Selamat sore, Kak.
Mengingat jam operasional layanan hari ini telah berakhir, proses konsultasi akan kami lanjutkan kembali pada ${schedule} saat jam layanan dibuka.

Untuk kebutuhan data statistik secara mandiri, Kakak dapat mengakses tautan berikut:
• SIGAP: ${sigapUrl}
• Website BPS Provinsi Gorontalo: ${bpsUrl}

Kami akan menghubungi Kakak kembali pada ${schedule} untuk menjawab pertanyaan yang belum terselesaikan.

Terima kasih banyak atas pengertiannya Kak 😊`
  );
}

/**
 * Ekstraksi otomatis data pengunjung (Nama, Pekerjaan, Instansi) dari pesan chat
 */
export function extractVisitorDataFromText(text) {
  if (!text || typeof text !== 'string') return null;

  const nameMatch = text.match(/(?:nama|name)\s*[:=]\s*([^\n\r]+)/i);
  const jobMatch = text.match(/(?:pekerjaan|profesi|job)\s*[:=]\s*([^\n\r]+)/i);
  const agencyMatch = text.match(/(?:instansi\/asal|asal instansi|instansi|asal|institusi)\s*[:=]\s*([^\n\r]+)/i);

  if (nameMatch || jobMatch || agencyMatch) {
    return {
      nama: nameMatch ? nameMatch[1].trim() : null,
      pekerjaan: jobMatch ? jobMatch[1].trim() : null,
      instansi: agencyMatch ? agencyMatch[1].trim() : null,
    };
  }
  return null;
}

/**
 * Mengecek apakah pesan pengunjung hanya berupa ucapan terima kasih / salam penutup singkat
 * Contoh: "terima kasih", "makasih", "siap", "ok", "sama-sama", emoji 👍 / 🙏
 */
export function isCourtesyOrAcknowledgmentMessage(text) {
  if (!text || typeof text !== 'string') return false;
  const clean = text.trim().toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, ' ');
  if (!clean) {
    // Pesan hanya berisi emotikon (seperti 👍, 🙏, 😊), anggap respons sopan penutup
    return true;
  }
  const courtesyList = [
    'terima kasih', 'terimakasih', 'makasih', 'makasi', 'matur nuwun', 'suwun', 'syukron',
    'thanks', 'thank you', 'thx', 'tq', 'ty', 'ok', 'oke', 'okay', 'siap', 'baik', 'sama sama',
    'samasama', 'sama2', 'siaap', 'baik pak', 'baik kak', 'terima kasih pak', 'terima kasih kak',
    'terimakasih pak', 'terimakasih kak', 'makasih pak', 'makasih kak', 'masama', 'noted',
    'siap pak', 'siap kak', 'oke siap', 'ok siap', 'ok terima kasih', 'oke terima kasih',
    'baik terima kasih', 'baik terimakasih', 'siap makasih', 'ok kak', 'oke kak', 'ok pak',
    'oke pak', 'alhamdulillah', 'siap terimakasih'
  ];
  return courtesyList.some(w => clean === w || clean.startsWith(w + ' ') || clean.endsWith(' ' + w));
}

/**
 * Mengecek apakah pesan yang dikirim oleh admin / bot merupakan pesan terminasi / penutup resmi
 */
export function isTerminationClosingText(text) {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase();
  return (
    lower.includes('s.bps.go.id/skd') ||
    lower.includes('kami akhiri ya kak') ||
    lower.includes('kami akhiri ya') ||
    (lower.includes('konsultasi terkait') && lower.includes('kami akhiri')) ||
    lower.includes('jam operasional layanan hari ini telah berakhir') ||
    lower.includes('proses konsultasi akan kami lanjutkan kembali')
  );
}

/**
 * Mengambil atau membuat sesi chat
 */
export function getOrCreateSession(chatId) {
  const canonicalId = messageStore.resolveLidToPhone(chatId) || chatId;
  if (!sessions[canonicalId]) {
    if (sessions[chatId]) {
      sessions[canonicalId] = {
        ...sessions[chatId],
        chatId: canonicalId,
        lid: chatId.endsWith('@lid') ? chatId : (sessions[chatId].lid || null)
      };
      if (chatId !== canonicalId) delete sessions[chatId];
    } else {
      sessions[canonicalId] = {
        chatId: canonicalId,
        lid: chatId.endsWith('@lid') ? chatId : (messageStore.resolvePhoneToLid(canonicalId) || null),
        status: 'waiting_admin', // 'waiting_admin' | 'admin_active' | 'delayed' | 'closed'
        autoGreeted: false,
        autoGreetedAt: null,
        createdAt: Math.floor(Date.now() / 1000),
        lastActivityAt: Math.floor(Date.now() / 1000),
        adminTakenOverAt: null,
        adminName: null,
        visitorData: null,
        consultationTopic: null,
        terminationType: null,
        closedAt: null,
        messageCount: 0
      };
    }
  }
  return sessions[canonicalId];
}

/**
 * Handle incoming message dari WhatsApp
 * Otomatis membalas chat sebelum admin mengambil alih jika sesi baru atau belum auto-greet.
 */
export async function handleIncomingMessage(sock, msg) {
  const rawChatId = msg.key?.remoteJid;
  if (!rawChatId) return;

  // Hanya untuk direct message 1-on-1 (bukan grup @g.us, status, atau newsletter @newsletter)
  if (
    rawChatId.endsWith('@g.us') ||
    rawChatId.endsWith('@newsletter') ||
    rawChatId.includes('status@broadcast') ||
    rawChatId.endsWith('@broadcast')
  ) {
    return;
  }

  // Abaikan pesan sync internal multi-device milik bot sendiri
  if (messageStore.isSelfJid(rawChatId)) {
    return;
  }

  // Jika pesan dari nomor sendiri (admin), abaikan auto-reply
  if (msg.key?.fromMe) {
    return;
  }

  // Cek usia pesan: abaikan riwayat lama saat sinkronisasi WhatsApp
  const msgTimestamp = msg.messageTimestamp
    ? (typeof msg.messageTimestamp === 'object' ? msg.messageTimestamp.low : Number(msg.messageTimestamp))
    : Math.floor(Date.now() / 1000);
  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec - msgTimestamp > 180) {
    // Pesan sudah lebih dari 3 menit lalu, kemungkinan history sync
    return;
  }

  // Jika ada senderPn dari pesan LID, daftarkan mapping
  if (rawChatId.endsWith('@lid') && msg.key?.senderPn) {
    messageStore.handlePhoneNumberShare({ lid: rawChatId, jid: msg.key.senderPn });
  }

  const chatId = messageStore.resolveLidToPhone(rawChatId);

  // Ekstrak teks pesan masuk
  let incomingText = '';
  const c = msg.message;
  if (c) {
    incomingText = c.conversation ||
      c.extendedTextMessage?.text ||
      c.imageMessage?.caption ||
      c.videoMessage?.caption ||
      c.documentMessage?.caption ||
      '';
  }

  // Hindari konkurensi / double trigger pada chat yang sama
  if (processingLocks.has(chatId)) {
    return;
  }
  processingLocks.add(chatId);

  try {
    let session = getOrCreateSession(chatId);

    // Cek apakah data pengunjung ada di pesan ini
    if (incomingText) {
      const extracted = extractVisitorDataFromText(incomingText);
      if (extracted) {
        session.visitorData = {
          ...(session.visitorData || {}),
          ...extracted
        };
      }
    }

    const timeoutMinutes = settings.inactivityTimeoutMinutes || 10;
    const timeoutSec = timeoutMinutes * 60;
    const isSessionClosed = session.status === 'closed';

    // Waktu referensi aktivitas terakhir atau waktu penutupan sesi
    const lastRefTime = isSessionClosed
      ? (session.closedAt || session.lastActivityAt || session.createdAt || 0)
      : (session.lastActivityAt || session.createdAt || 0);

    const idleTime = lastRefTime > 0 ? (nowSec - lastRefTime) : 0;
    const isPastTerminationTimeout = lastRefTime > 0 && idleTime >= timeoutSec;

    // 1. Jika sesi sebelumnya sudah diterminasi / closed:
    if (isSessionClosed) {
      // Jika pesan pengunjung hanya ucapan terima kasih / acknowledgment sopan, pertahankan sesi tertutup
      // agar tidak memicu form pembuka konsultasi baru dan loop auto-terminasi berulang!
      if (isCourtesyOrAcknowledgmentMessage(incomingText)) {
        console.log(`💬 [LiveChat] Pesan dari ${chatId} adalah ucapan terima kasih/sopan santun pasca-terminasi ("${(incomingText || '').trim()}"). Sesi tetap closed.`);
        session.lastActivityAt = nowSec;
        saveSessions();
        return;
      }

      if (isPastTerminationTimeout) {
        // SUDAH LEWAT DARI 10 MENIT PASCA TERMINASI:
        // Sesuai aturan terminasi BPS Gorontalo: SIGAP bisa chat duluan lagi untuk konsultasi baru!
        console.log(`🔄 [LiveChat] Sesi sebelumnya diterminasi dan sudah lewat ${Math.round(idleTime / 60)} menit (>= ${timeoutMinutes} menit). Memulai sesi baru agar SIGAP bisa otomatis chat duluan.`);
        session = {
          chatId,
          status: 'waiting_admin',
          autoGreeted: false,
          autoGreetedAt: null,
          createdAt: nowSec,
          lastActivityAt: nowSec,
          adminTakenOverAt: null,
          adminName: null,
          visitorData: session.visitorData || null, // Pertahankan data pengunjung yang sudah pernah ada
          consultationTopic: null,
          terminationType: null,
          closedAt: null,
          messageCount: 1
        };
        sessions[chatId] = session;
      } else {
        // BELUM LEWAT DARI 10 MENIT PASCA TERMINASI:
        // SIGAP TIDAK chat lagi! Sesi tetap closed agar tidak spam salam pembuka ke pengunjung.
        console.log(`⏳ [LiveChat] Chat masuk ke sesi tertutup tapi belum lewat 10 menit (${Math.round(idleTime)}s < ${timeoutSec}s). SIGAP tidak memicu sapaan ulang.`);
        session.lastActivityAt = nowSec;
        saveSessions();
        return;
      }
    } else if (isPastTerminationTimeout) {
      // 2. SESI SEBELUMNYA MASIH AKTIF/WAITING TAPI SUDAH TIDAK AKTIF > 10 MENIT:
      // Dianggap kedaluwarsa sesuai batas terminasi 10 menit. Reset sesi baru agar SIGAP chat duluan.
      console.log(`🔄 [LiveChat] Sesi lama tidak aktif selama ${Math.round(idleTime / 60)} menit (>= ${timeoutMinutes} menit). Reset sesi baru agar SIGAP chat duluan.`);
      session = {
        chatId,
        status: 'waiting_admin',
        autoGreeted: false,
        autoGreetedAt: null,
        createdAt: nowSec,
        lastActivityAt: nowSec,
        adminTakenOverAt: null,
        adminName: null,
        visitorData: session.visitorData || null,
        consultationTopic: null,
        terminationType: null,
        closedAt: null,
        messageCount: 1
      };
      sessions[chatId] = session;
    } else {
      // 3. Sesi aktif & masih dalam rentang 10 menit
      session.lastActivityAt = nowSec;
      session.messageCount = (session.messageCount || 0) + 1;
    }

    // Jika admin sudah mengambil alih pada sesi aktif (< 10 menit), jangan ganggu percakapan
    if (session.status === 'admin_active') {
      saveSessions();
      return;
    }

    // Jika auto-greeting dinonaktifkan dalam settings
    if (!settings.autoGreetingEnabled) {
      saveSessions();
      return;
    }

    // JIKA BELUM PERNAH AUTO-GREET PADA SESI INI -> Kirim pesan otomatis duluan!
    if (!session.autoGreeted) {
      const localDate = getLocalGorontaloDate();
      const inOperatingHours = isWithinOperatingHours(localDate);
      const greetingWord = getTimeGreeting(localDate);

      let replyText = '';
      let replyType = '';

      if (inOperatingHours) {
        replyText = buildOpeningMessage(greetingWord);
        replyType = 'opening_message';
        console.log(`🟢 [LiveChat] Mengirim Pesan Pembuka PST BPS Gorontalo ke ${chatId}`);
      } else {
        replyText = buildOutOfHoursMessage(greetingWord);
        replyType = 'out_of_hours_message';
        console.log(`🟡 [LiveChat] Mengirim Pesan Luar Jam Layanan PST BPS Gorontalo ke ${chatId}`);
      }

      // Kirim balasan otomatis via Baileys WhatsApp Socket ke JID pengirim asal
      const sent = await sock.sendMessage(rawChatId, { text: replyText });
      if (sent?.key?.id) {
        registerBotMessageId(sent.key.id);
      }

      // Simpan balasan bot ke pesan lokal messageStore agar muncul di UI explorer
      const botOutgoingMsg = {
        key: {
          id: sent?.key?.id || `bot-${Date.now()}`,
          remoteJid: chatId,
          fromMe: true,
        },
        message: {
          conversation: replyText,
        },
        messageTimestamp: Math.floor(Date.now() / 1000),
        pushName: 'PST BPS Gorontalo (Otomatis)',
      };
      messageStore.saveMessages(chatId, [botOutgoingMsg]);

      // Update state sesi
      session.autoGreeted = true;
      session.autoGreetedAt = Math.floor(Date.now() / 1000);
      session.status = 'waiting_admin';
      session.lastGreetingType = replyType;
      saveSessions();
    } else {
      // Sudah pernah di-auto-greet, biarkan user mengetik kelanjutan (nama/pertanyaan)
      // tanpa di-spam pesan pembuka berulang kali.
      saveSessions();
    }
  } catch (err) {
    console.error(`❌ [LiveChat] Error saat memproses incoming message untuk ${chatId}:`, err);
  } finally {
    processingLocks.delete(chatId);
  }
}

/**
 * Handle saat Admin mengirim pesan (dari Dashboard atau HP tertaut)
 * Menandakan admin telah mengambil alih sesi secara aktif atau menutup sesi jika pesan penutup.
 */
export function handleAdminMessageSent(chatId, adminName = 'Admin PST', msgId = null, msgText = '') {
  if (!chatId) return;
  // Abaikan pesan otomatis yang dikirim oleh sistem / bot SIGAP
  if (msgId && isBotMessage(msgId)) {
    return;
  }
  const session = getOrCreateSession(chatId);

  // Jika pesan admin mengandung teks penutup / terminasi resmi PST BPS:
  // Otomatis tandai sesi sebagai closed agar detektor auto-terminasi tidak mengirim penutup ganda 10 menit kemudian!
  if (isTerminationClosingText(msgText)) {
    console.log(`🔒 [LiveChat] Pesan admin ke ${chatId} terdeteksi sebagai pesan terminasi/penutup. Menutup sesi.`);
    session.status = 'closed';
    session.closedAt = Math.floor(Date.now() / 1000);
    session.lastActivityAt = session.closedAt;
    session.closedBy = adminName;
    session.terminationMessage = msgText;
    session.terminationType = msgText.toLowerCase().includes('operasional') ? 'end_of_day' : 'completed';
    saveSessions();
    return;
  }

  // Jangan ubah status jika sesi sudah ditutup (closed)
  if (session.status === 'closed') {
    return;
  }
  session.status = 'admin_active';
  session.adminTakenOverAt = Math.floor(Date.now() / 1000);
  session.adminName = adminName;
  session.lastActivityAt = Math.floor(Date.now() / 1000);
  saveSessions();
  console.log(`👤 [LiveChat] Admin "${adminName}" telah mengambil alih obrolan dengan ${chatId}`);
}

/**
 * Ambil alih sesi secara manual dari tombol dashboard
 */
export function takeoverSession(chatId, adminName = 'Admin PST') {
  const session = getOrCreateSession(chatId);
  session.status = 'admin_active';
  session.adminTakenOverAt = Math.floor(Date.now() / 1000);
  session.adminName = adminName;
  saveSessions();
  return session;
}

/**
 * Menandai sesi dengan status Penundaan (3 hari kerja)
 */
export function delaySession(chatId, adminName = 'Admin PST') {
  const session = getOrCreateSession(chatId);
  session.status = 'delayed';
  session.adminName = adminName;
  session.lastActivityAt = Math.floor(Date.now() / 1000);
  saveSessions();
  return session;
}

/**
 * Buka kembali sesi yang telah ditutup
 */
export function reopenSession(chatId) {
  const session = getOrCreateSession(chatId);
  session.status = 'admin_active';
  session.closedAt = null;
  session.terminationType = null;
  saveSessions();
  return session;
}

/**
 * Terminasi Sesi Live Chat mengikuti panduan PST BPS Gorontalo
 * @param {string} chatId - Target JID
 * @param {object} payload - { type: 'completed' | 'end_of_day', topic, nextSchedule, message, adminName, sendWhatsappMessage: true }
 * @param {function} sendFn - Callback pengiriman WhatsApp sock.sendMessage
 */
export async function terminateSession(chatId, payload = {}, sendFn = null) {
  const {
    type = 'completed', // 'completed' | 'end_of_day'
    topic = '',
    nextSchedule = '',
    message = '',
    adminName = 'Admin PST',
    sendWhatsappMessage = true
  } = payload;

  const session = getOrCreateSession(chatId);
  const nowSec = Math.floor(Date.now() / 1000);

  // Jika sesi sudah berstatus closed dan baru saja ditutup (< 90 detik lalu), cegah pengiriman ganda
  if (session.status === 'closed' && session.closedAt && (nowSec - session.closedAt < 90)) {
    console.log(`ℹ️ [LiveChat] Sesi ${chatId} sudah ditutup ${nowSec - session.closedAt}s lalu. Melewati eksekusi terminasi ganda.`);
    return {
      success: true,
      session,
      messageSent: false,
      alreadyClosed: true
    };
  }

  // Buat pesan teks terminasi jika belum disertakan
  let terminationText = message;
  if (!terminationText) {
    if (type === 'end_of_day') {
      terminationText = buildClosingEndOfDayMessage(nextSchedule);
    } else {
      terminationText = buildClosingCompletedMessage(topic || session.consultationTopic || 'konsultasi data');
    }
  }

  // Set status sesi menjadi 'closed' SEBELUM pengiriman pesan ke Baileys
  // Hal ini krusial untuk mencegah race condition event Baileys messages.upsert yang memicu handleAdminMessageSent
  session.status = 'closed';
  session.terminationType = type;
  session.consultationTopic = topic || session.consultationTopic;
  session.closedAt = nowSec;
  session.lastActivityAt = session.closedAt;
  session.closedBy = adminName;
  session.terminationMessage = terminationText;
  saveSessions();

  let sentResult = null;
  if (sendWhatsappMessage && sendFn) {
    try {
      sentResult = await sendFn(chatId, terminationText);
      if (sentResult?.key?.id) {
        registerBotMessageId(sentResult.key.id);
      }
      // Simpan juga ke pesan lokal
      const outMsg = {
        key: {
          id: sentResult?.key?.id || `term-${Date.now()}`,
          remoteJid: chatId,
          fromMe: true,
        },
        message: {
          conversation: terminationText,
        },
        messageTimestamp: Math.floor(Date.now() / 1000),
        pushName: `${adminName} (Terminasi Layanan)`,
      };
      messageStore.saveMessages(chatId, [outMsg]);
      console.log(`✅ [LiveChat] Pesan terminasi (${type}) berhasil dikirim ke ${chatId}`);
    } catch (sendErr) {
      console.error(`❌ [LiveChat] Gagal mengirim pesan terminasi ke WhatsApp:`, sendErr);
      throw sendErr;
    }
  }

  return {
    success: true,
    session,
    messageSent: Boolean(sentResult),
    messageId: sentResult?.key?.id || null
  };
}

/**
 * Dapatkan seluruh sesi atau sesi tunggal
 */
export function getSession(chatId) {
  const canonicalId = messageStore.resolveLidToPhone(chatId) || chatId;
  return sessions[canonicalId] || sessions[chatId] || null;
}

export function getAllSessions() {
  return sessions;
}

export function getLiveSettings() {
  const localDate = getLocalGorontaloDate();
  return {
    ...settings,
    currentServerTime: new Date().toISOString(),
    currentGorontaloTime: localDate.toISOString(),
    currentGreeting: getTimeGreeting(localDate),
    isOperatingHoursNow: isWithinOperatingHours(localDate),
    nextOperatingSchedule: getNextOperatingSchedule(localDate),
  };
}

export function updateLiveSettings(newSettings) {
  settings = {
    ...settings,
    ...newSettings,
    operatingHours: {
      ...settings.operatingHours,
      ...(newSettings.operatingHours || {})
    },
    links: {
      ...settings.links,
      ...(newSettings.links || {})
    }
  };
  saveSettings();
  return getLiveSettings();
}

/**
 * Background Auto-Terminator:
 * Otomatis menterminasi sesi yang sudah tidak aktif selama 10 menit
 * Mengirim pesan terminasi resmi + link survei SKD ke WhatsApp pelanggan.
 */
export async function checkAndAutoTerminateSessions() {
  if (!settings.autoTerminateOnTimeout) return;
  const timeoutMinutes = settings.inactivityTimeoutMinutes || 10;
  const timeoutSec = timeoutMinutes * 60;
  const nowSec = Math.floor(Date.now() / 1000);

  for (const [chatId, session] of Object.entries(sessions)) {
    // Hanya proses sesi yang masih aktif (waiting_admin, admin_active)
    // Sesi 'closed' dan sesi 'delayed' (penundaan hingga 3 hari kerja) TIDAK boleh diterminasi timeout 10 menit!
    if (session.status === 'closed' || session.status === 'delayed') continue;
    if (
      chatId.endsWith('@g.us') ||
      chatId.endsWith('@newsletter') ||
      chatId.includes('status@broadcast') ||
      chatId.endsWith('@broadcast') ||
      messageStore.isSelfJid(chatId)
    ) {
      continue;
    }

    const lastTime = session.lastActivityAt || session.createdAt || nowSec;
    const idle = nowSec - lastTime;

    if (idle >= timeoutSec) {
      console.log(`⏱️ [LiveChat Auto-Terminator] Sesi ${chatId} tidak aktif selama ${Math.round(idle / 60)} menit (>= ${timeoutMinutes} menit). Menjalankan terminasi otomatis.`);

      const sock = _sockGetter();
      const isConn = _isConnectedGetter();
      const shouldSendMsg = settings.sendAutoTerminationMessage && sock && isConn;

      const topic = session.consultationTopic || session.visitorData?.topic || 'layanan konsultasi online PST';
      const surveyUrl = settings.links?.surveyUrl || 'https://s.bps.go.id/skd75';

      const terminationMsg =
`Terima kasih banyak telah menghubungi nomor layanan PST BPS Provinsi Gorontalo. Mengingat tidak ada aktivitas lebih lanjut selama ${timeoutMinutes} menit, konsultasi terkait ${topic} kami akhiri ya Kak.

Agar kami bisa terus memberikan pelayanan yang lebih baik, mohon bantuannya untuk mengisi survei kepuasan singkat di tautan ini: ${surveyUrl}

Semoga informasi yang kami sampaikan bermanfaat. Selamat melanjutkan aktivitas dan sehat selalu! 👏 😊`;

      const sendTarget = session.lid || chatId;
      const sendFn = shouldSendMsg ? async (target, text) => await sock.sendMessage(sendTarget, { text }) : null;

      try {
        await terminateSession(
          chatId,
          {
            type: 'completed',
            topic: topic,
            message: terminationMsg,
            adminName: 'Sistem SIGAP (Auto-Terminasi 10 Menit)',
            sendWhatsappMessage: Boolean(shouldSendMsg)
          },
          sendFn
        );
      } catch (err) {
        console.error(`❌ [LiveChat Auto-Terminator] Gagal auto-terminate ${chatId}:`, err.message);
      }
    }
  }
}

// Background checker timer setiap 30 detik
setInterval(() => {
  try {
    checkAndAutoTerminateSessions();
  } catch (e) {
    console.warn('⚠️ [LiveChat Interval] Warning:', e.message);
  }
}, 30000);

export default {
  getLocalGorontaloDate,
  getTimeGreeting,
  isWithinOperatingHours,
  getNextOperatingSchedule,
  buildOpeningMessage,
  buildOutOfHoursMessage,
  buildDelayMessage,
  buildConfirmationMessage,
  buildClosingCompletedMessage,
  buildClosingEndOfDayMessage,
  extractVisitorDataFromText,
  getOrCreateSession,
  handleIncomingMessage,
  handleAdminMessageSent,
  takeoverSession,
  delaySession,
  reopenSession,
  terminateSession,
  getSession,
  getAllSessions,
  getLiveSettings,
  updateLiveSettings,
  setSocketGetter,
  checkAndAutoTerminateSessions,
  isCourtesyOrAcknowledgmentMessage,
  isTerminationClosingText,
  clearSessions
};
