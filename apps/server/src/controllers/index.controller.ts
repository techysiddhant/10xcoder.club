import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/lib/types";
import type {
  GetInfoRoute,
  HealthCheckRoute,
} from "@/routes/index/index.routes";

export const getInfo: AppRouteHandler<GetInfoRoute> = (c) => {
  return c.json(
    {
      name: "@workspace/server",
      version: "1.0.0",
    },
    HttpStatusCodes.OK,
  );
};

export const healthCheck: AppRouteHandler<HealthCheckRoute> = (c) => {
  return c.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    HttpStatusCodes.OK,
  );
};
