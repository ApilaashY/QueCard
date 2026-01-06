import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { id } = await request.json();

  // Check if id exists
  if (!id || typeof id !== "string") {
    return new NextResponse("ID is required or invalid", { status: 400 });
  }

  try {
    const book = await prisma.books.findUniqueOrThrow({
      where: { id: id },
    });
  } catch (_) {
    return new NextResponse("Card set not found", { status: 404 });
  }

  try {
    // Delete in correct order due to foreign key constraints

    // Get all documents related to the book
    const documents = (
      await prisma.documents.findMany({
        where: { book_id: id },
        select: { id: true },
      })
    ).map((doc) => doc.id);

    documents.forEach(async (docId) => {
      await prisma.document_chunks.deleteMany({
        where: { document_id: docId },
      });
    });

    await prisma.documents.deleteMany({
      where: { book_id: id },
    });

    await prisma.chats.deleteMany({
      where: { book_id: id },
    });

    await prisma.books.delete({
      where: { id: id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (_) {
    return new NextResponse("Can't find the card set or cards", {
      status: 500,
    });
  }
}
