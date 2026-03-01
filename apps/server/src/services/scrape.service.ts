/**
 * Scrape Service
 * Main service for URL scraping with caching and provider selection
 */

import { eq, and } from "drizzle-orm";
import { account } from "@workspace/database";

import { db } from "@/db/index";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { getProviderForUrl } from "@/lib/providers";
import type { ScrapedResource } from "@/types/scrape";

// ── Constants ────────────────────────────────────

const CACHE_PREFIX = "scrape:";
const CACHE_TTL = 60 * 60 * 24; // 24 hours

// ── Helpers ──────────────────────────────────────

/**
 * Generate a cache key for the given URL.
 * Returns null if the result should not be cached (e.g., GitHub authenticated scrapes).
 */
function getCacheKey(
  url: string,
  isGitHubAuthenticated: boolean,
): string | null {
  // Skip caching for GitHub authenticated scrapes (user-specific results)
  if (isGitHubAuthenticated) {
    return null;
  }

  let normalized: string;
  try {
    const parsed = new URL(url.trim());
    parsed.username = "";
    parsed.password = "";
    parsed.hostname = parsed.hostname.toLowerCase();

    // Remove default ports
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

    // Sort query parameters deterministically
    if (parsed.search) {
      const params = new URLSearchParams(parsed.search);
      const sortedParams = new URLSearchParams();
      const uniqueKeys = Array.from(new Set(Array.from(params.keys())));
      uniqueKeys.sort().forEach((key) => {
        const values = params.getAll(key).sort();
        values.forEach((value) => {
          sortedParams.append(key, value);
        });
      });
      parsed.search = sortedParams.toString();
    }

    normalized = parsed.toString();
  } catch {
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
  return Boolean(result.title && result.title.trim().length > 0);
}

// ── Service ──────────────────────────────────────

/**
 * Scrape a URL and return structured metadata
 */
export async function scrapeUrl(
  url: string,
  userId: string,
): Promise<ScrapedResource> {
  // 1. Get the appropriate provider for this URL
  const provider = getProviderForUrl(url);
  logger.debug({ url, provider: provider.name }, "Selected scrape provider");

  // 2. Get GitHub token if needed
  let githubAccessToken: string | undefined;
  if (provider.name === "github") {
    githubAccessToken = await getGitHubAccessToken(userId);
  }

  // 3. Check cache (skip for GitHub authenticated scrapes)
  const isGitHubAuthenticated = Boolean(githubAccessToken);
  const cacheKey = getCacheKey(url, isGitHubAuthenticated);

  if (cacheKey) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as ScrapedResource;
        logger.debug({ url, cacheKey }, "Returning cached scrape result");
        return { ...parsed, cached: true };
      }
    } catch (error) {
      logger.error({ cacheKey, error }, "Error reading cached scrape result");
    }
  }

  // 4. Scrape the URL
  const result = await provider.scrape(url, { githubAccessToken });

  // 5. Cache the result if valid
  if (cacheKey && isValidScrapeResult(result)) {
    try {
      await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL);
      logger.debug({ url, cacheKey }, "Cached scrape result");
    } catch (error) {
      logger.error({ cacheKey, error }, "Error writing scrape result to cache");
    }
  }

  return result;
}
