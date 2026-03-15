import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { tokenToUser } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  // Get user id from the request
  const userId = await tokenToUser(req.headers.get("Authorization"));

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const cacheKey = `user_sets:${userId}`;

  // Try to get from cache
  try {
    const cachedSets = await redis.get(cacheKey);
    if (cachedSets) {
      console.log("Serving sets from cache");
      return NextResponse.json(
        { sets: JSON.parse(cachedSets) },
        { status: 200 },
      );
    }
  } catch (error) {
    console.error("Redis cache error:", error);
  }

  // Grab all books from the database
  let books = [];

  try {
    books = await prisma.books.findMany({
      where: {
        owner: userId,
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

  try {
    // Cache the results for 10 minutes
    await redis.set(cacheKey, JSON.stringify(books), "EX", 600);
  } catch (error) {
    console.error("Error setting Redis cache:", error);
  }

  return NextResponse.json({ sets: books }, { status: 200 });
}
