import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3Client, S3_BUCKET } from '@/lib/s3'
import { logger } from '@/lib/logger'

// Allowed file types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'] as const
type AllowedType = (typeof ALLOWED_TYPES)[number]

// Allowed folder names
export const ALLOWED_FOLDERS = ['resources', 'profiles'] as const
export type AllowedFolder = (typeof ALLOWED_FOLDERS)[number]

// Max file size: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024

interface GetPresignedUrlInput {
  fileName: string
  fileType: string
  fileSize: number
  folder: AllowedFolder
}

interface PresignedUrlResult {
  uploadUrl: string
  key: string
  expiresIn: number
}

// Error types for distinguishing validation vs internal errors
export type UploadErrorType = 'VALIDATION_ERROR' | 'INTERNAL_ERROR'

/**
 * Generate a presigned URL for uploading to S3
 */
export async function getPresignedUploadUrl(
  input: GetPresignedUrlInput,
  userId: string
): Promise<
  | { success: true; data: PresignedUrlResult }
  | { success: false; error: string; errorType: UploadErrorType }
> {
  const { fileName, fileType, fileSize, folder } = input

  // Validate file type
  if (!ALLOWED_TYPES.includes(fileType as AllowedType)) {
    return {
      success: false,
      error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`,
      errorType: 'VALIDATION_ERROR'
    }
  }

  // Validate file size
  if (fileSize <= 0) {
    return {
      success: false,
      error: 'File too small or invalid',
      errorType: 'VALIDATION_ERROR'
    }
  }
  if (fileSize > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      errorType: 'VALIDATION_ERROR'
    }
  }

  // Generate unique key
  const timestamp = Date.now()
  let sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')

  // Fallback to a safe value if sanitized filename is empty
  if (!sanitizedFileName || sanitizedFileName.trim().length === 0) {
    sanitizedFileName = crypto.randomUUID().slice(0, 8)
  }

  const key = `${folder}/${userId}/${timestamp}-${sanitizedFileName}`

  // Create presigned URL
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: fileType,
    ContentLength: fileSize
  })

  const expiresIn = 60 * 5 // 5 minutes

  try {
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn })

    return {
      success: true,
      data: {
        uploadUrl,
        key,
        expiresIn
      }
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to generate presigned URL')
    return { success: false, error: 'Failed to generate upload URL', errorType: 'INTERNAL_ERROR' }
  }
}
