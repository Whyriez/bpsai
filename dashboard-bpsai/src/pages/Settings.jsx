import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
    BookOpenIcon,
    ArrowTopRightOnSquareIcon,
    UserGroupIcon,
    ChevronRightIcon,
    ArrowPathIcon,
    CheckCircleIcon
} from "@heroicons/react/24/outline";
import routes from "../routes";
import apiFetch from "../services/api";
import toast, { Toaster } from "react-hot-toast";

function Settings() {
    const [clearingCache, setClearingCache] = useState(false);

    const handleClearCache = async () => {
        try {
            setClearingCache(true);
            const res = await apiFetch("/dashboard/cache/clear", {
                method: "POST"
            });
            toast.success(res.message || "Cache sistem berhasil dibersihkan & disinkronkan!");
        } catch (err) {
            toast.error(err.message || "Gagal membersihkan cache.");
        } finally {
            setClearingCache(false);
        }
    };

    return (
        <div>
            <Toaster position="top-right" />
            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2 text-gray-900">Pengaturan & Pemeliharaan</h2>
                <p className="text-gray-600">
                    Konfigurasi preferensi dashboard, status sistem, dan manajemen cache backend.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* CARD 1: INFORMASI SISTEM */}
                <div className="chart-container p-6 rounded-xl shadow-xs bg-white border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                        Informasi Sistem
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Versi Dashboard</span>
                            <span className="text-sm font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded">v2.2.0</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Status Database</span>
                            <span className="flex items-center gap-2 text-sm font-medium text-green-600">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                Terhubung (PostgreSQL & pgvector)
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Status API Backend</span>
                            <span className="flex items-center gap-2 text-sm font-medium text-green-600">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                Online & Real-time
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Mode Query Dokumen</span>
                            <span className="text-sm font-medium text-blue-600">
                                Live Zero-Lag (Real-time DB)
                            </span>
                        </div>
                    </div>
                </div>

                {/* CARD 2: PEMELIHARAAN CACHE & SINKRONISASI */}
                <div className="chart-container p-6 rounded-xl shadow-xs bg-white border border-gray-100 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-4 border-b pb-2">
                            <ArrowPathIcon className="w-5 h-5 text-indigo-600"/>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Pemeliharaan Cache & Sinkronisasi
                            </h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                            Data katalog dan link publikasi saat ini dibaca secara <strong>100% real-time</strong> langsung dari database.
                        </p>
                        <p className="text-xs text-gray-500 mb-5 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                            💡 <em>Tips:</em> Jika chatbot sebelumnya menjawab kurang tepat pada sesi percakapan tertentu, cukup klik <strong>"+ Chat Baru"</strong> di aplikasi Chatbot agar riwayat sesi di-reset dari awal tanpa perlu ganti browser.
                        </p>
                    </div>

                    <button
                        onClick={handleClearCache}
                        disabled={clearingCache}
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-xs hover:shadow disabled:opacity-50 font-medium text-sm"
                    >
                        <ArrowPathIcon className={`w-4 h-4 ${clearingCache ? "animate-spin" : ""}`} />
                        <span>{clearingCache ? "Membersihkan Cache..." : "Bersihkan Seluruh Cache Sistem"}</span>
                    </button>
                </div>

                {/* CARD 3: DOKUMENTASI TEKNIS */}
                <div className="chart-container p-6 rounded-xl shadow-xs bg-white border border-gray-100 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-4 border-b pb-2">
                            <BookOpenIcon className="w-5 h-5 text-blue-600"/>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Dokumentasi Teknis
                            </h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                            Akses panduan lengkap pengembangan, arsitektur sistem (RAG & Backend), cara setup environment, serta panduan troubleshooting untuk developer.
                        </p>
                    </div>

                    <a
                        href="/documentation"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-xs hover:shadow font-medium text-sm"
                    >
                        <span>Buka Dokumentasi</span>
                        <ArrowTopRightOnSquareIcon className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                </div>

                {/* CARD 4: TIM PENGEMBANG */}
                <div className="p-6 rounded-xl shadow-xs bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex flex-col justify-between">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
                            <UserGroupIcon className="w-6 h-6 text-blue-200"/>
                            Tim Pengembang
                        </h3>
                        <p className="text-blue-100 text-sm mb-6 leading-relaxed">
                            Kenali tim di balik pengembangan sistem BPS AI. Halaman ini berisi profil developer, tech stack, dan kontak kontributor.
                        </p>
                    </div>

                    <Link
                        to={routes.developer}
                        className="shrink-0 px-6 py-2.5 bg-white text-blue-700 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-all shadow-md flex items-center justify-center gap-2 text-center"
                    >
                        <span>Lihat Profil Developer</span>
                        <ChevronRightIcon className="w-4 h-4"/>
                    </Link>
                </div>

            </div>
        </div>
    );
}

export default Settings;