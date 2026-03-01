import * as HttpStatusCodes from "stoker/http-status-codes";
import type { AppRouteHandler } from "@/lib/types";

import * as services from "@/services/resources.service";
import { getResourceOptions as getOptions } from "@/services/options.service";
import type {
  GetResourcesRoute,
  GetResourceOptionsRoute,
  GetMyResourcesRoute,
  GetMyResourceByIdRoute,
  GetResourceRoute,
  CreateResourceRoute,
  UpdateResourceRoute,
  RemoveResourceRoute,
  RestoreResourceRoute,
} from "@/routes/resources/resources.routes";
import { logger } from "@/lib/logger";
import { auth } from "@/lib/auth";

// ==========================================
// Constants
// ==========================================
const DEFAULT_LIMIT = 20;

const UUID_V4_TO_V8_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(id: string): boolean {
  return UUID_V4_TO_V8_PATTERN.test(id);
}

// ==========================================
// Get All Resources (Cursor-based Pagination)
// ==========================================
export const getResources: AppRouteHandler<GetResourcesRoute> = async (c) => {
  try {
    const query = c.req.valid("query");

    // Optional auth check for user context
    let userId: string | undefined;
    try {
      const session = await auth.api.getSession({
        headers: c.req.raw.headers,
      });
      userId = session?.user?.id;
    } catch {
      // User not logged in, ignore
    }

    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, 50); // MAX_PUBLIC_LIMIT = 50

    const result = await services.getAllResources({
      cursor: query.cursor,
      limit,
      resourceType: query.resourceType,
      language: query.language,
      tag: query.tag,
      techStack: query.techStack,
      search: query.search,
      userId,
    });

    return c.json(
      {
        status: HttpStatusCodes.OK,
        data: result.data as any,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      },
      HttpStatusCodes.OK,
    ) as any;
  } catch (error) {
    logger.error({ error }, "Error fetching resources");
    return c.json(
      { status: "error", message: "Internal server error" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    ) as any;
  }
};

// ==========================================
// Get Resource Options
// ==========================================
export const getResourceOptions: AppRouteHandler<
  GetResourceOptionsRoute
> = async (c) => {
  try {
    const options = await getOptions();
    return c.json(
      {
        status: HttpStatusCodes.OK,
        data: options,
      },
      HttpStatusCodes.OK,
    ) as any;
  } catch (error) {
    logger.error({ error }, "Error fetching resource options");
    return c.json(
      { status: "error", message: "Internal server error" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    ) as any;
  }
};

// ==========================================
// Get User's Own Resources
// ==========================================
export const getMyResources: AppRouteHandler<GetMyResourcesRoute> = async (
  c,
) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json(
        { status: "error", message: "Unauthorized" },
        HttpStatusCodes.UNAUTHORIZED,
      ) as any;
    }

    const query = c.req.valid("query");
    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, 100); // MAX_USER_RESOURCES_LIMIT

    const result = await services.getUserResources(user.id, {
      page: query.page ?? 1,
      limit,
      status: query.status,
      resourceType: query.resourceType,
      search: query.search,
    });

    return c.json(
      {
        status: HttpStatusCodes.OK,
        ...result,
      },
      HttpStatusCodes.OK,
    ) as any;
  } catch (error) {
    logger.error({ error }, "Error fetching user resources");
    return c.json(
      { status: "error", message: "Internal server error" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    ) as any;
  }
};

// ==========================================
// Get User's Own Resource by ID
// ==========================================
export const getMyResourceById: AppRouteHandler<
  GetMyResourceByIdRoute
> = async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json(
        { status: "error", message: "Unauthorized" },
        HttpStatusCodes.UNAUTHORIZED,
      ) as any;
    }

    const { id } = c.req.valid("param");
    if (!isValidUuid(id)) {
      return c.json(
        { status: "error", message: "Not found" },
        HttpStatusCodes.NOT_FOUND,
      ) as any;
    }

    const result = await services.getUserResourceById(id, user.id);
    if (!result) {
      return c.json(
        { status: "error", message: "Not found" },
        HttpStatusCodes.NOT_FOUND,
      ) as any;
    }

    return c.json(
      {
        status: HttpStatusCodes.OK,
        data: result as any, // casting due to complex relation typings
      },
      HttpStatusCodes.OK,
    ) as any;
  } catch (error) {
    logger.error({ error }, "Error fetching user resource by id");
    return c.json(
      { status: "error", message: "Internal server error" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    ) as any;
  }
};

// ==========================================
// Get Public Resource by ID
// ==========================================
export const getResource: AppRouteHandler<GetResourceRoute> = async (c) => {
  try {
    let userId: string | undefined;
    try {
      const session = await auth.api.getSession({
        headers: c.req.raw.headers,
      });
      userId = session?.user?.id;
    } catch {
      // User not logged in, ignore
    }

    const { id } = c.req.valid("param");
    if (!isValidUuid(id)) {
      return c.json(
        { status: "error", message: "Not found" },
        HttpStatusCodes.NOT_FOUND,
      ) as any;
    }

    const result = await services.getResourceByIdForView(id, userId);
    if (!result) {
      return c.json(
        { status: "error", message: "Not found" },
        HttpStatusCodes.NOT_FOUND,
      ) as any;
    }

    return c.json(
      {
        status: HttpStatusCodes.OK,
        data: result as any,
      },
      HttpStatusCodes.OK,
    ) as any;
  } catch (error) {
    logger.error({ error }, "Error fetching public resource by id");
    return c.json(
      { status: "error", message: "Internal server error" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    ) as any;
  }
};

// ==========================================
// Create Resource
// ==========================================
export const createResource: AppRouteHandler<CreateResourceRoute> = async (
  c,
) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json(
        { status: "error", message: "Unauthorized" },
        HttpStatusCodes.UNAUTHORIZED,
      ) as any;
    }

    if (!user.emailVerified) {
      return c.json(
        {
          status: "error",
          message:
            "Forbidden: Please verify your email before submitting resources",
        },
        HttpStatusCodes.FORBIDDEN,
      ) as any;
    }

    const body = c.req.valid("json");
    const result = await services.createResource(
      {
        title: body.title,
        description: body.description ?? undefined,
        url: body.url,
        image: body.image ?? undefined,
        resourceType: body.resourceType,
        language: body.language ?? "english",
        tags: body.tags ?? [],
        techStack: body.techStack ?? [],
        credits: body.credits ?? undefined,
      },
      user.id,
    );

    return c.json(
      {
        status: HttpStatusCodes.CREATED,
        data: result as any,
      },
      HttpStatusCodes.CREATED,
    ) as any;
  } catch (error) {
    logger.error({ error }, "Error creating resource");
    return c.json(
      { status: "error", message: "Internal server error" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    ) as any;
  }
};

// ==========================================
// Update Resource
// ==========================================
export const updateResource: AppRouteHandler<UpdateResourceRoute> = async (
  c,
) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json(
        { status: "error", message: "Unauthorized" },
        HttpStatusCodes.UNAUTHORIZED,
      ) as any;
    }

    const { id } = c.req.valid("param");
    if (!isValidUuid(id)) {
      return c.json(
        { status: "error", message: "Not found" },
        HttpStatusCodes.NOT_FOUND,
      ) as any;
    }

    const body = c.req.valid("json");
    const result = await services.updateResource(id, { ...body }, user.id);

    if ("error" in result) {
      const status = result.status ?? HttpStatusCodes.INTERNAL_SERVER_ERROR;
      const responseStatus =
        status === HttpStatusCodes.BAD_REQUEST
          ? HttpStatusCodes.BAD_REQUEST
          : status === HttpStatusCodes.NOT_FOUND
            ? HttpStatusCodes.NOT_FOUND
            : status === HttpStatusCodes.FORBIDDEN
              ? HttpStatusCodes.FORBIDDEN
              : HttpStatusCodes.INTERNAL_SERVER_ERROR;

      return c.json(
        { status: "error", message: result.error ?? "An error occurred" },
        responseStatus,
      ) as any;
    }

    if (!result.data) {
      return c.json(
        { status: "error", message: "Not found" },
        HttpStatusCodes.NOT_FOUND,
      ) as any;
    }

    return c.json(
      {
        status: HttpStatusCodes.OK,
        data: result.data as any,
      },
      HttpStatusCodes.OK,
    ) as any;
  } catch (error) {
    logger.error({ error }, "Error updating resource");
    return c.json(
      { status: "error", message: "Internal server error" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    ) as any;
  }
};

// ==========================================
// Delete Resource
// ==========================================
export const removeResource: AppRouteHandler<RemoveResourceRoute> = async (
  c,
) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json(
        { status: "error", message: "Unauthorized" },
        HttpStatusCodes.UNAUTHORIZED,
      ) as any;
    }

    const { id } = c.req.valid("param");
    if (!isValidUuid(id)) {
      return c.json(
        { status: "error", message: "Not found" },
        HttpStatusCodes.NOT_FOUND,
      ) as any;
    }

    const result = await services.deleteResource(id, user.id);

    if ("error" in result) {
      const status = result.status ?? HttpStatusCodes.INTERNAL_SERVER_ERROR;
      const responseStatus =
        status === HttpStatusCodes.BAD_REQUEST
          ? HttpStatusCodes.BAD_REQUEST
          : status === HttpStatusCodes.NOT_FOUND
            ? HttpStatusCodes.NOT_FOUND
            : status === HttpStatusCodes.FORBIDDEN
              ? HttpStatusCodes.FORBIDDEN
              : HttpStatusCodes.INTERNAL_SERVER_ERROR;

      return c.json(
        { status: "error", message: result.error ?? "An error occurred" },
        responseStatus,
      ) as any;
    }

    return c.json(
      {
        status: HttpStatusCodes.OK,
        success: true,
      },
      HttpStatusCodes.OK,
    ) as any;
  } catch (error) {
    logger.error({ error }, "Error deleting resource");
    return c.json(
      { status: "error", message: "Internal server error" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    ) as any;
  }
};

// ==========================================
// Restore Resource
// ==========================================
export const restoreResource: AppRouteHandler<RestoreResourceRoute> = async (
  c,
) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json(
        { status: "error", message: "Unauthorized" },
        HttpStatusCodes.UNAUTHORIZED,
      ) as any;
    }

    const { id } = c.req.valid("param");
    if (!isValidUuid(id)) {
      return c.json(
        { status: "error", message: "Not found" },
        HttpStatusCodes.NOT_FOUND,
      ) as any;
    }

    const result = await services.restoreResource(id, user.id);

    if ("error" in result) {
      const status = result.status ?? HttpStatusCodes.INTERNAL_SERVER_ERROR;
      const responseStatus =
        status === HttpStatusCodes.BAD_REQUEST
          ? HttpStatusCodes.BAD_REQUEST
          : status === HttpStatusCodes.NOT_FOUND
            ? HttpStatusCodes.NOT_FOUND
            : status === HttpStatusCodes.FORBIDDEN
              ? HttpStatusCodes.FORBIDDEN
              : HttpStatusCodes.INTERNAL_SERVER_ERROR;

      return c.json(
        { status: "error", message: result.error ?? "An error occurred" },
        responseStatus,
      ) as any;
    }

    if (!result.data) {
      return c.json(
        { status: "error", message: "Not found" },
        HttpStatusCodes.NOT_FOUND,
      ) as any;
    }

    return c.json(
      {
        status: HttpStatusCodes.OK,
        data: result.data as any,
      },
      HttpStatusCodes.OK,
    ) as any;
  } catch (error) {
    logger.error({ error }, "Error restoring resource");
    return c.json(
      { status: "error", message: "Internal server error" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR,
    ) as any;
  }
};
