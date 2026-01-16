/**
 * Gemini Embedding Service
 * Generates text embeddings using Google's Gemini text-embedding-004 model
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { env } from '@/config/env'

// Initialize Gemini client (lazy, only if API key is set)
let genAI: GoogleGenerativeAI | null = null

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured')
    }
    genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)
  }
  return genAI
}

/**
 * Generate embedding vector for text using Gemini text-embedding-004
 * @param text - Text to embed
 * @returns 768-dimensional embedding vector
 * @throws Error if text is empty or API call fails
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const MODEL_NAME = 'text-embedding-004'

  // Validate input
  const trimmedText = text.trim()
  if (!trimmedText) {
    throw new Error('Cannot generate embedding for empty or whitespace-only text')
  }

  try {
    const model = getGenAI().getGenerativeModel({ model: MODEL_NAME })
    const result = await model.embedContent(trimmedText)
    return result.embedding.values
  } catch (error) {
    // Add contextual info to the error
    const contextInfo = `[Gemini ${MODEL_NAME}] Input length: ${trimmedText.length} chars`
    const originalMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`${contextInfo} - Embedding generation failed: ${originalMessage}`)
  }
}

/**
 * Build embedding text from resource data
 * Combines title, resourceType, tags, and techStack
 */
export function buildEmbeddingText(resource: {
  title: string
  resourceType: string
  tags?: string[]
  techStack?: string[]
}): string {
  const parts = [
    resource.title,
    resource.resourceType,
    ...(resource.tags || []),
    ...(resource.techStack || [])
  ]
  return parts.filter(Boolean).join(' ')
}

/**
 * Check if Gemini API is configured
 */
export function isGeminiConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY)
}
