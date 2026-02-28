import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

const tags = ["Admin - Email Jobs"];

// ── Shared schemas ───────────────────────────────

const EmailJobStatsSchema = z.object({
  queue: z.string(),
  counts: z.object({
    waiting: z.number(),
    active: z.number(),
    completed: z.number(),
    failed: z.number(),
    delayed: z.number(),
  }),
});

const FailedEmailJobSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["verification", "reset-password", "magic-link"]),
  to: z.string(),
  subject: z.string(),
  attempts: z.number(),
  failedReason: z.string().optional(),
  timestamp: z.number().optional(),
  finishedOn: z.number().optional(),
});

const ErrorSchema = z.object({
  status: z.string().default("error"),
  message: z.string(),
});

// ── Routes ───────────────────────────────────────

export const getStats = createRoute({
  path: "/email-jobs",
  method: "get",
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      EmailJobStatsSchema,
      "Email queue statistics",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      ErrorSchema,
      "Internal server error",
    ),
  },
});

export const getFailed = createRoute({
  path: "/email-jobs/failed",
  method: "get",
  tags,
  request: {
    query: z.object({
      start: z.coerce.number().int().min(0).default(0),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        total: z.number(),
        start: z.number(),
        limit: z.number(),
        jobs: z.array(FailedEmailJobSchema),
      }),
      "List of failed email jobs",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      ErrorSchema,
      "Internal server error",
    ),
  },
});

export const retryAll = createRoute({
  path: "/email-jobs/retry-all",
  method: "post",
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        retried: z.number(),
      }),
      "Number of jobs retried",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      ErrorSchema,
      "Internal server error",
    ),
  },
});

export type GetStatsRoute = typeof getStats;
export type GetFailedRoute = typeof getFailed;
export type RetryAllRoute = typeof retryAll;
