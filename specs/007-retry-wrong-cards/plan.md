# Implementation Plan: Retry Wrong Cards Until Mastered

**Branch**: `007-retry-wrong-cards` | **Date**: 2026-04-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-retry-wrong-cards/spec.md`

## Summary

At the end of a normal deck session, instead of going straight to results, the app enters a retry phase containing every card the learner answered incorrectly during the session. The retry phase loops — any retry card answered wrong goes to the end of the retry queue and must come back around — until the pool is empty, at which point the existing results screen is shown with the learner's unchanged first-pass score. A one-shot intermediate banner ("Retry phase: N cards to master") signals the transition; during retry the main progress bar is hidden in favor of a text "N cards left to master" indicator, and the Score label is swapped for a "Retry" label. Implementation is entirely client-side state changes inside `js/quiz.js` plus small DOM/CSS additions; no new dependencies and no Firebase schema changes.

## Technical Context

**Language/Version**: HTML5, CSS3, vanilla JavaScript (ES6+) — no build tools (per Constitution III)
**Primary Dependencies**: None added. Firebase Realtime Database client SDK already loaded in `index.html` remains unchanged.
**Storage**: In-memory session state only for the retry pool. No persistence across sessions (per FR-014). No Firebase schema changes.
**Testing**: Manual browser testing on at least one mobile and one desktop viewport (per constitution Development Workflow). Lightweight console/manual verification against the acceptance scenarios in `spec.md`.
**Target Platform**: Modern evergreen browsers (Chrome, Firefox, Safari, Edge — latest two major versions).
**Project Type**: Single-page static web app.
**Performance Goals**: No measurable perf impact — retry logic is O(N) over a small (≤ deck size) in-memory array; card transitions remain instant like the existing main-pass flow.
**Constraints**: No server-side code (constitution II/III); no new CDN scripts; styles stay in `css/style.css`; touch targets remain ≥44×44; color-only cues are paired with text.
**Scale/Scope**: Decks in `js/questions.js` are small (tens of cards each). Single-user client session.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance |
| --- | --- |
| I. Content Accuracy | Unaffected — no quiz content changes. |
| II. Progressive Difficulty | Unaffected — no unit/section ordering changes. |
| III. Simplicity & Vanilla Stack | PASS — pure vanilla JS changes in `js/quiz.js`, CSS in `css/style.css`, markup in `index.html`. No new dependencies. |
| IV. Responsive & Accessible UI | PASS — new retry banner/indicators reuse existing responsive layout; text accompanies any color cue; touch targets ≥44×44 preserved. |
| V. Data Persistence | PASS — retry pool is in-memory, per-session only (FR-014). No Firebase schema change, no `database.rules.json` change. Static quiz content remains in `js/questions.js`. |
| Technology Constraints (no server-side code, no new deps, Firebase-only external service) | PASS — no new backends, no new libraries, no AI calls added. |

**Result**: All gates pass. No complexity tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/007-retry-wrong-cards/
├── plan.md              # This file
├── spec.md              # Feature specification (with Clarifications)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── ui-contract.md   # Phase 1 output — UI/DOM contract (no network APIs)
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit.specify)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
index.html               # Add retry banner element + text indicator element
css/
└── style.css            # Styles for retry banner, retry label, text progress
js/
├── questions.js         # Unchanged
└── quiz.js              # Core change: retry pool state + phase transitions + UI swaps
sounds/                  # Unchanged
functions/               # Unchanged (AI "Why?" explainer Cloud Function)
api/                     # Unchanged (Vercel Serverless Function for explainer)
```

**Structure Decision**: This feature touches only [index.html](../../index.html), [css/style.css](../../css/style.css), and [js/quiz.js](../../js/quiz.js). No new files, no module restructure, no Firebase rules changes. The retry pool and phase state live as module-scoped variables alongside the existing `quizData`, `current`, `score`, `answered`, `isFlaggedMode` state in [js/quiz.js](../../js/quiz.js).

## Complexity Tracking

*No constitution violations — no entries required.*
