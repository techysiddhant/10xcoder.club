/**
 * Scrape Controller
 * Handles the scrape endpoint request/response
 */

import type { Context } from 'elysia'
import { scrapeUrl } from '@/services/scrape.service'
import type { ScrapedResource } from '@/lib/providers'

interface ScrapeContext {
  body: {
    url: string
  }
  user: {
    id: string
  }
  set: Context['set']
}

// Error codes for client-side handling
type ScrapeErrorCode =
  | 'INVALID_URL'
  | 'SCRAPE_FAILED'
  | 'PLATFORM_ERROR'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'

interface ScrapeError {
  success: false
  error: {
    code: ScrapeErrorCode
    message: string
  }
}

// Frontend-friendly resource types
type FrontendResourceType = 'video' | 'blog' | 'tool' | 'repo'

/**
 * Map internal resource types to frontend-friendly types
 */
function mapResourceType(
  internalType: ScrapedResource['suggestedResourceType']
): FrontendResourceType {
  switch (internalType) {
    case 'youtube_video':
    case 'youtube_playlist':
      return 'video'
    case 'github_repo':
      return 'repo'
    case 'blog':
      return 'blog'
    case 'ai_tool':
      return 'tool'
    default:
      return 'blog'
  }
}

/**
 * Transform scrape result to frontend-friendly format
 */
function transformToFrontendFormat(result: ScrapedResource) {
  return {
    // Core fields matching resource creation body
    title: result.title,
    description: result.description ?? '',
    url: result.url,
    image: result.image ?? '',
    credits: result.credits ?? '',
    resourceType: mapResourceType(result.suggestedResourceType),
    language: 'english' as const,
    tags: result.suggestedTags,
    techStack: result.suggestedTechStack,

    // Additional metadata for display
    _meta: {
      platform: result.platform,
      method: result.method,
      cached: result.cached,
      ...result.metadata
    }
  }
}

/**
 * Scrape a URL and return metadata for resource form prefilling
 */
export async function scrape({ body, user, set }: ScrapeContext) {
  try {
    const { url } = body
    const userId = user.id

    // Validate URL format
    let normalizedUrl: URL
    try {
      // Add protocol if missing
      const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`
      normalizedUrl = new URL(urlWithProtocol)
    } catch {
      set.status = 400
      return {
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'Please enter a valid URL (e.g., https://youtube.com/watch?v=...)'
        }
      } satisfies ScrapeError
    }

    // Scrape the URL
    const result = await scrapeUrl(normalizedUrl.href, userId)

    // Transform to frontend-friendly format
    set.status = 200
    return {
      success: true as const,
      data: transformToFrontendFormat(result)
    }
  } catch (error) {
    console.error('Scrape error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Determine error code based on message
    let code: ScrapeErrorCode = 'INTERNAL_ERROR'
    let userMessage = 'Failed to scrape the URL. Please try again later.'

    if (errorMessage.includes('not found')) {
      code = 'SCRAPE_FAILED'
      userMessage = 'Content not found. Please check the URL and try again.'
    } else if (errorMessage.includes('API error')) {
      code = 'PLATFORM_ERROR'
      userMessage = 'The platform API returned an error. Please try again later.'
    } else if (errorMessage.includes('rate limit')) {
      code = 'RATE_LIMITED'
      userMessage = 'Too many requests. Please wait a moment and try again.'
      set.status = 429
      return {
        success: false,
        error: { code, message: userMessage }
      } satisfies ScrapeError
    } else if (errorMessage.includes('Invalid')) {
      code = 'INVALID_URL'
      userMessage = errorMessage
      set.status = 400
      return {
        success: false,
        error: { code, message: userMessage }
      } satisfies ScrapeError
    }

    set.status = 500
    return {
      success: false,
      error: {
        code,
        message: userMessage
      }
    } satisfies ScrapeError
  }
}
