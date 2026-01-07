import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { documentId } = await request.json();

  // Validate documentId
  if (!documentId || typeof documentId !== "string") {
    return new NextResponse(
      JSON.stringify({ error: "Invalid or missing 'documentId' parameter" }),
      {
        status: 400,
      }
    );
  }

  try {
    // Find document and check if it exists
    const document = await prisma.documents.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      console.log("DOCUMENT NOT FOUND");
      return new NextResponse(JSON.stringify({ error: "Document not found" }), {
        status: 404,
      });
    }

    // Delete document chunks and embeddings
    await prisma.document_chunks.deleteMany({
      where: { document_id: documentId },
    });

    // Delete document
    await prisma.documents.delete({
      where: { id: documentId },
    });

    return new NextResponse(JSON.stringify({ document: document }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error removing document:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
      }
    );
  }
}
