'use client';

import React, { useState } from 'react';
import type { VocabularyItem } from '@/core/content/types';
import { RatingGrade } from '@/core/srs/scheduler';

interface FlashcardProps {
  item: VocabularyItem;
  onRate: (rating: RatingGrade) => void;
}

export function Flashcard({ item, onRate }: FlashcardProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [showRomanHint, setShowRomanHint] = useState(false);

  const handleReveal = () => setIsRevealed(true);

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-md border border-zinc-200 dark:border-zinc-800 transition-all">
      {/* Category Header */}
      <div className="text-xs font-semibold tracking-wider uppercase text-zinc-400 mb-4">
        {item.category}
      </div>

      {/* Front: Prompt in English */}
      <div className="min-h-[120px] flex flex-col justify-center items-center text-center">
        <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 mb-2">
          {item.en}
        </h2>

        {!isRevealed && (
          <div className="mt-2">
            {!showRomanHint ? (
              <button
                type="button"
                onClick={() => setShowRomanHint(true)}
                className="text-xs text-blue-500 hover:underline"
              >
                Need a hint? (Show Romanization)
              </button>
            ) : (
              <p className="text-sm italic text-zinc-500">{item.roman}</p>
            )}
          </div>
        )}
      </div>

      {/* Divider */}
      <hr className="my-6 border-zinc-100 dark:border-zinc-800" />

      {/* Back: Revealed Telugu Script */}
      {!isRevealed ? (
        <button
          type="button"
          onClick={handleReveal}
          className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-xl font-medium transition"
        >
          Show Answer
        </button>
      ) : (
        <div className="space-y-6">
          <div className="text-center">
            {/* Telugu Script */}
            <div className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 mb-2 tracking-wide font-telugu">
              {item.te}
            </div>
            <div className="text-lg text-zinc-600 dark:text-zinc-400 font-medium">
              {item.roman}
            </div>
            {item.telanganaNote && (
              <div className="mt-3 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-200 text-left">
                💡 <span className="font-semibold">Telangana note:</span> {item.telanganaNote}
              </div>
            )}
          </div>

          {/* FSRS Rating Buttons */}
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => onRate(RatingGrade.Again)}
              className="py-2.5 px-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950/60 dark:text-red-300 rounded-xl text-xs font-semibold transition"
            >
              Again
            </button>
            <button
              type="button"
              onClick={() => onRate(RatingGrade.Hard)}
              className="py-2.5 px-2 bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 rounded-xl text-xs font-semibold transition"
            >
              Hard
            </button>
            <button
              type="button"
              onClick={() => onRate(RatingGrade.Good)}
              className="py-2.5 px-2 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded-xl text-xs font-semibold transition"
            >
              Good
            </button>
            <button
              type="button"
              onClick={() => onRate(RatingGrade.Easy)}
              className="py-2.5 px-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-xl text-xs font-semibold transition"
            >
              Easy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
