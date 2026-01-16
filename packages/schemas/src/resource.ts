import { z } from 'zod'

// ==========================================
// Enums
// ==========================================

export const LanguageSchema = z.enum(['english', 'hindi'])
export type Language = z.infer<typeof LanguageSchema>

export const ResourceStatusSchema = z.enum(['approved', 'rejected', 'pending'])
export type ResourceStatus = z.infer<typeof ResourceStatusSchema>

// ==========================================
// Related Entity Schemas
// ==========================================

export const TagSchema = z.object({
  id: z.string(),
  name: z.string()
})
export type Tag = z.infer<typeof TagSchema>

export const TechStackSchema = z.object({
  id: z.string(),
  name: z.string()
})
export type TechStack = z.infer<typeof TechStackSchema>

// ==========================================
// Resource Schemas
// ==========================================

export const ResourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  url: z.string().url(),
  image: z.string().url().nullable(),
  resourceType: z.string(),
  language: LanguageSchema,
  status: ResourceStatusSchema,
  reason: z.string().nullable(),
  isPublished: z.boolean(),
  upvoteCount: z.number(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
  tags: z.array(TagSchema),
  techStack: z.array(TechStackSchema)
})
export type Resource = z.infer<typeof ResourceSchema>

// ==========================================
// Request Schemas
// ==========================================

export const CreateResourceSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  url: z.string().url(),
  image: z.string().url().optional(),
  resourceType: z.string().min(1),
  language: LanguageSchema.optional().default('english'),
  tags: z.array(z.string()).optional().default([]),
  techStack: z.array(z.string()).optional().default([])
})
export type CreateResource = z.infer<typeof CreateResourceSchema>

export const UpdateResourceSchema = CreateResourceSchema.partial()
export type UpdateResource = z.infer<typeof UpdateResourceSchema>

// ==========================================
// Query Schemas
// ==========================================

export const ListResourcesQuerySchema = z.object({
  page: z.coerce.number().positive().optional().default(1),
  limit: z.coerce.number().positive().max(100).optional().default(20),
  status: ResourceStatusSchema.optional(),
  resourceType: z.string().optional(),
  language: LanguageSchema.optional(),
  tag: z.string().optional(),
  techStack: z.string().optional(),
  search: z.string().optional()
})
export type ListResourcesQuery = z.infer<typeof ListResourcesQuerySchema>

// ==========================================
// Response Schemas
// ==========================================

export const PaginationMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number()
})
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>

export const PaginatedResourcesSchema = z.object({
  data: z.array(ResourceSchema),
  meta: PaginationMetaSchema
})
export type PaginatedResources = z.infer<typeof PaginatedResourcesSchema>
