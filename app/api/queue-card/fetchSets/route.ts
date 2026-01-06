import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  // Grab all books from the database
  let books = [];

  try {
    books = await prisma.books.findMany({
      where: {
        owner: "568f5335-711e-4a36-92f2-dc5e0c1b1a93", // Temporary hardcoded user ID
      },
      select: {
        id: true,
        title: true,
      },
    });
  } catch (error) {
    console.error("Error fetching books:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }

  return new NextResponse(JSON.stringify({ sets: books }), { status: 200 });
}
