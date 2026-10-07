import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";
import UserAvatar from "./UserAvatar";

export default function Header({
  onThemeToggle,
  theme,
  onToggleSidebar,
  sidebarOpen,
  title,
  onOpenGoogleLogin,
  onDeleteAccount,
}) {
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const profileButtonRef = useRef(null);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const dismiss = (event) => {
      if (!dropdownRef.current?.contains(event.target))
        setIsDropdownOpen(false);
    };
    const escape = (event) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
        profileButtonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [isDropdownOpen]);

  return (
    <header className="app-header">
      <div className="header-context">
        <button
          className="icon-button"
          onClick={onToggleSidebar}
          title={sidebarOpen ? "Tutup panel riwayat" : "Buka panel riwayat"}
          aria-label={
            sidebarOpen ? "Tutup panel riwayat" : "Buka panel riwayat"
          }
          aria-expanded={sidebarOpen}
          aria-controls="conversation-sidebar"
        >
          <Icon name="panel" />
        </button>
        <span className="header-divider" />
        <div className="header-title">
          <span className="header-mobile-brand">SIGAP BPS</span>
          <span className="header-conversation" title={title}>
            {title || "Percakapan baru"}
          </span>
        </div>
      </div>
      <div className="header-actions">
        <button
          className="icon-button"
          onClick={onThemeToggle}
          title={
            theme === "light" ? "Gunakan tema gelap" : "Gunakan tema terang"
          }
          aria-label={
            theme === "light" ? "Gunakan tema gelap" : "Gunakan tema terang"
          }
        >
          <Icon name={theme === "light" ? "moon" : "sun"} size={19} />
        </button>
        {user ? (
          <div className="profile-dropdown" ref={dropdownRef}>
            <button
              ref={profileButtonRef}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="profile-button"
              aria-label="Menu akun"
              aria-expanded={isDropdownOpen}
              aria-controls="account-menu"
            >
              <UserAvatar user={user} />
              <span className="profile-name">{user.name || user.username}</span>
              <Icon name="chevron" size={15} />
            </button>
            {isDropdownOpen && (
              <div className="dropdown-menu" id="account-menu">
                <div className="dropdown-identity">
                  <strong>{user.name || user.username}</strong>
                  <span>{user.email}</span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setIsDropdownOpen(false);
                  }}
                >
                  <Icon name="logout" size={17} />
                  Keluar
                </button>
                <button
                  className="danger-text"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onDeleteAccount?.();
                  }}
                >
                  <Icon name="trash" size={17} />
                  Hapus akun
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenGoogleLogin}
            className="button button-small button-outline"
          >
            <Icon name="user" size={16} />
            Masuk
          </button>
        )}
      </div>
    </header>
  );
}
