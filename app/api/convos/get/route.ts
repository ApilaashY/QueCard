import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get("bookId");

  if (!bookId || typeof bookId !== "string") {
    return new NextResponse(
      JSON.stringify({ error: "Invalid or missing 'bookId' parameter" }),
      {
        status: 400,
      },
    );
  }

  // Check if book exists
  const book = await prisma.books.findUnique({
    where: { id: bookId },
  });
  if (!book) {
    return new NextResponse(JSON.stringify({ error: "Book not found" }), {
      status: 404,
    });
  }

  // Get all conversations for the book
  const conversations = await prisma.convo.findMany({
    where: { book_id: bookId },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      created_at: true,
    },
  });

  return new NextResponse(JSON.stringify(conversations), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
