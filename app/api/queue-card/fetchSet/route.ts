import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { id } = await request.json();

  if (!id || typeof id !== "string") {
    return new NextResponse(
      JSON.stringify({ error: "Invalid or missing 'id' parameter" }),
      {
        status: 400,
      }
    );
  }

  // Find book with id
  let book;
  let documents;
  let chats;
  try {
    book = await prisma.books.findUnique({
      where: { id },
    });
    documents = await prisma.documents.findMany({
      where: { book_id: id },
      select: { id: true, title: true },
    });
    chats = await prisma.chats.findMany({
      where: { book_id: id },
      orderBy: { created_at: "asc" },
      select: { user: true, ai_response: true, created_at: true },
    });
  } catch (error) {
    console.error("Error fetching book:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
      }
    );
  }

  if (!book) {
    return new NextResponse(JSON.stringify({ error: "Book not found" }), {
      status: 404,
    });
  }

  return new NextResponse(
    JSON.stringify({ ...book, documents: documents, chats: chats }),
    {
      status: 200,
    }
  );
}
