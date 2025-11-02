require('./settings')
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const Jimp = require('jimp');
const axios = require('axios');
const { uploadToR2, downloadFromR2, deleteFromR2, getR2PublicUrl } = require('./lib/r2');

// Telegram Bot Token
const TELEGRAM_BOT_TOKEN = '7172018274:AAFeKLs1aU4_TLrF5L5yD_Rl4F1HyY3TGtA';

// Create bot instance
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// MongoDB Connection
const mongoUri = global.mongodblink;

// Attendance Schema (same as WhatsApp bot)
const attendanceSchema = new mongoose.Schema({
    nama: { type: String, required: true },
    harga: { type: Number, required: true },
    tanggal: { type: Date, required: true },
    deskripsi: { type: String, required: true },
    foto_path: { type: String, required: true },
    isInvoiced: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

// Helper: Generate attendance invoice with 4 photos (same as WhatsApp bot)
async function generateAttendanceInvoice(attendances) {
    // Load invoice template
    const templatePath = './images/invoice.png';
    if (!fs.existsSync(templatePath)) {
        // If template doesn't exist, create a blank canvas as fallback
        console.log('Template invoice tidak ditemukan, menggunakan canvas kosong');
        var invoice = new Jimp(800, 1200, 0xFFFFFFFF); // White background
    } else {
        invoice = await Jimp.read(templatePath);
    }
    
    // Color for text: #70370d = rgb(112, 55, 13)
    const textColor = 0x70370D;
    
    // Load default Jimp fonts
    let fontSmall, fontMedium, fontCaption;
    try {
        fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
        fontMedium = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
        fontCaption = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
    } catch (err) {
        try {
            fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
            fontMedium = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
            fontCaption = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
        } catch (err2) {
            fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
            fontMedium = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
            fontCaption = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
        }
    }
    
    // Helper function to print text with custom color
    const printTextWithColor = (img, font, x, y, text, color = textColor) => {
        const r = (color >> 16) & 0xFF;
        const g = (color >> 8) & 0xFF;
        const b = color & 0xFF;
        
        const textWidth = Jimp.measureText(font, text);
        const textHeight = Jimp.measureTextHeight(font, text);
        const padding = 10;
        const tempImg = new Jimp(textWidth + padding * 2, textHeight + padding * 2, 0x00000000);
        
        tempImg.print(font, padding, padding, text);
        
        tempImg.scan(0, 0, tempImg.bitmap.width, tempImg.bitmap.height, function (x, y, idx) {
            const alpha = this.bitmap.data[idx + 3];
            const red = this.bitmap.data[idx];
            const green = this.bitmap.data[idx + 1];
            const blue = this.bitmap.data[idx + 2];
            
            if (alpha > 0 && red < 128 && green < 128 && blue < 128) {
                this.bitmap.data[idx] = r;
                this.bitmap.data[idx + 1] = g;
                this.bitmap.data[idx + 2] = b;
            }
        });
        
        img.composite(tempImg, x - padding, y - padding);
        
        const boldOffset = 1;
        const tempImg2 = new Jimp(textWidth + padding * 2, textHeight + padding * 2, 0x00000000);
        tempImg2.print(font, padding + boldOffset, padding, text);
        tempImg2.scan(0, 0, tempImg2.bitmap.width, tempImg2.bitmap.height, function (x, y, idx) {
            const alpha = this.bitmap.data[idx + 3];
            if (alpha > 0) {
                this.bitmap.data[idx] = r;
                this.bitmap.data[idx + 1] = g;
                this.bitmap.data[idx + 2] = b;
            }
        });
        img.composite(tempImg2, x - padding + boldOffset, y - padding);
    };
    
    // Get student name from first attendance
    const namaMurid = attendances[0].nama;
    const invoiceDate = moment().format('DD/MM/YYYY');
    const totalHarga = attendances.reduce((sum, att) => sum + att.harga, 0);
    
    // Fill in invoice fields
    printTextWithColor(invoice, fontSmall, 260, 468, invoiceDate);
    printTextWithColor(invoice, fontSmall, 310, 515, namaMurid);
    
    // Photo dimensions
    const photoWidth = 320;
    const photoHeight = 320;
    const photoPositions = [
        { x: 210, y: 735 },
        { x: 834, y: 735 },
        { x: 210, y: 1187 },
        { x: 834, y: 1187 }
    ];
    
    const photoCount = Math.min(attendances.length, 4);
    
    // Process photos
    for (let i = 0; i < photoCount; i++) {
        const att = attendances[i];
        const pos = photoPositions[i];
        
        try {
            // Load photo from R2 or local file
            let photoBuffer;
            if (att.foto_path.startsWith('http') || att.foto_path.startsWith('absen/')) {
                // Photo is in R2
                try {
                    const key = att.foto_path.includes('/') && !att.foto_path.startsWith('./')
                        ? att.foto_path.split('/').slice(-2).join('/')
                        : `absen/${att.foto_path.replace('./absen/', '').replace('absen/', '')}`;
                    photoBuffer = await downloadFromR2(key);
                    console.log(`✅ Foto downloaded from R2: ${key}`);
                } catch (r2Error) {
                    console.error('Error downloading from R2, trying local:', r2Error);
                    if (fs.existsSync(att.foto_path)) {
                        photoBuffer = await fs.promises.readFile(att.foto_path);
                    } else {
                        throw new Error(`File not found: ${att.foto_path}`);
                    }
                }
            } else {
                // Photo is local file
                if (!fs.existsSync(att.foto_path)) {
                    throw new Error(`File not found: ${att.foto_path}`);
                }
                photoBuffer = await fs.promises.readFile(att.foto_path);
            }
            
            const photo = await Jimp.read(photoBuffer);
            photo.resize(photoWidth, photoHeight, Jimp.RESIZE_BILINEAR);
            invoice.composite(photo, pos.x, pos.y);
            
            const textY = pos.y + photoHeight + 15;
            const dateStr = moment(att.tanggal).format('DD/MM/YYYY');
            const lineSpacing = 35;
            
            printTextWithColor(invoice, fontSmall, pos.x, textY, `${dateStr}`);
            printTextWithColor(invoice, fontSmall, pos.x, textY + lineSpacing, att.deskripsi.substring(0, 25));
            printTextWithColor(invoice, fontSmall, pos.x, textY + (lineSpacing * 2), `Rp ${att.harga.toLocaleString('id-ID')}`);
        } catch (err) {
            console.error(`Error loading photo ${att.foto_path}:`, err);
            invoice.print(fontSmall, pos.x, pos.y, `Foto tidak ditemukan`);
        }
    }
    
    // Print total price
    printTextWithColor(invoice, fontSmall, 587, 1776, `Rp ${totalHarga.toLocaleString('id-ID')}`, 0xFFFFFF);
    
    return await invoice.getBufferAsync(Jimp.MIME_PNG);
}

// Connect MongoDB
async function connectMongoDB() {
    if (mongoUri) {
        try {
            await mongoose.connect(mongoUri, {});
            console.log(chalk.green('✅ Telegram Bot: Terhubung ke MongoDB!'));
        } catch (err) {
            console.error(chalk.red('❌ Telegram Bot: Gagal terhubung ke MongoDB:', err));
            process.exit(1);
        }
    } else {
        console.error(chalk.red('❌ Telegram Bot: global.mongodblink belum didefinisikan di settings.js.'));
        process.exit(1);
    }
}

// Helper: Create main menu keyboard
function createMainKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '📊 Cek Data Murid', callback_data: 'menu_cekmurid' },
                    { text: '💰 Cek Belum Bayar', callback_data: 'menu_belumbayar' }
                ],
                [
                    { text: '📄 Buat Invoice', callback_data: 'menu_invoice' }
                ],
                [
                    { text: '❓ Help', callback_data: 'menu_help' },
                    { text: '📋 Menu Utama', callback_data: 'menu_main' }
                ]
            ]
        }
    };
}

// Helper: Create student list keyboard (for cekmurid/invoice)
async function createStudentListKeyboard(callbackPrefix) {
    try {
        // Get all distinct student names
        const allStudents = await Attendance.distinct('nama');
        
        if (allStudents.length === 0) {
            return null;
        }
        
        // Create buttons (max 10 students per row, max 10 rows)
        const buttons = [];
        for (let i = 0; i < Math.min(allStudents.length, 50); i += 2) {
            const row = [];
            row.push({ 
                text: allStudents[i], 
                callback_data: `${callbackPrefix}_${allStudents[i].replace(/\s+/g, '_')}` 
            });
            
            if (i + 1 < allStudents.length) {
                row.push({ 
                    text: allStudents[i + 1], 
                    callback_data: `${callbackPrefix}_${allStudents[i + 1].replace(/\s+/g, '_')}` 
                });
            }
            
            buttons.push(row);
        }
        
        // Add back button
        buttons.push([{ text: '🔙 Kembali ke Menu', callback_data: 'menu_main' }]);
        
        return {
            reply_markup: {
                inline_keyboard: buttons
            }
        };
    } catch (err) {
        console.error('Error creating student list keyboard:', err);
        return null;
    }
}

// Bot message handler
bot.on('message', async (msg) => {
    try {
        const chatId = msg.chat.id;
        const messageText = msg.text || '';
        const caption = msg.caption || '';
        
        // Handle photo with caption for attendance
        // Format: absen NamaMurid Harga Tanggal(DD/MM/YYYY) DeskripsiKelas
        if (msg.photo && caption.trim()) {
            const captionLower = caption.trim().toLowerCase();
            
            // Check if caption starts with "absen"
            if (!captionLower.startsWith('absen')) {
                return; // Exit if not attendance trigger
            }
            
            // Parse caption format: absen NamaMurid Harga Tanggal(DD/MM/YYYY) DeskripsiKelas
            const captionWithoutTrigger = caption.trim().replace(/^absen\s+/i, '').trim();
            if (!captionWithoutTrigger) {
                return await bot.sendMessage(chatId, '⚠️ Format caption salah! Setelah *absen* harus diikuti data.\n\nFormat: *absen* NamaMurid Harga Tanggal(DD/MM/YYYY) DeskripsiKelas\nContoh: *absen* Andi 100000 02/11/2025 Kelas Gitar Dasar', { parse_mode: 'Markdown' });
            }
            
            const captionParts = captionWithoutTrigger.split(/\s+/);
            
            if (captionParts.length >= 4) {
                // Extract data
                const nama = captionParts[0];
                const hargaStr = captionParts[1];
                const tanggalStr = captionParts[2];
                const deskripsi = captionParts.slice(3).join(' ');
                
                // Validate and parse harga
                const harga = parseInt(hargaStr.replace(/[^0-9]/g, ''));
                if (isNaN(harga) || harga <= 0) {
                    return await bot.sendMessage(chatId, '⚠️ Format caption salah! Harga harus berupa angka.\n\nFormat: *absen* NamaMurid Harga Tanggal(DD/MM/YYYY) DeskripsiKelas\nContoh: *absen* Andi 100000 02/11/2025 Kelas Gitar Dasar', { parse_mode: 'Markdown' });
                }
                
                // Validate and parse tanggal (DD/MM/YYYY)
                const tanggalMatch = tanggalStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                if (!tanggalMatch) {
                    return await bot.sendMessage(chatId, '⚠️ Format tanggal salah! Gunakan format DD/MM/YYYY.\n\nFormat: *absen* NamaMurid Harga Tanggal(DD/MM/YYYY) DeskripsiKelas\nContoh: *absen* Andi 100000 02/11/2025 Kelas Gitar Dasar', { parse_mode: 'Markdown' });
                }
                
                const [, day, month, year] = tanggalMatch;
                const tanggal = moment(`${year}-${month}-${day}`, 'YYYY-MM-DD');
                if (!tanggal.isValid()) {
                    return await bot.sendMessage(chatId, '⚠️ Tanggal tidak valid!');
                }
                
                // Get the largest photo (last in array is highest quality)
                const photo = msg.photo[msg.photo.length - 1];
                
                // Download photo
                let photoBuffer;
                try {
                    const fileId = photo.file_id;
                    const file = await bot.getFile(fileId);
                    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file.file_path}`;
                    
                    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
                    photoBuffer = Buffer.from(response.data);
                } catch (err) {
                    console.error('Error downloading photo:', err);
                    return await bot.sendMessage(chatId, `⚠️ Gagal mendownload foto: ${err.message}`);
                }
                
                // Get current time for filename
                const jamSekarang = moment().format('HHmmss');
                const fotoFileName = `absen/${nama.toLowerCase().replace(/\s+/g, '_')}_${day}-${month}-${year}_${jamSekarang}.jpg`;
                
                // Try to upload to R2, fallback to local storage
                let fotoPath;
                try {
                    const r2Url = await uploadToR2(photoBuffer, fotoFileName, 'image/jpeg');
                    fotoPath = r2Url;
                    console.log(`✅ Foto uploaded to R2: ${fotoPath}`);
                } catch (r2Error) {
                    console.warn('⚠️ R2 upload failed, saving locally:', r2Error.message);
                    // Fallback to local storage
                    const localPath = `./absen/${fotoFileName.replace('absen/', '')}`;
                    
                    // Ensure absen directory exists
                    const absenDir = path.join(__dirname, 'absen');
                    if (!fs.existsSync(absenDir)) {
                        fs.mkdirSync(absenDir, { recursive: true });
                    }
                    
                    fs.writeFileSync(localPath, photoBuffer);
                    fotoPath = localPath;
                }
                
                // Save to MongoDB
                const attendance = new Attendance({
                    nama: nama,
                    harga: harga,
                    tanggal: tanggal.toDate(),
                    deskripsi: deskripsi,
                    foto_path: fotoPath,
                    createdAt: new Date()
                });
                await attendance.save();
                
                // Format date for reply
                const tanggalFormatted = moment(tanggal).format('DD/MM/YYYY');
                
                // Check if this student now has 4 or more uninvoiced entries
                const uninvoicedAttendances = await Attendance.find({
                    nama: nama,
                    isInvoiced: false
                })
                    .sort({ createdAt: 1 }); // Sort ascending (oldest first)
                
                if (uninvoicedAttendances.length >= 4) {
                    // Generate invoice (use the first 4 uninvoiced entries in chronological order)
                    try {
                        // Get the first 4 uninvoiced entries (oldest to newest)
                        const first4Attendances = uninvoicedAttendances.slice(0, 4);
                        const invoiceBuffer = await generateAttendanceInvoice(first4Attendances);
                        const invoiceFileName = `invoice_${nama.toLowerCase().replace(/\s+/g, '_')}_${moment().format('DD-MM-YYYY')}.png`;
                        const invoicePath = `./invoice/${invoiceFileName}`;
                        
                        // Ensure invoice directory exists
                        const invoiceDir = path.join(__dirname, 'invoice');
                        if (!fs.existsSync(invoiceDir)) {
                            fs.mkdirSync(invoiceDir, { recursive: true });
                        }
                        
                        // Save to local storage
                        fs.writeFileSync(invoicePath, invoiceBuffer);
                        
                        // Mark these 4 attendances as invoiced
                        const attendanceIds = first4Attendances.map(att => att._id);
                        await Attendance.updateMany(
                            { _id: { $in: attendanceIds } },
                            { $set: { isInvoiced: true } }
                        );
                        
                        // Send invoice to user (from buffer, before deleting local file)
                        await bot.sendPhoto(chatId, invoiceBuffer, {
                            caption: `📄 Invoice untuk ${nama} telah dibuat secara otomatis.`
                        });
                        
                        // Try to upload to R2
                        try {
                            const r2InvoicePath = `invoice/${invoiceFileName}`;
                            const r2Url = await uploadToR2(invoiceBuffer, r2InvoicePath, 'image/png');
                            console.log(`✅ Invoice uploaded to R2: ${r2Url}`);
                            
                            // Delete local file after successful R2 upload
                            try {
                                if (fs.existsSync(invoicePath)) {
                                    fs.unlinkSync(invoicePath);
                                    console.log(`✅ Local invoice file deleted: ${invoiceFileName}`);
                                }
                            } catch (deleteErr) {
                                console.warn('⚠️ Failed to delete local invoice file:', deleteErr.message);
                            }
                        } catch (r2Error) {
                            console.warn('⚠️ R2 upload failed for invoice, keeping local only:', r2Error.message);
                        }
                    } catch (invoiceErr) {
                        console.error('Error generating invoice:', invoiceErr);
                        await bot.sendMessage(chatId, `✅ Data untuk ${nama} pada ${tanggalFormatted} telah disimpan.\n\n🆔 ID: *${attendance._id.toString()}*\n\n⚠️ Gagal membuat invoice: ${invoiceErr.message}\n\n💡 Gunakan command /invoice ${nama} untuk membuat invoice manual.`, { parse_mode: 'Markdown' });
                    }
                } else {
                    // Send confirmation with ID
                    await bot.sendMessage(chatId, `✅ Data untuk ${nama} pada ${tanggalFormatted} telah disimpan.\n\n🆔 ID: *${attendance._id.toString()}*\n\n💡 Gunakan command /invoice ${nama} untuk membuat invoice.`, { parse_mode: 'Markdown' });
                }
            } else {
                return await bot.sendMessage(chatId, '⚠️ Format caption salah!\n\nFormat: *absen* NamaMurid Harga Tanggal(DD/MM/YYYY) DeskripsiKelas\nContoh: *absen* Andi 100000 02/11/2025 Kelas Gitar Dasar', { parse_mode: 'Markdown' });
            }
        }
        
        // Handle invoice command
        // Format: /invoice NamaMurid
        if (messageText.trim().toLowerCase().startsWith('/invoice')) {
            const args = messageText.trim().split(/\s+/);
            if (args.length < 2) {
                return await bot.sendMessage(chatId, '⚠️ Format command salah!\n\nFormat: /invoice NamaMurid\nContoh: /invoice Budi', { parse_mode: 'Markdown' });
            }
            
            const nama = args.slice(1).join(' ');
            
            // Find all attendances for this student that haven't been invoiced yet
            const allStudentAttendances = await Attendance.find({
                nama: { $regex: new RegExp(`^${nama}$`, 'i') },
                isInvoiced: false
            })
                .sort({ createdAt: 1 }); // Sort ascending (oldest first)
            
            if (allStudentAttendances.length === 0) {
                return await bot.sendMessage(chatId, `⚠️ Tidak ditemukan data absen yang belum masuk invoice untuk *${nama}*.\n\nSemua absen sudah masuk invoice sebelumnya.`, { parse_mode: 'Markdown' });
            }
            
            // Get the actual name from database (preserve original case)
            const actualNama = allStudentAttendances[0].nama;
            const totalHarga = allStudentAttendances.reduce((sum, att) => sum + att.harga, 0);
            const jumlahAbsen = allStudentAttendances.length;
            
            // Generate invoice
            try {
                const invoiceBuffer = await generateAttendanceInvoice(allStudentAttendances);
                const invoiceFileName = `invoice_${actualNama.toLowerCase().replace(/\s+/g, '_')}_${moment().format('DD-MM-YYYY')}.png`;
                const invoicePath = `./invoice/${invoiceFileName}`;
                
                // Ensure invoice directory exists
                const invoiceDir = path.join(__dirname, 'invoice');
                if (!fs.existsSync(invoiceDir)) {
                    fs.mkdirSync(invoiceDir, { recursive: true });
                }
                
                // Save to local storage
                fs.writeFileSync(invoicePath, invoiceBuffer);
                
                // Try to upload to R2
                try {
                    const r2InvoicePath = `invoice/${invoiceFileName}`;
                    const r2Url = await uploadToR2(invoiceBuffer, r2InvoicePath, 'image/png');
                    console.log(`✅ Invoice uploaded to R2: ${r2Url}`);
                } catch (r2Error) {
                    console.warn('⚠️ R2 upload failed for invoice, keeping local only:', r2Error.message);
                }
                
                // Mark all used attendances as invoiced
                const attendanceIds = allStudentAttendances.map(att => att._id);
                await Attendance.updateMany(
                    { _id: { $in: attendanceIds } },
                    { $set: { isInvoiced: true } }
                );
                
                // Send invoice
                await bot.sendPhoto(chatId, invoiceBuffer, {
                    caption: `📄 Invoice untuk *${actualNama}* (${jumlahAbsen} absen)\n\nTotal: Rp ${totalHarga.toLocaleString('id-ID')}`,
                    parse_mode: 'Markdown'
                });
            } catch (invoiceErr) {
                console.error('Error generating invoice:', invoiceErr);
                return await bot.sendMessage(chatId, `⚠️ Gagal membuat invoice untuk *${actualNama}*: ${invoiceErr.message}`, { parse_mode: 'Markdown' });
            }
        }
        
        // Handle belumbayar command
        // Format: /belumbayar atau /belumbyr atau /blmbyr
        if (messageText.trim().toLowerCase() === '/belumbayar' || 
            messageText.trim().toLowerCase() === '/belumbyr' || 
            messageText.trim().toLowerCase() === '/blmbyr') {
            try {
                // Hitung 5 minggu yang lalu (35 hari)
                const limaMingguLalu = moment().subtract(5, 'weeks').toDate();
                
                // Ambil semua murid yang memiliki absen dengan isInvoiced: false
                const semuaMurid = await Attendance.distinct('nama', { isInvoiced: false });
                
                if (semuaMurid.length === 0) {
                    return await bot.sendMessage(chatId, '✅ Tidak ada murid dengan absen yang belum terinvoice.');
                }
                
                // Array untuk menyimpan murid yang memenuhi kriteria
                const muridBelumBayar = [];
                
                // Periksa setiap murid
                for (const namaMurid of semuaMurid) {
                    // Ambil semua absen yang belum terinvoice untuk murid ini
                    const absenBelumInvoice = await Attendance.find({
                        nama: namaMurid,
                        isInvoiced: false
                    }).sort({ tanggal: -1 }); // Sort dari yang terbaru
                    
                    // Kriteria: kurang dari 4 pertemuan (1, 2, atau 3)
                    if (absenBelumInvoice.length >= 1 && absenBelumInvoice.length < 4) {
                        // Cari tanggal absen terakhir
                        const absenTerakhir = absenBelumInvoice[0]; // Yang pertama adalah yang terbaru
                        const tanggalAbsenTerakhir = moment(absenTerakhir.tanggal);
                        
                        // Cek apakah absen terakhir lebih dari 5 minggu yang lalu
                        if (tanggalAbsenTerakhir.isBefore(limaMingguLalu)) {
                            // Hitung total harga yang belum dibayar
                            const totalBelumBayar = absenBelumInvoice.reduce((sum, att) => sum + att.harga, 0);
                            
                            // Hitung berapa hari sudah tidak absen
                            const hariTidakAbsen = moment().diff(tanggalAbsenTerakhir, 'days');
                            
                            muridBelumBayar.push({
                                nama: namaMurid,
                                jumlahPertemuan: absenBelumInvoice.length,
                                tanggalAbsenTerakhir: absenTerakhir.tanggal,
                                totalBelumBayar: totalBelumBayar,
                                hariTidakAbsen: hariTidakAbsen
                            });
                        }
                    }
                }
                
                // Tampilkan hasil
                if (muridBelumBayar.length === 0) {
                    return await bot.sendMessage(chatId, '✅ Tidak ada murid yang memenuhi kriteria:\n\n• Kurang dari 4 pertemuan (1/2/3)\n• Tidak absen selama 5 minggu terakhir\n• Invoice belum terbit', { parse_mode: 'Markdown' });
                }
                
                // Sort berdasarkan hari tidak absen (terlama dulu)
                muridBelumBayar.sort((a, b) => b.hariTidakAbsen - a.hariTidakAbsen);
                
                // Buat pesan
                let message = `💰 *DAFTAR MURID BELUM BAYAR* 💰\n\n`;
                message += `📋 Kriteria:\n`;
                message += `• Kurang dari 4 pertemuan (1/2/3 pertemuan)\n`;
                message += `• Tidak absen selama 5+ minggu\n`;
                message += `• Invoice belum terbit\n\n`;
                message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
                
                muridBelumBayar.forEach((murid, index) => {
                    const tanggalStr = moment(murid.tanggalAbsenTerakhir).format('DD/MM/YYYY');
                    const mingguTidakAbsen = Math.floor(murid.hariTidakAbsen / 7);
                    const sisaHari = murid.hariTidakAbsen % 7;
                    
                    message += `${index + 1}. *${murid.nama}*\n`;
                    message += `   📝 Pertemuan: ${murid.jumlahPertemuan}x\n`;
                    message += `   📅 Absen terakhir: ${tanggalStr}\n`;
                    message += `   ⏰ Tidak absen: ${mingguTidakAbsen} minggu ${sisaHari > 0 ? `${sisaHari} hari` : ''} (${murid.hariTidakAbsen} hari)\n`;
                    message += `   💰 Total belum bayar: Rp ${murid.totalBelumBayar.toLocaleString('id-ID')}\n\n`;
                });
                
                message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
                message += `💡 *Tindakan:*\n`;
                message += `Gunakan command /invoice [NamaMurid] untuk membuat invoice manual setelah menghubungi murid.\n\n`;
                message += `📞 Silakan hubungi murid-murid di atas untuk mengingatkan pembayaran.`;
                
                await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            } catch (err) {
                console.error('Error processing belumbayar command:', err);
                return await bot.sendMessage(chatId, `⚠️ Terjadi kesalahan: ${err.message}`, { parse_mode: 'Markdown' });
            }
        }
        
        // Handle hapusabsen command
        // Format: /hapusabsen ID atau /deleteabsen atau /delabsen
        if (messageText.trim().toLowerCase().startsWith('/hapusabsen') || 
            messageText.trim().toLowerCase().startsWith('/deleteabsen') || 
            messageText.trim().toLowerCase().startsWith('/delabsen')) {
            try {
                const args = messageText.trim().split(/\s+/);
                if (args.length < 2) {
                    return await bot.sendMessage(chatId, '⚠️ Format command salah!\n\nFormat: /hapusabsen ID\nContoh: /hapusabsen 507f1f77bcf86cd799439011', { parse_mode: 'Markdown' });
                }
                
                const attendanceId = args.slice(1).join(' ');
                
                // Find attendance by ID
                const attendance = await Attendance.findById(attendanceId);
                
                if (!attendance) {
                    return await bot.sendMessage(chatId, `⚠️ Data absensi dengan ID *${attendanceId}* tidak ditemukan.`, { parse_mode: 'Markdown' });
                }
                
                // Get info before delete
                const namaSiswa = attendance.nama;
                const tanggalFormatted = moment(attendance.tanggal).format('DD/MM/YYYY');
                const harga = attendance.harga;
                const deskripsi = attendance.deskripsi;
                const fotoPath = attendance.foto_path;
                
                // Delete attendance from database
                await Attendance.findByIdAndDelete(attendanceId);
                
                // Delete photo from R2 or local file
                if (fotoPath.startsWith('http') || fotoPath.startsWith('absen/')) {
                    // Photo is in R2
                    try {
                        await deleteFromR2(fotoPath);
                    } catch (err) {
                        console.error('Error deleting from R2:', err);
                    }
                } else if (fs.existsSync(fotoPath)) {
                    // Photo is local file
                    try {
                        fs.unlinkSync(fotoPath);
                    } catch (err) {
                        console.error('Error deleting photo file:', err);
                    }
                }
                
                await bot.sendMessage(chatId, `✅ Data absensi berhasil dihapus!\n\n📋 Detail Data yang Dihapus:\n• Nama: *${namaSiswa}*\n• Tanggal: ${tanggalFormatted}\n• Kelas: ${deskripsi}\n• Harga: Rp ${harga.toLocaleString('id-ID')}\n• ID: ${attendanceId}`, { parse_mode: 'Markdown' });
            } catch (err) {
                console.error('Error processing hapusabsen command:', err);
                return await bot.sendMessage(chatId, `⚠️ Terjadi kesalahan: ${err.message}`, { parse_mode: 'Markdown' });
            }
        }
        
        // Handle cekmurid command
        // Format: /cekmurid NamaMurid atau /ceksiswa atau /cekabsen
        if (messageText.trim().toLowerCase().startsWith('/cekmurid') || 
            messageText.trim().toLowerCase().startsWith('/ceksiswa') || 
            messageText.trim().toLowerCase().startsWith('/cekabsen')) {
            try {
                const args = messageText.trim().split(/\s+/);
                if (args.length < 2) {
                    return await bot.sendMessage(chatId, '⚠️ Format command salah!\n\nFormat: /cekmurid NamaMurid\nContoh: /cekmurid Budi', { parse_mode: 'Markdown' });
                }
                
                const nama = args.slice(1).join(' ');
                
                // Find all attendances for this student (case-insensitive search)
                const allAttendances = await Attendance.find({ 
                    nama: { $regex: new RegExp(`^${nama}$`, 'i') }
                }).sort({ createdAt: 1 }); // Sort ascending (oldest first)
                
                if (allAttendances.length === 0) {
                    return await bot.sendMessage(chatId, `⚠️ Tidak ditemukan data absen untuk *${nama}*.\n\nPastikan nama murid sudah benar.`, { parse_mode: 'Markdown' });
                }
                
                const actualNama = allAttendances[0].nama;
                
                // Separate invoiced and uninvoiced
                const invoicedAttendances = allAttendances.filter(att => att.isInvoiced === true);
                const uninvoicedAttendances = allAttendances.filter(att => att.isInvoiced === false);
                
                // Calculate totals
                const totalSemua = allAttendances.reduce((sum, att) => sum + att.harga, 0);
                const totalSudahInvoice = invoicedAttendances.reduce((sum, att) => sum + att.harga, 0);
                const totalBelumInvoice = uninvoicedAttendances.reduce((sum, att) => sum + att.harga, 0);
                
                // Build detail message
                let detailMessage = `📊 *Data Absensi: ${actualNama}*\n\n`;
                detailMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
                detailMessage += `📝 *Ringkasan:*\n`;
                detailMessage += `• Total Absen: ${allAttendances.length}\n`;
                detailMessage += `• Sudah Invoice: ${invoicedAttendances.length}\n`;
                detailMessage += `• Belum Invoice: ${uninvoicedAttendances.length}\n`;
                detailMessage += `\n💰 *Total Harga:*\n`;
                detailMessage += `• Semua: Rp ${totalSemua.toLocaleString('id-ID')}\n`;
                detailMessage += `• Sudah Invoice: Rp ${totalSudahInvoice.toLocaleString('id-ID')}\n`;
                detailMessage += `• Belum Invoice: Rp ${totalBelumInvoice.toLocaleString('id-ID')}\n`;
                
                if (uninvoicedAttendances.length > 0) {
                    detailMessage += `\n━━━━━━━━━━━━━━━━━━━━\n`;
                    detailMessage += `📋 *Absen Belum Invoice:*\n`;
                    uninvoicedAttendances.forEach((att, index) => {
                        const dateStr = moment(att.tanggal).format('DD/MM/YYYY');
                        detailMessage += `\n${index + 1}. ${dateStr}\n`;
                        detailMessage += `   • Kelas: ${att.deskripsi}\n`;
                        detailMessage += `   • Harga: Rp ${att.harga.toLocaleString('id-ID')}\n`;
                    });
                }
                
                if (invoicedAttendances.length > 0) {
                    detailMessage += `\n━━━━━━━━━━━━━━━━━━━━\n`;
                    detailMessage += `✅ *Absen Sudah Invoice:*\n`;
                    invoicedAttendances.forEach((att, index) => {
                        const dateStr = moment(att.tanggal).format('DD/MM/YYYY');
                        detailMessage += `\n${index + 1}. ${dateStr}\n`;
                        detailMessage += `   • Kelas: ${att.deskripsi}\n`;
                        detailMessage += `   • Harga: Rp ${att.harga.toLocaleString('id-ID')}\n`;
                    });
                }
                
                await bot.sendMessage(chatId, detailMessage, { parse_mode: 'Markdown' });
            } catch (err) {
                console.error('Error processing cekmurid command:', err);
                return await bot.sendMessage(chatId, `⚠️ Terjadi kesalahan: ${err.message}`, { parse_mode: 'Markdown' });
            }
        }
        
        // Handle help/start command
        if (messageText.trim().toLowerCase() === '/start' || messageText.trim().toLowerCase() === '/help') {
            const welcomeText = `🤖 *Bot Absensi Telegram*\n\n` +
                `Selamat datang! Gunakan button di bawah untuk navigasi atau ketik command langsung.\n\n` +
                `*Cara Menggunakan:*\n` +
                `1. Klik button di bawah untuk akses cepat\n` +
                `2. Atau ketik command seperti: /invoice Budi\n` +
                `3. Untuk absensi: kirim foto dengan caption \`absen NamaSiswa Harga Tanggal Deskripsi\`\n\n` +
                `*Fitur Utama:*\n` +
                `✅ Pencatatan Absensi via Foto\n` +
                `✅ Generate Invoice Otomatis\n` +
                `✅ Cek Data Murid\n` +
                `✅ Cek Murid Belum Bayar\n` +
                `✅ Hapus Data Absensi`;
            
            return await bot.sendMessage(chatId, welcomeText, { 
                parse_mode: 'Markdown',
                ...createMainKeyboard()
            });
        }
    } catch (err) {
        console.error('Error processing message:', err);
        try {
            await bot.sendMessage(msg.chat.id, `⚠️ Terjadi kesalahan: ${err.message}`);
        } catch (sendErr) {
            console.error('Error sending error message:', sendErr);
        }
    }
});

// Handle callback queries (button clicks)
bot.on('callback_query', async (callbackQuery) => {
    try {
        const message = callbackQuery.message;
        const chatId = message.chat.id;
        const data = callbackQuery.data;
        const userId = callbackQuery.from.id;
        
        // Answer callback to remove loading state
        await bot.answerCallbackQuery(callbackQuery.id);
        
        // Handle menu callbacks
        if (data === 'menu_main') {
            const welcomeText = `🤖 *Bot Absensi Telegram*\n\n` +
                `Selamat datang! Gunakan button di bawah untuk navigasi atau ketik command langsung.\n\n` +
                `*Cara Menggunakan:*\n` +
                `1. Klik button di bawah untuk akses cepat\n` +
                `2. Atau ketik command seperti: /invoice Budi\n` +
                `3. Untuk absensi: kirim foto dengan caption \`absen NamaSiswa Harga Tanggal Deskripsi\`\n\n` +
                `*Fitur Utama:*\n` +
                `✅ Pencatatan Absensi via Foto\n` +
                `✅ Generate Invoice Otomatis\n` +
                `✅ Cek Data Murid\n` +
                `✅ Cek Murid Belum Bayar\n` +
                `✅ Hapus Data Absensi`;
            
            await bot.editMessageText(welcomeText, {
                chat_id: chatId,
                message_id: message.message_id,
                parse_mode: 'Markdown',
                ...createMainKeyboard()
            });
            return;
        }
        
        if (data === 'menu_help') {
            const helpText = `📖 *Panduan Lengkap Bot Absensi*\n\n` +
                `*1. Pencatatan Absensi via Foto*\n` +
                `   Format: \`absen NamaSiswa Harga Tanggal(DD/MM/YYYY) Deskripsi\`\n` +
                `   Contoh: \`absen Budi 150000 10/11/2025 Kelas Piano Dasar\`\n\n` +
                `*2. Generate Invoice Manual*\n` +
                `   Command: /invoice NamaSiswa\n` +
                `   Atau klik button "Buat Invoice"\n\n` +
                `*3. Auto-Generate Invoice*\n` +
                `   Otomatis generate setelah 4 absen belum di-invoice\n\n` +
                `*4. Cek Data Murid*\n` +
                `   Command: /cekmurid NamaSiswa\n` +
                `   Atau klik button "Cek Data Murid"\n\n` +
                `*5. Cek Murid Belum Bayar*\n` +
                `   Command: /belumbayar\n` +
                `   Atau klik button "Cek Belum Bayar"\n\n` +
                `*6. Hapus Data Absensi*\n` +
                `   Command: /hapusabsen ID\n\n` +
                `*Catatan:*\n` +
                `- Format tanggal: DD/MM/YYYY\n` +
                `- Invoice otomatis dibuat setelah 4 absen belum di-invoice`;
            
            await bot.editMessageText(helpText, {
                chat_id: chatId,
                message_id: message.message_id,
                parse_mode: 'Markdown',
                ...createMainKeyboard()
            });
            return;
        }
        
        if (data === 'menu_cekmurid') {
            const keyboard = await createStudentListKeyboard('cekmurid');
            
            if (!keyboard) {
                await bot.editMessageText('⚠️ Tidak ada data murid yang ditemukan.', {
                    chat_id: chatId,
                    message_id: message.message_id,
                    ...createMainKeyboard()
                });
                return;
            }
            
            await bot.editMessageText('📊 *Pilih Murid untuk Dicek:*\n\nKlik nama murid di bawah:', {
                chat_id: chatId,
                message_id: message.message_id,
                parse_mode: 'Markdown',
                ...keyboard
            });
            return;
        }
        
        if (data === 'menu_invoice') {
            const keyboard = await createStudentListKeyboard('invoice');
            
            if (!keyboard) {
                await bot.editMessageText('⚠️ Tidak ada data murid yang ditemukan.', {
                    chat_id: chatId,
                    message_id: message.message_id,
                    ...createMainKeyboard()
                });
                return;
            }
            
            await bot.editMessageText('📄 *Pilih Murid untuk Buat Invoice:*\n\nKlik nama murid di bawah:', {
                chat_id: chatId,
                message_id: message.message_id,
                parse_mode: 'Markdown',
                ...keyboard
            });
            return;
        }
        
        if (data === 'menu_belumbayar') {
            // Hitung 5 minggu yang lalu (35 hari)
            const limaMingguLalu = moment().subtract(5, 'weeks').toDate();
            
            // Ambil semua murid yang memiliki absen dengan isInvoiced: false
            const semuaMurid = await Attendance.distinct('nama', { isInvoiced: false });
            
            if (semuaMurid.length === 0) {
                await bot.editMessageText('✅ Tidak ada murid dengan absen yang belum terinvoice.', {
                    chat_id: chatId,
                    message_id: message.message_id,
                    ...createMainKeyboard()
                });
                return;
            }
            
            // Array untuk menyimpan murid yang memenuhi kriteria
            const muridBelumBayar = [];
            
            // Periksa setiap murid
            for (const namaMurid of semuaMurid) {
                // Ambil semua absen yang belum terinvoice untuk murid ini
                const absenBelumInvoice = await Attendance.find({
                    nama: namaMurid,
                    isInvoiced: false
                }).sort({ tanggal: -1 });
                
                // Kriteria: kurang dari 4 pertemuan (1, 2, atau 3)
                if (absenBelumInvoice.length >= 1 && absenBelumInvoice.length < 4) {
                    // Cari tanggal absen terakhir
                    const absenTerakhir = absenBelumInvoice[0];
                    const tanggalAbsenTerakhir = moment(absenTerakhir.tanggal);
                    
                    // Cek apakah absen terakhir lebih dari 5 minggu yang lalu
                    if (tanggalAbsenTerakhir.isBefore(limaMingguLalu)) {
                        const totalBelumBayar = absenBelumInvoice.reduce((sum, att) => sum + att.harga, 0);
                        const hariTidakAbsen = moment().diff(tanggalAbsenTerakhir, 'days');
                        
                        muridBelumBayar.push({
                            nama: namaMurid,
                            jumlahPertemuan: absenBelumInvoice.length,
                            tanggalAbsenTerakhir: absenTerakhir.tanggal,
                            totalBelumBayar: totalBelumBayar,
                            hariTidakAbsen: hariTidakAbsen
                        });
                    }
                }
            }
            
            if (muridBelumBayar.length === 0) {
                await bot.editMessageText('✅ Tidak ada murid yang memenuhi kriteria:\n\n• Kurang dari 4 pertemuan (1/2/3)\n• Tidak absen selama 5 minggu terakhir\n• Invoice belum terbit', {
                    chat_id: chatId,
                    message_id: message.message_id,
                    parse_mode: 'Markdown',
                    ...createMainKeyboard()
                });
                return;
            }
            
            // Sort berdasarkan hari tidak absen (terlama dulu)
            muridBelumBayar.sort((a, b) => b.hariTidakAbsen - a.hariTidakAbsen);
            
            // Buat pesan
            let messageText = `💰 *DAFTAR MURID BELUM BAYAR* 💰\n\n`;
            messageText += `📋 Kriteria:\n`;
            messageText += `• Kurang dari 4 pertemuan (1/2/3 pertemuan)\n`;
            messageText += `• Tidak absen selama 5+ minggu\n`;
            messageText += `• Invoice belum terbit\n\n`;
            messageText += `━━━━━━━━━━━━━━━━━━━━\n\n`;
            
            muridBelumBayar.forEach((murid, index) => {
                const tanggalStr = moment(murid.tanggalAbsenTerakhir).format('DD/MM/YYYY');
                const mingguTidakAbsen = Math.floor(murid.hariTidakAbsen / 7);
                const sisaHari = murid.hariTidakAbsen % 7;
                
                messageText += `${index + 1}. *${murid.nama}*\n`;
                messageText += `   📝 Pertemuan: ${murid.jumlahPertemuan}x\n`;
                messageText += `   📅 Absen terakhir: ${tanggalStr}\n`;
                messageText += `   ⏰ Tidak absen: ${mingguTidakAbsen} minggu ${sisaHari > 0 ? `${sisaHari} hari` : ''} (${murid.hariTidakAbsen} hari)\n`;
                messageText += `   💰 Total belum bayar: Rp ${murid.totalBelumBayar.toLocaleString('id-ID')}\n\n`;
            });
            
            messageText += `━━━━━━━━━━━━━━━━━━━━\n\n`;
            messageText += `💡 *Tindakan:*\n`;
            messageText += `Gunakan command /invoice [NamaMurid] untuk membuat invoice manual setelah menghubungi murid.\n\n`;
            messageText += `📞 Silakan hubungi murid-murid di atas untuk mengingatkan pembayaran.`;
            
            await bot.editMessageText(messageText, {
                chat_id: chatId,
                message_id: message.message_id,
                parse_mode: 'Markdown',
                ...createMainKeyboard()
            });
            return;
        }
        
        // Handle cekmurid callback (cekmurid_nama)
        if (data.startsWith('cekmurid_')) {
            const nama = data.replace('cekmurid_', '').replace(/_/g, ' ');
            
            // Find all attendances for this student
            const allAttendances = await Attendance.find({ 
                nama: { $regex: new RegExp(`^${nama}$`, 'i') }
            }).sort({ createdAt: 1 });
            
            if (allAttendances.length === 0) {
                await bot.answerCallbackQuery(callbackQuery.id, { 
                    text: `Tidak ditemukan data untuk ${nama}`,
                    show_alert: true 
                });
                return;
            }
            
            const actualNama = allAttendances[0].nama;
            const invoicedAttendances = allAttendances.filter(att => att.isInvoiced === true);
            const uninvoicedAttendances = allAttendances.filter(att => att.isInvoiced === false);
            
            const totalSemua = allAttendances.reduce((sum, att) => sum + att.harga, 0);
            const totalSudahInvoice = invoicedAttendances.reduce((sum, att) => sum + att.harga, 0);
            const totalBelumInvoice = uninvoicedAttendances.reduce((sum, att) => sum + att.harga, 0);
            
            let detailMessage = `📊 *Data Absensi: ${actualNama}*\n\n`;
            detailMessage += `━━━━━━━━━━━━━━━━━━━━\n`;
            detailMessage += `📝 *Ringkasan:*\n`;
            detailMessage += `• Total Absen: ${allAttendances.length}\n`;
            detailMessage += `• Sudah Invoice: ${invoicedAttendances.length}\n`;
            detailMessage += `• Belum Invoice: ${uninvoicedAttendances.length}\n`;
            detailMessage += `\n💰 *Total Harga:*\n`;
            detailMessage += `• Semua: Rp ${totalSemua.toLocaleString('id-ID')}\n`;
            detailMessage += `• Sudah Invoice: Rp ${totalSudahInvoice.toLocaleString('id-ID')}\n`;
            detailMessage += `• Belum Invoice: Rp ${totalBelumInvoice.toLocaleString('id-ID')}\n`;
            
            if (uninvoicedAttendances.length > 0) {
                detailMessage += `\n━━━━━━━━━━━━━━━━━━━━\n`;
                detailMessage += `📋 *Absen Belum Invoice:*\n`;
                uninvoicedAttendances.forEach((att, index) => {
                    const dateStr = moment(att.tanggal).format('DD/MM/YYYY');
                    detailMessage += `\n${index + 1}. ${dateStr}\n`;
                    detailMessage += `   • Kelas: ${att.deskripsi}\n`;
                    detailMessage += `   • Harga: Rp ${att.harga.toLocaleString('id-ID')}\n`;
                });
            }
            
            if (invoicedAttendances.length > 0) {
                detailMessage += `\n━━━━━━━━━━━━━━━━━━━━\n`;
                detailMessage += `✅ *Absen Sudah Invoice:*\n`;
                invoicedAttendances.forEach((att, index) => {
                    const dateStr = moment(att.tanggal).format('DD/MM/YYYY');
                    detailMessage += `\n${index + 1}. ${dateStr}\n`;
                    detailMessage += `   • Kelas: ${att.deskripsi}\n`;
                    detailMessage += `   • Harga: Rp ${att.harga.toLocaleString('id-ID')}\n`;
                });
            }
            
            // Send as new message instead of editing (to avoid message too long)
            await bot.sendMessage(chatId, detailMessage, { 
                parse_mode: 'Markdown',
                ...createMainKeyboard()
            });
            return;
        }
        
        // Handle invoice callback (invoice_nama)
        if (data.startsWith('invoice_')) {
            const nama = data.replace('invoice_', '').replace(/_/g, ' ');
            
            // Find all attendances for this student that haven't been invoiced yet
            const allStudentAttendances = await Attendance.find({
                nama: { $regex: new RegExp(`^${nama}$`, 'i') },
                isInvoiced: false
            })
                .sort({ createdAt: 1 });
            
            if (allStudentAttendances.length === 0) {
                await bot.answerCallbackQuery(callbackQuery.id, { 
                    text: `Tidak ada absen belum invoice untuk ${nama}`,
                    show_alert: true 
                });
                return;
            }
            
            const actualNama = allStudentAttendances[0].nama;
            const totalHarga = allStudentAttendances.reduce((sum, att) => sum + att.harga, 0);
            const jumlahAbsen = allStudentAttendances.length;
            
            // Generate invoice
            try {
                const invoiceBuffer = await generateAttendanceInvoice(allStudentAttendances);
                const invoiceFileName = `invoice_${actualNama.toLowerCase().replace(/\s+/g, '_')}_${moment().format('DD-MM-YYYY')}.png`;
                const invoicePath = `./invoice/${invoiceFileName}`;
                
                // Ensure invoice directory exists
                const invoiceDir = path.join(__dirname, 'invoice');
                if (!fs.existsSync(invoiceDir)) {
                    fs.mkdirSync(invoiceDir, { recursive: true });
                }
                
                // Save to local storage
                fs.writeFileSync(invoicePath, invoiceBuffer);
                
                // Try to upload to R2
                try {
                    const r2InvoicePath = `invoice/${invoiceFileName}`;
                    const r2Url = await uploadToR2(invoiceBuffer, r2InvoicePath, 'image/png');
                    console.log(`✅ Invoice uploaded to R2: ${r2Url}`);
                } catch (r2Error) {
                    console.warn('⚠️ R2 upload failed for invoice, keeping local only:', r2Error.message);
                }
                
                // Mark all used attendances as invoiced
                const attendanceIds = allStudentAttendances.map(att => att._id);
                await Attendance.updateMany(
                    { _id: { $in: attendanceIds } },
                    { $set: { isInvoiced: true } }
                );
                
                // Send invoice
                await bot.sendPhoto(chatId, invoiceBuffer, {
                    caption: `📄 Invoice untuk *${actualNama}* (${jumlahAbsen} absen)\n\nTotal: Rp ${totalHarga.toLocaleString('id-ID')}`,
                    parse_mode: 'Markdown',
                    ...createMainKeyboard()
                });
            } catch (invoiceErr) {
                console.error('Error generating invoice:', invoiceErr);
                await bot.answerCallbackQuery(callbackQuery.id, { 
                    text: `Gagal membuat invoice: ${invoiceErr.message}`,
                    show_alert: true 
                });
            }
            return;
        }
        
    } catch (err) {
        console.error('Error processing callback query:', err);
        try {
            await bot.answerCallbackQuery(callbackQuery.id, { 
                text: `Terjadi kesalahan: ${err.message}`,
                show_alert: true 
            });
        } catch (answerErr) {
            console.error('Error answering callback query:', answerErr);
        }
    }
});

// Bot error handler
bot.on('polling_error', (error) => {
    console.error(chalk.red('❌ Telegram Bot polling error:'), error);
});

// Connect MongoDB and start bot
connectMongoDB().then(() => {
    console.log(chalk.green('✅ Telegram Bot berhasil dimulai!'));
    console.log(chalk.cyan('Bot siap menerima pesan...'));
}).catch(err => {
    console.error(chalk.red('❌ Gagal memulai Telegram Bot:', err));
    process.exit(1);
});

// Export bot for testing
module.exports = bot;

