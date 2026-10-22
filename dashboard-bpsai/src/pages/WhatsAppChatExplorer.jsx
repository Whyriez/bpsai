import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import apiFetch, { API_BASE_URL } from "../services/api";
import useWhatsAppSync, { mergeMessages } from "../hooks/useWhatsAppSync";
import "./WhatsAppChatExplorer.css";

// --- High-Quality SVG Icons ---
const WhatsAppIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.031 2c-5.508 0-9.985 4.477-9.985 9.985 0 1.761.459 3.477 1.332 4.996L2 22l5.166-1.355c1.465.799 3.119 1.22 4.865 1.22h.005c5.507 0 9.984-4.477 9.984-9.985 0-2.668-1.039-5.176-2.925-7.062A9.92 9.92 0 0012.031 2zm0 18.312h-.004c-1.492 0-2.953-.401-4.227-1.159l-.303-.18-3.141.824.838-3.061-.198-.315a8.283 8.283 0 01-1.272-4.436c0-4.577 3.724-8.301 8.305-8.301 2.217 0 4.301.864 5.869 2.433a8.243 8.243 0 012.434 5.868c0 4.578-3.724 8.302-8.304 8.302zm4.551-6.216c-.249-.125-1.477-.729-1.706-.812-.228-.083-.395-.125-.561.125-.167.249-.645.812-.79 1-.146.187-.291.208-.541.083-.249-.125-1.054-.389-2.008-1.239-.742-.662-1.243-1.48-1.389-1.729-.145-.25-.016-.385.109-.509.112-.112.249-.291.374-.437.125-.145.166-.25.249-.416.083-.166.042-.312-.021-.437-.062-.125-.561-1.353-.769-1.853-.203-.487-.409-.42-.561-.428-.145-.008-.312-.01-.478-.01s-.437.062-.666.312c-.228.25-.873.854-.873 2.081 0 1.228.894 2.414 1.019 2.581.125.167 1.76 2.688 4.264 3.769.596.257 1.061.411 1.424.527.598.19 1.143.163 1.573.099.48-.072 1.477-.604 1.685-1.187.208-.583.208-1.083.146-1.187-.063-.105-.229-.167-.478-.292z" />
  </svg>
);

const SearchIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const SendIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

const CopyIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

const ExternalLinkIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
);

const MediaIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const DocumentIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const CheckDoubleIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} viewBox="0 0 16 11" fill="currentColor">
    <path d="M11.5 0.5L6.5 6L4.5 4L3 5.5L6.5 9.5L13 2L11.5 0.5ZM15 2L8.5 9.5L8.2 9.2L7 10.5L8.5 12L16.5 3.5L15 2Z" />
  </svg>
);

const ArrowLeftIcon = ({ className = "w-5 h-5" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 19l-7-7m0 0l7-7m-7 7h18"
    />
  </svg>
);

const InfoCircleIcon = ({ className = "w-5 h-5" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const StopIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
  </svg>
);

const UserCheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11l2 2 4-4" />
  </svg>
);

const ClockIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SettingsIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ReplyIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4"
    />
  </svg>
);

const SparklesIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.286L13 21l-2.286-6.857L5 12l5.714-2.286L13 3z"
    />
  </svg>
);

// --- Official PST BPS Gorontalo Templates (Conforming to Uploaded Guide) ---
const OFFICIAL_TEMPLATES = [
  {
    id: "pembuka",
    name: "Pesan Pembuka",
    category: "PANDUAN",
    badge: "Jam Layanan",
    description: "Sapaan awal saat pesan masuk dalam jam operasional layanan",
    getText: (greeting = "pagi/siang/sore") =>
`Selamat ${greeting}.
Terima kasih telah menghubungi PST BPS Provinsi Gorontalo
Mohon kesediaannya untuk mengisi data berikut ya Kak 😊
Nama : 
Pekerjaan : 
Instansi/Asal : `
  },
  {
    id: "luar_jam",
    name: "Luar Jam Layanan",
    category: "PANDUAN",
    badge: "Luar Jam Kerja",
    description: "Sapaan saat pesan masuk di luar jam kerja atau hari libur",
    getText: (greeting = "pagi/siang/sore") =>
`Selamat ${greeting}.
Mohon maaf atas keterlambatan respons kami dikarenakan pesan Anda masuk di luar jam operasional petugas layanan kami.
Terima kasih telah bersedia menunggu. Sebelumnya, mohon kesediaannya terlebih dahulu untuk menginformasikan:
Nama : 
Pekerjaan : 
Asal Instansi : `
  },
  {
    id: "penundaan",
    name: "Terminasi 3 Hari (Penundaan)",
    category: "TERMINASI",
    badge: "Flag 3 Hari",
    description: "Tandai penundaan data teknis (maks. 3 hari kerja) & pasang flag agar siap direach-out",
    getText: (greeting = "siang") =>
`Selamat ${greeting} Kak. Data yang Kakak butuhkan memerlukan proses penyiapan terlebih dahulu oleh tim teknis kami dalam waktu maksimal 3 (hari) kerja. Kami akan menghubungi Kakak kembali melalui nomor ini setelah data tersebut siap diserahkan.
Terima kasih atas pengertian dan kesediaan Kakak untuk menunggu 😊`
  },
  {
    id: "reachout_3hari",
    name: "Reach Out: Penyerahan Data Siap",
    category: "REACH OUT",
    badge: "Pasca-3 Hari",
    description: "Menghubungi kembali kontak tertanda flag saat data teknis telah siap diserahkan tim BPS",
    getText: (topic = "yang Kakak butuhkan", greeting = "siang") =>
`Selamat ${greeting} Kak. Terkait data mengenai ${topic} yang telah disiapkan oleh tim teknis kami, datanya kini sudah selesai diproses dan siap kami serahkan ya Kak.

Berikut informasinya:
[Tuliskan keterangan / tautan data di sini]

Apabila masih ada yang ingin dikonsultasikan lebih lanjut, silakan sampaikan kepada kami ya Kak 😊`
  },
  {
    id: "konfirmasi",
    name: "Konfirmasi Jawaban",
    category: "LAYANAN",
    badge: "Konfirmasi",
    description: "Menanyakan apakah data/penjelasan yang diberikan sudah jelas",
    getText: (topic = "[Topik Konsultasi]") =>
`Bagaimana Kak, terkait penjelasan mengenai ${topic} tadi, apakah sudah cukup jelas?
Kalau dirasa masih ada poin yang kurang jelas atau ada yang ingin ditanyakan lagi, silakan disampaikan saja, ya. 😊`
  },
  {
    id: "terminasi_selesai",
    name: "Terminasi: Layanan Selesai",
    category: "TERMINASI",
    badge: "Resmi + Survei SKD",
    description: "Mengakhiri konsultasi yang telah selesai disertai link survei SKD",
    getText: (topic = "[Topik Konsultasi]") =>
`Terima kasih banyak telah menghubungi nomor layanan PST BPS Provinsi Gorontalo. Dengan ini, konsultasi terkait ${topic} kami akhiri ya Kak. Agar kami bisa terus memberikan pelayanan yang lebih baik, mohon bantuannya untuk mengisi survei kepuasan singkat di tautan ini: https://s.bps.go.id/skd75

Semoga informasi yang kami sampaikan bermanfaat. Selamat melanjutkan aktivitas dan sehat selalu! 👏 😊`
  },
  {
    id: "terminasi_siang_1400",
    name: "Terminasi: Sesi Siang (14.00 WITA)",
    category: "TERMINASI",
    badge: "14.00 WITA + SKD",
    description: "Mengakhiri konsultasi sesi siang pukul 14.00 WITA disertai link survei SKD",
    getText: (topic = "[Topik Konsultasi]") =>
`Terima kasih banyak telah menghubungi nomor layanan PST BPS Provinsi Gorontalo. Sesi konsultasi terkait ${topic} pada pukul 14.00 WITA kami akhiri ya Kak.

Agar kami bisa terus memberikan pelayanan yang lebih baik, mohon bantuannya untuk mengisi survei kepuasan singkat di tautan ini: https://s.bps.go.id/skd75

Semoga informasi yang kami sampaikan bermanfaat. Selamat melanjutkan aktivitas dan sehat selalu! 👏 😊`
  },
  {
    id: "terminasi_tutup_hari",
    name: "Terminasi: Jam Tutup (15.30 WITA)",
    category: "TERMINASI",
    badge: "15.30 WITA Sore",
    description: "Mengakhiri layanan hari ini karena jam operasional berakhir (+ link SIGAP & Web)",
    getText: (schedule = "[hari, tanggal]") =>
`Selamat sore, Kak.
Mengingat jam operasional layanan hari ini telah berakhir, proses konsultasi akan kami lanjutkan kembali pada ${schedule} saat jam layanan dibuka.

Untuk kebutuhan data statistik secara mandiri, Kakak dapat mengakses tautan berikut:
• SIGAP: https://sigap.bps7500.my.id
• Website BPS Provinsi Gorontalo: https://gorontalo.bps.go.id

Kami akan menghubungi Kakak kembali pada ${schedule} untuk menjawab pertanyaan yang belum terselesaikan.

Terima kasih banyak atas pengertiannya Kak 😊`
  }
];

// Consistent avatar colors based on string
const getAvatarBg = (str = "") => {
  const colors = [
    "bg-brand text-white",
    "bg-indigo-600 text-white",
    "bg-emerald-600 text-white",
    "bg-slate-600 text-white",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash += str.charCodeAt(i);
  return colors[Math.abs(hash) % colors.length];
};

// Distinct participant name colors in group chats
const getParticipantColor = (str = "") => {
  const colors = [
    "text-emerald-700",
    "text-accent",
    "text-amber-700",
    "text-accent",
    "text-rose-700",
    "text-teal-700",
    "text-accent",
    "text-orange-700",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash += str.charCodeAt(i);
  return colors[Math.abs(hash) % colors.length];
};

// Gentle Audio Chime using Web Audio API (Zero external assets needed)
const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, now); // D5 tone
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5 tone

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // User hasn't interacted with document yet
  }
};

const requestNotificationPermission = async () => {
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch { /* Optional notification/settings enrichment may be unavailable. */ }
    }
  }
};

const showDesktopNotification = (title, body) => {
  try {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        silent: true,
      });
    }
  } catch { /* Optional notification/settings enrichment may be unavailable. */ }
};

const getTimeGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "pagi";
  if (h >= 11 && h < 15) return "siang";
  if (h >= 15 && h < 18) return "sore";
  return "malam";
};

// Intent badge configuration based on Gemini AI detection
const getIntentBadge = (intent) => {
  switch (intent) {
    case "CONTINUATION":
      return {
        label: "Melanjutkan Percakapan",
        short: "Lanjutan",
        bg: "bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800",
        icon: "🔵",
      };
    case "GREETING_NEW":
      return {
        label: "Sapaan Baru",
        short: "Sapaan",
        bg: "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
        icon: "🟢",
      };
    case "DELAY_FOLLOWUP":
      return {
        label: "Tindak Lanjut Penundaan (3 Hari)",
        short: "Progres 3 Hari",
        bg: "bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800",
        icon: "🟡",
      };
    case "COURTESY_THANKS":
      return {
        label: "Ucapan Terima Kasih",
        short: "Terima Kasih",
        bg: "bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800",
        icon: "🟣",
      };
    case "DATA_INQUIRY":
      return {
        label: "Permintaan Data Statistik",
        short: "Tanya Data",
        bg: "bg-orange-100 dark:bg-orange-950/70 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800",
        icon: "📊",
      };
    default:
      return null;
  }
};

export default function WhatsAppChatExplorer() {
  // Source: "live" (Gateway Local) or "backup" (Zip file)
  const [sourceMode, setSourceMode] = useState("live");
  const [backupFiles, setBackupFiles] = useState([]);
  const [selectedBackupFilename, setSelectedBackupFilename] = useState("");
  const [selectedBackupMeta, setSelectedBackupMeta] = useState(null);
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);

  // WhatsApp Gateway Connection Status
  const [waConnectionStatus, setWaConnectionStatus] = useState({
    is_connected: false,
    status: "CHECKING",
    phone: null,
    phone_formatted: null,
  });

  // Chats state
  const [chats, setChats] = useState([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [stats, setStats] = useState(null);

  // Active chat & messages
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeChatDetail, setActiveChatDetail] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Realtime Sync Tracking & Notifications
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [newIncomingChatIds, setNewIncomingChatIds] = useState(new Set());

  // Filtering & search
  const [searchQuery, setSearchQuery] = useState("");
  const [chatTypeFilter, setChatTypeFilter] = useState("ALL"); // ALL | DIRECT | GROUP | CHANNEL

  // Right sidebar drawer (info, media, links, participants, pst)
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState("pst"); // pst | media | links | participants

  // Reply message state
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const replyInputRef = useRef(null);
  const [isInputExpanded, setIsInputExpanded] = useState(false);

  // New Chat modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState("");
  const [newChatName, setNewChatName] = useState("");

  // Live Chat Sessions & Operating Settings
  const [liveSettings, setLiveSettings] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [, setIsSavingSettings] = useState(false);

  // Termination Modal State
  const [showTerminationModal, setShowTerminationModal] = useState(false);
  const [terminationType, setTerminationType] = useState("completed"); // 'completed' | 'end_of_day'
  const [terminationTopic, setTerminationTopic] = useState("");
  const [terminationSchedule, setTerminationSchedule] = useState("");
  const [terminationSendWhatsapp, setTerminationSendWhatsapp] = useState(true);
  const [isSubmittingTermination, setIsSubmittingTermination] = useState(false);

  // 3-Day Delay Modal State
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [delayTopic, setDelayTopic] = useState("");
  const [delayNote, setDelayNote] = useState("");
  const [delaySendWhatsapp, setDelaySendWhatsapp] = useState(true);
  const [isSubmittingDelay, setIsSubmittingDelay] = useState(false);

  // Gemini AI Smart Intent State
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [showAiCard, setShowAiCard] = useState(true);

  const messagesEndRef = useRef(null);
  const messageFeedRef = useRef(null);
  const followMessagesRef = useRef(true);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const viewRef = useRef({ sourceMode, activeChatId, selectedBackupFilename });
  useEffect(() => {
    viewRef.current = { sourceMode, activeChatId, selectedBackupFilename };
  });

  const { fetchLiveChats, fetchLiveChatDetail } = useWhatsAppSync({
    sourceMode, activeChatId, chats, activeChatDetail,
    setChats, setStats, setActiveChatId, setActiveChatDetail,
    setIsLoadingChats, setIsLoadingDetail, setWaConnectionStatus,
    setLastSyncTime, setSyncError, setNewIncomingChatIds, setRightPanelTab,
    notify: (name, text, active) => {
      playNotificationSound();
      if (!active || document.hidden) {
        showDesktopNotification(`Pesan baru dari ${name || "Pengunjung"}`, text || "Mengirim pesan baru");
      }
    },
  });

  const handleStartNewChat = (e) => {
    e?.preventDefault();
    if (!newChatPhone.trim()) {
      toast.error("Nomor WhatsApp wajib diisi");
      return;
    }
    let raw = newChatPhone.trim().replace(/[^\d]/g, "");
    if (raw.startsWith("0")) raw = "62" + raw.slice(1);
    if (!raw.startsWith("62")) raw = "62" + raw;
    const jid = `${raw}@s.whatsapp.net`;
    const formatted = `+62 ${raw.slice(2, 5)}-${raw.slice(5, 9)}-${raw.slice(9)}`;
    const name = newChatName.trim() || formatted;

    const existing = chats.find((c) => c.id === jid);
    if (!existing) {
      const newEntry = {
        id: jid,
        name,
        phone: formatted,
        raw_phone: raw,
        type: "direct",
        is_direct: true,
        is_group: false,
        is_channel: false,
        message_count: 0,
        last_message: {
          text: "Obrolan baru siap dimulai",
          type: "text",
          timestamp: Math.floor(Date.now() / 1000),
          fromMe: false,
        },
      };
      setChats((prev) => [newEntry, ...prev]);
    }
    setActiveChatId(jid);
    setShowNewChatModal(false);
    setNewChatPhone("");
    setNewChatName("");
    toast.success(`Obrolan dengan ${name} siap!`);
  };

  // Load chats on mount or source mode change
  useEffect(() => {
    if (sourceMode === "backup") fetchBackupList();
  }, [sourceMode]);

  // When selected backup changes in backup mode
  useEffect(() => {
    if (sourceMode === "backup" && selectedBackupFilename) {
      inspectBackup(selectedBackupFilename);
    }
  }, [sourceMode, selectedBackupFilename]);

  // Load chat detail when activeChatId changes
  useEffect(() => {
    setReplyingToMessage(null);
    setActiveChatDetail(null);
    setIsLoadingDetail(sourceMode === "live" && Boolean(activeChatId));
    followMessagesRef.current = true;
    setHasUnreadMessages(false);
    if (!activeChatId) {
      setActiveChatDetail(null);
      return;
    }
    // Hapus badge chat baru untuk obrolan yang sedang dibuka
    setNewIncomingChatIds((prev) => {
      if (!prev.has(activeChatId)) return prev;
      const next = new Set(prev);
      next.delete(activeChatId);
      return next;
    });

    if (sourceMode === "backup" && selectedBackupFilename) {
      fetchBackupChatDetail(selectedBackupFilename, activeChatId);
    }
  }, [activeChatId, sourceMode, selectedBackupFilename]);

  // Follow new messages only while the operator is reading the latest messages.
  useEffect(() => {
    const feed = messageFeedRef.current;
    if (!feed || !activeChatDetail?.messages?.length || isLoadingDetail) return;
    if (followMessagesRef.current) {
      feed.scrollTop = feed.scrollHeight;
      setHasUnreadMessages(false);
    } else {
      setHasUnreadMessages(true);
    }
  }, [activeChatDetail?.messages?.length, activeChatId, isLoadingDetail]);

  // Fetch settings separately on demand
  const fetchLiveSettings = async () => {
    try {
      const res = await apiFetch("/documents/bps/whatsapp-explorer/sessions-settings");
      if (res.success) {
        setLiveSettings(res.settings);
      }
    } catch { /* Optional notification/settings enrichment may be unavailable. */ }
  };

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      const results = await Promise.all([
        fetchLiveChats(true),
        activeChatId ? fetchLiveChatDetail(activeChatId, true) : Promise.resolve(true),
      ]);
      if (results.every(Boolean)) toast.success("Data percakapan berhasil disegarkan!");
      else toast.error("Sinkronisasi belum selesai. Akan dicoba kembali otomatis.");
    } finally {
      setIsManualSyncing(false);
    }
  };

  useEffect(() => {
    if (sourceMode !== "live") return;
    requestNotificationPermission();
    fetchLiveSettings();
  }, [sourceMode]);

  // Handle Admin Takeover
  const handleTakeover = async (chatId) => {
    try {
      const res = await apiFetch(`/documents/bps/whatsapp-explorer/sessions/${encodeURIComponent(chatId)}/takeover`, {
        method: "POST",
        body: JSON.stringify({ adminName: "Admin PST" })
      });
      if (res.success) {
        toast.success("Sesi obrolan berhasil diambil alih oleh admin!");
        setActiveChatDetail((prev) => prev ? { ...prev, session_status: "admin_active" } : prev);
        setChats((prev) => prev.map(c => c.id === chatId ? { ...c, session_status: "admin_active" } : c));
      } else {
        toast.error(res.error || "Gagal mengambil alih sesi");
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    }
  };

  // Submit Penundaan (3 Hari Kerja)
  const handleConfirmDelay = async (e) => {
    e?.preventDefault();
    const targetId = activeChatId;
    if (!targetId) return;
    setIsSubmittingDelay(true);
    try {
      const res = await apiFetch(`/documents/bps/whatsapp-explorer/sessions/${encodeURIComponent(targetId)}/delay`, {
        method: "POST",
        body: JSON.stringify({
          adminName: "Admin PST",
          topic: delayTopic.trim() || "Penyiapan data statistik",
          note: delayNote.trim() || "",
          sendMessage: delaySendWhatsapp,
        }),
      });
      if (res.success) {
        toast.success(
          `Flag penundaan 3 hari kerja berhasil diaktifkan! ${delaySendWhatsapp ? "Pesan WA terkirim." : ""}`
        );
        setShowDelayModal(false);
        fetchLiveChatDetail(targetId);
        fetchLiveChats();
      } else {
        toast.error(res.error || "Gagal menandai penundaan");
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsSubmittingDelay(false);
    }
  };

  // Trigger Gemini AI Intent Detection & Suggested Reply
  const handleAnalyzeAiIntent = async () => {
    if (!activeChatId || !activeChatDetail) return;
    setIsAnalyzingAi(true);
    setShowAiCard(true);

    try {
      const msgs = activeChatDetail.messages || [];
      const lastIncoming = [...msgs].reverse().find((m) => !m.fromMe);
      const incomingText = lastIncoming?.text || (msgs.length > 0 ? msgs[msgs.length - 1]?.text : "");

      const recentMsgs = msgs.slice(-8).map((m) => ({
        text: m.text || "",
        fromMe: Boolean(m.fromMe),
        timestamp: m.timestamp || Math.floor(Date.now() / 1000),
      }));

      const res = await apiFetch("/documents/bps/whatsapp-explorer/ai-detect-intent", {
        method: "POST",
        body: JSON.stringify({
          chat_id: activeChatId,
          incoming_text: incomingText,
          recent_messages: recentMsgs,
          session_meta: {
            status: activeChatDetail.session_status,
            delayed_3days: Boolean(activeChatDetail.delayed_3days),
            delayed_topic: activeChatDetail.delayed_topic || activeChatDetail.consultation_topic,
            visitor_data: activeChatDetail.visitor_data,
            topic: activeChatDetail.consultation_topic,
          },
        }),
      });

      if (res?.success && res.analysis) {
        const analysis = res.analysis;
        setActiveChatDetail((prev) =>
          prev
            ? {
                ...prev,
                ai_analysis: analysis,
                ai_intent: analysis.intent,
                ai_topic: analysis.topic,
                ai_suggested_reply: analysis.suggested_reply,
                ai_analyzed_at: Math.floor(Date.now() / 1000),
              }
            : prev
        );

        setChats((prev) =>
          prev.map((c) =>
            c.id === activeChatId
              ? {
                  ...c,
                  ai_intent: analysis.intent,
                  ai_topic: analysis.topic,
                  ai_suggested_reply: analysis.suggested_reply,
                  ai_analyzed_at: Math.floor(Date.now() / 1000),
                }
              : c
          )
        );

        try {
          await apiFetch(`/documents/bps/whatsapp-explorer/sessions/${encodeURIComponent(activeChatId)}/ai-analysis`, {
            method: "POST",
            body: JSON.stringify(analysis),
          });
        } catch { /* Optional notification/settings enrichment may be unavailable. */ }

        const b = getIntentBadge(analysis.intent);
        toast.success(`✨ Intent: ${b ? b.label : analysis.intent}`);
      } else {
        toast.error(res?.error || "Gagal menganalisis obrolan dengan AI");
      }
    } catch (err) {
      toast.error(`Analisis AI gagal: ${err.message}`);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // Handle Reopen Session
  const handleReopen = async (chatId) => {
    try {
      const res = await apiFetch(`/documents/bps/whatsapp-explorer/sessions/${encodeURIComponent(chatId)}/reopen`, {
        method: "POST"
      });
      if (res.success) {
        toast.success("Sesi obrolan dibuka kembali!");
        fetchLiveChatDetail(chatId);
        fetchLiveChats();
      } else {
        toast.error(res.error || "Gagal membuka sesi kembali");
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    }
  };

  // Open Termination Modal
  const handleOpenTerminationModal = (chat, initialType = null) => {
    const topic = chat?.visitor_data?.topic || chat?.consultation_topic || chat?.delayed_topic || "";
    setTerminationTopic(topic);
    if (initialType) {
      setTerminationType(initialType);
    } else if (terminationType !== "delayed_3days") {
      setTerminationType("completed");
    }
    setTerminationSchedule(liveSettings?.nextOperatingSchedule || "hari kerja berikutnya pukul 08.00 WITA");
    setTerminationSendWhatsapp(true);
    setShowTerminationModal(true);
  };

  // Live text preview for termination
  const getTerminationPreviewText = () => {
    if (terminationType === "delayed_3days") {
      const greeting = getTimeGreeting();
      return (
`Selamat ${greeting} Kak. Data yang Kakak butuhkan memerlukan proses penyiapan terlebih dahulu oleh tim teknis kami dalam waktu maksimal 3 (hari) kerja. Kami akan menghubungi Kakak kembali melalui nomor ini setelah data tersebut siap diserahkan.
Terima kasih atas pengertian dan kesediaan Kakak untuk menunggu 😊`
      );
    } else if (terminationType === "end_of_day") {
      const sched = terminationSchedule.trim() || liveSettings?.nextOperatingSchedule || "hari kerja berikutnya pukul 08.00 WITA";
      const sigapUrl = liveSettings?.links?.sigapUrl || "https://sigap.bps7500.my.id";
      const bpsUrl = liveSettings?.links?.bpsWebsiteUrl || "https://gorontalo.bps.go.id";
      return (
`Selamat sore, Kak.
Mengingat jam operasional layanan hari ini telah berakhir, proses konsultasi akan kami lanjutkan kembali pada ${sched} saat jam layanan dibuka.

Untuk kebutuhan data statistik secara mandiri, Kakak dapat mengakses tautan berikut:
• SIGAP: ${sigapUrl}
• Website BPS Provinsi Gorontalo: ${bpsUrl}

Kami akan menghubungi Kakak kembali pada ${sched} untuk menjawab pertanyaan yang belum terselesaikan.

Terima kasih banyak atas pengertiannya Kak 😊`
      );
    } else if (terminationType === "midday_1400") {
      const top = terminationTopic.trim() || "konsultasi data";
      const surveyUrl = liveSettings?.links?.surveyUrl || "https://s.bps.go.id/skd75";
      return (
`Terima kasih banyak telah menghubungi nomor layanan PST BPS Provinsi Gorontalo. Sesi konsultasi terkait ${top} pada pukul 14.00 WITA kami akhiri ya Kak.

Agar kami bisa terus memberikan pelayanan yang lebih baik, mohon bantuannya untuk mengisi survei kepuasan singkat di tautan ini: ${surveyUrl}

Semoga informasi yang kami sampaikan bermanfaat. Selamat melanjutkan aktivitas dan sehat selalu! 👏 😊`
      );
    } else {
      const top = terminationTopic.trim() || "konsultasi data";
      const surveyUrl = liveSettings?.links?.surveyUrl || "https://s.bps.go.id/skd75";
      return (
`Terima kasih banyak telah menghubungi nomor layanan PST BPS Provinsi Gorontalo. Dengan ini, konsultasi terkait ${top} kami akhiri ya Kak. Agar kami bisa terus memberikan pelayanan yang lebih baik, mohon bantuannya untuk mengisi survei kepuasan singkat di tautan ini: ${surveyUrl}

Semoga informasi yang kami sampaikan bermanfaat. Selamat melanjutkan aktivitas dan sehat selalu! 👏 😊`
      );
    }
  };

  // Execute Termination
  const handleExecuteTermination = async () => {
    if (!activeChatDetail) return;
    setIsSubmittingTermination(true);
    try {
      const res = await apiFetch(`/documents/bps/whatsapp-explorer/sessions/${encodeURIComponent(activeChatDetail.id)}/terminate`, {
        method: "POST",
        body: JSON.stringify({
          type: terminationType,
          topic: terminationTopic.trim() || "Penyiapan data statistik",
          nextSchedule: terminationSchedule.trim() || liveSettings?.nextOperatingSchedule,
          adminName: "Admin PST",
          sendWhatsappMessage: terminationSendWhatsapp,
          note: delayNote.trim() || ""
        })
      });
      if (res.success) {
        toast.success(
          terminationType === "end_of_day"
            ? "Sesi ditutup (Jam Layanan Berakhir 15.30 WITA)!"
            : terminationType === "midday_1400"
            ? "Sesi 14.00 WITA berhasil diterminasi & survei SKD dikirim!"
            : terminationType === "delayed_3days"
            ? "Flag Terminasi 3 Hari berhasil diaktifkan! Kontak masuk ke list untuk direach out."
            : "Sesi berhasil diterminasi & survei SKD dikirim!"
        );
        setShowTerminationModal(false);
        fetchLiveChatDetail(activeChatDetail.id);
        fetchLiveChats();
      } else {
        toast.error(res.error || "Gagal melakukan terminasi sesi");
      }
    } catch (err) {
      toast.error(`Gagal terminasi: ${err.message}`);
    } finally {
      setIsSubmittingTermination(false);
    }
  };

  // Apply Quick Template to Input Area
  const handleApplyTemplate = (tmpl) => {
    if (tmpl.id === "terminasi_selesai") {
      setTerminationType("completed");
      handleOpenTerminationModal(activeChatDetail);
      return;
    }
    if (tmpl.id === "terminasi_siang_1400") {
      setTerminationType("midday_1400");
      handleOpenTerminationModal(activeChatDetail);
      return;
    }
    if (tmpl.id === "terminasi_tutup_hari") {
      setTerminationType("end_of_day");
      handleOpenTerminationModal(activeChatDetail);
      return;
    }
    if (tmpl.id === "penundaan") {
      setTerminationType("delayed_3days");
      handleOpenTerminationModal(activeChatDetail);
      return;
    }
    if (tmpl.id === "reachout_3hari") {
      const topic = activeChatDetail?.delayed_topic || activeChatDetail?.visitor_data?.topic || activeChatDetail?.consultation_topic || "yang Kakak butuhkan";
      const timeGreeting = liveSettings?.currentGreeting || getTimeGreeting();
      setReplyText(tmpl.getText(topic, timeGreeting));
      replyInputRef.current?.focus();
      return;
    }
    if (tmpl.id === "konfirmasi") {
      const topic = activeChatDetail?.visitor_data?.topic || activeChatDetail?.consultation_topic || "[Topik Konsultasi]";
      setReplyText(tmpl.getText(topic));
      return;
    }
    const timeGreeting = liveSettings?.currentGreeting || "pagi/siang/sore";
    setReplyText(tmpl.getText(timeGreeting));
  };

  // Save Settings
  const handleSaveLiveSettings = async (updates, keepOpen = false) => {
    setIsSavingSettings(true);
    try {
      const res = await apiFetch("/documents/bps/whatsapp-explorer/sessions-settings", {
        method: "POST",
        body: JSON.stringify(updates)
      });
      if (res.success) {
        setLiveSettings(res.settings);
        toast.success("Pengaturan berhasil disimpan!");
        if (!keepOpen) {
          setShowSettingsModal(false);
        }
      } else {
        toast.error(res.error || "Gagal memperbarui pengaturan");
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // 3. Fetch list of available backup ZIPs
  const fetchBackupList = async () => {
    setIsLoadingChats(true);
    try {
      const res = await apiFetch("/documents/bps/whatsapp-explorer/backups");
      if (viewRef.current.sourceMode !== "backup") return;
      if (res.success && res.backups) {
        setBackupFiles(res.backups);
        if (res.backups.length > 0) {
          setSelectedBackupFilename(res.backups[0].filename);
        } else {
          setChats([]);
          toast("Belum ada berkas backup di server.", { icon: "ℹ️" });
        }
      }
    } catch (err) {
      toast.error(`Gagal memuat daftar backup: ${err.message}`);
    } finally {
      setIsLoadingChats(false);
    }
  };

  // Unduh file backup ZIP langsung sebagai Blob (tidak pernah redirect ke localhost atau buka tab baru)
  const handleDownloadBackup = async (filename) => {
    if (!filename) return;
    setIsDownloadingBackup(true);
    const toastId = toast.loading(`Mengunduh berkas ${filename}...`);
    try {
      const token = localStorage.getItem("access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const downloadEndpoint = `/documents/bps/whatsapp-explorer/backups/download/${encodeURIComponent(filename)}`;
      const downloadUrl = `${API_BASE_URL}${downloadEndpoint}`;
      const response = await fetch(downloadUrl, { headers });

      if (!response.ok) {
        throw new Error(`Gagal mengunduh berkas backup (HTTP ${response.status})`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);

      toast.success(`Berkas ${filename} berhasil diunduh!`, { id: toastId });
    } catch (err) {
      console.error("Gagal mengunduh backup ZIP:", err);
      toast.error(`Gagal mengunduh: ${err.message}`, { id: toastId });
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  // 4. Inspect specific backup ZIP
  const inspectBackup = async (filename) => {
    setIsLoadingChats(true);
    try {
      const res = await apiFetch(
        `/documents/bps/whatsapp-explorer/backups/inspect?filename=${encodeURIComponent(filename)}`,
      );
      if (viewRef.current.sourceMode !== "backup" || viewRef.current.selectedBackupFilename !== filename) return;
      if (res.success) {
        setSelectedBackupMeta({
          filename,
          phone: res.phone || null,
          phone_formatted: res.phone_formatted || null,
          created_at: res.backup_info?.created_at || null,
          summary: res.summary || null,
        });
        const mappedChats = (res.chats || []).map((c) => {
          const chatId = c.id || c.chat_id || "";
          const chatName = c.name || c.chat_name || (chatId && chatId.includes("@") ? chatId.split("@")[0] : "Obrolan");
          const isGrp = c.is_group ?? (c.type === "group" || chatId.endsWith("@g.us"));
          const isCh = c.is_channel ?? (c.type === "channel" || chatId.endsWith("@newsletter"));
          const isDir = c.is_direct ?? (!isGrp && !isCh);
          const rawPhone = c.raw_phone || (isDir && chatId.includes("@") ? chatId.split("@")[0] : (isDir && /^\d+$/.test(chatId) ? chatId : null));
          const phone = c.phone || rawPhone;

          return {
            id: chatId,
            name: chatName,
            phone: phone,
            raw_phone: rawPhone,
            type: c.type || (isGrp ? "group" : isCh ? "channel" : "direct"),
            is_group: isGrp,
            is_channel: isCh,
            is_direct: isDir,
            message_count: c.message_count || 0,
            last_message: c.last_message || {
              text: "Pesan tersimpan dalam backup",
              type: "text",
              timestamp: null,
              fromMe: false,
            },
          };
        });

        const existingIds = new Set(mappedChats.map((c) => c.id).filter(Boolean));
        (res.groups || []).forEach((g) => {
          const gId = g.id || "";
          if (gId && !existingIds.has(gId)) {
            const rawG = gId.includes("@") ? gId.split("@")[0] : gId;
            mappedChats.push({
              id: gId,
              name: g.subject || g.name || (rawG ? `Grup (${rawG.slice(-6)})` : "Grup WhatsApp"),
              phone: null,
              raw_phone: null,
              type: "group",
              is_group: true,
              is_channel: false,
              is_direct: false,
              message_count: 0,
              last_message: {
                text:
                  g.desc ||
                  `Grup WhatsApp dengan ${g.participant_count || g.participants?.length || 0} anggota`,
                type: "text",
                timestamp: g.creation || null,
                fromMe: false,
              },
            });
            existingIds.add(gId);
          }
        });

        (res.channels || []).forEach((ch) => {
          const chId = ch.id || "";
          if (chId && !existingIds.has(chId)) {
            mappedChats.push({
              id: chId,
              name: ch.name || "Saluran Resmi WhatsApp",
              phone: null,
              raw_phone: null,
              type: "channel",
              is_group: false,
              is_channel: true,
              is_direct: false,
              message_count: 0,
              last_message: {
                text: ch.description || "Saluran Resmi",
                type: "text",
                timestamp: null,
                fromMe: false,
              },
            });
            existingIds.add(chId);
          }
        });

        setChats(mappedChats);
        setStats(res.summary || null);
        if (mappedChats.length > 0 && window.innerWidth >= 768) {
          setActiveChatId(mappedChats[0].id);
        } else if (mappedChats.length === 0) {
          setActiveChatId(null);
          setActiveChatDetail(null);
        }
      } else {
        toast.error(res.error || "Gagal membaca isi berkas backup ZIP");
      }
    } catch (err) {
      toast.error(`Gagal menginspeksi ZIP: ${err.message}`);
    } finally {
      if (viewRef.current.sourceMode === "backup" && viewRef.current.selectedBackupFilename === filename) setIsLoadingChats(false);
    }
  };

  // 5. Fetch chat detail from backup ZIP
  const fetchBackupChatDetail = async (filename, chatId) => {
    setIsLoadingDetail(true);
    try {
      const res = await apiFetch(
        `/documents/bps/whatsapp-explorer/backups/chat?filename=${encodeURIComponent(filename)}&chatId=${encodeURIComponent(chatId)}`,
      );
      if (viewRef.current.sourceMode !== "backup" || viewRef.current.selectedBackupFilename !== filename || viewRef.current.activeChatId !== chatId) return;
      if (res.success && res.chat) {
        setActiveChatDetail(res.chat);
      } else {
        toast.error(res.error || "Gagal memuat pesan dari backup");
      }
    } catch (err) {
      toast.error(`Gagal memuat riwayat backup: ${err.message}`);
    } finally {
      if (viewRef.current.sourceMode === "backup" && viewRef.current.activeChatId === chatId) setIsLoadingDetail(false);
    }
  };

  // Helper to start quoting a message
  const handleInitiateReply = (m) => {
    if (sourceMode !== "live") {
      toast.info("Fitur membalas pesan hanya tersedia pada mode Live.");
      return;
    }
    const isOut = Boolean(m.fromMe);
    const senderName = isOut
      ? "Anda (Admin)"
      : m.pushName ||
        (activeChatDetail?.is_group && m.participant
          ? m.participant.split("@")[0]
          : activeChatDetail?.name || "Pengguna");
    const snippet =
      m.text ||
      (m.type === "image"
        ? "[Foto / Gambar]"
        : m.type === "document"
        ? `[Dokumen: ${m.mediaInfo?.fileName || "File"}]`
        : m.type === "audio"
        ? "[Pesan Suara]"
        : "[Pesan]");

    setReplyingToMessage({
      id: m.id,
      fromMe: isOut,
      sender: senderName,
      participant: m.participant || (activeChatDetail?.is_group ? m.participant : null),
      text: snippet,
    });

    setTimeout(() => {
      replyInputRef.current?.focus();
    }, 50);
  };

  // 6. Send reply to current chat (supports quoting)
  const handleSendReply = async (e) => {
    e?.preventDefault();
    if (!replyText.trim() || !activeChatDetail || isSendingReply) return;

    setIsSendingReply(true);
    const selectedChatId = activeChatId;
    const target = activeChatDetail.raw_phone || activeChatDetail.phone || activeChatDetail.id;
    const msg = replyText.trim();
    const quotedPayload = replyingToMessage
      ? {
          quotedMsgId: replyingToMessage.id,
          quotedParticipant: replyingToMessage.participant || null,
          quotedText: replyingToMessage.text || null,
          quotedSender: replyingToMessage.sender || null,
          quotedFromMe: replyingToMessage.fromMe ?? false,
        }
      : {};

    try {
      const res = await apiFetch("/documents/bps/whatsapp-explorer/reply", {
        method: "POST",
        body: JSON.stringify({
          target,
          message: msg,
          ...quotedPayload,
        }),
      });

      if (res.success) {
        toast.success(`Pesan diteruskan ke WhatsApp ${activeChatDetail.name || target}.`);
        if (viewRef.current.sourceMode === "live" && viewRef.current.activeChatId === selectedChatId) {
          setReplyText((draft) => draft.trim() === msg ? "" : draft);
          setReplyingToMessage(null);
          followMessagesRef.current = true;
        }

        const sentQuoted = replyingToMessage
          ? {
              id: replyingToMessage.id,
              participant: replyingToMessage.participant || null,
              text: replyingToMessage.text,
              sender: replyingToMessage.sender,
            }
          : null;
        const newMsg = {
          id: res.message_id || `out-${Date.now()}`,
          fromMe: true,
          text: msg,
          type: "text",
          timestamp: Math.floor(Date.now() / 1000),
          pushName: "SIGAP Admin",
          quoted: sentQuoted,
        };

        setActiveChatDetail((prev) => {
          if (!prev || prev.id !== target || viewRef.current.sourceMode !== "live") return prev;
          return {
            ...prev,
            messages: mergeMessages(prev.messages, [newMsg]),
            total_messages: (prev.total_messages || 0) + 1,
          };
        });

        setChats((prev) => viewRef.current.sourceMode !== "live" ? prev :
          prev.map((c) =>
            c.id === target
              ? {
                  ...c,
                  message_count: (c.message_count || 0) + 1,
                  last_message: {
                    text: msg,
                    type: "text",
                    timestamp: Math.floor(Date.now() / 1000),
                    fromMe: true,
                  },
                }
              : c,
          ),
        );

        if (viewRef.current.sourceMode === "live") {
          fetchLiveChatDetail(viewRef.current.activeChatId, true);
          fetchLiveChats(true);
        }
      } else {
        toast.error(res.error || "Gagal mengirim balasan WhatsApp");
      }
    } catch (err) {
      toast.error(`Pengiriman gagal: ${err.message}`);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Copy helper
  const handleCopy = (text, label = "Nomor") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} disalin ke papan klip!`);
  };

  // Filtered chats list
  const filteredChats = chats.filter((c) => {
    if (chatTypeFilter === "DIRECT" && !c.is_direct) return false;
    if (chatTypeFilter === "GROUP" && !c.is_group) return false;
    if (chatTypeFilter === "CHANNEL" && !c.is_channel) return false;
    if (
      (chatTypeFilter === "DELAYED" || chatTypeFilter === "FLAG_3DAYS") &&
      !(c.flag_3days || c.delayed_3days || c.session_status === "delayed")
    )
      return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (c.name || "").toLowerCase().includes(q);
      const matchPhone = (c.phone || c.raw_phone || c.id || "")
        .toLowerCase()
        .includes(q);
      const matchLastMsg = (c.last_message?.text || "")
        .toLowerCase()
        .includes(q);
      return matchName || matchPhone || matchLastMsg;
    }
    return true;
  });

  const flaggedChatsCount = chats.filter(
    (c) => c.flag_3days || c.delayed_3days || c.session_status === "delayed"
  ).length;

  const activeChat =
    chats.find((c) => c.id === activeChatId) || activeChatDetail;

  // Format timestamp helper
  const formatTime = (ts) => {
    if (!ts) return "";
    const date = new Date(ts * 1000);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };

  const formatMessageDate = (ts) => {
    if (!ts) return "";
    const date = new Date(ts * 1000);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const renderTextWithLinks = (text) => {
    if (!text) return "";
    const urlRegex = /(https?:\/\/[^\s<>"'()]+)/gi;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent font-medium underline hover:text-accent break-all inline-flex items-center gap-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <span>{part}</span>
            <ExternalLinkIcon className="w-3 h-3 inline-block ml-0.5" />
          </a>
        );
      }
      return part;
    });
  };

  const renderMessageGroups = () => {
    if (!activeChatDetail?.messages || activeChatDetail.messages.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[350px] text-faint text-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-100/60 flex items-center justify-center mb-3 shadow-inner">
            <WhatsAppIcon className="w-8 h-8 text-emerald-600 opacity-80" />
          </div>
          <p className="font-semibold text-ink">Belum Ada Riwayat Pesan</p>
          <p className="text-xs text-faint mt-1 max-w-xs text-center">
            Pesan yang masuk atau keluar dengan kontak ini akan otomatis
            tersinkronisasi di sini.
          </p>
        </div>
      );
    }

    const groups = [];
    let currentDate = null;
    let currentMsgs = [];

    activeChatDetail.messages.forEach((msg) => {
      const dateStr = formatMessageDate(msg.timestamp);
      if (dateStr !== currentDate) {
        if (currentMsgs.length > 0) {
          groups.push({ date: currentDate, messages: currentMsgs });
        }
        currentDate = dateStr;
        currentMsgs = [msg];
      } else {
        currentMsgs.push(msg);
      }
    });
    if (currentMsgs.length > 0) {
      groups.push({ date: currentDate, messages: currentMsgs });
    }

    return groups.map((grp, gIdx) => (
      <div key={`grp-${gIdx}`} className="space-y-2">
        {/* Date Divider (WhatsApp Web Style) */}
        <div className="flex justify-center my-3.5 sticky top-2 z-10">
          <span className="bg-surface/95 backdrop-blur-md shadow-xs border border-line/70 text-muted text-[11px] font-semibold px-3 py-1 rounded-lg uppercase tracking-wider">
            {grp.date}
          </span>
        </div>

        {/* Message Bubbles */}
        {grp.messages.map((m, mIdx) => {
          const isOut = m.fromMe;
          return (
            <div
              key={m.id || `msg-${mIdx}`}
              className={`flex ${isOut ? "justify-end" : "justify-start"} px-1 md:px-4 group relative items-center gap-1.5`}
            >
              {/* Left action button if outgoing message */}
              {isOut && sourceMode === "live" && (
                <button
                  type="button"
                  onClick={() => handleInitiateReply(m)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full text-muted hover:text-emerald-600 hover:bg-hover cursor-pointer"
                  title="Balas pesan ini"
                >
                  <ReplyIcon className="w-3.5 h-3.5" />
                </button>
              )}

              <div
                className={`max-w-[85%] md:max-w-[70%] lg:max-w-[62%] px-3.5 py-2 text-sm shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] relative transition-all ${
                  isOut
                    ? "bg-accent-soft text-ink rounded-2xl rounded-tr-xs border border-emerald-200/40"
                    : "bg-surface text-ink rounded-2xl rounded-tl-xs border border-line/60"
                }`}
              >
                {/* Sender Name in Group */}
                {!isOut && activeChatDetail.is_group && (
                  <div className="text-[11px] font-bold mb-1 flex items-center justify-between gap-3">
                    <span
                      className={getParticipantColor(
                        m.pushName || m.participant || "",
                      )}
                    >
                      {m.pushName || "Peserta"}
                    </span>
                    {m.participant && (
                      <span className="text-[10px] text-faint font-mono font-normal">
                        {m.participant.split("@")[0]}
                      </span>
                    )}
                  </div>
                )}

                {/* Quoted Message Preview inside bubble */}
                {m.quoted && (
                  <div className="mb-2 p-2 rounded-lg bg-black/5 dark:bg-white/5 border-l-4 border-emerald-500 text-xs overflow-hidden">
                    <div className="font-bold text-[11px] text-emerald-700 dark:text-emerald-400 truncate mb-0.5 flex items-center gap-1">
                      <ReplyIcon className="w-3 h-3 rotate-180 scale-y-[-1]" />
                      <span>
                        {m.quoted.sender ||
                          (m.quoted.participant
                            ? m.quoted.participant.split("@")[0]
                            : "Pesan Dibalas")}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-muted line-clamp-2 truncate">
                      {m.quoted.text || "Lampiran pesan"}
                    </p>
                  </div>
                )}

                {/* Media Indicator / Card */}
                {m.type === "image" && (
                  <div className="mb-2 p-2.5 bg-black/5 rounded-xl border border-black/10 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <MediaIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-ink text-xs">
                        Foto / Gambar
                      </p>
                      <p className="text-[11px] text-muted font-mono">
                        {m.mediaInfo?.mimetype || "image/jpeg"}
                      </p>
                    </div>
                  </div>
                )}

                {m.type === "document" && (
                  <div className="mb-2 p-2.5 bg-accent-soft/90 rounded-xl border border-blue-200 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
                      <DocumentIcon className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-semibold text-blue-950 text-xs truncate">
                        {m.text || m.mediaInfo?.fileName || "Dokumen File"}
                      </p>
                      <p className="text-[11px] text-accent font-mono">
                        {m.mediaInfo?.mimetype || "application/pdf"}
                      </p>
                    </div>
                  </div>
                )}

                {m.type === "audio" && (
                  <div className="mb-2 p-2.5 bg-accent-soft/90 rounded-xl border border-purple-200 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0 text-sm">
                      🎙️
                    </div>
                    <div>
                      <p className="font-semibold text-purple-950 text-xs">
                        Pesan Suara / Audio
                      </p>
                      {m.mediaInfo?.seconds && (
                        <p className="text-[11px] text-accent font-mono">
                          {m.mediaInfo.seconds} detik
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Text Content with Clickable URLs */}
                {m.text && m.type !== "document" ? (
                  <p className="whitespace-pre-wrap leading-relaxed break-words text-[13.5px] text-ink">
                    {renderTextWithLinks(m.text)}
                  </p>
                ) : !m.text && !m.mediaInfo ? (
                  <p className="text-[12px] italic text-muted flex items-center gap-1.5 py-0.5">
                    <span className="text-faint">🔒</span>
                    <span>Pesan terenkripsi end-to-end</span>
                  </p>
                ) : null}

                {/* Timestamp & Status (Bottom right) */}
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-faint font-medium">
                  <span>{formatTime(m.timestamp)}</span>
                  {isOut && (
                    <span className="text-muted" title="Diteruskan ke WhatsApp; penerimaan belum dikonfirmasi">✓</span>
                  )}
                  {sourceMode === "live" && (
                    <button
                      type="button"
                      onClick={() => handleInitiateReply(m)}
                      className="ml-1 opacity-60 hover:opacity-100 hover:text-emerald-600 p-0.5 rounded cursor-pointer transition-opacity md:hidden"
                      title="Balas pesan"
                    >
                      <ReplyIcon className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Right action button if incoming message */}
              {!isOut && sourceMode === "live" && (
                <button
                  type="button"
                  onClick={() => handleInitiateReply(m)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full text-muted hover:text-emerald-600 hover:bg-hover cursor-pointer"
                  title="Balas pesan ini"
                >
                  <ReplyIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    ));
  };

  return (
    // Outer Container: 100% fit in to parent viewport, zero outer scroll!
    <div className="wa-explorer w-full h-full flex overflow-hidden bg-canvas text-ink">
      {/* ======================================================== */}
      {/* COLUMN 1: LEFT SIDEBAR (CHATS LIST) — Proportional Width */}
      {/* ======================================================== */}
      <div
        className={`${
          activeChatId ? "hidden md:flex" : "flex"
        } wa-chat-list w-full md:w-[300px] lg:w-[320px] xl:w-[350px] shrink-0 flex-col bg-surface border-r border-line h-full z-10`}
      >
        {/* Sidebar Header (WhatsApp Web Style) */}
        <div className="wa-list-heading bg-surface border-b border-line shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-xs shrink-0 ring-2 ring-emerald-500/20">
              <WhatsAppIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold text-ink leading-tight">
                  Live Chat PST BPS
                </h1>
                {sourceMode === "live" && waConnectionStatus?.is_connected && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[9.5px] font-bold"
                    title="Realtime sinkronisasi otomatis aktif"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Live</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium flex items-center gap-1.5 truncate">
                {sourceMode === "live" ? (
                  waConnectionStatus.status === "CHECKING" ? (
                    <span className="text-muted">Menghubungkan gateway…</span>
                  ) : waConnectionStatus?.is_connected ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                      <span className="font-mono">{waConnectionStatus.phone_formatted || waConnectionStatus.phone}</span>
                    </span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                      <span>Terputus / Belum Login</span>
                    </span>
                  )
                ) : (
                  <span className="text-accent font-semibold flex items-center gap-1">
                    <span>📦 Mode Arsip (ZIP)</span>
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Mode Switcher & Actions */}
          <div className="wa-list-actions">
            <div className="wa-source-switch bg-subtle p-0.5 rounded-lg flex text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setSourceMode("live")}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  sourceMode === "live"
                    ? "bg-surface text-emerald-700 shadow-xs font-bold"
                    : "text-muted hover:text-ink"
                }`}
                title="Penyimpanan pesan real-time dari WhatsApp Gateway"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceMode("backup")}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  sourceMode === "backup"
                    ? "bg-surface text-accent shadow-xs font-bold"
                    : "text-muted hover:text-ink"
                }`}
                title="Telusuri arsip berkas backup ZIP"
              >
                <span>ZIP</span>
              </button>
            </div>

            {/* Tombol Pengaturan Operasional & Auto-Chat */}
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="p-1.5 text-muted hover:text-ink hover:bg-hover/80 rounded-lg transition-colors cursor-pointer"
              title="Pengaturan Auto-Chat & Jam Layanan PST"
            >
              <SettingsIcon className="w-4 h-4 text-ink" />
            </button>

            {/* Tombol Segarkan Percakapan */}
            <button
              type="button"
              onClick={() =>
                sourceMode === "live" ? handleManualSync() : fetchBackupList()
              }
              disabled={isLoadingChats || isManualSyncing}
              className={`p-1.5 text-muted hover:text-emerald-600 hover:bg-hover/80 rounded-lg transition-colors cursor-pointer ${
                isManualSyncing ? "opacity-70" : ""
              }`}
              title="Segarkan daftar & pesan sekarang (Instan)"
            >
              <RefreshIcon
                className={`w-4 h-4 ${isLoadingChats || isManualSyncing ? "animate-spin text-emerald-600" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* If in Backup Mode, show ZIP selector bar */}
        {sourceMode === "backup" && (
          <div className="px-3.5 py-2.5 bg-accent-soft/90 border-b border-blue-200/80 flex items-center justify-between gap-2 shrink-0">
            <span className="text-[11px] font-bold text-accent shrink-0">
              Berkas ZIP:
            </span>
            {backupFiles.length > 0 ? (
              <div className="flex items-center gap-1.5 w-full min-w-0">
                <select
                  value={selectedBackupFilename}
                  onChange={(e) => setSelectedBackupFilename(e.target.value)}
                  className="w-full text-xs bg-surface border border-blue-300 rounded-lg px-2 py-1 font-mono text-ink truncate shadow-2xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                >
                  {backupFiles.map((b) => (
                    <option key={b.filename} value={b.filename}>
                      {b.phone_formatted ? `[${b.phone_formatted}] ` : ""}{b.filename} ({b.total_messages ? `${b.total_messages} pesan, ` : ""}{b.size_formatted})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleDownloadBackup(selectedBackupFilename)}
                  disabled={!selectedBackupFilename || isDownloadingBackup}
                  className="px-2.5 py-1 bg-brand hover:bg-brand-hover text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs shrink-0 cursor-pointer disabled:opacity-50 transition-all"
                  title="Unduh berkas ZIP arsip ini ke komputer"
                >
                  <span>⬇️</span>
                  <span className="hidden sm:inline">Unduh</span>
                </button>
              </div>
            ) : (
              <span className="text-[11px] text-muted italic">
                Tidak ada file backup
              </span>
            )}
          </div>
        )}

        {sourceMode === "live" && (syncError || (!waConnectionStatus.is_connected && waConnectionStatus.status !== "CHECKING")) && (
          <div className="wa-sync-notice" role="status">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span>{syncError || "WhatsApp terputus. Menunggu koneksi kembali…"}
              {chats.length > 0 && " Data terakhir tetap ditampilkan."}</span>
          </div>
        )}

        {/* Search Bar & Action Header */}
        <div className="p-3 bg-surface border-b border-line space-y-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari obrolan atau nomor HP..."
                className="w-full pl-9 pr-7 py-2 text-xs bg-subtle border border-transparent rounded-lg text-ink placeholder-gray-500 focus:outline-hidden focus:bg-surface focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
              <SearchIcon className="w-4 h-4 text-faint absolute left-3 top-2.5" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 text-faint hover:text-muted text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {sourceMode === "live" && (
              <button
                type="button"
                onClick={() => setShowNewChatModal(true)}
                className="px-3 py-2 bg-brand hover:bg-brand-hover text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Mulai percakapan baru ke nomor tujuan"
              >
                <span className="text-sm leading-none">+</span>
                <span className="hidden sm:inline">Chat</span>
              </button>
            )}
          </div>

          {/* Filter Pills (WhatsApp Web Category Chips) */}
          <div className="wa-filters flex flex-wrap items-center gap-1.5 text-[11px]">
            {[
              { id: "ALL", label: "Semua", count: chats.length },
              {
                id: "FLAG_3DAYS",
                label: "🚩 Flag 3 Hari",
                count: flaggedChatsCount,
                highlight: flaggedChatsCount > 0,
              },
              {
                id: "DIRECT",
                label: "Pribadi",
                count: chats.filter((c) => c.is_direct).length,
              },
              {
                id: "GROUP",
                label: "Grup",
                count: chats.filter((c) => c.is_group).length,
              },
              {
                id: "CHANNEL",
                label: "Saluran",
                count: chats.filter((c) => c.is_channel).length,
              },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setChatTypeFilter(f.id)}
                className={`px-3 py-1 rounded-full font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  chatTypeFilter === f.id || (f.id === "FLAG_3DAYS" && chatTypeFilter === "DELAYED")
                    ? f.id === "FLAG_3DAYS"
                      ? "bg-amber-600 text-white shadow-xs font-semibold"
                      : "bg-brand text-white shadow-xs font-semibold"
                    : f.highlight
                    ? "bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 animate-pulse font-semibold"
                    : "bg-subtle text-muted hover:bg-hover/80 hover:text-ink"
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                    chatTypeFilter === f.id || (f.id === "FLAG_3DAYS" && chatTypeFilter === "DELAYED")
                      ? "bg-surface/20 text-white font-bold"
                      : f.highlight
                      ? "bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100 font-bold"
                      : "bg-hover/90 text-ink font-semibold"
                  }`}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Banner Alert Kontak Tertanda Flag 3 Hari Kerja */}
        {flaggedChatsCount > 0 && chatTypeFilter !== "FLAG_3DAYS" && chatTypeFilter !== "DELAYED" && (
          <div className="px-3.5 py-2.5 bg-gradient-to-r from-amber-50 to-indigo-50 dark:from-amber-950/40 dark:to-indigo-950/40 border-b border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0 animate-bounce">🚩</span>
              <p className="text-[11.5px] text-indigo-950 dark:text-indigo-200 truncate">
                <strong className="font-bold text-indigo-900 dark:text-indigo-100">{flaggedChatsCount} kontak</strong> tertanda <strong>Flag 3 Hari</strong> (Perlu direach out)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setChatTypeFilter("FLAG_3DAYS")}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 shadow-2xs transition-all cursor-pointer flex items-center gap-1"
            >
              <span>List Flag</span>
              <span>→</span>
            </button>
          </div>
        )}

        {/* Subheader info saat melihat list FLAG_3DAYS */}
        {(chatTypeFilter === "FLAG_3DAYS" || chatTypeFilter === "DELAYED") && (
          <div className="px-3.5 py-2 bg-indigo-50/70 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-indigo-900 dark:text-indigo-200 min-w-0">
              <span className="shrink-0">🚩</span>
              <span className="font-bold truncate">List Tertanda Flag 3 Hari ({flaggedChatsCount})</span>
            </div>
            <button
              type="button"
              onClick={() => setChatTypeFilter("ALL")}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline shrink-0 cursor-pointer"
            >
              Lihat Semua
            </button>
          </div>
        )}

        {/* Chats List (Scrollable) */}
        <div className="flex-1 overflow-y-auto divide-y divide-line bg-surface">
          {isLoadingChats && chats.length === 0 ? (
            <div className="p-10 text-center text-faint text-xs flex flex-col items-center">
              <RefreshIcon className="w-7 h-7 animate-spin text-[#00a884] mb-2.5" />
              <p className="font-semibold text-muted">
                Memuat daftar obrolan...
              </p>
            </div>
          ) : sourceMode === "live" && !waConnectionStatus?.is_connected && chats.length === 0 ? (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 flex items-center justify-center mx-auto text-xl shadow-xs">
                ⚠️
              </div>
              <h3 className="font-bold text-ink text-sm">WhatsApp Tidak Terhubung</h3>
              <p className="text-xs text-muted leading-relaxed">
                Sesi nomor WhatsApp bot saat ini sedang terputus / belum login. Riwayat percakapan nomor sebelumnya otomatis diamankan ke arsip cadangan (ZIP) dan tidak ditampilkan pada nomor baru demi menjaga privasi.
              </p>
              <div className="pt-2 flex flex-col gap-2">
                <Link
                  to="/manajemen-dokumen"
                  className="w-full py-2 px-3 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-lg shadow-xs transition-all text-center"
                >
                  Tautkan Nomor Bot Baru
                </Link>
                <button
                  type="button"
                  onClick={() => setSourceMode("backup")}
                  className="w-full py-2 px-3 bg-subtle hover:bg-hover text-ink text-xs font-semibold rounded-lg border border-line transition-all cursor-pointer"
                >
                  Buka Arsip Cadangan (ZIP)
                </button>
              </div>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-10 text-center text-faint text-xs space-y-1.5">
              <div className="w-12 h-12 rounded-full bg-subtle text-faint flex items-center justify-center mx-auto mb-2 text-xl">
                💬
              </div>
              <p className="font-semibold text-ink">
                Tidak ada obrolan ditemukan
              </p>
              <p className="text-[11px] text-faint">
                {searchQuery
                  ? "Coba gunakan kata kunci pencarian lain"
                  : "Belum ada riwayat pesan terekam"}
              </p>
            </div>
          ) : (
            filteredChats.map((chat) => {
              const isActive = chat.id === activeChatId;
              const isGroup = chat.is_group;
              const isChannel = chat.is_channel;
              const hasNewIncoming = newIncomingChatIds.has(chat.id) && !isActive;

              return (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => setActiveChatId(chat.id)}
                  className={`w-full text-left px-3.5 py-3 flex items-center gap-3 transition-colors cursor-pointer border-l-4 ${
                    isActive
                      ? "bg-subtle border-accent"
                      : hasNewIncoming
                      ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500 shadow-2xs"
                      : (chat.flag_3days || chat.delayed_3days || chat.session_status === "delayed")
                      ? "bg-amber-50/25 dark:bg-amber-950/20 border-amber-500 hover:bg-amber-50/45"
                      : "hover:bg-subtle border-transparent"
                  }`}
                >
                  {/* WhatsApp Style Avatar */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shadow-xs ${
                        isGroup
                          ? "bg-brand text-white"
                          : isChannel
                            ? "bg-indigo-600 text-white"
                            : getAvatarBg(chat.name || chat.id)
                      }`}
                    >
                      {isGroup
                        ? "G"
                        : isChannel
                          ? "K"
                          : (chat.name || "U")[0]?.toUpperCase()}
                    </div>
                    {hasNewIncoming && (
                      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900 animate-ping"></span>
                    )}
                  </div>

                  {/* Chat Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h3
                        className={`text-sm truncate ${isActive ? "font-bold text-ink" : "font-semibold text-ink"}`}
                      >
                        {chat.name}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasNewIncoming && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500 text-white animate-pulse">
                            Baru
                          </span>
                        )}
                        <span className="text-[11px] text-faint font-normal">
                          {formatTime(chat.last_message?.timestamp)}
                        </span>
                      </div>
                    </div>

                    {/* Session status badge for direct chats */}
                    {chat.is_direct && (
                      <div className="mb-1 flex items-center gap-1.5 flex-wrap">
                        {chat.flag_3days || chat.delayed_3days || chat.session_status === "delayed" ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span
                              className="text-[9.5px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-2xs"
                              title={`Tertanda Flag Terminasi 3 Hari (s.d. ${chat.delayed_until_formatted || "3 hari kerja"})`}
                            >
                              <span>🚩 Flag 3 Hari</span>
                              {chat.delayed_until_formatted && (
                                <span className="font-normal opacity-90 truncate max-w-[110px]">
                                  • {chat.delayed_until_formatted.split(",")[0]}
                                </span>
                              )}
                            </span>
                            {chat.reached_out_at ? (
                              <span className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-300">
                                ✓ Direach-out
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-300 animate-pulse">
                                🕒 Siap Reach-Out
                              </span>
                            )}
                            {chat.customer_replied_after_flag && (
                              <span className="text-[9px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.2 rounded border border-sky-300 animate-pulse">
                                💬 Pelanggan Balas
                              </span>
                            )}
                          </div>
                        ) : (
                          <span
                            className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                              chat.session_status === "closed"
                                ? "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"
                                : chat.session_status === "admin_active"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse"
                            }`}
                          >
                            {chat.session_status === "closed" && (
                              chat.termination_type === "unanswered_eod"
                                ? "⏳ Belum Terbalas (Tutup)"
                                : "✅ Selesai"
                            )}
                            {chat.session_status === "admin_active" && "👤 Admin Aktif"}
                            {chat.session_status === "waiting_admin" && (
                              chat.has_admin_replied_today === false
                                ? "🚨 Belum Dibalas"
                                : "🤖 Menunggu Admin"
                            )}
                          </span>
                        )}

                        {/* AI Intent Tag jika terdeteksi */}
                        {chat.ai_intent && (() => {
                          const badge = getIntentBadge(chat.ai_intent);
                          if (!badge) return null;
                          return (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border ${badge.bg}`}
                              title={`AI Intent: ${badge.label} (${chat.ai_topic || ""})`}
                            >
                              <span>
                                {badge.icon} {badge.short}
                              </span>
                            </span>
                          );
                        })()}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted truncate flex-1 flex items-center gap-1">
                        {chat.last_message?.fromMe && (
                          <span className="text-muted shrink-0" title="Pesan keluar; penerimaan belum dikonfirmasi">✓</span>
                        )}
                        <span className="truncate">
                          {chat.last_message?.text ||
                            (chat.last_message?.type
                              ? `[${chat.last_message.type}]`
                              : "-")}
                        </span>
                      </p>

                      {chat.message_count > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-subtle text-muted border border-line">
                          {chat.message_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {sourceMode === "live" && lastSyncTime && (
          <p className="wa-sync-time text-faint" title="Waktu pembaruan terakhir yang berhasil">
            Diperbarui {lastSyncTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        )}
        {/* Sidebar Status Footer */}
        <div className="h-11 px-4 bg-subtle border-t border-line text-xs text-muted flex items-center justify-between shrink-0">
          <span className="font-medium text-[11px] text-muted">
            <span className="font-bold text-ink">
              {stats?.total_messages || stats?.totalMessages || 0}
            </span>{" "}
            pesan tersimpan
          </span>
          <Link
            to="/manajemen-dokumen"
            className="text-[11px] text-emerald-700 font-semibold hover:underline flex items-center gap-1"
          >
            <span>Pengaturan WA</span>
          </Link>
        </div>
      </div>

      {/* ======================================================== */}
      {/* COLUMN 2: CENTER CHAT AREA — Spacious & Dominant         */}
      {/* ======================================================== */}
      <div
        className={`${
          activeChatId ? "flex" : "hidden md:flex"
        } flex-1 min-w-0 flex-col h-full bg-canvas relative overflow-hidden`}
      >
        {activeChat ? (
          <>
            {/* Active Chat Header */}
            <div className="wa-conversation-heading bg-surface border-b border-line shrink-0 z-10">
              <div className="wa-contact-heading flex items-center gap-3 min-w-0">
                {/* Back button on mobile */}
                <button
                  type="button"
                  onClick={() => setActiveChatId(null)}
                  className="md:hidden p-1.5 -ml-1 text-muted hover:text-ink rounded-full hover:bg-hover cursor-pointer"
                  title="Kembali ke daftar obrolan"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </button>

                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-xs shrink-0 ${
                    activeChat.is_group
                      ? "bg-brand text-white"
                      : activeChat.is_channel
                        ? "bg-indigo-600 text-white"
                        : getAvatarBg(activeChat.name || activeChat.id)
                  }`}
                >
                  {activeChat.is_group
                    ? "G"
                    : activeChat.is_channel
                      ? "K"
                      : (activeChat.name || "U")[0]?.toUpperCase()}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-ink text-sm md:text-base truncate leading-snug">
                      {activeChat.name}
                    </h2>

                    {sourceMode === "live" && waConnectionStatus?.is_connected && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center gap-1 shrink-0"
                        title="Percakapan ini tersinkronisasi secara otomatis setiap detik"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Live Sync</span>
                      </span>
                    )}

                    {sourceMode === "backup" ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 flex items-center gap-1 shrink-0">
                        <span>📦 Arsip Cadangan</span>
                        {selectedBackupMeta?.phone_formatted && (
                          <span className="font-mono">({selectedBackupMeta.phone_formatted})</span>
                        )}
                      </span>
                    ) : activeChat.is_direct ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {activeChatDetail?.flag_3days || activeChatDetail?.delayed_3days || activeChatDetail?.session_status === "delayed" ? (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-2xs"
                            title={`Tertanda Flag Terminasi 3 Hari (s.d. ${activeChatDetail?.delayed_until_formatted || "3 hari kerja"})`}
                          >
                            <span>🚩 Flag 3 Hari</span>
                            {activeChatDetail?.delayed_until_formatted && (
                              <span className="font-normal opacity-90 truncate max-w-[130px]">
                                • s.d. {activeChatDetail.delayed_until_formatted.split(",")[0]}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span
                            className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                              activeChatDetail?.session_status === "closed"
                                ? "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-200"
                                : activeChatDetail?.session_status === "admin_active"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}
                          >
                            {activeChatDetail?.session_status === "closed" && (
                              activeChatDetail?.termination_type === "unanswered_eod"
                                ? "⏳ Ditutup: Antrean Belum Terbalas"
                                : "✅ Sesi Diterminasi"
                            )}
                            {activeChatDetail?.session_status === "admin_active" && "👤 Ditangani Admin"}
                            {activeChatDetail?.session_status === "waiting_admin" && (
                              activeChatDetail?.has_admin_replied_today === false
                                ? "🚨 Belum Dibalas Hari Ini"
                                : "🤖 Menunggu Admin"
                            )}
                          </span>
                        )}

                        {/* Gemini AI Intent Badge */}
                        {activeChatDetail?.ai_intent && (() => {
                          const badge = getIntentBadge(activeChatDetail.ai_intent);
                          if (!badge) return null;
                          return (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1 ${badge.bg}`}
                              title={`AI Intent: ${badge.label} (${activeChatDetail.ai_topic || ""})`}
                            >
                              <span>
                                {badge.icon} {badge.label}
                              </span>
                            </span>
                          );
                        })()}
                      </div>
                    ) : (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          activeChat.is_group
                            ? "bg-accent-soft text-accent"
                            : "bg-indigo-100 text-indigo-800"
                        }`}
                      >
                        {activeChat.is_group ? "Grup WhatsApp" : "Saluran Resmi"}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted font-mono truncate">
                    {activeChat.phone || activeChat.id}
                  </p>
                </div>
              </div>

              {/* Action Toolbar with PST Termination Controls */}
              <div className="wa-conversation-actions">
                {/* Tombol Analisis Konteks Obrolan dengan Gemini AI */}
                {activeChat.is_direct && (
                  <button
                    type="button"
                    onClick={handleAnalyzeAiIntent}
                    disabled={isAnalyzingAi}
                    className="px-2.5 md:px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Menganalisis pesan masuk dengan Gemini AI (apakah sapaan baru, kelanjutan topik, penundaan, dll)"
                  >
                    <SparklesIcon className={`w-3.5 h-3.5 ${isAnalyzingAi ? "animate-spin text-indigo-600" : "text-indigo-600"}`} />
                    <span>{isAnalyzingAi ? "Menganalisis..." : "Analisis AI"}</span>
                  </button>
                )}

                {/* Tombol Khusus Saat Kontak Tertanda Flag 3 Hari */}
                {activeChat.is_direct &&
                  (activeChatDetail?.flag_3days ||
                    activeChatDetail?.delayed_3days ||
                    activeChatDetail?.session_status === "delayed") && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const topic = activeChatDetail?.delayed_topic || "yang Kakak butuhkan";
                          const timeGreeting = liveSettings?.currentGreeting || getTimeGreeting();
                          setReplyText(
                            `Selamat ${timeGreeting} Kak. Terkait data mengenai ${topic} yang telah disiapkan oleh tim teknis kami, datanya kini sudah selesai diproses dan siap kami serahkan ya Kak.\n\nBerikut informasinya:\n[Tuliskan keterangan / tautan berkas di sini]\n\nApabila masih ada yang ingin dikonsultasikan lebih lanjut, silakan sampaikan kepada kami ya Kak 😊`
                          );
                          replyInputRef.current?.focus();
                          toast.success("Draf pesan reach out disiapkan!");
                        }}
                        className="px-2.5 md:px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                        title="Siapkan pesan reach out kepada pengunjung"
                      >
                        <span>💬 Reach Out</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenTerminationModal(activeChatDetail, "completed")}
                        className="px-2.5 md:px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                        title="Akhiri sesi & kirim survei SKD jika penyerahan data selesai"
                      >
                        <CheckDoubleIcon className="w-3.5 h-3.5" />
                        <span>Selesai (+SKD)</span>
                      </button>
                    </>
                  )}

                {/* Tombol Tandai Flag Terminasi 3 Hari Kerja */}
                {activeChat.is_direct &&
                  activeChatDetail?.session_status !== "closed" &&
                  !activeChatDetail?.flag_3days &&
                  !activeChatDetail?.delayed_3days &&
                  activeChatDetail?.session_status !== "delayed" && (
                    <button
                      type="button"
                      onClick={() => handleOpenTerminationModal(activeChatDetail, "delayed_3days")}
                      className="px-2.5 md:px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                      title="Tandai Flag Terminasi 3 Hari Kerja (Pesan pembuka & penutup dinonaktifkan agar bisa direach out lagi)"
                    >
                      <span>🚩 Flag 3 Hari</span>
                    </button>
                  )}

                {/* Tombol Ambil Alih (Jika bot sedang handle / menunggu) */}
                {activeChat.is_direct && activeChatDetail?.session_status === "waiting_admin" && (
                  <button
                    type="button"
                    onClick={() => handleTakeover(activeChat.id)}
                    className="px-2.5 md:px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Ambil alih obrolan secara langsung dari bot"
                  >
                    <UserCheckIcon className="w-3.5 h-3.5" />
                    <span>Ambil Alih</span>
                  </button>
                )}

                {/* Tombol Terminasi Layanan (Sesuai Aturan File Terminasi BPS Gorontalo) */}
                {activeChat.is_direct &&
                  activeChatDetail?.session_status !== "closed" &&
                  !activeChatDetail?.flag_3days &&
                  !activeChatDetail?.delayed_3days &&
                  activeChatDetail?.session_status !== "delayed" && (
                    <button
                      type="button"
                      onClick={() => handleOpenTerminationModal(activeChat)}
                      className="px-2.5 md:px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Terminasi sesi konsultasi & kirim survei SKD / penutupan"
                    >
                      <StopIcon className="w-3.5 h-3.5" />
                      <span>Terminasi Sesi</span>
                    </button>
                  )}

                {/* Tombol Buka Kembali jika sudah ditutup */}
                {activeChat.is_direct && activeChatDetail?.session_status === "closed" && (
                  <button
                    type="button"
                    onClick={() => handleReopen(activeChat.id)}
                    className="px-2.5 md:px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                    title="Buka kembali sesi konsultasi ini"
                  >
                    <span>🔄 Buka Kembali</span>
                  </button>
                )}

                {/* Tombol Lepas Flag jika sedang dalam penundaan 3 hari */}
                {activeChat.is_direct &&
                  (activeChatDetail?.flag_3days ||
                    activeChatDetail?.delayed_3days ||
                    activeChatDetail?.session_status === "delayed") && (
                    <button
                      type="button"
                      onClick={() => handleReopen(activeChat.id)}
                      className="px-2 md:px-2.5 py-1.5 text-xs font-medium text-muted hover:text-ink hover:bg-subtle border border-line rounded-lg transition-colors cursor-pointer"
                      title="Lepas status flag 3 hari dan kembalikan ke sesi aktif"
                    >
                      <span>Lepas Flag</span>
                    </button>
                  )}

                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      activeChat.raw_phone || activeChat.phone || activeChat.id,
                      "Nomor HP",
                    )
                  }
                  className="px-2.5 md:px-3 py-1.5 text-xs font-semibold text-ink bg-surface hover:bg-subtle border border-line-strong rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Salin nomor kontak"
                >
                  <CopyIcon className="w-3.5 h-3.5 text-muted" />
                  <span className="hidden sm:inline">Salin</span>
                </button>

                {activeChat.is_direct && (
                  <a
                    href={`https://wa.me/${(activeChat.raw_phone || "").replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 md:px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1.5"
                    title="Buka obrolan di WhatsApp Web resmi"
                  >
                    <ExternalLinkIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">wa.me</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setShowRightPanel(!showRightPanel)}
                  className={`px-2.5 md:px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                    showRightPanel
                      ? "bg-brand text-white border-accent shadow-xs"
                      : "bg-surface text-ink border-line-strong hover:bg-subtle shadow-2xs"
                  }`}
                  title="Tampilkan panel data PST, media, dan tautan"
                >
                  <InfoCircleIcon className="w-4 h-4" />
                  <span className="hidden md:inline">Data PST & Info</span>
                </button>
              </div>
            </div>

            {/* Sticky 3-Day Flag / Delay Banner */}
            {activeChat.is_direct && (activeChatDetail?.flag_3days || activeChatDetail?.delayed_3days || activeChatDetail?.session_status === "delayed") && (
              <div className="px-4 md:px-6 py-2.5 bg-gradient-to-r from-amber-500/15 via-indigo-500/15 to-amber-500/10 border-b border-amber-200 dark:border-amber-800/70 flex items-center justify-between gap-3 shrink-0 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg shrink-0">🚩</span>
                  <div className="min-w-0 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-amber-950 dark:text-amber-200">
                        Kontak Tertanda Flag Terminasi 3 Hari Kerja
                      </span>
                      {activeChatDetail.delayed_until_formatted && (
                        <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300">
                          Batas: {activeChatDetail.delayed_until_formatted}
                        </span>
                      )}
                      {activeChatDetail.reached_out_at && (
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-300">
                          ✓ Telah direach-out {formatTime(activeChatDetail.reached_out_at)}
                        </span>
                      )}
                    </div>
                    <span className="text-muted block text-[11px] mt-0.5">
                      Topik: <strong className="font-semibold text-ink">"{activeChatDetail.delayed_topic || "Penyiapan data statistik"}"</strong> • Pesan otomatis pembuka & penutup <u>dinonaktifkan</u> agar Anda leluasa mereach-out kembali.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const topic = activeChatDetail?.delayed_topic || "yang Kakak butuhkan";
                      const timeGreeting = liveSettings?.currentGreeting || getTimeGreeting();
                      setReplyText(
                        `Selamat ${timeGreeting} Kak. Terkait data mengenai ${topic} yang telah disiapkan oleh tim teknis kami, datanya kini sudah selesai diproses dan siap kami serahkan ya Kak.\n\nBerikut informasinya:\n[Tuliskan keterangan / tautan berkas di sini]\n\nApabila masih ada yang ingin dikonsultasikan lebih lanjut, silakan sampaikan kepada kami ya Kak 😊`
                      );
                      replyInputRef.current?.focus();
                      toast.success("Draf pesan reach out disalin ke kolom input!");
                    }}
                    className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 dark:bg-indigo-900/80 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700 rounded-md transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    title="Siapkan pesan reach out tindak lanjut data siap"
                  >
                    <span>💬 Reach Out Sekarang</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenTerminationModal(activeChat, "completed")}
                    className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-md transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    title="Data telah siap dan diserahkan, akhiri sesi & kirim survei SKD"
                  >
                    <span>✅ Data Siap & Selesaikan (SKD)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReopen(activeChat.id)}
                    className="px-2 py-1 text-xs font-medium text-muted hover:text-ink hover:bg-hover rounded-md transition-colors cursor-pointer"
                    title="Lepas status flag dan kembalikan ke sesi aktif normal"
                  >
                    <span>↩️ Lepas Flag</span>
                  </button>
                </div>
              </div>
            )}

            {/* Mode Backup Banner */}
            {sourceMode === "backup" && (
              <div className="px-4 md:px-6 py-2 bg-blue-50/90 dark:bg-blue-950/40 border-b border-blue-200/80 dark:border-blue-900/50 flex items-center justify-between text-xs text-accent shrink-0">
                <div className="flex items-center gap-2 truncate">
                  <span>📦</span>
                  <span className="font-semibold text-ink">
                    Arsip Cadangan Nomor:{" "}
                    <span className="font-mono text-accent font-bold">
                      {selectedBackupMeta?.phone_formatted || "Nomor Sebelumnya"}
                    </span>
                  </span>
                  <span className="text-muted text-[11px] hidden sm:inline font-mono">
                    ({selectedBackupFilename})
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownloadBackup(selectedBackupFilename)}
                    disabled={!selectedBackupFilename || isDownloadingBackup}
                    className="px-2.5 py-1 bg-brand hover:bg-brand-hover text-white rounded-md text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                    title="Unduh berkas arsip ZIP aktif ini"
                  >
                    <span>⬇️</span>
                    <span>Unduh ZIP</span>
                  </button>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
                    Mode Baca Saja (Tersimpan)
                  </span>
                </div>
              </div>
            )}

            {/* Messages Feed (WhatsApp Subtle Wallpaper Pattern) */}
            <div
              ref={messageFeedRef}
              onScroll={(event) => {
                const feed = event.currentTarget;
                followMessagesRef.current = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 100;
                if (followMessagesRef.current) setHasUnreadMessages(false);
              }}
              className="wa-message-feed flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-3"
              style={{
                backgroundImage: "none",
                backgroundSize: "40px 40px",
              }}
            >
              {isLoadingDetail ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[350px] text-faint text-xs">
                  <RefreshIcon className="w-8 h-8 animate-spin text-[#00a884] mb-3" />
                  <p className="text-sm font-semibold text-ink">
                    Memuat riwayat percakapan...
                  </p>
                </div>
              ) : (
                <>
                  {renderMessageGroups()}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {hasUnreadMessages && (
              <button type="button" className="wa-new-messages" onClick={() => {
                followMessagesRef.current = true;
                messageFeedRef.current?.scrollTo({ top: messageFeedRef.current.scrollHeight, behavior: "smooth" });
                setHasUnreadMessages(false);
              }}>Pesan baru ↓</button>
            )}
            {/* Bottom Chat Input Bar */}
            <div className="wa-composer p-3 md:px-6 bg-surface border-t border-line shrink-0">
              {sourceMode === "live" ? (
                <form onSubmit={handleSendReply} className="space-y-2">
                  {/* Gemini AI Suggested Reply Card */}
                  {activeChatDetail?.ai_suggested_reply && showAiCard && (
                    <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-emerald-50/80 dark:from-zinc-900 dark:via-zinc-850 dark:to-zinc-900 border border-indigo-200 dark:border-indigo-800/80 rounded-xl p-3 shadow-xs animate-fadeIn space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                            <SparklesIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>Saran Balasan Cerdas (Gemini AI)</span>
                          </span>
                          {activeChatDetail.ai_intent && (() => {
                            const badge = getIntentBadge(activeChatDetail.ai_intent);
                            return badge ? (
                              <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                                {badge.icon} {badge.label}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleAnalyzeAiIntent}
                            disabled={isAnalyzingAi}
                            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                            title="Minta analisis & saran balasan baru dari Gemini"
                          >
                            <span className={isAnalyzingAi ? "animate-spin" : ""}>🔄</span>
                            <span>Generate Ulang</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAiCard(false)}
                            className="text-muted hover:text-ink text-xs p-0.5 rounded cursor-pointer"
                            title="Tutup kartu saran balasan"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <div className="bg-surface/90 dark:bg-zinc-800/90 p-2.5 rounded-lg border border-line text-xs text-ink leading-relaxed">
                        <p className="italic">"{activeChatDetail.ai_suggested_reply}"</p>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span className="text-[10.5px] text-muted truncate max-w-md">
                          {activeChatDetail.ai_analysis?.summary || (activeChatDetail.ai_topic ? `Topik: ${activeChatDetail.ai_topic}` : "Draf balasan beretika PST BPS Gorontalo")}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyText(activeChatDetail.ai_suggested_reply);
                            replyInputRef.current?.focus();
                            toast.success("Saran balasan AI disalin ke kolom input!");
                          }}
                          className="px-3 py-1 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <span>📋 Gunakan Balasan Ini</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Official PST BPS Gorontalo Canned Templates */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-muted no-scrollbar">
                    {/* Tombol Minta Analisis AI */}
                    <button
                      type="button"
                      onClick={handleAnalyzeAiIntent}
                      disabled={isAnalyzingAi}
                      className="px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white whitespace-nowrap cursor-pointer transition-all shadow-xs font-bold flex items-center gap-1 text-[11.5px] shrink-0"
                      title="Deteksi intent pesan pengunjung & buatkan draf balasan cerdas dengan Gemini AI"
                    >
                      <SparklesIcon className={`w-3.5 h-3.5 ${isAnalyzingAi ? "animate-spin" : ""}`} />
                      <span>{isAnalyzingAi ? "Menganalisis..." : "✨ Analisis Gemini"}</span>
                    </button>

                    <span className="text-[11px] font-bold text-faint shrink-0 flex items-center gap-1 pl-1">
                      <span>📜 Panduan:</span>
                    </span>
                    {OFFICIAL_TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => handleApplyTemplate(tmpl)}
                        className="px-3 py-1 rounded-full bg-surface hover:bg-emerald-50 hover:text-emerald-800 text-ink border border-line-strong whitespace-nowrap cursor-pointer transition-colors shadow-2xs font-semibold flex items-center gap-1 text-[11.5px]"
                        title={tmpl.description}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            tmpl.category === "TERMINASI"
                              ? "bg-rose-500"
                              : tmpl.category === "LAYANAN"
                              ? "bg-blue-500"
                              : "bg-emerald-500"
                          }`}
                        ></span>
                        <span>{tmpl.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Quoted Reply Banner */}
                  {replyingToMessage && (
                    <div className="bg-surface rounded-xl border border-emerald-500/30 p-2.5 flex items-center justify-between gap-3 shadow-xs animate-fadeIn">
                      <div className="flex items-center gap-2.5 min-w-0 border-l-4 border-emerald-500 pl-2.5 py-0.5">
                        <ReplyIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 truncate">
                            Membalas {replyingToMessage.sender}
                          </p>
                          <p className="text-xs text-muted truncate max-w-xl">
                            {replyingToMessage.text}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyingToMessage(null)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 cursor-pointer"
                        title="Batalkan kutipan balasan"
                      >
                        <span className="text-base font-bold leading-none">&times;</span>
                      </button>
                    </div>
                  )}

                  {/* Input & Circular Send Button */}
                  <div className="flex items-end gap-2.5">
                    <div className="flex-1 min-w-0 bg-surface rounded-2xl border border-line-strong shadow-2xs focus-within:ring-2 focus-within:ring-[#00a884] focus-within:border-transparent transition-all">
                      <textarea
                        ref={replyInputRef}
                        rows={isInputExpanded ? 4 : 2}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            handleSendReply();
                          }
                        }}
                        placeholder={
                          replyingToMessage
                            ? `Ketik balasan untuk ${replyingToMessage.sender} (Tekan Enter)...`
                            : `Ketik pesan balasan untuk ${activeChat.name} (Tekan Enter untuk kirim)...`
                        }
                        className="w-full px-4 py-2.5 text-sm bg-transparent border-none resize-none focus:outline-hidden text-ink placeholder-gray-500"
                        style={{ minHeight: "44px", maxHeight: "120px" }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!replyText.trim() || isSendingReply || !activeChatDetail || !waConnectionStatus.is_connected}
                      className="w-11 h-11 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white rounded-full flex items-center justify-center shadow-md transition-transform cursor-pointer shrink-0"
                      title="Kirim pesan melalui WhatsApp Gateway"
                    >
                      {isSendingReply ? (
                        <RefreshIcon className="w-5 h-5 animate-spin" />
                      ) : (
                        <SendIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-muted">
                    <span>Enter untuk kirim · Shift + Enter untuk baris baru</span>
                    <button type="button" className="shrink-0 hover:text-ink" onClick={() => setIsInputExpanded((value) => !value)}>
                      {isInputExpanded ? "Ringkas kolom" : "Perluas kolom"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-3 bg-surface rounded-xl border border-blue-200 shadow-xs flex items-center justify-between gap-4 text-xs text-accent">
                  <div>
                    <p className="font-bold text-sm">
                      Mode Pratinjau Backup (Read-Only)
                    </p>
                    <p className="text-muted mt-0.5">
                      Anda sedang membaca arsip backup. Untuk membalas pesan ke
                      nomor kontak ini, silakan alihkan ke mode <b>Live</b>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSourceMode("live")}
                    className="px-4 py-2 bg-brand text-white font-bold rounded-lg shadow-xs hover:bg-brand-hover transition-all shrink-0 cursor-pointer"
                  >
                    Buka Mode Live
                  </button>
                </div>
              )}
            </div>
          </>
        ) : sourceMode === "live" && !waConnectionStatus?.is_connected ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-faint">
            <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 shadow-md flex items-center justify-center mb-4 ring-8 ring-rose-500/10">
              <WhatsAppIcon className="w-12 h-12 text-rose-500 opacity-90" />
            </div>
            <h2 className="text-xl font-bold text-ink mb-1.5">
              Sesi WhatsApp Bot Terputus / Belum Login
            </h2>
            <p className="text-sm text-muted max-w-md leading-relaxed mb-6">
              Sesi nomor WhatsApp bot saat ini sedang terputus atau telah logout. Riwayat obrolan nomor sebelumnya otomatis diamankan ke arsip cadangan (ZIP) dan tidak ditampilkan pada nomor baru demi menjaga privasi dan kebersihan data.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/manajemen-dokumen"
                className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <span>📱</span>
                <span>Buka Pengaturan WA & Tautkan Nomor</span>
              </Link>
              <button
                type="button"
                onClick={() => setSourceMode("backup")}
                className="px-5 py-2.5 bg-surface hover:bg-hover text-ink text-xs font-semibold rounded-xl border border-line shadow-xs transition-all cursor-pointer flex items-center gap-2"
              >
                <span>📦</span>
                <span>Lihat Arsip Cadangan (ZIP)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-faint">
            <div className="w-20 h-20 rounded-full bg-surface shadow-md flex items-center justify-center mb-4 ring-8 ring-emerald-500/10">
              <WhatsAppIcon className="w-12 h-12 text-[#00a884]" />
            </div>
            <h2 className="text-xl font-bold text-ink mb-1.5">
              WhatsApp Web Explorer SIGAP
            </h2>
            <p className="text-sm text-muted max-w-md leading-relaxed">
              Pilih salah satu percakapan di kolom kiri untuk membaca riwayat
              chat, melihat berkas foto, dokumen, tautan, dan daftar peserta
              obrolan.
            </p>
            <div className="mt-6 flex items-center gap-1.5 text-xs text-faint font-medium">
              <span>🔒</span>
              <span>
                Terkoneksi dengan WhatsApp Gateway Resmi BPS Gorontalo
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* COLUMN 3: RIGHT PANEL (MEDIA, LINKS, PARTICIPANTS)       */}
      {/* ======================================================== */}
      {showRightPanel && activeChatDetail && (
        <div className="wa-info-panel w-[300px] lg:w-[330px] shrink-0 flex flex-col bg-surface border-l border-line h-full z-20 shadow-xl transition-all">
          {/* Header */}
          <div className="h-16 px-4 bg-subtle border-b border-line flex items-center justify-between shrink-0">
            <h3 className="font-bold text-ink text-sm">
              Info & Koleksi Obrolan
            </h3>
            <button
              type="button"
              onClick={() => setShowRightPanel(false)}
              className="p-1.5 text-muted hover:text-ink hover:bg-hover rounded-full transition-colors cursor-pointer"
              title="Tutup panel info"
            >
              ✕
            </button>
          </div>

          {/* Contact Card Summary */}
          <div className="p-5 text-center border-b border-line bg-surface shrink-0">
            <div
              className={`w-16 h-16 rounded-full font-bold text-xl flex items-center justify-center mx-auto mb-2.5 shadow-md ${
                activeChatDetail.is_group
                  ? "bg-brand text-white"
                  : activeChatDetail.is_channel
                    ? "bg-indigo-600 text-white"
                    : getAvatarBg(activeChatDetail.name || activeChatDetail.id)
              }`}
            >
              {activeChatDetail.is_group
                ? "G"
                : activeChatDetail.is_channel
                  ? "K"
                  : (activeChatDetail.name || "U")[0]?.toUpperCase()}
            </div>
            <h4 className="font-bold text-ink text-sm truncate">
              {activeChatDetail.name}
            </h4>
            <p className="text-xs text-muted font-mono mt-0.5 truncate">
              {activeChatDetail.phone || activeChatDetail.id}
            </p>

            <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-muted">
              <span className="bg-subtle px-2 py-0.5 rounded-full font-medium text-[11px]">
                💬{" "}
                {activeChatDetail.total_messages ||
                  activeChatDetail.messages?.length ||
                  0}
              </span>
              <span className="bg-subtle px-2 py-0.5 rounded-full font-medium text-[11px]">
                🖼️{" "}
                {activeChatDetail.total_media ||
                  activeChatDetail.media?.length ||
                  0}
              </span>
              <span className="bg-subtle px-2 py-0.5 rounded-full font-medium text-[11px]">
                🔗{" "}
                {activeChatDetail.total_links ||
                  activeChatDetail.links?.length ||
                  0}
              </span>
            </div>
          </div>

          {/* Sub-Tabs: PST Data, Media, Links, Participants */}
          <div className="flex items-center border-b border-line text-xs font-semibold bg-subtle shrink-0">
            {activeChatDetail.is_direct && (
              <button
                type="button"
                onClick={() => setRightPanelTab("pst")}
                className={`flex-1 py-2 text-center transition-all cursor-pointer border-b-2 ${
                  rightPanelTab === "pst"
                    ? "border-accent text-[#00a884] bg-surface font-bold"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                Data PST
              </button>
            )}
            <button
              type="button"
              onClick={() => setRightPanelTab("media")}
              className={`flex-1 py-2 text-center transition-all cursor-pointer border-b-2 ${
                rightPanelTab === "media"
                  ? "border-accent text-[#00a884] bg-surface font-bold"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              Media ({activeChatDetail.media?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setRightPanelTab("links")}
              className={`flex-1 py-2 text-center transition-all cursor-pointer border-b-2 ${
                rightPanelTab === "links"
                  ? "border-accent text-[#00a884] bg-surface font-bold"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              Tautan ({activeChatDetail.links?.length || 0})
            </button>
            {activeChatDetail.is_group && (
              <button
                type="button"
                onClick={() => setRightPanelTab("participants")}
                className={`flex-1 py-2 text-center transition-all cursor-pointer border-b-2 ${
                  rightPanelTab === "participants"
                    ? "border-accent text-[#00a884] bg-surface font-bold"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                Anggota ({activeChatDetail.participants?.length || 0})
              </button>
            )}
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto p-3.5 bg-subtle/60 space-y-3">
            {/* TAB 0: DATA PENGUNJUNG PST */}
            {rightPanelTab === "pst" && activeChatDetail.is_direct && (
              <div className="space-y-3">
                <div className="p-3.5 bg-surface rounded-xl border border-line shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-ink flex items-center gap-1.5">
                      <span>📋 Data Pengunjung PST</span>
                    </h5>
                    <button
                      type="button"
                      onClick={() => {
                        const v = activeChatDetail.visitor_data;
                        const summary = `Nama: ${v?.nama || '-'}\nPekerjaan: ${v?.pekerjaan || '-'}\nInstansi: ${v?.instansi || '-'}`;
                        handleCopy(summary, "Format Buku Tamu");
                      }}
                      className="text-[10.5px] text-accent hover:underline font-semibold"
                    >
                      Salin Format
                    </button>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-line/60">
                      <span className="text-muted">Nama:</span>
                      <span className="font-semibold text-ink text-right">
                        {activeChatDetail.visitor_data?.nama || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-line/60">
                      <span className="text-muted">Pekerjaan:</span>
                      <span className="font-semibold text-ink text-right">
                        {activeChatDetail.visitor_data?.pekerjaan || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-line/60">
                      <span className="text-muted">Instansi / Asal:</span>
                      <span className="font-semibold text-ink text-right">
                        {activeChatDetail.visitor_data?.instansi || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Intent & Context Card */}
                <div className="p-3.5 bg-gradient-to-br from-indigo-50/70 to-blue-50/50 dark:from-indigo-950/40 dark:to-zinc-900 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <SparklesIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Analisis Gemini AI</span>
                    </h5>
                    <button
                      type="button"
                      onClick={handleAnalyzeAiIntent}
                      disabled={isAnalyzingAi}
                      className="text-[10.5px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span className={isAnalyzingAi ? "animate-spin" : ""}>🔄</span>
                      <span>{isAnalyzingAi ? "Menganalisis..." : "Analisis Ulang"}</span>
                    </button>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-indigo-100 dark:border-indigo-900/60">
                      <span className="text-muted">Niat (Intent):</span>
                      <span className="font-bold text-ink">
                        {activeChatDetail.ai_intent ? (() => {
                          const badge = getIntentBadge(activeChatDetail.ai_intent);
                          return badge ? `${badge.icon} ${badge.label}` : activeChatDetail.ai_intent;
                        })() : (
                          <span className="text-faint font-normal">Belum dianalisis</span>
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-indigo-100 dark:border-indigo-900/60">
                      <span className="text-muted">Topik Terdeteksi:</span>
                      <span className="font-semibold text-ink text-right truncate max-w-[160px]">
                        {activeChatDetail.ai_topic || activeChatDetail.consultation_topic || "-"}
                      </span>
                    </div>

                    {activeChatDetail.ai_analysis?.summary && (
                      <p className="text-[11px] text-muted italic pt-0.5 leading-relaxed">
                        "{activeChatDetail.ai_analysis.summary}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Status Sesi & Terminasi Card */}
                <div className="p-3.5 bg-surface rounded-xl border border-line shadow-2xs space-y-2.5">
                  <h5 className="text-xs font-bold text-ink">
                    ⚙️ Kontrol Sesi Konsultasi
                  </h5>
                  <div className="space-y-1.5 text-xs text-muted">
                    <div className="flex justify-between items-center">
                      <span>Status:</span>
                      <span className="font-bold text-ink">
                        {activeChatDetail.session_status === "closed" && "✅ Diterminasi"}
                        {activeChatDetail.session_status === "admin_active" && "👤 Ditangani Admin"}
                        {(activeChatDetail.flag_3days || activeChatDetail.delayed_3days || activeChatDetail.session_status === "delayed") && "🚩 Flag 3 Hari (Reach Out)"}
                        {activeChatDetail.session_status === "waiting_admin" && !activeChatDetail.delayed_3days && !activeChatDetail.flag_3days && "🤖 Menunggu Admin"}
                      </span>
                    </div>

                    {(activeChatDetail.flag_3days || activeChatDetail.delayed_3days || activeChatDetail.session_status === "delayed") && (
                      <div className="p-2.5 bg-amber-50/80 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800 text-[11px] space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-muted">Batas Waktu:</span>
                          <span className="font-bold text-amber-800 dark:text-amber-200">
                            {activeChatDetail.delayed_until_formatted || "3 Hari Kerja"}
                          </span>
                        </div>
                        {activeChatDetail.delayed_topic && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted">Topik Data:</span>
                            <span className="font-semibold text-ink truncate max-w-[150px]">
                              {activeChatDetail.delayed_topic}
                            </span>
                          </div>
                        )}
                        {activeChatDetail.reached_out_at && (
                          <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-300">
                            <span>Direach-out:</span>
                            <span className="font-medium">{formatTime(activeChatDetail.reached_out_at)}</span>
                          </div>
                        )}
                        <p className="text-[10px] text-muted italic pt-0.5 border-t border-amber-200/60 dark:border-amber-800/60">
                          Auto salam pembuka & penutup dinonaktifkan untuk kontak ini.
                        </p>
                      </div>
                    )}

                    {activeChatDetail.session?.autoGreetedAt && (
                      <div className="flex justify-between items-center text-[11px]">
                        <span>Pesan Pembuka:</span>
                        <span>{formatTime(activeChatDetail.session.autoGreetedAt)}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 space-y-2 border-t border-line">
                    {activeChatDetail.session_status !== "closed" ? (
                      <>
                        {activeChatDetail.flag_3days || activeChatDetail.delayed_3days || activeChatDetail.session_status === "delayed" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const topic = activeChatDetail?.delayed_topic || "yang Kakak butuhkan";
                                const timeGreeting = liveSettings?.currentGreeting || getTimeGreeting();
                                setReplyText(
                                  `Selamat ${timeGreeting} Kak. Terkait data mengenai ${topic} yang telah disiapkan oleh tim teknis kami, datanya kini sudah selesai diproses dan siap kami serahkan ya Kak.\n\nBerikut informasinya:\n[Tuliskan keterangan / tautan berkas di sini]\n\nApabila masih ada yang ingin dikonsultasikan lebih lanjut, silakan sampaikan kepada kami ya Kak 😊`
                                );
                                replyInputRef.current?.focus();
                                toast.success("Draf pesan reach out disalin ke kolom input!");
                              }}
                              className="w-full py-2 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <span>💬 Siapkan Pesan Reach Out</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenTerminationModal(activeChatDetail, "completed")}
                              className="w-full py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <span>✅ Data Siap & Selesaikan (SKD)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReopen(activeChatDetail.id)}
                              className="w-full py-1.5 px-3 text-xs font-semibold text-muted hover:text-ink bg-subtle hover:bg-hover border border-line rounded-lg transition-colors cursor-pointer"
                            >
                              ↩️ Lepas Flag 3 Hari
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenTerminationModal(activeChatDetail, "delayed_3days")}
                            className="w-full py-1.5 px-3 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 dark:border-amber-700 rounded-lg transition-colors cursor-pointer"
                          >
                            🚩 Pasang Flag Terminasi (3 Hari)
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenTerminationModal(activeChatDetail)}
                          className="w-full py-2 px-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <StopIcon className="w-4 h-4" />
                          <span>Terminasi Sesi Ini</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleReopen(activeChatDetail.id)}
                        className="w-full py-2 px-3 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-xl transition-colors cursor-pointer"
                      >
                        🔄 Buka Sesi Kembali
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* TAB 1: MEDIA */}
            {rightPanelTab === "media" && (
              <div className="space-y-2">
                {!activeChatDetail.media ||
                activeChatDetail.media.length === 0 ? (
                  <p className="text-faint text-xs text-center py-10">
                    Belum ada foto atau berkas media.
                  </p>
                ) : (
                  activeChatDetail.media.map((med, mIdx) => (
                    <div
                      key={med.id || mIdx}
                      className="p-2.5 rounded-xl border border-line bg-surface hover:border-accent transition-all flex items-start gap-2.5 shadow-2xs"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-sm">
                        {med.type === "image"
                          ? "📷"
                          : med.type === "document"
                            ? "📄"
                            : "🎙️"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-ink truncate">
                          {med.caption ||
                            med.mediaInfo?.fileName ||
                            `Berkas ${med.type}`}
                        </p>
                        <div className="flex items-center justify-between text-[10.5px] text-faint mt-1">
                          <span className="truncate">{med.sender}</span>
                          <span className="shrink-0">
                            {formatTime(med.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: LINKS */}
            {rightPanelTab === "links" && (
              <div className="space-y-2">
                {!activeChatDetail.links ||
                activeChatDetail.links.length === 0 ? (
                  <p className="text-faint text-xs text-center py-10">
                    Belum ada tautan dibagikan.
                  </p>
                ) : (
                  activeChatDetail.links.map((lnk, lIdx) => (
                    <div
                      key={lIdx}
                      className="p-2.5 rounded-xl border border-line hover:border-blue-400 bg-surface transition-all shadow-2xs"
                    >
                      <a
                        href={lnk.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-accent hover:text-accent break-all inline-flex items-center gap-1"
                      >
                        <span>{lnk.url}</span>
                        <ExternalLinkIcon className="w-3.5 h-3.5 shrink-0" />
                      </a>
                      <div className="flex items-center justify-between text-[10.5px] text-faint mt-1.5">
                        <span className="truncate">{lnk.sender}</span>
                        <span className="shrink-0">
                          {formatTime(lnk.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: PARTICIPANTS */}
            {rightPanelTab === "participants" && (
              <div className="space-y-2">
                {!activeChatDetail.participants ||
                activeChatDetail.participants.length === 0 ? (
                  <p className="text-faint text-xs text-center py-10">
                    Tidak ada data anggota.
                  </p>
                ) : (
                  activeChatDetail.participants.map((p, pIdx) => (
                    <div
                      key={p.jid || pIdx}
                      className="p-2.5 rounded-xl border border-line bg-surface hover:border-accent transition-all flex items-center justify-between gap-2.5 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-ink truncate">
                          {p.name || p.phone}
                        </p>
                        <p className="text-[11px] text-muted font-mono truncate">
                          {p.phone}
                        </p>
                        <span className="text-[10px] bg-subtle text-muted px-2 py-0.5 rounded-full font-medium mt-1 inline-block">
                          {p.message_count || 0} pesan
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(p.raw_phone || p.phone, "Nomor Peserta")
                        }
                        className="p-1.5 text-faint hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                        title="Salin nomor peserta"
                      >
                        <CopyIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-surface rounded-2xl shadow-2xl max-w-md w-full p-6 border border-line animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  +
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">
                    Mulai Obrolan WhatsApp Baru
                  </h3>
                  <p className="text-xs text-muted">
                    Kirim pesan ke nomor kontak atau nomor baru
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="text-faint hover:text-muted text-sm p-1.5 rounded-lg hover:bg-subtle cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStartNewChat} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Nomor WhatsApp Tujuan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newChatPhone}
                  onChange={(e) => setNewChatPhone(e.target.value)}
                  placeholder="Contoh: 08123456789 atau 628123456789"
                  className="w-full px-3.5 py-2 text-sm bg-subtle border border-line-strong rounded-xl focus:bg-surface focus:ring-2 focus:ring-[#00a884] focus:outline-hidden font-mono"
                  autoFocus
                />
                <p className="text-[11px] text-muted mt-1">
                  Format angka biasa diawali 08... atau 62...
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Nama Kontak (Opsional)
                </label>
                <input
                  type="text"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  placeholder="Contoh: Budi Santoso / Dinas Kominfo"
                  className="w-full px-3.5 py-2 text-sm bg-subtle border border-line-strong rounded-xl focus:bg-surface focus:ring-2 focus:ring-[#00a884] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted hover:bg-subtle rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-brand hover:bg-brand-hover rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Buka Obrolan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official PST BPS Termination Modal */}
      {showTerminationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-surface rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-line overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-lg shadow-xs">
                  🛑
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">
                    Terminasi Sesi Layanan PST BPS Gorontalo
                  </h3>
                  <p className="text-xs text-muted">
                    Aturan penutupan sesuai dokumen panduan resmi PST BPS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTerminationModal(false)}
                className="text-faint hover:text-ink text-sm p-1.5 rounded-lg hover:bg-subtle cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Pilihan Jenis Terminasi */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-ink block">
                  Pilih Aturan Terminasi Dokumen BPS:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {/* Opsi A: Selesai */}
                  <div
                    onClick={() => setTerminationType("completed")}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      terminationType === "completed"
                        ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs"
                        : "border-line bg-subtle hover:border-line-strong"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        checked={terminationType === "completed"}
                        onChange={() => setTerminationType("completed")}
                        className="text-emerald-600"
                      />
                      <span className="text-xs font-bold text-ink">
                        1. Layanan Selesai
                      </span>
                    </div>
                    <p className="text-[10.5px] text-muted leading-relaxed">
                      Konsultasi selesai. Menyertakan link survei SKD <b>s.bps.go.id/skd75</b>
                    </p>
                  </div>

                  {/* Opsi B: Sesi Siang 14.00 WITA */}
                  <div
                    onClick={() => setTerminationType("midday_1400")}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      terminationType === "midday_1400"
                        ? "border-sky-600 bg-sky-50/50 dark:bg-sky-950/20 shadow-xs"
                        : "border-line bg-subtle hover:border-line-strong"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        checked={terminationType === "midday_1400"}
                        onChange={() => setTerminationType("midday_1400")}
                        className="text-sky-600"
                      />
                      <span className="text-xs font-bold text-ink">
                        2. Sesi Siang (14.00)
                      </span>
                    </div>
                    <p className="text-[10.5px] text-muted leading-relaxed">
                      Terminasi sesi siang pukul 14.00 WITA disertai survei SKD BPS Gorontalo.
                    </p>
                  </div>

                  {/* Opsi C: Tutup Jam Layanan 15.30 WITA */}
                  <div
                    onClick={() => setTerminationType("end_of_day")}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      terminationType === "end_of_day"
                        ? "border-amber-600 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs"
                        : "border-line bg-subtle hover:border-line-strong"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        checked={terminationType === "end_of_day"}
                        onChange={() => setTerminationType("end_of_day")}
                        className="text-amber-600"
                      />
                      <span className="text-xs font-bold text-ink">
                        3. Jam Tutup (15.30)
                      </span>
                    </div>
                    <p className="text-[10.5px] text-muted leading-relaxed">
                      Penutupan operasional harian sore. Jadwal buka kembali + SIGAP & Web.
                    </p>
                  </div>

                  {/* Opsi D: Terminasi 3 Hari (Flag Aktif) */}
                  <div
                    onClick={() => setTerminationType("delayed_3days")}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      terminationType === "delayed_3days"
                        ? "border-amber-600 bg-amber-50/70 dark:bg-amber-950/40 shadow-xs"
                        : "border-line bg-subtle hover:border-line-strong"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        checked={terminationType === "delayed_3days"}
                        onChange={() => setTerminationType("delayed_3days")}
                        className="text-amber-600"
                      />
                      <span className="text-xs font-bold text-ink">
                        4. Terminasi 3 Hari
                      </span>
                    </div>
                    <p className="text-[10.5px] text-muted leading-relaxed">
                      Penundaan data teknis maks. 3 hari kerja. Flag aktif, tanpa pembuka/penutup agar siap direach-out.
                    </p>
                  </div>
                </div>
              </div>

              {/* Input Variabel Berdasarkan Jenis */}
              {terminationType === "delayed_3days" ? (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                    <strong>Kebijakan Flag Terminasi 3 Hari:</strong> Kontak ini akan ditandai dengan flag 3 hari kerja. Narasi pembuka (salam/form nama) dan penutup otomatis (14.00 & 15.30) <u>dinonaktifkan sepenuhnya</u> agar admin leluasa mereach-out kembali kapan pun. Kontak juga otomatis masuk ke list <strong>🚩 Flag 3 Hari</strong> di kolom chat.
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      Topik / Jenis Data yang Disiapkan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={terminationTopic}
                      onChange={(e) => setTerminationTopic(e.target.value)}
                      placeholder="Contoh: Data Inflasi Kota Gorontalo 2024 / Kemiskinan Makro"
                      className="w-full px-3.5 py-2 text-sm bg-subtle border border-line-strong rounded-xl focus:bg-surface focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      Catatan Tim Internal (Opsional)
                    </label>
                    <input
                      type="text"
                      value={delayNote}
                      onChange={(e) => setDelayNote(e.target.value)}
                      placeholder="Contoh: Berkas Excel sedang diolah tim Nerwilis / IPDS"
                      className="w-full px-3.5 py-2 text-sm bg-subtle border border-line-strong rounded-xl focus:bg-surface focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              ) : terminationType === "completed" || terminationType === "midday_1400" ? (
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Topik Konsultasi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={terminationTopic}
                    onChange={(e) => setTerminationTopic(e.target.value)}
                    placeholder="Contoh: Data Inflasi Kota Gorontalo 2024 / Kemiskinan"
                    className="w-full px-3.5 py-2 text-sm bg-subtle border border-line-strong rounded-xl focus:bg-surface focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <p className="text-[11px] text-muted mt-1">
                    Variabel <code>[Topik Konsultasi]</code> yang disisipkan ke dalam pesan penutup resmi.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Jadwal Layanan Dibuka Kembali <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={terminationSchedule}
                    onChange={(e) => setTerminationSchedule(e.target.value)}
                    placeholder="Contoh: Kamis, 15 Oktober 2026 pukul 08.00 WITA"
                    className="w-full px-3.5 py-2 text-sm bg-subtle border border-line-strong rounded-xl focus:bg-surface focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                  <p className="text-[11px] text-muted mt-1">
                    Variabel <code>[hari, tanggal]</code> saat jam layanan dibuka kembali.
                  </p>
                </div>
              )}

              {/* Pratinjau Teks Pesan */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1 flex items-center justify-between">
                  <span>Pratinjau Pesan yang Dikirim:</span>
                  <span className="text-[10px] text-faint">Format Dokumen BPS Gorontalo</span>
                </label>
                <div className="p-3 bg-subtle rounded-xl border border-line text-xs font-mono whitespace-pre-wrap leading-relaxed text-ink select-all">
                  {getTerminationPreviewText()}
                </div>
              </div>

              {/* Checkbox Kirim ke WhatsApp */}
              <label className="flex items-center gap-2.5 text-xs font-semibold text-ink cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={terminationSendWhatsapp}
                  onChange={(e) => setTerminationSendWhatsapp(e.target.checked)}
                  className="rounded-sm text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>Kirim pesan resmi ini langsung ke nomor WhatsApp pelanggan</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-line mt-4 shrink-0">
              <button
                type="button"
                onClick={() => setShowTerminationModal(false)}
                className="px-4 py-2 text-xs font-semibold text-muted hover:bg-subtle rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmittingTermination}
                onClick={handleExecuteTermination}
                className={`px-5 py-2 text-xs font-bold text-white disabled:opacity-50 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  terminationType === "delayed_3days"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {isSubmittingTermination ? (
                  <>
                    <RefreshIcon className="w-4 h-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : terminationType === "delayed_3days" ? (
                  <>
                    <span>🚩 Konfirmasi & Aktifkan Flag 3 Hari</span>
                  </>
                ) : (
                  <>
                    <StopIcon className="w-4 h-4" />
                    <span>Konfirmasi & Akhiri Sesi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3-Day Delay Modal (Penundaan Pengolahan Data BPS) */}
      {showDelayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-surface rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-line overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 flex items-center justify-center font-bold text-lg shadow-xs">
                  📌
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">
                    Tandai Penundaan Pengolahan Data
                  </h3>
                  <p className="text-xs text-muted">
                    Batas waktu maksimal 3 (tiga) hari kerja sesuai SOP PST BPS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDelayModal(false)}
                className="text-faint hover:text-ink text-sm p-1.5 rounded-lg hover:bg-subtle cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmDelay} className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/80 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
                <p>
                  <strong>Catatan Kebijakan:</strong> Selama masa penundaan, narasi pembuka (salam/form nama) dan pesan penutup otomatis (14.00 & 15.30) <u>dinonaktifkan sepenuhnya</u> untuk kontak ini agar petugas dapat mereach-out kembali saat data telah siap.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Topik / Jenis Data yang Disiapkan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={delayTopic}
                  onChange={(e) => setDelayTopic(e.target.value)}
                  placeholder="Contoh: Data PDRB Triwulanan Kab. Gorontalo / Kemiskinan Makro"
                  className="w-full px-3.5 py-2 text-sm bg-subtle border border-line-strong rounded-xl focus:bg-surface focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Catatan Internal Tim (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={delayNote}
                  onChange={(e) => setDelayNote(e.target.value)}
                  placeholder="Contoh: Berkas Excel sedang diolah tim Nerwilis / Tim IPDS"
                  className="w-full px-3.5 py-2 text-sm bg-subtle border border-line-strong rounded-xl focus:bg-surface focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none"
                />
              </div>

              {/* Pratinjau Pesan WA Penundaan */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1 flex items-center justify-between">
                  <span>Pratinjau Pesan Penundaan Resmi (SOP PST):</span>
                  <span className="text-[10px] text-faint">Format Panduan BPS</span>
                </label>
                <div className="p-3 bg-subtle rounded-xl border border-line text-xs font-mono whitespace-pre-wrap leading-relaxed text-ink select-all">
{`Selamat ${getTimeGreeting()} Kak. Data yang Kakak butuhkan memerlukan proses penyiapan terlebih dahulu oleh tim teknis kami dalam waktu maksimal 3 (hari) kerja. Kami akan menghubungi Kakak kembali melalui nomor ini setelah data tersebut siap diserahkan.
Terima kasih atas pengertian dan kesediaan Kakak untuk menunggu 😊`}
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-xs font-semibold text-ink cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={delaySendWhatsapp}
                  onChange={(e) => setDelaySendWhatsapp(e.target.checked)}
                  className="rounded-sm text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span>Kirim pesan resmi penundaan ini langsung ke nomor WhatsApp pengunjung</span>
              </label>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-line mt-4">
                <button
                  type="button"
                  onClick={() => setShowDelayModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted hover:bg-subtle rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDelay}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingDelay ? (
                    <>
                      <RefreshIcon className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <span>📌 Aktifkan Flag (3 Hari)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto-Chat & Operating Hours Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-surface rounded-2xl shadow-2xl max-w-md w-full p-6 border border-line overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg shadow-xs">
                  ⚙️
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">
                    Pengaturan Auto-Chat & Jam Layanan
                  </h3>
                  <p className="text-xs text-muted">
                    PST BPS Provinsi Gorontalo (WITA / UTC+8)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-faint hover:text-ink text-sm p-1.5 rounded-lg hover:bg-subtle cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Toggle Auto-Greeting */}
              <div className="p-3.5 bg-subtle rounded-xl border border-line flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-ink text-xs">
                    Otomatis Chat Duluan (Auto-Greeting)
                  </h4>
                  <p className="text-[11px] text-muted mt-0.5">
                    Kirim pesan pembuka / follow-up otomatis sebelum admin ambil alih
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleSaveLiveSettings({
                      autoGreetingEnabled: !liveSettings?.autoGreetingEnabled,
                    }, true)
                  }
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                    liveSettings?.autoGreetingEnabled
                      ? "bg-emerald-600 justify-end"
                      : "bg-gray-300 dark:bg-zinc-700 justify-start"
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md"></div>
                </button>
              </div>

              {/* Terminasi Otomatis & Aturan Chat SIGAP */}
              <div className="p-3.5 bg-subtle rounded-xl border border-line space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-ink text-xs flex items-center gap-1.5">
                      <span>⏱️</span> Auto-Terminasi Terjadwal (14.00 & 15.30 WITA)
                    </h4>
                    <p className="text-[11px] text-muted mt-0.5">
                      Otomatis akhiri sesi percakapan pada pukul 14.00 WITA (sesi siang) dan pukul 15.30 WITA (tutup layanan)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleSaveLiveSettings({
                        scheduledTerminationEnabled: !liveSettings?.scheduledTerminationEnabled,
                        autoTerminateOnTimeout: false,
                        inactivityTimeoutMinutes: 0,
                      }, true)
                    }
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      liveSettings?.scheduledTerminationEnabled !== false
                        ? "bg-emerald-600 justify-end"
                        : "bg-gray-300 dark:bg-zinc-700 justify-start"
                    }`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-md"></div>
                  </button>
                </div>

                {/* Sub-toggle: Kirim Pesan Penutup & SKD saat Jadwal Tiba */}
                <div className="pt-2.5 border-t border-line/60 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-semibold text-ink text-[11.5px] block">
                      Kirim Pesan Penutup Resmi & Survei SKD Otomatis
                    </span>
                    <span className="text-[10.5px] text-muted block mt-0.5">
                      Kirim pesan terminasi resmi PST BPS Gorontalo + tautan survei SKD (https://s.bps.go.id/skd75) ke WhatsApp pengunjung saat jadwal tiba
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleSaveLiveSettings({
                        sendAutoTerminationMessage: !liveSettings?.sendAutoTerminationMessage,
                      }, true)
                    }
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                      liveSettings?.sendAutoTerminationMessage !== false
                        ? "bg-emerald-600 justify-end"
                        : "bg-gray-300 dark:bg-zinc-700 justify-start"
                    }`}
                  >
                    <div className="bg-white w-3.5 h-3.5 rounded-full shadow-md"></div>
                  </button>
                </div>

                {/* Info Card: Aturan Chat Ulang SIGAP */}
                <div className="bg-surface rounded-lg p-2.5 border border-line text-[11px] space-y-1.5 text-muted">
                  <span className="font-bold text-ink block text-[11.5px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <span>💡</span> Aturan Terminasi Terjadwal & Anti-Pengulangan:
                  </span>
                  <p className="leading-relaxed">
                    • <b>Terminasi Pukul 14.00 & 15.30 WITA:</b> Sesi aktif diakhiri tepat pada jadwal tanpa batas waktu 10 menit yang mengganggu obrolan yang sedang berlangsung.
                  </p>
                  <p className="leading-relaxed">
                    • <b>Mencegah Narasi Berulang:</b> Narasi pembuka dan penutup tidak akan terkirim berulang kali kepada pengunjung yang sama saat konsultasi sedang berlangsung.
                  </p>
                </div>
              </div>

              {/* Status Waktu Saat Ini */}
              <div className="p-3 bg-surface rounded-xl border border-line space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Status Jam Operasional:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                      liveSettings?.isOperatingHoursNow
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {liveSettings?.isOperatingHoursNow
                      ? "🟢 Jam Layanan Aktif"
                      : "🟡 Di Luar Jam Layanan"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted">Waktu Gorontalo (WITA):</span>
                  <span className="font-mono text-ink">
                    {liveSettings?.currentGorontaloTime
                      ? new Date(liveSettings.currentGorontaloTime).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Makassar"
                        }) + " WITA"
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted">Sapaan Otomatis:</span>
                  <span className="font-bold capitalize text-ink">
                    Selamat {liveSettings?.currentGreeting || "pagi/siang/sore"}
                  </span>
                </div>
              </div>

              {/* Tabel Jam Kerja PST Gorontalo */}
              <div>
                <h4 className="font-bold text-ink mb-1.5">
                  Jadwal Operasional Layanan PST BPS Gorontalo:
                </h4>
                <div className="border border-line rounded-xl overflow-hidden divide-y divide-line text-[11.5px]">
                  <div className="px-3 py-1.5 bg-subtle flex justify-between font-bold text-muted">
                    <span>Hari</span>
                    <span>Jam Layanan</span>
                  </div>
                  <div className="px-3 py-1.5 flex justify-between bg-surface">
                    <span>Senin - Kamis</span>
                    <span className="font-mono font-semibold">08:00 - 15:30 WITA</span>
                  </div>
                  <div className="px-3 py-1.5 flex justify-between bg-surface">
                    <span>Jumat</span>
                    <span className="font-mono font-semibold">08:00 - 15:00 WITA</span>
                  </div>
                  <div className="px-3 py-1.5 flex justify-between bg-subtle/50 text-faint">
                    <span>Sabtu & Minggu</span>
                    <span>Tutup (Luar Jam Layanan)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-line mt-4 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-2 text-xs font-bold text-white bg-brand hover:bg-brand-hover rounded-xl shadow-md transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
