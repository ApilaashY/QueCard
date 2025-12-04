"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchCardSet, Flashcard } from "@/lib/reduxStore";

export default function CardSet() {
  const params = useParams();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCardSet() {
      setFlashcards(await fetchCardSet(params.id as string));

      setLoading(false);
    }

    loadCardSet();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="animate-pulse text-xl text-gray-600">
          Loading flashcards...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Your Flashcard Set</h1>
          <p>{flashcards.length} cards ready to study</p>
        </div>

        {/* Options Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Play Game Option */}
          <Link
            href={`/game/${params.id}`}
            className="group bg-(--secondary) rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 flex flex-col items-center text-center hover:scale-105 cursor-pointer"
          >
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-600 transition-colors">
              <svg
                className="w-8 h-8 text-indigo-600 group-hover:text-white transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Play Game</h3>
            <p className=" text-sm">
              Study your flashcards and test your knowledge
            </p>
          </Link>

          {/* Edit Cards Option */}
          <Link
            href={`/edit/${params.id}`}
            className="group bg-(--secondary) rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 flex flex-col items-center text-center hover:scale-105 cursor-pointer"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-600 transition-colors">
              <svg
                className="w-8 h-8 text-green-600 group-hover:text-white transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Edit Cards</h3>
            <p className=" text-sm">Manually edit questions and answers</p>
          </Link>

          {/* Talk to AI Option */}
          <Link
            href={`/ai/${params.id}`}
            className="group bg-(--secondary) rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 flex flex-col items-center text-center hover:scale-105 cursor-pointer"
          >
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-purple-600 transition-colors">
              <svg
                className="w-8 h-8 text-purple-600 group-hover:text-white transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Talk to AI</h3>
            <p className=" text-sm">Let AI help improve your flashcards</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
