/**
 * Scrape Controller
 * Handles the scrape endpoint request/response
 */

import type { Context } from "elysia";
import { scrapeUrl } from "@/services/scrape.service";
import type { ScrapedResource } from "@/types";
import { logger } from "@/lib/logger";
import {
  ScrapeError,
  getUserMessageForErrorCode,
  getStatusForErrorCode,
  type ScrapeErrorCode,
} from "@/lib/errors";

interface ScrapeContext {
  body: {
    url: string;
  };
  user: {
    id: string;
  };
  set: Context["set"];
}

interface ScrapeErrorResponse {
  success: false;
  error: {
    code: ScrapeErrorCode;
    message: string;
  };
}

/**
 * Transform scrape result to frontend-friendly format
 */
function transformToFrontendFormat(result: ScrapedResource) {
  return {
    // Core fields matching resource creation body
    title: result.title,
    description: result.description ?? "",
    url: result.url,
    image: result.image ?? "",
    credits: result.credits ?? "",
    resourceType: result.suggestedResourceType,
    language: "english" as const,
    tags: result.suggestedTags,
    techStack: result.suggestedTechStack,

    // Additional metadata for display
    _meta: {
      platform: result.platform,
      method: result.method,
      cached: result.cached,
      ...result.metadata,
    },
  };
}

/**
 * Scrape a URL and return metadata for resource form prefilling
 */
export async function scrape({ body, user, set }: ScrapeContext) {
  try {
    const { url } = body;
    const userId = user.id;

    // Validate URL format
    let normalizedUrl: URL;
    try {
      // Add protocol if missing (only accept strings starting with http:// or https://)
      const urlWithProtocol = /^https?:\/\//i.test(url)
        ? url
        : `https://${url}`;
      normalizedUrl = new URL(urlWithProtocol);
    } catch {
      set.status = 400;
      return {
        success: false,
        error: {
          code: "INVALID_URL",
          message:
            "Please enter a valid URL (e.g., https://youtube.com/watch?v=...)",
        },
      } satisfies ScrapeErrorResponse;
    }

    // Scrape the URL
    const result = await scrapeUrl(normalizedUrl.href, userId);

    // Transform to frontend-friendly format
    set.status = 200;
    return {
      success: true as const,
      data: transformToFrontendFormat(result),
    };
  } catch (error) {
    logger.error({ error }, "Scrape error");

    // Check if error is a ScrapeError with a code property
    let code: ScrapeErrorCode = "INTERNAL_ERROR";
    if (error instanceof ScrapeError) {
      code = error.code;
    }

    // Get user-facing message and HTTP status from error code
    const userMessage = getUserMessageForErrorCode(code);
    const status = getStatusForErrorCode(code);

    set.status = status;
    return {
      success: false,
      error: {
        code,
        message: userMessage,
      },
    } satisfies ScrapeErrorResponse;
  }
}
