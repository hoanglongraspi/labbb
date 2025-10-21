import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

// Configure AWS SDK
const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'patient-portal-files';

export interface UploadResult {
  fileUrl: string;
  key: string;
}

/**
 * Upload a file to S3
 */
export const uploadFile = async (
  file: Express.Multer.File,
  folder: string,
  patientId: string
): Promise<UploadResult> => {
  const fileExtension = file.originalname.split('.').pop();
  const fileName = `${uuidv4()}.${fileExtension}`;
  const key = `${folder}/${patientId}/${fileName}`;

  const params: AWS.S3.PutObjectRequest = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    ServerSideEncryption: 'AES256',
    Metadata: {
      originalName: file.originalname,
      uploadDate: new Date().toISOString()
    }
  };

  try {
    await s3.putObject(params).promise();
  } catch (error: any) {
    if (error.code === 'InvalidAccessKeyId' || error.code === 'SignatureDoesNotMatch') {
      throw new Error('Unable to upload file to S3. Please verify AWS credentials.');
    }
    throw error;
  }

  return {
    fileUrl: key,
    key
  };
};

/**
 * Upload an education PDF to S3 (no patient ID required)
 */
export const uploadEducationPDF = async (
  file: Express.Multer.File
): Promise<UploadResult> => {
  const fileExtension = file.originalname.split('.').pop();
  const fileName = `${uuidv4()}.${fileExtension}`;
  const key = `education-pdfs/${fileName}`;

  const params: AWS.S3.PutObjectRequest = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    ServerSideEncryption: 'AES256',
    Metadata: {
      originalName: file.originalname,
      uploadDate: new Date().toISOString()
    }
  };

  try {
    await s3.putObject(params).promise();
  } catch (error: any) {
    if (error.code === 'InvalidAccessKeyId' || error.code === 'SignatureDoesNotMatch') {
      throw new Error('Unable to upload file to S3. Please verify AWS credentials.');
    }
    throw error;
  }

  return {
    fileUrl: key,
    key
  };
};

/**
 * Generate a presigned URL for secure file download
 */
export const getPresignedUrl = async (key: string, expiresIn: number = 900): Promise<string> => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Expires: expiresIn // Default 15 minutes
  };

  return s3.getSignedUrlPromise('getObject', params);
};

/**
 * Generate a presigned URL for direct file upload from mobile
 */
export const getPresignedUploadUrl = async (
  key: string,
  contentType: string,
  expiresIn: number = 3600 // 1 hour for uploads
): Promise<string> => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Expires: expiresIn,
    ContentType: contentType,
    ServerSideEncryption: 'AES256'
  };

  return s3.getSignedUrlPromise('putObject', params);
};

/**
 * Generate presigned URLs for multipart upload (for large files)
 */
export const initializeMultipartUpload = async (
  key: string,
  contentType: string
): Promise<{ uploadId: string; key: string }> => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ServerSideEncryption: 'AES256' as const
  };

  const result = await s3.createMultipartUpload(params).promise();

  if (!result.UploadId) {
    throw new Error('Failed to initialize multipart upload');
  }

  return {
    uploadId: result.UploadId,
    key
  };
};

/**
 * Get presigned URL for uploading a part in multipart upload
 */
export const getMultipartUploadUrl = async (
  key: string,
  uploadId: string,
  partNumber: number,
  expiresIn: number = 3600
): Promise<string> => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
    Expires: expiresIn
  };

  return s3.getSignedUrlPromise('uploadPart', params);
};

/**
 * Complete multipart upload
 */
export const completeMultipartUpload = async (
  key: string,
  uploadId: string,
  parts: { ETag: string; PartNumber: number }[]
): Promise<void> => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts
    }
  };

  await s3.completeMultipartUpload(params).promise();
};

/**
 * Abort multipart upload (cleanup on failure)
 */
export const abortMultipartUpload = async (
  key: string,
  uploadId: string
): Promise<void> => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    UploadId: uploadId
  };

  await s3.abortMultipartUpload(params).promise();
};

/**
 * Delete a file from S3
 */
export const deleteFile = async (key: string): Promise<void> => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key
  };

  await s3.deleteObject(params).promise();
};

/**
 * Check if a file exists in S3
 */
export const fileExists = async (key: string): Promise<boolean> => {
  try {
    await s3
      .headObject({
        Bucket: BUCKET_NAME,
        Key: key
      })
      .promise();
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get file metadata
 */
export const getFileMetadata = async (key: string) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key
  };

  return s3.headObject(params).promise();
};

export { s3, BUCKET_NAME };
