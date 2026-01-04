import { env } from '@/config/env'

/**
 * Validates that a URL is safe to use in emails (anti-phishing protection).
 * - Enforces HTTPS scheme only
 * - Validates against trusted origins from env config
 * - Rejects URLs with unexpected characters or suspicious patterns
 */
export function validateEmailUrl(url: string): {
  isValid: boolean
  sanitizedUrl: string | null
  error?: string
} {
  try {
    const parsed = new URL(url)

    // Enforce HTTPS only (except localhost for development)
    const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
    if (parsed.protocol !== 'https:' && !(isLocalhost && parsed.protocol === 'http:')) {
      return { isValid: false, sanitizedUrl: null, error: `Invalid URL scheme: ${parsed.protocol}` }
    }

    // Get trusted origins from env
    const trustedOrigins = getTrustedOrigins()

    // Check if the URL hostname matches any trusted origin
    const isTrusted = trustedOrigins.some((origin) => {
      try {
        const trustedUrl = new URL(origin)
        return parsed.hostname === trustedUrl.hostname
      } catch {
        // If origin isn't a valid URL, try direct hostname comparison
        return parsed.hostname === origin
      }
    })

    if (!isTrusted) {
      return {
        isValid: false,
        sanitizedUrl: null,
        error: `Untrusted hostname: ${parsed.hostname}`
      }
    }

    // Check for suspicious patterns (embedded credentials, javascript:, data:, etc.)
    if (parsed.username || parsed.password) {
      return { isValid: false, sanitizedUrl: null, error: 'URL contains embedded credentials' }
    }

    // Normalize the URL to prevent encoding tricks
    const sanitizedUrl = parsed.toString()

    return { isValid: true, sanitizedUrl }
  } catch (e) {
    return {
      isValid: false,
      sanitizedUrl: null,
      error: `Invalid URL format: ${e instanceof Error ? e.message : 'Unknown error'}`
    }
  }
}

/**
 * Get the list of trusted origins from environment configuration.
 * Includes API_URL and any configured CORS origins.
 */
function getTrustedOrigins(): string[] {
  const origins: string[] = []

  if (env.API_URL) {
    origins.push(env.API_URL)
  }

  if (env.CORS_ORIGIN) {
    const corsOrigins = env.CORS_ORIGIN.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    origins.push(...corsOrigins)
  }

  return origins
}

/**
 * Validates a URL and throws an error if invalid.
 * Use this when you want to halt execution on invalid URLs.
 */
export function assertValidEmailUrl(url: string): string {
  const result = validateEmailUrl(url)
  if (!result.isValid || !result.sanitizedUrl) {
    throw new Error(`Email URL validation failed: ${result.error}`)
  }
  return result.sanitizedUrl
}
