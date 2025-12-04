"use client";

import { fetchCardSet, Flashcard } from "@/lib/reduxStore";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditCardSet() {
  const [flashcards, setFlashcards] = useState<Flashcard[] | undefined>(
    undefined
  );
  const params = useParams();

  useEffect(() => {
    async function getFlashcards() {
      setFlashcards(await fetchCardSet(params.id as string));
    }

    getFlashcards();
  }, [params.id]);

  if (flashcards === undefined) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="animate-pulse text-xl text-gray-600">
          Loading flashcards...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-row justify-center items-center min-h-screen p-4 gap-4 flex-wrap">
      {flashcards.length === 0 ? (
        <p className="text-xl ">No flashcards found to edit</p>
      ) : (
        <>
          {flashcards.map((card, index) => (
            <div key={index} className="p-4 border rounded w-full max-w-lg">
              <h2 className="text-2xl font-bold mb-2">Card {index + 1}</h2>
              <div className="mb-2">
                <label className="block font-semibold mb-1">Question:</label>
                <input
                  type="text"
                  value={card.question}
                  onChange={(e) => {
                    const newSet = [...flashcards];
                    newSet[index].question = e.target.value;
                    setFlashcards(newSet);
                  }}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Answer:</label>
                <input
                  type="text"
                  value={card.answer}
                  onChange={(e) => {
                    const newSet = [...flashcards];
                    newSet[index].answer = e.target.value;
                    setFlashcards(newSet);
                  }}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
