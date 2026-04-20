# Implementation Plan: Vocabulary Tool with CSV Import and Spaced Repetition

**Branch**: `009-vocab-tool` | **Date**: 2026-04-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-vocab-tool/spec.md`

## Summary

Adds a user-driven vocabulary mode to the existing Turkish quiz app. Users upload a CSV of term/translation pairs, the app builds a named deck, auto-generates 4-option multiple-choice questions (with distractors borrowed from other user decks or built-in content when needed), and schedules review using a lightweight spaced-repetition algorithm (SM-2-style). All vocabulary data, answer events, and per-item review state live in Firebase Realtime Database under a per-user subtree; the UI is vanilla JS reusing the existing quiz/session patterns.

## Technical Context

**Language/Version**: HTML5, CSS3, vanilla JavaScript (ES6+) — no build tools per Constitution III
**Primary Dependencies**: Firebase Realtime Database client SDK (already loaded in `index.html`). No new dependencies; CSV parsing implemented in vanilla JS.
**Storage**: Firebase Realtime Database — new `vocabulary/{userId}` subtree for decks, items, and answer-event history; `database.rules.json` extended with per-user read/write rules scoped to that subtree.
**Testing**: Manual browser testing across one mobile and one desktop viewport (per Constitution Workflow). A small set of vanilla-JS unit tests for the CSV parser and SRS interval calculator under `tests/vocab/`, runnable in-browser with a zero-dependency runner.
**Target Platform**: Evergreen desktop + mobile browsers (Chrome, Firefox, Safari, Edge — latest two majors).
**Project Type**: Single client-side SPA (existing `index.html` entrypoint); no server-side code added.
**Performance Goals**: Import of 2,000-row CSV ≤ 10 s on a mid-range laptop; review-view load ≤ 2 s for a 1,000-item deck (SC-005); MCQ generation ≤ 50 ms per question.
**Constraints**: Purely client-side (Constitution III); must preserve Turkish-specific characters (SC-006); must degrade gracefully when Firebase is offline (vocabulary is user state, not curriculum, so sync-on-reconnect is acceptable).
**Scale/Scope**: Per-user scope — up to 2,000 rows per single upload (FR-016), practical deck size target of 1,000 items, multi-device read/write with last-write-wins by event timestamp.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Content Accuracy | ✅ Pass | User-supplied vocabulary is user-owned content, not curriculum. The spec still requires "one unambiguously correct answer" per MCQ (SC-003) and plausible distractors (FR-014's fallback rules prevent nonsensical choices). |
| II. Progressive Difficulty | ✅ N/A | Vocabulary tool is orthogonal to CEFR-organized curriculum; it coexists in the sidebar alongside existing decks. |
| III. Simplicity & Vanilla Stack | ✅ Pass | No build tools, no frameworks, no new runtime dependencies. CSV parsing, SRS scheduling, and UI rendering are all vanilla JS. |
| IV. Responsive & Accessible UI | ✅ Pass | New upload view and review view reuse existing layout/sidebar patterns, 44×44 touch targets, and icon-plus-color feedback. |
| V. Data Persistence | ⚠️ Pass with interpretation | Principle V says "Quiz content … MUST live in `js/questions.js` as a static data structure — not fetched at runtime." Interpretation: that rule governs *curriculum* content, not user-generated content. User-imported vocabulary is closer to user state (flagged cards, retry pool) and correctly belongs in Firebase. `database.rules.json` is updated to reflect the new schema, satisfying the schema-sync clause. Recorded in Complexity Tracking. |

All gates pass; one nuance recorded under Complexity Tracking rather than a hard violation.

## Project Structure

### Documentation (this feature)

```text
specs/009-vocab-tool/
├── plan.md              # This file
├── spec.md              # Feature spec (already written)
├── research.md          # Phase 0 output — decisions + rationale
├── data-model.md        # Phase 1 output — entities, Firebase schema, derivations
├── quickstart.md        # Phase 1 output — developer walkthrough of the feature
├── contracts/           # Phase 1 output — UI contract + Firebase data contract + CSV contract
│   ├── csv-format.md
│   ├── firebase-schema.md
│   └── ui-contract.md
├── checklists/
│   └── requirements.md  # Already written during /speckit-specify
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
index.html                        # Extended: add "Vocabulary" section in the sidebar and entry points for Upload + Review views
css/
└── style.css                     # Extended: styles for upload dropzone, deck list, review view
js/
├── questions.js                  # Unchanged (curriculum content only)
├── quiz.js                       # Extended: reuse existing session/rendering helpers; export a couple of helpers for vocab mode to consume
└── vocab/                        # NEW — all vocabulary-mode logic, kept isolated
    ├── csvImport.js              # CSV sniff (delimiter + header), parse, validate, dedupe
    ├── deckStore.js              # Firebase read/write for decks + items + answer events (per-user scope)
    ├── mcqGenerator.js           # Build 4-option MCQ with distractor fallback per FR-014
    ├── srsScheduler.js           # Pure-function interval/ease calculator (SM-2-style); derives Review Record from answer-event history
    ├── vocabUI.js                # View renderers: Upload, DeckList, Quiz, Review
    └── vocabSession.js           # Session state machine — pick next item, record answer, advance
tests/
└── vocab/                        # NEW — zero-dep, in-browser test harness
    ├── index.html                # Loads each test module and prints pass/fail
    ├── test-csvImport.js
    ├── test-srsScheduler.js
    └── test-mcqGenerator.js
database.rules.json               # Extended: add rules for /vocabulary/{uid}/** restricting read/write to the owning user
```

**Structure Decision**: Single-project SPA. A dedicated `js/vocab/` folder isolates the new feature while keeping the root `js/quiz.js`, `js/questions.js`, and `index.html` backward-compatible. Tests live alongside feature code under `tests/vocab/` using the existing "runnable in a browser, no build step" convention.

## Complexity Tracking

| Violation / Nuance | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Storing quiz-like content (vocabulary items + distractors) outside `js/questions.js` and fetching from Firebase at runtime | User-generated vocabulary is inherently per-user and mutable at runtime; it cannot be compiled into a static data file. Firebase is already the app's mechanism for per-user state (flagged, progress, retry pool). | Bundling into `js/questions.js` would require a build step or user-specific static files — both violate Constitution III harder than the Principle V interpretation does. Local-storage-only was considered but conflicts with FR-004's "available across sessions and devices" requirement. |
| Per-(deck, item) Review Record derived from an append-only answer-event log rather than a single mutable row | Required by the Q3 clarification (last-write-wins by event timestamp for multi-device convergence); an event log is the simplest structure that produces deterministic state from concurrent writes. | A single mutable review row would lose updates under concurrent writes or require vector clocks / custom CRDTs — significantly more complexity than appending events keyed by timestamp. |
