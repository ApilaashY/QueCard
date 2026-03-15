import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { tokenToUser } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const { id } = await request.json();
  const userId = await tokenToUser(request.headers.get("Authorization"));

  // Check if id exists
  if (!id || typeof id !== "string") {
    return new NextResponse("ID is required or invalid", { status: 400 });
  }

  // Invalidate cache
  await redis.del(`user_sets:${userId}`);

  try {
    await prisma.books.findUniqueOrThrow({
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

    // Delete all document chunks
    documents.forEach(async (docId) => {
      await prisma.document_chunks.deleteMany({
        where: { document_id: docId },
      });
    });

    // Delete all documents
    await prisma.documents.deleteMany({
      where: { book_id: id },
    });

    // Delete all chats
    await prisma.chats.deleteMany({
      where: { book_id: id },
    });

    // Delete all podcasts
    await prisma.podcasts.deleteMany({
      where: { book_id: id },
    });

    // Get card sets and delete them
    const cardSets = await prisma.card_sets.findMany({
      where: { book_id: id },
    });

    cardSets.forEach(async (cardSet) => {
      await prisma.cards.deleteMany({
        where: { card_set_id: cardSet.id },
      });
    });

    await prisma.card_sets.deleteMany({
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
