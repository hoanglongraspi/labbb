import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { ApiError } from './errorHandler';
import { prisma } from '../utils/prisma';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload & { id: string };
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'No token provided');
    }

    const token = authHeader.substring(7);

    // Verify token
    const payload = verifyAccessToken(token);

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, isActive: true }
    });

    if (!user || !user.isActive) {
      throw new ApiError(401, 'User not found or inactive');
    }

    // Attach user to request
    req.user = {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(new ApiError(401, 'Invalid or expired token'));
    }
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }

    next();
  };
};

export const authorizePatientAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    // Admin can access everything
    if (req.user.role === 'ADMIN') {
      return next();
    }

    // Patient can only access their own data
    const patientId = req.params.id || req.params.patientId;

    if (!patientId) {
      throw new ApiError(400, 'Patient ID required');
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { userId: true }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient not found');
    }

    if (patient.userId !== req.user.id) {
      throw new ApiError(403, 'Access denied to this patient record');
    }

    next();
  } catch (error) {
    next(error);
  }
};
