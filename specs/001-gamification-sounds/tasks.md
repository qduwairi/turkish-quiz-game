# Tasks: Gamification Sounds

**Input**: Design documents from `specs/001-gamification-sounds/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: No automated tests requested. Manual browser testing per quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create sound assets directory and audio infrastructure

- [x] T001 Create `sounds/` directory and add MP3 sound assets: `sounds/correct.mp3` (~15 KB success chime), `sounds/wrong.mp3` (~15 KB error tone), `sounds/complete.mp3` (~30 KB celebration sound)
- [x] T002 Implement sound engine module in `js/quiz.js`: lazy `AudioContext` creation on first user interaction, `preloadSounds()` to fetch and decode all 3 MP3 buffers, `playSound(id)` function that checks mute state and plays the named buffer via Web Audio API

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Mute preference infrastructure that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Implement mute preference functions in `js/quiz.js`: `isMuted()` reads from `localStorage` key `"sound-muted"` (default `false`), `setMuted(bool)` writes to `localStorage`, wire into `playSound()` to skip playback when muted
- [x] T004 [P] Add mute toggle button markup in `index.html` inside the `.quiz-header` div, next to `#score-display`: a `<button>` with id `sound-toggle`, speaker icon (unmuted) / muted icon using HTML entities or Unicode glyphs
- [x] T005 [P] Add mute toggle button styles in `css/style.css`: minimum 44x44px touch target, visual distinction between muted/unmuted states, consistent with existing quiz header styling (font, color, spacing)
- [x] T006 Implement mute toggle handler in `js/quiz.js`: `toggleMute()` function that calls `setMuted(!isMuted())`, updates button icon, bind click event on `#sound-toggle`. On page load, read `localStorage` and set initial icon state

**Checkpoint**: Sound engine ready, mute infrastructure complete — user story implementation can begin

---

## Phase 3: User Story 1 - Correct Answer Sound (Priority: P1)

**Goal**: Play a success chime immediately when the user selects the correct answer

**Independent Test**: Start any quiz unit, select the correct answer, confirm an audible chime plays instantly alongside the green visual feedback. Toggle mute, repeat — confirm silence.

### Implementation for User Story 1

- [x] T007 [US1] Add `playSound("correct")` call in the `selectAnswer()` function in `js/quiz.js`, inside the `if (isCorrect)` branch, before advancing to next question. Ensure sound does not block or delay the existing instant-advance behavior.

**Checkpoint**: Correct answer sounds work. MVP is functional.

---

## Phase 4: User Story 2 - Incorrect Answer Sound (Priority: P2)

**Goal**: Play a distinct error tone when the user selects a wrong answer

**Independent Test**: Start any quiz unit, select a wrong answer, confirm a distinct error tone plays alongside the red visual feedback. Confirm it sounds different from the correct-answer chime.

### Implementation for User Story 2

- [x] T008 [US2] Add `playSound("wrong")` call in the `selectAnswer()` function in `js/quiz.js`, inside the `else` branch (incorrect answer), after applying the `.wrong` class to the button.

**Checkpoint**: Both correct and incorrect answer sounds work independently.

---

## Phase 5: User Story 3 - Quiz Completion Sound (Priority: P3)

**Goal**: Play a celebration sound when the results screen appears after completing a quiz

**Independent Test**: Complete all questions in any unit. Confirm a celebration sound plays once when the results summary appears. Also test with flagged-cards quiz completion.

### Implementation for User Story 3

- [x] T009 [US3] Add `playSound("complete")` call in the `showResults()` function in `js/quiz.js`, triggered when the results screen is shown (after hiding quiz screen, before/alongside the score animation).

**Checkpoint**: All three sound events work. Full audio feedback loop complete.

---

## Phase 6: User Story 4 - Sound Mute Toggle (Priority: P3)

**Goal**: User can mute/unmute sounds with a visible toggle that persists across sessions

**Independent Test**: During a quiz, click the mute toggle — icon changes, sounds stop. Click again — icon reverts, sounds resume. Reload the page — mute state is preserved.

### Implementation for User Story 4

- [x] T010 [US4] Wire mute toggle visibility: show the `#sound-toggle` button only when quiz screen is active (hide on start screen and results screen) in `js/quiz.js` — update `startQuiz()`, `startFlaggedQuiz()`, `showResults()`, and `backToUnits()` to toggle visibility. Alternatively, keep it always visible during quiz if simpler. Ensure initial icon reflects persisted mute state on page load in `init()`.

**Checkpoint**: All user stories complete and independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and edge case handling

- [ ] T011 (manual) Verify autoplay policy handling: test in Chrome and Safari incognito — confirm first tap in a fresh session triggers sound without errors in `js/quiz.js`
- [x] T012 [P] Verify total sound file size is under 150 KB (SC-004) and each file is under 50 KB in `sounds/` directory
- [ ] T013 (manual) [P] Manual responsive testing: verify mute toggle is usable on mobile viewport (44x44px touch target) and desktop, test in at least one mobile and one desktop browser per `css/style.css`
- [ ] T014 (manual) Run full quickstart.md validation: follow all steps in `specs/001-gamification-sounds/quickstart.md` end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001, T002 must complete first)
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion (T003-T006)
  - User stories can proceed in priority order (P1 → P2 → P3)
  - US1, US2, US3 each touch the same function (`selectAnswer` / `showResults`) so sequential execution is recommended
  - US4 (mute toggle) is independent of US1-US3 but depends on T003-T006
- **Polish (Phase 7)**: Depends on all user stories being complete

### Within Each User Story

- Each story is a single task touching `js/quiz.js`
- No models/services/endpoints separation needed — all changes are in one file
- Story complete before moving to next priority

### Parallel Opportunities

- T004 and T005 can run in parallel (HTML vs CSS, different files)
- T011, T012, T013 can run in parallel (independent validation checks)
- T007, T008, T009 are sequential (all modify `js/quiz.js`, touch related functions)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (sound assets + engine)
2. Complete Phase 2: Foundational (mute infrastructure)
3. Complete Phase 3: User Story 1 (correct answer sound)
4. **STOP and VALIDATE**: Test correct answer sound independently
5. Deploy/demo if ready — single most impactful sound event

### Incremental Delivery

1. Setup + Foundational → Sound engine ready
2. Add US1 (correct sound) → Test → MVP!
3. Add US2 (wrong sound) → Test → Full answer feedback
4. Add US3 (completion sound) → Test → Full sound suite
5. Add US4 (mute toggle wiring) → Test → User control complete
6. Polish → Final validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Sound asset files (T001) must be sourced or created — consider free CC0 sound effects
- Commit after each phase or logical group
- Stop at any checkpoint to validate story independently
