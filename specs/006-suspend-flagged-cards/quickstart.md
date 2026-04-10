# Quickstart: Manually Verify the Suspend-Flagged-Cards Feature

**Feature**: 006-suspend-flagged-cards
**Date**: 2026-04-10

This feature ships without automated tests (per the project's constitution). Use these steps to verify correctness in the browser before merging. All paths assume you are at the repo root.

## Setup

1. Serve the app statically (any option works):
   - `python -m http.server 8000` from the repo root, then open http://localhost:8000/
   - Or open `index.html` directly in a modern browser.
2. Sign in / connect to Firebase as normal so the `/flagged` node syncs.
3. Open the sidebar and note the current card count on a deck you'll use for testing — call it `DeckA` with total `N` cards.

## Scenario 1 — Flag-suspends from current session (US1, FR-003)

1. Start `DeckA`. Verify the progress indicator shows `1 / N`.
2. On the first question, click the flag (☆) button to flag it.
3. **Expected**: the quiz immediately advances to the *next* card — the flagged card is not shown again. The denominator of the progress indicator now shows `N-1` (e.g., `1 / (N-1)`).
4. Finish the quiz.
5. **Expected**: the results screen reports `score / (N-1)`, not `/ N`.

## Scenario 2 — Flag-suspends from future sessions (US1, FR-001)

1. Close the results screen.
2. Restart `DeckA` from the sidebar.
3. **Expected**: the card you flagged in Scenario 1 never appears during this new session. The total `N-1` is consistent across the session.

## Scenario 3 — Flagged card remains reviewable in Flagged Cards section (US1/FR-004)

1. Open the sidebar and click **Flagged Cards**.
2. **Expected**: the card flagged in Scenario 1 is present and fully reviewable.
3. Answer it and complete the Flagged Cards session.

## Scenario 4 — Retroactive suspension (US2, FR-002)

1. In Firebase (or via the app in another browser), ensure there is at least one pre-existing flagged card belonging to some deck `DeckB`. If you don't have one, flag one and hard-reload the page to simulate a pre-existing state.
2. Start `DeckB`.
3. **Expected**: the pre-existing flagged card is absent from the session and the total is reduced accordingly. You did not need to re-flag it.

## Scenario 5 — Unflag returns the card to its deck on next start (US3, FR-005)

1. Start the Flagged Cards section.
2. On a card belonging to `DeckA`, click the flag button to *unflag* it.
3. **Expected**: the **current Flagged Cards session continues unchanged** — the just-unflagged card is NOT dropped from the remaining queue (this is FR-005a, the clarification).
4. Finish or exit the Flagged Cards session.
5. Start `DeckA` again.
6. **Expected**: the unflagged card is now back in `DeckA`'s rotation. Its count is restored (back up by 1).

## Scenario 6 — Sidebar count matches actual session length (FR-006)

1. Note the card count shown next to `DeckA` in the sidebar before flagging anything.
2. Flag one card from `DeckA` (mid-session is fine).
3. **Expected**: the sidebar immediately updates `DeckA`'s count to `count - 1` without a page reload. The unit header total also decreases by 1.
4. Start `DeckA`.
5. **Expected**: the session length matches the sidebar's displayed count exactly.

## Scenario 7 — Empty deck state (edge case from spec)

1. Pick a small deck `DeckC` (e.g., one with only a handful of cards). Flag every card in it across one or more sessions.
2. With all cards in `DeckC` flagged, click `DeckC` from the sidebar.
3. **Expected**: no quiz starts. Instead, a message appears on the start screen saying something like `All cards in "DeckC" are flagged. Review them in the Flagged Cards section.` The start screen stays visible.
4. Unflag one of those cards (from the Flagged Cards section, no session mutation required).
5. Click `DeckC` again.
6. **Expected**: the deck now starts normally with that single available card.

## Scenario 8 — Cross-device consistency (FR-009)

1. Open the app in two browser windows signed in to the same Firebase state.
2. In window 1, flag a card from `DeckA`.
3. In window 2 (without reloading), open the sidebar.
4. **Expected**: `DeckA`'s count in window 2 updates to reflect the suspension. Starting `DeckA` in window 2 excludes the card.

## Responsive check (Constitution IV)

- Repeat Scenario 1 on a mobile viewport (Chrome DevTools responsive mode, iPhone size). Confirm the empty-state message and updated counts are legible and don't break layout.
- Confirm the flag button still meets the 44×44 CSS pixel minimum touch target.

## Regression smoke

- Verify that answering questions, scoring, the "Why?" explainer for wrong answers, the sound toggle, and the theme toggle all still work unchanged.
- Verify that `database.rules.json` was not modified (no schema change for this feature).
