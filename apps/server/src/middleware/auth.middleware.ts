import type { Context, Next } from "hono";

import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

/**
 * Hono middleware that validates Better Auth session.
 * Sets `user` and `session` on the context variables.
 */
export const authMiddleware = async (c: Context, next: Next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    logger.warn("Authentication failed: No valid session");
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }

  c.set("user", session.user);
  c.set("session", session.session);
  logger.debug({ userId: session.user.id }, "User authenticated");

  await next();
};

/**
 * Hono middleware that validates admin access.
 * Must be used after authMiddleware or independently.
 */
export const adminAuthMiddleware = async (c: Context, next: Next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    logger.warn("Authentication failed: No valid session");
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }

  const role = ((session.user as Record<string, unknown>).role as string) ?? "";
  if (role !== "ADMIN") {
    logger.warn({ userId: session.user.id, role }, "Admin access denied");
    return c.json(
      { success: false, message: "Forbidden: Admin access required" },
      403,
    );
  }

  c.set("user", session.user);
  c.set("session", session.session);
  logger.debug({ userId: session.user.id }, "Admin authenticated");

  await next();
};
