/**
 * Generic Provider
 * Fallback provider for any URL using Open Graph and meta tags
 */

import * as cheerio from 'cheerio'
import type { ScrapedResource, ScrapeProvider, ScrapeOptions } from './types'

export class GenericProvider implements ScrapeProvider {
  name = 'generic'

  canHandle(_url: string): boolean {
    // This is the fallback provider, always returns true
    return true
  }

  // Request timeout in milliseconds
  private readonly FETCH_TIMEOUT_MS = 5000

  async scrape(url: string, _options?: ScrapeOptions): Promise<ScrapedResource> {
    // Validate URL protocol
    const parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error(
        `Invalid URL protocol: ${parsedUrl.protocol}. Only http and https are allowed.`
      )
    }

    // SSRF protection: Check if hostname resolves to private/internal IPs
    await this.validateHostname(parsedUrl.hostname)

    // Set up timeout with AbortController
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.FETCH_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        redirect: 'follow',
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`)
      }

      const html = await response.text()
      const $ = cheerio.load(html)

      // Extract Open Graph and meta tags
      const title =
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('title').text() ||
        ''

      const description =
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="twitter:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        null

      const image =
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        $('meta[property="image"]').attr('content') ||
        null

      const author =
        $('meta[name="author"]').attr('content') ||
        $('meta[property="article:author"]').attr('content') ||
        $('[rel="author"]').text() ||
        null

      // Extract keywords as potential tags
      const keywordsStr = $('meta[name="keywords"]').attr('content') || ''
      const keywords = keywordsStr
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k.length > 0 && k.length < 30)
        .slice(0, 10)

      // Determine resource type based on URL patterns
      const suggestedResourceType = this.detectResourceType(url)

      return {
        title: title.trim(),
        description: description?.trim() || null,
        image: image ? this.resolveUrl(image, url) : null,
        credits: author?.trim() || null,
        url,

        suggestedResourceType,
        suggestedTags: keywords,
        suggestedTechStack: [],

        platform: 'generic',
        method: 'og_meta',
        cached: false,

        metadata: {}
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(
          `Request timeout: URL took longer than ${this.FETCH_TIMEOUT_MS}ms to respond`
        )
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Validate hostname is not a private/internal IP address (SSRF protection)
   */
  private async validateHostname(hostname: string): Promise<void> {
    // List of blocked patterns
    const blockedPatterns = [
      // Loopback
      /^127\./,
      /^localhost$/i,
      /^::1$/,
      /^\[::1\]$/,
      // Private ranges
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      // Link-local
      /^169\.254\./,
      /^fe80:/i,
      // Cloud metadata endpoints
      /^169\.254\.169\.254$/,
      /^metadata\.google\.internal$/i,
      /^metadata\.google\.com$/i,
      // IPv4-mapped IPv6
      /^::ffff:/i
    ]

    // Check hostname directly against patterns
    if (blockedPatterns.some((pattern) => pattern.test(hostname))) {
      throw new Error(`SSRF blocked: ${hostname} resolves to a private/internal address`)
    }

    // Try to resolve hostname and check the IP
    try {
      const { lookup } = await import('dns/promises')
      const { address } = await lookup(hostname)

      if (blockedPatterns.some((pattern) => pattern.test(address))) {
        throw new Error(`SSRF blocked: ${hostname} resolves to private IP ${address}`)
      }
    } catch (error) {
      // If it's our SSRF error, rethrow it
      if (error instanceof Error && error.message.startsWith('SSRF blocked')) {
        throw error
      }
      // DNS lookup failed - could be a valid domain, let fetch handle it
    }
  }

  private detectResourceType(url: string): ScrapedResource['suggestedResourceType'] {
    const lowerUrl = url.toLowerCase()

    // AI tool domains (common patterns)
    const aiToolPatterns = [
      'openai.com',
      'anthropic.com',
      'cursor.sh',
      'copilot',
      'chatgpt',
      'claude',
      'midjourney',
      'stability.ai',
      'huggingface.co',
      'replicate.com',
      'perplexity.ai',
      'jasper.ai',
      'writesonic',
      'copy.ai'
    ]

    if (aiToolPatterns.some((pattern) => lowerUrl.includes(pattern))) {
      return 'ai_tool'
    }

    // Default to blog for any other content
    return 'blog'
  }

  private resolveUrl(imageUrl: string, baseUrl: string): string {
    // If it's already an absolute URL, return as-is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl
    }

    // Resolve relative URL
    try {
      return new URL(imageUrl, baseUrl).href
    } catch {
      return imageUrl
    }
  }
}
