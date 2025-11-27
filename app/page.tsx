"use client";

import { useState } from "react";

export default function Home() {
  // State for the questions
  const [questions, setQuestions] = useState<string | null>(null);

  async function handleClick(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    console.log("Button clicked");

    const formData = new FormData(e.currentTarget);
    const pdfFile = formData.get("PDF") as File;

    if (!pdfFile || pdfFile.size === 0) {
      console.error("No PDF file selected");
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append("pdf", pdfFile);

    try {
      console.log("Sending request to /api/queue-card/generate");
      const response = await fetch(
        "http://localhost:3000/api/queue-card/generate",
        {
          method: "POST",
          body: formDataToSend,
        }
      );

      const result = await response.json();
      console.log("Response:", result);

      setQuestions(result.response);
    } catch (error) {
      console.error("Error:", error);
    }
  }

  return (
    <div>
      <form onSubmit={handleClick}>
        <input type="file" name="PDF" accept="application/pdf" />
        <button type="submit">Generate Queue Card</button>
      </form>
      {questions && (
        <div>
          <h2>Generated Questions:</h2>
          <pre>{questions}</pre>
        </div>
      )}
    </div>
  );
}
