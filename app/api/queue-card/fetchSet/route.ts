import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { id } = await request.json();

  // Check if id exists
  if (!id || typeof id !== "string") {
    return new NextResponse("ID is required or invalid", { status: 400 });
  }

  try {
    const set = await prisma.card_sets.findUnique({
      where: { id: id },
    });

    const cards = await prisma.card.findMany({
      where: { card_set_id: id },
    });

    if (!set) {
      return new NextResponse("Card set not found", { status: 404 });
    }

    return NextResponse.json({ ...set, cards: cards }, { status: 200 });
  } catch (_) {
    return new NextResponse("Can't find the card set or cards", { status: 500 });
  }
}
