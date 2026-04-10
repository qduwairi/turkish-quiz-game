# Phase 1 Data Model: Suspend Flagged Cards from Normal Decks

**Feature**: 006-suspend-flagged-cards
**Date**: 2026-04-10

This feature introduces **no new persistent entities and no schema changes**. It reuses existing in-memory and Firebase structures with two small behavioral augmentations (a derived flag and two computed values).

## Existing entities (unchanged)

### Question (static, in `js/questions.js`)

```js
{
  question: string,   // canonical identity key (see research.md D1)
  options: string[],  // 4 answer options
  correct: number     // index into options
}
```

Lives inside `units[].sections[].questions[]`. Not persisted to Firebase. No changes.

### Deck (derived from a Unit)

Either the default single-deck `[{ name: unit.name, sections: [0..n] }]` or an explicit `unit.decks` array. Each deck references sections by index. No changes.

### Flagged entry (persisted in Firebase at `/flagged`)

```js
{
  question: string,
  options: string[],
  correct: number,
  category: string
}
```

Stored as an array under the `flagged` Firebase node. Synced via `initFlaggedSync()` into `flaggedCache`. **No schema changes.** `database.rules.json` does not need updating.

## Derived / computed values introduced by this feature

These are **not** new stored fields. They are computed on demand from existing state.

### `isSuspended(question)` — derived boolean

**Definition**: A Question is *suspended* iff it is currently present in `flaggedCache` (matched by `question` string equality).

**Already implemented** as `isFlagged(questionText)` at `js/quiz.js:119`. This feature reuses it; "suspended" is a synonym applied at the deck-filtering layer.

**Source of truth**: `flaggedCache`, which mirrors Firebase `/flagged`.

### `availableCardsForDeck(unit, deck)` — derived array

**Definition**: Given a unit and a deck descriptor, returns the list of question objects composing that deck, minus any whose `question` string appears in `flaggedCache`.

```text
deck.sections.flatMap(si => unit.sections[si].questions)
  .filter(q => !isSuspended(q.question))
```

**Where used**:
- `startQuiz()` — to compose `quizData` (replaces the existing `flatMap` at `js/quiz.js:271–274`, adding the `.filter` step).
- Sidebar rendering — to compute visible deck counts.

### `availableCountForDeck(unit, deck)` — derived integer

**Definition**: `availableCardsForDeck(unit, deck).length`.

**Where used**:
- Sidebar deck-count labels.
- Unit-header total (`N questions` text in `init()`, currently `totalQuestions = unit.sections.reduce((sum, s) => sum + s.questions.length, 0)` at `js/quiz.js:201`) — replaced by a sum of `availableCountForDeck` across the unit's decks.

## State transitions

### Card suspension state

```text
         toggleFlag (in non-flagged mode, currently not flagged)
               │
  not-flagged ─┼──▶  flagged (= suspended)
               │
               │   toggleFlag (currently flagged, any mode)
               ◀──
```

- `not-flagged → flagged`: adds entry to `flaggedCache` and Firebase; triggers sidebar re-render; if happening inside a normal deck session, the card is also spliced from the in-progress `quizData` (see D3 in research).
- `flagged → not-flagged`: removes entry from `flaggedCache` and Firebase; triggers sidebar re-render; does **not** mutate any in-progress `quizData` (per FR-005a).

### Deck session state (unchanged, but session length is now filtered-derived)

```text
idle ──startQuiz──▶ in-progress ──selectAnswer[last]──▶ results
          │                │
          │                └──toggleFlag (normal mode) ─▶ in-progress (quizData shortened)
          │
          └──(quizData empty)──▶ idle + empty-state message
```

The new `idle + empty-state message` path is the only structurally new branch (see research D5).

## Invariants

- **I1**: At any moment, a Question `q` is in a normal deck's `quizData` ⟺ `q.question ∉ flaggedCache` *at the time `startQuiz` was invoked, minus any entries spliced by mid-session flag toggles*.
- **I2**: The Flagged Cards session's `quizData` is never filtered by suspension: `startFlaggedQuiz()` uses `[...flaggedCache]` unchanged.
- **I3**: `flaggedCache` is the sole source of truth for suspension. All visible counts and session contents derive from it; no parallel "suspended" list exists.
- **I4**: Firebase schema at `/flagged` is unchanged; existing clients continue to function (trivially — this is a pure read-side behavioral change).
- **I5**: Sidebar counts match actual session length for a deck with no mid-session flag toggles (FR-006 testable assertion).

## Validation rules

- When the new filter reduces `quizData` to length 0, the app MUST short-circuit to the empty-state branch and MUST NOT transition to `quiz-screen` (prevents divide-by-zero in `updateProgress`).
- `toggleFlag()` MUST branch on `isFlaggedMode`:
  - `isFlaggedMode === false` and `isFlagged(current) === true` after toggle: splice current card from `quizData`.
  - `isFlaggedMode === true`: never splice; update flag button only.
- `initFlaggedSync`'s listener MUST re-render the sidebar on every `flaggedCache` update so counts stay live.
