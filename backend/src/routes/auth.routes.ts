import { Router } from 'express';
import { register, login, logout, refresh, getMe, activateAccount, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { registerValidation, loginValidation, activationValidation, forgotPasswordValidation, resetPasswordValidation } from '../utils/validation';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public routes
router.post('/register', registerValidation, validate, register);
router.post('/activate', activationValidation, validate, activateAccount);
router.post('/login', authLimiter, loginValidation, validate, login);
router.post('/refresh', refresh);
router.post('/forgot-password', authLimiter, forgotPasswordValidation, validate, forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordValidation, validate, resetPassword);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;
