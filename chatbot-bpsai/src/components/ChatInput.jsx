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
      const scrollHeight = Math.min(textarea.scrollHeight, 200);
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
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 md:p-6 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        {/* Banner Batas Percakapan Tamu (Guest Limit Reached) */}
        {isGuestLimitReached ? (
          <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/40 border border-amber-200 dark:border-amber-800/60 shadow-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                    Batas 2x Percakapan Tamu Telah Tercapai
                  </h4>
                  <p className="text-[11px] sm:text-xs text-amber-700 dark:text-amber-300/90 mt-0.5">
                    Masuk dengan Akun Google untuk menikmati <strong>chat tanpa batas (Unlimited)</strong> & menyimpan riwayat obrolan.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenGoogleLogin}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-lg transition-all transform active:scale-95 cursor-pointer shrink-0"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Masuk Sekarang (Unlimited)</span>
              </button>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="relative">
          <div className="relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || isGuestLimitReached}
              placeholder={
                isGuestLimitReached
                  ? "Batas percakapan tercapai. Silakan masuk via Google untuk lanjut..."
                  : isLoading
                  ? "AI sedang memproses..."
                  : "Ketik pertanyaan Anda... (Shift+Enter untuk baris baru)"
              }
              className={`w-full px-4 py-3.5 pr-16 border rounded-2xl focus:outline-none transition-all duration-200 resize-none overflow-y-auto ${
                isGuestLimitReached
                  ? "bg-gray-100 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed"
                  : "border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              }`}
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            />

            {/* Tombol di dalam textarea */}
            <div className="absolute bottom-3 right-3 flex items-center">
              {isLoading ? (
                <button
                  type="button"
                  onClick={onCancel}
                  className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-xl transition-all duration-200 hover-lift shadow-lg flex items-center justify-center cursor-pointer"
                  title="Hentikan Proses"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <rect width="8" height="8" x="6" y="6" rx="1" />
                  </svg>
                </button>
              ) : isGuestLimitReached ? (
                <button
                  type="button"
                  onClick={onOpenGoogleLogin}
                  className="bg-amber-500 hover:bg-amber-600 text-white p-2 rounded-xl transition-all duration-200 shadow-md flex items-center justify-center cursor-pointer"
                  title="Masuk via Google untuk Melanjutkan"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!prompt.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl transition-all duration-200 hover-lift shadow-md disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                  title="Kirim Pesan"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              )}
            </div>

            {/* Sembunyikan scrollbar untuk browser Webkit */}
            <style>
              {`
                textarea::-webkit-scrollbar {
                  display: none;
                }
              `}
            </style>
          </div>
        </form>

        {/* Footer Info / Mode Status */}
        <div className="flex flex-col sm:flex-row items-center justify-between mt-2.5 px-1 text-[11px] text-gray-500 dark:text-gray-400 gap-1.5">
          <div className="flex items-center space-x-2">
            {!isLoggedIn ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-amber-100/80 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
                Mode Tamu: {remainingGuestChats !== null ? `${remainingGuestChats}x percakapan tersisa` : "2x limit"}
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                Akses Unlimited (Google)
              </span>
            )}

            {!isLoggedIn && (
              <button
                type="button"
                onClick={onOpenGoogleLogin}
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
              >
                Masuk untuk Unlimited ⚡
              </button>
            )}
          </div>

          <span className="hidden sm:inline text-gray-400 dark:text-gray-500">
            💡 Coba: "Berapa inflasi Gorontalo tahun 2024?"
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;