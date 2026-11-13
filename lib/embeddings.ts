import { GoogleGenAI } from "@google/genai";

const genAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Generate embeddings for a single text using Google Gemini API
 * @param text - The text to embed
 * @returns Array of numbers representing the embedding
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const response = await genAi.models.embedContent({
    model: "gemini-embedding-001",
    contents: [text],
  });

  if (!response.embeddings || response.embeddings.length === 0) {
    throw new Error("Failed to generate embedding");
  }

  const embedding = response.embeddings[0];
  if (!embedding.values) {
    throw new Error("Failed to generate embedding values");
  }

  return embedding.values;
}

/**
 * Generate embeddings for multiple texts in batch
 * @param texts - Array of texts to embed
 * @returns Array of embeddings
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const response = await genAi.models.embedContent({
    model: "gemini-embedding-001",
    contents: texts,
  });

  if (!response.embeddings) {
    throw new Error("Failed to generate embeddings");
  }

  return response.embeddings.map((embedding) => {
    if (!embedding.values) {
      throw new Error("Failed to generate embedding values");
    }
    return embedding.values;
  });
}
