import type { SRSCardRecord, SRSReviewLogRecord } from '../srs/types';
import { gradeSRSCard, RatingGrade } from '../srs/scheduler';
import type { VocabularyItem } from '../content/types';

export interface DrillSessionState {
  queue: SRSCardRecord[];
  itemsMap: Record<string, VocabularyItem>;
  currentIndex: number;
  completedCount: number;
  results: Array<{ card: SRSCardRecord; log: SRSReviewLogRecord }>;
  isComplete: boolean;
  currentCard: SRSCardRecord | null;
  currentItem: VocabularyItem | null;
}

export function createDrillSession(
  cards: SRSCardRecord[],
  items: Record<string, VocabularyItem>
): DrillSessionState {
  const currentCard = cards.length > 0 ? cards[0] : null;
  const currentItem = currentCard ? items[currentCard.itemId] || null : null;

  return {
    queue: cards,
    itemsMap: items,
    currentIndex: 0,
    completedCount: 0,
    results: [],
    isComplete: cards.length === 0,
    currentCard,
    currentItem,
  };
}

export function answerCard(
  session: DrillSessionState,
  rating: RatingGrade,
  now: Date = new Date()
): DrillSessionState {
  if (session.isComplete || !session.currentCard) {
    return session;
  }

  const { updatedCard, log } = gradeSRSCard(session.currentCard, rating, now);
  const nextIndex = session.currentIndex + 1;
  const isComplete = nextIndex >= session.queue.length;
  const nextCard = isComplete ? null : session.queue[nextIndex];
  const nextItem = nextCard ? session.itemsMap[nextCard.itemId] || null : null;

  return {
    ...session,
    currentIndex: nextIndex,
    completedCount: session.completedCount + 1,
    results: [...session.results, { card: updatedCard, log }],
    isComplete,
    currentCard: nextCard,
    currentItem: nextItem,
  };
}
