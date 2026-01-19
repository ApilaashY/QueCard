import { PdfReader } from "pdfreader";
import fs from "fs/promises";

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
    s3Key?: string;
  };
  error?: string;
}

/**
 * Process a PDF file using pdfreader to extract structured content
 * @param pdfPath - Absolute path to the PDF file
 * @returns Promise with structured chunks
 */
export async function processPdf(pdfPath: string): Promise<DoclingResult> {
  try {
    // Read the PDF file
    const buffer = await fs.readFile(pdfPath);

    return new Promise((resolve) => {
      const reader = new PdfReader();
      let currentPage = 0;
      let maxPage = 0;
      const pageTexts: Record<number, string[]> = {};

      reader.parseBuffer(buffer, (err, item) => {
        if (err) {
          resolve({
            success: false,
            error: `Failed to process PDF: ${err}`,
          });
          return;
        }

        if (!item) {
          // End of parsing
          const fullText = Object.keys(pageTexts)
            .sort((a, b) => Number(a) - Number(b))
            .map((page) => pageTexts[Number(page)].join(" "))
            .join("\n\n");

          // Split text into chunks (by paragraphs/sections)
          const raw_chunks = fullText.split("\n\n");

          const chunks: DoclingChunk[] = [];
          for (let i = 0; i < raw_chunks.length; i++) {
            const chunk_content = raw_chunks[i].trim();
            if (chunk_content) {
              // Skip empty chunks
              chunks.push({
                content: chunk_content,
                type: "text",
                metadata: {
                  chunk_index: i,
                },
              });
            }
          }

          resolve({
            success: true,
            chunks,
            metadata: {
              num_pages: maxPage + 1,
              num_chunks: chunks.length,
            },
          });
          return;
        }

        if (item.page) {
          currentPage = item.page - 1;
          maxPage = Math.max(maxPage, currentPage);
          if (!pageTexts[currentPage]) {
            pageTexts[currentPage] = [];
          }
        } else if (item.text) {
          pageTexts[currentPage]?.push(item.text);
        }
      });
    });
  } catch (error) {
    return {
      success: false,
      error: `Failed to process PDF: ${(error as Error).message}`,
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
  targetChunkSize = 800,
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
