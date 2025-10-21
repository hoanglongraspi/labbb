import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  getPreferences,
  updatePreferences
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import {
  updateProfileValidation,
  changePasswordValidation,
  userPreferencesValidation
} from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/profile', getProfile);
router.put('/profile', updateProfileValidation, validate, updateProfile);
router.put('/profile/password', changePasswordValidation, validate, changePassword);
router.get('/preferences', getPreferences);
router.put('/preferences', userPreferencesValidation, validate, updatePreferences);

export default router;
