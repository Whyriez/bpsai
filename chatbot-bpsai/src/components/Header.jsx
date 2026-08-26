// src/components/Header.jsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

const Header = ({ onThemeToggle, theme, onToggleSidebar, onOpenGoogleLogin, onDeleteAccount }) => {
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-700/80 px-4 md:px-6 py-2.5 shadow-xs transition-colors duration-300">
      <div className="flex items-center justify-between">
        {/* Left section: Sidebar toggle & Logo */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-2xl text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors cursor-pointer"
            title="Buka Sidebar / Riwayat Chat"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 md:w-11 md:h-11 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-2xl p-1 flex items-center justify-center shrink-0 border border-blue-100 dark:border-gray-700">
              <img
                src="/chatbot/bpslogo.png"
                alt="Logo SIGAP BPS Gorontalo"
                className="h-full w-full object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://upload.wikimedia.org/wikipedia/commons/2/28/Lambang_Badan_Pusat_Statistik_%28BPS%29_Indonesia.svg";
                }}
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base md:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  SIGAP BPS
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                  AI Online
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-gray-500 dark:text-gray-400">
                Sistem Informasi Generatif Asisten Pengetahuan BPS Provinsi Gorontalo
              </p>
            </div>
          </div>
        </div>

        {/* Right section: Dark Mode Toggle & Google Login / Profile */}
        <div className="flex items-center space-x-2 md:space-x-3">
          <button
            onClick={onThemeToggle}
            className="p-2 rounded-2xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            title="Ganti Mode Gelap/Terang"
          >
            {theme === "light" ? (
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zM12 2l1.09 2.09L15 3l-1.91 1.09L12 6l-1.09-1.91L9 3l2.09 1.09L12 2zm0 16l1.09 2.09L15 21l-1.91 1.09L12 24l-1.09-1.91L9 21l2.09 1.09L12 18z" />
              </svg>
            )}
          </button>

          {/* User Profile or Google Login Button */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2.5 p-1.5 pl-2 rounded-2xl hover:bg-gray-100/80 dark:hover:bg-gray-700/60 transition-all cursor-pointer border border-gray-200/80 dark:border-gray-700 shadow-2xs"
              >
                <div className="relative">
                  <img
                    src={
                      user.picture ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}`
                    }
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}&background=0D8ABC&color=fff`;
                    }}
                    className="w-7 h-7 rounded-full object-cover border border-white dark:border-gray-600"
                  />
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-800"></span>
                </div>
                <span className="hidden md:inline text-xs font-semibold text-gray-800 dark:text-gray-200 max-w-[130px] truncate">
                  {user.name || user.username}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Profile Dropdown */}
              {isDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl py-2 border border-gray-100 dark:border-gray-700 z-50 animate-in fade-in zoom-in-95 duration-150"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/80 flex items-center space-x-3">
                    <img
                      src={
                        user.picture ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}`
                      }
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}&background=0D8ABC&color=fff`;
                      }}
                      className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {user.name || user.username}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                      <span className="inline-flex items-center mt-1 px-2 py-0.5 text-[9px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-full">
                        <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        Akun Google Terverifikasi
                      </span>
                    </div>
                  </div>

                  <div className="p-1 border-t border-gray-100 dark:border-gray-700/80 mt-1 space-y-1">
                    <button
                      onClick={() => {
                        logout();
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60 rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      <span>Keluar (Logout)</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        if (onDeleteAccount) onDeleteAccount();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <span>Hapus Akun</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenGoogleLogin}
              className="flex items-center space-x-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-white text-xs font-semibold py-2 px-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-98"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              <span>Masuk via Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
