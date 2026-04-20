---

description: "Task list for feature 009-vocab-tool implementation"
---

# Tasks: Vocabulary Tool with CSV Import and Spaced Repetition

**Input**: Design documents from `/specs/009-vocab-tool/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: The plan calls out a small in-browser unit-test harness for the three pure modules (`csvImport`, `srsScheduler`, `mcqGenerator`). Test tasks are included for those modules only. No tests are generated for DOM/UI or Firebase-wiring code (manual browser testing per Constitution Workflow).

**Organization**: Tasks are grouped by user story so each can be shipped independently.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Story label — `[US1]`, `[US2]`, `[US3]`
- Exact file paths are included in every task

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold directories and the test harness before any feature code is written.

- [X] T001 Create feature source directory `C:\Users\MSI\turkish-quiz-game\js\vocab\` with empty placeholder files `csvImport.js`, `deckStore.js`, `mcqGenerator.js`, `srsScheduler.js`, `vocabSession.js`, `vocabUI.js` (each containing a single top-level comment identifying the module per `plan.md` §Project Structure)
- [X] T002 [P] Create test harness directory `C:\Users\MSI\turkish-quiz-game\tests\vocab\` with `index.html` that loads each `test-*.js` in a script tag and prints pass/fail counts, plus empty `test-csvImport.js`, `test-srsScheduler.js`, `test-mcqGenerator.js` files (per `plan.md` §Project Structure and `quickstart.md` §2)
- [X] T003 [P] Add a sample CSV fixture `C:\Users\MSI\turkish-quiz-game\tests\vocab\fixtures\greetings.csv` with the 5-row sample from `quickstart.md` §3 for manual end-to-end testing

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, auth wiring, sidebar scaffolding, and base CSS — anything every user story needs before it can be built.

**⚠️ CRITICAL**: No user-story work can begin until this phase is complete.

- [X] T004 Extend `C:\Users\MSI\turkish-quiz-game\database.rules.json` to add the `vocabulary/$uid` rules block from `contracts/firebase-schema.md` §Security Rules (per-user read/write, append-only events, strict validators for decks/items/reviewState). Do not remove or modify existing rules for `flagged`, `retry pool`, or `errors`.
- [X] T005 [P] Add a new collapsible sidebar group `Vocabulary` to `C:\Users\MSI\turkish-quiz-game\index.html` containing three fixed entries (`Upload CSV`, `My Decks`, `Review`) and a placeholder `<ul>` for the per-deck dynamic list, matching `contracts/ui-contract.md` §S1. Load `js/vocab/vocabUI.js` and its dependencies via `<script>` tags in the existing load order.
- [X] T006 [P] Add base styles for the new views (upload dropzone, deck card grid, review list) to `C:\Users\MSI\turkish-quiz-game\css\style.css` under a clearly-commented `/* ===== Vocabulary feature (009) ===== */` section. Use existing color tokens only — no new hard-coded colors (Constitution IV, dark-mode carry-over).
- [X] T007 Implement `getCurrentUserId()` and `requireAuth(onReady)` helpers inside `C:\Users\MSI\turkish-quiz-game\js\vocab\deckStore.js` that wrap the existing `firebase.auth()` flow the app already uses for flagged cards; export them for reuse by every vocab module. No Firebase reads yet — just auth wiring.
- [X] T008 [P] Wire a top-level view router inside `C:\Users\MSI\turkish-quiz-game\js\vocab\vocabUI.js` that listens for sidebar clicks on the three fixed entries and renders a placeholder `<section>` for each (Upload/My Decks/Review). Real view bodies arrive in later phases.

**Checkpoint**: Firebase rules deploy cleanly, the sidebar shows the new group, clicking each entry renders an empty section, and the app still loads for signed-out users (disabled prompt per `contracts/ui-contract.md` §Error & Empty States).

---

## Phase 3: User Story 1 — Import Vocabulary from CSV (Priority: P1) 🎯 MVP

**Goal**: User uploads a CSV and sees their new deck appear in `My Decks` with the correct item count, persisting across reloads.

**Independent Test**: With the `greetings.csv` fixture from T003, upload produces `Accepted: 5, Skipped: 0`, deck `Greetings` shows up under My Decks with item count `5`, and reloading the app still shows it. Turkish diacritics intact (SC-006).

### Tests for User Story 1

- [X] T009 [P] [US1] Write `C:\Users\MSI\turkish-quiz-game\tests\vocab\test-csvImport.js` covering: delimiter auto-detection for comma/semicolon/tab, header-row auto-detection, RFC-4180 quoted fields with embedded commas and doubled quotes, Turkish characters preserved, 2,001-row rejection, duplicate-within-file skipped with reason, missing required field skipped with reason, empty-row silent skip. Use fixtures inline as strings; assert on the returned `{ accepted, skipped }` shape from `contracts/csv-format.md`.

### Implementation for User Story 1

- [X] T010 [P] [US1] Implement CSV parser in `C:\Users\MSI\turkish-quiz-game\js\vocab\csvImport.js` exporting `parseCsv(text)` — delimiter sniffer (first non-empty line, comma > semicolon > tab tiebreak), RFC-4180 quoted-field state machine, header auto-detection per `contracts/csv-format.md` §Header Row. Return `{ rows: [{term, translation, extras}], headerDetected: bool, delimiter: ',' | ';' | '\t' }`.
- [X] T011 [US1] Extend `C:\Users\MSI\turkish-quiz-game\js\vocab\csvImport.js` with `importCsv(text, {existingTerms})` that wraps `parseCsv`, applies row-level rules (V1, V2, V5 from `data-model.md` §4: trimmed non-empty, case-insensitive dedup against `existingTerms` Set, 200-char cap), enforces V3 (`rows.length <= 2000`) up front, and returns `{ accepted: [{term, translation, extras}], skipped: [{rowNumber, reason}] }` using the reason codes in `contracts/csv-format.md`.
- [X] T012 [P] [US1] Implement deck CRUD in `C:\Users\MSI\turkish-quiz-game\js\vocab\deckStore.js`: `createDeck(name, description?)`, `listDecks()`, `renameDeck(deckId, newName)`, `deleteDeck(deckId)`, using the tree in `contracts/firebase-schema.md` §Tree. Enforce V6 (name 1–64 chars, unique per user case-insensitive). `deleteDeck` must multi-path-null `decks/`, `items/`, `events/`, `reviewState/` under the same `deckId` and update `meta/deckOrder`.
- [X] T013 [US1] Implement item import in `C:\Users\MSI\turkish-quiz-game\js\vocab\deckStore.js`: `addItems(deckId, items[])` using a single multi-path `update()` that writes each `items/$deckId/$itemId` plus the new `decks/$deckId/itemCount`. `getItems(deckId)` returns all items for a deck. `listDeckTerms(deckId)` returns a Set of lower-cased trimmed terms for dedup.
- [X] T014 [US1] Render the Upload view inside `C:\Users\MSI\turkish-quiz-game\js\vocab\vocabUI.js` per `contracts/ui-contract.md` §S2: file dropzone + `Choose file` button (accept `.csv,.tsv,.txt`), deck-name input (default = filename stem), create-new vs append-to-existing radio with deck dropdown when applicable, progress indicator shown when `rows > 200` (FR-016), and a post-import summary panel (accepted count, skipped breakdown by reason with up to 5 example row numbers). Wire submit → `csvImport.importCsv` → `deckStore.createDeck`/`addItems` → show summary with `Start a quiz` / `Go to review` / `Import another file` buttons.
- [X] T015 [US1] Render the My Decks view inside `C:\Users\MSI\turkish-quiz-game\js\vocab\vocabUI.js` per `contracts/ui-contract.md` §S3: card grid with name, item count, created date, last-reviewed-date placeholder (filled once US3 lands), and action buttons `Quiz` (disabled until US2), `Review` (disabled until US3), `Rename`, `Delete`. Delete confirmation requires typing the deck name. Rename is inline (Enter confirm / Esc cancel).
- [X] T016 [US1] Add telemetry hooks in `csvImport.js` and `deckStore.js` that forward parse errors and Firebase write failures to the existing error-tracking subtree (`/errors/...`) with `source="vocab.csvImport"` / `source="vocab.deckStore"` per `contracts/ui-contract.md` §Telemetry Hooks. Reuse the existing logger from feature 008; do not add a new dependency.

**Checkpoint**: User can upload `greetings.csv`, see the deck in My Decks, delete and re-upload, and nothing else (quiz/review buttons are disabled). Manual verification: desktop + mobile viewport, dark + light mode.

---

## Phase 4: User Story 2 — Auto-Generated Multiple Choice Questions (Priority: P2)

**Goal**: From any deck with ≥1 item, the user can start a quiz session that presents 4-option MCQs, with distractor fallback when the deck is small, and answers are persisted as `AnswerEvent` records.

**Independent Test**: Start a quiz on `Greetings` (5 items) — each question shows one correct translation and three distractors from other items in the deck, flipping direction via the header toggle consistently alternates prompt language, and answering correctly/incorrectly produces icon+color+text feedback. A single-item test deck still builds a quiz by borrowing distractors from other user decks / built-in `questions.js` content.

### Tests for User Story 2

- [X] T017 [P] [US2] Write `C:\Users\MSI\turkish-quiz-game\tests\vocab\test-mcqGenerator.js` covering: 4 distinct options with exactly one correct (V7), direction `termToTranslation` vs `translationToTerm`, distractor fallback chain (same deck → other user decks → built-in quiz answers → block), dedup against the correct answer case-insensitively, sentence-like strings filtered from built-in fallback (contains `.`, `?`, `!`).

### Implementation for User Story 2

- [X] T018 [P] [US2] Implement `buildMcq({correctItem, deckItems, otherDecksItems, builtinCorrectAnswers, direction})` in `C:\Users\MSI\turkish-quiz-game\js\vocab\mcqGenerator.js` per `research.md` R4 and `contracts/ui-contract.md` §MCQ Build Rules. Returns `{ prompt, options: [s1, s2, s3, s4], correctIndex }` with randomised option order. When fewer than 3 unique distractors can be gathered across the fallback chain, return `{ blocked: true, reason: 'insufficient-distractors' }`.
- [X] T019 [P] [US2] Implement `listAllUserItems(exceptDeckId)` in `C:\Users\MSI\turkish-quiz-game\js\vocab\deckStore.js` (single read of `vocabulary/$uid/items`, filters out the active deck) and `getBuiltinCorrectAnswers()` in the same file that reads `window.units` from `js/questions.js` and flattens to a de-duplicated array of correct-answer strings, filtering out any containing `.`, `?`, or `!`.
- [X] T020 [US2] Implement `appendAnswerEvent(deckId, itemId, {correct, direction, mode})` in `C:\Users\MSI\turkish-quiz-game\js\vocab\deckStore.js` using `push()` under `events/$deckId/$itemId` with `ts = Date.now()` and the four required fields from `contracts/firebase-schema.md`. This is append-only — never overwrite an existing event.
- [X] T021 [P] [US2] Implement the quiz session state machine in `C:\Users\MSI\turkish-quiz-game\js\vocab\vocabSession.js` exporting `startQuizSession(deckId, direction)`: pre-loads `deckItems`, `otherDecksItems`, `builtinCorrectAnswers` once, then on each `.nextQuestion()` builds an MCQ via `mcqGenerator.buildMcq`. On `.submitAnswer(optionIndex)` records the event via `deckStore.appendAnswerEvent` with `mode='quiz'` and returns `{correct, correctIndex}`. Session ends when every deck item has been asked once.
- [X] T022 [US2] Render the Quiz view inside `C:\Users\MSI\turkish-quiz-game\js\vocab\vocabUI.js` per `contracts/ui-contract.md` §S4: reuse existing curriculum-quiz DOM helpers from `js/quiz.js` where available; header contains the `term → translation` / `translation → term` toggle (FR-007) whose state persists for the session. Feedback after each answer includes icon + color + text (Constitution IV). End-of-session card shows score and a disabled `Queue wrong answers into Review` button (unlocked in US3).
- [X] T023 [US2] Enable the `Quiz` button on each deck card in the My Decks view (from T015); clicking launches the quiz session for that `deckId`. If `buildMcq` reports `blocked`, render the blocking message from `contracts/ui-contract.md` §Error & Empty States instead of starting the session.

**Checkpoint**: A user can import a CSV (US1) and then play a full quiz on that deck (US2). Incorrect/correct feedback is recorded as events in Firebase (verify via RTDB console). Small-deck fallback works — a 2-item deck still generates 4 options using other decks / built-in content.

---

## Phase 5: User Story 3 — Spaced Repetition Review (Priority: P3)

**Goal**: Items answered via quiz or review get a `dueDate`; the Review view surfaces only items due today or earlier, sorted most-overdue first. Correct answers extend intervals; incorrect answers reset to 1 day.

**Independent Test**: After answering 3 items on day 0 (two correct, one incorrect), advance the system clock by 1 day: the incorrect item + both correct items appear in Review (interval 1 & 3 days respectively); answer correctly again → intervals grow; `dueDate` reflects `lastSeen + interval` computed in user-local timezone. Multi-device convergence: write two events with different timestamps into the same item's `events` subtree and confirm the derived `reviewState` after replay matches what a single device would have computed.

### Tests for User Story 3

- [X] T024 [P] [US3] Write `C:\Users\MSI\turkish-quiz-game\tests\vocab\test-srsScheduler.js` covering: fresh state derivation (no events), first correct → interval 1 / streak 1 / ease 2.6, second correct → interval 3 / streak 2, third correct → interval = `3 * ease`, incorrect resets interval to 1 and streak to 0 and decrements ease by 0.2 floored at 1.3, event-order replay determinism, `dueDate` formatted `YYYY-MM-DD` in local timezone, replay of 100 events terminates in <10ms.

### Implementation for User Story 3

- [X] T025 [P] [US3] Implement pure-function SRS in `C:\Users\MSI\turkish-quiz-game\js\vocab\srsScheduler.js` per `data-model.md` §1.4 derivation rule: `deriveReviewRecord(events[])` returns `{ interval, ease, streak, dueDate, lastSeen, totalSeen }`. Also export `isDue(reviewRecord, todayLocalYmd)` and `compareOverdue(a, b)` (most-overdue first) helpers.
- [X] T026 [P] [US3] Extend `C:\Users\MSI\turkish-quiz-game\js\vocab\deckStore.js` with `getEvents(deckId, itemId)` (ordered by key asc), `readReviewStateCache(deckId?)` (single read or per-deck) and `writeReviewStateCache(deckId, itemId, state)`. After every `appendAnswerEvent` call (wired in T020), the caller MUST re-fetch events and rewrite the cache — update `vocabSession.submitAnswer` (T021) to do this two-step write.
- [X] T027 [US3] Implement `listDueItems({deckId?})` in `C:\Users\MSI\turkish-quiz-game\js\vocab\deckStore.js` — reads `reviewState` (scoped to a single deck or all user decks), filters to `dueDate <= todayLocalYmd`, joins with `items/` for display data, and sorts via `srsScheduler.compareOverdue`. Handles missing cache entries by deriving on-the-fly from events (self-healing per `contracts/firebase-schema.md` §Consistency Invariants).
- [X] T028 [P] [US3] Implement `startReviewSession({deckId?})` in `C:\Users\MSI\turkish-quiz-game\js\vocab\vocabSession.js` that calls `listDueItems`, then for each due item builds an MCQ via `mcqGenerator.buildMcq` (reusing US2 infrastructure) and records answers via `deckStore.appendAnswerEvent` with `mode='review'`. On `submitAnswer`, it triggers the event-append + cache-rewrite flow from T026.
- [X] T029 [US3] Render the Review view inside `C:\Users\MSI\turkish-quiz-game\js\vocab\vocabUI.js` per `contracts/ui-contract.md` §S5: header counts (`<N> due today`, `<N> overdue`), ordered list of due items, a single-card UI that delegates to the existing MCQ renderer from T022, empty-state when zero items due. Entry from the global sidebar `Review` entry defaults to cross-deck mode; entry from a deck card (T015) scopes to that deck.
- [X] T030 [US3] Update the sidebar `Review` entry in `C:\Users\MSI\turkish-quiz-game\index.html` + `vocabUI.js` to show a badge with the cross-deck due count, refreshed on app load and after every answered review/quiz.
- [X] T031 [US3] Enable the `Queue wrong answers into Review` button on the US2 end-of-session card (T022) so it writes any incorrect events' items immediately into the review pool — which is automatic given the derivation in T025/T026, so this task is confirming the button is enabled and simply navigates to the Review view.
- [X] T032 [US3] Enable the `Review` button on each deck card (from T015) to open the Review view scoped to that deck.

**Checkpoint**: Review view works end-to-end. Two-device sync convergence verified manually by writing conflicting events via the RTDB console and reloading — derived `reviewState` matches expected replay outcome.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Complete the remaining spec requirements (export, offline, perf validation) that are not unique to one story.

- [X] T033 [P] Implement `exportDeckToCsv(deckId)` in `C:\Users\MSI\turkish-quiz-game\js\vocab\deckStore.js` producing a UTF-8 CSV per `contracts/csv-format.md` §Round-Trip Export (header `term,translation,[extras keys...]`). Wire the `Export CSV` button on the deck card (T015) to trigger a browser download (`Blob` + `URL.createObjectURL`).
- [X] T034 [P] Verify offline behavior per `contracts/ui-contract.md` §Error & Empty States — upload view queues imports when offline and flushes on reconnect; quiz/review reads use Firebase's cached snapshot; append-only events queue and flush. Use the browser devtools "Offline" mode to validate. Fix any broken flow by setting Firebase RTDB's `.keepSynced(true)` on `/vocabulary/$uid` in `deckStore.js`.
- [ ] T035 [P] Run perf spot-check: import a generated 2,000-row CSV fixture and confirm completion ≤ 10 s on a dev laptop (Performance Goals in `plan.md`). Populate a 1,000-item deck with synthetic review state and confirm the Review view renders in ≤ 2 s (SC-005). Record results in a short note at the bottom of `quickstart.md` §6.
- [ ] T036 [P] Manual validation walkthrough of every bullet in `C:\Users\MSI\turkish-quiz-game\specs\009-vocab-tool\quickstart.md` §4 (edge cases) across one mobile viewport and one desktop viewport in dark and light modes. File any regressions as follow-up bug tasks.
- [ ] T037 Check off every item in `C:\Users\MSI\turkish-quiz-game\specs\009-vocab-tool\quickstart.md` §6 "Definition of Done" before raising the PR.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on Phase 1. Blocks all user stories.
- **US1 (Phase 3)**: depends on Phase 2.
- **US2 (Phase 4)**: depends on Phase 2 and (for full end-to-end demo) on the Item store from T012/T013 in US1; however the MCQ generator itself (T017, T018) is independent and can be built in parallel with US1.
- **US3 (Phase 5)**: depends on Phase 2 and reuses `mcqGenerator` (T018) and the event-append helper (T020) from US2; SRS scheduler itself (T024, T025) is independent of US1/US2 and can be built in parallel.
- **Polish (Phase 6)**: depends on the user stories targeted for the release.

### Within Each User Story

- Tests (T009, T017, T024) written first, confirmed red, then implementation.
- Pure-function modules before storage/DOM consumers:
  - US1: csvImport (T010, T011) → deckStore CRUD (T012, T013) → UI (T014, T015).
  - US2: mcqGenerator (T018) and data readers (T019) → session (T021) → UI (T022, T023).
  - US3: srsScheduler (T025) → cache wiring (T026) → queries (T027) → session (T028) → UI (T029, T030).

### Parallel Opportunities

- All `[P]` tasks within one phase touch different files and have no completed-task deps. Examples:
  - **Phase 1**: T002 and T003 in parallel with T001.
  - **Phase 2**: T005 (`index.html`), T006 (`style.css`), T008 (`vocabUI.js` router) — all different files.
  - **Phase 3**: T009 (test-csvImport) and T010 (csvImport impl) can be written by different people; T012 (deck CRUD) is independent of T010/T011 until integration in T014.
  - **Phase 4**: T017 (test), T018 (mcqGenerator impl), T019 (readers), T021 (session) can proceed mostly concurrently; T022 joins them.
  - **Phase 5**: T024 (test), T025 (scheduler), T028 (session) can proceed concurrently; T026/T027 link them.
- Across stories: a team of three can work US1/US2/US3 in parallel once Phase 2 lands, integrating at checkpoints.

---

## Parallel Example: User Story 1

```bash
# Spin these up concurrently once Foundational is done:
Task: "Write tests/vocab/test-csvImport.js per T009"
Task: "Implement parseCsv in js/vocab/csvImport.js per T010"
Task: "Implement deck CRUD in js/vocab/deckStore.js per T012"

# Once T010/T011 land, kick off:
Task: "Render Upload view in js/vocab/vocabUI.js per T014"
Task: "Render My Decks view in js/vocab/vocabUI.js per T015"
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1 → Phase 2 → Phase 3.
2. **STOP and VALIDATE**: users can upload a CSV and see their deck persist. That alone is a shippable increment (users get a place to store their vocabulary).
3. Ship behind a feature flag if desired; otherwise deploy directly — the Quiz/Review buttons are disabled until US2/US3 land.

### Incremental Delivery

1. Phase 1 + Phase 2 → foundation ready.
2. Phase 3 (US1) → ship: CSV import.
3. Phase 4 (US2) → ship: MCQ quiz from imported decks.
4. Phase 5 (US3) → ship: spaced-repetition review.
5. Phase 6 → polish pass + perf validation before the final PR.

### Parallel Team Strategy

- Dev A: US1 (Phase 3).
- Dev B: US2 (Phase 4) — mcqGenerator and session can be built against a fake `deckStore.listAllUserItems()` until US1 lands.
- Dev C: US3 (Phase 5) — srsScheduler is entirely pure and independent; wire cache/queries after US1+US2 integrate.

---

## Notes

- `[P]` = different files, no dependency on an incomplete task.
- `[Story]` label traces every user-story task back to `spec.md` priorities.
- Every acceptance scenario in `spec.md` should be exercisable after the owning story's checkpoint.
- Avoid reshaping `js/questions.js` — it is curriculum data (Constitution V) and only read-only consumers are allowed here.
- Commit after each logical group (typically each task) to keep review granularity small.
