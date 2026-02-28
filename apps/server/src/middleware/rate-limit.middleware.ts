/**
 * Redis-based rate limiting middleware for scrape endpoints.
 * Keys by authenticated user ID or IP address.
 * Uses an atomic Lua script for thread-safe counter management.
 * Fails open on Redis errors (allows request through).
 */

import type { Context, Next } from "hono";

import { redis } from "../lib/redis";
import { logger } from "../lib/logger";

// ── Configuration ────────────────────────────────

const RATE_LIMIT_MAX = 10; // requests per window
const RATE_LIMIT_WINDOW = 60; // seconds
const RATE_LIMIT_PREFIX = "rate-limit:scrape:";

// Atomic Lua script: increments counter and returns [allowed, ttl]
const RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local current = tonumber(redis.call('GET', key) or '0')
if current >= limit then
  local ttl = redis.call('TTL', key)
  return {0, ttl}
end
if current == 0 then
  redis.call('SET', key, 1, 'EX', window)
else
  redis.call('INCR', key)
end
return {1, -1}
`;

// ── Middleware ────────────────────────────────────

export async function scrapeRateLimitMiddleware(
  c: Context,
  next: Next,
): Promise<void | Response> {
  const user = c.get("user") as { id: string } | undefined;

  const isValidIp = (ip: string | undefined | null): ip is string => {
    if (!ip) return false;
    const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    const ipv6Regex = /^[a-fA-F0-9:]+$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  };

  let resolvedIp = null;
  const forwardedFor = c.req.header("x-forwarded-for");
  if (forwardedFor) {
    const leftMost = forwardedFor.split(",")[0]?.trim();
    if (isValidIp(leftMost)) resolvedIp = leftMost;
  }

  if (!resolvedIp) {
    const realIp = c.req.header("x-real-ip");
    if (isValidIp(realIp)) resolvedIp = realIp;
  }

  if (!resolvedIp) {
    try {
      const socketAddr =
        (c.req as any).socket?.remoteAddress ||
        (c.req.raw as any)?.socket?.remoteAddress;
      if (isValidIp(socketAddr)) resolvedIp = socketAddr;
    } catch {}
  }

  const clientId = user?.id || resolvedIp;
  if (!clientId) {
    return c.json(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Unable to identify request origin for rate limiting.",
        },
      },
      400,
    );
  }

  const rateLimitKey = `${RATE_LIMIT_PREFIX}${clientId}`;

  try {
    const [allowed, ttl] = (await redis.eval(
      RATE_LIMIT_SCRIPT,
      1,
      rateLimitKey,
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW,
    )) as [number, number];

    if (!allowed) {
      const retryAfter =
        ttl > 0 ? ttl.toString() : RATE_LIMIT_WINDOW.toString();
      c.header("Retry-After", retryAfter);

      return c.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Please wait a moment and try again.",
          },
        },
        429,
      );
    }
  } catch (error) {
    // Fail open — allow request if Redis is down
    logger.warn(
      { error, rateLimitKey },
      "Rate limit Redis error, allowing request",
    );
  }

  await next();
}
