import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { title } = await request.json();

  let book;
  try {
    book = await prisma.books.create({
      data: {
        title: title,
        owner: "568f5335-711e-4a36-92f2-dc5e0c1b1a93", // Temporary hardcoded user ID
      },
    });
  } catch (error) {
    console.error("Error creating book:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }

  return new NextResponse(JSON.stringify(book.id), { status: 200 });
}
