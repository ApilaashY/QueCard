import { pipeline, FeatureExtractionPipeline } from "@xenova/transformers";

// Singleton pattern to cache the embedding model
let embeddingPipeline: FeatureExtractionPipeline | null = null;

/**
 * Get or initialize the embedding pipeline
 */
async function getEmbeddingPipeline(): Promise<FeatureExtractionPipeline> {
  if (!embeddingPipeline) {
    embeddingPipeline = (await pipeline(
      "feature-extraction",
      "Xenova/bge-small-en-v1.5"
    )) as FeatureExtractionPipeline;
  }
  return embeddingPipeline;
}

/**
 * Generate embeddings for a single text
 * @param text - The text to embed
 * @returns Array of numbers representing the embedding (384 dimensions)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const pipe = await getEmbeddingPipeline();
  const output = await pipe(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

/**
 * Generate embeddings for multiple texts in batch
 * @param texts - Array of texts to embed
 * @returns Array of embeddings
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (const text of texts) {
    const embedding = await generateEmbedding(text);
    embeddings.push(embedding);
  }

  return embeddings;
}
