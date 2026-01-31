/**
 * Scrape Service
 * Main service for URL scraping with caching and provider selection
 */

import { db } from "@/db";
import { account } from "@workspace/database";
import { redis } from "@/lib/redis";
import { getProviderForUrl } from "@/lib/providers";
import type { ScrapedResource } from "@/types";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";

const CACHE_PREFIX = "scrape:";
const CACHE_TTL = 60 * 60 * 24; // 24 hours in seconds

/**
 * Generate a hash key for caching
 * Returns null if the result should not be cached (e.g., GitHub authenticated scrapes)
 */
function getCacheKey(
  url: string,
  isGitHubAuthenticated: boolean,
): string | null {
  // Skip caching for GitHub authenticated scrapes to prevent serving user-specific results
  if (isGitHubAuthenticated) {
    return null;
  }

  // Normalize URL using URL API with comprehensive normalization
  let normalized: string;
  try {
    const parsed = new URL(url.trim());
    parsed.username = "";
    parsed.password = "";
    // Lower-case the hostname
    parsed.hostname = parsed.hostname.toLowerCase();

    // Remove default ports (80 for HTTP, 443 for HTTPS)
    if (
      (parsed.protocol === "http:" && parsed.port === "80") ||
      (parsed.protocol === "https:" && parsed.port === "443")
    ) {
      parsed.port = "";
    }

    // Normalize pathname: remove trailing slash unless root
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    // Remove fragment
    parsed.hash = "";

    // Sort and re-serialize query parameters deterministically
    if (parsed.search) {
      const params = new URLSearchParams(parsed.search);
      // URLSearchParams automatically handles percent-encoding consistently
      // Sort by key for deterministic ordering
      const sortedParams = new URLSearchParams();
      // Deduplicate keys first to prevent processing the same key multiple times
      const uniqueKeys = Array.from(new Set(Array.from(params.keys())));
      uniqueKeys.sort().forEach((key) => {
        // Get all values for this key and sort them
        const values = params.getAll(key).sort();
        values.forEach((value) => {
          sortedParams.append(key, value);
        });
      });
      parsed.search = sortedParams.toString();
    }

    // Re-serialize the URL (this will percent-encode consistently)
    normalized = parsed.toString();
  } catch {
    // Fall back to original naive normalization on malformed URLs
    normalized = url.toLowerCase().trim();
  }

  return `${CACHE_PREFIX}${Buffer.from(normalized).toString("base64url")}`;
}

/**
 * Get GitHub access token for a user (if they have linked their GitHub account)
 */
async function getGitHubAccessToken(
  userId: string,
): Promise<string | undefined> {
  const githubAccount = await db
    .select({ accessToken: account.accessToken })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "github")))
    .limit(1);

  return githubAccount[0]?.accessToken ?? undefined;
}

/**
 * Check if the scrape result is valid (has meaningful data)
 */
function isValidScrapeResult(result: ScrapedResource): boolean {
  // Must have at least a title to be considered valid
  return Boolean(result.title && result.title.trim().length > 0);
}

/**
 * Scrape a URL and return structured metadata
 */
export async function scrapeUrl(
  url: string,
  userId: string,
): Promise<ScrapedResource> {
  // 1. Get the appropriate provider for this URL
  const provider = getProviderForUrl(url);

  // 2. Get GitHub token if needed (for GitHub provider)
  let githubAccessToken: string | undefined;
  if (provider.name === "github") {
    githubAccessToken = await getGitHubAccessToken(userId);
  }

  // 3. Determine if this is a GitHub authenticated scrape (should not be cached)
  const isGitHubAuthenticated = Boolean(githubAccessToken);
  const cacheKey = getCacheKey(url, isGitHubAuthenticated);

  if (cacheKey) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as ScrapedResource;
        return { ...parsed, cached: true };
      }
    } catch (error) {
      logger.error({ cacheKey, error }, "Error reading cached scrape result");
    }
  }

  const result = await provider.scrape(url, { githubAccessToken });

  if (cacheKey && isValidScrapeResult(result)) {
    try {
      await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
    } catch (error) {
      logger.error({ cacheKey, error }, "Error writing scrape result to cache");
    }
  }

  return result;
}
