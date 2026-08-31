import React, { useState, useRef, useEffect } from "react";

const ChatInput = ({
  onSendMessage,
  isLoading,
  onCancel,
  isGuestLimitReached = false,
  remainingGuestChats = null,
  isLoggedIn = false,
  onOpenGoogleLogin,
}) => {
  const [prompt, setPrompt] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const scrollHeight = Math.min(textarea.scrollHeight, 180);
      textarea.style.height = `${scrollHeight}px`;
    }
  }, [prompt]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isGuestLimitReached) {
      if (onOpenGoogleLogin) onOpenGoogleLogin();
      return;
    }
    if (prompt.trim() && !isLoading) {
      onSendMessage(prompt.trim());
      setPrompt("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-sm border-t border-blue-100 dark:border-slate-800 p-3 sm:p-4 transition-colors">
      <div className="max-w-3xl mx-auto">
        {/* Banner Batas Percakapan Tamu */}
        {isGuestLimitReached && (
          <div className="mb-3 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-blue-950 dark:text-blue-200 font-medium">
                Batas 2x percakapan tamu telah tercapai. Masuk via Google untuk konsultasi tak terbatas.
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenGoogleLogin}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm shadow-blue-500/20 transition-colors shrink-0"
            >
              Masuk Google
            </button>
          </div>
        )}

        {/* Floating Input Box */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative flex items-end bg-white dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all p-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || isGuestLimitReached}
              placeholder={
                isGuestLimitReached
                  ? "Masuk via Google untuk melanjutkan konsultasi..."
                  : isLoading
                  ? "Sedang menyusun respon data..."
                  : "Tanyakan data statistik BPS Provinsi Gorontalo..."
              }
              className="w-full px-3 py-1.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent resize-none outline-none max-h-44 leading-relaxed"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            />

            {/* Tombol Send / Cancel */}
            <div className="flex items-center gap-1 shrink-0 pb-0.5 pr-1">
              {isLoading ? (
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-colors"
                  title="Hentikan"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <rect width="8" height="8" x="6" y="6" rx="1.5" />
                  </svg>
                </button>
              ) : isGuestLimitReached ? (
                <button
                  type="button"
                  onClick={onOpenGoogleLogin}
                  className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-sm transition-colors"
                  title="Masuk via Google"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!prompt.trim()}
                  className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm shadow-blue-500/20"
                  title="Kirim pesan"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Footer Status Bar */}
        <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-2">
            {!isLoggedIn ? (
              <span className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                Mode Tamu ({remainingGuestChats !== null ? `${remainingGuestChats} chat tersisa` : '2x batas'})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-medium text-blue-700 dark:text-blue-300">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                Akses Penuh Terverifikasi
              </span>
            )}

            {!isLoggedIn && (
              <button
                type="button"
                onClick={onOpenGoogleLogin}
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                Masuk Google
              </button>
            )}
          </div>

          <span className="hidden sm:inline text-slate-400">
            Shift + Enter untuk baris baru
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;