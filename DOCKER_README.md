# Docker Setup untuk Bot Nala

Dokumentasi untuk menjalankan aplikasi Bot Nala menggunakan Docker.

## Prerequisites

- Docker dan Docker Compose terinstall
- File `.env` sudah dikonfigurasi (lihat `.env.example`)

## Setup

1. **Copy file environment:**
   ```bash
   cp .env.example .env
   ```

2. **Edit file `.env`** dan isi dengan konfigurasi yang sesuai:
   - `MONGODB_URI` - Connection string MongoDB (wajib)
   - `DASHBOARD_PORT` - Port untuk dashboard (default: 1395)
   - Konfigurasi lainnya sesuai kebutuhan

3. **Build dan jalankan semua services:**
   ```bash
   docker-compose up -d
   ```

4. **Lihat logs:**
   ```bash
   # Semua services
   docker-compose logs -f
   
   # Service tertentu
   docker-compose logs -f whatsapp-bot
   docker-compose logs -f dashboard-server
   docker-compose logs -f telegram-bot
   ```

## Services

### 1. WhatsApp Bot (`whatsapp-bot`)
- Container: `bot-nala-whatsapp`
- Command: `node index.js`
- Volumes: `auth`, `database`, `absen`, `invoice`, `GATEWAY`, `image`, `images`

### 2. Dashboard Server (`dashboard-server`)
- Container: `bot-nala-dashboard`
- Command: `node dashboard-server.js`
- Port: `1395` (atau sesuai `DASHBOARD_PORT` di `.env`)
- Volumes: `database`, `absen`, `invoice`, `images`, `dashboard`
- Access: http://localhost:1395

### 3. Telegram Bot (`telegram-bot`)
- Container: `bot-nala-telegram`
- Command: `node telegram-bot.js`
- Volumes: `database`, `absen`, `invoice`, `images`

## Commands

### Start services
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### Restart service tertentu
```bash
docker-compose restart whatsapp-bot
docker-compose restart dashboard-server
docker-compose restart telegram-bot
```

### Rebuild setelah perubahan code
```bash
docker-compose up -d --build
```

### Stop dan hapus containers (termasuk volumes)
```bash
docker-compose down -v
```

### Lihat status services
```bash
docker-compose ps
```

## Volumes

Data berikut disimpan di host machine dan di-mount ke containers:
- `./auth` - Session WhatsApp
- `./database` - Database JSON files
- `./absen` - Foto absensi
- `./invoice` - Invoice yang di-generate
- `./GATEWAY` - Gateway data
- `./image` - Images untuk bot
- `./images` - Images untuk invoice template
- `./dashboard` - Dashboard files

## Troubleshooting

### Port sudah digunakan
Jika port 1395 sudah digunakan, ubah `DASHBOARD_PORT` di file `.env`:
```
DASHBOARD_PORT=3002
```

### MongoDB connection error
Pastikan `MONGODB_URI` di `.env` sudah benar dan MongoDB accessible dari Docker container.

### Container tidak start
Cek logs untuk detail error:
```bash
docker-compose logs whatsapp-bot
docker-compose logs dashboard-server
docker-compose logs telegram-bot
```

### Rebuild setelah dependency changes
```bash
docker-compose build --no-cache
docker-compose up -d
```

## Development

Untuk development dengan hot-reload, gunakan volume mounting dan nodemon (jika diperlukan):
```bash
# Install nodemon di host
npm install -g nodemon

# Atau jalankan langsung di host tanpa Docker
npm run start
```

