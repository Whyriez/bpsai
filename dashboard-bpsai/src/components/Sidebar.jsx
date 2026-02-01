import React from "react";
import { NavLink } from "react-router-dom";

// --- Komponen Ikon ---
// Ikon-ikon ini dibuat dari SVG yang Anda berikan.

const DashboardIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
);

const AddNewsIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
    />
  </svg>
);

const DataBrsIcon = () => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    className="w-6 h-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 13h6M9 17h6"
    />
  </svg>
);

const AnalyticsIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
    />
  </svg>
);

const DocumentIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const FeedbackIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
    />
  </svg>
);

const SettingsIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const KeyIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
    />
  </svg>
);

const NavItem = ({ to, children, onClick, icon }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `sidebar-item flex items-center space-x-3 text-left px-4 py-3 rounded-lg transition-all ${
        isActive
          ? "bg-blue-700 text-white"
          : "text-blue-100 hover:text-white hover:bg-white/10"
      }`
    }
  >
    <div className="w-5 h-5">{icon}</div>
    <span className="font-medium">{children}</span>
  </NavLink>
);

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity md:hidden ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      ></div>

      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-blue-900 to-blue-800 shadow-xl p-4 z-50 transform transition-transform duration-300 ease-in-out
          md:static md:translate-x-0 
          ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <nav className="space-y-2">
          <NavItem to="/dashboard" onClick={onClose} icon={<DashboardIcon />}>
            Beranda
          </NavItem>
          <NavItem
            to="/berita-resmi-statistik"
            onClick={onClose}
            icon={<DataBrsIcon />}
          >
            {" "}
            Data BRS
          </NavItem>
          <NavItem
            to="/manajemen-dokumen"
            onClick={onClose}
            icon={<DocumentIcon />}
          >
            Data Dokumen
          </NavItem>
          <NavItem to="/analytics" onClick={onClose} icon={<AnalyticsIcon />}>
            Analisis
          </NavItem>
          <NavItem to="/feedback" onClick={onClose} icon={<FeedbackIcon />}>
            Umpan Balik
          </NavItem>
          <NavItem to="/manage-api-keys" onClick={onClose} icon={<KeyIcon />}>
            Data API Key
          </NavItem>
          <NavItem to="/settings" onClick={onClose} icon={<SettingsIcon />}>
            Pengaturan
          </NavItem>
        </nav>
      </aside>
    </>
  );
}
