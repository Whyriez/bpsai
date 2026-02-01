import React, { useState, useMemo } from "react";
import {
    BookOpenIcon,
    ServerIcon,
    ComputerDesktopIcon,
    CpuChipIcon,
    DocumentTextIcon,
    WrenchScrewdriverIcon,
    CommandLineIcon,
    ChatBubbleLeftRightIcon,
    ExclamationTriangleIcon,
    KeyIcon,
    PencilSquareIcon,
    MagnifyingGlassIcon
} from "@heroicons/react/24/outline";

// --- KONFIGURASI MENU & KATA KUNCI PENCARIAN ---
const sections = [
    {
        id: "intro",
        title: "1. Pengantar & Arsitektur",
        icon: <BookOpenIcon className="w-5 h-5"/>,
        keywords: "intro pengantar arsitektur flow diagram tech stack"
    },
    {
        id: "setup",
        title: "2. Instalasi & Environment",
        icon: <CommandLineIcon className="w-5 h-5"/>,
        keywords: "install setup env .env variable key database postgres python npm pip"
    },
    {
        id: "dashboard",
        title: "3. Frontend: Dashboard",
        icon: <ComputerDesktopIcon className="w-5 h-5"/>,
        keywords: "react frontend dashboard admin login auth chart grafik"
    },
    {
        id: "chatbot",
        title: "4. Frontend: Chatbot",
        icon: <ChatBubbleLeftRightIcon className="w-5 h-5"/>,
        keywords: "react frontend chatbot user public stream typing effect"
    },
    {
        id: "backend",
        title: "5. Backend & Database",
        icon: <ServerIcon className="w-5 h-5"/>,
        keywords: "flask backend python api route blueprint models database sqlalchemy job thread"
    },
    {
        id: "rag",
        title: "6. Logika RAG & AI",
        icon: <CpuChipIcon className="w-5 h-5"/>,
        keywords: "rag ai gemini llm vector embedding chromadb spk saw rerank algorithm prompt"
    },
    {
        id: "pdf",
        title: "7. Pemrosesan Dokumen",
        icon: <DocumentTextIcon className="w-5 h-5"/>,
        keywords: "pdf chunking parsing table extraction ocr screenshot reconstruction"
    },
    {
        id: "maintenance",
        title: "8. Maintenance & CLI",
        icon: <WrenchScrewdriverIcon className="w-5 h-5"/>,
        keywords: "cli terminal command flask manage backup restore import csv"
    },
    {
        id: "guide",
        title: "9. Panduan Modifikasi",
        icon: <PencilSquareIcon className="w-5 h-5"/>,
        keywords: "edit ubah modifikasi how to prompt model gpt fitur baru"
    },
    {
        id: "troubleshoot",
        title: "10. Troubleshooting",
        icon: <ExclamationTriangleIcon className="w-5 h-5"/>,
        keywords: "error bug fix masalah solusi cors 429 quota limit database locked"
    },
];

export default function Documentation() {
    const [activeSection, setActiveSection] = useState("intro");
    const [searchQuery, setSearchQuery] = useState("");

    // Logic Pencarian Pintar
    const filteredSections = useMemo(() => {
        if (!searchQuery) return sections;
        return sections.filter(section =>
            section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            section.keywords.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    const renderContent = () => {
        switch (activeSection) {
            case "intro": return <IntroSection />;
            case "setup": return <SetupSection />;
            case "dashboard": return <DashboardSection />;
            case "chatbot": return <ChatbotSection />;
            case "backend": return <BackendSection />;
            case "rag": return <RagSection />;
            case "pdf": return <PdfSection />;
            case "maintenance": return <MaintenanceSection />;
            case "guide": return <GuideSection />;
            case "troubleshoot": return <TroubleshootSection />;
            default: return <IntroSection />;
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-screen md:h-[calc(100vh-64px)] bg-gray-50 overflow-hidden font-sans">
            {/* Sidebar Dokumentasi - Responsive (Full width on mobile, fixed on desktop) */}
            <div className="w-full md:w-80 bg-white border-r border-gray-200 flex flex-col shrink-0 shadow-sm z-10 md:h-full max-h-[300px] md:max-h-full overflow-y-auto md:overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white sticky top-0 z-20">
                    <h1 className="text-xl font-bold text-blue-800 tracking-tight">Dokumentasi Teknis</h1>
                    <p className="text-xs text-blue-600/70 mt-1 font-medium">BPS AI Ecosystem v1.0</p>

                    {/* SEARCH BAR */}
                    <div className="mt-4 relative">
                        <input
                            type="text"
                            placeholder="Cari topik (ex: Gemini, PDF)..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    </div>
                </div>

                <nav className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                    {filteredSections.length === 0 ? (
                        <div className="text-center text-gray-400 text-sm mt-10">
                            <p>Tidak ditemukan.</p>
                        </div>
                    ) : (
                        <ul className="space-y-1">
                            {filteredSections.map((section) => (
                                <li key={section.id}>
                                    <button
                                        onClick={() => setActiveSection(section.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group ${
                                            activeSection === section.id
                                                ? "bg-blue-600 text-white shadow-md ring-1 ring-blue-700"
                                                : "text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                                        }`}
                                    >
                                        <div className={`${activeSection === section.id ? "text-white" : "text-gray-400 group-hover:text-blue-600"}`}>
                                            {section.icon}
                                        </div>
                                        <span className="truncate">{section.title}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </nav>
                <div className="hidden md:block p-4 border-t border-gray-100 text-[10px] text-center text-gray-400 uppercase tracking-wider font-semibold">
                    Internal Use Only
                </div>
            </div>

            {/* Konten Utama */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8 scroll-smooth">
                <div className="max-w-5xl mx-auto bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-gray-200/60 min-h-full">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}

// --- SUB-COMPONENTS ---

const SectionHeader = ({ title, subtitle }) => (
    <div className="mb-8 border-b pb-4">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 tracking-tight">{title}</h2>
        {subtitle && <p className="text-gray-500 mt-2 text-base md:text-lg font-light">{subtitle}</p>}
    </div>
);

const CodeBlock = ({ code, label, language = "bash" }) => (
    <div className="my-5 rounded-lg overflow-hidden border border-gray-200 shadow-sm group">
        {label && (
            <div className="bg-gray-50 px-4 py-2 text-xs font-mono font-bold text-gray-500 border-b border-gray-200 flex justify-between items-center">
                <span>{label}</span>
                <span className="text-[10px] uppercase bg-gray-200 px-2 py-0.5 rounded text-gray-600">{language}</span>
            </div>
        )}
        <div className="relative">
        <pre className="bg-[#1e293b] text-blue-100 p-5 text-sm overflow-x-auto font-mono leading-relaxed selection:bg-blue-500 selection:text-white">
        <code>{code}</code>
        </pre>
        </div>
    </div>
);

const InfoBox = ({ title, children, type = "info" }) => {
    const styles = {
        info: "bg-blue-50 border-blue-100 text-blue-900 icon-blue-500",
        warning: "bg-amber-50 border-amber-100 text-amber-900 icon-amber-500",
        error: "bg-red-50 border-red-100 text-red-900 icon-red-500",
        success: "bg-green-50 border-green-100 text-green-900 icon-green-500"
    };
    return (
        <div className={`p-5 rounded-xl border ${styles[type]} my-6 shadow-sm`}>
            <h4 className="font-bold text-sm uppercase tracking-wide opacity-90 mb-2 flex items-center gap-2">
                {type === 'warning' && <ExclamationTriangleIcon className="w-5 h-5"/>}
                {title}
            </h4>
            <div className="text-sm leading-relaxed opacity-90">{children}</div>
        </div>
    );
};

// 1. INTRO
const IntroSection = () => (
    <div className="space-y-6 text-gray-700">
        <SectionHeader title="Pengantar & Arsitektur Sistem" subtitle="Dokumentasi teknis untuk pengembangan berkelanjutan." />

        <p className="leading-relaxed">
            Sistem ini dibangun dengan arsitektur <strong>Micro-service like</strong> (terpisah antara Frontend dan Backend) untuk memudahkan skalabilitas.
            Inti dari sistem adalah <strong>RAG Engine</strong> di Backend yang menghubungkan Database Dokumen BPS dengan kecerdasan buatan Google Gemini.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 mb-8">
            {/* Chatbot */}
            <div className="p-6 border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all group bg-white">
                <div className="flex items-center gap-3 mb-4 text-blue-600">
                    <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <ChatBubbleLeftRightIcon className="w-6 h-6"/>
                    </div>
                    <h4 className="font-bold text-lg text-gray-800">Chatbot UI</h4>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                    Interface publik untuk masyarakat. Fokus pada kecepatan (Streaming Response) & aksesibilitas.
                </p>
                <div className="mt-4 pt-4 border-t border-dashed border-gray-100 flex justify-between items-center text-xs">
                    <span className="font-mono text-gray-400">repo: bpsai-react</span>
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Vite</span>
                </div>
            </div>

            {/* Dashboard */}
            <div className="p-6 border border-gray-200 rounded-xl hover:border-indigo-400 hover:shadow-md transition-all group bg-white">
                <div className="flex items-center gap-3 mb-4 text-indigo-600">
                    <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <ComputerDesktopIcon className="w-6 h-6"/>
                    </div>
                    <h4 className="font-bold text-lg text-gray-800">Admin Panel</h4>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                    Pusat kontrol data. Admin mengupload PDF, mengedit Berita, dan memantau analitik penggunaan.
                </p>
                <div className="mt-4 pt-4 border-t border-dashed border-gray-100 flex justify-between items-center text-xs">
                    <span className="font-mono text-gray-400">repo: dashboard-bpsai</span>
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">React</span>
                </div>
            </div>

            {/* Backend */}
            <div className="p-6 border border-gray-200 rounded-xl hover:border-green-400 hover:shadow-md transition-all group bg-white">
                <div className="flex items-center gap-3 mb-4 text-green-600">
                    <div className="p-2 bg-green-50 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors">
                        <ServerIcon className="w-6 h-6"/>
                    </div>
                    <h4 className="font-bold text-lg text-gray-800">API Core</h4>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                    Otak sistem. Mengelola Vector DB (Chroma), PDF Parsing, dan komunikasi ke LLM (Gemini).
                </p>
                <div className="mt-4 pt-4 border-t border-dashed border-gray-100 flex justify-between items-center text-xs">
                    <span className="font-mono text-gray-400">repo: bpsai-backend</span>
                    <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">Flask</span>
                </div>
            </div>
        </div>
    </div>
);

// 2. SETUP
const SetupSection = () => (
    <div className="space-y-6 text-gray-700">
        <SectionHeader title="Instalasi & Environment" subtitle="Persiapan server lokal atau cloud." />

        <div className="space-y-10">
            {/* Backend */}
            <div className="relative pl-6 border-l-4 border-green-500">
                <h3 className="text-xl font-bold text-gray-800 mb-3">1. Backend Setup (Python Flask)</h3>
                <p className="text-sm text-gray-600 mb-3">
                    Gunakan Python 3.10 ke atas. Disarankan menggunakan Virtual Environment agar library tidak konflik.
                </p>
                <CodeBlock label="Terminal: bpsai-backend" code={`# 1. Masuk folder & buat venv
cd bpsai-backend
python -m venv venv

# 2. Aktifkan venv
# Windows:
venv\\Scripts\\activate
# Mac/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Setup Database & Jalankan
python run.py`} />

                <div className="mt-6 bg-gray-50 rounded-xl border border-gray-200 p-5">
                    <h4 className="font-bold text-sm text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
                        <KeyIcon className="w-4 h-4 text-yellow-600"/>
                        Konfigurasi .env (Wajib)
                    </h4>
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 font-bold text-gray-700">
                            <tr><th className="p-3 w-1/4">Variable Key</th><th className="p-3 w-1/3">Contoh Value</th><th className="p-3">Kegunaan</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                            <tr><td className="p-3 font-mono text-blue-600">DATABASE_URL</td><td className="p-3 text-gray-500 text-xs break-all">postgresql://user:pass@localhost:5432/bpsai</td><td className="p-3">Koneksi ke DB PostgreSQL Utama.</td></tr>
                            <tr><td className="p-3 font-mono text-blue-600">JWT_SECRET_KEY</td><td className="p-3 text-gray-500 text-xs">rahasia_negara_123</td><td className="p-3">Salt untuk enkripsi token login session.</td></tr>
                            <tr><td className="p-3 font-mono text-blue-600">GEMINI_API_KEY_1</td><td className="p-3 text-gray-500 text-xs">AIzaSy...</td><td className="p-3">Kunci akses ke Google Gemini AI.</td></tr>
                            <tr><td className="p-3 font-mono text-blue-600">CHROMA_HOST</td><td className="p-3 text-gray-500 text-xs">localhost</td><td className="p-3">Host Vector DB (Default local).</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-gray-500 mt-3 italic">* File `.env` tidak boleh di-commit ke Git demi keamanan.</p>
                </div>
            </div>

            {/* Frontend */}
            <div className="relative pl-6 border-l-4 border-blue-500">
                <h3 className="text-xl font-bold text-gray-800 mb-3">2. Frontend Setup (React Vite)</h3>
                <p className="text-sm text-gray-600 mb-3">
                    Berlaku untuk repo <code>dashboard-bpsai</code> dan <code>bpsai-react</code>. Pastikan Node.js v18+ terinstall.
                </p>
                <CodeBlock label="Terminal: Frontend" code={`npm install  # Install node_modules
npm run dev  # Jalankan mode development`} />
            </div>
        </div>
    </div>
);

// 3. DASHBOARD (DIPERBAIKI)
const DashboardSection = () => (
    <div className="space-y-8 text-gray-700">
        <SectionHeader title="Frontend: Dashboard Admin" subtitle="Pusat kendali data dan monitoring." />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Kolom Kiri: Struktur */}
            <div className="space-y-6">
                <div className="border-b border-gray-200 pb-2">
                    <h4 className="font-bold text-gray-800 text-lg">Struktur & Komponen Penting</h4>
                </div>
                <ul className="space-y-4 text-sm">
                    <li className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                            <div className="shrink-0 p-2 bg-blue-50 text-blue-700 rounded-lg font-mono text-xs font-bold sm:w-48 break-all">
                                src/layouts/MainLayout.jsx
                            </div>
                            <div className="text-gray-600 leading-relaxed">
                                Template utama yang membungkus Sidebar dan Header. Semua halaman admin menggunakan layout ini.
                            </div>
                        </div>
                    </li>
                    <li className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                            <div className="shrink-0 p-2 bg-purple-50 text-purple-700 rounded-lg font-mono text-xs font-bold sm:w-48 break-all">
                                src/components/ProtectedRoute.jsx
                            </div>
                            <div className="text-gray-600 leading-relaxed">
                                Gatekeeper. Mengecek apakah user punya Token JWT valid di localStorage sebelum mengizinkan akses halaman.
                            </div>
                        </div>
                    </li>
                    <li className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                            <div className="shrink-0 p-2 bg-orange-50 text-orange-700 rounded-lg font-mono text-xs font-bold sm:w-48 break-all">
                                src/pages/DetailDokumen.jsx
                            </div>
                            <div className="text-gray-600 leading-relaxed">
                                Halaman paling kompleks. Berisi logika untuk menampilkan PDF dan memicu fitur "Rekonstruksi Tabel".
                            </div>
                        </div>
                    </li>
                </ul>
            </div>

            {/* Kolom Kanan: API Config */}
            <div className="flex flex-col">
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm h-full">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-lg">
                        <ServerIcon className="w-5 h-5 text-slate-500"/>
                        Konfigurasi API
                    </h4>
                    <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                        Frontend berkomunikasi dengan backend melalui file sentral <code className="bg-white px-2 py-1 border rounded text-slate-700 font-bold">src/services/api.js</code>.
                        File ini menggunakan <strong>Axios Interceptor</strong> untuk keamanan token.
                    </p>

                    <div className="bg-[#0f172a] text-blue-100 p-4 rounded-lg text-xs font-mono overflow-x-auto shadow-inner border border-slate-700 mb-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-slate-500 italic">// 1. Base URL Definition</span>
                            <span>const API_BASE_URL = <span className="text-green-400">"http://localhost:5000"</span>;</span>
                            <br/>
                            <span className="text-slate-500 italic">// 2. Interceptor Logic</span>
                            <span>config.headers.Authorization = `Bearer ${"{token}"}`;</span>
                        </div>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-amber-900 text-sm flex gap-3 items-start">
                        <ExclamationTriangleIcon className="w-5 h-5 shrink-0 mt-0.5 text-amber-600"/>
                        <div>
                            <span className="font-bold block mb-1">Penting:</span>
                            Jika Anda mengubah port backend (misal saat deploy ke server), pastikan untuk mengupdate variabel `baseURL` di file ini agar frontend bisa terhubung.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// 4. CHATBOT
const ChatbotSection = () => (
    <div className="space-y-6 text-gray-700">
        <SectionHeader title="Frontend: Public Chatbot" subtitle="User Experience (UX) chat yang responsif." />

        <InfoBox title="Teknologi Streaming Response" type="info">
            <p>
                Chatbot ini tidak menunggu jawaban AI selesai 100% baru menampilkannya.
                Ia menggunakan teknologi <strong>Server-Sent Events (Logic stream)</strong> via Fetch API.
            </p>
            <ul className="list-disc list-inside mt-2 font-semibold">
                <li>File Logic: <code>src/services/chatApi.js</code></li>
                <li>File UI: <code>src/pages/ChatPage.jsx</code></li>
            </ul>
        </InfoBox>

        <div className="space-y-4 mt-6">
            <h4 className="font-bold text-gray-800">Alur Pesan di Frontend:</h4>
            <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside ml-2">
                <li>User mengetik pesan di komponen <code>ChatInput.jsx</code>.</li>
                <li>Fungsi <code>sendMessageStream</code> dipanggil.</li>
                <li>Looping <code>reader.read()</code> membaca potongan teks (chunk) dari backend.</li>
                <li>State <code>messages</code> di-update real-time, menciptakan efek "mesin tik".</li>
                <li>Jika ada gambar (chart/tabel), komponen <code>ChatMessage.jsx</code> akan merendernya sebagai Markdown atau Image Tag.</li>
            </ol>
        </div>
    </div>
);

// 5. BACKEND
const BackendSection = () => (
    <div className="space-y-6 text-gray-700">
        <SectionHeader title="Backend & Database" subtitle="Arsitektur Flask Application Factory." />

        <p className="mb-4">
            Backend menggunakan pola <strong>Application Factory</strong> di <code>app/__init__.py</code>.
            Ini berarti aplikasi Flask dibuat di dalam fungsi <code>create_app()</code>, memudahkan testing dan manajemen config.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-green-700 mb-3 flex items-center gap-2">
                    <ServerIcon className="w-5 h-5"/> Core Services
                </h4>
                <ul className="space-y-2 text-sm">
                    <li>
                        <code className="bg-gray-100 px-1 py-0.5 rounded font-bold">app/services.py</code><br/>
                        Berisi class <code>GeminiService</code> (Koneksi ke Google AI) dan <code>RobustTableDetector</code> (Logika parsing PDF).
                    </li>
                    <li>
                        <code className="bg-gray-100 px-1 py-0.5 rounded font-bold">app/job_utils.py</code><br/>
                        Menangani <strong>Threading</strong>. Saat upload PDF, proses chunking berjalan di background thread agar server tidak hang.
                    </li>
                    <li>
                        <code className="bg-gray-100 px-1 py-0.5 rounded font-bold">app/env_manager.py</code><br/>
                        Utility untuk membaca dan menulis file `.env` secara dinamis (fitur Edit API Key di dashboard).
                    </li>
                </ul>
            </div>

            <div className="border rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                    <CommandLineIcon className="w-5 h-5"/> Custom Commands
                </h4>
                <p className="text-xs text-gray-500 mb-2">Didefinisikan di <code>app/commands.py</code>. Dijalankan via `flask [command]`.</p>
                <ul className="space-y-2 text-sm font-mono text-gray-600">
                    <li>user:create-admin</li>
                    <li>import:csv</li>
                    <li>tags:auto</li>
                    <li>embeddings:generate</li>
                    <li>sync-vectordb</li>
                </ul>
            </div>
        </div>
    </div>
);

// 6. RAG
const RagSection = () => (
    <div className="space-y-6 text-gray-700">
        <SectionHeader title="Logika RAG & Algoritma" subtitle="Rahasia di balik kecerdasan sistem." />

        <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl border border-purple-100">
            <h3 className="font-bold text-purple-900 mb-4 text-lg">Algoritma Hybrid Search + SPK Reranking</h3>
            <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                Sistem tidak hanya mencari kata yang sama, tapi menggunakan metode pembobotan (SPK - Sistem Pendukung Keputusan)
                dengan metode <strong>Simple Additive Weighting (SAW)</strong>. Logika ini ada di fungsi <code>rerank_with_dss</code> di <code>app/routes/chat.py</code>.
            </p>

            <div className="overflow-x-auto bg-white rounded-lg border border-purple-100 p-4">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="border-b"><th className="text-left pb-2">Kriteria</th><th className="text-left pb-2">Bobot (Code Variable)</th><th className="text-left pb-2">Penjelasan</th></tr>
                    </thead>
                    <tbody className="divide-y text-gray-600">
                    <tr><td className="py-2 font-bold">Vector Similarity</td><td className="font-mono text-blue-600">w_vector = 0.35</td><td>Seberapa mirip makna pertanyaan dengan teks dokumen.</td></tr>
                    <tr><td className="py-2 font-bold">Keyword Match</td><td className="font-mono text-blue-600">w_keyword = 0.25</td><td>Apakah kata kunci eksak (misal: "Inflasi") muncul?</td></tr>
                    <tr><td className="py-2 font-bold">Recency (Tahun)</td><td className="font-mono text-blue-600">w_recency = 0.20</td><td>Dokumen tahun 2024 lebih diprioritaskan dibanding 2020.</td></tr>
                    <tr><td className="py-2 font-bold">Content Type</td><td className="font-mono text-blue-600">w_type = 0.15</td><td>Tipe "Tabel" diberi skor lebih tinggi karena data statistik biasanya ada di tabel.</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-white p-4 rounded border shadow-sm">
                <h4 className="font-bold text-gray-800 text-sm mb-2">1. Intent Detection</h4>
                <p className="text-xs text-gray-600">
                    Sebelum mencari, sistem mengecek <code>detect_intent</code> (di `helpers.py`).
                    Jika user hanya bilang "Halo", sistem tidak akan buang resource mencari di Database.
                </p>
            </div>
            <div className="bg-white p-4 rounded border shadow-sm">
                <h4 className="font-bold text-gray-800 text-sm mb-2">2. Final Generation</h4>
                <p className="text-xs text-gray-600">
                    Fungsi <code>build_final_prompt</code> menyusun instruksi untuk Gemini: "Kamu adalah asisten BPS. Jawab hanya berdasarkan data berikut...".
                </p>
            </div>
        </div>
    </div>
);

// 7. PDF
const PdfSection = () => (
    <div className="space-y-6 text-gray-700">
        <SectionHeader title="Pemrosesan Dokumen" subtitle="Deep dive ke module `RobustTableDetector`." />

        <p>File: <code>app/services.py</code></p>

        <div className="space-y-4">
            <div className="flex gap-4 items-start">
                <div className="bg-orange-100 p-2 rounded text-orange-700 font-bold">1</div>
                <div>
                    <h4 className="font-bold text-gray-800">Chunking per Halaman</h4>
                    <p className="text-sm text-gray-600">PDF tidak dibaca sekaligus, tapi dipecah per halaman. Ini menjaga konteks halaman tetap utuh.</p>
                </div>
            </div>
            <div className="flex gap-4 items-start">
                <div className="bg-orange-100 p-2 rounded text-orange-700 font-bold">2</div>
                <div>
                    <h4 className="font-bold text-gray-800">Deteksi Tabel Cerdas</h4>
                    <p className="text-sm text-gray-600">
                        Sistem menggunakan Regex untuk mendeteksi pola angka beruntun. Jika halaman terdeteksi sebagai tabel:
                    </p>
                    <ul className="list-disc list-inside text-xs text-gray-500 mt-1 ml-1 bg-gray-50 p-2 rounded">
                        <li>Halaman di-screenshot otomatis (disimpan di `storage/pdf_images`).</li>
                        <li>Gambar screenshot ini yang ditampilkan ke User di Chatbot sebagai bukti ("Lihat Halaman Asli").</li>
                    </ul>
                </div>
            </div>
            <div className="flex gap-4 items-start">
                <div className="bg-orange-100 p-2 rounded text-orange-700 font-bold">3</div>
                <div>
                    <h4 className="font-bold text-gray-800">AI Reconstruction (Fitur Spesial)</h4>
                    <p className="text-sm text-gray-600">
                        Jika hasil ekstraksi teks berantakan, Admin bisa klik tombol "Reconstruct" di Dashboard.
                        Backend akan mengirim teks mentah ke Gemini untuk diformat ulang menjadi Markdown Table yang rapi.
                    </p>
                </div>
            </div>
        </div>
    </div>
);

// 8. MAINTENANCE
const MaintenanceSection = () => (
    <div className="space-y-6 text-gray-700">
        <SectionHeader title="Maintenance & CLI" subtitle="Perintah terminal untuk operasional harian." />

        <p className="mb-4 text-sm">
            Untuk menjalankan perintah ini, buka terminal di folder <code>bpsai-backend</code> dan pastikan venv aktif.
        </p>

        <div className="space-y-6">
            <div>
                <h4 className="font-bold text-gray-800 mb-2 border-b w-max border-gray-300">Manajemen User</h4>
                <CodeBlock label="Reset Admin Password / Buat Baru" code='flask user:create-admin "email@bps.go.id" "username_baru"' />
            </div>

            <div>
                <h4 className="font-bold text-gray-800 mb-2 border-b w-max border-gray-300">Manajemen Data</h4>
                <CodeBlock label="Import Berita Massal (CSV)" code='flask import:csv "data/hasil_scraping.csv"' />
                <p className="text-xs text-gray-500 mt-1">Format CSV harus punya kolom: title, content, date, link.</p>
            </div>

            <div>
                <h4 className="font-bold text-gray-800 mb-2 border-b w-max border-gray-300">Perbaikan System</h4>
                <CodeBlock label="Sync Vector DB" code='flask sync-vectordb' />
                <p className="text-xs text-gray-500 mt-1">
                    Jalankan ini jika data di Chatbot tidak sesuai dengan data di Dashboard (Database tidak sinkron).
                    Command ini akan menghapus semua vektor dan membuatnya ulang dari database PostgreSQL.
                </p>
            </div>
        </div>
    </div>
);

// 9. GUIDE
const GuideSection = () => (
    <div className="space-y-6 text-gray-700">
        <SectionHeader title="Panduan Modifikasi" subtitle="Peta jalan untuk pengembangan fitur baru." />

        <div className="grid grid-cols-1 gap-4">
            <div className="border-l-4 border-purple-500 pl-4 py-2 bg-gray-50 rounded-r-lg">
                <h4 className="font-bold text-gray-800">Q: Saya ingin mengubah instruksi/prompt AI?</h4>
                <p className="text-sm text-gray-600 mt-1">
                    A: Buka file <code>app/helpers.py</code>. Cari fungsi <code>build_final_prompt</code>.
                    Di sana ada string panjang berisi "You are a helpful assistant...". Ubah teks itu sesuai kebutuhan BPS.
                </p>
            </div>

            <div className="border-l-4 border-pink-500 pl-4 py-2 bg-gray-50 rounded-r-lg">
                <h4 className="font-bold text-gray-800">Q: Saya ingin mengganti model ke GPT-4 / Claude?</h4>
                <p className="text-sm text-gray-600 mt-1">
                    A: Buka <code>app/services.py</code>. Lihat class <code>GeminiService</code>.
                    Anda perlu membuat class baru (misal `OpenAIService`) dan mengganti panggilan di `generate_content` dengan library OpenAI.
                </p>
            </div>

            <div className="border-l-4 border-cyan-500 pl-4 py-2 bg-gray-50 rounded-r-lg">
                <h4 className="font-bold text-gray-800">Q: Bagaimana cara menambah bobot pencarian tahun terbaru?</h4>
                <p className="text-sm text-gray-600 mt-1">
                    A: Buka <code>app/routes/chat.py</code>. Cari fungsi <code>rerank_with_dss</code>.
                    Naikkan nilai variabel <code>w_recency</code> (saat ini 0.20) dan kurangi bobot lainnya agar total tetap 1.0.
                </p>
            </div>
        </div>
    </div>
);

// 10. TROUBLESHOOT
const TroubleshootSection = () => (
    <div className="space-y-6 text-gray-700">
        <SectionHeader title="Troubleshooting" subtitle="Kamus solusi masalah umum." />

        <div className="space-y-4">
            <InfoBox type="error" title="Frontend Gagal Login (Network Error)">
                <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                    <li>Cek apakah backend sudah jalan (`python run.py`).</li>
                    <li>Cek CORS di `app/__init__.py`. Pastikan URL Frontend (localhost:5173) ada di whitelist.</li>
                    <li>Cek tab "Network" di Inspect Element browser untuk detail error.</li>
                </ul>
            </InfoBox>

            <InfoBox type="error" title="Error 429: Resource Exhausted (Gemini)">
                <p>API Key Google Gemini sudah mencapai batas harian gratis.</p>
                <p className="mt-2 font-bold">Solusi:</p>
                <ol className="list-decimal list-inside text-sm">
                    <li>Buat akun Google baru & dapatkan API Key baru di aistudio.google.com.</li>
                    <li>Login ke Dashboard Admin &gt; Menu "Data API Key".</li>
                    <li>Tambah API Key baru di sana (Sistem otomatis merotasi key).</li>
                </ol>
            </InfoBox>

            <InfoBox type="warning" title="Upload PDF Stuck / Loading Terus">
                <p>Kemungkinan file terlalu besar atau koneksi internet lambat (untuk upload ke Cloud Storage jika ada).</p>
                <p className="mt-2 font-bold">Solusi:</p>
                <p className="text-sm">Cek terminal backend. Apakah ada error log? Jika aman, coba refresh dashboard. Proses chunking berjalan di background (threading), jadi meski UI loading, proses mungkin sudah selesai di belakang layar.</p>
            </InfoBox>
        </div>
    </div>
);