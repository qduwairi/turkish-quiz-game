# Implementation Plan: Organize Deck Structure

**Branch**: `002-organize-deck-structure` | **Date**: 2026-04-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-organize-deck-structure/spec.md`

## Summary

Reorganize the existing 25 units (2,263 questions) into ~50-question decks by grouping sections within each unit. The sidebar gains a 3-level hierarchy (Level > Unit > Deck) with collapsible unit groups. Decks become the only playable items — each deck is a self-contained quiz of ~50 questions drawn from related sections.

## Technical Context

**Language/Version**: HTML5, CSS3, vanilla JavaScript (ES6+)
**Primary Dependencies**: None (Web Audio API built-in, Firebase for flagged cards)
**Storage**: Firebase Realtime Database (flagged cards only); quiz content in `js/questions.js`
**Testing**: Manual browser testing (mobile + desktop)
**Target Platform**: Modern evergreen browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Static client-side web application
**Performance Goals**: Instant page load (static files, no build step)
**Constraints**: No frameworks, no build tools, no server-side code. Firebase is sole external dependency.
**Scale/Scope**: 25 units, 2,263 questions → ~45 decks

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Content Accuracy | **PASS** | No question content is modified — only reorganized into decks |
| II. Progressive Difficulty | **PASS** | CEFR level ordering preserved; units remain freely selectable; sidebar reflects increasing difficulty |
| III. Simplicity & Vanilla Stack | **PASS** | No new dependencies; plain HTML/CSS/JS only; no build tools |
| IV. Responsive & Accessible UI | **PASS** | Mobile sidebar behavior preserved; collapsible unit groups improve scannability |
| V. Data Persistence | **PASS** | Deck definitions added to `js/questions.js` as static data; flagged cards unaffected; no Firebase schema changes |

All gates pass. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/002-organize-deck-structure/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
js/
├── questions.js         # MODIFY: Add deck definitions to each unit object
└── quiz.js              # MODIFY: New sidebar rendering (3-level hierarchy),
                         #         deck-based quiz start, collapse/expand logic
css/
└── style.css            # MODIFY: Styles for unit headers, deck buttons,
                         #         collapse/expand affordance
index.html               # NO CHANGE (sidebar-nav populated dynamically)
```

**Structure Decision**: This is a purely frontend static app. All changes are in the existing 3 files (`questions.js`, `quiz.js`, `style.css`). No new files or directories needed in the source tree.

## Implementation Phases

### Phase 1: Data Restructuring (`js/questions.js`)

Add a `decks` array to each unit object that groups its sections into ~50-question decks. Each deck references section indices and carries a descriptive label derived from section names.

**Algorithm for grouping sections into decks:**
1. Walk sections in order, accumulating a running question count
2. When adding the next section would push the running total past 55, cut the current deck and start a new one
3. If the final deck has fewer than 20 questions, merge it into the previous deck
4. If a single section has more than 55 questions, it becomes its own deck
5. Units with 60 or fewer total questions get a single deck containing all sections

**Deck label generation**: Concatenate the first 2-3 section names in the deck, abbreviated if needed (e.g., "Future Tense & Olmak & Exclamations"). For single-section decks, use the section name directly.

**Data shape change** (see `data-model.md` for full schema):
```js
{
  id: "a1-unit7",
  name: "A1 — Unit 7",
  decks: [
    { name: "Future Tense & Time Expressions", sections: [0, 1, 2, 3, 4] },
    { name: "Olmak & Similes", sections: [5, 6, 7, 8, 9] },
    { name: "-ecekti & -ce/-ca Suffix", sections: [10, 11, 12, 13, 14, 15, 16, 17] }
  ],
  sections: [ /* unchanged */ ]
}
```

### Phase 2: Sidebar Rendering (`js/quiz.js`, `css/style.css`)

Replace the flat unit list in `init()` with a 3-level hierarchy:

1. **Level headers** (A1, B1) — existing `sidebar-level-header` elements, kept as-is
2. **Unit headers** — new clickable elements that expand/collapse to show decks. Display unit name only (e.g., "Unit 7"). Default state: collapsed.
3. **Deck buttons** — nested under each unit, hidden until unit is expanded. Display deck topic label + question count. Clicking starts the quiz for that deck.

**Collapse/expand behavior**:
- Clicking a unit header toggles its deck list visibility
- A chevron indicator (CSS triangle or ▸/▾ character) shows expand/collapse state
- On initial load: all units collapsed (per FR-006 clarification)
- Expanding one unit does NOT auto-collapse others (accordion pattern not required)

**CSS additions**:
- `.sidebar-unit-header` — styled as a collapsible group header with chevron
- `.sidebar-unit-decks` — container for deck buttons, hidden by default
- `.sidebar-deck` — individual deck button (smaller than current unit buttons)
- Indentation to visually nest decks under units

### Phase 3: Quiz Logic (`js/quiz.js`)

Modify `startQuiz()` to accept a deck reference instead of a full unit:

1. **New function signature**: `startQuiz(unit, deckIndex)` — or pass the deck object directly
2. **Question sourcing**: Instead of `unit.sections.flatMap(...)`, use only the sections referenced by the selected deck's `sections` array
3. **Quiz title**: Show the deck name (e.g., "Future Tense & Olmak") instead of the unit name
4. **Active state**: Highlight the selected deck button in the sidebar
5. **Results screen**: Score denominator reflects deck question count (already works since `quizData.length` is used)

**Flagged cards**: No changes needed — `startFlaggedQuiz()` draws from `flaggedCache` which is independent of deck structure.

**`setActiveUnit()` update**: Rename to `setActiveDeck()` or extend to handle deck-level active state. Each deck button gets a unique ID (e.g., `deck-a1-unit7-0`).

### Phase 4: Polish & Validation

1. Verify all 2,263 questions are reachable through the deck structure (sum all deck question counts)
2. Check deck sizes: 80%+ should be 40-60 questions, all between 20-70
3. Test mobile sidebar: toggle, overlay, deck selection closes sidebar
4. Test flagged cards still work across decks
5. Verify sounds (correct/wrong/complete) play correctly within deck quizzes
