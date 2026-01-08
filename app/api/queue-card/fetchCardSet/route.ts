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

  // Find card set with id
  let cards;
  try {
    cards = await prisma.cards.findMany({
      where: { card_set_id: id },
      orderBy: {
        order: "asc",
      },
      select: {
        id: true,
        question: true,
        answer: true,
      },
    });
  } catch (error) {
    console.error("Error fetching cards:", error);
    return new NextResponse(JSON.stringify({ error: "Can't fetch cards" }), {
      status: 404,
    });
  }

  if (!cards) {
    console.log("No cards found");
    return new NextResponse(JSON.stringify({ error: "No cards found" }), {
      status: 404,
    });
  }

  return new NextResponse(
    JSON.stringify({
      cards,
    }),
    {
      status: 200,
    }
  );
}
