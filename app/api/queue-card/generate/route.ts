import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const pdfFile = formData.get("pdf") as File;

    if (!pdfFile) {
      return NextResponse.json(
        { error: "No PDF file provided" },
        { status: 400 }
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

    console.log("Processing new PDF with Gemini");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const fileManager = new GoogleAIFileManager(apiKey);

    // Save to temp file for upload
    const fs = await import("fs");
    const path = await import("path");
    const os = await import("os");
    const tempPath = path.join(os.tmpdir(), pdfFile.name);
    fs.writeFileSync(tempPath, buffer);

    // Upload PDF to Gemini
    const uploadResult = await fileManager.uploadFile(tempPath, {
      mimeType: "application/pdf",
      displayName: pdfFile.name,
    });

    // Clean up temp file
    fs.unlinkSync(tempPath);

    // Generate content using the uploaded file
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction:
        "You will be given a PDF document to analyze and generate questions for. Only respond with flash card questions based on the content, then a newline character and then the answer to the question. Each question and answer separated with 2 new line characters.",
    });

    // Use streaming for faster response
    const result = await model.generateContentStream([
      {
        fileData: {
          fileUri: uploadResult.file.uri,
          mimeType: uploadResult.file.mimeType,
        },
      },
      {
        text: "Analyze this PDF document and provide flash card questions. Be concise. Try not to create administrative questions like who is running the course. The first line you return should be an appropriate titles for the set of flashcards.",
      },
    ]);

    let text = "";
    for await (const chunk of result.stream) {
      text += chunk.text();
    }

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

      for (const line of text.split("\n").slice(1).join("\n").split("\n\n")) {
        const [question, answer] = line.split("\n");
        if (question && answer) {
          await prisma.card.create({
            data: {
              card_set_id: createdSet.id,
              question: question.trim(),
              answer: answer.trim(),
            },
          });
        }
      }
    } catch (insertError) {
      console.error("Error storing in database:", insertError);
      // Continue anyway, just won't be cached
    }

    return NextResponse.json({
      success: true,
      fileName: pdfFile.name,
      cached: false,
      id: pdfHash,
    });
  } catch (error) {
    console.error("Error processing PDF:", error);
    return NextResponse.json(
      { error: "Failed to process PDF", details: (error as Error).message },
      { status: 500 }
    );
  }
}
