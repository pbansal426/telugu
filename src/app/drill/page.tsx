import React from 'react';
import teluguPack from '../../../packs/telugu/pack.json';
import { createSRSCard } from '@/core/srs/scheduler';
import { createDrillSession } from '@/core/drill/session-manager';
import { ReviewSession } from '@/components/drill/ReviewSession';
import type { VocabularyItem } from '@/core/content/types';

export default function DrillPage() {
  const items = teluguPack.items as VocabularyItem[];
  const itemsMap: Record<string, VocabularyItem> = {};
  const cards = items.map((item, idx) => {
    itemsMap[item.id] = item;
    return createSRSCard(`card-${idx}`, item.id, 'telugu-starter');
  });

  const session = createDrillSession(cards, itemsMap);

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-4 flex flex-col justify-center">
      <ReviewSession initialSession={session} />
    </main>
  );
}
