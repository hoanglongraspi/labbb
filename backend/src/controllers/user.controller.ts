import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import { ApiError } from '../middleware/errorHandler';

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        lastLogin: true,
        createdAt: true,
        preferences: {
          select: {
            interestedInTherapy: true,
            interestedInConsulting: true,
            interestedInSupportGroups: true,
            interestedInClinicalTrials: true,
            interestedInDigitalTools: true,
            receiveEmailUpdates: true
          }
        },
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

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, phone, email } = req.body;

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { email: true }
    });

    if (email && typeof email === 'string') {
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== currentUser?.email) {
        const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existingUser && existingUser.id !== req.user!.id) {
          throw new ApiError(400, 'Email address is already in use by another account.');
        }
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        firstName,
        lastName,
        phone,
        email: email ? email.trim().toLowerCase() : undefined
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'UPDATE_PROFILE',
        resourceType: 'user',
        resourceId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
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

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { passwordHash: newPasswordHash }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'CHANGE_PASSWORD',
        resourceType: 'user',
        resourceId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getPreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const preferences = await prisma.userPreference.findUnique({
      where: { userId: req.user!.id }
    });

    const normalized = {
      therapy: preferences?.interestedInTherapy ?? false,
      consulting: preferences?.interestedInConsulting ?? false,
      supportGroups: preferences?.interestedInSupportGroups ?? false,
      clinicalTrials: preferences?.interestedInClinicalTrials ?? false,
      digitalTools: preferences?.interestedInDigitalTools ?? false,
      emailUpdates: preferences?.receiveEmailUpdates ?? false
    };

    res.json({
      status: 'success',
      data: { preferences: normalized }
    });
  } catch (error) {
    next(error);
  }
};

export const updatePreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      therapy = false,
      consulting = false,
      supportGroups = false,
      clinicalTrials = false,
      digitalTools = false,
      emailUpdates = false
    } = req.body;

    const preferences = await prisma.userPreference.upsert({
      where: { userId: req.user!.id },
      create: {
        userId: req.user!.id,
        interestedInTherapy: therapy,
        interestedInConsulting: consulting,
        interestedInSupportGroups: supportGroups,
        interestedInClinicalTrials: clinicalTrials,
        interestedInDigitalTools: digitalTools,
        receiveEmailUpdates: emailUpdates
      },
      update: {
        interestedInTherapy: therapy,
        interestedInConsulting: consulting,
        interestedInSupportGroups: supportGroups,
        interestedInClinicalTrials: clinicalTrials,
        interestedInDigitalTools: digitalTools,
        receiveEmailUpdates: emailUpdates
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'UPDATE_PREFERENCES',
        resourceType: 'user',
        resourceId: preferences.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      status: 'success',
      data: {
        preferences: {
          therapy,
          consulting,
          supportGroups,
          clinicalTrials,
          digitalTools,
          emailUpdates
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
