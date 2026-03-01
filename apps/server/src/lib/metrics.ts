/**
 * Prometheus metrics for Grafana Cloud.
 * collectDefaultMetrics (Node.js runtime stats) is gated by isProduction.
 * Custom metric types (Counter, Histogram) are instantiated unconditionally
 * so middleware can reference them in all environments.
 */
import client from "prom-client";

import { isProduction } from "@/config/env";

// Collect default Node.js metrics (CPU, memory, event loop) only in production
if (isProduction) {
  client.collectDefaultMetrics({ prefix: "server_" });
}

/** Total HTTP requests counter */
export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"] as const,
});

/** HTTP request duration histogram */
export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

/** Get metrics in Prometheus text format */
export const getMetrics = async (): Promise<string> => {
  return client.register.metrics();
};

/** Get content type for Prometheus response */
export const getMetricsContentType = (): string => {
  return client.register.contentType;
};
