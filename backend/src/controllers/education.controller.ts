import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { ApiError } from '../middleware/errorHandler';
import { uploadEducationPDF as uploadPDFToS3, getPresignedUrl } from '../utils/s3';
import { EngagementService } from '../services/engagement.service';

// Helper function to generate slug from title
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

export const getEducationalContent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, search, page = '1', limit = '10' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause - only show published content for public
    const where: any = { isPublished: true };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { content: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const total = await prisma.educationalContent.count({ where });

    const articles = await prisma.educationalContent.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        content: true,
        summary: true,
        heroImageUrl: true,
        resourceUrl: true,
        pdfUrl: true,
        pdfFileName: true,
        viewCount: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      data: {
        articles,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getEducationalContentBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;

    const article = await prisma.educationalContent.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!article) {
      throw new ApiError(404, 'Article not found');
    }

    if (!article.isPublished) {
      throw new ApiError(404, 'Article not found');
    }

    // Increment view count
    await prisma.educationalContent.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } }
    });

    res.json({
      status: 'success',
      data: { article }
    });
  } catch (error) {
    next(error);
  }
};

export const getAllEducationalContent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, search, published } = req.query;

    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (published !== undefined) {
      where.isPublished = published === 'true';
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { content: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const articles = await prisma.educationalContent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      data: { articles }
    });
  } catch (error) {
    next(error);
  }
};

export const createEducationalContent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, category, content, summary, heroImageUrl, resourceUrl, isPublished = false } = req.body;

    // Generate slug from title
    let slug = generateSlug(title);

    // Ensure slug is unique
    const existingArticle = await prisma.educationalContent.findUnique({
      where: { slug }
    });

    if (existingArticle) {
      slug = `${slug}-${Date.now()}`;
    }

    const article = await prisma.educationalContent.create({
      data: {
        title,
        slug,
        category,
        content,
        summary,
        heroImageUrl,
        resourceUrl,
        isPublished,
        authorId: req.user!.id
      },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'CREATE_EDUCATION',
        resourceType: 'education',
        resourceId: article.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.status(201).json({
      status: 'success',
      data: { article }
    });
  } catch (error) {
    next(error);
  }
};

export const updateEducationalContent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, category, content, summary, heroImageUrl, resourceUrl, isPublished } = req.body;

    let slug;
    if (title) {
      slug = generateSlug(title);

      // Check if slug is taken by another article
      const existingArticle = await prisma.educationalContent.findUnique({
        where: { slug }
      });

      if (existingArticle && existingArticle.id !== id) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    const article = await prisma.educationalContent.update({
      where: { id },
      data: {
        title,
        slug,
        category,
        content,
        summary,
        heroImageUrl,
        resourceUrl,
        isPublished
      },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'UPDATE_EDUCATION',
        resourceType: 'education',
        resourceId: article.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      status: 'success',
      data: { article }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEducationalContent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.educationalContent.delete({
      where: { id }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'DELETE_EDUCATION',
        resourceType: 'education',
        resourceId: id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      status: 'success',
      message: 'Article deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const uploadEducationalPDF = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, category, summary, content, isPublished = false } = req.body;
    const file = req.file;

    if (!title || !category) {
      throw new ApiError(400, 'Title and category are required');
    }

    if (!file && !content) {
      throw new ApiError(400, 'Either PDF file or text content is required');
    }

    let pdfUrl = null;
    let pdfFileName = null;

    // Upload PDF to S3 if file provided
    if (file) {
      const uploadResult = await uploadPDFToS3(file);
      pdfUrl = uploadResult.fileUrl;
      pdfFileName = file.originalname;
    }

    // Generate slug from title
    let slug = generateSlug(title);

    // Ensure slug is unique
    const existingArticle = await prisma.educationalContent.findUnique({
      where: { slug }
    });

    if (existingArticle) {
      slug = `${slug}-${Date.now()}`;
    }

    // Create educational content record
    const article = await prisma.educationalContent.create({
      data: {
        title,
        slug,
        category,
        content: content || null,
        summary: summary || null,
        pdfUrl,
        pdfFileName,
        isPublished: isPublished === 'true' || isPublished === true,
        authorId: req.user!.id
      },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'CREATE_EDUCATION',
        resourceType: 'education',
        resourceId: article.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.status(201).json({
      status: 'success',
      data: { article }
    });
  } catch (error) {
    next(error);
  }
};

export const getEducationalPDFUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const article = await prisma.educationalContent.findUnique({
      where: { id }
    });

    if (!article) {
      throw new ApiError(404, 'Article not found');
    }

    if (!article.pdfUrl) {
      throw new ApiError(404, 'PDF not found for this article');
    }

    // Generate presigned URL (valid for 15 minutes)
    const downloadUrl = await getPresignedUrl(article.pdfUrl, 900);

    res.json({
      status: 'success',
      data: { downloadUrl, fileName: article.pdfFileName }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark article as read/completed
 */
export const markArticleAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { completed = true } = req.body;

    // Check if article exists
    const article = await prisma.educationalContent.findUnique({
      where: { id }
    });

    if (!article) {
      throw new ApiError(404, 'Article not found');
    }

    // Upsert article progress
    const progress = await prisma.articleProgress.upsert({
      where: {
        userId_articleId: {
          userId,
          articleId: id
        }
      },
      update: {
        completed,
        readAt: new Date()
      },
      create: {
        userId,
        articleId: id,
        completed
      }
    });

    // Update engagement stats if this is the first read
    if (completed) {
      await EngagementService.incrementArticlesRead(userId);
    }

    res.json({
      status: 'success',
      data: { progress }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bookmark/unbookmark article
 */
export const toggleArticleBookmark = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if article exists
    const article = await prisma.educationalContent.findUnique({
      where: { id }
    });

    if (!article) {
      throw new ApiError(404, 'Article not found');
    }

    // Get or create progress
    const existing = await prisma.articleProgress.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId: id
        }
      }
    });

    const progress = await prisma.articleProgress.upsert({
      where: {
        userId_articleId: {
          userId,
          articleId: id
        }
      },
      update: {
        bookmarked: !existing?.bookmarked
      },
      create: {
        userId,
        articleId: id,
        bookmarked: true
      }
    });

    res.json({
      status: 'success',
      data: { progress }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's bookmarked articles
 */
export const getBookmarkedArticles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const bookmarks = await prisma.articleProgress.findMany({
      where: {
        userId,
        bookmarked: true
      },
      include: {
        article: {
          include: {
            author: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: {
        readAt: 'desc'
      }
    });

    res.json({
      status: 'success',
      data: {
        bookmarks: bookmarks.map(b => ({
          ...b.article,
          bookmarkedAt: b.readAt
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's reading progress stats
 */
export const getReadingProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const totalArticles = await prisma.educationalContent.count({
      where: { isPublished: true }
    });

    const readArticles = await prisma.articleProgress.count({
      where: {
        userId,
        completed: true
      }
    });

    const bookmarkedArticles = await prisma.articleProgress.count({
      where: {
        userId,
        bookmarked: true
      }
    });

    const recentlyRead = await prisma.articleProgress.findMany({
      where: {
        userId,
        completed: true
      },
      take: 5,
      orderBy: {
        readAt: 'desc'
      },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            slug: true,
            category: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      data: {
        stats: {
          totalArticles,
          readArticles,
          bookmarkedArticles,
          percentageRead: totalArticles > 0 ? (readArticles / totalArticles) * 100 : 0
        },
        recentlyRead: recentlyRead.map(r => ({
          ...r.article,
          readAt: r.readAt
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};
