import React, { useCallback, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import routes from "../routes";
import apiFetch, { API_BASE_URL } from "../services/api";
import toast, { Toaster } from "react-hot-toast";

const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="px-4 py-3 md:px-6 md:py-4">
      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
    </td>
    <td className="px-4 py-3 md:px-6 md:py-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    </td>
    <td className="px-4 py-3 md:px-6 md:py-4">
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </td>
    <td className="px-4 py-3 md:px-6 md:py-4">
      <div className="flex justify-center gap-2">
        <div className="h-7 bg-gray-200 rounded w-7"></div>
        <div className="h-7 bg-gray-200 rounded w-7"></div>
        <div className="h-7 bg-gray-200 rounded w-7"></div>
      </div>
    </td>
  </tr>
);

const SearchIcon = () => (
  <svg
    className="w-5 h-5 text-gray-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const EditIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"
    />
  </svg>
);

const DeleteIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const ViewIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

const CloseIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const parseCsvString = (csvText) => {
  if (!csvText || !csvText.trim()) return [];
  const lines = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
      lines.push(cur);
      cur = '';
      if (char === '\r') i++;
    } else {
      cur += char;
    }
  }
  if (cur) lines.push(cur);

  const parseLine = (lineStr) => {
    const fields = [];
    let field = '';
    let inside = false;
    for (let i = 0; i < lineStr.length; i++) {
      const c = lineStr[i];
      const nc = lineStr[i + 1];
      if (c === '"') {
        if (inside && nc === '"') {
          field += '"';
          i++;
        } else {
          inside = !inside;
        }
      } else if (c === ',' && !inside) {
        fields.push(field.trim());
        field = '';
      } else {
        field += c;
      }
    }
    fields.push(field.trim());
    return fields;
  };

  if (lines.length === 0) return [];
  const rawHeaders = parseLine(lines[0]);
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const rawValues = parseLine(lines[i]);
    
    let tanggal_rilis = "";
    let judul_berita = "";
    let ringkasan = "";
    let link = "";
    let tahun = "";

    const linkIdx = rawValues.findIndex(val => val.startsWith("http://") || val.startsWith("https://"));
    
    if (linkIdx > 1) {
      tanggal_rilis = rawValues[0];
      link = rawValues[linkIdx];
      
      const lastItem = rawValues[rawValues.length - 1];
      if (/^\d{4}$/.test(lastItem)) {
        tahun = lastItem;
      } else if (rawValues.length > linkIdx + 1 && /^\d{4}$/.test(rawValues[linkIdx + 1])) {
        tahun = rawValues[linkIdx + 1];
      }

      const middle = rawValues.slice(1, linkIdx);
      if (middle.length === 2) {
        judul_berita = middle[0];
        ringkasan = middle[1];
      } else if (middle.length > 2) {
        if (/^\d+\s*persen/i.test(middle[1]) || /^\d+/i.test(middle[1]) || middle[1].startsWith("(")) {
          judul_berita = middle[0] + ", " + middle[1];
          ringkasan = middle.slice(2).join(", ");
        } else {
          judul_berita = middle[0];
          ringkasan = middle.slice(1).join(", ");
        }
      } else if (middle.length === 1) {
        judul_berita = middle[0];
      }
    } else {
      const obj = {};
      rawHeaders.forEach((h, idx) => {
        obj[h.trim()] = rawValues[idx] || '';
      });
      tanggal_rilis = obj["Tanggal Rilis"] || obj["tanggal_rilis"] || obj["tanggal"] || rawValues[0] || "";
      judul_berita = obj["Judul Berita"] || obj["judul_berita"] || obj["judul"] || rawValues[1] || "";
      ringkasan = obj["Ringkasan"] || obj["ringkasan"] || rawValues[2] || "";
      link = obj["Link"] || obj["link"] || rawValues[3] || "";
      tahun = obj["Tahun"] || obj["tahun"] || rawValues[4] || "";
    }

    records.push({
      "Tanggal Rilis": tanggal_rilis,
      "Judul Berita": judul_berita,
      "Ringkasan": ringkasan,
      "Link": link,
      "Tahun": tahun
    });
  }
  return records;
};

const ImportCsvModal = ({ isOpen, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState("file");
  const [csvText, setCsvText] = useState("");
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [isImporting, setIsImporting] = useState(false);

  const sampleCsvText = `Tanggal Rilis,Judul Berita,Ringkasan,Link,Tahun
5 Agustus 2026,"Ekonomi Gorontalo Triwulan II-2026 tumbuh 6,20 persen (y-on-y)","Perekonomian Gorontalo berdasarkan besaran Produk Domestik Regional Bruto (PDRB) atas dasar harga berlaku triwulan II-2026 mencapai Rp16.036,78 miliar...",https://gorontalo.bps.go.id/id/pressrelease/2026/08/05/1200/ekonomi-gorontalo-triwulan-ii-2026-tumbuh-6-20-persen--y-on-y-.html,2026
5 Agustus 2026,Keadaan Ketenagakerjaan  Provinsi Gorontalo Mei 2026,"Jumlah angkatan kerja Provinsi Gorontalo berdasarkan Survei Angkatan Kerja Nasional (Sakernas) pada Mei 2026 sebanyak 639.586 orang...",https://gorontalo.bps.go.id/id/pressrelease/2026/08/05/1199/keadaan-ketenagakerjaan--provinsi-gorontalo-mei-2026.html,2026
5 Agustus 2026,Profil Kemiskinan Provinsi Gorontalo Maret 2026,"Persentase penduduk miskin di Provinsi Gorontalo pada Maret 2026 sebesar 12,16 persen...",https://gorontalo.bps.go.id/id/pressrelease/2026/08/05/1193/profil-kemiskinan-provinsi-gorontalo-maret-2026.html,2026`;

  useEffect(() => {
    if (activeTab === "text") {
      if (!csvText.trim()) {
        setPreviewData([]);
        return;
      }
      const parsed = parseCsvString(csvText);
      setPreviewData(parsed);
    }
  }, [csvText, activeTab]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const parsed = parseCsvString(text);
        setPreviewData(parsed);
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleUseSample = () => {
    setActiveTab("text");
    setCsvText(sampleCsvText);
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      toast.error("Tidak ada data CSV yang valid untuk diimpor.");
      return;
    }

    const toastId = toast.loading(`Mengimpor ${previewData.length} data BRS...`);
    setIsImporting(true);

    try {
      let result;
      if (activeTab === "file" && file) {
        const formData = new FormData();
        formData.append("file", file);

        const token = localStorage.getItem("access_token");
        const response = await fetch(`${API_BASE_URL}/berita/import-csv`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: "Gagal mengimpor CSV" }));
          throw new Error(err.error || "Gagal mengimpor CSV");
        }
        result = await response.json();
      } else {
        result = await apiFetch("/berita/import-csv", {
          method: "POST",
          body: JSON.stringify({ items: previewData }),
        });
      }

      toast.success(result.message || "Impor CSV berhasil!", { id: toastId });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error importing CSV:", error);
      toast.error(error.message || "Gagal mengimpor CSV", { id: toastId });
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span>📥</span> Import Data Berita Resmi Statistik (BRS)
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Unggah file CSV atau tempel teks data CSV untuk menambahkan batch berita statistik baru.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("file")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "file"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                📁 Upload File CSV
              </button>
              <button
                onClick={() => setActiveTab("text")}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "text"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                📝 Tempel Teks CSV
              </button>
            </div>

            <button
              onClick={handleUseSample}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
            >
              ⚡ Pakai Sampel CSV
            </button>
          </div>

          {activeTab === "file" ? (
            <div className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-8 text-center bg-gray-50/50 hover:bg-blue-50/30 transition-all cursor-pointer relative">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl mb-3">
                  📄
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  {file ? file.name : "Klik atau seret file CSV ke sini"}
                </p>
                <p className="text-xs text-gray-500">
                  Format header: <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-700">Tanggal Rilis,Judul Berita,Ringkasan,Link,Tahun</code>
                </p>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Tempel Data CSV
              </label>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={sampleCsvText}
                rows={6}
                className="w-full p-3 font-mono text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              />
            </div>
          )}

          {previewData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Pratinjau Data ({previewData.length} Baris Ditemukan)
                </h4>
              </div>

              <div className="max-h-56 overflow-auto border border-gray-200 rounded-xl">
                <table className="w-full text-xs text-left text-gray-600">
                  <thead className="bg-gray-100 text-gray-700 font-semibold sticky top-0">
                    <tr>
                      <th className="px-3 py-2">No</th>
                      <th className="px-3 py-2">Tanggal Rilis</th>
                      <th className="px-3 py-2">Judul Berita</th>
                      <th className="px-3 py-2">Ringkasan</th>
                      <th className="px-3 py-2">Link</th>
                      <th className="px-3 py-2">Tahun</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {previewData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-500">{idx + 1}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-800">
                          {row["Tanggal Rilis"] || row["tanggal_rilis"] || "-"}
                        </td>
                        <td className="px-3 py-2 max-w-xs truncate font-semibold text-gray-800" title={row["Judul Berita"] || row["judul_berita"]}>
                          {row["Judul Berita"] || row["judul_berita"] || "-"}
                        </td>
                        <td className="px-3 py-2 max-w-xs truncate" title={row["Ringkasan"] || row["ringkasan"]}>
                          {row["Ringkasan"] || row["ringkasan"] || "-"}
                        </td>
                        <td className="px-3 py-2 max-w-xs truncate text-blue-600" title={row["Link"] || row["link"]}>
                          {row["Link"] || row["link"] || "-"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap font-mono">
                          {row["Tahun"] || row["tahun"] || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting || previewData.length === 0}
            className="px-5 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs flex items-center gap-2"
          >
            {isImporting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Mengimpor...
              </>
            ) : (
              `Proses & Import (${previewData.length} Data)`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const DataBrsTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortField, setSortField] = useState("tanggal_rilis");
  const [sortOrder, setSortOrder] = useState("desc");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [editModal, setEditModal] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    judul_berita: "",
    tanggal_rilis: "",
    link_sumber: "",
    ringkasan: "",
    tags: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [isReembedding, setIsReembedding] = useState(false);

  const handleReembedMissing = async () => {
    const toastId = toast.loading("Memeriksa dan membuat vektor embedding data yang kosong (NULL)...");
    setIsReembedding(true);
    try {
      const result = await apiFetch("/berita/reembed-missing", {
        method: "POST",
        body: JSON.stringify({ force_all: false }),
      });
      toast.success(result.message || "Re-embedding selesai!", { id: toastId });
      fetchData();
    } catch (error) {
      console.error("Error re-embedding data:", error);
      toast.error(error.message || "Gagal membuat vektor embedding.", { id: toastId });
    } finally {
      setIsReembedding(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        draw: 1,
        start: page * perPage,
        length: perPage,
        search: search,
        tahun: selectedYear,
        tag: selectedTag,
        start_date: startDate,
        end_date: endDate,
        sort_field: sortField,
        sort_order: sortOrder,
      });
      const result = await apiFetch(`/berita/list?${params}`);
      setData(result.data);
      setTotalRecords(result.recordsFiltered);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, selectedYear, selectedTag, startDate, endDate, sortField, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 400);

    return () => clearTimeout(timer);
  }, [fetchData, search, selectedYear, selectedTag, startDate, endDate, sortField, sortOrder]);

  const activeFiltersCount = [
    selectedYear !== "all" ? 1 : 0,
    selectedTag !== "all" ? 1 : 0,
    startDate ? 1 : 0,
    endDate ? 1 : 0,
    sortField !== "tanggal_rilis" || sortOrder !== "desc" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const handleResetFilters = () => {
    setSelectedYear("all");
    setSelectedTag("all");
    setStartDate("");
    setEndDate("");
    setSortField("tanggal_rilis");
    setSortOrder("desc");
    setSearch("");
    setPage(0);
  };

  const executeDelete = async (id) => {
    const toastId = toast.loading("Menghapus berita...");
    try {
      const result = await apiFetch(`/berita/delete/${id}`, {
        method: "DELETE",
      });
      fetchData();
      toast.success(result.message, { id: toastId });
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error(error.message, { id: toastId });
    }
  };

  const handleDeleteConfirmation = (id, title) => {
    toast(
      (t) => (
        <div className="flex flex-col items-center gap-4 p-2">
          <p className="text-center font-medium">
            Anda yakin ingin menghapus berita
            <br />
            <strong className="text-red-600">"{title}"</strong>?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                executeDelete(id);
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg text-sm"
            >
              Hapus
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-lg text-sm"
            >
              Batal
            </button>
          </div>
        </div>
      ),
      { duration: 6000 }
    );
  };

  const openEditModal = async (id) => {
    try {
      setFormLoading(true);
      setEditModal(id);
      const result = await apiFetch(`/berita/${id}`);
      setFormData({
        judul_berita: result.judul_berita || "",
        tanggal_rilis: result.tanggal_rilis || "",
        link_sumber: result.link_sumber || "",
        ringkasan: result.ringkasan || "",
        tags: Array.isArray(result.tags) ? result.tags.join(", ") : result.tags || "",
      });
      setFormErrors({});
    } catch (error) {
      console.error("Error fetching berita data:", error);
      toast.error(error.message);
      setEditModal(null);
    } finally {
      setFormLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.judul_berita.trim()) errors.judul_berita = "Judul berita harus diisi";
    if (!formData.tanggal_rilis) errors.tanggal_rilis = "Tanggal rilis harus diisi";
    if (!formData.link_sumber.trim()) errors.link_sumber = "Link sumber harus diisi";
    if (!formData.ringkasan.trim()) errors.ringkasan = "Ringkasan harus diisi";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const toastId = toast.loading("Menyimpan perubahan...");
    setFormLoading(true);
    try {
      const result = await apiFetch(`/berita/${editModal}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      fetchData();
      setEditModal(null);
      toast.success(result.message, { id: toastId });
      setFormData({
        judul_berita: "",
        tanggal_rilis: "",
        link_sumber: "",
        ringkasan: "",
        tags: "",
      });
    } catch (error) {
      console.error("Error updating berita:", error);
      toast.error(error.message, { id: toastId });
    } finally {
      setFormLoading(false);
    }
  };

  const totalPages = Math.ceil(totalRecords / perPage);

  return (
    <div className="p-4 md:p-6">
      <Toaster position="top-center" reverseOrder={false} />

      {editModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-lg">
              <h3 className="text-lg font-semibold text-gray-800">
                Edit Berita
              </h3>
              <button
                onClick={() => setEditModal(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 hide-scrollbar">
              {formLoading && !formData.judul_berita ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Form Inputs */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Judul Berita *
                    </label>
                    <input
                      type="text"
                      name="judul_berita"
                      value={formData.judul_berita}
                      onChange={handleInputChange}
                      className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.judul_berita
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="Masukkan judul berita"
                    />
                    {formErrors.judul_berita && (
                      <p className="text-red-500 text-sm mt-1">
                        {formErrors.judul_berita}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tanggal Rilis *
                    </label>
                    <input
                      type="date"
                      name="tanggal_rilis"
                      value={formData.tanggal_rilis}
                      onChange={handleInputChange}
                      className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.tanggal_rilis
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    {formErrors.tanggal_rilis && (
                      <p className="text-red-500 text-sm mt-1">
                        {formErrors.tanggal_rilis}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Link Sumber *
                    </label>
                    <input
                      type="url"
                      name="link_sumber"
                      value={formData.link_sumber}
                      onChange={handleInputChange}
                      className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.link_sumber
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="https://example.com"
                    />
                    {formErrors.link_sumber && (
                      <p className="text-red-500 text-sm mt-1">
                        {formErrors.link_sumber}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags
                    </label>
                    <input
                      type="text"
                      name="tags"
                      value={formData.tags}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Pisahkan dengan koma, contoh: ekonomi, statistik, bps"
                    />
                    <p className="text-gray-500 text-sm mt-1">
                      Pisahkan multiple tags dengan koma
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ringkasan *
                    </label>
                    <textarea
                      name="ringkasan"
                      value={formData.ringkasan}
                      onChange={handleInputChange}
                      rows={4}
                      className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.ringkasan
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="Masukkan ringkasan berita"
                    />
                    {formErrors.ringkasan && (
                      <p className="text-red-500 text-sm mt-1">
                        {formErrors.ringkasan}
                      </p>
                    )}
                  </div>
                </form>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 sticky bottom-0 bg-white z-10 rounded-b-lg">
              <button
                type="button"
                onClick={() => setEditModal(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={formLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {formLoading ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      <ImportCsvModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchData}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">
            Data Berita Resmi Statistik
          </h2>
          <p className="text-gray-600 text-sm md:text-base">
            Daftar semua berita yang tersimpan di dalam sistem.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleReembedMissing}
            disabled={isReembedding}
            className="flex items-center gap-2 bg-amber-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors whitespace-nowrap text-sm shadow-xs disabled:opacity-50"
            title="Klik untuk membuat vektor embedding otomatis bagi data yang nilainya NULL"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {isReembedding ? "Proses Vektor..." : "Generasi Vektor NULL"}
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap text-sm shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Import CSV
          </button>
          <NavLink
            to={routes.addBeritaResmiStatistik}
            className="bg-blue-900 text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap text-sm shadow-xs"
          >
            + Tambah Berita
          </NavLink>
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
        {/* Top Control Bar: Search + Filter Toggle Button */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-lg">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Cari berdasarkan kata kunci judul, ringkasan, atau link..."
              className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 focus:bg-white transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-semibold text-gray-400 hover:text-gray-600"
              >
                Hapus
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                isFilterOpen || activeFiltersCount > 0
                  ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filter Data</span>
              {activeFiltersCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-extrabold bg-white text-blue-700 rounded-full shadow-xs">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-red-600 hover:text-red-800 font-semibold px-2 py-2 hover:underline transition-all"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Expandable Filter Panel */}
        {isFilterOpen && (
          <div className="mb-5 p-4 md:p-5 bg-gradient-to-r from-blue-50/60 via-slate-50 to-indigo-50/60 rounded-2xl border border-blue-100/80 shadow-xs transition-all">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Opsi Filter Lengkap
              </h4>
              <button
                onClick={handleResetFilters}
                className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 hover:underline"
              >
                Reset Opsi Filter
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {/* Filter Tahun */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tahun Rilis
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setPage(0);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">Semua Tahun</option>
                  <option value="2026">Tahun 2026</option>
                  <option value="2025">Tahun 2025</option>
                  <option value="2024">Tahun 2024</option>
                  <option value="2023">Tahun 2023</option>
                  <option value="2022">Tahun 2022</option>
                  <option value="2021">Tahun 2021</option>
                </select>
              </div>

              {/* Filter Kategori / Tag */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Kategori / Topik
                </label>
                <select
                  value={selectedTag}
                  onChange={(e) => {
                    setSelectedTag(e.target.value);
                    setPage(0);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="all">Semua Kategori</option>
                  <option value="ekonomi">Ekonomi & PDRB</option>
                  <option value="inflasi">Inflasi & IHK</option>
                  <option value="kemiskinan">Kemiskinan</option>
                  <option value="ketenagakerjaan">Ketenagakerjaan</option>
                  <option value="pertanian">Pertanian & Perkebunan</option>
                  <option value="pariwisata">Pariwisata & Perhotelan</option>
                  <option value="ekspor">Ekspor & Impor</option>
                </select>
              </div>

              {/* Filter Rentang Tanggal: Dari */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Dari Tanggal
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(0);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Filter Rentang Tanggal: Sampai */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(0);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Urutan Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Urutkan Berdasarkan
                </label>
                <select
                  value={sortField}
                  onChange={(e) => {
                    setSortField(e.target.value);
                    setPage(0);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="tanggal_rilis">Tanggal Rilis</option>
                  <option value="judul_berita">Judul Berita</option>
                </select>
              </div>

              {/* Urutan Arah (ASC/DESC) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Arah Urutan
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => {
                    setSortOrder(e.target.value);
                    setPage(0);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="desc">Terbaru / Z-A (DESC)</option>
                  <option value="asc">Terlama / A-Z (ASC)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Chips Bar */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4 p-2.5 bg-blue-50/60 rounded-xl border border-blue-100">
            <span className="text-xs font-bold text-blue-900">Filter Aktif:</span>

            {selectedYear !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                Tahun: {selectedYear}
                <button
                  onClick={() => setSelectedYear("all")}
                  className="hover:text-blue-900 font-bold ml-1"
                >
                  ×
                </button>
              </span>
            )}

            {selectedTag !== "all" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                Kategori: {selectedTag}
                <button
                  onClick={() => setSelectedTag("all")}
                  className="hover:text-emerald-900 font-bold ml-1"
                >
                  ×
                </button>
              </span>
            )}

            {startDate && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                Dari: {startDate}
                <button
                  onClick={() => setStartDate("")}
                  className="hover:text-purple-900 font-bold ml-1"
                >
                  ×
                </button>
              </span>
            )}

            {endDate && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                Sampai: {endDate}
                <button
                  onClick={() => setEndDate("")}
                  className="hover:text-purple-900 font-bold ml-1"
                >
                  ×
                </button>
              </span>
            )}

            {(sortField !== "tanggal_rilis" || sortOrder !== "desc") && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                Urut: {sortField === "tanggal_rilis" ? "Tanggal" : "Judul"} ({sortOrder.toUpperCase()})
                <button
                  onClick={() => {
                    setSortField("tanggal_rilis");
                    setSortOrder("desc");
                  }}
                  className="hover:text-amber-900 font-bold ml-1"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}

        {/* Mobile Card View */}
        <div className="md:hidden">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white border-b border-gray-200 p-4 animate-pulse"
              >
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="flex justify-between gap-2">
                  <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))
          ) : data.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              Data tidak ditemukan.
            </div>
          ) : (
            data.map((item, index) => (
              <div
                key={item.id}
                className="bg-white border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="text-xs text-blue-900 font-semibold mb-1">
                  No: {page * perPage + index + 1}
                </div>
                <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">
                  {item.judul_berita}
                </h3>
                <div className="text-sm text-gray-600 mb-3">
                  {item.tanggal_rilis}
                </div>
                <div className="flex justify-between gap-2">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 text-blue-600 font-medium p-2 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors text-sm"
                  >
                    <ViewIcon /> Detail
                  </a>
                  <button
                    onClick={() => openEditModal(item.id)}
                    className="flex-1 flex items-center justify-center gap-1 text-green-600 font-medium p-2 rounded-lg border border-green-200 hover:bg-green-100 transition-colors text-sm"
                  >
                    <EditIcon /> Edit
                  </button>
                  <button
                    onClick={() =>
                      handleDeleteConfirmation(item.id, item.judul_berita)
                    }
                    className="flex-1 flex items-center justify-center gap-1 text-red-600 font-medium p-2 rounded-lg border border-red-200 hover:bg-red-100 transition-colors text-sm"
                  >
                    <DeleteIcon /> Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto rounded-lg">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100">
              <tr>
                <th scope="col" className="px-6 py-3 font-semibold">
                  No
                </th>
                <th scope="col" className="px-6 py-3 font-semibold">
                  Judul Berita
                </th>
                <th scope="col" className="px-6 py-3 font-semibold">
                  Tanggal Rilis
                </th>
                <th scope="col" className="px-6 py-3 font-semibold text-center">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-10 text-gray-500">
                    Data tidak ditemukan.
                  </td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr
                    key={item.id}
                    className="bg-white border-b border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-blue-900">
                      {page * perPage + index + 1}
                    </td>
                    <td
                      className="px-6 py-4 max-w-sm"
                      title={item.judul_berita}
                    >
                      <p className="font-semibold text-gray-800 line-clamp-2">
                        {item.judul_berita}
                      </p>
                    </td>
                    <td className="px-6 py-4">{item.tanggal_rilis}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <a
                          href={item.link}
                          target="__BLANK"
                          className="p-2 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          title="Lihat Detail"
                        >
                          <ViewIcon />
                        </a>
                        <button
                          onClick={() => openEditModal(item.id)}
                          className="p-2 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                          title="Edit"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteConfirmation(item.id, item.judul_berita)
                          }
                          className="p-2 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          title="Hapus"
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center pt-4 border-t border-gray-300 mt-4 gap-4">
          <span className="text-sm text-gray-600">
            Menampilkan{" "}
            <span className="font-semibold">
              {data.length > 0 ? page * perPage + 1 : 0}
            </span>{" "}
            -{" "}
            <span className="font-semibold">
              {Math.min((page + 1) * perPage, totalRecords)}
            </span>{" "}
            dari <span className="font-semibold">{totalRecords}</span> data
          </span>
          <div className="inline-flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-700">
              Halaman {page + 1} dari {totalPages > 0 ? totalPages : 1}
            </span>
            <button
              onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
              disabled={page + 1 >= totalPages || loading}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function BeritaResmiStatistik() {
  return <DataBrsTable />;
}