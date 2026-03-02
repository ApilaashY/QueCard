import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return new NextResponse("Missing podcast ID", { status: 400 });
  }

  console.log(id);

  // Get podcast from database
  const podcast = await prisma.podcasts.findUnique({
    where: { id },
  });

  if (!podcast || !podcast.audio) {
    return new NextResponse("Podcast or audio not found", { status: 404 });
  }

  // Download from Supabase
  const { data, error } = await supabaseAdmin.storage
    .from("Podcasts")
    .download(podcast.audio);

  if (error || !data) {
    console.error("Error downloading audio from Supabase:", error);
    return new NextResponse("Error fetching audio file", { status: 500 });
  }

  // Convert Blob to ArrayBuffer
  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Return the audio stream
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "audio/wav",
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
