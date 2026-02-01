# BPS AI System (SIGAP)

Project terintegrasi yang menggabungkan **Backend Python Flask** dengan dua aplikasi frontend **React (Vite)**: **Dashboard Admin** dan **Chatbot SIGAP**. Seluruh layanan berjalan sebagai satu kesatuan service di bawah Flask untuk memudahkan manajemen port dan deployment.

---

## 📂 Struktur Project

```plaintext
bpsai/
├── backend/            # Python Flask API & Static File Server
├── dashboard-bpsai/    # Frontend Dashboard (React + Vite)
├── chatbot-bpsai/      # Frontend Chatbot SIGAP (React + Vite)
├── build_apps.sh       # Script otomatisasi build & integrasi (Linux/Mac)
└── build_apps.bat      # Script otomatisasi build & integrasi (Windows)
```

---

## 🚀 Cara Menjalankan (Satu Paket)

Ikuti langkah-langkah berikut untuk menggabungkan frontend ke dalam backend dan menjalankan layanannya:

### 1️⃣ Build Frontend Otomatis

Jalankan script otomatis untuk memproses build produksi React dan memindahkan asetnya ke dalam folder static Flask.

**Linux / Mac / WSL**
```bash
chmod +x build_apps.sh
./build_apps.sh
```

**Windows**
```bat
build_apps.bat
```

### 2️⃣ Jalankan Backend Flask

Setelah proses build selesai, Anda hanya perlu menjalankan satu service yaitu backend.

```bash
cd backend

# Rekomendasi Produksi (Gunicorn)
gunicorn -w 4 -b 0.0.0.0:5000 run:app

# Development
python run.py
```

---

## 🔗 Alamat Akses (Satu Domain)

Secara default semua fitur diakses melalui satu domain dan satu port:

- **Dashboard Admin**: http://localhost:5000/dashboard/
- **Chatbot SIGAP**: http://localhost:5000/chatbot/
- **API Backend**: http://localhost:5000/api/

---

## 🛠 Konfigurasi Penting

### 1️⃣ Vite Config (`vite.config.js`)

Pastikan properti `base` sudah disetel agar Flask bisa menemukan file `.js` dan `.css`.

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

File `backend/app/__init__.py` atau `run.py` menggunakan `send_from_directory` untuk melayani file `index.html` dari masing-masing folder frontend guna mendukung **Client-Side Routing (React Router)**.

---

### 3️⃣ Reverse Proxy (Nginx / Caddy)

Karena seluruh layanan berjalan di satu backend (port `5000`), reverse proxy dapat digunakan baik untuk **satu domain** maupun **multi domain/subdomain**.

---

#### A. Satu Domain (Default)

##### Nginx
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

##### Caddy
```caddyfile
domain-anda.com {
    reverse_proxy 127.0.0.1:5000
}
```

---

#### B. Domain / Subdomain Terpisah (Dashboard & Chatbot)

Contoh:
- **Dashboard** → `dashboard.domain-anda.com`
- **Chatbot** → `chatbot.domain-anda.com`
- **API** → `api.domain-anda.com` (opsional)

Backend **tetap satu**, hanya routing proxy yang dipisah.

---

##### 🔹 Nginx (Multi Server Block)

```nginx
server {
    listen 80;
    server_name dashboard.domain-anda.com;

    location / {
        proxy_pass http://127.0.0.1:5000/dashboard/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name chatbot.domain-anda.com;

    location / {
        proxy_pass http://127.0.0.1:5000/chatbot/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name api.domain-anda.com;

    location / {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

##### 🔹 Caddy (Multi Domain – Recommended)

```caddyfile
dashboard.domain-anda.com {
    reverse_proxy 127.0.0.1:5000 {
        header_up Host {host}
    }
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

> ✅ **Caddy otomatis mengelola HTTPS (Let's Encrypt)**  
> ✅ Sangat cocok untuk arsitektur multi-subdomain tanpa ribet SSL

---

### 4️⃣ Penyesuaian Frontend untuk Multi Domain

Jika frontend diakses via domain terpisah:

- Gunakan **relative API URL** (`/api/...`)
- Atau set `VITE_API_BASE_URL` via `.env.production`

Contoh:
```env
VITE_API_BASE_URL=https://api.domain-anda.com
```

Pastikan juga CORS di Flask sudah mengizinkan domain terkait.

---

## 🛠 Tech Stack

**Backend**
- Python Flask
- ChromaDB (Vector DB)
- LangChain

**Frontend**
- React.js
- Vite
- Tailwind CSS

**Integrasi**
- Automation Shell Script / Batch Script

---

## 📝 Catatan

- Jalankan kembali **`build_apps`** setiap ada perubahan frontend
- Backend tetap **satu service**, meskipun domain dipisah
- Arsitektur ini siap untuk **scale horizontal & production deployment**
