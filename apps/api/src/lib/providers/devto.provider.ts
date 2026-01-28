/**
 * Dev.to Provider
 * Scrapes Dev.to article metadata using their public API
 */

import type { ScrapedResource, ScrapeProvider, ScrapeOptions } from "@/types";
import {
  InvalidUrlError,
  PlatformApiError,
  ScrapeNotFoundError,
} from "@/lib/errors";

// Matches pathname pattern: /username/article-slug or /organization/article-slug
const DEVTO_PATHNAME_PATTERN = /^\/([^/]+)\/([^/?#]+)/;

interface DevToUrlParts {
  username: string;
  articleSlug: string;
}

function parseDevToUrl(url: string): DevToUrlParts | null {
  try {
    const parsed = new URL(url);
    // Verify protocol is HTTP/HTTPS
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    const hostname = parsed.hostname.toLowerCase();
    if (hostname !== "dev.to" && !hostname.endsWith(".dev.to")) {
      return null;
    }
    const match = parsed.pathname.match(DEVTO_PATHNAME_PATTERN);
    if (!match) return null;
    return { username: match[1]!, articleSlug: match[2]! };
  } catch {
    return null;
  }
}

export class DevToProvider implements ScrapeProvider {
  name = "devto";

  canHandle(url: string): boolean {
    return Boolean(parseDevToUrl(url));
  }

  async scrape(
    url: string,
    _options?: ScrapeOptions,
  ): Promise<ScrapedResource> {
    const urlParts = parseDevToUrl(url);

    if (!urlParts) {
      throw new InvalidUrlError("Invalid Dev.to article URL");
    }

    const { username, articleSlug } = urlParts;

    // Try the articles by path endpoint with timeout
    const controller = new AbortController();
    const timeoutMs = 5000; // Configurable timeout (5 seconds)
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        `https://dev.to/api/articles/${username}/${articleSlug}`,
        {
          headers: {
            "User-Agent": "10xcoder-scraper",
          },
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw new ScrapeNotFoundError(
            `Dev.to article not found: ${username}/${articleSlug}`,
          );
        }
        throw new PlatformApiError(`Dev.to API error: ${response.status}`);
      }

      const article = await response.json();

      // Normalize tags - Dev.to can return string or array
      let tags: string[] = [];
      if (Array.isArray(article.tag_list)) {
        tags = article.tag_list;
      } else if (typeof article.tag_list === "string") {
        tags = article.tag_list
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean);
      } else if (Array.isArray(article.tags)) {
        tags = article.tags;
      }

      return {
        title: article.title,
        description: article.description || null,
        image: article.social_image || article.cover_image || null,
        credits: article.user?.name || article.user?.username || null,
        url: article.url || url,

        suggestedResourceType: "blog",
        suggestedTags: tags,
        suggestedTechStack: [],

        platform: "devto",
        method: "api",
        cached: false,

        metadata: {
          readingTime: article.reading_time_minutes || undefined,
          publishedAt: article.published_at || undefined,
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        throw new PlatformApiError("Dev.to API request timed out");
      }

      // Re-throw other errors (including PlatformApiError from non-OK response)
      throw error;
    }
  }
}
