import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { ApiError } from '../middleware/errorHandler';

/**
 * Get patient's appointments
 */
export const getMyAppointments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const patient = await prisma.patient.findUnique({
      where: { userId }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient record not found');
    }

    const { upcoming = 'true', limit = '10' } = req.query;
    const limitNum = parseInt(limit as string);

    const where: any = { patientId: patient.id };

    if (upcoming === 'true') {
      where.appointmentDate = {
        gte: new Date()
      };
      where.status = 'SCHEDULED';
    }

    const appointments = await prisma.appointment.findMany({
      where,
      take: limitNum,
      orderBy: {
        appointmentDate: upcoming === 'true' ? 'asc' : 'desc'
      }
    });

    res.json({
      status: 'success',
      data: { appointments }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get appointment by ID
 */
export const getAppointmentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const patient = await prisma.patient.findUnique({
      where: { userId }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient record not found');
    }

    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        patientId: patient.id
      }
    });

    if (!appointment) {
      throw new ApiError(404, 'Appointment not found');
    }

    res.json({
      status: 'success',
      data: { appointment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get all appointments
 */
export const getAllAppointments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId, status, startDate, endDate } = req.query;

    const where: any = {};

    if (patientId) {
      where.patientId = patientId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.appointmentDate = {};
      if (startDate) {
        where.appointmentDate.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.appointmentDate.lte = new Date(endDate as string);
      }
    }

    const appointments = await prisma.appointment.findMany({
      where,
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
        }
      },
      orderBy: {
        appointmentDate: 'asc'
      }
    });

    res.json({
      status: 'success',
      data: { appointments }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Create appointment
 */
export const createAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId, appointmentDate, type, location, notes } = req.body;

    if (!patientId || !appointmentDate || !type) {
      throw new ApiError(400, 'Patient ID, appointment date, and type are required');
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient not found');
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        appointmentDate: new Date(appointmentDate),
        type,
        location,
        notes,
        status: 'SCHEDULED'
      },
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
        }
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'CREATE_PATIENT',
        resourceType: 'appointment',
        resourceId: appointment.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.status(201).json({
      status: 'success',
      data: { appointment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update appointment
 */
export const updateAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { appointmentDate, type, location, notes, status } = req.body;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        appointmentDate: appointmentDate ? new Date(appointmentDate) : undefined,
        type,
        location,
        notes,
        status
      },
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
        }
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'UPDATE_PATIENT',
        resourceType: 'appointment',
        resourceId: appointment.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      status: 'success',
      data: { appointment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Delete appointment
 */
export const deleteAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.appointment.delete({
      where: { id }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'DELETE_PATIENT',
        resourceType: 'appointment',
        resourceId: id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      status: 'success',
      message: 'Appointment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
