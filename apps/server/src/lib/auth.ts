import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  admin,
  lastLoginMethod,
  magicLink,
  openAPI,
  username,
} from "better-auth/plugins";

import { env, isProduction } from "@/config/env";
import { db } from "@/db/index";
import { DEFAULT_USER_NAMES, RoleSchema } from "@workspace/schemas";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import {
  sendMagicLinkEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
} from "@/lib/autosend";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  secondaryStorage: {
    get: async (key) => {
      return await redis.get(key);
    },
    set: async (key, value, ttl) => {
      if (ttl) await redis.set(key, value, "EX", ttl);
      else await redis.set(key, value);
    },
    delete: async (key) => {
      await redis.del(key);
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // If username is already provided, use it as-is
          if (user.username) {
            return {
              data: {
                ...user,
                role: RoleSchema.enum.USER,
              },
            };
          }

          // Generate username from email + timestamp
          const emailPrefix = user.email
            .split("@")[0]!
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
          const timestamp = Date.now().toString(36); // Base36 for shorter string
          const generatedUsername = `${emailPrefix}_${timestamp}`;

          return {
            data: {
              ...user,
              username: generatedUsername,
              displayUsername: user.displayUsername || generatedUsername,
              role: RoleSchema.enum.USER,
            },
          };
        },
      },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        enum: RoleSchema.enum,
        default: RoleSchema.enum.USER,
        input: false,
      },
    },
  },
  disablePaths: ["/is-username-available"],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      try {
        await sendResetPasswordEmail(user.email, user.name, url);
      } catch (err) {
        logger.error(
          { err, email: user.email },
          "Failed to enqueue reset password email",
        );
        throw err;
      }
    },
  },
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
  },
  advanced: {
    cookiePrefix: "10xcoder",
    defaultCookieAttributes: {
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["github"],
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      try {
        await sendVerificationEmail(user.email, user.name, url);
      } catch (err) {
        logger.error(
          { err, email: user.email },
          "Failed to enqueue verification email",
        );
        throw err;
      }
    },
  },
  plugins: [
    admin(),
    username({
      minUsernameLength: 5,
      usernameValidator: (usernameValue: string) => {
        if (
          DEFAULT_USER_NAMES.includes(
            usernameValue as (typeof DEFAULT_USER_NAMES)[number],
          )
        ) {
          throw new APIError("BAD_REQUEST", {
            message: "Username is not available",
          });
        }
        return true;
      },
      displayUsernameValidator: (displayUsername: string) => {
        return /^[a-zA-Z0-9_-]+$/.test(displayUsername);
      },
    }),
    lastLoginMethod({
      storeInDatabase: true,
    }),
    openAPI(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        try {
          await sendMagicLinkEmail(email, url);
        } catch (err) {
          logger.error({ err, email }, "Failed to enqueue magic link email");
          throw err;
        }
      },
    }),
  ],
  onAPIError: {
    throw: true,
    onError: (error) => {
      console.error("BETTER AUTH API ERROR", error);
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieName: "10xcoder_session",
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
      strategy: "jwe",
    },
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.API_URL,
  basePath: "/api/auth",
  trustedOrigins: (() => {
    const parsed =
      env.CORS_ORIGIN?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) ?? [];
    return parsed.length ? parsed : [env.API_URL];
  })(),
  appName: "10xCoder.club",
});
