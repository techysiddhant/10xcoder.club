import { cache } from "react";
import ResourceDetail from "./resource-detail";
import { getResourceById, getResources } from "@/lib/http";
import type { ResourceTagRef } from "@/lib/types";
const getResource = cache(async (resourceId: string) => {
  const response = await getResourceById(resourceId);
  return response.data?.data;
});
export async function generateStaticParams() {
  try {
    const res = await getResources({
      limit: 100,
      cursor: undefined,
      resourceType: undefined,
      language: undefined,
      tag: undefined,
      techStack: undefined,
      search: undefined,
    });
    const list = res.data?.data;
    if (!Array.isArray(list) || list.length === 0) return [];
    return list.map(({ id }: { id: string }) => ({ id }));
  } catch {
    return [];
  }
}
const DEFAULT_METADATA = {
  title: "Resource | 10xCoder.club",
  keywords: "" as string,
  openGraph: {
    title: "Resource | 10xCoder.club",
    images: [] as string[],
  },
  twitter: {
    title: "Resource | 10xCoder.club",
    images: [] as string[],
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resource = await getResource(id);
  if (!resource) {
    return DEFAULT_METADATA;
  }
  const title = resource.title ?? DEFAULT_METADATA.title;
  const tags = Array.isArray(resource.tags)
    ? resource.tags
        .map((t: ResourceTagRef | string) =>
          typeof t === "string" ? t : (t as ResourceTagRef)?.name,
        )
        .filter(Boolean)
    : [];
  const keywords = tags.length ? tags.join(",") : "";
  const image = resource.image ?? undefined;
  const images = image ? [image] : [];
  return {
    title,
    keywords,
    openGraph: {
      title,
      images,
    },
    twitter: {
      title,
      images,
    },
  };
}
const ResourcePage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  return <ResourceDetail id={id} />;
};

export default ResourcePage;
