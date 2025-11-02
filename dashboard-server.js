require('./settings')
const express = require('express');
const mongoose = require('mongoose');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const Jimp = require('jimp');
const axios = require('axios');
const { downloadFromR2, deleteFromR2, getR2PublicUrl } = require('./lib/r2');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3001;

// MongoDB Connection
const mongoUri = global.mongodblink;

// Attendance Schema
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

// Generate Invoice Function (same as in arap.js)
async function generateAttendanceInvoice(attendances) {
    const templatePath = './images/invoice.png';
    if (!fs.existsSync(templatePath)) {
        console.log('Template invoice tidak ditemukan, menggunakan canvas kosong');
        var invoice = new Jimp(800, 1200, 0xFFFFFFFF);
    } else {
        invoice = await Jimp.read(templatePath);
    }
    
    const textColor = 0x70370D;
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
    
    const namaMurid = attendances[0].nama;
    const invoiceDate = moment().format('DD/MM/YYYY');
    const totalHarga = attendances.reduce((sum, att) => sum + att.harga, 0);
    
    printTextWithColor(invoice, fontSmall, 260, 468, invoiceDate);
    printTextWithColor(invoice, fontSmall, 310, 515, namaMurid);
    
    const photoWidth = 320;
    const photoHeight = 320;
    const photoPositions = [
        { x: 210, y: 735 },
        { x: 834, y: 735 },
        { x: 210, y: 1187 },
        { x: 834, y: 1187 }
    ];
    
    const photoCount = Math.min(attendances.length, 4);
    
    for (let i = 0; i < photoCount; i++) {
        const att = attendances[i];
        const pos = photoPositions[i];
        
        try {
            // Load photo from R2, CDN URL, or local file
            let photoBuffer;
            if (att.foto_path.startsWith('http://') || att.foto_path.startsWith('https://')) {
                // Photo is on CDN/public URL, download via HTTP
                try {
                    const response = await axios.get(att.foto_path, { responseType: 'arraybuffer' });
                    photoBuffer = Buffer.from(response.data);
                    console.log(`✅ Foto downloaded from CDN: ${att.foto_path}`);
                } catch (httpError) {
                    console.error('Error downloading from CDN:', httpError);
                    throw new Error(`Failed to download from CDN: ${att.foto_path}`);
                }
            } else if (att.foto_path.startsWith('absen/')) {
                // Photo is in R2
                try {
                    const key = att.foto_path.includes('/') && !att.foto_path.startsWith('./')
                        ? att.foto_path.split('/').slice(-2).join('/') // Keep 'absen/filename.jpg'
                        : `absen/${att.foto_path.replace('./absen/', '').replace('absen/', '')}`;
                    photoBuffer = await downloadFromR2(key);
                    console.log(`✅ Foto downloaded from R2: ${key}`);
                } catch (r2Error) {
                    console.error('Error downloading from R2, trying local:', r2Error);
                    // Fallback to local file
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
    
    // Print total price at exact position (above "Total Payment" text - moved down by 40px)
    printTextWithColor(invoice, fontSmall, 587, 1776, `Rp ${totalHarga.toLocaleString('id-ID')}`, 0xFFFFFF);
    
    return await invoice.getBufferAsync(Jimp.MIME_PNG);
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dashboard', 'public')));

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Serve static files (images)
app.use('/absen', express.static(path.join(__dirname, 'absen')));
app.use('/invoice', express.static(path.join(__dirname, 'invoice')));

// Proxy endpoint for CDN images (to bypass CORS)
app.get('/api/image/:imagePath(*)', async (req, res) => {
    try {
        const { imagePath } = req.params;
        const imageUrl = `https://cdn-absen.nicola.id/${imagePath}`;
        
        try {
            const response = await axios.get(imageUrl, { 
                responseType: 'arraybuffer',
                timeout: 10000
            });
            
            const contentType = response.headers['content-type'] || 'image/jpeg';
            const buffer = Buffer.from(response.data);
            
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache 1 year
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(buffer);
        } catch (error) {
            console.error(`Error proxying image ${imageUrl}:`, error.message);
            res.status(404).json({
                success: false,
                message: 'Image not found or failed to load'
            });
        }
    } catch (error) {
        console.error('Error in image proxy:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// API Routes

// Get all attendances with pagination
app.get('/api/attendances', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        
        const namaFilter = req.query.nama || '';
        const dateFrom = req.query.dateFrom || '';
        const dateTo = req.query.dateTo || '';
        
        let query = {};
        
        if (namaFilter) {
            query.nama = { $regex: namaFilter, $options: 'i' };
        }
        
        if (dateFrom || dateTo) {
            query.tanggal = {};
            if (dateFrom) {
                query.tanggal.$gte = new Date(dateFrom);
            }
            if (dateTo) {
                query.tanggal.$lte = new Date(dateTo);
            }
        }
        
        const attendances = await Attendance.find(query)
            .sort({ tanggal: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        
        const total = await Attendance.countDocuments(query);
        
        // Convert to base64 for images or use public URL
        const attendancesWithImages = await Promise.all(attendances.map(async (att) => {
            const result = { ...att };
            
            // Check if photo is in R2 or local
            if (att.foto_path.startsWith('http') || att.foto_path.startsWith('https')) {
                // Photo has public URL, use proxy endpoint to bypass CORS
                // Extract path from URL for proxy
                let proxyUrl;
                if (att.foto_path.includes('cdn-absen.nicola.id/')) {
                    // Use proxy endpoint for CDN URLs to bypass CORS
                    const imagePath = att.foto_path.replace('https://cdn-absen.nicola.id/', '');
                    proxyUrl = `/api/image/${imagePath}`;
                    result.foto_base64 = proxyUrl;
                    console.log(`✅ Using proxy URL for ${att.nama}: ${proxyUrl}`);
                } else {
                    // Other URLs, use directly (might work if CORS is configured)
                    result.foto_base64 = att.foto_path;
                    console.log(`✅ Using CDN URL for ${att.nama}: ${att.foto_path}`);
                }
            } else if (att.foto_path.startsWith('absen/')) {
                // Photo is in R2, get public URL or download
                try {
                    const publicUrl = getR2PublicUrl(att.foto_path);
                    if (publicUrl.startsWith('http')) {
                        // Public URL available
                        result.foto_base64 = publicUrl;
                    } else {
                        // No public URL, download and convert to base64
                        const imageBuffer = await downloadFromR2(att.foto_path);
                        const base64Image = imageBuffer.toString('base64');
                        result.foto_base64 = `data:image/jpeg;base64,${base64Image}`;
                    }
                } catch (err) {
                    console.error(`Error reading R2 image ${att.foto_path}:`, err);
                    result.foto_base64 = null;
                }
            } else if (fs.existsSync(att.foto_path)) {
                // Photo is local file
                try {
                    const imageBuffer = fs.readFileSync(att.foto_path);
                    const base64Image = imageBuffer.toString('base64');
                    result.foto_base64 = `data:image/jpeg;base64,${base64Image}`;
                } catch (err) {
                    console.error(`Error reading image ${att.foto_path}:`, err);
                    result.foto_base64 = null;
                }
            } else {
                result.foto_base64 = null;
            }
            
            return result;
        }));
        
        res.json({
            success: true,
            data: attendancesWithImages,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching attendances:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get statistics
app.get('/api/statistics', async (req, res) => {
    try {
        const totalAttendances = await Attendance.countDocuments();
        const totalStudents = await Attendance.distinct('nama');
        const totalRevenue = await Attendance.aggregate([
            { $group: { _id: null, total: { $sum: '$harga' } } }
        ]);
        
        const invoicedCount = await Attendance.countDocuments({ isInvoiced: true });
        const uninvoicedCount = await Attendance.countDocuments({ isInvoiced: false });
        
        // Revenue by month (last 6 months)
        const sixMonthsAgo = moment().subtract(6, 'months').startOf('month').toDate();
        const revenueByMonth = await Attendance.aggregate([
            { $match: { tanggal: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$tanggal' },
                        month: { $month: '$tanggal' }
                    },
                    total: { $sum: '$harga' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);
        
        // Top students by attendance count
        const topStudents = await Attendance.aggregate([
            {
                $group: {
                    _id: '$nama',
                    count: { $sum: 1 },
                    totalHarga: { $sum: '$harga' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        
        res.json({
            success: true,
            data: {
                totalAttendances,
                totalStudents: totalStudents.length,
                totalRevenue: totalRevenue[0]?.total || 0,
                invoicedCount,
                uninvoicedCount,
                revenueByMonth: revenueByMonth.map(item => ({
                    month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
                    total: item.total,
                    count: item.count
                })),
                topStudents: topStudents.map(item => ({
                    nama: item._id,
                    count: item.count,
                    totalHarga: item.totalHarga
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get students list
app.get('/api/students', async (req, res) => {
    try {
        const students = await Attendance.aggregate([
            {
                $group: {
                    _id: '$nama',
                    totalAttendances: { $sum: 1 },
                    totalHarga: { $sum: '$harga' },
                    invoicedCount: {
                        $sum: { $cond: [{ $eq: ['$isInvoiced', true] }, 1, 0] }
                    },
                    uninvoicedCount: {
                        $sum: { $cond: [{ $eq: ['$isInvoiced', false] }, 1, 0] }
                    },
                    lastAttendance: { $max: '$tanggal' },
                    firstAttendance: { $min: '$tanggal' }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        res.json({
            success: true,
            data: students.map(s => ({
                nama: s._id,
                totalAttendances: s.totalAttendances,
                totalHarga: s.totalHarga,
                invoicedCount: s.invoicedCount,
                uninvoicedCount: s.uninvoicedCount,
                lastAttendance: s.lastAttendance,
                firstAttendance: s.firstAttendance
            }))
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get attendances by student name
app.get('/api/attendances/student/:nama', async (req, res) => {
    try {
        const { nama } = req.params;
        const attendances = await Attendance.find({ 
            nama: { $regex: nama, $options: 'i' }
        })
        .sort({ tanggal: -1 })
        .lean();
        
        const attendancesWithImages = await Promise.all(attendances.map(async (att) => {
            const result = { ...att };
            
            // Check if photo is in R2 or local
            if (att.foto_path.startsWith('http') || att.foto_path.startsWith('https')) {
                // Photo has public URL, use proxy endpoint to bypass CORS
                // Extract path from URL for proxy
                let proxyUrl;
                if (att.foto_path.includes('cdn-absen.nicola.id/')) {
                    // Use proxy endpoint for CDN URLs to bypass CORS
                    const imagePath = att.foto_path.replace('https://cdn-absen.nicola.id/', '');
                    proxyUrl = `/api/image/${imagePath}`;
                    result.foto_base64 = proxyUrl;
                    console.log(`✅ Using proxy URL for ${att.nama}: ${proxyUrl}`);
                } else {
                    // Other URLs, use directly (might work if CORS is configured)
                    result.foto_base64 = att.foto_path;
                    console.log(`✅ Using CDN URL for ${att.nama}: ${att.foto_path}`);
                }
            } else if (att.foto_path.startsWith('absen/')) {
                // Photo is in R2, get public URL or download
                try {
                    const publicUrl = getR2PublicUrl(att.foto_path);
                    if (publicUrl.startsWith('http')) {
                        // Public URL available
                        result.foto_base64 = publicUrl;
                    } else {
                        // No public URL, download and convert to base64
                        const imageBuffer = await downloadFromR2(att.foto_path);
                        const base64Image = imageBuffer.toString('base64');
                        result.foto_base64 = `data:image/jpeg;base64,${base64Image}`;
                    }
                } catch (err) {
                    console.error(`Error reading R2 image ${att.foto_path}:`, err);
                    result.foto_base64 = null;
                }
            } else if (fs.existsSync(att.foto_path)) {
                // Photo is local file
                try {
                    const imageBuffer = fs.readFileSync(att.foto_path);
                    const base64Image = imageBuffer.toString('base64');
                    result.foto_base64 = `data:image/jpeg;base64,${base64Image}`;
                } catch (err) {
                    result.foto_base64 = null;
                }
            } else {
                result.foto_base64 = null;
            }
            
            return result;
        }));
        
        res.json({
            success: true,
            data: attendancesWithImages
        });
    } catch (error) {
        console.error('Error fetching student attendances:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Generate Invoice Endpoint
app.post('/api/invoice/generate', async (req, res) => {
    try {
        const { nama, attendanceIds } = req.body;
        
        if (!nama && !attendanceIds) {
            return res.status(400).json({
                success: false,
                message: 'Nama siswa atau attendanceIds harus disediakan'
            });
        }
        
        let attendances;
        if (attendanceIds && Array.isArray(attendanceIds)) {
            // Generate invoice from specific attendance IDs
            attendances = await Attendance.find({
                _id: { $in: attendanceIds }
            }).sort({ tanggal: 1 }).lean();
        } else {
            // Generate invoice from all uninvoiced attendances for student
            attendances = await Attendance.find({
                nama: { $regex: new RegExp(`^${nama}$`, 'i') },
                isInvoiced: false
            }).sort({ tanggal: 1 }).lean();
        }
        
        if (attendances.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tidak ada data absensi yang ditemukan'
            });
        }
        
        // Generate invoice buffer
        const invoiceBuffer = await generateAttendanceInvoice(attendances);
        const invoiceFileName = `invoice_${attendances[0].nama.toLowerCase().replace(/\s+/g, '_')}_${moment().format('DD-MM-YYYY')}.png`;
        const invoicePath = path.join(__dirname, 'invoice', invoiceFileName);
        
        // Ensure invoice directory exists
        const invoiceDir = path.join(__dirname, 'invoice');
        if (!fs.existsSync(invoiceDir)) {
            fs.mkdirSync(invoiceDir, { recursive: true });
        }
        
        // Save invoice file
        fs.writeFileSync(invoicePath, invoiceBuffer);
        
        // Mark attendances as invoiced
        const attendanceIdsToUpdate = attendances.map(att => att._id);
        await Attendance.updateMany(
            { _id: { $in: attendanceIdsToUpdate } },
            { $set: { isInvoiced: true } }
        );
        
        // Convert to base64 for response
        const base64Invoice = invoiceBuffer.toString('base64');
        
        res.json({
            success: true,
            message: 'Invoice berhasil dibuat',
            data: {
                invoiceBase64: `data:image/png;base64,${base64Invoice}`,
                fileName: invoiceFileName,
                invoicePath: `/invoice/${invoiceFileName}`,
                attendanceCount: attendances.length,
                totalHarga: attendances.reduce((sum, att) => sum + att.harga, 0),
                nama: attendances[0].nama
            }
        });
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get invoice by filename
app.get('/api/invoice/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const invoicePath = path.join(__dirname, 'invoice', filename);
        
        if (!fs.existsSync(invoicePath)) {
            return res.status(404).json({
                success: false,
                message: 'Invoice tidak ditemukan'
            });
        }
        
        const invoiceBuffer = fs.readFileSync(invoicePath);
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.send(invoiceBuffer);
    } catch (error) {
        console.error('Error fetching invoice:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Delete attendance by ID
app.delete('/api/attendances/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const attendance = await Attendance.findById(id);
        
        if (!attendance) {
            return res.status(404).json({
                success: false,
                message: 'Data absensi tidak ditemukan'
            });
        }
        
        // Get info before delete
        const namaSiswa = attendance.nama;
        const tanggalFormatted = moment(attendance.tanggal).format('DD/MM/YYYY');
        const fotoPath = attendance.foto_path;
        
        // Delete from database
        await Attendance.findByIdAndDelete(id);
        
        // Delete photo from R2 or local file
        if (fotoPath.startsWith('http') || fotoPath.startsWith('https') || fotoPath.startsWith('absen/')) {
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
        
        res.json({
            success: true,
            message: 'Data absensi berhasil dihapus',
            data: {
                deletedId: id,
                nama: namaSiswa,
                tanggal: tanggalFormatted
            }
        });
    } catch (error) {
        console.error('Error deleting attendance:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Export data to JSON/CSV
app.get('/api/export/attendances', async (req, res) => {
    try {
        const format = req.query.format || 'json';
        const attendances = await Attendance.find({}).sort({ tanggal: -1 }).lean();
        
        if (format === 'csv') {
            // Convert to CSV
            const headers = ['Nama', 'Tanggal', 'Deskripsi', 'Harga', 'Invoice', 'Created At'];
            const rows = attendances.map(att => [
                att.nama,
                moment(att.tanggal).format('DD/MM/YYYY'),
                att.deskripsi,
                att.harga,
                att.isInvoiced ? 'Sudah' : 'Belum',
                moment(att.createdAt).format('DD/MM/YYYY HH:mm:ss')
            ]);
            
            const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="attendances_${moment().format('DD-MM-YYYY')}.csv"`);
            res.send(csv);
        } else {
            // JSON format
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="attendances_${moment().format('DD-MM-YYYY')}.json"`);
            res.json({
                success: true,
                data: attendances,
                exportedAt: new Date()
            });
        }
    } catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Serve dashboard HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard', 'public', 'index.html'));
});

// Connect MongoDB and start server
async function startServer() {
    try {
        if (mongoUri) {
            await mongoose.connect(mongoUri, {});
            console.log(chalk.green('✅ Dashboard: Terhubung ke MongoDB!'));
        } else {
            console.error(chalk.red('❌ Dashboard: global.mongodblink belum didefinisikan di settings.js.'));
            process.exit(1);
        }
        
        app.listen(PORT, () => {
            console.log(chalk.green(`✅ Dashboard server berjalan di http://localhost:${PORT}`));
        });
    } catch (err) {
        console.error(chalk.red('❌ Dashboard: Gagal memulai server:', err));
        process.exit(1);
    }
}

startServer();

module.exports = app;

