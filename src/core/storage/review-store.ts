import type { DatabaseSync } from 'node:sqlite';
import { createDatabaseConnection } from './db';
import type { SRSCardRecord, SRSReviewLogRecord } from '../srs/types';

export function initDatabase(path?: string): DatabaseSync {
  return createDatabaseConnection(path);
}

interface CardRow {
  id: string;
  item_id: string;
  pack_id: string;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
}

function rowToCard(row: CardRow): SRSCardRecord {
  return {
    id: row.id,
    itemId: row.item_id,
    packId: row.pack_id,
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsedDays: row.elapsed_days,
    scheduledDays: row.scheduled_days,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    lastReview: row.last_review ? new Date(row.last_review) : undefined,
  };
}

export function saveCard(db: DatabaseSync, card: SRSCardRecord): void {
  const stmt = db.prepare(`
    INSERT INTO cards (id, item_id, pack_id, due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, last_review)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      due=excluded.due,
      stability=excluded.stability,
      difficulty=excluded.difficulty,
      elapsed_days=excluded.elapsed_days,
      scheduled_days=excluded.scheduled_days,
      reps=excluded.reps,
      lapses=excluded.lapses,
      state=excluded.state,
      last_review=excluded.last_review
  `);

  stmt.run(
    card.id,
    card.itemId,
    card.packId,
    card.due.toISOString(),
    card.stability,
    card.difficulty,
    card.elapsedDays,
    card.scheduledDays,
    card.reps,
    card.lapses,
    card.state,
    card.lastReview ? card.lastReview.toISOString() : null
  );
}

export function getCard(db: DatabaseSync, id: string): SRSCardRecord | null {
  const stmt = db.prepare('SELECT * FROM cards WHERE id = ?');
  const row = stmt.get(id) as unknown as CardRow | undefined;
  return row ? rowToCard(row) : null;
}

export function getDueCards(
  db: DatabaseSync,
  packId: string,
  now: Date = new Date(),
  limit: number = 50
): SRSCardRecord[] {
  const stmt = db.prepare(`
    SELECT * FROM cards
    WHERE pack_id = ? AND due <= ?
    ORDER BY due ASC
    LIMIT ?
  `);
  const rows = stmt.all(packId, now.toISOString(), limit) as unknown as CardRow[];
  return rows.map(rowToCard);
}

export function recordReview(
  db: DatabaseSync,
  card: SRSCardRecord,
  log: SRSReviewLogRecord
): void {
  db.exec('BEGIN TRANSACTION;');
  try {
    saveCard(db, card);

    const logStmt = db.prepare(`
      INSERT INTO review_logs (
        card_id, rating, state, due, stability, difficulty, elapsed_days, last_elapsed_days, scheduled_days, review_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    logStmt.run(
      log.cardId,
      log.rating,
      log.state,
      log.due.toISOString(),
      log.stability,
      log.difficulty,
      log.elapsedDays,
      log.lastElapsedDays,
      log.scheduledDays,
      log.reviewTime.toISOString()
    );
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export function getDeckStats(
  db: DatabaseSync,
  packId: string,
  now: Date = new Date()
): { totalCards: number; dueCount: number } {
  const totalStmt = db.prepare('SELECT COUNT(*) as count FROM cards WHERE pack_id = ?');
  const dueStmt = db.prepare('SELECT COUNT(*) as count FROM cards WHERE pack_id = ? AND due <= ?');

  const totalRow = totalStmt.get(packId) as unknown as { count: number } | undefined;
  const dueRow = dueStmt.get(packId, now.toISOString()) as unknown as { count: number } | undefined;

  const total = totalRow?.count || 0;
  const due = dueRow?.count || 0;

  return { totalCards: total, dueCount: due };
}
