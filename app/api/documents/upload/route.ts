import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { processPdf } from "@/lib/pdf-processer";
import { generateEmbedding } from "@/lib/embeddings";
import fs from "fs/promises";
import path from "path";
import os from "os";

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const bookId = formData.get("bookId") as string;
  const documentFile = formData.get("document") as File;

  if (!bookId || !documentFile) {
    return new NextResponse(
      JSON.stringify({ success: false, message: "Missing bookId or document" }),
      { status: 400 }
    );
  }

  // Check if file is a pdf file
  if (documentFile.type !== "application/pdf") {
    return new NextResponse(
      JSON.stringify({ success: false, message: "Only PDF files are allowed" }),
      { status: 400 }
    );
  }

  // Check if book exists
  const book = await prisma.books.findUnique({
    where: { id: bookId },
  });
  if (!book) {
    return new NextResponse(
      JSON.stringify({ success: false, message: "Book not found" }),
      { status: 404 }
    );
  }

  // Chunk and store the document
  let tempFilePath: string | null = null;

  try {
    // Create a temporary file to store the PDF
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `${Date.now()}-${documentFile.name}`);

    // Write the file to disk
    const arrayBuffer = await documentFile.arrayBuffer();
    await fs.writeFile(tempFilePath, Buffer.from(arrayBuffer));

    // Process the PDF to extract chunks
    const result = await processPdf(tempFilePath);

    if (!result.success || !result.chunks) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          message: result.error || "Failed to process PDF",
        }),
        { status: 500 }
      );
    }

    // Create document and store chunks in database
    const document = await prisma.documents.create({
      data: {
        book_id: bookId,
        title: documentFile.name,
        processing: true,
      },
    });

    // Generate embeddings for all chunks
    console.log(`Generating embeddings for ${result.chunks.length} chunks...`);
    const chunkTexts = result.chunks.map((chunk) =>
      // Remove null bytes and clean the text
      chunk.content.replace(/\0/g, "")
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
      `Stored ${result.chunks.length} chunks with embeddings for document ${documentFile.name}`
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
        chunksProcessed: result.chunks.length,
      }),
      {
        status: 200,
      }
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
      { status: 500 }
    );
  }
}
