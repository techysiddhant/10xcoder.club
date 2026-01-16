/**
 * Generic Provider
 * Fallback provider for any URL using Open Graph and meta tags
 */

import * as cheerio from 'cheerio'
import { lookup } from 'dns/promises'
import http from 'node:http'
import https from 'node:https'
import type { Socket } from 'node:net'
import type { ScrapedResource, ScrapeProvider, ScrapeOptions } from '@/types'
import { InvalidUrlError, PlatformApiError } from '@/lib/errors'

export class GenericProvider implements ScrapeProvider {
  name = 'generic'

  canHandle(_url: string): boolean {
    // This is the fallback provider, always returns true
    return true
  }

  // Request timeout in milliseconds
  private readonly FETCH_TIMEOUT_MS = 5000
  // Maximum number of redirects to follow
  private readonly MAX_REDIRECTS = 5

  async scrape(url: string, _options?: ScrapeOptions): Promise<ScrapedResource> {
    // Parse and validate URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid URL format'
      throw new InvalidUrlError(`Invalid URL: ${url}. ${errorMessage}`)
    }

    // Validate URL protocol
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new InvalidUrlError(
        `Invalid URL protocol: ${parsedUrl.protocol}. Only http and https are allowed.`
      )
    }

    // SSRF protection: Check if hostname resolves to private/internal IPs
    // Returns resolved addresses for connect-time verification
    const allowedIps = await this.validateHostname(parsedUrl.hostname)

    // Set up timeout with AbortController
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.FETCH_TIMEOUT_MS)

    try {
      const response = await this.fetchWithRedirectHandling(url, allowedIps, controller.signal)

      if (!response.ok) {
        throw new PlatformApiError(`Failed to fetch URL: ${response.status}`)
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

      // Use the final redirected URL from the response for resolving relative image URLs
      const finalUrl = response.url || url

      return {
        title: title.trim(),
        description: description?.trim() || null,
        image: image ? this.resolveUrl(image, finalUrl) : null,
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
        throw new PlatformApiError(
          `Request timeout: URL took longer than ${this.FETCH_TIMEOUT_MS}ms to respond`
        )
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Fetch with manual redirect handling to prevent SSRF attacks
   * Validates each redirect target against hostname/IP allowlist
   * Uses connect-time IP verification to prevent DNS rebinding attacks
   */
  private async fetchWithRedirectHandling(
    url: string,
    initialAllowedIps: string[],
    signal: AbortSignal
  ): Promise<Response> {
    let currentUrl = url
    let redirectCount = 0
    let allowedIps = initialAllowedIps

    while (redirectCount <= this.MAX_REDIRECTS) {
      // Validate and resolve IPs for current URL
      const parsedCurrentUrl = new URL(currentUrl)
      const currentAllowedIps = await this.validateHostname(parsedCurrentUrl.hostname)
      // Use the resolved IPs for this request
      allowedIps = currentAllowedIps

      // Use fetchWithIpVerification instead of standard fetch
      const response = await this.fetchWithIpVerification(currentUrl, allowedIps, signal)

      // Check if response is a redirect (3xx status)
      if (response.status >= 300 && response.status < 400) {
        redirectCount++

        if (redirectCount > this.MAX_REDIRECTS) {
          throw new PlatformApiError(
            `Maximum redirect limit (${this.MAX_REDIRECTS}) exceeded for URL: ${url}`
          )
        }

        // Get Location header
        const location = response.headers.get('Location')
        if (!location) {
          throw new PlatformApiError(
            `Redirect response (${response.status}) missing Location header for URL: ${currentUrl}`
          )
        }

        // Resolve relative URLs against current URL
        let redirectUrl: string
        try {
          redirectUrl = new URL(location, currentUrl).href
        } catch (error) {
          throw new InvalidUrlError(`Invalid redirect URL: ${location} (from ${currentUrl})`)
        }

        // Parse and validate the redirect URL
        let parsedRedirectUrl: URL
        try {
          parsedRedirectUrl = new URL(redirectUrl)
        } catch (error) {
          throw new InvalidUrlError(`Failed to parse redirect URL: ${redirectUrl}`)
        }

        // Validate protocol
        if (!['http:', 'https:'].includes(parsedRedirectUrl.protocol)) {
          throw new InvalidUrlError(
            `Invalid redirect protocol: ${parsedRedirectUrl.protocol}. Only http and https are allowed. Redirect from: ${currentUrl}`
          )
        }

        // SSRF protection: Validate redirect target hostname and get resolved IPs
        try {
          const redirectAllowedIps = await this.validateHostname(parsedRedirectUrl.hostname)
          // Update allowed IPs for next iteration
          allowedIps = redirectAllowedIps
        } catch (error) {
          if (error instanceof Error && error.message.startsWith('SSRF blocked')) {
            throw new InvalidUrlError(
              `SSRF blocked: Redirect target ${parsedRedirectUrl.hostname} is not allowed. Redirect from: ${currentUrl}`
            )
          }
          throw error
        }

        // Follow the redirect
        currentUrl = redirectUrl
        continue
      }

      // Not a redirect, return the response
      return response
    }

    // This should never be reached, but TypeScript needs it
    throw new PlatformApiError(`Unexpected redirect loop for URL: ${url}`)
  }

  /**
   * Validate hostname is not a private/internal IP address (SSRF protection)
   * Returns resolved addresses for connect-time verification
   */
  private async validateHostname(hostname: string): Promise<string[]> {
    // List of blocked patterns
    const blockedPatterns = [
      // Loopback
      /^127\./,
      /^localhost$/i,
      /^::1$/,
      /^\[::1\]$/,
      /^0\.0\.0\.0$/,
      /^0:0:0:0:0:0:0:1$/i,
      /^\[0:0:0:0:0:0:0:1\]$/i,
      // Private ranges
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      // Link-local
      /^169\.254\./,
      /^fe80:/i,
      // IPv6 unique local (fc00::/7 covers fd00::/8)
      /^f[cd][0-9a-f]{2}:/i,
      /^\[f[cd][0-9a-f]{2}:/i,
      // Cloud metadata endpoints
      /^169\.254\.169\.254$/,
      /^metadata\.google\.internal$/i,
      /^metadata\.google\.com$/i,
      /^instance-data\.ec2\.internal$/i,
      // IPv4-mapped IPv6
      /^::ffff:/i
    ]

    // Check hostname directly against patterns
    if (blockedPatterns.some((pattern) => pattern.test(hostname))) {
      throw new InvalidUrlError(`SSRF blocked: ${hostname} resolves to a private/internal address`)
    }

    // Try to resolve hostname and check the IP
    try {
      const addresses = await lookup(hostname, { all: true })
      const resolvedAddresses: string[] = []

      // Check all returned addresses against blocked patterns
      for (const { address } of addresses) {
        if (blockedPatterns.some((pattern) => pattern.test(address))) {
          throw new InvalidUrlError(`SSRF blocked: ${hostname} resolves to private IP ${address}`)
        }
        resolvedAddresses.push(address)
      }

      // Return resolved addresses for connect-time verification
      return resolvedAddresses
    } catch (error) {
      // If it's our SSRF error, rethrow it
      if (error instanceof Error && error.message.startsWith('SSRF blocked')) {
        throw error
      }
      // DNS lookup failed - return empty array, will be handled during connection
      return []
    }
  }

  /**
   * Make an HTTP/HTTPS request with connect-time IP verification
   * Validates socket remoteAddress against pinned IPs to prevent DNS rebinding attacks
   */
  private async fetchWithIpVerification(
    url: string,
    allowedIps: string[],
    signal: AbortSignal
  ): Promise<Response> {
    const parsedUrl = new URL(url)
    const isHttps = parsedUrl.protocol === 'https:'
    const port = parsedUrl.port || (isHttps ? 443 : 80)
    const hostname = parsedUrl.hostname

    // If we have allowed IPs, pin to the first one
    const pinnedIp = allowedIps.length > 0 ? allowedIps[0]! : null

    return new Promise((resolve, reject) => {
      // Create request options
      const options: http.RequestOptions | https.RequestOptions = {
        hostname: pinnedIp || hostname, // Use pinned IP if available
        port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          Host: hostname, // Preserve original hostname for Host header
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      }

      // For HTTPS, set servername for SNI (Server Name Indication)
      if (isHttps && pinnedIp) {
        ;(options as https.RequestOptions).servername = hostname
      }

      const requestModule = isHttps ? https : http
      const req = requestModule.request(options, (res) => {
        // Collect response data
        const chunks: Buffer[] = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          const body = Buffer.concat(chunks)
          // Convert Node.js response to Fetch Response
          const response = new Response(body, {
            status: res.statusCode || 200,
            statusText: res.statusMessage || 'OK',
            headers: res.headers as HeadersInit
          })
          // Set the final URL - use response.url if available (after redirects), otherwise use original url
          const finalUrl = (res as any).url || url
          Object.defineProperty(response, 'url', {
            value: finalUrl,
            writable: false
          })
          resolve(response)
        })
      })

      // Handle socket connection for IP verification
      req.on('socket', (socket: Socket) => {
        socket.on('connect', () => {
          const remoteAddress = socket.remoteAddress
          if (!remoteAddress) {
            req.destroy()
            reject(
              new InvalidUrlError(`SSRF blocked: Could not verify connection IP for ${hostname}`)
            )
            return
          }

          // Normalize IPv6 addresses (remove brackets)
          const normalizedRemote = remoteAddress.replace(/^\[|\]$/g, '')
          const normalizedAllowed = allowedIps.map((ip) => ip.replace(/^\[|\]$/g, ''))

          // Verify the socket's remoteAddress matches one of the allowed IPs
          if (allowedIps.length > 0 && !normalizedAllowed.includes(normalizedRemote)) {
            req.destroy()
            reject(
              new InvalidUrlError(
                `SSRF blocked: Connection IP ${remoteAddress} does not match resolved IPs for ${hostname}`
              )
            )
            return
          }

          // Additional check: verify the IP is not in blocked ranges
          const blockedPatterns = [
            /^127\./,
            /^::1$/,
            /^0\.0\.0\.0$/,
            /^10\./,
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
            /^192\.168\./,
            /^169\.254\./,
            /^fe80:/i,
            /^f[cd][0-9a-f]{2}:/i
          ]

          if (blockedPatterns.some((pattern) => pattern.test(normalizedRemote))) {
            req.destroy()
            reject(
              new InvalidUrlError(
                `SSRF blocked: Connection IP ${remoteAddress} is in a private/internal range`
              )
            )
            return
          }
        })

        socket.on('error', (error) => {
          reject(error)
        })
      })

      req.on('error', (error) => {
        reject(error)
      })

      // Handle abort signal
      if (signal.aborted) {
        req.destroy()
        reject(new Error('Aborted'))
        return
      }

      signal.addEventListener('abort', () => {
        req.destroy(new Error('Aborted'))
      })

      req.end()
    })
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
      return 'tool'
    }

    // Default to blog for any other content
    return 'blog'
  }

  private resolveUrl(imageUrl: string, baseUrl: string): string | null {
    try {
      // Parse imageUrl against baseUrl to resolve relative URLs
      const url = new URL(imageUrl, baseUrl)

      // Validate protocol - only allow http: and https:
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return null
      }

      return url.href
    } catch {
      // If parsing fails or protocol is not allowed, return safe fallback
      return null
    }
  }
}
