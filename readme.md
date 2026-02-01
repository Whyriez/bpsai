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
