"use client";

import { CardSet, fetchCardSet } from "@/lib/reduxStore";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Flashcard {
  question: string;
  answer: string;
}

export default function FlashcardGame() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const params = useParams();

  useEffect(() => {
    async function getFlashcards() {
      setFlashcards(
        ((await fetchCardSet(params.id as string)) ?? { cards: [] }).cards
      );
    }

    getFlashcards();
  }, [params.id]);

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  if (flashcards.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <p className="text-xl ">No flashcards found</p>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div className="flex flex-col justify-center items-center min-h-screen  p-4">
      {/* Progress indicator */}
      <div className="mb-8 text-sm font-medium ">
        Card {currentIndex + 1} of {flashcards.length}
      </div>

      {/* Flashcard */}
      <div
        className="relative w-full max-w-2xl h-96 cursor-pointer"
        onClick={handleFlip}
        style={{ perspective: "1000px" }}
      >
        <div
          className="relative w-full h-full transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front of card (Question) */}
          <div
            className="absolute w-full h-full bg-white rounded-2xl shadow-2xl p-8 flex flex-col justify-center items-center"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <div className="text-sm font-semibold text-(--secondary) mb-4">
              QUESTION
            </div>
            <p className="text-2xl text-center text-gray-800">
              {currentCard.question}
            </p>
            <div className="mt-8 text-sm text-gray-400">
              Click to reveal answer
            </div>
          </div>

          {/* Back of card (Answer) */}
          <div
            className="absolute w-full h-full bg-(--primary) rounded-2xl shadow-2xl p-8 flex flex-col justify-center items-center"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="text-sm font-semibold text-(--secondary) mb-4">
              ANSWER
            </div>
            <p className="text-2xl text-center text-white">
              {currentCard.answer}
            </p>
            <div className="mt-8 text-sm text-indigo-200">
              Click to see question
            </div>
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-4 mt-8">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="px-6 py-3 bg-white text-gray-700 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium cursor-pointer"
        >
          ← Previous
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
          className="px-6 py-3 bg-(--primary) text-white rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium cursor-pointer"
        >
          Next →
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-2xl mt-8 bg-white/50 rounded-full h-2 overflow-hidden">
        <div
          className="bg-(--primary) h-full transition-all duration-300"
          style={{
            width: `${((currentIndex + 1) / flashcards.length) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
