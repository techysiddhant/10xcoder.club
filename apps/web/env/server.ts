import { z } from '@workspace/schemas'

const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).optional()
})

export const serverEnv = ServerEnvSchema.parse(process.env)
