# Implementation Plan: Client-Side Error Tracking

**Branch**: `008-error-tracking` | **Date**: 2026-04-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-error-tracking/spec.md`

## Summary

Capture uncaught JavaScript errors, unhandled promise rejections, and failures of user-initiated network operations in the quiz app, tag them with minimal context (page, timestamp, browser/OS, session ID, last 10 action breadcrumbs), and append them write-only to a new `errors` node in Firebase Realtime Database. A small static developer viewer page reads that node (under restricted Firebase rules) to list, inspect, resolve, and delete entries. Recording is fire-and-forget, de-duplicated per signature per session, and must never interrupt the learner.

## Technical Context

**Language/Version**: HTML5, CSS3, vanilla JavaScript (ES6+) — no build tools (per Constitution III)
**Primary Dependencies**: Firebase Realtime Database client SDK (already loaded in `index.html`); no new dependencies
**Storage**: Firebase Realtime Database — new `errors` subtree; `database.rules.json` extended with restricted rules for that subtree
**Testing**: Manual browser testing (per Constitution), plus a deliberate error-injection helper used from the browser console during verification
**Target Platform**: Modern evergreen browsers (Chrome, Firefox, Safari, Edge — latest two majors); desktop + mobile viewports
**Project Type**: Client-side single-page web app with a small static developer viewer page
**Performance Goals**: Capture + enqueue an error in <10 ms on the main thread; batched network write does not block UI; viewer loads ≤200 records in under 2 s on broadband
**Constraints**: MUST NOT interrupt the learner even when offline or when the errors node is unreachable; MUST NOT expose PII; total stored errors capped at 500 records (oldest-dropped on overflow); breadcrumb depth = 10; per-session de-duplication cap = 5 records per unique error signature
**Scale/Scope**: Single learner per session; expected volume <100 errors/day project-wide; cap of 500 persisted records is sufficient for a small personal learning app

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
| --- | --- | --- |
| I. Content Accuracy | Feature touches no quiz content | ✅ N/A |
| II. Progressive Difficulty | Feature touches no unit/section structure | ✅ N/A |
| III. Simplicity & Vanilla Stack | No build tools, bundlers, or new libraries; uses existing Firebase SDK only; plain JS module added to `js/` and a plain HTML viewer page | ✅ Pass |
| IV. Responsive & Accessible UI | Learner-facing surface is zero (errors are invisible); developer viewer is a simple responsive HTML page with semantic buttons and adequate touch targets | ✅ Pass |
| V. Data Persistence | Schema change confined to Firebase RTDB; `database.rules.json` updated in the same change, per Principle V | ✅ Pass |
| Tech Constraints (no server-side code) | Pure client-side; no new Cloud Function or serverless endpoint required | ✅ Pass |

**Result**: No violations. No entries required in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/008-error-tracking/
├── plan.md              # This file
├── spec.md              # Feature spec (already written, clarified)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── firebase-rules.md    # Rule contract for the `errors` subtree
│   └── error-record.schema.json  # JSON schema for an error record
└── tasks.md             # Phase 2 output (created later by /speckit.tasks)
```

### Source Code (repository root)

```text
index.html                # Entry point — will load the new error-tracker module early
css/
└── style.css             # Unchanged (no learner-visible UI)
js/
├── questions.js          # Unchanged
├── quiz.js               # Instrumented: wrap user-initiated network operations + push breadcrumbs
└── error-tracker.js      # NEW — capture, dedupe, queue, flush, breadcrumbs, session ID
dev/
├── errors.html           # NEW — simple developer viewer page (list, inspect, resolve, delete)
└── errors.js             # NEW — viewer logic (uses Firebase SDK loaded inline)
database.rules.json       # UPDATED — restricted rules on the `errors` subtree
```

**Structure Decision**: Keep the learner app structure as-is and add a single new module `js/error-tracker.js` loaded from `index.html`. The developer viewer lives under a new `dev/` directory so it stays out of the learner entry point and can be deployed either alongside the app (gated by Firebase rules) or served locally. No build step; both the tracker and the viewer use the existing Firebase SDK already pulled in via CDN.

## Complexity Tracking

*No violations — section intentionally empty.*
