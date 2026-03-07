import * as HttpStatusCodes from "stoker/http-status-codes";
import { streamSSE } from "hono/streaming";

import type { AppRouteHandler } from "@/lib/types";
import type {
  UpvoteRoute,
  DownvoteRoute,
  StreamVotesRoute,
} from "@/routes/vote/vote.routes";

import { toggleVote, checkResourceExists } from "@/services/vote.service";
import { logger } from "@/lib/logger";
import {
  addVoteClient,
  removeVoteClient,
  isVoteSubscriberReady,
} from "@/lib/vote-subscriber";

const controllerLogger = logger.child({ controller: "vote" });

export const upvote: AppRouteHandler<UpvoteRoute> = async (c) => {
  const { resourceId } = c.req.valid("param");
  const user = c.get("user");

  if (!user) {
    return c.json(
      { status: "error", message: "Unauthorized" },
      HttpStatusCodes.UNAUTHORIZED,
    ) as any;
  }

  try {
    const exists = await checkResourceExists(resourceId);
    if (!exists) {
      return c.json(
        { status: "error", message: "Resource not found" },
        HttpStatusCodes.NOT_FOUND,
      ) as any;
    }

    const result = await toggleVote(resourceId, user.id, "upvote");
    return c.json(
      {
        status: "success",
        userVote: result.userVote,
        upvotes: result.upvotes,
        downvotes: result.downvotes,
      },
      HttpStatusCodes.OK,
    ) as any;
  } catch (error) {
    controllerLogger.error({ error, resourceId }, "Upvote failed");
    return c.json(
      { status: "error", message: "Failed to toggle upvote" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    ) as any;
  }
};

export const downvote: AppRouteHandler<DownvoteRoute> = async (c) => {
  const { resourceId } = c.req.valid("param");
  const user = c.get("user");

  if (!user) {
    return c.json(
      { status: "error", message: "Unauthorized" },
      HttpStatusCodes.UNAUTHORIZED,
    ) as any;
  }

  try {
    const exists = await checkResourceExists(resourceId);
    if (!exists) {
      return c.json(
        { status: "error", message: "Resource not found" },
        HttpStatusCodes.NOT_FOUND,
      ) as any;
    }

    const result = await toggleVote(resourceId, user.id, "downvote");
    return c.json(
      {
        status: "success",
        userVote: result.userVote,
        upvotes: result.upvotes,
        downvotes: result.downvotes,
      },
      HttpStatusCodes.OK,
    ) as any;
  } catch (error) {
    controllerLogger.error({ error, resourceId }, "Downvote failed");
    return c.json(
      { status: "error", message: "Failed to toggle downvote" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    ) as any;
  }
};

export const streamVotes: AppRouteHandler<StreamVotesRoute> = async (c) => {
  if (!isVoteSubscriberReady()) {
    return c.json(
      { status: "error", message: "Vote stream service unavailable" },
      HttpStatusCodes.SERVICE_UNAVAILABLE,
    ) as any;
  }

  const clientId = crypto.randomUUID();

  return streamSSE(c, async (stream) => {
    // Register client with a callback to enqueue data
    const added = addVoteClient(clientId, (msg) => {
      // msg is the JSON string from Redis. Format it as SSE event data.
      stream.writeSSE({ data: msg }).catch((err) => {
        controllerLogger.debug(
          { err, clientId },
          "Failed to write SSE event to client",
        );
      });
    });

    if (!added) {
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({
          status: "error",
          message: "Failed to register for vote updates",
        }),
      });
      return;
    }

    try {
      await stream.writeSSE({
        data: JSON.stringify({ type: "connected", clientId }),
      });
    } catch (err) {
      removeVoteClient(clientId);
      throw err;
    }

    let resolveAbort: () => void;
    // Create a Promise that resolves when the stream aborts
    const abortPromise = new Promise<void>((resolve) => {
      resolveAbort = resolve;
      stream.onAbort(() => {
        resolve();
      });
    });

    // Keep connection alive
    const heartbeats = setInterval(async () => {
      try {
        await stream.writeSSE({
          event: "heartbeat",
          data: Date.now().toString(),
        });
      } catch (err) {
        if (resolveAbort) resolveAbort();
      }
    }, 30000);

    try {
      // Wait indefinitely until the stream is aborted
      await abortPromise;
    } catch (err) {
      controllerLogger.error({ err, clientId }, "Error in vote stream loop");
    } finally {
      clearInterval(heartbeats);
      removeVoteClient(clientId);
    }
  });
};
