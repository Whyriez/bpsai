import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import apiFetch from "../services/api";

// --- SVG Icons ---
const WhatsAppIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.031 2c-5.508 0-9.985 4.477-9.985 9.985 0 1.761.459 3.477 1.332 4.996L2 22l5.166-1.355c1.465.799 3.119 1.22 4.865 1.22h.005c5.507 0 9.984-4.477 9.984-9.985 0-2.668-1.039-5.176-2.925-7.062A9.92 9.92 0 0012.031 2zm0 18.312h-.004c-1.492 0-2.953-.401-4.227-1.159l-.303-.18-3.141.824.838-3.061-.198-.315a8.283 8.283 0 01-1.272-4.436c0-4.577 3.724-8.301 8.305-8.301 2.217 0 4.301.864 5.869 2.433a8.243 8.243 0 012.434 5.868c0 4.578-3.724 8.302-8.304 8.302zm4.551-6.216c-.249-.125-1.477-.729-1.706-.812-.228-.083-.395-.125-.561.125-.167.249-.645.812-.79 1-.146.187-.291.208-.541.083-.249-.125-1.054-.389-2.008-1.239-.742-.662-1.243-1.48-1.389-1.729-.145-.25-.016-.385.109-.509.112-.112.249-.291.374-.437.125-.145.166-.25.249-.416.083-.166.042-.312-.021-.437-.062-.125-.561-1.353-.769-1.853-.203-.487-.409-.42-.561-.428-.145-.008-.312-.01-.478-.01s-.437.062-.666.312c-.228.25-.873.854-.873 2.081 0 1.228.894 2.414 1.019 2.581.125.167 1.76 2.688 4.264 3.769.596.257 1.061.411 1.424.527.598.19 1.143.163 1.573.099.48-.072 1.477-.604 1.685-1.187.208-.583.208-1.083.146-1.187-.063-.105-.229-.167-.478-.292z"/>
  </svg>
);

const SearchIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const SendIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
  </svg>
);

const CopyIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const ExternalLinkIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const MediaIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const DocumentIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const UsersIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const CheckDoubleIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} viewBox="0 0 16 11" fill="currentColor">
    <path d="M11.5 0.5L6.5 6L4.5 4L3 5.5L6.5 9.5L13 2L11.5 0.5ZM15 2L8.5 9.5L8.2 9.2L7 10.5L8.5 12L16.5 3.5L15 2Z"/>
  </svg>
);

// Consistent avatar colors based on string
const getAvatarBg = (str = "") => {
  const colors = [
    "bg-emerald-600 text-white",
    "bg-blue-600 text-white",
    "bg-indigo-600 text-white",
    "bg-teal-600 text-white",
    "bg-cyan-700 text-white",
    "bg-sky-600 text-white",
    "bg-violet-600 text-white",
    "bg-amber-600 text-white",
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

  // Right sidebar drawer (info, media, links, participants) - default FALSE for maximum space!
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState("media"); // media | links | participants

  // Reply message state
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  // New Chat modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState("");
  const [newChatName, setNewChatName] = useState("");

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

    // Check if chat already exists in list
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
          text: "Obrolan baru dibuat",
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
    toast.success(`Obrolan dengan ${name} siap! Silakan ketik pesan.`);
  };

  const messagesEndRef = useRef(null);

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

  // 1. Fetch live chats from gateway
  const fetchLiveChats = async () => {
    setIsLoadingChats(true);
    try {
      const res = await apiFetch("/documents/bps/whatsapp-explorer/chats");
      if (res.success) {
        setChats(res.chats || []);
        setStats(res.stats || null);
        if (!activeChatId && res.chats && res.chats.length > 0) {
          setActiveChatId(res.chats[0].id);
        }
      } else {
        toast.error(res.error || "Gagal memuat percakapan dari WhatsApp Gateway");
      }
    } catch (err) {
      toast.error(`Koneksi gateway gagal: ${err.message}`);
    } finally {
      setIsLoadingChats(false);
    }
  };

  // 2. Fetch live chat details
  const fetchLiveChatDetail = async (chatId) => {
    setIsLoadingDetail(true);
    try {
      const res = await apiFetch(`/documents/bps/whatsapp-explorer/chats/${encodeURIComponent(chatId)}`);
      if (res.success && res.chat) {
        setActiveChatDetail(res.chat);
      } else {
        toast.error(res.error || "Gagal mengambil pesan obrolan");
      }
    } catch (err) {
      toast.error(`Gagal memuat detail obrolan: ${err.message}`);
    } finally {
      setIsLoadingDetail(false);
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
      const res = await apiFetch(`/documents/bps/whatsapp-explorer/backups/inspect?filename=${encodeURIComponent(filename)}`);
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
                text: g.desc || `Grup WhatsApp dengan ${g.participant_count || g.participants?.length || 0} anggota`,
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
        if (mappedChats.length > 0) {
          setActiveChatId(mappedChats[0].id);
        } else {
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
        `/documents/bps/whatsapp-explorer/backups/chat?filename=${encodeURIComponent(filename)}&chatId=${encodeURIComponent(chatId)}`
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
        toast.success(`Balasan terkirim ke ${activeChatDetail.name || target}!`);
        setReplyText("");

        const newMsg = {
          id: res.message_id || `out-${Date.now()}`,
          fromMe: true,
          text: msg,
          type: "text",
          timestamp: Math.floor(Date.now() / 1000),
          pushName: "Saya (SIGAP Admin)",
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
              : c
          )
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
    toast.success(`${label} disalin!`);
  };

  // Filtered chats list
  const filteredChats = chats.filter((c) => {
    if (chatTypeFilter === "DIRECT" && !c.is_direct) return false;
    if (chatTypeFilter === "GROUP" && !c.is_group) return false;
    if (chatTypeFilter === "CHANNEL" && !c.is_channel) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (c.name || "").toLowerCase().includes(q);
      const matchPhone = (c.phone || c.raw_phone || c.id || "").toLowerCase().includes(q);
      const matchLastMsg = (c.last_message?.text || "").toLowerCase().includes(q);
      return matchName || matchPhone || matchLastMsg;
    }
    return true;
  });

  const activeChat = chats.find((c) => c.id === activeChatId) || activeChatDetail;

  // Format timestamp helper
  const formatTime = (ts) => {
    if (!ts) return "";
    const date = new Date(ts * 1000);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
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

  const renderMessageGroups = () => {
    if (!activeChatDetail?.messages || activeChatDetail.messages.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-400 text-sm">
          <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center mb-3">
            <WhatsAppIcon className="w-8 h-8 text-gray-400" />
          </div>
          <p className="font-semibold text-gray-600">Belum ada riwayat pesan terekam</p>
          <p className="text-xs text-gray-400 mt-1">Pesan yang masuk atau keluar akan otomatis tampil di sini.</p>
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
        {/* Date Divider */}
        <div className="flex justify-center my-4 sticky top-2 z-10">
          <span className="bg-white/90 backdrop-blur-md shadow-xs border border-gray-200/60 text-gray-600 text-[11px] font-semibold px-3 py-1 rounded-md uppercase tracking-wider">
            {grp.date}
          </span>
        </div>

        {/* Message Bubbles */}
        {grp.messages.map((m, mIdx) => {
          const isOut = m.fromMe;
          return (
            <div
              key={m.id || `msg-${mIdx}`}
              className={`flex ${isOut ? "justify-end" : "justify-start"} px-2 md:px-6`}
            >
              <div
                className={`max-w-[85%] md:max-w-[70%] lg:max-w-[60%] rounded-lg px-3.5 py-2 text-sm shadow-xs relative transition-all ${
                  isOut
                    ? "bg-[#d9fdd3] text-gray-900 rounded-tr-none border border-emerald-200/50"
                    : "bg-white text-gray-900 rounded-tl-none border border-gray-200/60"
                }`}
              >
                {/* Sender Name in Group */}
                {!isOut && activeChatDetail.is_group && (
                  <div className="text-[11px] font-bold text-emerald-700 mb-1 flex items-center justify-between gap-3">
                    <span>{m.pushName || "Peserta"}</span>
                    {m.participant && (
                      <span className="text-[10px] text-gray-400 font-mono font-normal">
                        {m.participant.split("@")[0]}
                      </span>
                    )}
                  </div>
                )}

                {/* Media Indicator / Card */}
                {m.type === "image" && (
                  <div className="mb-2 p-2.5 bg-black/5 rounded-lg border border-black/10 flex items-center gap-2.5">
                    <MediaIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-800 text-xs">📷 Foto / Gambar</p>
                      <p className="text-[11px] text-gray-500">{m.mediaInfo?.mimetype || "image/jpeg"}</p>
                    </div>
                  </div>
                )}

                {m.type === "document" && (
                  <div className="mb-2 p-2.5 bg-blue-50/90 rounded-lg border border-blue-200 flex items-center gap-2.5">
                    <DocumentIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div className="overflow-hidden">
                      <p className="font-semibold text-blue-900 text-xs truncate">
                        📄 {m.text || m.mediaInfo?.fileName || "Dokumen File"}
                      </p>
                      <p className="text-[11px] text-blue-600">{m.mediaInfo?.mimetype || "application/pdf"}</p>
                    </div>
                  </div>
                )}

                {m.type === "audio" && (
                  <div className="mb-2 p-2 bg-purple-50/80 rounded-lg border border-purple-200 flex items-center gap-2">
                    <span className="text-base">🎙️</span>
                    <div>
                      <p className="font-semibold text-purple-900 text-xs">Pesan Suara / Audio</p>
                      {m.mediaInfo?.seconds && (
                        <p className="text-[11px] text-purple-600">{m.mediaInfo.seconds} detik</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Text Content with Clickable URLs */}
                {m.text && m.type !== "document" ? (
                  <p className="whitespace-pre-wrap leading-relaxed break-words text-[13px] text-gray-800">
                    {renderTextWithLinks(m.text)}
                  </p>
                ) : (!m.text && !m.mediaInfo ? (
                  <p className="text-[12px] italic text-gray-500 flex items-center gap-1.5 py-0.5">
                    <span className="text-gray-400">🔒</span>
                    <span>Pesan terenkripsi end-to-end</span>
                  </p>
                ) : null)}

                {/* Timestamp & Status */}
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-gray-400">
                  <span>{formatTime(m.timestamp)}</span>
                  {isOut && <CheckDoubleIcon className="text-blue-500 w-3 h-3" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    ));
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
            className="text-blue-600 font-medium underline hover:text-blue-800 break-all inline-flex items-center gap-0.5"
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

  return (
    // Outer Container: full bleed (-m-6 to cancel MainLayout padding) and precise full height!
    <div className="-m-6 h-[calc(100vh-3.6rem)] flex overflow-hidden bg-[#efeae2] select-none">
      {/* ======================================================== */}
      {/* COLUMN 1: LEFT SIDEBAR (CHATS LIST) — Fixed 380px Width */}
      {/* ======================================================== */}
      <div className="w-[360px] md:w-[400px] flex-shrink-0 flex flex-col bg-white border-r border-gray-300 h-full z-10 shadow-xs">
        {/* Sidebar Header (WhatsApp Web Style) */}
        <div className="h-15 px-4 bg-[#f0f2f5] border-b border-gray-200 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#00a884] flex items-center justify-center text-white shadow-xs">
              <WhatsAppIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-800 leading-tight">WhatsApp Explorer</h1>
              <p className="text-[10px] text-gray-500 font-medium">SIGAP BPS Gorontalo</p>
            </div>
          </div>

          {/* Mode Switcher & Refresh */}
          <div className="flex items-center gap-1.5">
            <div className="bg-gray-200/80 p-0.5 rounded-lg flex text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setSourceMode("live")}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                  sourceMode === "live"
                    ? "bg-white text-emerald-700 shadow-xs font-bold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                title="Penyimpanan pesan real-time dari WhatsApp Gateway"
              >
                🟢 Live
              </button>
              <button
                type="button"
                onClick={() => setSourceMode("backup")}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                  sourceMode === "backup"
                    ? "bg-white text-blue-700 shadow-xs font-bold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                title="Telusuri arsip berkas backup ZIP"
              >
                📦 ZIP
              </button>
            </div>

            <button
              type="button"
              onClick={() => (sourceMode === "live" ? fetchLiveChats() : fetchBackupList())}
              disabled={isLoadingChats}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
              title="Segarkan daftar percakapan"
            >
              <RefreshIcon className={`w-4 h-4 ${isLoadingChats ? "animate-spin text-emerald-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* If in Backup Mode, show ZIP selector bar */}
        {sourceMode === "backup" && (
          <div className="px-3 py-2 bg-blue-50/80 border-b border-blue-200 flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-blue-900 flex-shrink-0">Berkas ZIP:</span>
            {backupFiles.length > 0 ? (
              <select
                value={selectedBackupFilename}
                onChange={(e) => setSelectedBackupFilename(e.target.value)}
                className="w-full text-xs bg-white border border-blue-300 rounded px-2 py-1 font-mono text-gray-700 truncate"
              >
                {backupFiles.map((b) => (
                  <option key={b.filename} value={b.filename}>
                    {b.filename} ({b.size_formatted})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-[11px] text-gray-500 italic">Tidak ada file backup</span>
            )}
          </div>
        )}

        {/* Search Bar & Filter Tabs */}
        <div className="p-2.5 bg-white border-b border-gray-100 space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, nomor HP, obrolan..."
                className="w-full pl-9 pr-7 py-2 text-xs bg-[#f0f2f5] border-none rounded-lg text-gray-800 placeholder-gray-500 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-[#00a884] transition-all"
              />
              <SearchIcon className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {sourceMode === "live" && (
              <button
                type="button"
                onClick={() => setShowNewChatModal(true)}
                className="px-2.5 py-2 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer flex-shrink-0"
                title="Mulai obrolan baru dengan nomor HP tertentu"
              >
                <span>➕</span>
                <span className="hidden sm:inline">Chat</span>
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
            {[
              { id: "ALL", label: "Semua", count: chats.length },
              { id: "DIRECT", label: "Pribadi", count: chats.filter((c) => c.is_direct).length },
              { id: "GROUP", label: "Grup", count: chats.filter((c) => c.is_group).length },
              { id: "CHANNEL", label: "Saluran", count: chats.filter((c) => c.is_channel).length },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setChatTypeFilter(f.id)}
                className={`px-3 py-1 rounded-full font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  chatTypeFilter === f.id
                    ? "bg-[#00a884] text-white shadow-xs font-semibold"
                    : "bg-[#f0f2f5] text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`text-[9px] px-1 rounded-full ${
                    chatTypeFilter === f.id ? "bg-white/20 text-white font-bold" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Chats List (Scrollable) */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 bg-white">
          {isLoadingChats ? (
            <div className="p-8 text-center text-gray-400 text-xs flex flex-col items-center">
              <RefreshIcon className="w-6 h-6 animate-spin text-[#00a884] mb-2" />
              <p>Memuat daftar percakapan...</p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs space-y-1">
              <p className="font-semibold text-gray-600">Tidak ada percakapan ditemukan</p>
              <p className="text-[11px]">
                {searchQuery ? "Ubah kata kunci pencarian" : "Belum ada riwayat pesan terekam"}
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
                  className={`w-full text-left px-4 py-3 flex items-center gap-3.5 transition-colors cursor-pointer border-l-4 ${
                    isActive
                      ? "bg-[#f0f2f5] border-[#00a884]"
                      : "hover:bg-[#f5f6f6] border-transparent"
                  }`}
                >
                  {/* WhatsApp Style Avatar */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shadow-xs ${
                        isGroup
                          ? "bg-blue-100 text-blue-700"
                          : isChannel
                          ? "bg-purple-100 text-purple-700"
                          : getAvatarBg(chat.name || chat.id)
                      }`}
                    >
                      {isGroup ? "👥" : isChannel ? "📢" : (chat.name || "U")[0]?.toUpperCase()}
                    </div>
                  </div>

                  {/* Chat Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{chat.name}</h3>
                      <span className="text-[11px] text-gray-400 font-normal flex-shrink-0">
                        {formatTime(chat.last_message?.timestamp)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-gray-500 truncate flex-1 flex items-center gap-1">
                        {chat.last_message?.fromMe && (
                          <CheckDoubleIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        )}
                        <span className="truncate">
                          {chat.last_message?.text || (chat.last_message?.type ? `[${chat.last_message.type}]` : "-")}
                        </span>
                      </p>

                      {chat.message_count > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
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
        <div className="h-10 px-4 bg-[#f0f2f5] border-t border-gray-200 text-xs text-gray-600 flex items-center justify-between flex-shrink-0">
          <span className="font-medium">
            💬 {stats?.total_messages || stats?.totalMessages || 0} total pesan
          </span>
          <Link
            to="/manajemen-dokumen"
            className="text-[11px] text-emerald-700 font-semibold hover:underline"
          >
            ⚙️ Pengaturan
          </Link>
        </div>
      </div>

      {/* ======================================================== */}
      {/* COLUMN 2: CENTER CHAT AREA — Expanded & Spacious!       */}
      {/* ======================================================== */}
      <div className="flex-1 min-w-0 flex flex-col h-full bg-[#efeae2] relative overflow-hidden">
        {activeChat ? (
          <>
            {/* Active Chat Header */}
            <div className="h-15 px-4 md:px-6 bg-[#f0f2f5] border-b border-gray-300 flex items-center justify-between gap-4 flex-shrink-0 z-10 shadow-xs">
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0 ${
                    activeChat.is_group
                      ? "bg-blue-100 text-blue-700"
                      : activeChat.is_channel
                      ? "bg-purple-100 text-purple-700"
                      : getAvatarBg(activeChat.name || activeChat.id)
                  }`}
                >
                  {activeChat.is_group ? "👥" : activeChat.is_channel ? "📢" : (activeChat.name || "U")[0]?.toUpperCase()}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-gray-900 text-base truncate leading-snug">
                      {activeChat.name}
                    </h2>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        activeChat.is_group
                          ? "bg-blue-100 text-blue-800"
                          : activeChat.is_channel
                          ? "bg-purple-100 text-purple-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {activeChat.is_group ? "Grup WhatsApp" : activeChat.is_channel ? "Saluran" : "Kontak Pribadi"}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 font-mono truncate">
                    {activeChat.phone || activeChat.id}
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(activeChat.raw_phone || activeChat.phone || activeChat.id, "Nomor HP")}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Salin nomor kontak"
                >
                  <CopyIcon className="w-4 h-4 text-gray-500" />
                  <span className="hidden sm:inline">Salin Nomor</span>
                </button>

                {activeChat.is_direct && (
                  <a
                    href={`https://wa.me/${(activeChat.raw_phone || "").replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1.5"
                    title="Buka WhatsApp Web resmi"
                  >
                    <ExternalLinkIcon className="w-4 h-4 text-emerald-600" />
                    <span className="hidden sm:inline">wa.me</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setShowRightPanel(!showRightPanel)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                    showRightPanel
                      ? "bg-[#00a884] text-white border-[#00a884] shadow-xs"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                  }`}
                  title="Tampilkan panel media, tautan, dan anggota"
                >
                  <MediaIcon className="w-4 h-4" />
                  <span>Media & Info</span>
                </button>
              </div>
            </div>

            {/* Messages Feed (Spacious, wallpaper styled) */}
            <div
              className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3"
              style={{
                backgroundImage:
                  "radial-gradient(#0000000a 1px, transparent 1px), radial-gradient(#0000000a 1px, #efeae2 1px)",
                backgroundSize: "20px 20px",
                backgroundPosition: "0 0, 10px 10px",
              }}
            >
              {isLoadingDetail ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-400 text-xs">
                  <RefreshIcon className="w-7 h-7 animate-spin text-[#00a884] mb-2" />
                  <p className="text-sm font-medium text-gray-600">Memuat riwayat percakapan...</p>
                </div>
              ) : (
                <>
                  {renderMessageGroups()}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Bottom Chat Input Bar */}
            <div className="p-3 md:px-6 bg-[#f0f2f5] border-t border-gray-300 flex-shrink-0">
              {sourceMode === "live" ? (
                <form onSubmit={handleSendReply} className="space-y-2">
                  {/* Canned Templates */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-gray-600 no-scrollbar">
                    <span className="text-[11px] font-bold text-gray-400 flex-shrink-0">Templat Cepat:</span>
                    {[
                      "Halo, ada yang bisa kami bantu terkait data statistik BPS?",
                      "Terima kasih atas pertanyaannya. Kami sedang memeriksa rilis data terkait.",
                      "Informasi publikasi resmi BPS dapat diakses via https://gorontalo.bps.go.id",
                    ].map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setReplyText(tmpl)}
                        className="px-3 py-1 rounded-full bg-white hover:bg-emerald-50 hover:text-emerald-800 text-gray-700 border border-gray-300 whitespace-nowrap cursor-pointer transition-colors shadow-2xs"
                      >
                        {tmpl.slice(0, 36)}...
                      </button>
                    ))}
                  </div>

                  {/* Input & Circular Send Button */}
                  <div className="flex items-end gap-3">
                    <div className="flex-1 bg-white rounded-xl border border-gray-300 shadow-2xs focus-within:ring-2 focus-within:ring-[#00a884] focus-within:border-transparent transition-all">
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
                        className="w-full px-4 py-2.5 text-sm bg-transparent border-none resize-none focus:outline-hidden text-gray-900 placeholder-gray-500"
                        style={{ minHeight: "44px", maxHeight: "120px" }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!replyText.trim() || isSendingReply}
                      className="w-11 h-11 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0"
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
                <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-xs flex items-center justify-between gap-4 text-xs text-blue-900">
                  <div>
                    <p className="font-bold text-sm">Mode Pratinjau Backup (Read-Only)</p>
                    <p className="text-gray-600 mt-0.5">
                      Anda sedang membaca rekaman arsip berkas backup. Untuk membalas pesan ke nomor kontak ini, silakan alihkan ke mode <b>Live Gateway</b>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSourceMode("live")}
                    className="px-4 py-2 bg-[#00a884] text-white font-bold rounded-lg shadow-sm hover:bg-[#008f6f] transition-all flex-shrink-0 cursor-pointer"
                  >
                    Buka Mode Live
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
            <div className="w-20 h-20 rounded-full bg-white shadow-md flex items-center justify-center mb-4">
              <WhatsAppIcon className="w-12 h-12 text-[#00a884]" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-1.5">WhatsApp Web Explorer SIGAP</h2>
            <p className="text-sm text-gray-500 max-w-md">
              Pilih salah satu percakapan di kolom kiri untuk membaca riwayat chat, melihat koleksi foto/dokumen, tautan, serta nomor-nomor peserta yang pernah mengirim pesan.
            </p>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* COLUMN 3: RIGHT PANEL (SLIDE-OVER / EXPANDABLE DRAWER)    */}
      {/* ======================================================== */}
      {showRightPanel && activeChatDetail && (
        <div className="w-[360px] md:w-[380px] flex-shrink-0 flex flex-col bg-white border-l border-gray-300 h-full z-20 shadow-xl transition-all">
          {/* Header */}
          <div className="h-15 px-4 bg-[#f0f2f5] border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <h3 className="font-bold text-gray-900 text-sm">Info & Koleksi Obrolan</h3>
            <button
              type="button"
              onClick={() => setShowRightPanel(false)}
              className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
              title="Tutup panel"
            >
              ✕
            </button>
          </div>

          {/* Contact Card Summary */}
          <div className="p-6 text-center border-b border-gray-100 bg-white">
            <div
              className={`w-18 h-18 rounded-full font-bold text-2xl flex items-center justify-center mx-auto mb-3 shadow-md ${
                activeChatDetail.is_group
                  ? "bg-blue-100 text-blue-700"
                  : activeChatDetail.is_channel
                  ? "bg-purple-100 text-purple-700"
                  : getAvatarBg(activeChatDetail.name || activeChatDetail.id)
              }`}
            >
              {activeChatDetail.is_group ? "👥" : activeChatDetail.is_channel ? "📢" : (activeChatDetail.name || "U")[0]?.toUpperCase()}
            </div>
            <h4 className="font-bold text-gray-900 text-base">{activeChatDetail.name}</h4>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{activeChatDetail.phone || activeChatDetail.id}</p>

            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-600">
              <span className="bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                💬 {activeChatDetail.total_messages || activeChatDetail.messages?.length || 0} pesan
              </span>
              <span className="bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                🖼️ {activeChatDetail.total_media || activeChatDetail.media?.length || 0} media
              </span>
              <span className="bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                🔗 {activeChatDetail.total_links || activeChatDetail.links?.length || 0} link
              </span>
            </div>
          </div>

          {/* Sub-Tabs: Media, Links, Participants */}
          <div className="flex items-center border-b border-gray-200 text-xs font-semibold bg-[#f0f2f5]">
            <button
              type="button"
              onClick={() => setRightPanelTab("media")}
              className={`flex-1 py-2.5 text-center transition-all cursor-pointer border-b-2 ${
                rightPanelTab === "media"
                  ? "border-[#00a884] text-[#00a884] bg-white font-bold"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              Media ({activeChatDetail.media?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setRightPanelTab("links")}
              className={`flex-1 py-2.5 text-center transition-all cursor-pointer border-b-2 ${
                rightPanelTab === "links"
                  ? "border-[#00a884] text-[#00a884] bg-white font-bold"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              Tautan ({activeChatDetail.links?.length || 0})
            </button>
            {activeChatDetail.is_group && (
              <button
                type="button"
                onClick={() => setRightPanelTab("participants")}
                className={`flex-1 py-2.5 text-center transition-all cursor-pointer border-b-2 ${
                  rightPanelTab === "participants"
                    ? "border-[#00a884] text-[#00a884] bg-white font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                Peserta ({activeChatDetail.participants?.length || 0})
              </button>
            )}
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
            {/* TAB 1: MEDIA */}
            {rightPanelTab === "media" && (
              <div className="space-y-2.5">
                {!activeChatDetail.media || activeChatDetail.media.length === 0 ? (
                  <p className="text-gray-400 text-xs text-center py-12">Belum ada foto atau dokumen.</p>
                ) : (
                  activeChatDetail.media.map((med, mIdx) => (
                    <div
                      key={med.id || mIdx}
                      className="p-3 rounded-xl border border-gray-200 bg-white hover:border-[#00a884] transition-all flex items-start gap-3 shadow-2xs"
                    >
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 text-base">
                        {med.type === "image" ? "📷" : med.type === "document" ? "📄" : "🎙️"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">
                          {med.caption || med.mediaInfo?.fileName || `Media (${med.type})`}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
                          <span>{med.sender}</span>
                          <span>{formatTime(med.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: LINKS */}
            {rightPanelTab === "links" && (
              <div className="space-y-2.5">
                {!activeChatDetail.links || activeChatDetail.links.length === 0 ? (
                  <p className="text-gray-400 text-xs text-center py-12">Belum ada tautan dibagikan.</p>
                ) : (
                  activeChatDetail.links.map((lnk, lIdx) => (
                    <div
                      key={lIdx}
                      className="p-3 rounded-xl border border-gray-200 hover:border-blue-300 bg-white transition-all shadow-2xs"
                    >
                      <a
                        href={lnk.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-blue-700 hover:text-blue-900 break-all inline-flex items-center gap-1"
                      >
                        <span>{lnk.url}</span>
                        <ExternalLinkIcon className="w-3.5 h-3.5 flex-shrink-0" />
                      </a>
                      <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2">
                        <span className="truncate">{lnk.sender}</span>
                        <span>{formatTime(lnk.timestamp)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: PARTICIPANTS */}
            {rightPanelTab === "participants" && (
              <div className="space-y-2">
                {!activeChatDetail.participants || activeChatDetail.participants.length === 0 ? (
                  <p className="text-gray-400 text-xs text-center py-12">Tidak ada data anggota.</p>
                ) : (
                  activeChatDetail.participants.map((p, pIdx) => (
                    <div
                      key={p.jid || pIdx}
                      className="p-3 rounded-xl border border-gray-200 bg-white hover:border-[#00a884] transition-all flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{p.name || p.phone}</p>
                        <p className="text-[11px] text-gray-500 font-mono truncate">{p.phone}</p>
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium mt-1 inline-block">
                          {p.message_count || 0} pesan
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopy(p.raw_phone || p.phone, "Nomor Peserta")}
                        className="p-2 text-gray-400 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#00a884] text-white flex items-center justify-center font-bold">
                  ➕
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Mulai Obrolan WhatsApp Baru</h3>
                  <p className="text-xs text-gray-500">Kirim pesan ke nomor baru atau nomor lama</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm p-1.5 rounded-lg hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStartNewChat} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nomor WhatsApp Tujuan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newChatPhone}
                  onChange={(e) => setNewChatPhone(e.target.value)}
                  placeholder="Contoh: 08123456789 atau 628123456789"
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00a884] focus:outline-hidden font-mono"
                  autoFocus
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Format angka biasa diawali 08... atau 62...
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nama Kontak (Opsional)
                </label>
                <input
                  type="text"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  placeholder="Contoh: Pak Budi / Kantor Dinas"
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00a884] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#00a884] hover:bg-[#008f6f] rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Buka Percakapan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
