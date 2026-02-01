import React, { useCallback, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import routes from "../routes";
import apiFetch from "../services/api";
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

const DataBrsTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState("");
  const [editModal, setEditModal] = useState(null);
  const [formData, setFormData] = useState({
    judul_berita: "",
    tanggal_rilis: "",
    link_sumber: "",
    ringkasan: "",
    tags: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        draw: 1,
        start: page * perPage,
        length: perPage,
        "search[value]": search,
      });
      const result = await apiFetch(`/berita/list?${params}`);
      setData(result.data);
      setTotalRecords(result.recordsFiltered);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 500);

    return () => clearTimeout(timer);
  }, [fetchData, search]);

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

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">
            Data Berita Resmi Statistik
          </h2>
          <p className="text-gray-600 text-sm md:text-base">
            Daftar semua berita yang tersimpan di dalam sistem.
          </p>
        </div>
        <NavLink
          to={routes.addBeritaResmiStatistik}
          className="bg-blue-900 text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
        >
          + Tambah Berita
        </NavLink>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="relative mb-4">
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
            placeholder="Cari berdasarkan judul atau ringkasan..."
            className="w-full md:w-1/3 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

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