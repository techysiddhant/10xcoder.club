import { z } from '@workspace/schemas'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().optional()
})

export const env = EnvSchema.parse(process.env)
