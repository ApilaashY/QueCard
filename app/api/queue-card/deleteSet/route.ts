import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { id } = await request.json();

  // Check if id exists
  if (!id || typeof id !== "string") {
    return new NextResponse("ID is required or invalid", { status: 400 });
  }

  try {
    const set = await prisma.card_sets.findUniqueOrThrow({
      where: { id: id },
    });

    // Check if set is being processed
    if (set.status !== 2) {
        return new NextResponse("Card set is still being processed, cannot delete", { status: 400 });
    }
 } catch (_) {
    return new NextResponse("Card set not found", { status: 404 });
  }

  try {
    // Delete in correct order due to foreign key constraints
    await prisma.documents.deleteMany({
      where: { card_set_id: id },
    });

    await prisma.card.deleteMany({
      where: { card_set_id: id },
    });

    await prisma.card_sets.delete({
      where: { id: id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (_) {
    return new NextResponse("Can't find the card set or cards", { status: 500 });
  }
}
