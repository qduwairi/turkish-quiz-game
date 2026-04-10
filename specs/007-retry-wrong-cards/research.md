# Phase 0 Research: Retry Wrong Cards Until Mastered

**Feature**: 007-retry-wrong-cards
**Date**: 2026-04-10

The spec entered planning with zero `NEEDS CLARIFICATION` markers (all ambiguities resolved in `/speckit.clarify`). This phase documents the small number of design decisions implicit in the clarified spec so the Phase 1 artifacts and Phase 2 tasks have a shared reference.

## Decision 1: Retry pool data structure

- **Decision**: A plain JavaScript array of question objects, treated as a FIFO queue during the retry phase. Correct answer → `shift()`. Wrong answer → `push()` the same card to the back.
- **Rationale**: FR-013 requires that an incorrectly-answered retry card be moved to the end of the queue so the learner cycles through all other remaining cards before encountering it again. A FIFO with push-to-back on wrong exactly implements that semantic in O(1) per operation and matches the existing `quizData` array style used in [js/quiz.js](../../js/quiz.js).
- **Alternatives considered**:
  - *Set plus insertion index tracking*: overkill for ≤ deck-size data; no uniqueness benefit since cards are already unique objects.
  - *Immediate re-ask on wrong*: rejected in clarification (Q2 → C) for pedagogical reasons.
  - *Random reinsertion*: rejected in clarification (Q2 → C); deterministic end-of-queue is simpler and satisfies "varied order" once combined with the initial shuffle.

## Decision 2: Initial retry-pool ordering

- **Decision**: When the retry phase begins, the pool is seeded from the per-session `wrongCards` collection, then shuffled once with the same Fisher–Yates helper already used for `quizData` at session start.
- **Rationale**: FR-013 requires the initial order to be varied rather than strictly the order cards were missed. Reusing the existing `shuffle()` utility keeps the implementation trivial and consistent.
- **Alternatives considered**:
  - *Preserve miss order*: explicitly rejected by FR-013.
  - *Weight by miss count*: not needed — within a single session a card can only be missed once before entering the pool.

## Decision 3: Score display and "first-pass score" preservation

- **Decision**: Keep the existing `score` variable strictly as the first-pass score; do not mutate it during the retry phase. At the retry-phase transition, the Score label text is swapped for a "Retry" label, and the numeric score is hidden until the results screen. The results screen reads `score` unchanged.
- **Rationale**: FR-011 + FR-010a. Clarification Q3 chose the label swap (C). Keeping the variable itself untouched avoids any accidental coupling between retry outcomes and the displayed grade.
- **Alternatives considered**:
  - *Separate `retryCorrectCount` variable shown during retry*: not needed — the spec doesn't ask for a retry accuracy metric, only a "cards left to master" count.
  - *Freeze the numeric score in place during retry*: rejected in clarification (Q3 chose C, not A).

## Decision 4: Main-pass progress bar during retry

- **Decision**: Hide the main progress bar (`#progress-fill` container) during the retry phase using a CSS class toggle. Display a text indicator like "3 cards left to master" in the same region. On return to results, normal visibility is restored for future sessions.
- **Rationale**: FR-010 and clarification Q4 → C. A CSS class toggle keeps the change local and reversible and avoids fighting the existing `updateProgress()` math.
- **Alternatives considered**:
  - *Repurpose the existing bar as a retry progress bar*: rejected in clarification (Q4 chose C, not A/D).
  - *Keep the bar at 100%*: rejected in clarification (Q4 chose C, not B).

## Decision 5: Retry-phase transition banner

- **Decision**: Add a hidden-by-default block inside `#quiz-screen` (e.g. `#retry-banner`) containing the text "Retry phase: N cards to master" and a "Continue" button. When the main pass ends with a non-empty retry pool, hide the question layout and show the banner; on Continue, hide the banner and reveal the first retry card.
- **Rationale**: FR-009 requires an explicit, tap-to-continue transition screen. Clarification Q5 → B. Reusing the existing `#quiz-screen` avoids a new top-level screen/state.
- **Alternatives considered**:
  - *Toast/fade*: rejected in clarification (Q5 chose B, not C).
  - *No dedicated transition*: rejected (Q5 chose B, not A).
  - *New top-level screen*: overkill; adds state machine complexity for a single-tap interstitial.

## Decision 6: Flagging a card during retry phase

- **Decision**: Reuse the existing mid-session flag handler. If a card in the retry pool is flagged, remove it from the pool (`filter` out that card), advance, and re-check the empty-pool gate to decide whether to show results.
- **Rationale**: FR-012 explicitly says to preserve existing flag-suspends-from-session behavior. The retry pool is just another in-memory queue; the same removal pattern applies.
- **Alternatives considered**:
  - *Forbid flagging during retry*: would confuse users and contradict FR-012.

## Decision 7: Abandonment during retry

- **Decision**: No new cleanup code. The retry pool is a module-scoped variable; navigating to another deck or resetting the session simply reassigns it, matching how `quizData`/`current`/`score` are handled today.
- **Rationale**: FR-014. Retry state is explicitly per-session-only and not persisted, so normal session teardown is sufficient.
- **Alternatives considered**:
  - *Confirm-before-abandon prompt*: out of scope; no requirement asks for it.

## Decision 8: Scope — Flagged Cards review session

- **Decision**: Retry logic is guarded by the existing `isFlaggedMode` flag. When `isFlaggedMode === true`, the main-pass-end path continues to show results immediately with no retry phase.
- **Rationale**: FR-015 + clarification Q1 → A. Flagged-cards review is an inspection/triage tool; applying retry-until-mastered there would hurt UX.
- **Alternatives considered**:
  - *Apply retry to both modes*: rejected in clarification.

## Out-of-scope confirmations

- No Firebase schema changes.
- No changes to the AI "Why?" explainer (functions/ and api/ remain untouched).
- No changes to question content in [js/questions.js](../../js/questions.js).
- No changes to the flagged-cards review flow.
- No new dependencies; all behavior implemented in vanilla JS/CSS/HTML.
