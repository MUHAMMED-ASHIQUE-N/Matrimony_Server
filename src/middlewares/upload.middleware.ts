import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

// Store file in memory (RAM) temporarily
const storage = multer.memoryStorage();

// Type-safe file filter validation: Only accept images
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit: 5MB per file
  },
});