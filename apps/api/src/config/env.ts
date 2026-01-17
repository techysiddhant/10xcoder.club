import { z } from '@workspace/schemas'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_HOST: z.string().min(1),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32, 'Auth secret must be at least 32 characters'),
  API_URL: z.string().url(),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  YOUTUBE_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1)
})

const result = EnvSchema.safeParse(process.env)

if (!result.success) {
  console.error('❌ Invalid environment variables:')
  for (const issue of result.error.issues) {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`)
  }
  console.error('\n📝 Please check apps/api/.env.example for required variables.')
  process.exit(1)
}

export const env = result.data
