import { publicEnv } from "@/env/public";
import { getResources } from "@/lib/http";
import type { GetResourcesResponse } from "@/lib/types";
import type { MetadataRoute } from "next";

const BASE = publicEnv.NEXT_PUBLIC_APP_URL;

/** Key pages for sitelinks: clear URLs Google can show under the main result */
const staticPages: MetadataRoute.Sitemap = [
  {
    url: BASE,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    url: `${BASE}/resources`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    url: `${BASE}/auth`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
  },
];

const getResourcesParams = {
  limit: 100,
  resourceType: undefined as undefined,
  language: undefined as undefined,
  tag: undefined as undefined,
  techStack: undefined as undefined,
  search: undefined as undefined,
};

/** Cap pagination so the sitemap build cannot run forever if the API keeps returning hasMore. */
const maxIterations = 500;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let resourceUrls: MetadataRoute.Sitemap = [];
  try {
    const allIds: string[] = [];
    let cursor: string | undefined = undefined;
    let hasMore = true;
    let iteration = 0;
    while (hasMore) {
      const res = await getResources({
        ...getResourcesParams,
        cursor,
      });
      const body = res.data as GetResourcesResponse | undefined;
      const list = body?.data;
      if (Array.isArray(list) && list.length > 0) {
        for (const item of list) {
          if (item?.id) allIds.push(item.id);
        }
      }
      const nextCursor = body?.nextCursor ?? null;
      hasMore = Boolean(body?.hasMore && nextCursor);
      cursor = nextCursor ?? undefined;
      if (!body) {
        hasMore = false;
      }
      iteration += 1;
      if (iteration >= maxIterations) {
        console.warn(
          `[sitemap] Pagination limit (${maxIterations}) reached; stopping. Resources included: ${allIds.length}.`,
        );
        break;
      }
    }
    if (allIds.length > 0) {
      resourceUrls = allIds.map((id) => ({
        url: `${BASE}/resources/${id}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    }
  } catch {
    // Build without API: still expose key pages
    resourceUrls = [];
  }
  return [...staticPages, ...resourceUrls];
}
