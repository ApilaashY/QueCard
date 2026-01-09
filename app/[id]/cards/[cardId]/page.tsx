"use client";

import { Card, fetchCardSet } from "@/lib/reduxStore";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CardPage() {
  const { id, cardId } = useParams();
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchCards = async () => {
      const cardsData = await fetchCardSet(cardId as string);

      if (cardsData === undefined) {
        router.push(`/${id}`);
        return;
      }

      setCards(cardsData);
    };
    fetchCards();
  }, [id, cardId, router]);

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(currentIndex + 1), 150);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(currentIndex - 1), 150);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        handleFlip();
      } else if (e.code === "ArrowRight") {
        handleNext();
      } else if (e.code === "ArrowLeft") {
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, isFlipped, cards.length]);

  if (cards.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen text-white">
        <div className="animate-pulse">Loading cards...</div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen text-white p-4 font-sans">
      {/* Header & Back Button */}
      <div className="absolute top-8 left-8">
        <button
          onClick={() => router.push(`/${id}`)}
          className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
        >
          ← Back to Library
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-md mb-8">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>
            Card {currentIndex + 1} of {cards.length}
          </span>
          <span>{Math.round(((currentIndex + 1) / cards.length) * 100)}%</span>
        </div>
        <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Flashcard Container */}
      <div
        className="relative w-full max-w-2xl aspect-[1.6/1] cursor-pointer perspective-1000"
        onClick={handleFlip}
      >
        <div
          className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
            isFlipped ? "rotate-y-180" : ""
          }`}
        >
          {/* Front */}
          <div className="absolute inset-0 backface-hidden bg-[#1a1a1a] border border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-2xl">
            <span className="text-blue-500 text-xs font-bold uppercase tracking-widest mb-4">
              Question
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold leading-tight overflow-y-auto">
              {currentCard.question}
            </h2>
            <p className="mt-8 text-gray-500 text-sm">
              Click or press Space to flip
            </p>
          </div>

          {/* Back */}
          <div className="absolute inset-0 backface-hidden bg-[#1a1a1a] border border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-2xl rotate-y-180">
            <span className="text-emerald-500 text-xs font-bold uppercase tracking-widest mb-4">
              Answer
            </span>
            <div className="text-2xl md:text-3xl overflow-y-auto">
              {currentCard.answer}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-12 flex items-center gap-8">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className={`p-4 rounded-full transition-all ${
            currentIndex === 0
              ? "text-gray-600 cursor-not-allowed"
              : "bg-white/5 hover:bg-white/10 text-white cursor-pointer"
          }`}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <button
          onClick={handleFlip}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-semibold transition-all shadow-lg shadow-blue-500/20 cursor-pointer"
        >
          Flip Card
        </button>

        <button
          onClick={handleNext}
          disabled={currentIndex === cards.length - 1}
          className={`p-4 rounded-full transition-all ${
            currentIndex === cards.length - 1
              ? "text-gray-600 cursor-not-allowed"
              : "bg-white/5 hover:bg-white/10 text-white cursor-pointer"
          }`}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
