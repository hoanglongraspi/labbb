import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { ApiError } from '../middleware/errorHandler';
import { createActivationCode, buildActivationLink } from '../utils/activationCode';
import { sendActivationEmail } from '../utils/email';
import { logger } from '../utils/logger';

export const createPatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      email,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      primaryCondition,
      notes
    } = req.body;

    // Generate unique medical record number
    const medicalRecordNumber = `MRN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Check if email is already taken (if provided)
    if (email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new ApiError(400, 'Email already registered');
      }
    }

    // Create patient record
    const patient = await prisma.patient.create({
      data: {
        medicalRecordNumber,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        primaryCondition,
        notes,
        user: email ? {
          create: {
            email,
            passwordHash: '', // Will be set when patient registers
            firstName,
            lastName,
            phone,
            role: 'PATIENT',
            isActive: false // Inactive until they complete registration
          }
        } : undefined
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            isActive: true
          }
        }
      }
    });

    let activationInfo: { code: string; expiresAt: Date; link: string } | undefined;

    if (patient.user && !patient.user.isActive) {
      const { code, codeHash, expiresAt } = await createActivationCode();
      await prisma.activationCode.create({
        data: {
          userId: patient.user.id,
          codeHash,
          expiresAt
        }
      });

      const activationLink = buildActivationLink(code, patient.user.email);
      activationInfo = { code, expiresAt, link: activationLink };

      if (patient.user.email) {
        try {
          await sendActivationEmail({
            to: patient.user.email,
            code,
            expiresAt,
            patientName: `${patient.user.firstName ?? ''} ${patient.user.lastName ?? ''}`.trim()
          });
        } catch (error) {
          logger.error('Failed to send activation email after patient creation', error as Error);
        }
      }
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'CREATE_PATIENT',
        resourceType: 'patient',
        resourceId: patient.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.status(201).json({
      status: 'success',
      data: {
        patient,
        activationCode: activationInfo
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getPatients = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '10',
      search = '',
      condition,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { medicalRecordNumber: { contains: search as string, mode: 'insensitive' } },
        { user: { firstName: { contains: search as string, mode: 'insensitive' } } },
        { user: { lastName: { contains: search as string, mode: 'insensitive' } } },
        { user: { email: { contains: search as string, mode: 'insensitive' } } }
      ];
    }

    if (condition) {
      where.primaryCondition = condition;
    }

    // Get total count
    const total = await prisma.patient.count({ where });

    // Get patients
    const patients = await prisma.patient.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: {
        [sortBy as string]: sortOrder
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            lastLogin: true,
            isActive: true
          }
        },
        evaluations: {
          orderBy: { evaluationDate: 'desc' },
          take: 1,
          select: {
            id: true,
            evaluationDate: true,
            evaluationType: true,
            results: true
          }
        },
        _count: {
          select: {
            evaluations: true,
            audiograms: true,
            testResults: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      data: {
        patients,
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

export const getPatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            lastLogin: true,
            isActive: true,
            createdAt: true
          }
        },
        evaluations: {
          orderBy: { evaluationDate: 'desc' },
          select: {
            id: true,
            evaluationDate: true,
            evaluationType: true,
            conditionCategory: true,
            results: true,
            notes: true,
            _count: {
              select: { audiograms: true }
            }
          }
        },
        audiograms: {
          orderBy: { testDate: 'desc' },
          take: 5,
          include: {
            uploader: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            summaryCreator: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            evaluation: {
              select: {
                id: true,
                evaluationDate: true,
                evaluationType: true,
                conditionCategory: true,
                results: true
              }
            }
          }
        },
        testResults: {
          orderBy: { testDate: 'desc' },
          take: 10,
          select: {
            id: true,
            testId: true,
            testType: true,
            testDate: true,
            videoUrl: true,
            csvUrl: true,
            questionsUrl: true,
            metadata: true,
            analysis: true,
            summary: true,
            createdAt: true
          }
        }
      }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient not found');
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'VIEW_PATIENT',
        resourceType: 'patient',
        resourceId: patient.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      status: 'success',
      data: { patient }
    });
  } catch (error) {
    next(error);
  }
};

export const updatePatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      primaryCondition,
      notes
    } = req.body;

    // Check if patient exists
    const existingPatient = await prisma.patient.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!existingPatient) {
      throw new ApiError(404, 'Patient not found');
    }

    // Update patient and user info in transaction
    const patient = await prisma.$transaction(async (tx) => {
      // Update user info if exists
      if (existingPatient.userId) {
        await tx.user.update({
          where: { id: existingPatient.userId },
          data: {
            firstName,
            lastName,
            phone
          }
        });
      }

      // Update patient
      return tx.patient.update({
        where: { id },
        data: {
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          gender,
          primaryCondition,
          notes
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              isActive: true
            }
          }
        }
      });
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'UPDATE_PATIENT',
        resourceType: 'patient',
        resourceId: patient.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      status: 'success',
      data: { patient }
    });
  } catch (error) {
    next(error);
  }
};

export const deletePatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if patient exists
    const patient = await prisma.patient.findUnique({
      where: { id }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient not found');
    }

    // Soft delete (mark user as inactive) or hard delete
    await prisma.patient.delete({
      where: { id }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'DELETE_PATIENT',
        resourceType: 'patient',
        resourceId: id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      status: 'success',
      message: 'Patient deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const createActivationCodeForPatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { email: emailOverride } = req.body as { email?: string };

    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true
          }
        }
      }
    });

    if (!patient || !patient.user) {
      throw new ApiError(404, 'Patient user not found');
    }

    if (patient.user.isActive) {
      throw new ApiError(400, 'Account is already active');
    }

    // Invalidate previous codes
    await prisma.activationCode.updateMany({
      where: {
        userId: patient.user.id,
        usedAt: null,
        expiresAt: {
          gt: new Date()
        }
      },
      data: {
        expiresAt: new Date(),
        usedAt: new Date()
      }
    });

    const { code, codeHash, expiresAt } = await createActivationCode();

    await prisma.activationCode.create({
      data: {
        userId: patient.user.id,
        codeHash,
        expiresAt
      }
    });

    const emailDestination = (emailOverride || patient.user.email || '').trim();
    const activationLink = buildActivationLink(code, emailDestination || undefined);

    let emailSent = false;

    if (emailDestination) {
      try {
        await sendActivationEmail({
          to: emailDestination,
          code,
          expiresAt,
          patientName: `${patient.user.firstName ?? ''} ${patient.user.lastName ?? ''}`.trim()
        });
        emailSent = true;
      } catch (error) {
        logger.error('Failed to send activation email', error as Error);
        throw new ApiError(
          500,
          'Activation code generated but email delivery failed. Please verify email configuration.'
        );
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'CREATE_ACTIVATION_CODE',
        resourceType: 'patient',
        resourceId: patient.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      status: 'success',
      data: {
        activationCode: code,
        activationLink,
        expiresAt,
        emailSent,
        sentTo: emailSent ? emailDestination : undefined
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMyPatientInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { userId: req.user!.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        evaluations: {
          orderBy: { evaluationDate: 'desc' }
        },
        audiograms: {
          orderBy: { testDate: 'desc' },
          select: {
            id: true,
            testDate: true,
            fileType: true,
            fileUrl: true,
            leftEarData: true,
            rightEarData: true,
            summary: true,
            summaryPrompt: true,
            summaryGeneratedAt: true,
            summaryGeneratedBy: true,
            createdAt: true,
            evaluation: {
              select: {
                id: true,
                evaluationDate: true,
                evaluationType: true,
                conditionCategory: true,
                results: true
              }
            },
            summaryCreator: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        testResults: {
          orderBy: { testDate: 'desc' },
          select: {
            id: true,
            testId: true,
            testType: true,
            testDate: true,
            videoUrl: true,
            csvUrl: true,
            questionsUrl: true,
            metadata: true,
            analysis: true,
            summary: true,
            createdAt: true
          }
        }
      }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient record not found');
    }

    res.json({
      status: 'success',
      data: { patient }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get patient progress trends for visualization
 */
export const getPatientTrends = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const patient = await prisma.patient.findUnique({
      where: { userId }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient record not found');
    }

    const { months = '6' } = req.query;
    const monthsNum = parseInt(months as string);

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsNum);

    // Get evaluations with severity trends
    const evaluations = await prisma.evaluation.findMany({
      where: {
        patientId: patient.id,
        evaluationDate: {
          gte: startDate
        }
      },
      orderBy: {
        evaluationDate: 'asc'
      },
      select: {
        id: true,
        evaluationDate: true,
        evaluationType: true,
        results: true
      }
    });

    // Get audiogram data points
    const audiograms = await prisma.audiogram.findMany({
      where: {
        patientId: patient.id,
        testDate: {
          gte: startDate
        }
      },
      orderBy: {
        testDate: 'asc'
      },
      select: {
        id: true,
        testDate: true,
        leftEarData: true,
        rightEarData: true
      }
    });

    // Calculate severity level numeric values for trending
    const severityToNumber = (severity: string | null): number | null => {
      if (!severity) return null;
      const map: Record<string, number> = {
        NONE: 0,
        MILD: 1,
        MODERATE: 2,
        SEVERE: 3,
        CRITICAL: 4
      };
      return map[severity] ?? null;
    };

    // Format evaluation trends
    const severityTrends = evaluations.map(e => {
      const results = e.results as any;
      return {
        date: e.evaluationDate,
        evaluationType: e.evaluationType,
        hearingLoss: severityToNumber(results?.hearingLossSeverity || null),
        tinnitus: severityToNumber(results?.tinnitusSeverity || null),
        hyperacusis: severityToNumber(results?.hyperacusisSeverity || null),
        misophonia: severityToNumber(results?.misophoniaSeverity || null)
      };
    });

    // Calculate average hearing thresholds over time for audiograms
    const audiogramTrends = audiograms.map(a => {
      const leftData = a.leftEarData as any;
      const rightData = a.rightEarData as any;

      const calculateAvg = (data: any) => {
        if (!data || typeof data !== 'object') return null;
        const values = Object.values(data).filter(v => typeof v === 'number') as number[];
        if (values.length === 0) return null;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      };

      return {
        date: a.testDate,
        leftEarAvg: calculateAvg(leftData),
        rightEarAvg: calculateAvg(rightData),
        overallAvg: (calculateAvg(leftData) && calculateAvg(rightData))
          ? ((calculateAvg(leftData)! + calculateAvg(rightData)!) / 2)
          : (calculateAvg(leftData) || calculateAvg(rightData))
      };
    });

    // Get symptom trends if available
    const symptoms = await prisma.symptomEntry.findMany({
      where: {
        patientId: patient.id,
        entryDate: {
          gte: startDate
        }
      },
      orderBy: {
        entryDate: 'asc'
      },
      select: {
        entryDate: true,
        tinnitusLevel: true,
        hearingClarity: true,
        emotionalImpact: true,
        moodRating: true,
        sleepQuality: true,
        stressLevel: true
      }
    });

    res.json({
      status: 'success',
      data: {
        severityTrends,
        audiogramTrends,
        symptomTrends: symptoms,
        summary: {
          totalEvaluations: evaluations.length,
          totalAudiograms: audiograms.length,
          totalSymptomEntries: symptoms.length,
          dateRange: {
            start: startDate,
            end: new Date()
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
