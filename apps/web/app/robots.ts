import { publicEnv } from "@/env/public";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/profile", "/submissions", "/auth"],
      },
    ],
    sitemap: `${(publicEnv.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")}/sitemap.xml`,
  };
}
