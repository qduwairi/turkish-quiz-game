# Phase 0 Research: Client-Side Error Tracking

**Feature**: 008-error-tracking
**Date**: 2026-04-10

All NEEDS CLARIFICATION items from Technical Context were resolved during `/speckit.clarify`. This document records the remaining technical choices and the reasoning behind them.

## Decision 1: Capture mechanism

**Decision**: Install `window.addEventListener('error', ...)` and `window.addEventListener('unhandledrejection', ...)` in a new module `js/error-tracker.js`, loaded as the first script in `index.html` so it is live before `js/quiz.js` runs.

**Rationale**: These two events are the standard browser hooks and cover both synchronous throws and async rejections with zero dependencies, satisfying Constitution III. Loading the tracker first maximizes the window during which captures are live without requiring any framework support.

**Alternatives considered**:
- Wrapping every function in try/catch — far more invasive, easy to miss call sites, doesn't catch promise rejections.
- Loading a third-party library (Sentry, LogRocket) — violates Constitution III (no new dependencies) and the simplicity goal; also conflicts with the data-minimization stance.

## Decision 2: Network-failure capture (FR-002)

**Decision**: Expose a small helper `trackedCall(operationName, promise)` from `error-tracker.js`. Instrument the handful of user-initiated call sites in `js/quiz.js` (deck start, answering a question, flagging/unflagging, loading quiz content, "why?" button fetch) to wrap their Firebase / `fetch` promises with it. A rejected promise inside `trackedCall` produces an error record *and* re-throws so existing UI logic still runs.

**Rationale**: Clarification Q1 scoped capture to user-initiated operations only. Explicit instrumentation at those call sites is much less error-prone than globally monkey-patching `fetch` / Firebase methods, which would sweep in background retries and violate the agreed scope. The list of call sites is small and bounded.

**Alternatives considered**:
- Global `fetch` wrapper / Firebase SDK shim — would catch background operations, contrary to the clarified scope.
- Relying solely on the `unhandledrejection` listener — many existing call sites already `.catch()` their failures and would be silently swallowed.

## Decision 3: Storage layout in Firebase Realtime Database

**Decision**: A new top-level node `errors` containing a flat list of records, pushed with `ref.push(...)` so each record gets an ordered auto-ID. A sibling `errors_meta/count` integer is maintained client-side by the viewer (not the learner client) for informational display; it is not relied on for the cap.

**Rationale**: The existing app uses top-level RTDB nodes (`flagged`, etc.) and `push()` IDs are chronologically sortable, which directly supports SC-003 (latest-first listing). Keeping it flat minimizes rules complexity and matches the project's existing style in [database.rules.json](../../database.rules.json).

**Alternatives considered**:
- Nesting by date (`errors/2026-04-10/...`) — more complex rules and queries, no benefit at expected volume (<100/day).
- Storing under `flagged/errors` or similar — muddles unrelated concerns and complicates rules.

## Decision 4: Write-only client access (FR-012)

**Decision**: Update [database.rules.json](../../database.rules.json) so the `errors` node has `.write: true` but `.read: false` at that subtree. The existing `.read: true` / `.write: true` at the root is narrowed so the root rules no longer cover `errors` reads. Developers read via the viewer page using a Firebase database secret or by temporarily running the page with a privileged custom token; the exact operational mechanism is documented in `quickstart.md` — it does not change the rule shape.

**Rationale**: Clarification Q3 required dev-only reads. RTDB rules fully support write-only subtrees, which satisfies the requirement without introducing auth flows that would exceed the feature's scope.

**Alternatives considered**:
- Full Firebase Auth with admin claim — heavier than needed; introduces a new auth surface for what is a personal developer-only tool.
- Leaving reads open — rejected in clarification.

## Decision 5: Retention cap (FR-013)

**Decision**: Cap at **500 records**. The learner client does NOT enforce the cap (it has no read access). The developer viewer page enforces it on load: when it observes more than 500 records, it deletes the oldest excess to bring the count back down. A hard cap of 500 is visible in `js/error-tracker.js` only as a constant used nowhere operationally except documentation.

**Rationale**: Since clients are write-only, only a read-capable actor can prune. The viewer is the natural place. 500 is an arbitrary but comfortable ceiling for a personal learning app with expected <100 errors/day; it gives ≈5 days of runway even in a bad week, which is plenty for a developer checking in regularly.

**Alternatives considered**:
- Enforcing cap on the client during each write (requires `.read` access — violates FR-012).
- A Cloud Function triggered on write — violates the client-side-only constitutional constraint for a problem that doesn't need a server.
- Time-based auto-deletion — rejected in clarification Q4.

## Decision 6: De-duplication (FR-007, SC-004)

**Decision**: Compute an error *signature* as `sha1(message + "::" + topStackFrame)` — or, when the Web Crypto API's digest is not readily available sync, a fast non-cryptographic hash of the same string. Track per-session counts in a plain JS `Map`. Once a signature's count reaches 5, further occurrences that session are dropped on the client before any network call.

**Rationale**: Per clarification Q-edge and SC-004, the goal is "a small bounded number of stored records per unique signature per session". Hashing message + top stack frame gives stable grouping across slightly different runtime state. 5 is small enough to prevent floods, large enough to notice a repeating bug.

**Alternatives considered**:
- Server-side dedup — requires read access; violates FR-012.
- Hashing the full stack — over-fragmentation across minor frame offsets.
- Time-window rate limiting — more code for the same effect at this scale.

## Decision 7: Offline buffering (FR-011)

**Decision**: Maintain a simple in-memory array `pending = []`. When navigator is offline OR the most recent Firebase write failed, push new records there. On `window.addEventListener('online', ...)` or after a successful later write, drain `pending` in order. The buffer is intentionally *not* persisted; page close drops it, matching clarification Q2.

**Rationale**: Minimal complexity, matches the clarification exactly, and avoids any learner-visible storage warning prompts.

**Alternatives considered**:
- `localStorage` persistence — rejected in Q2.
- Service worker background sync — overkill for this feature and adds a new runtime surface.

## Decision 8: Breadcrumbs (Story 3)

**Decision**: A fixed-capacity ring buffer (`Array` of length ≤10) maintained in `error-tracker.js`. Exposed as `track.breadcrumb(message)` from `js/quiz.js`. Instrumented at the same user-initiated call sites as Decision 2, plus: sidebar section selection, deck start, answer submitted (with correctness bool only — never the question text), flag toggled. Attached to every error record as `breadcrumbs: [...]`.

**Rationale**: 10 is the clarified depth. Limiting to navigation-style events (not raw user text) directly supports FR-010 (no PII) while giving developers enough to reproduce. Keeping this out of `quiz.js` state prevents it from interacting with quiz logic.

**Alternatives considered**:
- Recording all DOM clicks — noisy and risks capturing text content.
- Persisting breadcrumbs across reloads — unnecessary for reproduction and adds storage concerns.

## Decision 9: Session identifier (FR-004)

**Decision**: Generate a UUID v4 (via `crypto.randomUUID()`) once on module load and keep it in memory only. It is attached to every error record as `sessionId` and is not persisted. Name kept deliberately opaque so it cannot be mistaken for a user ID.

**Rationale**: `crypto.randomUUID()` is supported in all target browsers, needs no dependency, and is non-identifying.

## Decision 10: Developer viewer surface

**Decision**: A single static HTML page `dev/errors.html` + `dev/errors.js` that:
- Loads the Firebase SDK from the same CDN as `index.html`.
- Reads `errors` via `.on('value', ...)`.
- Renders a latest-first list: each entry shows message, timestamp, page, browser/OS, session, stack (collapsed), breadcrumbs (collapsed).
- Provides per-entry "Resolve (delete)" and a top-level "Delete all resolved" action (resolved = deleted, so it's just "Delete").
- On load, if there are >500 records, deletes the oldest excess.

**Rationale**: Closes the FR-008/FR-009 loop with the minimum moving parts. A single-file viewer matches project style (no build, no framework).

**Alternatives considered**:
- Adding the viewer to the main `index.html` behind a hidden URL — bleeds developer tooling into the learner app and risks exposing stack traces.
- A CLI script — would require Node + service account; more ceremony for a solo project.
