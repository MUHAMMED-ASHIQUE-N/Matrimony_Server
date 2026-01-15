import cloudinary from '../config/cloudinary';
import streamifier from 'streamifier';

/**
 * Cloudinary Upload Service
 * 
 * @description Handles file uploads to Cloudinary cloud storage.
 * Uses streams for memory-efficient uploads without temp files.
 */

export interface UploadResult {
    url: string;
    publicId: string;
    width: number;
    height: number;
}

/**
 * Upload a single image buffer to Cloudinary
 * 
 * @param buffer - Image file buffer from multer
 * @param folder - Cloudinary folder name
 * @returns Promise with upload result containing URL
 */
export const uploadToCloudinary = (
    buffer: Buffer,
    folder: string = 'matrimony/profiles'
): Promise<UploadResult> => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'image',
                transformation: [
                    { width: 800, height: 800, crop: 'limit' }, // Max dimensions
                    { quality: 'auto:good' }, // Auto optimize quality
                    { fetch_format: 'auto' } // Auto format (webp, etc.)
                ]
            },
            (error, result) => {
                if (error) {
                    console.error('[Cloudinary] Upload error:', error);
                    reject(error);
                } else if (result) {
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                        width: result.width,
                        height: result.height
                    });
                } else {
                    reject(new Error('Upload failed with no result'));
                }
            }
        );

        // Pipe the buffer to Cloudinary
        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
};

/**
 * Upload multiple images to Cloudinary
 * 
 * @param files - Array of Express.Multer.File objects
 * @param folder - Cloudinary folder name
 * @returns Promise with array of URLs
 */
export const uploadMultipleToCloudinary = async (
    files: Express.Multer.File[],
    folder: string = 'matrimony/profiles'
): Promise<string[]> => {
    const uploadPromises = files.map(file => uploadToCloudinary(file.buffer, folder));
    const results = await Promise.all(uploadPromises);
    return results.map(r => r.url);
};

/**
 * Delete an image from Cloudinary by public ID
 * 
 * @param publicId - Cloudinary public ID
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error('[Cloudinary] Delete error:', error);
        throw error;
    }
};

/**
 * Extract public ID from Cloudinary URL
 * 
 * @param url - Full Cloudinary URL
 * @returns Public ID or null
 */
export const extractPublicId = (url: string): string | null => {
    try {
        // URL format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{folder}/{public_id}.{ext}
        const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
};
