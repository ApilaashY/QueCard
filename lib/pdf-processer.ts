import { PDFParse } from "pdf-parse";
import fs from "fs/promises";
import path from "path";

// Configure worker for Node.js environment
if (typeof window === 'undefined') {
  const workerPath = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs');
  PDFParse.setWorker(workerPath);
}

export interface DoclingChunk {
  content: string;
  type: string;
  metadata: {
    page?: number;
    bbox?: number[];
    [key: string]: unknown;
  };
}

export interface DoclingResult {
  success: boolean;
  chunks?: DoclingChunk[];
  metadata?: {
    num_pages: number;
    num_chunks: number;
  };
  error?: string;
}

/**
 * Process a PDF file using pdf-parse to extract structured content
 * @param pdfPath - Absolute path to the PDF file
 * @returns Promise with structured chunks
 */
export async function processPdf(
  pdfPath: string
): Promise<DoclingResult> {
  try {
    // Read the PDF file
    const dataBuffer = await fs.readFile(pdfPath);
    
    // Parse the PDF
    const parser = new PDFParse({ data: dataBuffer });
    const data = await parser.getText();
    
    // Split text into chunks (by paragraphs/sections)
    const raw_chunks = data.text.split('\n\n');
    
    const chunks: DoclingChunk[] = [];
    for (let i = 0; i < raw_chunks.length; i++) {
      const chunk_content = raw_chunks[i].trim();
      if (chunk_content) {  // Skip empty chunks
        chunks.push({
          content: chunk_content,
          type: "text",
          metadata: {
            chunk_index: i
          }
        });
      }
    }
    
    return {
      success: true,
      chunks,
      metadata: {
        num_pages: data.pages.length,
        num_chunks: chunks.length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to process PDF: ${(error as Error).message}`
    };
  }
}

/**
 * Prepare chunks for Gemini processing
 * Combines smaller chunks and filters out very short ones
 */
export function prepareChunksForGemini(
  chunks: DoclingChunk[],
  minChunkSize = 50,
  targetChunkSize = 800
): string[] {
  const processedChunks: string[] = [];
  let currentChunk = "";

  for (const chunk of chunks) {
    const content = chunk.content.trim();

    // Skip very short chunks (likely headers or page numbers)
    if (content.length < minChunkSize) {
      continue;
    }

    // Add metadata context if available
    let enrichedContent = content;
    if (chunk.type && chunk.type !== "text") {
      enrichedContent = `[${chunk.type.toUpperCase()}]\n${content}`;
    }

    // Combine chunks until we reach target size
    if (currentChunk.length + enrichedContent.length < targetChunkSize) {
      currentChunk += (currentChunk ? "\n\n" : "") + enrichedContent;
    } else {
      if (currentChunk) {
        processedChunks.push(currentChunk);
      }
      currentChunk = enrichedContent;
    }
  }

  // Add the last chunk
  if (currentChunk) {
    processedChunks.push(currentChunk);
  }

  return processedChunks;
}
