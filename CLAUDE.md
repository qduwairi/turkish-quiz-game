# turkish-quiz-game Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-10

## Active Technologies
- HTML5, CSS3, vanilla JavaScript (ES6+), Node.js 20 (serverless function) + @anthropic-ai/sdk (serverless function only) (005-fix-why-button-cors)
- Firebase Realtime Database (existing, unchanged) (005-fix-why-button-cors)
- HTML5, CSS3, vanilla JavaScript (ES6+) — no build tools (per Constitution III) + None added. Existing: Firebase Realtime Database client SDK (already loaded in `index.html`) (006-suspend-flagged-cards)
- Firebase Realtime Database — existing `flagged` node (array of `{question, options, correct, category}` objects); unchanged schema (006-suspend-flagged-cards)

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
- 006-suspend-flagged-cards: Added HTML5, CSS3, vanilla JavaScript (ES6+) — no build tools (per Constitution III) + None added. Existing: Firebase Realtime Database client SDK (already loaded in `index.html`)
- 005-fix-why-button-cors: Added HTML5, CSS3, vanilla JavaScript (ES6+), Node.js 20 (serverless function) + @anthropic-ai/sdk (serverless function only)

- 001-gamification-sounds: Added HTML5, CSS3, vanilla JavaScript (ES6+) + None (Web Audio API is built-in)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
