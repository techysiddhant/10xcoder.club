/**
 * Scrape Schema
 * Request/response schemas for the scrape endpoint
 */

import { t } from 'elysia'

// Playlist video item schema (for YouTube playlists in _meta)
const PlaylistVideoItemSchema = t.Object({
  position: t.Number(),
  videoId: t.String(),
  title: t.String(),
  thumbnail: t.String()
})

const ScrapedResourceSchema = t.Object({
  title: t.String(),
  description: t.String(),
  url: t.String(),
  image: t.String(),
  credits: t.String(),
  resourceType: t.Union([
    t.Literal('video'),
    t.Literal('blog'),
    t.Literal('tool'),
    t.Literal('repo')
  ]),
  language: t.Literal('english'),
  tags: t.Array(t.String()),
  techStack: t.Array(t.String()),

  // Additional metadata for display (prefixed with _ to indicate internal use)
  _meta: t.Object({
    platform: t.Union([
      t.Literal('youtube'),
      t.Literal('github'),
      t.Literal('devto'),
      t.Literal('hashnode'),
      t.Literal('generic')
    ]),
    method: t.Union([t.Literal('api'), t.Literal('graphql'), t.Literal('og_meta')]),
    cached: t.Boolean(),
    // YouTube video
    videoId: t.Optional(t.String()),
    duration: t.Optional(t.String()),
    stats: t.Optional(
      t.Object({
        views: t.Optional(t.Number()),
        likes: t.Optional(t.Number()),
        comments: t.Optional(t.Number())
      })
    ),
    // YouTube playlist
    playlistId: t.Optional(t.String()),
    playlistTitle: t.Optional(t.String()),
    videoCount: t.Optional(t.Number()),
    playlistVideos: t.Optional(t.Array(PlaylistVideoItemSchema)),
    // GitHub
    repoName: t.Optional(t.String()),
    stars: t.Optional(t.Number()),
    repoLanguage: t.Optional(t.String()),
    topics: t.Optional(t.Array(t.String())),
    // Blog
    readingTime: t.Optional(t.Number()),
    publishedAt: t.Optional(t.String())
  })
})

// Structured error response for scrape endpoint
const ScrapeErrorSchema = t.Object({
  success: t.Literal(false),
  error: t.Object({
    code: t.Union([
      t.Literal('INVALID_URL'),
      t.Literal('SCRAPE_FAILED'),
      t.Literal('PLATFORM_ERROR'),
      t.Literal('RATE_LIMITED'),
      t.Literal('INTERNAL_ERROR'),
      t.Literal('UNAUTHORIZED')
    ]),
    message: t.String()
  })
})

export const scrapeUrlSchema = {
  body: t.Object({
    url: t.String({ minLength: 5 })
  }),
  detail: {
    tags: ['Scrape'],
    summary: 'Scrape URL for resource metadata',
    description:
      'Scrapes a URL and returns structured metadata for prefilling the resource creation form. Supports YouTube, GitHub, Dev.to, Hashnode, and generic websites.'
  },
  response: {
    200: t.Object({
      success: t.Literal(true),
      data: ScrapedResourceSchema
    }),
    400: ScrapeErrorSchema,
    401: ScrapeErrorSchema,
    429: ScrapeErrorSchema,
    500: ScrapeErrorSchema
  }
}
