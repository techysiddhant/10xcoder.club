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

export const uploadToS3 = async (file: File, uploadUrl: string) => {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!res.ok) throw new Error("Upload failed");
};
