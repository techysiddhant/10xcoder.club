/**
 * Scrape Service
 * Main service for URL scraping with caching and provider selection
 */

import { db } from '@/db'
import { account } from '@/db/schema'
import { redis } from '@/lib/redis'
import { getProviderForUrl, type ScrapedResource } from '@/lib/providers'
import { eq, and } from 'drizzle-orm'

const CACHE_PREFIX = 'scrape:'
const CACHE_TTL = 60 * 60 * 24 // 24 hours in seconds

/**
 * Generate a hash key for caching
 * Returns null if the result should not be cached (e.g., GitHub authenticated scrapes)
 */
function getCacheKey(url: string, isGitHubAuthenticated: boolean): string | null {
  // Skip caching for GitHub authenticated scrapes to prevent serving user-specific results
  if (isGitHubAuthenticated) {
    return null
  }

  // Simple hash using the URL
  const normalized = url.toLowerCase().trim()
  return `${CACHE_PREFIX}${Buffer.from(normalized).toString('base64url')}`
}

/**
 * Get GitHub access token for a user (if they have linked their GitHub account)
 */
async function getGitHubAccessToken(userId: string): Promise<string | undefined> {
  const githubAccount = await db
    .select({ accessToken: account.accessToken })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, 'github')))
    .limit(1)

  return githubAccount[0]?.accessToken ?? undefined
}

/**
 * Check if the scrape result is valid (has meaningful data)
 */
function isValidScrapeResult(result: ScrapedResource): boolean {
  // Must have at least a title to be considered valid
  return Boolean(result.title && result.title.trim().length > 0)
}

/**
 * Scrape a URL and return structured metadata
 */
export async function scrapeUrl(url: string, userId: string): Promise<ScrapedResource> {
  // 1. Get the appropriate provider for this URL
  const provider = getProviderForUrl(url)

  // 2. Get GitHub token if needed (for GitHub provider)
  let githubAccessToken: string | undefined
  if (provider.name === 'github') {
    githubAccessToken = await getGitHubAccessToken(userId)
  }

  // 3. Determine if this is a GitHub authenticated scrape (should not be cached)
  const isGitHubAuthenticated = Boolean(githubAccessToken)
  const cacheKey = getCacheKey(url, isGitHubAuthenticated)

  // 4. Check Redis cache first (only if cacheable)
  if (cacheKey) {
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached) as ScrapedResource
        return { ...parsed, cached: true }
      }
    } catch {
      // Cache miss or parse error, continue with scraping
    }
  }

  // 5. Scrape the URL (throws on failure)
  const result = await provider.scrape(url, { githubAccessToken })

  // 6. Only cache successful results with valid data (and if cacheable)
  if (cacheKey && isValidScrapeResult(result)) {
    try {
      await redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL)
    } catch {
      // Cache write failed, continue anyway
    }
  }

  return result
}
