import { Router } from 'express';
import {
  createPatient,
  getPatients,
  getPatient,
  updatePatient,
  deletePatient,
  getMyPatientInfo,
  getPatientTrends,
  createActivationCodeForPatient
} from '../controllers/patient.controller';
import { authenticate, authorizeRoles, authorizePatientAccess } from '../middleware/auth.middleware';
import { activationCodeRequestValidation } from '../utils/validation';
import { validate } from '../middleware/validate';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Patient's own info
router.get('/me', getMyPatientInfo);
router.get('/me/trends', getPatientTrends);

// Admin-only routes
router.post('/', authorizeRoles('ADMIN'), createPatient);
router.get('/', authorizeRoles('ADMIN'), getPatients);
router.post(
  '/:id/activation-code',
  authorizeRoles('ADMIN'),
  activationCodeRequestValidation,
  validate,
  createActivationCodeForPatient
);

// Routes with patient access control
router.get('/:id', authorizePatientAccess, getPatient);
router.put('/:id', authorizeRoles('ADMIN'), updatePatient);
router.delete('/:id', authorizeRoles('ADMIN'), deletePatient);

export default router;
