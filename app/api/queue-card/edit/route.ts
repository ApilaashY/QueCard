import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  const { bookId, setId, prompt } = await req.json();

  if (!bookId || !setId || !prompt) {
    return NextResponse.json(
      { error: "Missing book ID or prompt" },
      { status: 400 }
    );
  }

  try {
    // Get documents for book
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

    // Get existing flash cards
    const flashCards = await prisma.cards.findMany({
      where: {
        card_set_id: setId,
      },
    });

    const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAi.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const response = await model.generateContent(
      "Please update the following flashcards based on the request and the context related to the flashcards. Make sure that when updating the flashcards, do not change the number of flash cards. Make sure the questions are clear and concise and the answers are detailed. The flashcards should include important content relavent to the context. Output the flashcard by returning a long string of which it goes question, newline, answer, newline, newline, next question. Previous Flash Cards:" +
        flashCards +
        "\n\nPrompt: " +
        prompt +
        "\n\nContext: " +
        context
    );

    const flashcardString = response.response.text();

    try {
      const flashcards = flashcardString.split("\n\n");

      // Delete existing flash cards
      await prisma.cards.deleteMany({
        where: {
          card_set_id: setId,
        },
      });

      flashcards.forEach(async (flashcard, index) => {
        const [question, answer] = flashcard.split("\n");
        await prisma.cards.create({
          data: {
            question,
            answer,
            card_set_id: setId,
            order: index,
          },
        });
      });

      return NextResponse.json(
        { message: "Flashcards generated successfully" },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error editing card set:", error);
      return NextResponse.json(
        { error: "Failed to edit card set" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error editing card set:", error);
    return NextResponse.json(
      { error: "Failed to edit card set" },
      { status: 500 }
    );
  }
}
