import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "../config/env";
import { logger } from "../lib/logger";
import { s3Client, S3_BUCKET } from "../lib/s3";

// ── Constants ────────────────────────────────────

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
] as const;

type AllowedType = (typeof ALLOWED_TYPES)[number];

export const ALLOWED_FOLDERS = ["resources", "profiles"] as const;
export type AllowedFolder = (typeof ALLOWED_FOLDERS)[number];

/** Max file size: 2MB */
const MAX_FILE_SIZE = 2 * 1024 * 1024;

/** Presigned URL expiry: 5 minutes */
const PRESIGNED_URL_EXPIRY = 60 * 5;

// ── Types ────────────────────────────────────────

export interface PresignedUrlInput {
  fileName: string;
  fileType: string;
  fileSize: number;
  folder: AllowedFolder;
}

export interface PresignedUrlResult {
  uploadUrl: string;
  key: string;
  expiresIn: number;
  imageUrl?: string;
}

export type UploadErrorType = "VALIDATION_ERROR" | "INTERNAL_ERROR";

type UploadSuccess = { success: true; data: PresignedUrlResult };
type UploadFailure = {
  success: false;
  error: string;
  errorType: UploadErrorType;
};

// ── Service ──────────────────────────────────────

export async function getPresignedUploadUrl(
  input: PresignedUrlInput,
  userId: string,
): Promise<UploadSuccess | UploadFailure> {
  const { fileName, fileType, fileSize, folder } = input;

  if (!ALLOWED_FOLDERS.includes(folder as AllowedFolder)) {
    return {
      success: false,
      error: `Invalid folder. Allowed: ${ALLOWED_FOLDERS.join(", ")}`,
      errorType: "VALIDATION_ERROR",
    };
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(fileType as AllowedType)) {
    return {
      success: false,
      error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}`,
      errorType: "VALIDATION_ERROR",
    };
  }

  // Validate file size
  if (fileSize <= 0) {
    return {
      success: false,
      error: "File too small or invalid",
      errorType: "VALIDATION_ERROR",
    };
  }

  if (fileSize > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      errorType: "VALIDATION_ERROR",
    };
  }

  // Generate unique S3 key: folder/userId/timestamp-sanitizedFileName
  const timestamp = Date.now();
  let sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");

  if (!sanitizedFileName || sanitizedFileName.trim().length === 0) {
    sanitizedFileName = crypto.randomUUID().slice(0, 8);
  }

  let sanitizedUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!sanitizedUserId) {
    sanitizedUserId = crypto.randomUUID().slice(0, 8);
  }

  const key = `${folder}/${sanitizedUserId}/${timestamp}-${sanitizedFileName}`;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: fileType,
    ContentLength: fileSize,
  });

  try {
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: PRESIGNED_URL_EXPIRY,
    });

    const data: PresignedUrlResult = {
      uploadUrl,
      key,
      expiresIn: PRESIGNED_URL_EXPIRY,
    };

    // For profile images, also return the public CDN URL
    if (folder === "profiles") {
      if (!env.CDN_URL || typeof env.CDN_URL !== "string") {
        logger.error("CDN_URL is missing but required for profile images");
        return {
          success: false,
          error: "Server configuration error",
          errorType: "INTERNAL_ERROR",
        };
      }
      const cdnBase = env.CDN_URL.replace(/\/$/, "");
      data.imageUrl = `${cdnBase}/${key}`;
    }

    return { success: true, data };
  } catch (error) {
    logger.error({ err: error }, "Failed to generate presigned URL");
    return {
      success: false,
      error: "Failed to generate upload URL",
      errorType: "INTERNAL_ERROR",
    };
  }
}
