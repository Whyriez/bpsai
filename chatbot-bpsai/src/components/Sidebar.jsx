import { useEffect, useRef, useState } from "react";
import ConfirmModal from "./ConfirmModal";
import Icon from "./Icon";
import UserAvatar from "./UserAvatar";

const TOPICS = [
  {
    label: "Ketenagakerjaan",
    icon: "briefcase",
    query:
      "Berapa Tingkat Pengangguran Terbuka (TPT) Provinsi Gorontalo pada rilis BPS terbaru? Sertakan periode dan sumber datanya.",
  },
  {
    label: "Kependudukan & sosial",
    icon: "people",
    query:
      "Bagaimana data kemiskinan dan IPM Provinsi Gorontalo pada rilis BPS terbaru? Sertakan periode dan sumber datanya.",
  },
  {
    label: "Ekonomi & PDRB",
    icon: "chart",
    query:
      "Bagaimana pertumbuhan ekonomi (PDRB) Gorontalo pada rilis BPS terbaru? Sertakan periode dan sumber datanya.",
  },
  {
    label: "Inflasi & harga",
    icon: "trend",
    query:
      "Berapa angka inflasi Provinsi Gorontalo pada rilis BPS terbaru? Sertakan periode dan sumber datanya.",
  },
];

export default function Sidebar({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onTogglePinConversation,
  user,
  onOpenGoogleLogin,
  onSelectTopic,
  isLoading,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deletingConvId, setDeletingConvId] = useState(null);
  const sidebarRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const mobile = window.matchMedia("(max-width: 899px)").matches;
    const previouslyFocused = document.activeElement;
    if (mobile) sidebarRef.current?.querySelector("button")?.focus();
    const handleKey = (event) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]"))
        onClose();
      if (
        event.key !== "Tab" ||
        !mobile ||
        document.querySelector("dialog[open]")
      )
        return;
      const controls = sidebarRef.current?.querySelectorAll(
        "button:not(:disabled), input:not(:disabled), a[href]",
      );
      const first = controls?.[0];
      const last = controls?.[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      if (mobile && previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [isOpen, onClose]);

  const filtered = (conversations || []).filter((conversation) =>
    (conversation.title || "")
      .toLocaleLowerCase("id")
      .includes(searchTerm.toLocaleLowerCase("id")),
  );
  const pinned = filtered.filter((conversation) => conversation.is_pinned);
  const recent = filtered.filter((conversation) => !conversation.is_pinned);

  const saveTitle = async (id) => {
    if (editingTitle.trim())
      await onRenameConversation?.(id, editingTitle.trim());
    setEditingId(null);
  };

  const renderConversation = (conversation) => {
    const id = conversation.conversation_id;
    const title = conversation.title || "Percakapan tanpa judul";
    return (
      <div
        key={id}
        className={`conversation-row ${id === activeConversationId ? "is-active" : ""}`}
      >
        {editingId === id ? (
          <form
            className="conversation-edit"
            onSubmit={(event) => {
              event.preventDefault();
              saveTitle(id);
            }}
          >
            <input
              autoFocus
              aria-label="Judul percakapan"
              value={editingTitle}
              onChange={(event) => setEditingTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.stopPropagation();
                  setEditingId(null);
                }
              }}
            />
            <button
              className="icon-button compact"
              type="submit"
              aria-label="Simpan judul"
            >
              <Icon name="check" size={15} />
            </button>
            <button
              className="icon-button compact"
              type="button"
              onClick={() => setEditingId(null)}
              aria-label="Batal mengubah judul"
            >
              <Icon name="close" size={15} />
            </button>
          </form>
        ) : (
          <>
            <button
              className="conversation-select"
              onClick={() => onSelectConversation(id)}
              title={title}
              aria-current={id === activeConversationId ? "page" : undefined}
            >
              <Icon name={conversation.is_pinned ? "pin" : "chat"} size={16} />
              <span>{title}</span>
            </button>
            <div className="conversation-actions">
              {onTogglePinConversation && (
                <button
                  className="icon-button compact"
                  onClick={() =>
                    onTogglePinConversation(id, !conversation.is_pinned)
                  }
                  title={
                    conversation.is_pinned
                      ? "Lepas sematan"
                      : "Sematkan percakapan"
                  }
                  aria-label={
                    conversation.is_pinned
                      ? "Lepas sematan"
                      : "Sematkan percakapan"
                  }
                >
                  <Icon name="pin" size={14} />
                </button>
              )}
              <button
                className="icon-button compact"
                onClick={() => {
                  setEditingId(id);
                  setEditingTitle(title);
                }}
                title="Ubah nama"
                aria-label="Ubah nama"
              >
                <Icon name="edit" size={14} />
              </button>
              <button
                className="icon-button compact danger-text"
                onClick={() => setDeletingConvId(id)}
                title="Hapus percakapan"
                aria-label="Hapus percakapan"
              >
                <Icon name="trash" size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        ref={sidebarRef}
        id="conversation-sidebar"
        className={`sidebar ${isOpen ? "is-open" : ""}`}
        inert={!isOpen}
        aria-label="Navigasi dan riwayat percakapan"
      >
        <div className="sidebar-brand">
          <img
            src={`${import.meta.env.BASE_URL}bpslogo.png`}
            alt="Badan Pusat Statistik"
            width="37"
            height="37"
          />
          <div>
            <strong>
              SIGAP<span>BPS</span>
            </strong>
            <p>Asisten pengetahuan statistik</p>
          </div>
          <button
            className="icon-button sidebar-close"
            onClick={onClose}
            aria-label="Tutup panel riwayat"
          >
            <Icon name="close" size={19} />
          </button>
        </div>
        <div className="sidebar-start">
          <button className="button new-chat-button" onClick={onNewChat}>
            <Icon name="plus" size={18} />
            Percakapan baru
          </button>
          {user && (
            <div className="sidebar-search">
              <Icon name="search" size={16} />
              <input
                type="search"
                aria-label="Cari percakapan"
                placeholder="Cari percakapan"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          )}
        </div>
        <div className="sidebar-content">
          <section className="sidebar-section">
            <h2>Jelajahi topik</h2>
            {TOPICS.map((topic) => (
              <button
                key={topic.label}
                className="topic-button"
                onClick={() => onSelectTopic?.(topic.query)}
                disabled={isLoading}
              >
                <Icon name={topic.icon} size={18} />
                <span>{topic.label}</span>
              </button>
            ))}
          </section>
          <section className="sidebar-section history-section">
            <h2>Riwayat percakapan</h2>
            {user ? (
              filtered.length ? (
                <>
                  {pinned.length > 0 && (
                    <>
                      <p className="history-group-label">Disematkan</p>
                      {pinned.map(renderConversation)}
                    </>
                  )}
                  {recent.length > 0 && (
                    <>
                      {pinned.length > 0 && (
                        <p className="history-group-label">Terbaru</p>
                      )}
                      {recent.map(renderConversation)}
                    </>
                  )}
                </>
              ) : (
                <p className="sidebar-empty">
                  {searchTerm
                    ? "Tidak ada percakapan yang sesuai."
                    : "Percakapan Anda akan tampil di sini."}
                </p>
              )
            ) : (
              <div className="guest-history">
                <Icon name="chat" size={22} />
                <p>Simpan percakapan Anda.</p>
                <span>
                  Masuk untuk membuka kembali riwayat dan melanjutkan pencarian
                  data.
                </span>
                <button onClick={onOpenGoogleLogin} className="text-button">
                  Masuk ke akun
                  <Icon name="arrow" size={15} />
                </button>
              </div>
            )}
          </section>
        </div>
        <footer className="sidebar-footer">
          {user ? (
            <>
              <UserAvatar user={user} />
              <div>
                <strong>{user.name || user.username}</strong>
                <span>{user.email}</span>
              </div>
            </>
          ) : (
            <>
              <Icon name="book" size={21} />
              <div>
                <strong>BPS Provinsi Gorontalo</strong>
                <span>Sistem Informasi Generatif Asisten Pengetahuan</span>
              </div>
            </>
          )}
        </footer>
      </aside>
      <ConfirmModal
        isOpen={!!deletingConvId}
        onClose={() => setDeletingConvId(null)}
        onConfirm={() => {
          onDeleteConversation?.(deletingConvId);
          setDeletingConvId(null);
        }}
        title="Hapus percakapan?"
        message="Percakapan ini akan dihapus dari riwayat Anda. Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus percakapan"
        confirmVariant="danger"
      />
    </>
  );
}
