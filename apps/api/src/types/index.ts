// Playlist video item (for YouTube playlists)
export interface PlaylistVideoItem {
  position: number;
  videoId: string;
  title: string;
  thumbnail: string;
  duration?: string;
}

// Base interface with common fields
export interface ScrapedResourceBase {
  // Core fields (always present)
  title: string;
  description: string | null;
  image: string | null;
  credits: string | null;
  url: string;

  // Suggestions for form
  suggestedResourceType: "video" | "blog" | "tool" | "repo";
  suggestedTags: string[];
  suggestedTechStack: string[];

  // Metadata
  method: "api" | "graphql" | "og_meta";
  cached: boolean;
}

// YouTube video metadata
export interface YouTubeVideoMetadata {
  videoId: string;
  channelUrl?: string;
  duration?: string;
  stats?: {
    views?: number;
    likes?: number;
    comments?: number;
  };
  publishedAt?: string;
}

// YouTube playlist metadata
export interface YouTubePlaylistMetadata {
  playlistId: string;
  playlistTitle: string;
  videoCount: number;
  playlistVideos: PlaylistVideoItem[];
  videoId?: string;
  channelUrl?: string;
  duration?: string;
  stats?: {
    views?: number;
    likes?: number;
    comments?: number;
  };
}

// GitHub metadata
export interface GitHubMetadata {
  repoName: string;
  stars: number;
  language?: string;
  topics?: string[];
}

// Blog metadata (for Dev.to and Hashnode)
export interface BlogMetadata {
  readingTime?: number;
  publishedAt?: string;
}

// Platform-specific resource interfaces
export interface YouTubeVideoResource extends ScrapedResourceBase {
  platform: "youtube";
  resourceType: "video";
  metadata: YouTubeVideoMetadata;
}

export interface YouTubePlaylistResource extends ScrapedResourceBase {
  platform: "youtube";
  resourceType: "playlist";
  metadata: YouTubePlaylistMetadata;
}

export interface GitHubResource extends ScrapedResourceBase {
  platform: "github";
  metadata: GitHubMetadata;
}

export interface DevToResource extends ScrapedResourceBase {
  platform: "devto";
  metadata: BlogMetadata;
}

export interface HashnodeResource extends ScrapedResourceBase {
  platform: "hashnode";
  metadata: BlogMetadata;
}

export interface GenericResource extends ScrapedResourceBase {
  platform: "generic";
  metadata: Record<string, never>;
}

// Discriminated union of all resource types
export type ScrapedResource =
  | YouTubeVideoResource
  | YouTubePlaylistResource
  | GitHubResource
  | DevToResource
  | HashnodeResource
  | GenericResource;

export interface ScrapeOptions {
  githubAccessToken?: string;
}

export interface ScrapeProvider {
  name: string;
  canHandle(url: string): boolean;
  scrape(url: string, options?: ScrapeOptions): Promise<ScrapedResource>;
}
