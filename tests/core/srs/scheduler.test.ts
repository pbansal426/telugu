import { describe, it, expect } from 'vitest';
import { createSRSCard, gradeSRSCard, calculateRetrievability, RatingGrade } from '@/core/srs/scheduler';

describe('FSRS Spaced Repetition Scheduler', () => {
  it('creates an empty new card with initial FSRS properties', () => {
    const now = new Date('2026-10-14T12:00:00Z');
    const card = createSRSCard('card-1', 'item-1', 'telugu', now);
    expect(card.id).toBe('card-1');
    expect(card.itemId).toBe('item-1');
    expect(card.packId).toBe('telugu');
    expect(card.state).toBe(0); // State.New
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
  });

  it('guarantees Good interval is greater than or equal to Hard interval on first review', () => {
    const now = new Date('2026-10-14T12:00:00Z');
    const card = createSRSCard('card-1', 'item-1', 'telugu', now);

    const resultHard = gradeSRSCard(card, RatingGrade.Hard, now);
    const resultGood = gradeSRSCard(card, RatingGrade.Good, now);
    const resultEasy = gradeSRSCard(card, RatingGrade.Easy, now);

    expect(resultGood.updatedCard.scheduledDays).toBeGreaterThanOrEqual(resultHard.updatedCard.scheduledDays);
    expect(resultEasy.updatedCard.scheduledDays).toBeGreaterThanOrEqual(resultGood.updatedCard.scheduledDays);
  });

  it('records lapse and resets stability when rated Again', () => {
    const now = new Date('2026-10-14T12:00:00Z');
    const card = createSRSCard('card-1', 'item-1', 'telugu', now);

    // Graduate card to Review state with Easy
    const firstReview = gradeSRSCard(card, RatingGrade.Easy, now);
    expect(firstReview.updatedCard.lapses).toBe(0);
    expect(firstReview.updatedCard.state).toBe(2); // State.Review

    // Later review Again causes lapse
    const later = new Date('2026-10-17T12:00:00Z');
    const lapseReview = gradeSRSCard(firstReview.updatedCard, RatingGrade.Again, later);
    expect(lapseReview.updatedCard.lapses).toBe(1);
    expect(lapseReview.updatedCard.state).toBe(3); // State.Relearning
    expect(lapseReview.log.rating).toBe(RatingGrade.Again);
  });

  it('calculates retrievability that decays as current time passes due date', () => {
    const now = new Date('2026-10-14T12:00:00Z');
    const card = createSRSCard('card-1', 'item-1', 'telugu', now);
    const firstReview = gradeSRSCard(card, RatingGrade.Good, now);

    const rAtReview = calculateRetrievability(firstReview.updatedCard, now);
    const rFuture = calculateRetrievability(firstReview.updatedCard, new Date('2026-10-25T12:00:00Z'));

    expect(rAtReview).toBeGreaterThanOrEqual(0.9);
    expect(rFuture).toBeLessThan(rAtReview);
  });
});
