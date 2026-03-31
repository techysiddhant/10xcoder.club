import { publicEnv } from "@/env/public";
import { serverEnv } from "@/env/server";
import type { GetResourcesResponse } from "@/lib/types";
import type { MetadataRoute } from "next";

const BASE = (publicEnv.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
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

async function fetchResourcesPage(cursor?: string) {
  const url = new URL("/api/resources", serverEnv.API_URL);
  url.searchParams.set("limit", String(getResourcesParams.limit));

  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "force-cache",
    next: {
      revalidate: 60 * 60 * 24 * 7,
    },
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Sitemap resource fetch failed with status ${response.status}`,
    );
  }

  return (await response.json()) as GetResourcesResponse;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let resourceUrls: MetadataRoute.Sitemap = [];
  try {
    const resources: Array<{ id: string; updatedAt?: string | Date }> = [];
    let cursor: string | undefined = undefined;
    let hasMore = true;
    let iteration = 0;

    while (hasMore) {
      const body = await fetchResourcesPage(cursor);
      const list = body?.data;

      if (Array.isArray(list) && list.length > 0) {
        for (const item of list) {
          if (item?.id) {
            resources.push({
              id: item.id,
              updatedAt: item.updatedAt,
            });
          }
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
          `[sitemap] Pagination limit (${maxIterations}) reached; stopping. Resources included: ${resources.length}.`,
        );
        break;
      }
    }

    if (resources.length > 0) {
      resourceUrls = resources.map(({ id, updatedAt }) => ({
        url: `${BASE}/resources/${id}`,
        lastModified: updatedAt ? new Date(updatedAt) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    }
  } catch (error) {
    console.error("[sitemap] Failed to include resource URLs:", error);
    resourceUrls = [];
  }

  return [...staticPages, ...(resourceUrls || [])];
}
