import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { tokenToUser } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const { title } = await request.json();
  const userId = await tokenToUser(request.headers.get("Authorization"));

  console.log(request.headers.get("Authorization"));
  console.log("dflksfs", userId);

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let book;
  try {
    book = await prisma.books.create({
      data: {
        title: title,
        owner: userId,
      },
    });

    // Invalidate cache
    await redis.del(`user_sets:${userId}`);

    return new NextResponse(JSON.stringify({ id: book.id }), { status: 200 });
  } catch (error) {
    console.error("Error creating book:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
