import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

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

    // Invalidate cache
    const userId = "98fbe5d9-ebcd-4fd6-87b0-e29ef2042fbb";
    await redis.del(`user_sets:${userId}`);

    return new NextResponse(JSON.stringify({ id: book.id }), { status: 200 });
  } catch (error) {
    console.error("Error creating book:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
