import React from "react";
import Link from "next/link";
import teluguPack from "../../packs/telugu/pack.json";
import chinesePack from "../../packs/chinese/pack.json";

export default function HomePage() {
  const teluguItemCount = teluguPack.items.length;
  const chineseItemCount = Array.isArray(chinesePack)
    ? chinesePack.length
    : (chinesePack as any)?.items?.length || 28;

  return (
    <main className="min-h-[100dvh] max-w-4xl mx-auto px-6 py-12 flex flex-col justify-between font-sans">
      <div className="space-y-8">
        {/* Header Section */}
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/60 text-xs font-mono text-blue-400">
            <span>Spoken Language Acquisition Engine</span>
            <span className="text-zinc-600">&bull;</span>
            <span>FSRS v5 &amp; Neuro-Acoustic Feedback</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-100 sm:text-5xl">
            Neuro-Acoustic Spoken Tutor
          </h1>
          <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
            Evidence-based language acquisition: spaced retrieval practice, 60 FPS vocal pitch contour tracking,
            synesthetic tone sandhi scaffolding, and low-latency local AI sparring.
          </p>
        </header>

        {/* Available Language Packs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Pack 1: Telugu */}
          <div className="p-6 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-xl space-y-5 flex flex-col justify-between backdrop-blur-sm">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-zinc-800 text-blue-300 rounded-md border border-zinc-700/60">
                  Pack 1: {teluguPack.dialect} Telugu
                </span>
                <span className="text-xs font-mono text-emerald-400 font-medium">Active Recall</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-100">
                  {teluguPack.name}
                </h2>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  High-frequency colloquial phrases, spoken drills, and automaticity training with FSRS v5 spaced repetition.
                </p>
              </div>

              <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80 space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center text-zinc-300">
                  <span>Available Vocabulary</span>
                  <span className="font-bold text-blue-400">{teluguItemCount} items</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Repetition Model</span>
                  <span>FSRS v5 (90% target)</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Script</span>
                  <span>Telugu + Romanization</span>
                </div>
              </div>
            </div>

            <Link
              href="/drill"
              className="w-full block py-3.5 text-center bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold rounded-xl border border-zinc-700 transition-all duration-150 hover:-translate-y-[1px] active:scale-[0.98] text-sm shadow-md"
            >
              Start Telugu Practice &rarr;
            </Link>
          </div>

          {/* Pack 2: Mandarin Chinese */}
          <div className="p-6 bg-zinc-900/90 border border-blue-900/40 rounded-2xl shadow-xl space-y-5 flex flex-col justify-between backdrop-blur-sm relative overflow-hidden">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-blue-950 text-blue-300 rounded-md border border-blue-800/80">
                    Pack 2: Mandarin Chinese
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
                    Social &amp; Daily Life
                  </span>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-medium">YIN &bull; 60 FPS</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-100">
                  Mandarin Neuro-Acoustic Tutor
                </h2>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Real-time HTML5 PitchCanvas target vs live voice matching, tone sandhi rules, and Gemma 26B conversational sparring.
                </p>
              </div>

              <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80 space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center text-zinc-300">
                  <span>High-Yield Chunks</span>
                  <span className="font-bold text-blue-400">{chineseItemCount} items</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Pitch Tracking</span>
                  <span>YIN Autocorrelation (75-450Hz)</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span>AI Sparring</span>
                  <span>Gemma 26B Streaming SSE</span>
                </div>
              </div>
            </div>

            <Link
              href="/chinese"
              className="w-full block py-3.5 text-center bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all duration-150 hover:-translate-y-[1px] active:scale-[0.98] text-sm shadow-md"
            >
              Enter Chinese Practice Room &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-12 text-center text-xs font-mono text-zinc-500">
        <p>Works offline as an installable PWA &bull; Dark Precision Tech &bull; Zero generic frameworks</p>
      </footer>
    </main>
  );
}
