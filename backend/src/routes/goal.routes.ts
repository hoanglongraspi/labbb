import { Router } from 'express';
import {
  getMyGoals,
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal,
  getSuggestedGoals,
  getPatientGoals
} from '../controllers/goal.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

// Patient routes
router.get('/me', authenticate, getMyGoals);
router.get('/me/suggestions', authenticate, getSuggestedGoals);
router.get('/me/:id', authenticate, getGoalById);
router.post('/', authenticate, createGoal);
router.put('/:id', authenticate, updateGoal);
router.delete('/:id', authenticate, deleteGoal);

// Admin routes
router.get('/patient/:patientId', authenticate, authorizeRoles('ADMIN'), getPatientGoals);

export default router;
