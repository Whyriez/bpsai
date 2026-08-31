import React, { useState, useEffect, useMemo } from "react";
import apiFetch from "../services/api";
import toast from "react-hot-toast";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  TrashIcon,
  TagIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  SparklesIcon,
  Squares2X2Icon
} from "@heroicons/react/24/outline";

const CATEGORIES = [
  "Semua",
  "Ketenagakerjaan",
  "Kemiskinan & Sosial",
  "Makroekonomi & PDRB",
  "Harga & Inflasi",
  "Indeks Pembangunan Manusia",
  "Pertanian & Pangan",
  "Pariwisata",
  "Kependudukan & Wilayah",
  "Umum"
];

const CATEGORY_COLORS = {
  "Ketenagakerjaan": "bg-blue-100 text-blue-800 border-blue-200",
  "Kemiskinan & Sosial": "bg-amber-100 text-amber-800 border-amber-200",
  "Makroekonomi & PDRB": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Harga & Inflasi": "bg-rose-100 text-rose-800 border-rose-200",
  "Indeks Pembangunan Manusia": "bg-purple-100 text-purple-800 border-purple-200",
  "Pertanian & Pangan": "bg-lime-100 text-lime-800 border-lime-200",
  "Pariwisata": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Kependudukan & Wilayah": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Umum": "bg-gray-100 text-gray-800 border-gray-200",
};

export default function ThematicMappings() {
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" | "edit"
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({
    keyword: "",
    category: "Ketenagakerjaan",
    target_patterns: [],
    description: "",
    is_active: true
  });
  const [patternInput, setPatternInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Mappings
  const fetchMappings = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/thematic-mappings");
      if (res && res.success) {
        setMappings(res.data || []);
      }
    } catch (err) {
      console.error("Gagal mengambil data pemetaan tematik:", err);
      toast.error("Gagal mengambil daftar pemetaan tematik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, []);

  // Filtered Mappings
  const filteredMappings = useMemo(() => {
    return mappings.filter((item) => {
      const matchSearch =
        item.keyword.toLowerCase().includes(search.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(search.toLowerCase())) ||
        (item.target_patterns && item.target_patterns.some(p => p.toLowerCase().includes(search.toLowerCase())));

      const matchCategory =
        selectedCategory === "Semua" || item.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [mappings, search, selectedCategory]);

  // Statistics
  const stats = useMemo(() => {
    const total = mappings.length;
    const active = mappings.filter((m) => m.is_active).length;
    const uniqueCategories = new Set(mappings.map((m) => m.category)).size;
    return { total, active, uniqueCategories };
  }, [mappings]);

  // Handlers for Pattern Tags
  const handleAddPattern = () => {
    const trimmed = patternInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!formData.target_patterns.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        target_patterns: [...prev.target_patterns, trimmed]
      }));
    }
    setPatternInput("");
  };

  const handleRemovePattern = (idxToRemove) => {
    setFormData((prev) => ({
      ...prev,
      target_patterns: prev.target_patterns.filter((_, idx) => idx !== idxToRemove)
    }));
  };

  const handlePatternKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddPattern();
    }
  };

  // Open Modal Add
  const handleOpenAdd = () => {
    setModalMode("add");
    setCurrentId(null);
    setFormData({
      keyword: "",
      category: "Ketenagakerjaan",
      target_patterns: [],
      description: "",
      is_active: true
    });
    setPatternInput("");
    setIsModalOpen(true);
  };

  // Open Modal Edit
  const handleOpenEdit = (item) => {
    setModalMode("edit");
    setCurrentId(item.id);
    setFormData({
      keyword: item.keyword,
      category: item.category || "Umum",
      target_patterns: Array.isArray(item.target_patterns) ? [...item.target_patterns] : [],
      description: item.description || "",
      is_active: item.is_active !== false
    });
    setPatternInput("");
    setIsModalOpen(true);
  };

  // Submit Add / Edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.keyword.trim()) {
      toast.error("Kata kunci (keyword) tidak boleh kosong!");
      return;
    }
    if (formData.target_patterns.length === 0) {
      toast.error("Minimal tambahkan 1 pola publikasi target dokumen!");
      return;
    }

    try {
      setIsSubmitting(true);
      if (modalMode === "add") {
        const res = await apiFetch("/thematic-mappings", {
          method: "POST",
          body: JSON.stringify(formData)
        });
        if (res.success) {
          toast.success("Pemetaan tematik berhasil ditambahkan!");
          setIsModalOpen(false);
          fetchMappings();
        }
      } else {
        const res = await apiFetch(`/thematic-mappings/${currentId}`, {
          method: "PUT",
          body: JSON.stringify(formData)
        });
        if (res.success) {
          toast.success("Pemetaan tematik berhasil diperbarui!");
          setIsModalOpen(false);
          fetchMappings();
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Terjadi kesalahan saat menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Handler
  const handleDelete = async (id, keyword) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus pemetaan untuk "${keyword}"?`)) {
      try {
        const res = await apiFetch(`/thematic-mappings/${id}`, {
          method: "DELETE"
        });
        if (res && res.success) {
          toast.success(`Pemetaan "${keyword}" berhasil dihapus`);
          setMappings((prev) => prev.filter((m) => m.id !== id));
        }
      } catch (err) {
        console.error(err);
        toast.error("Gagal menghapus pemetaan");
      }
    }
  };

  // Toggle Active Handler
  const handleToggleActive = async (item) => {
    try {
      const updatedStatus = !item.is_active;
      const res = await apiFetch(`/thematic-mappings/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: updatedStatus })
      });
      if (res.success) {
        toast.success(`Status ${item.keyword} diubah menjadi ${updatedStatus ? 'Aktif' : 'Non-aktif'}`);
        setMappings(prev => prev.map(m => m.id === item.id ? { ...m, is_active: updatedStatus } : m));
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengubah status pemetaan");
    }
  };

  // Sync / Seed Default Mappings
  const handleSyncDefaults = async () => {
    if (window.confirm("Sinkronkan atau isi ulang daftar pemetaan indikator bawaan resmi BPS?")) {
      try {
        setLoading(true);
        const res = await apiFetch("/thematic-mappings/seed-defaults", {
          method: "POST"
        });
        if (res.success) {
          toast.success(res.message || "Sinkronisasi berhasil!");
          fetchMappings();
        }
      } catch (err) {
        console.error(err);
        toast.error("Gagal melakukan sinkronisasi");
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <SparklesIcon className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Pemetaan Tematik Dokumen
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Atur hubungan indikator & topik statistik ke publikasi tematik primer BPS agar AI selalu mengutip dokumen yang paling relevan.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncDefaults}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-xl transition-all shadow-sm active:scale-95"
            title="Sinkronisasi Pemetaan Bawaan BPS"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin text-blue-500" : ""}`} />
            <span>Sinkronisasi BPS</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95"
          >
            <PlusIcon className="w-4 h-4 stroke-[2.5]" />
            <span>Tambah Pemetaan</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <TagIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Total Pemetaan
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
              {stats.total}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircleIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Aturan Aktif
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats.active} <span className="text-xs font-normal text-gray-400">/ {stats.total}</span>
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Squares2X2Icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Kategori Subjek
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
              {stats.uniqueCategories}
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari indikator (contoh: tpt, kemiskinan, pdrb) atau nama dokumen..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 font-medium">
              Memuat data pemetaan tematik...
            </p>
          </div>
        ) : filteredMappings.length === 0 ? (
          <div className="p-12 text-center">
            <TagIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
            <p className="text-base font-semibold text-gray-700 dark:text-gray-300 mt-3">
              Tidak ada pemetaan tematik ditemukan
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Coba sesuaikan kata kunci pencarian atau tambah pemetaan baru.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/80 dark:bg-gray-700/40 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="py-3.5 px-6">Indikator / Kata Kunci</th>
                  <th className="py-3.5 px-6">Kategori</th>
                  <th className="py-3.5 px-6">Publikasi Tematik Primer Target</th>
                  <th className="py-3.5 px-6">Keterangan</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredMappings.map((item) => {
                  const categoryBadgeColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS["Umum"];
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-blue-50/40 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      {/* Keyword */}
                      <td className="py-4 px-6 font-semibold text-gray-900 dark:text-white">
                        <span className="font-mono px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold border border-gray-200 dark:border-gray-600">
                          {item.keyword}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-6">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${categoryBadgeColor}`}>
                          {item.category}
                        </span>
                      </td>

                      {/* Target Patterns */}
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {item.target_patterns && item.target_patterns.length > 0 ? (
                            item.target_patterns.map((pattern, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-lg border border-blue-200/60 dark:border-blue-800/60"
                              >
                                <DocumentTextIcon className="w-3.5 h-3.5 text-blue-500" />
                                {pattern}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs italic">
                              Tidak ada pola target
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-300 text-xs max-w-xs truncate">
                        {item.description || "-"}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleToggleActive(item)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                            item.is_active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
                              : "bg-gray-100 text-gray-500 border border-gray-200 dark:bg-gray-700 dark:text-gray-400"
                          }`}
                          title="Klik untuk ubah status"
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.is_active ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                            }`}
                          />
                          {item.is_active ? "Aktif" : "Non-aktif"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Edit Pemetaan"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.keyword)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Hapus Pemetaan"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {modalMode === "add" ? "Tambah Pemetaan Tematik" : "Edit Pemetaan Tematik"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Keyword Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                  Kata Kunci / Indikator <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: tpt, kemiskinan, pdrb, padi"
                  value={formData.keyword}
                  onChange={(e) => setFormData({ ...formData, keyword: e.target.value.toLowerCase() })}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                  Kategori Subjek BPS
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.filter(c => c !== "Semua").map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Document Patterns */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                  Pola Nama Publikasi Target <span className="text-rose-500">*</span>
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Ketik kata kunci judul publikasi lalu tekan Enter (contoh: <code>keadaan angkatan kerja</code>)
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ketik pola judul lalu Enter..."
                    value={patternInput}
                    onChange={(e) => setPatternInput(e.target.value)}
                    onKeyDown={handlePatternKeyDown}
                    className="flex-1 px-3.5 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddPattern}
                    className="px-4 py-2 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 font-semibold text-xs rounded-xl transition-all"
                  >
                    Tambah
                  </button>
                </div>

                {/* Pattern Tag List */}
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {formData.target_patterns.map((p, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-xs font-semibold rounded-lg border border-blue-200 dark:border-blue-700"
                    >
                      <span>{p}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePattern(idx)}
                        className="hover:text-rose-500"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                  Keterangan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan singkat indikator..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status Aktif */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Aktifkan pemetaan ini dalam pencarian
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? "Menyimpan..." : modalMode === "add" ? "Simpan Pemetaan" : "Perbarui Pemetaan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
