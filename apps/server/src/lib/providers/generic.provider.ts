/**
 * Generic Provider
 * Fallback provider for any URL using Open Graph and meta tags
 */

import * as cheerio from "cheerio";
import { lookup } from "dns/promises";
import http from "node:http";
import https from "node:https";
import type { Socket } from "node:net";
import zlib from "node:zlib";
import type {
  ScrapedResource,
  ScrapeProvider,
  ScrapeOptions,
  RobotsDiagnostics,
} from "../../types/scrape";
import { InvalidUrlError, PlatformApiError, ScrapeError } from "../errors";

export class GenericProvider implements ScrapeProvider {
  name = "generic";

  canHandle(_url: string): boolean {
    // This is the fallback provider, always returns true
    return true;
  }

  // Request timeout in milliseconds (generous for slow/heavy pages)
  private readonly FETCH_TIMEOUT_MS = 10000;
  // Maximum number of redirects to follow
  private readonly MAX_REDIRECTS = 5;
  // Maximum response body size in bytes (2 MB)
  private readonly MAX_RESPONSE_SIZE = 2 * 1024 * 1024;

  async scrape(
    url: string,
    _options?: ScrapeOptions,
  ): Promise<ScrapedResource> {
    // Parse and validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Invalid URL format";
      throw new InvalidUrlError(`Invalid URL: ${url}. ${errorMessage}`);
    }

    // Validate URL protocol
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new InvalidUrlError(
        `Invalid URL protocol: ${parsedUrl.protocol}. Only http and https are allowed.`,
      );
    }

    // SSRF protection: Check if hostname resolves to private/internal IPs
    // Returns resolved addresses for connect-time verification
    const allowedIps = await this.validateHostname(parsedUrl.hostname);

    // Set up timeout with AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.FETCH_TIMEOUT_MS,
    );

    try {
      const response = await this.fetchWithRedirectHandling(
        url,
        allowedIps,
        controller.signal,
      );

      if (!response.ok) {
        throw new PlatformApiError(`Failed to fetch URL: ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract Open Graph and meta tags
      const title =
        $('meta[property="og:title"]').attr("content") ||
        $('meta[name="twitter:title"]').attr("content") ||
        $("title").text() ||
        "";

      const description =
        $('meta[property="og:description"]').attr("content") ||
        $('meta[name="twitter:description"]').attr("content") ||
        $('meta[name="description"]').attr("content") ||
        null;

      const imageCandidates: Array<string | null | undefined> = [
        $('meta[property="og:image"]').attr("content"),
        $('meta[property="og:image:secure_url"]').attr("content"),
        $('meta[property="og:image:url"]').attr("content"),
        $('meta[name="twitter:image"]').attr("content"),
        $('meta[name="twitter:image:src"]').attr("content"),
        $('meta[itemprop="image"]').attr("content"),
        $('meta[property="image"]').attr("content"),
      ];
      if (!imageCandidates.some(Boolean)) {
        $("meta").each((_, el) => {
          const prop = (
            $(el).attr("property") ||
            $(el).attr("name") ||
            ""
          ).toLowerCase();
          if (prop === "og:image" && $(el).attr("content")) {
            imageCandidates.push($(el).attr("content"));
            return false; // break
          }
        });
      }
      imageCandidates.push(this.extractOgImageFromHtml(html));

      const author =
        $('meta[name="author"]').attr("content") ||
        $('meta[property="article:author"]').attr("content") ||
        $('[rel="author"]').text() ||
        null;

      // Extract keywords as potential tags
      const keywordsStr = $('meta[name="keywords"]').attr("content") || "";
      const keywords = keywordsStr
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k.length > 0 && k.length < 30)
        .slice(0, 10);

      // Determine resource type based on URL patterns
      const suggestedResourceType = this.detectResourceType(url);

      // Use the final redirected URL from the response for resolving relative image URLs
      const finalUrl = response.url || url;

      const resolvedImage = this.pickFirstValidUrl(imageCandidates, finalUrl);

      const robotsController = new AbortController();
      const robotsTimeoutId = setTimeout(() => robotsController.abort(), 10000);
      let robots;
      try {
        robots = await this.getRobotsDiagnostics(
          finalUrl,
          resolvedImage,
          robotsController.signal,
        );
      } finally {
        clearTimeout(robotsTimeoutId);
      }

      return {
        title: title.trim(),
        description: description?.trim() || null,
        image: resolvedImage,
        credits: author?.trim() || null,
        url,

        suggestedResourceType,
        suggestedTags: keywords,
        suggestedTechStack: [],

        platform: "generic",
        method: "og_meta",
        cached: false,

        metadata: { robots },
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new PlatformApiError(
          `Request timeout: URL took longer than ${this.FETCH_TIMEOUT_MS}ms to respond`,
        );
      }
      if (error instanceof ScrapeError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new PlatformApiError(`Failed to fetch URL: ${message}`, error);
    } finally {
      clearTimeout(timeoutId);
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
    signal: AbortSignal,
  ): Promise<Response> {
    let currentUrl = url;
    let redirectCount = 0;
    let allowedIps = initialAllowedIps;

    while (redirectCount <= this.MAX_REDIRECTS) {
      // Validate and resolve IPs for current URL
      const parsedCurrentUrl = new URL(currentUrl);
      const currentAllowedIps = await this.validateHostname(
        parsedCurrentUrl.hostname,
      );
      // Use the resolved IPs for this request
      allowedIps = currentAllowedIps;

      // Use fetchWithIpVerification instead of standard fetch
      const response = await this.fetchWithIpVerification(
        currentUrl,
        allowedIps,
        signal,
      );

      // Check if response is a redirect (3xx status)
      if (response.status >= 300 && response.status < 400) {
        redirectCount++;

        if (redirectCount > this.MAX_REDIRECTS) {
          throw new PlatformApiError(
            `Maximum redirect limit (${this.MAX_REDIRECTS}) exceeded for URL: ${url}`,
          );
        }

        // Get Location header
        const location = response.headers.get("Location");
        if (!location) {
          throw new PlatformApiError(
            `Redirect response (${response.status}) missing Location header for URL: ${currentUrl}`,
          );
        }

        // Resolve relative URLs against current URL
        let redirectUrl: string;
        try {
          redirectUrl = new URL(location, currentUrl).href;
        } catch (error) {
          throw new InvalidUrlError(
            `Invalid redirect URL: ${location} (from ${currentUrl})`,
          );
        }

        // Parse and validate the redirect URL
        let parsedRedirectUrl: URL;
        try {
          parsedRedirectUrl = new URL(redirectUrl);
        } catch (error) {
          throw new InvalidUrlError(
            `Failed to parse redirect URL: ${redirectUrl}`,
          );
        }

        // Validate protocol
        if (!["http:", "https:"].includes(parsedRedirectUrl.protocol)) {
          throw new InvalidUrlError(
            `Invalid redirect protocol: ${parsedRedirectUrl.protocol}. Only http and https are allowed. Redirect from: ${currentUrl}`,
          );
        }

        // SSRF protection: Validate redirect target hostname and get resolved IPs
        try {
          const redirectAllowedIps = await this.validateHostname(
            parsedRedirectUrl.hostname,
          );
          // Update allowed IPs for next iteration
          allowedIps = redirectAllowedIps;
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.startsWith("SSRF blocked")
          ) {
            throw new InvalidUrlError(
              `SSRF blocked: Redirect target ${parsedRedirectUrl.hostname} is not allowed. Redirect from: ${currentUrl}`,
            );
          }
          throw error;
        }

        // Follow the redirect
        currentUrl = redirectUrl;
        continue;
      }

      // Not a redirect, return the response
      return response;
    }

    // This should never be reached, but TypeScript needs it
    throw new PlatformApiError(`Unexpected redirect loop for URL: ${url}`);
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
      /^::ffff:/i,
    ];

    // Check hostname directly against patterns
    if (blockedPatterns.some((pattern) => pattern.test(hostname))) {
      throw new InvalidUrlError(
        `SSRF blocked: ${hostname} resolves to a private/internal address`,
      );
    }

    // Try to resolve hostname and check the IP
    try {
      const addresses = await lookup(hostname, { all: true });
      const resolvedAddresses: string[] = [];

      // Check all returned addresses against blocked patterns
      for (const { address } of addresses) {
        if (blockedPatterns.some((pattern) => pattern.test(address))) {
          throw new InvalidUrlError(
            `SSRF blocked: ${hostname} resolves to private IP ${address}`,
          );
        }
        resolvedAddresses.push(address);
      }

      // Return resolved addresses for connect-time verification
      return resolvedAddresses;
    } catch (error) {
      // If it's our SSRF error, rethrow it
      if (error instanceof Error && error.message.startsWith("SSRF blocked")) {
        throw error;
      }
      // DNS lookup failed - reject to enforce blocking
      throw new InvalidUrlError(
        `SSRF blocked: DNS lookup failed for ${hostname}`,
      );
    }
  }

  /**
   * Normalize IPv4-mapped IPv6 addresses (::ffff:x.x.x.x) to their IPv4 form
   * Returns the IPv4 address if the input is IPv4-mapped, otherwise returns the original address
   */
  private normalizeIpv4Mapped(ip: string): string {
    // Remove brackets if present
    const unbracketed = ip.replace(/^\[|\]$/g, "");

    // Check for IPv4-mapped IPv6 pattern: ::ffff:x.x.x.x or ::FFFF:x.x.x.x
    const ipv4MappedPattern =
      /^::ffff:([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})$/i;
    const match = unbracketed.match(ipv4MappedPattern);

    if (match) {
      // Return the extracted IPv4 address
      return match[1]!;
    }

    // Not IPv4-mapped, return original (with brackets removed for consistency)
    return unbracketed;
  }

  /**
   * Decompress response body when Content-Encoding is gzip, deflate, or br.
   * Node's http does not auto-decompress; without this we'd parse compressed bytes as UTF-8 (garbage).
   */
  private decompressBody(buffer: Buffer, encoding: string): Buffer | null {
    const enc = encoding.trim().toLowerCase().split(",")[0]?.trim() ?? "";
    try {
      if (enc === "gzip") return zlib.gunzipSync(buffer);
      if (enc === "deflate") return zlib.inflateSync(buffer);
      if (enc === "br") return zlib.brotliDecompressSync(buffer);
    } catch {
      // Unknown or unsupported encoding, or corrupt data: return null to use raw body
      return null;
    }
    return null;
  }

  /**
   * Make an HTTP/HTTPS request with connect-time IP verification
   * Validates socket remoteAddress against pinned IPs to prevent DNS rebinding attacks
   */
  private async fetchWithIpVerification(
    url: string,
    allowedIps: string[],
    signal: AbortSignal,
  ): Promise<Response> {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === "https:";
    const port = parsedUrl.port || (isHttps ? 443 : 80);
    const hostname = parsedUrl.hostname;

    // If we have allowed IPs, pin to the first one
    const pinnedIp = allowedIps.length > 0 ? allowedIps[0]! : null;

    return new Promise((resolve, reject) => {
      // Create request options
      const options: http.RequestOptions | https.RequestOptions = {
        hostname: pinnedIp || hostname, // Use pinned IP if available
        port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: "GET",
        headers: {
          Host: hostname, // Preserve original hostname for Host header
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Sec-CH-UA":
            '"Chromium";v="120", "Google Chrome";v="120", "Not_A Brand";v="24"',
          "Sec-CH-UA-Mobile": "?0",
          "Sec-CH-UA-Platform": '"Windows"',
        },
      };

      // For HTTPS, set servername for SNI (Server Name Indication)
      if (isHttps && pinnedIp) {
        (options as https.RequestOptions).servername = hostname;
      }

      const requestModule = isHttps ? https : http;
      const req = requestModule.request(options, (res) => {
        // Collect response data
        const chunks: Buffer[] = [];
        let totalBytes = 0;
        let sizeLimitExceeded = false;

        res.on("data", (chunk: Buffer) => {
          // Track cumulative byte length
          totalBytes += chunk.length;

          // Enforce size cap
          if (totalBytes > this.MAX_RESPONSE_SIZE) {
            sizeLimitExceeded = true;
            // Abort the upstream request immediately
            req.destroy();
            res.destroy();
            // Reject with clear error message (will result in 413-style handling upstream)
            reject(
              new PlatformApiError(
                `Response body exceeds maximum size of ${this.MAX_RESPONSE_SIZE} bytes (received ${totalBytes} bytes)`,
              ),
            );
            return;
          }

          // Only push chunk if under limit
          chunks.push(chunk);
        });

        res.on("end", () => {
          // Only concatenate if we didn't exceed the limit
          if (sizeLimitExceeded) {
            return; // Error already handled in data handler
          }

          let body: Buffer = Buffer.concat(chunks);
          const encoding = res.headers["content-encoding"];
          if (encoding) {
            const decompressed = this.decompressBody(body, encoding);
            if (decompressed) body = decompressed;
          }
          // Convert Node.js response to Fetch Response
          const response = new Response(body as unknown as BodyInit, {
            status: res.statusCode || 200,
            statusText: res.statusMessage || "OK",
            headers: res.headers as HeadersInit,
          });
          // Set request URL explicitly. IncomingMessage.url can be "/" (path-only),
          // which breaks absolute URL resolution for image metadata and robots checks.
          const finalUrl = url;
          Object.defineProperty(response, "url", {
            value: finalUrl,
            writable: false,
          });
          resolve(response);
        });

        res.on("error", (error) => {
          // Handle errors during response streaming
          req.destroy();
          reject(
            new PlatformApiError(
              `Failed to read response: ${error instanceof Error ? error.message : "Unknown error"}`,
            ),
          );
        });
      });

      // Handle socket connection for IP verification
      req.on("socket", (socket: Socket) => {
        socket.on("connect", () => {
          const remoteAddress = socket.remoteAddress;
          if (!remoteAddress) {
            req.destroy();
            reject(
              new InvalidUrlError(
                `SSRF blocked: Could not verify connection IP for ${hostname}`,
              ),
            );
            return;
          }

          // Normalize IPv4-mapped IPv6 addresses to IPv4 form before checks
          const normalizedRemote = this.normalizeIpv4Mapped(remoteAddress);
          const normalizedAllowed = allowedIps.map((ip) =>
            this.normalizeIpv4Mapped(ip),
          );

          // Verify the socket's remoteAddress matches one of the allowed IPs
          if (
            allowedIps.length > 0 &&
            !normalizedAllowed.includes(normalizedRemote)
          ) {
            req.destroy();
            reject(
              new InvalidUrlError(
                `SSRF blocked: Connection IP ${remoteAddress} does not match resolved IPs for ${hostname}`,
              ),
            );
            return;
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
            /^f[cd][0-9a-f]{2}:/i,
            /^169\.254\.169\.254$/,
            /^metadata\.google\.internal$/i,
            /^metadata\.google\.com$/i,
            /^instance-data\.ec2\.internal$/i,
            /^::ffff:/i,
          ];

          if (
            blockedPatterns.some((pattern) => pattern.test(normalizedRemote))
          ) {
            req.destroy();
            reject(
              new InvalidUrlError(
                `SSRF blocked: Connection IP ${remoteAddress} is in a private/internal range`,
              ),
            );
            return;
          }
        });

        socket.on("error", (error) => {
          reject(error);
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      // Handle abort signal
      if (signal.aborted) {
        req.destroy();
        const abortError = new Error("Aborted");
        abortError.name = "AbortError";
        reject(abortError);
        return;
      }

      signal.addEventListener("abort", () => {
        const abortError = new Error("Aborted");
        abortError.name = "AbortError";
        req.destroy(abortError);
        reject(abortError);
      });

      req.end();
    });
  }

  private pickFirstValidUrl(
    candidates: Array<string | null | undefined>,
    baseUrl: string,
  ): string | null {
    for (const candidate of candidates) {
      if (!candidate) continue;
      const resolved = this.resolveUrl(candidate, baseUrl);
      if (resolved) return resolved;
    }
    return null;
  }

  private parseRobotsRules(robotsTxt: string): Array<{
    userAgent: string;
    type: "allow" | "disallow";
    path: string;
  }> {
    const rules: Array<{
      userAgent: string;
      type: "allow" | "disallow";
      path: string;
    }> = [];
    let currentAgents: string[] = [];
    let lastKey = "";

    for (const rawLine of robotsTxt.split("\n")) {
      const line = rawLine.split("#")[0]?.trim();
      if (!line) continue;

      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) continue;
      const key = line.slice(0, separatorIndex).trim().toLowerCase();
      const value = line.slice(separatorIndex + 1).trim();

      if (key === "user-agent") {
        if (lastKey === "user-agent") {
          currentAgents.push(value.toLowerCase());
        } else {
          currentAgents = [value.toLowerCase()];
        }
        lastKey = key;
        continue;
      }

      if (key === "allow" || key === "disallow") {
        if (currentAgents.length === 0) {
          currentAgents = ["*"];
        }
        for (const userAgent of currentAgents) {
          rules.push({
            userAgent,
            type: key,
            path: value,
          });
        }
      }
      lastKey = key;
    }

    return rules;
  }

  private matchesRobotsPath(path: string, pattern: string): boolean {
    // Empty disallow means allow all
    if (!pattern) return false;
    const hasEndAnchor = pattern.endsWith("$");
    const normalizedPattern = hasEndAnchor ? pattern.slice(0, -1) : pattern;
    const escaped = normalizedPattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    const regexPattern =
      "^" + escaped.replace(/\\\*/g, ".*") + (hasEndAnchor ? "$" : ".*");
    try {
      const re = new RegExp(regexPattern);
      return re.test(path);
    } catch {
      return path.startsWith(pattern);
    }
  }

  private isAllowedByRobots(
    path: string,
    rules: Array<{ type: "allow" | "disallow"; path: string }>,
  ): boolean {
    let bestMatch: { type: "allow" | "disallow"; length: number } | null = null;

    for (const rule of rules) {
      if (!rule.path) continue;
      if (!this.matchesRobotsPath(path, rule.path)) continue;
      const matchLength = rule.path.replace(/\*/g, "").length;
      if (!bestMatch || matchLength > bestMatch.length) {
        bestMatch = { type: rule.type, length: matchLength };
      }
    }

    if (!bestMatch) return true;
    return bestMatch.type === "allow";
  }

  private async evaluateRobotsForUrl(
    rawUrl: string,
    signal: AbortSignal,
  ): Promise<{
    fetched: boolean;
    allowed: boolean | null;
    source: string;
    reason?: string;
  }> {
    let target: URL;
    try {
      target = new URL(rawUrl);
    } catch {
      return {
        fetched: false,
        allowed: null,
        source: "invalid_target_url",
      };
    }

    const protocol = target.protocol?.replace(":", "") || "https";
    const robotsUrl = `${protocol}://${target.host}/robots.txt`;
    try {
      const allowedIps = await this.validateHostname(target.hostname);
      const response = await this.fetchWithRedirectHandling(
        robotsUrl,
        allowedIps,
        signal,
      );

      if (response.status === 404) {
        return { fetched: false, allowed: null, source: "robots_not_found" };
      }
      if (!response.ok) {
        return {
          fetched: false,
          allowed: null,
          source: `robots_status_${response.status}`,
        };
      }

      const robotsTxt = await response.text();
      const parsedRules = this.parseRobotsRules(robotsTxt);
      const applicable = parsedRules
        .filter((r) => r.userAgent === "*")
        .map((r) => ({ type: r.type, path: r.path }));

      const targetPath = target.pathname || "/";
      const allowed = this.isAllowedByRobots(targetPath, applicable);
      return { fetched: true, allowed, source: "robots_fetched" };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown error";
      return {
        fetched: false,
        allowed: null,
        source: "robots_error",
        reason,
      };
    }
  }

  private async getRobotsDiagnostics(
    pageUrl: string,
    imageUrl: string | null,
    signal: AbortSignal,
  ): Promise<RobotsDiagnostics> {
    const page = await this.evaluateRobotsForUrl(pageUrl, signal);
    let imageAllowed: boolean | null = null;

    if (imageUrl) {
      const image = await this.evaluateRobotsForUrl(imageUrl, signal);
      imageAllowed = image.allowed;
    }

    return {
      fetched: page.fetched,
      pageAllowed: page.allowed,
      imageAllowed,
      source: page.source,
      reason: page.reason,
    };
  }

  private detectResourceType(
    url: string,
  ): ScrapedResource["suggestedResourceType"] {
    const lowerUrl = url.toLowerCase();

    // AI tool domains (common patterns)
    const aiToolPatterns = [
      "openai.com",
      "anthropic.com",
      "cursor.sh",
      "copilot",
      "chatgpt",
      "claude",
      "midjourney",
      "stability.ai",
      "huggingface.co",
      "replicate.com",
      "perplexity.ai",
      "jasper.ai",
      "writesonic",
      "copy.ai",
    ];

    if (aiToolPatterns.some((pattern) => lowerUrl.includes(pattern))) {
      return "tool";
    }

    // Default to blog for any other content
    return "blog";
  }

  /**
   * Fallback: extract og:image URL from raw HTML when meta tags are missing.
   * Next.js and similar frameworks sometimes embed metadata in script payloads
   * (e.g. "property":"og:image","content":"https://..."). This handles cases
   * where the server returns full meta in HTML for browsers but only script
   * payload for some requests.
   */
  private extractOgImageFromHtml(html: string): string | null {
    const patterns = [
      // Next.js / JSON script: "property":"og:image","content":"https://..."
      /"property"\s*:\s*"og:image"\s*,\s*"content"\s*:\s*"(https?:\/\/[^"]+)"/i,
      // Escaped in script: \"property\":\"og:image\",\"content\":\"https://...\"
      /\\"property\\"\s*:\s*\\"og:image\\"\s*,\s*\\"content\\"\s*:\s*\\"(https?:\/\/[^"]+)\\"/i,
      // Generic JSON: "content":"https://..." with og:image nearby
      /["'](?:property|name)["']\s*:\s*["']og:image["'][^}]*["']content["']\s*:\s*["'](https?:\/\/[^"']+)["']/i,
      /["']content["']\s*:\s*["'](https?:\/\/[^"']+)["'][^}]*["'](?:property|name)["']\s*:\s*["']og:image["']/i,
      // HTML-like in script
      /og:image["']\s*[^>]*content=["'](https?:\/\/[^"']+)["']/i,
      /content=["'](https?:\/\/[^"']+)["'][^>]*property=["']og:image["']/i,
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) return m[1];
    }
    return null;
  }

  private resolveUrl(imageUrl: string, baseUrl: string): string | null {
    try {
      // Parse imageUrl against baseUrl to resolve relative URLs
      const url = new URL(imageUrl, baseUrl);

      // Validate protocol - only allow http: and https:
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return null;
      }

      // Remove cache-busting/query/hash parts before storing scraped image URL.
      url.search = "";
      url.hash = "";
      return url.href;
    } catch {
      // If parsing fails or protocol is not allowed, return safe fallback
      return null;
    }
  }
}
