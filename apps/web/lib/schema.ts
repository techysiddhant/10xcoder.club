import { z, ResourceLanguageSchema } from "@workspace/schemas";
import type { ResourceType as DBResourceType } from "@workspace/database";

// Zod schema for URL validation
export const resourceInputUrlSchema = z.object({
  url: z.string().min(1, "URL is required.").url("Please enter a valid URL."),
});

/**
 * Client-side create resource schema. Aligns with API create body (server maps to DB NewResource);
 * adds validation and custom error messages for forms.
 */
export const resourceCreateSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required.")
    .max(200, "Title must be at most 200 characters."),
  description: z
    .string()
    .max(2000, "Description must be at most 2000 characters.")
    .optional()
    .or(z.literal("")),
  url: z.string().min(1, "URL is required.").url("Please enter a valid URL."),
  image: z.string().optional().or(z.literal("")),
  credits: z
    .string()
    .max(500, "Credits must be at most 500 characters.")
    .optional()
    .or(z.literal("")),
  resourceType: z.string().min(1, "Resource type is required."),
  language: ResourceLanguageSchema.optional().default("english"),
  tags: z.array(z.string()).max(10, "Maximum 10 tags.").optional().default([]),
  techStack: z
    .array(z.string())
    .max(4, "Maximum 4 tech stack items.")
    .optional()
    .default([]),
});

export type ResourceCreateInput = z.infer<typeof resourceCreateSchema>;

/** Client create payload; matches API create body. Server maps resourceType → NewResource.resourceTypeId. */
export type ResourceCreateClient = ResourceCreateInput;

/** Web shape for resource type; derived from DB model so it stays in sync. */
export type ResourceType = Pick<
  DBResourceType,
  "id" | "name" | "label" | "icon"
>;
