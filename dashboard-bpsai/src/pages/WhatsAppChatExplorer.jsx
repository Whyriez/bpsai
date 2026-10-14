import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import apiFetch from "../services/api";

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
    name: "Penundaan (3 Hari)",
    category: "LAYANAN",
    badge: "Maks. 3 Hari Kerja",
    description: "Jika permintaan data butuh penyiapan teknis terlebih dahulu",
    getText: (greeting = "siang") =>
`Selamat ${greeting} Kak. Data yang Kakak butuhkan memerlukan proses penyiapan terlebih dahulu oleh tim teknis kami dalam waktu maksimal 3 (hari) kerja. Kami akan menghubungi Kakak kembali melalui nomor ini setelah data tersebut siap diserahkan.
Terima kasih atas pengertian dan kesediaan Kakak untuk menunggu 😊`
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
    id: "terminasi_tutup_hari",
    name: "Terminasi: Jam Tutup",
    category: "TERMINASI",
    badge: "Tutup Operasional Sore",
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

export default function WhatsAppChatExplorer() {
  // Source: "live" (Gateway Local) or "backup" (Zip file)
  const [sourceMode, setSourceMode] = useState("live");
  const [backupFiles, setBackupFiles] = useState([]);
  const [selectedBackupFilename, setSelectedBackupFilename] = useState("");

  // Chats state
  const [chats, setChats] = useState([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [stats, setStats] = useState(null);

  // Active chat & messages
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeChatDetail, setActiveChatDetail] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Filtering & search
  const [searchQuery, setSearchQuery] = useState("");
  const [chatTypeFilter, setChatTypeFilter] = useState("ALL"); // ALL | DIRECT | GROUP | CHANNEL

  // Right sidebar drawer (info, media, links, participants, pst)
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState("pst"); // pst | media | links | participants

  // Reply message state
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  // New Chat modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState("");
  const [newChatName, setNewChatName] = useState("");

  // Live Chat Sessions & Operating Settings
  const [liveSettings, setLiveSettings] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Termination Modal State
  const [showTerminationModal, setShowTerminationModal] = useState(false);
  const [terminationType, setTerminationType] = useState("completed"); // 'completed' | 'end_of_day'
  const [terminationTopic, setTerminationTopic] = useState("");
  const [terminationSchedule, setTerminationSchedule] = useState("");
  const [terminationSendWhatsapp, setTerminationSendWhatsapp] = useState(true);
  const [isSubmittingTermination, setIsSubmittingTermination] = useState(false);

  const messagesEndRef = useRef(null);

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
      setChats([newEntry, ...chats]);
    }
    setActiveChatId(jid);
    setShowNewChatModal(false);
    setNewChatPhone("");
    setNewChatName("");
    toast.success(`Obrolan dengan ${name} siap!`);
  };

  // Load chats on mount or source mode change
  useEffect(() => {
    if (sourceMode === "live") {
      fetchLiveChats();
    } else {
      fetchBackupList();
    }
  }, [sourceMode]);

  // When selected backup changes in backup mode
  useEffect(() => {
    if (sourceMode === "backup" && selectedBackupFilename) {
      inspectBackup(selectedBackupFilename);
    }
  }, [selectedBackupFilename]);

  // Load chat detail when activeChatId changes
  useEffect(() => {
    if (!activeChatId) {
      setActiveChatDetail(null);
      return;
    }
    if (sourceMode === "live") {
      fetchLiveChatDetail(activeChatId);
    } else if (sourceMode === "backup" && selectedBackupFilename) {
      fetchBackupChatDetail(selectedBackupFilename, activeChatId);
    }
  }, [activeChatId]);

  // Auto scroll messages to bottom
  useEffect(() => {
    if (activeChatDetail?.messages?.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeChatDetail?.messages]);

  // 1. Fetch live chats from gateway and settings
  const fetchLiveChats = async () => {
    setIsLoadingChats(true);
    try {
      const [chatsRes, settingsRes] = await Promise.allSettled([
        apiFetch("/documents/bps/whatsapp-explorer/chats"),
        apiFetch("/documents/bps/whatsapp-explorer/sessions-settings")
      ]);

      if (chatsRes.status === "fulfilled" && chatsRes.value?.success) {
        setChats(chatsRes.value.chats || []);
        setStats(chatsRes.value.stats || null);
        if (!activeChatId && chatsRes.value.chats && chatsRes.value.chats.length > 0) {
          if (window.innerWidth >= 768) {
            setActiveChatId(chatsRes.value.chats[0].id);
          }
        }
      } else if (chatsRes.status === "fulfilled") {
        toast.error(
          chatsRes.value?.error || "Gagal memuat percakapan dari WhatsApp Gateway",
        );
      }

      if (settingsRes.status === "fulfilled" && settingsRes.value?.success) {
        setLiveSettings(settingsRes.value.settings || null);
      }
    } catch (err) {
      toast.error(`Koneksi gateway gagal: ${err.message}`);
    } finally {
      setIsLoadingChats(false);
    }
  };

  // Fetch settings separately
  const fetchLiveSettings = async () => {
    try {
      const res = await apiFetch("/documents/bps/whatsapp-explorer/sessions-settings");
      if (res.success) {
        setLiveSettings(res.settings);
      }
    } catch (e) {}
  };

  // 2. Fetch live chat details
  const fetchLiveChatDetail = async (chatId) => {
    setIsLoadingDetail(true);
    try {
      const res = await apiFetch(
        `/documents/bps/whatsapp-explorer/chats/${encodeURIComponent(chatId)}`,
      );
      if (res.success && res.chat) {
        setActiveChatDetail(res.chat);
        // If direct chat, prioritize PST tab
        if (res.chat.is_direct && rightPanelTab !== "media" && rightPanelTab !== "links") {
          setRightPanelTab("pst");
        }
      } else {
        toast.error(res.error || "Gagal mengambil pesan obrolan");
      }
    } catch (err) {
      toast.error(`Gagal memuat detail obrolan: ${err.message}`);
    } finally {
      setIsLoadingDetail(false);
    }
  };

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

  // Handle Delay (3 Hari Kerja)
  const handleDelay = async (chatId) => {
    try {
      const res = await apiFetch(`/documents/bps/whatsapp-explorer/sessions/${encodeURIComponent(chatId)}/delay`, {
        method: "POST",
        body: JSON.stringify({ adminName: "Admin PST", sendMessage: true })
      });
      if (res.success) {
        toast.success("Status sesi diubah ke Penundaan (Maks. 3 Hari) & pesan terkirim!");
        fetchLiveChatDetail(chatId);
        fetchLiveChats();
      } else {
        toast.error(res.error || "Gagal menandai penundaan data");
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`);
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
  const handleOpenTerminationModal = (chat) => {
    const topic = chat?.visitor_data?.topic || chat?.consultation_topic || "";
    setTerminationTopic(topic);
    setTerminationType("completed");
    setTerminationSchedule(liveSettings?.nextOperatingSchedule || "hari kerja berikutnya pukul 08.00 WITA");
    setTerminationSendWhatsapp(true);
    setShowTerminationModal(true);
  };

  // Live text preview for termination
  const getTerminationPreviewText = () => {
    if (terminationType === "end_of_day") {
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
          topic: terminationTopic.trim() || "konsultasi data",
          nextSchedule: terminationSchedule.trim() || liveSettings?.nextOperatingSchedule,
          adminName: "Admin PST",
          sendWhatsappMessage: terminationSendWhatsapp
        })
      });
      if (res.success) {
        toast.success(
          terminationType === "end_of_day"
            ? "Sesi ditutup (Jam Layanan Berakhir)!"
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
    if (tmpl.id === "terminasi_tutup_hari") {
      setTerminationType("end_of_day");
      handleOpenTerminationModal(activeChatDetail);
      return;
    }
    if (tmpl.id === "penundaan") {
      const timeGreeting = liveSettings?.currentGreeting || "siang";
      setReplyText(tmpl.getText(timeGreeting));
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

  // 4. Inspect specific backup ZIP
  const inspectBackup = async (filename) => {
    setIsLoadingChats(true);
    try {
      const res = await apiFetch(
        `/documents/bps/whatsapp-explorer/backups/inspect?filename=${encodeURIComponent(filename)}`,
      );
      if (res.success) {
        const mappedChats = (res.chats || []).map((c) => ({
          id: c.chat_id,
          name: c.chat_name,
          phone: c.type === "direct" ? c.chat_id.split("@")[0] : null,
          type: c.type,
          is_group: c.type === "group",
          is_channel: c.type === "channel",
          is_direct: c.type === "direct",
          message_count: c.message_count,
          last_message: c.last_message,
        }));

        const existingIds = new Set(mappedChats.map((c) => c.id));
        (res.groups || []).forEach((g) => {
          if (!existingIds.has(g.id)) {
            mappedChats.push({
              id: g.id,
              name: g.subject || `Grup (${g.id.split("@")[0].slice(-6)})`,
              phone: null,
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
                timestamp: g.creation,
                fromMe: false,
              },
            });
            existingIds.add(g.id);
          }
        });

        (res.channels || []).forEach((ch) => {
          if (!existingIds.has(ch.id)) {
            mappedChats.push({
              id: ch.id,
              name: ch.name || "Saluran Resmi WhatsApp",
              phone: null,
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
            existingIds.add(ch.id);
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
      setIsLoadingChats(false);
    }
  };

  // 5. Fetch chat detail from backup ZIP
  const fetchBackupChatDetail = async (filename, chatId) => {
    setIsLoadingDetail(true);
    try {
      const res = await apiFetch(
        `/documents/bps/whatsapp-explorer/backups/chat?filename=${encodeURIComponent(filename)}&chatId=${encodeURIComponent(chatId)}`,
      );
      if (res.success && res.chat) {
        setActiveChatDetail(res.chat);
      } else {
        toast.error(res.error || "Gagal memuat pesan dari backup");
      }
    } catch (err) {
      toast.error(`Gagal memuat riwayat backup: ${err.message}`);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // 6. Send reply to current chat
  const handleSendReply = async (e) => {
    e?.preventDefault();
    if (!replyText.trim() || !activeChatDetail || isSendingReply) return;

    setIsSendingReply(true);
    const target = activeChatDetail.id;
    const msg = replyText.trim();

    try {
      const res = await apiFetch("/documents/bps/whatsapp-explorer/reply", {
        method: "POST",
        body: JSON.stringify({ target, message: msg }),
      });

      if (res.success) {
        toast.success(`Pesan terkirim ke ${activeChatDetail.name || target}!`);
        setReplyText("");

        const newMsg = {
          id: res.message_id || `out-${Date.now()}`,
          fromMe: true,
          text: msg,
          type: "text",
          timestamp: Math.floor(Date.now() / 1000),
          pushName: "SIGAP Admin",
        };

        setActiveChatDetail((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: [...(prev.messages || []), newMsg],
            total_messages: (prev.total_messages || 0) + 1,
          };
        });

        setChats((prev) =>
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
              className={`flex ${isOut ? "justify-end" : "justify-start"} px-1 md:px-4`}
            >
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
                    <CheckDoubleIcon className="text-sky-500 w-3.5 h-3.5 inline-block" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    ));
  };

  return (
    // Outer Container: 100% fit in to parent viewport, zero outer scroll!
    <div className="w-full h-full flex overflow-hidden bg-canvas  text-ink">
      {/* ======================================================== */}
      {/* COLUMN 1: LEFT SIDEBAR (CHATS LIST) — Proportional Width */}
      {/* ======================================================== */}
      <div
        className={`${
          activeChatId ? "hidden md:flex" : "flex"
        } w-full md:w-[320px] lg:w-[360px] xl:w-[380px] shrink-0 flex-col bg-surface border-r border-line h-full z-10`}
      >
        {/* Sidebar Header (WhatsApp Web Style) */}
        <div className="h-16 px-4 bg-subtle border-b border-line flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-xs shrink-0 ring-2 ring-emerald-500/20">
              <WhatsAppIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-ink leading-tight truncate">
                Live Chat PST BPS
              </h1>
              <p className="text-[11px] font-medium flex items-center gap-1.5 truncate">
                {liveSettings ? (
                  liveSettings.isOperatingHoursNow ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                      <span>Jam Layanan Aktif</span>
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                      <span>Luar Jam Layanan</span>
                    </span>
                  )
                ) : (
                  <span className="text-muted">BPS Gorontalo</span>
                )}
              </p>
            </div>
          </div>

          {/* Mode Switcher & Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="bg-hover/90 p-0.5 rounded-lg flex text-[11px] font-semibold">
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

            <button
              type="button"
              onClick={() =>
                sourceMode === "live" ? fetchLiveChats() : fetchBackupList()
              }
              disabled={isLoadingChats}
              className="p-1.5 text-muted hover:text-ink hover:bg-hover/80 rounded-lg transition-colors cursor-pointer"
              title="Segarkan daftar obrolan"
            >
              <RefreshIcon
                className={`w-4 h-4 ${isLoadingChats ? "animate-spin text-emerald-600" : ""}`}
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
              <select
                value={selectedBackupFilename}
                onChange={(e) => setSelectedBackupFilename(e.target.value)}
                className="w-full text-xs bg-surface border border-blue-300 rounded-lg px-2.5 py-1 font-mono text-ink truncate shadow-2xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
              >
                {backupFiles.map((b) => (
                  <option key={b.filename} value={b.filename}>
                    {b.filename} ({b.size_formatted})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-[11px] text-muted italic">
                Tidak ada file backup
              </span>
            )}
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
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pb-0.5 no-scrollbar">
            {[
              { id: "ALL", label: "Semua", count: chats.length },
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
                  chatTypeFilter === f.id
                    ? "bg-brand text-white shadow-xs font-semibold"
                    : "bg-subtle text-muted hover:bg-hover/80 hover:text-ink"
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                    chatTypeFilter === f.id
                      ? "bg-surface/20 text-white font-bold"
                      : "bg-hover/90 text-ink font-semibold"
                  }`}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Chats List (Scrollable) */}
        <div className="flex-1 overflow-y-auto divide-y divide-line bg-surface">
          {isLoadingChats ? (
            <div className="p-10 text-center text-faint text-xs flex flex-col items-center">
              <RefreshIcon className="w-7 h-7 animate-spin text-[#00a884] mb-2.5" />
              <p className="font-semibold text-muted">
                Memuat daftar obrolan...
              </p>
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

              return (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => setActiveChatId(chat.id)}
                  className={`w-full text-left px-3.5 py-3 flex items-center gap-3 transition-colors cursor-pointer border-l-4 ${
                    isActive
                      ? "bg-subtle border-accent"
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
                  </div>

                  {/* Chat Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h3
                        className={`text-sm truncate ${isActive ? "font-bold text-ink" : "font-semibold text-ink"}`}
                      >
                        {chat.name}
                      </h3>
                      <span className="text-[11px] text-faint font-normal shrink-0">
                        {formatTime(chat.last_message?.timestamp)}
                      </span>
                    </div>

                    {/* Session status badge for direct chats */}
                    {chat.is_direct && (
                      <div className="mb-1">
                        <span
                          className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                            chat.session_status === "closed"
                              ? "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"
                              : chat.session_status === "admin_active"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                              : chat.session_status === "delayed"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse"
                          }`}
                        >
                          {chat.session_status === "closed" && "✅ Selesai"}
                          {chat.session_status === "admin_active" && "👤 Admin Aktif"}
                          {chat.session_status === "delayed" && "⏳ Diproses (3 Hari)"}
                          {chat.session_status === "waiting_admin" && "🤖 Menunggu Admin"}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted truncate flex-1 flex items-center gap-1">
                        {chat.last_message?.fromMe && (
                          <CheckDoubleIcon className="w-3.5 h-3.5 text-sky-500 shrink-0" />
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
            <div className="h-16 px-4 md:px-6 bg-subtle border-b border-line flex items-center justify-between gap-3 shrink-0 z-10 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
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

                    {activeChat.is_direct ? (
                      <span
                        className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                          activeChatDetail?.session_status === "closed"
                            ? "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-200"
                            : activeChatDetail?.session_status === "admin_active"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                            : activeChatDetail?.session_status === "delayed"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        }`}
                      >
                        {activeChatDetail?.session_status === "closed" && "✅ Sesi Diterminasi"}
                        {activeChatDetail?.session_status === "admin_active" && "👤 Ditangani Admin"}
                        {activeChatDetail?.session_status === "delayed" && "⏳ Diproses (3 Hari)"}
                        {activeChatDetail?.session_status === "waiting_admin" && "🤖 Menunggu Admin"}
                      </span>
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
              <div className="flex items-center gap-1.5 md:gap-2 shrink-0 flex-wrap">
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
                {activeChat.is_direct && activeChatDetail?.session_status !== "closed" && (
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

            {/* Messages Feed (WhatsApp Subtle Wallpaper Pattern) */}
            <div
              className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3"
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

            {/* Bottom Chat Input Bar */}
            <div className="p-3 md:px-6 bg-subtle border-t border-line shrink-0">
              {sourceMode === "live" ? (
                <form onSubmit={handleSendReply} className="space-y-2">
                  {/* Official PST BPS Gorontalo Canned Templates */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-muted no-scrollbar">
                    <span className="text-[11px] font-bold text-faint shrink-0 flex items-center gap-1">
                      <span>📜 Panduan PST:</span>
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

                  {/* Input & Circular Send Button */}
                  <div className="flex items-end gap-2.5">
                    <div className="flex-1 bg-surface rounded-2xl border border-line-strong shadow-2xs focus-within:ring-2 focus-within:ring-[#00a884] focus-within:border-transparent transition-all">
                      <textarea
                        rows={1}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply();
                          }
                        }}
                        placeholder={`Ketik pesan balasan untuk ${activeChat.name} (Tekan Enter untuk kirim)...`}
                        className="w-full px-4 py-2.5 text-sm bg-transparent border-none resize-none focus:outline-hidden text-ink placeholder-gray-500"
                        style={{ minHeight: "44px", maxHeight: "120px" }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!replyText.trim() || isSendingReply}
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
        <div className="w-[300px] lg:w-[330px] shrink-0 flex flex-col bg-surface border-l border-line h-full z-20 shadow-xl transition-all">
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
                        {activeChatDetail.session_status === "delayed" && "⏳ Diproses (3 Hari)"}
                        {activeChatDetail.session_status === "waiting_admin" && "🤖 Menunggu Admin"}
                      </span>
                    </div>
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
                        <button
                          type="button"
                          onClick={() => handleDelay(activeChatDetail.id)}
                          className="w-full py-1.5 px-3 text-xs font-semibold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors cursor-pointer"
                        >
                          ⏳ Tandai Penundaan (3 Hari)
                        </button>
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
          <div className="bg-surface rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-line overflow-hidden flex flex-col max-h-[90vh]">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Opsi A: Selesai */}
                  <div
                    onClick={() => setTerminationType("completed")}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
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
                    <p className="text-[11px] text-muted leading-relaxed">
                      Konsultasi selesai setelah konfirmasi. Menyertakan link survei SKD: <b>https://s.bps.go.id/skd75</b>
                    </p>
                  </div>

                  {/* Opsi B: Tutup Jam Layanan */}
                  <div
                    onClick={() => setTerminationType("end_of_day")}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
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
                        2. Jam Layanan Berakhir
                      </span>
                    </div>
                    <p className="text-[11px] text-muted leading-relaxed">
                      Penutupan operasional harian di sore hari. Menyertakan jadwal buka kembali, tautan SIGAP & Web BPS.
                    </p>
                  </div>
                </div>
              </div>

              {/* Input Variabel Berdasarkan Jenis */}
              {terminationType === "completed" ? (
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
                  <span>Pratinjau Pesan Penutup yang Dikirim:</span>
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
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSubmittingTermination ? (
                  <>
                    <RefreshIcon className="w-4 h-4 animate-spin" />
                    <span>Memproses...</span>
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
                      <span>⏱️</span> Auto-Terminasi 10 Menit Tidak Aktif
                    </h4>
                    <p className="text-[11px] text-muted mt-0.5">
                      Otomatis akhiri sesi jika tidak ada aktivitas percakapan selama 10 menit
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleSaveLiveSettings({
                        autoTerminateOnTimeout: !liveSettings?.autoTerminateOnTimeout,
                      }, true)
                    }
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      liveSettings?.autoTerminateOnTimeout !== false
                        ? "bg-emerald-600 justify-end"
                        : "bg-gray-300 dark:bg-zinc-700 justify-start"
                    }`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-md"></div>
                  </button>
                </div>

                {/* Sub-toggle: Kirim Pesan Penutup & SKD saat Timeout */}
                <div className="pt-2.5 border-t border-line/60 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-semibold text-ink text-[11.5px] block">
                      Kirim Pesan Penutup Layanan Selesai (Survei SKD)
                    </span>
                    <span className="text-[10.5px] text-muted block mt-0.5">
                      Kirim pesan terminasi resmi BPS Gorontalo + tautan survei SKD (https://s.bps.go.id/skd75) ke WhatsApp pengunjung saat timeout
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
                    <span>💡</span> Aturan Chat Ulang SIGAP Sesuai Terminasi:
                  </span>
                  <p className="leading-relaxed">
                    • <b>Bisa chat lagi setelah 10 menit:</b> Jika sesi telah diterminasi (atau tidak aktif &gt; 10 menit), saat pengunjung mengirim pesan kembali, <b>SIGAP otomatis chat duluan</b> untuk menyambut sesi konsultasi baru.
                  </p>
                  <p className="leading-relaxed">
                    • <b>Mencegah spam sapaan:</b> Jika pengunjung membalas pesan penutup dalam kurun waktu &lt; 10 menit (misal sekadar mengucapkan terima kasih), SIGAP tidak akan mengirim pesan pembuka berulang kali.
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
