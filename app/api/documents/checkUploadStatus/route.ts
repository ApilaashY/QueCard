import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { documentId, bookId } = await request.json();

  if (documentId && typeof documentId === "string") {
    // Find document with id
    let document;
    try {
      document = await prisma.documents.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          processing: true,
        },
      });
    } catch (error) {
      console.error("Error fetching document:", error);
      return new NextResponse(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
        }
      );
    }

    if (!document) {
      console.log("DOCUMENT NOT FOUND");
      return new NextResponse(JSON.stringify({ error: "Document not found" }), {
        status: 404,
      });
    }

    return new NextResponse(JSON.stringify({ document: document }), {
      status: 200,
    });
  } else if (bookId && typeof bookId === "string") {
    // Find documents with book id
    const documents =
      (await prisma.documents.findMany({
        where: { book_id: bookId },
        select: {
          id: true,
          book_id: true,
        },
      })) ?? [];

    return new NextResponse(JSON.stringify({ documents: documents }), {
      status: 200,
    });
  } else {
    return new NextResponse(
      JSON.stringify({ error: "Invalid or missing 'documentId' parameter" }),
      {
        status: 400,
      }
    );
  }
}
