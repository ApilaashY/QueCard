import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { DoclingResult, processPdf } from "@/lib/pdf-processer";
import { generateEmbedding } from "@/lib/embeddings";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { processYoutube } from "@/lib/youtube-processer";
import { uploadToS3 } from "@/lib/s3";
import { analyzeDocumentFromS3 } from "@/lib/textract";

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const bookId = formData.get("bookId") as string;
  const documentFile = formData.get("document") as File;
  const urlName = formData.get("url") as string;
  const docType = formData.get("type") as "pdf" | "youtube";

  // Check if the docType is valid
  if (docType !== "pdf" && docType !== "youtube") {
    return new NextResponse(
      JSON.stringify({ success: false, message: "Invalid document type" }),
      { status: 400 },
    );
  }

  // Check if correct data was sent according = docType
  if (docType == "pdf") {
    if (!bookId || !documentFile) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          message: "Missing bookId or document",
        }),
        { status: 400 },
      );
    }

    // Check if file is a pdf file
    if (documentFile.type !== "application/pdf") {
      return new NextResponse(
        JSON.stringify({
          success: false,
          message: "Only PDF files are allowed",
        }),
        { status: 400 },
      );
    }
  } else if (docType == "youtube") {
    if (!bookId || !urlName) {
      return new NextResponse(
        JSON.stringify({ success: false, message: "Missing bookId or url" }),
        { status: 400 },
      );
    }
  }

  // Check if book exists
  const book = await prisma.books.findUnique({
    where: { id: bookId },
  });
  if (!book) {
    return new NextResponse(
      JSON.stringify({ success: false, message: "Book not found" }),
      { status: 404 },
    );
  }

  // Chunk and store the document
  let tempFilePath: string | null = null;

  try {
    let result: DoclingResult;
    if (docType == "pdf") {
      if (process.env.USE_AWS_OCR === "true") {
        try {
          // Upload to S3
          const s3Key = await uploadToS3(documentFile);

          // Analyze with Textract
          result = await analyzeDocumentFromS3(s3Key);

          // Store s3Key (will be added to prisma create call below)
          // We'll modify the create call to include s3_key if available

          if (!result.success || !result.chunks) {
            throw new Error(
              result.error || "Failed to process PDF with Textract",
            );
          }

          // We can attach the s3Key to the result object or handle it separately.
          // Since DoclingResult doesn't have s3Key, let's keep it in a variable scope.
          // Hack: attach it to result.metadata to pass it down, or just use variable.
          if (!result.metadata)
            result.metadata = { num_pages: 0, num_chunks: 0 };
          result.metadata.s3Key = s3Key;
        } catch (e) {
          console.error("AWS Retrieval/Processing failed", e);
          // Fallback or Error?
          // Let's error for now as the user explicitly wanted AWS.
          return new NextResponse(
            JSON.stringify({
              success: false,
              message: "AWS Processing Failed: " + (e as Error).message,
            }),
            { status: 500 },
          );
        }
      } else {
        // Local Processing (Original)
        const tempDir = os.tmpdir();
        tempFilePath = path.join(tempDir, `${Date.now()}-${documentFile.name}`);

        // Write the file to disk
        const arrayBuffer = await documentFile.arrayBuffer();
        await fs.writeFile(tempFilePath, Buffer.from(arrayBuffer));

        // Process the PDF to extract chunks
        result = await processPdf(tempFilePath);

        if (!result.success || !result.chunks) {
          return new NextResponse(
            JSON.stringify({
              success: false,
              message: result.error || "Failed to process PDF",
            }),
            { status: 500 },
          );
        }
      }
    } else {
      console.log(urlName);
      result = await processYoutube(urlName);

      if (!result.success || !result.chunks) {
        return new NextResponse(
          JSON.stringify({
            success: false,
            message: result.error || "Video doesn't have a transcript",
          }),
          { status: 500 },
        );
      }
    }

    // Create document and store chunks in database
    const document = await prisma.documents.create({
      data: {
        book_id: bookId,
        title: docType === "pdf" ? documentFile.name : `YouTube: ${urlName}`,
        processing: true,
        s3_key: result.metadata?.s3Key || null,
      },
    });

    // Generate embeddings for all chunks
    console.log(`Generating embeddings for ${result.chunks!.length} chunks...`);
    const chunkTexts = result.chunks!.map((chunk) =>
      // Remove null bytes and clean the text
      chunk.content.replace(/\0/g, ""),
    );

    // Store chunks with embeddings in the database
    for (let i = 0; i < chunkTexts.length; i++) {
      const embedding = await generateEmbedding(chunkTexts[i]);
      await prisma.$executeRaw`
        INSERT INTO document_chunks (document_id, data, embedding)
        VALUES (
          ${document.id}::uuid,
          ${chunkTexts[i]},
          ${`[${embedding.join(",")}]`}::vector
        )
      `;
    }

    console.log(
      `Stored ${result.chunks!.length} chunks with embeddings for document ${
        docType === "pdf" ? documentFile.name : urlName
      }`,
    );

    // Clean up temp file
    if (tempFilePath) {
      await fs
        .unlink(tempFilePath)
        .catch((err) => console.error("Error deleting temp file:", err));
    }

    // Update document to not processing
    await prisma.documents.update({
      where: { id: document.id },
      data: { processing: false },
    });

    return new NextResponse(
      JSON.stringify({
        success: true,
        documentId: document.id,
        chunksProcessed: result.chunks!.length,
      }),
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error processing document:", error);

    // Clean up temp file on error
    if (tempFilePath) {
      await fs
        .unlink(tempFilePath)
        .catch((err) => console.error("Error deleting temp file:", err));
    }

    return new NextResponse(
      JSON.stringify({ success: false, message: "Failed to process document" }),
      { status: 500 },
    );
  }
}
