import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitize a redirect URL to prevent open redirect vulnerabilities.
 *
 * Rules:
 * - Must be a non-empty string
 * - Must start with "/"
 * - Second character (if present) must NOT be "/" or "\" to avoid
 *   protocol-relative ("//evil.com") or backslash-escaped ("/\\evil.com") URLs
 * - Anything else falls back to "/"
 */
export function sanitizeRedirectUrl(url: string | null | undefined): string {
  if (typeof url === "string" && url.length > 0 && /^\/(?![\\/]).*/.test(url)) {
    return url;
  }

  return "/";
}

export interface ImageKitUploadParams {
  signature: string;
  token: string;
  expire: number;
  publicKey: string;
  key: string;
}

const IMAGEKIT_UPLOAD_TIMEOUT_MS = 30_000;

export const uploadToImageKit = async (
  file: File,
  params: ImageKitUploadParams,
) => {
  const lastSlash = params.key.lastIndexOf("/");
  const folder =
    lastSlash !== -1 ? "/" + params.key.substring(0, lastSlash) : "/";
  const fileName =
    lastSlash !== -1 ? params.key.substring(lastSlash + 1) : params.key;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", fileName);
  formData.append("publicKey", params.publicKey);
  formData.append("signature", params.signature);
  formData.append("expire", String(params.expire));
  formData.append("token", params.token);
  formData.append("useUniqueFileName", "false");
  formData.append("folder", folder);
  formData.append("overwriteFile", "false");

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, IMAGEKIT_UPLOAD_TIMEOUT_MS);

  let res: Response;

  try {
    res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Upload timed out. Please try again.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Upload failed: ${errText}`);
  }
};

/**
 * Convert YouTube duration strings (ISO-8601, e.g. `PT1H2M3S`) into a readable time.
 * Examples:
 * - `PT45S` -> `0:45`
 * - `PT2M5S` -> `2:05`
 * - `PT1H2M3S` -> `1:02:03`
 */
export function formatYouTubeDuration(duration?: string | null): string {
  if (!duration) return "";

  // Only handle ISO-8601 YouTube durations (e.g. PT1H2M3S).
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i.exec(duration);
  if (!match) return duration; // Fallback: show raw string

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);

  const pad2 = (n: number) => String(n).padStart(2, "0");

  if (hours > 0) return `${hours}:${pad2(minutes)}:${pad2(seconds)}`;
  return `${minutes}:${pad2(seconds)}`;
}
