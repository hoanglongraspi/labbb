import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { uploadFile, getPresignedUrl, deleteFile } from '../utils/s3';
import { ApiError } from '../middleware/errorHandler';
import { generateSummary } from '../utils/openai';

const DEFAULT_SUMMARY_PROMPT = `You are an experienced clinical audiologist. Analyze the provided audiogram data to summarize the patient's hearing assessment using clear, empathetic language.
- If an audiogram image is provided, carefully examine the visual chart/graph for patterns
- Identify notable patterns (e.g., high-frequency loss, asymmetry, conductive vs sensorineural loss)
- Mention thresholds in broad terms (mild/moderate/severe, right vs left) without repeating every data point
- Compare visual and numerical data if both are available
- Offer practical guidance the patient can discuss with their clinician (communication tips, protection, next steps)
- Keep it under 200 words and use patient-friendly language

Note: Visual analysis is available only for PNG, JPEG, GIF, and WEBP image uploads. PDF files will be analyzed using numerical data only.`;

const buildSummaryPrompt = (params: {
  basePrompt?: string;
  hasImage?: boolean;
}) => {
  const { basePrompt, hasImage } = params;

  const prompt = basePrompt?.trim().length ? basePrompt : DEFAULT_SUMMARY_PROMPT;

  const imageNote = hasImage ? '\n\n[An audiogram image is attached for your visual analysis]' : '';

  return `${prompt}${imageNote}`;
};

const assertPatientCanAccess = (req: Request, patientUserId: string | null | undefined) => {
  if (!req.user) {
    throw new ApiError(401, 'Not authenticated');
  }

  if (req.user.role === 'PATIENT') {
    if (!patientUserId || patientUserId !== req.user.id) {
      throw new ApiError(403, 'Access denied to this audiogram');
    }
  }
};

export const uploadAudiogram = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;
    const { testDate, evaluationId, leftEarData, rightEarData } = req.body;

    if (!req.file) {
      throw new ApiError(400, 'No file uploaded');
    }

    // Check if patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      throw new ApiError(404, 'Patient not found');
    }

    // Upload file to S3
    const { fileUrl, key } = await uploadFile(req.file, 'audiograms', patientId);

    // Create audiogram record
    const audiogram = await prisma.audiogram.create({
      data: {
        patientId,
        evaluationId: evaluationId || null,
        testDate: new Date(testDate),
        fileUrl,
        fileType: req.file.mimetype,
        leftEarData: leftEarData ? JSON.parse(leftEarData) : null,
        rightEarData: rightEarData ? JSON.parse(rightEarData) : null,
        uploadedBy: req.user!.id
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
        },
        uploader: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'UPLOAD_AUDIOGRAM',
        resourceType: 'audiogram',
        resourceId: audiogram.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.status(201).json({
      status: 'success',
      data: { audiogram }
    });
  } catch (error) {
    next(error);
  }
};

export const getAudiogramsByPatient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientId } = req.params;

    if (req.user?.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { userId: true }
      });

      if (!patient || patient.userId !== req.user.id) {
        throw new ApiError(403, 'Access denied to this patient audiograms');
      }
    }

    const audiograms = await prisma.audiogram.findMany({
      where: { patientId },
      orderBy: { testDate: 'desc' },
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
            evaluationType: true,
            evaluationDate: true,
            conditionCategory: true,
            results: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      data: { audiograms }
    });
  } catch (error) {
    next(error);
  }
};

export const getAudiogram = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const audiogram = await prisma.audiogram.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            userId: true,
            medicalRecordNumber: true,
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        uploader: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        evaluation: {
          select: {
            id: true,
            evaluationType: true,
            evaluationDate: true,
            conditionCategory: true,
            results: true,
            notes: true
          }
        },
        summaryCreator: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!audiogram) {
      throw new ApiError(404, 'Audiogram not found');
    }

    assertPatientCanAccess(req, audiogram.patient?.userId);

    res.json({
      status: 'success',
      data: { audiogram }
    });
  } catch (error) {
    next(error);
  }
};

export const downloadAudiogram = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const audiogram = await prisma.audiogram.findUnique({
      where: { id },
      include: {
        patient: {
          select: { userId: true }
        }
      }
    });

    if (!audiogram) {
      throw new ApiError(404, 'Audiogram not found');
    }

    assertPatientCanAccess(req, audiogram.patient?.userId);

    // Generate presigned URL for download
    const downloadUrl = await getPresignedUrl(audiogram.fileUrl, 900); // 15 minutes

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'DOWNLOAD_AUDIOGRAM',
        resourceType: 'audiogram',
        resourceId: audiogram.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      status: 'success',
      data: { downloadUrl }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAudiogram = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const audiogram = await prisma.audiogram.findUnique({
      where: { id }
    });

    if (!audiogram) {
      throw new ApiError(404, 'Audiogram not found');
    }

    // Delete file from S3
    await deleteFile(audiogram.fileUrl);

    // Delete audiogram record
    await prisma.audiogram.delete({
      where: { id }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'DELETE_AUDIOGRAM',
        resourceType: 'audiogram',
        resourceId: id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      status: 'success',
      message: 'Audiogram deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const generateAudiogramSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { prompt, model, temperature, maxTokens } = req.body || {};

    const audiogram = await prisma.audiogram.findUnique({
      where: { id },
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
        },
        evaluation: {
          select: {
            evaluationType: true,
            conditionCategory: true,
            results: true,
            notes: true
          }
        }
      }
    });

    if (!audiogram) {
      throw new ApiError(404, 'Audiogram not found');
    }

    // Prepare image for OpenAI vision analysis (only for image files, not PDFs)
    const supportedImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    const isImageFile = !!(audiogram.fileType && supportedImageTypes.includes(audiogram.fileType.toLowerCase()));

    let imageUrl: string | undefined;

    if (isImageFile) {
      // Generate presigned URL for direct image files
      imageUrl = await getPresignedUrl(audiogram.fileUrl, 3600); // 1 hour expiry
    }
    // Note: PDF files are not converted to images due to platform compatibility issues
    // Visual analysis is only available for direct image uploads

    const composedPrompt = buildSummaryPrompt({
      basePrompt: prompt,
      hasImage: !!imageUrl
    });

    const summary = await generateSummary({
      prompt: composedPrompt,
      imageUrl,
      model,
      temperature,
      maxTokens
    });

    const updated = await prisma.audiogram.update({
      where: { id },
      data: {
        summary,
        summaryPrompt: composedPrompt,
        summaryGeneratedAt: new Date(),
        summaryGeneratedBy: req.user!.id
      },
      include: {
        summaryCreator: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'UPLOAD_AUDIOGRAM',
        resourceType: 'audiogram_summary',
        resourceId: updated.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      status: 'success',
      data: {
        summary: updated.summary,
        prompt: updated.summaryPrompt,
        generatedAt: updated.summaryGeneratedAt,
        generatedBy: updated.summaryCreator
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateAudiogramSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { summary, prompt } = req.body || {};

    if (!summary || typeof summary !== 'string') {
      throw new ApiError(400, 'Summary text is required');
    }

    const updated = await prisma.audiogram.update({
      where: { id },
      data: {
        summary,
        summaryPrompt: prompt ?? null,
        summaryGeneratedAt: new Date(),
        summaryGeneratedBy: req.user!.id
      },
      include: {
        summaryCreator: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'UPLOAD_AUDIOGRAM',
        resourceType: 'audiogram_summary',
        resourceId: updated.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({
      status: 'success',
      data: {
        summary: updated.summary,
        prompt: updated.summaryPrompt,
        generatedAt: updated.summaryGeneratedAt,
        generatedBy: updated.summaryCreator
      }
    });
  } catch (error) {
    next(error);
  }
};
