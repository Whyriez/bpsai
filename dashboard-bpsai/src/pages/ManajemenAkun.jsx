import React, { useState, useEffect, useCallback } from "react";
import apiFetch from "../services/api";
import toast, { Toaster } from "react-hot-toast";

// --- Komponen Ikon SVG ---
const SearchIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"
    />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
);

const KeyIcon = () => (
  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
    />
  </svg>
);

const MailIcon = () => (
  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

// Format tanggal ramah
const formatIndoDate = (dateString) => {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return dateString;
  }
};

export default function ManajemenAkun() {
  const [admins, setAdmins] = useState([]);
  const [stats, setStats] = useState({
    total_admins: 0,
    total_users: 0,
    total_google_users: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Pagination States
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editAdmin, setEditAdmin] = useState(null);
  const [deleteAdmin, setDeleteAdmin] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    name: "",
    role: "admin",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch Data Function (Focus on role=admin)
  const fetchData = useCallback(async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);

      const queryParams = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        search: debouncedSearch,
        role: "admin",
        sort_by: sortBy,
        order: order,
      });

      const [usersRes, statsRes] = await Promise.all([
        apiFetch(`/users?${queryParams.toString()}`),
        apiFetch("/users/stats"),
      ]);

      setAdmins(usersRes.users || []);
      setTotalPages(usersRes.pages || 1);
      setTotalCount(usersRes.total || 0);
      setStats(statsRes || {});

      if (showToast) {
        toast.success("Daftar administrator berhasil dimuat ulang!");
      }
    } catch (err) {
      toast.error(err.message || "Gagal mengambil data administrator.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, perPage, debouncedSearch, sortBy, order]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-generate username from email
  const handleEmailChange = (e) => {
    const emailVal = e.target.value;
    const baseUsername = emailVal.split("@")[0].replace(/[^a-zA-Z0-9._]/g, "").toLowerCase();
    
    setFormData((prev) => ({
      ...prev,
      email: emailVal,
      username: !editAdmin && !prev.usernameTouched ? baseUsername : prev.username,
      name: !editAdmin && !prev.nameTouched ? baseUsername : prev.name,
    }));
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormData({
      email: "",
      username: "",
      name: "",
      role: "admin",
      usernameTouched: false,
      nameTouched: false,
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (admin) => {
    setEditAdmin(admin);
    setFormData({
      email: admin.email,
      username: admin.username,
      name: admin.name || "",
      role: "admin",
    });
    setFormErrors({});
  };

  // Submit Add Admin
  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    setFormErrors({});

    const errors = {};
    if (!formData.email.trim()) errors.email = "Email resmi wajib diisi.";
    if (!formData.username.trim()) errors.username = "Username wajib diisi.";
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setFormLoading(true);
      const res = await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          role: "admin",
        }),
      });

      toast.success(res.message || "Administrator baru berhasil didaftarkan!");
      setIsAddModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Gagal mendaftarkan administrator.");
    } finally {
      setFormLoading(false);
    }
  };

  // Submit Edit Admin
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!editAdmin) return;
    setFormErrors({});

    const errors = {};
    if (!formData.email.trim()) errors.email = "Email resmi wajib diisi.";
    if (!formData.username.trim()) errors.username = "Username wajib diisi.";
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setFormLoading(true);
      const res = await apiFetch(`/users/${editAdmin.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...formData,
          role: "admin",
        }),
      });

      toast.success(res.message || "Data administrator berhasil diperbarui!");
      setEditAdmin(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Gagal memperbarui data administrator.");
    } finally {
      setFormLoading(false);
    }
  };

  // Confirm Delete Admin
  const handleConfirmDelete = async () => {
    if (!deleteAdmin) return;

    try {
      setFormLoading(true);
      const res = await apiFetch(`/users/${deleteAdmin.id}`, {
        method: "DELETE",
      });

      toast.success(res.message || "Administrator berhasil dihapus.");
      setDeleteAdmin(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Gagal menghapus administrator.");
    } finally {
      setFormLoading(false);
    }
  };

  const bpsAdminCount = admins.filter((a) => a.email && a.email.toLowerCase().endsWith("@bps.go.id")).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <Toaster position="top-right" />

      {/* HEADER UTAMA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <ShieldCheckIcon />
            </span>
            Manajemen Administrator
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Kelola daftar akun Administrator yang memiliki wewenang penuh mengelola Dashboard SIGAP BPS.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all disabled:opacity-50"
            title="Muat Ulang Data"
          >
            <span className={refreshing ? "animate-spin" : ""}>
              <RefreshIcon />
            </span>
            <span className="hidden sm:inline">Segarkan</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-all hover:shadow-md"
          >
            <PlusIcon />
            <span>Tambah Admin Baru</span>
          </button>
        </div>
      </div>

      {/* METRIC STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Admin */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between hover:border-blue-200 transition-colors">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Administrator</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.total_admins || 0}</h3>
            <span className="text-xs text-blue-600 mt-0.5 inline-block">Hak akses penuh dashboard</span>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <ShieldCheckIcon />
          </div>
        </div>

        {/* Card 2: Email BPS Resmi */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between hover:border-emerald-200 transition-colors">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Akun Email BPS</p>
            <h3 className="text-2xl font-bold text-emerald-700 mt-1">{bpsAdminCount}</h3>
            <span className="text-xs text-emerald-600 mt-0.5 inline-block">Verifikasi IMAP mail.bps.go.id</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <MailIcon />
          </div>
        </div>

        {/* Card 3: Otentikasi Sistem */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between hover:border-indigo-200 transition-colors">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Metode Login Admin</p>
            <h3 className="text-lg font-bold text-indigo-700 mt-1">IMAP Server BPS</h3>
            <span className="text-xs text-gray-400 mt-0.5 inline-block">Password terpusat BPS</span>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <KeyIcon />
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH CARD */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <SearchIcon />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari administrator berdasarkan nama, username, atau email..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <CloseIcon />
            </button>
          )}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="text-xs font-semibold text-gray-500">Urutkan:</span>
          <select
            value={`${sortBy}-${order}`}
            onChange={(e) => {
              const [sb, ord] = e.target.value.split("-");
              setSortBy(sb);
              setOrder(ord);
            }}
            className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="created_at-desc">Terbaru Ditambahkan</option>
            <option value="created_at-asc">Terlama Ditambahkan</option>
            <option value="name-asc">Nama (A-Z)</option>
            <option value="username-asc">Username (A-Z)</option>
          </select>
        </div>
      </div>

      {/* TABEL DATA ADMINISTRATOR */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/80 text-xs uppercase text-gray-500 border-b border-gray-100 tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Administrator</th>
                <th className="px-6 py-4 font-semibold">Email Resmi</th>
                <th className="px-6 py-4 font-semibold">Otorisasi Hak Akses</th>
                <th className="px-6 py-4 font-semibold">Ditambahkan Pada</th>
                <th className="px-6 py-4 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                // SKELETON LOADING ROWS
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                        <div className="space-y-1.5">
                          <div className="w-28 h-3.5 bg-gray-200 rounded"></div>
                          <div className="w-20 h-3 bg-gray-100 rounded"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="w-36 h-3.5 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4"><div className="w-24 h-5 bg-gray-200 rounded-full"></div></td>
                    <td className="px-6 py-4"><div className="w-28 h-3.5 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4"><div className="w-16 h-7 bg-gray-200 rounded mx-auto"></div></td>
                  </tr>
                ))
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="p-3 bg-gray-50 rounded-full text-gray-300">
                        <ShieldCheckIcon />
                      </div>
                      <p className="font-medium text-gray-600">Tidak ada administrator yang cocok dengan pencarian.</p>
                      <p className="text-xs text-gray-400">Coba ubah kata kunci pencarian Anda.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                admins.map((admin) => {
                  const initial = (admin.name || admin.username || "A").charAt(0).toUpperCase();

                  return (
                    <tr
                      key={admin.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* Avatar & Admin Details */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {admin.picture ? (
                            <img
                              src={admin.picture}
                              alt={admin.name || admin.username}
                              className="w-10 h-10 rounded-full object-cover border border-gray-200"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                              {initial}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-gray-900">
                              {admin.name || admin.username}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">@{admin.username}</div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4 text-gray-700 font-mono text-xs">
                        {admin.email}
                      </td>

                      {/* Role Badge */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full shadow-2xs">
                          <ShieldCheckIcon />
                          <span>Full Admin Dashboard</span>
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {formatIndoDate(admin.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(admin)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Data Admin"
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={() => setDeleteAdmin(admin)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus Hak Akses Admin"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION BAR */}
        <div className="px-6 py-4 bg-gray-50/60 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div>
            Menampilkan <span className="font-semibold text-gray-700">{admins.length}</span> dari{" "}
            <span className="font-semibold text-gray-700">{totalCount}</span> administrator
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Sebelumnya
            </button>
            <span className="px-2 font-medium text-gray-700">
              Halaman {page} dari {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL TAMBAH ADMINISTRATOR BARU                           */}
      {/* ========================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 transform transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <PlusIcon />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Tambah Administrator Baru</h3>
                  <p className="text-xs text-gray-500">Berikan wewenang akses Administrator ke Dashboard SIGAP BPS.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="space-y-4 mt-4">
              {/* Email Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Email Resmi BPS <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="contoh: nama.pegawai@bps.go.id"
                  value={formData.email}
                  onChange={handleEmailChange}
                  className={`w-full px-3.5 py-2.5 bg-gray-50 border ${
                    formErrors.email ? "border-red-400 bg-red-50/20" : "border-gray-200"
                  } rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all`}
                />
                {formErrors.email && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                )}
                <p className="text-[11px] text-gray-400 mt-1">
                  Gunakan email resmi BPS. Saat login, sistem memverifikasi password langsung ke server <code>mail.bps.go.id</code>.
                </p>
              </div>

              {/* Username Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="contoh: namapegawai"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      username: e.target.value.toLowerCase().replace(/[^a-zA-Z0-9._]/g, ""),
                      usernameTouched: true,
                    }))
                  }
                  className={`w-full px-3.5 py-2.5 bg-gray-50 border ${
                    formErrors.username ? "border-red-400 bg-red-50/20" : "border-gray-200"
                  } rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono`}
                />
                {formErrors.username && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.username}</p>
                )}
              </div>

              {/* Name Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Nama Lengkap & Gelar (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="contoh: Budi Santoso, S.Si"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value, nameTouched: true }))
                  }
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {formLoading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>Daftarkan Administrator</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL EDIT ADMINISTRATOR                                  */}
      {/* ========================================================= */}
      {editAdmin && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 transform transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <EditIcon />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Edit Data Administrator</h3>
                  <p className="text-xs text-gray-500">Perbarui profil administrator @{editAdmin.username}</p>
                </div>
              </div>
              <button
                onClick={() => setEditAdmin(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="space-y-4 mt-4">
              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      username: e.target.value.toLowerCase().replace(/[^a-zA-Z0-9._]/g, ""),
                    }))
                  }
                  className={`w-full px-3.5 py-2.5 bg-gray-50 border ${
                    formErrors.username ? "border-red-400 bg-red-50/20" : "border-gray-200"
                  } rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono`}
                />
                {formErrors.username && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.username}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Email Resmi BPS <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className={`w-full px-3.5 py-2.5 bg-gray-50 border ${
                    formErrors.email ? "border-red-400 bg-red-50/20" : "border-gray-200"
                  } rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all`}
                />
                {formErrors.email && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditAdmin(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {formLoading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL KONFIRMASI HAPUS ADMINISTRATOR                      */}
      {/* ========================================================= */}
      {deleteAdmin && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <TrashIcon />
            </div>

            <h3 className="text-lg font-bold text-gray-900 text-center">Hapus Administrator?</h3>
            <p className="text-sm text-gray-500 text-center mt-2">
              Apakah Anda yakin ingin mencabut hak akses Administrator untuk{" "}
              <strong className="text-gray-800">@{deleteAdmin.username}</strong> ({deleteAdmin.email})? Akun ini tidak akan bisa lagi mengakses Dashboard Admin.
            </p>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteAdmin(null)}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors w-full"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={formLoading}
                onClick={handleConfirmDelete}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-all w-full disabled:opacity-50"
              >
                {formLoading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
