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
  scheduledTerminationEnabled: true, // Otomatis terminasi terjadwal pada jam operasional
  scheduledTerminationTimes: ['14:00', '15:30'], // Pukul 14.00 WITA (sesi siang) dan 15.30 WITA (tutup layanan)
  sendAutoTerminationMessage: true, // Kirim pesan penutup terminasi resmi PST BPS Gorontalo
  inactivityTimeoutMinutes: 0, // Dinonaktifkan (sebelumnya 10 menit menyebabkan narasi berulang)
  autoTerminateOnTimeout: false, // Dinonaktifkan
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
let _cacheOutgoingMessage = null;

export function setSocketGetter(sockGetter, isConnectedGetter, cacheOutgoingMessage) {
  _sockGetter = sockGetter;
  _isConnectedGetter = isConnectedGetter;
  if (cacheOutgoingMessage) _cacheOutgoingMessage = cacheOutgoingMessage;
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
  if (!id) return false;
  return botMessageIds.has(id);
}

/**
 * Deteksi apakah suatu pesan merupakan pesan otomatis dari bot / sistem SIGAP,
 * bukan ketikan manusia (admin / petugas).
 * Memeriksa botMessageIds, ID prefix (bot-, confirm-, term-, delay-, meta-),
 * pushName (Otomatis, Sistem), dan frasa baku template bot.
 */
export function isAutomatedBotMessage(msg) {
  if (!msg) return false;
  const id = typeof msg === 'string' ? msg : (msg.id || msg.key?.id || '');
  if (id) {
    if (botMessageIds.has(id)) return true;
    if (id.startsWith('bot-') || id.startsWith('confirm-') || id.startsWith('term-') || id.startsWith('delay-') || id.startsWith('meta-')) {
      return true;
    }
  }

  const pushName = String(msg.pushName || '');
  if (pushName.includes('Otomatis') || pushName.includes('Sistem') || pushName.includes('Konfirmasi 14.00') || pushName.includes('Penundaan')) {
    return true;
  }

  const text = String(
    msg.text ||
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    ''
  ).trim();

  if (!text) return false;

  // Bot opening & out of hours
  if (text.includes('Terima kasih telah menghubungi PST BPS') ||
      text.includes('Mohon kesediaannya untuk mengisi data berikut') ||
      text.includes('Selamat datang kembali di Layanan PST BPS') ||
      text.includes('Terima kasih telah menghubungi kembali Layanan PST BPS') ||
      text.includes('di luar jam operasional petugas layanan kami')) {
    return true;
  }

  // Bot 14.00 confirmation
  if (text.includes('Bagaimana Kak, terkait penjelasan mengenai') && text.includes('apakah sudah cukup jelas')) {
    return true;
  }

  // Bot delay 3 days
  if (text.includes('memerlukan proses penyiapan terlebih dahulu oleh tim teknis kami dalam waktu maksimal 3 (hari) kerja')) {
    return true;
  }

  // Bot closing & terminations
  if (text.includes('Mengingat jam operasional layanan hari ini telah berakhir') ||
      text.includes('kami akhiri ya Kak') ||
      text.includes('s.bps.go.id/skd75')) {
    return true;
  }

  return false;
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

      // Migrasi dari pengaturan lama (inactivity timeout 10 menit) ke terminasi terjadwal 14:00 & 15:30 WITA
      if (settings.inactivityTimeoutMinutes === 10 || settings.autoTerminateOnTimeout === true || !settings.scheduledTerminationTimes) {
        settings.inactivityTimeoutMinutes = 0;
        settings.autoTerminateOnTimeout = false;
        settings.scheduledTerminationEnabled = true;
        settings.scheduledTerminationTimes = ['14:00', '15:30'];
        saveSettings();
      }
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
 * 1. Pesan Pembuka (PST BPS Provinsi Gorontalo) - Pengguna Baru (Buku Tamu Lengkap)
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
 * 1b. Pesan Pembuka Hangat untuk Pengguna Lama (Personalized Welcome Back)
 */
export function buildReturningVisitorOpeningMessage(visitorName = '', greeting = getTimeGreeting()) {
  const cleanName = (visitorName || '').trim();
  const callName = cleanName ? `, Kak ${cleanName}` : ' Kak';
  return (
`Selamat ${greeting}${callName}!
Selamat datang kembali di Layanan PST BPS Provinsi Gorontalo 😊
Pesan Kakak sudah kami terima dan segera diteruskan ke petugas layanan kami. Ada data atau informasi statistik yang bisa kami bantu hari ini?`
  );
}

/**
 * 2. Pesan Follow Up (Jika pesan masuk di luar jam layanan) - Pengguna Baru
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
 * 2b. Pesan Di Luar Jam Layanan untuk Pengguna Lama (Personalized Out of Hours)
 */
export function buildReturningVisitorOutOfHoursMessage(visitorName = '', greeting = getTimeGreeting(), nextSchedule = null) {
  const cleanName = (visitorName || '').trim();
  const callName = cleanName ? `, Kak ${cleanName}` : ' Kak';
  const schedule = nextSchedule || getNextOperatingSchedule();
  return (
`Selamat ${greeting}${callName}!
Terima kasih telah menghubungi kembali Layanan PST BPS Provinsi Gorontalo.
Mohon maaf, pesan Kakak masuk di luar jam operasional layanan kami (Senin-Jumat, 08.00 - 15.30 WITA).
Pesan Kakak telah kami catat dan akan segera ditindaklanjuti saat jam layanan dibuka kembali (${schedule}). Terima kasih banyak atas kesabarannya ya Kak 😊`
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
 * 6b. Pesan Penutup Sesi Siang (Pukul 14.00 WITA) -> TERMINASI JADWAL SIANG
 */
export function buildClosing1400Message(topic = 'konsultasi data') {
  const cleanTopic = (topic || 'konsultasi data').trim();
  const surveyUrl = settings.links?.surveyUrl || 'https://s.bps.go.id/skd75';
  return (
`Terima kasih banyak telah menghubungi nomor layanan PST BPS Provinsi Gorontalo. Sesi konsultasi terkait ${cleanTopic} pada pukul 14.00 WITA kami akhiri ya Kak.

Agar kami bisa terus memberikan pelayanan yang lebih baik, mohon bantuannya untuk mengisi survei kepuasan singkat di tautan ini: ${surveyUrl}

Semoga informasi yang kami sampaikan bermanfaat. Selamat melanjutkan aktivitas dan sehat selalu! 👏 😊`
  );
}

/**
 * 6c. Pesan Penutup Keterlambatan Layanan (Jika pesan belum sempat dibalas petugas hingga tutup jam layanan)
 * Menghindari situasi canggung/fatal meminta survei kepuasan SKD padahal pengunjung belum sempat dilayani!
 */
export function buildUnansweredEndOfDayMessage(nextSchedule = null) {
  const schedule = nextSchedule || getNextOperatingSchedule();
  const sigapUrl = settings.links?.sigapUrl || 'https://sigap.bps7500.my.id';
  const bpsUrl = settings.links?.bpsWebsiteUrl || 'https://gorontalo.bps.go.id';

  return (
`Selamat sore, Kak.
Mohon maaf yang sebesar-besarnya atas keterlambatan respons kami dikarenakan padatnya antrean layanan konsultasi hari ini.

Mengingat jam operasional layanan PST BPS Provinsi Gorontalo telah berakhir pada pukul 15.30 WITA, pesan dan pertanyaan Kakak telah kami catat dalam antrean prioritas dan akan segera kami tindaklanjuti kembali pada ${schedule} saat jam layanan dibuka kembali.

Untuk kebutuhan data statistik secara mandiri, Kakak dapat mengakses:
• SIGAP: ${sigapUrl}
• Website BPS Provinsi Gorontalo: ${bpsUrl}

Terima kasih banyak atas kesabaran dan pengertian Kakak 🙏 😊`
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
        lastGreetedDate: null, // 'YYYY-MM-DD'
        lastOutOfHoursGreetedDate: null, // 'YYYY-MM-DD'
        lastTerminationKey: null, // Mencegah duplikasi terminasi terjadwal
        confirmation1400Sent: false, // Apakah trigger bertanya kembali 14.00 sudah terkirim
        confirmation1400SentAt: null,
        confirmation1400Date: null,
        confirmation1400Replied: false, // Apakah pengguna membalas trigger 14.00
        confirmation1400RepliedAt: null,
        createdAt: Math.floor(Date.now() / 1000),
        lastActivityAt: Math.floor(Date.now() / 1000),
        adminTakenOverAt: null,
        adminName: null,
        visitorData: null,
        consultationTopic: null,
        terminationType: null,
        closedAt: null,
        messageCount: 0,
        aiAnalysis: null,
        aiIntent: null,
        aiTopic: null,
        aiSuggestedReply: null,
        aiAnalyzedAt: null
      };
    }
  }
  return sessions[canonicalId];
}

/**
 * Menyimpan hasil analisis intent cerdas Gemini AI ke dalam sesi
 */
export function saveAiAnalysis(chatId, aiData = {}) {
  const canonicalId = messageStore.resolveLidToPhone(chatId) || chatId;
  const session = getOrCreateSession(canonicalId);
  session.aiAnalysis = aiData;
  session.aiIntent = aiData.intent || null;
  session.aiTopic = aiData.topic || session.consultationTopic || null;
  session.aiSuggestedReply = aiData.suggested_reply || null;
  session.aiAnalyzedAt = Math.floor(Date.now() / 1000);

  if (aiData.topic && !session.consultationTopic) {
    session.consultationTopic = aiData.topic;
  }

  if (aiData.visitor_info) {
    session.visitorData = {
      ...(session.visitorData || {}),
      ...(aiData.visitor_info.nama ? { nama: aiData.visitor_info.nama } : {}),
      ...(aiData.visitor_info.pekerjaan ? { pekerjaan: aiData.visitor_info.pekerjaan } : {}),
      ...(aiData.visitor_info.instansi ? { instansi: aiData.visitor_info.instansi } : {}),
    };
  }

  // Jika Gemini mendeteksi percakapan lanjutan (CONTINUATION) atau kesantunan:
  if (aiData.is_continuation || aiData.should_skip_opening_greeting) {
    session.autoGreeted = true;
  }

  saveSessions();
  return session;
}

/**
 * Analisis intent secara lokal (fallback cerdas 0ms jika backend Gemini offline atau lambat)
 */
export function analyzeIntentLocally(incomingText = '', recentMsgs = [], session = {}) {
  const text = (incomingText || '').trim().toLowerCase();
  const sessionStatus = session?.status || 'waiting_admin';
  const isDelayed = Boolean(session?.flag_3days || session?.delayed_3days || sessionStatus === 'delayed');
  const delayedTopic = session?.delayedTopic || session?.consultationTopic || '';
  const visitorName = session?.visitorData?.nama || null;

  // 1. Deteksi Kesantunan / Terima Kasih
  if (isCourtesyOrAcknowledgmentMessage(text)) {
    return {
      intent: 'COURTESY_THANKS',
      is_continuation: true,
      should_skip_opening_greeting: true,
      topic: session?.consultationTopic || 'Layanan PST BPS',
      visitor_info: { nama: visitorName, pekerjaan: null, instansi: null },
      summary: 'Pengunjung menyampaikan ucapan terima kasih / kesantunan penutup',
      suggested_reply: 'Sama-sama Kak, senang dapat melayani Anda. Jika masih ada data yang dibutuhkan di kemudian hari, jangan ragu untuk menghubungi PST BPS Provinsi Gorontalo kembali ya Kak 😊',
      confidence: 0.95
    };
  }

  // 2. Deteksi Follow-up Penundaan (3 Hari Kerja)
  const delayKeywords = [
    'kemarin', 'tindak lanjut', 'kelanjutan', 'lanjutan', 'progres', 'progress', 'berkas',
    'apakah sudah siap', 'apakah sudah ada', 'sudah siap', 'sudah ada', 'gimana data',
    'bagaimana data', 'janji', '3 hari', 'tiga hari', 'kabari'
  ];
  const hasDelayKeyword = delayKeywords.some(kw => text.includes(kw));

  if (isDelayed || (hasDelayKeyword && (session?.delayed_3days || session?.flag_3days))) {
    return {
      intent: 'DELAY_FOLLOWUP',
      is_continuation: true,
      should_skip_opening_greeting: true,
      topic: delayedTopic || session?.consultationTopic || 'Permintaan Data Teknis',
      visitor_info: { nama: visitorName, pekerjaan: null, instansi: null },
      summary: `Pengunjung menindaklanjuti data tertunda (${delayedTopic || 'Data teknis 3 hari'})`,
      suggested_reply: `Halo Kak, terkait data ${delayedTopic ? `mengenai ${delayedTopic}` : 'yang Kakak butuhkan'} saat ini masih dalam proses penyiapan oleh tim teknis kami. Kami pastikan segera mengabari Kakak kembali begitu data siap. Terima kasih atas kesabarannya ya Kak 😊`,
      confidence: 0.92
    };
  }

  // 3. Deteksi Percakapan Lanjutan (Continuation)
  const continuationKeywords = [
    'kemarin', 'tadi', 'soal itu', 'maksud saya', 'maksudnya', 'maksud sy', 'yang tadi',
    'lanjutan', 'kelanjutan', 'tambahan', 'ini datanya', 'berikut data', 'sudah dikirim',
    'sudah saya kirim', 'ini berkas', 'minta tolong', 'mengenai', 'tentang', 'apakah bisa',
    'bagaimana kalau', 'terus', 'lalu', 'mau nanya lagi', 'mau tanya lagi', 'masih ada',
    'belum selesai', 'kirim ke mana', 'formatnya', 'ini nama saya', 'nama saya'
  ];
  const hasContinuationKeyword = continuationKeywords.some(kw => text.includes(kw));
  // Riwayat percakapan hanya dihitung jika terjadi hari ini dan sudah disapa hari ini
  const localDate = getLocalGorontaloDate();
  const todayStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
  const todayMsgs = (recentMsgs || []).filter(m => {
    if (!m.timestamp) return false;
    const msgDate = getLocalGorontaloDate(new Date(m.timestamp * 1000));
    const msgDateStr = `${msgDate.getFullYear()}-${String(msgDate.getMonth() + 1).padStart(2, '0')}-${String(msgDate.getDate()).padStart(2, '0')}`;
    return msgDateStr === todayStr;
  });
  const isGreetedToday = session?.lastGreetedDate === todayStr && session?.autoGreeted;
  const hasHistory = isGreetedToday && (todayMsgs.length > 1 || (session?.messageCount && session.messageCount > 1));

  if (hasContinuationKeyword || (hasHistory && !text.match(/^(halo|hai|pagi|siang|sore|malam|assalamu|ping|p)$/i))) {
    return {
      intent: 'CONTINUATION',
      is_continuation: true,
      should_skip_opening_greeting: true,
      topic: session?.consultationTopic || 'Konsultasi Data PST',
      visitor_info: { nama: visitorName, pekerjaan: null, instansi: null },
      summary: 'Pengunjung melanjutkan percakapan yang sedang berjalan hari ini',
      suggested_reply: 'Baik Kak, pesan Kakak sudah kami terima dan sedang kami tindaklanjuti. Mohon ditunggu sebentar ya Kak 😊',
      confidence: 0.88
    };
  }

  // 4. Deteksi Permintaan Data Statistik Spesifik (Data Inquiry)
  const statsKeywords = [
    'inflasi', 'kemiskinan', 'pdrb', 'ipm', 'pertumbuhan ekonomi', 'sensus', 'pertanian',
    'penduduk', 'ekspor', 'impor', 'ketenagakerjaan', 'pengangguran', 'gubernur',
    'bps', 'publikasi', 'tabel', 'angka', 'data', 'rilis', 'brs'
  ];
  const foundStatsWord = statsKeywords.find(kw => text.includes(kw));

  if (foundStatsWord) {
    const topicGuess = `Data ${foundStatsWord.toUpperCase()}`;
    return {
      intent: 'DATA_INQUIRY',
      is_continuation: hasHistory,
      should_skip_opening_greeting: hasHistory,
      topic: session?.consultationTopic || topicGuess,
      visitor_info: { nama: visitorName, pekerjaan: null, instansi: null },
      summary: `Pengunjung menanyakan informasi terkait ${topicGuess}`,
      suggested_reply: hasHistory
        ? `Baik Kak, terkait informasi ${topicGuess} tersebut sedang kami siapkan ya Kak. Mohon ditunggu sebentar 😊`
        : `Selamat datang di PST BPS Gorontalo Kak! Terkait informasi ${topicGuess} akan kami bantu carikan. Mohon kesediaannya melengkapi data pengunjung terlebih dahulu ya Kak 😊`,
      confidence: 0.85
    };
  }

  // 5. Deteksi Sapaan Baru (GREETING_NEW)
  const greetingKeywords = [
    'halo', 'hai', 'assalamu', 'assalamualaikum', 'selamat pagi', 'selamat siang',
    'selamat sore', 'selamat malam', 'permisi', 'pagi', 'siang', 'sore', 'malam', 'ping', 'tes', 'test', 'p'
  ];
  const isGreeting = greetingKeywords.some(kw => text.startsWith(kw) || text === kw);

  if (isGreeting && !hasHistory) {
    return {
      intent: 'GREETING_NEW',
      is_continuation: false,
      should_skip_opening_greeting: false,
      topic: 'Konsultasi Layanan PST',
      visitor_info: { nama: null, pekerjaan: null, instansi: null },
      summary: 'Pengunjung baru menyapa untuk memulai layanan PST',
      suggested_reply: 'Halo Selamat datang di Layanan PST BPS Provinsi Gorontalo! Ada yang bisa kami bantu hari ini? 😊',
      confidence: 0.90
    };
  }

  // Default
  if (hasHistory) {
    return {
      intent: 'CONTINUATION',
      is_continuation: true,
      should_skip_opening_greeting: true,
      topic: session?.consultationTopic || 'Konsultasi Data PST',
      visitor_info: { nama: visitorName, pekerjaan: null, instansi: null },
      summary: 'Pengunjung melanjutkan percakapan sebelumnya',
      suggested_reply: 'Baik Kak, pesan Kakak sudah kami terima dan sedang kami proses ya Kak 😊',
      confidence: 0.80
    };
  }

  return {
    intent: 'GREETING_NEW',
    is_continuation: false,
    should_skip_opening_greeting: false,
    topic: 'Konsultasi Layanan PST',
    visitor_info: { nama: null, pekerjaan: null, instansi: null },
    summary: 'Pengunjung baru memulai konsultasi',
    suggested_reply: 'Selamat datang di Layanan PST BPS Provinsi Gorontalo Kak! Ada yang bisa kami bantu terkait kebutuhan data statistik hari ini? 😊',
    confidence: 0.75
  };
}

/**
 * Mendeteksi intent pesan masuk menggunakan Gemini AI dengan fallback lokal cerdas
 */
export async function detectIncomingMessageIntent(chatId, incomingText, session) {
  const canonicalId = messageStore.resolveLidToPhone(chatId) || chatId;
  const currentSession = session || getOrCreateSession(canonicalId);
  const detail = messageStore.getChatDetail(canonicalId);
  const recentMsgs = (detail?.messages || []).slice(-8).map(m => ({
    text: m.text || '',
    fromMe: Boolean(m.fromMe),
    timestamp: m.timestamp || Math.floor(Date.now() / 1000)
  }));
  return analyzeIntentLocally(incomingText, recentMsgs, currentSession);
}

/**
 * Handle incoming message dari WhatsApp
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
  if (nowSec - msgTimestamp > 900) {
    // Pesan sudah lebih dari 15 menit lalu, kemungkinan history sync
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
    const localDate = getLocalGorontaloDate();
    const todayDateStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;

    // Ekstraksi data pengunjung (Nama, Pekerjaan, Instansi) jika ada dalam pesan
    if (incomingText) {
      const extracted = extractVisitorDataFromText(incomingText);
      if (extracted) {
        session.visitorData = {
          ...(session.visitorData || {}),
          ...extracted
        };
      }
    }

    // Cek apakah pesan ini merupakan balasan dari pengguna terhadap konfirmasi jam 14.00 WITA
    if (session.confirmation1400Sent && session.confirmation1400Date === todayDateStr) {
      session.confirmation1400Replied = true;
      session.confirmation1400RepliedAt = nowSec;
      console.log(`💬 [LiveChat] Pengguna ${chatId} telah membalas trigger konfirmasi jam 14.00 WITA.`);
    }

    const isSessionClosed = session.status === 'closed';
    const isSessionDelayed = session.status === 'delayed' || Boolean(session.delayed_3days) || Boolean(session.flag_3days);
    const isNewDay = session.lastGreetedDate !== todayDateStr;

    // =========================================================================
    // 1. RESET / INISIALISASI SESI BARU JIKA HARI BARU ATAU SESI SUDAH CLOSED:
    // Pelanggan yang kembali di hari berikutnya atau setelah sesi ditutup
    // berhak mendapatkan sapaan resmi baru untuk konsultasi hari ini.
    // =========================================================================
    if (isSessionClosed || isNewDay) {
      console.log(`🌅 [LiveChat] Sesi baru / hari baru (${todayDateStr}) untuk ${chatId} (closed=${isSessionClosed}, newDay=${isNewDay}). Menyiapkan sesi baru.`);
      session.status = 'waiting_admin';
      session.autoGreeted = false;
      session.autoGreetedAt = null;
      session.createdAt = nowSec;
      session.lastActivityAt = nowSec;
      session.closedAt = null;
      session.terminationType = null;
      session.terminationMessage = null;
      session.confirmation1400Sent = false;
      session.confirmation1400Date = null;
      session.confirmation1400Replied = false;
      session.adminRepliedToday = null;
      session.hasAdminEverReplied = false;
      session.adminLastRepliedAt = null;
      session.messageCount = 1;
    } else {
      session.lastActivityAt = nowSec;
      session.messageCount = (session.messageCount || 0) + 1;
    }

    // =========================================================================
    // KHUSUS STATUS PENUNDAAN / TERMINASI 3 HARI KERJA (FLAG AKTIF):
    // Data sedang disiapkan tim teknis BPS (maksimal 3 hari kerja).
    // TIDAK BOLEH muncul narasi pembuka (salam/form nama) dan TIDAK BOLEH muncul penutup!
    // Pengunjung tetap bisa mengirim pesan dan admin bisa mereach-out kapan saja.
    // =========================================================================
    if (isSessionDelayed) {
      console.log(`📌 [LiveChat] Pesan baru diterima dari ${chatId} saat sesi dalam status Flag Terminasi 3 Hari. Sesi dipertahankan tetap flagged tanpa mengirim pesan pembuka/penutup otomatis.`);
      session.status = 'delayed';
      session.delayed_3days = true;
      session.flag_3days = true;
      session.autoGreeted = true; // Kunci permanen agar tidak ada auto-greeting
      session.lastActivityAt = nowSec;
      session.customerRepliedAfterFlag = true;
      session.customerRepliedAt = nowSec;

      // Jalankan AI intent detection untuk menyiapkan draf balasan bagi admin/petugas
      await detectIncomingMessageIntent(chatId, incomingText, session);
      saveSessions();
      return;
    }

    // =========================================================================
    // DETEKSI INTENT CERDAS DENGAN GEMINI AI (AWAITED):
    // =========================================================================
    const aiAnalysis = await detectIncomingMessageIntent(chatId, incomingText, session);

    // 2. Jika pesan pengunjung merupakan kesantunan / ucapan terima kasih:
    if (aiAnalysis?.intent === 'COURTESY_THANKS' || isCourtesyOrAcknowledgmentMessage(incomingText)) {
      session.lastActivityAt = nowSec;
      session.autoGreeted = true;
      if (isSessionClosed) {
        console.log(`💬 [LiveChat AI] Pesan santun/terima kasih pasca-terminasi dari ${chatId} ("${(incomingText || '').trim()}"). Sesi tetap closed tanpa bot reply.`);
        saveSessions();
        return;
      }
      console.log(`💬 [LiveChat AI] Pesan santun/terima kasih dari ${chatId}. Sesi dipertahankan tanpa pesan pembuka bot.`);
      saveSessions();
      return;
    }

    // 3. Jika pengguna SUDAH DISAPA HARI INI dan sedang melanjutkan percakapan di hari yang sama:
    // (Hanya berlaku jika BUKAN hari baru / sesi baru)
    const isContinuationToday = Boolean(
      !isNewDay && (
        session.autoGreeted ||
        session.lastGreetedDate === todayDateStr ||
        aiAnalysis?.is_continuation ||
        aiAnalysis?.intent === 'CONTINUATION' ||
        aiAnalysis?.intent === 'DELAY_FOLLOWUP'
      )
    );

    if (isContinuationToday) {
      console.log(`🔄 [LiveChat AI] Pengunjung ${chatId} melanjutkan percakapan hari ini (Intent: ${aiAnalysis?.intent || 'CONTINUATION'}, Topik: "${aiAnalysis?.topic || session.consultationTopic || '-'}"). Melewatkan form pembuka otomatis.`);
      session.status = 'waiting_admin';
      session.lastActivityAt = nowSec;
      session.autoGreeted = true; // KUNCI agar narasi pembuka / form nama TIDAK terkirim ulang dalam hari yang sama
      if (aiAnalysis?.topic && !session.consultationTopic) {
        session.consultationTopic = aiAnalysis.topic;
      }
      saveSessions();
      return;
    }

    // 4. Jika admin sedang aktif menangani sesi
    if (session.status === 'admin_active') {
      session.lastActivityAt = nowSec;
      saveSessions();
      return;
    }

    // 5. Jika auto-greeting dinonaktifkan dalam konfigurasi
    if (!settings.autoGreetingEnabled) {
      session.lastActivityAt = nowSec;
      saveSessions();
      return;
    }

    // 6. Cek anti-repetisi sapaan hari ini: jika sudah disapa hari ini, jangan kirim sapaan pembuka lagi
    if (session.autoGreeted && session.lastGreetedDate === todayDateStr) {
      saveSessions();
      return;
    }

    // 7. Kirim pesan sapaan / form pembuka (karena ini hari baru / sesi baru yang belum disapa hari ini)
    const inOperatingHours = isWithinOperatingHours(localDate);
    const greetingWord = getTimeGreeting(localDate);
    const existingName = session.visitorData?.nama || null;
    const isReturningVisitor = Boolean(existingName);

    let replyText = '';
    let replyType = '';

    if (inOperatingHours) {
      if (isReturningVisitor) {
        replyText = buildReturningVisitorOpeningMessage(existingName, greetingWord);
        replyType = 'returning_opening_message';
        console.log(`🟢 [LiveChat] Mengirim Pesan Sapaan Hangat Pengguna Lama (Kak ${existingName}) ke ${chatId}`);
      } else {
        replyText = buildOpeningMessage(greetingWord);
        replyType = 'opening_message';
        console.log(`🟢 [LiveChat] Mengirim Pesan Pembuka Formulir PST BPS Gorontalo ke ${chatId}`);
      }
    } else {
      // Di luar jam operasional: cek apakah sudah pernah dikirim sapaan luar jam hari ini
      if (session.lastOutOfHoursGreetedDate === todayDateStr) {
        console.log(`⏳ [LiveChat] Pesan luar jam layanan sudah pernah dikirim ke ${chatId} hari ini. Tidak mengirim ulang.`);
        saveSessions();
        return;
      }
      if (isReturningVisitor) {
        replyText = buildReturningVisitorOutOfHoursMessage(existingName, greetingWord);
        replyType = 'returning_out_of_hours_message';
        console.log(`🟡 [LiveChat] Mengirim Pesan Luar Jam Layanan Pengguna Lama (Kak ${existingName}) ke ${chatId}`);
      } else {
        replyText = buildOutOfHoursMessage(greetingWord);
        replyType = 'out_of_hours_message';
        console.log(`🟡 [LiveChat] Mengirim Pesan Luar Jam Layanan Formulir PST BPS Gorontalo ke ${chatId}`);
      }
      session.lastOutOfHoursGreetedDate = todayDateStr;
    }

    // TANDAI SECARA SINKRON SEBELUM AWAIT PENGIRIMAN:
    // Mencegah duplicate send saat pengunjung mengirim 2-3 pesan beruntun cepat dalam beberapa detik
    session.autoGreeted = true;
    session.autoGreetedAt = nowSec;
    session.lastGreetedDate = todayDateStr;
    session.lastGreetingType = replyType;
    session.status = 'waiting_admin';
    session.confirmation1400Sent = false;
    session.confirmation1400Date = null;
    session.confirmation1400Replied = false;
    session.adminRepliedToday = null;
    session.hasAdminEverReplied = false;
    session.adminLastRepliedAt = null;
    saveSessions();

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
/**
 * Mengecek apakah admin/petugas (baik via HP WhatsApp mobile maupun via Dashboard SIGAP)
 * sudah pernah membalas chat ini pada hari ini.
 * Mencegah bot mengirim konfirmasi "apakah penjelasan sudah cukup jelas" pada jam 14.00
 * padahal admin belum pernah memberikan penjelasan sama sekali!
 */
export function hasAdminRepliedToday(chatId, session = null, todayStr = null) {
  if (!chatId) return false;
  const localDate = getLocalGorontaloDate();
  const currentTodayStr = todayStr || `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;

  const canonicalId = messageStore.resolveLidToPhone(chatId) || chatId;
  const messages = messageStore.readChatMessages(canonicalId) || [];
  if (messages.length === 0) return false;

  let lastCustomerMsg = null;
  let lastRealAdminMsg = null;

  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m || !m.timestamp) continue;

    const msgDate = getLocalGorontaloDate(new Date(m.timestamp * 1000));
    const msgDateStr = `${msgDate.getFullYear()}-${String(msgDate.getMonth() + 1).padStart(2, '0')}-${String(msgDate.getDate()).padStart(2, '0')}`;
    
    // Hanya periksa pesan hari ini
    if (msgDateStr !== currentTodayStr) continue;

    if (!m.fromMe && !lastCustomerMsg) {
      lastCustomerMsg = m;
    } else if (m.fromMe && !lastRealAdminMsg && !isAutomatedBotMessage(m)) {
      lastRealAdminMsg = m;
    }

    if (lastCustomerMsg && lastRealAdminMsg) break;
  }

  // Jika admin belum pernah mengirim pesan manual hari ini sama sekali
  if (!lastRealAdminMsg) {
    return false;
  }

  // Jika pengunjung mengirim pesan hari ini, pastikan pesan admin dikirim SETELAH pesan pengunjung!
  // Jika pesan pengunjung lebih baru daripada pesan admin, berarti pengunjung sedang menunggu balasan admin (antrean belum dijawab).
  if (lastCustomerMsg && (lastCustomerMsg.timestamp || 0) > (lastRealAdminMsg.timestamp || 0)) {
    console.log(`⏳ [LiveChat] Pengunjung ${chatId} mengirim pesan lebih baru (${lastCustomerMsg.text?.slice(0, 30) || 'pesan'}) daripada balasan admin terakhir. Pengunjung masih menunggu respons admin.`);
    return false;
  }

  return true;
}

export function handleAdminMessageSent(chatId, adminName = 'Admin PST', msgId = null, msgText = '') {
  if (!chatId || chatId.endsWith('@g.us') || chatId.endsWith('@newsletter') || chatId.includes('@broadcast')) {
    return;
  }
  // Abaikan pesan otomatis yang dikirim oleh sistem / bot SIGAP
  if (isAutomatedBotMessage({ id: msgId, text: msgText })) {
    return;
  }
  const session = getOrCreateSession(chatId);
  const nowSec = Math.floor(Date.now() / 1000);
  const localDate = getLocalGorontaloDate();
  const todayStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;

  // Tandai aktivitas respons admin (baik diketik dari HP maupun dari Dashboard SIGAP)
  session.hasAdminEverReplied = true;
  session.adminRepliedToday = todayStr;
  session.adminLastRepliedAt = nowSec;
  session.adminMessageCount = (session.adminMessageCount || 0) + 1;

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
    session.delayed_3days = false;
    session.flag_3days = false;
    saveSessions();
    return;
  }

  // Jangan ubah status jika sesi sudah ditutup (closed)
  if (session.status === 'closed') {
    return;
  }

  // Jika sesi sedang dalam status Flag Terminasi / Penundaan 3 Hari dan Admin mengirim pesan (mereach-out):
  if (session.delayed_3days || session.flag_3days || session.status === 'delayed') {
    console.log(`💬 [LiveChat] Admin "${adminName}" mereach-out pelanggan ${chatId} yang tertanda Flag Terminasi 3 Hari.`);
    session.reachedOutAt = Math.floor(Date.now() / 1000);
    session.reachedOutBy = adminName;
    // Pertahankan status delayed & flag 3 hari agar pesan balasan dari pelanggan
    // TIDAK memicu narasi pembuka atau terminasi otomatis 14.00/15.30!
    session.status = 'delayed';
    session.delayed_3days = true;
    session.flag_3days = true;
    session.autoGreeted = true;
    session.adminName = adminName;
    session.lastActivityAt = Math.floor(Date.now() / 1000);
    saveSessions();
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
 * Hitung perkiraan batas akhir 3 hari kerja ke depan (eksklusif akhir pekan Sabtu & Minggu)
 */
export function getThreeWorkingDaysTarget(startDate = new Date()) {
  const cur = new Date(startDate);
  let addedDays = 0;
  while (addedDays < 3) {
    cur.setDate(cur.getDate() + 1);
    const day = cur.getDay();
    if (day !== 0 && day !== 6) { // Bukan Minggu (0) dan bukan Sabtu (6)
      addedDays++;
    }
  }
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return {
    targetTimestamp: Math.floor(cur.getTime() / 1000),
    targetDateFormatted: `${dayNames[cur.getDay()]}, ${cur.getDate()} ${monthNames[cur.getMonth()]} ${cur.getFullYear()}`,
    daysRemaining: 3
  };
}

/**
 * Menandai sesi dengan status Penundaan (3 hari kerja)
 * Diberikan flag `delayed_3days = true` agar tidak muncul pesan pembuka dan penutup otomatis
 */
export function delaySession(chatId, options = {}) {
  const {
    adminName = 'Admin PST',
    topic = '',
    note = ''
  } = typeof options === 'string' ? { adminName: options } : options;

  const session = getOrCreateSession(chatId);
  const nowSec = Math.floor(Date.now() / 1000);
  const target = getThreeWorkingDaysTarget(new Date());

  session.status = 'delayed';
  session.delayed_3days = true; // FLAG UTAMA PENUNDAAN 3 HARI KERJA
  session.flag_3days = true; // Alias flag eksplisit untuk terminasi 3 hari
  session.delayedAt = nowSec;
  session.delayedUntil = target.targetTimestamp;
  session.delayedUntilFormatted = target.targetDateFormatted;
  session.delayedTopic = topic || session.consultationTopic || session.visitorData?.topic || 'penyiapan data teknis';
  session.delayedNote = note || '';
  session.delayedBy = adminName;
  session.adminName = adminName;
  session.lastActivityAt = nowSec;

  // Kunci agar narasi pembuka TIDAK terkirim
  session.autoGreeted = true;

  // Reset status konfirmasi 14.00 agar tidak memicu terminasi penutup otomatis
  session.confirmation1400Sent = false;
  session.confirmation1400Date = null;
  session.confirmation1400Replied = false;
  session.closedAt = null;
  session.terminationType = 'delayed_3days';
  session.terminationMessage = null;

  saveSessions();
  console.log(`📌 [LiveChat] Sesi ${chatId} ditandai Penundaan 3 Hari Kerja (Batas: ${target.targetDateFormatted}). Flag delayed_3days & flag_3days aktif.`);
  return session;
}

/**
 * Buka kembali sesi atau lepas status penundaan 3 hari
 */
export function reopenSession(chatId, adminName = 'Admin PST') {
  const session = getOrCreateSession(chatId);
  session.status = 'admin_active';
  session.delayed_3days = false; // Lepas flag 3 hari
  session.flag_3days = false;
  session.delayedAt = null;
  session.delayedUntil = null;
  session.delayedUntilFormatted = null;
  session.closedAt = null;
  session.terminationType = null;
  session.terminationMessage = null;
  session.adminName = adminName;
  session.lastActivityAt = Math.floor(Date.now() / 1000);
  saveSessions();
  console.log(`🔄 [LiveChat] Sesi ${chatId} dibuka kembali/dilepas dari flag penundaan menjadi admin_active.`);
  return session;
}

/**
 * Terminasi Sesi Live Chat mengikuti panduan PST BPS Gorontalo
 * @param {string} chatId - Target JID
 * @param {object} payload - { type: 'completed' | 'end_of_day' | 'midday_1400' | 'delayed_3days', topic, nextSchedule, message, adminName, sendWhatsappMessage: true, note }
 * @param {function} sendFn - Callback pengiriman WhatsApp sock.sendMessage
 */
export async function terminateSession(chatId, payload = {}, sendFn = null) {
  const {
    type = 'completed', // 'completed' | 'end_of_day' | 'midday_1400' | 'delayed_3days'
    topic = '',
    nextSchedule = '',
    message = '',
    adminName = 'Admin PST',
    sendWhatsappMessage = true,
    note = ''
  } = payload;

  const session = getOrCreateSession(chatId);
  const nowSec = Math.floor(Date.now() / 1000);

  // KHUSUS TIPE TERMINASI 3 HARI / PENUNDAAN (Maksimal 3 Hari Kerja):
  // Diberi FLAG agar narasi pembuka (sapaan/form) & penutup otomatis (14.00/15.30) TIDAK MUNCUL,
  // sehingga admin dapat mereach-out kembali kapan pun data siap diserahkan!
  if (type === 'delayed_3days' || type === 'delayed') {
    const target = getThreeWorkingDaysTarget(new Date());
    let delayMsgText = message;
    if (!delayMsgText) {
      delayMsgText = buildDelayMessage();
    }

    session.status = 'delayed';
    session.delayed_3days = true; // FLAG UTAMA 3 HARI
    session.flag_3days = true;
    session.delayedAt = nowSec;
    session.delayedUntil = target.targetTimestamp;
    session.delayedUntilFormatted = target.targetDateFormatted;
    session.delayedTopic = topic || session.consultationTopic || session.visitorData?.topic || 'penyiapan data teknis';
    session.delayedNote = note || '';
    session.delayedBy = adminName;
    session.adminName = adminName;
    session.lastActivityAt = nowSec;
    session.autoGreeted = true; // Kunci permanen narasi pembuka
    session.confirmation1400Sent = false;
    session.confirmation1400Date = null;
    session.confirmation1400Replied = false;
    session.closedAt = null;
    session.terminationType = 'delayed_3days';
    session.terminationMessage = delayMsgText;
    saveSessions();

    let sentResult = null;
    if (sendWhatsappMessage && sendFn) {
      try {
        sentResult = await sendFn(chatId, delayMsgText);
        if (sentResult?.key?.id) {
          registerBotMessageId(sentResult.key.id);
        }
        const outMsg = {
          key: {
            id: sentResult?.key?.id || `delay-${Date.now()}`,
            remoteJid: chatId,
            fromMe: true,
          },
          message: {
            conversation: delayMsgText,
          },
          messageTimestamp: Math.floor(Date.now() / 1000),
          pushName: `${adminName} (Terminasi 3 Hari Kerja)`,
        };
        messageStore.saveMessages(chatId, [outMsg]);
        console.log(`📌 [LiveChat] Flag Terminasi 3 Hari berhasil diaktifkan & pesan terkirim ke ${chatId}`);
      } catch (sendErr) {
        console.error(`❌ [LiveChat] Gagal mengirim pesan terminasi 3 hari ke WhatsApp:`, sendErr);
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
    } else if (type === 'unanswered_eod') {
      terminationText = buildUnansweredEndOfDayMessage(nextSchedule);
    } else if (type === 'midday_1400') {
      terminationText = buildClosing1400Message(topic || session.consultationTopic || 'konsultasi data');
    } else {
      terminationText = buildClosingCompletedMessage(topic || session.consultationTopic || 'konsultasi data');
    }
  }

  // Set status sesi menjadi 'closed' SEBELUM pengiriman pesan ke Baileys
  // Hal ini krusial untuk mencegah race condition event Baileys messages.upsert yang memicu handleAdminMessageSent
  session.status = 'closed';
  session.delayed_3days = false; // Sesi selesai, bersihkan flag penundaan 3 hari
  session.flag_3days = false;
  session.delayedAt = null;
  session.delayedUntil = null;
  session.delayedUntilFormatted = null;
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

// Set pelacak eksekusi jadwal hari ini (format: 'YYYY-MM-DD_HH:mm')
const executedSchedules = new Set();

/**
 * Auto-Terminator Terjadwal:
 * Menjalankan terminasi otomatis tepat pada pukul 14.00 WITA (sesi siang) dan 15.30 WITA (tutup layanan)
 * Dipastikan HANYA berjalan 1x per jadwal per hari dan TIDAK BERULANG.
 */
export async function checkScheduledTerminations() {
  if (settings.scheduledTerminationEnabled === false) return;

  const localDate = getLocalGorontaloDate();
  const day = localDate.getDay();
  // Hanya beroperasi pada hari aktif layanan (Senin - Jumat)
  const schedule = settings.operatingHours?.[day];
  if (!schedule || !schedule.active) return;

  const hours = localDate.getHours();
  const minutes = localDate.getMinutes();
  const todayStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;

  const targetTimes = settings.scheduledTerminationTimes || ['14:00', '15:30'];

  for (const timeTarget of targetTimes) {
    const [tHour, tMin] = timeTarget.split(':').map(Number);

    // Cek apakah waktu saat ini berada di rentang waktu target (toleransi jendela 2 menit)
    const isTargetTime = (hours === tHour && minutes >= tMin && minutes <= tMin + 2);
    if (!isTargetTime) continue;

    const scheduleKey = `${todayStr}_${timeTarget}`;
    if (executedSchedules.has(scheduleKey)) {
      // Jadwal jam ini untuk hari ini SUDAH selesai dieksekusi. Lewati agar tidak berulang!
      continue;
    }

    // Kunci eksekusi secara langsung agar interval berikutnya tidak memicu duplikasi
    executedSchedules.add(scheduleKey);

    console.log(`\n⏰ [LiveChat] Menjalankan Auto-Terminasi Terjadwal Pukul ${timeTarget} WITA (${todayStr})...`);

    const is1400Trigger = timeTarget === '14:00';
    const is1530Closing = timeTarget === '15:30' || timeTarget >= '15:00';
    const sock = _sockGetter();
    const isConn = _isConnectedGetter();
    const shouldSendMsg = settings.sendAutoTerminationMessage && sock && isConn;
    const nowSec = Math.floor(Date.now() / 1000);

    let processedCount = 0;

    for (const [chatId, session] of Object.entries(sessions)) {
      // Hanya proses sesi yang saat ini aktif (waiting_admin atau admin_active)
      // JANGAN proses sesi yang sudah 'closed' atau 'delayed' (penundaan 3 hari kerja)!
      if (session.status !== 'waiting_admin' && session.status !== 'admin_active') {
        continue;
      }
      if (session.status === 'delayed' || Boolean(session.delayed_3days) || Boolean(session.flag_3days)) {
        continue;
      }

      if (
        chatId.endsWith('@g.us') ||
        chatId.endsWith('@newsletter') ||
        chatId.includes('status@broadcast') ||
        chatId.endsWith('@broadcast') ||
        messageStore.isSelfJid(chatId)
      ) {
        continue;
      }

      // Pastikan hanya memproses sesi yang aktif dalam 24 jam terakhir
      const lastActivity = session.lastActivityAt || session.createdAt || 0;
      const hasRecentActivity = (nowSec - lastActivity) < 86400;

      const topic = session.consultationTopic || session.visitorData?.topic || 'konsultasi data';
      const sendTarget = session.lid || chatId;
      const canSendMsg = Boolean(shouldSendMsg && hasRecentActivity);

      if (is1400Trigger) {
        // =========================================================================
        // JADWAL 14.00 WITA: BERTANYA KEMBALI APAKAH MASIH ADA YANG PERLU DITANYAKAN
        // (Sesuai Pesan Konfirmasi Buku Panduan Resmi PST BPS Gorontalo Hal 1)
        // Sesi TETAP AKTIF dan TIDAK DI-CLOSED! Menunggu balasan hingga 15.30 WITA.
        // =========================================================================
        if (session.confirmation1400Date === todayStr) {
          continue; // Sudah dikirimi pesan konfirmasi hari ini
        }

        // CEK KRUSIAL: Apakah admin/petugas SUDAH PERNAH membalas chat ini hari ini (baik via SIGAP maupun via HP)?
        const adminHasReplied = hasAdminRepliedToday(chatId, session, todayStr);
        if (!adminHasReplied) {
          console.log(`⚠️ [LiveChat] Sesi ${chatId} belum pernah dibalas oleh admin/petugas hari ini. Melewati trigger konfirmasi 14.00 WITA agar tidak membingungkan pengunjung.`);
          continue;
        }

        const confirmMsg = buildConfirmationMessage(topic);

        if (canSendMsg) {
          try {
            const sent = await sock.sendMessage(sendTarget, { text: confirmMsg });
            if (sent?.key?.id) {
              registerBotMessageId(sent.key.id);
            }
            // Simpan ke message store agar tampil di explorer dashboard
            messageStore.saveMessages(chatId, [{
              key: {
                id: sent?.key?.id || `confirm-${Date.now()}`,
                remoteJid: chatId,
                fromMe: true,
              },
              message: {
                conversation: confirmMsg,
              },
              messageTimestamp: nowSec,
              pushName: 'PST BPS Gorontalo (Konfirmasi 14.00 WITA)',
            }]);
          } catch (sendErr) {
            console.error(`❌ [LiveChat] Gagal mengirim konfirmasi 14.00 WITA ke ${chatId}:`, sendErr.message);
          }
        }

        session.confirmation1400Sent = true;
        session.confirmation1400SentAt = nowSec;
        session.confirmation1400Date = todayStr;
        session.confirmation1400Replied = false;
        session.lastActivityAt = nowSec;
        processedCount++;
        console.log(`❓ [LiveChat] Pesan konfirmasi 14.00 WITA terkirim ke ${chatId}: Bertanya apakah penjelasan sudah cukup jelas / masih ada yang perlu ditanyakan.`);

      } else if (is1530Closing) {
        // =========================================================================
        // JADWAL 15.30 WITA: TERMINASI PENUTUP
        // Aturan: Jika trigger jam 14.00 masih belum dibalas oleh pengguna layanan,
        // lakukan terminasi penutup resmi PST BPS Gorontalo (+ Survei SKD) & tutup sesi!
        // =========================================================================
        if (session.lastTerminationKey === scheduleKey) {
          continue; // Sudah diterminasi pada jadwal ini hari ini
        }

        const sendFn = canSendMsg
          ? async (target, text) => await sock.sendMessage(sendTarget, { text })
          : null;

        // Cek apakah admin/petugas sudah pernah membalas hari ini (baik via SIGAP maupun via HP)
        const adminHasReplied = hasAdminRepliedToday(chatId, session, todayStr);

        // Cek apakah trigger jam 14.00 pernah terkirim hari ini dan BELUM DIBALAS
        const isTrigger1400Unreplied = (session.confirmation1400Sent && session.confirmation1400Date === todayStr && !session.confirmation1400Replied);

        let terminationType = 'end_of_day';
        let terminationMsg = '';
        let adminName = '';

        if (!adminHasReplied) {
          // KASUS KRUSIAL: Admin/petugas lupa balas hingga jam kantor tutup pukul 15.30 WITA
          // JANGAN PERNAH mengirim survei kepuasan SKD! (Pengunjung belum dilayani!)
          // Kirim permohonan maaf atas antrean padat & jaminan prioritas besok hari.
          terminationType = 'unanswered_eod';
          terminationMsg = buildUnansweredEndOfDayMessage();
          adminName = 'Sistem SIGAP (Tutup Jam Layanan - Antrean Belum Dibalas)';
          console.log(`⚠️ [LiveChat] Sesi ${chatId} belum pernah dibalas admin hingga 15.30 WITA. Mengirim pesan permohonan maaf keterlambatan respons.`);
        } else if (isTrigger1400Unreplied) {
          // Trigger jam 14.00 belum dibalas sampai 15.30 -> Pesan Penutup Layanan Selesai (+Survei SKD)
          terminationType = 'completed';
          terminationMsg = buildClosingCompletedMessage(topic);
          adminName = 'Sistem SIGAP (Auto-Terminasi Konfirmasi 14.00 Tidak Dibalas)';
        } else {
          // Jam operasional harian telah selesai pukul 15.30 -> Pesan Penutup Jam Layanan Telah Selesai
          terminationType = 'end_of_day';
          terminationMsg = buildClosingEndOfDayMessage();
          adminName = 'Sistem SIGAP (Tutup Jam Layanan 15.30 WITA)';
        }

        try {
          await terminateSession(
            chatId,
            {
              type: terminationType,
              topic: topic,
              message: terminationMsg,
              adminName: adminName,
              sendWhatsappMessage: canSendMsg
            },
            sendFn
          );
          session.lastTerminationKey = scheduleKey;
          processedCount++;
          console.log(`🔒 [LiveChat] Sesi ${chatId} berhasil diterminasi penutup pada 15.30 WITA (Tipe: ${terminationType}).`);
        } catch (err) {
          console.error(`❌ [LiveChat] Gagal auto-terminate 15.30 WITA ${chatId}:`, err.message);
        }
      }
    }

    saveSessions();
    console.log(`✅ [LiveChat] Eksekusi jadwal ${timeTarget} WITA selesai. Total sesi diproses: ${processedCount}\n`);
  }
}

// Background checker timer setiap 25 detik
setInterval(() => {
  try {
    checkScheduledTerminations();
  } catch (e) {
    console.warn('⚠️ [LiveChat Scheduled Interval] Warning:', e.message);
  }
}, 25000).unref();

// Backward compatibility alias
export const checkAndAutoTerminateSessions = checkScheduledTerminations;

export default {
  getLocalGorontaloDate,
  getTimeGreeting,
  isWithinOperatingHours,
  getNextOperatingSchedule,
  buildOpeningMessage,
  buildReturningVisitorOpeningMessage,
  buildOutOfHoursMessage,
  buildReturningVisitorOutOfHoursMessage,
  buildDelayMessage,
  buildConfirmationMessage,
  buildClosingCompletedMessage,
  buildClosing1400Message,
  buildClosingEndOfDayMessage,
  buildUnansweredEndOfDayMessage,
  hasAdminRepliedToday,
  getThreeWorkingDaysTarget,
  extractVisitorDataFromText,
  getOrCreateSession,
  saveAiAnalysis,
  analyzeIntentLocally,
  detectIncomingMessageIntent,
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
  checkScheduledTerminations,
  checkAndAutoTerminateSessions,
  isAutomatedBotMessage,
  isCourtesyOrAcknowledgmentMessage,
  isTerminationClosingText,
  clearSessions
};
