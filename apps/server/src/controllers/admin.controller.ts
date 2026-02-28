import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "../lib/types";
import type {
  GetFailedRoute,
  GetStatsRoute,
  RetryAllRoute,
} from "../routes/admin/admin.routes";

import {
  getEmailJobStats,
  getFailedEmailJobs,
  retryAllFailedEmailJobs,
} from "../services/email-job.service";

export const getStats: AppRouteHandler<GetStatsRoute> = async (c) => {
  const stats = await getEmailJobStats();

  return c.json(
    {
      queue: "email",
      counts: stats,
    },
    HttpStatusCodes.OK,
  );
};

export const getFailed: AppRouteHandler<GetFailedRoute> = async (c) => {
  const { start, limit } = c.req.valid("query");

  const result = await getFailedEmailJobs(start, limit);

  return c.json(
    {
      ...result,
      start,
      limit,
    },
    HttpStatusCodes.OK,
  );
};

export const retryAll: AppRouteHandler<RetryAllRoute> = async (c) => {
  const retried = await retryAllFailedEmailJobs();

  return c.json({ retried }, HttpStatusCodes.OK);
};
