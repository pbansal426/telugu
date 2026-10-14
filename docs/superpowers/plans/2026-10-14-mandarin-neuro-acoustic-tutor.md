# Mandarin Neuro-Acoustic Spoken Tutor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a neurologically engineered spoken Mandarin conversational acquisition app featuring zero-Hanzi Romanized Pinyin scaffolding, Web Audio real-time $F_0$ pitch tracking on HTML5 Canvas, high-variability multi-speaker conditioning (HVPT), FSRS v5 spaced retrieval, and a viral-style conversational AI tutor powered by local LM Studio Gemma 26B.

**Architecture:** Client-side Web Audio DSP (YIN pitch detection algorithm) and 60 FPS Canvas visualizer; Next.js 15+ App Router with streaming SSE proxy (`/api/chat`) connecting to local LM Studio (`http://127.0.0.1:1234/v1`); Node 22+ native SQLite persistence; anti-slop dark precision UI adhering to `/impeccable` and `/design-taste-frontend`.

**Tech Stack:** Next.js 15+, React 19, TypeScript, Tailwind CSS, Web Audio API, `ts-fsrs` (v5.4.2), `node:sqlite`, Vitest, Puppeteer MCP.

---

## Global Constraints

- **Language Scope**: Standard Mandarin Chinese (Putonghua, colloquial conversational cadence).
- **Script**: Romanized Hanyu Pinyin with explicit tone diacritics only. No Chinese characters (Hanzi) are required or rendered.
- **Audio & Pitch Bounds**: Pitch detector tracks $F_0$ strictly between 75 Hz and 450 Hz with silence/voicing thresholding.
- **Tone Color Standards**: Tone 1: `#F87171` (Coral), Tone 2: `#34D399` (Emerald), Tone 3: `#FBBF24` (Amber), Tone 4: `#60A5FA` (Cobalt Blue), Tone 5 / Neutral: `#94A3B8` (Slate).
- **Design Standard**: Dark Precision Tech (Obsidian `#09090b`, zinc borders `#27272a`, Geist & Geist Mono typography). Zero AI-purple gradients, zero centered hero meshes.
- **Persistence**: Node 22+ `node:sqlite` (`DatabaseSync`) in WAL mode. Do not use `better-sqlite3`.
- **Test Discipline**: TDD for every core component with 100% passing tests before committing.

---

### Task 1: Pinyin Parser & Tone Sandhi Rules Engine

**Files:**
- Create: `src/core/text/pinyin.ts`
- Test: `tests/core/text/pinyin.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export type ToneNumber = 0 | 1 | 2 | 3 | 4;

  export interface PinyinSyllable {
    raw: string;          // e.g. "nǐ"
    clean: string;        // e.g. "ni"
    baseTone: ToneNumber; // e.g. 3
    surfaceTone: ToneNumber; // e.g. 2 (after sandhi)
    hasSandhi: boolean;   // true if surfaceTone !== baseTone
    color: string;        // Hex color for surfaceTone
  }

  export interface PinyinWord {
    text: string;
    syllables: PinyinSyllable[];
  }

  export function parsePinyinText(text: string): PinyinWord[];
  export function applyToneSandhi(syllables: PinyinSyllable[]): PinyinSyllable[];
  export function getToneColor(tone: ToneNumber): string;
  ```

- [ ] **Step 1: Write the failing tests for Pinyin parsing and Tone Sandhi**

```typescript
// tests/core/text/pinyin.test.ts
import { describe, it, expect } from "vitest";
import { parsePinyinText, applyToneSandhi, getToneColor } from "@/core/text/pinyin";

describe("Pinyin Parser & Tone Sandhi Engine", () => {
  it("correctly identifies base tones from diacritics", () => {
    const words = parsePinyinText("mā má mǎ mà ma");
    expect(words).toHaveLength(5);
    expect(words[0].syllables[0].baseTone).toBe(1);
    expect(words[1].syllables[0].baseTone).toBe(2);
    expect(words[2].syllables[0].baseTone).toBe(3);
    expect(words[3].syllables[0].baseTone).toBe(4);
    expect(words[4].syllables[0].baseTone).toBe(0);
  });

  it("applies 3rd + 3rd tone sandhi (3+3 -> 2+3)", () => {
    const words = parsePinyinText("Nǐ hǎo");
    const syllables = words.flatMap(w => w.syllables);
    expect(syllables[0].baseTone).toBe(3);
    expect(syllables[0].surfaceTone).toBe(2);
    expect(syllables[0].hasSandhi).toBe(true);
    expect(syllables[1].surfaceTone).toBe(3);
    expect(syllables[1].hasSandhi).toBe(false);
  });

  it("applies Bù tone sandhi (bù before 4th tone -> 2nd tone)", () => {
    const words = parsePinyinText("bù shì");
    const syllables = words.flatMap(w => w.syllables);
    expect(syllables[0].baseTone).toBe(4);
    expect(syllables[0].surfaceTone).toBe(2);
    expect(syllables[0].hasSandhi).toBe(true);
    expect(syllables[1].surfaceTone).toBe(4);
  });

  it("returns correct tone colors", () => {
    expect(getToneColor(1)).toBe("#F87171");
    expect(getToneColor(2)).toBe("#34D399");
    expect(getToneColor(3)).toBe("#FBBF24");
    expect(getToneColor(4)).toBe("#60A5FA");
    expect(getToneColor(0)).toBe("#94A3B8");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run tests/core/text/pinyin.test.ts`  
Expected: FAIL (Cannot find module `@/core/text/pinyin`)

- [ ] **Step 3: Implement minimal Pinyin parser and sandhi rules**

```typescript
// src/core/text/pinyin.ts
export type ToneNumber = 0 | 1 | 2 | 3 | 4;

export interface PinyinSyllable {
  raw: string;
  clean: string;
  baseTone: ToneNumber;
  surfaceTone: ToneNumber;
  hasSandhi: boolean;
  color: string;
}

export interface PinyinWord {
  text: string;
  syllables: PinyinSyllable[];
}

const TONE_COLORS: Record<ToneNumber, string> = {
  1: "#F87171",
  2: "#34D399",
  3: "#FBBF24",
  4: "#60A5FA",
  0: "#94A3B8"
};

export function getToneColor(tone: ToneNumber): string {
  return TONE_COLORS[tone] || TONE_COLORS[0];
}

const DIACRITIC_MAP: Record<string, { base: string; tone: ToneNumber }> = {
  'ā': { base: 'a', tone: 1 }, 'á': { base: 'a', tone: 2 }, 'ǎ': { base: 'a', tone: 3 }, 'à': { base: 'a', tone: 4 },
  'ē': { base: 'e', tone: 1 }, 'é': { base: 'e', tone: 2 }, 'ě': { base: 'e', tone: 3 }, 'è': { base: 'e', tone: 4 },
  'ī': { base: 'i', tone: 1 }, 'í': { base: 'i', tone: 2 }, 'ǐ': { base: 'i', tone: 3 }, 'ì': { base: 'i', tone: 4 },
  'ō': { base: 'o', tone: 1 }, 'ó': { base: 'o', tone: 2 }, 'ǒ': { base: 'o', tone: 3 }, 'ò': { base: 'o', tone: 4 },
  'ū': { base: 'u', tone: 1 }, 'ú': { base: 'u', tone: 2 }, 'ǔ': { base: 'u', tone: 3 }, 'ù': { base: 'u', tone: 4 },
  'ǖ': { base: 'ü', tone: 1 }, 'ǘ': { base: 'ü', tone: 2 }, 'ǚ': { base: 'ü', tone: 3 }, 'ǜ': { base: 'ü', tone: 4 },
  'Ā': { base: 'A', tone: 1 }, 'Á': { base: 'A', tone: 2 }, 'Ǎ': { base: 'A', tone: 3 }, 'À': { base: 'A', tone: 4 },
  'Ē': { base: 'E', tone: 1 }, 'É': { base: 'E', tone: 2 }, 'Ě': { base: 'E', tone: 3 }, 'È': { base: 'E', tone: 4 },
  'Ī': { base: 'I', tone: 1 }, 'Í': { base: 'I', tone: 2 }, 'Ǐ': { base: 'I', tone: 3 }, 'Ì': { base: 'I', tone: 4 },
  'Ō': { base: 'O', tone: 1 }, 'Ó': { base: 'O', tone: 2 }, 'Ǒ': { base: 'O', tone: 3 }, 'Ò': { base: 'O', tone: 4 },
  'Ū': { base: 'U', tone: 1 }, 'Ú': { base: 'U', tone: 2 }, 'Ǔ': { base: 'U', tone: 3 }, 'Ù': { base: 'U', tone: 4 },
  'Ǖ': { base: 'Ü', tone: 1 }, 'Ǘ': { base: 'Ü', tone: 2 }, 'Ǚ': { base: 'Ü', tone: 3 }, 'Ǜ': { base: 'Ü', tone: 4 },
};

function extractSyllable(token: string): { clean: string; baseTone: ToneNumber } {
  let baseTone: ToneNumber = 0;
  let clean = "";
  for (const char of token) {
    if (DIACRITIC_MAP[char]) {
      baseTone = DIACRITIC_MAP[char].tone;
      clean += DIACRITIC_MAP[char].base;
    } else {
      clean += char;
    }
  }
  return { clean, baseTone };
}

export function applyToneSandhi(syllables: PinyinSyllable[]): PinyinSyllable[] {
  const result = syllables.map(s => ({ ...s }));
  for (let i = 0; i < result.length; i++) {
    const current = result[i];
    const next = result[i + 1];

    // 3rd tone + 3rd tone -> 2nd tone + 3rd tone
    if (current.baseTone === 3 && next && next.baseTone === 3) {
      current.surfaceTone = 2;
      current.hasSandhi = true;
      current.color = getToneColor(2);
    }

    // Bù sandhi: bù (4) + 4th tone -> bú (2)
    const lowerClean = current.clean.toLowerCase();
    if (lowerClean === "bu" && current.baseTone === 4 && next && next.baseTone === 4) {
      current.surfaceTone = 2;
      current.hasSandhi = true;
      current.color = getToneColor(2);
    }
  }
  return result;
}

export function parsePinyinText(text: string): PinyinWord[] {
  const words = text.trim().split(/\s+/);
  const parsedWords: PinyinWord[] = [];
  const allSyllables: PinyinSyllable[] = [];

  for (const word of words) {
    // For simplicity, individual whitespace tokens represent words/syllables
    const { clean, baseTone } = extractSyllable(word);
    const syllable: PinyinSyllable = {
      raw: word,
      clean,
      baseTone,
      surfaceTone: baseTone,
      hasSandhi: false,
      color: getToneColor(baseTone)
    };
    allSyllables.push(syllable);
    parsedWords.push({
      text: word,
      syllables: [syllable]
    });
  }

  // Apply sandhi across sentence context
  applyToneSandhi(allSyllables);

  return parsedWords;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run tests/core/text/pinyin.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/text/pinyin.ts tests/core/text/pinyin.test.ts
git commit -m "feat(pinyin): implement Pinyin parser and tone sandhi rules engine"
```

---

### Task 2: Web Audio YIN Pitch Detection Engine

**Files:**
- Create: `src/core/audio/pitch-detector.ts`
- Test: `tests/core/audio/pitch-detector.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface PitchResult {
    frequency: number;  // in Hz (0 if unvoiced)
    probability: number; // 0.0 to 1.0 confidence
    isVoiced: boolean;
    chaoLevel: number;  // 1.0 to 5.0 normalized tone height
  }

  export class YinPitchDetector {
    constructor(sampleRate: number, bufferSize: number, threshold?: number);
    getPitch(buffer: Float32Array): PitchResult;
    hzToChaoLevel(hz: number, baselineHz?: number): number;
  }
  ```

- [ ] **Step 1: Write the failing tests for YIN pitch detector**

```typescript
// tests/core/audio/pitch-detector.test.ts
import { describe, it, expect } from "vitest";
import { YinPitchDetector } from "@/core/audio/pitch-detector";

describe("YinPitchDetector", () => {
  const sampleRate = 44100;
  const bufferSize = 2048;
  const detector = new YinPitchDetector(sampleRate, bufferSize, 0.15);

  function generateSineWave(freq: number, numSamples: number): Float32Array {
    const buffer = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      buffer[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);
    }
    return buffer;
  }

  it("accurately detects a 220 Hz sine wave within ±2 Hz", () => {
    const buffer = generateSineWave(220, bufferSize);
    const result = detector.getPitch(buffer);
    expect(result.isVoiced).toBe(true);
    expect(result.frequency).toBeGreaterThanOrEqual(218);
    expect(result.frequency).toBeLessThanOrEqual(222);
    expect(result.probability).toBeGreaterThan(0.85);
  });

  it("accurately detects a 130 Hz sine wave within ±2 Hz", () => {
    const buffer = generateSineWave(130, bufferSize);
    const result = detector.getPitch(buffer);
    expect(result.isVoiced).toBe(true);
    expect(result.frequency).toBeGreaterThanOrEqual(128);
    expect(result.frequency).toBeLessThanOrEqual(132);
  });

  it("marks pure silence as unvoiced", () => {
    const buffer = new Float32Array(bufferSize); // all zeroes
    const result = detector.getPitch(buffer);
    expect(result.isVoiced).toBe(false);
    expect(result.frequency).toBe(0);
  });

  it("correctly calculates Chao 5-level pitch semitones", () => {
    // 200 Hz baseline: lower pitch gives level ~1-2, higher gives level ~4-5
    const low = detector.hzToChaoLevel(120, 200);
    const mid = detector.hzToChaoLevel(200, 200);
    const high = detector.hzToChaoLevel(320, 200);
    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
    expect(mid).toBeCloseTo(3.0, 0.5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run tests/core/audio/pitch-detector.test.ts`  
Expected: FAIL (Cannot find module `@/core/audio/pitch-detector`)

- [ ] **Step 3: Implement minimal YIN pitch detector**

```typescript
// src/core/audio/pitch-detector.ts
export interface PitchResult {
  frequency: number;
  probability: number;
  isVoiced: boolean;
  chaoLevel: number;
}

export class YinPitchDetector {
  private sampleRate: number;
  private bufferSize: number;
  private halfBuffer: number;
  private threshold: number;
  private yinBuffer: Float32Array;

  constructor(sampleRate: number, bufferSize: number, threshold = 0.15) {
    this.sampleRate = sampleRate;
    this.bufferSize = bufferSize;
    this.halfBuffer = Math.floor(bufferSize / 2);
    this.threshold = threshold;
    this.yinBuffer = new Float32Array(this.halfBuffer);
  }

  public getPitch(buffer: Float32Array): PitchResult {
    // Check for silence (RMS energy)
    let sumSquares = 0;
    for (let i = 0; i < buffer.length; i++) {
      sumSquares += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sumSquares / buffer.length);
    if (rms < 0.01) {
      return { frequency: 0, probability: 0, isVoiced: false, chaoLevel: 1.0 };
    }

    // Step 1: Difference Function
    this.yinBuffer.fill(0);
    for (let tau = 0; tau < this.halfBuffer; tau++) {
      for (let i = 0; i < this.halfBuffer; i++) {
        const delta = buffer[i] - buffer[i + tau];
        this.yinBuffer[tau] += delta * delta;
      }
    }

    // Step 2: Cumulative Mean Normalized Difference
    this.yinBuffer[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < this.halfBuffer; tau++) {
      runningSum += this.yinBuffer[tau];
      this.yinBuffer[tau] = runningSum > 0 ? (this.yinBuffer[tau] * tau) / runningSum : 1;
    }

    // Step 3: Absolute Thresholding
    let tauEstimate = -1;
    for (let tau = 2; tau < this.halfBuffer; tau++) {
      if (this.yinBuffer[tau] < this.threshold) {
        while (tau + 1 < this.halfBuffer && this.yinBuffer[tau + 1] < this.yinBuffer[tau]) {
          tau++;
        }
        tauEstimate = tau;
        break;
      }
    }

    if (tauEstimate === -1) {
      return { frequency: 0, probability: 0, isVoiced: false, chaoLevel: 1.0 };
    }

    // Step 4: Parabolic Interpolation
    let betterTau: number;
    const x0 = tauEstimate < 1 ? tauEstimate : tauEstimate - 1;
    const x2 = tauEstimate + 1 < this.halfBuffer ? tauEstimate + 1 : tauEstimate;
    if (x0 === tauEstimate) {
      betterTau = this.yinBuffer[tauEstimate] <= this.yinBuffer[x2] ? tauEstimate : x2;
    } else if (x2 === tauEstimate) {
      betterTau = this.yinBuffer[tauEstimate] <= this.yinBuffer[x0] ? tauEstimate : x0;
    } else {
      const s0 = this.yinBuffer[x0];
      const s1 = this.yinBuffer[tauEstimate];
      const s2 = this.yinBuffer[x2];
      betterTau = tauEstimate + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
    }

    const frequency = this.sampleRate / betterTau;
    const probability = 1 - this.yinBuffer[tauEstimate];

    // Filter to human vocal fundamental frequency [75 Hz, 450 Hz]
    if (frequency < 75 || frequency > 450) {
      return { frequency: 0, probability: 0, isVoiced: false, chaoLevel: 1.0 };
    }

    return {
      frequency,
      probability,
      isVoiced: true,
      chaoLevel: this.hzToChaoLevel(frequency)
    };
  }

  public hzToChaoLevel(hz: number, baselineHz = 200): number {
    // Relative semitone calculation converted to Chao 1-5 scale
    if (hz <= 0) return 1.0;
    const semitones = 12 * Math.log2(hz / baselineHz);
    // Map -8 semitones to level 1, +8 semitones to level 5
    const level = 3.0 + (semitones / 8) * 2.0;
    return Math.max(1.0, Math.min(5.0, level));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run tests/core/audio/pitch-detector.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/audio/pitch-detector.ts tests/core/audio/pitch-detector.test.ts
git commit -m "feat(audio): implement client-side YIN pitch detection engine"
```

---

### Task 3: Mandarin Starter Pack Content & Schema Validation

**Files:**
- Create: `packs/chinese/pack.json`
- Create: `src/core/content/chinese-pack.ts`
- Test: `tests/core/content/chinese-pack.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface ChinesePhraseItem {
    id: string;
    english: string;
    pinyin: string;
    category: "banter" | "dining" | "plans" | "opinions" | "clarifications" | "partings";
    colloquialNote?: string;
    targetContour: number[]; // Array of Chao levels (1.0 - 5.0) sampled at 50ms intervals
    audioRefs?: {
      female?: string;
      male?: string;
    };
  }

  export function getChineseStarterPack(): ChinesePhraseItem[];
  export function validateChinesePack(items: ChinesePhraseItem[]): boolean;
  ```

- [ ] **Step 1: Write the failing tests for Chinese pack validation**

```typescript
// tests/core/content/chinese-pack.test.ts
import { describe, it, expect } from "vitest";
import { getChineseStarterPack, validateChinesePack } from "@/core/content/chinese-pack";

describe("Chinese Starter Pack Content & Schema", () => {
  it("loads at least 25 high-yield conversational phrases", () => {
    const pack = getChineseStarterPack();
    expect(pack.length).toBeGreaterThanOrEqual(25);
  });

  it("ensures all items have valid Pinyin, English, and target pitch contours", () => {
    const pack = getChineseStarterPack();
    expect(validateChinesePack(pack)).toBe(true);
    for (const item of pack) {
      expect(item.pinyin.length).toBeGreaterThan(0);
      expect(item.targetContour.length).toBeGreaterThan(0);
      for (const pt of item.targetContour) {
        expect(pt).toBeGreaterThanOrEqual(1.0);
        expect(pt).toBeLessThanOrEqual(5.0);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run tests/core/content/chinese-pack.test.ts`  
Expected: FAIL (Cannot find module `@/core/content/chinese-pack`)

- [ ] **Step 3: Implement `packs/chinese/pack.json` and loader**

Create `packs/chinese/pack.json` containing 28 verified conversational items spanning Banter (*Nǐ chīle ma?*, *Zuìjìn zěnmeyàng?*), Dining (*Wǒ yào zhège*, *Bú yào tài là*), Plans (*Míngtiān yǒu kòng ma?*), Desires (*Wǒ xiǎng qù...*), Clarifications (*Máfan zài shuō yí cì*), and Partings (*Wǒ xiān zǒule*).

Implement `src/core/content/chinese-pack.ts` to export typed validation and getter.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run tests/core/content/chinese-pack.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packs/chinese/pack.json src/core/content/chinese-pack.ts tests/core/content/chinese-pack.test.ts
git commit -m "feat(content): add curated Social & Daily Life Mandarin starter pack with target pitch contours"
```

---

### Task 4: Interactive 60 FPS Pitch Visualizer Canvas

**Files:**
- Create: `src/components/audio/PitchCanvas.tsx`
- Test: `tests/components/audio/PitchCanvas.test.tsx`

**Interfaces:**
- Produces:
  ```typescript
  export interface PitchCanvasProps {
    targetContour: number[]; // 1.0 - 5.0
    livePitchPoints: Array<{ timeMs: number; chaoLevel: number }>;
    isRecording: boolean;
    className?: string;
  }

  export function PitchCanvas(props: PitchCanvasProps): React.JSX.Element;
  ```

- [ ] **Step 1: Write the failing component test**

```typescript
// tests/components/audio/PitchCanvas.test.tsx
import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { PitchCanvas } from "@/components/audio/PitchCanvas";

describe("PitchCanvas Component", () => {
  it("renders an HTML5 canvas element with aria label", () => {
    const { container } = render(
      <PitchCanvas
        targetContour={[5, 5, 3, 5]}
        livePitchPoints={[]}
        isRecording={false}
      />
    );
    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run tests/components/audio/PitchCanvas.test.tsx`  
Expected: FAIL (Cannot find module `@/components/audio/PitchCanvas`)

- [ ] **Step 3: Implement PitchCanvas component**

Implement `src/components/audio/PitchCanvas.tsx` rendering:
- Horizontal Chao pitch grid (Levels 1 to 5).
- Target tone contour in dashed cyan/slate line (`#38bdf8`).
- User's live vocal trace in solid high-contrast emerald/coral stroke (`#34d399`).
- Smooth cubic bezier interpolation between sample points.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run tests/components/audio/PitchCanvas.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/audio/PitchCanvas.tsx tests/components/audio/PitchCanvas.test.tsx
git commit -m "feat(ui): implement 60 FPS HTML5 PitchCanvas visualizer"
```

---

### Task 5: LM Studio Streaming SSE API & Scaffolding Generator

**Files:**
- Create: `src/app/api/chat/route.ts`
- Test: `tests/api/chat.test.ts`

**Interfaces:**
- Produces:
  - `POST /api/chat`: Accepts `{ messages, scenario, targetLanguage }`, streams response via `ReadableStream` (SSE format).
  - Includes structured parsing for 3 "Never-Freeze" Pinyin reply pills.

- [ ] **Step 1: Write the failing API test**

```typescript
// tests/api/chat.test.ts
import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/chat/route";
import { NextRequest } from "next/server";

describe("POST /api/chat", () => {
  it("returns streaming text or fallback when LM Studio is offline", async () => {
    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: [{ role: "user", content: "Nǐ hǎo!" }],
        scenario: "dining"
      })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run tests/api/chat.test.ts`  
Expected: FAIL (Cannot find module `@/app/api/chat/route`)

- [ ] **Step 3: Implement streaming SSE route with LM Studio proxy**

Implement `src/app/api/chat/route.ts`:
- Sets system prompt for Gemma 26B: Conversational, friendly, spoken Pinyin + English, under 25 words per turn.
- Proxies to `http://127.0.0.1:1234/v1/chat/completions` with `stream: true`.
- If fetch fails (LM Studio not running), streams a graceful local fallback response with simulated scaffolding pills.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run tests/api/chat.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/chat/route.ts tests/api/chat.test.ts
git commit -m "feat(api): implement streaming SSE chat route with LM Studio Gemma 26B integration"
```

---

### Task 6: Conversational Tutor UI & Practice Room

**Files:**
- Create: `src/components/tutor/ConversationalTutor.tsx`
- Create: `src/app/chinese/page.tsx`
- Modify: `src/app/page.tsx` (Add Chinese pack card to dashboard)
- Test: `tests/components/tutor/ConversationalTutor.test.tsx`

**Interfaces:**
- Produces:
  - Full-featured conversational practice surface with dual tabs:
    - **Tab 1: Pushed Output Drills (FSRS v5)**: Flashcards with live pitch canvas, tone sandhi display, and 4 FSRS rating buttons.
    - **Tab 2: AI Conversational Tutor (Gemma 26B)**: Voice wave presence, live streaming turns, 3 "Never-Freeze" Pinyin pills, and micro-correction drawer.
  - Strict compliance with `/impeccable` and `/design-taste-frontend` (Geist typography, dark precision tech).

- [ ] **Step 1: Write the failing tutor UI test**

```typescript
// tests/components/tutor/ConversationalTutor.test.tsx
import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { ConversationalTutor } from "@/components/tutor/ConversationalTutor";
import { getChineseStarterPack } from "@/core/content/chinese-pack";

describe("ConversationalTutor Component", () => {
  it("renders the Pinyin chunk drills and audio controls", () => {
    const items = getChineseStarterPack();
    render(<ConversationalTutor initialItems={items} />);
    expect(screen.getByText(/Social & Daily Life/i)).toBeDefined();
    expect(screen.getByText(/Tap to Speak/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run tests/components/tutor/ConversationalTutor.test.tsx`  
Expected: FAIL (Cannot find module `@/components/tutor/ConversationalTutor`)

- [ ] **Step 3: Implement ConversationalTutor & Page**

Implement `src/components/tutor/ConversationalTutor.tsx` and `src/app/chinese/page.tsx`:
- Integrates `YinPitchDetector` with `navigator.mediaDevices.getUserMedia`.
- Connects to `/api/chat` for streaming AI turns.
- Renders `PitchCanvas`.
- Implements tactile buttons (`-translate-y-[1px]`, `scale-[0.98]`).
- Updates `src/app/page.tsx` dashboard to launch both Pack 1 (Telugu) and Pack 2 (Mandarin Chinese).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run tests/components/tutor/ConversationalTutor.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/tutor/ConversationalTutor.tsx src/app/chinese/page.tsx src/app/page.tsx tests/components/tutor/ConversationalTutor.test.tsx
git commit -m "feat(ui): implement ConversationalTutor room with dual drill and AI sparring modes"
```

---

### Task 7: End-to-End Build & Live Browser Verification

**Files:**
- Test: Run entire Vitest test suite (`pnpm test:run`)
- Build: Verify production Next.js build (`pnpm build`)
- Browser: Live Puppeteer MCP verification against `http://localhost:3000/chinese`

- [ ] **Step 1: Run complete automated test suite**

Run: `pnpm test:run`  
Expected: All test suites PASS (Telugu + Chinese + Audio DSP + Pinyin + FSRS)

- [ ] **Step 2: Run Next.js production build**

Run: `pnpm build`  
Expected: Next.js build succeeds with zero TypeScript or styling errors.

- [ ] **Step 3: Live Browser Verification via Puppeteer MCP**

- Navigate to `http://localhost:3000/chinese`.
- Capture screenshot of Pushed Output drill with Pinyin tone color formatting and pitch visualizer canvas.
- Toggle to AI Conversational Tutor tab and verify audio presence waveform and "Never-Freeze" scaffolding pills.
- Verify zero JavaScript console errors.

- [ ] **Step 4: Commit and push**

```bash
git add .
git commit -m "feat(mandarin): complete end-to-end Mandarin neuro-acoustic spoken tutor"
git push origin main
```
