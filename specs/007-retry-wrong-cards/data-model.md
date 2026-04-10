# Phase 1 Data Model: Retry Wrong Cards Until Mastered

**Feature**: 007-retry-wrong-cards
**Date**: 2026-04-10

No persisted schema changes. All state lives in-memory inside [js/quiz.js](../../js/quiz.js) for the lifetime of a single deck session and is discarded on abandonment or return to the start/results screen.

## Entities (in-memory only)

### Deck Session

Already exists conceptually in `quiz.js` as a cluster of module-scoped variables. This feature adds retry-phase tracking to the same cluster.

Existing fields (unchanged shape):

| Field | Type | Purpose |
| --- | --- | --- |
| `quizData` | `Array<Question>` | Shuffled main-pass queue for the current session. |
| `current` | `number` | Index into `quizData` during main pass. |
| `score` | `number` | First-pass correct-answer count. Preserved — never incremented during retry phase. |
| `answered` | `boolean` | Whether the currently shown card has already been answered. |
| `isFlaggedMode` | `boolean` | Whether the session is the Flagged Cards review (retry logic disabled when true). |

New fields added for this feature:

| Field | Type | Purpose |
| --- | --- | --- |
| `wrongCards` | `Array<Question>` | Cards the learner has answered incorrectly in the current session that have not yet been answered correctly. Used both during main pass (append on wrong) and as the seed for the retry pool. |
| `retryMode` | `boolean` | `true` once the retry phase has been entered; gates progress bar visibility, score-label swap, and which queue the "next card" handler reads from. |
| `retryQueue` | `Array<Question>` | The active retry pool during the retry phase. Treated as FIFO: `shift()` on correct, `push()` on wrong. When empty, the session ends and the results screen is shown. |

### Question (shape unchanged)

Defined statically in [js/questions.js](../../js/questions.js). Shape used by this feature:

| Field | Type | Notes |
| --- | --- | --- |
| `question` | `string` | Prompt text. |
| `options` | `Array<string>` | Answer choices. |
| `correct` | `number` | Index into `options` of the correct answer (pre-shuffle). |
| `category` | `string` | Displayed category label. |
| `_shuffledCorrect` | `number` | Transient index of correct answer after per-render shuffle, added by existing `showQuestion()`. Retry path reuses the same rendering so this field continues to be set per render. |

No new fields are added to question objects. Retry tracking is by object identity (pushing the same object reference into `wrongCards` / `retryQueue`).

## State transitions

```text
┌──────────────┐
│ Session Start│
│  wrongCards=[]│
│  retryMode=false│
│  retryQueue=[]│
└──────┬───────┘
       │
       ▼
┌────────────────────────┐
│        Main pass       │
│  current advances      │
│  on wrong: wrongCards  │
│  .push(card), reveal   │
│  correct, Next         │
└──────┬─────────────────┘
       │ Next pressed on last main-pass card
       ▼
┌──────────────────────────────┐
│  End-of-main-pass decision   │
└──────┬───────────────────────┘
       │ wrongCards empty?
       │
   ┌───┴───┐
   │ Yes   │ No
   ▼       ▼
┌──────┐ ┌──────────────────────────┐
│Results│ │ Enter retry phase        │
│screen │ │  retryMode = true        │
└──────┘ │  retryQueue = shuffle(    │
         │      wrongCards)          │
         │  Show retry banner        │
         └──────┬───────────────────┘
                │ User taps Continue
                ▼
         ┌──────────────────────────┐
         │       Retry phase        │
         │  Show retryQueue[0]      │
         │  on correct: shift(),    │
         │     render next (or     │
         │     results if empty)   │
         │  on wrong: after reveal  │
         │     & Next, pop head,    │
         │     push to tail, render │
         │     new head             │
         └──────┬───────────────────┘
                │ retryQueue empty
                ▼
            ┌──────┐
            │Results│
            └──────┘
```

## Invariants

1. `score` is only incremented in the main pass. It is never mutated in the retry phase.
2. During the main pass, if the learner answers correctly, the card is NOT added to `wrongCards`. Cards enter `wrongCards` exactly when the main-pass answer is incorrect.
3. At the moment of transition from main pass to retry phase, `retryQueue` is seeded from the shuffled contents of `wrongCards`. After that, `wrongCards` is not read again for this session (it can be left as-is or cleared; no consumer depends on it during retry).
4. During the retry phase, the only way to leave the phase is for `retryQueue.length === 0`, via (a) consecutive correct answers that shift all items off, (b) flagging the last remaining card (FR-012 removes from pool), or (c) session abandonment (which discards all state).
5. The results screen is shown iff:
   - `isFlaggedMode === true` at the end of the main pass (retry logic skipped by FR-015), OR
   - `retryMode === false` and `wrongCards.length === 0` at the end of the main pass, OR
   - `retryMode === true` and `retryQueue.length === 0`.
6. Retry state is never written to Firebase and never read from `localStorage`.

## Validation rules (from requirements)

- **FR-001 / FR-002**: Every main-pass wrong answer MUST push its card object onto `wrongCards` before advancing.
- **FR-005**: During retry phase, the rendering code MUST source the current card from `retryQueue[0]`, not from `quizData[current]`.
- **FR-006**: A correct answer during retry MUST `shift()` the head off `retryQueue` before rendering the next card.
- **FR-007 / FR-013**: A wrong answer during retry MUST push the just-missed card to the tail of `retryQueue` (after the learner taps Next), then render the new head. If the queue has only one item, that push-then-render-head naturally re-renders the same card.
- **FR-008**: The results screen MUST be shown if and only if the emptiness gate in Invariant 5 is satisfied.
- **FR-011**: The code path that increments `score` MUST remain gated on `retryMode === false`.
- **FR-012**: The existing flag handler MUST, when `retryMode === true`, remove the flagged card from `retryQueue` and re-evaluate the empty-pool gate.
- **FR-014**: No persistence — no new `localStorage` keys, no new Firebase refs.
- **FR-015**: Entry into retry phase MUST be skipped when `isFlaggedMode === true`.
