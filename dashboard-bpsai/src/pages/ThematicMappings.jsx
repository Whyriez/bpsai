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
  Squares2X2Icon,
  ListBulletIcon,
  BeakerIcon,
  FunnelIcon,
  CheckIcon,
  InformationCircleIcon,
  ArrowTopRightOnSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon
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

const CATEGORY_META = {
  "Semua": { icon: <TagIcon className="w-3.5 h-3.5" />, color: "blue", bg: "bg-accent-soft text-accent border-blue-200 dark:bg-accent-soft/30 dark:text-accent dark:border-blue-800" },
  "Ketenagakerjaan": { icon: <TagIcon className="w-3.5 h-3.5" />, color: "blue", bg: "bg-accent-soft text-accent border-blue-200 dark:bg-accent-soft/30 dark:text-accent dark:border-blue-800" },
  "Kemiskinan & Sosial": { icon: <TagIcon className="w-3.5 h-3.5" />, color: "amber", bg: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800" },
  "Makroekonomi & PDRB": { icon: <TagIcon className="w-3.5 h-3.5" />, color: "emerald", bg: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800" },
  "Harga & Inflasi": { icon: <TagIcon className="w-3.5 h-3.5" />, color: "rose", bg: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800" },
  "Indeks Pembangunan Manusia": { icon: <TagIcon className="w-3.5 h-3.5" />, color: "purple", bg: "bg-accent-soft text-accent border-purple-200 dark:bg-accent-soft/30 dark:text-accent dark:border-purple-800" },
  "Pertanian & Pangan": { icon: <TagIcon className="w-3.5 h-3.5" />, color: "lime", bg: "bg-lime-50 text-lime-900 border-lime-300 dark:bg-lime-900/30 dark:text-lime-300 dark:border-lime-800" },
  "Pariwisata": { icon: <TagIcon className="w-3.5 h-3.5" />, color: "cyan", bg: "bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800" },
  "Kependudukan & Wilayah": { icon: <TagIcon className="w-3.5 h-3.5" />, color: "indigo", bg: "bg-accent-soft text-accent border-indigo-200 dark:bg-accent-soft/30 dark:text-accent dark:border-indigo-800" },
  "Umum": { icon: <TagIcon className="w-3.5 h-3.5" />, color: "gray", bg: "bg-subtle text-ink border-line dark:bg-surface dark:text-ink dark:border-line" },
};

const COMMON_BPS_PATTERNS = [
  "provinsi gorontalo dalam angka",
  "keadaan angkatan kerja",
  "statistik kesejahteraan rakyat",
  "produk domestik regional bruto",
  "indikator pasar tenaga kerja",
  "perkembangan indeks harga konsumen",
  "luas panen dan produksi padi",
  "profil kemiskinan",
  "indeks pembangunan manusia",
  "statistik pariwisata",
  "indikator pertanian",
  "hasil sensus penduduk"
];

export default function ThematicMappings() {
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | ACTIVE | INACTIVE
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"
  const [sortBy, setSortBy] = useState("keyword_asc"); // keyword_asc | keyword_desc | category | patterns_count

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  // Simulator Drawer State
  const [showSimulator, setShowSimulator] = useState(false);
  const [simQuery, setSimQuery] = useState("Berapa tingkat pengangguran terbuka (TPT) dan angka kemiskinan di Provinsi Gorontalo?");

  // Custom Confirmation Modal (Anti-Native Alert)
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Ya, Lanjutkan",
    confirmColor: "blue",
    onConfirm: null
  });

  // Modal Add / Edit state
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

  // Filtered & Sorted Mappings
  const filteredAndSortedMappings = useMemo(() => {
    let result = mappings.filter((item) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search.trim() ||
        item.keyword.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.target_patterns && item.target_patterns.some(p => p.toLowerCase().includes(q)));

      const matchCategory =
        selectedCategory === "Semua" || item.category === selectedCategory;

      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && item.is_active) ||
        (statusFilter === "INACTIVE" && !item.is_active);

      return matchSearch && matchCategory && matchStatus;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "keyword_asc") return a.keyword.localeCompare(b.keyword);
      if (sortBy === "keyword_desc") return b.keyword.localeCompare(a.keyword);
      if (sortBy === "category") return (a.category || "").localeCompare(b.category || "");
      if (sortBy === "patterns_count") return (b.target_patterns?.length || 0) - (a.target_patterns?.length || 0);
      return 0;
    });

    return result;
  }, [mappings, search, selectedCategory, statusFilter, sortBy]);

  // Paginated Mappings
  const paginatedMappings = useMemo(() => {
    if (itemsPerPage === 0) return filteredAndSortedMappings;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedMappings.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedMappings, currentPage, itemsPerPage]);

  const totalPages = itemsPerPage > 0 ? Math.ceil(filteredAndSortedMappings.length / itemsPerPage) : 1;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, statusFilter, sortBy, itemsPerPage]);

  // Statistics
  const stats = useMemo(() => {
    const total = mappings.length;
    const active = mappings.filter((m) => m.is_active).length;
    const inactive = total - active;
    const uniqueCategories = new Set(mappings.map((m) => m.category || "Umum")).size;
    const totalPatterns = mappings.reduce((acc, m) => acc + (m.target_patterns?.length || 0), 0);
    const activePercentage = total > 0 ? Math.round((active / total) * 100) : 0;
    return { total, active, inactive, uniqueCategories, totalPatterns, activePercentage };
  }, [mappings]);

  // AI Matching Simulator Result
  const simulatorMatches = useMemo(() => {
    if (!simQuery || !simQuery.trim()) return [];
    const lowerQuery = simQuery.toLowerCase();
    
    // Check against active mappings
    return mappings
      .filter((m) => m.is_active)
      .map((m) => {
        const kw = m.keyword.toLowerCase();
        // Regex word boundary or includes
        const isMatched = lowerQuery.includes(kw);
        return {
          ...m,
          isMatched,
        };
      })
      .filter((m) => m.isMatched);
  }, [mappings, simQuery]);

  // Handlers for Pattern Tags in Modal
  const handleAddPattern = (patternToAdd = null) => {
    const raw = patternToAdd !== null ? patternToAdd : patternInput;
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed) return;
    if (!formData.target_patterns.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        target_patterns: [...prev.target_patterns, trimmed]
      }));
    }
    if (patternToAdd === null) {
      setPatternInput("");
    }
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

  // Delete Handler with Custom Dialog
  const handleDelete = (id, keyword) => {
    setConfirmDialog({
      isOpen: true,
      title: "Hapus Aturan Pemetaan Tematik?",
      message: `Pemetaan untuk kata kunci "${keyword}" akan dihapus permanen. AI tidak akan lagi memprioritaskan dokumen target untuk indikator ini.`,
      confirmText: "Ya, Hapus Pemetaan",
      confirmColor: "rose",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
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
    });
  };

  // Toggle Active Handler
  const handleToggleActive = async (item) => {
    try {
      const updatedStatus = !item.is_active;
      // Optimistic update
      setMappings(prev => prev.map(m => m.id === item.id ? { ...m, is_active: updatedStatus } : m));
      
      const res = await apiFetch(`/thematic-mappings/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: updatedStatus })
      });
      if (res.success) {
        toast.success(`Status ${item.keyword} diubah menjadi ${updatedStatus ? 'Aktif' : 'Non-aktif'}`);
      } else {
        // Rollback
        setMappings(prev => prev.map(m => m.id === item.id ? { ...m, is_active: !updatedStatus } : m));
        toast.error("Gagal mengubah status pemetaan");
      }
    } catch (err) {
      console.error(err);
      // Rollback
      setMappings(prev => prev.map(m => m.id === item.id ? { ...m, is_active: !item.is_active } : m));
      toast.error("Gagal mengubah status pemetaan");
    }
  };

  // Sync / Seed Default Mappings with Custom Dialog
  const handleSyncDefaults = () => {
    setConfirmDialog({
      isOpen: true,
      title: "Sinkronisasi Kamus Tematik BPS?",
      message: "Sistem akan memeriksa dan menyuntikkan kembali pemetaan indikator bawaan resmi BPS (seperti TPT, Kemiskinan, PDRB, Inflasi, IPM) yang belum terdaftar di sistem.",
      confirmText: "Ya, Sinkronkan Sekarang",
      confirmColor: "blue",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
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
    });
  };

  return (
    <div className="space-y-6 pb-12 max-w-full">
      <div className="page-intro">
        <div><p className="page-eyebrow">Konten & pengetahuan</p><h1>Pemetaan tematik dokumen</h1><p>Hubungkan indikator statistik dengan publikasi BPS yang menjadi rujukannya.</p></div>
        <div className="page-intro-actions">
          <button onClick={() => setShowSimulator(!showSimulator)} className="ui-button ui-button-outline" title="Coba pencocokan pertanyaan dengan pemetaan tematik"><BeakerIcon />{showSimulator ? 'Tutup simulator' : 'Uji pemetaan'}</button>
          <button onClick={handleSyncDefaults} className="ui-button ui-button-outline" title="Sinkronisasi pemetaan bawaan BPS"><ArrowPathIcon className={loading ? 'animate-spin' : ''} />Sinkronisasi BPS</button>
          <button onClick={handleOpenAdd} className="ui-button"><PlusIcon />Tambah pemetaan</button>
        </div>
      </div>
      {/* Simulator AI Matching Drawer / Banner */}
      {showSimulator && (
        <div className="bg-subtle dark:from-gray-800 dark:to-gray-800/90 border-2 border-amber-300/80 dark:border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-md animate-fadeIn space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-500 text-white rounded-xl shadow-sm">
                <BeakerIcon className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-ink dark:text-white text-sm sm:text-base">
                  Simulator Deteksi Query Tematik AI
                </h3>
                <p className="text-xs text-muted dark:text-muted">
                  Ketik pertanyaan simulasi pengguna untuk melihat aturan tematik mana yang terpicu secara real-time.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSimulator(false)}
              className="p-1.5 text-faint hover:text-muted rounded-lg"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={simQuery}
              onChange={(e) => setSimQuery(e.target.value)}
              placeholder="Ketik pertanyaan untuk diuji (contoh: Berapa TPT dan angka kemiskinan?)..."
              className="flex-1 px-4 py-2.5 bg-surface dark:bg-surface border border-amber-200 dark:border-line rounded-xl text-xs sm:text-sm text-ink dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium shadow-2xs"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSimQuery("Berapa angka pengangguran terbuka (TPT) di Gorontalo?")}
                className="px-2.5 py-1.5 bg-surface/80 hover:bg-surface text-[11px] font-semibold text-ink rounded-lg border border-amber-200 cursor-pointer"
              >
                Contoh: TPT
              </button>
              <button
                type="button"
                onClick={() => setSimQuery("Bagaimana perkembangan kemiskinan dan pengeluaran per kapita?")}
                className="px-2.5 py-1.5 bg-surface/80 hover:bg-surface text-[11px] font-semibold text-ink rounded-lg border border-amber-200 cursor-pointer"
              >
                Contoh: Kemiskinan
              </button>
              <button
                type="button"
                onClick={() => setSimQuery("Berapa laju pertumbuhan ekonomi dan PDRB ADHK Gorontalo?")}
                className="px-2.5 py-1.5 bg-surface/80 hover:bg-surface text-[11px] font-semibold text-ink rounded-lg border border-amber-200 cursor-pointer"
              >
                Contoh: PDRB
              </button>
            </div>
          </div>

          {/* Simulator Output */}
          <div className="bg-surface/80 dark:bg-surface/60 p-4 rounded-2xl border border-amber-200/80 dark:border-line">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-ink dark:text-ink flex items-center gap-1.5">
                <span>Hasil Analisis Router Tematik:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  {simulatorMatches.length} Aturan Terpicu
                </span>
              </span>
            </div>

            {simulatorMatches.length === 0 ? (
              <p className="text-xs text-muted italic py-2">
                Tidak ada kata kunci tematik yang cocok dalam query di atas. AI akan menggunakan pencarian semantik umum (tanpa pembobotan prioritas dokumen khusus).
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {simulatorMatches.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-surface dark:bg-surface rounded-xl border border-amber-300 dark:border-amber-600/50 shadow-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-accent-soft text-accent border border-blue-200">
                        {m.keyword}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                        {m.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted dark:text-ink">
                      <strong>Dokumen Target Prioritas:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {m.target_patterns?.map((pat, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-accent-soft text-accent border border-blue-200 text-[10px] font-semibold"
                          >
                            📄 {pat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Total Mappings */}
        <div
          onClick={() => { setStatusFilter("ALL"); setSelectedCategory("Semua"); }}
          className="bg-surface dark:bg-surface p-4 sm:p-5 rounded-2xl shadow-sm border border-line dark:border-line flex items-center justify-between cursor-pointer hover:border-blue-300 transition-all group"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-faint group-hover:text-accent transition-colors">
              Total Pemetaan
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-ink dark:text-white mt-1">
              {stats.total}
            </p>
            <p className="text-[11px] text-faint mt-1">
              {stats.uniqueCategories} Kategori Subjek
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-accent-soft dark:bg-accent-soft/30 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
            <TagIcon className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Active Rules with Percentage */}
        <div
          onClick={() => setStatusFilter("ACTIVE")}
          className={`bg-surface dark:bg-surface p-4 sm:p-5 rounded-2xl shadow-sm border flex items-center justify-between cursor-pointer transition-all group ${
            statusFilter === "ACTIVE"
              ? "border-emerald-500 ring-2 ring-emerald-500/20"
              : "border-line dark:border-line hover:border-emerald-300"
          }`}
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-faint group-hover:text-emerald-600 transition-colors">
              Aturan Aktif
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.active}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-16 h-1.5 bg-subtle rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${stats.activePercentage}%` }}
                />
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold">{stats.activePercentage}%</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
            <CheckCircleIcon className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Non-active Rules */}
        <div
          onClick={() => setStatusFilter("INACTIVE")}
          className={`bg-surface dark:bg-surface p-4 sm:p-5 rounded-2xl shadow-sm border flex items-center justify-between cursor-pointer transition-all group ${
            statusFilter === "INACTIVE"
              ? "border-amber-500 ring-2 ring-amber-500/20"
              : "border-line dark:border-line hover:border-amber-300"
          }`}
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-faint group-hover:text-amber-600 transition-colors">
              Non-Aktif / Terjeda
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-ink dark:text-ink mt-1">
              {stats.inactive}
            </p>
            <p className="text-[11px] text-faint mt-1">
              {stats.inactive > 0 ? "Bisa diaktifkan kapan saja" : "Semua aturan aktif"}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
            <XCircleIcon className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Total Target Patterns */}
        <div className="bg-surface dark:bg-surface p-4 sm:p-5 rounded-2xl shadow-sm border border-line dark:border-line flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-faint">
              Pola Judul Terhubung
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-accent dark:text-accent mt-1">
              {stats.totalPatterns}
            </p>
            <p className="text-[11px] text-faint mt-1">
              Rata-rata {(stats.total > 0 ? (stats.totalPatterns / stats.total).toFixed(1) : 0)} pola / aturan
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-accent-soft dark:bg-accent-soft/30 flex items-center justify-center text-accent">
            <DocumentTextIcon className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter, Search & View Controls Bar */}
      <div className="bg-surface dark:bg-surface p-4 sm:p-5 rounded-3xl shadow-sm border border-line dark:border-line space-y-4">
        {/* Row 1: Search, Status Tabs, Sorting & View Toggle */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari indikator (tpt, pdrb, kemiskinan) atau pola publikasi target..."
              className="w-full pl-10 pr-9 py-2.5 bg-subtle dark:bg-surface/50 border border-line dark:border-line rounded-2xl text-xs sm:text-sm text-ink dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-muted p-1"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right Toolbar Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter Tabs */}
            <div className="flex items-center bg-subtle dark:bg-surface p-1 rounded-xl text-xs font-semibold text-muted dark:text-ink">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === "ALL" ? "bg-surface dark:bg-surface text-accent shadow-2xs font-bold" : "hover:text-ink"
                }`}
              >
                Semua ({stats.total})
              </button>
              <button
                onClick={() => setStatusFilter("ACTIVE")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === "ACTIVE" ? "bg-surface dark:bg-surface text-emerald-700 shadow-2xs font-bold" : "hover:text-ink"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Aktif ({stats.active})
              </button>
              <button
                onClick={() => setStatusFilter("INACTIVE")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === "INACTIVE" ? "bg-surface dark:bg-surface text-amber-700 shadow-2xs font-bold" : "hover:text-ink"
                }`}
              >
                Jeda ({stats.inactive})
              </button>
            </div>

            {/* Sorting Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-subtle dark:bg-surface border border-line dark:border-line rounded-xl text-xs font-medium text-ink dark:text-ink focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="keyword_asc">Urutkan: Kata Kunci (A - Z)</option>
              <option value="keyword_desc">Urutkan: Kata Kunci (Z - A)</option>
              <option value="category">Urutkan: Kategori</option>
              <option value="patterns_count">Urutkan: Pola Terbanyak</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-subtle dark:bg-surface p-1 rounded-xl">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "grid" ? "bg-surface dark:bg-surface text-accent shadow-2xs" : "text-muted hover:text-ink"
                }`}
                title="Tampilan Grid Kartu"
              >
                <Squares2X2Icon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "table" ? "bg-surface dark:bg-surface text-accent shadow-2xs" : "text-muted hover:text-ink"
                }`}
                title="Tampilan Tabel Rinci"
              >
                <ListBulletIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Category Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            const meta = CATEGORY_META[cat] || CATEGORY_META["Umum"];
            const count = cat === "Semua" ? mappings.length : mappings.filter(m => m.category === cat).length;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-sm font-bold"
                    : "bg-subtle/80 dark:bg-surface/60 text-ink dark:text-ink hover:bg-hover dark:hover:bg-gray-600"
                }`}
              >
                <span>{meta.icon}</span>
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? "bg-blue-700 text-white" : "bg-hover dark:bg-gray-600 text-ink dark:text-ink"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-surface dark:bg-surface rounded-3xl p-16 text-center border border-line dark:border-line shadow-sm">
          <div className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-muted dark:text-ink mt-4 font-semibold">
            Memuat data pemetaan tematik dokumen...
          </p>
        </div>
      ) : filteredAndSortedMappings.length === 0 ? (
        <div className="bg-surface dark:bg-surface rounded-3xl p-16 text-center border border-line dark:border-line shadow-sm space-y-3">
          <div className="w-16 h-16 rounded-full bg-accent-soft dark:bg-accent-soft/30 text-accent flex items-center justify-center mx-auto">
            <TagIcon className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-ink dark:text-white">
            Tidak ada pemetaan tematik yang cocok
          </h3>
          <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
            Tidak ditemukan pemetaan untuk kata kunci <strong>"{search}"</strong> atau filter kategori saat ini. Coba sesuaikan pencarian atau tambahkan aturan pemetaan baru.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            {(search || selectedCategory !== "Semua" || statusFilter !== "ALL") && (
              <button
                onClick={() => { setSearch(""); setSelectedCategory("Semua"); setStatusFilter("ALL"); }}
                className="px-4 py-2 bg-subtle text-ink rounded-xl text-xs font-semibold hover:bg-hover transition-colors"
              >
                Reset Filter
              </button>
            )}
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              + Tambah Aturan Baru
            </button>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedMappings.map((item) => {
            const meta = CATEGORY_META[item.category] || CATEGORY_META["Umum"];
            return (
              <div
                key={item.id}
                className={`bg-surface dark:bg-surface rounded-2xl p-5 border transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between group ${
                  item.is_active
                    ? "border-line/90 dark:border-line hover:border-blue-300"
                    : "border-line dark:border-line/80 bg-subtle/50 dark:bg-surface/60 opacity-80"
                }`}
              >
                <div className="space-y-3.5">
                  {/* Card Header: Category + Status Switch */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${meta.bg}`}>
                      <span>{meta.icon}</span>
                      <span>{item.category || "Umum"}</span>
                    </span>

                    {/* Smooth Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(item)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        item.is_active ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
                      }`}
                      title={item.is_active ? "Nonaktifkan aturan" : "Aktifkan aturan"}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-surface shadow-sm ring-0 transition duration-200 ease-in-out ${
                          item.is_active ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Keyword Title */}
                  <div>
                    <span className="font-mono text-base font-extrabold text-blue-950 dark:text-accent tracking-wide bg-accent-soft dark:bg-accent-soft/40 px-2.5 py-1 rounded-xl border border-blue-200 dark:border-blue-700 inline-block shadow-2xs">
                      {item.keyword}
                    </span>
                    {item.description && (
                      <p className="text-xs text-muted dark:text-muted mt-2 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Target Document Patterns */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-faint dark:text-muted mb-1.5 uppercase tracking-wider">
                      <span>Publikasi Target Prioritas:</span>
                      <span className="font-mono bg-subtle dark:bg-surface px-1.5 py-0.2 rounded text-[10px] text-muted">
                        {item.target_patterns?.length || 0} Pola
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-0.5">
                      {item.target_patterns && item.target_patterns.length > 0 ? (
                        item.target_patterns.map((pat, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-subtle dark:bg-surface/60 text-ink dark:text-ink rounded-lg text-xs font-medium border border-line dark:border-line shadow-2xs"
                          >
                            <DocumentTextIcon className="w-3.5 h-3.5 text-accent shrink-0" />
                            <span className="truncate max-w-[200px]">{pat}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-faint italic">
                          Belum ada pola target ditentukan
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Action Buttons */}
                <div className="mt-4 pt-3 border-t border-line dark:border-line flex items-center justify-between gap-2">
                  <span className="text-[11px] text-faint font-medium">
                    {item.is_active ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Aktif di AI Router
                      </span>
                    ) : (
                      <span className="text-faint flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        Non-aktif
                      </span>
                    )}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-2 text-muted hover:text-accent hover:bg-accent-soft dark:hover:bg-gray-700 rounded-xl transition-all cursor-pointer"
                      title="Edit Aturan Pemetaan"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.keyword)}
                      className="p-2 text-faint hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-gray-700 rounded-xl transition-all cursor-pointer"
                      title="Hapus Pemetaan"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-surface dark:bg-surface rounded-3xl shadow-sm border border-line dark:border-line overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-subtle dark:bg-surface/50 text-muted dark:text-muted text-xs font-bold uppercase tracking-wider border-b border-line dark:border-line">
                <tr>
                  <th className="py-3.5 px-5">Kata Kunci / Indikator</th>
                  <th className="py-3.5 px-5">Kategori</th>
                  <th className="py-3.5 px-5">Pola Publikasi Target Primer</th>
                  <th className="py-3.5 px-5">Keterangan</th>
                  <th className="py-3.5 px-5 text-center">Status</th>
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line dark:divide-line font-medium">
                {paginatedMappings.map((item) => {
                  const meta = CATEGORY_META[item.category] || CATEGORY_META["Umum"];
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-accent-soft/40 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      {/* Keyword */}
                      <td className="py-4 px-5">
                        <span className="font-mono px-2.5 py-1 bg-accent-soft dark:bg-accent-soft/40 text-accent dark:text-accent rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-700">
                          {item.keyword}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${meta.bg}`}>
                          <span>{meta.icon}</span>
                          <span>{item.category}</span>
                        </span>
                      </td>

                      {/* Target Patterns */}
                      <td className="py-4 px-5">
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {item.target_patterns && item.target_patterns.length > 0 ? (
                            item.target_patterns.map((pat, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-subtle dark:bg-surface text-ink dark:text-ink text-xs rounded-md border border-line dark:border-line"
                              >
                                <DocumentTextIcon className="w-3 h-3 text-accent" />
                                {pat}
                              </span>
                            ))
                          ) : (
                            <span className="text-faint italic text-xs">-</span>
                          )}
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-4 px-5 text-muted dark:text-ink text-xs max-w-xs truncate">
                        {item.description || "-"}
                      </td>

                      {/* Status Toggle */}
                      <td className="py-4 px-5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            item.is_active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                              : "bg-subtle text-muted border border-line"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${item.is_active ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
                          {item.is_active ? "Aktif" : "Jeda"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-faint hover:text-accent hover:bg-accent-soft rounded-lg transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.keyword)}
                            className="p-1.5 text-faint hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus"
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
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface dark:bg-surface p-4 rounded-2xl border border-line dark:border-line shadow-2xs">
          <div className="text-xs text-muted">
            Menampilkan <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong> - <strong>{Math.min(currentPage * itemsPerPage, filteredAndSortedMappings.length)}</strong> dari <strong>{filteredAndSortedMappings.length}</strong> pemetaan
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-line dark:border-line rounded-xl text-muted dark:text-ink disabled:opacity-30 hover:bg-subtle cursor-pointer"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>

            <span className="text-xs font-semibold px-3 py-1 bg-subtle dark:bg-surface rounded-lg text-ink dark:text-ink">
              Halaman {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-line dark:border-line rounded-xl text-muted dark:text-ink disabled:opacity-30 hover:bg-subtle cursor-pointer"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Add / Edit (Upgraded with Preset Suggestions) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface dark:bg-surface rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-line dark:border-line max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-line dark:border-line pb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-accent-soft text-accent rounded-xl">
                  {modalMode === "add" ? <PlusIcon className="w-5 h-5 stroke-[2.5]" /> : <PencilSquareIcon className="w-5 h-5" />}
                </span>
                <div>
                  <h2 className="text-lg font-bold text-ink dark:text-white">
                    {modalMode === "add" ? "Tambah Pemetaan Tematik" : "Edit Pemetaan Tematik"}
                  </h2>
                  <p className="text-xs text-faint">
                    Arahkan kata kunci indikator ke dokumen publikasi primer BPS
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-faint hover:text-muted rounded-xl hover:bg-subtle cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* Keyword Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink dark:text-ink mb-1.5">
                  Kata Kunci / Indikator <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: tpt, kemiskinan, pdrb, padi, inflasi"
                  value={formData.keyword}
                  onChange={(e) => setFormData({ ...formData, keyword: e.target.value.toLowerCase() })}
                  className="w-full px-4 py-2.5 bg-subtle dark:bg-surface border border-line dark:border-line rounded-xl text-xs sm:text-sm text-ink dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <p className="text-[11px] text-faint mt-1">
                  💡 Gunakan kata kunci tunggal, singkatan indikator, atau istilah populer (huruf kecil).
                </p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink dark:text-ink mb-1.5">
                  Kategori Subjek BPS
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 bg-subtle dark:bg-surface border border-line dark:border-line rounded-xl text-xs sm:text-sm text-ink dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
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
                <label className="block text-xs font-bold uppercase tracking-wider text-ink dark:text-ink mb-1.5">
                  Pola Judul Publikasi Target <span className="text-rose-500">*</span>
                </label>
                <p className="text-xs text-faint mb-2">
                  Masukkan potongan pola kata dalam judul buku publikasi primer BPS (contoh: <code>keadaan angkatan kerja</code>).
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ketik pola judul lalu Enter..."
                    value={patternInput}
                    onChange={(e) => setPatternInput(e.target.value)}
                    onKeyDown={handlePatternKeyDown}
                    className="flex-1 px-4 py-2.5 bg-subtle dark:bg-surface border border-line dark:border-line rounded-xl text-xs sm:text-sm text-ink dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddPattern()}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    Tambah
                  </button>
                </div>

                {/* Common Presets / Quick Suggestions */}
                <div className="mt-2.5">
                  <span className="text-[11px] font-bold text-muted block mb-1">
                    Saran Cepat Pola Dokumen Populer:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_BPS_PATTERNS.map((sug) => {
                      const isAdded = formData.target_patterns.includes(sug);
                      return (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => handleAddPattern(sug)}
                          disabled={isAdded}
                          className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            isAdded
                              ? "bg-subtle text-faint border-line cursor-not-allowed"
                              : "bg-accent-soft hover:bg-accent-soft text-accent border-blue-200 font-semibold"
                          }`}
                        >
                          + {sug}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pattern Tag List */}
                <div className="mt-3 p-3 bg-subtle dark:bg-surface/40 rounded-xl border border-line dark:border-line">
                  <span className="text-[11px] font-bold text-muted dark:text-ink block mb-1.5">
                    Daftar Pola Terdaftar ({formData.target_patterns.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.target_patterns.length === 0 ? (
                      <span className="text-xs text-faint italic">Belum ada pola publikasi ditambahkan.</span>
                    ) : (
                      formData.target_patterns.map((p, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface dark:bg-surface text-accent dark:text-accent text-xs font-semibold rounded-lg border border-blue-200 dark:border-blue-700 shadow-2xs"
                        >
                          <span>📄 {p}</span>
                          <button
                            type="button"
                            onClick={() => handleRemovePattern(idx)}
                            className="text-faint hover:text-rose-600 ml-1 cursor-pointer"
                          >
                            <XMarkIcon className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink dark:text-ink mb-1.5">
                  Keterangan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan singkat fungsi indikator ini..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-subtle dark:bg-surface border border-line dark:border-line rounded-xl text-xs sm:text-sm text-ink dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status Aktif */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="is_active_form"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4.5 h-4.5 text-accent rounded-md border-line-strong focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="is_active_form" className="text-xs sm:text-sm font-semibold text-ink dark:text-ink cursor-pointer">
                  Aktifkan pemetaan ini dalam pencarian AI
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-line dark:border-line">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-muted hover:bg-subtle rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/25 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? "Menyimpan..." : modalMode === "add" ? "Simpan Pemetaan" : "Perbarui Pemetaan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-surface dark:bg-surface rounded-3xl max-w-md w-full p-6 shadow-2xl border border-line dark:border-line space-y-4">
            <div className="flex items-center gap-3">
              <span className={`p-2.5 rounded-2xl ${
                confirmDialog.confirmColor === "rose" ? "bg-rose-100 text-rose-600" : "bg-accent-soft text-accent"
              }`}>
                {confirmDialog.confirmColor === "rose" ? <TrashIcon className="w-6 h-6" /> : <ArrowPathIcon className="w-6 h-6" />}
              </span>
              <h3 className="text-base font-bold text-ink dark:text-white">
                {confirmDialog.title}
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-muted dark:text-ink leading-relaxed">
              {confirmDialog.message}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line dark:border-line">
              <button
                type="button"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-muted hover:bg-subtle rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`px-5 py-2 text-xs sm:text-sm font-bold text-white rounded-xl shadow-md transition-all cursor-pointer ${
                  confirmDialog.confirmColor === "rose"
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
