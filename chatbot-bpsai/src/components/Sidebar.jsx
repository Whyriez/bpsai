// src/components/Sidebar.jsx
import React, { useState } from 'react';
import ConfirmModal from './ConfirmModal';

const POPULAR_TOPICS = [
  { icon: '📈', title: 'Inflasi & IHK Gorontalo', query: 'Berapa angka inflasi Provinsi Gorontalo terbaru?' },
  { icon: '💼', title: 'Ketenagakerjaan & TPT', query: 'Bagaimana data tingkat pengangguran di Gorontalo?' },
  { icon: '🌾', title: 'Pertumbuhan Ekonomi (PDRB)', query: 'Berapa pertumbuhan ekonomi Gorontalo triwulan ini?' },
  { icon: '👥', title: 'Kemiskinan & IPM', query: 'Bagaimana data persentase penduduk miskin Gorontalo?' },
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

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase())
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
        className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs transition-all duration-200 cursor-pointer ${
          isActive
            ? 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-900/40 dark:to-indigo-900/40 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-700 shadow-2xs'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
        }`}
      >
        {isActive && (
          <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-600 rounded-r-full"></div>
        )}

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
              className="flex-1 px-2 py-1 text-xs border border-blue-400 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white outline-none"
            />
            <button
              onClick={(e) => saveEditing(conv.conversation_id, e)}
              className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-md"
              title="Simpan Judul"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onClick={cancelEditing}
              className="p-1 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md"
              title="Batal"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center space-x-2.5 min-w-0 pr-16 pl-1">
              {isPinned ? (
                <svg className="w-3.5 h-3.5 text-amber-500 shrink-0 transform -rotate-45" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                </svg>
              ) : (
                <svg
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
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
                  className={`p-1 rounded-lg hover:bg-white dark:hover:bg-gray-600 transition-all cursor-pointer ${
                    isPinned ? 'text-amber-500 hover:text-amber-600' : 'text-gray-400 hover:text-amber-500'
                  }`}
                  title={isPinned ? 'Lepas sematan' : 'Sematkan percakapan'}
                >
                  <svg className="w-3.5 h-3.5 transform -rotate-45" fill={isPinned ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                  </svg>
                </button>
              )}
              <button
                onClick={(e) => startEditing(conv, e)}
                className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-white dark:hover:bg-gray-600 transition-all cursor-pointer"
                title="Ubah nama percakapan"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-white dark:hover:bg-gray-600 transition-all cursor-pointer"
                title="Hapus percakapan"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          className="md:hidden fixed inset-0 z-40 bg-gray-900/60 backdrop-blur-xs transition-opacity duration-300"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-40 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-r border-gray-200/80 dark:border-gray-700/80 flex flex-col transition-all duration-300 ease-in-out shadow-xl md:shadow-none h-full shrink-0 ${
          isOpen
            ? 'translate-x-0 w-72 md:w-80 opacity-100'
            : '-translate-x-full md:-translate-x-full w-0 md:w-0 opacity-0 border-none overflow-hidden pointer-events-none'
        }`}
      >
        {/* Top Header: New Chat */}
        <div className="p-4 border-b border-gray-200/60 dark:border-gray-700/60 space-y-3">
          <div className="flex items-center">
            <button
              onClick={onNewChat}
              className="w-full flex items-center justify-center space-x-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white py-2.5 px-4 rounded-2xl font-bold text-sm transition-all duration-200 shadow-md shadow-blue-500/20 active:scale-98 cursor-pointer"
            >
              <svg className="w-4 h-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Chat Baru</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Cari percakapan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/80 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500/40 outline-none transition-all"
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3 top-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-5 chat-scroll">
          {/* SECTION 1: Topik Statistik Populer */}
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Topik Populer BPS
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {POPULAR_TOPICS.map((topic, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (onSelectTopic) onSelectTopic(topic.query);
                  }}
                  className="flex items-center space-x-2.5 p-2 rounded-xl text-left text-xs bg-gray-50/60 dark:bg-gray-700/30 hover:bg-blue-50/80 dark:hover:bg-gray-700 transition-all border border-gray-100 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 group cursor-pointer"
                >
                  <span className="text-sm">{topic.icon}</span>
                  <span className="truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium">
                    {topic.title}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 2: Riwayat Chat (User / Guest) */}
          <div className="border-t border-gray-100 dark:border-gray-700/60 pt-4">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Riwayat Chat
                  </span>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-0.5 rounded-full">
                    {filteredConversations.length} Sesi
                  </span>
                </div>

                {filteredConversations.length === 0 ? (
                  <div className="text-center py-6 px-3 text-gray-400 dark:text-gray-500 text-xs border border-dashed border-gray-200 dark:border-gray-700/80 rounded-2xl">
                    <p className="font-medium">Belum ada riwayat.</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Pertanyaan Anda akan tersimpan di sini.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Disematkan */}
                    {pinnedConversations.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5 px-1 py-0.5">
                          <svg className="w-3 h-3 text-amber-500 transform -rotate-45" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                          </svg>
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                            Disematkan
                          </span>
                        </div>
                        {pinnedConversations.map(renderConvItem)}
                      </div>
                    )}

                    {/* Riwayat Utama */}
                    {unpinnedConversations.length > 0 && (
                      <div className="space-y-1">
                        {pinnedConversations.length > 0 && (
                          <div className="px-1 py-0.5">
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                              Riwayat Terbaru
                            </span>
                          </div>
                        )}
                        {unpinnedConversations.map(renderConvItem)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Non-Logged In Google Sign-In Promo Card */
              <div className="bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 border border-blue-100 dark:border-gray-700 rounded-2xl p-4 text-center shadow-2xs relative overflow-hidden">
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center border border-gray-100 dark:border-gray-600">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>

                <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-1">
                  Simpan Riwayat Chat
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
                  Login dengan Google untuk menyimpan dan mengakses riwayat percakapan Anda kapan saja.
                </p>

                <button
                  onClick={onOpenGoogleLogin}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-3 rounded-xl shadow-sm transition-all cursor-pointer active:scale-98"
                >
                  <span>Masuk dengan Google</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 3: Portal & Informasi BPS */}
          <div className="border-t border-gray-100 dark:border-gray-700/60 pt-4 space-y-2">
            <span className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
              Portal Layanan BPS
            </span>
            <div className="space-y-1 text-xs">
              <a
                href="https://gorontalo.bps.go.id"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300 transition-colors"
              >
                <span className="flex items-center space-x-2">
                  <span>🌐</span>
                  <span>Website BPS Gorontalo</span>
                </span>
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <a
                href="https://pst.bps.go.id"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300 transition-colors"
              >
                <span className="flex items-center space-x-2">
                  <span>📊</span>
                  <span>Pelayanan Statistik Terpadu</span>
                </span>
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Footer Area */}
        <div className="p-3.5 border-t border-gray-200/80 dark:border-gray-700/80 bg-gray-50/80 dark:bg-gray-800/80">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0">
                <img
                  src={
                    user.picture ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}`
                  }
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}&background=0D8ABC&color=fff`;
                  }}
                  className="w-8 h-8 rounded-full object-cover border border-white dark:border-gray-700 shadow-2xs"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-800 dark:text-white truncate">
                    {user.name || user.username}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                </div>
              </div>

              {onDeleteAccount && (
                <button
                  onClick={onDeleteAccount}
                  className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-all cursor-pointer"
                  title="Hapus Akun Pengguna"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between text-[10px] text-gray-400">
              <span className="font-semibold text-gray-500 dark:text-gray-400">SIGAP BPS AI</span>
              <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-mono">
                v1.0 • Gorontalo
              </span>
            </div>
          )}
        </div>
      </aside>

      <ConfirmModal
        isOpen={!!deletingConvId}
        onClose={() => setDeletingConvId(null)}
        onConfirm={() => {
          if (deletingConvId) {
            onDeleteConversation(deletingConvId);
            setDeletingConvId(null);
          }
        }}
        title="Hapus Percakapan"
        message="Apakah Anda yakin ingin menghapus percakapan ini? Seluruh riwayat obrolan dalam sesi ini akan dihapus secara permanen."
        confirmText="Hapus Percakapan"
        confirmVariant="danger"
      />
    </>
  );
};

export default Sidebar;
