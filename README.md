# 🤖 Bot Absensi & Invoice Generator

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0%2B-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Sistem otomatis berbasis WhatsApp untuk pengelolaan absensi siswa dengan fitur pembuatan invoice otomatis. Menggabungkan teknologi WhatsApp Bot (Baileys), MongoDB, dan Dashboard Web untuk memberikan solusi lengkap bagi lembaga pendidikan atau kursus.

## 📋 Table of Contents

- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Dashboard](#-dashboard)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### 🤖 WhatsApp Bot

- ✅ **Pencatatan Absensi via Foto**
  - Kirim foto dengan caption khusus untuk mencatat absensi
  - Format: `absen [NamaSiswa] [Harga] [Tanggal] [Deskripsi]`
  - Auto-save ke MongoDB dengan metadata lengkap
  - Foto disimpan ke Cloudflare R2 atau lokal storage

- ✅ **Invoice Generator Otomatis**
  - Auto-generate invoice setelah 4 absen
  - Manual generate via command `invoice [NamaSiswa]`
  - Template invoice profesional dengan grid foto 2x2
  - Informasi lengkap: nama, tanggal, harga, deskripsi

- ✅ **Smart Tracking System**
  - Track status invoice per absen
  - Mencegah duplikasi invoice
  - Historis lengkap absensi per siswa

### 📊 Dashboard Web

- ✅ **Statistik Real-time**
  - Total siswa, absensi, pendapatan
  - Grafik pendapatan per bulan
  - Top 10 siswa berdasarkan absensi

- ✅ **Manajemen Data**
  - Tabel absensi dengan foto
  - Filter by nama & tanggal
  - Pagination untuk performa optimal

- ✅ **Export & Reporting**
  - Export data ke JSON/CSV
  - Download invoice individual
  - Laporan lengkap per siswa

## 🔧 Prerequisites

Sebelum memulai, pastikan Anda sudah menginstall:

- **Node.js** (v14 atau lebih tinggi)
- **MongoDB** (local atau cloud seperti MongoDB Atlas)
- **WhatsApp Account** untuk bot
- **Cloudflare R2 Account** (optional, bisa menggunakan local storage)

## 📦 Installation

1. **Clone repository**
```bash
git clone https://github.com/yourusername/bot-nala.git
cd bot-nala
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup configuration**
Buat file `settings.js` (lihat [Configuration](#-configuration))

4. **Run bot**
```bash
# Run bot only
npm start

# Run dashboard only
npm run dashboard

# Run both (recommended)
node index.js && node dashboard-server.js
```

## ⚙️ Configuration

Buat file `settings.js` di root project dengan konfigurasi berikut:

```javascript
// MongoDB Connection
global.mongodblink = 'mongodb://localhost:27017/bot-absensi';
// atau untuk MongoDB Atlas:
// global.mongodblink = 'mongodb+srv://user:pass@cluster.mongodb.net/dbname';

// Cloudflare R2 Configuration (Optional)
global.R2_ACCOUNT_ID = 'your-account-id';
global.R2_ACCESS_KEY_ID = 'your-access-key';
global.R2_SECRET_ACCESS_KEY = 'your-secret-key';
global.R2_BUCKET_NAME = 'your-bucket-name';
global.R2_ENDPOINT = 'https://your-account-id.r2.cloudflarestorage.com';
global.R2_PUBLIC_URL = 'https://cdn-absen.nicola.id'; // Your CDN URL

// Dashboard Port (Optional, default: 3001)
process.env.DASHBOARD_PORT = 3001;
```

### Environment Variables

Atau gunakan file `.env`:

```env
MONGODB_URI=mongodb://localhost:27017/bot-absensi
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://cdn-absen.nicola.id
DASHBOARD_PORT=3001
```

## 📖 Usage

### Mencatat Absensi

Kirim foto dengan caption berikut:

```
absen [NamaSiswa] [Harga] [Tanggal] [Deskripsi]
```

**Contoh:**
```
absen Budi 150000 10/11/2025 Kelas Piano Dasar
```

Bot akan:
1. Validasi format caption
2. Download foto dari WhatsApp
3. Simpan foto ke R2 atau lokal
4. Simpan data ke MongoDB
5. Jika sudah 4 absen belum di-invoice, otomatis generate invoice

**Response:**
```
✅ Data untuk Budi pada 10/11/2025 telah disimpan.
```

### Generate Invoice Manual

Kirim command:

```
invoice [NamaSiswa]
```

**Contoh:**
```
invoice Budi
```

Bot akan:
1. Query semua absen belum di-invoice untuk siswa tersebut
2. Generate invoice dengan semua absen (maksimal 4 foto pertama)
3. Mark absen sebagai sudah di-invoice
4. Kirim invoice ke WhatsApp

**Response:**
```
📄 Invoice untuk Budi (6 absen)
Total: Rp 900.000
```

### Auto-Generate Invoice

Ketika siswa mencapai 4 absen yang belum di-invoice, bot akan otomatis:
1. Generate invoice dengan 4 foto absensi (grid 2x2)
2. Mark 4 absen sebagai sudah di-invoice
3. Kirim invoice ke WhatsApp

**Response:**
```
📄 Invoice untuk Budi telah dibuat secara otomatis.
```

## 🌐 Dashboard

Dashboard web tersedia di `http://localhost:3001` (atau port yang dikonfigurasi).

### Features Dashboard:

1. **Statistics Overview**
   - Total siswa, absensi, pendapatan
   - Revenue chart (6 bulan terakhir)
   - Top students ranking

2. **Attendance Management**
   - Tabel dengan foto absensi
   - Filter by nama & tanggal
   - Pagination (20 items per page)
   - Delete attendance

3. **Student Management**
   - List semua siswa dengan statistik
   - Total absensi & pendapatan per siswa
   - Status invoice per siswa
   - View detail absensi per siswa

4. **Invoice Management**
   - Generate invoice dari dashboard
   - Preview invoice sebelum download
   - Download invoice sebagai PNG

5. **Export Data**
   - Export ke JSON
   - Export ke CSV
   - Download individual invoices

### Access Dashboard:

```bash
# Jalankan dashboard server
npm run dashboard

# Akses di browser
http://localhost:3001
```

## 📚 API Documentation

### Attendance API

#### GET `/api/attendances`
Get all attendances dengan pagination & filters

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `nama` (string): Filter by student name
- `dateFrom` (string): Filter from date (YYYY-MM-DD)
- `dateTo` (string): Filter to date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

#### GET `/api/statistics`
Get dashboard statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAttendances": 150,
    "totalStudents": 25,
    "totalRevenue": 15000000,
    "invoicedCount": 120,
    "uninvoicedCount": 30,
    "revenueByMonth": [...],
    "topStudents": [...]
  }
}
```

#### GET `/api/students`
Get all students with statistics

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "nama": "Budi",
      "totalAttendances": 10,
      "totalHarga": 1000000,
      "invoicedCount": 8,
      "uninvoicedCount": 2,
      "lastAttendance": "2025-11-10T00:00:00.000Z",
      "firstAttendance": "2025-10-01T00:00:00.000Z"
    }
  ]
}
```

#### GET `/api/attendances/student/:nama`
Get all attendances for specific student

**Response:**
```json
{
  "success": true,
  "data": [...]
}
```

#### POST `/api/invoice/generate`
Generate invoice

**Request Body:**
```json
{
  "nama": "Budi",
  "attendanceIds": ["id1", "id2"] // Optional: specific attendance IDs
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invoice berhasil dibuat",
  "data": {
    "invoiceBase64": "data:image/png;base64,...",
    "fileName": "invoice_budi_10-11-2025.png",
    "invoicePath": "/invoice/invoice_budi_10-11-2025.png",
    "attendanceCount": 4,
    "totalHarga": 600000,
    "nama": "Budi"
  }
}
```

#### DELETE `/api/attendances/:id`
Delete attendance by ID

**Response:**
```json
{
  "success": true,
  "message": "Data absensi berhasil dihapus",
  "data": {
    "deletedId": "id",
    "nama": "Budi",
    "tanggal": "10/11/2025"
  }
}
```

#### GET `/api/export/attendances`
Export data

**Query Parameters:**
- `format` (string): Format export - `json` or `csv` (default: json)

**Response:**
File download (JSON or CSV)

## 📁 Project Structure

```
bot-nala/
├── absen/                      # Photo storage (local)
├── dashboard/                  # Dashboard web files
│   ├── public/
│   │   ├── index.html          # Dashboard UI
│   │   ├── css/
│   │   │   └── style.css       # Styling
│   │   └── js/
│   │       └── app.js           # Frontend logic
├── database/                   # JSON database files
├── invoice/                    # Generated invoices
├── images/                     # Invoice template
├── lib/                        # Utility libraries
│   ├── r2.js                   # R2 storage functions
│   ├── exif.js                 # Image processing
│   └── simple.js               # Utilities
├── index.js                    # Bot entry point
├── main.js                     # Bot main logic
├── arap.js                     # Bot handlers
├── dashboard-server.js          # Dashboard API server
├── settings.js                  # Configuration
├── package.json                # Dependencies
├── README.md                    # This file
├── PORTOFOLIO_BOT_ABSEN.md     # Portfolio documentation
└── portfolio.html              # Portfolio website
```

## 🔍 Troubleshooting

### Bot tidak bisa terhubung ke WhatsApp

1. Pastikan `auth_info_baileys/` folder ada
2. Scan QR code yang muncul di terminal
3. Pastikan koneksi internet stabil
4. Cek apakah WhatsApp account tidak di-ban

### Database connection error

1. Pastikan MongoDB running (jika local)
2. Cek connection string di `settings.js`
3. Pastikan MongoDB Atlas whitelist IP Anda (jika cloud)
4. Test connection dengan `mongosh` atau MongoDB Compass

### Foto tidak tersimpan

1. Cek permission folder `absen/`
2. Pastikan disk space cukup
3. Cek R2 credentials jika menggunakan R2 storage
4. Lihat console log untuk error messages

### Invoice tidak ter-generate

1. Pastikan template `images/invoice.png` ada
2. Cek apakah ada 4 absen yang belum di-invoice
3. Pastikan foto absensi masih tersedia
4. Cek disk space untuk menyimpan invoice

### Dashboard tidak bisa diakses

1. Pastikan dashboard server running
2. Cek port 3001 tidak digunakan aplikasi lain
3. Cek firewall settings
4. Pastikan MongoDB connection berhasil

### Error: Cannot find module

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 🛠️ Development

### Requirements

- Node.js 14+
- MongoDB 6.0+
- Modern browser (untuk dashboard)

### Scripts

```bash
# Start bot
npm start

# Start dashboard only
npm run dashboard

# Test R2 connection
npm run test-r2
```

### Code Structure

- `main.js`: WhatsApp bot initialization & connection
- `arap.js`: Bot message handlers & attendance logic
- `dashboard-server.js`: Express server untuk dashboard API
- `lib/r2.js`: Cloudflare R2 storage utilities
- `lib/exif.js`: Image processing utilities

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Nicola**

- Website: [nicola.id](https://nicola.id)
- Portfolio: [nicola.id/portfolio](https://nicola.id/portfolio)

## 🙏 Acknowledgments

- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API library
- [MongoDB](https://www.mongodb.com/) - Database
- [Express.js](https://expressjs.com/) - Web framework
- [Jimp](https://github.com/oliver-moran/jimp) - Image processing
- [Cloudflare R2](https://www.cloudflare.com/products/r2/) - Object storage

## 📞 Support

Jika Anda menemukan bug atau memiliki pertanyaan:

1. Cek [Troubleshooting](#-troubleshooting) section
2. Buat [Issue](https://github.com/yourusername/bot-nala/issues) di GitHub
3. Atau hubungi developer melalui email

---

⭐ Jika project ini membantu Anda, jangan lupa berikan star!

