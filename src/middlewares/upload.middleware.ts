import multer from 'multer';

// Store file in memory (RAM) temporarily
const storage = multer.memoryStorage();

// Validation: Only accept images
const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit: 5MB per file
  },
});