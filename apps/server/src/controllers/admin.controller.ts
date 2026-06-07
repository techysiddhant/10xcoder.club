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
  GenerateDescriptionRoute,
} from "@/routes/admin/admin.routes";
import { scrapeUrl } from "@/services/scrape.service";
import { generateResourceDescription } from "@/lib/gemini";

import {
  getEmailJobStats,
  getFailedEmailJobs,
  retryAllFailedEmailJobs,
} from "@/services/email-job.service";
import * as adminService from "@/services/admin.service";
import * as resourceTypeService from "@/services/resource-type.service";
import { logger } from "@/lib/logger";
import { KnownUserError } from "@/lib/errors";

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
        result.code === 500
          ? HttpStatusCodes.INTERNAL_SERVER_ERROR
          : result.code === 404
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
        result.code === 500
          ? HttpStatusCodes.INTERNAL_SERVER_ERROR
          : result.code === 404
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
      { status: "error", message: "Failed to list resource types" },
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
    const isValidationError =
      error instanceof Error &&
      (error.message.toLowerCase().includes("duplicate") ||
        error.message.toLowerCase().includes("already exists") ||
        error.message.toLowerCase().includes("validation"));
    const status = isValidationError
      ? HttpStatusCodes.BAD_REQUEST
      : HttpStatusCodes.INTERNAL_SERVER_ERROR;
    const message = isValidationError ? error.message : "Internal server error";

    return c.json(
      {
        status: "error",
        message,
      },
      status,
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
    const isValidationError =
      error instanceof Error &&
      (error.message.toLowerCase().includes("already exists") ||
        error.message.toLowerCase().includes("no fields provided"));
    const status = isValidationError
      ? HttpStatusCodes.BAD_REQUEST
      : HttpStatusCodes.INTERNAL_SERVER_ERROR;
    const message = isValidationError ? error.message : "Internal server error";

    return c.json(
      {
        status: "error",
        message,
      },
      status,
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

export const generateDescription: AppRouteHandler<
  GenerateDescriptionRoute
> = async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { status: "error", message: "Unauthorized" },
      HttpStatusCodes.UNAUTHORIZED,
    ) as any;
  }

  const { url, title, resourceType, tags, techStack } = c.req.valid("json");

  try {
    // Attempt to scrape the URL to get the detailed content
    let scrapedContent: string | null = null;
    try {
      const result = await scrapeUrl(url, user.id);
      scrapedContent = result.description ?? null;
    } catch (scrapeErr) {
      logger.warn(
        { err: scrapeErr, url },
        "Admin Generate AI: Scraping URL failed, proceeding with raw inputs",
      );
    }

    const description = await generateResourceDescription({
      url,
      title,
      resourceType,
      tags,
      techStack,
      scrapedContent,
    });

    return c.json(
      {
        status: "success",
        data: {
          description,
        },
      },
      HttpStatusCodes.OK,
    ) as any;
  } catch (error) {
    logger.error(
      { err: error, url },
      "Admin Generate AI: Failed to generate resource description",
    );
    return c.json(
      {
        status: "error",
        message:
          error instanceof KnownUserError
            ? error.message
            : "Internal server error",
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    ) as any;
  }
};
