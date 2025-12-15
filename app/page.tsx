"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [fileSelected, setFileSelected] = useState(false);

  async function handleClick(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    console.log("Button clicked");

    const formData = new FormData(e.currentTarget);
    const pdfFile = formData.get("pdf") as File;

    if (!pdfFile || pdfFile.size === 0) {
      console.error("No PDF file selected");
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append("pdf", pdfFile);

    try {
      console.log("Sending request to /api/queue-card/generate");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/queue-card/generate`,
        {
          method: "POST",
          body: formDataToSend,
        }
      );

      const result = await response.json();
      console.log("Response:", result);

      // Go to the flashcard page
      router.push(`/${result.id}`);
    } catch (error) {
      console.error("Error:", error);
    }
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen">
      <form onSubmit={handleClick} className="flex flex-col gap-4">
        <input
          className={`border-2 p-1 rounded ${
            fileSelected ? "border-transparent" : "border-gray-300"
          }`}
          type="file"
          name="pdf"
          accept="application/pdf"
          required
          onChange={(e) =>
            setFileSelected(e.target.files != null && e.target.files.length > 0)
          }
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Upload PDF and Generate Flashcards
        </button>
      </form>
    </div>
  );
}
