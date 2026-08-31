import React, { useCallback, useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import apiFetch from "../services/api";
import routes from "../routes";
import toast, { Toaster } from "react-hot-toast";
import useDebounce from "../hooks/useDebounce";

// --- Komponen Ikon Standar ---
const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </td>
    <td className="px-6 py-4">
      <div className="flex justify-center">
        <div className="h-8 bg-gray-200 rounded w-24"></div>
      </div>
    </td>
  </tr>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const ViewIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const CloudDownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
  </svg>
);

const UploadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

// --- Komponen Progress Bar Job (Clean Standard) ---
const JobProgressBar = ({ title, jobStatus, onStop, onReset }) => {
  if (!jobStatus) return null;
  const { status, progress, message, total_items, processed_items } = jobStatus;

  if (status !== "RUNNING" && status !== "STOPPING") return null;

  return (
    <div className="w-full bg-blue-50 border border-blue-200 p-4 rounded-xl shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-800">
                {status === "STOPPING" ? "Sedang Menghentikan..." : title}
              </span>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                {status}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5 truncate max-w-xl" title={message}>
              {message || "Sedang memproses dokumen..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="text-right">
            <span className="text-sm font-bold text-blue-800">
              {progress}%
            </span>
            <span className="text-xs text-gray-500 ml-1.5">
              {total_items > 0 ? `(${processed_items}/${total_items} Dokumen)` : ""}
            </span>
          </div>

          <div className="flex items-center gap-1 pl-2 border-l border-blue-200">
            <button
              onClick={onReset}
              title="Reset status job jika macet"
              className="p-1.5 text-gray-500 hover:text-red-600 rounded hover:bg-white transition-colors"
            >
              <RefreshIcon />
            </button>
            <button
              onClick={onStop}
              disabled={status === "STOPPING"}
              className="bg-red-600 hover:bg-red-700 text-white font-medium px-3 py-1 rounded-lg text-xs transition-colors disabled:opacity-50"
            >
              {status === "STOPPING" ? "Menghentikan..." : "Stop"}
            </button>
          </div>
        </div>
      </div>

      <div className="w-full bg-blue-200/60 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-300"
          style={{ width: `${Math.max(progress || 0, 3)}%` }}
        ></div>
      </div>
    </div>
  );
};

// --- Modal Upload PDF Manual (Clean Light) ---
const UploadPdfModal = ({ isOpen, onClose, onUploadSuccess }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [link, setLink] = useState("");
  const [autoProcess, setAutoProcess] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []).filter((f) =>
      f.name.toLowerCase().endsWith(".pdf")
    );
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []).filter((f) =>
      f.name.toLowerCase().endsWith(".pdf")
    );
    if (files.length === 0) {
      toast.error("Hanya file dokumen PDF (.pdf) yang diperbolehkan.");
      return;
    }
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      toast.error("Silakan pilih minimal satu file PDF.");
      return;
    }

    setIsUploading(true);
    onClose();
    const toastId = toast.loading(`Mengunggah ${selectedFiles.length} file PDF ke server...`);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });
      if (link) formData.append("link", link);
      formData.append("auto_process", autoProcess ? "true" : "false");

      const res = await apiFetch("/documents/upload", {
        method: "POST",
        body: formData,
      });

      toast.success(res.message || "File PDF berhasil diunggah!", { id: toastId });
      setSelectedFiles([]);
      setLink("");
      onUploadSuccess();
    } catch (err) {
      toast.error(`Gagal upload: ${err.message}`, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col border border-gray-200">
        <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-base font-bold text-gray-800">Upload Dokumen PDF</h3>
            <p className="text-xs text-gray-500">Unggah satu atau banyak file PDF langsung ke server.</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleUploadSubmit} className="p-5 space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-blue-400 bg-gray-50/70"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept=".pdf"
              className="hidden"
            />
            <div className="flex flex-col items-center gap-1.5">
              <div className="p-2.5 bg-blue-100 text-blue-600 rounded-full">
                <UploadIcon />
              </div>
              <p className="text-xs font-semibold text-gray-700">
                Klik untuk memilih file atau seret file PDF ke sini
              </p>
              <p className="text-[11px] text-gray-400">Format: .pdf (bisa pilih banyak file)</p>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-700">
                File Terpilih ({selectedFiles.length}):
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-gray-50 px-3 py-1.5 rounded border border-gray-200 text-xs"
                  >
                    <span className="text-gray-800 truncate max-w-[280px]">
                      {file.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-[10px]">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="text-red-500 hover:text-red-700 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Link Sumber Digital (Opsional)
            </label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://gorontalo.bps.go.id/publication/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoProcess"
              checked={autoProcess}
              onChange={(e) => setAutoProcess(e.target.checked)}
              className="rounded text-blue-600 cursor-pointer"
            />
            <label htmlFor="autoProcess" className="text-xs text-gray-700 cursor-pointer">
              Langsung proses chunking & vektorisasi otomatis
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={selectedFiles.length === 0 || isUploading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <UploadIcon />
              <span>{isUploading ? "Mengunggah..." : `Upload (${selectedFiles.length})`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Modal Konfirmasi Hapus Dokumen (Clean, Anti-Overflow, & Opsi File Fisik) ---
const DeleteConfirmModal = ({ isOpen, onClose, document, onConfirm }) => {
  const [deletePhysicalFile, setDeletePhysicalFile] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !document) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(document.id, document.filename, deletePhysicalFile);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-red-100 text-red-600 rounded-full shrink-0">
              <TrashIcon />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900">Hapus Dokumen?</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Pilih cakupan penghapusan untuk dokumen ini:
              </p>

              {/* Box Nama File Anti-Overflow */}
              <div className="mt-3 p-2.5 bg-gray-50 rounded-lg border border-gray-200 max-h-24 overflow-y-auto">
                <p className="text-xs font-semibold text-gray-800 break-all leading-relaxed">
                  {document.filename}
                </p>
              </div>

              {/* Pilihan Hapus Data vs Hapus File */}
              <div className="mt-3.5 space-y-2 bg-gray-50/70 p-3 rounded-lg border border-gray-200 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="deleteScope"
                    checked={deletePhysicalFile}
                    onChange={() => setDeletePhysicalFile(true)}
                    className="mt-0.5 text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <span className="font-bold text-gray-800">
                      Hapus Total (Data Indeks & File PDF di Server)
                    </span>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Menghapus data tabel & embedding AI, serta menghapus file PDF dari penyimpanan server.
                    </p>
                  </div>
                </label>

                <div className="border-t border-gray-200 pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="deleteScope"
                      checked={!deletePhysicalFile}
                      onChange={() => setDeletePhysicalFile(false)}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-bold text-gray-800">
                        Hapus Data Indeks Saja
                      </span>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Menghapus data dari AI, namun file fisik PDF tetap tersimpan di server (dapat di-chunk ulang).
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 bg-gray-50 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 bg-white"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            {isDeleting ? "Menghapus..." : "Konfirmasi Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Modal Edit Dokumen ---
const EditDocumentModal = ({ isOpen, onClose, document, onSave }) => {
  const [formData, setFormData] = useState({ filename: "", link: "" });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (document) {
      setFormData({
        filename: document.filename || "",
        link: document.link || "",
      });
    }
  }, [document]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(document.id, formData);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200">
        <form onSubmit={handleSubmit}>
          <div className="p-4 sm:p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="text-base font-bold text-gray-800">Edit Detail Dokumen</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label htmlFor="filename" className="block text-xs font-semibold text-gray-700 mb-1">
                Nama File
              </label>
              <input
                type="text"
                name="filename"
                id="filename"
                value={formData.filename}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                required
              />
            </div>
            <div>
              <label htmlFor="link" className="block text-xs font-semibold text-gray-700 mb-1">
                Link Sumber Digital BPS (Opsional)
              </label>
              <input
                type="url"
                name="link"
                id="link"
                value={formData.link}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                placeholder="https://gorontalo.bps.go.id/publication/..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 p-4 bg-gray-50 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Modal Sinkronisasi BPS Web API (Clean Light) ---
const BpsSyncModal = ({ isOpen, onClose, onSyncSuccess }) => {
  const [activeTab, setActiveTab] = useState("sync");
  const [config, setConfig] = useState({
    api_key: "",
    domain_code: "7500",
    domain_name: "BPS Provinsi Gorontalo",
    auto_sync: false,
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState({ publications: [], pagination: {} });
  
  const [filterYear, setFilterYear] = useState("");
  const [filterKeyword, setFilterKeyword] = useState("");
  const [previewPage, setPreviewPage] = useState(1);
  const [selectedPubIds, setSelectedPubIds] = useState([]);
  const [isStartingSync, setIsStartingSync] = useState(false);

  const domainOptions = [
    { code: "7500", name: "BPS Provinsi Gorontalo" },
    { code: "7501", name: "BPS Kab. Boalemo" },
    { code: "7502", name: "BPS Kab. Gorontalo" },
    { code: "7503", name: "BPS Kab. Pohuwato" },
    { code: "7504", name: "BPS Kab. Bone Bolango" },
    { code: "7505", name: "BPS Kab. Gorontalo Utara" },
    { code: "7571", name: "BPS Kota Gorontalo" },
    { code: "0000", name: "BPS RI (Pusat)" },
  ];

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      const res = await apiFetch("/documents/bps/config");
      setConfig({
        api_key: res.api_key || "",
        domain_code: res.domain_code || "7500",
        domain_name: res.domain_name || "BPS Provinsi Gorontalo",
        auto_sync: res.auto_sync || false,
        last_sync_at: res.last_sync_at,
        last_sync_status: res.last_sync_status,
        last_sync_message: res.last_sync_message,
      });
      if (res.api_key) {
        loadPreview(1, res.domain_code);
      } else {
        setActiveTab("config");
      }
    } catch (err) {
      console.error("Gagal memuat konfigurasi BPS:", err);
    }
  };

  const loadPreview = async (page = 1, domain = null) => {
    setIsLoadingPreview(true);
    try {
      const params = new URLSearchParams({ page });
      if (filterYear) params.append("year", filterYear);
      if (filterKeyword) params.append("keyword", filterKeyword);
      if (domain || config.domain_code) params.append("domain", domain || config.domain_code);

      const res = await apiFetch(`/documents/bps/preview?${params}`);
      if (res.success) {
        setPreviewData({
          publications: res.publications || [],
          pagination: res.pagination || {},
        });
        setPreviewPage(page);
      } else {
        toast.error(res.error || "Gagal memuat pratinjau publikasi BPS.");
      }
    } catch (err) {
      toast.error(`Error BPS Web API: ${err.message}`);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      await apiFetch("/documents/bps/config", {
        method: "POST",
        body: JSON.stringify(config),
      });
      toast.success("Pengaturan BPS Web API disimpan!");
      setActiveTab("sync");
      loadPreview(1, config.domain_code);
    } catch (err) {
      toast.error(`Gagal menyimpan: ${err.message}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleToggleSelectAllOnPage = () => {
    const pagePubIds = previewData.publications.map((p) => p.pub_id);
    const allSelected = pagePubIds.every((id) => selectedPubIds.includes(id));

    if (allSelected) {
      setSelectedPubIds((prev) => prev.filter((id) => !pagePubIds.includes(id)));
    } else {
      setSelectedPubIds((prev) => Array.from(new Set([...prev, ...pagePubIds])));
    }
  };

  const handleSelectOnlyNew = () => {
    const newPubIds = previewData.publications
      .filter((p) => !p.is_downloaded)
      .map((p) => p.pub_id);
    setSelectedPubIds(newPubIds);
    toast.success(`${newPubIds.length} publikasi baru dipilih.`);
  };

  const handleClearSelection = () => {
    setSelectedPubIds([]);
  };

  const handleToggleSelectOne = (pubId) => {
    setSelectedPubIds((prev) =>
      prev.includes(pubId) ? prev.filter((id) => id !== pubId) : [...prev, pubId]
    );
  };

  const handleStartSyncSelected = async () => {
    if (selectedPubIds.length === 0) {
      toast.error("Silakan centang minimal satu dokumen yang ingin disinkronkan.");
      return;
    }

    const selectedPubs = previewData.publications.filter((p) =>
      selectedPubIds.includes(p.pub_id)
    );

    setIsStartingSync(true);
    onClose();
    const toastId = toast.loading(`Menyiapkan unduhan ${selectedPubIds.length} dokumen BPS...`);

    try {
      const payload = {
        mode: "selected",
        selected_pub_ids: selectedPubIds,
        selected_publications: selectedPubs,
        year: filterYear || null,
        keyword: filterKeyword || null,
        max_pages: 5,
      };

      const res = await apiFetch("/documents/bps/sync", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success(res.message || `Sinkronisasi BPS dimulai!`, { id: toastId });
      onSyncSuccess();
    } catch (err) {
      toast.error(`Gagal memulai sinkronisasi: ${err.message}`, { id: toastId });
    } finally {
      setIsStartingSync(false);
    }
  };

  const handleStartSyncAllNew = async () => {
    setIsStartingSync(true);
    onClose();
    const toastId = toast.loading("Memulai sinkronisasi seluruh dokumen baru BPS...");

    try {
      const payload = {
        mode: "incremental",
        selected_pub_ids: [],
        year: filterYear || null,
        keyword: filterKeyword || null,
        max_pages: 5,
      };

      const res = await apiFetch("/documents/bps/sync", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success(res.message || "Sinkronisasi seluruh publikasi baru dimulai!", { id: toastId });
      onSyncSuccess();
    } catch (err) {
      toast.error(`Gagal memulai sinkronisasi: ${err.message}`, { id: toastId });
    } finally {
      setIsStartingSync(false);
    }
  };

  if (!isOpen) return null;

  const isAllPageSelected =
    previewData.publications.length > 0 &&
    previewData.publications.every((p) => selectedPubIds.includes(p.pub_id));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
        <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-base font-bold text-gray-800">Tarik Data dari BPS Web API</h3>
            <p className="text-xs text-gray-500">
              Pilih publikasi resmi statistik BPS untuk diunduh dan diindeks secara otomatis.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex border-b border-gray-200 px-5 bg-white text-xs font-semibold">
          <button
            onClick={() => setActiveTab("sync")}
            className={`py-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "sync"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <CloudDownloadIcon />
            <span>Pilih Publikasi</span>
          </button>
          <button
            onClick={() => setActiveTab("config")}
            className={`py-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "config"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <SettingsIcon />
            <span>Pengaturan API</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {activeTab === "config" && (
            <form onSubmit={handleSaveConfig} className="space-y-3.5 max-w-xl mx-auto py-2">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                <p className="font-semibold">BPS Web API Key:</p>
                <p className="mt-0.5">
                  Dapatkan API Key di portal resmi:{" "}
                  <a
                    href="https://webapi.bps.go.id/developer/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-bold"
                  >
                    webapi.bps.go.id/developer
                  </a>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  API Key BPS <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={config.api_key}
                  onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                  placeholder="Masukkan API Key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Wilayah / Domain BPS
                  </label>
                  <select
                    value={config.domain_code}
                    onChange={(e) => {
                      const selected = domainOptions.find((d) => d.code === e.target.value);
                      setConfig({
                        ...config,
                        domain_code: e.target.value,
                        domain_name: selected ? selected.name : config.domain_name,
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  >
                    {domainOptions.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.name} ({opt.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Kode Domain
                  </label>
                  <input
                    type="text"
                    value={config.domain_code}
                    onChange={(e) => setConfig({ ...config, domain_code: e.target.value })}
                    placeholder="7500"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
              </div>

              {config.last_sync_at && (
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
                  <span className="font-semibold">Terakhir Sinkron:</span>{" "}
                  {new Date(config.last_sync_at).toLocaleString("id-ID")} ({config.last_sync_status || "IDLE"})
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 text-xs"
                >
                  {isSavingConfig ? "Menyimpan..." : "Simpan Pengaturan"}
                </button>
              </div>
            </form>
          )}

          {activeTab === "sync" && (
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">
                    Filter Tahun
                  </label>
                  <input
                    type="text"
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    placeholder="Contoh: 2024"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">
                    Kata Kunci
                  </label>
                  <input
                    type="text"
                    value={filterKeyword}
                    onChange={(e) => setFilterKeyword(e.target.value)}
                    placeholder="Contoh: Dalam Angka"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => loadPreview(1)}
                    disabled={isLoadingPreview}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-1.5 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RefreshIcon />
                    <span>{isLoadingPreview ? "Memuat..." : "Cari di BPS"}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleToggleSelectAllOnPage}
                    className="px-2.5 py-1 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                  >
                    {isAllPageSelected ? "Batal Pilih Semua" : "Pilih Semua Halaman Ini"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectOnlyNew}
                    className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 text-blue-700 font-medium"
                  >
                    Pilih Hanya Dokumen Baru
                  </button>
                  {selectedPubIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      Hapus Pilihan
                    </button>
                  )}
                </div>

                <div className="font-semibold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  {selectedPubIds.length} Dokumen Dipilih
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs text-gray-600">
                    <thead className="bg-gray-50 text-gray-700 uppercase font-semibold sticky top-0 border-b border-gray-200 text-[10px]">
                      <tr>
                        <th className="p-2.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isAllPageSelected}
                            onChange={handleToggleSelectAllOnPage}
                            className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer"
                          />
                        </th>
                        <th className="p-2.5">Judul Publikasi</th>
                        <th className="p-2.5 text-center whitespace-nowrap">Rilis</th>
                        <th className="p-2.5 text-center">Ukuran</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {isLoadingPreview ? (
                        [...Array(4)].map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td colSpan={5} className="p-3">
                              <div className="h-3.5 bg-gray-200 rounded w-full"></div>
                            </td>
                          </tr>
                        ))
                      ) : previewData.publications.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-6 text-gray-500">
                            Tidak ada publikasi ditemukan.
                          </td>
                        </tr>
                      ) : (
                        previewData.publications.map((item) => {
                          const isSelected = selectedPubIds.includes(item.pub_id);
                          return (
                            <tr
                              key={item.pub_id}
                              onClick={() => handleToggleSelectOne(item.pub_id)}
                              className={`cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-blue-50/80 font-medium"
                                  : item.is_downloaded
                                  ? "bg-gray-50/50"
                                  : "hover:bg-blue-50/30"
                              }`}
                            >
                              <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectOne(item.pub_id)}
                                  className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer"
                                />
                              </td>
                              <td className="p-2.5 font-medium text-gray-800">
                                <div className="max-w-md truncate" title={item.title}>
                                  {item.title}
                                </div>
                                {item.pdf_url && (
                                  <a
                                    href={item.pdf_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[11px] text-blue-600 hover:underline inline-block"
                                  >
                                    PDF BPS ↗
                                  </a>
                                )}
                              </td>
                              <td className="p-2.5 text-center whitespace-nowrap text-xs">{item.rl_date || "-"}</td>
                              <td className="p-2.5 text-center whitespace-nowrap text-xs">{item.size || "-"}</td>
                              <td className="p-2.5 text-center whitespace-nowrap">
                                {item.is_downloaded ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800">
                                    ✓ Ada
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                    + Baru
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {previewData.pagination?.pages > 1 && (
                  <div className="p-2 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-xs">
                    <span className="text-gray-500">
                      Halaman {previewData.pagination.page} dari {previewData.pagination.pages}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => loadPreview(previewPage - 1)}
                        disabled={previewPage <= 1 || isLoadingPreview}
                        className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 text-xs"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        onClick={() => loadPreview(previewPage + 1)}
                        disabled={previewPage >= previewData.pagination.pages || isLoadingPreview}
                        className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 text-xs"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 bg-white"
          >
            Tutup
          </button>

          {activeTab === "sync" && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleStartSyncSelected}
                disabled={isStartingSync || selectedPubIds.length === 0}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <CloudDownloadIcon />
                <span>Unduh ({selectedPubIds.length}) Terpilih</span>
              </button>

              <button
                type="button"
                onClick={handleStartSyncAllNew}
                disabled={isStartingSync}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <RefreshIcon />
                <span>Tarik Semua yang Baru</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Komponen Utama Halaman Manajemen Dokumen ---
const DokumenTable = () => {
  const [data, setData] = useState({ documents: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  
  const [chunkingJobStatus, setChunkingJobStatus] = useState(null);
  const [bpsSyncJobStatus, setBpsSyncJobStatus] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBpsModalOpen, setIsBpsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchDocuments = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams({ page, per_page: perPage });
      if (debouncedSearchTerm) {
        params.append("search", debouncedSearchTerm);
      }
      const result = await apiFetch(`/documents/?${params}`);
      setData({
        documents: result.documents || [],
        pagination: result.pagination || {},
      });
    } catch (e) {
      setError(e.message);
      setData({ documents: [], pagination: {} });
    } finally {
      setLoading(false);
    }
  }, [page, perPage, debouncedSearchTerm]);

  const fetchAllJobStatuses = useCallback(async () => {
    try {
      const [chunkingStatus, bpsStatus] = await Promise.all([
        apiFetch("/documents/chunking/status"),
        apiFetch("/documents/bps/sync-status"),
      ]);

      setChunkingJobStatus((prev) => {
        if (
          prev &&
          prev.status === "RUNNING" &&
          chunkingStatus.status === "COMPLETED"
        ) {
          toast.success(chunkingStatus.message || "Proses chunking PDF selesai!");
          fetchDocuments();
        } else if (
          prev &&
          prev.status === "RUNNING" &&
          chunkingStatus.processed_items !== prev.processed_items
        ) {
          fetchDocuments();
        }
        return chunkingStatus;
      });

      setBpsSyncJobStatus((prev) => {
        if (
          prev &&
          prev.status === "RUNNING" &&
          bpsStatus.status === "COMPLETED"
        ) {
          toast.success(bpsStatus.message || "Sinkronisasi BPS Selesai!");
          fetchDocuments();
        } else if (
          prev &&
          prev.status === "RUNNING" &&
          bpsStatus.processed_items !== prev.processed_items
        ) {
          fetchDocuments();
        }
        return bpsStatus;
      });
    } catch (err) {
      console.error("Gagal mengambil status jobs:", err);
    }
  }, [fetchDocuments]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    fetchDocuments();
  }, [page, debouncedSearchTerm]);

  useEffect(() => {
    fetchAllJobStatuses();
  }, [fetchAllJobStatuses]);

  useEffect(() => {
    const isAnyActive =
      chunkingJobStatus?.status === "RUNNING" ||
      chunkingJobStatus?.status === "STOPPING" ||
      bpsSyncJobStatus?.status === "RUNNING" ||
      bpsSyncJobStatus?.status === "STOPPING";

    const intervalTime = isAnyActive ? 1500 : 4000;
    const interval = setInterval(fetchAllJobStatuses, intervalTime);
    return () => clearInterval(interval);
  }, [chunkingJobStatus?.status, bpsSyncJobStatus?.status, fetchAllJobStatuses]);

  // Handle Chunking Manual Folder
  const handleStartChunking = async () => {
    try {
      await apiFetch("/documents/chunking/start", { method: "POST" });
      toast.success("Proses chunking dokumen PDF dimulai.");
      fetchAllJobStatuses();
    } catch (err) {
      toast.error(`Gagal memulai proses: ${err.message}`);
    }
  };

  const handleStopChunking = async () => {
    try {
      await apiFetch("/documents/chunking/stop", { method: "POST" });
      toast.success("Sinyal berhenti dikirim.");
      fetchAllJobStatuses();
    } catch (err) {
      toast.error(`Gagal menghentikan: ${err.message}`);
    }
  };

  const handleStopBpsSync = async () => {
    try {
      await apiFetch("/documents/bps/sync-stop", { method: "POST" });
      toast.success("Sinyal berhenti sinkronisasi BPS dikirim.");
      fetchAllJobStatuses();
    } catch (err) {
      toast.error(`Gagal menghentikan: ${err.message}`);
    }
  };

  const handleResetBpsSync = async () => {
    try {
      await apiFetch("/documents/bps/sync-reset", { method: "POST" });
      toast.success("Status sinkronisasi BPS di-reset ke IDLE.");
      fetchAllJobStatuses();
    } catch (err) {
      toast.error(`Gagal reset: ${err.message}`);
    }
  };

  const handleResetAllJobs = async () => {
    try {
      await apiFetch("/documents/admin/force-reset-all", { method: "POST" });
      toast.success("Semua status job direset ke IDLE.");
      fetchAllJobStatuses();
    } catch (err) {
      toast.error(`Gagal reset: ${err.message}`);
    }
  };

  const handleOpenDeleteModal = (doc) => {
    setDeletingDoc(doc);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setDeletingDoc(null);
    setIsDeleteModalOpen(false);
  };

  const handleConfirmDelete = async (docId, docFilename, deletePhysicalFile = true) => {
    const toastId = toast.loading("Menghapus dokumen...");
    try {
      const response = await apiFetch(`/documents/${docId}?delete_file=${deletePhysicalFile ? "true" : "false"}`, {
        method: "DELETE",
      });
      toast.success(response.message || `Dokumen "${docFilename}" berhasil dihapus.`, { id: toastId });
      fetchDocuments();
    } catch (err) {
      toast.error(`Gagal menghapus: ${err.message}`, { id: toastId });
      throw err;
    }
  };

  const handleOpenEditModal = (doc) => {
    setEditingDoc(doc);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditingDoc(null);
    setIsEditModalOpen(false);
  };

  const handleSaveDocument = async (docId, updatedData) => {
    const toastId = toast.loading("Menyimpan perubahan...");
    try {
      await apiFetch(`/documents/${docId}`, {
        method: "PUT",
        body: JSON.stringify(updatedData),
      });
      toast.success("Dokumen berhasil diperbarui!", { id: toastId });
      fetchDocuments();
    } catch (err) {
      toast.error(`Gagal menyimpan: ${err.message}`, { id: toastId });
      throw err;
    }
  };

  const { pagination, documents } = data;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          style: {
            maxWidth: "500px",
            wordBreak: "break-word",
          },
        }}
      />

      {/* Header Halaman & Action Bar (Clean & Professional BPS Theme) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Manajemen Dokumen Statistik
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Sinkronisasikan publikasi resmi BPS atau kelola dokumen PDF lokal.
          </p>
        </div>

        {/* 3 Tombol Aksi Lengkap & Rapi */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Tombol 1: Tarik dari BPS API (Utama Biru) */}
          <button
            onClick={() => setIsBpsModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium px-3.5 py-2 rounded-lg text-xs shadow-sm transition-colors"
          >
            <CloudDownloadIcon />
            <span>Tarik dari BPS Web API</span>
          </button>

          {/* Tombol 2: Upload PDF Manual (Sekunder Putih) */}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 font-medium px-3.5 py-2 rounded-lg text-xs border border-gray-300 shadow-sm transition-colors"
          >
            <UploadIcon />
            <span>Upload PDF</span>
          </button>

          {/* Tombol 3: Proses Chunking Folder PDF */}
          <button
            onClick={handleStartChunking}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 font-medium px-3.5 py-2 rounded-lg text-xs border border-gray-300 shadow-sm transition-colors"
            title="Proses & chunking ulang seluruh PDF di folder server"
          >
            <RefreshIcon />
            <span>Proses Chunking</span>
          </button>
        </div>
      </div>

      {/* Live Job Progress Bars */}
      <div className="flex flex-col gap-2.5">
        {bpsSyncJobStatus && (
          <JobProgressBar
            title="Sinkronisasi BPS Web API"
            jobStatus={bpsSyncJobStatus}
            onStop={handleStopBpsSync}
            onReset={handleResetBpsSync}
          />
        )}
        {chunkingJobStatus && (
          <JobProgressBar
            title="Proses Chunking Dokumen PDF"
            jobStatus={chunkingJobStatus}
            onStop={handleStopChunking}
            onReset={handleResetAllJobs}
          />
        )}
      </div>

      {/* Modals */}
      <UploadPdfModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={() => {
          fetchAllJobStatuses();
          fetchDocuments();
        }}
      />

      <BpsSyncModal
        isOpen={isBpsModalOpen}
        onClose={() => setIsBpsModalOpen(false)}
        onSyncSuccess={() => {
          fetchAllJobStatuses();
          fetchDocuments();
        }}
      />

      <EditDocumentModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        document={editingDoc}
        onSave={handleSaveDocument}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        document={deletingDoc}
        onConfirm={handleConfirmDelete}
      />

      {/* Tabel Dokumen */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-800">Daftar Dokumen Terdaftar</h3>
            <p className="text-xs text-gray-500">
              Total {pagination?.total_items || documents.length} dokumen telah diindeks ke sistem RAG
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Cari dokumen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-xs text-left text-gray-600">
            <thead className="text-[11px] text-gray-700 uppercase bg-gray-50 border-b border-gray-200 font-bold">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Nama File / Publikasi
                </th>
                <th scope="col" className="px-3 py-3 text-center whitespace-nowrap">
                  Total Halaman
                </th>
                <th scope="col" className="px-3 py-3 text-center whitespace-nowrap">
                  Halaman Tabel
                </th>
                <th scope="col" className="px-3 py-3 text-center whitespace-nowrap">
                  Sumber Digital
                </th>
                <th scope="col" className="px-4 py-3 whitespace-nowrap">
                  Tanggal Terdaftar
                </th>
                <th scope="col" className="px-4 py-3 text-center whitespace-nowrap">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : error ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-red-500 font-medium">
                    Gagal memuat data: {error}
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-gray-400">
                    <div className="flex flex-col items-center gap-1.5">
                      <CloudDownloadIcon />
                      <p className="font-medium text-gray-600">Belum ada dokumen yang terdaftar.</p>
                      <p className="text-xs text-gray-400">
                        Klik <strong>"Tarik dari BPS Web API"</strong> atau <strong>"Upload PDF"</strong> untuk menambahkan.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="bg-white hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-sm truncate">
                      {doc.filename}
                    </td>
                    <td className="px-3 py-3 text-center text-gray-600">{doc.total_pages}</td>
                    <td className="px-3 py-3 text-center font-bold text-blue-600">
                      {doc.table_page_count}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {doc.link ? (
                        <a
                          href={doc.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                          title="Buka link resmi BPS"
                        >
                          <ViewIcon />
                          <span>Link BPS</span>
                        </a>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                      {new Date(doc.processed_at).toLocaleDateString("id-ID", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center items-center gap-1.5">
                        <NavLink
                          to={routes.detailDokumen(doc.id)}
                          className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-2.5 py-1 rounded text-xs transition-colors"
                          title="Lihat Detail Halaman"
                        >
                          <ViewIcon />
                          <span>Detail</span>
                        </NavLink>
                        <button
                          onClick={() => handleOpenEditModal(doc)}
                          className="p-1 text-gray-500 hover:text-blue-600 rounded hover:bg-gray-100 transition-colors"
                          title="Edit Dokumen"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteModal(doc)}
                          className="p-1 text-gray-500 hover:text-red-600 rounded hover:bg-gray-100 transition-colors"
                          title="Hapus Dokumen"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginasi */}
        {!loading && documents.length > 0 && pagination.total_pages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center pt-3.5 border-t border-gray-200 mt-3.5 gap-2 text-xs">
            <span className="text-gray-500">
              Menampilkan{" "}
              <span className="font-semibold text-gray-700">
                {(pagination.current_page - 1) * pagination.per_page + 1}
              </span>{" "}
              -{" "}
              <span className="font-semibold text-gray-700">
                {Math.min(
                  pagination.current_page * pagination.per_page,
                  pagination.total_items
                )}
              </span>{" "}
              dari <span className="font-semibold text-gray-700">{pagination.total_items}</span> dokumen
            </span>
            <div className="inline-flex items-center space-x-1">
              <button
                onClick={() => setPage(pagination.current_page - 1)}
                disabled={!pagination.has_prev || loading}
                className="px-2.5 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-40 text-xs font-medium"
              >
                Sebelumnya
              </button>
              <span className="text-gray-700 px-2 font-medium">
                {pagination.current_page} / {pagination.total_pages}
              </span>
              <button
                onClick={() => setPage(pagination.current_page + 1)}
                disabled={!pagination.has_next || loading}
                className="px-2.5 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-40 text-xs font-medium"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function ManajemenDokumen() {
  return <DokumenTable />;
}
