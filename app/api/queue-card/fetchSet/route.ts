import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { id } = await request.json();

  // Check if id exists
  if (!id) {
    return new NextResponse("ID is required", { status: 400 });
  }

  try {
    const set = await prisma.card_sets.findUnique({
      where: { id: id },
    });

    const cards = await prisma.card.findMany({
      where: { card_set_id: id },
    });

    return NextResponse.json({ ...set, cards: cards }, { status: 200 });
  } catch (error) {
    console.error("Error in POST /fetchSets:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
