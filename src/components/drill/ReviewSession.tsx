'use client';

import React, { useState } from 'react';
import type { DrillSessionState } from '@/core/drill/session-manager';
import { answerCard } from '@/core/drill/session-manager';
import { RatingGrade } from '@/core/srs/scheduler';
import { Flashcard } from './Flashcard';

interface ReviewSessionProps {
  initialSession: DrillSessionState;
}

export function ReviewSession({ initialSession }: ReviewSessionProps) {
  const [session, setSession] = useState<DrillSessionState>(initialSession);

  const handleRate = (rating: RatingGrade) => {
    const updated = answerCard(session, rating);
    setSession(updated);
  };

  if (session.isComplete || !session.currentItem) {
    return (
      <div className="w-full max-w-md mx-auto p-8 text-center bg-white dark:bg-zinc-900 rounded-2xl shadow-md border border-zinc-200 dark:border-zinc-800">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Session Complete!
        </h2>
        <p className="text-sm text-zinc-500 mb-6">
          You reviewed {session.completedCount} cards using FSRS spaced repetition.
        </p>
        <a
          href="/"
          className="inline-block py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition"
        >
          Return Home
        </a>
      </div>
    );
  }

  const progressPercent = Math.round((session.completedCount / session.queue.length) * 100);

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Progress Bar */}
      <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
        <span>Session Progress</span>
        <span>{session.completedCount} / {session.queue.length}</span>
      </div>
      <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <Flashcard
        key={session.currentCard?.id}
        item={session.currentItem}
        onRate={handleRate}
      />
    </div>
  );
}
