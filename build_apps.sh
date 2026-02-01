#!/bin/bash

# Konfigurasi path
BACKEND_DIR="./backend"
DASHBOARD_DIR="./dashboard-bpsai"
CHATBOT_DIR="./chatbot-bpsai"

echo "--- Memulai proses build terintegrasi ---"

# 1. Build Dashboard
echo "Building Dashboard..."
cd $DASHBOARD_DIR
npm run build
cd ..

# 2. Build Chatbot
echo "Building Chatbot..."
cd $CHATBOT_DIR
npm run build
cd ..

# 3. Bersihkan folder static di backend jika sudah ada
echo "Cleaning up old static files..."
rm -rf $BACKEND_DIR/app/static/dashboard
rm -rf $BACKEND_DIR/app/static/chatbot

# 4. Buat folder tujuan jika belum ada
mkdir -p $BACKEND_DIR/app/static/dashboard
mkdir -p $BACKEND_DIR/app/static/chatbot

# 5. Copy hasil build ke backend
echo "Copying files to Backend..."
cp -r $DASHBOARD_DIR/dist/* $BACKEND_DIR/app/static/dashboard/
cp -r $CHATBOT_DIR/dist/* $BACKEND_DIR/app/static/chatbot/

echo "--- Selesai! Sekarang jalankan backend Anda ---"