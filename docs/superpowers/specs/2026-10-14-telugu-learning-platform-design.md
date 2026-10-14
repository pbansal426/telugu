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
7. **Learner Model**: per-item FSRS state + skill mastery; drives what content is generated next.

## 5. AI strategy (LM Studio, local-first)
Available locally (LM Studio API at `localhost:1234/v1`, OpenAI-compatible): `google/gemma-4-26b-a4b-qat` (primary, per user), `gpt-oss-20b`, `qwen3.8-27b`, `ornith-1.5-35b-a3b`, `supergemma4-26b`, `gemma-4-e4b` (fast/small), `nomic-embed-text` (embeddings).

Probe result (Gemma 26B, Telugu): vocabulary/script correct and romanization good, **but** register/idiom slips ("konali"), and ~85% of completion tokens were hidden reasoning (818/971) -> slow; plan for token budgets and a no-think/low-effort mode where available.

Principles:
- **Offline-first content**: AI generates in a *content pipeline* (batch), results are reviewed/validated and cached as static packs. Runtime works with the model off. Live LLM used only for Conversation Tutor, and degrades gracefully.
- **Never trust raw generation for target-language truth.** Validation pipeline per item: (a) schema check (b) script/Unicode normalization check (c) round-trip back-translation by a *different* model, similarity threshold (d) vocabulary-constraint check against learner's known set (e) lexicon cross-check (Wiktionary/IndicCorp frequency) (f) human review queue for flagged items (you + native-speaker friends/family). Confidence + `reviewed` flag stored per item.
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

## 10. Open questions
- Romanization scheme choice.
- Dialect target (Andhra vs Telangana) for audio/vocabulary.
- Access to native speakers for review/recordings.
- Hosting: personal-only on this Mac vs public deploy (affects licensing of datasets/voices; Indic Parler-TTS is Apache-2.0, check each dataset license).
