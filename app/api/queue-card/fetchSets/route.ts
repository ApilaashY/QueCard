import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  console.log("fetchSets POST handler called");
  
  // Debug: Check if DATABASE_URL exists
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    return NextResponse.json(
      { error: "Database configuration error" },
      { status: 500 }
    );
  }

  try {
    // Get the user and check if it is a valid user
    const user = await prisma.users.findUnique({
      where: { id: "568f5335-711e-4a36-92f2-dc5e0c1b1a93" },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const sets = await prisma.card_sets.findMany({
      where: { owner: user.id },
      select: {
        id: true,
        title: true,
      },
    });

    return NextResponse.json({ sets }, { status: 200 });
  } catch (error) {
    console.error("Error in POST /fetchSets:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
