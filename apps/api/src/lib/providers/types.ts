/**
 * Scrape Provider Types
 * Defines interfaces for URL scraping providers
 */

// Playlist video item (for YouTube playlists)
export interface PlaylistVideoItem {
  position: number
  videoId: string
  title: string
  thumbnail: string
}

export interface ScrapedResource {
  // Core fields (always present)
  title: string
  description: string | null
  image: string | null
  credits: string | null
  url: string

  // Suggestions for form
  suggestedResourceType: 'youtube_video' | 'youtube_playlist' | 'github_repo' | 'blog' | 'ai_tool'
  suggestedTags: string[]
  suggestedTechStack: string[]

  // Metadata
  platform: 'youtube' | 'github' | 'devto' | 'hashnode' | 'generic'
  method: 'api' | 'graphql' | 'og_meta'
  cached: boolean

  // Platform-specific (optional)
  metadata: {
    // YouTube video
    videoId?: string
    duration?: string
    stats?: {
      views?: number
      likes?: number
      comments?: number
    }
    // YouTube playlist
    playlistId?: string
    playlistTitle?: string
    videoCount?: number
    playlistVideos?: PlaylistVideoItem[]
    // GitHub
    repoName?: string
    stars?: number
    language?: string
    topics?: string[]
    // Blog
    readingTime?: number
    publishedAt?: string
  }
}

export interface ScrapeOptions {
  githubAccessToken?: string
}

export interface ScrapeProvider {
  name: string
  canHandle(url: string): boolean
  scrape(url: string, options?: ScrapeOptions): Promise<ScrapedResource>
}
