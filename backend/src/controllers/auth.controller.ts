import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { sendPasswordResetEmail } from '../utils/email';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, phone, dateOfBirth, gender } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ApiError(400, 'Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate unique medical record number
    const medicalRecordNumber = `MRN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create user and patient record in transaction
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        role: 'PATIENT',
        patient: {
          create: {
            medicalRecordNumber,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            gender: gender || null
          }
        }
      },
      include: {
        patient: true
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          patientId: user.patient?.id
        },
        accessToken
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { patient: true }
    });

    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }

    if (!user.isActive) {
      throw new ApiError(401, 'Account is inactive');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          patientId: user.patient?.id
        },
        accessToken
      }
    });
  } catch (error) {
    next(error);
  }
};

export const activateAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, activationCode, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        isActive: true,
        role: true
      }
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.isActive) {
      throw new ApiError(400, 'Account is already active');
    }

    const activeCodes = await prisma.activationCode.findMany({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    let matchedCode = undefined as (typeof activeCodes)[number] | undefined;

    for (const codeRecord of activeCodes) {
      // Activation codes are hashed before storing, compare against the provided value
      const isMatch = await bcrypt.compare(activationCode, codeRecord.codeHash);
      if (isMatch) {
        matchedCode = codeRecord;
        break;
      }
    }

    if (!matchedCode) {
      throw new ApiError(400, 'Invalid or expired activation code');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          isActive: true
        }
      });

      await tx.activationCode.update({
        where: { id: matchedCode.id },
        data: {
          usedAt: new Date()
        }
      });

      await tx.activationCode.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
          id: {
            not: matchedCode.id
          }
        },
        data: {
          expiresAt: new Date()
        }
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'ACTIVATE_ACCOUNT',
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });
    });

    res.json({
      status: 'success',
      message: 'Account activated. You can now sign in.'
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new ApiError(401, 'No refresh token provided');
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user || !user.isActive) {
      throw new ApiError(401, 'User not found or inactive');
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    res.json({
      status: 'success',
      data: { accessToken }
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user) {
      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'LOGOUT',
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Not authenticated');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        lastLogin: true,
        createdAt: true,
        patient: {
          select: {
            id: true,
            medicalRecordNumber: true,
            dateOfBirth: true,
            gender: true,
            primaryCondition: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ApiError(400, 'Email is required');
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    // Always return success even if user doesn't exist (security best practice)
    // This prevents email enumeration attacks
    if (!user) {
      logger.info(`Password reset requested for non-existent email: ${email}`);
      return res.json({
        status: 'success',
        message: 'If an account exists with that email, a password reset link has been sent.'
      });
    }

    if (!user.isActive) {
      logger.info(`Password reset requested for inactive account: ${email}`);
      return res.json({
        status: 'success',
        message: 'If an account exists with that email, a password reset link has been sent.'
      });
    }

    // Generate reset token (32 bytes = 64 hex characters)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Token expires in 1 hour
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // Save hashed token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry
      }
    });

    // Send email with unhashed token
    await sendPasswordResetEmail({
      to: user.email,
      resetToken,
      firstName: user.firstName
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REQUEST_PASSWORD_RESET',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    logger.info(`Password reset email sent to: ${email}`);

    res.json({
      status: 'success',
      message: 'If an account exists with that email, a password reset link has been sent.'
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      throw new ApiError(400, 'Token and password are required');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new ApiError(400, 'Password must be at least 8 characters long');
    }

    // Hash the provided token to compare with database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: {
          gt: new Date() // Token not expired
        },
        isActive: true
      }
    });

    if (!user) {
      throw new ApiError(400, 'Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'RESET_PASSWORD',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    logger.info(`Password reset successful for user: ${user.email}`);

    res.json({
      status: 'success',
      message: 'Password has been reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    next(error);
  }
};
