import { describe, it, expect } from 'vitest';
import { createDrillSession, answerCard } from '@/core/drill/session-manager';
import { createSRSCard, RatingGrade } from '@/core/srs/scheduler';
import type { VocabularyItem } from '@/core/content/types';

describe('Drill Session Manager', () => {
  const mockItems: Record<string, VocabularyItem> = {
    'item-1': { id: 'item-1', te: 'సరే', roman: 'Sare', en: 'Okay', category: 'conversation' },
    'item-2': { id: 'item-2', te: 'నీళ్లు', roman: 'Neellu', en: 'Water', category: 'food' },
  };

  it('initializes session with queue of cards', () => {
    const cards = [
      createSRSCard('c-1', 'item-1', 'telugu'),
      createSRSCard('c-2', 'item-2', 'telugu'),
    ];
    const session = createDrillSession(cards, mockItems);

    expect(session.queue.length).toBe(2);
    expect(session.currentIndex).toBe(0);
    expect(session.currentCard?.id).toBe('c-1');
    expect(session.currentItem?.te).toBe('సరే');
    expect(session.isComplete).toBe(false);
  });

  it('advances to next card on rating', () => {
    const cards = [
      createSRSCard('c-1', 'item-1', 'telugu'),
      createSRSCard('c-2', 'item-2', 'telugu'),
    ];
    let session = createDrillSession(cards, mockItems);
    session = answerCard(session, RatingGrade.Good);

    expect(session.currentIndex).toBe(1);
    expect(session.currentCard?.id).toBe('c-2');
    expect(session.completedCount).toBe(1);

    session = answerCard(session, RatingGrade.Easy);
    expect(session.isComplete).toBe(true);
  });
});
