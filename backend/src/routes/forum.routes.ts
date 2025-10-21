import { Router } from 'express';
import {
  getForumCategories,
  createForumCategory,
  updateForumCategory,
  getForumPosts,
  getForumPostById,
  createForumPost,
  updateForumPost,
  deleteForumPost,
  createForumReply,
  updateForumReply,
  deleteForumReply,
  togglePinPost,
  toggleLockPost
} from '../controllers/forum.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

// Forum categories
router.get('/categories', authenticate, getForumCategories);
router.post('/categories', authenticate, authorizeRoles('ADMIN'), createForumCategory);
router.put('/categories/:id', authenticate, authorizeRoles('ADMIN'), updateForumCategory);

// Forum posts
router.get('/categories/:categoryId/posts', authenticate, getForumPosts);
router.get('/posts/:id', authenticate, getForumPostById);
router.post('/posts', authenticate, createForumPost);
router.put('/posts/:id', authenticate, updateForumPost);
router.delete('/posts/:id', authenticate, deleteForumPost);

// Forum replies
router.post('/posts/:postId/replies', authenticate, createForumReply);
router.put('/replies/:id', authenticate, updateForumReply);
router.delete('/replies/:id', authenticate, deleteForumReply);

// Admin moderation
router.put('/posts/:id/pin', authenticate, authorizeRoles('ADMIN'), togglePinPost);
router.put('/posts/:id/lock', authenticate, authorizeRoles('ADMIN'), toggleLockPost);

export default router;
