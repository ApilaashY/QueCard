import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { cardId, field, newValue } = await request.json();

    // Make sure the field is valid
    if (field !== "question" && field !== "answer") {
      return new Response(
        JSON.stringify({ error: "Invalid field specified" }),
        { status: 400 }
      );
    }

    // Find the card first to verify it exists
    const existingCard = await prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!existingCard) {
      return new Response(JSON.stringify({ error: "Card not found" }), {
        status: 404,
      });
    }

    // Update flashcard in database using update (not updateMany)
    await prisma.card.update({
      where: { id: cardId },
      data: { [field]: newValue },
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Error updating flashcard:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update flashcard" }),
      { status: 500 }
    );
  }
}
