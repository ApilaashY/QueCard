import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function chunkText(text: string, size = 600) {
  const out = [];
  for (let i = 0; i < text.length; i += size) {
    out.push(text.substring(i, i + size));
  }
  return out;
}

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
  // Initialize Gemini
  const genAI = new GoogleGenerativeAI(apiKey);
  const embedder = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const fileManager = new (
    await import("@google/generative-ai/server")
  ).GoogleAIFileManager(apiKey);

  // Save to temp file for upload
  const fs = await import("fs");
  const path = await import("path");
  const os = await import("os");
  const tempPath = path.join(os.tmpdir(), pdfFile.name);
  fs.writeFileSync(tempPath, buffer);

  // Upload PDF to Gemini to extract text
  const uploadResult = await fileManager.uploadFile(tempPath, {
    mimeType: "application/pdf",
    displayName: pdfFile.name,
  });

  // Extract text content from PDF using Gemini
  const extractionModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });
  const extractionResult = await extractionModel.generateContent([
    {
      fileData: {
        fileUri: uploadResult.file.uri,
        mimeType: uploadResult.file.mimeType,
      },
    },
    {
      text: "Extract all text content from this PDF document. Return only the text, no commentary.",
    },
  ]);

  const raw = extractionResult.response.text();
  const chunks = chunkText(raw);

  // Clean up temp file
  fs.unlinkSync(tempPath);

  const embeddingPromises = chunks.map(
    async (chunk) => await embedder.embedContent(chunk)
  );
  const embeddings = await Promise.all(embeddingPromises);

  for (let i = 0; i < chunks.length; i++) {
    // Sanitize chunk to remove null bytes and other problematic characters
    const sanitizedChunk = chunks[i].replace(/\x00/g, "").trim();

    if (!sanitizedChunk) continue; // Skip empty chunks

    // Use raw SQL for vector insertion since Prisma doesn't support vector type directly
    await prisma.$executeRaw`
        INSERT INTO documents (content, embedding)
        VALUES (${sanitizedChunk}, ${`[${embeddings[i].embedding.values.join(
      ","
    )}]`}::vector)
      `;
  }

  console.log("Ingestion completed.");

  // 2. Retrieve similar documents
  const context = chunks.join("\n\n") ?? "";

  // 3. Pass context + query to Gemini
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

  console.log("Generated flashcards text:", text);

  // Store in database for future use
  try {
    const createdSet = await prisma.card_sets.create({
      data: {
        pdf_hash: pdfHash,
        file_name: pdfFile.name,
        title: text.split("\n")[0], // First line as title
        file_size: pdfFile.size,
        owner: "568f5335-711e-4a36-92f2-dc5e0c1b1a93", // Static user for now
      },
    });

    for (const [index, line] of text.split("\n").slice(1).join("\n").split("\n\n").entries()) {
      console.log("Processing line for card:", line);
      const [question, answer] = line.split("\n");
      if (question && answer) {
        await prisma.card.create({
          data: {
            card_set_id: createdSet.id,
            question: question.trim(),
            answer: answer.trim(),
            order: index
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
