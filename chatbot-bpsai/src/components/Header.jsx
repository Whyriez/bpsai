// src/components/Header.jsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

const Header = ({ onThemeToggle, theme, onToggleSidebar, onOpenGoogleLogin, onDeleteAccount }) => {
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-blue-100 dark:border-slate-800 px-4 md:px-6 py-2.5 transition-colors">
      <div className="flex items-center justify-between">
        {/* Left: Sidebar Toggle & Brand */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-500 hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Riwayat Percakapan"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 md:w-10 md:h-10 bg-blue-50 dark:bg-slate-800 rounded-xl p-1.5 flex items-center justify-center shrink-0 border border-blue-200 dark:border-slate-700 shadow-2xs">
              <img
                src="/chatbot/bpslogo.png"
                alt="BPS"
                className="h-full w-full object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://upload.wikimedia.org/wikipedia/commons/2/28/Lambang_Badan_Pusat_Statistik_%28BPS%29_Indonesia.svg";
                }}
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm md:text-base font-bold text-slate-900 dark:text-white leading-tight">
                  SIGAP BPS
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1.5"></span>
                  BPS Provinsi Gorontalo
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Sistem Informasi Generatif Asisten Pengetahuan
              </p>
            </div>
          </div>
        </div>

        {/* Right: Theme Toggle & User Auth */}
        <div className="flex items-center space-x-2 md:space-x-3">
          <button
            onClick={onThemeToggle}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            title="Ganti Mode Tampilan"
          >
            {theme === "light" ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 p-1.5 pl-2 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800 transition-all cursor-pointer border border-blue-200/80 dark:border-slate-700 shadow-2xs"
              >
                <img
                  src={
                    user.picture ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}`
                  }
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}&background=2563EB&color=fff`;
                  }}
                  className="w-6 h-6 rounded-full object-cover"
                />
                <span className="hidden md:inline text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
                  {user.name || user.username}
                </span>
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Profile Dropdown */}
              {isDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-xl py-1.5 border border-blue-100 dark:border-slate-700 z-50 animate-fadeIn"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-700/70">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {user.name || user.username}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                  </div>

                  <div className="p-1 space-y-0.5">
                    <button
                      onClick={() => {
                        logout();
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Keluar</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        if (onDeleteAccount) onDeleteAccount();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-3.5 rounded-xl shadow-sm shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z"/>
              </svg>
              <span>Masuk Akun</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
