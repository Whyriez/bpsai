# BPS AI System (SIGAP)

Project terintegrasi yang menggabungkan **Backend Python Flask** dengan dua aplikasi frontend **React (Vite)**: **Dashboard Admin** dan **Chatbot SIGAP**. Seluruh layanan berjalan sebagai satu kesatuan service di bawah Flask untuk memudahkan manajemen port dan deployment.

---

## 📂 Struktur Project

```plaintext
bpsai/
├── backend/                # Python Flask API & Static File Server
│   └── app/static/
│       ├── dashboard/      # Build hasil Dashboard
│       └── chatbot/        # Build hasil Chatbot
├── dashboard-bpsai/        # Frontend Dashboard (React + Vite)
├── chatbot-bpsai/          # Frontend Chatbot SIGAP (React + Vite)
├── build_apps.sh           # Script build frontend (Linux/Mac/WSL)
└── build_apps.bat          # Script build frontend (Windows)
```

---

## 🚀 Cara Menjalankan (Satu Paket)

Alur kerja project ini adalah:
1. **Build frontend (Dashboard / Chatbot)**
2. **Aset frontend dipindahkan ke backend**
3. **Backend Flask dijalankan sebagai satu service**

---

## 1️⃣ Build Frontend Otomatis

Script build sekarang **mendukung build parsial**, sehingga Anda bisa membangun:
- hanya Dashboard
- hanya Chatbot
- atau keduanya sekaligus

---

### 🔹 Linux / Mac / WSL (`build_apps.sh`)

Pastikan script bisa dieksekusi:
```bash
chmod +x build_apps.sh
```

#### ▶ Build Dashboard saja
```bash
./build_apps.sh dashboard
```

#### ▶ Build Chatbot saja
```bash
./build_apps.sh chatbot
```

#### ▶ Build Dashboard + Chatbot
```bash
./build_apps.sh all
```

📌 Proses yang dilakukan script:
- Menjalankan `npm run build` di folder frontend
- Menghapus aset lama di `backend/app/static/`
- Menyalin hasil build terbaru ke:
  - `backend/app/static/dashboard`
  - `backend/app/static/chatbot`

---

### 🔹 Windows (`build_apps.bat`)

Jalankan:
```bat
build_apps.bat
```

Anda akan melihat menu interaktif:

```
1. Build Dashboard
2. Build Chatbot
3. Build All
```

Pilih sesuai kebutuhan:
- `1` → hanya Dashboard
- `2` → hanya Chatbot
- `3` → build semuanya

📌 Script Windows melakukan proses yang sama dengan versi Bash, termasuk pembersihan aset lama dan penyalinan hasil build ke backend.

---

## 2️⃣ Menjalankan Backend Flask

Setelah frontend dibuild, jalankan **satu service backend**.

```bash
cd backend

# Rekomendasi Production
gunicorn -w 4 -b 0.0.0.0:5000 run:app

# Development
python run.py
```

---

## 🔗 Alamat Akses (Satu Domain)

Semua layanan diakses melalui **satu port**:

- **Dashboard Admin**  
  http://localhost:5000/dashboard/

- **Chatbot SIGAP**  
  http://localhost:5000/chatbot/

- **API Backend**  
  http://localhost:5000/api/

---

## 🛠 Konfigurasi Penting

### 1️⃣ Vite Config (`vite.config.js`)

Pastikan `base` disesuaikan dengan lokasi static Flask.

**Dashboard**
```js
base: '/static/dashboard/'
```

**Chatbot**
```js
base: '/static/chatbot/'
```

---

### 2️⃣ Flask Route Integration

Backend menggunakan `send_from_directory` untuk:
- Melayani file `index.html`
- Mendukung **Client-Side Routing (React Router)**

Contoh konsep:
- `/dashboard/*` → `static/dashboard/index.html`
- `/chatbot/*` → `static/chatbot/index.html`

---

## 🌐 Reverse Proxy (Nginx / Caddy)

Karena backend berjalan di satu port (`5000`), reverse proxy dapat diarahkan dengan mudah.

---

### 🔹 Satu Domain

#### Nginx
```nginx
server {
    listen 80;
    server_name domain-anda.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Caddy
```caddyfile
domain-anda.com {
    reverse_proxy 127.0.0.1:5000
}
```

---

### 🔹 Domain / Subdomain Terpisah

Contoh:
- Dashboard → `dashboard.domain-anda.com`
- Chatbot → `chatbot.domain-anda.com`
- API → `api.domain-anda.com`

Backend **tetap satu**, hanya routing proxy yang dipisah.

#### Nginx
```nginx
server {
    listen 80;
    server_name dashboard.domain-anda.com;

    location / {
        proxy_pass http://127.0.0.1:5000/dashboard/;
    }
}

server {
    listen 80;
    server_name chatbot.domain-anda.com;

    location / {
        proxy_pass http://127.0.0.1:5000/chatbot/;
    }
}

server {
    listen 80;
    server_name api.domain-anda.com;

    location / {
        proxy_pass http://127.0.0.1:5000/api/;
    }
}
```

#### Caddy (Recommended)
```caddyfile
dashboard.domain-anda.com {
    handle_path /* {
        reverse_proxy 127.0.0.1:5000/dashboard
    }
}

chatbot.domain-anda.com {
    handle_path /* {
        reverse_proxy 127.0.0.1:5000/chatbot
    }
}

api.domain-anda.com {
    handle_path /* {
        reverse_proxy 127.0.0.1:5000/api
    }
}
```

> ✅ Caddy otomatis mengelola HTTPS (Let's Encrypt)  
> ✅ Sangat cocok untuk deployment multi-subdomain

---

## 🤖 Otomatisasi BPS Web API & Forward WhatsApp (SIGAP Monitor)

Sistem memiliki program pemantauan otomatis untuk publikasi dan siaran resmi BPS (`webapi.bps.go.id`). Sistem memantau **2 kategori dokumen sekaligus**:
- 📘 **Publikasi Buku Statistik** (`model/publication`): Laporan statistik sektoral & tahunan lengkap (ratusan halaman).
- 📰 **Berita Resmi Statistik / BRS** (`model/pressrelease`): Lembar siaran pers statistik berkala bulanan (inflasi, ekspor-impor, PDRB, transportasi, dll.).

Program ini bekerja secara berurutan:
1. **Pengecekan Berkala & Deteksi Revisi**: Memindai rilis data terbaru (Publikasi & BRS) dari BPS Web API secara kronologis.
   - **Rilis Baru**: Mendeteksi dokumen yang belum tersimpan di database lokal.
   - **Revisi / Pembaruan Data**: Mendeteksi dokumen yang sudah pernah diunduh tetapi memiliki pembaruan resmi dari BPS (berdasarkan atribut `updt_date` Web API BPS).
2. **Download & Chunking Vektor**: Mengunduh PDF resmi publikasi atau BRS. Jika dokumen merupakan revisi, sistem otomatis menghapus chunk lama (`DocumentChunk`) dan menggantikannya dengan hasil ekstraksi PDF terbaru sehingga pencarian pgvector selalu akurat tanpa data usang.
3. **Perangkuman AI (Gemini 2.5 Flash)**: Menghasilkan ringkasan eksekutif berisi 3–5 poin indikator statistik penting (disertai konteks sorotan revisi jika dokumen diperbarui) dan menyusun format siaran WhatsApp resmi (*bold*, emoji, link unduhan resmi, identifikasi jenis dokumen BRS/Publikasi).
4. **Penerusan ke WhatsApp (Dispatcher)**: Mengirimkan pesan siaran langsung ke Channel / Grup WhatsApp melalui Webhook / Gateway yang dikonfigurasi (dengan label `📢 RILIS BERITA RESMI STATISTIK (BRS)` atau `📢 RILIS PUBLIKASI STATISTIK`), atau menyimpannya di Dashboard untuk disalin & dikirim sewaktu-waktu.

---

### 💻 Perintah CLI & Pengecekan Sistem (Terminal)

Jalankan perintah ini di dalam folder `backend/` menggunakan virtual environment:

#### 1. Jalankan Pemantauan & Sinkronisasi Langsung Sekarang
```bash
# Default (memproses publikasi baru teratas):
venv/bin/flask bps:monitor-now

# Batasi maksimal jumlah publikasi yang diunduh sekaligus:
venv/bin/flask bps:monitor-now --max-items 3
```

#### 2. Uji Coba Koneksi Pengiriman Pesan WhatsApp
```bash
venv/bin/flask bps:test-wa --target "08123456789" --message "Halo dari SIGAP BPS! Ini pesan uji coba gateway."
```

#### 3. Pengecekan Cepat / Diagnostic (Python One-Liner)
```bash
# Cek respons fetch publikasi dari BPS Web API:
venv/bin/python -c "from app import create_app; from app.bps_service import BpsApiService; app=create_app(); ctx=app.app_context(); ctx.push(); print(BpsApiService().fetch_publications(page=1))"

# Cek status thread background monitor:
venv/bin/python -c "from app import create_app; from app.bps_monitor import get_monitor_status; app=create_app(); ctx=app.app_context(); ctx.push(); print(get_monitor_status())"

# Uji perangkuman AI & format pesan WA dengan Gemini:
venv/bin/python -c "import sys; sys.stdout.reconfigure(encoding='utf-8'); from app import create_app; from app.bps_monitor import generate_publication_summary_and_wa; app=create_app(); ctx=app.app_context(); ctx.push(); print(generate_publication_summary_and_wa('Statistik Tanaman Pangan 2024', '2024-05-15', 'Abstrak publikasi BPS', 'https://gorontalo.bps.go.id/padi.pdf'))"
```

---

### 🔌 Daftar REST API Endpoint BPS & WhatsApp

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/api/documents/bps/config` | Mengambil konfigurasi BPS API & WhatsApp |
| `POST` | `/api/documents/bps/config` | Menyimpan konfigurasi BPS API & WhatsApp |
| `GET` | `/api/documents/bps/preview` | Mengambil daftar pratinjau publikasi BPS |
| `POST` | `/api/documents/bps/sync` | Memulai sinkronisasi manual batch publikasi |
| `GET` | `/api/documents/bps/sync-status` | Status real-time background job sinkronisasi |
| `POST` | `/api/documents/bps/sync-stop` | Menghentikan job sinkronisasi yang berjalan |
| `POST` | `/api/documents/bps/sync-reset` | Reset status job yang macet ke IDLE |
| `GET` | `/api/documents/bps/auto-monitor/status` | Mengambil status pemantau otomatis (daemon) |
| `POST` | `/api/documents/bps/auto-monitor/run` | Memicu 1 siklus pengecekan otomatis sekarang |
| `GET` | `/api/documents/bps/alerts` | Mengambil riwayat publikasi & rangkuman AI |
| `POST` | `/api/documents/bps/alerts/<id>/forward` | Mengirim ulang pesan rilis ke WhatsApp |

---

### 📲 Konfigurasi Gateway WhatsApp (Local Gateway / Baileys)

Sistem menggunakan **Local WhatsApp Gateway (Baileys Node.js)** yang berjalan mandiri di localhost:
1. **Local Gateway (`local` / `http://localhost:3001/send`)**: Menjalankan server Baileys mandiri dari folder `wa-gateway` (menggunakan `start-wa-gateway.bat` atau `./start-wa-gateway.sh`). 100% gratis, tanpa batasan kuota pesan, dan mendukung pengiriman media cover gambar buku publikasi/BRS resmi BPS secara otomatis.
2. **Dashboard Review & Clipboard**: Seluruh pesan rilis tersimpan rapi di tab **"Rangkuman AI & Siaran WA"** pada Dashboard Admin dengan fitur pencarian, filter, pagination, dan tombol **Salin Pesan WA** / **Kirim WA**.

---

## 🛠 Tech Stack

**Backend**
- Python Flask
- ChromaDB (Vector Database)
- LangChain

**Frontend**
- React.js
- Vite
- Tailwind CSS

**Integrasi**
- Shell Script (Linux/Mac/WSL)
- Batch Script (Windows)

---

## 📝 Catatan Penting

- Jalankan `build_apps` **setiap kali frontend berubah**
- Gunakan build parsial (`dashboard` / `chatbot`) untuk mempercepat workflow
- Backend tetap **satu service**, meskipun domain dipisah
- Restart Flask/Gunicorn jika diperlukan setelah update aset
