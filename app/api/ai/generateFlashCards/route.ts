import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST(request: NextRequest) {
  console.log("started processing");
  const { bookId } = await request.json();

  if (!bookId || typeof bookId !== "string") {
    return NextResponse.json({ error: "Invalid book ID" }, { status: 400 });
  }

  // Rate Limiting
  const ip = request.headers.get("x-forwarded-for") || "anonymous";
  const rateLimitKey = `rate_limit:ai_gen:${ip}`;
  const currentCount = await redis.incr(rateLimitKey);

  if (currentCount === 1) {
    await redis.expire(rateLimitKey, 3600); // 1 hour window
  }

  if (currentCount > 5) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in an hour." },
      { status: 429 }
    );
  }

  // Make new card set
  const cardSet = await prisma.card_sets.create({
    data: {
      title: "Generated Flashcards",
      book_id: bookId,
      processing: true,
    },
  });

  const documents = await prisma.documents.findMany({
    where: {
      book_id: bookId,
    },
  });

  if (!documents) {
    return NextResponse.json(
      { error: "There are no documents for this book" },
      { status: 404 }
    );
  }

  const context = [];

  for (const document of documents) {
    const documentChunks = await prisma.document_chunks.findMany({
      where: {
        document_id: document.id,
      },
      select: {
        data: true,
      },
    });
    context.push(...documentChunks.map((chunk) => chunk.data));
  }

  const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAi.getGenerativeModel({ model: "gemini-3-flash-preview" });

  const response = await model.generateContent(
    "Please turn the following context into 10 flashcards. Make sure the questions are clear and concise and the answers are detailed. You are allowed to use Latex if needed but no other formatting is allowed. The flashcards should include important content relavent to the context. Output the flashcard by returning a long string of which it goes question, newline, answer, newline, newline, next question.Context: " +
      context
  );

  const flashcardString = response.response.text();

  try {
    const flashcards = flashcardString.split("\n\n");

    flashcards.forEach(async (flashcard, index) => {
      const [question, answer] = flashcard.split("\n");
      await prisma.cards.create({
        data: {
          question,
          answer,
          card_set_id: cardSet.id,
          order: index,
        },
      });
    });

    // Make new card set
    await prisma.card_sets.update({
      where: {
        id: cardSet.id,
      },
      data: {
        processing: false,
      },
    });

    return NextResponse.json(
      { message: "Flashcards generated successfully" },
      { status: 200 }
    );
  } catch (error) {
    // Remove card set
    await prisma.card_sets.delete({
      where: {
        id: cardSet.id,
      },
    });
    console.error("Error creating card set:", error);
    return NextResponse.json(
      { error: "Failed to create card set" },
      { status: 500 }
    );
  }
}
