import React, { useCallback, useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import apiFetch from "../services/api";
import routes from "../routes";
import toast, { Toaster } from "react-hot-toast"; // <-- 1. IMPORT TOAST
import useDebounce from "../hooks/useDebounce";

// --- Komponen Ikon (tidak berubah) ---
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

// --- Komponen UI (tidak berubah) ---
const ChunkingProgress = ({ jobStatus, onStart, onStop }) => {
  if (!jobStatus) {
    return (
      <div className="w-full md:w-auto animate-pulse">
        <div className="h-10 bg-gray-200 rounded-lg w-64"></div>
      </div>
    );
  }

  const { status, progress, message } = jobStatus;

  if (status === "RUNNING" || status === "STOPPING") {
    return (
      <div className="w-full md:w-80 border border-gray-200 p-3 rounded-lg bg-white">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-semibold text-gray-700">
            {status === "STOPPING"
              ? "Menghentikan Proses..."
              : "Memproses PDF..."}
          </span>
          <span className="text-sm font-bold text-blue-600">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-500 truncate" title={message}>
            {message || "Memuat..."}
          </p>
          <button
            onClick={onStop}
            disabled={status === "STOPPING"}
            className="text-xs text-red-600 hover:underline disabled:opacity-50"
          >
            Hentikan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={onStart}
        className="bg-green-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
      >
        Proses Semua PDF di Folder
      </button>
      {status === "FAILED" && (
        <p className="text-xs text-red-500 max-w-xs">
          Gagal: {message || "Terjadi kesalahan."}
        </p>
      )}
      {status === "COMPLETED" && (
        <p className="text-xs text-green-600 max-w-xs">{message}</p>
      )}
    </div>
  );
};

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
      // Error toast ditangani oleh onSave, jadi console.log saja di sini
      console.log(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b">
            <h3 className="text-lg font-bold text-gray-800">Edit Dokumen</h3>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label
                htmlFor="filename"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nama File
              </label>
              <input
                type="text"
                name="filename"
                id="filename"
                value={formData.filename}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label
                htmlFor="link"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Link (Opsional)
              </label>
              <input
                type="url"
                name="link"
                id="link"
                value={formData.link}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 p-4 bg-gray-50 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DokumenTable = () => {
  const [data, setData] = useState({ documents: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [chunkingJobStatus, setChunkingJobStatus] = useState(null);
  const pollingRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchDocuments = useCallback(async () => {
    if (data.documents.length === 0) setLoading(true); // Hanya loading penuh di awal
    setError(null);
    try {
      const params = new URLSearchParams({ page, per_page: perPage });
      if (searchTerm) {
        params.append("search", searchTerm);
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
  }, [page, perPage, debouncedSearchTerm, data.documents.length]);

  const fetchChunkingJobStatus = useCallback(async () => {
    try {
      const status = await apiFetch("/documents/chunking/status");
      setChunkingJobStatus((prevStatus) => {
        if (
          prevStatus &&
          prevStatus.status === "RUNNING" &&
          status.status === "COMPLETED"
        ) {
          toast.success("Semua PDF berhasil diproses!");
          fetchDocuments();
        }
        return status;
      });
    } catch (err) {
      console.error("Gagal mengambil status chunking job:", err);
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
  }, [fetchDocuments]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    fetchDocuments();
  }, [page, debouncedSearchTerm]);

  useEffect(() => {
    fetchChunkingJobStatus();
  }, []);

  useEffect(() => {
    if (
      chunkingJobStatus?.status === "RUNNING" ||
      chunkingJobStatus?.status === "STOPPING"
    ) {
      pollingRef.current = setInterval(fetchChunkingJobStatus, 3000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [chunkingJobStatus?.status, fetchChunkingJobStatus]);

  // --- SEMUA FUNGSI HANDLE MENGGUNAKAN TOAST ---
  const handleStartChunking = async () => {
    try {
      await apiFetch("/documents/chunking/start", { method: "POST" });
      toast.success("Proses chunking semua PDF dimulai.");
      fetchChunkingJobStatus();
    } catch (err) {
      toast.error(`Gagal memulai proses: ${err.message}`);
    }
  };

  const handleStopChunking = async () => {
    try {
      await apiFetch("/documents/chunking/stop", { method: "POST" });
      toast.success("Sinyal berhenti telah dikirim.");
      fetchChunkingJobStatus();
    } catch (err) {
      toast.error(`Gagal menghentikan proses: ${err.message}`);
    }
  };

  const handleDeleteDocument = (docId, docFilename) => {
    toast(
      (t) => (
        <div className="flex flex-col items-center gap-4 p-2">
          <p className="text-center font-medium">
            Anda yakin ingin menghapus file
            <br />
            <strong className="text-red-600">"{docFilename}"</strong>?
          </p>
          <div className="flex gap-3">
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                const toastId = toast.loading("Menghapus dokumen...");
                try {
                  const response = await apiFetch(`/documents/${docId}`, {
                    method: "DELETE",
                  });
                  toast.success(response.message, { id: toastId });
                  fetchDocuments();
                } catch (err) {
                  toast.error(`Gagal menghapus: ${err.message}`, {
                    id: toastId,
                  });
                }
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
      {
        duration: 6000,
        // Posisi untuk toast ini sekarang diatur oleh <Toaster /> utama
      }
    );
  };

  const handleOpenModal = (doc) => {
    setEditingDoc(doc);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingDoc(null);
    setIsModalOpen(false);
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
      throw err; // Lempar error agar modal tahu proses gagal
    }
  };

  const { pagination, documents } = data;

  return (
    <div className="p-4 md:p-6">
      {/* --- 2. PENGATURAN POSISI TOAST TERPUSAT --- */}
      {/* Posisi bisa diubah ke: 'top-left', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right' */}
      <Toaster position="top-center" reverseOrder={false} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">
            Manajemen Dokumen PDF
          </h2>
          <p className="text-gray-600 text-sm md:text-base">
            Kelola, lihat, dan rekonstruksi tabel dari dokumen yang telah
            diproses.
          </p>
        </div>
        <ChunkingProgress
          jobStatus={chunkingJobStatus}
          onStart={handleStartChunking}
          onStop={handleStopChunking}
        />
      </div>

      <EditDocumentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        document={editingDoc}
        onSave={handleSaveDocument}
      />

      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-bold">Daftar Dokumen</h2>
        <div className="w-full max-w-xs">
          <input
            type="text"
            placeholder="Cari nama file..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto rounded-lg">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100">
              <tr>
                <th scope="col" className="px-6 py-3 font-semibold">
                  Nama File
                </th>
                <th scope="col" className="px-6 py-3 font-semibold text-center">
                  Total Halaman
                </th>
                <th scope="col" className="px-6 py-3 font-semibold text-center">
                  Halaman Tabel
                </th>
                <th scope="col" className="px-6 py-3 font-semibold text-center">
                  Link
                </th>
                <th scope="col" className="px-6 py-3 font-semibold">
                  Tanggal Proses
                </th>
                <th scope="col" className="px-6 py-3 font-semibold text-center">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : error ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-red-500">
                    Gagal memuat data: {error}
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-gray-500">
                    Belum ada dokumen yang diproses.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-gray-800 max-w-sm truncate">
                      {doc.filename}
                    </td>
                    <td className="px-6 py-4 text-center">{doc.total_pages}</td>
                    <td className="px-6 py-4 text-center font-medium text-blue-600">
                      {doc.table_page_count}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {doc.link ? (
                        <a
                          href={doc.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex justify-center w-full text-blue-600 hover:text-blue-800"
                          title="Lihat link eksternal"
                        >
                          <ViewIcon />
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {new Date(doc.processed_at).toLocaleDateString("id-ID", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <NavLink
                          to={routes.detailDokumen(doc.id)}
                          className="inline-flex items-center gap-1 bg-blue-600 text-white font-medium px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-xs"
                        >
                          <ViewIcon />
                          <span>Detail</span>
                        </NavLink>
                        <button
                          onClick={() => handleOpenModal(doc)}
                          className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteDocument(doc.id, doc.filename)
                          }
                          className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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

        {!loading && documents.length > 0 && pagination.total_pages > 1 && (
          <div className="flex flex-col md:flex-row justify-between items-center pt-4 border-t border-gray-200 mt-4 gap-4">
            <span className="text-sm text-gray-600">
              Menampilkan{" "}
              <span className="font-semibold">
                {(pagination.current_page - 1) * pagination.per_page + 1}
              </span>{" "}
              -{" "}
              <span className="font-semibold">
                {Math.min(
                  pagination.current_page * pagination.per_page,
                  pagination.total_items
                )}
              </span>{" "}
              dari{" "}
              <span className="font-semibold">{pagination.total_items}</span>{" "}
              dokumen
            </span>
            <div className="inline-flex items-center space-x-2">
              <button
                onClick={() => setPage(pagination.current_page - 1)}
                disabled={!pagination.has_prev || loading}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              <span className="text-sm font-semibold text-gray-700">
                Halaman {pagination.current_page} dari {pagination.total_pages}
              </span>
              <button
                onClick={() => setPage(pagination.current_page + 1)}
                disabled={!pagination.has_next || loading}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
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