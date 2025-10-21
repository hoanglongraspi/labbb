import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { ApiError } from '../middleware/errorHandler';
import { EngagementService } from '../services/engagement.service';

/**
 * Get patient's goals
 */
export const getMyGoals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const patient = await prisma.patient.findUnique({
      where: { userId }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient record not found');
    }

    const { status } = req.query;

    const where: any = { patientId: patient.id };

    if (status) {
      where.status = status;
    }

    const goals = await prisma.patientGoal.findMany({
      where,
      orderBy: [
        { status: 'asc' },
        { targetDate: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({
      status: 'success',
      data: { goals }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get goal by ID
 */
export const getGoalById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const patient = await prisma.patient.findUnique({
      where: { userId }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient record not found');
    }

    const goal = await prisma.patientGoal.findFirst({
      where: {
        id,
        patientId: patient.id
      }
    });

    if (!goal) {
      throw new ApiError(404, 'Goal not found');
    }

    res.json({
      status: 'success',
      data: { goal }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create goal
 */
export const createGoal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const patient = await prisma.patient.findUnique({
      where: { userId }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient record not found');
    }

    const { title, description, targetDate } = req.body;

    if (!title) {
      throw new ApiError(400, 'Title is required');
    }

    const goal = await prisma.patientGoal.create({
      data: {
        patientId: patient.id,
        title,
        description,
        targetDate: targetDate ? new Date(targetDate) : undefined,
        status: 'IN_PROGRESS'
      }
    });

    // Award points for setting a goal
    await EngagementService.awardPoints(userId, 10, 'Goal created');

    res.status(201).json({
      status: 'success',
      data: { goal }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update goal
 */
export const updateGoal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const patient = await prisma.patient.findUnique({
      where: { userId }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient record not found');
    }

    const { title, description, targetDate, status, progress } = req.body;

    // Get the current goal
    const currentGoal = await prisma.patientGoal.findFirst({
      where: {
        id,
        patientId: patient.id
      }
    });

    if (!currentGoal) {
      throw new ApiError(404, 'Goal not found');
    }

    const updateData: any = {
      title,
      description,
      targetDate: targetDate ? new Date(targetDate) : undefined,
      status,
      progress
    };

    // If status is being set to COMPLETED and it wasn't before
    if (status === 'COMPLETED' && currentGoal.status !== 'COMPLETED') {
      updateData.completedAt = new Date();
      // Update engagement stats
      await EngagementService.incrementGoalsCompleted(userId);
    }

    const goal = await prisma.patientGoal.updateMany({
      where: {
        id,
        patientId: patient.id
      },
      data: updateData
    });

    if (goal.count === 0) {
      throw new ApiError(404, 'Goal not found');
    }

    const updatedGoal = await prisma.patientGoal.findUnique({
      where: { id }
    });

    res.json({
      status: 'success',
      data: { goal: updatedGoal }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete goal
 */
export const deleteGoal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const patient = await prisma.patient.findUnique({
      where: { userId }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient record not found');
    }

    const result = await prisma.patientGoal.deleteMany({
      where: {
        id,
        patientId: patient.id
      }
    });

    if (result.count === 0) {
      throw new ApiError(404, 'Goal not found');
    }

    res.json({
      status: 'success',
      message: 'Goal deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get suggested goals based on patient condition
 */
export const getSuggestedGoals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const patient = await prisma.patient.findUnique({
      where: { userId }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient record not found');
    }

    const suggestions = [
      {
        title: 'Read 5 educational articles',
        description: 'Learn more about your condition by reading educational resources'
      },
      {
        title: 'Log symptoms for 7 consecutive days',
        description: 'Build a habit of tracking your symptoms daily'
      },
      {
        title: 'Attend all scheduled appointments',
        description: 'Stay on track with your treatment plan'
      },
      {
        title: 'Complete symptom diary for 30 days',
        description: 'Track your progress over a full month'
      },
      {
        title: 'Join a support group discussion',
        description: 'Connect with others who share similar experiences'
      }
    ];

    // Customize suggestions based on condition
    if (patient.primaryCondition === 'TINNITUS') {
      suggestions.push({
        title: 'Reduce tinnitus loudness by 20%',
        description: 'Work with your care team on tinnitus management strategies'
      });
    }

    if (patient.primaryCondition === 'HEARING_LOSS') {
      suggestions.push({
        title: 'Improve hearing clarity scores',
        description: 'Follow your audiologist\'s recommendations for better hearing'
      });
    }

    res.json({
      status: 'success',
      data: { suggestions }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get all patient goals
 */
export const getPatientGoals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;

    const goals = await prisma.patientGoal.findMany({
      where: { patientId },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({
      status: 'success',
      data: { goals }
    });
  } catch (error) {
    next(error);
  }
};
