import {
  fsrs,
  createEmptyCard,
  Rating,
  type Card as FSRSCard,
} from 'ts-fsrs';
import { RatingGrade, type SRSCardRecord, type SRSReviewLogRecord, type SRSReviewResult } from './types';

export { RatingGrade };

const scheduler = fsrs({
  request_retention: 0.9,
  maximum_interval: 36500,
});

function toFSRSCard(record: SRSCardRecord): FSRSCard {
  return {
    due: record.due,
    stability: record.stability,
    difficulty: record.difficulty,
    elapsed_days: record.elapsedDays,
    scheduled_days: record.scheduledDays,
    reps: record.reps,
    lapses: record.lapses,
    state: record.state,
    last_review: record.lastReview,
  };
}

function fromFSRSCard(card: FSRSCard, id: string, itemId: string, packId: string): SRSCardRecord {
  return {
    id,
    itemId,
    packId,
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review,
  };
}

export function createSRSCard(
  id: string,
  itemId: string,
  packId: string,
  now: Date = new Date()
): SRSCardRecord {
  const empty = createEmptyCard(now);
  return fromFSRSCard(empty, id, itemId, packId);
}

export function gradeSRSCard(
  cardRecord: SRSCardRecord,
  grade: RatingGrade,
  now: Date = new Date()
): SRSReviewResult {
  const fsrsCard = toFSRSCard(cardRecord);
  const scheduling = scheduler.repeat(fsrsCard, now);

  const fsrsRating = grade as unknown as Rating;
  const item = scheduling[fsrsRating];

  const updatedCard = fromFSRSCard(item.card, cardRecord.id, cardRecord.itemId, cardRecord.packId);
  const log: SRSReviewLogRecord = {
    cardId: cardRecord.id,
    rating: grade,
    state: item.log.state,
    due: item.log.due,
    stability: item.log.stability,
    difficulty: item.log.difficulty,
    elapsedDays: item.log.elapsed_days,
    lastElapsedDays: item.log.last_elapsed_days,
    scheduledDays: item.log.scheduled_days,
    reviewTime: item.log.review,
  };

  return { updatedCard, log };
}

export function calculateRetrievability(cardRecord: SRSCardRecord, now: Date = new Date()): number {
  if (cardRecord.state === 0) return 0; // New card
  if (!cardRecord.lastReview) return 1.0;

  const daysPassed = Math.max(0, (now.getTime() - cardRecord.lastReview.getTime()) / (1000 * 60 * 60 * 24));
  if (cardRecord.stability <= 0) return 0;

  // FSRS retrievability formula: R = (1 + factor * t / S)^decay
  // Standard decay = -0.5, factor = 19/81 (~0.234)
  const factor = 19 / 81;
  const power = -0.5;
  const retrievability = Math.pow(1 + (factor * daysPassed) / cardRecord.stability, power);
  return Math.min(1.0, Math.max(0.0, retrievability));
}
