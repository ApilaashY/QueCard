import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST() {
  const userId = "98fbe5d9-ebcd-4fd6-87b0-e29ef2042fbb"; // Temporary hardcoded user ID
  const cacheKey = `user_sets:${userId}`;

  // Try to get from cache
  try {
    const cachedSets = await redis.get(cacheKey);
    if (cachedSets) {
      console.log("Serving sets from cache");
      return NextResponse.json(
        { sets: JSON.parse(cachedSets) },
        { status: 200 }
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

  try {
    // Cache the results for 10 minutes
    await redis.set(cacheKey, JSON.stringify(books), "EX", 600);
  } catch (error) {
    console.error("Error setting Redis cache:", error);
  }

  return NextResponse.json({ sets: books }, { status: 200 });
}
