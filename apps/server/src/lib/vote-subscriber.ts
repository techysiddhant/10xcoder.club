/**
 * Shared Vote Subscriber Module
 *
 * This module provides a singleton Redis subscriber that fans out vote update
 * messages to all connected SSE clients. This replaces per-request Redis
 * connections to avoid exhausting Redis connection slots at scale.
 */

import Redis from "ioredis";
import { REDIS_KEY } from "@/constant";
import { logger } from "@/lib/logger";
import { redisConnectionOptions } from "./redis";

const subscriberLogger = logger.child({ module: "vote-subscriber" });

// In-memory client registry: maps clientId -> stream enqueue function
const clients = new Map<string, (msg: string) => void>();

// Singleton Redis subscriber instance
let subscriber: Redis | null = null;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Check if the vote subscriber is ready to accept clients.
 */
export function isVoteSubscriberReady(): boolean {
  return isInitialized;
}

/**
 * Initialize the shared vote subscriber.
 * Should be called once on server startup.
 * Returns a Promise that resolves when subscription is confirmed,
 * or rejects on failure (cleans up Redis connection on failure).
 */
export async function initVoteSubscriber(): Promise<void> {
  if (isInitialized) {
    subscriberLogger.warn("Vote subscriber already initialized");
    return;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = new Promise<void>((resolve, reject) => {
    subscriber = new Redis({
      ...redisConnectionOptions,
      retryStrategy: (times) => {
        // Exponential backoff with max 30 seconds
        const delay = Math.min(Math.pow(2, times - 1) * 1000, 30000);
        subscriberLogger.warn(
          { attempt: times, delayMs: delay },
          "Reconnecting vote subscriber...",
        );
        return delay;
      },
    });

    subscriber.on("error", (err) => {
      subscriberLogger.error({ error: err }, "Vote subscriber Redis error");
    });

    subscriber.on("connect", () => {
      subscriberLogger.info("Vote subscriber connected to Redis");
    });

    subscriber.on("message", (channel, message) => {
      if (channel !== REDIS_KEY.VOTE_CHANNEL) return;

      // Fan out to all connected clients
      for (const [clientId, enqueue] of clients.entries()) {
        try {
          enqueue(message);
        } catch {
          // Client disconnected or stream closed - clean up
          subscriberLogger.debug({ clientId }, "Removing stale client");
          clients.delete(clientId);
        }
      }
    });

    subscriber.subscribe(REDIS_KEY.VOTE_CHANNEL, (err) => {
      if (err) {
        subscriberLogger.error(
          { error: err },
          "Failed to subscribe to vote channel",
        );
        // Clean up on failure
        subscriber?.quit().catch(() => {});
        subscriber = null;
        initPromise = null;
        reject(err);
      } else {
        subscriberLogger.info("Subscribed to vote channel");
        isInitialized = true;
        resolve();
      }
    });
  });

  return initPromise;
}

/**
 * Register a new SSE client to receive vote updates.
 * Returns false if subscriber is not ready.
 * @param clientId Unique identifier for the client
 * @param enqueue Function to enqueue data into the SSE stream
 */
export function addVoteClient(
  clientId: string,
  enqueue: (msg: string) => void,
): boolean {
  if (!isInitialized) {
    subscriberLogger.warn(
      { clientId },
      "Cannot add client - subscriber not ready",
    );
    return false;
  }
  clients.set(clientId, enqueue);
  subscriberLogger.debug(
    { clientId, totalClients: clients.size },
    "Vote client added",
  );
  return true;
}

/**
 * Remove an SSE client when they disconnect.
 * @param clientId The client ID to remove
 */
export function removeVoteClient(clientId: string): void {
  clients.delete(clientId);
  subscriberLogger.debug(
    { clientId, totalClients: clients.size },
    "Vote client removed",
  );
}

/**
 * Get the current number of connected clients.
 * Useful for monitoring/debugging.
 */
export function getVoteClientCount(): number {
  return clients.size;
}

/**
 * Shutdown the subscriber gracefully.
 * Should be called on server shutdown.
 */
export async function shutdownVoteSubscriber(): Promise<void> {
  if (subscriber) {
    try {
      await subscriber.unsubscribe(REDIS_KEY.VOTE_CHANNEL);
      await subscriber.quit();
      subscriber = null;
      isInitialized = false;
      initPromise = null;
      clients.clear();
      subscriberLogger.info("Vote subscriber shut down");
    } catch (error) {
      subscriberLogger.error({ error }, "Error shutting down vote subscriber");
    }
  }
}
