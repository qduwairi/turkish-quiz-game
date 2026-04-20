# Feature Specification: Vocabulary Tool with CSV Import and Spaced Repetition

**Feature Branch**: `009-vocab-tool`
**Created**: 2026-04-20
**Status**: Draft
**Input**: User description: "I would like to create a vocabulary tool that allows the user to add their vocabulary via csv, it would then create a multiple choice questions for these vocabulary and a spaced repetition system for review."

## Clarifications

### Session 2026-04-20

- Q: When a deck has fewer than 4 distinct translations, how should distractors be filled for multiple-choice questions? → A: Borrow distractors from the user's other vocabulary decks and, if still insufficient, from the app's existing built-in quiz content; only warn the user if even that pool can't produce 3 unique distractors.
- Q: What is the uniqueness scope for a vocabulary term, and how is SRS progress tracked when the same term appears in multiple decks? → A: Uniqueness is per-deck only, matched case-insensitively after trimming whitespace; SRS state is tied to each deck-item pair and is not shared across decks.
- Q: How should the system reconcile conflicting review results when the same item is answered on two devices before they sync? → A: Last-write-wins by timestamp on the answer event; the Review Record is a derived view recomputed deterministically by replaying the full answer-event history on read.
- Q: What size/row-count limit should apply to a single CSV upload, and how should the upload UX handle large files? → A: Accept up to 2,000 rows per upload; show a progress indicator once the file exceeds ~200 rows; reject files larger than 2,000 rows with a clear message instructing the user to split the file.
- Q: Which CSV delimiters and header conventions must the importer support? → A: Auto-detect delimiter by sniffing the first non-empty line from the set {comma, semicolon, tab}; auto-detect a header row when the first row's cells are all non-empty and distinct from any data row. No user-visible dialect picker in v1.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import Vocabulary from CSV (Priority: P1)

A learner has a personal list of Turkish/English word pairs they want to study. They open the vocabulary tool, upload a CSV file containing their word pairs, and the tool builds a usable vocabulary deck that is immediately available alongside the existing quiz decks.

**Why this priority**: Nothing else in this feature works without imported vocabulary. This alone delivers value — the user sees their personal words accepted and organised in the app.

**Independent Test**: Upload a small CSV with at least 4 word pairs and confirm the vocabulary deck appears in the app with the correct item count, correct terms, and no data corruption on refresh.

**Acceptance Scenarios**:

1. **Given** a well-formed CSV with two columns (term and translation), **When** the user uploads it, **Then** the tool imports every row, reports the number of items added, and creates a new vocabulary deck that persists across sessions.
2. **Given** a CSV with malformed rows (missing translation, empty line, duplicate term), **When** the user uploads it, **Then** the tool skips invalid rows, deduplicates, and displays a per-row summary of accepted and rejected entries without aborting the whole import.
3. **Given** an existing vocabulary deck, **When** the user uploads an additional CSV, **Then** the tool offers to append new items to the existing deck or create a separate new deck.

---

### User Story 2 - Auto-Generated Multiple Choice Questions (Priority: P2)

Once vocabulary is imported, the learner can play a multiple-choice quiz drawn from their own words, answering in the same familiar quiz format used elsewhere in the app.

**Why this priority**: Converts static word lists into an active learning activity. Depends on P1 but is the core learning interaction.

**Independent Test**: With an imported deck of at least 4 items, start a quiz session and verify each question shows the prompt term, one correct translation, and plausible distractors drawn from the same deck; answering produces correct/incorrect feedback.

**Acceptance Scenarios**:

1. **Given** a deck with N ≥ 4 items, **When** a quiz round starts, **Then** each question presents the prompt in one language and four answer options (one correct, three distractors pulled from other items in the deck).
2. **Given** a deck with fewer than 4 items, **When** a quiz round starts, **Then** the tool either pads distractors from a shared fallback pool or clearly informs the user that more items are needed.
3. **Given** a question is answered, **When** the user selects an option, **Then** the result (correct/incorrect) is recorded against that specific vocabulary item for use by the spaced repetition system.
4. **Given** the user prefers a reverse prompt direction (translation → term), **When** they toggle the direction, **Then** subsequent questions use the chosen direction consistently.

---

### User Story 3 - Spaced Repetition Review (Priority: P3)

The learner returns daily to review previously-seen items. The tool surfaces only the items that are due on that day, prioritising items the learner has struggled with and spacing out items they consistently answer correctly.

**Why this priority**: Drives long-term retention and return visits, but builds on P1 and P2. Core MVP is usable without it.

**Independent Test**: Over several simulated days, confirm that items answered correctly appear at increasing intervals and items answered incorrectly reappear the same or next day; the "Review" view only lists items whose next-review date is today or earlier.

**Acceptance Scenarios**:

1. **Given** a newly-imported item, **When** it is first answered correctly, **Then** it is scheduled for a short follow-up interval (e.g., next day).
2. **Given** an item answered incorrectly, **When** the review is recorded, **Then** the item is scheduled to reappear sooner and its ease/difficulty score is adjusted downward.
3. **Given** an item answered correctly several times in a row, **When** the review is recorded, **Then** the interval grows (progressively longer gaps) and the item leaves the short-term review queue.
4. **Given** the user opens the Review view, **When** the view loads, **Then** only items whose due date is today or earlier are shown, ordered by longest overdue first.

---

### Edge Cases

- CSV is empty or contains only a header row.
- CSV uses delimiters other than comma (semicolon, tab), or wraps fields in quotes containing commas.
- CSV contains non-Latin characters (Turkish diacritics, etc.) that must round-trip without corruption.
- Duplicate term within the same upload, or a term already present in an existing deck.
- CSV upload exceeds the 2,000-row cap — rejected up front with a split-the-file message before any rows are imported.
- Deck with fewer than 4 distinct translations — insufficient to build a 4-option MCQ.
- User deletes a deck mid-session while a quiz or review is in progress.
- Clock/timezone changes affecting "due today" calculation.
- User answers the same item multiple times within one session, or on two devices before sync — every answer is recorded as its own timestamped event, and the Review Record is recomputed by replaying all events in order (effectively last-write-wins by event timestamp).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to upload a CSV file containing vocabulary items from within the app.
- **FR-002**: The system MUST accept a CSV with at least two columns representing a term and its translation; additional optional columns (e.g., part of speech, example sentence, tag) MUST be preserved when present. The importer MUST auto-detect the delimiter from {comma, semicolon, tab} by sniffing the first non-empty line, and MUST auto-detect a header row when the first row's cells are all non-empty and distinct from any data row. No user-facing delimiter/header picker is required in v1.
- **FR-003**: The system MUST validate each CSV row and skip rows that are empty, missing either required column, or duplicates of already-imported items within the target deck (duplicate detection uses a case-insensitive match on the term after trimming leading/trailing whitespace); it MUST report a per-row outcome (accepted / skipped + reason) to the user.
- **FR-004**: The system MUST persist imported vocabulary so it is available across sessions and devices for the same user.
- **FR-005**: Users MUST be able to name the imported deck, and MUST be able to choose whether a new upload creates a new deck or appends to an existing one.
- **FR-006**: The system MUST generate multiple-choice questions automatically from a vocabulary deck, with one correct answer and three distractors drawn from other items in the deck.
- **FR-007**: The system MUST allow the user to choose the prompt direction (term → translation or translation → term) per quiz session.
- **FR-008**: The system MUST record the outcome (correct/incorrect) of every answered question against the specific vocabulary item for later scheduling.
- **FR-009**: The system MUST compute, per (user, deck, item), a next-review due date and a difficulty score by replaying the full answer-event history in timestamp order; the resulting Review Record is a derived view and any stored copy MUST be refreshable from the event history alone, so concurrent updates from multiple devices converge to the same state once their events sync (last-write-wins by event timestamp).
- **FR-010**: The system MUST provide a "Review" view that lists only items whose next-review date is today or earlier, ordered by most overdue first.
- **FR-011**: On an incorrect answer, the system MUST shorten the item's next-review interval and increase its relative difficulty; on a correct answer, the system MUST lengthen the interval following a spaced-repetition schedule.
- **FR-012**: Users MUST be able to view, rename, and delete their imported decks.
- **FR-013**: The system MUST preserve non-Latin characters (including Turkish-specific letters such as ç, ğ, ı, ö, ş, ü) during import, display, and storage.
- **FR-014**: When a deck contains fewer than 4 distinct translations, the system MUST supplement distractors by drawing first from the user's other vocabulary decks, then from the app's existing built-in quiz content; if that combined pool still cannot yield 3 unique distractors distinct from the correct answer, the system MUST display a warning and block the quiz for that deck until more items are added.
- **FR-015**: The system MUST allow the user to export a deck back to CSV so they can back up or migrate their vocabulary.
- **FR-016**: The system MUST accept CSV uploads of up to 2,000 data rows per file; files with more rows MUST be rejected before import begins, with a clear message instructing the user to split the file. For uploads larger than 200 rows, the system MUST display a progress indicator while importing.

### Key Entities *(include if feature involves data)*

- **Vocabulary Deck**: A named collection of vocabulary items owned by a user; has a creation date, optional description, and an item count.
- **Vocabulary Item**: A single word/phrase pair belonging to a deck — primary fields are term, translation, and optional metadata (part of speech, example, tags). Unique within its parent deck only (case-insensitive + trimmed match on term); the same term may exist independently in multiple decks without any shared state.
- **Review Record**: Per-user, per-(deck, item) state used by the scheduler — includes next-review due date, current interval length, difficulty/ease score, consecutive-correct count, and last-seen timestamp. Each deck-item pair has its own independent Review Record; progress is not shared across decks even when the term is identical.
- **Answer Event**: A single recorded answer within a quiz or review session — references a vocabulary item, captures whether the answer was correct, the prompt direction used, and the timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can import a 50-row CSV and begin practising from the new deck in under 60 seconds from landing on the upload screen.
- **SC-002**: At least 95% of well-formed rows in a valid CSV are imported without manual correction.
- **SC-003**: Generated multiple-choice questions produce a clearly-identifiable correct answer in 100% of cases, and distractors are never identical to the correct answer.
- **SC-004**: After 7 days of daily use, a returning user finds that items they answered correctly twice are scheduled at least 3 days out, and items they got wrong are surfaced again within 1 day.
- **SC-005**: The Review view loads the list of due items in under 2 seconds for a deck of up to 1,000 items.
- **SC-006**: Turkish-specific characters are preserved with zero corruption across the full round trip of import → quiz display → export.

## Assumptions

- Users are individual language learners using this tool as a personal study aid; multi-user or teacher/classroom workflows are out of scope for v1.
- The CSV format is UTF-8 with columns ordered as term, translation, followed by optional metadata. Delimiters from {comma, semicolon, tab} are auto-detected; a header row is auto-detected from its content. No in-app delimiter/header picker is offered in v1.
- Vocabulary data is stored in the project's existing user-data backend (the same one already used for progress, flagged, and retry-pool state), scoped per user.
- The spaced repetition scheduler follows a standard interval-growth approach (short initial intervals that grow multiplicatively on correct answers and reset or shrink on incorrect answers); the exact algorithm choice is an implementation decision.
- The vocabulary tool lives alongside the existing quiz decks in the app navigation; no separate login or account system is introduced.
- Users are expected to provide their own curated word lists; the system does not translate, validate meaning, or fetch definitions from external sources in v1.
- Audio pronunciation, image flashcards, and writing/typing practice modes are out of scope for v1.
