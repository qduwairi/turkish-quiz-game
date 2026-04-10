# Implementation Plan: Suspend Flagged Cards from Normal Decks

**Branch**: `006-suspend-flagged-cards` | **Date**: 2026-04-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-suspend-flagged-cards/spec.md`

## Summary

When a card is flagged it is suspended from its source deck: normal decks only present unflagged cards, while the Flagged Cards section continues to show and quiz flagged cards. Suspension applies retroactively to cards flagged before this release, is reversible by unflagging (taking effect on the next deck start), and includes an in-session drop when the learner flags the current card during a normal deck run. Sidebar deck counts must reflect the available (unflagged) count.

Technically this is a pure client-side change contained almost entirely within `js/quiz.js`: deck composition at session start filters out flagged questions, the in-progress `quizData` queue drops the current card on flag, the sidebar renders available counts by subtracting flagged membership, and an empty-state branch is added to `startQuiz` for decks where every card is currently flagged. The existing Firebase `flagged` collection remains the single source of truth — no schema, backend, or dependency changes.

## Technical Context

**Language/Version**: HTML5, CSS3, vanilla JavaScript (ES6+) — no build tools (per Constitution III)
**Primary Dependencies**: None added. Existing: Firebase Realtime Database client SDK (already loaded in `index.html`)
**Storage**: Firebase Realtime Database — existing `flagged` node (array of `{question, options, correct, category}` objects); unchanged schema
**Testing**: Manual browser testing across mobile + desktop viewports (per Constitution Development Workflow); no automated suite in this project
**Target Platform**: Evergreen browsers (Chrome/Firefox/Safari/Edge latest two majors)
**Project Type**: Static client-side single-page web app
**Performance Goals**: Deck start and sidebar render must remain perceptibly instant (<50 ms) on a 500-card dataset. Flag-match lookup during filtering is O(n·m) worst case (n deck cards × m flagged cards); at expected scales (decks ~50 cards, flagged set typically <100) this is trivially fast without any indexing.
**Constraints**: Client-side only (Constitution III). No build step. No new dependencies. Touch targets ≥44px (Constitution IV). Must stay functional offline once loaded (Constitution V).
**Scale/Scope**: Single-user local state synced via Firebase; hundreds of cards total, flagged set typically tens. One file primarily modified (`js/quiz.js`), minor CSS addition for empty state, and small `index.html` touch if an empty-state element is needed.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Content Accuracy | ✅ Pass | No quiz content changes. |
| II. Progressive Difficulty | ✅ Pass | Deck/unit ordering unchanged. |
| III. Simplicity & Vanilla Stack | ✅ Pass | No dependencies added. Pure JS logic change in `js/quiz.js`. No build tools introduced. |
| IV. Responsive & Accessible UI | ✅ Pass | Reuses existing controls. New empty-state message uses existing typography/color tokens and is screen-reader readable text. No new interactive elements requiring touch-target review. |
| V. Data Persistence | ✅ Pass | Reuses existing `flagged` Firebase node; no schema change, so `database.rules.json` is unchanged. Feature is additive behavior on top of stored state. |

**Technology Constraints**: No server-side code added. No AI service use. No new hosting needs. No new fonts. ✅ Pass.

**Gate result**: PASS — no violations; Complexity Tracking section is empty.

## Project Structure

### Documentation (this feature)

```text
specs/006-suspend-flagged-cards/
├── plan.md              # This file
├── spec.md              # Feature specification (already present)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output (manual verification steps)
├── contracts/
│   └── quiz-module.md   # Internal JS module contract (function-level)
├── checklists/
│   └── requirements.md  # Quality checklist (already present)
└── tasks.md             # Created later by /speckit.tasks
```

### Source Code (repository root)

This feature does not change the project structure. Modifications land in existing files:

```text
js/
└── quiz.js              # PRIMARY: filter decks at start, drop on flag, sidebar count helper, empty-state branch
css/
└── style.css            # MINOR: styling for empty-deck message (if not reusing existing classes)
index.html               # MINOR: add empty-state container element if not reusing existing nodes
```

No new files in `js/`, no new modules, no new Firebase functions, no Vercel function changes. The feature is entirely client-side state transformation on top of existing data.

**Structure Decision**: Reuse the existing single-project layout. All feature logic sits inside `js/quiz.js` alongside the existing `// ── Flagged Cards (Firebase) ──` block. The sidebar-render logic already in `init()` (lines 188–238) is extended with a helper that computes available card counts by filtering out flagged questions. The `startQuiz` function (lines 261–288) is the single chokepoint where deck composition occurs and is where the filter is applied. The `startFlaggedQuiz` function (lines 157–177) remains untouched.

## Complexity Tracking

> No constitution violations. This section is intentionally empty.
