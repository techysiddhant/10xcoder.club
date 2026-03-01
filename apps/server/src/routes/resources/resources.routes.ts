import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

const tags = ["Resources"];

// ── Shared schemas ───────────────────────────────

const ErrorSchema = z.object({
  status: z.string().default("error"),
  message: z.string(),
});

const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string().datetime().or(z.date()),
});

const TechStackSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string().datetime().or(z.date()),
});

const CreatorSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
});

const ResourceStatusEnum = z.enum(["approved", "rejected", "pending"]);

const SingleResourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  url: z.string(),
  image: z.string().nullable().optional(),
  credits: z.string().nullable().optional(),
  resourceType: z.string(),
  language: z.enum(["english", "hindi"]),
  status: ResourceStatusEnum,
  upvoteCount: z.number().optional(),
  downvoteCount: z.number().optional(),
  userVote: z.enum(["upvote", "downvote"]).nullable().optional(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
  tags: z.array(TagSchema),
  techStack: z.array(TechStackSchema),
  creator: CreatorSchema.optional(),
  reason: z.string().nullable().optional(), // For rejected resources
  isPublished: z.boolean().optional(),
});

// ── Routes ───────────────────────────────────────

export const getResources = createRoute({
  path: "/",
  method: "get",
  tags,
  summary: "List all resources with cursor pagination",
  description:
    "Returns approved resources with cursor-based pagination for infinite scroll.",
  request: {
    query: z.object({
      cursor: z.string().optional(),
      limit: z.coerce.number().min(1).max(100).default(20).optional(),
      resourceType: z.string().optional(),
      language: z.enum(["english", "hindi"]).optional(),
      tag: z.union([z.string(), z.array(z.string())]).optional(),
      techStack: z.union([z.string(), z.array(z.string())]).optional(),
      search: z.string().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        status: z.number().default(200),
        data: z.array(SingleResourceSchema),
        nextCursor: z.string().nullable(),
        hasMore: z.boolean(),
      }),
      "List of resources",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      ErrorSchema,
      "Internal server error",
    ),
  },
});

export const getResourceOptions = createRoute({
  path: "/options",
  method: "get",
  tags,
  summary: "Get form options",
  description:
    "Returns available resource types, tags, and tech stacks for form dropdowns.",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        status: z.number().default(200),
        data: z.object({
          resourceTypes: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              label: z.string(),
              icon: z.string().nullable().optional(),
            }),
          ),
          tags: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
            }),
          ),
          techStack: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
            }),
          ),
        }),
      }),
      "Form options",
    ),
  },
});

export const getMyResources = createRoute({
  path: "/my",
  method: "get",
  tags,
  summary: "Get my resources",
  description:
    "Returns the authenticated user's submitted resources with pagination, filters, and KPIs.",
  request: {
    query: z.object({
      page: z.coerce.number().min(1).default(1).optional(),
      limit: z.coerce.number().min(1).max(100).default(20).optional(),
      status: ResourceStatusEnum.optional(),
      resourceType: z.string().optional(),
      search: z.string().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        status: z.number().default(200),
        data: z.array(SingleResourceSchema),
        kpis: z.object({
          total: z.number(),
          approved: z.number(),
          pending: z.number(),
          rejected: z.number(),
        }),
        meta: z.object({
          total: z.number(),
          page: z.number(),
          limit: z.number(),
          totalPages: z.number(),
        }),
      }),
      "My resources list",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(ErrorSchema, "Unauthorized"),
  },
});

export const getMyResourceById = createRoute({
  path: "/my/{id}",
  method: "get",
  tags,
  summary: "Get my resource by ID",
  description: "Returns a user's own resource by ID (any status).",
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        status: z.number().default(200),
        data: SingleResourceSchema,
      }),
      "My resource",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(ErrorSchema, "Not found"),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(ErrorSchema, "Unauthorized"),
  },
});

export const getResource = createRoute({
  path: "/{id}",
  method: "get",
  tags,
  summary: "Get a resource by ID",
  description: "Returns a single resource by its ID.",
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        status: z.number().default(200),
        data: SingleResourceSchema,
      }),
      "Resource details",
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(ErrorSchema, "Not found"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      ErrorSchema,
      "Internal server error",
    ),
  },
});

export const createResource = createRoute({
  path: "/",
  method: "post",
  tags,
  summary: "Create a new resource",
  description: "Creates a new resource. Requires authentication.",
  request: {
    body: jsonContent(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(5000).optional(),
        url: z.string().url(),
        image: z.string().optional(),
        credits: z.string().max(500).optional(),
        resourceType: z.string().min(1),
        language: z.enum(["english", "hindi"]).default("english").optional(),
        tags: z.array(z.string()).optional(),
        techStack: z.array(z.string()).optional(),
      }),
      "Resource details",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      z.object({
        status: z.number().default(201),
        data: SingleResourceSchema,
      }),
      "Created resource",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(ErrorSchema, "Validation error"),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(ErrorSchema, "Unauthorized"),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(ErrorSchema, "Forbidden"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      ErrorSchema,
      "Internal server error",
    ),
  },
});

export const updateResource = createRoute({
  path: "/{id}",
  method: "patch", // Change to PATCH
  tags,
  summary: "Update a resource",
  description: "Updates a resource. Only the owner can update their resource.",
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: jsonContent(
      z.object({
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(5000).optional(),
        url: z.string().url().optional(),
        image: z.string().optional(),
        credits: z.string().max(500).optional(),
        resourceType: z.string().min(1).optional(),
        language: z.enum(["english", "hindi"]).optional(),
        tags: z.array(z.string()).optional(),
        techStack: z.array(z.string()).optional(),
      }),
      "Resource fields to update",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        status: z.number().default(200),
        data: SingleResourceSchema,
      }),
      "Updated resource",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(ErrorSchema, "Validation error"),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(ErrorSchema, "Unauthorized"),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(ErrorSchema, "Forbidden"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(ErrorSchema, "Not found"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      ErrorSchema,
      "Internal server error",
    ),
  },
});

export const removeResource = createRoute({
  path: "/{id}",
  method: "delete",
  tags,
  summary: "Delete a resource",
  description:
    "Soft deletes a resource. Only the owner can delete their resource.",
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        status: z.number().default(200),
        success: z.boolean().default(true),
      }),
      "Resource deleted",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(ErrorSchema, "Unauthorized"),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(ErrorSchema, "Forbidden"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(ErrorSchema, "Not found"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      ErrorSchema,
      "Internal server error",
    ),
  },
});

export const restoreResource = createRoute({
  path: "/{id}/restore",
  method: "post",
  tags,
  summary: "Restore a deleted resource",
  description:
    "Restores a soft-deleted resource. Only the owner can restore their resource.",
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        status: z.number().default(200),
        data: SingleResourceSchema,
      }),
      "Restored resource",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(ErrorSchema, "Unauthorized"),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(ErrorSchema, "Forbidden"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(ErrorSchema, "Not found"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      ErrorSchema,
      "Internal server error",
    ),
  },
});

export type GetResourcesRoute = typeof getResources;
export type GetResourceOptionsRoute = typeof getResourceOptions;
export type GetMyResourcesRoute = typeof getMyResources;
export type GetMyResourceByIdRoute = typeof getMyResourceById;
export type GetResourceRoute = typeof getResource;
export type CreateResourceRoute = typeof createResource;
export type UpdateResourceRoute = typeof updateResource;
export type RemoveResourceRoute = typeof removeResource;
export type RestoreResourceRoute = typeof restoreResource;
