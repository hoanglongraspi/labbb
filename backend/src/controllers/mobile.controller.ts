import { Request, Response, NextFunction } from 'express';
import { TestType } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { uploadFile, getPresignedUrl, deleteFile, getPresignedUploadUrl, initializeMultipartUpload, getMultipartUploadUrl, completeMultipartUpload, abortMultipartUpload } from '../utils/s3';
import { ApiError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

const normalizeTestType = (rawType: string): TestType => {
  if (!rawType || typeof rawType !== 'string') {
    throw new ApiError(400, 'Invalid testType');
  }

  const value = rawType.toUpperCase();

  switch (value) {
    case 'AUD':
    case 'AUDIOMETRY':
      return TestType.AUDIOMETRY;
    case 'BPPV':
      return TestType.BPPV;
    case 'LOUDNESS':
      return TestType.LOUDNESS;
    case 'SPEECH_IN_NOISE':
    case 'SPEECH-IN-NOISE':
    case 'SPEECHINOISE':
      return TestType.SPEECH_IN_NOISE;
    case 'OTHER':
      return TestType.OTHER;
    default:
      throw new ApiError(400, `Invalid testType: ${rawType}`);
  }
};

/**
 * Upload test result with video, CSV, and questions files from mobile app
 * POST /api/mobile/test-results
 *
 * Supports two workflows:
 * 1. Patient upload: requires patient account, assigns to patientId
 * 2. Admin upload with participantId: stores with participantId for later assignment
 */
export const uploadTestResult = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { testId, testType: rawTestType, testDate, metadata, participantId } = req.body;

    if (!testId || !rawTestType || !testDate) {
      throw new ApiError(400, 'testId, testType, and testDate are required');
    }

    if (!req.user) {
      throw new ApiError(401, 'Not authenticated');
    }

    // Check if testId already exists
    const existing = await prisma.testResult.findUnique({
      where: { testId }
    });

    if (existing) {
      throw new ApiError(409, 'Test result with this testId already exists');
    }

    let patientId: string | null = null;
    let uploaderId: string;

    // Determine workflow: patient upload vs admin upload with participantId
    if (participantId) {
      // Admin workflow: storing with participantId for later assignment
      if (req.user.role !== 'ADMIN') {
        throw new ApiError(403, 'Only admins can upload tests with participantId');
      }
      uploaderId = req.user.id; // Use admin user ID for folder structure
    } else {
      // Patient workflow: assign to patient's record
      const patient = await prisma.patient.findUnique({
        where: { userId: req.user.id }
      });

      if (!patient) {
        throw new ApiError(404, 'Patient record not found for current user');
      }
      patientId = patient.id;
      uploaderId = patient.id;
    }

    // Process uploaded files
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    let videoUrl: string | null = null;
    let csvUrl: string | null = null;
    let questionsUrl: string | null = null;

    // Upload video file
    if (files?.video && files.video[0]) {
      const videoUpload = await uploadFile(
        files.video[0],
        'test-recordings',
        uploaderId
      );
      videoUrl = videoUpload.fileUrl;
    }

    // Upload CSV file
    if (files?.csv && files.csv[0]) {
      const csvUpload = await uploadFile(
        files.csv[0],
        'test-recordings',
        uploaderId
      );
      csvUrl = csvUpload.fileUrl;
    }

    // Upload questions file
    if (files?.questions && files.questions[0]) {
      const questionsUpload = await uploadFile(
        files.questions[0],
        'test-recordings',
        uploaderId
      );
      questionsUrl = questionsUpload.fileUrl;
    }

    // Create test result record
    const normalizedTestType = normalizeTestType(rawTestType);

    const testResult = await prisma.testResult.create({
      data: {
        patientId,
        participantId: participantId || null,
        testId,
        testType: normalizedTestType,
        testDate: new Date(testDate),
        videoUrl,
        csvUrl,
        questionsUrl,
        metadata: metadata ? JSON.parse(metadata) : null
      },
      include: {
        patient: patientId ? {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        } : undefined
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPLOAD_TEST_RESULT',
        resourceType: 'test_result',
        resourceId: testResult.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.status(201).json({
      status: 'success',
      data: { testResult }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all test results for current patient
 * GET /api/mobile/test-results
 */
export const getTestResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Not authenticated');
    }

    // Get patient record
    const patient = await prisma.patient.findUnique({
      where: { userId: req.user.id }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient record not found');
    }

    const { testType: rawTestType, limit = '10', offset = '0' } = req.query;

    const where: any = { patientId: patient.id };
    if (rawTestType) {
      where.testType = normalizeTestType(rawTestType as string);
    }

    const testResults = await prisma.testResult.findMany({
      where,
      orderBy: { testDate: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      include: {
        patient: {
          select: {
            id: true,
            medicalRecordNumber: true
          }
        }
      }
    });

    const total = await prisma.testResult.count({ where });

    res.json({
      status: 'success',
      data: {
        testResults,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get test result by ID
 * GET /api/mobile/test-results/:id
 */
export const getTestResultById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      throw new ApiError(401, 'Not authenticated');
    }

    const testResult = await prisma.testResult.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!testResult) {
      throw new ApiError(404, 'Test result not found');
    }

    // Check authorization
    if (req.user.role === 'PATIENT' && testResult.patient?.userId !== req.user.id) {
      throw new ApiError(403, 'Access denied to this test result');
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'VIEW_TEST_RESULT',
        resourceType: 'test_result',
        resourceId: testResult.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      status: 'success',
      data: { testResult }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Download test result file
 * GET /api/mobile/test-results/:id/download/:fileType
 */
export const downloadTestFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, fileType } = req.params;

    if (!req.user) {
      throw new ApiError(401, 'Not authenticated');
    }

    if (!['video', 'csv', 'questions'].includes(fileType)) {
      throw new ApiError(400, 'Invalid fileType. Must be: video, csv, or questions');
    }

    const testResult = await prisma.testResult.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            userId: true
          }
        }
      }
    });

    if (!testResult) {
      throw new ApiError(404, 'Test result not found');
    }

    // Check authorization
    if (req.user.role === 'PATIENT' && testResult.patient?.userId !== req.user.id) {
      throw new ApiError(403, 'Access denied to this test result');
    }

    // Get file URL based on type
    let fileUrl: string | null = null;
    if (fileType === 'video') fileUrl = testResult.videoUrl;
    else if (fileType === 'csv') fileUrl = testResult.csvUrl;
    else if (fileType === 'questions') fileUrl = testResult.questionsUrl;

    if (!fileUrl) {
      throw new ApiError(404, `${fileType} file not found for this test result`);
    }

    // Generate presigned URL
    const downloadUrl = await getPresignedUrl(fileUrl, 900); // 15 minutes

    res.json({
      status: 'success',
      data: { downloadUrl, fileType }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete test result (Admin or own patient only)
 * DELETE /api/mobile/test-results/:id
 */
export const deleteTestResult = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      throw new ApiError(401, 'Not authenticated');
    }

    const testResult = await prisma.testResult.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            userId: true
          }
        }
      }
    });

    if (!testResult) {
      throw new ApiError(404, 'Test result not found');
    }

    // Check authorization
    if (req.user.role === 'PATIENT' && testResult.patient?.userId !== req.user.id) {
      throw new ApiError(403, 'Access denied');
    }

    // Delete files from S3
    const deletePromises: Promise<void>[] = [];
    if (testResult.videoUrl) deletePromises.push(deleteFile(testResult.videoUrl));
    if (testResult.csvUrl) deletePromises.push(deleteFile(testResult.csvUrl));
    if (testResult.questionsUrl) deletePromises.push(deleteFile(testResult.questionsUrl));

    await Promise.all(deletePromises);

    // Delete database record
    await prisma.testResult.delete({
      where: { id }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_TEST_RESULT',
        resourceType: 'test_result',
        resourceId: id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      status: 'success',
      message: 'Test result deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get test results for a specific patient (Admin only)
 * GET /api/mobile/patients/:patientId/test-results
 */
export const getPatientTestResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    const { testType, limit = '20', offset = '0' } = req.query;

    if (!req.user) {
      throw new ApiError(401, 'Not authenticated');
    }

    // Admin-only endpoint
    if (req.user.role !== 'ADMIN') {
      throw new ApiError(403, 'Admin access required');
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient not found');
    }

    const where: any = { patientId };
    if (testType) {
      where.testType = testType;
    }

    const testResults = await prisma.testResult.findMany({
      where,
      orderBy: { testDate: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
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

    const total = await prisma.testResult.count({ where });

    res.json({
      status: 'success',
      data: {
        testResults,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request presigned URLs for direct S3 upload
 * POST /api/mobile/test-results/presigned-upload
 *
 * Supports two workflows:
 * 1. Patient upload: requires patient account
 * 2. Admin upload with participantId: uses admin user ID for folder
 */
export const getPresignedUploadUrls = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { testId, testType, files, participantId } = req.body;

    if (!testId || !testType || !files) {
      throw new ApiError(400, 'testId, testType, and files are required');
    }

    if (!req.user) {
      throw new ApiError(401, 'Not authenticated');
    }

    // Check if testId already exists
    const existing = await prisma.testResult.findUnique({
      where: { testId }
    });

    if (existing) {
      throw new ApiError(409, 'Test result with this testId already exists');
    }

    let uploaderId: string;

    // Determine workflow: patient upload vs admin upload
    if (req.user.role === 'ADMIN') {
      // Admin workflow: use admin user ID for folder structure
      // Admin can optionally provide participantId, but it's not required for this endpoint
      uploaderId = req.user.id;
    } else {
      // Patient workflow: use patient ID
      const patient = await prisma.patient.findUnique({
        where: { userId: req.user.id }
      });

      if (!patient) {
        throw new ApiError(404, 'Patient record not found');
      }
      uploaderId = patient.id;
    }

    // Generate presigned URLs for each file
    const uploadUrls: any = {};

    for (const fileInfo of files) {
      const { fileType, contentType, fileName } = fileInfo;

      if (!['video', 'csv', 'questions'].includes(fileType)) {
        throw new ApiError(400, `Invalid fileType: ${fileType}`);
      }

      // Generate unique S3 key
      const fileExtension = fileName.split('.').pop();
      const uniqueFileName = `${uuidv4()}.${fileExtension}`;
      const key = `test-recordings/${uploaderId}/${uniqueFileName}`;

      // Generate presigned upload URL
      const uploadUrl = await getPresignedUploadUrl(key, contentType);

      uploadUrls[fileType] = {
        uploadUrl,
        key,
        fileType
      };
    }

    res.json({
      status: 'success',
      data: { uploadUrls, testId }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Confirm upload and create test result record
 * POST /api/mobile/test-results/confirm-upload
 *
 * Supports two workflows:
 * 1. Patient upload: requires patient account, assigns to patientId
 * 2. Admin upload with participantId: stores with participantId for later assignment
 */
export const confirmUpload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { testId, testType: rawTestType, testDate, metadata, uploadedFiles, participantId } = req.body;

    if (!testId || !rawTestType || !testDate || !uploadedFiles) {
      throw new ApiError(400, 'testId, testType, testDate, and uploadedFiles are required');
    }

    if (!req.user) {
      throw new ApiError(401, 'Not authenticated');
    }

    let patientId: string | null = null;

    // Determine workflow: admin upload vs patient upload
    if (req.user.role === 'ADMIN') {
      // Admin workflow: admin can optionally provide participantId
      // If participantId is provided, store it; otherwise leave both null
      // (participantId will be set from request body at line 221)
    } else {
      // Patient workflow: assign to patient's record
      const patient = await prisma.patient.findUnique({
        where: { userId: req.user.id }
      });

      if (!patient) {
        throw new ApiError(404, 'Patient record not found');
      }
      patientId = patient.id;

      // Patients cannot upload with participantId
      if (participantId) {
        throw new ApiError(403, 'Only admins can upload tests with participantId');
      }
    }

    // Extract S3 keys from uploaded files
    const videoUrl = uploadedFiles.video?.key || null;
    const csvUrl = uploadedFiles.csv?.key || null;
    const questionsUrl = uploadedFiles.questions?.key || null;

    // Create test result record
    const normalizedTestType = normalizeTestType(rawTestType);

    const testResult = await prisma.testResult.create({
      data: {
        patientId,
        participantId: participantId || null,
        testId,
        testType: normalizedTestType,
        testDate: new Date(testDate),
        videoUrl,
        csvUrl,
        questionsUrl,
        metadata: metadata || null
      },
      include: {
        patient: patientId ? {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        } : undefined
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPLOAD_TEST_RESULT',
        resourceType: 'test_result',
        resourceId: testResult.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.status(201).json({
      status: 'success',
      data: { testResult }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get unassigned test results (Admin only)
 * GET /api/mobile/test-results/unassigned
 *
 * Returns tests that have been uploaded with participantId but not yet assigned to a patient
 */
export const getUnassignedTests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Not authenticated');
    }

    if (req.user.role !== 'ADMIN') {
      throw new ApiError(403, 'Admin access required');
    }

    const { participantId, testType, limit = '50', offset = '0' } = req.query;

    const where: any = {
      patientId: null,
      participantId: { not: null }
    };

    if (participantId) {
      where.participantId = participantId;
    }

    if (testType) {
      where.testType = testType;
    }

    const testResults = await prisma.testResult.findMany({
      where,
      orderBy: { testDate: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      select: {
        id: true,
        participantId: true,
        testId: true,
        testType: true,
        testDate: true,
        videoUrl: true,
        csvUrl: true,
        questionsUrl: true,
        metadata: true,
        createdAt: true,
        updatedAt: true
        // Explicitly NOT including patient relation since patientId is null
      }
    });

    const total = await prisma.testResult.count({ where });

    res.json({
      status: 'success',
      data: {
        testResults,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign test result to a patient (Admin only)
 * POST /api/mobile/test-results/:id/assign
 *
 * Assigns an unassigned test (with participantId) to an actual patient account
 */
export const assignTestToPatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { patientId } = req.body;

    if (!req.user) {
      throw new ApiError(401, 'Not authenticated');
    }

    if (req.user.role !== 'ADMIN') {
      throw new ApiError(403, 'Admin access required');
    }

    if (!patientId) {
      throw new ApiError(400, 'patientId is required');
    }

    // Verify test exists and is unassigned
    const testResult = await prisma.testResult.findUnique({
      where: { id }
    });

    if (!testResult) {
      throw new ApiError(404, 'Test result not found');
    }

    if (testResult.patientId) {
      throw new ApiError(400, 'Test result is already assigned to a patient');
    }

    if (!testResult.participantId) {
      throw new ApiError(400, 'Test result does not have a participantId');
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient not found');
    }

    // Assign test to patient
    const updatedTestResult = await prisma.testResult.update({
      where: { id },
      data: {
        patientId,
        assignedBy: req.user.id,
        assignedAt: new Date()
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
        userId: req.user.id,
        action: 'UPDATE_PATIENT',
        resourceType: 'test_result',
        resourceId: id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      status: 'success',
      message: `Test assigned to patient ${patient.user?.firstName} ${patient.user?.lastName}`,
      data: { testResult: updatedTestResult }
    });
  } catch (error) {
    next(error);
  }
};
