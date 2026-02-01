import React from "react";
import { Link } from "react-router-dom";
import {
    BookOpenIcon,
    ArrowTopRightOnSquareIcon,
    UserGroupIcon,
    ChevronRightIcon
} from "@heroicons/react/24/outline";
import routes from "../routes";

function Settings() {
    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Pengaturan</h2>
                <p className="text-gray-600">
                    Konfigurasi preferensi dashboard dan informasi sistem.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* CARD 1: INFORMASI SISTEM (Yang lama) */}
                <div className="chart-container p-6 rounded-xl shadow-sm bg-white border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                        Informasi Sistem
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Versi Dashboard</span>
                            <span className="text-sm font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded">v2.1.0</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Terakhir Update</span>
                            <span className="text-sm font-medium">20 Sep 2025</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Status Database</span>
                            <span className="flex items-center gap-2 text-sm font-medium text-green-600">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Terhubung
              </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Status API</span>
                            <span className="flex items-center gap-2 text-sm font-medium text-green-600">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Online
              </span>
                        </div>
                    </div>
                </div>

                {/* CARD 2: DOKUMENTASI (YANG BARU) */}
                <div className="chart-container p-6 rounded-xl shadow-sm bg-white border border-gray-100 flex flex-col justify-between">
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

                    {/* Tombol Target Blank */}
                    <a
                        href="/documentation"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-sm hover:shadow"
                    >
                        <span>Buka Dokumentasi</span>
                        <ArrowTopRightOnSquareIcon className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                </div>

                <div className="md:col-span-2 p-6 rounded-xl shadow-sm bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
                                <UserGroupIcon className="w-6 h-6 text-blue-200"/>
                                Tim Pengembang
                            </h3>
                            <p className="text-blue-100 text-sm max-w-xl">
                                Kenali tim di balik pengembangan sistem BPS AI. Halaman ini berisi profil developer, tech stack, dan kontak kontributor.
                            </p>
                        </div>

                        {/* Tombol Menuju Halaman Developer */}
                        <Link
                            to={routes.developer}
                            className="shrink-0 px-6 py-3 bg-white text-blue-700 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-all shadow-lg flex items-center gap-2"
                        >
                            Lihat Profil Developer
                            <ChevronRightIcon className="w-4 h-4"/>
                        </Link>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default Settings;