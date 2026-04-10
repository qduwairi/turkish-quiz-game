# Phase 1 UI Contract: Retry Wrong Cards Until Mastered

**Feature**: 007-retry-wrong-cards
**Date**: 2026-04-10

This feature exposes no network APIs, no CLI surface, and no library contracts. Its only external contract is the DOM/UI surface the rest of the app (and the user) interacts with. This file documents the IDs, classes, and visible behaviors that Phase 2 tasks must implement and that manual testing will verify.

## DOM additions in [index.html](../../index.html)

All additions live inside the existing `#quiz-screen` section and are hidden by default.

### Retry transition banner

```html
<div id="retry-banner" class="retry-banner hidden" role="dialog" aria-live="polite">
  <h2 class="retry-banner-title">Retry phase</h2>
  <p class="retry-banner-body">
    You missed <span id="retry-banner-count">0</span> cards. Answer each one
    correctly to finish the deck.
  </p>
  <button id="retry-continue-btn" class="retry-continue-btn" type="button">
    Continue
  </button>
</div>
```

**Behavior**:

- `hidden` class added/removed via `classList.toggle('hidden', ...)` — same pattern as existing screens in [js/quiz.js](../../js/quiz.js).
- `#retry-banner-count` text updated to the retry pool size at phase entry.
- `#retry-continue-btn` click dismisses the banner and renders the first retry card.
- Touch target on `#retry-continue-btn` is ≥44×44 (Constitution IV).
- Keyboard: the button receives focus when the banner is shown so Enter/Space advances.

### Retry text progress indicator

```html
<div id="retry-progress" class="retry-progress hidden" aria-live="polite">
  <span id="retry-progress-count">0</span> cards left to master
</div>
```

**Behavior**:

- Shown only while `retryMode === true`.
- The count reflects the current `retryQueue.length`, updated after each answer (decrement on correct, unchanged on wrong because the missed card stays in the queue).

### Score label swap

No new element — the existing score display element is repurposed:

- `#score-display` continues to exist.
- During main pass: text is `Score: N` (unchanged behavior).
- During retry phase: text is `Retry` (no numeric score).
- On results screen: the existing results screen reads `score` unchanged and shows the first-pass number.

## CSS additions in [css/style.css](../../css/style.css)

New rules (names are normative — Phase 2 tasks must use these exact selectors):

- `.retry-banner` — centered block inside `#quiz-screen`; responsive width; adequate padding; matches existing card surface styling.
- `.retry-banner-title`, `.retry-banner-body` — typography consistent with existing `#quiz-title` and feedback text.
- `.retry-continue-btn` — reuses or mirrors the existing primary-button styling; min-height and min-width ≥44px.
- `.retry-progress` — typography and placement consistent with the existing `#progress-fraction`.
- `.progress-hidden` (or equivalent class on `#progress-bar`'s container) — `display: none` or `visibility: hidden` to hide the main progress bar during the retry phase. Phase 2 may reuse the existing `hidden` utility class if one exists; otherwise add a new class and document it.

No inline styles (Constitution Development Workflow — "Inline styles are prohibited").

## JavaScript contract in [js/quiz.js](../../js/quiz.js)

The existing module state is extended; no new files are created.

### New module-scoped state

```javascript
let wrongCards = [];   // cards missed in main pass (FR-001)
let retryMode = false; // true once retry phase entered (FR-004)
let retryQueue = [];   // active FIFO during retry phase (FR-005)
```

### New / modified functions

- `startQuiz(unit, deckIndex)` — MUST reset `wrongCards = []`, `retryMode = false`, `retryQueue = []` alongside the existing `current = 0; score = 0; answered = false`.
- `selectAnswer(index)` — on an incorrect answer during main pass (`retryMode === false`), push the current card onto `wrongCards` before the existing reveal/feedback flow. During retry phase, do NOT increment `score`.
- Transition logic (new helper, e.g. `advanceAfterCard()` or inline at the "Next" handler):
  - If `retryMode === false` and `current` has reached the last main-pass card:
    - If `isFlaggedMode === true` → `showResults()` (unchanged FR-015 short-circuit).
    - Else if `wrongCards.length === 0` → `showResults()`.
    - Else → `enterRetryPhase()`.
  - If `retryMode === true`:
    - On correct: `retryQueue.shift()`; if empty → `showResults()`; else render `retryQueue[0]`.
    - On wrong: after the learner taps Next, pop head with `retryQueue.shift()`, `retryQueue.push(card)`, then render the new `retryQueue[0]`.
- `enterRetryPhase()` — new function:
  - `retryMode = true`
  - `retryQueue = shuffle(wrongCards.slice())` (reuses existing `shuffle()` helper)
  - Hide the main question layout and the main progress bar
  - Swap `#score-display` text to `Retry`
  - Show `#retry-banner` with `#retry-banner-count` set to `retryQueue.length`
  - Focus `#retry-continue-btn`
- `exitRetryBanner()` — new handler bound to `#retry-continue-btn` click:
  - Hide `#retry-banner`
  - Show `#retry-progress` with `#retry-progress-count` = `retryQueue.length`
  - Render `retryQueue[0]` via the existing per-card render path (same DOM, same answer handler)
- `showResults()` — MUST reset `retryMode = false` and clear `retryQueue`/`wrongCards` on entry so a subsequent session starts clean. Must restore `#score-display` to its normal `Score: N` format and un-hide the main progress bar on re-entry to any future session (either here or in `startQuiz`).
- Existing flag handler — during retry phase, treat a flag action as: remove the current card from `retryQueue` by identity, advance to the new head (or `showResults()` if empty). Do not alter Firebase interaction beyond the existing flag-add call.

### Functions/behavior that MUST stay untouched

- `shuffle()` helper — reused, not changed.
- `availableCardsForDeck()` — unrelated, unchanged.
- `updateProgress()` — continues to drive the main-pass progress bar; simply not called while retry banner/progress are shown.
- `showQuestion()` — same render path used for both main-pass and retry-phase cards. No forking.
- The "Why?" explainer flow and any Firebase flag writes.

## Visible behaviors (user-observable acceptance)

These map directly to the Acceptance Scenarios in [spec.md](../spec.md) and must all hold:

1. Finishing a deck with zero wrong answers → results screen immediately, no banner, no retry indicator.
2. Finishing the main pass with ≥1 wrong answer → retry banner appears with the correct count; main progress bar is hidden; score label reads "Retry".
3. Tapping Continue on the banner reveals a previously-missed card using the same card UI as the main pass.
4. Correct retry answer decrements the "N cards left to master" count by one and advances to the next retry card.
5. Wrong retry answer leaves the count unchanged, shows the correct-answer reveal, and on Next advances to the *next* retry card rather than re-asking the just-missed card immediately. The missed card will only reappear once all other retry cards have been cycled through.
6. When the last retry card is answered correctly → results screen is shown, score display restored to `Score: N` with the unchanged first-pass score.
7. Flagging the currently shown retry card removes it from the retry pool and advances; if it was the last card, the results screen is shown.
8. Starting the flagged-cards review session and finishing with wrong answers behaves exactly as it does today (no retry phase).

## Non-goals (explicit)

- No new REST/HTTP endpoints.
- No new localStorage/Firebase keys.
- No changes to the "Why?" explainer request/response shape.
- No new question-object fields.
- No changes to the flagged-cards review flow.
