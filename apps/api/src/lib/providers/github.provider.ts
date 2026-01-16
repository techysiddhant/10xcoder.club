/**
 * GitHub Provider
 * Scrapes GitHub repository metadata using GitHub REST API
 * Uses user's OAuth token for higher rate limits when available
 */

import type { ScrapedResource, ScrapeProvider, ScrapeOptions } from './types'

// Strict pattern requiring github.com as the domain (with optional protocol and www)
const GITHUB_REPO_PATTERN = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/?#]+)/

function extractRepoInfo(url: string): { owner: string; repo: string } | null {
  const match = url.match(GITHUB_REPO_PATTERN)
  if (!match || !match[1] || !match[2]) {
    return null
  }
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, '')
  }
}

// Common programming languages and their tech stack mappings
const LANGUAGE_TO_TECH: Record<string, string> = {
  TypeScript: 'typescript',
  JavaScript: 'javascript',
  Python: 'python',
  Go: 'go',
  Rust: 'rust',
  Java: 'java',
  'C#': 'csharp',
  Ruby: 'ruby',
  PHP: 'php',
  Swift: 'swift',
  Kotlin: 'kotlin'
}

export class GitHubProvider implements ScrapeProvider {
  name = 'github'

  canHandle(url: string): boolean {
    return url.includes('github.com') && GITHUB_REPO_PATTERN.test(url)
  }

  async scrape(url: string, options?: ScrapeOptions): Promise<ScrapedResource> {
    const repoInfo = extractRepoInfo(url)

    if (!repoInfo) {
      throw new Error('Invalid GitHub repository URL')
    }

    const { owner, repo } = repoInfo

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': '10xcoder-scraper'
    }

    // Use OAuth token if available (higher rate limits: 5000/hr vs 60/hr)
    if (options?.githubAccessToken) {
      headers['Authorization'] = `Bearer ${options.githubAccessToken}`
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Repository not found or is private')
      }
      if (response.status === 403) {
        throw new Error('GitHub API rate limit exceeded')
      }
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const data = await response.json()

    // Extract tech stack from topics and language
    const suggestedTechStack: string[] = []
    if (data.language && LANGUAGE_TO_TECH[data.language]) {
      suggestedTechStack.push(LANGUAGE_TO_TECH[data.language]!)
    }

    // Topics can include frameworks/tools
    const topics = data.topics || []
    const techTopics = topics.filter((t: string) =>
      [
        'react',
        'vue',
        'angular',
        'nextjs',
        'nodejs',
        'express',
        'fastapi',
        'django',
        'rails',
        'spring',
        'docker',
        'kubernetes'
      ].includes(t)
    )
    suggestedTechStack.push(...techTopics)

    // Remaining topics become suggested tags
    const suggestedTags = topics.filter((t: string) => !techTopics.includes(t)).slice(0, 10)

    return {
      title: data.full_name || `${owner}/${repo}`,
      description: data.description || null,
      image: data.owner?.avatar_url || null,
      credits: data.owner?.login || owner,
      url: data.html_url || url,

      suggestedResourceType: 'github_repo',
      suggestedTags,
      suggestedTechStack: [...new Set(suggestedTechStack)], // Dedupe

      platform: 'github',
      method: 'api',
      cached: false,

      metadata: {
        repoName: data.name,
        stars: data.stargazers_count || 0,
        language: data.language || undefined,
        topics
      }
    }
  }
}
