import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  reactCompiler: true,
  transpilePackages: ["@workspace/schemas", "@workspace/ui"],
};

export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
});
