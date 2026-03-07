import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

const tags = ["Votes"];

const VoteResponseSchema = z.object({
  status: z.string().default("success"),
  userVote: z.enum(["upvote", "downvote"]).nullable(),
  upvotes: z.number(),
  downvotes: z.number(),
});

const CountsResponseSchema = z.object({
  status: z.string().default("success"),
  upvotes: z.number(),
  downvotes: z.number(),
});

const ErrorSchema = z.object({
  status: z.string().default("error"),
  message: z.string(),
});

export const upvote = createRoute({
  path: "/{resourceId}/upvote",
  method: "post",
  tags,
  request: {
    params: z.object({
      resourceId: z.string().uuid(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(VoteResponseSchema, "Upvote toggled"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(ErrorSchema, "Bad request"),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
      }),
      "Unauthorized",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(ErrorSchema, "Resource not found"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      ErrorSchema,
      "Internal error",
    ),
  },
});

export const downvote = createRoute({
  path: "/{resourceId}/downvote",
  method: "post",
  tags,
  request: {
    params: z.object({
      resourceId: z.string().uuid(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(VoteResponseSchema, "Downvote toggled"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(ErrorSchema, "Bad request"),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
      }),
      "Unauthorized",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(ErrorSchema, "Resource not found"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      ErrorSchema,
      "Internal error",
    ),
  },
});

export const getCounts = createRoute({
  path: "/{resourceId}/counts",
  method: "get",
  tags,
  request: {
    params: z.object({
      resourceId: z.string().uuid(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      CountsResponseSchema,
      "Vote counts for resource",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(ErrorSchema, "Bad request"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(ErrorSchema, "Resource not found"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      ErrorSchema,
      "Internal error",
    ),
  },
});

export const streamVotes = createRoute({
  path: "/stream",
  method: "get",
  tags,
  responses: {
    [HttpStatusCodes.OK]: {
      description: "SSE stream for vote updates",
    },
    [HttpStatusCodes.SERVICE_UNAVAILABLE]: jsonContent(
      ErrorSchema,
      "Stream service unavailable",
    ),
  },
});

export type UpvoteRoute = typeof upvote;
export type DownvoteRoute = typeof downvote;
export type GetCountsRoute = typeof getCounts;
export type StreamVotesRoute = typeof streamVotes;
