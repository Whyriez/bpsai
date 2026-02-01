#!/bin/bash

# Konfigurasi path
BACKEND_DIR="./backend"
DASHBOARD_DIR="./dashboard-bpsai"
CHATBOT_DIR="./chatbot-bpsai"

# Fungsi untuk build Dashboard
build_dashboard() {
    echo "========================================"
    echo "BUILDING DASHBOARD FRONTEND..."
    echo "========================================"
    cd $DASHBOARD_DIR
    npm run build
    cd ..
    
    echo "Cleaning old Dashboard files in backend..."
    rm -rf $BACKEND_DIR/app/static/dashboard
    mkdir -p $BACKEND_DIR/app/static/dashboard
    
    echo "Copying Dashboard build to backend static folder..."
    cp -r $DASHBOARD_DIR/dist/* $BACKEND_DIR/app/static/dashboard/
}

# Fungsi untuk build Chatbot
build_chatbot() {
    echo "========================================"
    echo "BUILDING CHATBOT FRONTEND..."
    echo "========================================"
    cd $CHATBOT_DIR
    npm run build
    cd ..
    
    echo "Cleaning old Chatbot files in backend..."
    rm -rf $BACKEND_DIR/app/static/chatbot
    mkdir -p $BACKEND_DIR/app/static/chatbot
    
    echo "Copying Chatbot build to backend static folder..."
    cp -r $CHATBOT_DIR/dist/* $BACKEND_DIR/app/static/chatbot/
}

# Cek parameter yang dimasukkan oleh user
case "$1" in
    dashboard)
        build_dashboard
        ;;
    chatbot)
        build_chatbot
        ;;
    all)
        build_dashboard
        build_chatbot
        ;;
    *)
        echo "Error: Parameter salah atau kosong!"
        echo "Penggunaan: ./build_apps.sh [dashboard|chatbot|all]"
        echo "------------------------------------------------"
        echo "Contoh: ./build_apps.sh chatbot   -> Hanya update chatbot"
        echo "Contoh: ./build_apps.sh dashboard -> Hanya update dashboard"
        echo "Contoh: ./build_apps.sh all       -> Update semuanya"
        exit 1
        ;;
esac

echo "========================================"
echo "PROSES SELESAI!"
echo "Aset frontend telah diperbarui di folder backend."
echo "Silakan restart service Flask Anda jika diperlukan."
echo "========================================"