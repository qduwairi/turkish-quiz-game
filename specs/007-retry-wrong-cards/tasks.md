---
description: "Task list for 007-retry-wrong-cards"
---

# Tasks: Retry Wrong Cards Until Mastered

**Input**: Design documents from `/specs/007-retry-wrong-cards/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/ui-contract.md](contracts/ui-contract.md), [quickstart.md](quickstart.md)

**Tests**: Not requested. Manual browser testing per [quickstart.md](quickstart.md) is the validation strategy (per constitution Development Workflow).

**Organization**: Tasks grouped by user story (US1 = retry loop, US2 = progress indicator). Most tasks touch [js/quiz.js](../../js/quiz.js), [css/style.css](../../css/style.css), or [index.html](../../index.html); parallelism is limited because the core logic lives in one file.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 or US2 (maps to user stories in [spec.md](spec.md))
- Exact file paths are given for every task

## Path Conventions

Single-page static web app (per [plan.md](plan.md) structure decision). All source lives at repo root:

- [index.html](../../index.html)
- [css/style.css](../../css/style.css)
- [js/quiz.js](../../js/quiz.js) (core change)
- [js/questions.js](../../js/questions.js) (unchanged)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No project initialization needed — existing vanilla HTML/CSS/JS app with no build tools. Only branch prep.

- [X] T001 Confirm working branch is `007-retry-wrong-cards` and the spec/plan/research/data-model/contract/quickstart files are present under `specs/007-retry-wrong-cards/`; open the app locally (open [index.html](../../index.html) directly or `python -m http.server`) to baseline current behavior before any edits.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the new DOM scaffolding and CSS that BOTH user stories depend on. Must be complete before US1 or US2 implementation touches [js/quiz.js](../../js/quiz.js).

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete.

- [X] T002 [P] Add the retry transition banner markup inside `#quiz-screen` in [index.html](../../index.html): a `div#retry-banner.retry-banner.hidden` with `role="dialog"` and `aria-live="polite"`, containing `<h2 class="retry-banner-title">Retry phase</h2>`, `<p class="retry-banner-body">You missed <span id="retry-banner-count">0</span> cards. Answer each one correctly to finish the deck.</p>`, and `<button id="retry-continue-btn" class="retry-continue-btn" type="button">Continue</button>`. Place it as a sibling of the existing `#question-layout`, not inside it. Do not write any JS yet.
- [X] T003 [P] Add the retry text progress indicator markup inside `#quiz-screen` in [index.html](../../index.html): `<div id="retry-progress" class="retry-progress hidden" aria-live="polite"><span id="retry-progress-count">0</span> cards left to master</div>`. Place it near the existing progress bar elements.
- [X] T004 Add CSS rules in [css/style.css](../../css/style.css) for `.retry-banner`, `.retry-banner-title`, `.retry-banner-body`, `.retry-continue-btn`, and `.retry-progress`. The banner must be a centered, padded block that matches the visual treatment of existing card surfaces; `.retry-continue-btn` must reuse or mirror the existing primary-button styling with `min-height: 44px; min-width: 44px` (Constitution IV). `.retry-progress` typography should match `#progress-fraction`. Also add a `.progress-hidden` utility class (or reuse the existing `.hidden` class if it already applies `display: none`) to hide `#progress-bar` (or its container) during retry phase. No inline styles anywhere.
- [X] T005 Verify in the browser that after T002–T004, the banner and retry-progress elements exist in the DOM but are not visible (both still `hidden`), and the normal main-pass flow is completely unchanged. This is a quick visual sanity check — no JS has been added yet.

**Checkpoint**: DOM + CSS scaffolding ready; US1 and US2 implementation can now begin.

---

## Phase 3: User Story 1 — Retry wrong answers before finishing a deck (Priority: P1) 🎯 MVP

**Goal**: After a main-pass deck session that has any wrong answers, instead of showing the results screen the app enters a retry phase that re-asks every missed card — with the end-of-queue-on-wrong rule — and only shows results once the retry pool is empty. Covers FR-001 through FR-009 (except FR-010/FR-010a which live in US2), plus FR-011–FR-015.

**Independent Test**: Manual Scenarios 1–8 in [quickstart.md](quickstart.md) except the portions that specifically check the text progress indicator. Specifically: answering a deck with 0 wrong answers goes straight to results (Scenario 1); answering with ≥1 wrong triggers the banner, Continue reveals the missed card, and results only appear once every missed card has been answered correctly (Scenarios 2–5); flagging during retry removes the card from the pool (Scenario 6); the flagged-cards review session is unaffected (Scenario 7); abandoning mid-retry resets cleanly (Scenario 8).

### Implementation for User Story 1

- [X] T006 [US1] In [js/quiz.js](../../js/quiz.js), add three new module-scoped state variables near the existing `quizData`/`current`/`score`/`answered`/`isFlaggedMode` declarations: `let wrongCards = [];`, `let retryMode = false;`, `let retryQueue = [];`. Do not reference them yet.
- [X] T007 [US1] In [js/quiz.js](../../js/quiz.js), update `startQuiz(unit, deckIndex)` to reset `wrongCards = []`, `retryMode = false`, `retryQueue = []` alongside the existing `current = 0; score = 0; answered = false` reset. Also ensure any CSS classes added in US1/US2 that hide the main progress bar or swap the score label are cleared at this point so a fresh session always starts in main-pass visual state.
- [X] T008 [US1] In [js/quiz.js](../../js/quiz.js), modify `selectAnswer(index)` so that on an incorrect answer, when `retryMode === false`, the current card (`quizData[current]` or, in retry mode, `retryQueue[0]`) is pushed onto `wrongCards` exactly once before the existing reveal/feedback flow runs. Do NOT push during retry phase (retry-phase wrong handling lives in T011). Leave the main-pass score increment logic unchanged.
- [X] T009 [US1] In [js/quiz.js](../../js/quiz.js), gate the main-pass score increment inside `selectAnswer` on `retryMode === false` so that a correct answer during retry phase does NOT increment `score` (FR-011). All other existing side-effects of a correct answer (sound, vibration, feedback, advancing) remain.
- [X] T010 [US1] In [js/quiz.js](../../js/quiz.js), add a new function `enterRetryPhase()` that: sets `retryMode = true`; seeds `retryQueue = shuffle(wrongCards.slice())` using the existing `shuffle()` helper; hides `#question-layout`; adds the progress-hiding class to the main progress bar container; sets `#score-display` text to `Retry`; sets `#retry-banner-count` text to `retryQueue.length`; removes the `hidden` class from `#retry-banner`; and calls `.focus()` on `#retry-continue-btn` for keyboard accessibility.
- [X] T011 [US1] In [js/quiz.js](../../js/quiz.js), modify the end-of-main-pass branch in `selectAnswer` (where today the code calls `showResults()` when `current === quizData.length - 1` on a correct answer) and in the Next-button handler for wrong answers so that the decision is: if `retryMode === false` and we have just answered the last main-pass card: (a) if `isFlaggedMode === true` → `showResults()` (preserves FR-015), else (b) if `wrongCards.length === 0` → `showResults()`, else (c) call `enterRetryPhase()` instead of `showResults()`.
- [X] T012 [US1] In [js/quiz.js](../../js/quiz.js), add a new click handler `exitRetryBanner()` bound at module init time to `#retry-continue-btn`. The handler hides `#retry-banner` (adds `hidden`), removes `hidden` from `#retry-progress`, sets `#retry-progress-count` text to `retryQueue.length`, un-hides `#question-layout`, and calls the existing per-card render path (e.g. `showQuestion()`) — but first the render path must be made retry-aware (T013).
- [X] T013 [US1] In [js/quiz.js](../../js/quiz.js), introduce a small helper `currentCard()` that returns `retryMode ? retryQueue[0] : quizData[current]`, and update `showQuestion()` so that when `retryMode === true` it sources the card from `currentCard()` instead of `quizData[current]`. Preserve the existing per-render option-shuffle and `_shuffledCorrect` logic untouched — it operates on whichever card is passed in. Do not change the category/question/watermark rendering other than swapping the card source.
- [X] T014 [US1] In [js/quiz.js](../../js/quiz.js), implement the retry-phase advance logic. On a **correct** answer during retry: `retryQueue.shift()`, then if `retryQueue.length === 0` call `finishRetrySession()` (see T015), else call the render path to show the new `retryQueue[0]`. On a **wrong** answer during retry: the existing reveal-and-wait-for-Next flow runs as normal; wire the Next-button handler so that when `retryMode === true` it performs `const missed = retryQueue.shift(); retryQueue.push(missed);` and then renders the new head. This implements FR-013's end-of-queue rule. Reuse the existing Next-button DOM element and handler — do not create a second button.
- [X] T015 [US1] In [js/quiz.js](../../js/quiz.js), add a new function `finishRetrySession()` that: sets `retryMode = false`; clears `retryQueue` and `wrongCards`; removes `hidden` from the main progress bar container (undoes the progress-hiding class); restores `#score-display` text to `Score: ${score}` (reuse `updateScore()` if possible); adds `hidden` to `#retry-progress`; and calls the existing `showResults()` to render the results screen with the unchanged first-pass score.
- [X] T016 [US1] In [js/quiz.js](../../js/quiz.js), update the existing mid-session flag handler so that when `retryMode === true`, the flagged card is removed from `retryQueue` by identity (`retryQueue = retryQueue.filter(c => c !== flaggedCard)`), then: if `retryQueue.length === 0` call `finishRetrySession()`, else re-render the new head. Do not touch the Firebase flag-write path — that existing call stays as-is. This preserves FR-012.
- [X] T017 [US1] In [js/quiz.js](../../js/quiz.js), ensure that any session-exit paths other than `finishRetrySession()` — specifically starting a new deck from the sidebar, opening the flagged-cards review session, or returning to the start screen — also restore `#score-display` text to the normal `Score: N` format and un-hide the main progress bar container. The cleanest place is inside `startQuiz()` (T007) and any equivalent entry point for the flagged-cards review. Verify no orphan "Retry" label can linger into a new session.
- [X] T018 [US1] Manually verify Scenarios 1–5, 6, 7, and 8 from [quickstart.md](quickstart.md) (the ones that don't require the text count in US2 to already be present — you can ignore specific count-value assertions and just confirm the retry banner, retry loop, end-of-queue behavior, results-screen gate, flagged-cards scope, and abandon cleanup all behave correctly). Fix any regressions before moving to US2.

**Checkpoint**: User Story 1 is functional end-to-end. Retry phase works; results only appear when the pool is empty; first-pass score is preserved; flagged-cards review session is unchanged.

---

## Phase 4: User Story 2 — Clear progress signal during retry phase (Priority: P2)

**Goal**: During the retry phase the learner sees a live "N cards left to master" text indicator and understands they are no longer in the main pass. Covers FR-010 and FR-010a (and reinforces FR-009 by making the phase visibly distinct).

**Independent Test**: Enter the retry phase with ≥3 missed cards. Verify (per Scenario 3 in [quickstart.md](quickstart.md)) that the main progress bar is hidden, `#retry-progress` is visible, `#retry-progress-count` matches `retryQueue.length`, the count decrements only when a retry card is answered correctly, and the count does NOT decrement when a retry card is answered incorrectly.

### Implementation for User Story 2

- [X] T019 [US2] In [js/quiz.js](../../js/quiz.js), add a small helper `updateRetryProgress()` that sets `#retry-progress-count` text to `retryQueue.length` (as a plain integer — no padding). Call this helper at the end of `exitRetryBanner()` (T012), at the end of the retry-phase correct-answer branch in T014 *after* the `shift()`, and at the end of the retry-phase wrong-answer branch in T014 *after* the `shift()`+`push()` (the latter is a no-op visually, but keeps the helper the single source of truth).
- [X] T020 [US2] In [js/quiz.js](../../js/quiz.js), confirm `enterRetryPhase()` from T010 already sets `#retry-banner-count` to `retryQueue.length` and that `finishRetrySession()` from T015 adds `hidden` back to `#retry-progress`. If either is missing, add it here. Also confirm `startQuiz()` (T007) re-adds `hidden` to `#retry-progress` so a fresh session never shows a stale count.
- [X] T021 [US2] Manually verify Scenario 3 in [quickstart.md](quickstart.md) end-to-end: miss 2 cards, continue into retry, confirm count starts at `2`, answer first retry wrong → count stays at `2` and the *other* retry card is shown next, answer that correctly → count drops to `1`, answer the repeated missed card correctly → count drops to `0` and the results screen appears with the correct first-pass score.

**Checkpoint**: Both user stories are functional and independently testable.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Responsive/accessibility verification and final cleanup across all user stories.

- [X] T022 [P] In [css/style.css](../../css/style.css), double-check `.retry-banner`, `.retry-continue-btn`, and `.retry-progress` render correctly at mobile widths (~375px) — the banner should not overflow the viewport, the Continue button should remain a comfortable touch target, and the retry-progress text should not overlap neighboring elements. Adjust padding/margins only if problems are observed. No inline styles.
- [X] T023 Run the full [quickstart.md](quickstart.md) manual test suite (Scenarios 1–8 plus the responsive/accessibility smoke tests) on at least one desktop viewport and one mobile viewport (devtools responsive mode). Verify tab-order reaches `#retry-continue-btn` and that Enter/Space activates it, and that the wrong-answer feedback still carries both color AND text (Constitution IV).
- [X] T024 Skim [js/quiz.js](../../js/quiz.js) for any debug `console.log` statements added during implementation and remove them. Confirm no dead code paths, no half-finished helpers, and no new dependencies introduced.
- [X] T025 Verify against [spec.md](spec.md) that every functional requirement FR-001 through FR-015 is satisfied by the implemented behavior, and that all Acceptance Scenarios under User Story 1 and User Story 2 pass. No code changes here unless a gap is found.

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: No dependencies.
- **Phase 2 (Foundational)**: Depends on Phase 1. BLOCKS Phase 3 and Phase 4.
- **Phase 3 (US1)**: Depends on Phase 2.
- **Phase 4 (US2)**: Depends on Phase 3 (because US2 hooks into the same retry lifecycle functions added in T010/T012/T014/T015). US2 cannot be meaningfully delivered before US1 exists.
- **Phase 5 (Polish)**: Depends on US1 + US2.

### User-story dependencies

- **US1 (P1)**: Depends on Foundational only. Delivers the MVP on its own — the retry loop and end-of-queue rule work even without the text count.
- **US2 (P2)**: Depends on US1 because it extends the retry lifecycle functions introduced in US1. Not independently shippable before US1.

### Task-level dependencies within US1

- T006 → T007 (state must exist before reset logic uses it)
- T007 → T008, T009 (start-of-session reset must be in place before per-answer handlers reference state)
- T008, T009 → T010 (retry-phase entry consumes `wrongCards`)
- T010 → T011 (the end-of-main-pass branch calls `enterRetryPhase()`)
- T013 → T012, T014 (render must be retry-aware before Continue and advance paths render retry cards)
- T014 → T015 (advance logic decides when to call `finishRetrySession()`)
- T015 → T016, T017 (cleanup function exists before other exit paths reuse it)
- T018 after T006–T017

### Task-level dependencies within US2

- T019 requires T014 from US1
- T020 requires T010 and T015 from US1
- T021 after T019, T020

### Parallel opportunities

- Phase 2: T002 and T003 touch different hunks of [index.html](../../index.html) but the file is the same — treat as sequential unless the implementer is comfortable editing both in one pass. T004 is independent once T002 and T003 are merged. Marked [P] to signal they have no logical coupling.
- Phase 5: T022 touches [css/style.css](../../css/style.css); T024 touches [js/quiz.js](../../js/quiz.js); they can be done in parallel.
- Within US1 and US2: nearly all tasks edit [js/quiz.js](../../js/quiz.js) and MUST be sequential — no [P] markers inside those phases.

---

## Parallel Example: Phase 2 Foundational

```bash
# After opening the file once, these can be written in one editing pass:
Task: "Add #retry-banner markup inside #quiz-screen in index.html" (T002)
Task: "Add #retry-progress markup inside #quiz-screen in index.html" (T003)

# Then independently:
Task: "Add .retry-banner / .retry-continue-btn / .retry-progress CSS in css/style.css" (T004)
```

---

## Implementation Strategy

### MVP scope

**US1 alone is the MVP.** It delivers the full learning-reinforcement loop: if you get something wrong, you can't finish the deck until you get it right. The text progress count in US2 is pure quality-of-life. Ship US1, validate against Scenarios 1–2 + 4–8, then layer US2 on top.

### Incremental delivery

1. Phase 1 (Setup) — baseline the app.
2. Phase 2 (Foundational) — DOM + CSS scaffolding. App still behaves exactly as before because the new elements are `hidden`.
3. Phase 3 (US1) — ship the retry loop. Manually test Scenarios 1, 2, 4, 5, 6, 7, 8 from [quickstart.md](quickstart.md).
4. Phase 4 (US2) — add the live count. Manually test Scenario 3.
5. Phase 5 (Polish) — responsive/accessibility pass + full [quickstart.md](quickstart.md) run + cleanup.

### Solo developer note

This feature is a single-developer task — all tasks edit a small, known set of files. The parallel strategy section exists for completeness but does not apply in practice; execute sequentially in T-ID order.

---

## Notes

- [P] tasks operate on different files or otherwise have no logical coupling. In this feature, most tasks touch [js/quiz.js](../../js/quiz.js) and are therefore sequential.
- The retry pool, `retryMode`, and `retryQueue` are in-memory only — no Firebase writes, no `localStorage` keys (per FR-014 and [research.md](research.md) Decision 7).
- The Why?-explainer flow and flagged-cards review flow are explicitly untouched.
- Validation is manual per [quickstart.md](quickstart.md); no automated tests are created by these tasks (per project convention — constitution Development Workflow).
- Commit after each checkpoint (end of Phase 2, end of US1, end of US2, end of Polish) or per logical task group.
