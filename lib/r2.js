const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// R2 Configuration - Set via environment variables
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || ''; // Optional: Custom domain or public URL

// Create S3 client for R2
const s3Client = new S3Client({
    region: 'auto',
    endpoint: R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

/**
 * Upload file to R2
 * @param {Buffer} fileBuffer - File buffer to upload
 * @param {string} fileName - File name/path in bucket
 * @param {string} contentType - MIME type (default: 'image/jpeg')
 * @returns {Promise<string>} - Public URL or key
 */
async function uploadToR2(fileBuffer, fileName, contentType = 'image/jpeg') {
    try {
        if (!R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
            throw new Error('R2 credentials not configured. Set R2_BUCKET_NAME, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables.');
        }

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: fileName,
            Body: fileBuffer,
            ContentType: contentType,
        });

        await s3Client.send(command);

        // Return public URL if configured, otherwise return key
        if (R2_PUBLIC_URL) {
            return `${R2_PUBLIC_URL}/${fileName}`;
        }
        
        // Return key for later retrieval
        return fileName;
    } catch (error) {
        console.error('Error uploading to R2:', error);
        throw error;
    }
}

/**
 * Download file from R2
 * @param {string} fileName - File name/path in bucket
 * @returns {Promise<Buffer>} - File buffer
 */
async function downloadFromR2(fileName) {
    try {
        if (!R2_BUCKET_NAME) {
            throw new Error('R2_BUCKET_NAME not configured');
        }

        // Normalize key
        let key;
        if (fileName.startsWith('http')) {
            // Extract key from URL
            const urlParts = fileName.split('/');
            const bucketIndex = urlParts.findIndex(part => part === R2_BUCKET_NAME);
            if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
                key = urlParts.slice(bucketIndex + 1).join('/');
            } else {
                // Fallback: use last part with prefix
                key = `absen/${urlParts[urlParts.length - 1]}`;
            }
        } else if (fileName.startsWith('absen/')) {
            // Already in correct format
            key = fileName;
        } else if (fileName.startsWith('./absen/')) {
            // Local path format
            key = fileName.replace('./absen/', 'absen/');
        } else {
            // Just filename, add prefix
            key = `absen/${fileName.replace('./absen/', '').replace('absen/', '')}`;
        }

        const command = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
        });

        const response = await s3Client.send(command);
        
        // Convert stream to buffer
        const chunks = [];
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
        
        return Buffer.concat(chunks);
    } catch (error) {
        console.error('Error downloading from R2:', error);
        throw error;
    }
}

/**
 * Delete file from R2
 * @param {string} fileName - File name/path in bucket
 * @returns {Promise<void>}
 */
async function deleteFromR2(fileName) {
    try {
        if (!R2_BUCKET_NAME) {
            console.warn('R2_BUCKET_NAME not configured, skipping delete');
            return;
        }

        // Extract key from URL or path
        let key;
        if (fileName.startsWith('http')) {
            // Full URL, extract key (last part after /)
            const urlParts = fileName.split('/');
            // Try to find 'absen' in path, or use last part
            const absenIndex = urlParts.findIndex(part => part === 'absen');
            if (absenIndex !== -1 && absenIndex < urlParts.length - 1) {
                key = urlParts.slice(absenIndex).join('/');
            } else {
                // Fallback: use last part with prefix
                const lastPart = urlParts[urlParts.length - 1];
                key = `absen/${lastPart}`;
            }
        } else if (fileName.startsWith('absen/')) {
            // Already in correct format
            key = fileName;
        } else if (fileName.startsWith('./absen/')) {
            // Local path format
            key = fileName.replace('./absen/', 'absen/');
        } else {
            // Just filename, add prefix
            key = `absen/${fileName.replace('./absen/', '').replace('absen/', '')}`;
        }

        const command = new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
        });

        await s3Client.send(command);
        console.log(`✅ File deleted from R2: ${key}`);
    } catch (error) {
        console.error('Error deleting from R2:', error);
        // Don't throw - allow fallback to local file deletion
    }
}

/**
 * Get public URL for a file
 * @param {string} fileName - File name/path in bucket
 * @returns {string} - Public URL or key
 */
function getR2PublicUrl(fileName) {
    // Normalize key
    let key;
    if (fileName.startsWith('http')) {
        // Already a URL, return as is
        return fileName;
    } else if (fileName.startsWith('absen/')) {
        // Already in correct format
        key = fileName;
    } else if (fileName.startsWith('./absen/')) {
        // Local path format
        key = fileName.replace('./absen/', 'absen/');
    } else {
        // Just filename, add prefix
        key = `absen/${fileName.replace('./absen/', '').replace('absen/', '')}`;
    }
    
    if (R2_PUBLIC_URL) {
        // Return full public URL
        return `${R2_PUBLIC_URL}/${key}`;
    }
    
    // Return key if no public URL configured
    return key;
}

module.exports = {
    uploadToR2,
    downloadFromR2,
    deleteFromR2,
    getR2PublicUrl,
};

