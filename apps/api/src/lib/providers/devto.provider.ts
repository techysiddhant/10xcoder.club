/**
 * Dev.to Provider
 * Scrapes Dev.to article metadata using their public API
 */

import type { ScrapedResource, ScrapeProvider, ScrapeOptions } from './types'

// Matches: dev.to/username/article-slug or dev.to/organization/article-slug
const DEVTO_PATTERN = /dev\.to\/([^/]+)\/([^/?#]+)/

function extractArticleSlug(url: string): string | null {
  const match = url.match(DEVTO_PATTERN)
  if (match) {
    return match[2]!
  }
  return null
}

export class DevToProvider implements ScrapeProvider {
  name = 'devto'

  canHandle(url: string): boolean {
    return url.includes('dev.to') && DEVTO_PATTERN.test(url)
  }

  async scrape(url: string, _options?: ScrapeOptions): Promise<ScrapedResource> {
    const slug = extractArticleSlug(url)

    if (!slug) {
      throw new Error('Invalid Dev.to article URL')
    }

    // Dev.to API uses the full path for article lookup
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/').filter(Boolean)

    if (pathParts.length < 2) {
      throw new Error('Invalid Dev.to article URL format')
    }

    const username = pathParts[0]
    const articleSlug = pathParts[1]

    // Try the articles by path endpoint
    const response = await fetch(`https://dev.to/api/articles/${username}/${articleSlug}`, {
      headers: {
        'User-Agent': '10xcoder-scraper'
      }
    })

    if (!response.ok) {
      throw new Error(`Dev.to API error: ${response.status}`)
    }

    const article = await response.json()

    // Normalize tags - Dev.to can return string or array
    let tags: string[] = []
    if (Array.isArray(article.tag_list)) {
      tags = article.tag_list
    } else if (typeof article.tag_list === 'string') {
      tags = article.tag_list
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean)
    } else if (Array.isArray(article.tags)) {
      tags = article.tags
    }

    return {
      title: article.title,
      description: article.description || null,
      image: article.social_image || article.cover_image || null,
      credits: article.user?.name || article.user?.username || null,
      url: article.url || url,

      suggestedResourceType: 'blog',
      suggestedTags: tags,
      suggestedTechStack: [],

      platform: 'devto',
      method: 'api',
      cached: false,

      metadata: {
        readingTime: article.reading_time_minutes || undefined,
        publishedAt: article.published_at || undefined
      }
    }
  }
}
