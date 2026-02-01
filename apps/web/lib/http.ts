import { api } from "./api";
import { ResourceCreateClient } from "./schema";
import { GetResourcesParams } from "./types";

export const autoFillResourceDetails = (url: string) =>
  api.post(`/scrape`, { url });

export const resourceOptions = () => api.get(`/resources/options`);

export const createResource = (resource: ResourceCreateClient) =>
  api.post(`/resources`, { ...resource });

export const uploadImage = ({
  fileName,
  fileType,
  fileSize,
  folder,
}: {
  fileName: string;
  fileType: string;
  fileSize: number;
  folder: string;
}) => api.post(`/upload/presigned`, { fileName, fileType, fileSize, folder });

/** Serialize tag/techStack for query: comma-separated (single param) so URLs work everywhere. */
function toCommaParam(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  const arr = Array.isArray(v) ? v : [v];
  const trimmed = arr.map((s) => s.trim()).filter(Boolean);
  return trimmed.length ? trimmed.join(",") : undefined;
}

export const getResources = (params: GetResourcesParams) =>
  api.get(`/resources`, {
    params: {
      cursor: params.cursor,
      limit: params.limit,
      resourceType: params.resourceType,
      language: params.language,
      tag: toCommaParam(params.tag),
      techStack: toCommaParam(params.techStack),
      search: params.search,
    },
  });

export const getResourceById = (id: string) => api.get(`/resources/${id}`);
