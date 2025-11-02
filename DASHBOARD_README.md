# Dashboard Sistem Absensi

Dashboard website untuk melihat dan mengelola data absensi siswa.

## Fitur

✅ **Statistik Dashboard**
- Total siswa
- Total absensi
- Total pendapatan
- Status invoice (sudah/belum)

✅ **Daftar Absensi**
- Tampilan tabel dengan foto absensi
- Filter berdasarkan nama siswa
- Filter berdasarkan tanggal
- Pagination
- Modal untuk melihat foto absensi detail

✅ **Daftar Siswa**
- Statistik per siswa
- Total absensi per siswa
- Status invoice per siswa
- Total pendapatan per siswa
- Tombol untuk melihat detail absensi per siswa

✅ **Grafik & Analisis**
- Grafik pendapatan per bulan (6 bulan terakhir)
- Grafik top 10 siswa berdasarkan jumlah absensi

✅ **Responsive Design**
- Dapat diakses dari desktop dan mobile
- UI modern dan user-friendly

## Cara Menjalankan

### 1. Pastikan Dependencies Terinstall

```bash
npm install
```

### 2. Jalankan Dashboard Server

```bash
npm run dashboard
```

Atau:

```bash
node dashboard-server.js
```

### 3. Akses Dashboard

Buka browser dan akses:
```
http://localhost:3001
```

Default port adalah `3001`. Jika ingin mengubah port, set environment variable:
```bash
DASHBOARD_PORT=3002 npm run dashboard
```

## Struktur File

```
dashboard/
├── public/
│   ├── index.html          # Halaman utama dashboard
│   ├── css/
│   │   └── style.css       # Styling dashboard
│   └── js/
│       └── app.js          # JavaScript untuk fetch data dan render
├── dashboard-server.js     # Server Express untuk API dashboard
└── DASHBOARD_README.md      # Dokumentasi ini
```

## API Endpoints

Dashboard menggunakan REST API dengan endpoints berikut:

### GET /api/attendances
Mendapatkan daftar absensi dengan pagination dan filter.

**Query Parameters:**
- `page` (number): Halaman (default: 1)
- `limit` (number): Jumlah data per halaman (default: 20)
- `nama` (string): Filter nama siswa
- `dateFrom` (string): Filter tanggal mulai (format: YYYY-MM-DD)
- `dateTo` (string): Filter tanggal akhir (format: YYYY-MM-DD)

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

### GET /api/statistics
Mendapatkan statistik keseluruhan sistem absensi.

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

### GET /api/students
Mendapatkan daftar semua siswa dengan statistik.

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

### GET /api/attendances/student/:nama
Mendapatkan semua absensi untuk siswa tertentu.

**URL Parameters:**
- `nama` (string): Nama siswa

**Response:**
```json
{
  "success": true,
  "data": [...]
}
```

## Konfigurasi

Dashboard menggunakan koneksi MongoDB yang sama dengan bot (`global.mongodblink` dari `settings.js`).

Pastikan:
1. MongoDB connection string sudah benar di `settings.js`
2. Schema `Attendance` sudah ada di database
3. Folder `./absen/` ada dan berisi foto-foto absensi

## Troubleshooting

### Dashboard tidak bisa diakses
- Pastikan port 3001 tidak digunakan aplikasi lain
- Cek apakah dashboard server sudah berjalan
- Lihat console untuk error messages

### Data tidak muncul
- Pastikan MongoDB sudah terhubung
- Cek apakah ada data absensi di database
- Lihat console browser untuk error JavaScript

### Foto tidak muncul
- Pastikan folder `./absen/` ada
- Pastikan path foto di database benar
- Cek permission file/folder

## Catatan

- Dashboard server berjalan terpisah dari bot WhatsApp
- Data akan auto-refresh setiap 30 detik
- Foto absensi ditampilkan dalam format base64 untuk performa yang lebih baik
- Dashboard menggunakan Chart.js untuk menampilkan grafik

## Development

Untuk development, bisa gunakan nodemon:
```bash
npx nodemon dashboard-server.js
```

## Support

Jika ada masalah, pastikan:
1. Node.js versi terbaru
2. Semua dependencies terinstall
3. MongoDB connection string valid
4. Port 3001 tersedia

