import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { id } = await req.json();

  // Check if card set ID is provided
  if (!id) {
    return NextResponse.json({ error: "Missing card set ID" }, { status: 400 });
  }

  try {
    // Delete all cards in the card set
    await prisma.cards.deleteMany({
      where: {
        card_set_id: id,
      },
    });

    // Delete the card set
    await prisma.card_sets.delete({
      where: {
        id,
      },
    });

    return NextResponse.json(
      { message: "Card set removed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error removing card set:", error);
    return NextResponse.json(
      { error: "Failed to remove card set" },
      { status: 500 }
    );
  }
}
