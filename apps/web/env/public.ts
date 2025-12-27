import { z } from '@workspace/schemas'

const PublicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().optional()
})

export const publicEnv = PublicEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL
})


