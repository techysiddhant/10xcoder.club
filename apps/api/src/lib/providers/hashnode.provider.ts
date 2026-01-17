/**
 * Hashnode Provider
 * Scrapes Hashnode article metadata using their GraphQL API
 */

import type { ScrapedResource, ScrapeProvider, ScrapeOptions } from '@/types'
import { InvalidUrlError, PlatformApiError, ScrapeNotFoundError } from '@/lib/errors'

// Matches: *.hashnode.dev/article-slug or hashnode.com/@username/article-slug
const HASHNODE_PATTERNS = [
  /([a-zA-Z0-9-]+)\.hashnode\.dev\/([^/?#]+)/,
  /hashnode\.com\/@([^/]+)\/([^/?#]+)/
]

function extractHostAndSlug(url: string): { host: string; slug: string } | null {
  for (const pattern of HASHNODE_PATTERNS) {
    const match = url.match(pattern)
    if (match) {
      return { host: match[1]!, slug: match[2]! }
    }
  }

  // Try to parse any hashnode-related URL
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/').filter(Boolean)
    if (pathParts.length > 0) {
      // Normalize host: extract subdomain for hashnode.dev, keep full hostname for custom domains
      let host = urlObj.hostname
      if (urlObj.hostname.endsWith('.hashnode.dev')) {
        // Extract subdomain (e.g., "myhost" from "myhost.hashnode.dev")
        host = urlObj.hostname.split('.')[0]!
      }
      return {
        host,
        slug: pathParts[pathParts.length - 1]!
      }
    }
  } catch {
    // Invalid URL
  }

  return null
}

export class HashnodeProvider implements ScrapeProvider {
  name = 'hashnode'

  canHandle(url: string): boolean {
    return url.includes('hashnode.dev') || url.includes('hashnode.com')
  }

  async scrape(url: string, _options?: ScrapeOptions): Promise<ScrapedResource> {
    const hostAndSlug = extractHostAndSlug(url)

    if (!hostAndSlug) {
      throw new InvalidUrlError('Invalid Hashnode article URL')
    }

    const { host, slug } = hostAndSlug

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
    `

    // Create AbortController for timeout handling
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, 10000) // 10 second timeout

    let response: Response
    try {
      response = await fetch('https://gql.hashnode.com/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': '10xcoder-scraper'
        },
        body: JSON.stringify({
          query,
          variables: { host, slug }
        }),
        signal: controller.signal
      })
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new PlatformApiError('Hashnode API request timed out')
      }
      throw error
    }

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new PlatformApiError(`Hashnode API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.errors && data.errors.length > 0) {
      throw new PlatformApiError(`Hashnode GraphQL error: ${data.errors[0]?.message}`)
    }

    const post = data.data?.publication?.post

    if (!post) {
      throw new ScrapeNotFoundError('Article not found on Hashnode')
    }

    return {
      title: post.title,
      description: post.brief || null,
      image: post.coverImage?.url || null,
      credits: post.author?.name || post.author?.username || null,
      url: post.url || url,

      suggestedResourceType: 'blog',
      suggestedTags: post.tags?.map((t: { name: string }) => t.name) || [],
      suggestedTechStack: [],

      platform: 'hashnode',
      method: 'graphql',
      cached: false,

      metadata: {
        readingTime: post.readTimeInMinutes ?? undefined,
        publishedAt: post.publishedAt ?? undefined
      }
    }
  }
}
