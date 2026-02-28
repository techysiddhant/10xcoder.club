import type { MiddlewareHandler } from "hono";

import { isProduction } from "../config/env";
import {
  getMetrics,
  getMetricsContentType,
  httpRequestDuration,
  httpRequestsTotal,
} from "../lib/metrics";

/**
 * Hono middleware to instrument HTTP requests for Prometheus.
 * Only records metrics in production.
 */
export const metricsMiddleware: MiddlewareHandler = async (c, next) => {
  if (!isProduction) {
    await next();
    return;
  }

  const start = performance.now();

  try {
    await next();
  } finally {
    const duration = (performance.now() - start) / 1000; // convert ms → seconds
    const route = c.req.routePath || "unknown";
    const method = c.req.method;
    const status = String(c.res.status);

    httpRequestsTotal.inc({ method, route, status });
    httpRequestDuration.observe({ method, route, status }, duration);
  }
};

/**
 * Hono handler for GET /metrics — returns Prometheus text format.
 * Only available in production.
 */
export const metricsHandler = async (c: Parameters<MiddlewareHandler>[0]) => {
  if (!isProduction) {
    return c.json({ message: "Metrics are only available in production" }, 404);
  }

  const metrics = await getMetrics();
  return c.text(metrics, 200, {
    "Content-Type": getMetricsContentType(),
  });
};
