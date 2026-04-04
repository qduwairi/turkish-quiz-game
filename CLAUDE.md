# turkish-quiz-game Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-04

## Active Technologies

- HTML5, CSS3, vanilla JavaScript (ES6+) + None (Web Audio API is built-in) (001-gamification-sounds)

## Project Structure

```text
js/
├── questions.js         # Quiz content data (units, sections, questions, deck definitions)
└── quiz.js              # Quiz logic, sidebar rendering, Firebase sync
css/
└── style.css            # All styles
sounds/                  # Audio feedback files
index.html               # Single-page app entry point
```

## Commands

npm test; npm run lint

## Code Style

HTML5, CSS3, vanilla JavaScript (ES6+): Follow standard conventions

## Recent Changes

- 001-gamification-sounds: Added HTML5, CSS3, vanilla JavaScript (ES6+) + None (Web Audio API is built-in)
- 002-organize-deck-structure: Reorganize units into ~50-question decks with 3-level sidebar hierarchy
- 003-dark-mode-toggle: Dark mode as default with visible toggle switch in sidebar header

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
