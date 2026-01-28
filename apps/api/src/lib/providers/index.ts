/**
 * Provider Registry
 * Manages all scrape providers and selects the appropriate one for a URL
 */

import type { ScrapeProvider } from "@/types";
import { YouTubeProvider } from "./youtube.provider";
import { GitHubProvider } from "./github.provider";
import { DevToProvider } from "./devto.provider";
import { HashnodeProvider } from "./hashnode.provider";
import { GenericProvider } from "./generic.provider";

// Create a single module-level GenericProvider instance for reuse
const genericProvider = new GenericProvider();

// Provider order matters - more specific providers first, generic last
const providers: ScrapeProvider[] = [
  new YouTubeProvider(),
  new GitHubProvider(),
  new DevToProvider(),
  new HashnodeProvider(),
  genericProvider, // Fallback - always matches
];

/**
 * Get the appropriate provider for a URL
 * Returns the first provider that can handle the URL
 */
export function getProviderForUrl(url: string): ScrapeProvider {
  for (const provider of providers) {
    if (provider.canHandle(url)) {
      return provider;
    }
  }

  // Should never reach here since GenericProvider always returns true
  return genericProvider;
}

/**
 * Get all registered providers
 */
export function getAllProviders(): ScrapeProvider[] {
  return providers;
}
