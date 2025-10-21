import { Router } from 'express';
import {
  getMyMessages,
  getMessageById,
  getMessageThread,
  sendMessage,
  getUnreadCount,
  markAsRead,
  deleteMessage,
  getCareTeam
} from '../controllers/message.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All authenticated users
router.get('/me', authenticate, getMyMessages);
router.get('/me/unread-count', authenticate, getUnreadCount);
router.get('/me/care-team', authenticate, getCareTeam);
router.get('/:id', authenticate, getMessageById);
router.get('/thread/:threadId', authenticate, getMessageThread);
router.post('/', authenticate, sendMessage);
router.put('/:id/read', authenticate, markAsRead);
router.delete('/:id', authenticate, deleteMessage);

export default router;
