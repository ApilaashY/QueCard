"use client";

import { fetchCardSet, CardSet } from "@/lib/reduxStore";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditCardSet() {
  const [flashcards, setFlashcards] = useState<CardSet | undefined>(undefined);
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
      {flashcards.cards.length === 0 ? (
        <p className="text-xl ">No flashcards found to edit</p>
      ) : (
        <>
          {flashcards.cards.map((card, index) => (
            <div
              className="w-xl cursor-pointer"
              style={{ perspective: "1000px" }}
              key={index}
            >
              <div
                className=" transition-transform duration-500"
                style={{
                  transformStyle: "preserve-3d",
                }}
              >
                {/* Front of card (Question) */}
                <div
                  className=" bg-white rounded-2xl shadow-2xl p-8 flex flex-col justify-center items-center"
                  style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                  }}
                >
                  <div className="text-sm font-semibold text-(--secondary) mb-2">
                    QUESTION
                  </div>
                  <textarea
                    className="text-2xl text-center text-gray-800 mb-6 rounded-lg border border-gray-300 p-2 w-4/5 multi-line-input"
                    value={card.question}
                  />

                  <div className="text-sm font-semibold text-(--secondary) mb-2">
                    ANSWER
                  </div>
                  <textarea
                    className="text-2xl text-center text-gray-800 mb-6 rounded-lg border border-gray-300 p-2 w-4/5 multi-line-input"
                    value={card.answer}
                  />
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
