/**
 * YouTube Provider
 * Scrapes YouTube video and playlist metadata using YouTube Data API v3
 */

import { env } from '@/config/env'
import type {
  ScrapedResource,
  ScrapeProvider,
  ScrapeOptions,
  PlaylistVideoItem,
  YouTubeVideoMetadata,
  YouTubePlaylistMetadata,
  YouTubeVideoResource,
  YouTubePlaylistResource
} from '@/types'
import { InvalidUrlError, PlatformApiError, ScrapeNotFoundError } from '@/lib/errors'
import { logger } from '../logger'

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

// Default timeout for YouTube API requests (in milliseconds)
const DEFAULT_TIMEOUT_MS = 30000 // 30 seconds

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
      throw new InvalidUrlError('Invalid YouTube URL')
    }

    return this.scrapeVideo(url, videoId)
  }

  /**
   * Scrape a single YouTube video
   */
  private async scrapeVideo(url: string, videoId: string): Promise<YouTubeVideoResource> {
    const apiKey = env.YOUTUBE_API_KEY

    if (!apiKey) {
      return this.fallbackScrape(url, videoId, null, 'youtube_video')
    }

    const params = new URLSearchParams({
      id: videoId,
      key: apiKey,
      part: 'snippet,contentDetails,statistics'
    })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, DEFAULT_TIMEOUT_MS)

    try {
      const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Bot/Scraper)' },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new PlatformApiError(`YouTube API error: ${response.status}`)
      }

      const data = await response.json()

      if (!data.items || data.items.length === 0) {
        throw new ScrapeNotFoundError('Video not found on YouTube')
      }
      const video = data.items[0]
      const snippet = video.snippet

      return {
        title: snippet.title,
        description: snippet.description || null,
        image: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || null,
        credits: snippet.channelTitle || null,
        url: `https://www.youtube.com/watch?v=${videoId}`,

        suggestedResourceType: 'video',
        suggestedTags: snippet.tags?.slice(0, 10) || [],
        suggestedTechStack: [],

        platform: 'youtube',
        resourceType: 'video',
        method: 'api',
        cached: false,

        metadata: {
          videoId,
          channelUrl: snippet.channelId
            ? `https://www.youtube.com/channel/${snippet.channelId}`
            : undefined,
          duration: video.contentDetails?.duration || undefined,
          publishedAt: snippet.publishedAt || undefined,
          stats: {
            views: parseInt(video.statistics?.viewCount || '0', 10),
            likes: parseInt(video.statistics?.likeCount || '0', 10),
            comments: parseInt(video.statistics?.commentCount || '0', 10)
          }
        }
      } satisfies YouTubeVideoResource
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new PlatformApiError('YouTube API request timed out')
      }
      throw error
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
      throw new PlatformApiError(`YouTube API error: ${playlistResponse.status}`)
    }

    const playlistData = await playlistResponse.json()
    const playlist = playlistData.items?.[0]

    if (!playlist) {
      throw new ScrapeNotFoundError('Playlist not found on YouTube')
    }

    // 2. Fetch playlist items (videos in the playlist)
    const playlistVideos = await this.fetchPlaylistItems(playlistId, apiKey)

    // 3. Get first video details (if we have videos)
    let firstVideo: Partial<YouTubeVideoMetadata> = {}
    let firstVideoDetails: {
      title: string
      description: string | null
      image: string | null
    } | null = null

    if (playlistVideos.length > 0) {
      const actualFirstVideoId = firstVideoId || playlistVideos[0]!.videoId
      try {
        const videoUrl = `https://www.youtube.com/watch?v=${actualFirstVideoId}`
        const videoResult = await this.scrapeVideo(videoUrl, actualFirstVideoId)
        // videoResult is YouTubeVideoResource, so metadata is YouTubeVideoMetadata
        firstVideo = {
          videoId: actualFirstVideoId,
          duration: videoResult.metadata.duration,
          stats: videoResult.metadata.stats
        } satisfies Partial<YouTubeVideoMetadata>
        firstVideoDetails = {
          title: videoResult.title,
          description: videoResult.description,
          image: videoResult.image
        }
      } catch (err) {
        // Use playlist thumbnail if first video fetch fails
        logger.debug({ actualFirstVideoId, error: err }, 'Failed to fetch first video details')
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

      suggestedResourceType: 'video',
      suggestedTags: [],
      suggestedTechStack: [],

      platform: 'youtube',
      resourceType: 'playlist',
      method: 'api',
      cached: false,

      metadata: {
        playlistId,
        playlistTitle: playlistSnippet.title,
        videoCount,
        playlistVideos,
        ...(firstVideo.videoId && { videoId: firstVideo.videoId }),
        ...(firstVideo.duration && { duration: firstVideo.duration }),
        ...(firstVideo.stats && { stats: firstVideo.stats }),
        ...(playlistSnippet.channelId && {
          channelUrl: `https://www.youtube.com/channel/${playlistSnippet.channelId}`
        })
      } satisfies YouTubePlaylistMetadata
    }
  }

  /**
   * Fetch all videos in a playlist (up to MAX_PLAYLIST_VIDEOS)
   * Uses pagination (50 items per request)
   * Also fetches video durations in batches
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
        logger.error(
          `YouTube API error during playlist pagination: ${response.status}, returning ${videos.length} videos`
        )
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

    // Fetch durations for all videos in batches (YouTube API allows up to 50 video IDs per request)
    if (videos.length > 0) {
      await this.enrichPlaylistVideosWithDurations(videos, apiKey)
    }

    return videos
  }

  /**
   * Enrich playlist videos with duration information
   * Fetches video details in batches of 50 (YouTube API limit)
   */
  private async enrichPlaylistVideosWithDurations(
    videos: PlaylistVideoItem[],
    apiKey: string
  ): Promise<void> {
    const BATCH_SIZE = 50
    const videoIdToVideo = new Map<string, PlaylistVideoItem>(videos.map((v) => [v.videoId, v]))

    // Process videos in batches of 50
    for (let i = 0; i < videos.length; i += BATCH_SIZE) {
      const batch = videos.slice(i, i + BATCH_SIZE)
      const videoIds = batch.map((v) => v.videoId).join(',')

      try {
        const params = new URLSearchParams({
          id: videoIds,
          key: apiKey,
          part: 'contentDetails'
        })

        const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Bot/Scraper)' }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.items) {
            for (const video of data.items) {
              const videoId = video.id
              const videoItem = videoIdToVideo.get(videoId)
              if (videoItem && video.contentDetails?.duration) {
                videoItem.duration = video.contentDetails.duration
              }
            }
          }
        } else {
          logger.debug(
            { status: response.status },
            'Failed to fetch video durations for playlist batch'
          )
        }
      } catch (error) {
        logger.debug({ error, batchStart: i }, 'Error fetching video durations for playlist batch')
        // Continue with other batches even if one fails
      }
    }
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
    resourceType: 'youtube_video'
  ): Promise<YouTubeVideoResource>
  private async fallbackScrape(
    url: string,
    playlistOrVideoId: string,
    videoIdForThumbnail: string | null,
    resourceType: 'youtube_playlist'
  ): Promise<YouTubePlaylistResource>
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
        if (resourceType === 'youtube_playlist') {
          const metadata: YouTubePlaylistMetadata = {
            playlistId: playlistOrVideoId,
            playlistTitle: data.title || 'YouTube Playlist',
            videoCount: 0,
            playlistVideos: [],
            ...(videoIdForThumbnail && { videoId: videoIdForThumbnail }),
            ...(data.author_url && { channelUrl: data.author_url })
          }

          return {
            title: data.title || 'YouTube Content',
            description: null,
            image: data.thumbnail_url || thumbnailUrl,
            credits: data.author_name || null,
            url,

            suggestedResourceType: 'video',
            suggestedTags: [],
            suggestedTechStack: [],

            platform: 'youtube',
            resourceType: 'playlist',
            method: 'og_meta',
            cached: false,

            metadata
          } satisfies YouTubePlaylistResource
        } else {
          const metadata: YouTubeVideoMetadata = {
            videoId: playlistOrVideoId,
            ...(data.author_url && { channelUrl: data.author_url })
          }

          return {
            title: data.title || 'YouTube Content',
            description: null,
            image: data.thumbnail_url || thumbnailUrl,
            credits: data.author_name || null,
            url,

            suggestedResourceType: 'video',
            suggestedTags: [],
            suggestedTechStack: [],

            platform: 'youtube',
            resourceType: 'video',
            method: 'og_meta',
            cached: false,

            metadata
          } satisfies YouTubeVideoResource
        }
      }
    } catch {
      // Ignore fallback errors
    }

    // Ultimate fallback
    if (resourceType === 'youtube_playlist') {
      const fallbackMetadata: YouTubePlaylistMetadata = {
        playlistId: playlistOrVideoId,
        playlistTitle: 'YouTube Playlist',
        videoCount: 0,
        playlistVideos: [],
        ...(videoIdForThumbnail && { videoId: videoIdForThumbnail })
      }

      return {
        title: 'YouTube Playlist',
        description: null,
        image: thumbnailUrl,
        credits: null,
        url,

        suggestedResourceType: 'video',
        suggestedTags: [],
        suggestedTechStack: [],

        platform: 'youtube',
        resourceType: 'playlist',
        method: 'og_meta',
        cached: false,

        metadata: fallbackMetadata
      } satisfies YouTubePlaylistResource
    } else {
      const fallbackMetadata: YouTubeVideoMetadata = {
        videoId: playlistOrVideoId
      }

      return {
        title: 'YouTube Video',
        description: null,
        image: thumbnailUrl,
        credits: null,
        url,

        suggestedResourceType: 'video',
        suggestedTags: [],
        suggestedTechStack: [],

        platform: 'youtube',
        resourceType: 'video',
        method: 'og_meta',
        cached: false,

        metadata: fallbackMetadata
      } satisfies YouTubeVideoResource
    }
  }
}
