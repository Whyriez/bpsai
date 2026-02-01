import React, { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import apiFetch, { API_BASE_URL } from "../services/api";
import ReconstructionModal from "../components/document/ReconstructionModal";
import toast, { Toaster } from "react-hot-toast";

// --- Komponen Ikon ---
const BackIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const ReconstructIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const EditIcon = () => (
    <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7.75 4H19M7.75 4a2.25 2.25 0 0 1-4.5 0m4.5 0a2.25 2.25 0 0 0-4.5 0M1 4h2.25m10.5 2H19m-2.25 0a2.25 2.25 0 0 1-4.5 0m4.5 0a2.25 2.25 0 0 0-4.5 0M1 6h8.25m6 2H19m-4.25 0a2.25 2.25 0 0 1-4.5 0m4.5 0a2.25 2.25 0 0 0-4.5 0M1 8h4.25m12 2H19m-6.25 0a2.25 2.25 0 0 1-4.5 0m4.5 0a2.25 2.25 0 0 0-4.5 0M1 10h.25m18 2H19m-8.25 0a2.25 2.25 0 0 1-4.5 0m4.5 0a2.25 2.25 0 0 0-4.5 0M1 12h2.25m14.5 2H19m-10.25 0a2.25 2.25 0 0 1-4.5 0m4.5 0a2.25 2.25 0 0 0-4.5 0M1 14h6.25"/>
    </svg>
);


const SkeletonCard = () => (
  <div className="border border-gray-200 rounded-lg p-4 animate-pulse">
    <div className="bg-gray-200 rounded-md w-full h-40 mb-4"></div>
    <div className="flex justify-between items-center mb-4"><div className="h-4 bg-gray-200 rounded w-1/4"></div><div className="h-5 bg-gray-200 rounded-full w-24"></div></div>
    <div className="h-9 bg-gray-200 rounded-lg w-full"></div>
  </div>
);

// PERUBAHAN 1: Skeleton untuk tampilan list teks yang baru
const SkeletonText = () => (
    <div className="border border-gray-200 rounded-lg p-4 animate-pulse w-full flex justify-between items-center">
        <div className="space-y-2">
            <div className="h-5 bg-gray-200 rounded w-32"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="h-9 bg-gray-200 rounded-lg w-40"></div>
    </div>
)

const BatchProgress = ({ jobStatus, onStart, onStop }) => {
  if (!jobStatus) {
    return (<div className="w-full md:w-auto animate-pulse"><div className="h-10 bg-gray-200 rounded-lg w-64"></div></div>);
  }
  const { status, progress, processed_items, total_items, last_error } = jobStatus;
  if (status === "RUNNING" || status === "STOPPING") {
    return (
      <div className="w-full md:w-80 border border-gray-200 p-3 rounded-lg bg-white">
        <div className="flex justify-between items-center mb-2"><span className="text-sm font-semibold text-gray-700">{status === "STOPPING" ? "Menghentikan Proses..." : "Sedang Memproses..."}</span><span className="text-sm font-bold text-blue-600">{progress}%</span></div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2"><div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div></div>
        <div className="flex justify-between items-center"><span className="text-xs text-gray-500">{processed_items} / {total_items} halaman selesai</span><button onClick={onStop} disabled={status === "STOPPING"} className="text-xs text-red-600 hover:underline disabled:opacity-50">Hentikan</button></div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-2">
      <button onClick={onStart} className="bg-green-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap">Rekonstruksi Semua Tabel</button>
      {status === "FAILED" && (<p className="text-xs text-red-500 max-w-xs">Gagal: {last_error || "Terjadi kesalahan."}</p>)}
      {status === "COMPLETED" && (<p className="text-xs text-green-600">Selesai: Semua tabel berhasil direkonstruksi.</p>)}
    </div>
  );
};


export default function DetailDokumen() {
  const { documentId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(6);
  const [filterType, setFilterType] = useState("table"); 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isReconstructing, setIsReconstructing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [batchJobStatus, setBatchJobStatus] = useState(null);
  const pollingRef = useRef(null);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    const currentPerPage = filterType === 'table' ? 6 : 8; // Tampilkan lebih banyak item teks
    setPerPage(currentPerPage);
    try {
      const params = new URLSearchParams({ page, per_page: currentPerPage, filter: filterType });
      const result = await apiFetch(`/documents/${documentId}/pages?${params}`);
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [documentId, page, filterType]); 

  const handleFilterChange = (newFilter) => {
    if(newFilter !== filterType) {
        setPage(1); 
        setData(null); 
        setFilterType(newFilter);
    }
  };

  const fetchJobStatus = useCallback(async () => {
    try {
      const status = await apiFetch(`/documents/reconstruct/status/${documentId}`);
      setBatchJobStatus((prevStatus) => {
        if (prevStatus && prevStatus.status === "RUNNING" && (status.status === "COMPLETED" || status.status === "FAILED")) {
          fetchDetails();
        }
        return status;
      });
    } catch (err) {
      console.error("Gagal mengambil status pekerjaan:", err);
      if (pollingRef.current) { clearInterval(pollingRef.current); }
    }
  }, [documentId, fetchDetails]);

  useEffect(() => { fetchJobStatus(); }, []);
  useEffect(() => {
    if (batchJobStatus?.status === "RUNNING" || batchJobStatus?.status === "STOPPING") {
      pollingRef.current = setInterval(fetchJobStatus, 3000);
    }
    return () => { if (pollingRef.current) { clearInterval(pollingRef.current); } };
  }, [batchJobStatus?.status, fetchJobStatus]);
  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  const handleStartBatch = async () => {
    try {
        await apiFetch(`/documents/reconstruct/start/${documentId}`, { method: "POST" });
        toast.success("Proses rekonstruksi massal dimulai.");
        fetchJobStatus();
      } catch (err) {
        alert(`Gagal memulai proses: ${err.message}`);
      }
  };
  const handleStopBatch = async () => {
    try {
        await apiFetch(`/documents/reconstruct/stop/${documentId}`, { method: "POST" });
        toast.success("Sinyal berhenti telah dikirim.");
        fetchJobStatus();
      } catch (err) {
        alert(`Gagal menghentikan proses: ${err.message}`);
      }
  };
  const openModal = async (chunkId) => { 
    setIsModalOpen(true);
    setIsModalLoading(true);
    try {
      const result = await apiFetch(`/documents/chunk/${chunkId}`);
      setModalData(result);
    } catch (err) {
      alert(`Gagal memuat data chunk: ${err.message}`);
      setIsModalOpen(false);
    } finally {
      setIsModalLoading(false);
    }
  };
  const closeModal = () => { 
    setIsModalOpen(false);
    setModalData(null);
  };
  const handleAiReconstruct = async (chunkId) => { 
    setIsReconstructing(true);
    const toastId = toast.loading("AI sedang merekonstruksi...");
    try {
      const result = await apiFetch(`/documents/chunk/${chunkId}/reconstruct`, { method: "POST" });
      setModalData((prev) => ({...prev, reconstructed_content: result.reconstructed_text }));
      toast.success("Teks berhasil direkonstruksi oleh AI!", { id: toastId });
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setIsReconstructing(false);
    }
  };
  const handleSave = async (chunkId, newContent) => { 
    setIsSaving(true);
    const toastId = toast.loading("Menyimpan perubahan...");
    try {
      await apiFetch(`/documents/chunk/${chunkId}`, {
        method: "PUT",
        body: JSON.stringify({ content: newContent }),
      });
      toast.success("Perubahan berhasil disimpan!", { id: toastId });
      closeModal();
      fetchDetails();
    } catch (err) {
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };
  
  // PERUBAHAN 2: Logika render diperbarui untuk tampilan list teks
  const renderContent = () => {
    if (loading && !data) {
        if(filterType === 'table') {
            return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}</div>;
        }
        return <div className="space-y-3">{[...Array(5)].map((_, i) => <SkeletonText key={i} />)}</div>;
    }

    if (!data || data.pages.length === 0) {
      return <div className="col-span-full text-center py-10 text-gray-500">Tidak ada data {filterType === 'table' ? 'tabel' : 'teks'} yang ditemukan.</div>;
    }
    
    if (filterType === 'table') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.pages.map((chunk) => (
            <div key={chunk.chunk_id} className="border border-gray-200 bg-white rounded-lg shadow-sm flex flex-col">
              <div className="p-4 border-b border-gray-200">
                {chunk.image_path ? <img src={`${API_BASE_URL}${chunk.image_path}`} alt={`Halaman ${chunk.page_number}`} className="rounded-md w-full h-auto object-contain bg-gray-50 border"/>
                 : <div className="flex items-center justify-center h-40 bg-gray-100 text-gray-400 rounded-md">Gambar tidak tersedia</div> }
              </div>
              <div className="p-4 flex-grow flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-gray-800">Halaman {chunk.page_number}</h3>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${chunk.status === "Sudah Direkonstruksi" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>{chunk.status}</span>
                </div>
                <div className="mt-auto">
                  <button onClick={() => openModal(chunk.chunk_id)} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-medium px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"><ReconstructIcon /><span>Rekonstruksi</span></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    if (filterType === 'text') {
        return (
            <div className="space-y-3">
                {data.pages.map((chunk) => (
                    <div key={chunk.chunk_id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-gray-800">Halaman {chunk.page_number}</h3>
                            <span className={`mt-1 px-2 py-0.5 inline-block text-xs font-semibold rounded-full ${chunk.status === "Sudah Direkonstruksi" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>{chunk.status}</span>
                        </div>
                        <button 
                            onClick={() => openModal(chunk.chunk_id)} 
                            className="flex-shrink-0 flex items-center justify-center gap-2 bg-white text-gray-700 font-semibold px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-sm shadow-sm"
                        >
                            <EditIcon />
                            <span>Lihat & Rekonstruksi</span>
                        </button>
                    </div>
                ))}
            </div>
        )
    }
  };

  if (error) { return <div className="p-6 text-center text-red-500">Gagal memuat data detail: {error}</div>; }
  
  const filename = data ? data.filename : "Memuat...";

  return (
    <div className="p-4 md:p-6">
      <Toaster position="top-center" reverseOrder={false} />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div>
          <NavLink to="/manajemen-dokumen" className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm mb-2"><BackIcon />Kembali ke Daftar Dokumen</NavLink>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 break-words" title={filename}>Detail Dokumen: {filename}</h2>
          <p className="text-gray-600 text-sm md:text-base">Pilih jenis data untuk dilihat dan direkonstruksi.</p>
        </div>
        {filterType === 'table' && <BatchProgress jobStatus={batchJobStatus} onStart={handleStartBatch} onStop={handleStopBatch}/>}
      </div>

      <div className="flex items-center border-b border-gray-200 mb-6">
        <button onClick={() => handleFilterChange('table')} className={`px-4 py-2 text-sm font-semibold transition-colors ${filterType === 'table' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>Data Tabel</button>
        <button onClick={() => handleFilterChange('text')} className={`px-4 py-2 text-sm font-semibold transition-colors ${filterType === 'text' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>Data Teks</button>
      </div>

      {renderContent()}

      {!loading && data && data.pagination && data.pagination.total_items > 0 && (
        <div className="flex flex-col md:flex-row justify-between items-center pt-4 border-t border-gray-200 mt-6 gap-4">
          <span className="text-sm text-gray-600">
            Menampilkan <span className="font-semibold">{(data.pagination.current_page - 1) * data.pagination.per_page + 1}</span> - <span className="font-semibold">{Math.min(data.pagination.current_page * data.pagination.per_page, data.pagination.total_items)}</span> dari <span className="font-semibold">{data.pagination.total_items}</span> item
          </span>
          <div className="inline-flex items-center space-x-2">
            <button onClick={() => setPage(data.pagination.current_page - 1)} disabled={!data.pagination.has_prev} className="px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">Sebelumnya</button>
            <span className="text-sm font-semibold text-gray-700">Halaman {data.pagination.current_page} dari {data.pagination.total_pages}</span>
            <button onClick={() => setPage(data.pagination.current_page + 1)} disabled={!data.pagination.has_next} className="px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">Berikutnya</button>
          </div>
        </div>
      )}

      {isModalOpen && ( <ReconstructionModal isLoading={isModalLoading} chunkData={modalData} onClose={closeModal} onReconstruct={handleAiReconstruct} onSave={handleSave} isReconstructing={isReconstructing} isSaving={isSaving}/> )}
    </div>
  );
}