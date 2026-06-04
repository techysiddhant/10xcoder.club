import { z } from "@workspace/schemas";

const EnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(8000),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    CORS_ORIGIN: z.string().optional(),

    // Postgres
    DATABASE_URL: z.string().url().optional(),
    POSTGRES_USER: z.string().optional(),
    POSTGRES_PASSWORD: z.string().optional(),
    POSTGRES_DB: z.string().optional(),
    POSTGRES_HOST: z.string().optional(),
    POSTGRES_PORT: z.coerce.number().int().positive().default(5432),

    // Redis
    REDIS_URL: z.string().url().optional(),
    REDIS_HOST: z.string().optional(),
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

    // ImageKit
    IMAGEKIT_PUBLIC_KEY: z.string().min(1),
    IMAGEKIT_PRIVATE_KEY: z.string().min(1),
    IMAGEKIT_URL_ENDPOINT: z.string().url(),
    CDN_URL: z.string().url(),

    // YouTube
    YOUTUBE_API_KEY: z.string().min(1).optional(),

    // Gemini
    GEMINI_API_KEY: z.string().optional(),

    // Sentry (production only)
    SENTRY_DSN: z.string().url().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.DATABASE_URL) {
      if (!data.POSTGRES_USER) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "POSTGRES_USER is required when DATABASE_URL is not provided",
          path: ["POSTGRES_USER"],
        });
      }
      if (!data.POSTGRES_PASSWORD) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "POSTGRES_PASSWORD is required when DATABASE_URL is not provided",
          path: ["POSTGRES_PASSWORD"],
        });
      }
      if (!data.POSTGRES_DB) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "POSTGRES_DB is required when DATABASE_URL is not provided",
          path: ["POSTGRES_DB"],
        });
      }
      if (!data.POSTGRES_HOST) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "POSTGRES_HOST is required when DATABASE_URL is not provided",
          path: ["POSTGRES_HOST"],
        });
      }
    }

    if (!data.REDIS_URL && !data.REDIS_HOST) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "REDIS_HOST is required when REDIS_URL is not provided",
        path: ["REDIS_HOST"],
      });
    }
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
