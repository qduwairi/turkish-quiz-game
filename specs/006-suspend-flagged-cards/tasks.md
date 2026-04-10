---
description: "Task list for feature 006-suspend-flagged-cards"
---

# Tasks: Suspend Flagged Cards from Normal Decks

**Input**: Design documents from `/specs/006-suspend-flagged-cards/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/quiz-module.md ✅, quickstart.md ✅

**Tests**: No automated tests are generated. This project relies on manual browser verification (per constitution "Development Workflow"). Quickstart scenarios serve as the test plan.

**Organization**: Tasks are grouped by user story. Because this feature's code lives almost entirely inside `js/quiz.js`, most implementation tasks are sequential on that file; `[P]` markers are used only where files or sections are truly independent.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Paths are absolute from repository root `C:\Users\MSI\turkish-quiz-game\`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: None beyond what the repo already has.

- [X] T001 Verify working tree is clean on branch `006-suspend-flagged-cards` and that `js/quiz.js`, `index.html`, `css/style.css`, `database.rules.json` are present (no new files required for setup).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Introduce the shared helpers and DOM/CSS scaffolding that all user stories rely on. These are small, isolated edits that do not themselves change user-visible behavior.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Add an empty-state message element to `index.html` on the start screen: a `<div id="deck-empty-msg" class="deck-empty-msg hidden" role="status" aria-live="polite"></div>` placed inside the existing start-screen container so it renders in place of deck content when shown. Do not wire it up yet.
- [X] T003 [P] Add styling for `.deck-empty-msg` in `css/style.css`: reuse existing typography/color tokens, center the text, respect the theme variables (dark/light), and ensure the element is hidden by default via the existing `.hidden` utility class. Add a `.deck-empty-msg.visible` rule if needed.
- [X] T004 Add a pure helper `availableCardsForDeck(unit, deck)` in `js/quiz.js` near the `// ── Flagged Cards (Firebase) ──` block. It must return `deck.sections.flatMap(si => unit.sections[si].questions.map(q => ({ ...q, category: unit.sections[si].name }))).filter(q => !isFlagged(q.question))`. Do not call it yet. (Data model reference: data-model.md → `availableCardsForDeck`.)
- [X] T005 Extract the sidebar unit/deck count rendering currently inlined in `init()` (`js/quiz.js:201–227`) into a new function `renderSidebarCounts()` that locates existing nodes by their stable IDs (`unit-header-${unit.id}`, `deck-${unit.id}-${di}`) and updates only their text spans (`.sidebar-unit-header-meta`, `.sidebar-deck-meta`) using `availableCardsForDeck(unit, deck).length` for each deck and the sum across decks for unit totals. Must NOT rebuild DOM nodes or detach event listeners. Call it once at the end of `init()` after the existing DOM build so initial load reflects flagged suspension.
- [X] T006 Wire `renderSidebarCounts()` into the existing Firebase listener inside `initFlaggedSync()` in `js/quiz.js:100–108`. Add the call after `flaggedCache` is updated, alongside the existing `updateFlaggedDeck()` call. This makes sidebar counts reactive to flag changes from any source (local or cross-device).

**Checkpoint**: Helpers exist and sidebar counts update live when flags change, but deck sessions are not yet filtered. User story phases can now begin.

---

## Phase 3: User Story 1 — Flagging a card removes it from its normal deck (Priority: P1) 🎯 MVP

**Goal**: A flagged card is excluded from normal deck sessions both when starting a deck (filter at session composition) and when flagged mid-session (splice from the in-progress queue). Empty decks show an explanatory message instead of launching a broken session.

**Independent Test**: Quickstart Scenarios 1, 2, 3, 6, 7 (see `quickstart.md`). Flag a card mid-run and confirm it disappears; restart deck and confirm it's still absent; open Flagged Cards and confirm it's still reviewable; confirm sidebar counts update; flag all cards in a small deck and confirm the empty-state message.

### Implementation for User Story 1

- [X] T007 [US1] Modify `startQuiz(unit, deckIndex)` in `js/quiz.js:261–288` to compose `quizData` via the new helper: replace the existing `shuffle(deck.sections.flatMap(...))` block with `const available = availableCardsForDeck(unit, deck); quizData = shuffle(available);`. Leave all other logic (deck resolution, active-deck highlighting, screen transitions) intact.
- [X] T008 [US1] In the same `startQuiz` function, immediately after computing `available` and before touching screens, add an empty-state short-circuit: if `available.length === 0`, call `showDeckEmptyState(deck)` and `return` without calling `shuffle`, hiding start-screen, or resetting `current`/`score`. Ensure `setActiveDeck(deckId)` and `closeSidebar()` are NOT called in this branch (leave sidebar open so the user can pick another deck).
- [X] T009 [US1] Add a new function `showDeckEmptyState(deck)` in `js/quiz.js` near the other UI helpers. It must set `#deck-empty-msg` text to `All cards in "${deck.name}" are flagged. Review them in the Flagged Cards section.` and toggle the element visible (remove `.hidden`, add `.visible`). Also add a hidden-reset: at the top of `startQuiz` (before any other work) and inside `backToUnits()`, ensure `#deck-empty-msg` is hidden again so it does not linger across deck clicks. Do the same inside `startFlaggedQuiz()`.
- [X] T010 [US1] Modify `toggleFlag()` in `js/quiz.js:123–135` to add the mid-session drop for normal mode. After the existing `saveFlagged(flagged); updateFlagBtn(); updateFlaggedDeck();` calls, add a branch:
  - If `idx < 0` (card was just added to flagged) AND `isFlaggedMode === false`: splice `quizData` at index `current`. Then:
    - if `quizData.length === 0` → call `showResults()`;
    - else if `current >= quizData.length` → call `showResults()` (last card was flagged);
    - else → call `showQuestion()` to render the next card at the same `current` index.
  - If the card was removed from flagged (unflag direction) OR `isFlaggedMode === true`: do NOT mutate `quizData` (FR-005a / US3 invariant lives here too).
- [X] T011 [US1] Verify `updateProgress()` in `js/quiz.js:294–298` still behaves correctly after mid-session splice. Specifically, `current` points to the newly-shown card's index and `quizData.length` has decreased by 1, so `(current / quizData.length) * 100` and the `current + 1 / quizData.length` display must render without divide-by-zero. No code change expected — this task is a code-read verification; add a one-line comment above `updateProgress` only if clarifying.
- [ ] T012 [US1] Manual verification via `quickstart.md` Scenarios 1, 2, 3, 6, and 7 in a browser. Do not check off until all five scenarios pass on at least one desktop viewport and one mobile-sized viewport.

**Checkpoint**: US1 complete. Flagging removes a card from its deck immediately and persistently; the sidebar count is live; empty decks show a message; the Flagged Cards section still works.

---

## Phase 4: User Story 2 — Existing flagged cards are suspended retroactively (Priority: P1)

**Goal**: Cards that were flagged before this release are also excluded from normal deck sessions on first load, with no migration.

**Independent Test**: Quickstart Scenario 4. With at least one pre-existing flagged card, load the app fresh and start that card's source deck — it must be absent without re-flagging.

### Implementation for User Story 2

- [X] T013 [US2] No new code. Retroactive suspension is structurally satisfied because `availableCardsForDeck` (T004) reads live `flaggedCache` at session start, and `initFlaggedSync` (T006) already populates `flaggedCache` from Firebase before any deck is started interactively. Confirm this by inspection of the code path: `init()` → `initFlaggedSync()` subscribes → Firebase fires initial `value` event → `flaggedCache` populated → user clicks deck → `startQuiz` calls `availableCardsForDeck` which sees populated cache.
- [ ] T014 [US2] Manual verification via `quickstart.md` Scenario 4 using a pre-existing flagged card. Also confirm on the same run that sidebar counts reflect the pre-existing suspension immediately after page load (no user interaction required).

**Checkpoint**: US2 complete. No additional code. US1 + US2 together form the MVP.

---

## Phase 5: User Story 3 — Unflagging a card returns it to its normal deck (Priority: P2)

**Goal**: Unflagging (from either the quiz view while in normal mode OR from inside the Flagged Cards session) restores the card to its source deck on the next start of that deck, without mutating any currently-running session.

**Independent Test**: Quickstart Scenarios 5 and 8. Unflag a card inside Flagged Cards session → current run continues unchanged → restart source deck → card is back. Cross-device consistency works.

### Implementation for User Story 3

- [X] T015 [US3] Re-read the `toggleFlag` change from T010 in `js/quiz.js` and verify the unflag path (`idx >= 0`, i.e. the card was in `flaggedCache` and is being removed) does NOT splice `quizData` in any mode. This is the FR-005a invariant. No new code if T010 was implemented correctly — this task is a focused code-review checkpoint.
- [X] T016 [US3] Verify that after unflagging (from either the normal quiz view or the Flagged Cards view), `flaggedCache` update triggers `renderSidebarCounts()` via `initFlaggedSync` (T006), so the source deck's count immediately increases by 1 in the sidebar without a reload.
- [ ] T017 [US3] Manual verification via `quickstart.md` Scenarios 5 and 8.

**Checkpoint**: All three user stories are independently verifiable. Feature behavior matches spec.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize the feature for merge.

- [ ] T018 [P] Run the full `quickstart.md` (all 8 scenarios + responsive check + regression smoke) on one desktop viewport (Chrome latest) and one mobile viewport (Chrome DevTools iPhone emulation). Note any deviations as issues, not silent fixes.
- [X] T019 [P] Confirm `database.rules.json` is unchanged (`git diff database.rules.json` returns nothing). Per constitution V, a schema change would require updating this file; we intentionally have none.
- [X] T020 Code cleanup pass on `js/quiz.js`: ensure the new functions (`availableCardsForDeck`, `renderSidebarCounts`, `showDeckEmptyState`) are grouped logically (near the Flagged Cards block for the first, near the sidebar helpers for the others), and that `toggleFlag` has a one-line comment explaining the mid-session splice rationale ("drop just-flagged card from in-progress normal session; see spec FR-003"). No other refactors.
- [X] T021 Confirm touch target of the flag button is still ≥44×44 CSS pixels after any layout shifts (should be unchanged — constitution IV compliance check).
- [ ] T022 Verify the "Why?" explainer, sound toggle, theme toggle, and results screen still function unchanged on both an unflagged and a post-splice session (regression smoke).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Trivial, no blockers.
- **Foundational (Phase 2)**: Blocks all user stories. T002 and T003 can run in parallel (different files). T004 must precede T005 (T005 calls `availableCardsForDeck`). T005 must precede T006 (T006 calls `renderSidebarCounts`).
- **US1 (Phase 3)**: Depends on Phase 2. Within US1, T007 → T008 → T009 must be sequential (all edit `startQuiz` / `index.html`/`css` wiring). T010 is independent of T007–T009 structurally but lives in the same file so treat as sequential. T011 (verification) after T010. T012 (manual QA) last.
- **US2 (Phase 4)**: Structurally satisfied by Phase 2 + US1. T013 and T014 are verification-only; can run after US1 completes.
- **US3 (Phase 5)**: Depends on Phase 2 + T010 from US1. T015–T017 are verification-focused; no new code.
- **Polish (Phase 6)**: Depends on all user stories being complete.

### User Story Dependencies

- **US1 (P1)**: The only story with new code beyond foundational helpers. Independently deliverable as MVP.
- **US2 (P1)**: Implicitly delivered by US1 + Phase 2 (no additional code).
- **US3 (P2)**: Implicitly delivered by US1's T010 branch guard (no additional code).

### Parallel Opportunities

- T002 (index.html) ∥ T003 (style.css) — different files, no interdependence.
- T018 ∥ T019 in the Polish phase — different activities on different files.
- Within a single story, the file overlap on `js/quiz.js` forces most implementation tasks to run sequentially. This is intentional; mis-ordered edits would clobber each other.

---

## Parallel Example: Phase 2 Foundational Kickoff

```text
# Two edits that don't touch each other's files:
Task T002: Add #deck-empty-msg to index.html
Task T003: Add .deck-empty-msg styles to css/style.css
```

Once those land, proceed sequentially with T004 → T005 → T006 (all in `js/quiz.js`).

---

## Implementation Strategy

### MVP (US1 + US2)

1. Phase 1 (T001) — trivial.
2. Phase 2 Foundational (T002–T006) — helpers, DOM node, CSS, listener wiring.
3. Phase 3 US1 (T007–T012) — actual filter + mid-session drop + empty-state.
4. Phase 4 US2 verification (T013–T014) — confirm retroactive behavior works.
5. **STOP and VALIDATE**: Run quickstart scenarios 1–4, 6, 7. If green, this is a shippable MVP.

### Full Feature

6. Phase 5 US3 (T015–T017) — verify unflag restoration and in-session invariance.
7. Phase 6 Polish (T018–T022) — full quickstart sweep, regression smoke, code cleanup.

### Single-Developer Execution Notes

Because this feature's code is confined to one file plus minor HTML/CSS, it is best executed by one person in a single focused session: the sequential edit order (T002, T003 in parallel; then T004 → T005 → T006 → T007 → T008 → T009 → T010; then manual QA) maps directly to natural code-editing workflow and minimizes rebase/merge conflict risk.

---

## Notes

- `[P]` tasks = different files, no dependencies.
- All user stories collapse to changes in `js/quiz.js` (plus minor `index.html` and `css/style.css` scaffolding), so parallelization across stories is limited.
- US2 and US3 require no new code beyond US1's T010 branch and Phase 2 foundations; their tasks are verification checkpoints. This is not a bug in task decomposition — it reflects that the feature's hard work is the filter + splice, and the other stories are emergent behavior from that work.
- Commit after each completed phase (Phase 2, Phase 3, Phase 5 polish) at minimum; more granular commits welcome.
- Stop at any checkpoint to validate independently via `quickstart.md`.
- Do not touch `database.rules.json`, `js/questions.js`, `api/`, or `functions/` — this feature has zero surface area in those locations.
