// src/pages/ShortLinkRedirect.jsx
import { useState, useEffect, useRef } from "react";
import Icon from "../components/Icon";
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
          },
        );

        const data = await response.json();

        if (!response.ok || !data.success || !data.target_url) {
          throw new Error(
            data.error ||
              "Dokumen tidak ditemukan atau tautan telah kedaluwarsa.",
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
  const docTypeLabel = isBrs
    ? "BERITA RESMI STATISTIK (BRS)"
    : "PUBLIKASI RESMI BPS";

  return (
    <div className="document-page">
      <header className="document-header">
        <button className="document-brand" onClick={() => navigate("/")}>
          <img src={`${import.meta.env.BASE_URL}bpslogo.png`} alt="" />
          <div>
            <strong>SIGAP BPS</strong>
            <span>BPS Provinsi Gorontalo</span>
          </div>
        </button>
        <div className="header-actions">
          <button
            className="icon-button"
            onClick={handleToggleTheme}
            aria-label={
              theme === "light" ? "Gunakan tema gelap" : "Gunakan tema terang"
            }
          >
            <Icon name={theme === "light" ? "moon" : "sun"} size={19} />
          </button>
          <button
            className="button button-small button-outline"
            onClick={() => navigate("/")}
          >
            <Icon name="chat" size={16} />
            Buka SIGAP
          </button>
        </div>
      </header>
      <main className="document-main">
        <section className="document-card">
          {loading && (
            <div role="status">
              <div className="document-status-icon">
                <span className="spinner" />
              </div>
              <h1>Menyiapkan dokumen</h1>
              <p>Sedang memuat tautan dokumen BPS. Mohon tunggu sebentar.</p>
            </div>
          )}
          {!loading && error && (
            <>
              <div className="document-status-icon danger-text">
                <Icon name="file" size={23} />
              </div>
              <h1>Tautan tidak tersedia</h1>
              <p>{error}</p>
              <button
                className="button button-outline"
                onClick={() => navigate("/")}
              >
                <Icon name="arrow" size={17} />
                Kembali ke SIGAP
              </button>
            </>
          )}
          {!loading && !error && docData && (
            <>
              <div className="document-category">
                <Icon name="file" size={18} />
                {docTypeLabel}
              </div>
              <h1>{docData.title || "Dokumen publikasi BPS"}</h1>
              <p>Badan Pusat Statistik Provinsi Gorontalo</p>
              <div className="document-progress" role="status">
                <span>
                  <span className="spinner" />
                  {countdown > 0
                    ? `Dokumen akan terbuka dalam ${countdown} detik.`
                    : "Membuka dokumen…"}
                </span>
                <div className="document-progress-track">
                  <span style={{ width: `${((2 - countdown) / 2) * 100}%` }} />
                </div>
              </div>
              <div className="document-actions">
                <button onClick={handleOpenNow} className="button">
                  Buka dokumen PDF
                  <Icon name="external" size={16} />
                </button>
                <button onClick={handleAskAI} className="button button-outline">
                  <Icon name="chat" size={17} />
                  Tanyakan isi dokumen ke SIGAP
                </button>
                {docData.bps_web_url && (
                  <a
                    href={docData.bps_web_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      if (redirectTimerRef.current)
                        clearInterval(redirectTimerRef.current);
                    }}
                    className="button button-outline"
                  >
                    Lihat di situs BPS
                    <Icon name="external" size={15} />
                  </a>
                )}
              </div>
              <div className="document-id">
                ID dokumen: {docData.pub_id || slug}
              </div>
            </>
          )}
        </section>
        <footer className="document-footer">
          Badan Pusat Statistik Provinsi Gorontalo
          <br />
          Sistem Informasi Generatif Asisten Pengetahuan
        </footer>
      </main>
    </div>
  );
}
