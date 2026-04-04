# Research: Organize Deck Structure

**Branch**: `002-organize-deck-structure` | **Date**: 2026-04-04

## Decision 1: Deck Data Storage Approach

**Decision**: Add a `decks` array property to each unit object in `js/questions.js`. Each deck stores section indices and a descriptive name.

**Rationale**: Keeps deck assignments explicit and co-located with the content they reference. The `sections` array remains unchanged, so no risk of breaking existing data. Static assignments in the data file align with Constitution Principle V (content lives in `js/questions.js` as static data).

**Alternatives considered**:
- **Runtime computation in quiz.js**: Algorithm groups sections at load time. Rejected because the spec states "sections are pre-assigned to decks" (static at build time) and runtime computation makes deck labels harder to customize.
- **Separate deckConfig object**: A separate mapping from unit IDs to deck groupings. Rejected because it separates related data that's easier to maintain together.
- **Restructure sections into deck sub-arrays**: Move sections inside deck objects. Rejected because it's a much larger change to the 3,780-line file and breaks the existing `unit.sections` contract used by `startQuiz()`.

## Decision 2: Sidebar Hierarchy Pattern

**Decision**: Use a 3-level hierarchy (Level > Unit > Deck) with units as collapsible groups. Units default to collapsed state. No accordion behavior (multiple units can be open).

**Rationale**: With ~45 decks, a flat list would require excessive scrolling. Collapsible units let the learner focus on one unit at a time while maintaining the Level > Unit organizational structure. Non-accordion behavior avoids disorienting auto-collapse when exploring multiple units.

**Alternatives considered**:
- **Flat deck list under level headers**: Simpler but loses unit grouping context, making it hard to tell which decks belong together.
- **Accordion (only one unit open at a time)**: More compact but frustrating when comparing decks across units.
- **Two-panel sidebar (levels in tab bar, decks in list)**: Overly complex for a vanilla JS app with only 2 levels.

## Decision 3: Deck Grouping Algorithm

**Decision**: Greedy sequential grouping with a 55-question soft target, 20-question minimum per deck, and never splitting sections.

**Rationale**: Sections are the natural topic boundary in the curriculum. Splitting sections would mix unrelated grammar topics. The greedy approach (accumulate sections until ~55, then cut) is simple, deterministic, and produces balanced decks. The 20-question minimum prevents trivially small decks that don't provide meaningful practice.

**Alternatives considered**:
- **Equal-sized decks (divide total by target, then assign sections)**: More balanced but complex to implement and may create awkward topic groupings.
- **One section per deck**: Too granular — many sections have only 3-8 questions.
- **Manual deck assignments**: Most accurate but high maintenance burden when content changes. The algorithm can be overridden per-unit if needed.

## Decision 4: Deck Naming Strategy

**Decision**: Auto-generate deck names from the first 2-3 section names in each deck, joined with "&". Truncate if too long.

**Rationale**: Section names already describe the grammar topic accurately (e.g., "Future Tense Fill in the Blank", "Olmak (Future Tense Conjugation)"). Combining them gives a descriptive label without requiring manual metadata. For single-section decks, use the section name directly.

**Alternatives considered**:
- **Manual deck names**: Most readable but requires maintenance for each unit.
- **"Part 1 / Part 2" numbering**: Easy to generate but conveys no topic information — contradicts spec requirement for topic-based labels (FR-003).
- **First section name only**: Misses the scope when a deck covers 4-5 sections.

## No NEEDS CLARIFICATION Items

All technical unknowns have been resolved. No blocking dependencies remain.
