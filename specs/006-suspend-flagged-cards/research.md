# Phase 0 Research: Suspend Flagged Cards from Normal Decks

**Feature**: 006-suspend-flagged-cards
**Date**: 2026-04-10

There are no `NEEDS CLARIFICATION` markers in Technical Context — all decisions are derivable from the existing codebase, the constitution, and the clarified spec. This document captures the non-obvious decisions that affect implementation so they are not re-litigated during Phase 1 / tasks.

## Decisions

### D1. Flag-match key: question text (string equality)

**Decision**: Identify a card uniquely by its `question` string when comparing deck cards against the flagged collection.

**Rationale**: The existing code already uses `question` as the identity key (`isFlagged(questionText)` in `js/quiz.js:119` matches on `c.question === questionText`). Flagged entries persist only `{question, options, correct, category}` to Firebase (line 130), so the question string is the only stable identifier available on both sides. Turkish quiz questions are authored to be unique within the dataset.

**Alternatives considered**:
- Hash of question+options: unnecessary; no observed collisions and would require migrating existing stored entries.
- Adding an explicit `id` to each question in `js/questions.js`: larger content migration with no observed benefit; violates the "least change" principle for this feature.

### D2. Filter location: single chokepoint in `startQuiz`

**Decision**: Apply the "exclude flagged cards" filter exactly once, inside `startQuiz` at the moment `quizData` is composed. Do not re-filter on every `showQuestion` tick.

**Rationale**: Decks are composed in one place (`js/quiz.js:271–274`). Filtering there means the entire app (progress bar, score-out-of-total, results page) automatically uses the reduced set without any other code changes. Mid-session flag drops are handled separately as a queue mutation (see D3).

**Alternatives considered**:
- Filter on every `showQuestion`: would require reworking `current` index tracking and is invasive for zero benefit.
- Filter in a wrapper around `units`/`sections`: changes data structure semantics and risks breaking the Flagged Cards section, which needs the raw data.

### D3. Mid-session flag drop: splice by question text from `quizData`

**Decision**: When `toggleFlag()` is called during a normal deck session and the result is that the current card becomes flagged, remove the current card from `quizData` in-place (splice at `current`) and re-enter `showQuestion()` without incrementing `current`, so the next queued card naturally appears in the same slot. If the flagged card was the last in the queue, call `showResults()`.

**Rationale**: Satisfies FR-003 ("remove from remaining cards of in-progress session at the moment it is flagged") while reusing the existing render pipeline. Because `current` already points to the (now removed) position, the next card slides into that index; `showQuestion()` redraws cleanly. This keeps the answered/score state of prior cards untouched per spec.

**Edge handling**:
- **Last-card case**: after splice, `current >= quizData.length` → call `showResults()`. Score denominator reflects the post-flag session length, which is the intended behavior (flagged card is not counted toward the completed quiz).
- **Flagged Cards session (`isFlaggedMode === true`)**: per FR-005a, unflagging during an active Flagged Cards session must NOT mutate `quizData`. The handler must branch on `isFlaggedMode` and skip the splice in that mode.

**Alternatives considered**:
- End the session immediately on flag: over-aggressive; contradicts "move on to the next question" (per user clarification message on 2026-04-10).
- Re-filter the whole `quizData` against the full unit after every flag: unnecessary work and could reintroduce already-answered cards.

### D4. Sidebar count rendering: reactive to flag changes

**Decision**: Extract the sidebar deck-list render into a helper (`renderSidebar()`) that computes each deck's count as `totalDeckCards - flaggedInDeck`. Call it from `init()` on first load and from the existing `flagged` Firebase listener (`initFlaggedSync()`, line 100–108) whenever `flaggedCache` changes.

**Rationale**: FR-006 requires displayed counts to match the session length the user will actually get. Since `flaggedCache` already fires a listener on every update, piggybacking sidebar re-render keeps counts live without new plumbing. Unit headers (which show `N decks · M questions`) are similarly recomputed.

**Performance note**: With ~dozens of decks and ≤few hundred total cards, full re-render on each flag toggle is imperceptible. No memoization needed.

**Alternatives considered**:
- Incrementally decrement/increment counts on flag toggle: fragile (needs knowing which deck the card belongs to and keeping that in sync). Full re-render is simpler and correct.
- Update counts only on page load: violates FR-006 for users who flag cards within a session and then return to the sidebar.

### D5. Empty-deck state: start-screen message + no session launch

**Decision**: In `startQuiz`, after filtering, if `quizData.length === 0`, do NOT hide the start screen or switch to the quiz screen. Instead, surface a clear message — either via an existing feedback element or a small new element — that all cards in this deck are currently flagged, and suggest reviewing them in the Flagged Cards section. Leave the sidebar open state intact.

**Rationale**: Per the spec edge case "All cards in this deck are flagged", launching an empty quiz would produce a division-by-zero in `updateProgress()` and a broken results screen. A message-based short-circuit is the least invasive fix.

**Implementation choice**: Reuse a transient start-screen banner (new `<div id="deck-empty-msg">` in `index.html`, styled minimally in `css/style.css`, toggled visible only in this branch, auto-dismissed on any other deck click). Avoids `alert()` per modern UX practice and stays within the app's visual language.

**Alternatives considered**:
- Disable the deck button entirely when empty: requires the sidebar renderer to know about flagged counts (it will anyway, per D4), so feasible. Chosen the message approach *additionally* — the sidebar button can visually indicate "0 questions" (from D4), and clicking it still shows the explanatory message rather than silently doing nothing.

### D6. Retroactive application: automatic on first load

**Decision**: No migration code needed. Because the filter is applied at session-composition time against the live `flaggedCache`, any pre-existing flagged cards are automatically excluded on the first deck start after the update is deployed.

**Rationale**: Satisfies FR-002 and SC-005 with zero additional code. The spec explicitly calls out that retroactive suspension should require no user action.

### D7. No changes to `initFlaggedSync` semantics besides the sidebar re-render call

**Decision**: The Firebase listener keeps its current contract (sync `flaggedCache`, update the Flagged Cards section visibility, update the flag button on the current question). The only addition is a `renderSidebar()` call (D4).

**Rationale**: Minimizes risk of regressions in the existing flagged cards feature. No changes to the data on-the-wire, no new nodes, no rules changes.

## Resolved Ambiguities

All three ambiguities from the spec clarification pass are resolved at the spec level:
1. Unflag during Flagged Cards session → does not mutate current run (spec Clarifications Q1 + FR-005a).
2. Flag during normal deck session → drops current card from remaining queue (FR-003 + D3 above).
3. Sidebar count reflects post-exclusion count (FR-006 + D4 above).

No outstanding research items remain. Ready for Phase 1.
