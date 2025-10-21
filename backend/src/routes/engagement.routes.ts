import { Router } from 'express';
import {
  getUserEngagement,
  getLeaderboard,
  getAllAchievements,
  seedAchievements
} from '../controllers/engagement.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

// User routes
router.get('/me', authenticate, getUserEngagement);
router.get('/achievements', authenticate, getAllAchievements);
router.get('/leaderboard', authenticate, getLeaderboard);

// Admin routes
router.post('/achievements/seed', authenticate, authorizeRoles('ADMIN'), seedAchievements);

export default router;
