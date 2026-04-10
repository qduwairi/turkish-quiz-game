# Internal Contract: `js/quiz.js` Functions Touched by This Feature

**Feature**: 006-suspend-flagged-cards
**Date**: 2026-04-10

This project has no public HTTP API surface for this feature; the "contract" is the set of JS functions inside `js/quiz.js` whose behavior changes or is introduced. This file captures their pre/post-conditions so reviewers and future maintainers can verify the implementation against a fixed spec.

## Modified functions

### `startQuiz(unit, deckIndex)` — MODIFIED

**Current behavior** (`js/quiz.js:261–288`): composes `quizData` from the selected deck's sections, shuffles, and enters the quiz screen.

**New behavior**:
1. Compute the full deck card list as today.
2. **NEW**: filter out any card where `isFlagged(card.question) === true`.
3. **NEW**: if the filtered list is empty, call `showDeckEmptyState(unit, deck)` and return WITHOUT switching screens or resetting `current`/`score`.
4. Otherwise proceed as today (shuffle → assign to `quizData` → enter quiz screen).

**Post-conditions**:
- On non-empty path: `quizData` contains only non-flagged cards. `quizData.length ≥ 1`. `isFlaggedMode === false`.
- On empty path: start screen remains visible; an empty-state message is shown; `quizData` may be left in its prior state (not read until another `startQuiz` succeeds).

### `toggleFlag()` — MODIFIED

**Current behavior** (`js/quiz.js:123–135`): flips the flagged state of the card at `quizData[current]`, writes to Firebase, updates the flag button and Flagged Cards section visibility.

**New behavior**:
1. Preserve the existing flip + save + button-update logic unchanged.
2. **NEW**: after `saveFlagged`, branch on direction and mode:
   - If the card became `flagged` AND `isFlaggedMode === false`: splice index `current` out of `quizData`. Then:
     - If `quizData.length === 0`: call `showResults()` (session ends; score is preserved).
     - Else if `current >= quizData.length`: decrement `current` so it points at the last valid slot, then call `showResults()` (matches "last card was flagged" case) OR equivalently call `showResults()` directly since the session has no more cards.
     - Else: call `showQuestion()` to render the new card at the same `current` index.
   - If the card became `unflagged` (either mode): do NOT mutate `quizData`. Per FR-005a, current session is untouched.
3. The sidebar re-render happens automatically via the Firebase listener (see `initFlaggedSync`).

**Post-conditions**:
- `flaggedCache` and Firebase `/flagged` are consistent with the new state.
- In normal mode on a flag-adding toggle, the just-flagged card is no longer in `quizData`.
- In flagged mode, `quizData` is unchanged regardless of direction.
- The on-screen card after the toggle is either (a) the next available card at the same slot, (b) the results screen, or (c) unchanged (flagged-mode case).

### `initFlaggedSync()` — MODIFIED

**Current behavior** (`js/quiz.js:100–108`): subscribes to `/flagged`, updates `flaggedCache`, calls `updateFlaggedDeck()`, updates flag button if mid-quiz.

**New behavior**:
- Add a single call to `renderSidebarCounts()` (new helper, see below) inside the listener so sidebar counts refresh whenever flagged state changes from any source (including other devices via Firebase sync).

### `init()` — MODIFIED

**Current behavior** (`js/quiz.js:188–238`): renders the sidebar once during app startup.

**New behavior**: the sidebar rendering block (units, decks, counts) is extracted into `renderSidebarCounts()` (or factored so counts can be recomputed without rebuilding the whole DOM). `init()` calls `renderSidebarCounts()` once after the initial DOM build, and the Firebase listener calls it on every flag change.

## New functions

### `availableCardsForDeck(unit, deck)` — NEW helper

```text
Input:  unit (object from units[]), deck (object with .sections: number[])
Output: Question[] — flattened deck cards minus those in flaggedCache
Side effects: none (pure read of unit + flaggedCache)
```

### `renderSidebarCounts()` — NEW

```text
Input:  none (reads DOM and flaggedCache)
Output: void
Side effects: updates the text content of existing sidebar count elements
              (unit-header meta "N decks · M questions" and
               per-deck ".sidebar-deck-meta" "M questions") to reflect
              available (unflagged) counts. Does NOT rebuild DOM nodes.
```

**Implementation note**: Because `init()` builds sidebar DOM nodes with stable IDs (`unit-header-${unit.id}`, `deck-${unit.id}-${di}`), `renderSidebarCounts` can locate and update them by query selector without re-running `init()`. This keeps event listeners attached.

### `showDeckEmptyState(unit, deck)` — NEW

```text
Input:  unit, deck (for context to the message)
Output: void
Side effects:
  - Shows a message element (e.g., #deck-empty-msg) on the start screen with
    text like: "All cards in "{deck.name}" are flagged. Review them in the
    Flagged Cards section."
  - Leaves start screen visible, does not touch quiz-screen or results-screen.
  - Message auto-dismisses on the next successful startQuiz (normal or flagged).
```

## Functions unchanged

- `startFlaggedQuiz()` — the Flagged Cards section must remain unfiltered (I2).
- `isFlagged()`, `getFlagged()`, `saveFlagged()` — reused as-is.
- `updateFlaggedDeck()` — continues to manage the Flagged Cards section visibility and count.
- `updateFlagBtn()` — continues to reflect flagged state of the currently visible card.
- `showQuestion()`, `selectAnswer()`, `advanceQuestion()`, `showResults()`, `updateProgress()`, `updateScore()` — no changes; they operate on whatever is currently in `quizData`, which is now pre-filtered.

## Non-goals

- No changes to the Firebase `/flagged` schema.
- No changes to `database.rules.json`.
- No changes to the serverless `/api/explain-answer` path.
- No changes to `js/questions.js`.
- No new external dependencies.
