import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi";

// ── Hono context bindings ────────────────────────

export interface AppBindings {
  Variables: {
    user: AppUser | null;
    session: AppSession | null;
  };
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role?: string | null;
  username?: string | null;
}

export interface AppSession {
  id: string;
  expiresAt: Date;
  token: string;
  userId: string;
}

// ── Typed route handler ──────────────────────────

export type AppOpenAPI = OpenAPIHono<AppBindings>;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<
  R,
  AppBindings
>;
