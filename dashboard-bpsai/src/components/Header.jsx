import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bars3BottomLeftIcon,
  MoonIcon,
  SunIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

const pageLabels = {
  "/dashboard": "Beranda",
  "/analytics": "Analisis",
  "/feedback": "Umpan balik",
  "/manajemen-dokumen": "Data dokumen",
  "/thematic-mappings": "Pemetaan tematik",
  "/whatsapp-chat": "Riwayat WhatsApp",
  "/manage-api-keys": "Kunci API",
  "/manajemen-akun": "Manajemen admin",
  "/settings": "Pengaturan",
  "/developer": "Tentang pengembang",
};

export default function Header({
  onMenuClick,
  sidebarOpen,
  theme,
  onThemeToggle,
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();
  const name = user?.name || user?.username || "Administrator";
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const title = pageLabels[location.pathname] || "Detail dokumen";

  useEffect(() => {
    if (!isDropdownOpen) return;
    const dismiss = (event) => {
      if (!dropdownRef.current?.contains(event.target))
        setIsDropdownOpen(false);
    };
    const escape = (event) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [isDropdownOpen]);

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <header className="admin-header">
      <div className="admin-header-context">
        <button
          className="ui-icon-button"
          onClick={onMenuClick}
          aria-label={
            sidebarOpen ? "Tutup panel navigasi" : "Buka panel navigasi"
          }
          aria-expanded={sidebarOpen}
          aria-controls="admin-sidebar"
        >
          <Bars3BottomLeftIcon />
        </button>
        <span className="admin-header-divider" />
        <div className="admin-breadcrumb">
          <span>Administrasi</span>
          <span>/</span>
          <strong>{title}</strong>
        </div>
      </div>
      <div className="admin-header-actions">
        <button
          className="ui-icon-button"
          onClick={onThemeToggle}
          aria-label={
            theme === "light" ? "Gunakan tema gelap" : "Gunakan tema terang"
          }
          title={
            theme === "light" ? "Gunakan tema gelap" : "Gunakan tema terang"
          }
        >
          {theme === "light" ? <MoonIcon /> : <SunIcon />}
        </button>
        <div className="admin-profile" ref={dropdownRef}>
          <button
            className="admin-profile-button"
            ref={buttonRef}
            onClick={() => setIsDropdownOpen((open) => !open)}
            aria-label="Menu akun"
            aria-expanded={isDropdownOpen}
            aria-controls="admin-account-menu"
          >
            <span className="admin-initials">{initials}</span>
            <span className="admin-profile-name">{name}</span>
            <ChevronDownIcon />
          </button>
          {isDropdownOpen && (
            <div className="admin-profile-menu" id="admin-account-menu">
              <div>
                <strong>{name}</strong>
                <span>{user?.email || "Administrator SIGAP"}</span>
              </div>
              <button
                onClick={() => {
                  navigate("/settings");
                  setIsDropdownOpen(false);
                }}
              >
                <Cog6ToothIcon />
                Pengaturan
              </button>
              <button onClick={logout}>
                <ArrowRightOnRectangleIcon />
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
