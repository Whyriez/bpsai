import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

const RefreshIcon = () => (
  <svg
    className="w-3.5 h-3.5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
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

const CloudDownloadIcon = () => (
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
      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
    />
  </svg>
);

const UploadIcon = () => (
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
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
    />
  </svg>
);

const SettingsIcon = () => (
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

const SearchIcon = () => (
  <svg
    className="w-4 h-4 text-gray-400"
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

const WhatsAppIcon = () => (
  <svg
    className="w-4 h-4 fill-current text-green-600 inline-block"
    viewBox="0 0 24 24"
  >
    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.303-.058.116-.087.188-.173.289l-.26.303c-.087.087-.177.182-.076.356.101.174.449.741.964 1.201.662.591 1.221.774 1.394.861.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.144.39-.086s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z" />
    <path d="M12 2C6.48 2 2 6.48 2 12c0 1.82.49 3.53 1.35 5L2 22l5.14-1.32C8.58 21.52 10.24 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.64 0-3.17-.49-4.46-1.33l-.32-.21-3.05.78.82-2.96-.23-.34C3.89 14.61 3.4 13.06 3.4 11.4c0-4.74 3.86-8.6 8.6-8.6 4.74 0 8.6 3.86 8.6 8.6 0 4.74-3.86 8.6-8.6 8.6z" />
  </svg>
);

const CopyIcon = () => (
  <svg
    className="w-3.5 h-3.5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

const SparklesIcon = () => (
  <svg
    className="w-4 h-4 text-amber-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
    />
  </svg>
);

const AlertTriangleIcon = () => (
  <svg
    className="w-5 h-5 text-amber-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

// --- Komponen Progress Bar Job (Clean Standard) ---
const JobProgressBar = ({ title, jobStatus, onStop, onReset, onDismiss }) => {
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state jika job aktif kembali
  useEffect(() => {
    if (jobStatus?.status === "RUNNING" || jobStatus?.status === "STOPPING") {
      setDismissed(false);
    }
  }, [jobStatus?.status]);

  if (!jobStatus || dismissed) return null;
  const { status, progress, message, total_items, processed_items } = jobStatus;

  if (status === "IDLE") return null;

  // Tampilan Sukses (COMPLETED)
  if (status === "COMPLETED") {
    return (
      <div className="w-full bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl shadow-sm flex items-center justify-between gap-3 transition-all duration-300">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-sm">
            ✓
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-emerald-900">
                {title} Selesai
              </span>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded">
                100% {total_items > 0 ? `(${total_items} Dokumen)` : ""}
              </span>
            </div>
            <p
              className="text-xs text-emerald-700 mt-0.5 truncate max-w-xl"
              title={message}
            >
              {message || "Seluruh proses telah berhasil diselesaikan."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            if (onDismiss) onDismiss();
          }}
          className="text-xs font-medium text-emerald-700 hover:text-emerald-900 bg-emerald-100/60 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors shrink-0"
        >
          ✕ Tutup
        </button>
      </div>
    );
  }

  // Tampilan Gagal / Terhenti (FAILED)
  if (status === "FAILED") {
    return (
      <div className="w-full bg-red-50 border border-red-200 p-3.5 rounded-xl shadow-sm flex items-center justify-between gap-3 transition-all duration-300">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 font-bold text-sm">
            ✕
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-red-900">
                {title} Terhenti / Gagal
              </span>
              <span className="text-[10px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded">
                FAILED
              </span>
            </div>
            <p
              className="text-xs text-red-700 mt-0.5 truncate max-w-xl"
              title={message}
            >
              {message || "Terjadi kendala saat memproses dokumen."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-semibold bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg shadow-sm transition-colors"
            >
              Reset Status
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setDismissed(true);
              if (onDismiss) onDismiss();
            }}
            className="text-xs font-medium text-red-700 hover:text-red-900 bg-red-100/60 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // Tampilan Berjalan (RUNNING / STOPPING)
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
            <p
              className="text-xs text-gray-600 mt-0.5 truncate max-w-xl"
              title={message}
            >
              {message || "Sedang memproses dokumen..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="text-right">
            <span className="text-sm font-bold text-blue-800">{progress}%</span>
            <span className="text-xs text-gray-500 ml-1.5">
              {total_items > 0
                ? `(${processed_items}/${total_items} Dokumen)`
                : ""}
            </span>
          </div>

          <div className="flex items-center gap-1 pl-2 border-l border-blue-200">
            {onReset && (
              <button
                onClick={onReset}
                title="Reset status job jika macet"
                className="p-1.5 text-gray-500 hover:text-red-600 rounded hover:bg-white transition-colors"
              >
                <RefreshIcon />
              </button>
            )}
            {onStop && (
              <button
                onClick={onStop}
                disabled={status === "STOPPING"}
                className="bg-red-600 hover:bg-red-700 text-white font-medium px-3 py-1 rounded-lg text-xs transition-colors disabled:opacity-50"
              >
                {status === "STOPPING" ? "Menghentikan..." : "Stop"}
              </button>
            )}
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
      f.name.toLowerCase().endsWith(".pdf"),
    );
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []).filter((f) =>
      f.name.toLowerCase().endsWith(".pdf"),
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
    const toastId = toast.loading(
      `Mengunggah ${selectedFiles.length} file PDF ke server...`,
    );

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

      toast.success(res.message || "File PDF berhasil diunggah!", {
        id: toastId,
      });
      setSelectedFiles([]);
      setLink("");
      onUploadSuccess();
    } catch (err) {
      toast.error(`Gagal upload: ${err.message}`, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen || typeof window === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 w-screen h-screen min-h-screen overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 m-0">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-base font-bold text-gray-800">
              Upload Dokumen PDF
            </h3>
            <p className="text-xs text-gray-500">
              Unggah satu atau banyak file PDF langsung ke server.
            </p>
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
              <p className="text-[11px] text-gray-400">
                Format: .pdf (bisa pilih banyak file)
              </p>
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
            <label
              htmlFor="autoProcess"
              className="text-xs text-gray-700 cursor-pointer"
            >
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
              <span>
                {isUploading
                  ? "Mengunggah..."
                  : `Upload (${selectedFiles.length})`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    window.document.body,
  );
};

// --- Modal Konfirmasi Hapus Dokumen (Clean, Anti-Overflow, & Opsi File Fisik) ---
const DeleteConfirmModal = ({ isOpen, onClose, document: docItem, onConfirm }) => {
  const [deletePhysicalFile, setDeletePhysicalFile] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !docItem || typeof window === "undefined") return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(docItem.id, docItem.filename, deletePhysicalFile);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 w-screen h-screen min-h-screen overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 m-0">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-red-100 text-red-600 rounded-full shrink-0">
              <TrashIcon />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900">
                Hapus Dokumen?
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Pilih cakupan penghapusan untuk dokumen ini:
              </p>

              {/* Box Nama File Anti-Overflow */}
              <div className="mt-3 p-2.5 bg-gray-50 rounded-lg border border-gray-200 max-h-24 overflow-y-auto">
                <p className="text-xs font-semibold text-gray-800 break-all leading-relaxed">
                  {docItem.filename}
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
                      Menghapus data tabel & embedding AI, serta menghapus file
                      PDF dari penyimpanan server.
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
                        Menghapus data dari AI, namun file fisik PDF tetap
                        tersimpan di server (dapat di-chunk ulang).
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
    </div>,
    window.document.body,
  );
};

// --- Modal Edit Dokumen ---
const EditDocumentModal = ({ isOpen, onClose, document: docItem, onSave }) => {
  const [formData, setFormData] = useState({ filename: "", link: "" });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (docItem) {
      setFormData({
        filename: docItem.filename || "",
        link: docItem.link || "",
      });
    }
  }, [docItem]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(docItem.id, formData);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || typeof window === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 w-screen h-screen min-h-screen overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 m-0">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        <form onSubmit={handleSubmit}>
          <div className="p-4 sm:p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="text-base font-bold text-gray-800">
              Edit Detail Dokumen
            </h3>
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
              <label
                htmlFor="filename"
                className="block text-xs font-semibold text-gray-700 mb-1"
              >
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
              <label
                htmlFor="link"
                className="block text-xs font-semibold text-gray-700 mb-1"
              >
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
    </div>,
    window.document.body,
  );
};

// --- Modal Dialog Konfirmasi Aksi Kustom (Anti-Alert / Confirm) ---
const ActionConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Ya, Lanjutkan",
  cancelText = "Batal",
  confirmColor = "emerald",
  isLoading = false,
}) => {
  if (!isOpen || typeof window === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] w-screen h-screen min-h-screen overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 m-0">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5">
          <div className="flex items-start gap-3.5">
            <div
              className={`p-3 rounded-xl shrink-0 ${
                confirmColor === "red"
                  ? "bg-red-100 text-red-600"
                  : confirmColor === "emerald"
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-blue-100 text-blue-600"
              }`}
            >
              {confirmColor === "red" ? (
                <TrashIcon />
              ) : confirmColor === "emerald" ? (
                <WhatsAppIcon />
              ) : (
                <AlertTriangleIcon />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900 leading-snug">
                {title}
              </h3>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed whitespace-pre-line">
                {message}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-xs font-bold text-white rounded-lg flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 ${
              confirmColor === "red"
                ? "bg-red-600 hover:bg-red-700"
                : confirmColor === "emerald"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isLoading && (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>,
    window.document.body,
  );
};

// --- Modal Sinkronisasi BPS Web API (Clean Light) ---
const BpsSyncModal = ({
  isOpen,
  onClose,
  onSyncSuccess,
  bpsSyncJobStatus,
  onStopBpsSync,
  onResetBpsSync,
  onDismissBpsSync,
  chunkingJobStatus,
  onStopChunking,
  onResetChunking,
  onDismissChunking,
}) => {
  const [activeTab, setActiveTab] = useState("sync");
  const [config, setConfig] = useState({
    api_key: "",
    domain_code: "7500",
    domain_name: "BPS Provinsi Gorontalo",
    auto_sync: false,
    sync_interval_hours: 6,
    wa_channel_enabled: true,
    wa_target: "",
    wa_gateway_type: "webhook",
    wa_webhook_url: "",
    wa_api_token: "",
    chatbot_url: "",
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState({
    publications: [],
    pagination: {},
  });

  const [filterYear, setFilterYear] = useState("");
  const [filterKeyword, setFilterKeyword] = useState("");
  const [previewPage, setPreviewPage] = useState(1);
  const [selectedPubIds, setSelectedPubIds] = useState([]);
  const [isStartingSync, setIsStartingSync] = useState(false);
  const [previewType, setPreviewType] = useState("publication"); // "publication" | "brs"

  // State untuk Otomatisasi & Alerts
  const [alerts, setAlerts] = useState([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [isScanningNow, setIsScanningNow] = useState(false);
  const [scanMaxItems, setScanMaxItems] = useState(3);
  const [forwardingAlertId, setForwardingAlertId] = useState(null);

  // Pagination & Pencarian Riwayat Alerts
  const [alertsPagination, setAlertsPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    per_page: 8,
  });
  const [alertsPage, setAlertsPage] = useState(1);
  const [alertSearchKeyword, setAlertSearchKeyword] = useState("");
  const [alertFilterType, setAlertFilterType] = useState("ALL"); // ALL | PUBLIKASI | BRS
  const [alertFilterStatus, setAlertFilterStatus] = useState("ALL"); // ALL | SENT | FAILED | READY

  // State untuk Pemilihan Grup WhatsApp
  const [waGroups, setWaGroups] = useState([]);
  const [isLoadingWaGroups, setIsLoadingWaGroups] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  const handleFetchWaGroups = async () => {
    setIsLoadingWaGroups(true);
    try {
      const res = await apiFetch("/documents/bps/whatsapp-groups", {
        method: "POST",
        body: JSON.stringify({
          gateway_type: "local",
          webhook_url: config.wa_webhook_url || "http://localhost:3001/send",
          api_token: config.wa_api_token,
        }),
      });
      if (res.groups && res.groups.length > 0) {
        setWaGroups(res.groups);
        setShowGroupPicker(true);
        toast.success(
          `Ditemukan ${res.groups.length} grup WhatsApp dari Local Gateway!`,
        );
      } else {
        toast.error(res.error || "Tidak ada grup WhatsApp yang ditemukan.");
      }
    } catch (err) {
      toast.error(`Gagal mengambil grup WhatsApp: ${err.message}`);
    } finally {
      setIsLoadingWaGroups(false);
    }
  };

  // State WhatsApp Gateway Status & Ganti Nomor
  const [waStatus, setWaStatus] = useState(null);
  const [isLoadingWaStatus, setIsLoadingWaStatus] = useState(false);
  const [isResettingWa, setIsResettingWa] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // State Modal Konfirmasi Kustom (Anti-Alert / Confirm Native)
  const [actionConfirm, setActionConfirm] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Ya, Lanjutkan",
    confirmColor: "emerald",
    onConfirm: null,
  });

  const closeActionConfirm = () => {
    setActionConfirm((prev) => ({ ...prev, isOpen: false }));
  };

  const loadWaStatus = async () => {
    setIsLoadingWaStatus(true);
    try {
      const res = await apiFetch("/documents/bps/whatsapp-status");
      setWaStatus(res);
      return res;
    } catch (err) {
      console.error("Gagal memuat status WhatsApp Gateway:", err);
    } finally {
      setIsLoadingWaStatus(false);
    }
  };

  const executeResetWaSession = async () => {
    setIsResettingWa(true);
    setShowQrModal(true);
    const toastId = toast.loading(
      "Mereset sesi WhatsApp & menyiapkan QR Code baru...",
    );
    try {
      const res = await apiFetch("/documents/bps/whatsapp-reset", {
        method: "POST",
      });
      if (res.success) {
        toast.success(
          "Sesi lama berhasil direset! Silakan scan QR Code baru di bawah.",
          { id: toastId },
        );
        setTimeout(loadWaStatus, 1500);
      } else {
        toast.error(res.error || "Gagal mereset sesi WhatsApp", {
          id: toastId,
        });
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setIsResettingWa(false);
    }
  };

  const handleResetWaSession = () => {
    setActionConfirm({
      isOpen: true,
      title: "Ganti Nomor WhatsApp Bot?",
      message:
        "Sesi nomor bot saat ini akan terputus dan sistem akan memunculkan QR Code baru untuk ditautkan dengan nomor WhatsApp yang baru.",
      confirmText: "Ya, Ganti Nomor",
      confirmColor: "emerald",
      onConfirm: async () => {
        closeActionConfirm();
        await executeResetWaSession();
      },
    });
  };

  const executeDisconnectWaSession = async () => {
    setIsResettingWa(true);
    const toastId = toast.loading("Memutuskan nomor WhatsApp bot...");
    try {
      const res = await apiFetch("/documents/bps/whatsapp-reset", {
        method: "POST",
      });
      if (res.success) {
        toast.success("Nomor WhatsApp bot berhasil diputuskan / dihapus!", {
          id: toastId,
        });
        await loadWaStatus();
      } else {
        toast.error(res.error || "Gagal memutuskan nomor WhatsApp", {
          id: toastId,
        });
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setIsResettingWa(false);
    }
  };

  const handleDisconnectWaSession = () => {
    setActionConfirm({
      isOpen: true,
      title: "Putuskan / Hapus Nomor Bot?",
      message:
        "Sesi bot akan dihapus dari server gateway lokal dan status bot akan menjadi belum tertaut. Bot tidak akan dapat mengirim pesan hingga ditautkan kembali.",
      confirmText: "Ya, Putuskan Nomor",
      confirmColor: "red",
      onConfirm: async () => {
        closeActionConfirm();
        await executeDisconnectWaSession();
      },
    });
  };

  useEffect(() => {
    let pollTimer;
    if (showQrModal) {
      loadWaStatus();
      pollTimer = setInterval(async () => {
        try {
          const res = await apiFetch("/documents/bps/whatsapp-status");
          setWaStatus(res);
          if (res && res.is_connected) {
            toast.success(
              `Nomor WhatsApp bot (${res.phone_formatted || res.phone}) berhasil ditautkan!`,
            );
            setShowQrModal(false);
          }
        } catch (e) {}
      }, 3000);
    }
    return () => {
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [showQrModal]);

  useEffect(() => {
    if (bpsSyncJobStatus?.status === "COMPLETED") {
      loadConfig();
      loadAlerts();
    }
  }, [bpsSyncJobStatus?.status]);

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
      loadAlerts();
      loadWaStatus();
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
        sync_interval_hours: res.sync_interval_hours || 6,
        wa_channel_enabled:
          res.wa_channel_enabled !== undefined ? res.wa_channel_enabled : true,
        wa_target: res.wa_target || "",
        wa_gateway_type: res.wa_gateway_type || "webhook",
        wa_webhook_url: res.wa_webhook_url || "",
        wa_api_token: res.wa_api_token || "",
        chatbot_url: res.chatbot_url || "",
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

  const loadAlerts = async (
    page = 1,
    keyword = null,
    type = null,
    status = null,
  ) => {
    setIsLoadingAlerts(true);
    try {
      const effectiveKeyword = keyword !== null ? keyword : alertSearchKeyword;
      const effectiveType = type !== null ? type : alertFilterType;
      const effectiveStatus = status !== null ? status : alertFilterStatus;

      const params = new URLSearchParams({ page, per_page: 8 });
      if (effectiveKeyword && effectiveKeyword.trim())
        params.append("q", effectiveKeyword.trim());
      if (effectiveType && effectiveType !== "ALL")
        params.append("type", effectiveType);
      if (effectiveStatus && effectiveStatus !== "ALL")
        params.append("status", effectiveStatus);

      const res = await apiFetch(`/documents/bps/alerts?${params}`);
      setAlerts(res.items || []);
      if (res.pagination) {
        setAlertsPagination(res.pagination);
        setAlertsPage(page);
      }
    } catch (err) {
      console.error("Gagal memuat riwayat rilis alert BPS:", err);
    } finally {
      setIsLoadingAlerts(false);
    }
  };

  const handleSearchAlerts = (e) => {
    if (e) e.preventDefault();
    loadAlerts(1, alertSearchKeyword, alertFilterType, alertFilterStatus);
  };

  const handleFilterTypeChange = (newType) => {
    setAlertFilterType(newType);
    loadAlerts(1, alertSearchKeyword, newType, alertFilterStatus);
  };

  const handleFilterStatusChange = (newStatus) => {
    setAlertFilterStatus(newStatus);
    loadAlerts(1, alertSearchKeyword, alertFilterType, newStatus);
  };

  const handleResetAlertsFilter = () => {
    setAlertSearchKeyword("");
    setAlertFilterType("ALL");
    setAlertFilterStatus("ALL");
    loadAlerts(1, "", "ALL", "ALL");
  };

  const loadPreview = async (page = 1, domain = null, type = null) => {
    setIsLoadingPreview(true);
    try {
      const effectiveType = type || previewType;
      const params = new URLSearchParams({ page });
      if (filterYear) params.append("year", filterYear);
      if (filterKeyword) params.append("keyword", filterKeyword);
      if (domain || config.domain_code)
        params.append("domain", domain || config.domain_code);
      params.append("type", effectiveType);

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
      toast.success("Pengaturan BPS Web API & WhatsApp berhasil disimpan!");
      loadConfig();
    } catch (err) {
      toast.error(`Gagal menyimpan: ${err.message}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleTriggerScanNow = async () => {
    setIsScanningNow(true);
    const toastId = toast.loading(
      `Memulai pemindaian ${scanMaxItems} publikasi/BRS baru & forward WA...`,
    );
    try {
      const res = await apiFetch("/documents/bps/auto-monitor/run", {
        method: "POST",
        body: JSON.stringify({ max_items: Number(scanMaxItems) || 3 }),
      });
      toast.success(res.message || "Pemindaian latar belakang dimulai!", {
        id: toastId,
      });
      if (onSyncSuccess) onSyncSuccess();
      setTimeout(() => {
        loadConfig();
        loadAlerts();
      }, 1500);
    } catch (err) {
      toast.error(`Gagal memulai pemindaian: ${err.message}`, { id: toastId });
    } finally {
      setIsScanningNow(false);
    }
  };

  const handleForwardAlert = async (alertId) => {
    setForwardingAlertId(alertId);
    const toastId = toast.loading("Meneruskan pesan ke WhatsApp...");
    try {
      const res = await apiFetch(`/documents/bps/alerts/${alertId}/forward`, {
        method: "POST",
      });
      toast.success(res.message || "Berhasil dikirim ke WhatsApp!", {
        id: toastId,
      });
      loadAlerts(alertsPage);
    } catch (err) {
      toast.error(err.message || "Gagal mengirim ke WhatsApp", { id: toastId });
    } finally {
      setForwardingAlertId(null);
    }
  };

  const handleCopyWaMessage = (msg) => {
    if (!msg) return;
    navigator.clipboard.writeText(msg);
    toast.success("Pesan WhatsApp berhasil disalin ke clipboard!");
  };

  const handleToggleSelectAllOnPage = () => {
    const pagePubIds = previewData.publications.map((p) => p.pub_id);
    const allSelected = pagePubIds.every((id) => selectedPubIds.includes(id));

    if (allSelected) {
      setSelectedPubIds((prev) =>
        prev.filter((id) => !pagePubIds.includes(id)),
      );
    } else {
      setSelectedPubIds((prev) =>
        Array.from(new Set([...prev, ...pagePubIds])),
      );
    }
  };

  const handleSelectOnlyNew = () => {
    const newPubIds = previewData.publications
      .filter((p) => !p.is_downloaded || p.is_updated)
      .map((p) => p.pub_id);
    setSelectedPubIds(newPubIds);
    toast.success(
      `${newPubIds.length} publikasi baru atau yang memiliki revisi dipilih.`,
    );
  };

  const handleClearSelection = () => {
    setSelectedPubIds([]);
  };

  const handleToggleSelectOne = (pubId) => {
    setSelectedPubIds((prev) =>
      prev.includes(pubId)
        ? prev.filter((id) => id !== pubId)
        : [...prev, pubId],
    );
  };

  const handleStartSyncSelected = async () => {
    if (selectedPubIds.length === 0) {
      toast.error(
        "Silakan centang minimal satu dokumen yang ingin disinkronkan.",
      );
      return;
    }

    const selectedPubs = previewData.publications.filter((p) =>
      selectedPubIds.includes(p.pub_id),
    );

    setIsStartingSync(true);
    onClose();
    const toastId = toast.loading(
      `Menyiapkan unduhan ${selectedPubIds.length} dokumen BPS...`,
    );

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

      toast.success(res.message || `Sinkronisasi BPS dimulai!`, {
        id: toastId,
      });
      onSyncSuccess();
    } catch (err) {
      toast.error(`Gagal memulai sinkronisasi: ${err.message}`, {
        id: toastId,
      });
    } finally {
      setIsStartingSync(false);
    }
  };

  const handleStartSyncAllNew = async () => {
    setIsStartingSync(true);
    onClose();
    const toastId = toast.loading(
      "Memulai sinkronisasi seluruh dokumen baru BPS...",
    );

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

      toast.success(
        res.message || "Sinkronisasi seluruh publikasi baru dimulai!",
        { id: toastId },
      );
      onSyncSuccess();
    } catch (err) {
      toast.error(`Gagal memulai sinkronisasi: ${err.message}`, {
        id: toastId,
      });
    } finally {
      setIsStartingSync(false);
    }
  };

  if (!isOpen || typeof window === "undefined") return null;

  const isAllPageSelected =
    previewData.publications.length > 0 &&
    previewData.publications.every((p) => selectedPubIds.includes(p.pub_id));

  return createPortal(
    <div className="fixed inset-0 z-50 w-screen h-screen min-h-screen overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 m-0">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] max-h-[850px] flex flex-col overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="shrink-0 p-4 sm:px-6 sm:py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/90 backdrop-blur-sm">
          <div>
            <h3 className="text-base font-bold text-gray-800">
              Tarik Data & Otomatisasi BPS Web API
            </h3>
            <p className="text-xs text-gray-500">
              Sinkronisasi publikasi resmi BPS, pemantauan otomatis, perangkuman
              AI, dan forward WhatsApp.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation - Fixed Sticky / Shrink-0 agar tidak terhalang saat scroll */}
        <div className="shrink-0 bg-white border-b border-gray-200 px-6 flex items-center gap-2 overflow-x-auto hide-scrollbar z-10 min-h-[48px]">
          <button
            type="button"
            onClick={() => setActiveTab("sync")}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-2 text-xs font-semibold whitespace-nowrap ${
              activeTab === "sync"
                ? "border-blue-600 text-blue-600 font-bold bg-blue-50/40"
                : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
            }`}
          >
            <CloudDownloadIcon />
            <span>Pilih Publikasi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("automation")}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-2 text-xs font-semibold whitespace-nowrap ${
              activeTab === "automation"
                ? "border-blue-600 text-blue-600 font-bold bg-blue-50/40"
                : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
            }`}
          >
            <SparklesIcon />
            <span>Otomatisasi & WA</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("alerts");
              loadAlerts(1);
            }}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-2 text-xs font-semibold whitespace-nowrap ${
              activeTab === "alerts"
                ? "border-blue-600 text-blue-600 font-bold bg-blue-50/40"
                : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
            }`}
          >
            <WhatsAppIcon />
            <span>Rangkuman AI & Siaran WA</span>
            {(alertsPagination?.total > 0 || alerts.length > 0) && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">
                {alertsPagination?.total || alerts.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("config")}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-2 text-xs font-semibold whitespace-nowrap ${
              activeTab === "config"
                ? "border-blue-600 text-blue-600 font-bold bg-blue-50/40"
                : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
            }`}
          >
            <SettingsIcon />
            <span>Pengaturan BPS</span>
          </button>
        </div>

        {/* Modal Body - Scrollable Content with min-h-0 */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4 bg-white">
          {/* Live Progress Bar jika sedang sinkronisasi / auto-monitor */}
          {bpsSyncJobStatus && bpsSyncJobStatus.status !== "IDLE" && (
            <JobProgressBar
              title="Sinkronisasi BPS Web API"
              jobStatus={bpsSyncJobStatus}
              onStop={onStopBpsSync}
              onReset={onResetBpsSync}
              onDismiss={onDismissBpsSync}
            />
          )}

          {/* Live Progress Bar jika sedang proses chunking PDF */}
          {chunkingJobStatus && chunkingJobStatus.status !== "IDLE" && (
            <JobProgressBar
              title="Proses Chunking Dokumen PDF"
              jobStatus={chunkingJobStatus}
              onStop={onStopChunking}
              onReset={onResetChunking}
              onDismiss={onDismissChunking}
            />
          )}

          {/* TAB 1: OTOMATISASI & WHATSAPP */}
          {activeTab === "automation" && (
            <div className="space-y-4 w-full py-1">
              {/* Banner Status Pemantauan */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">
                        Pemantauan Otomatis (SIGAP)
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          config.auto_sync
                            ? "bg-green-100 text-green-800 border border-green-300"
                            : "bg-gray-100 text-gray-600 border border-gray-300"
                        }`}
                      >
                        {config.auto_sync ? "AKTIF" : "NONAKTIF"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {config.auto_sync
                        ? `Sistem memeriksa publikasi terbaru BPS setiap ${config.sync_interval_hours || 6} jam di latar belakang.`
                        : "Pemantauan otomatis saat ini sedang dimatikan."}
                    </p>
                    {config.last_sync_at && (
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Pemeriksaan Terakhir:{" "}
                        {new Date(config.last_sync_at).toLocaleString("id-ID")}{" "}
                        ({config.last_sync_status || "IDLE"})
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 shadow-sm text-xs">
                      <span className="text-gray-500 font-medium">Batas:</span>
                      <select
                        value={scanMaxItems}
                        onChange={(e) =>
                          setScanMaxItems(Number(e.target.value))
                        }
                        className="font-bold text-blue-700 bg-transparent focus:outline-none cursor-pointer text-xs"
                      >
                        <option value={1}>1 Dokumen</option>
                        <option value={3}>3 Dokumen (Cepat)</option>
                        <option value={5}>5 Dokumen</option>
                        <option value={10}>10 Dokumen</option>
                        <option value={20}>20 Dokumen</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={handleTriggerScanNow}
                      disabled={isScanningNow}
                      className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3.5 py-2 rounded-lg text-xs shadow-sm transition-colors disabled:opacity-50"
                    >
                      <RefreshIcon />
                      <span>
                        {isScanningNow
                          ? "Sedang Memindai..."
                          : "Pindai & Forward Sekarang"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Pengaturan Penjadwalan & WhatsApp */}
              <form
                onSubmit={handleSaveConfig}
                className="bg-white border border-gray-200 rounded-xl p-4 space-y-4"
              >
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider border-b pb-2">
                  Pengaturan Penjadwalan & WhatsApp Forwarding
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <input
                      type="checkbox"
                      id="auto_sync_toggle"
                      checked={Boolean(config.auto_sync)}
                      onChange={(e) =>
                        setConfig({ ...config, auto_sync: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                    />
                    <label
                      htmlFor="auto_sync_toggle"
                      className="text-xs font-medium text-gray-800 cursor-pointer"
                    >
                      Aktifkan Background Auto-Sync
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Interval Pengecekan
                    </label>
                    <select
                      value={config.sync_interval_hours || 6}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          sync_interval_hours: parseInt(e.target.value) || 6,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={1}>Setiap 1 Jam</option>
                      <option value={3}>Setiap 3 Jam</option>
                      <option value={6}>Setiap 6 Jam (Direkomendasikan)</option>
                      <option value={12}>Setiap 12 Jam</option>
                      <option value={24}>Setiap 24 Jam (1 Kali Sehari)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 space-y-3">
                  <div className="flex items-center gap-2.5 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <input
                      type="checkbox"
                      id="wa_channel_toggle"
                      checked={Boolean(config.wa_channel_enabled)}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          wa_channel_enabled: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300"
                    />
                    <label
                      htmlFor="wa_channel_toggle"
                      className="text-xs font-medium text-emerald-900 cursor-pointer"
                    >
                      Forward Otomatis Rilis Publikasi Baru ke WhatsApp
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Gateway Lokal Card */}
                    <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                            <span>🟢 Local WhatsApp Gateway (Baileys)</span>
                          </label>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              waStatus?.is_connected
                                ? "bg-emerald-100 text-emerald-800"
                                : waStatus?.status === "SCAN_QR"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            {waStatus?.is_connected
                              ? "Terhubung"
                              : waStatus?.status === "SCAN_QR"
                                ? "Menunggu Scan"
                                : waStatus?.status || "Port 3001"}
                          </span>
                        </div>

                        {waStatus?.phone_formatted ? (
                          <div className="mt-2 p-2 bg-white rounded-lg border border-emerald-200 flex items-center justify-between shadow-2xs">
                            <div>
                              <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                                Nomor Bot Aktif
                              </span>
                              <span className="font-bold text-emerald-950 font-mono text-xs tracking-wide">
                                {waStatus.phone_formatted}
                              </span>
                            </div>
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded">
                              ✓ Online
                            </span>
                          </div>
                        ) : (
                          <p className="text-[11px] text-emerald-800 leading-relaxed mt-1">
                            {waStatus?.status === "SCAN_QR"
                              ? "Perangkat belum ditautkan. Klik tombol di bawah untuk scan QR code menggunakan WhatsApp di HP."
                              : "Berjalan di server lokal sendiri. Mendukung pengiriman pesan tanpa batas kuota serta otomatis melampirkan cover gambar publikasi & BRS."}
                          </p>
                        )}
                      </div>

                      {/* Tombol Ganti Nomor / Scan QR & Hapus Nomor & Cek Status */}
                      <div className="mt-3 pt-2.5 border-t border-emerald-200/80 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              if (waStatus?.status === "SCAN_QR") {
                                setShowQrModal(true);
                              } else {
                                handleResetWaSession();
                              }
                            }}
                            disabled={isResettingWa}
                            className="px-2.5 py-1.5 bg-white hover:bg-emerald-100/70 border border-emerald-300 text-emerald-900 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                            title="Ganti nomor WhatsApp bot atau hubungkan ulang"
                          >
                            <span>🔄</span>
                            <span>
                              {isResettingWa
                                ? "Mereset..."
                                : waStatus?.is_connected
                                  ? "Ganti Nomor"
                                  : "Scan QR Code"}
                            </span>
                          </button>

                          {waStatus?.is_connected && (
                            <button
                              type="button"
                              onClick={handleDisconnectWaSession}
                              disabled={isResettingWa}
                              className="px-2 py-1.5 bg-white hover:bg-red-50 border border-red-200 text-red-600 hover:text-red-700 rounded-lg text-[11px] font-medium flex items-center gap-1 shadow-2xs transition-colors"
                              title="Putuskan / Hapus nomor bot WhatsApp dari gateway"
                            >
                              <span>🗑️</span>
                              <span>Hapus Nomor Bot</span>
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={loadWaStatus}
                          disabled={isLoadingWaStatus}
                          className="text-[11px] text-emerald-700 hover:text-emerald-900 font-medium flex items-center gap-1 transition-colors ml-auto"
                          title="Perbarui status koneksi gateway"
                        >
                          <span>
                            {isLoadingWaStatus
                              ? "Mengecek..."
                              : "⚡ Cek Status"}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Target Penerima */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-gray-700">
                          Target Penerima WhatsApp (Nomor / ID Grup)
                        </label>
                        <div className="flex items-center gap-2">
                          {config.wa_target && (
                            <button
                              type="button"
                              onClick={() => {
                                setConfig({ ...config, wa_target: "" });
                                toast.success(
                                  "Nomor target penerima dikosongkan.",
                                );
                              }}
                              className="text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors"
                              title="Kosongkan nomor target penerima"
                            >
                              Hapus Target
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleFetchWaGroups}
                            disabled={isLoadingWaGroups}
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 transition-colors"
                            title="Ambil daftar grup WhatsApp yang diikuti bot lokal untuk memilih target secara instan"
                          >
                            <span>
                              {isLoadingWaGroups
                                ? "Memuat Grup..."
                                : "👥 Pilih Grup (Local Gateway)"}
                            </span>
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={config.wa_target || ""}
                          onChange={(e) =>
                            setConfig({ ...config, wa_target: e.target.value })
                          }
                          placeholder="08123456789 atau 120363428675326334@g.us"
                          className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                        {config.wa_target && (
                          <button
                            type="button"
                            onClick={() => {
                              setConfig({ ...config, wa_target: "" });
                              toast.success(
                                "Nomor target penerima dikosongkan.",
                              );
                            }}
                            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-red-600 transition-colors"
                            title="Hapus / Kosongkan nomor target penerima"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      {showGroupPicker && waGroups.length > 0 && (
                        <div className="mt-2 p-2.5 bg-blue-50/80 border border-blue-200 rounded-lg text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-blue-900">
                              Daftar Grup WhatsApp Terdeteksi (Local Gateway):
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowGroupPicker(false)}
                              className="text-gray-500 hover:text-gray-700 text-[11px]"
                            >
                              ✕ Tutup
                            </button>
                          </div>
                          <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                            {waGroups.map((g) => (
                              <div
                                key={g.id}
                                onClick={() => {
                                  setConfig({ ...config, wa_target: g.id });
                                  setShowGroupPicker(false);
                                  toast.success(`Target diset ke: "${g.name}"`);
                                }}
                                className={`p-2 rounded-lg cursor-pointer transition-colors border ${
                                  config.wa_target === g.id
                                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                    : "bg-white hover:bg-blue-100/70 text-gray-800 border-gray-200"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold">{g.name}</span>
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                      config.wa_target === g.id
                                        ? "bg-blue-700 text-white"
                                        : "bg-gray-100 text-gray-600"
                                    }`}
                                  >
                                    {g.member_count} Anggota
                                  </span>
                                </div>
                                <div
                                  className={`text-[10px] font-mono mt-0.5 truncate ${
                                    config.wa_target === g.id
                                      ? "text-blue-100"
                                      : "text-gray-500"
                                  }`}
                                >
                                  ID: {g.id}
                                </div>
                                {g.members && g.members.length > 0 && (
                                  <div
                                    className={`text-[9px] mt-0.5 truncate ${
                                      config.wa_target === g.id
                                        ? "text-blue-200"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    Anggota: {g.members.slice(0, 3).join(", ")}
                                    {g.members.length > 3 ? "..." : ""}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                        💡 <strong>Catatan Saluran Pengumuman:</strong> Jika
                        target adalah Saluran Pengumuman Komunitas WhatsApp,
                        pastikan nomor bot WhatsApp Anda sudah dijadikan{" "}
                        <strong>Admin Komunitas</strong> di aplikasi WhatsApp
                        agar diizinkan mempublikasikan pesan.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      URL Endpoint Local Gateway
                    </label>
                    <input
                      type="text"
                      value={config.wa_webhook_url || ""}
                      onChange={(e) =>
                        setConfig({ ...config, wa_webhook_url: e.target.value })
                      }
                      placeholder="http://localhost:3001/send"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Default:{" "}
                      <code className="text-gray-600">
                        http://localhost:3001/send
                      </code>{" "}
                      (Endpoint server Baileys di folder wa-gateway).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      URL Frontend Chatbot (Domain Short Link)
                    </label>
                    <input
                      type="text"
                      value={config.chatbot_url || ""}
                      onChange={(e) =>
                        setConfig({ ...config, chatbot_url: e.target.value })
                      }
                      placeholder="https://sigap.bps7500.my.id"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Domain tautan singkat yang dibagikan ke WhatsApp (contoh: <code className="text-gray-600">https://sigap.bps7500.my.id</code> di production, atau <code className="text-gray-600">http://localhost:5174</code> di lokal).
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={isSavingConfig}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 text-xs"
                  >
                    {isSavingConfig
                      ? "Menyimpan..."
                      : "Simpan Pengaturan Otomatisasi"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: RIWAYAT SIARAN & RANGKUMAN AI */}
          {activeTab === "alerts" && (
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div>
                  <h4 className="text-xs font-bold text-gray-800">
                    Riwayat Publikasi Otomatis & Rangkuman AI
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Publikasi BPS terbaru yang berhasil diunduh, dirangkum AI,
                    dan diteruskan ke WhatsApp.
                  </p>
                </div>
                <button
                  onClick={() =>
                    loadAlerts(
                      alertsPage,
                      alertSearchKeyword,
                      alertFilterType,
                      alertFilterStatus,
                    )
                  }
                  disabled={isLoadingAlerts}
                  className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 font-medium"
                >
                  <RefreshIcon />
                  <span>{isLoadingAlerts ? "Memuat..." : "Segarkan"}</span>
                </button>
              </div>

              {/* Toolbar Pencarian & Filter */}
              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs space-y-2.5">
                <form
                  onSubmit={handleSearchAlerts}
                  className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center"
                >
                  {/* Input Pencarian */}
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <SearchIcon />
                    </div>
                    <input
                      type="text"
                      value={alertSearchKeyword}
                      onChange={(e) => setAlertSearchKeyword(e.target.value)}
                      placeholder="Cari judul publikasi, ID rilis, rangkuman, atau pesan WA..."
                      className="w-full pl-9 pr-8 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {alertSearchKeyword && (
                      <button
                        type="button"
                        onClick={() => {
                          setAlertSearchKeyword("");
                          loadAlerts(1, "", alertFilterType, alertFilterStatus);
                        }}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600"
                        title="Hapus kata kunci"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filter Tipe Dokumen */}
                  <select
                    value={alertFilterType}
                    onChange={(e) => handleFilterTypeChange(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-700 font-medium"
                  >
                    <option value="ALL">Semua Tipe</option>
                    <option value="PUBLIKASI">Publikasi</option>
                    <option value="BRS">BRS (Berita Resmi Statistik)</option>
                  </select>

                  {/* Filter Status WA */}
                  <select
                    value={alertFilterStatus}
                    onChange={(e) => handleFilterStatusChange(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-700 font-medium"
                  >
                    <option value="ALL">Semua Status WA</option>
                    <option value="SENT">Terkirim (SENT)</option>
                    <option value="READY">Siap Kirim (READY)</option>
                    <option value="FAILED">Gagal (FAILED)</option>
                  </select>

                  {/* Tombol Aksi */}
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="submit"
                      disabled={isLoadingAlerts}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <SearchIcon />
                      <span>Cari</span>
                    </button>
                    {(alertSearchKeyword ||
                      alertFilterType !== "ALL" ||
                      alertFilterStatus !== "ALL") && (
                      <button
                        type="button"
                        onClick={handleResetAlertsFilter}
                        className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-medium transition-colors"
                        title="Reset Filter & Pencarian"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </form>

                {/* Counter & Active Filter Indicators */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100 gap-2">
                  <div>
                    {isLoadingAlerts ? (
                      <span>Memuat riwayat...</span>
                    ) : (
                      <span>
                        Menampilkan{" "}
                        <strong className="text-gray-800">
                          {alerts.length}
                        </strong>{" "}
                        dari{" "}
                        <strong className="text-gray-800">
                          {alertsPagination.total || 0}
                        </strong>{" "}
                        riwayat siaran
                        {alertsPagination.pages > 1 && (
                          <span className="text-gray-400">
                            {" "}
                            (Halaman {alertsPagination.page} dari{" "}
                            {alertsPagination.pages})
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  {(alertSearchKeyword ||
                    alertFilterType !== "ALL" ||
                    alertFilterStatus !== "ALL") && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="text-gray-400">Filter Aktif:</span>
                      {alertSearchKeyword && (
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-medium">
                          "{alertSearchKeyword}"
                        </span>
                      )}
                      {alertFilterType !== "ALL" && (
                        <span className="bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded font-medium">
                          Tipe: {alertFilterType}
                        </span>
                      )}
                      {alertFilterStatus !== "ALL" && (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                          Status: {alertFilterStatus}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {isLoadingAlerts ? (
                <div className="py-12 text-center text-xs text-gray-500">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2"></div>
                  <p>Memuat riwayat publikasi & rangkuman AI...</p>
                </div>
              ) : alerts.length === 0 ? (
                alertSearchKeyword ||
                alertFilterType !== "ALL" ||
                alertFilterStatus !== "ALL" ? (
                  <div className="py-10 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 p-6">
                    <p className="text-sm font-semibold text-gray-700">
                      Tidak Ada Riwayat yang Cocok
                    </p>
                    <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                      Tidak ditemukan publikasi atau siaran yang sesuai dengan
                      kata kunci atau filter yang Anda terapkan.
                    </p>
                    <button
                      type="button"
                      onClick={handleResetAlertsFilter}
                      className="mt-3 px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 shadow-xs"
                    >
                      Reset Filter & Pencarian
                    </button>
                  </div>
                ) : (
                  <div className="py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 p-6">
                    <p className="text-sm font-semibold text-gray-700">
                      Belum Ada Riwayat Publikasi Otomatis
                    </p>
                    <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                      Sistem belum mencatat publikasi baru dari pemantauan
                      otomatis. Anda dapat menekan tombol di bawah untuk
                      memindai BPS Web API sekarang.
                    </p>
                    <button
                      onClick={handleTriggerScanNow}
                      disabled={isScanningNow}
                      className="mt-4 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-xs shadow-sm"
                    >
                      <RefreshIcon />
                      <span>
                        {isScanningNow
                          ? "Sedang Memindai..."
                          : "Pindai Publikasi Baru Sekarang"}
                      </span>
                    </button>
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-gray-300 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row gap-3.5 items-start">
                        {/* Thumbnail Cover Publikasi / BRS */}
                        {alert.cover_url && (
                          <div className="relative group shrink-0 w-16 h-22 sm:w-20 sm:h-28 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shadow-xs">
                            <img
                              src={alert.cover_url}
                              alt={alert.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              loading="lazy"
                              onError={(e) => {
                                e.target.onerror = null;
                                if (e.target.parentElement)
                                  e.target.parentElement.style.display = "none";
                              }}
                            />
                            <a
                              href={alert.cover_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-semibold transition-opacity"
                              title="Buka gambar cover resolusi penuh"
                            >
                              🔍 Cover
                            </a>
                          </div>
                        )}

                        <div className="flex-1 min-w-0 w-full">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    alert.doc_type === "BRS"
                                      ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                      : "bg-blue-100 text-blue-800 border border-blue-200"
                                  }`}
                                >
                                  {alert.doc_type === "BRS"
                                    ? "📰 BRS"
                                    : "📘 Publikasi"}
                                </span>
                                <span className="text-xs font-bold text-gray-900">
                                  {alert.title}
                                </span>
                                {alert.is_update && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    🔄 Revisi BPS
                                  </span>
                                )}
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    alert.wa_status === "SENT"
                                      ? "bg-green-100 text-green-800"
                                      : alert.wa_status === "FAILED"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {alert.wa_status === "SENT"
                                    ? "✓ Terkirim ke WA"
                                    : alert.wa_status === "FAILED"
                                      ? "✕ Gagal Kirim"
                                      : "⚡ Siap Dikirim"}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                Rilis: {alert.release_date || "-"}{" "}
                                {alert.updt_date
                                  ? `• Diperbarui: ${alert.updt_date}`
                                  : ""}{" "}
                                • Dipindai:{" "}
                                {alert.created_at
                                  ? new Date(alert.created_at).toLocaleString(
                                      "id-ID",
                                    )
                                  : "-"}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyWaMessage(alert.wa_message)
                                }
                                className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 rounded text-xs font-medium flex items-center gap-1"
                                title="Salin teks rilis resmi untuk WhatsApp"
                              >
                                <CopyIcon />
                                <span>Salin Pesan WA</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleForwardAlert(alert.id)}
                                disabled={forwardingAlertId === alert.id}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                                title="Kirim ulang rilis beserta cover ke Channel WhatsApp"
                              >
                                <WhatsAppIcon />
                                <span>
                                  {forwardingAlertId === alert.id
                                    ? "Mengirim..."
                                    : "Kirim WA"}
                                </span>
                              </button>
                              {alert.pdf_url && (
                                <a
                                  href={alert.pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-medium"
                                  title="Buka PDF resmi BPS"
                                >
                                  PDF BPS ↗
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Box Rangkuman AI */}
                          {alert.summary && (
                            <div className="mt-2.5 p-3 bg-blue-50/60 border border-blue-100 rounded-lg text-xs text-gray-700">
                              <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-1">
                                <SparklesIcon />
                                <span>Rangkuman Eksekutif Gemini AI:</span>
                              </div>
                              <div className="whitespace-pre-line text-[11px] text-gray-700 pl-2 border-l-2 border-blue-300">
                                {alert.summary}
                              </div>
                            </div>
                          )}

                          {/* Badge Short Link Chatbot */}
                          {alert.short_url && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200/80 rounded-md px-2.5 py-1.5 w-fit">
                              <span className="font-semibold text-[11px]">🔗 Short Link Chatbot:</span>
                              <a
                                href={alert.short_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline font-mono text-[11px] text-blue-600 hover:text-blue-800"
                              >
                                {alert.short_url}
                              </a>
                            </div>
                          )}

                          {/* Box Preview Pesan WhatsApp */}
                          {alert.wa_message && (
                            <details className="mt-2 text-xs">
                              <summary className="cursor-pointer text-gray-500 hover:text-gray-800 text-[11px] font-semibold select-none">
                                Lihat Format Pesan WhatsApp Lengkap ▼
                              </summary>
                              <div className="mt-1.5 p-2.5 bg-gray-50 border border-gray-200 rounded-lg font-mono text-[11px] text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                                {alert.cover_url && (
                                  <div className="mb-2 p-1.5 bg-blue-50 border border-blue-200 rounded text-blue-900 font-sans flex items-center gap-2">
                                    <span>🖼️</span>
                                    <span className="font-semibold">
                                      Media Gambar Cover:
                                    </span>
                                    <a
                                      href={alert.cover_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 underline truncate max-w-xs text-[10px]"
                                    >
                                      {alert.cover_url}
                                    </a>
                                  </div>
                                )}
                                {alert.wa_message}
                              </div>
                            </details>
                          )}

                          {alert.wa_error && (
                            <p className="text-[11px] text-red-600 mt-1.5">
                              Catatan Error: {alert.wa_error}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Pagination Controls Riwayat Alerts */}
                  {alertsPagination.pages > 1 && (
                    <div className="mt-4 pt-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                      <p className="text-gray-500 text-[11px]">
                        Halaman{" "}
                        <span className="font-semibold text-gray-800">
                          {alertsPagination.page}
                        </span>{" "}
                        dari{" "}
                        <span className="font-semibold text-gray-800">
                          {alertsPagination.pages}
                        </span>{" "}
                        (Total{" "}
                        <span className="font-semibold text-gray-800">
                          {alertsPagination.total}
                        </span>{" "}
                        riwayat)
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => loadAlerts(alertsPagination.page - 1)}
                          disabled={
                            alertsPagination.page <= 1 || isLoadingAlerts
                          }
                          className="px-2.5 py-1 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs flex items-center gap-1 transition-colors"
                        >
                          ‹ Sebelumnya
                        </button>

                        <div className="flex items-center gap-1">
                          {Array.from(
                            { length: alertsPagination.pages },
                            (_, i) => i + 1,
                          )
                            .filter((p) => {
                              return (
                                p === 1 ||
                                p === alertsPagination.pages ||
                                Math.abs(p - alertsPagination.page) <= 1
                              );
                            })
                            .map((p, idx, arr) => {
                              const prevPage = arr[idx - 1];
                              const showEllipsis = prevPage && p - prevPage > 1;
                              return (
                                <React.Fragment key={p}>
                                  {showEllipsis && (
                                    <span className="px-1 text-gray-400 select-none">
                                      ...
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => loadAlerts(p)}
                                    disabled={isLoadingAlerts}
                                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                                      p === alertsPagination.page
                                        ? "bg-blue-600 text-white font-bold shadow-xs"
                                        : "border border-gray-200 text-gray-700 hover:bg-gray-100"
                                    }`}
                                  >
                                    {p}
                                  </button>
                                </React.Fragment>
                              );
                            })}
                        </div>

                        <button
                          type="button"
                          onClick={() => loadAlerts(alertsPagination.page + 1)}
                          disabled={
                            alertsPagination.page >= alertsPagination.pages ||
                            isLoadingAlerts
                          }
                          className="px-2.5 py-1 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs flex items-center gap-1 transition-colors"
                        >
                          Berikutnya ›
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PENGATURAN BPS */}
          {activeTab === "config" && (
            <form
              onSubmit={handleSaveConfig}
              className="space-y-3.5 w-full py-2"
            >
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
                  onChange={(e) =>
                    setConfig({ ...config, api_key: e.target.value })
                  }
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
                      const selected = domainOptions.find(
                        (d) => d.code === e.target.value,
                      );
                      setConfig({
                        ...config,
                        domain_code: e.target.value,
                        domain_name: selected
                          ? selected.name
                          : config.domain_name,
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
                    onChange={(e) =>
                      setConfig({ ...config, domain_code: e.target.value })
                    }
                    placeholder="7500"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    URL Frontend Chatbot (Domain Short Link)
                  </label>
                  <input
                    type="text"
                    value={config.chatbot_url || ""}
                    onChange={(e) =>
                      setConfig({ ...config, chatbot_url: e.target.value })
                    }
                    placeholder="https://sigap.bps7500.my.id"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Domain tautan singkat yang dibagikan ke WhatsApp (contoh: <code className="text-gray-600">https://sigap.bps7500.my.id</code>).
                  </p>
                </div>
              </div>

              {config.last_sync_at && (
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
                  <span className="font-semibold">Terakhir Sinkron:</span>{" "}
                  {new Date(config.last_sync_at).toLocaleString("id-ID")} (
                  {config.last_sync_status || "IDLE"})
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

          {/* TAB 4: PILIH PUBLIKASI (MANUAL) */}
          {activeTab === "sync" && (
            <div className="space-y-3">
              {/* Toggle Kategori Dokumen BPS */}
              <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg w-fit text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewType("publication");
                    setSelectedPubIds([]);
                    loadPreview(1, config.domain_code, "publication");
                  }}
                  className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                    previewType === "publication"
                      ? "bg-white text-blue-700 shadow-sm font-bold"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <span>📘</span>
                  <span>Publikasi Buku Statistik</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewType("brs");
                    setSelectedPubIds([]);
                    loadPreview(1, config.domain_code, "brs");
                  }}
                  className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                    previewType === "brs"
                      ? "bg-white text-indigo-700 shadow-sm font-bold"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <span>📰</span>
                  <span>Berita Resmi Statistik (BRS)</span>
                </button>
              </div>

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
                    <span>
                      {isLoadingPreview ? "Memuat..." : "Cari di BPS"}
                    </span>
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
                    {isAllPageSelected
                      ? "Batal Pilih Semua"
                      : "Pilih Semua Halaman Ini"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectOnlyNew}
                    className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 text-blue-700 font-medium"
                  >
                    Pilih Yang Baru / Revisi
                  </button>
                  {selectedPubIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-medium"
                    >
                      Batal Semua ({selectedPubIds.length})
                    </button>
                  )}
                </div>

                <div className="text-gray-500 font-medium">
                  Terpilih:{" "}
                  <span className="text-blue-600 font-bold">
                    {selectedPubIds.length}
                  </span>{" "}
                  publikasi
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-[42vh] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 sticky top-0 z-10">
                      <tr>
                        <th className="p-2.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isAllPageSelected}
                            onChange={handleToggleSelectAllOnPage}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="p-2.5">Judul Publikasi</th>
                        <th className="p-2.5 w-24">Tanggal Rilis</th>
                        <th className="p-2.5 w-20">Ukuran</th>
                        <th className="p-2.5 w-24 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {isLoadingPreview ? (
                        <tr>
                          <td
                            colSpan="5"
                            className="py-8 text-center text-gray-500"
                          >
                            Memuat daftar publikasi dari BPS Web API...
                          </td>
                        </tr>
                      ) : previewData.publications.length === 0 ? (
                        <tr>
                          <td
                            colSpan="5"
                            className="py-8 text-center text-gray-500"
                          >
                            Tidak ada data publikasi yang ditemukan.
                          </td>
                        </tr>
                      ) : (
                        previewData.publications.map((item) => {
                          const isSelected = selectedPubIds.includes(
                            item.pub_id,
                          );
                          return (
                            <tr
                              key={item.pub_id}
                              className={`hover:bg-blue-50/50 transition-colors ${
                                isSelected ? "bg-blue-50/30" : ""
                              }`}
                            >
                              <td className="p-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() =>
                                    handleToggleSelectOne(item.pub_id)
                                  }
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                              </td>
                              <td className="p-2.5 font-medium text-gray-800">
                                <div className="flex items-start gap-2.5">
                                  {item.cover && (
                                    <img
                                      src={item.cover}
                                      alt=""
                                      className="w-7 h-10 shrink-0 rounded object-cover border border-gray-200 bg-gray-50 shadow-2xs mt-0.5"
                                      loading="lazy"
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.style.display = "none";
                                      }}
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                          item.doc_type === "BRS"
                                            ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                            : "bg-blue-50 text-blue-700 border border-blue-200"
                                        }`}
                                      >
                                        {item.doc_type === "BRS"
                                          ? "BRS"
                                          : "Buku"}
                                      </span>
                                      <span>{item.title}</span>
                                    </div>
                                    {item.category &&
                                      item.category !==
                                        "Berita Resmi Statistik" && (
                                        <p className="text-[10px] text-gray-400 font-normal mt-0.5">
                                          Kategori: {item.category}
                                        </p>
                                      )}
                                    {item.abstract && (
                                      <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                                        {item.abstract}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-2.5 text-gray-500 whitespace-nowrap">
                                <div>{item.rl_date || "-"}</div>
                                {item.updt_date &&
                                  item.updt_date !== item.rl_date && (
                                    <div
                                      className="text-[10px] text-amber-600 font-semibold"
                                      title={`Tanggal update resmi: ${item.updt_date}`}
                                    >
                                      Rev: {item.updt_date}
                                    </div>
                                  )}
                              </td>
                              <td className="p-2.5 text-gray-500 whitespace-nowrap">
                                {item.size || "-"}
                              </td>
                              <td className="p-2.5 text-center whitespace-nowrap">
                                {item.is_downloaded ? (
                                  item.is_updated ? (
                                    <span
                                      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 cursor-help"
                                      title={`Tersedia revisi data baru dari BPS (${item.updt_date || "Tanggal update baru"}). Centang dan sinkronkan untuk memperbarui vektor & riwayat.`}
                                    >
                                      🔄 Ada Revisi
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800">
                                      ✓ Tersimpan
                                    </span>
                                  )
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
                      Halaman {previewData.pagination.page} dari{" "}
                      {previewData.pagination.pages}
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
                        disabled={
                          previewPage >= previewData.pagination.pages ||
                          isLoadingPreview
                        }
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

        <div className="shrink-0 p-4 sm:px-6 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-2">
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

          {activeTab === "automation" && (
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleTriggerScanNow}
                disabled={isScanningNow}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <SparklesIcon />
                <span>
                  {isScanningNow
                    ? "Memindai..."
                    : "Jalankan Pengecekan Sekarang"}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Scan QR Code / Ganti Nomor WhatsApp */}
      {showQrModal &&
        createPortal(
          <div className="fixed inset-0 z-[70] w-screen h-screen min-h-screen overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 m-0">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/20 rounded-lg">
                    <WhatsAppIcon />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">
                      Tautkan Nomor WhatsApp Bot
                    </h4>
                    <p className="text-[11px] text-emerald-100">
                      Scan QR Code untuk mengganti atau menautkan bot
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 text-center space-y-4">
                {/* Petunjuk Langkah */}
                <div className="text-left bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-1.5">
                  <p className="font-bold text-gray-900 flex items-center gap-1.5">
                    <span>📱 Langkah Menghubungkan di HP:</span>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-600 leading-relaxed">
                    <li>
                      Buka aplikasi <strong>WhatsApp</strong> di HP Anda.
                    </li>
                    <li>
                      Tekan menu <strong>Titik Tiga</strong> (Android) atau{" "}
                      <strong>Pengaturan</strong> (iPhone).
                    </li>
                    <li>
                      Pilih <strong>Perangkat Tertaut</strong> &gt;{" "}
                      <strong>Tautkan Perangkat</strong>.
                    </li>
                    <li>
                      Arahkan kamera HP ke <strong>QR Code</strong> di bawah ini.
                    </li>
                  </ol>
                </div>

                {/* Area Gambar QR Code */}
                <div className="flex flex-col items-center justify-center min-h-[260px] p-4 bg-white border border-gray-200 rounded-2xl shadow-xs">
                  {waStatus?.is_connected ? (
                    <div className="py-8 space-y-3">
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto">
                        ✓
                      </div>
                      <p className="text-sm font-bold text-gray-800">
                        WhatsApp Berhasil Terhubung!
                      </p>
                      <p className="text-xs text-emerald-700 font-mono font-semibold">
                        {waStatus.phone_formatted || waStatus.phone}
                      </p>
                    </div>
                  ) : waStatus?.qr_image ? (
                    <div className="space-y-3">
                      <div className="p-2 bg-white rounded-xl border-2 border-dashed border-emerald-300 inline-block shadow-sm">
                        <img
                          src={waStatus.qr_image}
                          alt="WhatsApp Gateway QR Code"
                          className="w-56 h-56 object-contain rounded-lg"
                        />
                      </div>
                      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        <span className="text-[11px]">
                          Menunggu scan kamera WhatsApp...
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 space-y-3">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-emerald-600 border-t-transparent"></div>
                      <p className="text-xs text-gray-600 font-medium">
                        Menyiapkan QR Code dari Baileys Gateway...
                      </p>
                      <p className="text-[10px] text-gray-400 max-w-xs mx-auto">
                        Pastikan gateway lokal aktif di localhost:3001.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={loadWaStatus}
                  disabled={isLoadingWaStatus}
                  className="px-3 py-1.5 text-xs text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 bg-white font-medium flex items-center gap-1.5 transition-colors"
                >
                  <span>🔄</span>
                  <span>{isLoadingWaStatus ? "Memuat..." : "Segarkan QR"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>,
          window.document.body,
        )}

      {/* Modal Dialog Konfirmasi Aksi Kustom (Anti-Alert / Confirm Native) */}
      <ActionConfirmModal
        isOpen={actionConfirm.isOpen}
        onClose={closeActionConfirm}
        onConfirm={actionConfirm.onConfirm}
        title={actionConfirm.title}
        message={actionConfirm.message}
        confirmText={actionConfirm.confirmText}
        confirmColor={actionConfirm.confirmColor}
        isLoading={isResettingWa}
      />
    </div>,
    window.document.body,
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

  // Ref untuk mengingat job yang sudah ditutup/didismiss oleh pengguna agar tidak muncul berulang saat polling
  const dismissedJobsRef = useRef({
    bps: false,
    chunking: false,
  });

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
        // Jika job aktif kembali (RUNNING / STOPPING), buka kembali blokir dismissal
        if (
          chunkingStatus.status === "RUNNING" ||
          chunkingStatus.status === "STOPPING"
        ) {
          dismissedJobsRef.current.chunking = false;
        }

        // Jika job sudah selesai/gagal dan sudah ditutup oleh pengguna, jangan munculkan lagi
        if (
          dismissedJobsRef.current.chunking &&
          (chunkingStatus.status === "COMPLETED" ||
            chunkingStatus.status === "FAILED")
        ) {
          return null;
        }

        if (
          prev &&
          prev.status === "RUNNING" &&
          chunkingStatus.status === "COMPLETED"
        ) {
          toast.success(
            chunkingStatus.message || "Proses chunking PDF selesai!",
          );
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
        // Jika job aktif kembali (RUNNING / STOPPING), buka kembali blokir dismissal
        if (
          bpsStatus.status === "RUNNING" ||
          bpsStatus.status === "STOPPING"
        ) {
          dismissedJobsRef.current.bps = false;
        }

        // Jika job sudah selesai/gagal dan sudah ditutup oleh pengguna, jangan munculkan lagi
        if (
          dismissedJobsRef.current.bps &&
          (bpsStatus.status === "COMPLETED" || bpsStatus.status === "FAILED")
        ) {
          return null;
        }

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
  }, [
    chunkingJobStatus?.status,
    bpsSyncJobStatus?.status,
    fetchAllJobStatuses,
  ]);

  // Pastikan status job & dokumen langsung di-refresh seketika saat pengguna kembali ke tab browser
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchAllJobStatuses();
        fetchDocuments();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [fetchAllJobStatuses, fetchDocuments]);

  // Dismiss handlers: Menghilangkan banner seketika dan mereset status di server ke IDLE
  const handleDismissBpsSync = async () => {
    dismissedJobsRef.current.bps = true;
    setBpsSyncJobStatus(null);
    try {
      await apiFetch("/documents/bps/sync-reset", { method: "POST" });
    } catch (err) {
      console.warn("Gagal mereset status sinkronisasi BPS:", err);
    }
  };

  const handleDismissChunking = async () => {
    dismissedJobsRef.current.chunking = true;
    setChunkingJobStatus(null);
    try {
      await apiFetch("/documents/chunking/reset", { method: "POST" });
    } catch (err) {
      console.warn("Gagal mereset status chunking PDF:", err);
    }
  };

  // Handle Chunking Manual Folder
  const handleStartChunking = async () => {
    dismissedJobsRef.current.chunking = false;
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
    dismissedJobsRef.current.bps = true;
    try {
      await apiFetch("/documents/bps/sync-reset", { method: "POST" });
      toast.success("Status sinkronisasi BPS di-reset ke IDLE.");
      setBpsSyncJobStatus(null);
      fetchAllJobStatuses();
    } catch (err) {
      toast.error(`Gagal reset: ${err.message}`);
    }
  };

  const handleResetAllJobs = async () => {
    dismissedJobsRef.current.bps = true;
    dismissedJobsRef.current.chunking = true;
    try {
      await apiFetch("/documents/admin/force-reset-all", { method: "POST" });
      toast.success("Semua status job direset ke IDLE.");
      setChunkingJobStatus(null);
      setBpsSyncJobStatus(null);
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

  const handleConfirmDelete = async (
    docId,
    docFilename,
    deletePhysicalFile = true,
  ) => {
    const toastId = toast.loading("Menghapus dokumen...");
    try {
      const response = await apiFetch(
        `/documents/${docId}?delete_file=${deletePhysicalFile ? "true" : "false"}`,
        {
          method: "DELETE",
        },
      );
      toast.success(
        response.message || `Dokumen "${docFilename}" berhasil dihapus.`,
        { id: toastId },
      );
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
        {bpsSyncJobStatus && bpsSyncJobStatus.status !== "IDLE" && (
          <JobProgressBar
            title="Sinkronisasi BPS Web API"
            jobStatus={bpsSyncJobStatus}
            onStop={handleStopBpsSync}
            onReset={handleResetBpsSync}
            onDismiss={handleDismissBpsSync}
          />
        )}
        {chunkingJobStatus && chunkingJobStatus.status !== "IDLE" && (
          <JobProgressBar
            title="Proses Chunking Dokumen PDF"
            jobStatus={chunkingJobStatus}
            onStop={handleStopChunking}
            onReset={handleResetAllJobs}
            onDismiss={handleDismissChunking}
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
        bpsSyncJobStatus={bpsSyncJobStatus}
        onStopBpsSync={handleStopBpsSync}
        onResetBpsSync={handleResetBpsSync}
        onDismissBpsSync={handleDismissBpsSync}
        chunkingJobStatus={chunkingJobStatus}
        onStopChunking={handleStopChunking}
        onResetChunking={handleResetAllJobs}
        onDismissChunking={handleDismissChunking}
        onSyncSuccess={() => {
          dismissedJobsRef.current.bps = false;
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
            <h3 className="text-base font-bold text-gray-800">
              Daftar Dokumen Terdaftar
            </h3>
            <p className="text-xs text-gray-500">
              Total {pagination?.total_items || documents.length} dokumen telah
              diindeks ke sistem RAG
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
                <th
                  scope="col"
                  className="px-3 py-3 text-center whitespace-nowrap"
                >
                  Total Halaman
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-center whitespace-nowrap"
                >
                  Halaman Tabel
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-center whitespace-nowrap"
                >
                  Sumber Digital
                </th>
                <th scope="col" className="px-4 py-3 whitespace-nowrap">
                  Tanggal Terdaftar
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-center whitespace-nowrap"
                >
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : error ? (
                <tr>
                  <td
                    colSpan="6"
                    className="text-center py-8 text-red-500 font-medium"
                  >
                    Gagal memuat data: {error}
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-gray-400">
                    <div className="flex flex-col items-center gap-1.5">
                      <CloudDownloadIcon />
                      <p className="font-medium text-gray-600">
                        Belum ada dokumen yang terdaftar.
                      </p>
                      <p className="text-xs text-gray-400">
                        Klik <strong>"Tarik dari BPS Web API"</strong> atau{" "}
                        <strong>"Upload PDF"</strong> untuk menambahkan.
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
                    <td className="px-3 py-3 text-center text-gray-600">
                      {doc.total_pages}
                    </td>
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
                  pagination.total_items,
                )}
              </span>{" "}
              dari{" "}
              <span className="font-semibold text-gray-700">
                {pagination.total_items}
              </span>{" "}
              dokumen
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
