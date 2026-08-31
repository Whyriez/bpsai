// src/components/Sidebar.jsx
import React, { useState } from 'react';
import ConfirmModal from './ConfirmModal';

const POPULAR_TOPICS = [
  { label: 'Ketenagakerjaan & TPT', query: 'Berapa data Tingkat Pengangguran Terbuka (TPT) Gorontalo 2024?' },
  { label: 'Kemiskinan & IPM', query: 'Bagaimana data angka kemiskinan dan IPM Provinsi Gorontalo?' },
  { label: 'Pertumbuhan Ekonomi (PDRB)', query: 'Berapa laju pertumbuhan ekonomi (PDRB) Gorontalo?' },
  { label: 'Inflasi & IHK', query: 'Berapa angka inflasi Provinsi Gorontalo terbaru?' },
];

const Sidebar = ({
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
  onDeleteAccount,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingConvId, setDeletingConvId] = useState(null);

  const filteredConversations = (conversations || []).filter((conv) =>
    (conv.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pinnedConversations = filteredConversations.filter((conv) => conv.is_pinned);
  const unpinnedConversations = filteredConversations.filter((conv) => !conv.is_pinned);

  const startEditing = (conv, e) => {
    e.stopPropagation();
    setEditingId(conv.conversation_id);
    setEditingTitle(conv.title);
  };

  const cancelEditing = (e) => {
    if (e) e.stopPropagation();
    setEditingId(null);
    setEditingTitle('');
  };

  const saveEditing = async (convId, e) => {
    if (e) e.stopPropagation();
    if (editingTitle.trim() && onRenameConversation) {
      await onRenameConversation(convId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const renderConvItem = (conv) => {
    const isActive = conv.conversation_id === activeConversationId;
    const isEditing = editingId === conv.conversation_id;
    const isPinned = !!conv.is_pinned;

    return (
      <div
        key={conv.conversation_id}
        onClick={() => {
          if (!isEditing) onSelectConversation(conv.conversation_id);
        }}
        className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all duration-150 cursor-pointer ${
          isActive
            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800 shadow-2xs'
            : 'text-slate-700 dark:text-slate-300 hover:bg-blue-50/60 dark:hover:bg-slate-800/60'
        }`}
      >
        {isEditing ? (
          <div className="flex items-center space-x-1.5 w-full pr-1 pl-1" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEditing(conv.conversation_id, e);
                if (e.key === 'Escape') cancelEditing(e);
              }}
              autoFocus
              className="flex-1 px-2 py-1 text-xs border border-blue-400 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none"
            />
            <button
              onClick={(e) => saveEditing(conv.conversation_id, e)}
              className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-md"
              title="Simpan Judul"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onClick={cancelEditing}
              className="p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md"
              title="Batal"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center space-x-2.5 min-w-0 pr-14">
              {isPinned ? (
                <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 transform -rotate-45" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                </svg>
              ) : (
                <svg
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-300'
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.75"
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              )}
              <span className="truncate leading-relaxed">{conv.title}</span>
            </div>

            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onTogglePinConversation && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePinConversation(conv.conversation_id, !isPinned);
                  }}
                  className={`p-1 rounded-md hover:bg-blue-100/60 dark:hover:bg-slate-700 transition-colors ${
                    isPinned ? 'text-blue-600' : 'text-slate-400 hover:text-blue-600'
                  }`}
                  title={isPinned ? 'Lepas sematan' : 'Sematkan percakapan'}
                >
                  <svg className="w-3 h-3 transform -rotate-45" fill={isPinned ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                  </svg>
                </button>
              )}
              <button
                onClick={(e) => startEditing(conv, e)}
                className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-blue-100/60 dark:hover:bg-slate-700 transition-colors"
                title="Ubah nama"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingConvId(conv.conversation_id);
                }}
                className="p-1 text-slate-400 hover:text-rose-500 rounded-md hover:bg-blue-100/60 dark:hover:bg-slate-700 transition-colors"
                title="Hapus"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-40 bg-white dark:bg-slate-900 border-r border-blue-100 dark:border-slate-800 flex flex-col transition-all duration-250 ease-in-out shadow-lg md:shadow-none h-full shrink-0 ${
          isOpen
            ? 'translate-x-0 w-72 md:w-76 opacity-100'
            : '-translate-x-full md:-translate-x-full w-0 md:w-0 opacity-0 border-none overflow-hidden pointer-events-none'
        }`}
      >
        {/* Top Header: New Chat */}
        <div className="p-3.5 border-b border-blue-100 dark:border-slate-800 space-y-2.5">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-3 rounded-xl font-semibold text-xs transition-all duration-150 shadow-sm shadow-blue-500/20 cursor-pointer active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Percakapan Baru</span>
          </button>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Cari riwayat percakapan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-blue-200/80 dark:border-slate-700/80 rounded-lg bg-blue-50/40 dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
            <svg
              className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 chat-scroll">
          {/* SECTION 1: Topik Statistik Populer */}
          <div>
            <div className="px-1 mb-1.5">
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Topik Populer BPS
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {POPULAR_TOPICS.map((topic, index) => (
                <button
                  key={index}
                  onClick={() => onSelectTopic && onSelectTopic(topic.query)}
                  className="px-2.5 py-1.5 rounded-lg text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center justify-between group"
                >
                  <span className="truncate">{topic.label}</span>
                  <svg className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 2: Riwayat Chat */}
          <div className="border-t border-blue-100 dark:border-slate-800 pt-3">
            {user ? (
              <div className="space-y-3">
                <div className="px-1 mb-1">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Riwayat Percakapan
                  </span>
                </div>

                {filteredConversations.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 px-1 py-2 text-center">
                    {searchTerm ? 'Tidak ada percakapan cocok' : 'Belum ada percakapan'}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {pinnedConversations.length > 0 && (
                      <div className="space-y-0.5 mb-2">
                        {pinnedConversations.map(renderConvItem)}
                      </div>
                    )}
                    <div className="space-y-0.5">
                      {unpinnedConversations.map(renderConvItem)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-blue-50/60 dark:bg-slate-800/50 rounded-xl border border-blue-100 dark:border-slate-700 text-center">
                <p className="text-xs text-blue-900 dark:text-blue-200 font-semibold">
                  Akses Penuh Tanpa Batas
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Masuk via Google untuk menyimpan riwayat chat & konsultasi tak terbatas.
                </p>
                <button
                  onClick={onOpenGoogleLogin}
                  className="mt-2.5 w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  Masuk dengan Google
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {user && (
          <div className="p-3 border-t border-blue-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}`}
                alt={user.name}
                className="w-7 h-7 rounded-full object-cover border border-blue-200 dark:border-slate-700"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {user.name || user.username}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user.email || 'Pengguna Terverifikasi'}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Delete Modal */}
      {deletingConvId && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setDeletingConvId(null)}
          onConfirm={() => {
            if (onDeleteConversation) onDeleteConversation(deletingConvId);
            setDeletingConvId(null);
          }}
          title="Hapus Percakapan"
          message="Apakah Anda yakin ingin menghapus percakapan ini?"
          confirmText="Hapus"
          confirmVariant="danger"
        />
      )}
    </>
  );
};

export default Sidebar;
