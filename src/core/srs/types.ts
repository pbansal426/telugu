export enum RatingGrade {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

export interface SRSCardRecord {
  id: string;
  itemId: string;
  packId: string;
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  learningSteps: number;
  state: number;
  lastReview?: Date;
}

export interface SRSReviewLogRecord {
  cardId: string;
  rating: RatingGrade;
  state: number;
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  lastElapsedDays: number;
  scheduledDays: number;
  reviewTime: Date;
}

export interface SRSReviewResult {
  updatedCard: SRSCardRecord;
  log: SRSReviewLogRecord;
}
