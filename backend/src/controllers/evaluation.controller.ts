import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { ApiError } from '../middleware/errorHandler';

export const createEvaluation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    const {
      evaluationDate,
      evaluatorName,
      evaluationType,
      results,
      notes,
      conditionCategory,
      conditionSeverity
    } = req.body;

    // Check if patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient not found');
    }

    const evaluation = await prisma.evaluation.create({
      data: {
        patientId,
        evaluationDate: new Date(evaluationDate),
        evaluatorName,
        evaluationType,
        results,
        notes,
        conditionCategory
      },
      include: {
        patient: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'CREATE_EVALUATION',
        resourceType: 'evaluation',
        resourceId: evaluation.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.status(201).json({
      status: 'success',
      data: { evaluation }
    });
  } catch (error) {
    next(error);
  }
};

export const getEvaluationsByPatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;

    const evaluations = await prisma.evaluation.findMany({
      where: { patientId },
      orderBy: { evaluationDate: 'desc' },
      include: {
        audiograms: {
          select: {
            id: true,
            testDate: true,
            fileType: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      data: { evaluations }
    });
  } catch (error) {
    next(error);
  }
};

export const getEvaluation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const evaluation = await prisma.evaluation.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        audiograms: true
      }
    });

    if (!evaluation) {
      throw new ApiError(404, 'Evaluation not found');
    }

    res.json({
      status: 'success',
      data: { evaluation }
    });
  } catch (error) {
    next(error);
  }
};

export const updateEvaluation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const {
      evaluationDate,
      evaluatorName,
      evaluationType,
      results,
      notes,
      conditionCategory,
      conditionSeverity
    } = req.body;

    const evaluation = await prisma.evaluation.update({
      where: { id },
      data: {
        evaluationDate: evaluationDate ? new Date(evaluationDate) : undefined,
        evaluatorName,
        evaluationType,
        results,
        notes,
        conditionCategory
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'UPDATE_EVALUATION',
        resourceType: 'evaluation',
        resourceId: evaluation.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      status: 'success',
      data: { evaluation }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEvaluation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.evaluation.delete({
      where: { id }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'DELETE_EVALUATION',
        resourceType: 'evaluation',
        resourceId: id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      status: 'success',
      message: 'Evaluation deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
