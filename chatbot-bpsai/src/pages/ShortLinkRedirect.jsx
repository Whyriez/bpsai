// src/pages/ShortLinkRedirect.jsx
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function ShortLinkRedirect() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [docData, setDocData] = useState(null);
  const [countdown, setCountdown] = useState(2);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("sigap_theme") || "light";
  });

  const redirectTimerRef = useRef(null);

  // Sinkronisasi tema light/dark mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("sigap_theme", theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  useEffect(() => {
    if (!slug) {
      setError("Kode tautan tidak valid.");
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchShortLink() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${API_BASE_URL}/api/public/short-link/${encodeURIComponent(slug)}`,
          {
            headers: {
              Accept: "application/json",
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success || !data.target_url) {
          throw new Error(
            data.error || "Dokumen tidak ditemukan atau tautan telah kedaluwarsa."
          );
        }

        if (isMounted) {
          setDocData(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Gagal memuat dokumen.");
          setLoading(false);
        }
      }
    }

    fetchShortLink();

    return () => {
      isMounted = false;
      if (redirectTimerRef.current) {
        clearInterval(redirectTimerRef.current);
      }
    };
  }, [slug]);

  // Efek Countdown dan Auto-Redirect
  useEffect(() => {
    if (!docData || !docData.target_url) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          window.location.replace(docData.target_url);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    redirectTimerRef.current = interval;

    return () => clearInterval(interval);
  }, [docData]);

  // Buka dokumen manual
  const handleOpenNow = () => {
    if (docData?.target_url) {
      window.location.href = docData.target_url;
    }
  };

  // Alihkan ke AI SIGAP
  const handleAskAI = () => {
    if (redirectTimerRef.current) {
      clearInterval(redirectTimerRef.current);
    }
    const newConvId = crypto.randomUUID();
    const isBrs = (docData?.doc_type || "").toUpperCase() === "BRS";
    const docNoun = isBrs ? "Berita Resmi Statistik (BRS)" : "Publikasi";
    const promptText = `Halo SIGAP BPS! Tolong berikan ringkasan eksekutif, indikator data utama, dan poin penting dari ${docNoun} "${docData?.title || "ini"}".`;

    navigate(`/chat/${newConvId}`, {
      state: { initialPrompt: promptText },
    });
  };

  const isBrs = (docData?.doc_type || "").toUpperCase() === "BRS";
  const docTypeLabel = isBrs ? "BERITA RESMI STATISTIK (BRS)" : "PUBLIKASI RESMI BPS";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Top Header SIGAP BPS */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-blue-100 dark:border-slate-800 px-4 md:px-6 py-2.5 transition-colors">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-9 h-9 md:w-10 md:h-10 bg-blue-50 dark:bg-slate-800 rounded-xl p-1.5 flex items-center justify-center shrink-0 border border-blue-200 dark:border-slate-700 shadow-2xs">
              <img
                src="/bpslogo.png"
                alt="BPS"
                className="h-full w-full object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/chatbot/bpslogo.png";
                }}
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm md:text-base font-bold text-slate-900 dark:text-white leading-tight">
                  SIGAP BPS
                </h1>
                <span className="hidden sm:inline text-xs text-slate-300 dark:text-slate-600">•</span>
                <span className="hidden sm:inline text-xs text-slate-600 dark:text-slate-300 font-medium">
                  BPS Provinsi Gorontalo
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Sistem Informasi Generatif Asisten Pengetahuan
              </p>
            </div>
          </div>

          {/* Actions: Theme Toggle & Home Chat */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={handleToggleTheme}
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

            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-slate-700 transition cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Buka Chatbot AI</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg">
          {/* Card Container */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6 sm:p-8 transition-all">
            {/* Loading State */}
            {loading && (
              <div className="py-12 flex flex-col items-center text-center">
                <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  Menyiapkan Dokumen BPS...
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Memeriksa tautan resmi dari Badan Pusat Statistik
                </p>
              </div>
            )}

            {/* Error State */}
            {!loading && error && (
              <div className="py-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mb-4 border border-red-200 dark:border-red-900/50">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                  Tautan Tidak Ditemukan
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed max-w-sm">
                  {error}
                </p>
                <button
                  onClick={() => navigate("/")}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>Kembali ke Beranda Chatbot</span>
                </button>
              </div>
            )}

            {/* Success State */}
            {!loading && !error && docData && (
              <div className="flex flex-col text-left">
                {/* Kategori Dokumen */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-3 mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    {docTypeLabel}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    Dokumen PDF Resmi
                  </span>
                </div>

                {/* Document Main Information */}
                <div className="flex items-start gap-3.5 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-slate-700/80 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-slate-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                      {docData.title || "Dokumen Publikasi BPS"}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                      <span>BPS Provinsi Gorontalo</span>
                      <span>•</span>
                      <span>Portal Web API BPS</span>
                    </p>
                  </div>
                </div>

                {/* Redirect Box with Clean Progress */}
                <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3.5 my-3">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-medium mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>
                        {countdown > 0
                          ? `Mengalihkan otomatis ke PDF dalam ${countdown} detik...`
                          : "Membuka file dokumen resmi..."}
                      </span>
                    </div>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {countdown}s
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-1000 ease-linear"
                      style={{ width: `${((3 - countdown) / 3) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex flex-col gap-2.5">
                  <button
                    onClick={handleOpenNow}
                    className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    <span>Buka Dokumen Sekarang (PDF)</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>

                  <button
                    onClick={handleAskAI}
                    className="w-full py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-blue-50/70 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-slate-700 font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    <span>💬 Tanya Isi Dokumen ini ke AI SIGAP</span>
                  </button>

                  {docData.bps_web_url && (
                    <a
                      href={docData.bps_web_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (redirectTimerRef.current) {
                          clearInterval(redirectTimerRef.current);
                        }
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                    >
                      <span>🌐 Buka Laman Web Resmi BPS</span>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>

                {/* Card Sub-Footer Info */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                  <span>Tautan Resmi Terverifikasi BPS</span>
                  <span>ID: {docData.pub_id ? String(docData.pub_id).slice(0, 10) : slug.slice(0, 10)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Branding / Footnote */}
          <div className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
            <p>
              Badan Pusat Statistik Provinsi Gorontalo • Portal SIGAP AI
            </p>
            <p className="text-[11px] mt-0.5">
              Jl. Rusli Datau No. 168, Kota Gorontalo, Gorontalo 96123
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
