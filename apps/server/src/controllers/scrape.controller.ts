/**
 * Scrape Controller
 * Handles the scrape endpoint request/response
 */

import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "../lib/types";
import type { ScrapeUrlRoute } from "../routes/scrape/scrape.routes";

import { scrapeUrl } from "../services/scrape.service";
import { logger } from "../lib/logger";
import {
  ScrapeError,
  getUserMessageForErrorCode,
  getStatusForErrorCode,
  type ScrapeErrorCode,
} from "../lib/errors";
import type { ScrapedResource } from "../types/scrape";

// ── Helpers ──────────────────────────────────────

/** Transform scrape result to frontend-friendly format */
function transformToFrontendFormat(result: ScrapedResource) {
  return {
    title: result.title,
    description: result.description ?? "",
    url: result.url,
    image: result.image ?? "",
    credits: result.credits ?? "",
    resourceType: result.suggestedResourceType,
    language: "english" as const,
    tags: result.suggestedTags,
    techStack: result.suggestedTechStack,

    _meta: {
      ...result.metadata,
      platform: result.platform,
      method: result.method,
      cached: result.cached,
    },
  };
}

// ── Handler ──────────────────────────────────────

export const scrape: AppRouteHandler<ScrapeUrlRoute> = async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json(
      {
        success: false as const,
        error: {
          code: "UNAUTHORIZED" as const,
          message: "Authentication required",
        },
      },
      HttpStatusCodes.UNAUTHORIZED,
    );
  }

  try {
    const { url } = c.req.valid("json");

    // Validate and normalize URL
    let normalizedUrl: URL;
    try {
      const urlWithProtocol = /^https?:\/\//i.test(url)
        ? url
        : `https://${url}`;
      normalizedUrl = new URL(urlWithProtocol);
    } catch {
      return c.json(
        {
          success: false as const,
          error: {
            code: "INVALID_URL" as const,
            message:
              "Please enter a valid URL (e.g., https://youtube.com/watch?v=...)",
          },
        },
        HttpStatusCodes.BAD_REQUEST,
      );
    }

    // Scrape the URL
    const result = await scrapeUrl(normalizedUrl.href, user.id);

    return c.json(
      {
        success: true as const,
        data: transformToFrontendFormat(result),
      },
      HttpStatusCodes.OK,
    );
  } catch (error) {
    logger.error({ error }, "Scrape error");

    let code: ScrapeErrorCode = "INTERNAL_ERROR";
    if (error instanceof ScrapeError) {
      code = error.code;
    }

    const userMessage = getUserMessageForErrorCode(code);
    const status = getStatusForErrorCode(code);

    return c.json(
      {
        success: false as const,
        error: {
          code,
          message: userMessage,
        },
      },
      status as 400 | 404 | 429 | 500,
    );
  }
};
