import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import {
  processPdf,
  prepareChunksForGemini,
} from "@/lib/pdf-processer";

export async function POST(request: NextRequest) {
  // try {
  const formData = await request.formData();
  const pdfFile = formData.get("pdf") as File;

  if (!pdfFile) {
    return NextResponse.json(
      { error: "No PDF file provided" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 }
    );
  }

  // Generate hash of PDF to check if it already exists
  const bytes = await pdfFile.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const pdfHash = crypto.createHash("sha256").update(buffer).digest("hex");

  console.log("Checking if PDF already processed:", pdfHash);

  // Check if PDF already exists in database
  const existingPdf = await prisma.card_sets.findUnique({
    where: { pdf_hash: pdfHash },
  });

  if (existingPdf) {
    console.log("Found existing PDF in database");
    return NextResponse.json({
      success: true,
      fileName: pdfFile.name,
      cached: true,
      id: existingPdf.id,
    });
  }

  let createdSet;
  try {
  // Add card set to database to prevent reprocessing while we work
    createdSet = await prisma.card_sets.create({
      data: {
        pdf_hash: pdfHash,
        file_name: pdfFile.name,
        file_size: pdfFile.size,
        owner: "568f5335-711e-4a36-92f2-dc5e0c1b1a93", // Static user for now
        status: 1, // Processing
      },
    });
  } catch (_) {
    // Check if another process created it in the meantime
    const existingPdf = await prisma.card_sets.findUnique({
      where: { pdf_hash: pdfHash },
    });

    if (existingPdf) {
      console.log("Found existing PDF in database after create attempt");

      return NextResponse.json({
        success: true,
        fileName: pdfFile.name,
        cached: true,
        id: existingPdf.id,
      });
    }

    // Otherwise fail
    return NextResponse.json(
      { error: "Failed to create card set in database" },
      { status: 500 }
    );
  }

  // Initialize Gemini
  const genAI = new GoogleGenerativeAI(apiKey);
  const embedder = genAI.getGenerativeModel({ model: "text-embedding-004" });

  // Save to temp file for Docling processing
  const fs = await import("fs");
  const path = await import("path");
  const os = await import("os");
  const tempPath = path.join(os.tmpdir(), pdfFile.name);
  fs.writeFileSync(tempPath, buffer);

  console.log("Processing PDF with Docling...");

  // Process PDF with to get structured chunks
  let doclingResult;
  try {
    doclingResult = await processPdf(tempPath);

    if (!doclingResult.success || !doclingResult.chunks) {
      throw new Error(
        doclingResult.error || "Failed to process PDF with Docling"
      );
    }

    console.log(
      `Docling extracted ${doclingResult.chunks.length} structured chunks`
    );
  } catch (doclingError) {
    console.error("Docling processing failed:", doclingError);
    // Clean up temp file
    fs.unlinkSync(tempPath);
    return NextResponse.json(
      {
        error: "Failed to process PDF with Docling",
        details: (doclingError as Error).message,
      },
      { status: 500 }
    );
  }

  // Prepare chunks for better processing
  const chunks = prepareChunksForGemini(doclingResult.chunks);
  console.log(`Prepared ${chunks.length} chunks for Gemini processing`);

  // Clean up temp file
  fs.unlinkSync(tempPath);

  // Create embeddings and store in vector DB
  const embeddingPromises = chunks.map(
    async (chunk) => await embedder.embedContent(chunk)
  );
  const embeddings = await Promise.all(embeddingPromises);


  // Use only the retrieved relevant chunks as context
  const context = chunks.slice(0, 500).join("\n\n");
  console.log("Context size:", context.length, "characters");

  // 3. Pass limited, relevant context to Gemini
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction:
      "You will be given a PDF document to analyze and generate questions for. Only respond with flash card questions based on the content, then a newline character and then the answer to the question. Each question and answer separated with 2 new line characters.",
  });

  const prompt = `
Use the context to provide flash card questions. Be concise. Try not to create administrative questions like who is running the course. The first line you return should be an appropriate titles for the set of flashcards.

Context:
${context}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Store in database for future use
  try {
    await prisma.card_sets.update({
      where: { id: createdSet.id },
      data: {  file_name: pdfFile.name,
        title: text.split("\n")[0], // First line as title
        file_size: pdfFile.size,
        owner: "568f5335-711e-4a36-92f2-dc5e0c1b1a93",
        status: 2
    }});
  

    for (let i = 0; i < chunks.length; i++) {
    // Sanitize chunk to remove null bytes and other problematic characters
    const sanitizedChunk = chunks[i].replace(/\x00/g, "").trim();

    if (!sanitizedChunk) continue; // Skip empty chunks

    // Store chunks with embeddings in vector DB
    await prisma.$executeRaw`
        INSERT INTO documents (card_set_id, content, embedding)
        VALUES (${createdSet.id}, ${sanitizedChunk}, ${`[${embeddings[i].embedding.values.join(
      ","
    )}]`}::vector)
      `;
  }

    for (const [index, line] of text.split("\n").slice(1).join("\n").split("\n\n").entries()) {

      const [question, answer] = line.split("\n");
      if (question && answer) {
        await prisma.card.create({
          data: {
            card_set_id: createdSet.id,
            question: question.trim(),
            answer: answer.trim(),
            order: index/2
          },
        }).catch((cardError) => {
          console.error("Error creating card:", cardError);
        });
      }
    }
    return NextResponse.json({
    success: true,
    fileName: pdfFile.name,
    cached: false,
    id: createdSet.id,
  });
  } catch (insertError) {
    console.error("Error storing in database:", insertError);
    // Continue anyway, just won't be cached
  }

  return NextResponse.json({
    success: true,
    fileName: pdfFile.name,
    cached: false,
  });
  // } catch (error) {
  //   console.error("Error processing PDF:", error);
  //   return NextResponse.json(
  //     { error: "Failed to process PDF", details: (error as Error).message },
  //     { status: 500 }
  //   );
  // }
}
