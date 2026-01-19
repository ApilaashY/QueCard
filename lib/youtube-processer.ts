import { DoclingResult, DoclingChunk } from "./pdf-processer";
import { YoutubeTranscript } from "youtube-transcript";

export async function processYoutube(url: string): Promise<DoclingResult> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(url);

    if (!transcript || transcript.length === 0) {
      return {
        success: false,
        error: "Failed to fetch transcript",
      };
    }

    // Group transcript items into logical chunks
    const chunks: DoclingChunk[] = [];
    let currentChunkText = "";
    let startTime = transcript[0]?.offset || 0;

    // Target chunk size roughly similar to PDF paragraphs (e.g., 500-1000 chars)
    const TARGET_CHUNK_SIZE = 1000;

    for (const item of transcript) {
      const text = item.text.trim();

      if (!text) continue;

      if (currentChunkText.length + text.length + 1 > TARGET_CHUNK_SIZE) {
        // Push current chunk
        chunks.push({
          content: currentChunkText,
          type: "text",
          metadata: {
            source: "youtube",
            url: url,
            startTime: startTime,
            endTime: item.offset,
          },
        });

        // Start new chunk
        currentChunkText = text;
        startTime = item.offset;
      } else {
        currentChunkText += (currentChunkText ? " " : "") + text;
      }
    }

    // Add final chunk
    if (currentChunkText) {
      chunks.push({
        content: currentChunkText,
        type: "text",
        metadata: {
          source: "youtube",
          url: url,
          startTime: startTime,
          endTime:
            transcript.length > 0
              ? transcript[transcript.length - 1].offset +
                (transcript[transcript.length - 1].duration || 0)
              : 0,
        },
      });
    }

    return {
      success: true,
      chunks,
      metadata: {
        num_pages: 1,
        num_chunks: chunks.length,
      },
    };
  } catch (error) {
    console.error("Youtube processing error:", error);
    return {
      success: false,
      error: `Failed to process Youtube: ${(error as Error).message}`,
    };
  }
}
