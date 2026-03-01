import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/lib/types";
import type {
  GetFailedRoute,
  GetStatsRoute,
  RetryAllRoute,
  ListResourcesRoute,
  UpdateResourceStatusRoute,
  RemoveResourceRoute,
  ListResourceTypesRoute,
  CreateResourceTypeRoute,
  UpdateResourceTypeRoute,
  DeleteResourceTypeRoute,
} from "@/routes/admin/admin.routes";

import {
  getEmailJobStats,
  getFailedEmailJobs,
  retryAllFailedEmailJobs,
} from "@/services/email-job.service";
import * as adminService from "@/services/admin.service";
import * as resourceTypeService from "@/services/resource-type.service";
import { logger } from "@/lib/logger";

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

export const listResources: AppRouteHandler<ListResourcesRoute> = async (c) => {
  const query = c.req.valid("query");
  try {
    const result = await adminService.adminGetAllResources(query);
    return c.json(result, HttpStatusCodes.OK) as any;
  } catch (error) {
    logger.error({ err: error }, "Admin: Failed to list resources");
    return c.json(
      { status: "error", message: "Internal server error" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    ) as any;
  }
};

export const updateStatus: AppRouteHandler<UpdateResourceStatusRoute> = async (
  c,
) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  try {
    const result = await adminService.adminUpdateResourceStatus(id, body);

    if (!result.success) {
      const status =
        result.code === 404
          ? HttpStatusCodes.NOT_FOUND
          : HttpStatusCodes.BAD_REQUEST;
      return c.json({ status: "error", message: result.error }, status) as any;
    }

    return c.json(
      {
        status: "success",
        data: result.data,
      },
      HttpStatusCodes.OK,
    ) as any;
  } catch (error) {
    logger.error({ err: error, id }, "Admin: Failed to update resource status");
    return c.json(
      { status: "error", message: "Internal server error" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    ) as any;
  }
};

export const removeResource: AppRouteHandler<RemoveResourceRoute> = async (
  c,
) => {
  const { id } = c.req.valid("param");
  try {
    const result = await adminService.adminDeleteResource(id);

    if (!result.success) {
      const status =
        result.code === 404
          ? HttpStatusCodes.NOT_FOUND
          : HttpStatusCodes.BAD_REQUEST;
      return c.json({ status: "error", message: result.error }, status) as any;
    }

    return c.json(
      {
        success: true,
        message: "Resource deleted successfully",
      },
      HttpStatusCodes.OK,
    ) as any;
  } catch (error) {
    logger.error({ err: error, id }, "Admin: Failed to delete resource");
    return c.json(
      { status: "error", message: "Internal server error" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    ) as any;
  }
};

export const listResourceTypes: AppRouteHandler<
  ListResourceTypesRoute
> = async (c) => {
  try {
    const types = await resourceTypeService.getAllResourceTypes();
    return c.json({ data: types }, HttpStatusCodes.OK) as any;
  } catch (error) {
    logger.error({ err: error }, "Admin: Failed to list resource types");
    return c.json(
      { error: "Failed to list resource types" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    ) as any;
  }
};

export const createResourceType: AppRouteHandler<
  CreateResourceTypeRoute
> = async (c) => {
  const body = c.req.valid("json");
  try {
    const result = await resourceTypeService.createResourceType(body);
    return c.json(
      { success: true, data: result },
      HttpStatusCodes.CREATED,
    ) as any;
  } catch (error) {
    logger.error({ err: error }, "Admin: Failed to create resource type");
    return c.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Internal server error",
      },
      HttpStatusCodes.BAD_REQUEST,
    ) as any;
  }
};

export const updateResourceType: AppRouteHandler<
  UpdateResourceTypeRoute
> = async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  try {
    const result = await resourceTypeService.updateResourceType(id, body);
    if (!result) {
      return c.json(
        { status: "error", message: "Resource type not found" },
        HttpStatusCodes.NOT_FOUND,
      ) as any;
    }
    return c.json({ data: result }, HttpStatusCodes.OK) as any;
  } catch (error) {
    logger.error({ err: error }, "Admin: Failed to update resource type");
    return c.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Internal server error",
      },
      HttpStatusCodes.BAD_REQUEST,
    ) as any;
  }
};

export const deleteResourceType: AppRouteHandler<
  DeleteResourceTypeRoute
> = async (c) => {
  const { id } = c.req.valid("param");
  try {
    const result = await resourceTypeService.deleteResourceType(id);
    if (!result) {
      return c.json(
        { status: "error", message: "Resource type not found" },
        HttpStatusCodes.NOT_FOUND,
      ) as any;
    }
    return c.json({ data: result }, HttpStatusCodes.OK) as any;
  } catch (error) {
    logger.error({ err: error }, "Admin: Failed to delete resource type");
    const dbError = error as { code?: string };
    if (dbError.code === "23503") {
      return c.json(
        {
          status: "error",
          message:
            "Cannot delete resource type: resources exist with this type",
        },
        HttpStatusCodes.CONFLICT,
      ) as any;
    }
    return c.json(
      {
        status: "error",
        message: "Internal server error",
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    ) as any;
  }
};
