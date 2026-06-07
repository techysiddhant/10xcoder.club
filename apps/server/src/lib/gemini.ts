/**
 * Gemini Embedding Service
 * Generates text embeddings using Google's Gemini text-embedding-004 model
 */

import { GoogleGenAI } from "@google/genai";
import { env } from "@/config/env";
import { KnownUserError } from "@/lib/errors";

// Initialize Gemini client (lazy, only if API key is set)
let genAI: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAI) {
    if (!env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    genAI = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return genAI;
}

/**
 * Generate embedding vector for text using Gemini text-embedding-004
 * @param text - Text to embed
 * @returns 768-dimensional embedding vector
 * @throws Error if text is empty or API call fails
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const MODEL_NAME = "text-embedding-004";

  // Validate input
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error(
      "Cannot generate embedding for empty or whitespace-only text",
    );
  }

  try {
    const result = await getGenAI().models.embedContent({
      model: MODEL_NAME,
      contents: trimmedText,
    });
    const embeddings = result.embeddings;
    if (!embeddings || embeddings.length === 0) {
      throw new Error("No embedding returned from Gemini");
    }
    const values = embeddings[0]?.values;
    if (!values || values.length !== 768) {
      throw new Error(
        `Unexpected embedding shape: expected 768 but got ${values?.length ?? 0}`,
      );
    }
    return values;
  } catch (error) {
    // Add contextual info to the error
    const contextInfo = `[Gemini ${MODEL_NAME}] Input length: ${trimmedText.length} chars`;
    const originalMessage =
      error instanceof Error ? error.message : String(error);
    throw new Error(
      `${contextInfo} - Embedding generation failed: ${originalMessage}`,
    );
  }
}

/**
 * Build embedding text from resource data
 * Combines title, resourceType, tags, and techStack
 */
export function buildEmbeddingText(resource: {
  title: string;
  resourceType: string;
  tags?: string[];
  techStack?: string[];
}): string {
  const parts = [
    resource.title,
    resource.resourceType,
    ...(resource.tags || []),
    ...(resource.techStack || []),
  ];
  return parts.filter(Boolean).join(" ");
}

/**
 * Check if Gemini API is configured
 */
export function isGeminiConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}

/**
 * Generate a dynamically formatted resource description using Gemini 2.5 Flash
 */
export async function generateResourceDescription(params: {
  url: string;
  title: string;
  resourceType: string;
  tags?: string[];
  techStack?: string[];
  scrapedContent?: string | null;
}): Promise<string> {
  const modelName = "gemini-2.5-flash";

  const { url, title, resourceType, tags, techStack, scrapedContent } = params;

  const prompt = `You are an expert technical writer and curriculum designer.
Your task is to generate a beautifully structured, highly engaging, and premium markdown summary/description for a learning resource.

CRITICAL REQUIREMENT:
The generated description must be highly SEO-optimized to rank on Google and other search engines. Ensure you follow these SEO instructions:
- Incorporate high-value, natural technical search keywords based on the resource title, tags, and tech stack.
- Structure headings and semantic markup to make the content easily crawlable.
- Integrate search terms developers frequently look for (e.g., "how to", "tutorial", "best practices", specific library and tool names, features, configuration, or usage patterns).
- Keep descriptions clear, concise, and informative to maximize user engagement, dwell-time, and lower bounce rates.
- Add relevant contextual synonyms for technical concepts naturally.

Here is the resource information:
- **Title**: ${title}
- **URL**: ${url}
- **Resource Type**: ${resourceType}
- **Tags**: ${tags?.join(", ") || "None"}
- **Tech Stack**: ${techStack?.join(", ") || "None"}
${scrapedContent ? `- **Scraped Description/Content**: ${scrapedContent}` : ""}

Please output ONLY the markdown content matching the appropriate structure based on the resource type. Do NOT wrap it in any additional text, explanation, or markdown code blocks (e.g. \`\`\`markdown). Start directly with the first header (e.g., ### **🚀 Title**).

Formatting Guidelines by Resource Type:

1. **For Videos / Tutorials**:
   - Title: \`### **🚀 [Emoji] [Title] Mastery Guide**\`
   - 1-2 paragraph engaging summary explaining the video's value.
   - \`#### **📦 What You’ll Master**\`
     - A single introductory sentence.
     - 3-5 bullet points with bold key terms describing the core concepts/skills.
   - \`#### **🎓 Key Technical Milestones**\`
     - 3-4 bullet points detailing practical steps or milestones.
   - \`#### **🛠️ Resources & Source Code**\`
     - Fenced list of links, starting with: \`* **Full Source Code:** [Get the GitHub Repo & Code](${url})\`
   - CTA: \`**Start learning today:** [${url}](${url})\`

2. **For Blogs / Articles**:
   - Title: \`### **📝 [Emoji] [Title]**\`
   - 1-2 paragraph overview of the article's core thesis and why to read it.
   - \`#### **💡 Key Takeaways**\`
     - A single introductory sentence.
     - 3-5 bullet points with bold key terms detailing the key principles/techniques.
   - \`#### **⚙️ Core Concepts**\` or \`#### **💻 Implementation Highlights**\`
     - 3-4 bullet points explaining implementation or concepts.
   - \`#### **🔗 Related References**\`
     - List of links, including the main link.
   - CTA: \`**Read the full post:** [${url}](${url})\`

3. **For Tools / AI Tools / NPM Packages**:
   - Title: \`### **⚡ [Emoji] [Title]**\`
   - 1-2 paragraph explanation of what problem the tool solves, who it is for, and key benefits.
   - \`#### **🌟 Key Features & Capabilities**\`
     - A single introductory sentence.
     - 3-5 bullet points highlighting performance, DX, and specific capabilities.
   - \`#### **🚀 Getting Started / Quickstart**\`
     - A brief installation guide (e.g. \`npm install\`), configuration snippet, or basic usage guide in a code block.
   - \`#### **📖 Documentation & Links**\`
     - Links to repository, npm page, or documentation.
   - CTA: \`**Try it today:** [${url}](${url})\`

4. **For Repositories / Templates**:
   - Title: \`### **📂 [Emoji] [Title]**\`
   - 1-2 paragraph project description, tech stacks used, and codebase architecture overview.
   - \`#### **🛠️ Tech Stack & Features**\`
     - 3-5 bullet points covering libraries, databases, UI, and functionality.
   - \`#### **🚀 Quick Setup**\`
     - 3-4 bullet points outlining commands to clone, install, and run locally.
   - \`#### **🔗 Live Demo & Links**\`
     - Links to live demo and repository documentation.
   - CTA: \`**Explore the repository:** [${url}](${url})\`

5. **For Courses**:
   - Title: \`### **🎓 [Emoji] [Title]**\`
   - 1-2 paragraph overview of the course curriculum, target audience, and difficulty level.
   - \`#### **📚 Syllabus & Modules**\`
     - 3-5 bullet points covering modules/chapters.
   - \`#### **🛠️ Projects You'll Build**\`
     - 3-4 bullet points detailing practical hands-on work.
   - \`#### **🔗 Enrollment & Resources**\`
     - Links to slide decks, codebase, and enrollment site.
   - CTA: \`**Enroll and start learning:** [${url}](${url})\`

Always ensure the design feels modern, polished, and developer-centric. Provide a direct, clean markdown link format for all links using descriptive anchor text.
Output ONLY the markdown content.`;

  try {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });

    const generatedText = response.text;
    if (!generatedText) {
      throw new Error("No text generated from Gemini");
    }

    return generatedText.trim();
  } catch (error) {
    const originalMessage =
      error instanceof Error ? error.message : String(error);

    // Check if the error is a Google API error (which often contains JSON)
    let friendlyMessage =
      "Failed to generate description. Please try again later.";
    try {
      // Look for JSON within the message or try to parse it
      const jsonMatch = originalMessage.match(/\{.*\}/s);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const apiError = parsed.error;
        if (apiError) {
          if (
            apiError.code === 503 ||
            apiError.status === "UNAVAILABLE" ||
            String(apiError.message).includes("high demand")
          ) {
            friendlyMessage =
              "The AI model is currently experiencing high demand. Please try again in a few moments.";
          } else if (apiError.message) {
            friendlyMessage = `AI generation error: ${apiError.message}`;
          }
        }
      } else if (
        originalMessage.includes("UNAVAILABLE") ||
        originalMessage.includes("503") ||
        originalMessage.includes("high demand")
      ) {
        friendlyMessage =
          "The AI model is currently experiencing high demand. Please try again in a few moments.";
      }
    } catch {
      if (
        originalMessage.includes("UNAVAILABLE") ||
        originalMessage.includes("503") ||
        originalMessage.includes("high demand")
      ) {
        friendlyMessage =
          "The AI model is currently experiencing high demand. Please try again in a few moments.";
      }
    }
    throw new KnownUserError(friendlyMessage);
  }
}
