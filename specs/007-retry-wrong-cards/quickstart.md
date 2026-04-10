# Phase 1 Quickstart: Retry Wrong Cards Until Mastered

**Feature**: 007-retry-wrong-cards
**Date**: 2026-04-10

This is a manual browser-testing quickstart used to verify the feature end-to-end once Phase 2 tasks are implemented. No build step; just open the app in a browser.

## Prerequisites

- Current branch checked out: `007-retry-wrong-cards`
- A way to serve the static site (any of):
  - Open `index.html` directly in a modern browser, OR
  - `firebase serve` (if Firebase CLI installed), OR
  - Any static server (e.g. `python -m http.server`)
- Devtools open (to observe console + responsive-mode viewport switching)

## Setup

1. From the repo root, start any static server or open `index.html` directly.
2. Pick any unit from the sidebar that has at least 4 cards in one of its decks. Good candidates exist throughout [js/questions.js](../../js/questions.js).

## Scenario 1 — Perfect main pass (no retry phase)

1. Open a deck.
2. Answer every card correctly on the first try.
3. **Expected**: After the last correct answer, the results screen appears immediately. The retry banner never shows. The score equals the deck size.

## Scenario 2 — One wrong answer, retry once, correct

1. Start a fresh deck session.
2. Deliberately answer the first card wrong; answer all remaining cards correctly.
3. **Expected**: At the end of the main pass, the retry banner appears and reads "You missed 1 card…". Main progress bar is hidden. Score label reads "Retry".
4. Tap **Continue**. The previously missed card is shown again.
5. Answer it correctly.
6. **Expected**: Results screen appears. Score shows 1 less than the deck size (reflecting first-pass accuracy, unchanged by retry).

## Scenario 3 — Multiple wrong answers, retry multi-pass with a repeated mistake

1. Start a fresh deck session (aim for a deck with ≥4 cards).
2. Answer cards #1 and #2 wrong. Answer the rest correctly.
3. **Expected**: Retry banner shows "You missed 2 cards…".
4. Continue into retry. The "N cards left to master" text shows `2`.
5. Answer the first retry card wrong.
6. **Expected**: The reveal appears; on Next, the *other* retry card is shown next (not the just-missed one). The count is still `2`.
7. Answer this one correctly.
8. **Expected**: Count drops to `1`. Next card shown is the previously-missed retry card.
9. Answer it correctly.
10. **Expected**: Results screen appears. Displayed score equals `deckSize - 2` (first-pass accuracy, unchanged).

## Scenario 4 — Single-card retry loop

1. Start a deck and answer all cards correctly EXCEPT exactly one (any position).
2. At retry entry, Continue.
3. Answer the single retry card wrong.
4. **Expected**: With only one card in the queue, the same card reappears on Next (end-of-queue rule with queue size 1).
5. Answer it correctly.
6. **Expected**: Results screen appears.

## Scenario 5 — All cards wrong

1. Start a small deck and answer every card wrong on the first pass.
2. **Expected**: Retry banner reads "You missed N cards…" where N equals the deck size.
3. Continue, then answer every retry card correctly.
4. **Expected**: Results screen appears with a first-pass score of 0.

## Scenario 6 — Flagging a card during retry

1. Start a deck, miss at least 2 cards, let the retry phase begin.
2. Continue to the first retry card.
3. Flag the currently shown card using the existing flag button.
4. **Expected**: The flagged card is removed from the retry pool, the count decrements, and the next retry card is shown. The flagged card also appears in the Flagged Cards review list (existing behavior preserved).
5. Finish remaining retry cards correctly.
6. **Expected**: Results screen appears when the pool is empty.

## Scenario 7 — Flagged Cards review session (retry disabled)

1. From the sidebar, open the Flagged Cards review session (assuming at least one flagged card exists).
2. Answer at least one card incorrectly, finish all cards.
3. **Expected**: At the end, the normal results path runs; **no** retry banner appears and no retry phase is entered. Behavior matches pre-feature behavior of the flagged-cards review.

## Scenario 8 — Abandon mid-retry

1. Enter a retry phase as in Scenario 3.
2. Without finishing, navigate to another deck from the sidebar.
3. Start that deck.
4. **Expected**: The new session starts fresh. The previous retry pool is gone. The main progress bar is visible, the score label reads "Score: 0", and no retry banner is shown.

## Responsive / accessibility smoke tests

- Run Scenario 3 twice: once in a desktop viewport and once in a mobile viewport (devtools responsive mode, ~375px wide).
- **Expected**: Retry banner and "cards left to master" indicator are legible and non-overlapping in both viewports. The Continue button has a comfortable touch target.
- Tab-key through the retry banner; the Continue button is reachable and activates on Enter/Space.
- Confirm the wrong-answer cue remains both colored AND carries a text "The answer was: …" — color is not the only channel (Constitution IV).

## Done criteria

All eight functional scenarios above pass manually on at least one desktop and one mobile viewport, matching the acceptance scenarios listed in [spec.md](../spec.md).
