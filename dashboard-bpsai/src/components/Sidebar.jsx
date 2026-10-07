import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import {
  ChartBarIcon,
  PresentationChartLineIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  TagIcon,
  ChatBubbleBottomCenterTextIcon,
  KeyIcon,
  UsersIcon,
  Cog6ToothIcon,
  BookOpenIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const groups = [
  {
    label: "Pemantauan",
    items: [
      { to: "/dashboard", label: "Beranda", icon: ChartBarIcon },
      { to: "/analytics", label: "Analisis", icon: PresentationChartLineIcon },
      {
        to: "/feedback",
        label: "Umpan balik",
        icon: ChatBubbleBottomCenterTextIcon,
      },
    ],
  },
  {
    label: "Konten & percakapan",
    items: [
      {
        to: "/manajemen-dokumen",
        label: "Data dokumen",
        icon: DocumentTextIcon,
      },
      { to: "/thematic-mappings", label: "Pemetaan tematik", icon: TagIcon },
      {
        to: "/whatsapp-chat",
        label: "Riwayat WhatsApp",
        icon: ChatBubbleLeftRightIcon,
      },
    ],
  },
  {
    label: "Administrasi",
    items: [
      { to: "/manage-api-keys", label: "Kunci API", icon: KeyIcon },
      { to: "/manajemen-akun", label: "Manajemen admin", icon: UsersIcon },
      { to: "/settings", label: "Pengaturan", icon: Cog6ToothIcon },
    ],
  },
];

export default function Sidebar({ isOpen, onClose, onNavigate }) {
  const sidebarRef = useRef(null);
  useEffect(() => {
    if (!isOpen || !window.matchMedia("(max-width: 899px)").matches) return;
    const previous = document.activeElement;
    sidebarRef.current?.querySelector("button")?.focus();
    const keydown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const controls = sidebarRef.current?.querySelectorAll("button, a[href]");
      const first = controls?.[0];
      const last = controls?.[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      if (previous?.isConnected) previous.focus();
    };
  }, [isOpen, onClose]);

  return (
    <>
      {isOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        ref={sidebarRef}
        id="admin-sidebar"
        className={`admin-sidebar ${isOpen ? "is-open" : ""}`}
        inert={!isOpen}
        aria-label="Navigasi administrasi"
      >
        <div className="admin-brand">
          <img
            src={`${import.meta.env.BASE_URL}assets/bpslogo.png`}
            alt="Badan Pusat Statistik"
            width="37"
            height="37"
          />
          <div>
            <strong>
              SIGAP<span>BPS</span>
            </strong>
            <p>Panel administrasi</p>
          </div>
          <button
            className="ui-icon-button sidebar-close"
            onClick={onClose}
            aria-label="Tutup navigasi"
          >
            <XMarkIcon />
          </button>
        </div>
        <nav className="admin-navigation">
          {groups.map((group) => (
            <section key={group.label}>
              <h2>{group.label}</h2>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `admin-nav-link ${isActive ? "is-active" : ""}`
                  }
                >
                  <item.icon />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </section>
          ))}
        </nav>
        <footer className="admin-sidebar-footer">
          <BookOpenIcon />
          <div>
            <strong>BPS Provinsi Gorontalo</strong>
            <span>Sistem Informasi Generatif Asisten Pengetahuan</span>
          </div>
        </footer>
      </aside>
    </>
  );
}
