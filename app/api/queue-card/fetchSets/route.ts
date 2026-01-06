import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  // Grab all books from the database
  let books = [];

  try {
    books = await prisma.books.findMany({
      where: {
        owner: "98fbe5d9-ebcd-4fd6-87b0-e29ef2042fbb", // Temporary hardcoded user ID
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
