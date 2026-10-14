import { describe, it, expect } from 'vitest';
import { createSRSCard, gradeSRSCard, RatingGrade } from '@/core/srs/scheduler';

describe('Phase 0 Spike S6: FSRS Invariants Property Test', () => {
  it('preserves non-negative stability and monotonically increasing intervals for Good reviews', () => {
    let now = new Date('2026-10-14T00:00:00Z');
    let card = createSRSCard('sim-1', 'item-sim', 'telugu', now);

    let lastInterval = 0;

    for (let i = 0; i < 5; i++) {
      const { updatedCard } = gradeSRSCard(card, RatingGrade.Good, now);
      expect(updatedCard.stability).toBeGreaterThan(0);
      expect(updatedCard.scheduledDays).toBeGreaterThanOrEqual(lastInterval);

      lastInterval = updatedCard.scheduledDays;
      card = updatedCard;

      // Advance time to due date
      now = new Date(card.due.getTime() + 1000 * 60);
    }
  });

  it('correctly increments lapse count when review lapses after graduation', () => {
    let now = new Date('2026-10-14T00:00:00Z');
    let card = createSRSCard('sim-2', 'item-sim', 'telugu', now);

    // Initial easy review to graduate to Review state
    card = gradeSRSCard(card, RatingGrade.Easy, now).updatedCard;
    expect(card.lapses).toBe(0);

    // Lapse review
    now = new Date(card.due.getTime() + 1000 * 60);
    card = gradeSRSCard(card, RatingGrade.Again, now).updatedCard;
    expect(card.lapses).toBe(1);
  });
});
