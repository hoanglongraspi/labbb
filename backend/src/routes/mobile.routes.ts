import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/rbac.middleware';
import {
  uploadTestResult,
  getTestResults,
  getTestResultById,
  downloadTestFile,
  deleteTestResult,
  getPatientTestResults,
  getPresignedUploadUrls,
  confirmUpload,
  getUnassignedTests,
  assignTestToPatient
} from '../controllers/mobile.controller';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Allow video, CSV, and JSON files
    const allowedMimes = [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'text/csv',
      'application/json'
    ];

    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed. Only video, CSV, and JSON files are accepted.`));
    }
  }
});

// Define file upload fields
const testUploadFields = upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'csv', maxCount: 1 },
  { name: 'questions', maxCount: 1 }
]);

/**
 * Mobile App Routes
 *
 * These endpoints are designed for the Flutter mobile app
 * to upload and manage test results
 */

// Upload test result with files (OLD METHOD - kept for backward compatibility)
router.post(
  '/test-results',
  authenticate,
  testUploadFields,
  uploadTestResult
);

// Request presigned URLs for direct S3 upload (NEW METHOD - recommended)
router.post(
  '/test-results/presigned-upload',
  authenticate,
  getPresignedUploadUrls
);

// Confirm upload and create database record (NEW METHOD)
router.post(
  '/test-results/confirm-upload',
  authenticate,
  confirmUpload
);

// Get current patient's test results
router.get(
  '/test-results',
  authenticate,
  getTestResults
);

// Get unassigned test results (Admin only) - MUST be before /:id route
router.get(
  '/test-results/unassigned',
  authenticate,
  isAdmin,
  getUnassignedTests
);

// Get test result by ID
router.get(
  '/test-results/:id',
  authenticate,
  getTestResultById
);

// Download test result file
router.get(
  '/test-results/:id/download/:fileType',
  authenticate,
  downloadTestFile
);

// Assign test result to patient (Admin only) - MUST be before DELETE /:id route
router.post(
  '/test-results/:id/assign',
  authenticate,
  isAdmin,
  assignTestToPatient
);

// Delete test result
router.delete(
  '/test-results/:id',
  authenticate,
  deleteTestResult
);

// Get test results for specific patient (Admin only)
router.get(
  '/patients/:patientId/test-results',
  authenticate,
  isAdmin,
  getPatientTestResults
);

export default router;
