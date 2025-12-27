import { z } from 'zod'

/**
 * Re-export zod for convenience in apps if you want to build derived schemas.
 */
export { z }

/**
 * Common API error shape (useful for consistent client handling)
 */
export const ApiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional()
})
export type ApiError = z.infer<typeof ApiErrorSchema>

/**
 * Example: user create payload (you can replace/extend this with your real domain schemas)
 */
export const UserCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(80)
})
export type UserCreate = z.infer<typeof UserCreateSchema>

export const UserSchema = UserCreateSchema.extend({
  id: z.string()
})
export type User = z.infer<typeof UserSchema>
