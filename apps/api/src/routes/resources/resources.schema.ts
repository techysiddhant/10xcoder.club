import { t } from "elysia";
import { ErrorResponseSchema } from "@/utils/errors";

// ==========================================
// Response Schemas
// ==========================================

// Tag schema
const TagSchema = t.Object({
  id: t.String(),
  name: t.String(),
  createdAt: t.Date(),
});

// TechStack schema
const TechStackSchema = t.Object({
  id: t.String(),
  name: t.String(),
  createdAt: t.Date(),
});

// Creator schema
const CreatorSchema = t.Object({
  id: t.String(),
  name: t.Nullable(t.String()),
  image: t.Nullable(t.String()),
  username: t.Nullable(t.String()),
});

// Base resource schema (for single resource responses - without isUpvoted)
const SingleResourceSchema = t.Object({
  id: t.String(),
  title: t.String(),
  description: t.Nullable(t.String()),
  url: t.String(),
  image: t.Nullable(t.String()),
  credits: t.Nullable(t.String()),
  resourceType: t.String(),
  language: t.Union([t.Literal("english"), t.Literal("hindi")]),
  status: t.Union([
    t.Literal("approved"),
    t.Literal("rejected"),
    t.Literal("pending"),
  ]),
  upvoteCount: t.Number(),
  createdAt: t.Date(),
  updatedAt: t.Date(),
  tags: t.Array(TagSchema),
  techStack: t.Array(TechStackSchema),
  creator: CreatorSchema,
});

// Resource list item schema (includes vote info for authenticated list requests)
const ResourceListItemSchema = t.Object({
  id: t.String(),
  title: t.String(),
  description: t.Nullable(t.String()),
  url: t.String(),
  image: t.Nullable(t.String()),
  credits: t.Nullable(t.String()),
  resourceType: t.String(),
  language: t.Union([t.Literal("english"), t.Literal("hindi")]),
  status: t.Union([
    t.Literal("approved"),
    t.Literal("rejected"),
    t.Literal("pending"),
  ]),
  upvoteCount: t.Number(),
  downvoteCount: t.Number(),
  userVote: t.Union([t.Literal("upvote"), t.Literal("downvote"), t.Null()]),
  createdAt: t.Date(),
  updatedAt: t.Date(),
  tags: t.Array(TagSchema),
  techStack: t.Array(TechStackSchema),
  creator: CreatorSchema,
});

// Resource list for paginated response
const ResourceListSchema = t.Array(ResourceListItemSchema);

// ==========================================
// Request & Response Schemas
// ==========================================

// Create resource schema
export const createResourceSchema = {
  body: t.Object({
    title: t.String({ minLength: 1, maxLength: 200 }),
    description: t.Optional(t.String({ maxLength: 2000 })),
    url: t.String({ format: "uri" }),
    image: t.Optional(t.String()),
    credits: t.Optional(t.String({ maxLength: 500 })),
    resourceType: t.String({ minLength: 1 }),
    language: t.Optional(t.Union([t.Literal("english"), t.Literal("hindi")])),
    tags: t.Optional(t.Array(t.String())),
    techStack: t.Optional(t.Array(t.String())),
  }),
  detail: {
    tags: ["Resources"],
    summary: "Create a new resource",
    description: "Creates a new resource. Requires authentication.",
  },
  response: {
    201: t.Object({
      status: t.Number({ example: 201 }),
      data: SingleResourceSchema,
    }),
    400: ErrorResponseSchema,
    401: ErrorResponseSchema,
    500: ErrorResponseSchema,
  },
};

// Get all resources schema (cursor-based pagination for infinite scroll)
export const getResourcesSchema = {
  query: t.Object({
    cursor: t.Optional(t.String()),
    limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
    resourceType: t.Optional(t.String()),
    language: t.Optional(t.Union([t.Literal("english"), t.Literal("hindi")])),
    tag: t.Optional(t.String()),
    techStack: t.Optional(t.String()),
    search: t.Optional(t.String()),
  }),
  detail: {
    tags: ["Resources"],
    summary: "List all resources with cursor pagination",
    description:
      "Returns approved resources with cursor-based pagination for infinite scroll.",
  },
  response: {
    200: t.Object({
      status: t.Number({ example: 200 }),
      data: ResourceListSchema,
      nextCursor: t.Nullable(t.String()),
      hasMore: t.Boolean(),
    }),
    500: ErrorResponseSchema,
  },
};

// Get single resource schema
export const getResourceByIdSchema = {
  params: t.Object({
    id: t.String(),
  }),
  detail: {
    tags: ["Resources"],
    summary: "Get a resource by ID",
    description: "Returns a single resource by its ID.",
  },
  response: {
    200: t.Object({
      status: t.Number({ example: 200 }),
      data: SingleResourceSchema,
    }),
    404: ErrorResponseSchema,
    500: ErrorResponseSchema,
  },
};

// Update resource schema
export const updateResourceSchema = {
  params: t.Object({
    id: t.String(),
  }),
  body: t.Object({
    title: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
    description: t.Optional(t.String({ maxLength: 2000 })),
    url: t.Optional(t.String({ format: "uri" })),
    image: t.Optional(t.String()),
    credits: t.Optional(t.String({ maxLength: 500 })),
    resourceType: t.Optional(t.String({ minLength: 1 })),
    language: t.Optional(t.Union([t.Literal("english"), t.Literal("hindi")])),
    tags: t.Optional(t.Array(t.String())),
    techStack: t.Optional(t.Array(t.String())),
  }),
  detail: {
    tags: ["Resources"],
    summary: "Update a resource",
    description:
      "Updates a resource. Only the owner can update their resource.",
  },
  response: {
    200: t.Object({
      status: t.Number({ example: 200 }),
      data: SingleResourceSchema,
    }),
    400: ErrorResponseSchema,
    401: ErrorResponseSchema,
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
    500: ErrorResponseSchema,
  },
};

// Delete resource schema
export const deleteResourceSchema = {
  params: t.Object({
    id: t.String(),
  }),
  detail: {
    tags: ["Resources"],
    summary: "Delete a resource",
    description:
      "Soft deletes a resource. Only the owner can delete their resource.",
  },
  response: {
    200: t.Object({
      status: t.Number({ example: 200 }),
      success: t.Boolean({ example: true }),
    }),
    401: ErrorResponseSchema,
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
    500: ErrorResponseSchema,
  },
};

// Restore resource schema
export const restoreResourceSchema = {
  params: t.Object({
    id: t.String(),
  }),
  detail: {
    tags: ["Resources"],
    summary: "Restore a deleted resource",
    description:
      "Restores a soft-deleted resource. Only the owner can restore their resource.",
  },
  response: {
    200: t.Object({
      status: t.Number({ example: 200 }),
      data: SingleResourceSchema,
    }),
    401: ErrorResponseSchema,
    403: ErrorResponseSchema,
    404: ErrorResponseSchema,
    500: ErrorResponseSchema,
  },
};
