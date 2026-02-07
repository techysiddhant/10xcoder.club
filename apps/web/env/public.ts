import { z } from "@workspace/schemas";

const PublicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
});

export const publicEnv = PublicEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
});
