# Tasks: Organize Deck Structure

**Input**: Design documents from `/specs/002-organize-deck-structure/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Not requested — no test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Foundational (Data Layer)

**Purpose**: Add deck definitions to the content data file. This MUST be complete before any sidebar or quiz logic changes.

**⚠️ CRITICAL**: No user story work can begin until deck data exists in `js/questions.js`.

- [x] T001 Add `decks` array to all A1 units (a1-unit1a through a1-unit12) in `js/questions.js` using the greedy grouping algorithm: walk sections sequentially, cut at ~55 questions, merge final deck if <20 questions, single deck for units ≤60 questions. Deck names derived from first 2-3 section names joined with "&".
- [x] T002 Add `decks` array to all B1 units (b1-unit1 through b1-unit12) in `js/questions.js` using the same grouping algorithm as T001.
- [x] T003 Validate deck data integrity: verify every section index is covered exactly once per unit, all deck question counts are 20-70, and 80%+ of decks have 40-60 questions. Log results to console or fix any violations.

**Checkpoint**: `js/questions.js` has deck definitions for all 25 units. Data layer complete.

---

## Phase 2: User Story 1 — Browse Decks by Level (Priority: P1) 🎯 MVP

**Goal**: Learners see a 3-level sidebar (Level > Unit > Deck) with collapsible unit groups. Decks show topic labels and question counts.

**Independent Test**: Open the app, verify sidebar shows level headers, collapsed unit headers, and expanding a unit reveals its decks with descriptive labels and question counts.

### Implementation for User Story 1

- [x] T004 [P] [US1] Add CSS styles for `.sidebar-unit-header` (collapsible group header with chevron indicator ▸/▾), `.sidebar-unit-decks` (hidden deck container), and `.sidebar-deck` (individual deck button with topic label + question count) in `css/style.css`. Nest deck buttons visually under unit headers with indentation.
- [x] T005 [US1] Rewrite the `init()` function in `js/quiz.js` to render a 3-level hierarchy: keep existing level headers (A1, B1), add clickable unit headers that show unit name + chevron, and nest deck buttons inside a collapsible container per unit. Default state: levels expanded, all units collapsed. Each deck button displays `deck.name · N questions` where N is computed from the referenced sections.
- [x] T006 [US1] Add `toggleUnit(unitId)` function in `js/quiz.js` that toggles visibility of the deck container for a unit and updates the chevron indicator. Expanding one unit should NOT collapse others.

**Checkpoint**: Sidebar renders the 3-level hierarchy correctly. Units collapse/expand. Deck labels and question counts display. Clicking a deck does nothing yet (quiz logic in US2).

---

## Phase 3: User Story 2 — Play a Focused Deck (Priority: P1)

**Goal**: Clicking a deck starts a quiz with only that deck's ~50 questions. Scoring, sounds, and flagging work as before.

**Independent Test**: Click any deck, verify only its questions are presented, score denominator matches deck size, and completion screen works correctly.

### Implementation for User Story 2

- [x] T007 [US2] Update `startQuiz()` in `js/quiz.js` to accept a unit object and deck index (or deck object). Change question sourcing from `unit.sections.flatMap(...)` to only the sections referenced by `deck.sections` array indices. Set quiz title to the deck name instead of the unit name.
- [x] T008 [US2] Replace `setActiveUnit()` with `setActiveDeck()` in `js/quiz.js`. Give each deck button a unique ID (e.g., `deck-{unitId}-{deckIndex}`). Update active state highlighting to work at deck level instead of unit level.
- [x] T009 [US2] Wire deck button click handlers in `init()` (from T005) to call `startQuiz(unit, deckIndex)`. Ensure `closeSidebar()` is called after deck selection on mobile. Remove the old unit-level click-to-play behavior — decks are the only playable items (FR-009).

**Checkpoint**: Full quiz flow works through decks. Selecting a deck loads only its questions, scores correctly, plays sounds, and flagging works. This is the MVP — all core functionality is operational.

---

## Phase 4: User Story 3 — Understand Progress Within a Unit (Priority: P2)

**Goal**: Learners can clearly see which decks belong to the same unit. Unit grouping is visually distinct and intuitive.

**Independent Test**: Verify that decks from multi-deck units (e.g., Unit 7 with 3 decks) are visually grouped together under their unit header, and the unit header clearly identifies the unit.

### Implementation for User Story 3

- [x] T010 [US3] Refine unit header styling in `css/style.css` to visually distinguish unit groups: add subtle background color or left border to the unit header, ensure deck buttons appear indented and visually contained under their parent unit. Add a subtle separator or spacing between different unit groups.
- [x] T011 [US3] Update unit header text in `js/quiz.js` to show a short unit label (e.g., "Unit 7" or the unit's display name) along with a summary (e.g., "3 decks · 153 questions") so learners understand the unit scope at a glance.

**Checkpoint**: All user stories implemented. Sidebar is visually clear with distinct unit groupings.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Validation, edge cases, and cross-cutting improvements.

- [x] T012 [P] Validate all 2,263 questions are accessible: sum question counts across all decks for all units, verify total matches original. Check in browser console or via a temporary validation snippet.
- [x] T013 [P] Test mobile responsiveness: verify sidebar toggle, overlay behavior, and auto-close on deck selection all work correctly on mobile viewport in `css/style.css` and `js/quiz.js`.
- [x] T014 [P] Verify flagged cards feature works across deck boundaries: flag questions from different decks, open flagged cards quiz, confirm all flagged questions appear regardless of source deck.
- [x] T015 Verify sounds (correct/wrong/complete) play correctly during deck quizzes. Verify mute toggle persists.
- [x] T016 Update "Back to Units" button text on results screen in `index.html` or `js/quiz.js` if wording needs adjustment for deck context (e.g., "Back to Decks" or keep as-is).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately. BLOCKS all user stories.
- **US1 — Browse Decks (Phase 2)**: Depends on Phase 1 (deck data must exist).
- **US2 — Play Deck (Phase 3)**: Depends on Phase 2 (deck buttons must exist in sidebar to wire click handlers).
- **US3 — Visual Grouping (Phase 4)**: Depends on Phase 2 (sidebar hierarchy must be rendered).
- **Polish (Phase 5)**: Depends on Phases 2 + 3 (core functionality must work).

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only. Can be tested independently (sidebar renders correctly).
- **US2 (P1)**: Depends on US1 (needs deck buttons to exist). Can be tested independently once US1 is done.
- **US3 (P2)**: Depends on US1 (needs unit headers rendered). Can be tested independently (visual styling).

### Within Each User Story

- CSS tasks (T004, T010) can run in parallel with JS tasks if no cross-dependencies
- JS logic tasks within a story are sequential (rendering before wiring)

### Parallel Opportunities

- **Phase 1**: T001 and T002 modify different sections of the same file — execute sequentially to avoid conflicts
- **Phase 2**: T004 (CSS) can run in parallel with T005 (JS) since they're different files
- **Phase 5**: T012, T013, T014 can all run in parallel (independent validation tasks)

---

## Parallel Example: User Story 1

```
# These can run in parallel (different files):
Task T004: CSS styles for sidebar hierarchy in css/style.css
Task T005: Rewrite init() sidebar rendering in js/quiz.js

# This depends on T005:
Task T006: Add toggleUnit() collapse/expand logic in js/quiz.js
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Foundational (deck data in questions.js)
2. Complete Phase 2: US1 — Browse Decks (sidebar hierarchy)
3. Complete Phase 3: US2 — Play Deck (quiz logic)
4. **STOP and VALIDATE**: Full quiz flow through decks works end-to-end
5. Deploy/demo if ready — this is the MVP

### Incremental Delivery

1. Phase 1 → Data layer ready
2. Phase 2 (US1) → Sidebar browsable → Validate independently
3. Phase 3 (US2) → Decks playable → Validate end-to-end (MVP!)
4. Phase 4 (US3) → Visual polish → Validate grouping clarity
5. Phase 5 → Validation & edge cases → Ready for merge

---

## Notes

- All changes are in 3 existing files: `js/questions.js`, `js/quiz.js`, `css/style.css`
- No new files or directories needed in source tree
- `index.html` has no structural changes (sidebar is populated dynamically)
- Firebase schema is unchanged — no `database.rules.json` edits needed
- Commit after each phase completion for clean git history
