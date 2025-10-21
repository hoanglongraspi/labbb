import { Router } from 'express';
import {
  createEvaluation,
  getEvaluationsByPatient,
  getEvaluation,
  updateEvaluation,
  deleteEvaluation
} from '../controllers/evaluation.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import { evaluationCreateValidation, evaluationUpdateValidation } from '../utils/validation';
import { validate } from '../middleware/validate';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Evaluation management (admin only)
router.post('/patient/:patientId', authorizeRoles('ADMIN'), evaluationCreateValidation, validate, createEvaluation);
router.get('/patient/:patientId', getEvaluationsByPatient);
router.get('/:id', getEvaluation);
router.put('/:id', authorizeRoles('ADMIN'), evaluationUpdateValidation, validate, updateEvaluation);
router.delete('/:id', authorizeRoles('ADMIN'), deleteEvaluation);

export default router;
