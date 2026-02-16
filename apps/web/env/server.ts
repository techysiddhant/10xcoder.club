import { z } from "@workspace/schemas";

const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  API_URL: z.string().url(),
});

export const serverEnv = ServerEnvSchema.parse(process.env);
