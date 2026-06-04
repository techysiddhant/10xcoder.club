import { publicEnv } from "@/env/public";

const IMAGEKIT_HOST_PATTERN = /(^|\.)imagekit\.io$/i;
export const CARD_IMAGE_BREAKPOINTS = [320, 480, 640, 750, 828, 960];
export const DETAIL_IMAGE_BREAKPOINTS = [640, 750, 828, 1080, 1200, 1600];

export type ImagePolicy = "imagekit" | "external";
export type SmartImageKind = "card" | "detail" | "default";

interface ImageKitTransformOptions {
  width?: number;
  quality?: number;
  blur?: number;
}

interface ResolvedImageKitAsset {
  endpoint: string;
  imagePath: string;
  search: string;
}

function normalizeBaseUrl(url: string) {
  return url.replace(/\/$/, "");
}

function getConfiguredImageKitBase() {
  return publicEnv.NEXT_PUBLIC_CDN_URL
    ? normalizeBaseUrl(publicEnv.NEXT_PUBLIC_CDN_URL)
    : null;
}

function resolveImageKitAsset(src: string): ResolvedImageKitAsset | null {
  try {
    const url = new URL(src);
    const configuredBase = getConfiguredImageKitBase();

    if (configuredBase && src.startsWith(`${configuredBase}/`)) {
      const configuredUrl = new URL(configuredBase);
      const basePath = configuredUrl.pathname.replace(/\/$/, "");
      const imagePath = url.pathname.slice(basePath.length + 1);
      return {
        endpoint: configuredBase,
        imagePath,
        search: url.search,
      };
    }

    if (!IMAGEKIT_HOST_PATTERN.test(url.hostname)) {
      return null;
    }

    const [cloudId, ...restPath] = url.pathname.split("/").filter(Boolean);
    if (!cloudId || restPath.length === 0) {
      return null;
    }

    return {
      endpoint: `${url.origin}/${cloudId}`,
      imagePath: restPath.join("/"),
      search: url.search,
    };
  } catch {
    return null;
  }
}

function buildImageKitUrl(
  src: string,
  { width, quality, blur }: ImageKitTransformOptions,
) {
  const asset = resolveImageKitAsset(src);
  if (!asset) return src;

  const operations = [
    width ? `w-${width}` : null,
    quality ? `q-${quality}` : null,
    blur ? `blur-${blur}` : null,
  ].filter(Boolean);

  if (operations.length === 0) {
    return src;
  }

  return `${asset.endpoint}/tr:${operations.join(",")}/${asset.imagePath}${asset.search}`;
}

export function getImageKitQuality(kind: SmartImageKind) {
  if (kind === "detail") return 75;
  if (kind === "card") return 68;
  return 72;
}

export function isImageKitUrl(src: string) {
  return resolveImageKitAsset(src) !== null;
}

export function getImagePolicy(src: string): ImagePolicy {
  return isImageKitUrl(src) ? "imagekit" : "external";
}

export function buildImageKitLqipUrl(src: string) {
  return buildImageKitUrl(src, {
    width: 32,
    quality: 35,
    blur: 24,
  });
}
