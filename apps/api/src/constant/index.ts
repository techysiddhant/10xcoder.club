// Log levels for convenience
export const LogLevel = {
  TRACE: 'trace',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
} as const

/**
 * Redis key constants for consistent key naming across the application
 * Use these constants to avoid typos and confusion in Redis operations
 */
export const REDIS_KEY = {
  // Session keys
  SESSION: (sessionId: string) => `session:${sessionId}`,
  SESSION_USER: (userId: string) => `session:user:${userId}`,

  // User cache
  USER: (userId: string) => `user:${userId}`,
  USER_BY_EMAIL: (email: string) => `user:email:${email}`,

  // Resource cache
  RESOURCE: (resourceId: string) => `resource:${resourceId}`,
  RESOURCES_BY_USER: (userId: string) => `resources:user:${userId}`,
  RESOURCES_BY_TAG: (tagName: string) => `resources:tag:${tagName}`,
  RESOURCES_BY_TECH: (techName: string) => `resources:tech:${techName}`,

  // Vote keys
  VOTE_UPVOTES: (resourceId: string) => `vote:upvotes:${resourceId}`, // Set of user IDs who upvoted
  VOTE_DOWNVOTES: (resourceId: string) => `vote:downvotes:${resourceId}`, // Set of user IDs who downvoted
  UPVOTE_COUNT: (resourceId: string) => `vote:upcount:${resourceId}`,
  DOWNVOTE_COUNT: (resourceId: string) => `vote:downcount:${resourceId}`,
  VOTE_CHANNEL: 'vote:events', // Pub/Sub channel for SSE

  // Rate limiting
  RATE_LIMIT: (ip: string) => `rate_limit:${ip}`,
  RATE_LIMIT_USER: (userId: string) => `rate_limit:user:${userId}`,

  // Verification tokens
  VERIFY_EMAIL: (token: string) => `verify:email:${token}`,
  RESET_PASSWORD: (token: string) => `verify:reset:${token}`,
  MAGIC_LINK: (token: string) => `verify:magic:${token}`,

  // Locks
  LOCK: (resourceName: string) => `lock:${resourceName}`
} as const

// Cache TTL values in seconds
export const CACHE_TTL = {
  SESSION: 60 * 60 * 24 * 7, // 7 days
  USER: 60 * 60, // 1 hour
  RESOURCE: 60 * 5, // 5 minutes
  RESOURCES_LIST: 60 * 2, // 2 minutes
  RATE_LIMIT: 60, // 1 minute
  VERIFY_TOKEN: 60 * 60 * 24 // 24 hours
} as const

// ==========================================
// Resource List Query Cache Key Generator
// ==========================================
interface ResourceListQuery {
  cursor?: string
  limit?: number
  resourceType?: string
  language?: 'english' | 'hindi'
  tag?: string
  techStack?: string
  search?: string
}

export function generateResourcesCacheKey(query: ResourceListQuery): string {
  const parts = ['resources']
  // Encode values to prevent ambiguous keys when values contain colons or special chars
  if (query.cursor) parts.push(`cursor:${encodeURIComponent(query.cursor)}`)
  if (query.limit) parts.push(`limit:${query.limit}`)
  if (query.resourceType) parts.push(`type:${encodeURIComponent(query.resourceType)}`)
  if (query.language) parts.push(`lang:${encodeURIComponent(query.language)}`)
  if (query.tag) parts.push(`tag:${encodeURIComponent(query.tag)}`)
  if (query.techStack) parts.push(`tech:${encodeURIComponent(query.techStack)}`)
  if (query.search) parts.push(`search:${encodeURIComponent(query.search)}`)
  return parts.join(':')
}
