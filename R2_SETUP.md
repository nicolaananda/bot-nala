# Setup Cloudflare R2 untuk Penyimpanan Foto

Dokumentasi ini menjelaskan cara mengkonfigurasi Cloudflare R2 untuk menyimpan foto absensi secara cloud.

## Persyaratan

1. Akun Cloudflare dengan R2 bucket
2. R2 Access Key ID dan Secret Access Key
3. (Opsional) Custom domain untuk public URL

## Konfigurasi

Tambahkan variabel lingkungan berikut ke file `.env` atau `settings.js`:

```env
# R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-domain.com  # Optional: Custom domain atau public URL
```

## Cara Mendapatkan Credentials

1. **Account ID**: 
   - Login ke Cloudflare Dashboard
   - Pilih akun Anda
   - Account ID ada di sidebar kanan

2. **Access Key ID dan Secret Access Key**:
   - Buka **R2** di dashboard
   - Klik **Manage R2 API tokens**
   - Klik **Create API token**
   - Pilih permission: **Object Read & Write**
   - Copy **Access Key ID** dan **Secret Access Key** (hanya muncul sekali!)

3. **Bucket Name**:
   - Buat bucket baru atau gunakan yang sudah ada
   - Nama bucket Anda adalah `R2_BUCKET_NAME`

4. **Public URL (Opsional)**:
   - Jika menggunakan custom domain, isi dengan domain Anda
   - Contoh: `https://cdn.yourdomain.com`
   - Jika tidak diisi, foto akan di-download dan dikonversi ke base64

## Cara Kerja

1. **Upload**: Saat absensi dibuat, foto otomatis di-upload ke R2 dengan path `absen/nama_tanggal_waktu.jpg`
2. **Storage**: Path disimpan di MongoDB sebagai `foto_path`
3. **Download**: Saat generate invoice atau view di dashboard, foto di-download dari R2
4. **Delete**: Saat hapus absensi, foto juga dihapus dari R2

## Fallback

Jika R2 credentials tidak dikonfigurasi atau terjadi error:
- Foto akan tetap disimpan secara lokal di folder `./absen/`
- System akan otomatis fallback ke local storage
- Tidak ada error yang mengganggu fungsi bot

## Testing

### Test Koneksi R2

Jalankan script test untuk memverifikasi koneksi R2:

```bash
npm run test-r2
```

Script ini akan:
1. ✅ Mengecek apakah semua environment variables sudah ter-set
2. 🧪 Test upload file ke R2
3. 🧪 Test download file dari R2
4. 🧪 Test public URL (jika dikonfigurasi)
5. 🧪 Test delete file dari R2
6. ✅ Verifikasi file sudah terhapus

Jika semua test berhasil, berarti R2 sudah terkonfigurasi dengan benar!

### Test Manual

Setelah koneksi R2 terkonfirmasi, coba:
1. Buat absensi baru dengan foto
2. Cek console log untuk melihat `✅ Foto uploaded to R2: ...`
3. Generate invoice untuk memastikan foto bisa di-download
4. Hapus absensi untuk memastikan foto terhapus dari R2

## Troubleshooting

**Error: "R2 credentials not configured"**
- Pastikan semua variabel R2 sudah di-set di `.env`
- Restart bot setelah menambahkan credentials

**Foto tidak muncul di invoice**
- Cek apakah bucket name benar
- Cek permission API token (harus Object Read & Write)
- Cek console log untuk error detail

**Foto tidak terhapus**
- Cek permission API token
- Cek format `foto_path` di database (harus mulai dengan `absen/` atau URL)

