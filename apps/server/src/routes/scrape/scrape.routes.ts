import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

const tags = ["Scrape"];

// ── Shared schemas ───────────────────────────────

const PlaylistVideoItemSchema = z.object({
  position: z.number(),
  videoId: z.string(),
  title: z.string(),
  thumbnail: z.string(),
  duration: z.string().optional(),
});

const ScrapedResourceSchema = z.object({
  title: z.string(),
  description: z.string(),
  url: z.string(),
  image: z.union([z.string(), z.literal("")]),
  credits: z.string(),
  resourceType: z.enum(["video", "blog", "tool", "repo"]),
  language: z.literal("english"),
  tags: z.array(z.string()),
  techStack: z.array(z.string()),
  _meta: z.object({
    platform: z.enum(["youtube", "github", "devto", "hashnode", "generic"]),
    method: z.enum(["api", "graphql", "og_meta"]),
    cached: z.boolean(),
    videoId: z.string().optional(),
    channelUrl: z.string().optional(),
    duration: z.string().optional(),
    stats: z
      .object({
        views: z.number().optional(),
        likes: z.number().optional(),
        comments: z.number().optional(),
      })
      .optional(),
    playlistId: z.string().optional(),
    playlistTitle: z.string().optional(),
    videoCount: z.number().optional(),
    playlistVideos: z.array(PlaylistVideoItemSchema).optional(),
    repoName: z.string().optional(),
    stars: z.number().optional(),
    repoLanguage: z.string().optional(),
    topics: z.array(z.string()).optional(),
    readingTime: z.number().optional(),
    publishedAt: z.string().optional(),
    robots: z
      .object({
        fetched: z.boolean(),
        pageAllowed: z.boolean().nullable(),
        imageAllowed: z.boolean().nullable(),
        source: z.string(),
        reason: z.string().optional(),
      })
      .optional(),
  }),
});

const ScrapeErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum([
      "INVALID_URL",
      "SCRAPE_FAILED",
      "PLATFORM_ERROR",
      "RATE_LIMITED",
      "INTERNAL_ERROR",
      "UNAUTHORIZED",
    ]),
    message: z.string(),
  }),
});

// ── Routes ───────────────────────────────────────

export const scrapeUrl = createRoute({
  path: "/",
  method: "post",
  tags,
  summary: "Scrape URL for resource metadata",
  description:
    "Scrapes a URL and returns structured metadata for prefilling the resource creation form. Supports YouTube, GitHub, Dev.to, Hashnode, and generic websites.",
  request: {
    body: jsonContent(
      z.object({
        url: z.string().url().min(5),
      }),
      "URL to scrape",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.literal(true),
        data: ScrapedResourceSchema,
      }),
      "Scraped resource metadata",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      ScrapeErrorSchema,
      "Invalid URL",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      ScrapeErrorSchema,
      "Unauthorized",
    ),
    [HttpStatusCodes.TOO_MANY_REQUESTS]: jsonContent(
      ScrapeErrorSchema,
      "Rate limited",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      ScrapeErrorSchema,
      "Content not found",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      ScrapeErrorSchema,
      "Internal server error",
    ),
  },
});

export type ScrapeUrlRoute = typeof scrapeUrl;
