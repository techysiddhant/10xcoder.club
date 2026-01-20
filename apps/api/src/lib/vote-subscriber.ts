/**
 * Shared Vote Subscriber Module
 *
 * This module provides a singleton Redis subscriber that fans out vote update
 * messages to all connected SSE clients. This replaces per-request Redis
 * connections to avoid exhausting Redis connection slots at scale.
 */

import Redis from 'ioredis'
import { env } from '@/config/env'
import { REDIS_KEY } from '@/constant'
import { logger } from '@/lib/logger'

const subscriberLogger = logger.child({ module: 'vote-subscriber' })

// In-memory client registry: maps clientId -> StreamController
const clients = new Map<string, ReadableStreamDefaultController<string>>()

// Singleton Redis subscriber instance
let subscriber: Redis | null = null
let isInitialized = false

/**
 * Initialize the shared vote subscriber.
 * Should be called once on server startup.
 */
export function initVoteSubscriber(): void {
  if (isInitialized) {
    subscriberLogger.warn('Vote subscriber already initialized')
    return
  }

  subscriber = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
      // Exponential backoff with max 30 seconds
      const delay = Math.min(times * 1000, 30000)
      subscriberLogger.warn({ attempt: times, delayMs: delay }, 'Reconnecting vote subscriber...')
      return delay
    }
  })

  subscriber.on('error', (err) => {
    subscriberLogger.error({ error: err }, 'Vote subscriber Redis error')
  })

  subscriber.on('connect', () => {
    subscriberLogger.info('Vote subscriber connected to Redis')
  })

  subscriber.on('message', (channel, message) => {
    if (channel !== REDIS_KEY.VOTE_CHANNEL) return

    // Fan out to all connected clients
    const messageWithNewlines = `data: ${message}\n\n`

    for (const [clientId, controller] of clients.entries()) {
      try {
        controller.enqueue(messageWithNewlines)
      } catch (error) {
        // Client disconnected or stream closed - clean up
        subscriberLogger.debug({ clientId }, 'Removing stale client')
        clients.delete(clientId)
      }
    }
  })

  // Subscribe to vote channel
  subscriber.subscribe(REDIS_KEY.VOTE_CHANNEL, (err) => {
    if (err) {
      subscriberLogger.error({ error: err }, 'Failed to subscribe to vote channel')
    } else {
      subscriberLogger.info('Subscribed to vote channel')
      isInitialized = true
    }
  })
}

/**
 * Register a new SSE client to receive vote updates.
 * @param clientId Unique identifier for the client
 * @param controller The ReadableStream controller for sending data
 */
export function addVoteClient(
  clientId: string,
  controller: ReadableStreamDefaultController<string>
): void {
  clients.set(clientId, controller)
  subscriberLogger.debug({ clientId, totalClients: clients.size }, 'Vote client added')
}

/**
 * Remove an SSE client when they disconnect.
 * @param clientId The client ID to remove
 */
export function removeVoteClient(clientId: string): void {
  clients.delete(clientId)
  subscriberLogger.debug({ clientId, totalClients: clients.size }, 'Vote client removed')
}

/**
 * Get the current number of connected clients.
 * Useful for monitoring/debugging.
 */
export function getVoteClientCount(): number {
  return clients.size
}

/**
 * Shutdown the subscriber gracefully.
 * Should be called on server shutdown.
 */
export async function shutdownVoteSubscriber(): Promise<void> {
  if (subscriber) {
    try {
      await subscriber.unsubscribe(REDIS_KEY.VOTE_CHANNEL)
      await subscriber.quit()
      subscriber = null
      isInitialized = false
      clients.clear()
      subscriberLogger.info('Vote subscriber shut down')
    } catch (error) {
      subscriberLogger.error({ error }, 'Error shutting down vote subscriber')
    }
  }
}
