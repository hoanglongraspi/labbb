import { Router } from 'express';
import {
  uploadAudiogram,
  getAudiogramsByPatient,
  getAudiogram,
  downloadAudiogram,
  deleteAudiogram,
  generateAudiogramSummary,
  updateAudiogramSummary
} from '../controllers/audiogram.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import { uploadAudiogram as uploadMiddleware } from '../middleware/upload';
import { validate } from '../middleware/validate';
import {
  audiogramSummaryGenerateValidation,
  audiogramSummaryUpdateValidation
} from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Audiogram management
router.post('/patient/:patientId', authorizeRoles('ADMIN'), uploadMiddleware.single('file'), uploadAudiogram);
router.get('/patient/:patientId', getAudiogramsByPatient);
router.get('/:id', getAudiogram);
router.get('/:id/download', downloadAudiogram);
router.post(
  '/:id/summary/generate',
  authorizeRoles('ADMIN'),
  audiogramSummaryGenerateValidation,
  validate,
  generateAudiogramSummary
);
router.put(
  '/:id/summary',
  authorizeRoles('ADMIN'),
  audiogramSummaryUpdateValidation,
  validate,
  updateAudiogramSummary
);
router.delete('/:id', authorizeRoles('ADMIN'), deleteAudiogram);

export default router;
