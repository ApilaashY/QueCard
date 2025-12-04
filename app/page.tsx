"use client";

export default function Home() {
  // State for the questions

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

      // setQuestions(result.response);
      // NOTE CHANGE THIS TO RECEIVE A SET ID AND REDIRECT TO /id PAGE
    } catch (error) {
      console.error("Error:", error);
    }
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen">
      <form onSubmit={handleClick} className="flex flex-col gap-4">
        <input type="file" name="PDF" accept="application/pdf" required />
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
