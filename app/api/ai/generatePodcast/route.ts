import { prisma } from "@/lib/prisma";
import { GoogleGenAI, Modality } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { encodeWav } from "@/lib/audio-utils";

export async function POST(request: NextRequest) {
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

  if (currentCount >= 5 && process.env.DEV !== "true") {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in an hour." },
      { status: 429 },
    );
  }

  // Get the latest podcast
  const podcasts = await prisma.podcasts.findFirst({
    where: {
      book_id: bookId,
    },
    orderBy: {
      index: "desc",
    },
  });

  // Make new podcast (To be filled in later)
  const podcast = await prisma.podcasts.create({
    data: {
      title: "Generated Podcast",
      book_id: bookId,
      processing: true,
      index: (podcasts?.index || -1) + 1,
    },
  });

  // Get all documents for generation
  const documents = await prisma.documents.findMany({
    where: {
      book_id: bookId,
    },
  });

  // Check if there are documents to generate podcast from
  if (!documents || documents.length === 0) {
    await prisma.podcasts.delete({
      where: {
        id: podcast.id,
      },
    });
    return NextResponse.json(
      { error: "No media to generate podcast from" },
      { status: 404 },
    );
  }

  // Get all document chunks
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

  // Generate podcast
  const genAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const response = await genAi.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Given the context, generate a podcast script that is engaging and informative. The podcast should be around 5 minutes long and should cover the key topics in the context. The podcast should be conversational and easy to follow.
    Make the podcast contain 2 hosts, Person 1 and Person 2. Format:
    
    [Person 1]: "What person 1 says"
    [Person 2]: "What person 2 says"
    [Person 1]: ...
    
    Context: ${context}`,
  });

  const script = response.text || "";

  if (!script) {
    await prisma.podcasts.delete({
      where: {
        id: podcast.id,
      },
    });
    return NextResponse.json(
      { error: "Failed to generate podcast script" },
      { status: 500 },
    );
  }

  // Upload the script
  await prisma.podcasts.update({
    where: {
      id: podcast.id,
    },
    data: {
      script: script,
    },
  });

  try {
    // Generate audio file
    const response = await genAi.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ role: "user", parts: [{ text: script }] }],
      config: {
        responseModalities: [Modality.AUDIO],
      },
    });

    // The audio data is returned as a base64 encoded string
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts || parts.length === 0 || !parts[0].inlineData) {
      throw new Error("No audio data returned");
    }

    const audioRawData = parts[0].inlineData.data;
    if (!audioRawData) {
      throw new Error("No audio data returned");
    }
    const mimeTypeStr = parts[0].inlineData.mimeType || "audio/L16;rate=24000";

    // Extract sample rate from mimeType (e.g., "audio/L16;codec=pcm;rate=24000")
    const sampleRateMatch = mimeTypeStr.match(/rate=(\d+)/);
    const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1]) : 24000;

    const pcmBuffer = Buffer.from(audioRawData, "base64");
    const audioBuffer = encodeWav(pcmBuffer, sampleRate);

    const { data, error } = await supabaseAdmin.storage
      .from("Podcasts")
      .upload(podcast.id + "_" + podcast.index + ".wav", audioBuffer, {
        contentType: "audio/wav", // Explicitly set to WAV
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Update podcast with audio URL
    await prisma.podcasts.update({
      where: {
        id: podcast.id,
      },
      data: {
        script: script,
        audio: data.path,
        processing: false,
      },
    });

    return NextResponse.json(
      { message: "Podcast generated successfully" },
      { status: 200 },
    );
  } catch (error) {
    // Remove podcast
    try {
      await prisma.podcasts.delete({
        where: {
          id: podcast.id,
        },
      });
    } catch (_) {}

    console.error("Error creating podcast:", error);
    return NextResponse.json(
      { error: "Failed to create podcast" },
      { status: 500 },
    );
  }
}
