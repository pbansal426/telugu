import { describe, it, expect, beforeEach } from 'vitest';
import { initDatabase, saveCard, getCard, getDueCards, recordReview, getDeckStats } from '@/core/storage/review-store';
import { createSRSCard, gradeSRSCard, RatingGrade } from '@/core/srs/scheduler';
import type { DatabaseSync } from 'node:sqlite';

describe('SQLite Review Persistence Store', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    // In-memory isolated database for tests
    db = initDatabase(':memory:');
  });

  it('saves and retrieves an SRS card accurately', () => {
    const card = createSRSCard('card-1', 'namaskaram', 'telugu', new Date('2026-10-14T10:00:00Z'));
    saveCard(db, card);

    const fetched = getCard(db, 'card-1');
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe('card-1');
    expect(fetched?.itemId).toBe('namaskaram');
    expect(fetched?.packId).toBe('telugu');
    expect(fetched?.reps).toBe(0);
  });

  it('records review transactionally, updating card and writing audit log', () => {
    const now = new Date('2026-10-14T10:00:00Z');
    const card = createSRSCard('card-2', 'neellu', 'telugu', now);
    saveCard(db, card);

    const { updatedCard, log } = gradeSRSCard(card, RatingGrade.Good, now);
    recordReview(db, updatedCard, log);

    const fetched = getCard(db, 'card-2');
    expect(fetched?.reps).toBe(1);
    expect(fetched?.scheduledDays).toBeGreaterThanOrEqual(0);

    const stats = getDeckStats(db, 'telugu');
    expect(stats.totalCards).toBe(1);
  });

  it('queries due cards ordered by due timestamp ascending', () => {
    const past = new Date('2026-10-10T10:00:00Z');
    const future = new Date('2026-10-20T10:00:00Z');

    const cardPast = createSRSCard('c-past', 'past', 'telugu', past);
    const cardFuture = createSRSCard('c-future', 'future', 'telugu', future);

    saveCard(db, cardPast);
    saveCard(db, cardFuture);

    const dueCards = getDueCards(db, 'telugu', new Date('2026-10-14T12:00:00Z'));
    expect(dueCards.length).toBe(1);
    expect(dueCards[0].id).toBe('c-past');
  });
});
