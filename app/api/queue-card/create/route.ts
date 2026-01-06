import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { title } = await request.json();

  let book;
  try {
    book = await prisma.books.create({
      data: {
        title: title,
        owner: "98fbe5d9-ebcd-4fd6-87b0-e29ef2042fbb", // Temporary hardcoded user ID
      },
    });
  } catch (error) {
    console.error("Error creating book:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }

  return new NextResponse(JSON.stringify(book.id), { status: 200 });
}
