#!/bin/bash
# Script menjalankan SIGAP BPS WhatsApp Gateway di Linux / VPS
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR/wa-gateway"

echo "============================================================="
echo "  Menjalankan SIGAP BPS WhatsApp Gateway (Baileys Node.js)"
echo "============================================================="

# Install dependency jika belum ada node_modules
if [ ! -d "node_modules" ]; then
    echo "Memasang dependensi npm..."
    npm install
fi

npm start
