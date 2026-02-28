import { apiReference } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";

import { createRouter } from "./lib/create-app";
import { env, isProduction } from "./config/env";
import { auth } from "./lib/auth";
import { logger } from "./lib/logger";
import { Sentry } from "./lib/sentry";
import { metricsHandler, metricsMiddleware } from "./middleware/metrics";
import indexRouter from "./routes/index/index.index";
import adminRouter from "./routes/admin/admin.index";
import { AuthOpenAPI } from "./lib/auth-open-api";

const app = createRouter();

// ── CORS ─────────────────────────────────────────

const corsOrigins = env.CORS_ORIGIN?.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (corsOrigins?.length && corsOrigins.includes("*")) {
  logger.warn(
    "CORS_ORIGIN contains '*' with credentials:true — this is unsafe in production",
  );
}

app.use(
  cors({
    origin: corsOrigins?.length ? corsOrigins : [],
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

// ── Middleware ────────────────────────────────────

app.use(prettyJSON());
app.use(metricsMiddleware);

// Request logging
app.use(async (c, next) => {
  const start = Date.now();
  logger.info({ method: c.req.method, path: c.req.path }, "← request");

  await next();

  const duration = Date.now() - start;
  logger.info(
    {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration: `${duration}ms`,
    },
    "→ response",
  );
});

// ── Error handler ────────────────────────────────

app.onError((err, c) => {
  logger.error(
    { err, path: c.req.path, method: c.req.method },
    "Unhandled error",
  );

  if (isProduction && env.SENTRY_DSN) {
    Sentry.captureException(err, {
      tags: { path: c.req.path, method: c.req.method },
    });
  }

  const message = isProduction
    ? "Something went wrong. Please try again later."
    : err.message;

  return c.json({ status: "error", message }, 500);
});

// ── Better Auth ──────────────────────────────────

app.all("/api/auth/**", (c) => {
  return auth.handler(c.req.raw);
});

// ── Metrics (handler returns 404 in non-production) ─

app.get("/metrics", metricsHandler);

// ── Routes ───────────────────────────────────────

app.route("/", indexRouter);
app.route("/admin", adminRouter);

// ── OpenAPI + Scalar ─────────────────────────────

const authPaths = await AuthOpenAPI.getPaths();
const authComponents = await AuthOpenAPI.components;

app.get("/doc", async (c) => {
  const spec = app.getOpenAPIDocument({
    openapi: "3.1.0",
    info: {
      title: "10xCoder.club Server API",
      version: "1.0.0",
    },
  });

  return c.json({
    ...spec,
    paths: { ...spec.paths, ...authPaths },
    components: { ...spec.components, ...authComponents },
  });
});
app.get(
  "/docs",
  apiReference({
    spec: { url: "/doc" },
    theme: "bluePlanet",
    layout: "classic",
    defaultHttpClient: {
      targetKey: "js",
      clientKey: "fetch",
    },
  }),
);

export default app;
