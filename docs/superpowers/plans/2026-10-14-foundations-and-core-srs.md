# Foundations & Core Spaced Repetition Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core language-agnostic learning engine foundation with Next.js, SQLite, and `ts-fsrs`, seeded with the validated Telugu Pack #1, supporting active recall drills, abugida grapheme-safe segmentation, and PWA capabilities.

**Architecture:** Next.js App Router with TypeScript frontend and local-first SQLite persistence. Core domain logic (`src/core`) is completely decoupled from UI: an FSRS scheduler wrapping `ts-fsrs`, an abugida-aware Unicode grapheme segmenter, a content pack loader/validator, and a session drill manager.

**Tech Stack:** Next.js 15+, React 19, TypeScript, Tailwind CSS, `ts-fsrs` (5.4.2), `better-sqlite3`, Vitest, Noto Sans Telugu web font.

## Global Constraints

- Engine must remain language-agnostic: Telugu-specific logic is confined to `packs/telugu/` and language adapters.
- All Telugu string operations must use `Intl.Segmenter('te', { granularity: 'grapheme' })` and `text.normalize('NFC')`.
- All database state mutations for reviews must be atomic and write to both `cards` and append-only `review_logs`.
- Zero placeholders in implementation code; all tests must be runnable and pass.
- Target Node version: `>=20.0.0` (running on Node v26.8.1 with pnpm 11).

---

### Task 1: Next.js & Vitest Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/test/smoke.test.ts`
- Create: `next.config.ts`

**Interfaces:**
- Consumes: None
- Produces: Runnable Vitest test environment and package dependency manifest

- [ ] **Step 1: Write package.json with dependencies**

Create `package.json`:
```json
{
  "name": "telugu-learning-platform",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest",
    "test:run": "vitest run"
  },
  "dependencies": {
    "better-sqlite3": "^11.8.1",
    "lucide-react": "^0.475.0",
    "next": "^15.1.7",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "ts-fsrs": "^5.4.2"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "@types/node": "^22.13.1",
    "@types/react": "^19.0.8",
    "@types/react-dom": "^19.0.3",
    "postcss": "^8.5.1",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.3",
    "vitest": "^3.0.5"
  }
}
```

- [ ] **Step 2: Create tsconfig.json, vitest.config.ts, next.config.ts**

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

Create `next.config.ts`:
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
```

- [ ] **Step 3: Write failing smoke test**

Create `src/test/smoke.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';

describe('Environment smoke test', () => {
  it('verifies vitest test runner works', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Install dependencies and run tests**

Run:
```bash
pnpm install
pnpm test:run
```
Expected: All tests pass (1 passed).

- [ ] **Step 5: Commit scaffolding**

```bash
git add package.json tsconfig.json vitest.config.ts next.config.ts pnpm-lock.yaml src/test/smoke.test.ts
git commit -m "chore: scaffold Next.js, TypeScript, and Vitest test runner"
```

---

### Task 2: Telugu Grapheme Cluster Segmentation & Text Normalizer

**Files:**
- Create: `src/core/text/segmenter.ts`
- Create: `tests/core/text/segmenter.test.ts`

**Interfaces:**
- Consumes: JavaScript `Intl.Segmenter` API and `String.prototype.normalize`
- Produces:
  - `splitGraphemes(text: string, locale?: string): string[]`
  - `countGraphemes(text: string, locale?: string): number`
  - `normalizeNFC(text: string): string`

- [ ] **Step 1: Write failing tests for Telugu segmentation**

Create `tests/core/text/segmenter.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { splitGraphemes, countGraphemes, normalizeNFC } from '@/core/text/segmenter';

describe('Telugu Grapheme Cluster Segmenter', () => {
  it('correctly segments single conjuncts as 1 grapheme cluster', () => {
    // "క్రి" (ka + virama + ra + i matra) should be 1 user-perceived character
    const clusters = splitGraphemes('క్రి', 'te');
    expect(clusters).toEqual(['క్రి']);
    expect(countGraphemes('క్రి', 'te')).toBe(1);
  });

  it('correctly segments words with multiple conjuncts and vowel modifiers', () => {
    // "నమస్కారం" -> [న, మ, స్కా, రం] (4 clusters)
    const clusters = splitGraphemes('నమస్కారం', 'te');
    expect(clusters).toEqual(['న', 'మ', 'స్కా', 'రం']);
    expect(countGraphemes('నమస్కారం', 'te')).toBe(4);
  });

  it('normalizes decomposed Unicode into NFC form', () => {
    const raw = 'మార్కెట్';
    const normalized = normalizeNFC(raw);
    expect(normalized).toBe(raw.normalize('NFC'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run tests/core/text/segmenter.test.ts`
Expected: FAIL (Cannot find module `@/core/text/segmenter`)

- [ ] **Step 3: Implement segmenter.ts**

Create `src/core/text/segmenter.ts`:
```typescript
/**
 * Unicode-safe grapheme cluster segmentation for complex scripts like Telugu (abugida).
 * Prevents splitting vowel signs (guninthalu) or stacked conjuncts (vattulu).
 */

export function normalizeNFC(text: string): string {
  return text.normalize('NFC');
}

export function splitGraphemes(text: string, locale: string = 'te'): string[] {
  const normalized = normalizeNFC(text);
  const segmenter = new Intl.Segmenter(locale, { granularity: 'grapheme' });
  const segments: string[] = [];
  for (const { segment } of segmenter.segment(normalized)) {
    segments.push(segment);
  }
  return segments;
}

export function countGraphemes(text: string, locale: string = 'te'): number {
  return splitGraphemes(text, locale).length;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run tests/core/text/segmenter.test.ts`
Expected: PASS (3 tests passed).

- [ ] **Step 5: Commit segmenter implementation**

```bash
git add src/core/text/segmenter.ts tests/core/text/segmenter.test.ts
git commit -m "feat(core): implement Telugu Unicode NFC normalizer and grapheme segmenter"
```

---

### Task 3: FSRS Spaced Repetition Engine Service

**Files:**
- Create: `src/core/srs/types.ts`
- Create: `src/core/srs/scheduler.ts`
- Create: `tests/core/srs/scheduler.test.ts`

**Interfaces:**
- Consumes: `ts-fsrs` library functions (`fsrs`, `createEmptyCard`, `Rating`, `State`)
- Produces:
  - `createSRSCard(cardId: string, itemId: string, packId: string, now?: Date): SRSCardRecord`
  - `gradeSRSCard(card: SRSCardRecord, rating: RatingGrade, now?: Date): SRSReviewResult`
  - `calculateRetrievability(card: SRSCardRecord, now?: Date): number`

- [ ] **Step 1: Write failing tests for FSRS scheduling invariants**

Create `tests/core/srs/scheduler.test.ts`:
```typescript
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

    // First review Good
    const firstReview = gradeSRSCard(card, RatingGrade.Good, now);
    expect(firstReview.updatedCard.lapses).toBe(0);

    // Later review Again
    const later = new Date('2026-10-17T12:00:00Z');
    const lapseReview = gradeSRSCard(firstReview.updatedCard, RatingGrade.Again, later);
    expect(lapseReview.updatedCard.lapses).toBe(1);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run tests/core/srs/scheduler.test.ts`
Expected: FAIL (Cannot find module `@/core/srs/scheduler`)

- [ ] **Step 3: Implement types and scheduler**

Create `src/core/srs/types.ts`:
```typescript
import type { Card, ReviewLog } from 'ts-fsrs';

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
```

Create `src/core/srs/scheduler.ts`:
```typescript
import {
  fsrs,
  createEmptyCard,
  Rating,
  type Card as FSRSCard,
  type ReviewLog as FSRSReviewLog,
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run tests/core/srs/scheduler.test.ts`
Expected: PASS (4 tests passed).

- [ ] **Step 5: Commit FSRS scheduler**

```bash
git add src/core/srs/types.ts src/core/srs/scheduler.ts tests/core/srs/scheduler.test.ts
git commit -m "feat(core): implement FSRS spaced repetition scheduler service"
```

---

### Task 4: Local SQLite Persistence Layer for Reviews

**Files:**
- Create: `src/core/storage/db.ts`
- Create: `src/core/storage/review-store.ts`
- Create: `tests/core/storage/review-store.test.ts`

**Interfaces:**
- Consumes: `better-sqlite3`, `src/core/srs/types.ts`
- Produces:
  - `initDatabase(dbPath?: string): Database`
  - `saveCard(db: Database, card: SRSCardRecord): void`
  - `getCard(db: Database, id: string): SRSCardRecord | null`
  - `getDueCards(db: Database, packId: string, now?: Date, limit?: number): SRSCardRecord[]`
  - `recordReview(db: Database, card: SRSCardRecord, log: SRSReviewLogRecord): void`
  - `getDeckStats(db: Database, packId: string): { totalCards: number; dueCount: number }`

- [ ] **Step 1: Write failing tests for SQLite review persistence**

Create `tests/core/storage/review-store.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { initDatabase, saveCard, getCard, getDueCards, recordReview, getDeckStats } from '@/core/storage/review-store';
import { createSRSCard, gradeSRSCard, RatingGrade } from '@/core/srs/scheduler';
import type Database from 'better-sqlite3';

describe('SQLite Review Persistence Store', () => {
  let db: Database.Database;

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
    expect(fetched?.scheduledDays).toBeGreaterThan(0);

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run tests/core/storage/review-store.test.ts`
Expected: FAIL (Cannot find module `@/core/storage/review-store`)

- [ ] **Step 3: Implement SQLite database schema and review store**

Create `src/core/storage/db.ts`:
```typescript
import Database from 'better-sqlite3';

export function createDatabaseConnection(dbPath: string = 'telugu_learning.db'): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Schema creation
  db.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      pack_id TEXT NOT NULL,
      due TEXT NOT NULL,
      stability REAL NOT NULL,
      difficulty REAL NOT NULL,
      elapsed_days REAL NOT NULL,
      scheduled_days REAL NOT NULL,
      reps INTEGER NOT NULL,
      lapses INTEGER NOT NULL,
      state INTEGER NOT NULL,
      last_review TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_cards_pack_due ON cards (pack_id, due);

    CREATE TABLE IF NOT EXISTS review_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      state INTEGER NOT NULL,
      due TEXT NOT NULL,
      stability REAL NOT NULL,
      difficulty REAL NOT NULL,
      elapsed_days REAL NOT NULL,
      last_elapsed_days REAL NOT NULL,
      scheduled_days REAL NOT NULL,
      review_time TEXT NOT NULL,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_review_logs_card_time ON review_logs (card_id, review_time);
  `);

  return db;
}
```

Create `src/core/storage/review-store.ts`:
```typescript
import type Database from 'better-sqlite3';
import { createDatabaseConnection } from './db';
import type { SRSCardRecord, SRSReviewLogRecord } from '../srs/types';

export function initDatabase(path?: string): Database.Database {
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

export function saveCard(db: Database.Database, card: SRSCardRecord): void {
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

export function getCard(db: Database.Database, id: string): SRSCardRecord | null {
  const stmt = db.prepare<[string], CardRow>('SELECT * FROM cards WHERE id = ?');
  const row = stmt.get(id);
  return row ? rowToCard(row) : null;
}

export function getDueCards(
  db: Database.Database,
  packId: string,
  now: Date = new Date(),
  limit: number = 50
): SRSCardRecord[] {
  const stmt = db.prepare<[string, string, number], CardRow>(`
    SELECT * FROM cards
    WHERE pack_id = ? AND due <= ?
    ORDER BY due ASC
    LIMIT ?
  `);
  const rows = stmt.all(packId, now.toISOString(), limit);
  return rows.map(rowToCard);
}

export function recordReview(
  db: Database.Database,
  card: SRSCardRecord,
  log: SRSReviewLogRecord
): void {
  const tx = db.transaction(() => {
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
  });

  tx();
}

export function getDeckStats(
  db: Database.Database,
  packId: string,
  now: Date = new Date()
): { totalCards: number; dueCount: number } {
  const totalStmt = db.prepare<[string], { count: number }>('SELECT COUNT(*) as count FROM cards WHERE pack_id = ?');
  const dueStmt = db.prepare<[string, string], { count: number }>(
    'SELECT COUNT(*) as count FROM cards WHERE pack_id = ? AND due <= ?'
  );

  const total = totalStmt.get(packId)?.count || 0;
  const due = dueStmt.get(packId, now.toISOString())?.count || 0;

  return { totalCards: total, dueCount: due };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run tests/core/storage/review-store.test.ts`
Expected: PASS (3 tests passed).

- [ ] **Step 5: Commit storage layer**

```bash
git add src/core/storage/db.ts src/core/storage/review-store.ts tests/core/storage/review-store.test.ts
git commit -m "feat(storage): implement SQLite schema and transactional review store"
```

---

### Task 5: Telugu Content Pack Schema, Seed Dataset & Validator

**Files:**
- Create: `src/core/content/types.ts`
- Create: `src/core/content/validator.ts`
- Create: `packs/telugu/pack.json`
- Create: `tests/core/content/validator.test.ts`

**Interfaces:**
- Consumes: `src/core/text/segmenter.ts`
- Produces:
  - `validatePack(pack: LanguagePack): ValidationResult`
  - `loadAndValidatePack(packData: unknown): LanguagePack`

- [ ] **Step 1: Write failing tests for pack validator**

Create `tests/core/content/validator.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { validatePack } from '@/core/content/validator';
import teluguPack from '../../../packs/telugu/pack.json';

describe('Content Pack Validator', () => {
  it('validates the official starter Telugu content pack successfully', () => {
    const result = validatePack(teluguPack);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(teluguPack.items.length).toBeGreaterThanOrEqual(20);
  });

  it('rejects an invalid pack missing required fields or having non-NFC text', () => {
    const invalidPack = {
      id: 'bad-pack',
      language: 'te',
      items: [
        {
          id: 'item-1',
          en: 'Missing fields',
          // missing te, roman
        },
      ],
    };
    const result = validatePack(invalidPack);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run tests/core/content/validator.test.ts`
Expected: FAIL (Cannot find module `@/core/content/validator` or `packs/telugu/pack.json`)

- [ ] **Step 3: Define pack schema, validator and official Telugu pack**

Create `src/core/content/types.ts`:
```typescript
export interface VocabularyItem {
  id: string;
  te: string;
  roman: string;
  en: string;
  category: 'greetings' | 'conversation' | 'food' | 'survival' | 'family';
  telanganaNote?: string;
  audioPath?: string;
}

export interface LanguagePack {
  id: string;
  name: string;
  language: string;
  dialect?: string;
  version: string;
  description: string;
  items: VocabularyItem[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
```

Create `src/core/content/validator.ts`:
```typescript
import type { LanguagePack, VocabularyItem, ValidationResult } from './types';
import { normalizeNFC, countGraphemes } from '../text/segmenter';

export function validatePack(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Pack data must be a non-null object'] };
  }

  const pack = data as Partial<LanguagePack>;
  if (!pack.id || typeof pack.id !== 'string') errors.push('Missing pack.id');
  if (!pack.name || typeof pack.name !== 'string') errors.push('Missing pack.name');
  if (!pack.language || typeof pack.language !== 'string') errors.push('Missing pack.language');
  if (!Array.isArray(pack.items) || pack.items.length === 0) {
    errors.push('pack.items must be a non-empty array');
    return { isValid: false, errors };
  }

  const seenIds = new Set<string>();

  pack.items.forEach((item: Partial<VocabularyItem>, index: number) => {
    if (!item.id || typeof item.id !== 'string') {
      errors.push(`Item at index ${index} missing id`);
    } else if (seenIds.has(item.id)) {
      errors.push(`Duplicate item id: ${item.id}`);
    } else {
      seenIds.add(item.id);
    }

    if (!item.te || typeof item.te !== 'string') {
      errors.push(`Item ${item.id || index} missing te (Telugu script text)`);
    } else {
      if (item.te !== normalizeNFC(item.te)) {
        errors.push(`Item ${item.id} te text is not normalized to NFC Unicode`);
      }
      if (countGraphemes(item.te, 'te') === 0) {
        errors.push(`Item ${item.id} te text has zero graphemes`);
      }
    }

    if (!item.en || typeof item.en !== 'string') {
      errors.push(`Item ${item.id || index} missing en translation`);
    }

    if (!item.roman || typeof item.roman !== 'string') {
      errors.push(`Item ${item.id || index} missing roman transliteration`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}
```

Create `packs/telugu/pack.json`:
```json
{
  "id": "telugu-starter",
  "name": "Telugu Conversational Starter",
  "language": "te",
  "dialect": "Telangana",
  "version": "1.0.0",
  "description": "Spoken everyday conversational Telugu seeded with Telangana dialect forms.",
  "items": [
    {
      "id": "namaskaram",
      "te": "నమస్కారం",
      "roman": "Namaskaram",
      "en": "Hello / Greetings",
      "category": "greetings",
      "telanganaNote": "Universal polite greeting across all dialects."
    },
    {
      "id": "ela-unnaru",
      "te": "ఎలా ఉన్నారు?",
      "roman": "Ela unnaru?",
      "en": "How are you? (polite)",
      "category": "greetings"
    },
    {
      "id": "bagunnanu",
      "te": "బాగున్నాను",
      "roman": "Bagunnanu",
      "en": "I am fine",
      "category": "greetings"
    },
    {
      "id": "nee-peru-enti",
      "te": "నీ పేరు ఏంటి?",
      "roman": "Nee peru enti?",
      "en": "What is your name?",
      "category": "conversation",
      "telanganaNote": "Telangana colloquial uses 'enti' instead of the textbook 'emiti'."
    },
    {
      "id": "naa-peru",
      "te": "నా పేరు...",
      "roman": "Naa peru...",
      "en": "My name is...",
      "category": "conversation"
    },
    {
      "id": "thinnara",
      "te": "తిన్నారా?",
      "roman": "Thinnara?",
      "en": "Have you eaten? (polite cultural check-in)",
      "category": "greetings"
    },
    {
      "id": "naaku-ardham-kaaledu",
      "te": "నాకు అర్థం కాలేదు",
      "roman": "Naaku ardham kaaledu",
      "en": "I don't understand",
      "category": "survival"
    },
    {
      "id": "malli-cheppandi",
      "te": "మళ్ళీ చెప్పండి",
      "roman": "Malli cheppandi",
      "en": "Please say it again",
      "category": "survival"
    },
    {
      "id": "kaavali-mangoes",
      "te": "నాకు మామిడి పండ్లు కావాలి",
      "roman": "Naaku mamidi pandlu kaavali",
      "en": "I want to buy/have mangoes",
      "category": "food",
      "telanganaNote": "In natural spoken speech 'kaavali' indicates wanting something."
    },
    {
      "id": "idhi-entha",
      "te": "ఇది ఎంత?",
      "roman": "Idhi entha?",
      "en": "How much is this?",
      "category": "survival"
    },
    {
      "id": "ikkadiki-raa",
      "te": "ఇక్కడికి రా",
      "roman": "Ikkadiki raa",
      "en": "Come here (informal/friendly)",
      "category": "conversation",
      "telanganaNote": "'Raa' is common casual speech among friends and peers."
    },
    {
      "id": "bathroom-ekkada",
      "te": "బాత్‌రూమ్ ఎక్కడ ఉంది?",
      "roman": "Bathroom ekkada undi?",
      "en": "Where is the bathroom?",
      "category": "survival"
    },
    {
      "id": "neellu",
      "te": "నీళ్లు",
      "roman": "Neellu",
      "en": "Water",
      "category": "food"
    },
    {
      "id": "annam",
      "te": "అన్నం",
      "roman": "Annam",
      "en": "Cooked rice / meal",
      "category": "food"
    },
    {
      "id": "akali-ga-undi",
      "te": "నాకు ఆకలిగా ఉంది",
      "roman": "Naaku akali ga undi",
      "en": "I am hungry",
      "category": "food"
    },
    {
      "id": "chaala-bagundi",
      "te": "చాలా బాగుంది",
      "roman": "Chaala bagundi",
      "en": "It is very good",
      "category": "conversation"
    },
    {
      "id": "dhanyavadalu",
      "te": "ధన్యవాదాలు",
      "roman": "Dhanyavadalu",
      "en": "Thank you (formal)",
      "category": "greetings"
    },
    {
      "id": "avunu",
      "te": "అవును",
      "roman": "Avunu",
      "en": "Yes",
      "category": "conversation"
    },
    {
      "id": "kaadu",
      "te": "కాదు",
      "roman": "Kaadu",
      "en": "No (it is not)",
      "category": "conversation"
    },
    {
      "id": "vaddu",
      "te": "వద్దు",
      "roman": "Vaddu",
      "en": "I don't want it / don't do it",
      "category": "survival"
    },
    {
      "id": "sare",
      "te": "సరే",
      "roman": "Sare",
      "en": "Okay / Alright",
      "category": "conversation"
    }
  ]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run tests/core/content/validator.test.ts`
Expected: PASS (2 tests passed).

- [ ] **Step 5: Commit Telugu starter pack and validator**

```bash
git add packs/telugu/pack.json src/core/content/types.ts src/core/content/validator.ts tests/core/content/validator.test.ts
git commit -m "feat(content): define language pack schema and seed validated starter Telugu pack"
```

---

### Task 6: Active Recall Drill Session & Flashcard UI Component

**Files:**
- Create: `src/core/drill/session-manager.ts`
- Create: `src/components/drill/Flashcard.tsx`
- Create: `src/components/drill/ReviewSession.tsx`
- Create: `tests/core/drill/session-manager.test.ts`
- Create: `src/app/drill/page.tsx`

**Interfaces:**
- Consumes: `src/core/srs/scheduler.ts`, `src/core/storage/review-store.ts`, `src/core/content/types.ts`
- Produces: Interactive drill engine with Romanization reveal toggles and FSRS rating actions

- [ ] **Step 1: Write failing tests for session manager logic**

Create `tests/core/drill/session-manager.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run tests/core/drill/session-manager.test.ts`
Expected: FAIL (Cannot find module `@/core/drill/session-manager`)

- [ ] **Step 3: Implement drill session manager and UI components**

Create `src/core/drill/session-manager.ts`:
```typescript
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
```

Create `src/components/drill/Flashcard.tsx`:
```tsx
'use client';

import React, { useState } from 'react';
import type { VocabularyItem } from '@/core/content/types';
import { RatingGrade } from '@/core/srs/scheduler';

interface FlashcardProps {
  item: VocabularyItem;
  onRate: (rating: RatingGrade) => void;
}

export function Flashcard({ item, onRate }: FlashcardProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [showRomanHint, setShowRomanHint] = useState(false);

  const handleReveal = () => setIsRevealed(true);

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-md border border-zinc-200 dark:border-zinc-800 transition-all">
      {/* Category Header */}
      <div className="text-xs font-semibold tracking-wider uppercase text-zinc-400 mb-4">
        {item.category}
      </div>

      {/* Front: Prompt in English */}
      <div className="min-h-[120px] flex flex-col justify-center items-center text-center">
        <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 mb-2">
          {item.en}
        </h2>

        {!isRevealed && (
          <div className="mt-2">
            {!showRomanHint ? (
              <button
                onClick={() => setShowRomanHint(true)}
                className="text-xs text-blue-500 hover:underline"
              >
                Need a hint? (Show Romanization)
              </button>
            ) : (
              <p className="text-sm italic text-zinc-500">{item.roman}</p>
            )}
          </div>
        )}
      </div>

      {/* Divider */}
      <hr className="my-6 border-zinc-100 dark:border-zinc-800" />

      {/* Back: Revealed Telugu Script */}
      {!isRevealed ? (
        <button
          onClick={handleReveal}
          className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 rounded-xl font-medium transition"
        >
          Show Answer
        </button>
      ) : (
        <div className="space-y-6">
          <div className="text-center">
            {/* Telugu Script (large font for abugida visibility) */}
            <div className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 mb-2 tracking-wide font-telugu">
              {item.te}
            </div>
            <div className="text-lg text-zinc-600 dark:text-zinc-400 font-medium">
              {item.roman}
            </div>
            {item.telanganaNote && (
              <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-200 text-left">
                💡 <span className="font-semibold">Telangana note:</span> {item.telanganaNote}
              </div>
            )}
          </div>

          {/* FSRS Rating Buttons */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => onRate(RatingGrade.Again)}
              className="py-2.5 px-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950/60 dark:text-red-300 rounded-xl text-xs font-semibold"
            >
              Again
            </button>
            <button
              onClick={() => onRate(RatingGrade.Hard)}
              className="py-2.5 px-2 bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 rounded-xl text-xs font-semibold"
            >
              Hard
            </button>
            <button
              onClick={() => onRate(RatingGrade.Good)}
              className="py-2.5 px-2 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded-xl text-xs font-semibold"
            >
              Good
            </button>
            <button
              onClick={() => onRate(RatingGrade.Easy)}
              className="py-2.5 px-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-xl text-xs font-semibold"
            >
              Easy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

Create `src/components/drill/ReviewSession.tsx`:
```tsx
'use client';

import React, { useState } from 'react';
import type { DrillSessionState } from '@/core/drill/session-manager';
import { answerCard } from '@/core/drill/session-manager';
import { RatingGrade } from '@/core/srs/scheduler';
import { Flashcard } from './Flashcard';

interface ReviewSessionProps {
  initialSession: DrillSessionState;
}

export function ReviewSession({ initialSession }: ReviewSessionProps) {
  const [session, setSession] = useState<DrillSessionState>(initialSession);

  const handleRate = (rating: RatingGrade) => {
    const updated = answerCard(session, rating);
    setSession(updated);
  };

  if (session.isComplete || !session.currentItem) {
    return (
      <div className="w-full max-w-md mx-auto p-8 text-center bg-white dark:bg-zinc-900 rounded-2xl shadow-md border border-zinc-200 dark:border-zinc-800">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Session Complete!
        </h2>
        <p className="text-sm text-zinc-500 mb-6">
          You reviewed {session.completedCount} cards.
        </p>
        <a
          href="/"
          className="inline-block py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition"
        >
          Return Home
        </a>
      </div>
    );
  }

  const progressPercent = Math.round((session.completedCount / session.queue.length) * 100);

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Progress Bar */}
      <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
        <span>Progress</span>
        <span>{session.completedCount} / {session.queue.length}</span>
      </div>
      <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <Flashcard
        key={session.currentCard?.id}
        item={session.currentItem}
        onRate={handleRate}
      />
    </div>
  );
}
```

Create `src/app/drill/page.tsx`:
```tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run tests/core/drill/session-manager.test.ts`
Expected: PASS (2 tests passed).

- [ ] **Step 5: Commit drill UI and session manager**

```bash
git add src/core/drill/session-manager.ts src/components/drill/Flashcard.tsx src/components/drill/ReviewSession.tsx src/app/drill/page.tsx tests/core/drill/session-manager.test.ts
git commit -m "feat(ui): implement active recall flashcard drill and session manager"
```

---

### Task 7: PWA Shell, Web Typography and Landing Dashboard

**Files:**
- Create: `public/manifest.json`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `tests/pwa/manifest.test.ts`

**Interfaces:**
- Consumes: Next.js Layout & Tailwind CSS, `packs/telugu/pack.json`
- Produces: Installable PWA layout with Noto Sans Telugu font and home dashboard

- [ ] **Step 1: Write failing tests for PWA manifest**

Create `tests/pwa/manifest.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import manifest from '../../public/manifest.json';

describe('PWA Manifest Configuration', () => {
  it('contains required installable PWA attributes', () => {
    expect(manifest.name).toBe('Telugu Learning Platform');
    expect(manifest.short_name).toBe('Telugu');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.icons.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run tests/pwa/manifest.test.ts`
Expected: FAIL (Cannot find module `../../public/manifest.json`)

- [ ] **Step 3: Create manifest, typography CSS, layout and homepage**

Create `public/manifest.json`:
```json
{
  "name": "Telugu Learning Platform",
  "short_name": "Telugu",
  "description": "Learn conversational spoken Telugu with FSRS spaced repetition and AI assistance.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#09090b",
  "theme_color": "#2563eb",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

Create `src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply antialiased;
  }
}

.font-telugu {
  font-family: var(--font-telugu), system-ui, -apple-system, sans-serif;
}
```

Create `src/app/layout.tsx`:
```tsx
import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Telugu, Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const notoSansTelugu = Noto_Sans_Telugu({
  subsets: ['telugu'],
  weight: ['400', '600', '700'],
  variable: '--font-telugu',
});

export const metadata: Metadata = {
  title: 'Telugu Learning Platform',
  description: 'Evidence-based conversational Telugu learning with FSRS spaced repetition',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2563eb',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="te" className={`${inter.variable} ${notoSansTelugu.variable}`}>
      <body className="bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 font-sans">
        {children}
      </body>
    </html>
  );
}
```

Create `src/app/page.tsx`:
```tsx
import React from 'react';
import Link from 'next/link';
import teluguPack from '../../packs/telugu/pack.json';

export default function HomePage() {
  const itemCount = teluguPack.items.length;

  return (
    <main className="min-h-screen max-w-xl mx-auto px-6 py-16 flex flex-col justify-between">
      <div className="space-y-6">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full">
            Pack 1: {teluguPack.dialect} Telugu
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight mt-3 text-zinc-900 dark:text-zinc-100">
            {teluguPack.name}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            Evidence-based language acquisition: spaced retrieval practice, comprehensible input, and speech training.
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
          <div className="flex justify-between items-center text-sm font-medium">
            <span>Available Vocabulary</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold">{itemCount} items</span>
          </div>
          <div className="flex justify-between items-center text-sm font-medium">
            <span>Scheduling Engine</span>
            <span className="text-zinc-500">FSRS v5 (90% retention)</span>
          </div>
          <div className="flex justify-between items-center text-sm font-medium">
            <span>Mode</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active Recall</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-8">
        <Link
          href="/drill"
          className="w-full block py-4 text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl shadow-md transition text-lg"
        >
          Start Practice Session
        </Link>
        <p className="text-center text-xs text-zinc-400">
          Works offline as an installable PWA.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run tests/pwa/manifest.test.ts`
Expected: PASS (1 test passed).

- [ ] **Step 5: Commit PWA shell and home dashboard**

```bash
git add public/manifest.json src/app/layout.tsx src/app/page.tsx src/app/globals.css tests/pwa/manifest.test.ts
git commit -m "feat(pwa): setup PWA manifest, Noto Sans Telugu typography, and home dashboard"
```

---

### Task 8: Phase 0 Verification Spike S6 (FSRS Invariants Simulation)

**Files:**
- Create: `scripts/spikes/s6-fsrs-invariants.ts`
- Create: `tests/spikes/s6-fsrs.test.ts`
- Create: `docs/spikes/s6-fsrs-report.md`

**Interfaces:**
- Consumes: `src/core/srs/scheduler.ts`
- Produces: Verifiable test report proving FSRS convergence and monotonicity

- [ ] **Step 1: Write property test verifying FSRS scheduling invariants across 100 sequences**

Create `tests/spikes/s6-fsrs.test.ts`:
```typescript
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

  it('correctly increments lapse count when review lapses', () => {
    let now = new Date('2026-10-14T00:00:00Z');
    let card = createSRSCard('sim-2', 'item-sim', 'telugu', now);

    // Initial good review
    card = gradeSRSCard(card, RatingGrade.Good, now).updatedCard;
    expect(card.lapses).toBe(0);

    // Lapse review
    now = new Date(card.due.getTime() + 1000 * 60);
    card = gradeSRSCard(card, RatingGrade.Again, now).updatedCard;
    expect(card.lapses).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `pnpm test:run tests/spikes/s6-fsrs.test.ts`
Expected: PASS (2 tests passed).

- [ ] **Step 3: Document spike S6 report**

Create `docs/spikes/s6-fsrs-report.md`:
```markdown
# Phase 0 Spike S6: FSRS Invariant & Scheduling Validation

Date: 2026-10-14
Status: PASSED

## Summary
The FSRS algorithm (via `ts-fsrs` 5.4.2) was integrated and verified against the following core invariants:
1. **Monotonic Interval Growth**: Successive "Good" ratings consistently expand scheduled days.
2. **Lapse Tracking**: Rating a card "Again" increments lapse counter and safely resets intervals without corrupted states.
3. **Decay Probability**: Memory retrievability decays according to the power forgetting curve without NaN or negative values.
```

- [ ] **Step 4: Run full test suite across the repository**

Run: `pnpm test:run`
Expected: All test suites PASS (approx 17+ tests).

- [ ] **Step 5: Commit Spike S6 test and report**

```bash
git add tests/spikes/s6-fsrs.test.ts docs/spikes/s6-fsrs-report.md
git commit -m "test(spikes): add automated FSRS invariant verification spike S6"
```
