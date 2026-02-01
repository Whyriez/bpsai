import React from "react";
import {
    CodeBracketIcon,
    AcademicCapIcon,
    LinkIcon,
    ArrowLeftIcon
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import routes from "../routes";

// --- DATA DEVELOPER (SCALABLE) ---
// Anak magang selanjutnya cukup tambah object di sini
const developers = [
    {
        id: 1,
        name: "Nur Alim M. Suma",
        role: "Lead Developer & AI Engineer",
        major: "Sistem Informasi UNG '22",
        description: "Merancang arsitektur RAG Backend, integrasi Gemini AI, Vector Database, dan pengembangan Dashboard Admin.",
        techStack: ["React", "Flask", "ChromaDB", "Gemini AI", "PostgreSQL"],
        socials: {
            github: "https://github.com/Whyriez",
            linkedin: "https://www.linkedin.com/in/alimsuma"
        }
    },
    // CONTOH TAMBAH MEMBER BARU:
    /*
    {
      id: 2,
      name: "Nama Mahasiswa Baru",
      role: "Frontend Developer",
      major: "Teknik Informatika '23",
      description: "Mengembangkan fitur UI baru dan optimasi responsivitas mobile.",
      techStack: ["React", "Tailwind", "Vite"],
      socials: { github: "#", linkedin: "#" }
    },
    */
];

export default function Developer() {
    return (
        <div>

            {/* Header & Back Button */}
            <div className="mb-8">
                <Link
                    to={routes.settings}
                    className="inline-flex items-center gap-1 text-gray-500 hover:text-blue-600 mb-4 text-sm transition-colors"
                >
                    <ArrowLeftIcon className="w-4 h-4" /> Kembali ke Pengaturan
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Tentang Pengembang</h1>
                <p className="text-gray-600 mt-2">
                    Kontributor yang membangun dan memelihara ekosistem BPS AI.
                </p>
            </div>

            {/* Grid Developer */}
            <div className="grid grid-cols-1 gap-6">
                {developers.map((dev) => (
                    <div key={dev.id} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:border-blue-200 transition-all group">
                        <div className="flex flex-col md:flex-row gap-6 items-start">

                            {/* Avatar / Initial */}
                            <div className="shrink-0">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-md group-hover:scale-105 transition-transform">
                                    {dev.name.charAt(0)}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 w-full">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">{dev.name}</h2>
                                        <div className="flex items-center gap-2 mt-1 text-blue-600 font-medium text-sm">
                                            <CodeBracketIcon className="w-4 h-4"/>
                                            {dev.role}
                                        </div>
                                    </div>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 text-gray-600 text-xs font-semibold border border-gray-200">
                        <AcademicCapIcon className="w-3.5 h-3.5"/>
                                        {dev.major}
                    </span>
                                </div>

                                <p className="mt-4 text-gray-600 leading-relaxed text-sm">
                                    {dev.description}
                                </p>

                                {/* Tech Stack Chips */}
                                <div className="mt-5 pt-5 border-t border-gray-50">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Tech Stack</span>
                                    <div className="flex flex-wrap gap-2">
                                        {dev.techStack.map((tech) => (
                                            <span key={tech} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md">
                                {tech}
                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Social Links */}
                                <div className="mt-4 flex gap-4">
                                    {dev.socials.github && (
                                        <a href={dev.socials.github} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-1 text-xs font-medium">
                                            <LinkIcon className="w-3 h-3"/> GitHub
                                        </a>
                                    )}
                                    {dev.socials.linkedin && (
                                        <a href={dev.socials.linkedin} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-700 transition-colors flex items-center gap-1 text-xs font-medium">
                                            <LinkIcon className="w-3 h-3"/> LinkedIn
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-10 text-center text-xs text-gray-400">
                &copy; {new Date().getFullYear()} BPS Provinsi Gorontalo. Built with ❤️ by Mahasiswa Magang.
            </div>
        </div>
    );
}