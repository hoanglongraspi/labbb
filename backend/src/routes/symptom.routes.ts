import { Router } from 'express';
import {
  getMySymptomEntries,
  getSymptomEntryById,
  createSymptomEntry,
  updateSymptomEntry,
  deleteSymptomEntry,
  getSymptomTrends,
  getPatientSymptomEntries
} from '../controllers/symptom.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

// Patient routes
router.get('/me', authenticate, getMySymptomEntries);
router.get('/me/trends', authenticate, getSymptomTrends);
router.get('/me/:id', authenticate, getSymptomEntryById);
router.post('/', authenticate, createSymptomEntry);
router.put('/:id', authenticate, updateSymptomEntry);
router.delete('/:id', authenticate, deleteSymptomEntry);

// Admin routes
router.get('/patient/:patientId', authenticate, authorizeRoles('ADMIN'), getPatientSymptomEntries);

export default router;
