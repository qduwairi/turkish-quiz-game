# Feature Specification: Organize Deck Structure

**Feature Branch**: `002-organize-deck-structure`  
**Created**: 2026-04-04  
**Status**: Draft  
**Input**: User description: "I would like to organize the units and the levels in a user friendly way. Each deck should have around 50 questions."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Decks by Level (Priority: P1)

A learner opens the app and sees a clear, organized sidebar with levels (A1, B1) as top-level groups. Under each level, units are broken into manageable decks of approximately 50 questions each, with descriptive names that indicate the topics covered. The learner can quickly scan and pick a deck that matches what they want to practice.

**Why this priority**: This is the core experience — without clear deck organization, learners face overwhelming lists of 70-150 questions per unit with no way to do focused practice sessions.

**Independent Test**: Can be fully tested by opening the sidebar and verifying that all units are split into ~50-question decks with descriptive labels, grouped under their CEFR level.

**Acceptance Scenarios**:

1. **Given** the app is loaded, **When** the learner views the sidebar, **Then** they see levels (A1, B1) as group headers with decks listed underneath, each showing its topic name and question count.
2. **Given** a unit has more than 60 questions, **When** it is displayed in the sidebar, **Then** it is split into multiple decks of approximately 50 questions each, grouped by related sections.
3. **Given** a unit has 60 or fewer questions, **When** it is displayed in the sidebar, **Then** it appears as a single deck.
4. **Given** the app is loaded for the first time, **When** the sidebar renders, **Then** level headers (A1, B1) are expanded showing unit headers, but all units are collapsed (decks hidden until clicked).

---

### User Story 2 - Play a Focused Deck (Priority: P1)

A learner selects a specific deck from the sidebar and is presented with only the questions in that deck (~50 questions). The quiz experience is the same as today (shuffled questions, score tracking, sounds) but scoped to the smaller deck.

**Why this priority**: Equal priority with browsing — the deck must actually function as a standalone quiz for the reorganization to have value.

**Independent Test**: Can be tested by selecting any deck and verifying only ~50 questions are presented, with correct scoring and completion flow.

**Acceptance Scenarios**:

1. **Given** the learner selects a deck with 50 questions, **When** the quiz starts, **Then** only those 50 questions are shuffled and presented.
2. **Given** the learner completes all questions in a deck, **When** the results screen appears, **Then** it shows the score out of the deck's question count (not the full unit's count).

---

### User Story 3 - Understand Progress Within a Unit (Priority: P2)

A learner who has been working through a level wants to see which decks within a unit they still need to practice. The sidebar visually groups decks that belong to the same unit, so the learner understands the relationship between decks and their parent unit.

**Why this priority**: Helps learners navigate the increased number of deck items without losing the sense of unit-level structure.

**Independent Test**: Can be tested by verifying that decks from the same unit are visually grouped together and that unit-level labels are visible.

**Acceptance Scenarios**:

1. **Given** a unit is split into 3 decks, **When** the learner views the sidebar, **Then** all 3 decks appear together under a unit sub-header (e.g., "Unit 7") within their level group.
2. **Given** the learner is browsing the sidebar, **When** they look at a deck label, **Then** it clearly shows the deck's topic focus (e.g., "Future Tense & Olmak" rather than just "Unit 7 Part 1").

---

### Edge Cases

- What happens when a section has exactly 50 questions? It becomes its own deck.
- How are sections split when a single section has more than 50 questions? Sections are never split mid-section — instead, nearby sections are grouped to get as close to 50 as possible. If a single section exceeds 50 questions, it becomes its own deck.
- What happens if grouping sections results in a deck with fewer than 20 questions? Small remainders are merged with the nearest deck rather than standing alone, allowing that deck to exceed 50 slightly.
- How does the flagged cards feature interact with deck reorganization? Flagged cards continue to work across all decks regardless of deck boundaries — the flagged cards quiz draws from all flagged questions.

## Clarifications

### Session 2026-04-04

- Q: Should there still be a way to play all questions in a unit at once after splitting into decks? → A: No. Decks are the only playable items (no full-unit play option).
- Q: What should the default sidebar state be when the app loads? → A: Levels expanded, units collapsed. Unit headers are visible; decks are hidden until the user clicks a unit to expand it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST split units with more than 60 questions into multiple decks of approximately 50 questions each, grouping by related sections (never splitting a section across decks).
- **FR-002**: System MUST display decks in the sidebar grouped by level (A1, B1) and then by unit, with descriptive topic-based labels.
- **FR-003**: Each deck label MUST show the deck's topic focus and question count (e.g., "Future Tense & Olmak · 48 questions").
- **FR-004**: Units with 60 or fewer questions MUST remain as a single deck.
- **FR-005**: System MUST preserve all existing quiz functionality (shuffling, scoring, sounds, flagging) within each deck.
- **FR-006**: The sidebar MUST support collapsing/expanding unit groups to manage the increased number of items. On initial load, levels MUST be expanded and units MUST be collapsed (only unit headers visible; decks revealed on click).
- **FR-007**: System MUST maintain the existing mobile-responsive sidebar behavior (toggle, overlay on mobile).
- **FR-008**: Flagged cards feature MUST continue to work across all decks without being affected by the deck reorganization.
- **FR-009**: Decks MUST be the only playable items. There MUST NOT be a "play all" option at the unit level.

### Key Entities

- **Deck**: A playable set of ~50 questions drawn from one or more sections within a single unit. Has a descriptive topic label, a question count, and belongs to exactly one unit.
- **Unit**: A curriculum grouping containing one or more decks. Units belong to a CEFR level. Unit identity is preserved as a visual grouping in the sidebar.
- **Level**: A CEFR proficiency tier (A1, B1) that groups units in the sidebar.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every deck contains between 20 and 70 questions, with the majority (80%+) falling between 40 and 60.
- **SC-002**: Learners can identify and start a specific topic-focused practice session within 3 clicks (open sidebar if collapsed, expand unit if needed, click deck).
- **SC-003**: All 2,263 existing questions are accessible through the new deck structure with no questions lost or duplicated.
- **SC-004**: Sidebar remains scannable — learners can see at least one full level's worth of unit headers without scrolling on a standard desktop viewport.

## Assumptions

- The deck splitting logic is static (defined at build time in the data file), not dynamic at runtime. Sections are pre-assigned to decks.
- The approximate target of 50 questions per deck allows flexibility (40-60 range is acceptable) to avoid splitting sections.
- No new question content is being added in this feature — only reorganizing existing questions.
- The A2 level does not yet exist, but the structure should naturally accommodate additional levels when they are added.
- Deck labels are derived from section names within each deck, not from new metadata.
