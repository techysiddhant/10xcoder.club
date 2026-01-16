/**
 * Custom error classes for scrape operations
 * These errors include a stable code property for reliable error handling
 */

export type ScrapeErrorCode =
  | 'INVALID_URL'
  | 'SCRAPE_FAILED'
  | 'PLATFORM_ERROR'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'

/**
 * Base class for scrape errors with a stable code property
 */
export class ScrapeError extends Error {
  constructor(
    public readonly code: ScrapeErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'ScrapeError'
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

/**
 * Error thrown when content is not found (404, empty results, etc.)
 */
export class ScrapeNotFoundError extends ScrapeError {
  constructor(message: string, cause?: unknown) {
    super('SCRAPE_FAILED', message, cause)
    this.name = 'ScrapeNotFoundError'
  }
}

/**
 * Error thrown when a platform API returns an error
 */
export class PlatformApiError extends ScrapeError {
  constructor(message: string, cause?: unknown) {
    super('PLATFORM_ERROR', message, cause)
    this.name = 'PlatformApiError'
  }
}

/**
 * Error thrown when rate limits are exceeded
 */
export class RateLimitError extends ScrapeError {
  constructor(message: string, cause?: unknown) {
    super('RATE_LIMITED', message, cause)
    this.name = 'RateLimitError'
  }
}

/**
 * Error thrown when URL is invalid or malformed
 */
export class InvalidUrlError extends ScrapeError {
  constructor(message: string, cause?: unknown) {
    super('INVALID_URL', message, cause)
    this.name = 'InvalidUrlError'
  }
}

/**
 * Mapping from error codes to user-facing messages
 */
export const ERROR_CODE_TO_MESSAGE: Record<ScrapeErrorCode, string> = {
  INVALID_URL: 'Please enter a valid URL (e.g., https://youtube.com/watch?v=...)',
  SCRAPE_FAILED: 'Content not found. Please check the URL and try again.',
  PLATFORM_ERROR: 'The platform API returned an error. Please try again later.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  INTERNAL_ERROR: 'Failed to scrape the URL. Please try again later.'
}

/**
 * Get user-facing message for an error code
 */
export function getUserMessageForErrorCode(code: ScrapeErrorCode): string {
  return ERROR_CODE_TO_MESSAGE[code]
}

/**
 * Get HTTP status code for an error code
 */
export function getStatusForErrorCode(code: ScrapeErrorCode): number {
  switch (code) {
    case 'INVALID_URL':
      return 400
    case 'RATE_LIMITED':
      return 429
    case 'SCRAPE_FAILED':
      return 404
    case 'PLATFORM_ERROR':
    case 'INTERNAL_ERROR':
    default:
      return 500
  }
}
