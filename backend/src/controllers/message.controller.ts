import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { ApiError } from '../middleware/errorHandler';

/**
 * Get user's messages (inbox)
 */
export const getMyMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { type = 'received', limit = '20' } = req.query;
    const limitNum = parseInt(limit as string);

    const where: any = type === 'sent'
      ? { senderId: userId }
      : { recipientId: userId };

    const messages = await prisma.message.findMany({
      where,
      take: limitNum,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        recipient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      data: { messages }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get message by ID
 */
export const getMessageById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const message = await prisma.message.findFirst({
      where: {
        id,
        OR: [
          { senderId: userId },
          { recipientId: userId }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        recipient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });

    if (!message) {
      throw new ApiError(404, 'Message not found');
    }

    // Mark as read if user is recipient
    if (message.recipientId === userId && !message.isRead) {
      await prisma.message.update({
        where: { id },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });
    }

    res.json({
      status: 'success',
      data: { message }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get message thread
 */
export const getMessageThread = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { threadId } = req.params;
    const userId = req.user!.id;

    const messages = await prisma.message.findMany({
      where: {
        threadId,
        OR: [
          { senderId: userId },
          { recipientId: userId }
        ]
      },
      orderBy: {
        createdAt: 'asc'
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        recipient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });

    // Mark unread messages as read
    await prisma.message.updateMany({
      where: {
        threadId,
        recipientId: userId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({
      status: 'success',
      data: { messages }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a message
 */
export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { recipientId, subject, content, threadId } = req.body;

    if (!recipientId || !content) {
      throw new ApiError(400, 'Recipient and content are required');
    }

    // Verify recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId }
    });

    if (!recipient) {
      throw new ApiError(404, 'Recipient not found');
    }

    // Generate threadId if this is a new conversation
    const finalThreadId = threadId || `thread_${Date.now()}_${userId}_${recipientId}`;

    const message = await prisma.message.create({
      data: {
        senderId: userId,
        recipientId,
        subject,
        content,
        threadId: finalThreadId
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        recipient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });

    res.status(201).json({
      status: 'success',
      data: { message }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread message count
 */
export const getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const count = await prisma.message.count({
      where: {
        recipientId: userId,
        isRead: false
      }
    });

    res.json({
      status: 'success',
      data: { count }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark message as read
 */
export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const message = await prisma.message.updateMany({
      where: {
        id,
        recipientId: userId
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    if (message.count === 0) {
      throw new ApiError(404, 'Message not found');
    }

    res.json({
      status: 'success',
      message: 'Message marked as read'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete message (soft delete by marking as archived)
 */
export const deleteMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Only allow users to delete messages they sent or received
    const result = await prisma.message.deleteMany({
      where: {
        id,
        OR: [
          { senderId: userId },
          { recipientId: userId }
        ]
      }
    });

    if (result.count === 0) {
      throw new ApiError(404, 'Message not found');
    }

    res.json({
      status: 'success',
      message: 'Message deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get available care team members to message
 */
export const getCareTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const careTeam = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      },
      orderBy: {
        firstName: 'asc'
      }
    });

    res.json({
      status: 'success',
      data: { careTeam }
    });
  } catch (error) {
    next(error);
  }
};
