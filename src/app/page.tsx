import React from 'react';
import Link from 'next/link';
import teluguPack from '../../packs/telugu/pack.json';

export default function HomePage() {
  const itemCount = teluguPack.items.length;

  return (
    <main className="min-h-screen max-w-xl mx-auto px-6 py-16 flex flex-col justify-between">
      <div className="space-y-6">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full">
            Pack 1: {teluguPack.dialect} Telugu
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight mt-3 text-zinc-900 dark:text-zinc-100">
            {teluguPack.name}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            Evidence-based language acquisition: spaced retrieval practice, comprehensible input, and speech training.
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
          <div className="flex justify-between items-center text-sm font-medium">
            <span>Available Vocabulary</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold">{itemCount} items</span>
          </div>
          <div className="flex justify-between items-center text-sm font-medium">
            <span>Scheduling Engine</span>
            <span className="text-zinc-500">FSRS v5 (90% retention)</span>
          </div>
          <div className="flex justify-between items-center text-sm font-medium">
            <span>Mode</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active Recall</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-8">
        <Link
          href="/drill"
          className="w-full block py-4 text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl shadow-md transition text-lg"
        >
          Start Practice Session
        </Link>
        <p className="text-center text-xs text-zinc-400">
          Works offline as an installable PWA.
        </p>
      </div>
    </main>
  );
}
