import { Elysia, t } from "elysia";
import { authMiddleware } from "@/middleware/auth.middleware";
import { auth } from "@/lib/auth";
import * as handlers from "@/controllers/resources.controller";
import * as schemas from "./resources.schema";
import { getResourceOptions } from "@/services/options.service";

export const resourcesRoutes = new Elysia({ prefix: "/api/resources" })
  .use(authMiddleware)

  // GET /api/resources - List all resources (public, but userId optional for isUpvoted)
  .get(
    "/",
    async ({ query, request }) => {
      // Try to get user session (optional - doesn't require auth)
      let userId: string | undefined;
      try {
        const session = await auth.api.getSession({ headers: request.headers });
        userId = session?.user?.id;
      } catch {
        // User not logged in - that's fine
      }

      return handlers.getResources({ query, userId });
    },
    schemas.getResourcesSchema,
  )

  // GET /api/resources/options - Get form options (public)
  .get(
    "/options",
    async () => {
      const options = await getResourceOptions();
      return { status: 200, data: options };
    },
    {
      detail: {
        tags: ["Resources"],
        summary: "Get form options",
        description:
          "Returns available resource types, tags, and tech stacks for form dropdowns.",
      },
      response: {
        200: t.Object({
          status: t.Number({ example: 200 }),
          data: t.Object({
            resourceTypes: t.Array(
              t.Object({
                id: t.String(),
                name: t.String(),
                label: t.String(),
                icon: t.Nullable(t.String()),
              }),
            ),
            tags: t.Array(
              t.Object({
                id: t.String(),
                name: t.String(),
              }),
            ),
            techStack: t.Array(
              t.Object({
                id: t.String(),
                name: t.String(),
              }),
            ),
          }),
        }),
      },
    },
  )

  // GET /api/resources/my - Get user's own resources with KPIs (authenticated)
  .get("/my", handlers.getMyResources, {
    query: t.Object({
      page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
      limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
      status: t.Optional(
        t.Union([
          t.Literal("approved"),
          t.Literal("rejected"),
          t.Literal("pending"),
        ]),
      ),
      resourceType: t.Optional(t.String()),
      search: t.Optional(t.String()),
    }),
    auth: true,
    detail: {
      tags: ["Resources"],
      summary: "Get my resources",
      description:
        "Returns the authenticated user's submitted resources with pagination, filters, and KPIs (total, approved, pending, rejected counts).",
    },
    response: {
      200: t.Object({
        status: t.Number({ example: 200 }),
        data: t.Array(t.Any()),
        kpis: t.Object({
          total: t.Number(),
          approved: t.Number(),
          pending: t.Number(),
          rejected: t.Number(),
        }),
        meta: t.Object({
          total: t.Number(),
          page: t.Number(),
          limit: t.Number(),
          totalPages: t.Number(),
        }),
      }),
      401: t.Object({
        success: t.Literal(false),
        status: t.Number(),
        code: t.String(),
        message: t.String(),
      }),
    },
  })

  // GET /api/resources/my/:id - Get user's own resource by ID (any status, includes rejection reason)
  .get("/my/:id", handlers.getMyResourceById, {
    params: t.Object({
      id: t.String(),
    }),
    auth: true,
    detail: {
      tags: ["Resources"],
      summary: "Get my resource by ID",
      description:
        "Returns a user's own resource by ID (any status: pending, approved, rejected). Includes rejection reason for rejected resources.",
    },
    response: {
      200: t.Object({
        status: t.Number({ example: 200 }),
        data: t.Object({
          id: t.String(),
          title: t.String(),
          description: t.Nullable(t.String()),
          url: t.String(),
          image: t.Nullable(t.String()),
          resourceType: t.String(),
          language: t.String(),
          status: t.Union([
            t.Literal("approved"),
            t.Literal("rejected"),
            t.Literal("pending"),
          ]),
          reason: t.Nullable(t.String()),
          isPublished: t.Boolean(),
          createdAt: t.Any(),
          updatedAt: t.Any(),
          tags: t.Array(t.Any()),
          techStack: t.Array(t.Any()),
        }),
      }),
      401: t.Object({
        success: t.Literal(false),
        status: t.Number(),
        code: t.String(),
        message: t.String(),
      }),
      404: t.Object({
        success: t.Literal(false),
        status: t.Number(),
        code: t.String(),
        message: t.String(),
      }),
    },
  })

  // GET /api/resources/:id - Get single resource (public)
  .get("/:id", handlers.getResource, schemas.getResourceByIdSchema)

  // POST /api/resources - Create resource (authenticated)
  .post("/", handlers.create, {
    ...schemas.createResourceSchema,
    auth: true,
  })

  // PUT /api/resources/:id - Update resource (authenticated)
  .put("/:id", handlers.update, {
    ...schemas.updateResourceSchema,
    auth: true,
  })

  // DELETE /api/resources/:id - Soft delete resource (authenticated)
  .delete("/:id", handlers.remove, {
    ...schemas.deleteResourceSchema,
    auth: true,
  })

  // POST /api/resources/:id/restore - Restore deleted resource (authenticated)
  .post("/:id/restore", handlers.restore, {
    ...schemas.restoreResourceSchema,
    auth: true,
  });
