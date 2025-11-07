#!/bin/bash

# Docker Setup Script untuk Bot Nala

echo "🚀 Setup Docker untuk Bot Nala"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Membuat file .env dari template..."
    cat > .env << EOF
# MongoDB Configuration (WAJIB)
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

# Dashboard Configuration
DASHBOARD_PORT=1395

# Proxy Configuration (optional)
# PROXY_URL=http://proxy-url:port

# Orkut API Configuration (optional)
# ORKUT_PASSWORD=your_password
# ORKUT_USERNAME=your_username
# ORKUT_TOKEN=your_token
# API_KEY=your_api_key

# Cloudflare R2 Configuration (optional)
# R2_ACCOUNT_ID=your_r2_account_id
# R2_ACCESS_KEY_ID=your_r2_access_key_id
# R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
# R2_BUCKET_NAME=your_bucket_name
# R2_PUBLIC_URL=https://your-domain.com

# Payment Gateway Configuration (optional)
# PG_ENDPOINT=https://pg.inyx.site
# PG_API_KEY=your_api_key
# PG_DEVICE_ID=your_device_id
EOF
    echo "✅ File .env berhasil dibuat!"
    echo "⚠️  Silakan edit file .env dan isi dengan konfigurasi yang sesuai"
    echo ""
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker tidak ditemukan. Silakan install Docker terlebih dahulu."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose tidak ditemukan. Silakan install Docker Compose terlebih dahulu."
    exit 1
fi

echo "🐳 Building Docker images..."
docker-compose build

echo ""
echo "✅ Setup selesai!"
echo ""
echo "Untuk menjalankan semua services:"
echo "  docker-compose up -d"
echo ""
echo "Untuk melihat logs:"
echo "  docker-compose logs -f"
echo ""
echo "Untuk stop services:"
echo "  docker-compose down"
echo ""

