import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

const tags = ["General"];

export const getInfo = createRoute({
  path: "/",
  method: "get",
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        name: z.string(),
        version: z.string(),
      }),
      "Server info",
    ),
  },
});

export const healthCheck = createRoute({
  path: "/health",
  method: "get",
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        status: z.string(),
        timestamp: z.string(),
      }),
      "Health check",
    ),
  },
});

export type GetInfoRoute = typeof getInfo;
export type HealthCheckRoute = typeof healthCheck;
