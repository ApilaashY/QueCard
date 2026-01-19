import {
  TextractClient,
  AnalyzeDocumentCommand,
  FeatureType,
} from "@aws-sdk/client-textract";
import { DoclingResult, DoclingChunk } from "./pdf-processer";

const client = new TextractClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function analyzeDocumentBytes(
  buffer: Buffer
): Promise<DoclingResult> {
  try {
    const command = new AnalyzeDocumentCommand({
      Document: {
        Bytes: buffer,
      },
      FeatureTypes: [FeatureType.LAYOUT], // extracts layout info like paragraphs
    });

    const response = await client.send(command);

    if (!response.Blocks) {
      return {
        success: false,
        error: "Textract returned no blocks",
      };
    }

    const chunks: DoclingChunk[] = [];
    let currentChunkText = "";

    // Sort blocks by geometry to ensure reading order (Textract usually returns them in order, but good to be safe if we were doing complex layout analysis)
    // For simplicity with LAYOUT feature, we can look for LINE or BLOCK elements.
    // The LAYOUT feature gives us Blocks of type 'LINE' which are lines of text.

    // A simple strategy is to iterate through blocks and concatenate lines.
    // However, 'LAYOUT' feature also gives 'LAYOUT_TEXT' blocks which represent paragraphs.

    const layoutBlocks = response.Blocks.filter(
      (block) => block.BlockType === "LINE"
    );

    // Group lines into chunks roughly
    for (const block of layoutBlocks) {
      if (block.Text) {
        const text = block.Text.trim();
        if (currentChunkText.length + text.length > 800) {
          chunks.push({
            content: currentChunkText,
            type: "text",
            metadata: {
              source: "textract",
            },
          });
          currentChunkText = text;
        } else {
          currentChunkText += (currentChunkText ? "\n" : "") + text;
        }
      }
    }

    if (currentChunkText) {
      chunks.push({
        content: currentChunkText,
        type: "text",
        metadata: {
          source: "textract",
        },
      });
    }

    return {
      success: true,
      chunks,
      metadata: {
        num_pages: response.DocumentMetadata?.Pages || 1,
        num_chunks: chunks.length,
      },
    };
  } catch (error) {
    console.error("Textract error:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

export async function analyzeDocumentFromS3(
  s3Key: string
): Promise<DoclingResult> {
  try {
    const command = new AnalyzeDocumentCommand({
      Document: {
        S3Object: {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Name: s3Key,
        },
      },
      FeatureTypes: [FeatureType.LAYOUT],
    });

    const response = await client.send(command);

    if (!response.Blocks) {
      return {
        success: false,
        error: "Textract returned no blocks",
      };
    }

    const chunks: DoclingChunk[] = [];
    let currentChunkText = "";

    // Using simple line concatenation as before
    const layoutBlocks = response.Blocks.filter(
      (block) => block.BlockType === "LINE"
    );

    for (const block of layoutBlocks) {
      if (block.Text) {
        const text = block.Text.trim();
        if (currentChunkText.length + text.length > 800) {
          chunks.push({
            content: currentChunkText,
            type: "text",
            metadata: {
              source: "textract",
            },
          });
          currentChunkText = text;
        } else {
          currentChunkText += (currentChunkText ? "\n" : "") + text;
        }
      }
    }

    if (currentChunkText) {
      chunks.push({
        content: currentChunkText,
        type: "text",
        metadata: {
          source: "textract",
        },
      });
    }

    return {
      success: true,
      chunks,
      metadata: {
        num_pages: response.DocumentMetadata?.Pages || 1,
        num_chunks: chunks.length,
      },
    };
  } catch (error) {
    console.error("Textract error:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}
