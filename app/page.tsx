"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  async function handleClick() {
    let bookName = prompt("Enter a name for the book:");
    while (!bookName || bookName?.trim() === "") {
      if (bookName === null) {
        return;
      }

      bookName = prompt(
        "Book name cannot be empty. Please enter a name for the book:"
      );
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/queue-card/create`,
        {
          method: "POST",
          body: JSON.stringify({ title: bookName }),
        }
      );

      const result = await response.json();

      // Go to the flashcard page
      router.push(`/${result.id}`);
    } catch (error) {
      console.error("Error:", error);
    }
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen">
      <button
        type="submit"
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
        onClick={handleClick}
      >
        Create New Book
      </button>
    </div>
  );
}
