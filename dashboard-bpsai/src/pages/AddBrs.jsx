import React, { useState } from "react";
import { Alert } from "../components/Alert";
import { NavLink } from "react-router-dom";
import routes from "../routes";
import apiFetch from "../services/api";

export default function AddBrs() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const form = event.target;
    const formData = new FormData(form);
    const formValues = Object.fromEntries(formData.entries());

    const payload = {
      judul_berita: formValues.judul_berita,
      tanggal_rilis: formValues.tanggal_rilis,
      link_sumber: formValues.link,
      tags: formValues.tags,
      ringkasan: formValues.ringkasan,
    };

    try {
      // const response = await fetch("http://127.0.0.1:5001/api/berita", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify(payload),
      // });

      const result = await apiFetch("/berita", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccess(`Berita berhasil ditambahkan dengan ID: ${result.id}`);
      form.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold">Tambah Berita Resmi Statistik</h2>
          <p className="text-gray-600">
            Masukkan data berita baru ke dalam sistem.
          </p>
        </div>
        <NavLink
          to={routes.beritaResmiStatistik}
          className="bg-gray-200 text-gray-800 font-medium px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
        >
          &larr; Kembali ke Daftar
        </NavLink>
      </div>

      <div className="chart-container p-6 rounded-xl shadow-sm bg-white border border-gray-200">
        {success && <Alert message={success} type="success" />}
        {error && <Alert message={error} type="error" />}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* --- Baris 1: Judul dan Tanggal --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="judul_berita"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Judul Berita
              </label>
              <input
                type="text"
                name="judul_berita"
                id="judul_berita"
                // INI BAGIAN YANG DIPERBAIKI
                className="w-full px-3 py-2 border border-gray-300 rounded-lg transition-colors
                           hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Contoh: Inflasi Provinsi Gorontalo September 2025"
                required
              />
            </div>
            <div>
              <label
                htmlFor="tanggal_rilis"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Tanggal Rilis
              </label>
              <input
                type="date"
                name="tanggal_rilis"
                id="tanggal_rilis"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg transition-colors
                           hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* --- Baris 2: Link dan Tags --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="link"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Link Sumber
              </label>
              <input
                type="url"
                name="link"
                id="link"
                // INI BAGIAN YANG DIPERBAIKI
                className="w-full px-3 py-2 border border-gray-300 rounded-lg transition-colors
                           hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://gorontalo.bps.go.id/..."
                required
              />
            </div>
            <div>
              <label
                htmlFor="tags"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Tags
              </label>
              <input
                type="text"
                name="tags"
                id="tags"
                // INI BAGIAN YANG DIPERBAIKI
                className="w-full px-3 py-2 border border-gray-300 rounded-lg transition-colors
                           hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ekonomi, inflasi, kemiskinan"
              />
              <p className="mt-1 text-xs text-gray-500">
                Pisahkan setiap tag dengan koma.
              </p>
            </div>
          </div>

          {/* --- Baris 3: Ringkasan --- */}
          <div>
            <label
              htmlFor="ringkasan"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Ringkasan
            </label>
            <textarea
              name="ringkasan"
              id="ringkasan"
              rows="8"
              // INI BAGIAN YANG DIPERBAIKI
              className="w-full px-3 py-2 border border-gray-300 rounded-lg transition-colors
                         hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Masukkan ringkasan atau isi utama dari berita..."
              required
            ></textarea>
          </div>

          {/* --- Tombol Submit --- */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-900 text-white font-medium px-6 py-2.5 rounded-lg hover:bg-blue-800 transition-colors
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isLoading ? "Menyimpan..." : "Simpan Berita"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
