"use client";

import {
  fetchCardSet,
  CardSet,
  updateFlashcard,
  FlashCard,
} from "@/lib/reduxStore";
import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export default function EditCardSet() {
  const [flashcards, setFlashcards] = useState<FlashCard[] | undefined>(
    undefined
  );
  const params = useParams();
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    async function getFlashcards() {
      const set = await fetchCardSet(params.id as string);

      if (!set) {
        console.error("Failed to load card set");
        return;
      }

      setFlashcards(set.cards);
    }

    getFlashcards();
  }, [params.id]);

  const handleUpdate = (
    cardId: string,
    field: "question" | "answer",
    value: string
  ) => {
    // Update local state immediately for responsive UI
    setFlashcards((prev) => {
      if (!prev) return prev;
      return prev.map((card) =>
        card.id === cardId ? { ...card, [field]: value } : card
      );
    });

    // Clear existing timer for this card+field
    const timerKey = `${cardId}-${field}`;
    if (debounceTimers.current[timerKey]) {
      clearTimeout(debounceTimers.current[timerKey]);
    }

    // Debounce database update
    debounceTimers.current[timerKey] = setTimeout(() => {
      updateFlashcard(params.id as string, cardId, field, value);
      delete debounceTimers.current[timerKey];
    }, 500); // Wait 500ms after user stops typing
  };

  useEffect(() => {
    // Cleanup timers on unmount
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

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
    <div className="flex flex-row justify-center items-center max-h-screen p-4 gap-4 flex-wrap overflow-auto">
      {flashcards.length === 0 ? (
        <p className="text-xl ">No flashcards found to edit</p>
      ) : (
        <>
          {flashcards.map((card, index) => (
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
                    onChange={(e) =>
                      handleUpdate(card.id, "question", e.target.value)
                    }
                    value={card.question}
                  />

                  <div className="text-sm font-semibold text-(--secondary) mb-2">
                    ANSWER
                  </div>
                  <textarea
                    className="text-2xl text-center text-gray-800 mb-6 rounded-lg border border-gray-300 p-2 w-4/5 multi-line-input"
                    onChange={(e) =>
                      handleUpdate(card.id, "answer", e.target.value)
                    }
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
