import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  // Debug: Check if DATABASE_URL exists
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    return new NextResponse("Database configuration error", { status: 500 });
  }

  try {
    // Get the user and check if it is a valid user
    const user = await prisma.users.findUnique({
      where: { id: "568f5335-711e-4a36-92f2-dc5e0c1b1a93" },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const sets = await prisma.cardSets.findMany({
      where: { owner: user.id },
      select: {
        id: true,
        title: true,
      },
    });

    return NextResponse.json({ sets }, { status: 200 });
  } catch (error) {
    console.error("Error in POST /fetchSets:", error);
    return new NextResponse(
      `Internal Server Error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      { status: 500 }
    );
  }
}
