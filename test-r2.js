require('./settings');
const { uploadToR2, downloadFromR2, deleteFromR2, getR2PublicUrl } = require('./lib/r2');
const fs = require('fs');

async function testR2Connection() {
    console.log('🔍 Testing R2 Connection...\n');
    
    // Check environment variables
    const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
    const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
    const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
    const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
    const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
    
    console.log('📋 Configuration Check:');
    console.log(`   R2_ACCOUNT_ID: ${R2_ACCOUNT_ID ? '✅ Set' : '❌ Not set'}`);
    console.log(`   R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID ? '✅ Set' : '❌ Not set'}`);
    console.log(`   R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log(`   R2_BUCKET_NAME: ${R2_BUCKET_NAME ? `✅ Set (${R2_BUCKET_NAME})` : '❌ Not set'}`);
    console.log(`   R2_PUBLIC_URL: ${R2_PUBLIC_URL ? `✅ Set (${R2_PUBLIC_URL})` : '⚠️ Not set (optional)'}`);
    console.log('');
    
    // Check if all required vars are set
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
        console.log('❌ R2 credentials tidak lengkap!');
        console.log('   Silakan set environment variables:');
        console.log('   - R2_ACCOUNT_ID');
        console.log('   - R2_ACCESS_KEY_ID');
        console.log('   - R2_SECRET_ACCESS_KEY');
        console.log('   - R2_BUCKET_NAME');
        console.log('\n   Lihat R2_SETUP.md untuk panduan lengkap.\n');
        return;
    }
    
    try {
        console.log('🧪 Testing Upload...');
        
        // Create test file
        const testFileName = `absen/test_${Date.now()}.txt`;
        const testContent = Buffer.from(`R2 Connection Test\nTimestamp: ${new Date().toISOString()}\n`);
        
        // Upload test
        const uploadedPath = await uploadToR2(testContent, testFileName, 'text/plain');
        console.log(`   ✅ Upload berhasil!`);
        console.log(`   📁 File path: ${uploadedPath}`);
        console.log('');
        
        // Test download
        console.log('🧪 Testing Download...');
        const downloadedContent = await downloadFromR2(testFileName);
        console.log(`   ✅ Download berhasil!`);
        console.log(`   📦 Content: ${downloadedContent.toString()}`);
        console.log('');
        
        // Test public URL
        console.log('🧪 Testing Public URL...');
        const publicUrl = getR2PublicUrl(uploadedPath);
        console.log(`   📎 Public URL: ${publicUrl}`);
        console.log('');
        
        // Test delete
        console.log('🧪 Testing Delete...');
        await deleteFromR2(testFileName);
        console.log(`   ✅ Delete berhasil!`);
        console.log('');
        
        // Verify deletion
        console.log('🧪 Verifying Deletion...');
        try {
            await downloadFromR2(testFileName);
            console.log('   ⚠️ File masih ada (mungkin perlu beberapa detik untuk propagasi)');
        } catch (err) {
            console.log('   ✅ File berhasil dihapus (tidak bisa di-download lagi)');
        }
        console.log('');
        
        console.log('✅ Semua test berhasil! R2 sudah terkonfigurasi dengan benar.\n');
        
    } catch (error) {
        console.error('\n❌ Test gagal!');
        console.error('   Error:', error.message);
        console.error('\n   Kemungkinan penyebab:');
        console.error('   1. Bucket name salah atau tidak ada');
        console.error('   2. Access Key ID atau Secret Access Key salah');
        console.error('   3. Permission API token tidak cukup (harus Object Read & Write)');
        console.error('   4. Account ID salah');
        console.error('   5. Network/connection issue');
        console.error('\n   Cek kembali konfigurasi Anda.\n');
        process.exit(1);
    }
}

// Run test
testR2Connection().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});

