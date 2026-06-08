import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

const tags = ["Admin - Email Jobs"];

// ── Shared schemas ───────────────────────────────

const EmailJobStatsSchema = z.object({
  queue: z.string(),
  counts: z.object({
    waiting: z.number(),
    active: z.number(),
    completed: z.number(),
    failed: z.number(),
    delayed: z.number(),
  }),
});

const FailedEmailJobSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["verification", "reset-password", "magic-link"]),
  to: z.string(),
  subject: z.string(),
  attempts: z.number(),
  failedReason: z.string().optional(),
  timestamp: z.number().optional(),
  finishedOn: z.number().optional(),
});

const ErrorSchema = z.object({
  status: z.string().default("error"),
  message: z.string(),
});

const ResourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  url: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
  resourceType: z.string().nullable(),
  resourceTypeLabel: z.string().nullable(),
  createdAt: z.string(),
});

const ResourceTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  label: z.string(),
  icon: z.string().nullable(),
});

// ── Routes ───────────────────────────────────────

export const getStats = createRoute({
  path: "/email-jobs",
  method: "get",
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      EmailJobStatsSchema,
      "Email queue statistics",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      ErrorSchema,
      "Internal server error",
    ),
  },
});

export const getFailed = createRoute({
  path: "/email-jobs/failed",
  method: "get",
  tags,
  request: {
    query: z.object({
      start: z.coerce.number().int().min(0).default(0),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        total: z.number(),
        start: z.number(),
        limit: z.number(),
        jobs: z.array(FailedEmailJobSchema),
      }),
      "List of failed email jobs",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      ErrorSchema,
      "Internal server error",
    ),
  },
});

export const retryAll = createRoute({
  path: "/email-jobs/retry-all",
  method: "post",
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        retried: z.number(),
      }),
      "Number of jobs retried",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      ErrorSchema,
      "Internal server error",
    ),
  },
});

export const listResources = createRoute({
  path: "/resources",
  method: "get",
  tags: ["Admin - Resources"],
  request: {
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      status: z.enum(["approved", "rejected", "pending"]).optional(),
      search: z.string().optional(),
      resourceType: z.string().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        data: z.array(z.any()),
        meta: z.object({
          total: z.number(),
          page: z.number(),
          limit: z.number(),
          totalPages: z.number(),
        }),
      }),
      "List of resources",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(ErrorSchema, "Unauthorized"),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(ErrorSchema, "Forbidden"),
  },
});

export const updateResourceStatus = createRoute({
  path: "/resources/{id}/status",
  method: "patch",
  tags: ["Admin - Resources"],
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: jsonContent(
      z.object({
        status: z.enum(["approved", "rejected"]),
        reason: z.string().max(500).optional(),
      }),
      "Update status body",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        status: z.literal("success"),
        data: z.any(),
      }),
      "Resource status updated",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(ErrorSchema, "Resource not found"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(ErrorSchema, "Bad request"),
  },
});

export const removeResource = createRoute({
  path: "/resources/{id}",
  method: "delete",
  tags: ["Admin - Resources"],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
      }),
      "Resource deleted",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(ErrorSchema, "Resource not found"),
  },
});

export const listResourceTypes = createRoute({
  path: "/resource-types",
  method: "get",
  tags: ["Admin - Resource Types"],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        data: z.array(ResourceTypeSchema),
      }),
      "List of resource types",
    ),
  },
});

export const createResourceType = createRoute({
  path: "/resource-types",
  method: "post",
  tags: ["Admin - Resource Types"],
  request: {
    body: jsonContent(
      z.object({
        name: z.string().min(1),
        label: z.string().min(1),
        icon: z.string().optional(),
      }),
      "Create resource type body",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      z.object({
        success: z.boolean(),
        data: ResourceTypeSchema,
      }),
      "Resource type created",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(ErrorSchema, "Bad request"),
  },
});

export const updateResourceType = createRoute({
  path: "/resource-types/{id}",
  method: "put",
  tags: ["Admin - Resource Types"],
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: jsonContent(
      z.object({
        name: z.string().min(1).optional(),
        label: z.string().min(1).optional(),
        icon: z.string().optional(),
      }),
      "Update resource type body",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        data: ResourceTypeSchema,
      }),
      "Resource type updated",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(ErrorSchema, "Not found"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(ErrorSchema, "Bad request"),
  },
});

export const deleteResourceType = createRoute({
  path: "/resource-types/{id}",
  method: "delete",
  tags: ["Admin - Resource Types"],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        data: ResourceTypeSchema,
      }),
      "Resource type deleted",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(ErrorSchema, "Not found"),
    [HttpStatusCodes.CONFLICT]: jsonContent(ErrorSchema, "Conflict"),
  },
});

export const generateDescription = createRoute({
  path: "/resources/generate-description",
  method: "post",
  tags: ["Admin - Resources"],
  request: {
    body: jsonContent(
      z.object({
        url: z.string().url(),
        title: z.string().trim().min(1, "Title is required"),
        resourceType: z.string().trim().min(1, "Resource type is required"),
        tags: z.array(z.string()).optional(),
        techStack: z.array(z.string()).optional(),
      }),
      "Generate description body",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        status: z.literal("success"),
        data: z.object({
          description: z.string(),
        }),
      }),
      "Description generated",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(ErrorSchema, "Unauthorized"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(ErrorSchema, "Bad request"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      ErrorSchema,
      "Internal server error",
    ),
  },
});

export type GetStatsRoute = typeof getStats;
export type GetFailedRoute = typeof getFailed;
export type RetryAllRoute = typeof retryAll;
export type ListResourcesRoute = typeof listResources;
export type UpdateResourceStatusRoute = typeof updateResourceStatus;
export type RemoveResourceRoute = typeof removeResource;
export type ListResourceTypesRoute = typeof listResourceTypes;
export type CreateResourceTypeRoute = typeof createResourceType;
export type UpdateResourceTypeRoute = typeof updateResourceType;
export type DeleteResourceTypeRoute = typeof deleteResourceType;
export type GenerateDescriptionRoute = typeof generateDescription;
