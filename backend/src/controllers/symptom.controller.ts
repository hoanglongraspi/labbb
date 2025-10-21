import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { ApiError } from '../middleware/errorHandler';
import { EngagementService } from '../services/engagement.service';

/**
 * Get patient's symptom entries
 */
export const getMySymptomEntries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const patient = await prisma.patient.findUnique({
      where: { userId }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient record not found');
    }

    const { startDate, endDate, limit = '30' } = req.query;
    const limitNum = parseInt(limit as string);

    const where: any = { patientId: patient.id };

    if (startDate || endDate) {
      where.entryDate = {};
      if (startDate) {
        where.entryDate.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.entryDate.lte = new Date(endDate as string);
      }
    }

    const entries = await prisma.symptomEntry.findMany({
      where,
      take: limitNum,
      orderBy: {
        entryDate: 'desc'
      }
    });

    res.json({
      status: 'success',
      data: { entries }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get symptom entry by ID
 */
export const getSymptomEntryById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const patient = await prisma.patient.findUnique({
      where: { userId }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient record not found');
    }

    const entry = await prisma.symptomEntry.findFirst({
      where: {
        id,
        patientId: patient.id
      }
    });

    if (!entry) {
      throw new ApiError(404, 'Symptom entry not found');
    }

    res.json({
      status: 'success',
      data: { entry }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create symptom entry
 */
export const createSymptomEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const patient = await prisma.patient.findUnique({
      where: { userId }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient record not found');
    }

    const {
      entryDate,
      tinnitusLevel,
      hearingClarity,
      emotionalImpact,
      moodRating,
      sleepQuality,
      stressLevel,
      triggers,
      notes
    } = req.body;

    if (!entryDate) {
      throw new ApiError(400, 'Entry date is required');
    }

    const entry = await prisma.symptomEntry.create({
      data: {
        patientId: patient.id,
        entryDate: new Date(entryDate),
        tinnitusLevel,
        hearingClarity,
        emotionalImpact,
        moodRating,
        sleepQuality,
        stressLevel,
        triggers,
        notes
      }
    });

    // Update engagement stats
    await EngagementService.incrementSymptomLogs(userId);

    res.status(201).json({
      status: 'success',
      data: { entry }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update symptom entry
 */
export const updateSymptomEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const patient = await prisma.patient.findUnique({
      where: { userId }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient record not found');
    }

    const {
      entryDate,
      tinnitusLevel,
      hearingClarity,
      emotionalImpact,
      moodRating,
      sleepQuality,
      stressLevel,
      triggers,
      notes
    } = req.body;

    const entry = await prisma.symptomEntry.updateMany({
      where: {
        id,
        patientId: patient.id
      },
      data: {
        entryDate: entryDate ? new Date(entryDate) : undefined,
        tinnitusLevel,
        hearingClarity,
        emotionalImpact,
        moodRating,
        sleepQuality,
        stressLevel,
        triggers,
        notes
      }
    });

    if (entry.count === 0) {
      throw new ApiError(404, 'Symptom entry not found');
    }

    const updatedEntry = await prisma.symptomEntry.findUnique({
      where: { id }
    });

    res.json({
      status: 'success',
      data: { entry: updatedEntry }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete symptom entry
 */
export const deleteSymptomEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const patient = await prisma.patient.findUnique({
      where: { userId }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient record not found');
    }

    const result = await prisma.symptomEntry.deleteMany({
      where: {
        id,
        patientId: patient.id
      }
    });

    if (result.count === 0) {
      throw new ApiError(404, 'Symptom entry not found');
    }

    res.json({
      status: 'success',
      message: 'Symptom entry deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get symptom trends and insights
 */
export const getSymptomTrends = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const patient = await prisma.patient.findUnique({
      where: { userId }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient record not found');
    }

    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const entries = await prisma.symptomEntry.findMany({
      where: {
        patientId: patient.id,
        entryDate: {
          gte: startDate
        }
      },
      orderBy: {
        entryDate: 'asc'
      }
    });

    // Calculate averages
    const calculateAverage = (field: keyof typeof entries[0]) => {
      const values = entries
        .map(e => e[field] as number)
        .filter(v => v !== null && v !== undefined);

      if (values.length === 0) return null;
      return values.reduce((sum, v) => sum + v, 0) / values.length;
    };

    const trends = {
      totalEntries: entries.length,
      averages: {
        tinnitusLevel: calculateAverage('tinnitusLevel'),
        hearingClarity: calculateAverage('hearingClarity'),
        emotionalImpact: calculateAverage('emotionalImpact'),
        moodRating: calculateAverage('moodRating'),
        sleepQuality: calculateAverage('sleepQuality'),
        stressLevel: calculateAverage('stressLevel')
      },
      timeline: entries.map(e => ({
        date: e.entryDate,
        tinnitusLevel: e.tinnitusLevel,
        hearingClarity: e.hearingClarity,
        emotionalImpact: e.emotionalImpact,
        moodRating: e.moodRating
      }))
    };

    res.json({
      status: 'success',
      data: { trends }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get all symptom entries for a patient
 */
export const getPatientSymptomEntries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    const { limit = '50' } = req.query;
    const limitNum = parseInt(limit as string);

    const entries = await prisma.symptomEntry.findMany({
      where: { patientId },
      take: limitNum,
      orderBy: {
        entryDate: 'desc'
      }
    });

    res.json({
      status: 'success',
      data: { entries }
    });
  } catch (error) {
    next(error);
  }
};
