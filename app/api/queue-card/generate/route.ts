import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { supabase } from "@/lib/supabase";
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
    const { data: existingPdf, error: fetchError } = await supabase
      .from("pdf_flashcards")
      .select("*")
      .eq("pdf_hash", pdfHash)
      .single();

    if (existingPdf && !fetchError) {
      console.log("Found existing PDF in database");
      return NextResponse.json({
        success: true,
        response: existingPdf.flashcards,
        fileName: pdfFile.name,
        cached: true,
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
      model: "gemini-1.5-flash", // Use stable model instead
      systemInstruction:
        "You will be given a PDF document to analyze and generate questions for. Only respond with flash card questions based on the content. Each question seperated with a new line character.",
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
        text: "Analyze this PDF document and provide flash card questions. Be concise.",
      },
    ]);

    let text = "";
    for await (const chunk of result.stream) {
      text += chunk.text();
    }

    // Store in Supabase for future use
    const { error: insertError } = await supabase
      .from("pdf_flashcards")
      .insert({
        pdf_hash: pdfHash,
        file_name: pdfFile.name,
        flashcards: text,
        file_size: pdfFile.size,
      });

    if (insertError) {
      console.error("Error storing in database:", insertError);
      // Continue anyway, just won't be cached
    }

    return NextResponse.json({
      success: true,
      response: text,
      fileName: pdfFile.name,
      cached: false,
    });
  } catch (error) {
    console.error("Error processing PDF:", error);
    return NextResponse.json(
      { error: "Failed to process PDF", details: (error as Error).message },
      { status: 500 }
    );
  }
}
