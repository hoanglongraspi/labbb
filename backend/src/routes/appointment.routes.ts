import { Router } from 'express';
import {
  getMyAppointments,
  getAppointmentById,
  getAllAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment
} from '../controllers/appointment.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

// Patient routes
router.get('/me', authenticate, getMyAppointments);
router.get('/me/:id', authenticate, getAppointmentById);

// Admin routes
router.get('/', authenticate, authorizeRoles('ADMIN'), getAllAppointments);
router.post('/', authenticate, authorizeRoles('ADMIN'), createAppointment);
router.put('/:id', authenticate, authorizeRoles('ADMIN'), updateAppointment);
router.delete('/:id', authenticate, authorizeRoles('ADMIN'), deleteAppointment);

export default router;
