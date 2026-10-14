# Telugu Learning Platform — Design Spec (DRAFT v0.1)

Status: draft for review. Repo: `pbansal426/telugu`. Date: 2026-10-14.

## 1. Goal & learner
- Learner: zero Telugu; goal is **conversing with family/friends** (spoken, conversational Telugu first; script is a parallel track, not a gate).
- Platform: installable PWA (phone + laptop), mic + audio central.
- Future: multi-language. Engine is language-agnostic; **Telugu = pack #1**, Mandarin = pack #2 (own script module: hanzi/pinyin/tones). Telugu-only features must live in the Telugu pack, never in the engine.

## 2. Why Duolingo falls short (what we beat) — and our answer
| Gap | Evidence-based method | Our feature |
|---|---|---|
| Recognition (tiles, multiple choice) over recall | Retrieval practice / testing effect | Typed + spoken recall by default; MC only for first exposure |
| Coarse, track-bound scheduling | Item-level spaced repetition; FSRS beats SM-2 (~20-30% fewer reviews at same retention) | `ts-fsrs` per item (word, grapheme, chunk, pattern), target retention 90% |
| Isolated translation sentences | Comprehensible input (i+1), graded reading/listening | AI-generated graded mini-stories/dialogues built only from known + 1-2 new items |
| Scripted, constrained output | Output hypothesis, corrective feedback | AI conversation partner with roleplay scenarios and recasts; shadowing with ASR |
| Script learned as flashcards | Decompose abugida: consonant matrix -> vowel signs (guninthalu) -> pollu/virama -> conjuncts | Dedicated Script Trainer (see 4.2) |
| Streak > learning | Learner-model-driven pacing | Progress = measured retrievability per item, not XP |

## 3. Telugu-specific pedagogy
- **Register**: Telugu is diglossic (spoken vs formal/literary). Teach **spoken** Telugu; flag formal forms. Verified example: model output "konali" (= "must buy") for "I want to buy" — natural is closer to "konalani undi / kontanu". AI output must pass validation (sec 5).
- **Romanization**: use one fixed scheme (decide: ISO 15919-lite vs. plain "learner" romanization) shown only as scaffolding, faded out over time.
- **Script order**: 1) high-frequency vowels+consonants with inherent /a/; 2) guninthalu grid per consonant; 3) pollu (virama) and simple clusters; 4) conjuncts grouped by pattern (nasal clusters, geminates, stacked); read-before-write.
- **Phonology early**: retroflex vs dental (ṭ/t), aspirated, long vs short vowels (minimal-pair listening drills).
- **Grammar**: SOV, postpositions, agglutinative suffixes, gender/honorific pronouns; taught as chunks/patterns first, explained after (usage-based).

## 4. Product modules
1. **Core Loop**: daily session = SRS reviews (retrieval) + 1 new-content unit + 1 output task.
2. **Script Trainer**: stroke-order tracing (canvas), grid drills, listen->write, read-aloud words. Telugu pack module.
3. **Vocab/Chunk SRS**: items = lexemes + multiword chunks with audio, example sentence, image optional.
4. **Graded Reader/Listener**: AI-generated stories constrained to learner's known vocabulary; tap-to-gloss; audio.
5. **Conversation Tutor**: scenario roleplay (market, family dinner, phone call), text + voice, hints ladder, post-chat corrections report; mistakes feed back into SRS.
6. **Pronunciation/Shadowing**: record -> ASR -> aligned diff vs target -> feedback.
7. **Sound Lab (HVPT)**: multi-talker minimal-pair listening drills (see 9b).
8. **Learner Model**: per-item FSRS state + skill mastery; drives what content is generated next.

## 5. AI strategy (LM Studio, local-first)
Available locally (LM Studio API at `localhost:1234/v1`, OpenAI-compatible): `google/gemma-4-26b-a4b-qat` (primary, per user), `gpt-oss-20b`, `qwen3.8-27b`, `ornith-1.5-35b-a3b`, `supergemma4-26b`, `gemma-4-e4b` (fast/small), `nomic-embed-text` (embeddings).

Probe result (Gemma 26B, Telugu): vocabulary/script correct and romanization good, **but** register/idiom slips ("konali"), and ~85% of completion tokens were hidden reasoning (818/971) -> slow; plan for token budgets and a no-think/low-effort mode where available.

Principles:
- **Offline-first content**: AI generates in a *content pipeline* (batch), results are reviewed/validated and cached as static packs. Runtime works with the model off. Live LLM used only for Conversation Tutor, and degrades gracefully.
- **Never trust raw generation for target-language truth.** Validation pipeline per item: (a) schema check (b) script/Unicode normalization check (c) round-trip back-translation by a *different* model, similarity threshold (d) vocabulary-constraint check against learner's known set (e) lexicon cross-check (Wiktionary/IndicCorp frequency) (f) review queue for flagged items (self-review; native speakers optional). Confidence + `reviewed` flag stored per item.
- **Model roles**: Gemma 26B = authoring/tutor; Qwen/gpt-oss = independent verifier (cross-model disagreement = flag); gemma-e4b = fast hints/gloss; nomic embeddings = semantic search/dedup of items.
- **Grounding data**: frequency lists, Wiktionary Telugu dumps, Samanantar (en-te pairs), Aksharantar (transliteration), IndicCorp (frequency). Used to seed curriculum ordering and to verify, not to hallucinate.

## 6. Speech
- **TTS**: pre-generate audio into the content pack. Candidates: Indic Parler-TTS (open, controllable), Meta MMS-TTS te (light), `edge-tts` te-IN Shruti/Mohan (best quality but online — build-time only). Evaluate all three on a 50-word set; pick by native-speaker rating. Native recordings from family preferred for core vocabulary where possible.
- **ASR**: Whisper large-v3 / medium (local via faster-whisper or mlx-whisper) behind a Python sidecar; AI4Bharat IndicConformer as alternative. Browser Web Speech API is unreliable for Telugu, so not used.

## 7. Architecture
- **Web**: Next.js (App Router) + TypeScript, PWA (offline shell + cached packs), Tailwind; strong design pass via impeccable/taste skills later.
- **Data**: SQLite (dev) -> Postgres (prod) via Drizzle; user/review-log tables; content packs as versioned JSON + audio files in `packs/<lang>/`.
- **SRS**: `ts-fsrs` (pure functions), review log retained for future parameter optimization.
- **Python sidecar** (FastAPI, uv): `/asr`, `/tts-batch`, content-pipeline CLI; calls LM Studio.
- **Language Pack interface** (engine boundary): `{ id, scriptModule, romanizer, normalizer(text), segmenter(text), curriculum, lexicon, ttsVoice, asrModel }`. Telugu implements it; Mandarin later supplies pinyin/tone/hanzi equivalents.
- **Testing**: Vitest for engine (SRS wiring, pack schema, validators), Playwright for core flows, golden tests for Telugu normalization/romanizer, eval harness scoring AI output against a hand-checked gold set.

## 8. Decomposition (each = own spec -> plan -> build)
0. **Phase 0 spikes** (sec 9c).
1. **Foundations**: repo scaffold, language-pack schema, FSRS review loop, minimal vocab drill, PWA shell.  *(first plan)*
2. Script Trainer (Telugu).
3. Content pipeline + validation + gold set (the trust backbone; arguably do alongside 1).
4. Audio: TTS batch + pronunciation/ASR.
5. Graded reader/listener.
6. Conversation tutor.
7. Learner model & adaptive sequencing; progress UX.
8. Mandarin pack.

## 9. Success criteria (measurable, vs. "feels fun")
- After 30 days @ 20 min/day: read any Telugu syllable (incl. common conjuncts) at >=95% accuracy; ~400 spoken-useful items at >=90% retention; hold a 2-minute scripted market/family conversation.
- AI content error rate on gold set < 5% after validation; zero unreviewed items in "core" pack.

## 9b. Research findings (2026-10-14, deep pass) and what they change
Confidence tags: [T] tested on this Mac today, [S] from web search summaries (secondary; verify before relying), [I] my inference.

**AI authoring reality [T]**
- Gemma 26B and Qwen 27B in LM Studio are "always-think" models: thinking cannot be disabled via `chat_template_kwargs.enable_thinking=false` or `reasoning_effort=low` (both ignored; 1497/1499 and 3997/3999 tokens went to reasoning, empty answer). A 3k-token budget returned nothing for both models.
- Only a large budget works: 8 short sentences took ~6.9k tokens / 143 s (~48 tok/s), 92% reasoning. => Authoring is a **batch/overnight job** with `max_tokens >= 12000`, retries on empty `content`, and resumable queues. Never call these models on a latency-sensitive path. The Conversation Tutor needs a faster path (test `gemma-4-e4b` and `gpt-oss-20b`, which exposes reasoning effort; **not yet tested**) or streamed reasoning with a UX that tolerates ~10-60 s turns.
- Output quality: script and romanization fine; sentences were natural standard-colloquial Telugu, but "telangana_note" fields were generic and **no distinctly Telangana forms appeared**. Conclusion: the model cannot be trusted as a Telangana-dialect source. Dialect layer must be a **hand-curated override table** (source from Telangana speech: IndicVoices/Common Voice/YouTube/subtitles; self-verified), applied on top of generated standard-colloquial content. Treat dialect claims in web summaries as low confidence [S]: one search summary asserted specific Telangana forms I could not corroborate.
- Published research [S] says unverified LLM output in Telugu has high factual-flaw rates and that generate-verify-correct pipelines with a trusted reference reduce them. Supports the validation pipeline in sec 5; the reference corpus is the bottleneck, not the LLM.

**Pedagogy [S]** Duolingo studies show real receptive gains and a productive-skill gap; Pimsleur-style recall-before-reveal audio drills, Glossika-style sentence chunks, and LingQ-style graded input each cover one gap. High Variability Phonetic Training (multiple talkers, varied contexts, forced-choice + instant feedback) is the best-supported way to train the retroflex/dental and long/short contrasts. => Add module **Sound Lab (HVPT)**: multi-talker minimal-pair drills. Talker variety source: edge-tts Shruti + Mohan, Indic Parler-TTS with varied style prompts, and the learner's own recordings later.

**Speech tooling**
- [T] `edge-tts` works on this Mac: `te-IN-ShrutiNeural`, `te-IN-MohanNeural`; Mandarin has many zh-CN voices (good for pack #2). Online service, **build-time only** (cached mp3s in the pack). Its accent is standard, not Telangana [I]; accept for v1 and label audio "standard".
- [S] Whisper large-v3 via `mlx-whisper` runs faster than real time on Apple Silicon; fine-tuned Telugu small/base models report ~13% WER on FLEURS (read speech), so conversational/accented learner speech will be worse. => ASR is for **coarse pronunciation feedback**, not strict grading: compare ASR transcript to target at syllable level with a tolerance, plus show waveform/pitch overlay. Spike required.
- [S] Indic Parler-TTS (~0.9B, Apache-2.0, gated on HF) has no dialect control; runs on PyTorch MPS. Spike required before committing.

**Data [S]** Wiktionary frequency lists (CC BY-SA), Common Voice Telugu (CC0), OpenSLR SLR66 (CC BY-SA 4.0), Tatoeba (few hundred Telugu sentences), Leipzig corpora. Personal-use so licensing is non-blocking, but record provenance.

**Script rendering [S]** Use Noto Sans Telugu (variable) and `Intl.Segmenter('te',{granularity:'grapheme'})` for cluster-safe iteration; never use `String.length`/slice on Telugu. Public stroke-order datasets for Telugu conjuncts are rare, so the Script Trainer must **not** depend on stroke data: use guided glyph tracing over the font outline + shape-similarity check, and treat strict stroke-order grading as out of scope for v1.

**Toolchain [T]** Node v26.8, pnpm 11, uv 0.12 on Python 3.14 (ML wheels, e.g. torch/mlx, may lag 3.14: **pin the sidecar to Python 3.12 via uv** [I]). `ts-fsrs` 5.4.2, Next.js 16.4.0. Hardware: Apple M5 Pro, 48 GB RAM, 208 GB free: Gemma (15.6 GB) + Whisper large-v3 + a TTS model can coexist.

## 9c. Phase 0 spikes (gate before building features)
Each spike has a written pass/fail and results are committed to `docs/spikes/`.
1. **S1 LLM authoring**: build a 100-item hand-checked gold set (items verified against Wiktionary/corpora + self); run Gemma, Qwen, gpt-oss with the validation pipeline; pass = <5% error after validation, with measured cost/time per item.
2. **S2 Tutor latency**: gpt-oss-20b / gemma-e4b conversation turn time; pass = median turn < 15 s or acceptable streaming UX.
3. **S3 TTS bake-off**: edge-tts vs Parler vs MMS on 50 words; pass = self-rated intelligible and no mispronounced conjuncts.
4. **S4 ASR**: record 30 phrases yourself; Whisper large-v3 vs fine-tuned; pass = usable syllable-level match.
5. **S5 Rendering**: Telugu conjuncts render correctly in the PWA across Safari/Chrome; grapheme segmentation unit tests.
6. **S6 FSRS**: ts-fsrs scheduling round-trip persisted in SQLite; property tests (intervals monotonic for Good, lapse behavior).

## 9d. "Works perfectly": quality gates
- Engine: unit tests (Vitest) with >=90% coverage on SRS wiring, scheduler, pack loader/validator, normalization; property-based tests (fast-check) for scheduling invariants.
- Content: CI fails if any `core` item lacks audio, romanization, validation record, or has Unicode that is not NFC; gold-set regression run.
- E2E: Playwright flows (onboarding, daily session, offline session, record+feedback) on Chromium and WebKit; offline mode test via service worker.
- Accessibility/UX: keyboard operable, reduced motion, contrast AA, Telugu font fallback test.
- Data safety: review-log append-only, nightly SQLite backup, export/import.
- Graceful degradation: every AI/ASR/TTS feature has a defined behavior when LM Studio or the sidecar is down.
- Process: TDD, small commits, verification-before-completion before any "done" claim; worktree per sub-project.

## 10. Decisions (resolved 2026-10-14)
- **Dialect**: Telangana Telugu. Pack tags dialect-specific vocabulary/forms; audio voices should be checked for Telangana-appropriate pronunciation (standard TTS voices skew coastal/standard Andhra; validate against native speakers and note as risk).
- **Audience/hosting**: personal use only, runs on this Mac. Dataset/voice licensing is non-blocking (still record sources), no multi-user auth needed initially.
- **Native-speaker review**: not required. Validation relies on cross-model checks, lexicon/corpus grounding, and a hand-checked gold set; native speakers (if ever available) are an optional upgrade, not a dependency.

## 11. Open questions
- Romanization scheme choice.
- How to get Telangana-accurate audio without native recordings (evaluate TTS outputs on spoken Telangana forms; fall back to recording own voice after learning).
