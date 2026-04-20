# turkish-quiz-game Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-20

## Active Technologies
- HTML5, CSS3, vanilla JavaScript (ES6+), Node.js 20 (serverless function) + @anthropic-ai/sdk (serverless function only) (005-fix-why-button-cors)
- Firebase Realtime Database (existing, unchanged) (005-fix-why-button-cors)
- HTML5, CSS3, vanilla JavaScript (ES6+) — no build tools (per Constitution III) + None added. Existing: Firebase Realtime Database client SDK (already loaded in `index.html`) (006-suspend-flagged-cards)
- Firebase Realtime Database — existing `flagged` node (array of `{question, options, correct, category}` objects); unchanged schema (006-suspend-flagged-cards)
- HTML5, CSS3, vanilla JavaScript (ES6+) — no build tools (per Constitution III) + None added. Firebase Realtime Database client SDK already loaded in `index.html` remains unchanged. (007-retry-wrong-cards)
- In-memory session state only for the retry pool. No persistence across sessions (per FR-014). No Firebase schema changes. (007-retry-wrong-cards)
- HTML5, CSS3, vanilla JavaScript (ES6+) — no build tools (per Constitution III) + Firebase Realtime Database client SDK (already loaded in `index.html`); no new dependencies (008-error-tracking)
- Firebase Realtime Database — new `errors` subtree; `database.rules.json` extended with restricted rules for that subtree (008-error-tracking)
- HTML5, CSS3, vanilla JavaScript (ES6+) — no build tools per Constitution III + Firebase Realtime Database client SDK (already loaded in `index.html`). No new dependencies; CSV parsing implemented in vanilla JS. (009-vocab-tool)
- Firebase Realtime Database — new `vocabulary/{userId}` subtree for decks, items, and answer-event history; `database.rules.json` extended with per-user read/write rules scoped to that subtree. (009-vocab-tool)

- HTML5, CSS3, vanilla JavaScript (ES6+) + None (Web Audio API is built-in) (001-gamification-sounds)
- Firebase Cloud Functions v2, Anthropic Claude API (Haiku) (004-card-why-explainer)

## Project Structure

```text
js/
├── questions.js         # Quiz content data (units, sections, questions, deck definitions)
└── quiz.js              # Quiz logic, sidebar rendering, Firebase sync
css/
└── style.css            # All styles
sounds/                  # Audio feedback files
functions/
├── index.js             # Firebase Cloud Function: explainAnswer
└── package.json         # Cloud Function dependencies
index.html               # Single-page app entry point
```

## Commands

npm test; npm run lint

## Code Style

HTML5, CSS3, vanilla JavaScript (ES6+): Follow standard conventions

## Recent Changes
- 009-vocab-tool: Added HTML5, CSS3, vanilla JavaScript (ES6+) — no build tools per Constitution III + Firebase Realtime Database client SDK (already loaded in `index.html`). No new dependencies; CSV parsing implemented in vanilla JS.
- 008-error-tracking: Added HTML5, CSS3, vanilla JavaScript (ES6+) — no build tools (per Constitution III) + Firebase Realtime Database client SDK (already loaded in `index.html`); no new dependencies
- 007-retry-wrong-cards: Added HTML5, CSS3, vanilla JavaScript (ES6+) — no build tools (per Constitution III) + None added. Firebase Realtime Database client SDK already loaded in `index.html` remains unchanged.


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
