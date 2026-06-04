import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

const tags = ["Upload"];

// ── Shared schemas ───────────────────────────────

const ErrorSchema = z.object({
  status: z.string().default("error"),
  message: z.string(),
});

// ── Routes ───────────────────────────────────────

export const createPresigned = createRoute({
  path: "/presigned",
  method: "post",
  tags,
  summary: "Get presigned URL for direct S3 upload",
  description:
    'Returns a presigned S3 URL and key for direct file upload from client. Folder must be "resources" or "profiles". Max: 2MB. Types: JPEG, PNG, JPG, WebP. For "profiles", also returns imageUrl for updating user avatar.',
  request: {
    body: jsonContent(
      z.object({
        fileName: z.string().min(1).max(255),
        fileType: z.enum([
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp",
        ]),
        fileSize: z
          .number()
          .int()
          .min(1)
          .max(2 * 1024 * 1024),
        folder: z.enum(["resources", "profiles"]),
      }),
      "Upload request",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        signature: z.string(),
        token: z.string(),
        expire: z.number(),
        publicKey: z.string(),
        key: z.string(),
        imageUrl: z.string().optional(),
      }),
      "ImageKit upload parameters",
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(ErrorSchema, "Validation error"),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(ErrorSchema, "Unauthorized"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      ErrorSchema,
      "Internal server error",
    ),
  },
});

export type CreatePresignedRoute = typeof createPresigned;
