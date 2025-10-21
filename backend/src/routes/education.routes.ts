import { Router } from 'express';
import {
  getEducationalContent,
  getEducationalContentBySlug,
  getAllEducationalContent,
  createEducationalContent,
  updateEducationalContent,
  deleteEducationalContent,
  uploadEducationalPDF,
  getEducationalPDFUrl,
  markArticleAsRead,
  toggleArticleBookmark,
  getBookmarkedArticles,
  getReadingProgress
} from '../controllers/education.controller';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import { uploadEducationPDF } from '../middleware/upload';

const router = Router();

// Public routes
router.get('/', getEducationalContent);
router.get('/:slug', getEducationalContentBySlug);
router.get('/:id/pdf', getEducationalPDFUrl); // Get presigned PDF URL

// User progress tracking routes
router.post('/:id/read', authenticate, markArticleAsRead);
router.post('/:id/bookmark', authenticate, toggleArticleBookmark);
router.get('/me/bookmarks', authenticate, getBookmarkedArticles);
router.get('/me/progress', authenticate, getReadingProgress);

// Admin routes
router.get('/admin/all', authenticate, authorizeRoles('ADMIN'), getAllEducationalContent);
router.post('/', authenticate, authorizeRoles('ADMIN'), createEducationalContent);
router.post('/upload', authenticate, authorizeRoles('ADMIN'), uploadEducationPDF.single('file'), uploadEducationalPDF);
router.put('/:id', authenticate, authorizeRoles('ADMIN'), updateEducationalContent);
router.delete('/:id', authenticate, authorizeRoles('ADMIN'), deleteEducationalContent);

export default router;
