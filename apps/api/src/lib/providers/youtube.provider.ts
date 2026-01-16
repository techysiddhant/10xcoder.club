/**
 * YouTube Provider
 * Scrapes YouTube video and playlist metadata using YouTube Data API v3
 */

import { env } from '@/config/env'
import type { ScrapedResource, ScrapeProvider, ScrapeOptions, PlaylistVideoItem } from './types'

// Patterns for video ID extraction
const VIDEO_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
]

// Pattern for playlist ID extraction
const PLAYLIST_PATTERN = /[?&]list=([a-zA-Z0-9_-]+)/

function extractVideoId(url: string): string | null {
  for (const pattern of VIDEO_PATTERNS) {
    const match = url.match(pattern)
    if (match) return match[1]!
  }
  return null
}

function extractPlaylistId(url: string): string | null {
  const match = url.match(PLAYLIST_PATTERN)
  return match ? match[1]! : null
}

// Max playlist videos to fetch (100 = 2 API calls for playlistItems)
const MAX_PLAYLIST_VIDEOS = 100

export class YouTubeProvider implements ScrapeProvider {
  name = 'youtube'

  canHandle(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be')
  }

  async scrape(url: string, _options?: ScrapeOptions): Promise<ScrapedResource> {
    const playlistId = extractPlaylistId(url)
    const videoId = extractVideoId(url)

    // If URL has a playlist ID, treat as playlist
    if (playlistId) {
      return this.scrapePlaylist(url, playlistId, videoId)
    }

    // Otherwise, treat as single video
    if (!videoId) {
      throw new Error('Invalid YouTube URL')
    }

    return this.scrapeVideo(url, videoId)
  }

  /**
   * Scrape a single YouTube video
   */
  private async scrapeVideo(url: string, videoId: string): Promise<ScrapedResource> {
    const apiKey = env.YOUTUBE_API_KEY

    if (!apiKey) {
      return this.fallbackScrape(url, videoId, null, 'youtube_video')
    }

    const params = new URLSearchParams({
      id: videoId,
      key: apiKey,
      part: 'snippet,contentDetails,statistics'
    })

    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Bot/Scraper)' }
    })

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found on YouTube')
    }

    const video = data.items[0]
    const snippet = video.snippet

    return {
      title: snippet.title,
      description: snippet.description || null,
      image: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || null,
      credits: snippet.channelTitle || null,
      url: `https://www.youtube.com/watch?v=${videoId}`,

      suggestedResourceType: 'youtube_video',
      suggestedTags: snippet.tags?.slice(0, 10) || [],
      suggestedTechStack: [],

      platform: 'youtube',
      method: 'api',
      cached: false,

      metadata: {
        videoId,
        duration: video.contentDetails?.duration || undefined,
        publishedAt: snippet.publishedAt || undefined,
        stats: {
          views: parseInt(video.statistics?.viewCount || '0', 10),
          likes: parseInt(video.statistics?.likeCount || '0', 10),
          comments: parseInt(video.statistics?.commentCount || '0', 10)
        }
      }
    }
  }

  /**
   * Scrape a YouTube playlist
   * - Fetches playlist info and items (up to MAX_PLAYLIST_VIDEOS)
   * - Gets full details only for the first video (quota efficient)
   */
  private async scrapePlaylist(
    url: string,
    playlistId: string,
    firstVideoId: string | null
  ): Promise<ScrapedResource> {
    const apiKey = env.YOUTUBE_API_KEY

    if (!apiKey) {
      // Fallback for playlist without API key - pass both playlistId and optional firstVideoId
      return this.fallbackScrape(url, playlistId, firstVideoId, 'youtube_playlist')
    }

    // 1. Fetch playlist metadata
    const playlistParams = new URLSearchParams({
      id: playlistId,
      key: apiKey,
      part: 'snippet,contentDetails'
    })

    const playlistResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?${playlistParams}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Bot/Scraper)' } }
    )

    if (!playlistResponse.ok) {
      throw new Error(`YouTube API error: ${playlistResponse.status}`)
    }

    const playlistData = await playlistResponse.json()
    const playlist = playlistData.items?.[0]

    if (!playlist) {
      throw new Error('Playlist not found on YouTube')
    }

    // 2. Fetch playlist items (videos in the playlist)
    const playlistVideos = await this.fetchPlaylistItems(playlistId, apiKey)

    // 3. Get first video details (if we have videos)
    let firstVideo: ScrapedResource['metadata'] = {}
    let firstVideoDetails: {
      title: string
      description: string | null
      image: string | null
    } | null = null

    if (playlistVideos.length > 0) {
      const actualFirstVideoId = firstVideoId || playlistVideos[0]!.videoId
      try {
        const videoResult = await this.scrapeVideo(url, actualFirstVideoId)
        firstVideo = {
          videoId: actualFirstVideoId,
          duration: videoResult.metadata.duration,
          stats: videoResult.metadata.stats
        }
        firstVideoDetails = {
          title: videoResult.title,
          description: videoResult.description,
          image: videoResult.image
        }
      } catch {
        // Use playlist thumbnail if first video fetch fails
      }
    }

    const playlistSnippet = playlist.snippet
    const videoCount = playlist.contentDetails?.itemCount || playlistVideos.length

    return {
      // Use first video title/description for form prefill, with playlist name as fallback
      title: firstVideoDetails?.title || playlistSnippet.title,
      description: firstVideoDetails?.description || playlistSnippet.description || null,
      image:
        firstVideoDetails?.image ||
        playlistSnippet.thumbnails?.maxres?.url ||
        playlistSnippet.thumbnails?.high?.url ||
        null,
      credits: playlistSnippet.channelTitle || null,
      url,

      suggestedResourceType: 'youtube_playlist',
      suggestedTags: [],
      suggestedTechStack: [],

      platform: 'youtube',
      method: 'api',
      cached: false,

      metadata: {
        ...firstVideo,
        playlistId,
        playlistTitle: playlistSnippet.title,
        videoCount,
        playlistVideos
      }
    }
  }

  /**
   * Fetch all videos in a playlist (up to MAX_PLAYLIST_VIDEOS)
   * Uses pagination (50 items per request)
   */
  private async fetchPlaylistItems(
    playlistId: string,
    apiKey: string
  ): Promise<PlaylistVideoItem[]> {
    const videos: PlaylistVideoItem[] = []
    let nextPageToken: string | undefined

    while (videos.length < MAX_PLAYLIST_VIDEOS) {
      const params = new URLSearchParams({
        playlistId,
        key: apiKey,
        part: 'snippet',
        maxResults: '50'
      })

      if (nextPageToken) {
        params.set('pageToken', nextPageToken)
      }

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?${params}`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (Bot/Scraper)' } }
      )

      if (!response.ok) {
        break // Stop on error, return what we have
      }

      const data = await response.json()

      for (const item of data.items || []) {
        if (videos.length >= MAX_PLAYLIST_VIDEOS) break

        const snippet = item.snippet
        const videoId = snippet.resourceId?.videoId

        if (videoId) {
          videos.push({
            position: snippet.position,
            videoId,
            title: snippet.title,
            thumbnail:
              snippet.thumbnails?.medium?.url ||
              snippet.thumbnails?.default?.url ||
              `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
          })
        }
      }

      nextPageToken = data.nextPageToken
      if (!nextPageToken) break
    }

    return videos
  }

  /**
   * Fallback scrape using oEmbed (no API key required)
   * @param url - Original YouTube URL
   * @param playlistOrVideoId - Primary ID (playlistId for playlists, videoId for videos)
   * @param videoIdForThumbnail - Optional videoId used for thumbnail URLs (for playlists)
   * @param resourceType - Type of resource being scraped
   */
  private async fallbackScrape(
    url: string,
    playlistOrVideoId: string,
    videoIdForThumbnail: string | null,
    resourceType: 'youtube_video' | 'youtube_playlist'
  ): Promise<ScrapedResource> {
    // For thumbnails, prefer videoId if available (works better for playlists)
    const thumbnailVideoId =
      videoIdForThumbnail || (resourceType === 'youtube_video' ? playlistOrVideoId : null)
    const thumbnailUrl = thumbnailVideoId
      ? `https://img.youtube.com/vi/${thumbnailVideoId}/maxresdefault.jpg`
      : null

    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`

    try {
      const response = await fetch(oembedUrl)
      if (response.ok) {
        const data = await response.json()

        // Build metadata based on resource type
        const metadata =
          resourceType === 'youtube_playlist'
            ? {
                playlistId: playlistOrVideoId,
                ...(videoIdForThumbnail && { videoId: videoIdForThumbnail })
              }
            : { videoId: playlistOrVideoId }

        return {
          title: data.title || 'YouTube Content',
          description: null,
          image: data.thumbnail_url || thumbnailUrl,
          credits: data.author_name || null,
          url,

          suggestedResourceType: resourceType,
          suggestedTags: [],
          suggestedTechStack: [],

          platform: 'youtube',
          method: 'og_meta',
          cached: false,

          metadata
        }
      }
    } catch {
      // Ignore fallback errors
    }

    // Ultimate fallback
    const fallbackMetadata =
      resourceType === 'youtube_playlist'
        ? {
            playlistId: playlistOrVideoId,
            ...(videoIdForThumbnail && { videoId: videoIdForThumbnail })
          }
        : { videoId: playlistOrVideoId }

    return {
      title: resourceType === 'youtube_playlist' ? 'YouTube Playlist' : 'YouTube Video',
      description: null,
      image: thumbnailUrl,
      credits: null,
      url,

      suggestedResourceType: resourceType,
      suggestedTags: [],
      suggestedTechStack: [],

      platform: 'youtube',
      method: 'og_meta',
      cached: false,

      metadata: fallbackMetadata
    }
  }
}
