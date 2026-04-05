# Tasks: Card "Why?" Explainer

**Input**: Design documents from `/specs/004-card-why-explainer/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested — manual browser testing per quickstart.md.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Initialize Firebase Cloud Functions and configure project dependencies

- [x] T001 Create functions/ directory and initialize with package.json containing `@anthropic-ai/sdk` and `firebase-functions` dependencies in functions/package.json
- [x] T002 Update firebase.json to add functions configuration (source: "functions", runtime: nodejs20) in firebase.json
- [x] T003 Add Firebase Functions compat SDK script tag after existing Firebase database script tag in index.html

**Checkpoint**: Firebase Cloud Functions infrastructure is ready; `firebase emulators:start --only functions` runs without errors

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the Cloud Function that all user stories depend on

**⚠️ CRITICAL**: No client-side story work should begin until the Cloud Function is deployed to emulator

- [x] T004 Implement `explainAnswer` callable Cloud Function in functions/index.js: validate input (question string non-empty max 500 chars, options array of exactly 4 non-empty strings max 200 chars each, correct integer 0-3), call Anthropic Claude Haiku API with system prompt from research.md §R3, parse response to extract explanation text and hasWarning (check if response starts with "NOTE:"), return `{explanation, hasWarning}` per contracts/explain-answer.md. Use `defineSecret("ANTHROPIC_API_KEY")` for the API key.
- [x] T005 Add explainer state variables to quiz.js: `let explainerCache = null` (object with `{explanation, hasWarning}` or null), `let explainerLoading = false`, `let explainerExpanded = false`. Reset all three in the existing `showQuestion()` function where other per-question state is reset.

**Checkpoint**: Cloud Function responds correctly when tested via Firebase emulator shell; client state variables initialized

---

## Phase 3: User Story 1 — View Explanation After Answering (Priority: P1) 🎯 MVP

**Goal**: After an incorrect answer, user taps "Why?" and sees an AI-generated 1-2 sentence English explanation of the correct answer

**Independent Test**: Answer any question incorrectly → tap "Why?" → loading indicator appears → explanation text appears within 10 seconds → explanation is in English, 1-2 sentences, relevant to the question

### Implementation for User Story 1

- [x] T006 [P] [US1] Add "Why?" button HTML element (initially hidden) after the feedback message and before the "Next" button in index.html. Use class `why-btn` and text content "Why?"
- [x] T007 [P] [US1] Add explanation container HTML element (initially hidden) after the "Why?" button in index.html. Use class `explainer-section` with a child `<p class="explainer-text">` for the explanation and a child `<div class="explainer-loading">` for the loading indicator
- [x] T008 [P] [US1] Style the "Why?" button in css/style.css: match existing `.next-btn` sizing and font, use a distinct but complementary color for both light and dark themes, ensure minimum 44x44px touch target per constitution §IV, initially `display: none`
- [x] T009 [P] [US1] Style the explainer section in css/style.css: `.explainer-section` with `display: none`, max-height ~150px with `overflow-y: auto` for scrollable content, padding consistent with card design, distinct background tint for both light/dark themes. Style `.explainer-loading` as a simple pulsing text "Thinking..." or small spinner. Style `.explainer-text` with readable font size
- [x] T010 [US1] In the `selectAnswer()` wrong-answer branch in js/quiz.js (after showing feedback and "Next" button), also show the "Why?" button by setting its `display` style. Add click event listener for the "Why?" button that calls a new `handleWhyClick()` function
- [x] T011 [US1] Implement `handleWhyClick()` in js/quiz.js: if `explainerCache` exists, toggle visibility (delegate to US2); if `explainerLoading` is true, return (debounce); otherwise set `explainerLoading = true`, show the `.explainer-section` with loading indicator visible and text hidden, call `firebase.functions().httpsCallable('explainAnswer')` with `{question, options, correct}` from the current question data. On success: store result in `explainerCache`, set `explainerLoading = false`, hide loading indicator, show `.explainer-text` with the explanation. On error: set `explainerLoading = false`, show error text "Could not load explanation. Tap to retry." in `.explainer-text`, allow re-tap to retry (reset `explainerCache` to null so next tap re-fetches). Add 10-second client-side timeout using AbortController or setTimeout fallback
- [x] T012 [US1] In the `showQuestion()` function in js/quiz.js, add reset logic: hide the "Why?" button, hide the `.explainer-section`, clear `.explainer-text` content, reset `explainerCache = null`, `explainerLoading = false`, `explainerExpanded = false`. If there is an in-flight request, cancel it (set a `let explainerAborted = false` flag that is checked on response, reset on new question)

**Checkpoint**: Full "Why?" flow works end-to-end — answer wrong → tap "Why?" → see loading → see explanation. Error handling works when emulator function is stopped. Explanation resets on "Next"

---

## Phase 4: User Story 2 — Toggle Explanation Visibility (Priority: P2)

**Goal**: User can collapse and re-expand the explanation by tapping "Why?" again, without triggering a new AI call

**Independent Test**: After explanation is visible, tap "Why?" → explanation collapses. Tap "Why?" again → explanation re-expands (no loading, instant). Advance to next question → explanation is hidden and reset

### Implementation for User Story 2

- [x] T013 [US2] Enhance `handleWhyClick()` in js/quiz.js: when `explainerCache` exists and section is visible (`explainerExpanded === true`), hide `.explainer-section` and set `explainerExpanded = false`. When cache exists but section is hidden, show `.explainer-section` with cached text and set `explainerExpanded = true`. No new API call in either case
- [x] T014 [P] [US2] Add expand/collapse transition in css/style.css: use CSS transition on `max-height` or `opacity` for `.explainer-section` to create a smooth expand/collapse animation without layout jumps. Add `.explainer-section.visible` class for the expanded state

**Checkpoint**: Toggle works smoothly — collapse/expand uses cached explanation, no flicker, no duplicate API calls. Advancing to next question fully resets

---

## Phase 5: User Story 3 — Answer Correctness Validation (Priority: P3)

**Goal**: When the AI detects the marked answer may be incorrect, the explanation displays a visible warning distinct from normal explanations

**Independent Test**: Find or temporarily create a question with a wrong marked answer → answer incorrectly → tap "Why?" → explanation should include a warning note with distinct visual styling

### Implementation for User Story 3

- [x] T015 [US3] In `handleWhyClick()` success callback in js/quiz.js: check `result.data.hasWarning`. If true, add class `explainer-warning` to `.explainer-section`. If false, remove class `explainer-warning`. Display the explanation text as-is (the "NOTE:" prefix is already part of the AI response text)
- [x] T016 [P] [US3] Style `.explainer-section.explainer-warning` in css/style.css: add a distinct visual treatment — amber/orange left border or background tint, a ⚠️ icon via CSS `::before` pseudo-element, different text color. Ensure it works in both light and dark themes

**Checkpoint**: Warning-flagged explanations are visually distinct from normal explanations. Normal explanations show no warning styling

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements across all stories

- [x] T017 [P] Test responsive layout of explainer section on mobile viewport (320px) — adjust css/style.css if explanation overflows or "Why?" button is too small
- [x] T018 [P] Test both light and dark themes — verify "Why?" button, explainer section, loading state, error state, and warning state all look correct in both themes in css/style.css
- [x] T019 Verify last-question-in-deck behavior in js/quiz.js — ensure "Why?" button still appears on the last question's incorrect answer and the explanation can be viewed before proceeding to results screen
- [x] T020 Run full quickstart.md validation: setup from scratch, deploy to emulator, test all flows per quickstart.md §Testing

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — core MVP
- **US2 (Phase 4)**: Depends on Phase 3 (T011 handleWhyClick must exist to enhance)
- **US3 (Phase 5)**: Depends on Phase 3 (T011 handleWhyClick success callback must exist)
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2. No other story dependencies. **This is the MVP.**
- **US2 (P2)**: Depends on US1's `handleWhyClick()` function existing. Enhances it with toggle logic.
- **US3 (P3)**: Depends on US1's success callback existing. Adds warning display branch. Can run in parallel with US2 since they modify different parts of `handleWhyClick()`.

### Within Each User Story

- HTML structure (index.html) and CSS (style.css) tasks marked [P] can run in parallel
- JS logic tasks depend on HTML elements existing
- Each story should be tested at its checkpoint before moving on

### Parallel Opportunities

- T006, T007, T008, T009 can all run in parallel (different files)
- T013 and T015 modify different branches of the same function — can run in parallel if careful, or sequentially for safety
- T014 and T016 are in css/style.css but target different selectors — can run in parallel
- T017 and T018 are independent test tasks — can run in parallel

---

## Parallel Example: User Story 1 Setup

```text
# Launch HTML and CSS tasks together (different files):
T006: Add "Why?" button HTML in index.html
T007: Add explainer container HTML in index.html
T008: Style "Why?" button in css/style.css
T009: Style explainer section in css/style.css

# Then sequential JS tasks (depend on HTML elements):
T010: Show "Why?" button on wrong answer in js/quiz.js
T011: Implement handleWhyClick() with AI call in js/quiz.js
T012: Reset explainer state on question advance in js/quiz.js
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T005)
3. Complete Phase 3: User Story 1 (T006-T012)
4. **STOP and VALIDATE**: Test "Why?" flow end-to-end with Firebase emulator
5. Deploy if ready — users can already see explanations

### Incremental Delivery

1. Setup + Foundational → Firebase Cloud Function ready
2. Add US1 → Test → Deploy (MVP — explanations work!)
3. Add US2 → Test → Deploy (collapse/expand polish)
4. Add US3 → Test → Deploy (answer validation warnings)
5. Polish → Final testing → Deploy

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- No automated tests — manual browser testing per quickstart.md
- Commit after each phase or logical group
- Stop at any checkpoint to validate independently
- The Cloud Function (T004) is the most complex single task — take care with prompt engineering and error handling
