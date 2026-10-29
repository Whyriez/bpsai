import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import apiFetch, { API_BASE_URL } from "../services/api";
import useWhatsAppSync, { mergeMessages } from "../hooks/useWhatsAppSync";
import useTheme from "../hooks/useTheme";
import routes from "../routes";
import "./WhatsAppChatExplorer.css";

// --- Enterprise Minimal SVG Icons (1.75px Stroke) ---
const MoreIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="5" r="1.75" />
    <circle cx="12" cy="12" r="1.75" />
    <circle cx="12" cy="19" r="1.75" />
  </svg>
);

const QuickReplyIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 11V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12l4-4h3" />
    <path d="m18 12-4 6h4l-1 4 5-7h-4l1-3" />
  </svg>
);

const resizeReplyInput = (input) => {
  if (!input) return;
  const styles = window.getComputedStyle(input);
  const maxHeight = parseFloat(styles.maxHeight);
  input.style.height = "auto";
  const contentHeight = input.scrollHeight;
  input.style.height = `${Math.min(contentHeight, maxHeight)}px`;
  input.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
};

const ExpandIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
    />
  </svg>
);

const SunIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

const MoonIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    />
  </svg>
);

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
      strokeWidth={1.75}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const SendIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M5 12h14M12 5l7 7-7 7"
    />
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
      strokeWidth={1.75}
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
      strokeWidth={1.75}
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
      strokeWidth={1.75}
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
      strokeWidth={1.75}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const MicIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
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
      strokeWidth={1.75}
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
      strokeWidth={1.75}
      d="M10 19l-7-7m0 0l7-7m-7 7h18"
    />
  </svg>
);

const InfoCircleIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const StopIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
    />
  </svg>
);

const UserCheckIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M16 11l2 2 4-4"
    />
  </svg>
);

const ClockIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const SettingsIcon = ({ className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
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
      strokeWidth={1.75}
      d="M3 10h10a5 5 0 015 5v2m-15-7l4-4m-4 4l4 4"
    />
  </svg>
);

const FlagIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
    />
  </svg>
);

const ArchiveIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
    />
  </svg>
);

const DownloadIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

const LockIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

// --- Time-aware Dynamic Greeting Helper ---
const getTimeGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "pagi";
  if (h >= 11 && h < 15) return "siang";
  if (h >= 15 && h < 18) return "sore";
  return "malam";
};

// --- Official PST BPS Gorontalo Templates (Conforming to Uploaded Guide) ---
const OFFICIAL_TEMPLATES = [
  {
    id: "pembuka",
    name: "Pesan Pembuka",
    category: "PANDUAN",
    badge: "Jam Layanan",
    description: "Sapaan awal saat pesan masuk dalam jam operasional layanan",
    getText: (greeting = getTimeGreeting()) =>
      `Selamat ${greeting}.
Terima kasih telah menghubungi PST BPS Provinsi Gorontalo
Mohon kesediaannya untuk mengisi data berikut ya Kak 😊
Nama : 
Pekerjaan : 
Instansi/Asal : `,
  },
  {
    id: "luar_jam",
    name: "Luar Jam Layanan",
    category: "PANDUAN",
    badge: "Luar Jam Kerja",
    description: "Sapaan saat pesan masuk di luar jam kerja atau hari libur",
    getText: (greeting = getTimeGreeting()) =>
      `Selamat ${greeting}.
Mohon maaf atas keterlambatan respons kami dikarenakan pesan Anda masuk di luar jam operasional petugas layanan kami.
Terima kasih telah bersedia menunggu. Sebelumnya, mohon kesediaannya terlebih dahulu untuk menginformasikan:
Nama : 
Pekerjaan : 
Asal Instansi : `,
  },
  {
    id: "penundaan",
    name: "Terminasi 3 Hari (Penundaan)",
    category: "TERMINASI",
    badge: "Flag 3 Hari",
    description:
      "Tandai penundaan data teknis (maks. 3 hari kerja) & pasang flag agar siap direach-out",
    getText: (greeting = getTimeGreeting()) =>
      `Selamat ${greeting} Kak. Data yang Kakak butuhkan memerlukan proses penyiapan terlebih dahulu oleh tim teknis kami dalam waktu maksimal 3 (hari) kerja. Kami akan menghubungi Kakak kembali melalui nomor ini setelah data tersebut siap diserahkan.
Terima kasih atas pengertian dan kesediaan Kakak untuk menunggu 😊`,
  },
  {
    id: "reachout_3hari",
    name: "Reach Out: Penyerahan Data Siap",
    category: "REACH OUT",
    badge: "Pasca-3 Hari",
    description:
      "Menghubungi kembali kontak tertanda flag saat data teknis telah siap diserahkan tim BPS",
    getText: (topic = "yang Kakak butuhkan", greeting = getTimeGreeting()) =>
      `Selamat ${greeting} Kak. Terkait data mengenai ${topic} yang telah disiapkan oleh tim teknis kami, datanya kini sudah selesai diproses dan siap kami serahkan ya Kak.

Berikut informasinya:
[Tuliskan keterangan / tautan data di sini]

Apabila masih ada yang ingin dikonsultasikan lebih lanjut, silakan sampaikan kepada kami ya Kak 😊`,
  },
  {
    id: "konfirmasi",
    name: "Konfirmasi Jawaban",
    category: "LAYANAN",
    badge: "Konfirmasi",
    description: "Menanyakan apakah data/penjelasan yang diberikan sudah jelas",
    getText: (topic = "[Topik Konsultasi]") =>
      `Bagaimana Kak, terkait penjelasan mengenai ${topic} tadi, apakah sudah cukup jelas?
Kalau dirasa masih ada poin yang kurang jelas atau ada yang ingin ditanyakan lagi, silakan disampaikan saja, ya. 😊`,
  },
  {
    id: "terminasi_selesai",
    name: "Terminasi: Layanan Selesai",
    category: "TERMINASI",
    badge: "Resmi + Survei SKD",
    description:
      "Mengakhiri konsultasi yang telah selesai disertai link survei SKD",
    getText: (topic = "[Topik Konsultasi]") =>
      `Terima kasih banyak telah menghubungi nomor layanan PST BPS Provinsi Gorontalo. Dengan ini, konsultasi terkait ${topic} kami akhiri ya Kak. Agar kami bisa terus memberikan pelayanan yang lebih baik, mohon bantuannya untuk mengisi survei kepuasan singkat di tautan ini: https://s.bps.go.id/skd75

Semoga informasi yang kami sampaikan bermanfaat. Selamat melanjutkan aktivitas dan sehat selalu! 👏 😊`,
  },
  {
    id: "terminasi_siang_1400",
    name: "Terminasi: Sesi Siang (14.00 WITA)",
    category: "TERMINASI",
    badge: "14.00 WITA + SKD",
    description:
      "Mengakhiri konsultasi sesi siang pukul 14.00 WITA disertai link survei SKD",
    getText: (topic = "[Topik Konsultasi]") =>
      `Terima kasih banyak telah menghubungi nomor layanan PST BPS Provinsi Gorontalo. Sesi konsultasi terkait ${topic} pada pukul 14.00 WITA kami akhiri ya Kak.

Agar kami bisa terus memberikan pelayanan yang lebih baik, mohon bantuannya untuk mengisi survei kepuasan singkat di tautan ini: https://s.bps.go.id/skd75

Semoga informasi yang kami sampaikan bermanfaat. Selamat melanjutkan aktivitas dan sehat selalu! 👏 😊`,
  },
  {
    id: "terminasi_tutup_hari",
    name: "Terminasi: Jam Tutup (15.30 WITA)",
    category: "TERMINASI",
    badge: "15.30 WITA Sore",
    description:
      "Mengakhiri layanan hari ini karena jam operasional berakhir (+ link SIGAP & Web)",
    getText: (schedule = "[hari, tanggal]") =>
      `Selamat sore, Kak.
Mengingat jam operasional layanan hari ini telah berakhir, proses konsultasi akan kami lanjutkan kembali pada ${schedule} saat jam layanan dibuka.

Untuk kebutuhan data statistik secara mandiri, Kakak dapat mengakses tautan berikut:
• SIGAP: https://sigap.bps7500.my.id
• Website BPS Provinsi Gorontalo: https://gorontalo.bps.go.id

Kami akan menghubungi Kakak kembali pada ${schedule} untuk menjawab pertanyaan yang belum terselesaikan.

Terima kasih banyak atas pengertiannya Kak 😊`,
  },
];

// Subtle, muted enterprise avatar colors
const getAvatarBg = (str = "") => {
  const colors = [
    "bg-slate-700 text-white",
    "bg-emerald-700 text-white",
    "bg-indigo-700 text-white",
    "bg-sky-700 text-white",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash += str.charCodeAt(i);
  return colors[Math.abs(hash) % colors.length];
};

// Distinct participant name colors in group chats
const getParticipantColor = (str = "") => {
  const colors = [
    "text-emerald-700 dark:text-emerald-400",
    "text-sky-700 dark:text-sky-400",
    "text-amber-700 dark:text-amber-400",
    "text-indigo-700 dark:text-indigo-400",
    "text-rose-700 dark:text-rose-400",
    "text-teal-700 dark:text-teal-400",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash += str.charCodeAt(i);
  return colors[Math.abs(hash) % colors.length];
};

// Gentle Audio Chime using Web Audio API
const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

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
      } catch {
        /* Optional notification/settings enrichment may be unavailable. */
      }
    }
  }
};

const showDesktopNotification = (title, body) => {
  try {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        silent: true,
      });
    }
  } catch {
    /* Optional notification/settings enrichment may be unavailable. */
  }
};

// Clean Intent badge configuration (No Emojis)
const getIntentBadge = (intent) => {
  switch (intent) {
    case "CONTINUATION":
      return {
        label: "Melanjutkan Percakapan",
        short: "Lanjutan",
        bg: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
        dot: "bg-blue-500",
      };
    case "GREETING_NEW":
      return {
        label: "Sapaan Baru",
        short: "Sapaan",
        bg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
        dot: "bg-emerald-500",
      };
    case "DELAY_FOLLOWUP":
      return {
        label: "Tindak Lanjut Penundaan (3 Hari)",
        short: "Progres 3 Hari",
        bg: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
        dot: "bg-amber-500",
      };
    case "COURTESY_THANKS":
      return {
        label: "Ucapan Terima Kasih",
        short: "Terima Kasih",
        bg: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
        dot: "bg-purple-500",
      };
    case "DATA_INQUIRY":
      return {
        label: "Permintaan Data Statistik",
        short: "Tanya Data",
        bg: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
        dot: "bg-orange-500",
      };
    default:
      return null;
  }
};

export default function WhatsAppChatExplorer({ isStandalone = false }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isFullscreenConsole =
    isStandalone ||
    location.pathname === routes.whatsappConsole ||
    searchParams.get("mode") === "fullscreen";
  const [theme, toggleTheme] = useTheme();

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
  const [chatTypeFilter, setChatTypeFilter] = useState("ALL");

  // Right sidebar drawer (info, media, links, participants, pst)
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState("pst");

  // Reply message state
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const replyInputRef = useRef(null);
  const [showContactMenu, setShowContactMenu] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplyQuery, setQuickReplyQuery] = useState("");
  const contactMenuRef = useRef(null);
  const contactMenuToggleRef = useRef(null);
  const quickRepliesRef = useRef(null);
  const quickRepliesToggleRef = useRef(null);

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
  const [terminationType, setTerminationType] = useState("completed");
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

  const messagesEndRef = useRef(null);
  const messageFeedRef = useRef(null);
  const followMessagesRef = useRef(true);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  useLayoutEffect(() => {
    resizeReplyInput(replyInputRef.current);
  }, [replyText, activeChatId, sourceMode]);

  useEffect(() => {
    const input = replyInputRef.current;
    if (!input) return;
    let width = 0;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width !== width) {
        width = entry.contentRect.width;
        resizeReplyInput(input);
      }
    });
    observer.observe(input);
    return () => observer.disconnect();
  }, [activeChatId, sourceMode]);

  useEffect(() => {
    setShowContactMenu(false);
    setShowQuickReplies(false);
    setQuickReplyQuery("");
  }, [activeChatId, sourceMode]);

  useEffect(() => {
    if (!showContactMenu && !showQuickReplies) return;
    const handleOutsideClick = (event) => {
      if (!contactMenuRef.current?.contains(event.target)) setShowContactMenu(false);
      if (
        !quickRepliesRef.current?.contains(event.target) &&
        !quickRepliesToggleRef.current?.contains(event.target)
      ) setShowQuickReplies(false);
    };
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;
      if (showContactMenu) contactMenuToggleRef.current?.focus();
      else quickRepliesToggleRef.current?.focus();
      setShowContactMenu(false);
      setShowQuickReplies(false);
    };
    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showContactMenu, showQuickReplies]);

  useEffect(() => {
    if (!showQuickReplies) return;
    quickRepliesRef.current?.querySelector("input")?.focus();
    const feed = messageFeedRef.current;
    if (!feed) return;
    const observer = new ResizeObserver(() => {
      if (quickRepliesRef.current) {
        quickRepliesRef.current.style.maxHeight = `${Math.max(0, Math.min(380, feed.clientHeight - 16))}px`;
      }
    });
    observer.observe(feed);
    return () => observer.disconnect();
  }, [showQuickReplies]);

  const viewRef = useRef({ sourceMode, activeChatId, selectedBackupFilename });
  useEffect(() => {
    viewRef.current = { sourceMode, activeChatId, selectedBackupFilename };
  });

  const { fetchLiveChats, fetchLiveChatDetail } = useWhatsAppSync({
    sourceMode,
    activeChatId,
    chats,
    activeChatDetail,
    setChats,
    setStats,
    setActiveChatId,
    setActiveChatDetail,
    setIsLoadingChats,
    setIsLoadingDetail,
    setWaConnectionStatus,
    setLastSyncTime,
    setSyncError,
    setNewIncomingChatIds,
    setRightPanelTab,
    notify: (name, text, active) => {
      playNotificationSound();
      if (!active || document.hidden) {
        showDesktopNotification(
          `Pesan baru dari ${name || "Pengunjung"}`,
          text || "Mengirim pesan baru",
        );
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
    toast.success(`Obrolan dengan ${name} siap.`);
  };

  useEffect(() => {
    const initChatId = searchParams.get("chatId");
    if (initChatId && !activeChatId) {
      setActiveChatId(initChatId);
    }
  }, []);

  useEffect(() => {
    if (sourceMode === "backup") fetchBackupList();
  }, [sourceMode]);

  useEffect(() => {
    if (sourceMode === "backup" && selectedBackupFilename) {
      inspectBackup(selectedBackupFilename);
    }
  }, [sourceMode, selectedBackupFilename]);

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

  const fetchLiveSettings = async () => {
    try {
      const res = await apiFetch(
        "/documents/bps/whatsapp-explorer/sessions-settings",
      );
      if (res.success) {
        setLiveSettings(res.settings);
      }
    } catch {
      /* Optional notification/settings enrichment may be unavailable. */
    }
  };

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      const results = await Promise.all([
        fetchLiveChats(true),
        activeChatId
          ? fetchLiveChatDetail(activeChatId, true)
          : Promise.resolve(true),
      ]);
      if (results.every(Boolean))
        toast.success("Data percakapan berhasil disegarkan.");
      else
        toast.error(
          "Sinkronisasi belum selesai. Akan dicoba kembali otomatis.",
        );
    } finally {
      setIsManualSyncing(false);
    }
  };

  useEffect(() => {
    if (sourceMode !== "live") return;
    requestNotificationPermission();
    fetchLiveSettings();
  }, [sourceMode]);

  const handleTakeover = async (chatId) => {
    try {
      const res = await apiFetch(
        `/documents/bps/whatsapp-explorer/sessions/${encodeURIComponent(chatId)}/takeover`,
        {
          method: "POST",
          body: JSON.stringify({ adminName: "Admin PST" }),
        },
      );
      if (res.success) {
        toast.success("Sesi obrolan berhasil diambil alih oleh admin.");
        setActiveChatDetail((prev) =>
          prev ? { ...prev, session_status: "admin_active" } : prev,
        );
        setChats((prev) =>
          prev.map((c) =>
            c.id === chatId ? { ...c, session_status: "admin_active" } : c,
          ),
        );
      } else {
        toast.error(res.error || "Gagal mengambil alih sesi");
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const handleConfirmDelay = async (e) => {
    e?.preventDefault();
    const targetId = activeChatId;
    if (!targetId) return;
    setIsSubmittingDelay(true);
    try {
      const res = await apiFetch(
        `/documents/bps/whatsapp-explorer/sessions/${encodeURIComponent(targetId)}/delay`,
        {
          method: "POST",
          body: JSON.stringify({
            adminName: "Admin PST",
            topic: delayTopic.trim() || "Penyiapan data statistik",
            note: delayNote.trim() || "",
            sendMessage: delaySendWhatsapp,
          }),
        },
      );
      if (res.success) {
        toast.success(
          `Flag penundaan 3 hari kerja diaktifkan. ${delaySendWhatsapp ? "Pesan WA terkirim." : ""}`,
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

  const handleReopen = async (chatId) => {
    try {
      const res = await apiFetch(
        `/documents/bps/whatsapp-explorer/sessions/${encodeURIComponent(chatId)}/reopen`,
        {
          method: "POST",
        },
      );
      if (res.success) {
        toast.success("Sesi obrolan dibuka kembali.");
        fetchLiveChatDetail(chatId);
        fetchLiveChats();
      } else {
        toast.error(res.error || "Gagal membuka sesi kembali");
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const handleOpenTerminationModal = (chat, initialType = null) => {
    const topic =
      chat?.visitor_data?.topic ||
      chat?.consultation_topic ||
      chat?.delayed_topic ||
      "";
    setTerminationTopic(topic);
    if (initialType) {
      setTerminationType(initialType);
    } else if (terminationType !== "delayed_3days") {
      setTerminationType("completed");
    }
    setTerminationSchedule(
      liveSettings?.nextOperatingSchedule ||
        "hari kerja berikutnya pukul 08.00 WITA",
    );
    setTerminationSendWhatsapp(true);
    setShowTerminationModal(true);
  };

  const getTerminationPreviewText = () => {
    if (terminationType === "delayed_3days") {
      const greeting = getTimeGreeting();
      return `Selamat ${greeting} Kak. Data yang Kakak butuhkan memerlukan proses penyiapan terlebih dahulu oleh tim teknis kami dalam waktu maksimal 3 (hari) kerja. Kami akan menghubungi Kakak kembali melalui nomor ini setelah data tersebut siap diserahkan.
Terima kasih atas pengertian dan kesediaan Kakak untuk menunggu 😊`;
    } else if (terminationType === "end_of_day") {
      const sched =
        terminationSchedule.trim() ||
        liveSettings?.nextOperatingSchedule ||
        "hari kerja berikutnya pukul 08.00 WITA";
      const sigapUrl =
        liveSettings?.links?.sigapUrl || "https://sigap.bps7500.my.id";
      const bpsUrl =
        liveSettings?.links?.bpsWebsiteUrl || "https://gorontalo.bps.go.id";
      return `Selamat sore, Kak.
Mengingat jam operasional layanan hari ini telah berakhir, proses konsultasi akan kami lanjutkan kembali pada ${sched} saat jam layanan dibuka.

Untuk kebutuhan data statistik secara mandiri, Kakak dapat mengakses tautan berikut:
• SIGAP: ${sigapUrl}
• Website BPS Provinsi Gorontalo: ${bpsUrl}

Kami akan menghubungi Kakak kembali pada ${sched} untuk menjawab pertanyaan yang belum terselesaikan.

Terima kasih banyak atas pengertiannya Kak 😊`;
    } else if (terminationType === "midday_1400") {
      const top = terminationTopic.trim() || "konsultasi data";
      const surveyUrl =
        liveSettings?.links?.surveyUrl || "https://s.bps.go.id/skd75";
      return `Terima kasih banyak telah menghubungi nomor layanan PST BPS Provinsi Gorontalo. Sesi konsultasi terkait ${top} pada pukul 14.00 WITA kami akhiri ya Kak.

Agar kami bisa terus memberikan pelayanan yang lebih baik, mohon bantuannya untuk mengisi survei kepuasan singkat di tautan ini: ${surveyUrl}

Semoga informasi yang kami sampaikan bermanfaat. Selamat melanjutkan aktivitas dan sehat selalu! 👏 😊`;
    } else {
      const top = terminationTopic.trim() || "konsultasi data";
      const surveyUrl =
        liveSettings?.links?.surveyUrl || "https://s.bps.go.id/skd75";
      return `Terima kasih banyak telah menghubungi nomor layanan PST BPS Provinsi Gorontalo. Dengan ini, konsultasi terkait ${top} kami akhiri ya Kak. Agar kami bisa terus memberikan pelayanan yang lebih baik, mohon bantuannya untuk mengisi survei kepuasan singkat di tautan ini: ${surveyUrl}

Semoga informasi yang kami sampaikan bermanfaat. Selamat melanjutkan aktivitas dan sehat selalu! 👏 😊`;
    }
  };

  const handleExecuteTermination = async () => {
    if (!activeChatDetail) return;
    setIsSubmittingTermination(true);
    try {
      const res = await apiFetch(
        `/documents/bps/whatsapp-explorer/sessions/${encodeURIComponent(activeChatDetail.id)}/terminate`,
        {
          method: "POST",
          body: JSON.stringify({
            type: terminationType,
            topic: terminationTopic.trim() || "Penyiapan data statistik",
            nextSchedule:
              terminationSchedule.trim() || liveSettings?.nextOperatingSchedule,
            adminName: "Admin PST",
            sendWhatsappMessage: terminationSendWhatsapp,
            note: delayNote.trim() || "",
          }),
        },
      );
      if (res.success) {
        toast.success(
          terminationType === "end_of_day"
            ? "Sesi ditutup (Jam Layanan Berakhir 15.30 WITA)."
            : terminationType === "midday_1400"
              ? "Sesi 14.00 WITA diterminasi & survei SKD dikirim."
              : terminationType === "delayed_3days"
                ? "Flag Terminasi 3 Hari diaktifkan."
                : "Sesi diterminasi & survei SKD dikirim.",
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
      const topic =
        activeChatDetail?.delayed_topic ||
        activeChatDetail?.visitor_data?.topic ||
        activeChatDetail?.consultation_topic ||
        "yang Kakak butuhkan";
      const timeGreeting = liveSettings?.currentGreeting || getTimeGreeting();
      setReplyText(tmpl.getText(topic, timeGreeting));
      replyInputRef.current?.focus();
      return;
    }
    if (tmpl.id === "konfirmasi") {
      const topic =
        activeChatDetail?.visitor_data?.topic ||
        activeChatDetail?.consultation_topic ||
        "[Topik Konsultasi]";
      setReplyText(tmpl.getText(topic));
      return;
    }
    const timeGreeting = liveSettings?.currentGreeting || "pagi/siang/sore";
    setReplyText(tmpl.getText(timeGreeting));
  };

  const handleSaveLiveSettings = async (updates, keepOpen = false) => {
    setIsSavingSettings(true);
    try {
      const res = await apiFetch(
        "/documents/bps/whatsapp-explorer/sessions-settings",
        {
          method: "POST",
          body: JSON.stringify(updates),
        },
      );
      if (res.success) {
        setLiveSettings(res.settings);
        toast.success("Pengaturan berhasil disimpan.");
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
          toast("Belum ada berkas backup di server.");
        }
      }
    } catch (err) {
      toast.error(`Gagal memuat daftar backup: ${err.message}`);
    } finally {
      setIsLoadingChats(false);
    }
  };

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
        throw new Error(
          `Gagal mengunduh berkas backup (HTTP ${response.status})`,
        );
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

      toast.success(`Berkas ${filename} berhasil diunduh.`, { id: toastId });
    } catch (err) {
      console.error("Gagal mengunduh backup ZIP:", err);
      toast.error(`Gagal mengunduh: ${err.message}`, { id: toastId });
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  const inspectBackup = async (filename) => {
    setIsLoadingChats(true);
    try {
      const res = await apiFetch(
        `/documents/bps/whatsapp-explorer/backups/inspect?filename=${encodeURIComponent(filename)}`,
      );
      if (
        viewRef.current.sourceMode !== "backup" ||
        viewRef.current.selectedBackupFilename !== filename
      )
        return;
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
          const chatName =
            c.name ||
            c.chat_name ||
            (chatId && chatId.includes("@") ? chatId.split("@")[0] : "Obrolan");
          const isGrp =
            c.is_group ?? (c.type === "group" || chatId.endsWith("@g.us"));
          const isCh =
            c.is_channel ??
            (c.type === "channel" || chatId.endsWith("@newsletter"));
          const isDir = c.is_direct ?? (!isGrp && !isCh);
          const rawPhone =
            c.raw_phone ||
            (isDir && chatId.includes("@")
              ? chatId.split("@")[0]
              : isDir && /^\d+$/.test(chatId)
                ? chatId
                : null);
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

        const existingIds = new Set(
          mappedChats.map((c) => c.id).filter(Boolean),
        );
        (res.groups || []).forEach((g) => {
          const gId = g.id || "";
          if (gId && !existingIds.has(gId)) {
            const rawG = gId.includes("@") ? gId.split("@")[0] : gId;
            mappedChats.push({
              id: gId,
              name:
                g.subject ||
                g.name ||
                (rawG ? `Grup (${rawG.slice(-6)})` : "Grup WhatsApp"),
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
      if (
        viewRef.current.sourceMode === "backup" &&
        viewRef.current.selectedBackupFilename === filename
      )
        setIsLoadingChats(false);
    }
  };

  const fetchBackupChatDetail = async (filename, chatId) => {
    setIsLoadingDetail(true);
    try {
      const res = await apiFetch(
        `/documents/bps/whatsapp-explorer/backups/chat?filename=${encodeURIComponent(filename)}&chatId=${encodeURIComponent(chatId)}`,
      );
      if (
        viewRef.current.sourceMode !== "backup" ||
        viewRef.current.selectedBackupFilename !== filename ||
        viewRef.current.activeChatId !== chatId
      )
        return;
      if (res.success && res.chat) {
        setActiveChatDetail(res.chat);
      } else {
        toast.error(res.error || "Gagal memuat pesan dari backup");
      }
    } catch (err) {
      toast.error(`Gagal memuat riwayat backup: ${err.message}`);
    } finally {
      if (
        viewRef.current.sourceMode === "backup" &&
        viewRef.current.activeChatId === chatId
      )
        setIsLoadingDetail(false);
    }
  };

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
      participant:
        m.participant || (activeChatDetail?.is_group ? m.participant : null),
      text: snippet,
    });

    setTimeout(() => {
      replyInputRef.current?.focus();
    }, 50);
  };

  const handleSendReply = async (e) => {
    e?.preventDefault();
    if (!replyText.trim() || !activeChatDetail || isSendingReply) return;

    setIsSendingReply(true);
    const selectedChatId = activeChatId;
    const target = activeChatDetail.id;
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
        toast.success(
          `Pesan diteruskan ke WhatsApp ${activeChatDetail.name || target}.`,
        );
        if (
          viewRef.current.sourceMode === "live" &&
          viewRef.current.activeChatId === selectedChatId
        ) {
          setReplyText((draft) => (draft.trim() === msg ? "" : draft));
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
          if (
            !prev ||
            prev.id !== target ||
            viewRef.current.sourceMode !== "live"
          )
            return prev;
          return {
            ...prev,
            messages: mergeMessages(prev.messages, [newMsg]),
            total_messages: (prev.total_messages || 0) + 1,
          };
        });

        setChats((prev) =>
          viewRef.current.sourceMode !== "live"
            ? prev
            : prev.map((c) =>
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

  const handleCopy = (text, label = "Nomor") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} disalin ke papan klip.`);
  };

  const isChatUnreplied = (c) => {
    if (c.session_status === "closed") return false;
    if (c.customer_replied_after_flag) return true;
    if (
      c.session_status === "waiting_admin" ||
      c.has_admin_replied_today === false
    )
      return true;
    if (c.last_message && !c.last_message.fromMe) return true;
    if (newIncomingChatIds.has(c.id)) return true;
    return false;
  };

  const filteredChats = chats.filter((c) => {
    if (chatTypeFilter === "UNREPLIED" && !isChatUnreplied(c)) return false;
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

  const unrepliedChatsCount = chats.filter(isChatUnreplied).length;

  const flaggedChatsCount = chats.filter(
    (c) => c.flag_3days || c.delayed_3days || c.session_status === "delayed",
  ).length;

  const activeChat =
    chats.find((c) => c.id === activeChatId) || activeChatDetail;

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
            className="text-accent font-medium underline underline-offset-2 hover:opacity-80 break-all inline-flex items-center gap-0.5"
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
        <div className="flex flex-col items-center justify-center h-full min-h-[320px] text-faint text-sm">
          <div className="w-12 h-12 rounded-lg bg-subtle border border-line flex items-center justify-center mb-3">
            <WhatsAppIcon className="w-6 h-6 text-muted" />
          </div>
          <p className="font-semibold text-ink text-xs">
            Belum Ada Riwayat Pesan
          </p>
          <p className="text-[11px] text-muted mt-1 max-w-xs text-center">
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
      <div key={`grp-${gIdx}`} className="space-y-1.5">
        {/* Crisp Date Divider */}
        <div className="wa-date-divider flex justify-center my-3 sticky top-2 z-10">
          <span className="text-muted text-xs tabular-nums">
            {grp.date}
          </span>
        </div>

        {/* Message Bubbles */}
        {grp.messages.map((m, mIdx) => {
          const isOut = m.fromMe;
          return (
            <div
              key={m.id || `msg-${mIdx}`}
              className={`flex ${isOut ? "justify-end" : "justify-start"} px-1 md:px-2 group relative items-center gap-1.5`}
            >
              {isOut && sourceMode === "live" && (
                <button
                  type="button"
                  onClick={() => handleInitiateReply(m)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md text-muted hover:text-ink hover:bg-subtle cursor-pointer"
                  title="Balas pesan ini"
                >
                  <ReplyIcon className="w-3.5 h-3.5" />
                </button>
              )}

              <div
                className={`wa-message-bubble max-w-[85%] md:max-w-[70%] lg:max-w-[60%] px-3.5 py-2 text-sm relative ${
                  isOut ? "wa-bubble-out" : "wa-bubble-in"
                }`}
              >
                {/* Sender Name in Group */}
                {!isOut && activeChatDetail.is_group && (
                  <div className="text-[11px] font-semibold mb-1 flex items-center justify-between gap-3">
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
                  <div className="mb-2 p-2 rounded-md bg-black/[0.04] dark:bg-white/[0.06] border-l-2 border-emerald-600 text-xs overflow-hidden">
                    <div className="font-semibold text-[11px] text-emerald-700 dark:text-emerald-400 truncate mb-0.5 flex items-center gap-1">
                      <span>
                        {m.quoted.sender ||
                          (m.quoted.participant
                            ? m.quoted.participant.split("@")[0]
                            : "Pesan Dibalas")}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted line-clamp-2 truncate">
                      {m.quoted.text || "Lampiran pesan"}
                    </p>
                  </div>
                )}

                {/* Media Indicator / Card */}
                {m.type === "image" && (
                  <div className="mb-2 p-2 bg-black/[0.03] dark:bg-white/[0.04] rounded-md border border-line flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <MediaIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-ink text-xs">
                        Foto / Gambar
                      </p>
                      <p className="text-[10.5px] text-muted font-mono">
                        {m.mediaInfo?.mimetype || "image/jpeg"}
                      </p>
                    </div>
                  </div>
                )}

                {m.type === "document" && (
                  <div className="mb-2 p-2 bg-black/[0.03] dark:bg-white/[0.04] rounded-md border border-line flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <DocumentIcon className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-semibold text-ink text-xs truncate">
                        {m.text || m.mediaInfo?.fileName || "Dokumen File"}
                      </p>
                      <p className="text-[10.5px] text-muted font-mono">
                        {m.mediaInfo?.mimetype || "application/pdf"}
                      </p>
                    </div>
                  </div>
                )}

                {m.type === "audio" && (
                  <div className="mb-2 p-2 bg-black/[0.03] dark:bg-white/[0.04] rounded-md border border-line flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <MicIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-ink text-xs">
                        Pesan Suara / Audio
                      </p>
                      {m.mediaInfo?.seconds && (
                        <p className="text-[10.5px] text-muted font-mono tabular-nums">
                          {m.mediaInfo.seconds} detik
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Text Content with Clickable URLs */}
                {m.text && m.type !== "document" ? (
                  <p className="wa-message-text whitespace-pre-wrap leading-relaxed break-words text-[13px] text-ink">
                    {renderTextWithLinks(m.text)}
                  </p>
                ) : !m.text && !m.mediaInfo ? (
                  <p className="text-[11.5px] italic text-muted flex items-center gap-1.5 py-0.5">
                    <LockIcon className="w-3 h-3 text-faint shrink-0" />
                    <span>Pesan terenkripsi end-to-end</span>
                  </p>
                ) : null}

                {/* Timestamp & Status */}
                <div className="wa-message-meta flex items-center justify-end gap-1 mt-1 text-[10px] text-faint font-medium tabular-nums">
                  <span>{formatTime(m.timestamp)}</span>
                  {isOut && (
                    <span className="text-muted" title="Diteruskan ke WhatsApp">
                      ✓
                    </span>
                  )}
                  {sourceMode === "live" && (
                    <button
                      type="button"
                      onClick={() => handleInitiateReply(m)}
                      className="ml-1 opacity-60 hover:opacity-100 hover:text-ink p-0.5 rounded cursor-pointer transition-opacity md:hidden"
                      title="Balas pesan"
                    >
                      <ReplyIcon className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {!isOut && sourceMode === "live" && (
                <button
                  type="button"
                  onClick={() => handleInitiateReply(m)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md text-muted hover:text-ink hover:bg-subtle cursor-pointer"
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

  const explorerContent = (
    <div className="wa-explorer w-full h-full flex overflow-hidden bg-canvas text-ink">
      {/* ======================================================== */}
      {/* COLUMN 1: LEFT SIDEBAR (CHATS LIST)                      */}
      {/* ======================================================== */}
      <div
        className={`${
          activeChatId ? "hidden md:flex" : "flex"
        } wa-chat-list w-full md:w-[340px] lg:w-[370px] xl:w-[390px] shrink-0 flex-col bg-surface border-r border-line h-full z-10`}
      >
        {/* Sidebar Header */}
        <div className={`wa-list-heading shrink-0 ${isFullscreenConsole ? "wa-list-heading--compact" : ""}`}>
          {!isFullscreenConsole && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="wa-brand-mark w-8 h-8 rounded-md flex items-center justify-center shrink-0">
                <WhatsAppIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-semibold text-ink tracking-tight leading-tight truncate">
                    Percakapan
                  </h1>
                  {sourceMode === "live" && waConnectionStatus?.is_connected && (
                    <span
                      className="wa-live-status inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300"
                      title="Sinkronisasi aktif"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Live</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted flex items-center gap-1.5 truncate mt-0.5">
                  <span className="wa-service-label">PST BPS ·</span>
                  {sourceMode === "live" ? (
                    waConnectionStatus.status === "CHECKING" ? (
                      <span>Menghubungkan gateway...</span>
                    ) : waConnectionStatus?.is_connected ? (
                      <span className="font-mono text-muted tabular-nums">
                        {waConnectionStatus.phone_formatted ||
                          waConnectionStatus.phone}
                      </span>
                    ) : (
                      <span className="text-rose-600 dark:text-rose-400 font-medium">
                        Terputus / Belum Login
                      </span>
                    )
                  ) : (
                    <span className="text-accent font-medium">
                      Mode Arsip (ZIP)
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Mode Switcher & Actions */}
          <div className="wa-list-actions">
            {!isFullscreenConsole && (
              <button
                type="button"
                onClick={() => window.open(routes.whatsappConsole, "_blank")}
                className="p-1.5 text-muted hover:text-ink hover:bg-subtle border border-line rounded-md transition-colors cursor-pointer"
                title="Buka Konsol di Tab Baru (Layar Penuh)"
              >
                <ExpandIcon className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="wa-source-switch" role="group" aria-label="Sumber percakapan">
              <button
                type="button"
                onClick={() => setSourceMode("live")}
                aria-pressed={sourceMode === "live"}
                className={`cursor-pointer flex items-center gap-1 ${
                  sourceMode === "live"
                    ? "bg-surface text-ink shadow-2xs"
                    : "text-muted hover:text-ink"
                }`}
                title="Penyimpanan pesan real-time dari WhatsApp Gateway"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${sourceMode === "live" ? "bg-emerald-500" : "bg-muted"}`}
                ></span>
                <span>Live</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceMode("backup")}
                aria-pressed={sourceMode === "backup"}
                className={`cursor-pointer flex items-center gap-1 ${
                  sourceMode === "backup"
                    ? "bg-surface text-ink shadow-2xs"
                    : "text-muted hover:text-ink"
                }`}
                title="Telusuri arsip berkas backup ZIP"
              >
                <span>Arsip ZIP</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="p-1.5 text-muted hover:text-ink hover:bg-subtle rounded-md transition-colors cursor-pointer"
              title="Pengaturan Auto-Chat & Jam Layanan PST"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() =>
                sourceMode === "live" ? handleManualSync() : fetchBackupList()
              }
              disabled={isLoadingChats || isManualSyncing}
              className={`p-1.5 text-muted hover:text-ink hover:bg-subtle rounded-md transition-colors cursor-pointer ${
                isManualSyncing ? "opacity-60" : ""
              }`}
              title="Segarkan daftar & pesan sekarang"
            >
              <RefreshIcon
                className={`w-4 h-4 ${isLoadingChats || isManualSyncing ? "animate-spin text-emerald-600" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* ZIP Selector Bar in Backup Mode */}
        {sourceMode === "backup" && (
          <div className="px-3.5 py-2 bg-subtle border-b border-line flex items-center justify-between gap-2 shrink-0">
            <span className="text-[11px] font-semibold text-muted shrink-0">
              Arsip:
            </span>
            {backupFiles.length > 0 ? (
              <div className="flex items-center gap-1.5 w-full min-w-0">
                <select
                  value={selectedBackupFilename}
                  onChange={(e) => setSelectedBackupFilename(e.target.value)}
                  className="w-full text-xs bg-surface border border-line rounded-md px-2 py-1 font-mono text-ink truncate focus:border-ink focus:outline-hidden"
                >
                  {backupFiles.map((b) => (
                    <option key={b.filename} value={b.filename}>
                      {b.phone_formatted ? `[${b.phone_formatted}] ` : ""}
                      {b.filename} (
                      {b.total_messages ? `${b.total_messages} pesan, ` : ""}
                      {b.size_formatted})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleDownloadBackup(selectedBackupFilename)}
                  disabled={!selectedBackupFilename || isDownloadingBackup}
                  className="px-2.5 py-1 bg-surface hover:bg-hover text-ink border border-line rounded-md text-xs font-medium flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50 transition-colors"
                  title="Unduh berkas ZIP arsip ini"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Unduh</span>
                </button>
              </div>
            ) : (
              <span className="text-[11px] text-muted italic">
                Tidak ada berkas backup
              </span>
            )}
          </div>
        )}

        {sourceMode === "live" &&
          (syncError ||
            (!waConnectionStatus.is_connected &&
              waConnectionStatus.status !== "CHECKING")) && (
            <div className="wa-sync-notice" role="status">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>
                {syncError || "WhatsApp terputus. Menunggu koneksi kembali..."}
                {chats.length > 0 && " Data terakhir tetap ditampilkan."}
              </span>
            </div>
          )}

        {/* Search Bar & Filter Header */}
        <div className="wa-list-tools bg-surface border-b border-line shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, nomor, atau isi pesan..."
                aria-label="Cari percakapan"
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-subtle border border-line rounded-md text-ink placeholder-muted focus:outline-hidden focus:bg-surface focus:border-ink transition-colors"
              />
              <SearchIcon className="w-3.5 h-3.5 text-muted absolute left-2.5 top-2" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Hapus pencarian"
                  className="absolute right-2 top-1.5 text-muted hover:text-ink text-xs font-semibold"
                >
                  ✕
                </button>
              )}
            </div>

            {sourceMode === "live" && (
              <button
                type="button"
                onClick={() => setShowNewChatModal(true)}
                className="wa-new-chat px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                title="Mulai percakapan baru"
              >
                <span>+ Baru</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="wa-filters" role="group" aria-label="Filter percakapan">
            {[
              { id: "ALL", label: "Semua", count: chats.length },
              {
                id: "UNREPLIED",
                label: "Perlu Dibalas",
                count: unrepliedChatsCount,
                highlight: unrepliedChatsCount > 0,
                tone: "rose",
              },
              {
                id: "FLAG_3DAYS",
                label: "Tunda 3 Hari",
                count: flaggedChatsCount,
                highlight: flaggedChatsCount > 0,
                tone: "amber",
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
            ].map((f) => {
              const isSelected =
                chatTypeFilter === f.id ||
                (f.id === "FLAG_3DAYS" && chatTypeFilter === "DELAYED");
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setChatTypeFilter(f.id)}
                  aria-pressed={isSelected}
                  className={`font-medium transition-colors cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? "bg-ink text-surface border-ink font-semibold"
                      : f.highlight
                        ? f.tone === "rose"
                          ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25 font-semibold"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25 font-semibold"
                        : "bg-subtle text-muted border-transparent hover:text-ink"
                  }`}
                >
                  <span>{f.label}</span>
                  <span
                    className={`text-[10px] tabular-nums ${
                      isSelected ? "opacity-80" : "opacity-75"
                    }`}
                  >
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Banner Info Kontak Tertanda Flag 3 Hari Kerja */}
        {flaggedChatsCount > 0 &&
          chatTypeFilter !== "FLAG_3DAYS" &&
          chatTypeFilter !== "DELAYED" && (
            <div className="px-3.5 py-1.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between gap-2 shrink-0 text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0 text-amber-800 dark:text-amber-300">
                <FlagIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  <strong className="font-semibold tabular-nums">
                    {flaggedChatsCount} kontak
                  </strong>{" "}
                  dalam penundaan 3 hari kerja
                </span>
              </div>
              <button
                type="button"
                onClick={() => setChatTypeFilter("FLAG_3DAYS")}
                className="font-semibold text-amber-800 dark:text-amber-300 hover:underline shrink-0 cursor-pointer"
              >
                Filter →
              </button>
            </div>
          )}

        {(chatTypeFilter === "FLAG_3DAYS" || chatTypeFilter === "DELAYED") && (
          <div className="px-3.5 py-1.5 bg-subtle border-b border-line flex items-center justify-between shrink-0 text-[11px]">
            <span className="font-semibold text-ink truncate">
              Filter Aktif: Tunda 3 Hari Kerja ({flaggedChatsCount})
            </span>
            <button
              type="button"
              onClick={() => setChatTypeFilter("ALL")}
              className="text-muted hover:text-ink hover:underline shrink-0 cursor-pointer font-medium"
            >
              Reset
            </button>
          </div>
        )}

        {/* Chats List */}
        <div className="wa-chat-items flex-1 overflow-y-auto bg-surface">
          {isLoadingChats && chats.length === 0 ? (
            <div className="p-10 text-center text-muted text-xs flex flex-col items-center">
              <RefreshIcon className="w-5 h-5 animate-spin text-muted mb-2" />
              <p className="font-medium">Memuat daftar percakapan...</p>
            </div>
          ) : sourceMode === "live" &&
            !waConnectionStatus?.is_connected &&
            chats.length === 0 ? (
            <div className="p-6 text-center space-y-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
                <WhatsAppIcon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-ink text-xs">
                Gateway Tidak Terhubung
              </h3>
              <p className="text-[11.5px] text-muted leading-relaxed">
                Sesi nomor WhatsApp saat ini terputus. Riwayat percakapan
                sebelumnya tersimpan di arsip cadangan (ZIP).
              </p>
              <div className="pt-1 flex flex-col gap-1.5">
                <Link
                  to="/manajemen-dokumen"
                  className="w-full py-1.5 px-3 bg-ink text-surface text-xs font-semibold rounded-md transition-opacity hover:opacity-90 text-center"
                >
                  Tautkan Nomor Baru
                </Link>
                <button
                  type="button"
                  onClick={() => setSourceMode("backup")}
                  className="w-full py-1.5 px-3 bg-subtle hover:bg-hover text-ink text-xs font-medium rounded-md border border-line transition-colors cursor-pointer"
                >
                  Buka Arsip (ZIP)
                </button>
              </div>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-10 text-center text-muted text-xs space-y-1">
              <p className="font-semibold text-ink">Tidak ada percakapan</p>
              <p className="text-[11px] text-muted">
                {searchQuery
                  ? "Gunakan kata kunci pencarian lain"
                  : "Belum ada riwayat pesan terekam"}
              </p>
            </div>
          ) : (
            filteredChats.map((chat) => {
              const isActive = chat.id === activeChatId;
              const isGroup = chat.is_group;
              const isChannel = chat.is_channel;
              const hasNewIncoming =
                newIncomingChatIds.has(chat.id) && !isActive;
              const isDelayed =
                chat.flag_3days ||
                chat.delayed_3days ||
                chat.session_status === "delayed";

              return (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => setActiveChatId(chat.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={`wa-chat-item w-full text-left px-3.5 py-2.5 flex items-start gap-3 transition-colors cursor-pointer border-l-2 ${
                    isActive
                      ? "bg-subtle border-ink"
                      : hasNewIncoming
                        ? "bg-emerald-500/[0.04] border-emerald-600"
                        : isDelayed
                          ? "bg-amber-500/[0.03] border-amber-500 hover:bg-subtle"
                          : "hover:bg-subtle/60 border-transparent"
                  }`}
                >
                  {/* Clean Avatar */}
                  <div className="relative shrink-0 mt-0.5">
                    <div
                      className={`wa-avatar w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs ${
                        isGroup
                          ? "bg-slate-700 text-white"
                          : isChannel
                            ? "bg-indigo-700 text-white"
                            : getAvatarBg(chat.name || chat.id)
                      }`}
                    >
                      {isGroup
                        ? "G"
                        : isChannel
                          ? "S"
                          : (chat.name || "U")[0]?.toUpperCase()}
                    </div>
                    {hasNewIncoming && (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-surface"
                        title="Pesan baru masuk"
                      />
                    )}
                  </div>

                  {/* Chat Item Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3
                        className={`text-[13px] truncate ${
                          isActive || hasNewIncoming
                            ? "font-semibold text-ink"
                            : "font-medium text-ink"
                        }`}
                      >
                        {chat.name}
                      </h3>
                      <span className="text-[10.5px] text-faint font-normal shrink-0 tabular-nums">
                        {formatTime(chat.last_message?.timestamp)}
                      </span>
                    </div>

                    {/* Preview Message */}
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-muted truncate flex-1 flex items-center gap-1">
                        {chat.last_message?.fromMe && (
                          <span className="text-faint shrink-0">✓</span>
                        )}
                        <span className="truncate">
                          {chat.last_message?.text ||
                            (chat.last_message?.type
                              ? `[${chat.last_message.type}]`
                              : "-")}
                        </span>
                      </p>

                      {chat.message_count > 0 && (
                        <span className="wa-message-count text-[10px] font-medium text-muted tabular-nums" title="Jumlah pesan">
                          {chat.message_count}
                        </span>
                      )}
                    </div>

                    {/* Minimal Status Metadata Row */}
                    {chat.is_direct && (
                      <div className="wa-chat-status mt-1.5 flex items-center gap-1.5 flex-wrap">
                        {isDelayed ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>
                              Tunda 3 Hari
                              {chat.delayed_until_formatted
                                ? ` · ${chat.delayed_until_formatted.split(",")[0]}`
                                : ""}
                            </span>
                          </span>
                        ) : chat.session_status === "admin_active" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span>Dilayani Admin</span>
                          </span>
                        ) : chat.session_status === "closed" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.2 rounded bg-subtle text-muted border border-line">
                            <span>Selesai</span>
                          </span>
                        ) : chat.session_status === "waiting_admin" ||
                          chat.has_admin_replied_today === false ||
                          !chat.last_message?.fromMe ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span>Perlu Dibalas</span>
                          </span>
                        ) : null}

                        {chat.customer_replied_after_flag && (
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                            Balasan Baru
                          </span>
                        )}

                        {chat.ai_intent &&
                          chat.ai_intent !== "CONTINUATION" &&
                          (() => {
                            const badge = getIntentBadge(chat.ai_intent);
                            if (!badge) return null;
                            return (
                              <span className="text-[10px] text-muted font-medium">
                                · {badge.short}
                              </span>
                            );
                          })()}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {sourceMode === "live" && lastSyncTime && (
          <p
            className="wa-sync-time text-faint"
            title="Waktu pembaruan terakhir"
          >
            Sinkronisasi:{" "}
            {lastSyncTime.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
        )}

        {/* Sidebar Status Footer */}
        <div className="wa-list-footer px-3.5 border-t border-line text-[11px] text-muted flex items-center justify-between shrink-0">
          <span className="tabular-nums">
            <strong className="font-semibold text-ink">
              {stats?.total_messages || stats?.totalMessages || 0}
            </strong>{" "}
            pesan terekam
          </span>
          <Link
            to="/manajemen-dokumen"
            className="text-ink font-medium hover:underline"
          >
            Konfigurasi Gateway →
          </Link>
        </div>
      </div>

      {/* ======================================================== */}
      {/* COLUMN 2: CENTER CHAT AREA                               */}
      {/* ======================================================== */}
      <div
        className={`${
          activeChatId ? "flex" : "hidden md:flex"
        } wa-conversation flex-1 min-w-0 flex-col h-full bg-canvas relative overflow-hidden`}
      >
        {activeChat ? (
          <>
            {/* Active Chat Header */}
            <div className="wa-conversation-heading bg-surface border-b border-line shrink-0 z-10">
              <div className="wa-contact-heading flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveChatId(null)}
                  className="md:hidden p-1 -ml-1 text-muted hover:text-ink rounded-md hover:bg-subtle cursor-pointer"
                  title="Kembali ke daftar obrolan"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                </button>

                <div
                  className={`wa-avatar w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 ${
                    activeChat.is_group
                      ? "bg-slate-700 text-white"
                      : activeChat.is_channel
                        ? "bg-indigo-700 text-white"
                        : getAvatarBg(activeChat.name || activeChat.id)
                  }`}
                >
                  {activeChat.is_group
                    ? "G"
                    : activeChat.is_channel
                      ? "S"
                      : (activeChat.name || "U")[0]?.toUpperCase()}
                </div>

                <div className="wa-contact-identity min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-ink text-sm truncate">
                      {activeChat.name}
                    </h2>

                    {sourceMode === "backup" ? (
                      <span className="text-[10.5px] font-medium px-2 py-0.5 rounded bg-subtle text-muted border border-line inline-flex items-center gap-1 shrink-0">
                        <ArchiveIcon className="w-3 h-3" />
                        <span>Arsip ZIP</span>
                        {selectedBackupMeta?.phone_formatted && (
                          <span className="font-mono">
                            ({selectedBackupMeta.phone_formatted})
                          </span>
                        )}
                      </span>
                    ) : activeChat.is_direct ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {activeChatDetail?.flag_3days ||
                        activeChatDetail?.delayed_3days ||
                        activeChatDetail?.session_status === "delayed" ? (
                          <span className="text-[10.5px] font-medium px-2 py-0.5 rounded shrink-0 inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/25">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>Flag 3 Hari</span>
                            {activeChatDetail?.delayed_until_formatted && (
                              <span className="opacity-80">
                                · s.d.{" "}
                                {
                                  activeChatDetail.delayed_until_formatted.split(
                                    ",",
                                  )[0]
                                }
                              </span>
                            )}
                          </span>
                        ) : (
                          <span
                            className={`text-[10.5px] font-medium px-2 py-0.5 rounded shrink-0 inline-flex items-center gap-1.5 border ${
                              activeChatDetail?.session_status === "closed"
                                ? "bg-subtle text-muted border-line"
                                : activeChatDetail?.session_status ===
                                    "admin_active"
                                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                                  : "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                activeChatDetail?.session_status === "closed"
                                  ? "bg-slate-400"
                                  : activeChatDetail?.session_status ===
                                      "admin_active"
                                    ? "bg-blue-500"
                                    : "bg-amber-500"
                              }`}
                            />
                            <span>
                              {activeChatDetail?.session_status === "closed" &&
                                (activeChatDetail?.termination_type ===
                                "unanswered_eod"
                                  ? "Ditutup: Belum Terbalas"
                                  : "Sesi Selesai")}
                              {activeChatDetail?.session_status ===
                                "admin_active" && "Ditangani Admin"}
                              {activeChatDetail?.session_status ===
                                "waiting_admin" &&
                                (activeChatDetail?.has_admin_replied_today ===
                                false
                                  ? "Belum Dibalas Hari Ini"
                                  : "Menunggu Admin")}
                            </span>
                          </span>
                        )}

                        {activeChatDetail?.ai_intent &&
                          (() => {
                            const badge = getIntentBadge(
                              activeChatDetail.ai_intent,
                            );
                            if (!badge) return null;
                            return (
                              <span
                                className={`text-[10.5px] font-medium px-2 py-0.5 rounded border shrink-0 inline-flex items-center gap-1.5 ${badge.bg}`}
                                title={`AI Intent: ${badge.label}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}
                                />
                                <span>{badge.label}</span>
                              </span>
                            );
                          })()}
                      </div>
                    ) : (
                      <span className="text-[10.5px] font-medium px-2 py-0.5 rounded bg-subtle text-muted border border-line shrink-0">
                        {activeChat.is_group
                          ? "Grup WhatsApp"
                          : "Saluran Resmi"}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-muted font-mono truncate tabular-nums">
                    {activeChat.phone || activeChat.id}
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="wa-conversation-actions">
                {activeChat.is_direct &&
                  (activeChatDetail?.flag_3days ||
                    activeChatDetail?.delayed_3days ||
                    activeChatDetail?.session_status === "delayed") && (
                    <>
                      <button
                        aria-label="Reach Out"
                        title="Reach Out"
                        type="button"
                        onClick={() => {
                          const topic =
                            activeChatDetail?.delayed_topic ||
                            "yang Kakak butuhkan";
                          const timeGreeting =
                            liveSettings?.currentGreeting || getTimeGreeting();
                          setReplyText(
                            `Selamat ${timeGreeting} Kak. Terkait data mengenai ${topic} yang telah disiapkan oleh tim teknis kami, datanya kini sudah selesai diproses dan siap kami serahkan ya Kak.\n\nBerikut informasinya:\n[Tuliskan keterangan / tautan berkas di sini]\n\nApabila masih ada yang ingin dikonsultasikan lebih lanjut, silakan sampaikan kepada kami ya Kak 😊`,
                          );
                          replyInputRef.current?.focus();
                          toast.success("Draf pesan reach out disiapkan.");
                        }}
                        className="wa-action-primary text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                      >
                        <ReplyIcon className="w-3.5 h-3.5" />
                        <span>Reach Out</span>
                      </button>
                      <button
                        aria-label="Selesai (+SKD)"
                        title="Selesai (+SKD)"
                        type="button"
                        onClick={() =>
                          handleOpenTerminationModal(
                            activeChatDetail,
                            "completed",
                          )
                        }
                        className="wa-action-primary text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                      >
                        <CheckDoubleIcon className="w-3.5 h-3.5" />
                        <span>Selesai (+SKD)</span>
                      </button>
                    </>
                  )}

                {activeChat.is_direct &&
                  activeChatDetail?.session_status !== "closed" &&
                  !activeChatDetail?.flag_3days &&
                  !activeChatDetail?.delayed_3days &&
                  activeChatDetail?.session_status !== "delayed" && (
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenTerminationModal(
                          activeChatDetail,
                          "delayed_3days",
                        )
                      }
                      className="text-amber-800 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 cursor-pointer"
                      title="Tandai Penundaan 3 Hari Kerja"
                    >
                      <FlagIcon className="w-3.5 h-3.5" />
                      <span>Tunda 3 Hari</span>
                    </button>
                  )}

                {activeChat.is_direct &&
                  activeChatDetail?.session_status === "waiting_admin" && (
                    <button
                      aria-label="Ambil Alih"
                      title="Ambil Alih"
                      type="button"
                      onClick={() => handleTakeover(activeChat.id)}
                      className="wa-action-primary text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                    >
                      <UserCheckIcon className="w-3.5 h-3.5" />
                      <span>Ambil Alih</span>
                    </button>
                  )}

                {activeChat.is_direct &&
                  activeChatDetail?.session_status !== "closed" &&
                  !activeChatDetail?.flag_3days &&
                  !activeChatDetail?.delayed_3days &&
                  activeChatDetail?.session_status !== "delayed" && (
                    <button
                      aria-label="Terminasi"
                      title="Terminasi"
                      type="button"
                      onClick={() => handleOpenTerminationModal(activeChat)}
                      className="wa-action-danger text-rose-700 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 cursor-pointer"
                    >
                      <StopIcon className="w-3.5 h-3.5" />
                      <span>Terminasi</span>
                    </button>
                  )}

                {activeChat.is_direct &&
                  activeChatDetail?.session_status === "closed" && (
                    <button
                      aria-label="Buka Kembali"
                      title="Buka Kembali"
                      type="button"
                      onClick={() => handleReopen(activeChat.id)}
                      className="text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 cursor-pointer"
                    >
                      <RefreshIcon className="w-3.5 h-3.5" />
                      <span>Buka Kembali</span>
                    </button>
                  )}

                {activeChat.is_direct &&
                  (activeChatDetail?.flag_3days ||
                    activeChatDetail?.delayed_3days ||
                    activeChatDetail?.session_status === "delayed") && (
                    <button
                      aria-label="Lepas Flag"
                      title="Lepas Flag"
                      type="button"
                      onClick={() => handleReopen(activeChat.id)}
                      className="text-muted hover:text-ink bg-surface hover:bg-subtle border border-line cursor-pointer"
                    >
                      <FlagIcon className="w-3.5 h-3.5" />
                      <span>Lepas Flag</span>
                    </button>
                  )}

                <div className="wa-contact-menu" ref={contactMenuRef}>
                  <button
                    ref={contactMenuToggleRef}
                    type="button"
                    className="wa-menu-toggle"
                    aria-label="Menu percakapan"
                    title="Menu percakapan"
                    aria-expanded={showContactMenu}
                    aria-controls="wa-contact-menu"
                    onClick={() => {
                      setShowContactMenu((open) => !open);
                      setShowQuickReplies(false);
                    }}
                  >
                    <MoreIcon />
                  </button>
                  {showContactMenu && (
                    <div
                      id="wa-contact-menu"
                      className="wa-contact-dropdown"
                      role="group"
                      aria-label="Tindakan percakapan"
                      onClick={(event) => {
                        if (event.target.closest("button, a")) {
                          setShowContactMenu(false);
                          contactMenuToggleRef.current?.focus();
                        }
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            activeChat.raw_phone || activeChat.phone || activeChat.id,
                            "Nomor HP",
                          )
                        }
                        className="wa-menu-item"
                        title="Salin nomor kontak"
                      >
                        <CopyIcon className="w-3.5 h-3.5 text-muted" />
                        <span>Salin</span>
                      </button>

                      {activeChat.is_direct && (
                        <a
                          href={`https://wa.me/${(activeChat.raw_phone || "").replace(/[^\d]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="wa-menu-item"
                          title="Buka di WhatsApp Web"
                        >
                          <ExternalLinkIcon className="w-3.5 h-3.5 text-muted" />
                          <span>wa.me</span>
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowRightPanel(!showRightPanel)}
                        aria-expanded={showRightPanel}
                        aria-controls="wa-contact-details"
                        className={`wa-menu-item ${showRightPanel ? "is-active" : ""}`}
                        title="Panel Data PST & Info"
                      >
                        <InfoCircleIcon className="w-3.5 h-3.5" />
                        <span>Detail PST</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Clean Solid 3-Day Delay Banner */}
            {activeChat.is_direct &&
              (activeChatDetail?.flag_3days ||
                activeChatDetail?.delayed_3days ||
                activeChatDetail?.session_status === "delayed") && (
                <div className="px-5 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between gap-3 shrink-0 flex-wrap text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FlagIcon className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-amber-950 dark:text-amber-200">
                          Status Penundaan Maksimal 3 Hari Kerja
                        </span>
                        {activeChatDetail.delayed_until_formatted && (
                          <span className="text-[10.5px] font-medium px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/30">
                            Target: {activeChatDetail.delayed_until_formatted}
                          </span>
                        )}
                        {activeChatDetail.reached_out_at && (
                          <span className="text-[10.5px] font-medium text-emerald-700 dark:text-emerald-300">
                            · Telah dihubungi{" "}
                            {formatTime(activeChatDetail.reached_out_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-muted text-[11px] truncate">
                        Topik:{" "}
                        <strong className="font-medium text-ink">
                          {activeChatDetail.delayed_topic ||
                            "Penyiapan data statistik"}
                        </strong>{" "}
                        — Pesan otomatis dinonaktifkan sementara.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {/* Mode Backup Notice Bar */}
            {sourceMode === "backup" && (
              <div className="px-5 py-2 bg-subtle border-b border-line flex items-center justify-between text-xs text-muted shrink-0">
                <div className="flex items-center gap-2 truncate">
                  <ArchiveIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-medium text-ink">
                    Arsip Nomor:{" "}
                    <span className="font-mono font-semibold">
                      {selectedBackupMeta?.phone_formatted || "Sebelumnya"}
                    </span>
                  </span>
                  <span className="text-muted text-[11px] hidden sm:inline font-mono">
                    ({selectedBackupFilename})
                  </span>
                </div>
                <span className="text-[10.5px] font-medium px-2 py-0.5 rounded bg-surface border border-line text-muted">
                  Baca Saja
                </span>
              </div>
            )}

            {/* Messages Feed */}
            <div
              ref={messageFeedRef}
              onScroll={(event) => {
                const feed = event.currentTarget;
                followMessagesRef.current =
                  feed.scrollHeight - feed.scrollTop - feed.clientHeight < 100;
                if (followMessagesRef.current) setHasUnreadMessages(false);
              }}
              className="wa-message-feed"
            >
              {isLoadingDetail ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[320px] text-muted text-xs">
                  <RefreshIcon className="w-5 h-5 animate-spin mb-2" />
                  <p className="font-medium">Memuat riwayat percakapan...</p>
                </div>
              ) : (
                <>
                  {renderMessageGroups()}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Bottom Composer */}
            <div className="wa-composer">
              {hasUnreadMessages && (
                <button
                  type="button"
                  className="wa-new-messages"
                  onClick={() => {
                    followMessagesRef.current = true;
                    messageFeedRef.current?.scrollTo({
                      top: messageFeedRef.current.scrollHeight,
                      behavior: "smooth",
                    });
                    setHasUnreadMessages(false);
                  }}
                >
                  Pesan baru ↓
                </button>
              )}
              {sourceMode === "live" && showQuickReplies && (
                  <section
                    id="wa-quick-replies"
                    ref={quickRepliesRef}
                    className="wa-quick-replies"
                    aria-label="Balasan cepat"
                  >
                    <div className="wa-quick-replies-heading">
                      <h3>Balasan cepat</h3>
                      <button
                        type="button"
                        aria-label="Tutup balasan cepat"
                        onClick={() => {
                          setShowQuickReplies(false);
                          quickRepliesToggleRef.current?.focus();
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                          <path d="m6 6 12 12M18 6 6 18" />
                        </svg>
                      </button>
                    </div>
                    <div className="wa-template-search">
                      <SearchIcon />
                      <input
                        type="search"
                        aria-label="Cari balasan cepat"
                        placeholder="Cari templat pesan..."
                        value={quickReplyQuery}
                        onChange={(event) => setQuickReplyQuery(event.target.value)}
                      />
                    </div>
                    <div className="wa-template-list">
                      {OFFICIAL_TEMPLATES.filter((tmpl) =>
                        `${tmpl.name} ${tmpl.description}`.toLocaleLowerCase("id-ID")
                          .includes(quickReplyQuery.trim().toLocaleLowerCase("id-ID")),
                      ).map((tmpl) => (
                        <button
                          key={tmpl.id}
                          type="button"
                          className="wa-template-option"
                          onClick={() => {
                            setShowQuickReplies(false);
                            handleApplyTemplate(tmpl);
                            if (tmpl.category !== "TERMINASI") replyInputRef.current?.focus();
                          }}
                          title={tmpl.description}
                        >
                          <span>{tmpl.name}</span>
                          <small>{tmpl.description}</small>
                        </button>
                      ))}
                      <p className="wa-template-empty">Tidak ada templat yang cocok.</p>
                    </div>
                  </section>
              )}
              {sourceMode === "live" ? (
                <form onSubmit={handleSendReply} className="wa-reply-form">
                  {/* Quoted Reply Preview */}
                  {replyingToMessage && (
                    <div className="bg-subtle rounded-md border border-line p-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0 border-l-2 border-emerald-600 pl-2">
                        <ReplyIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-ink truncate">
                            Membalas {replyingToMessage.sender}
                          </p>
                          <p className="text-[11px] text-muted truncate max-w-xl">
                            {replyingToMessage.text}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyingToMessage(null)}
                        className="p-1 text-muted hover:text-ink rounded cursor-pointer"
                        title="Batalkan kutipan"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Textarea & Send Button */}
                  <div className="wa-compose-row flex items-end gap-2">
                    <button
                      ref={quickRepliesToggleRef}
                      type="button"
                      className="wa-quick-toggle"
                      aria-label="Balasan cepat"
                      title="Balasan cepat"
                      aria-expanded={showQuickReplies}
                      aria-controls="wa-quick-replies"
                      onClick={() => {
                        setShowQuickReplies((open) => !open);
                        setQuickReplyQuery("");
                        setShowContactMenu(false);
                      }}
                    >
                      <QuickReplyIcon />
                    </button>
                    <div className="wa-input-shell flex-1 min-w-0 rounded-lg border border-line transition-colors">
                      <textarea
                        ref={replyInputRef}
                        rows={1}
                        value={replyText}
                        aria-label="Pesan balasan"
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            !e.shiftKey &&
                            !e.nativeEvent.isComposing
                          ) {
                            e.preventDefault();
                            if (!e.repeat && waConnectionStatus.is_connected) handleSendReply();
                          }
                        }}
                        placeholder={replyingToMessage ? "Tulis balasan..." : "Ketik pesan..."}
                        className="w-full px-3.5 py-2 text-xs md:text-[13px] bg-transparent border-none resize-none focus:outline-hidden text-ink placeholder-muted"
                        title="Enter untuk kirim; Shift + Enter untuk baris baru"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={
                        !replyText.trim() ||
                        isSendingReply ||
                        !activeChatDetail ||
                        !waConnectionStatus.is_connected
                      }
                      className="wa-send h-10 px-4 disabled:opacity-40 text-white rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                      title="Kirim pesan (Enter)"
                      aria-label="Kirim pesan"
                    >
                      {isSendingReply ? (
                        <RefreshIcon className="w-4 h-4 animate-spin" />
                      ) : (
                        <SendIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-2.5 bg-subtle rounded-lg border border-line flex items-center justify-between gap-4 text-xs">
                  <div>
                    <p className="font-semibold text-ink">
                      Mode Arsip (Baca Saja)
                    </p>
                    <p className="text-muted text-[11px]">
                      Beralih ke mode Live untuk mengirim pesan balasan ke
                      kontak ini.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSourceMode("live")}
                    className="px-3 py-1.5 bg-ink text-surface font-semibold rounded-md hover:opacity-90 transition-opacity shrink-0 cursor-pointer"
                  >
                    Buka Mode Live
                  </button>
                </div>
              )}
            </div>
          </>
        ) : sourceMode === "live" && !waConnectionStatus?.is_connected ? (
          <div className="wa-empty-state flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 rounded-lg bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center justify-center mb-3">
              <WhatsAppIcon className="w-6 h-6" />
            </div>
            <h2 className="text-base font-semibold text-ink mb-1">
              Sesi WhatsApp Gateway Terputus
            </h2>
            <p className="text-xs text-muted max-w-md leading-relaxed mb-5">
              Nomor bot sedang tidak tertaut. Riwayat obrolan sebelumnya telah
              diamankan ke dalam berkas cadangan (ZIP).
            </p>
            <div className="flex items-center gap-2.5">
              <Link
                to="/manajemen-dokumen"
                className="px-4 py-2 bg-ink text-surface text-xs font-semibold rounded-md hover:opacity-90 transition-opacity"
              >
                Tautkan Nomor WhatsApp
              </Link>
              <button
                type="button"
                onClick={() => setSourceMode("backup")}
                className="px-4 py-2 bg-surface hover:bg-subtle text-ink text-xs font-medium rounded-md border border-line transition-colors cursor-pointer"
              >
                Buka Arsip Cadangan (ZIP)
              </button>
            </div>
          </div>
        ) : (
          <div className="wa-empty-state flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 rounded-lg bg-subtle border border-line flex items-center justify-center mb-3 text-muted">
              <WhatsAppIcon className="w-6 h-6" />
            </div>
            <h2 className="text-base font-semibold text-ink mb-1">
              Konsol Layanan Pesan PST BPS
            </h2>
            <p className="text-xs text-muted max-w-sm leading-relaxed">
              Pilih percakapan di panel kiri untuk meninjau riwayat konsultasi,
              mengelola status antrean, atau mengirim balasan.
            </p>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* COLUMN 3: RIGHT PANEL (PST DATA, MEDIA, LINKS)           */}
      {/* ======================================================== */}
      {showRightPanel && activeChatDetail && (
        <div id="wa-contact-details" className="wa-info-panel shrink-0 z-20" role="region" aria-label="Detail percakapan">
          <div className="wa-info-heading px-4 bg-surface border-b border-line flex items-center justify-between shrink-0">
            <h3 className="font-semibold text-ink text-sm">
              Detail percakapan
            </h3>
            <button
              type="button"
              onClick={() => setShowRightPanel(false)}
              className="p-1 text-muted hover:text-ink rounded-md hover:bg-subtle transition-colors cursor-pointer"
              title="Tutup panel"
            >
              ✕
            </button>
          </div>

          {/* Contact Summary */}
          <div className="wa-contact-summary p-4 border-b border-line bg-surface shrink-0">
            <div className="flex items-center gap-3">
              <div
                className={`wa-avatar w-11 h-11 rounded-full font-semibold text-sm flex items-center justify-center shrink-0 ${
                  activeChatDetail.is_group
                    ? "bg-slate-700 text-white"
                    : activeChatDetail.is_channel
                      ? "bg-indigo-700 text-white"
                      : getAvatarBg(
                          activeChatDetail.name || activeChatDetail.id,
                        )
                }`}
              >
                {activeChatDetail.is_group
                  ? "G"
                  : activeChatDetail.is_channel
                    ? "S"
                    : (activeChatDetail.name || "U")[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-ink text-sm truncate">
                  {activeChatDetail.name}
                </h4>
                <p className="text-xs text-muted font-mono truncate tabular-nums">
                  {activeChatDetail.phone || activeChatDetail.id}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-line text-center">
              <div>
                <span className="block text-xs font-semibold text-ink tabular-nums">
                  {activeChatDetail.total_messages ||
                    activeChatDetail.messages?.length ||
                    0}
                </span>
                <span className="text-[10px] text-muted">Pesan</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-ink tabular-nums">
                  {activeChatDetail.total_media ||
                    activeChatDetail.media?.length ||
                    0}
                </span>
                <span className="text-[10px] text-muted">Media</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-ink tabular-nums">
                  {activeChatDetail.total_links ||
                    activeChatDetail.links?.length ||
                    0}
                </span>
                <span className="text-[10px] text-muted">Tautan</span>
              </div>
            </div>
          </div>

          {/* Sub-Tabs */}
          <div className="wa-info-tabs flex items-center border-b border-line text-[11.5px] font-medium shrink-0">
            {activeChatDetail.is_direct && (
              <button
                type="button"
                onClick={() => setRightPanelTab("pst")}
                className={`flex-1 py-2 text-center transition-colors cursor-pointer border-b-2 ${
                  rightPanelTab === "pst"
                    ? "border-ink text-ink bg-surface font-semibold"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                Data PST
              </button>
            )}
            <button
              type="button"
              onClick={() => setRightPanelTab("media")}
              className={`flex-1 py-2 text-center transition-colors cursor-pointer border-b-2 ${
                rightPanelTab === "media"
                  ? "border-ink text-ink bg-surface font-semibold"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              Media ({activeChatDetail.media?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setRightPanelTab("links")}
              className={`flex-1 py-2 text-center transition-colors cursor-pointer border-b-2 ${
                rightPanelTab === "links"
                  ? "border-ink text-ink bg-surface font-semibold"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              Tautan ({activeChatDetail.links?.length || 0})
            </button>
            {activeChatDetail.is_group && (
              <button
                type="button"
                onClick={() => setRightPanelTab("participants")}
                className={`flex-1 py-2 text-center transition-colors cursor-pointer border-b-2 ${
                  rightPanelTab === "participants"
                    ? "border-ink text-ink bg-surface font-semibold"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                Anggota
              </button>
            )}
          </div>

          {/* Tab Contents */}
          <div className="wa-info-content flex-1 overflow-y-auto p-3.5 space-y-3">
            {rightPanelTab === "pst" && activeChatDetail.is_direct && (
              <div className="space-y-3">
                <div className="p-3 bg-surface rounded-lg border border-line space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-semibold text-ink">
                      Identitas Pengunjung
                    </h5>
                    <button
                      type="button"
                      onClick={() => {
                        const v = activeChatDetail.visitor_data;
                        const summary = `Nama: ${v?.nama || "-"}\nPekerjaan: ${v?.pekerjaan || "-"}\nInstansi: ${v?.instansi || "-"}`;
                        handleCopy(summary, "Format Buku Tamu");
                      }}
                      className="text-[11px] text-accent hover:underline font-medium cursor-pointer"
                    >
                      Salin
                    </button>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-line">
                      <span className="text-muted">Nama</span>
                      <span className="font-medium text-ink text-right">
                        {activeChatDetail.visitor_data?.nama || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-line">
                      <span className="text-muted">Pekerjaan</span>
                      <span className="font-medium text-ink text-right">
                        {activeChatDetail.visitor_data?.pekerjaan || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted">Instansi</span>
                      <span className="font-medium text-ink text-right">
                        {activeChatDetail.visitor_data?.instansi || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Session Control Card */}
                <div className="p-3 bg-surface rounded-lg border border-line space-y-2.5">
                  <h5 className="text-xs font-semibold text-ink">
                    Status & Kendali Sesi
                  </h5>
                  <div className="space-y-1.5 text-xs text-muted">
                    <div className="flex justify-between items-center">
                      <span>Status Aktif</span>
                      <span className="font-semibold text-ink">
                        {activeChatDetail.session_status === "closed" &&
                          "Selesai"}
                        {activeChatDetail.session_status === "admin_active" &&
                          "Ditangani Admin"}
                        {(activeChatDetail.flag_3days ||
                          activeChatDetail.delayed_3days ||
                          activeChatDetail.session_status === "delayed") &&
                          "Tunda 3 Hari"}
                        {activeChatDetail.session_status === "waiting_admin" &&
                          !activeChatDetail.delayed_3days &&
                          !activeChatDetail.flag_3days &&
                          "Menunggu Admin"}
                      </span>
                    </div>

                    {(activeChatDetail.flag_3days ||
                      activeChatDetail.delayed_3days ||
                      activeChatDetail.session_status === "delayed") && (
                      <div className="p-2.5 bg-amber-500/10 rounded-md border border-amber-500/20 text-[11px] space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-muted">Batas Waktu</span>
                          <span className="font-semibold text-amber-800 dark:text-amber-300">
                            {activeChatDetail.delayed_until_formatted ||
                              "3 Hari Kerja"}
                          </span>
                        </div>
                        {activeChatDetail.delayed_topic && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted">Topik Data</span>
                            <span className="font-medium text-ink truncate max-w-[150px]">
                              {activeChatDetail.delayed_topic}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 space-y-1.5 border-t border-line">
                    {activeChatDetail.session_status !== "closed" ? (
                      <>
                        {activeChatDetail.flag_3days ||
                        activeChatDetail.delayed_3days ||
                        activeChatDetail.session_status === "delayed" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const topic =
                                  activeChatDetail?.delayed_topic ||
                                  "yang Kakak butuhkan";
                                const timeGreeting =
                                  liveSettings?.currentGreeting ||
                                  getTimeGreeting();
                                setReplyText(
                                  `Selamat ${timeGreeting} Kak. Terkait data mengenai ${topic} yang telah disiapkan oleh tim teknis kami, datanya kini sudah selesai diproses dan siap kami serahkan ya Kak.\n\nBerikut informasinya:\n[Tuliskan keterangan / tautan berkas di sini]\n\nApabila masih ada yang ingin dikonsultasikan lebih lanjut, silakan sampaikan kepada kami ya Kak 😊`,
                                );
                                replyInputRef.current?.focus();
                                toast.success("Draf pesan reach out disalin.");
                              }}
                              className="w-full py-1.5 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors cursor-pointer"
                            >
                              Siapkan Pesan Reach Out
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenTerminationModal(
                                  activeChatDetail,
                                  "completed",
                                )
                              }
                              className="w-full py-1.5 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors cursor-pointer"
                            >
                              Data Siap & Selesaikan (SKD)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReopen(activeChatDetail.id)}
                              className="w-full py-1.5 px-3 text-xs font-medium text-muted hover:text-ink bg-subtle hover:bg-hover border border-line rounded-md transition-colors cursor-pointer"
                            >
                              Lepas Flag 3 Hari
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenTerminationModal(
                                activeChatDetail,
                                "delayed_3days",
                              )
                            }
                            className="w-full py-1.5 px-3 text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 rounded-md transition-colors cursor-pointer"
                          >
                            Tandai Tunda 3 Hari
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            handleOpenTerminationModal(activeChatDetail)
                          }
                          className="w-full py-1.5 px-3 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors cursor-pointer"
                        >
                          Terminasi Sesi Ini
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleReopen(activeChatDetail.id)}
                        className="w-full py-1.5 px-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 rounded-md transition-colors cursor-pointer"
                      >
                        Buka Sesi Kembali
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
                  <p className="text-muted text-xs text-center py-8">
                    Belum ada berkas media.
                  </p>
                ) : (
                  activeChatDetail.media.map((med, mIdx) => (
                    <div
                      key={med.id || mIdx}
                      className="p-2.5 rounded-lg border border-line bg-surface flex items-start gap-2.5"
                    >
                      <div className="w-7 h-7 rounded-md bg-subtle text-muted flex items-center justify-center shrink-0">
                        {med.type === "image" ? (
                          <MediaIcon className="w-4 h-4" />
                        ) : med.type === "document" ? (
                          <DocumentIcon className="w-4 h-4" />
                        ) : (
                          <MicIcon className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-ink truncate">
                          {med.caption ||
                            med.mediaInfo?.fileName ||
                            `Berkas ${med.type}`}
                        </p>
                        <div className="flex items-center justify-between text-[10.5px] text-muted mt-0.5 tabular-nums">
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
                  <p className="text-muted text-xs text-center py-8">
                    Belum ada tautan dibagikan.
                  </p>
                ) : (
                  activeChatDetail.links.map((lnk, lIdx) => (
                    <div
                      key={lIdx}
                      className="p-2.5 rounded-lg border border-line bg-surface"
                    >
                      <a
                        href={lnk.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-accent hover:underline break-all inline-flex items-center gap-1"
                      >
                        <span>{lnk.url}</span>
                        <ExternalLinkIcon className="w-3 h-3 shrink-0" />
                      </a>
                      <div className="flex items-center justify-between text-[10.5px] text-muted mt-1 tabular-nums">
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
                  <p className="text-muted text-xs text-center py-8">
                    Tidak ada data anggota.
                  </p>
                ) : (
                  activeChatDetail.participants.map((p, pIdx) => (
                    <div
                      key={p.jid || pIdx}
                      className="p-2.5 rounded-lg border border-line bg-surface flex items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink truncate">
                          {p.name || p.phone}
                        </p>
                        <p className="text-[11px] text-muted font-mono truncate tabular-nums">
                          {p.phone} · {p.message_count || 0} pesan
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(p.raw_phone || p.phone, "Nomor Peserta")
                        }
                        className="p-1.5 text-muted hover:text-ink rounded-md hover:bg-subtle transition-colors cursor-pointer"
                        title="Salin nomor"
                      >
                        <CopyIcon className="w-3.5 h-3.5" />
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
        <div className="wa-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-surface rounded-xl shadow-xl max-w-md w-full p-5 border border-line">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  Mulai Percakapan Baru
                </h3>
                <p className="text-[11px] text-muted">
                  Buka sesi obrolan langsung ke nomor WhatsApp tujuan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="text-muted hover:text-ink text-xs p-1 rounded-md hover:bg-subtle cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStartNewChat} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Nomor WhatsApp Tujuan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newChatPhone}
                  onChange={(e) => setNewChatPhone(e.target.value)}
                  placeholder="08123456789 atau 628123456789"
                  className="w-full px-3 py-2 text-xs bg-subtle border border-line rounded-md focus:bg-surface focus:border-ink focus:outline-hidden font-mono"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Nama Kontak (Opsional)
                </label>
                <input
                  type="text"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  placeholder="Nama pengunjung atau instansi"
                  className="w-full px-3 py-2 text-xs bg-subtle border border-line rounded-md focus:bg-surface focus:border-ink focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-muted hover:text-ink hover:bg-subtle rounded-md transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-surface bg-ink hover:opacity-90 rounded-md transition-opacity cursor-pointer"
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
        <div className="wa-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-surface rounded-xl shadow-xl max-w-2xl w-full p-5 border border-line overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4 shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  Terminasi Sesi Layanan PST BPS Gorontalo
                </h3>
                <p className="text-[11px] text-muted">
                  Pilih kategori penutupan sesi sesuai SOP pelayanan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTerminationModal(false)}
                className="text-muted hover:text-ink text-xs p-1 rounded-md hover:bg-subtle cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="wa-termination-options grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  {
                    id: "completed",
                    title: "1. Layanan Selesai",
                    desc: "Konsultasi selesai disertai tautan survei SKD.",
                  },
                  {
                    id: "midday_1400",
                    title: "2. Sesi Siang (14.00)",
                    desc: "Penutupan sesi pukul 14.00 WITA beserta tautan SKD.",
                  },
                  {
                    id: "end_of_day",
                    title: "3. Jam Tutup (15.30)",
                    desc: "Penutupan jam operasional sore beserta info jadwal esok.",
                  },
                  {
                    id: "delayed_3days",
                    title: "4. Tunda 3 Hari",
                    desc: "Penyiapan data teknis maks. 3 hari kerja (Flag Reach Out).",
                  },
                ].map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => setTerminationType(opt.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      terminationType === opt.id
                        ? "border-ink bg-subtle"
                        : "border-line bg-surface hover:bg-subtle/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        checked={terminationType === opt.id}
                        onChange={() => setTerminationType(opt.id)}
                      />
                      <span className="text-xs font-semibold text-ink">
                        {opt.title}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-muted leading-relaxed">
                      {opt.desc}
                    </p>
                  </div>
                ))}
              </div>

              {terminationType === "delayed_3days" ? (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                    <strong>Kebijakan Flag 3 Hari:</strong> Pesan otomatis
                    pembuka dan penutup harian dinonaktifkan pada kontak ini
                    agar petugas dapat menghubungi kembali saat data selesai
                    diolah.
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Topik / Jenis Data yang Disiapkan{" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={terminationTopic}
                      onChange={(e) => setTerminationTopic(e.target.value)}
                      placeholder="Contoh: Data Inflasi Kota Gorontalo 2024"
                      className="w-full px-3 py-2 text-xs bg-subtle border border-line rounded-md focus:bg-surface focus:border-ink focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Catatan Tim Internal (Opsional)
                    </label>
                    <input
                      type="text"
                      value={delayNote}
                      onChange={(e) => setDelayNote(e.target.value)}
                      placeholder="Contoh: Sedang diolah fungsi Nerwilis"
                      className="w-full px-3 py-2 text-xs bg-subtle border border-line rounded-md focus:bg-surface focus:border-ink focus:outline-hidden"
                    />
                  </div>
                </div>
              ) : terminationType === "completed" ||
                terminationType === "midday_1400" ? (
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Topik Konsultasi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={terminationTopic}
                    onChange={(e) => setTerminationTopic(e.target.value)}
                    placeholder="Contoh: Data Inflasi Kota Gorontalo"
                    className="w-full px-3 py-2 text-xs bg-subtle border border-line rounded-md focus:bg-surface focus:border-ink focus:outline-hidden"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Jadwal Layanan Dibuka Kembali{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={terminationSchedule}
                    onChange={(e) => setTerminationSchedule(e.target.value)}
                    placeholder="Contoh: Rabu, 28 Oktober 2026 pukul 08.00 WITA"
                    className="w-full px-3 py-2 text-xs bg-subtle border border-line rounded-md focus:bg-surface focus:border-ink focus:outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Pratinjau Pesan WhatsApp
                </label>
                <div className="p-3 bg-subtle rounded-lg border border-line text-xs font-mono whitespace-pre-wrap leading-relaxed text-ink select-all">
                  {getTerminationPreviewText()}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={terminationSendWhatsapp}
                  onChange={(e) => setTerminationSendWhatsapp(e.target.checked)}
                  className="rounded border-line w-3.5 h-3.5"
                />
                <span>
                  Kirim pesan ini secara otomatis ke nomor WhatsApp pengunjung
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-line mt-4 shrink-0">
              <button
                type="button"
                onClick={() => setShowTerminationModal(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-muted hover:text-ink hover:bg-subtle rounded-md transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmittingTermination}
                onClick={handleExecuteTermination}
                className={`px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                  terminationType === "delayed_3days"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {isSubmittingTermination ? (
                  <>
                    <RefreshIcon className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : terminationType === "delayed_3days" ? (
                  <span>Aktifkan Flag 3 Hari</span>
                ) : (
                  <span>Konfirmasi Terminasi</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3-Day Delay Modal */}
      {showDelayModal && (
        <div className="wa-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-surface rounded-xl shadow-xl max-w-lg w-full p-5 border border-line overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4 shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  Tandai Penundaan Pengolahan Data (3 Hari Kerja)
                </h3>
                <p className="text-[11px] text-muted">
                  SOP Pelayanan Statistik Terpadu BPS Provinsi Gorontalo
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDelayModal(false)}
                className="text-muted hover:text-ink text-xs p-1 rounded-md hover:bg-subtle cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleConfirmDelay}
              className="flex-1 overflow-y-auto space-y-3.5 pr-1"
            >
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Topik / Jenis Data <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={delayTopic}
                  onChange={(e) => setDelayTopic(e.target.value)}
                  placeholder="Contoh: Data PDRB Triwulanan"
                  className="w-full px-3 py-2 text-xs bg-subtle border border-line rounded-md focus:bg-surface focus:border-ink focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Catatan Internal (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={delayNote}
                  onChange={(e) => setDelayNote(e.target.value)}
                  placeholder="Catatan progres pengolahan..."
                  className="w-full px-3 py-2 text-xs bg-subtle border border-line rounded-md focus:bg-surface focus:border-ink focus:outline-hidden resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Pratinjau Pesan Penundaan
                </label>
                <div className="p-3 bg-subtle rounded-lg border border-line text-xs font-mono whitespace-pre-wrap leading-relaxed text-ink select-all">
                  {`Selamat ${getTimeGreeting()} Kak. Data yang Kakak butuhkan memerlukan proses penyiapan terlebih dahulu oleh tim teknis kami dalam waktu maksimal 3 (hari) kerja. Kami akan menghubungi Kakak kembali melalui nomor ini setelah data tersebut siap diserahkan.
Terima kasih atas pengertian dan kesediaan Kakak untuk menunggu 😊`}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={delaySendWhatsapp}
                  onChange={(e) => setDelaySendWhatsapp(e.target.checked)}
                  className="rounded border-line w-3.5 h-3.5"
                />
                <span>
                  Kirim pesan pemberitahuan ini ke WhatsApp pengunjung
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line mt-4">
                <button
                  type="button"
                  onClick={() => setShowDelayModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-muted hover:text-ink hover:bg-subtle rounded-md transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDelay}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-md transition-colors cursor-pointer"
                >
                  {isSubmittingDelay ? "Menyimpan..." : "Aktifkan Flag 3 Hari"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Operating Hours & Auto-Chat Settings Modal */}
      {showSettingsModal && (
        <div className="wa-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-surface rounded-xl shadow-xl max-w-md w-full p-5 border border-line overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-4 shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  Pengaturan Auto-Chat & Jam Operasional
                </h3>
                <p className="text-[11px] text-muted">
                  PST BPS Provinsi Gorontalo (WITA / UTC+8)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-muted hover:text-ink text-xs p-1 rounded-md hover:bg-subtle cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs overflow-y-auto">
              <div className="p-3 bg-subtle rounded-lg border border-line flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-ink">
                    Auto-Greeting (Sapaan Otomatis)
                  </h4>
                  <p className="text-[11px] text-muted mt-0.5">
                    Kirim form buku tamu otomatis saat pesan baru masuk
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleSaveLiveSettings(
                      {
                        autoGreetingEnabled: !liveSettings?.autoGreetingEnabled,
                      },
                      true,
                    )
                  }
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                    liveSettings?.autoGreetingEnabled
                      ? "bg-emerald-600 justify-end"
                      : "bg-gray-300 dark:bg-zinc-700 justify-start"
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-2xs" />
                </button>
              </div>

              <div className="p-3 bg-subtle rounded-lg border border-line space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-ink">
                      Terminasi Terjadwal (14.00 & 15.30 WITA)
                    </h4>
                    <p className="text-[11px] text-muted mt-0.5">
                      Akhiri sesi otomatis pada pergantian sesi siang dan jam
                      tutup
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleSaveLiveSettings(
                        {
                          scheduledTerminationEnabled:
                            !liveSettings?.scheduledTerminationEnabled,
                          autoTerminateOnTimeout: false,
                          inactivityTimeoutMinutes: 0,
                        },
                        true,
                      )
                    }
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                      liveSettings?.scheduledTerminationEnabled !== false
                        ? "bg-emerald-600 justify-end"
                        : "bg-gray-300 dark:bg-zinc-700 justify-start"
                    }`}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-2xs" />
                  </button>
                </div>

                <div className="pt-2 border-t border-line flex items-center justify-between gap-3">
                  <div>
                    <span className="font-medium text-ink block">
                      Kirim Pesan Penutup & Tautan SKD Otomatis
                    </span>
                    <span className="text-[10.5px] text-muted block">
                      Sertakan tautan s.bps.go.id/skd75 saat terminasi terjadwal
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleSaveLiveSettings(
                        {
                          sendAutoTerminationMessage:
                            !liveSettings?.sendAutoTerminationMessage,
                        },
                        true,
                      )
                    }
                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                      liveSettings?.sendAutoTerminationMessage !== false
                        ? "bg-emerald-600 justify-end"
                        : "bg-gray-300 dark:bg-zinc-700 justify-start"
                    }`}
                  >
                    <div className="bg-white w-3.5 h-3.5 rounded-full shadow-2xs" />
                  </button>
                </div>
              </div>

              <div className="p-3 bg-surface rounded-lg border border-line space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Status Layanan Saat Ini</span>
                  <span
                    className={`inline-flex items-center gap-1.5 font-semibold px-2 py-0.5 rounded text-[11px] ${
                      liveSettings?.isOperatingHoursNow
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${liveSettings?.isOperatingHoursNow ? "bg-emerald-500" : "bg-amber-500"}`}
                    />
                    <span>
                      {liveSettings?.isOperatingHoursNow
                        ? "Jam Layanan Aktif"
                        : "Di Luar Jam Layanan"}
                    </span>
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted">Waktu Lokal (WITA)</span>
                  <span className="font-mono text-ink tabular-nums">
                    {liveSettings?.currentGorontaloTime
                      ? new Date(
                          liveSettings.currentGorontaloTime,
                        ).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Makassar",
                        }) + " WITA"
                      : "-"}
                  </span>
                </div>
              </div>

              <div className="border border-line rounded-lg overflow-hidden divide-y divide-line text-[11px]">
                <div className="px-3 py-1.5 bg-subtle flex justify-between font-semibold text-muted">
                  <span>Hari Operasional</span>
                  <span>Jam Layanan</span>
                </div>
                <div className="px-3 py-1.5 flex justify-between bg-surface">
                  <span>Senin – Kamis</span>
                  <span className="font-mono font-medium tabular-nums">
                    08:00 – 15:30 WITA
                  </span>
                </div>
                <div className="px-3 py-1.5 flex justify-between bg-surface">
                  <span>Jumat</span>
                  <span className="font-mono font-medium tabular-nums">
                    08:00 – 15:00 WITA
                  </span>
                </div>
                <div className="px-3 py-1.5 flex justify-between bg-subtle/40 text-muted">
                  <span>Sabtu – Minggu</span>
                  <span>Tutup</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-line mt-4 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-1.5 text-xs font-semibold text-surface bg-ink hover:opacity-90 rounded-md transition-opacity cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isFullscreenConsole) {
    return (
      <div
        className={`wa-standalone-wrapper ${theme === "dark" ? "dark" : ""}`}
      >
        <header className="wa-standalone-header px-4 md:px-5 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="wa-brand-mark w-7 h-7 rounded-md flex items-center justify-center shrink-0">
              <WhatsAppIcon className="w-4 h-4" />
            </div>
            <div className="wa-console-identity flex items-center gap-2 min-w-0">
              <h1 className="text-xs md:text-sm font-semibold text-ink tracking-tight truncate">
                Konsol Operator PST
              </h1>
              <span className="text-faint">·</span>
              <span className="text-[11px] font-medium text-muted truncate hidden sm:inline">
                BPS Provinsi Gorontalo
              </span>
              <span className="text-faint hidden sm:inline">·</span>
              {sourceMode === "live" ? (
                waConnectionStatus.is_connected ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>
                      {waConnectionStatus.phone_formatted ||
                        waConnectionStatus.phone}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-rose-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>Terputus</span>
                  </span>
                )
              ) : (
                <span className="text-[11px] font-medium text-accent">
                  Mode Arsip ZIP
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="wa-console-stats hidden lg:flex items-center gap-3 text-xs text-muted tabular-nums">
              <span>
                Total{" "}
                <strong className="font-semibold text-ink">
                  {chats.length}
                </strong>
              </span>
              <span className="text-line">|</span>
              <span>
                Antrean{" "}
                <strong className="font-semibold text-rose-600 dark:text-rose-400">
                  {unrepliedChatsCount}
                </strong>
              </span>
              <span className="text-line">|</span>
              <span>
                Tunda 3 Hari{" "}
                <strong className="font-semibold text-amber-600 dark:text-amber-400">
                  {flaggedChatsCount}
                </strong>
              </span>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 text-muted hover:text-ink bg-surface hover:bg-subtle border border-line rounded-md transition-colors cursor-pointer"
              title={theme === "dark" ? "Tema Terang" : "Tema Gelap"}
            >
              {theme === "dark" ? (
                <SunIcon className="w-3.5 h-3.5" />
              ) : (
                <MoonIcon className="w-3.5 h-3.5" />
              )}
            </button>

            <Link
              to={routes.dashboard}
              className="px-2.5 py-1 text-xs font-medium text-ink bg-surface hover:bg-subtle border border-line rounded-md transition-colors flex items-center gap-1"
            >
              <span>Dashboard</span>
              <span className="text-muted">↗</span>
            </Link>
          </div>
        </header>

        <div className="flex-1 min-h-0 w-full overflow-hidden">
          {explorerContent}
        </div>
      </div>
    );
  }

  return explorerContent;
}
