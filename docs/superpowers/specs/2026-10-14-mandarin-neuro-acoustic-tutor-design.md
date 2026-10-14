# Spoken Mandarin Neuro-Acoustic Tutor: Design Specification

**Date**: 2026-10-14  
**Author**: Antigravity & User  
**Status**: Approved & Ready for Implementation Plan  

---

## 1. Problem Statement & Neurological Objective

### The Core Problem with Traditional Apps
Traditional language learning platforms (such as Duolingo) fail to produce conversational fluency because they train **Declarative Memory** (hippocampus and temporal lobes): learners memorize abstract grammar rules, match visual flashcards, and translate isolated words. When speaking in real-time, the brain experiences cognitive overload because retrieving declarative facts requires conscious, slow lexical translation.

Furthermore, adult non-tonal speakers natively process pitch in the **right hemisphere** as emotion or pragmatics. In Mandarin Chinese, pitch changes lexical meaning. Without targeted acoustic conditioning, adults experience severe tonal deafness and freeze under real-time conversational pressure (Krashen's **Affective Filter** / amygdala threat response).

### The Neurological Objective
This system engineers rapid spoken Mandarin fluency by targeting **Procedural Memory** (basal ganglia, motor cortex, and Broca's area) through the methods pioneered by viral speaking applications (e.g. *Speak*, *Langua*):
1. **Zero Orthographic Burden**: Eliminate Hanzi character reading and writing entirely. Focus 100% on spoken conversational fluency, utilizing **Romanized Hanyu Pinyin** as the primary visual-phonetic anchor (analogous to speaking fluent Hindi without knowing the Devanagari script).
2. **High-Variability Phonetic Training (HVPT)**: Based on research by Wong and Chandrasekaran, expose the auditory brainstem to multiple native voices (male/female, varying pitch baselines) to rewire tonal categorization to the left superior temporal gyrus.
3. **Auditory-Motor Integration via Real-Time $F_0$ Pitch Tracing**: Live client-side pitch detection (YIN algorithm) draws the learner's fundamental frequency contour in real time against the native speaker's contour on an HTML5 canvas.
4. **Pushed Output under Mild Temporal Pressure**: Merrill Swain's Pushed Output hypothesis implemented through rapid vocal drills and live conversational sparring with local **Gemma 26B** in LM Studio.
5. **Never-Freeze Scaffolding**: Dynamic situational Pinyin suggestion pills to sustain the conversational habit loop and eliminate speech anxiety.

---

## 2. Scope & Target Domain

* **Target Language & Dialect**: Standard Mandarin Chinese (Putonghua, Northern/Beijing colloquial conversational cadence).
* **Script / Modality**: Spoken audio and **Romanized Pinyin with Tone Diacritics**. No Chinese characters (Hanzi) are required or enforced.
* **Domain Focus**: **Social & Daily Life** (Casual banter, making friends, ordering food/drinks, asking questions, expressing feelings, planning outings, social partings).
* **AI Engine**: Local **Gemma 26B** running in LM Studio at `http://127.0.0.1:1234/v1` on Apple Silicon (M5 Pro), integrated via Next.js streaming Server-Sent Events (SSE).
* **Hardware & Runtime**: Local-first Next.js 15+ App Router, Node 22+ native SQLite (`node:sqlite`), client-side Web Audio DSP, mobile-first installable PWA.

---

## 3. Architecture & System Topology

```
+-----------------------------------------------------------------------------------------+
|                               Browser Client (Next.js 15+)                              |
|                                                                                         |
|  +---------------------------+  +--------------------------+  +----------------------+  |
|  | Web Audio DSP Engine      |  | Real-Time Canvas         |  | Scaffolding Engine   |  |
|  | - MediaStream mic capture |  | - 60 FPS F0 pitch curve  |  | - "Never-Freeze"     |  |
|  | - YIN autocorrelation     |  | - Target tone overlay    |  |   Pinyin pills       |  |
|  +---------------------------+  +--------------------------+  +----------------------+  |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  | UI Surfaces (Linear/Teenage Engineering Dark Precision Tech, Geist Typography)    |  |
|  | - Mode A: Spaced Retrieval Chunks (FSRS v5)                                       |  |
|  | - Mode B: Live AI Conversational Sparring (Voice & Waveform Presence)             |  |
|  +-----------------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------------+
                                             ▲
                                             │ SSE Stream / REST
                                             ▼
+-----------------------------------------------------------------------------------------+
|                               Next.js Backend API Layer                                 |
|                                                                                         |
|  +-----------------------------+  +--------------------------+  +--------------------+  |
|  | /api/chat (SSE Stream)      |  | /api/tts (Audio Cache)   |  | SQLite Storage     |  |
|  | Proxy to LM Studio Gemma26B |  | Neural audio synthesizer |  | FSRS v5 card state |  |
|  +-----------------------------+  +--------------------------+  +--------------------+  |
+-----------------------------------------------------------------------------------------+
                                             ▲
                                             │ OpenAI-compatible HTTP (:1234/v1)
                                             ▼
+-----------------------------------------------------------------------------------------+
|                             Local LM Studio (M5 Pro Silicon)                            |
|                            Model: Gemma 26B (`google/gemma-2-26b-it`)                   |
+-----------------------------------------------------------------------------------------+
```

---

## 4. Subsystems & Detailed Specifications

### 4.1 Real-Time Audio DSP & Pitch Extraction Engine (`src/core/audio/pitch-detector.ts`)
* **Audio Input**: Captures user microphone via `navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } })`.
* **DSP Processing**: Runs via Web Audio API `AudioContext` and `AnalyserNode` (FFT size 2048, sample rate 44.1kHz / 48kHz).
* **Algorithm**: Optimized time-domain **YIN autocorrelation algorithm**:
  * Step 1: Difference function calculation.
  * Step 2: Cumulative mean normalized difference function.
  * Step 3: Absolute thresholding (dip detection at threshold ~0.10–0.15).
  * Step 4: Parabolic interpolation for sub-bin pitch resolution.
* **Pitch Range & Voicing Filter**: Tracks fundamental frequency $F_0$ strictly between **75 Hz and 450 Hz**. Discards unvoiced noise, sibilants (*s, c, x*), and breaths.
* **Canvas Visualizer (`src/components/audio/PitchCanvas.tsx`)**:
  * Renders at 60 FPS using `requestAnimationFrame`.
  * Y-axis: Normalized semitone / Chao 5-level scale (Level 1: bottom, Level 5: top).
  * X-axis: Time (0.0s to 2.5s).
  * Background curve: Target native contour for the current Pinyin phrase (semi-transparent guide).
  * Foreground curve: User's live vocal contour drawing dynamically in real time.
  * Score: Calculates mean square error (contour alignment and slope) to provide immediate visual feedback.

### 4.2 Romanized Pinyin & Tone Sandhi Scaffolding
* **Synesthetic Tone Palette**:
  * Tone 1 (High Level, 55): `#F87171` (Coral Red)
  * Tone 2 (Rising, 35): `#34D399` (Emerald Green)
  * Tone 3 (Low Dipping, 214): `#FBBF24` (Amber)
  * Tone 4 (High Falling, 51): `#60A5FA` (Cobalt Blue)
  * Tone 5 / Neutral (0): `#94A3B8` (Muted Slate)
* **Pinyin Formatter (`src/core/text/pinyin.ts`)**:
  * Splits text into cognitive word compounds (e.g. *Zěnme yàng?* rather than isolated characters).
  * Applies **Tone Sandhi Rules**:
    * **3 + 3 &rarr; 2 + 3**: Automatically identifies consecutive 3rd tones and annotates the surface phonetic shift (e.g. *nǐ hǎo* &rarr; pronounced *ní hǎo*).
    * **Bù Sandhi**: *bù* becomes *bú* before a 4th tone (*bù* + *shì* &rarr; *bú shì*).
    * **Yī Sandhi**: *yī* changes to 4th tone *yì* before 1st/2nd/3rd tones, and 2nd tone *yí* before 4th tones.

### 4.3 Multi-Speaker HVPT Audio Pipeline
* **High-Variability Audio Clips**:
  * Stored in `packs/chinese/audio/`.
  * Every core phrase has two native audio references:
    * `speaker_a_female.mp3`: Higher pitch baseline (~220 Hz).
    * `speaker_b_male.mp3`: Lower pitch baseline (~120 Hz).
* **Audio Synthesis Fallback**: When pre-recorded audio is absent, the backend proxies to neural TTS voices (`zh-CN-XiaoxiaoNeural` and `zh-CN-YunxiNeural`).

### 4.4 Procedural Practice Modes

#### Mode 1: Pushed Output Chunks (FSRS v5 Engine)
* **Goal**: Automaticity of high-frequency social chunks under temporal pressure.
* **Pack Content (`packs/chinese/pack.json`)**: 100+ high-yield conversational chunks across 6 initial modules:
  1. *Immediate Banter & Greetings* ("What's up?", "Long time no see", "Have you eaten?")
  2. *Ordering & Dining* ("Can I get this one?", "Not too spicy", "Check please")
  3. *Making Plans & Time* ("Are you free tomorrow?", "Let's meet at 7", "Where are you?")
  4. *Expressing Desires & Opinions* ("I feel like...", "That's awesome", "No worries")
  5. *Casual Clarification* ("What did you say?", "Say it again slowly", "Got it!")
  6. *Social Parting* ("I'm heading out first", "Text me when you get home", "See you soon")
* **Rating & Spaced Repetition**: After each vocal attempt, user selects FSRS rating (Again / Hard / Good / Easy) updating stability and retrievability targeting 90%.

#### Mode 2: Live AI Conversational Tutor (Gemma 26B)
* **Goal**: Free-flowing conversational banter without fear of embarrassment (zero affective filter).
* **Streaming SSE Endpoint (`src/app/api/chat/route.ts`)**:
  * Connects to `http://127.0.0.1:1234/v1/chat/completions`.
  * Enforces low-latency conversational persona via system prompt:
    * *Persona*: A warm, natural, colloquial Chinese friend in Beijing/Chengdu.
    * *Format constraint*: Must output 10–25 words per turn strictly in Romanized Pinyin with tone marks followed by English translation.
    * *Pacing*: Short back-and-forth conversational exchanges (never lecture or write paragraphs).
* **"Never-Freeze" Scaffolding Generator**:
  * Alongside each AI conversational turn, Gemma returns 3 short suggested Pinyin replies that the user can immediately speak.
* **Micro-Correction Drawer**:
  * Analyzes the learner's transcript and logs a 1-line gentle native phrasing tip without interrupting the banter.

---

## 5. UI/UX Design System (Adhering to `/impeccable` & `/design-taste-frontend`)

* **Visual Identity**: **Dark Precision Tech** (inspired by Linear, Teenage Engineering, and Dieter Rams).
* **Anti-Slop Hard Rules**:
  * NO generic purple/violet glow blobs or AI gradients.
  * NO centered hero with three identical cards.
  * NO hand-drawn fake screenshot divs.
  * NO generic emoji clutter; replace with crisp, single-stroke icons (`@phosphor-icons/react`).
* **Typography**:
  * Interface & Pinyin: `Geist` (clean geometric sans with crisp diacritical rendering).
  * Metrics, pitch Hz, timers: `Geist Mono`.
* **Color Specification**:
  * Background: Pure obsidian `#09090b` (Zinc 950) with subtle structural borders `#27272a` (Zinc 800).
  * Foreground: High-contrast white `#f4f4f5` (Zinc 100) and muted text `#a1a1aa` (Zinc 400).
  * Interactive Accent: Single Electric Cobalt `#3B82F6` with tactile `-translate-y-[1px]` and `scale-[0.98]` physical push feedback.
* **Viewport Stability**: Standardized on `min-h-[100dvh]` to eliminate mobile address-bar layout jumping.

---

## 6. Persistence & Storage (`src/core/storage/`)

* Uses Node 22+ built-in `node:sqlite` (`DatabaseSync`) in WAL mode for persistent zero-dependency storage.
* Tables:
  * `cards`: `id`, `pack_id`, `prompt`, `pinyin`, `tone_contour_ref`, `difficulty`, `stability`, `due`, `state`.
  * `reviews`: `id`, `card_id`, `rating`, `review_time`, `pitch_accuracy_score`.
  * `conversations`: `id`, `scenario_id`, `history_json`, `created_at`.

---

## 7. Testing & Verification Plan

1. **Unit Tests (Vitest)**:
   * `pitch-detector.test.ts`: Verify YIN algorithm correctly computes known test sine wave frequencies (100 Hz, 220 Hz, 440 Hz) within $\pm 2$ Hz.
   * `pinyin.test.ts`: Verify tone sandhi rules (3+3, bù, yī) transform correctly and format diacritics.
   * `fsrs-scheduler.test.ts`: Verify FSRS scheduling state transitions.
2. **Integration & API Tests**:
   * Test `/api/chat` streaming proxy with LM Studio mock and live endpoint.
   * Test `/api/audio` cache and audio streaming.
3. **Live Browser Verification (Puppeteer MCP)**:
   * Verify audio permission handling and mock audio worklet on Next.js dev server.
   * Verify Canvas 60 FPS rendering without memory leaks.
   * Verify conversational turn-taking with Gemma 26B.
