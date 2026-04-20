# Phase 0 Research: Vocabulary Tool

**Feature**: 009-vocab-tool
**Date**: 2026-04-20

All five open questions were resolved during `/speckit-clarify` (see `spec.md` → Clarifications → Session 2026-04-20). This document covers the remaining technology-choice and best-practice research items implied by the Technical Context.

---

## R1 — CSV parsing in vanilla JS (no new dependencies)

**Decision**: Implement a small hand-written CSV reader in `js/vocab/csvImport.js` that handles RFC-4180-style quoting (double quotes, escaped double quotes inside quoted fields, embedded newlines inside quoted fields) plus the three delimiters we support (comma, semicolon, tab). No PapaParse or similar library.

**Rationale**:
- Constitution III bans new dependencies unless unavoidable. A 100–150-line parser covers everything the spec requires (auto-detect delimiter from first non-empty line, auto-detect header row, preserve Turkish characters when read as UTF-8) and is far smaller than pulling PapaParse via CDN.
- Firing the parser on a string obtained from `File.text()` gives us native UTF-8 decoding with zero encoding trickery, satisfying SC-006.
- Keeping it vanilla keeps the test strategy simple: a handful of input fixtures + assertions in `tests/vocab/test-csvImport.js`.

**Alternatives considered**:
- **PapaParse via CDN** — would work but a ~50 KB extra dependency for a parser we fully specify ourselves violates the spirit of Principle III.
- **Browser's built-in `FileReader` + manual `split(",")`** — does not handle quoted fields containing the delimiter or embedded newlines; would fail on common Excel/Google-Sheets exports.

**Algorithm (summary)**:
1. Read file as UTF-8 text.
2. Sniff the first non-empty line: count commas, semicolons, tabs; pick the delimiter with the highest count (ties → comma). This matches the clarified Q5 behavior.
3. Parse the full text with a small state machine handling quoted fields.
4. Detect header: if every cell in row 0 is non-empty and no later row is exactly equal to row 0, treat row 0 as a header; otherwise treat all rows as data.
5. Yield `{ term, translation, extras: {...} }` records — `extras` is a map of any additional column header → value pairs (preserved per FR-002).

---

## R2 — Spaced repetition algorithm

**Decision**: Adopt a simplified SM-2 variant with four-button grading collapsed to two outcomes (correct / incorrect), since the quiz UI is binary MCQ. Parameters: initial interval 1 day, second interval 3 days, thereafter `interval = previous_interval × ease`, where `ease` starts at 2.5, decreases by 0.2 on incorrect (floor 1.3), and increases by 0.1 on correct (cap 3.0). On incorrect, reset interval to 1 day and keep the adjusted ease. All intervals in whole days; next-review due date computed as `last_seen_date + interval_days`.

**Rationale**:
- SM-2 is the de-facto standard for flashcard SRS (Anki, Mnemosyne variants), well-studied, and small enough to implement in ~30 lines of pure JS.
- A binary grading signal is the only data the MCQ quiz produces; forcing a 4-button grade into the UI would complicate the existing quiz flow.
- The parameter set above satisfies SC-004 ("items answered correctly twice are scheduled ≥3 days out" — first correct → 1 day, second correct → 3 days; "items gotten wrong are surfaced within 1 day" — incorrect resets interval to 1).
- Makes the Review Record a pure function of the answer-event sequence, directly supporting the Q3 clarification (derive by replay, last-write-wins by event timestamp).

**Alternatives considered**:
- **FSRS (Free Spaced Repetition Scheduler)** — more accurate but requires per-user parameter training and a review-log-based optimizer. Overkill for v1 and significantly more code.
- **Leitner boxes (fixed 5-stage)** — simpler but doesn't grow intervals multiplicatively and would not satisfy SC-004 without arbitrary per-box interval tweaking.
- **Half-life regression models** — interesting but require retraining and introduce float drift; hard to validate deterministically under the event-replay model.

---

## R3 — Firebase schema layout for per-user vocabulary

**Decision**: Store everything under `/vocabulary/{uid}/` with three children: `decks/{deckId}`, `items/{deckId}/{itemId}`, and `events/{deckId}/{itemId}/{pushId}`. Event records are append-only; the Review Record for any (deck, item) is derived on read by scanning its events subtree in ascending key order (Firebase push IDs are timestamp-ordered). A materialized `reviewState/{deckId}/{itemId}` cache is written after each answer for fast "due today" queries but is always refreshable from the event log.

**Rationale**:
- Matches the shape of existing user-state subtrees in this project (flagged, retry pool) so `database.rules.json` extensions follow the established pattern.
- Push IDs are chronologically ordered and globally unique, making multi-device convergence trivial (Q3 clarification).
- Splitting `decks` / `items` / `events` avoids the classic RTDB antipattern of fetching a 10 MB parent to read one child; the client only subscribes to the deck it's actively using.
- The `reviewState` cache keeps the Review view responsive (SC-005) without sacrificing the "derive from events" invariant: on every answer, the client recomputes the state from events and writes the cache.

**Schema sketch** (formalized in `contracts/firebase-schema.md`):

```json
{
  "vocabulary": {
    "<uid>": {
      "decks": {
        "<deckId>": { "name": "...", "createdAt": 1713..., "description": "..." }
      },
      "items": {
        "<deckId>": {
          "<itemId>": { "term": "...", "translation": "...", "extras": { ... } }
        }
      },
      "events": {
        "<deckId>": {
          "<itemId>": {
            "<pushId>": { "ts": 1713..., "correct": true, "direction": "termToTranslation" }
          }
        }
      },
      "reviewState": {
        "<deckId>": {
          "<itemId>": { "interval": 3, "ease": 2.6, "dueDate": "2026-04-23", "streak": 2, "lastSeen": 1713... }
        }
      }
    }
  }
}
```

**Security rules**: add `".read"` and `".write"` scoped to `auth.uid === $uid` on `/vocabulary/$uid` — mirrors existing `flagged` and retry-pool rules.

**Alternatives considered**:
- **Single flat `/vocabulary/{uid}/{deckId}/{itemId}/{field}` tree** — simpler but forces the client to fetch events together with static fields every time.
- **Firestore instead of RTDB** — would introduce a second Firebase product (Firestore) alongside RTDB just for this feature; rejected per Principle III's "single external service" spirit.
- **Materialize review state only, drop the event log** — smaller storage but loses multi-device conflict resolution (Q3); rejected.

---

## R4 — MCQ distractor selection & fallback

**Decision**: Within a session, build distractors by this priority:
1. Up to 3 distinct translations from *other* items in the same deck, weighted toward items the learner has recently seen (to reinforce discrimination between confusable words).
2. If step 1 yields fewer than 3, pull from the user's *other* vocabulary decks (any deck, same user).
3. If still short, pull from the answer field of built-in questions in `js/questions.js` (filter to strings that don't contain sentence-ending punctuation to avoid grabbing grammar-example sentences).
4. If still short, block the quiz and surface the warning required by the revised FR-014.

Candidates are deduplicated case-insensitively against the correct answer *and* against each other before selection.

**Rationale**:
- Directly implements the Q1 clarification behavior.
- Step 1 weighting is a small, well-known trick that makes early quizzes feel more "honest" for users with a small first deck.
- Step 3 reuses existing offline-available data so the feature degrades well with poor connectivity.
- Deduplication rule matches FR-003/Q2 (case-insensitive + trimmed).

**Alternatives considered**:
- **Random distractors from a shared pool regardless of deck** — dilutes the learning signal; users reported in similar apps that obviously-unrelated distractors are disengaging.
- **Generate fake/scrambled distractors** — rejected in Q1 (violates SC-003 "distractors are never identical to the correct answer" spirit — they'd be identifiable as non-real words).

---

## R5 — UI integration with existing sidebar

**Decision**: Add a new top-level sidebar section `Vocabulary` with three pinned entries (Upload, My Decks, Review) plus a dynamic sub-list of the user's decks. Render it using the same DOM helpers `js/quiz.js` already uses for curriculum decks, so styling, collapse behavior, and dark-mode support come for free.

**Rationale**:
- Reuses Principle IV compliance already in the existing sidebar (collapsible on mobile, 44×44 targets, dark-mode tokens).
- Keeps mental model consistent: user thinks of their imported vocabulary as "just another deck group" in the same surface area.

**Alternatives considered**:
- **Separate page / route** — app is a single-HTML SPA with hash-style navigation; introducing a route layer would require refactoring the existing view switcher. Rejected as needless complexity.

---

## No unresolved clarifications

There are no remaining `NEEDS CLARIFICATION` markers from Technical Context. All five spec-level clarifications were resolved prior to planning; the research decisions above extend those clarifications into concrete technical choices without opening new questions.
