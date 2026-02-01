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

## 🔗 Alamat Akses

Setelah service berjalan, semua fitur dapat diakses di port yang sama:

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

### 2️⃣ Flask Route Integration

File `backend/app/__init__.py` atau `run.py` menggunakan `send_from_directory` untuk melayani file `index.html` dari masing-masing folder frontend guna mendukung Client-Side Routing (React Router).

### 3️⃣ Nginx / Reverse Proxy

Karena semua layanan sudah menjadi satu paket di port `5000`, konfigurasi Nginx menjadi sangat sederhana:

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

Selalu jalankan kembali script **build_apps** setiap kali Anda melakukan perubahan kode di folder frontend agar aset di backend tetap sinkron.
