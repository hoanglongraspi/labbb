import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { ApiError } from '../middleware/errorHandler';
import { EngagementService } from '../services/engagement.service';

// ========== Forum Categories ==========

/**
 * Get all forum categories
 */
export const getForumCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.forumCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { posts: true }
        }
      }
    });

    res.json({
      status: 'success',
      data: { categories }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create forum category
 */
export const createForumCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, sortOrder } = req.body;

    if (!name) {
      throw new ApiError(400, 'Category name is required');
    }

    const category = await prisma.forumCategory.create({
      data: {
        name,
        description,
        sortOrder: sortOrder || 0
      }
    });

    res.status(201).json({
      status: 'success',
      data: { category }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update forum category
 */
export const updateForumCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, description, sortOrder, isActive } = req.body;

    const category = await prisma.forumCategory.update({
      where: { id },
      data: {
        name,
        description,
        sortOrder,
        isActive
      }
    });

    res.json({
      status: 'success',
      data: { category }
    });
  } catch (error) {
    next(error);
  }
};

// ========== Forum Posts ==========

/**
 * Get posts in a category
 */
export const getForumPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { categoryId } = req.params;
    const { page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { categoryId };

    const total = await prisma.forumPost.count({ where });

    const posts = await prisma.forumPost.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: { replies: true }
        }
      }
    });

    res.json({
      status: 'success',
      data: {
        posts,
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

/**
 * Get post by ID with replies
 */
export const getForumPostById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const post = await prisma.forumPost.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        category: true,
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    if (!post) {
      throw new ApiError(404, 'Post not found');
    }

    // Increment view count
    await prisma.forumPost.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    });

    res.json({
      status: 'success',
      data: { post }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create forum post
 */
export const createForumPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { categoryId, title, content, isAnonymous } = req.body;

    if (!categoryId || !title || !content) {
      throw new ApiError(400, 'Category, title, and content are required');
    }

    // Verify category exists
    const category = await prisma.forumCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category || !category.isActive) {
      throw new ApiError(404, 'Category not found or inactive');
    }

    const post = await prisma.forumPost.create({
      data: {
        categoryId,
        authorId: userId,
        title,
        content,
        isAnonymous: isAnonymous || false
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        category: true
      }
    });

    // Update engagement stats
    await EngagementService.incrementForumPosts(userId);

    res.status(201).json({
      status: 'success',
      data: { post }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update forum post
 */
export const updateForumPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { title, content } = req.body;

    // Check if user owns this post
    const existingPost = await prisma.forumPost.findFirst({
      where: {
        id,
        authorId: userId
      }
    });

    if (!existingPost) {
      throw new ApiError(404, 'Post not found or you do not have permission');
    }

    const post = await prisma.forumPost.update({
      where: { id },
      data: {
        title,
        content
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      data: { post }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete forum post
 */
export const deleteForumPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Allow deletion if user is author or admin
    const where: any = { id };
    if (userRole !== 'ADMIN') {
      where.authorId = userId;
    }

    const result = await prisma.forumPost.deleteMany({ where });

    if (result.count === 0) {
      throw new ApiError(404, 'Post not found or you do not have permission');
    }

    res.json({
      status: 'success',
      message: 'Post deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ========== Forum Replies ==========

/**
 * Create reply to a post
 */
export const createForumReply = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { postId } = req.params;
    const { content, isAnonymous } = req.body;

    if (!content) {
      throw new ApiError(400, 'Content is required');
    }

    // Verify post exists and is not locked
    const post = await prisma.forumPost.findUnique({
      where: { id: postId }
    });

    if (!post) {
      throw new ApiError(404, 'Post not found');
    }

    if (post.isLocked) {
      throw new ApiError(403, 'This post is locked and cannot accept new replies');
    }

    const reply = await prisma.forumReply.create({
      data: {
        postId,
        authorId: userId,
        content,
        isAnonymous: isAnonymous || false
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json({
      status: 'success',
      data: { reply }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update forum reply
 */
export const updateForumReply = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { content } = req.body;

    // Check if user owns this reply
    const existingReply = await prisma.forumReply.findFirst({
      where: {
        id,
        authorId: userId
      }
    });

    if (!existingReply) {
      throw new ApiError(404, 'Reply not found or you do not have permission');
    }

    const reply = await prisma.forumReply.update({
      where: { id },
      data: { content },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      data: { reply }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete forum reply
 */
export const deleteForumReply = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Allow deletion if user is author or admin
    const where: any = { id };
    if (userRole !== 'ADMIN') {
      where.authorId = userId;
    }

    const result = await prisma.forumReply.deleteMany({ where });

    if (result.count === 0) {
      throw new ApiError(404, 'Reply not found or you do not have permission');
    }

    res.json({
      status: 'success',
      message: 'Reply deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ========== Admin Moderation ==========

/**
 * Admin: Pin/unpin post
 */
export const togglePinPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const post = await prisma.forumPost.findUnique({
      where: { id }
    });

    if (!post) {
      throw new ApiError(404, 'Post not found');
    }

    const updated = await prisma.forumPost.update({
      where: { id },
      data: { isPinned: !post.isPinned }
    });

    res.json({
      status: 'success',
      data: { post: updated }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Lock/unlock post
 */
export const toggleLockPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const post = await prisma.forumPost.findUnique({
      where: { id }
    });

    if (!post) {
      throw new ApiError(404, 'Post not found');
    }

    const updated = await prisma.forumPost.update({
      where: { id },
      data: { isLocked: !post.isLocked }
    });

    res.json({
      status: 'success',
      data: { post: updated }
    });
  } catch (error) {
    next(error);
  }
};
