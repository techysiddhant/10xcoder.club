import { Elysia, t } from "elysia";
import { authMiddleware } from "@/middleware/auth.middleware";
import { upvote, downvote } from "@/controllers/vote.controller";
import { ErrorResponseSchema, errorResponse } from "@/utils/errors";
import {
  addVoteClient,
  removeVoteClient,
  isVoteSubscriberReady,
} from "@/lib/vote-subscriber";
import { env } from "@/config/env";

// Vote response schema
const VoteResponseSchema = t.Object({
  status: t.Number({ example: 200 }),
  userVote: t.Union([t.Literal("upvote"), t.Literal("downvote"), t.Null()]),
  upvotes: t.Number(),
  downvotes: t.Number(),
});

export const voteRoutes = new Elysia({ prefix: "/api/vote" })
  .use(authMiddleware)

  // ==========================================
  // POST /api/vote/:resourceId/upvote - Toggle upvote
  // ==========================================
  .post("/:resourceId/upvote", upvote, {
    params: t.Object({
      resourceId: t.String({ minLength: 1 }),
    }),
    auth: true,
    detail: {
      tags: ["Votes"],
      summary: "Toggle upvote",
      description:
        "Toggle upvote for a resource. If already upvoted, removes it. If downvoted, switches to upvote.",
    },
    response: {
      200: VoteResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
  })

  // ==========================================
  // POST /api/vote/:resourceId/downvote - Toggle downvote
  // ==========================================
  .post("/:resourceId/downvote", downvote, {
    params: t.Object({
      resourceId: t.String({ minLength: 1 }),
    }),
    auth: true,
    detail: {
      tags: ["Votes"],
      summary: "Toggle downvote",
      description:
        "Toggle downvote for a resource. If already downvoted, removes it. If upvoted, switches to downvote.",
    },
    response: {
      200: VoteResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
  })

  // ==========================================
  // GET /api/vote/stream - SSE stream for all vote updates (public, rate-limited)
  // ==========================================
  .get(
    "/stream",
    async ({ set, request }) => {
      // Check if subscriber is ready before accepting clients
      if (!isVoteSubscriberReady()) {
        set.status = 503;
        return errorResponse(
          "INTERNAL_ERROR",
          "Vote stream service unavailable",
          503,
        );
      }

      // Explicit CORS headers for SSE (streaming responses can bypass CORS plugin)
      const requestOrigin = request.headers.get("Origin");
      const allowedOrigins = env.CORS_ORIGIN?.split(",").map((s) => s.trim());
      const allowOrigin: string = allowedOrigins?.includes(requestOrigin ?? "")
        ? (requestOrigin ?? "*")
        : allowedOrigins?.length
          ? (allowedOrigins[0] ?? "*")
          : (requestOrigin ?? "*");

      const streamHeaders: Record<string, string> = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx response buffering for SSE
        "Access-Control-Allow-Origin": allowOrigin,
      };

      // Generate unique client ID
      const clientId = crypto.randomUUID();

      const HEARTBEAT_INTERVAL_MS = 30_000;
      const heartbeatIds = new Map<string, ReturnType<typeof setInterval>>();

      const stream = new ReadableStream<string>({
        start(controller) {
          const added = addVoteClient(clientId, controller);

          if (!added) {
            controller.close();
            return;
          }

          controller.enqueue(
            `data: ${JSON.stringify({ type: "connected", clientId })}\n\n`,
          );

          const heartbeatId = setInterval(() => {
            try {
              controller.enqueue(`: heartbeat ${Date.now()}\n\n`);
            } catch {
              const id = heartbeatIds.get(clientId);
              if (id) clearInterval(id);
              heartbeatIds.delete(clientId);
            }
          }, HEARTBEAT_INTERVAL_MS);
          heartbeatIds.set(clientId, heartbeatId);
        },
        cancel() {
          const heartbeatId = heartbeatIds.get(clientId);
          if (heartbeatId) {
            clearInterval(heartbeatId);
            heartbeatIds.delete(clientId);
          }
          removeVoteClient(clientId);
        },
      });

      return new Response(stream, {
        headers: streamHeaders,
      });
    },
    {
      detail: {
        tags: ["Votes"],
        summary: "SSE stream for vote updates",
        description:
          "Server-Sent Events stream for real-time vote count updates. Public endpoint with global rate limiting. Clients should filter updates by resourceId as needed.",
      },
      response: {
        503: ErrorResponseSchema,
      },
    },
  );
