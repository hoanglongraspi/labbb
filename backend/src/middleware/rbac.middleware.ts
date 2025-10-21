import { Request, Response, NextFunction } from 'express';
import { ApiError } from './errorHandler';

/**
 * RBAC (Role-Based Access Control) Middleware
 *
 * These middleware functions check if the authenticated user has the required role
 */

/**
 * Check if user is an admin
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication required'));
  }

  if (req.user.role !== 'ADMIN') {
    return next(new ApiError(403, 'Admin access required'));
  }

  next();
};

/**
 * Check if user is a patient
 */
export const isPatient = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication required'));
  }

  if (req.user.role !== 'PATIENT') {
    return next(new ApiError(403, 'Patient access required'));
  }

  next();
};

/**
 * Check if user has one of the allowed roles
 */
export const hasRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, `Access denied. Required roles: ${allowedRoles.join(', ')}`));
    }

    next();
  };
};
