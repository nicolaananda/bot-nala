# 🤖 Bot Telegram Absensi

Bot Telegram dengan fitur yang sama persis dengan bot WhatsApp absensi.

## ✨ Features

### 1. Pencatatan Absensi via Foto
- Kirim foto dengan caption khusus untuk mencatat absensi
- Format: `absen NamaSiswa Harga Tanggal Deskripsi`
- Contoh: `absen Budi 150000 10/11/2025 Kelas Piano Dasar`
- Auto-save ke MongoDB dengan metadata lengkap
- Foto disimpan ke Cloudflare R2 atau lokal storage

### 2. Invoice Generator Otomatis
- Auto-generate invoice setelah 4 absen
- Manual generate via command `/invoice NamaSiswa`
- Template invoice profesional dengan grid foto 2x2
- Informasi lengkap: nama, tanggal, harga, deskripsi

### 3. Smart Tracking System
- Track status invoice per absen
- Mencegah duplikasi invoice
- Historis lengkap absensi per siswa

## 🚀 Cara Menjalankan

### Prerequisites
- Node.js (v14 atau lebih tinggi)
- MongoDB (local atau cloud seperti MongoDB Atlas)
- Token Telegram Bot

### Installation

1. **Install dependencies** (jika belum):
```bash
npm install --legacy-peer-deps
```

2. **Konfigurasi MongoDB** di `settings.js`:
```javascript
global.mongodblink = 'mongodb://localhost:27017/bot-absensi';
```

3. **Jalankan bot**:
```bash
npm run telegram
```

Atau:
```bash
node telegram-bot.js
```

## 📖 Usage

### Mencatat Absensi

Kirim foto dengan caption berikut:

```
absen NamaSiswa Harga Tanggal(DD/MM/YYYY) DeskripsiKelas
```

**Contoh:**
```
absen Budi 150000 10/11/2025 Kelas Piano Dasar
```

Bot akan:
1. Validasi format caption
2. Download foto dari Telegram
3. Simpan foto ke R2 atau lokal
4. Simpan data ke MongoDB
5. Jika sudah 4 absen belum di-invoice, otomatis generate invoice

**Response:**
```
✅ Data untuk Budi pada 10/11/2025 telah disimpan.

🆔 ID: 65a1b2c3d4e5f6g7h8i9j0k1

💡 Gunakan command /invoice Budi untuk membuat invoice.
```

### Generate Invoice Manual

Kirim command:

```
/invoice NamaSiswa
```

**Contoh:**
```
/invoice Budi
```

Bot akan:
1. Query semua absen belum di-invoice untuk siswa tersebut
2. Generate invoice dengan semua absen (maksimal 4 foto pertama)
3. Mark absen sebagai sudah di-invoice
4. Kirim invoice ke Telegram

**Response:**
```
📄 Invoice untuk Budi (6 absen)

Total: Rp 900.000
```

### Auto-Generate Invoice

Ketika siswa mencapai 4 absen yang belum di-invoice, bot akan otomatis:
1. Generate invoice dengan 4 foto absensi (grid 2x2)
2. Mark 4 absen sebagai sudah di-invoice
3. Kirim invoice ke Telegram

**Response:**
```
📄 Invoice untuk Budi telah dibuat secara otomatis.
```

### Cek Data Murid

Kirim command:

```
/cekmurid NamaSiswa
```

Atau alternatif:
```
/ceksiswa NamaSiswa
/cekabsen NamaSiswa
```

**Contoh:**
```
/cekmurid Budi
```

Bot akan menampilkan:
- Ringkasan: Total absen, sudah invoice, belum invoice
- Total harga: Semua, sudah invoice, belum invoice
- Detail absen belum invoice
- Detail absen sudah invoice

### Cek Murid Belum Bayar

Kirim command:

```
/belumbayar
```

Atau alternatif:
```
/belumbyr
/blmbyr
```

Bot akan menampilkan list murid yang:
- Memiliki 1-3 pertemuan yang belum invoice (< 4 pertemuan)
- Absen terakhir lebih dari 5 minggu yang lalu
- Belum terinvoice

Informasi yang ditampilkan:
- Nama murid
- Jumlah pertemuan yang belum invoice
- Tanggal absen terakhir
- Lama tidak absen (minggu & hari)
- Total belum bayar

### Hapus Data Absensi

Kirim command:

```
/hapusabsen ID
```

Atau alternatif:
```
/deleteabsen ID
/delabsen ID
```

**Contoh:**
```
/hapusabsen 507f1f77bcf86cd799439011
```

Bot akan:
1. Mencari data absensi berdasarkan ID
2. Menghapus data dari MongoDB
3. Menghapus foto dari R2 atau lokal storage
4. Mengirim konfirmasi penghapusan

**Response:**
```
✅ Data absensi berhasil dihapus!

📋 Detail Data yang Dihapus:
• Nama: Budi
• Tanggal: 10/11/2025
• Kelas: Kelas Piano Dasar
• Harga: Rp 150.000
• ID: 507f1f77bcf86cd799439011
```

**Catatan:**
- ID absensi bisa didapat dari response saat mencatat absensi atau dari command `/cekmurid`
- Foto akan dihapus dari R2 (jika tersimpan di R2) atau dari lokal storage

### Command Lainnya

- `/start` atau `/help` - Menampilkan bantuan

## 🔧 Configuration

Bot menggunakan konfigurasi yang sama dengan bot WhatsApp:

- **MongoDB Connection**: Dari `settings.js` (`global.mongodblink`)
- **R2 Storage**: Dari environment variables atau `settings.js`
- **Token Telegram**: Hardcoded di `telegram-bot.js` (baris 14)

**Untuk mengubah token Telegram**, edit file `telegram-bot.js`:

```javascript
const TELEGRAM_BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN_HERE';
```

## 📊 Database

Bot menggunakan MongoDB schema yang sama dengan bot WhatsApp:

```javascript
{
    nama: String,
    harga: Number,
    tanggal: Date,
    deskripsi: String,
    foto_path: String,
    isInvoiced: Boolean,
    createdAt: Date
}
```

## 🌐 Fitur yang Sama dengan Bot WhatsApp

✅ Pencatatan absensi via foto dengan caption
✅ Validasi format caption
✅ Download dan simpan foto (R2 atau lokal)
✅ Simpan ke MongoDB
✅ Auto-generate invoice setelah 4 absen
✅ Manual generate invoice via command
✅ Template invoice dengan grid 2x2
✅ Track status invoice per absen
✅ Mencegah duplikasi invoice

## 🐛 Troubleshooting

### Bot tidak merespon

1. Pastikan bot sudah berjalan (`npm run telegram`)
2. Cek token Telegram Bot sudah benar
3. Pastikan MongoDB connection berhasil
4. Cek console log untuk error messages

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

### Error: Cannot find module

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

## 📝 Notes

- Bot Telegram dan WhatsApp menggunakan database MongoDB yang sama
- Data absensi dari kedua bot akan terlihat di dashboard web yang sama
- Invoice template dan format sama persis dengan bot WhatsApp
- Foto disimpan dengan format yang sama: `absen/nama_tanggal_waktu.jpg`

## 🔐 Security

⚠️ **PENTING**: Token Telegram Bot bersifat sensitif. Jangan share token ke publik atau commit ke repository publik.

## 📞 Support

Jika ada pertanyaan atau masalah:
1. Cek console log untuk error messages
2. Pastikan semua prerequisites sudah terpenuhi
3. Cek MongoDB connection string
4. Pastikan R2 credentials (jika menggunakan R2 storage)

---

⭐ Bot Telegram ini dibuat dengan fitur yang sama persis dengan bot WhatsApp absensi!

