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

export const getUserSubmissions = ({
  page,
  limit,
  status,
  search,
  resourceType,
}: {
  page: number;
  limit: number;
  status: "approved" | "rejected" | "pending" | "all";
  search: string;
  resourceType: string;
}) =>
  api.get(`/resources/my`, {
    params: {
      page,
      limit,
      ...(status !== "all" && { status }),
      search,
      resourceType,
    },
  });

export const deleteResource = (id: string) => api.delete(`/resources/${id}`);

export const getAdminResources = ({
  page,
  limit,
  status,
  search,
  resourceType,
}: {
  page: number;
  limit: number;
  status: "approved" | "rejected" | "pending" | "all";
  search: string;
  resourceType: string;
}) =>
  api.get(`/admin/resources`, {
    params: {
      page,
      limit,
      ...(status !== "all" && { status }),
      ...(search.trim() && { search }),
      ...(resourceType !== "all" && { resourceType }),
    },
  });

export const updateAdminResourceStatus = ({
  id,
  status,
  reason,
}: {
  id: string;
  status: "approved" | "rejected";
  reason?: string;
}) =>
  api.patch(`/admin/resources/${id}/status`, {
    status,
    ...(reason ? { reason } : {}),
  });

export const deleteAdminResource = (id: string) =>
  api.delete(`/admin/resources/${id}`);
