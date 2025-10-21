import multer from 'multer';
import { ApiError } from './errorHandler';

// Configure multer for memory storage (we'll upload to S3 directly)
const storage = multer.memoryStorage();

// File filter for audiograms (images and PDFs)
const audiogramFileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Invalid file type. Only JPEG, PNG, and PDF files are allowed'));
  }
};

// Configure upload for audiograms
export const uploadAudiogram = multer({
  storage,
  fileFilter: audiogramFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});

// File filter for education content (PDFs only)
const educationFileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Invalid file type. Only PDF files are allowed for educational content'));
  }
};

// Configure upload for education PDFs
export const uploadEducationPDF = multer({
  storage,
  fileFilter: educationFileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB max file size for PDFs
  }
});

// Generic file upload
export const uploadFile = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});
