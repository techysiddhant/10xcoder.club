import { api } from "./api";
import { ResourceCreateClient } from "./schema";

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
