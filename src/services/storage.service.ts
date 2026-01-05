import cloudinary from '../config/cloudinary';
import streamifier from 'streamifier';

export class StorageService {
  
  /**
   * Uploads a single file buffer to Cloudinary
   * Returns the Secure URL
   */
  static async uploadImage(buffer: Buffer, folder: string = 'matrimony-profiles'): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) return reject(error);
          if (result) resolve(result.secure_url);
        }
      );

      // Pipe the buffer to the upload stream
      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  }

  /**
   * Handles multiple files
   */
  static async uploadMultipleImages(files: Express.Multer.File[]): Promise<string[]> {
    const uploadPromises = files.map(file => this.uploadImage(file.buffer));
    return Promise.all(uploadPromises);
  }
}