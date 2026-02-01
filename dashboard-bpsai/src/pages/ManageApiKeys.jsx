import React, { useCallback, useEffect, useState } from "react";
import apiFetch from "../services/api";
import toast, { Toaster } from "react-hot-toast";

// --- Ikon-ikon SVG (dapat diekstrak ke file terpisah jika perlu) ---
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
const KeyIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H5v-2H3v-2H1.258a1 1 0 01-.97-1.243l1.258-7.5a1 1 0 01.97-1.243H15z"
    />
  </svg>
);

// --- Komponen Skeleton untuk Loading State ---
const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="px-4 py-3">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    </td>
    <td className="px-4 py-3">
      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
    </td>
    <td className="px-4 py-3">
      <div className="h-6 bg-gray-200 rounded-full w-20"></div>
    </td>
    <td className="px-4 py-3">
      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
    </td>
    <td className="px-4 py-3">
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </td>
    <td className="px-4 py-3">
      <div className="flex justify-center gap-2">
        <div className="h-7 bg-gray-200 rounded w-7"></div>
        <div className="h-7 bg-gray-200 rounded w-7"></div>
      </div>
    </td>
  </tr>
);

// --- Komponen Utama ---
const ApiKeysManager = () => {
  const [keys, setKeys] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModal, setEditModal] = useState(null); // Berisi data key yang akan di-edit

  const [formData, setFormData] = useState({
    key_name: "",
    api_key: "",
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [keysResult, statsResult] = await Promise.all([
        apiFetch("/gemini-keys"),
        apiFetch("/gemini-keys/stats"),
      ]);

      const sortedKeys = keysResult.keys.sort((a, b) => {
        // Konversi alias (string) ke angka untuk sorting yang benar
        return parseInt(a.key_alias, 10) - parseInt(b.key_alias, 10);
      });
      setKeys(sortedKeys);
      setStats(statsResult.stats);
    } catch (e) {
      toast.error(`Gagal memuat data: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Fungsi untuk Delete ---
  const executeDelete = async (alias) => {
    const toastId = toast.loading("Menghapus API Key...");
    try {
      const result = await apiFetch(`/gemini-keys/${alias}`, {
        method: "DELETE",
      });
      fetchData(); // Refresh data
      toast.success(result.message, { id: toastId });
    } catch (error) {
      toast.error(error.message, { id: toastId });
    }
  };

  const handleDeleteConfirmation = (alias, name) => {
    toast(
      (t) => (
        <div className="flex flex-col items-center gap-4 p-2">
          <p className="text-center font-medium">
            Anda yakin ingin menghapus API Key <br />
            <strong className="text-red-600">
              "{name}" ({alias})
            </strong>
            ?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                executeDelete(alias);
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

  // --- Fungsi untuk Modal & Form Handling ---
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const resetForm = () => {
    setAddModalOpen(false);
    setEditModal(null);
    setFormData({ key_name: "", api_key: "", is_active: true });
    setFormErrors({});
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.key_name.trim()) errors.key_name = "Nama key harus diisi";
    if (!formData.api_key.trim()) errors.api_key = "API Key harus diisi";
    else if (!formData.api_key.startsWith("AIza"))
      errors.api_key = "Format API Key tidak valid";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const toastId = toast.loading("Menambahkan API Key...");
    setFormLoading(true);
    try {
      const result = await apiFetch("/gemini-keys", {
        method: "POST",
        body: JSON.stringify({
          api_key: formData.api_key,
          key_name: formData.key_name,
        }),
      });
      fetchData();
      resetForm();
      toast.success(result.message, { id: toastId });
    } catch (error) {
      toast.error(error.message, { id: toastId });
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.key_name.trim()) {
      setFormErrors({ key_name: "Nama key harus diisi" });
      return;
    }

    const toastId = toast.loading("Menyimpan perubahan...");
    setFormLoading(true);
    try {
      const result = await apiFetch(`/gemini-keys/${editModal.key_alias}`, {
        method: "PUT",
        body: JSON.stringify({
          key_name: formData.key_name,
          is_active: formData.is_active,
        }),
      });
      fetchData();
      resetForm();
      toast.success(result.message, { id: toastId });
    } catch (error) {
      toast.error(error.message, { id: toastId });
    } finally {
      setFormLoading(false);
    }
  };

  const openEditModal = (key) => {
    setFormData({
      key_name: key.key_name,
      is_active: key.is_active,
      api_key: key.value_preview, // hanya untuk display, tidak di-submit
    });
    setEditModal(key);
  };

  return (
    <div className="p-4 md:p-6">
      <Toaster position="top-center" reverseOrder={false} />

      {/* --- Modal Tambah / Edit --- */}
      {(addModalOpen || editModal) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                {addModalOpen ? "Tambah API Key Baru" : "Edit API Key"}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <CloseIcon />
              </button>
            </div>
            <form
              onSubmit={addModalOpen ? handleAddSubmit : handleUpdateSubmit}
              className="space-y-4 p-6"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Key *
                </label>
                <input
                  type="text"
                  name="key_name"
                  value={formData.key_name}
                  onChange={handleInputChange}
                  className={`w-full p-2 border rounded-lg ${
                    formErrors.key_name ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Contoh: Kunci Utama"
                />
                {formErrors.key_name && (
                  <p className="text-red-500 text-sm mt-1">
                    {formErrors.key_name}
                  </p>
                )}
              </div>

              {addModalOpen && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key Value *
                  </label>
                  <input
                    type="password"
                    name="api_key"
                    value={formData.api_key}
                    onChange={handleInputChange}
                    className={`w-full p-2 border rounded-lg ${
                      formErrors.api_key ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Masukkan API Key dari Google AI Studio"
                  />
                  {formErrors.api_key && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.api_key}
                    </p>
                  )}
                </div>
              )}

              {editModal && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value Preview
                  </label>
                  <input
                    type="text"
                    value={editModal.value_preview || "Tidak ada value di .env"}
                    className="w-full p-2 border bg-gray-100 border-gray-300 rounded-lg"
                    disabled
                  />
                </div>
              )}

              {editModal && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="is_active"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Aktifkan Key
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {formLoading
                    ? "Menyimpan..."
                    : addModalOpen
                    ? "Tambah Key"
                    : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Header --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">
            Manajemen API Key Gemini
          </h2>
          <p className="text-gray-600 text-sm md:text-base">
            Kelola semua kunci API yang digunakan dalam sistem.
          </p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="bg-blue-900 text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
        >
          + Tambah API Key
        </button>
      </div>

      {/* --- Stat Cards --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Keys"
          value={loading ? "..." : stats.total_keys}
        />
        <StatCard
          title="Keys Aktif"
          value={loading ? "..." : stats.active_keys}
        />
        <StatCard
          title="Keys Tersedia"
          value={loading ? "..." : stats.available_keys}
          color="green"
        />
        <StatCard
          title="Quota Habis"
          value={loading ? "..." : stats.quota_exceeded_keys}
          color="red"
        />
      </div>

      {/* --- Tabel Data --- */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto rounded-lg">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100">
              <tr>
                <th scope="col" className="px-6 py-3 font-semibold">
                  Nama Key
                </th>
                <th scope="col" className="px-6 py-3 font-semibold">
                  Alias
                </th>
                <th scope="col" className="px-6 py-3 font-semibold">
                  Status / Reset Dalam
                </th>
                <th scope="col" className="px-6 py-3 font-semibold">
                  Total Request
                </th>
                <th scope="col" className="px-6 py-3 font-semibold">
                  Success Rate
                </th>
                <th scope="col" className="px-6 py-3 font-semibold">
                  Terakhir Digunakan
                </th>
                <th scope="col" className="px-6 py-3 font-semibold text-center">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => <SkeletonRow key={i} />)
              ) : keys.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-gray-500">
                    Belum ada API Key yang ditambahkan.
                  </td>
                </tr>
              ) : (
                keys.map((key) => (
                  <tr
                    key={key.id}
                    className="bg-white border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 font-semibold text-gray-800">
                      {key.key_name}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {key.key_alias}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge keyData={key} onTimerEnd={fetchData} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      {key.total_requests}
                    </td>
                    <td className="px-6 py-4 text-center font-medium">
                      {key.success_rate}%
                    </td>
                    <td className="px-6 py-4">
                      {key.last_used
                        ? new Date(key.last_used).toLocaleString("id-ID")
                        : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openEditModal(key)}
                          className="p-2 text-green-600 rounded-lg hover:bg-green-100"
                          title="Edit"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteConfirmation(
                              key.key_alias,
                              key.key_name
                            )
                          }
                          className="p-2 text-red-600 rounded-lg hover:bg-red-100"
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
      </div>
    </div>
  );
};

// --- Komponen Tambahan ---
const StatCard = ({ title, value, color }) => {
  const colorClasses = {
    green: "text-green-600",
    red: "text-red-600",
    default: "text-blue-900",
  };
  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      <p
        className={`text-2xl font-bold ${
          colorClasses[color] || colorClasses.default
        }`}
      >
        {value}
      </p>
    </div>
  );
};

const CountdownTimer = ({ timeUntilReset, onTimerEnd }) => {
    // Pastikan timeUntilReset ada dan memiliki total_seconds
    const initialSeconds = timeUntilReset?.total_seconds || 0;
    const [secondsLeft, setSecondsLeft] = useState(Math.floor(initialSeconds));
  
    useEffect(() => {
      if (secondsLeft <= 0) {
        // Panggil onTimerEnd setelah sedikit delay untuk memastikan UI update
        setTimeout(onTimerEnd, 1500);
        return;
      }
  
      const intervalId = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
  
      // Cleanup function untuk membersihkan interval saat komponen di-unmount
      return () => clearInterval(intervalId);
    }, [secondsLeft, onTimerEnd]);
  
    if (secondsLeft <= 0) {
      return (
        <span className="text-xs font-mono text-blue-600">
            Cek status...
        </span>
      );
    }
  
    // Fungsi untuk format waktu, tambahkan '0' di depan jika angka < 10
    const formatTime = (time) => String(time).padStart(2, '0');
  
    const hours = Math.floor(secondsLeft / 3600);
    const minutes = Math.floor((secondsLeft % 3600) / 60);
    const seconds = secondsLeft % 60;
  
    return (
      <span className="text-xs font-mono text-gray-600" title={`Reset pada ${new Date(timeUntilReset.reset_time).toLocaleString('id-ID')}`}>
        {formatTime(hours)}:{formatTime(minutes)}:{formatTime(seconds)}
      </span>
    );
  };

const StatusBadge = ({ keyData, onTimerEnd }) => {
    if (keyData.quota_exceeded) {
      return (
        <div className="flex flex-col items-start gap-1">
          <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">
            Quota Habis
          </span>
          {keyData.time_until_reset && (
            <CountdownTimer timeUntilReset={keyData.time_until_reset} onTimerEnd={onTimerEnd} />
          )}
        </div>
      );
    }
    if (keyData.is_active) {
      return (<span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">Aktif</span>);
    }
    return (<span className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 rounded-full">Tidak Aktif</span>);
};

export default function ManageApiKeys() {
  return <ApiKeysManager />;
}
