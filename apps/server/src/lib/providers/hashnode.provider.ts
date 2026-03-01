/**
 * Hashnode Provider
 * Scrapes Hashnode article metadata using their GraphQL API
 */

import type {
  ScrapedResource,
  ScrapeProvider,
  ScrapeOptions,
} from "@/types/scrape";
import {
  InvalidUrlError,
  PlatformApiError,
  ScrapeNotFoundError,
} from "@/lib/errors";

const HASHNODE_PATTERNS = [
  /^\/([^/?#]+)/, // path component for hashnode.dev subdomains
  /^\/@([^/]+)\/([^/?#]+)/, // path component for hashnode.com/@username
];

function extractHostAndSlug(
  url: string,
): { host: string; slug: string } | null {
  try {
    const urlObj = new URL(url);

    // If it's the main *.hashnode.dev domain
    if (urlObj.hostname.endsWith(".hashnode.dev")) {
      const host = urlObj.hostname.split(".")[0];
      const match = urlObj.pathname.match(HASHNODE_PATTERNS[0]!);
      if (host && match && match[1]) {
        return { host, slug: match[1] };
      }
    }

    // If it's the hashnode.com/@username domain
    if (
      urlObj.hostname === "hashnode.com" ||
      urlObj.hostname === "www.hashnode.com"
    ) {
      const match = urlObj.pathname.match(HASHNODE_PATTERNS[1]!);
      if (match && match[1] && match[2]) {
        return { host: `${match[1]}.hashnode.dev`, slug: match[2] };
      }
    }

    // Try to parse custom hashnode-related URL based on the old logic
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    if (pathParts.length > 0) {
      let host = urlObj.hostname;
      if (urlObj.hostname.endsWith(".hashnode.dev")) {
        host = urlObj.hostname.split(".")[0]!;
      }
      return {
        host,
        slug: pathParts[pathParts.length - 1]!,
      };
    }
  } catch {
    // Invalid URL
  }

  return null;
}

export class HashnodeProvider implements ScrapeProvider {
  name = "hashnode";

  canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      return (
        parsed.hostname === "hashnode.com" ||
        parsed.hostname === "www.hashnode.com" ||
        parsed.hostname.endsWith(".hashnode.dev")
      );
    } catch {
      return false;
    }
  }

  async scrape(
    url: string,
    _options?: ScrapeOptions,
  ): Promise<ScrapedResource> {
    const hostAndSlug = extractHostAndSlug(url);

    if (!hostAndSlug) {
      throw new InvalidUrlError("Invalid Hashnode article URL");
    }

    const { host, slug } = hostAndSlug;

    const query = `
      query Publication($host: String!, $slug: String!) {
        publication(host: $host) {
          post(slug: $slug) {
            title
            brief
            coverImage {
              url
            }
            author {
              name
              username
            }
            tags {
              name
              slug
            }
            publishedAt
            readTimeInMinutes
            url
          }
        }
      }
    `;

    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 10000); // 10 second timeout

    let response: Response;
    try {
      response = await fetch("https://gql.hashnode.com/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "10xcoder-scraper",
        },
        body: JSON.stringify({
          query,
          variables: { host, slug },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new PlatformApiError("Hashnode API request timed out");
      }
      throw error;
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new PlatformApiError(`Hashnode API error: ${response.status}`);
    }

    const cloned = response.clone();
    let data;
    try {
      data = await response.json();
    } catch (err) {
      const respText = await cloned
        .text()
        .catch(() => "Unable to read response text");
      throw new PlatformApiError(
        `Hashnode API returned malformed JSON (status: ${response.status}): ${respText.substring(0, 200)}`,
      );
    }

    if (data.errors && data.errors.length > 0) {
      throw new PlatformApiError(
        `Hashnode GraphQL error: ${data.errors[0]?.message}`,
      );
    }

    const post = data.data?.publication?.post;

    if (!post) {
      throw new ScrapeNotFoundError("Article not found on Hashnode");
    }

    return {
      title: post.title,
      description: post.brief || null,
      image: post.coverImage?.url || null,
      credits: post.author?.name || post.author?.username || null,
      url: post.url || url,

      suggestedResourceType: "blog",
      suggestedTags: post.tags?.map((t: { name: string }) => t.name) || [],
      suggestedTechStack: [],

      platform: "hashnode",
      method: "graphql",
      cached: false,

      metadata: {
        readingTime: post.readTimeInMinutes ?? undefined,
        publishedAt: post.publishedAt ?? undefined,
      },
    };
  }
}
