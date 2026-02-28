import { z } from "@workspace/schemas";

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(8000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  CORS_ORIGIN: z.string().optional(),

  // Postgres
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_HOST: z.string().min(1),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),

  // Redis
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // Better Auth
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "Auth secret must be at least 32 characters"),
  API_URL: z.string().url(),

  // GitHub OAuth
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),

  // Autosend
  AUTOSEND_API_KEY: z.string().min(1),
  DOMAIN: z.string().min(1),

  // Logflare (production only)
  LOGFLARE_API_KEY: z.string().optional(),
  LOGFLARE_SOURCE_ID: z.string().optional(),

  // AWS S3
  AWS_REGION: z.string().min(1).default("ap-south-1"),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_S3_BUCKET: z.string().min(1),
  CDN_URL: z.string().url(),

  // YouTube
  YOUTUBE_API_KEY: z.string().min(1).optional(),

  // Sentry (production only)
  SENTRY_DSN: z.string().url().optional(),
});

const result = EnvSchema.safeParse(process.env);

if (!result.success) {
  console.error("❌ Invalid environment variables:");
  for (const issue of result.error.issues) {
    console.error(`   - ${issue.path.join(".")}: ${issue.message}`);
  }
  console.error(
    "\n📝 Please check apps/server/.env.example for required variables.",
  );
  throw new Error("Invalid environment variables");
}

export const env = result.data;
export const isProduction = env.NODE_ENV === "production";
