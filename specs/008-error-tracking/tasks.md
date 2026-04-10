---
description: "Task list for 008-error-tracking"
---

# Tasks: Client-Side Error Tracking

**Feature dir**: `specs/008-error-tracking/`
**Inputs**: plan.md, spec.md, research.md, data-model.md, contracts/firebase-rules.md, contracts/error-record.schema.json, quickstart.md
**Tests**: Not explicitly requested — no automated test tasks generated. Manual verification via quickstart.md is the validation path (per Constitution).

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to a user story from spec.md (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the directories and placeholder files that subsequent phases fill in. No runtime behavior changes yet.

- [X] T001 Create the `dev/` directory at the repo root for the developer viewer files (`dev/errors.html`, `dev/errors.js` will be added in Phase 5).
- [X] T002 [P] Create empty module file `js/error-tracker.js` with a top-of-file comment noting it is loaded from `index.html` before `js/quiz.js`. No exports yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Land the storage contract and the core tracker skeleton that every user story depends on. Nothing in Phase 3+ can run until this is done.

**⚠️ CRITICAL**: Must complete before any user story phase.

- [X] T003 Update `database.rules.json` to add the `errors` subtree rules per `specs/008-error-tracking/contracts/firebase-rules.md`: `.read: false` / `.write: false` at `/errors`, plus a per-child `.write` condition `!data.exists() && newData.exists()` and a `.validate` that enforces required fields, allowed `kind` values, and size limits from `contracts/error-record.schema.json`.
- [X] T004 In `js/error-tracker.js`, implement the module skeleton: a single IIFE that exposes `window.errorTracker = { capture, trackedCall, breadcrumb }`. Inside, create module-level state: `sessionId = crypto.randomUUID()`, `breadcrumbs = []` (ring buffer, max 10), `seenSignatures = new Map()` (signature → count, cap 5 per signature), `pending = []` (offline queue). Leave method bodies as `// TODO` for now — they get filled by US1/US3.
- [X] T005 In `js/error-tracker.js`, add helper `detectEnv()` returning `{ browser, os, viewport }` with the coarse buckets from `data-model.md` (chrome/firefox/safari/edge/other; windows/macos/linux/android/ios/other; `${innerWidth}x${innerHeight}`). Purely a pure function of `navigator.userAgent` and `window.innerWidth/innerHeight`.
- [X] T006 In `js/error-tracker.js`, add helper `computeSignature(message, stack)` that returns a short hex string derived from `message + "::" + topFrame(stack)`. Use a simple synchronous non-cryptographic hash (e.g., djb2) — Web Crypto is async and not needed here.
- [X] T007 In `js/error-tracker.js`, add helper `buildRecord({kind, message, stack, operation})` that assembles a full `ErrorRecord` object conforming to `contracts/error-record.schema.json`: trims `message` to 500 chars, trims `stack` to 4096 chars, includes `signature`, `page` (`location.pathname + search + hash`, trimmed to 500), `timestamp` (`Date.now()`), `env` (from `detectEnv`), `sessionId`, and a snapshot copy of `breadcrumbs`. Sets `operation` to the passed value for `network_failure` kind, otherwise `null`.
- [X] T008 In `js/error-tracker.js`, implement `writeRecord(record)`: uses the already-loaded Firebase Realtime Database reference (same pattern as `js/quiz.js` uses for `flagged`) to `push` to `/errors`. MUST be wrapped in `try/catch` and `.catch()` so that any failure routes the record into `pending` instead of throwing. On success, drains any queued records from `pending` in order.
- [X] T009 In `js/error-tracker.js`, wire up the online/offline recovery path: on `window.addEventListener('online', ...)`, attempt to drain `pending` by re-calling `writeRecord` for each. Ensure the drain is idempotent and never throws on the main thread.
- [X] T010 Edit `index.html` to add a `<script src="js/error-tracker.js"></script>` tag placed **before** the existing `js/quiz.js` and `js/questions.js` script tags so the tracker is live before the rest of the app boots. Do not change any other markup.

**Checkpoint**: Foundation ready — `window.errorTracker` exists, the Firebase rules allow create-only writes to `/errors`, and the module is loaded first. User stories can now begin.

---

## Phase 3: User Story 1 — Automatic error capture during quiz use (Priority: P1) 🎯 MVP

**Goal**: When any uncaught JavaScript error, unhandled promise rejection, or user-initiated network-call failure happens in the learner's browser, a well-formed `ErrorRecord` lands in `/errors` within one minute, without disturbing the learner.

**Independent Test**: Open the running app, throw `new Error("smoke")` in the console, verify via the Firebase console (or the viewer from US2 if already built) that a record with `kind: "js_error"`, the correct `page`, and a non-empty `env` block was stored. Then go offline, flag a card, go back online, and verify a `network_failure` record with `operation: "flag_card"` arrives.

### Implementation for User Story 1

- [X] T011 [US1] In `js/error-tracker.js`, implement `capture({kind, message, stack, operation})`: computes `signature`, checks `seenSignatures.get(signature) || 0`, returns early if count ≥ 5 (dedup cap per SC-004), otherwise increments the count, calls `buildRecord`, and calls `writeRecord`. MUST be fully guarded so any internal exception is swallowed silently — the tracker must never crash the learner's page.
- [X] T012 [US1] In `js/error-tracker.js`, install `window.addEventListener('error', evt => errorTracker.capture({ kind: 'js_error', message: evt.message || String(evt.error), stack: evt.error && evt.error.stack || null, operation: null }))`. Attach during IIFE startup.
- [X] T013 [US1] In `js/error-tracker.js`, install `window.addEventListener('unhandledrejection', evt => errorTracker.capture({ kind: 'unhandled_rejection', message: (evt.reason && (evt.reason.message || String(evt.reason))) || 'unhandled rejection', stack: evt.reason && evt.reason.stack || null, operation: null }))`.
- [X] T014 [US1] In `js/error-tracker.js`, implement `trackedCall(operationName, promise)`: returns a new promise that awaits the input, re-throws on rejection, AND on rejection calls `capture({ kind: 'network_failure', message: err && (err.message || String(err)) || 'network failure', stack: err && err.stack || null, operation: operationName })`. Must not swallow the rejection — existing UI error paths in `js/quiz.js` keep working.
- [X] T015 [US1] In `js/quiz.js`, wrapped the two user-initiated network call sites that actually exist in this app: `saveFlagged()` (flag/unflag — Firebase `.set()`) and the `/api/explain-answer` fetch chain. Operation names used: `flag_card`, `unflag_card`, `fetch_explanation`. The other names listed in the task (`load_questions`, `start_deck`, `submit_answer`) have no corresponding network calls in this app — questions/decks/answers are all static per Constitution V — so no wrapping is needed. Background listeners (`initFlaggedSync`'s `.on('value')`) and audio preload fetches are intentionally NOT wrapped per clarification Q1.
- [ ] T016 [US1] Manual verification against `specs/008-error-tracking/quickstart.md` sections "Verify the capture path", "Verify network-failure capture", and "Verify learner is unaffected when the error store is unreachable". Record the captured record shape in a short note in the PR description.

**Checkpoint**: US1 is fully functional on its own — errors land in `/errors` even with no viewer built. You can inspect them via the Firebase console.

---

## Phase 4: User Story 2 — Developer review of reported errors (Priority: P2)

**Goal**: A developer can open a single page, see the latest errors first, inspect message/stack/page/timestamp/environment/session/breadcrumbs for each, and delete entries they've handled.

**Independent Test**: With at least one record present in `/errors`, open `dev/errors.html` locally, confirm the list renders latest-first with all required fields, click delete on one entry, and verify it disappears from the list and from `/errors`.

### Implementation for User Story 2

- [X] T017 [P] [US2] Create `dev/errors.html`: minimal HTML5 page that loads the same Firebase SDK CDN scripts as `index.html`, initializes Firebase with the same config, includes a header, an empty `<main id="error-list">`, and a final `<script src="errors.js"></script>`. No CSS framework — a small inline `<style>` block is fine (keeps Constitution III compliance; `css/style.css` is not reused because this page is developer-only and separate).
- [X] T018 [US2] In `dev/errors.js`, subscribe to `/errors` with `.on('value', ...)`, sort entries by `push()` key descending (latest first), and render each as a collapsible card showing: `message`, `kind`, `timestamp` (human-readable local time), `page`, `env.browser`/`env.os`/`env.viewport`, `sessionId`, `operation` (when present), `stack` (in a `<pre>`, collapsed by default), and `breadcrumbs` (ordered list, collapsed by default).
- [X] T019 [US2] In `dev/errors.js`, add a "Delete" button per entry that removes the corresponding child under `/errors` via `firebase.database().ref('/errors/' + id).remove()`. The live subscription will repaint automatically.
- [X] T020 [US2] In `dev/errors.js`, enforce the retention cap on load: after the first snapshot arrives, if the entry count exceeds 500, delete the oldest excess by sorted push-key ascending until the count is back at 500. Log the pruning count to the viewer console area only.
- [ ] T021 [US2] Manual verification against `specs/008-error-tracking/quickstart.md` section "Running the developer viewer": load the viewer with the operational read mechanism documented there, confirm list renders, delete works, and the cap-on-load prune runs when forced over 500 via test data.

**Checkpoint**: US1 + US2 together close the end-to-end loop — errors are captured AND developers can review/triage them.

---

## Phase 5: User Story 3 — Contextual breadcrumbs for reproduction (Priority: P3)

**Goal**: Every error record carries an ordered list of the learner's last ≤10 user actions, so developers can reproduce without guessing.

**Independent Test**: With breadcrumb instrumentation in place, perform a short sequence (e.g., open deck → answer q1 correct → answer q2 wrong → flag card), then throw an error. Confirm the stored record's `breadcrumbs` array reflects those four actions in order with correct `t` timestamps and short `msg` strings.

### Implementation for User Story 3

- [X] T022 [US3] In `js/error-tracker.js`, implement `breadcrumb(msg)`: pushes `{ t: Date.now(), msg: String(msg).slice(0, 120) }` onto the `breadcrumbs` array and trims from the front so length never exceeds 10. Must be fast (no awaits, no network).
- [X] T023 [US3] In `js/quiz.js`, added `window.errorTracker.breadcrumb(...)` calls at: `startQuiz` (→ `start_deck <deckId>`), `startFlaggedQuiz` (→ `start_deck flagged`), `selectAnswer` (→ `answer q=<index> correct=<bool>`), `toggleFlag` (→ `flag_toggle q=<index>`). The `select_section`/`open_deck` candidates from the original task list have no distinct user action in this app — sidebar selection goes straight to `startQuiz`, so there is nothing separate to breadcrumb. All identifiers are symbolic; no question text, user-typed content, or PII.
- [X] T024 [US3] Sanity-check that `buildRecord` (added in T007) already snapshots `breadcrumbs` by value rather than reference, so subsequent breadcrumb pushes don't mutate already-written records. If it currently shares the reference, change it to `breadcrumbs.slice()`.
- [ ] T025 [US3] Manual verification per quickstart.md: perform a scripted action sequence, trigger an error, reload `dev/errors.html`, expand the new record, and confirm the breadcrumb list matches the actions in order. Verify no breadcrumb contains raw quiz text.

**Checkpoint**: All three user stories are independently functional. Breadcrumbs add debugging value without reshaping the contract.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T026 Re-run the full quickstart checklist in `specs/008-error-tracking/quickstart.md` end-to-end on at least one desktop browser and one mobile viewport (per Constitution IV). Capture any deviations. **[MANUAL — requires running browser + temporarily relaxed rules]**
- [X] T027 [P] Code review of `js/error-tracker.js` against the "must never disturb the learner" invariant completed: `capture`, `breadcrumb`, the two global listeners, and the `online` handler are all wrapped in try/catch; `trackedCall` deliberately re-throws the rejection after capturing it so existing UI `.catch()` handlers keep working, and because `capture` increments `seenSignatures` before re-throw any secondary `unhandledrejection` capture of the same error is deduped; `writeRecord` and `drainPending` route all failures into the `pending` queue rather than throwing; no `console.*` calls on production paths. Invariant holds — no code changes needed.
- [X] T028 [P] Verified `database.rules.json` structurally: the new `errors` subtree rules only add children under the existing root `.read: true`/`.write: true`, they do not modify the root defaults. `/flagged` and any other sibling paths continue to use the root rules and are unaffected. Runtime regression check of flag/unflag is part of T026 (manual).
- [X] T029 Confirmed `CLAUDE.md` was updated by `update-agent-context.ps1` during `/speckit.plan`: "Active Technologies" section mentions 008-error-tracking on lines 12–13 and "Recent Changes" mentions it on line 42.
- [ ] T030 PII sweep: inspect 5 sample captured records in `/errors` and confirm none contain question text, answer text, or any other user-typed content. Remove any offending breadcrumb source identified. **[SOURCES audited — see note]** Breadcrumb call sites use only symbolic identifiers (`deck-<unit.id>-<index>`, literal `"flagged"`, `q=<index>`, `correct=<bool>`) and are safe. A runtime sweep of actual stored records still requires browser-plus-relaxed-rules access and remains a manual step.

---

## Dependencies & Execution Order

### Phase dependencies

- Phase 1 (Setup) — no deps.
- Phase 2 (Foundational) — depends on Phase 1. **Blocks all user stories.**
- Phase 3 (US1) — depends on Phase 2.
- Phase 4 (US2) — depends on Phase 2 only. Independent of US1 at build time; US2 is more useful *after* US1 has written real records but does not require US1 code.
- Phase 5 (US3) — depends on Phase 2 only. Independent of US1/US2 at build time; the breadcrumb array already exists in the foundational skeleton. US3 is more meaningful *after* US1, but the viewer (US2) will display `breadcrumbs` naturally once present.
- Phase 6 (Polish) — depends on whichever user stories are shipped.

### Within each user story

- T011 → T012/T013/T014 (capture must exist before the listeners call it)
- T014 → T015 (trackedCall must exist before call sites can wrap with it)
- T017 → T018/T019/T020 (HTML shell must exist before viewer logic)
- T022 → T023 (breadcrumb() must exist before call sites invoke it)

### Parallel opportunities

- T002 runs in parallel with T001 (different files).
- Within Phase 2: T003 (rules JSON) and T004–T009 (tracker JS skeleton) are in different files and can be parallelized, but T010 (index.html edit) should come last.
- Within US1: T012, T013, T014 all touch `js/error-tracker.js` — NOT parallelizable with each other. T015 touches `js/quiz.js` and can run in parallel with T012–T014.
- US2's T017 (HTML) and T018 (JS) are different files — T017 can be in parallel with the early part of US1.
- US1 and US2 and US3 phases can be worked on by different developers in parallel once Phase 2 is done.

---

## Parallel Example: User Story 1 + User Story 2

```text
# After Phase 2 is complete, two developers can start in parallel:
Developer A: T011 → T012 → T013 → T014 → T015 → T016   (US1)
Developer B: T017 (in parallel with T015) → T018 → T019 → T020 → T021   (US2)
```

---

## Implementation Strategy

### MVP (ship after US1 only)

1. Phase 1 → Phase 2 → Phase 3 (US1).
2. Validate via the quickstart's "Verify the capture path" and offline-unreachable sections.
3. Inspect captured records via the Firebase console (no viewer needed yet).
4. Ship. Developers already get value from records landing in `/errors` even without a viewer.

### Incremental delivery

1. Ship US1 as MVP.
2. Add US2 → developers get a one-click review surface.
3. Add US3 → records gain breadcrumbs for easier reproduction.
4. Final polish pass (Phase 6) before merging.

---

## Task count summary

- **Phase 1 (Setup)**: 2 tasks (T001–T002)
- **Phase 2 (Foundational)**: 8 tasks (T003–T010)
- **Phase 3 (US1)**: 6 tasks (T011–T016)
- **Phase 4 (US2)**: 5 tasks (T017–T021)
- **Phase 5 (US3)**: 4 tasks (T022–T025)
- **Phase 6 (Polish)**: 5 tasks (T026–T030)
- **Total**: 30 tasks

## Notes

- No test tasks generated — tests were not requested and the project's Constitution specifies manual browser testing.
- Every task follows the strict checklist format: `- [ ] Txxx [P?] [Story?] Description with file path`.
- Story-phase tasks carry a `[US1]` / `[US2]` / `[US3]` label; Setup/Foundational/Polish tasks intentionally do not.
- Keep commits small and at task boundaries.
