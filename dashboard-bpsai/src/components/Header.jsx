import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import routes from "../routes";

export default function Header({ onMenuClick }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    // Tambahkan event listener saat komponen dimuat
    document.addEventListener("mousedown", handleClickOutside);
    // Hapus event listener saat komponen dibongkar
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate(routes.login);
    setIsDropdownOpen(false);
  };

  const handleProfile = () => {
    console.log("Profile clicked");
    setIsDropdownOpen(false);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 md:px-6 py-2">
        <div className="flex items-center space-x-3">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 text-gray-600 hover:text-blue-900 rounded-lg"
            aria-label="Open sidebar"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16m-7 6h7"
              />
            </svg>
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-15 h-15 bg-gradient-to-br  rounded-lg flex items-center justify-center">
              <img
                src="/assets/bpslogo.png"
                alt="Logo SIGAP BPS Gorontalo"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-semibold text-gray-900">
                SIGAP BPS
              </h1>
              <p className="hidden md:block text-sm text-gray-500">
                Sistem Informasi Generatif Asisten Pengetahuan BPS Provinsi
                Gorontalo
              </p>
            </div>
          </div>
        </div>

        <div className="relative" ref={dropdownRef}>
          {/* Tombol yang memicu dropdown */}
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-2 p-2 text-gray-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <span className="font-semibold text-sm">Admin</span>
            {/* Ikon panah kecil */}
            <svg
              className={`w-4 h-4 transition-transform ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              ></path>
            </svg>
          </button>

          {/* Menu dropdown yang muncul/hilang */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 border border-gray-200 z-50">
              <a
                href="#profile"
                onClick={handleProfile}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Profile
              </a>
              <a
                href="#logout"
                onClick={handleLogout}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Logout
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
