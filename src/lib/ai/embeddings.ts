/**
 * AI Embeddings Client
 *
 * Configured to use Vercel AI Gateway for embeddings.
 * Uses text-embedding-3-large (3072 dimensions) for high-quality vectors.
 */

import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { embed as aiEmbed, embedMany as aiEmbedMany } from "ai";

// Lazy initialization to ensure env vars are loaded
let _openaiGateway: OpenAIProvider | null = null;
let _embeddingModel: ReturnType<OpenAIProvider["embedding"]> | null = null;

function getOpenAIGateway(): OpenAIProvider {
  if (!_openaiGateway) {
    const apiKey = process.env.VERCEL_AI_GATEWAY_API_KEY;
    if (!apiKey) {
      throw new Error(
        "VERCEL_AI_GATEWAY_API_KEY is not set. Please add it to .env.local and restart the server."
      );
    }
    _openaiGateway = createOpenAI({
      apiKey,
      baseURL: "https://ai-gateway.vercel.sh/v1",
    });
  }
  return _openaiGateway;
}

function getEmbeddingModel() {
  if (!_embeddingModel) {
    _embeddingModel = getOpenAIGateway().embedding("text-embedding-3-large");
  }
  return _embeddingModel;
}

// Export getter for embedding model (for external use if needed)
export const embeddingModel = {
  get instance() {
    return getEmbeddingModel();
  },
};

/**
 * Generate embedding for a single text
 * Uses Vercel AI Gateway with text-embedding-3-large (3072 dimensions)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await aiEmbed({
    model: getEmbeddingModel(),
    value: text,
  });
  return embedding;
}

/**
 * Generate embeddings for multiple texts
 * Uses Vercel AI Gateway with text-embedding-3-large (3072 dimensions)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const { embeddings } = await aiEmbedMany({
    model: getEmbeddingModel(),
    values: texts,
  });
  return embeddings;
}
