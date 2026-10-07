import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MoonIcon,
  SunIcon,
  UserIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import routes from "../routes";
import apiFetch from "../services/api";
import useTheme from "../hooks/useTheme";

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [theme, toggleTheme] = useTheme();
  const navigate = useNavigate();
  const handleChange = (event) =>
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const response = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      localStorage.setItem("access_token", response.access_token);
      if (response.refresh_token)
        localStorage.setItem("refresh_token", response.refresh_token);
      if (response.user)
        localStorage.setItem("user", JSON.stringify(response.user));
      navigate(routes.dashboard);
    } catch (err) {
      setError(
        err.message ||
          "Gagal masuk ke sistem. Silakan periksa kredensial Anda.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <header className="login-header">
        <div className="login-brand">
          <img
            src={`${import.meta.env.BASE_URL}assets/bpslogo.png`}
            alt="Badan Pusat Statistik"
          />
          <div>
            <strong>SIGAP BPS</strong>
            <span>BPS Provinsi Gorontalo</span>
          </div>
        </div>
        <button
          className="ui-icon-button"
          onClick={toggleTheme}
          aria-label={
            theme === "light" ? "Gunakan tema gelap" : "Gunakan tema terang"
          }
        >
          {theme === "light" ? <MoonIcon /> : <SunIcon />}
        </button>
      </header>
      <main className="login-main">
        <section className="login-intro">
          <p className="page-eyebrow">Panel administrasi SIGAP</p>
          <h1>
            Kelola layanan.
            <br />
            <span>Jaga kualitas data.</span>
          </h1>
          <p>
            Satu ruang untuk mengelola pengetahuan dan memantau layanan
            informasi statistik BPS Gorontalo.
          </p>
          <div className="login-features">
            <div className="login-feature">
              <DocumentTextIcon />
              <div>
                <strong>Dokumen & pengetahuan</strong>
                <span>Kelola publikasi dan pemetaan topik statistik.</span>
              </div>
            </div>
            <div className="login-feature">
              <ChartBarIcon />
              <div>
                <strong>Pemantauan layanan</strong>
                <span>Tinjau penggunaan, kinerja, dan umpan balik.</span>
              </div>
            </div>
            <div className="login-feature">
              <ChatBubbleLeftRightIcon />
              <div>
                <strong>Riwayat percakapan</strong>
                <span>Telusuri interaksi pengguna untuk evaluasi layanan.</span>
              </div>
            </div>
          </div>
        </section>
        <section className="login-form-card" aria-labelledby="login-title">
          <h2 id="login-title">Masuk ke administrasi</h2>
          <p className="login-form-description">
            Gunakan akun BPS Anda untuk mengakses panel SIGAP.
          </p>
          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="email">Username atau email BPS</label>
              <div className="login-input">
                <UserIcon />
                <input
                  id="email"
                  name="email"
                  type="text"
                  autoComplete="username"
                  required
                  disabled={isLoading}
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Username atau nama@bps.go.id"
                />
              </div>
            </div>
            <div className="login-field">
              <label htmlFor="password">Kata sandi BPS</label>
              <div className="login-input">
                <LockClosedIcon />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Masukkan kata sandi"
                />
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setShowPassword((show) => !show)}
                  aria-label={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            <button
              className="ui-button login-submit"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner" />
                  Memverifikasi akun…
                </>
              ) : (
                <>
                  Masuk ke dashboard
                  <ArrowRightIcon />
                </>
              )}
            </button>
          </form>
          <p className="login-account-note">
            Akses panel ditujukan bagi administrator layanan SIGAP BPS Provinsi
            Gorontalo.
          </p>
        </section>
      </main>
      <footer className="login-footer">
        Badan Pusat Statistik Provinsi Gorontalo · Sistem Informasi Generatif
        Asisten Pengetahuan
      </footer>
    </div>
  );
}
