import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { generateEmbedding } from "@/lib/embeddings";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  const { bookId, message } = await req.json();

  if (
    !bookId ||
    typeof bookId !== "string" ||
    !message ||
    typeof message !== "string"
  ) {
    return new NextResponse(
      JSON.stringify({
        error: "Invalid or missing 'bookId' or 'message' parameter",
      }),
      {
        status: 400,
      }
    );
  }

  // Check if book exists
  const book = await prisma.books.findUnique({
    where: { id: bookId },
  });
  if (!book) {
    return new NextResponse(JSON.stringify({ error: "Book not found" }), {
      status: 404,
    });
  }

  // Get document chunks for the book
  const documents = await prisma.documents.findMany({
    where: { book_id: bookId },
  });

  if (documents.length === 0) {
    return new NextResponse(
      JSON.stringify({ error: "No documents found for this book" }),
      { status: 404 }
    );
  }

  // Generate embedding for the user's message
  const messageEmbedding = await generateEmbedding(message);

  // Search for relevant chunks using cosine similarity
  // Get top 5 most relevant chunks across all documents in this book
  const documentIds = documents.map((doc) => doc.id);

  const relevantChunks = await prisma.$queryRaw<
    Array<{ id: bigint; data: string; similarity: number }>
  >`
    SELECT 
      id,
      data,
      1 - (embedding <=> ${`[${messageEmbedding.join(
        ","
      )}]`}::vector) as similarity
    FROM document_chunks
    WHERE document_id = ANY(${documentIds}::uuid[])
    ORDER BY embedding <=> ${`[${messageEmbedding.join(",")}]`}::vector
    LIMIT 5
  `;

  const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAi.getGenerativeModel({ model: "gemini-3-flash-preview" });

  // Create the prompt with relevant chunks
  let prompt = `You are an AI assistant. Use the following document excerpts to answer the question at the end. If the excerpts do not contain the answer, respond with "I don't know."\n\n`;
  relevantChunks.forEach((chunk, index) => {
    prompt += `Excerpt ${index + 1}:\n${chunk.data}\n\n`;
  });
  prompt += `Question: ${message}\nAnswer:`;

  // Get AI response
  let aiResponse = "";
  try {
    const response = await model.generateContent(prompt);
    aiResponse = response.response.text();
  } catch (error) {
    console.error("Error generating AI response:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to generate AI response" }),
      { status: 500 }
    );
  }

  // Store the chat in the database
  await prisma.chats.create({
    data: {
      book_id: bookId,
      user: message,
      ai_response: aiResponse,
    },
  });

  return new NextResponse(JSON.stringify({ response: aiResponse }), {
    status: 200,
  });
}
