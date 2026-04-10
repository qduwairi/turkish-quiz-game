# Feature Specification: Client-Side Error Tracking

**Feature Branch**: `008-error-tracking`
**Created**: 2026-04-10
**Status**: Draft
**Input**: User description: "so i would like to know if users get any errors while using the app. if a user gets an error that error is recorded to be then dealt with by developers"

## Clarifications

### Session 2026-04-10

- Q: Which network failures count as in-scope for recording? → A: Only failures of user-initiated operations (clicks, deck start, flag, "why?" button, progress save triggered by an answer). Background syncs and retries are out of scope.
- Q: How should errors captured while offline be handled? → A: Hold them in a short in-memory queue and flush to the store when connectivity returns; queue is lost if the page is closed before reconnect.
- Q: Who should be able to read the stored error records? → A: Developers only. Clients may write new error records but MUST NOT be able to read, list, or modify existing ones; read access is restricted at the store level.
- Q: What is the retention policy for stored error records? → A: No time-based auto-deletion. Developers clean up manually, and a hard cap on total stored records is enforced (oldest records dropped when the cap is exceeded).
- Q: How many recent user actions (breadcrumbs) should be attached to each error record? → A: The last 10 actions preceding the error.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic error capture during quiz use (Priority: P1)

While a learner is using the Turkish quiz app, any unexpected error that occurs in their browser (a broken button, a failed network call, a JavaScript crash, etc.) is silently recorded so developers can later investigate and fix it. The learner is not blocked or interrupted by the recording itself.

**Why this priority**: Without any capture mechanism, developers have zero visibility into real user-facing failures. This single story delivers the core value of the feature — a working pipeline from "error happened on a user's device" to "developer can see it" — and is an MVP on its own.

**Independent Test**: Deliberately trigger an error in the running app (e.g., force a thrown exception or a failed Firebase operation), then verify a new error record appears in the developer-visible error store containing enough context to identify what happened.

**Acceptance Scenarios**:

1. **Given** a learner is taking a quiz, **When** an uncaught JavaScript error is thrown in the page, **Then** an error record is persisted with the error message, a stack trace, the page location, a timestamp, and a coarse environment descriptor (browser/OS).
2. **Given** a learner clicks a feature that relies on a network request, **When** that request fails or returns an unexpected response, **Then** an error record is persisted describing the failed operation and the user-visible context.
3. **Given** an error is being recorded, **When** the recording itself fails (e.g., the error store is unreachable), **Then** the app continues to function normally for the learner and the failure does not cascade into further visible errors.

---

### User Story 2 - Developer review of reported errors (Priority: P2)

A developer working on the app can open a single place to review errors that real users have encountered, sorted by most recent, so they can triage and fix them.

**Why this priority**: Recording errors only has value if someone can act on them. This story closes the loop but depends on Story 1 existing first.

**Independent Test**: With at least one recorded error present, a developer opens the error list and can read the message, stack trace, timestamp, and page context for each entry without needing to ask the affected user.

**Acceptance Scenarios**:

1. **Given** errors have been recorded from real sessions, **When** a developer views the error log, **Then** each entry shows message, stack trace, timestamp, page/route, and environment details.
2. **Given** a developer has finished investigating an error, **When** they mark it as resolved or delete it, **Then** it no longer appears in the active error list.

---

### User Story 3 - Contextual breadcrumbs for reproduction (Priority: P3)

When an error is recorded, it includes recent user actions leading up to the failure (e.g., "started deck X", "answered question 3", "flagged card") so developers can reproduce the issue without guessing.

**Why this priority**: Valuable quality-of-life improvement for debugging, but Stories 1 and 2 deliver a functional error-tracking loop on their own.

**Independent Test**: Trigger an error after performing a short sequence of quiz actions and verify those actions appear in the recorded entry in order.

**Acceptance Scenarios**:

1. **Given** a learner has performed several actions in a session, **When** an error is then recorded, **Then** the record includes an ordered list of the most recent actions preceding the error.

---

### Edge Cases

- A single bug causes the same error to fire many times in a session — the system must not flood the error store or the user's device; repeated identical errors should be de-duplicated or rate-limited.
- The learner is offline when an error occurs — recording should either succeed later when connectivity returns or fail silently without disrupting the app.
- An error occurs before the error-recording code itself has loaded — best-effort capture only; missing early-boot errors is acceptable.
- An error contains sensitive or personally identifiable information in its message or state — records must not include learner-identifying content beyond what is necessary for debugging.
- The error store grows unbounded — a hard cap on total stored records MUST be enforced, discarding oldest records when the cap is reached; developers can also manually remove resolved entries.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST automatically capture uncaught JavaScript errors and unhandled promise rejections that occur in the learner's browser during normal use.
- **FR-002**: The app MUST capture failures of network-backed operations that are triggered by an explicit user action (e.g., starting a deck, answering a question, flagging a card, requesting an explanation, loading quiz content for the selected view). Background synchronization, retries, and passive updates are OUT of scope.
- **FR-003**: Each captured error record MUST include: error message, stack trace (when available), timestamp, page or route where it occurred, and a coarse environment descriptor (browser and operating system family).
- **FR-004**: Each captured error record MUST include a non-identifying session identifier so multiple errors from the same session can be correlated, without exposing who the learner is.
- **FR-005**: Captured error records MUST be persisted to a developer-accessible store that survives page reloads and is not tied to the affected learner's device.
- **FR-006**: The error-capture mechanism MUST NOT interrupt, block, or visibly degrade the learner's quiz experience, even if the error store is unreachable.
- **FR-007**: The system MUST de-duplicate or rate-limit repeated identical errors within a single session so a single bug cannot flood the store.
- **FR-008**: Developers MUST be able to view recorded errors in a single place, ordered by most recent first, and see all fields from FR-003 and FR-004 for each entry.
- **FR-009**: Developers MUST be able to mark an error as resolved or remove it from the active list once handled.
- **FR-010**: The system MUST NOT record content that directly identifies a learner (e.g., names, emails) in error records; only the quiz context needed for debugging.
- **FR-012**: The error store MUST be write-only from the learner's client: clients MAY append new error records but MUST NOT be able to read, list, update, or delete existing records. Read access is restricted to developers and enforced at the store level.
- **FR-013**: The error store MUST enforce a fixed maximum number of retained records. When the cap is reached, the oldest records MUST be discarded to make room for new ones. There is no time-based auto-deletion; developers clean up resolved entries manually.
- **FR-011**: The system MUST hold errors that occur while offline in a short in-memory queue and flush them to the error store once connectivity is restored within the same page session. If the page is closed before reconnect, queued errors MAY be dropped. Offline handling MUST never produce a learner-visible failure.

### Key Entities *(include if feature involves data)*

- **Error Record**: A single captured failure. Attributes: message, stack trace, timestamp, page/route, environment descriptor, session identifier, optional recent-actions breadcrumb list, resolution status.
- **Session Identifier**: An opaque, non-identifying value generated per browser session, used only to group related error records.
- **Breadcrumb** *(Story 3)*: A short description of a user action (e.g., "opened deck", "answered question", "flagged card") with a timestamp. The system retains a rolling history of the last 10 actions per session, and attaches that history to any error record captured in that session.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of uncaught JavaScript errors and unhandled promise rejections triggered in a test session are present in the developer-visible error store within one minute of occurring.
- **SC-002**: Zero learner-visible interruptions, popups, or failures are caused by the error-capture mechanism itself across a full quiz session, even when the error store is deliberately unreachable.
- **SC-003**: A developer can identify, open, and read the full context of a reported error (message, stack, page, timestamp, environment) in under 30 seconds from a single entry point.
- **SC-004**: Repeated identical errors from a single session produce no more than a small, bounded number of stored records (e.g., at most 5 per unique error signature per session) rather than one per occurrence.
- **SC-005**: No error record contains learner-identifying personal information when reviewed against a defined PII checklist.

## Assumptions

- The target audience for the error log is the project's own developers, not the learners themselves — learners neither see nor manage errors.
- The existing Firebase Realtime Database used by the app is the reasonable default store for error records, consistent with how other app data is persisted. Exact storage location and schema are an implementation concern.
- "Errors" in scope means client-side runtime failures and user-visible network failures originating from the web app. Pure backend/cloud function failures that never surface to the client are out of scope for v1.
- Real-time alerting (email, Slack, paging) is out of scope for v1; developers pull the log on demand.
- Historical analytics (trend graphs, dashboards) are out of scope for v1; a simple chronological list is sufficient.
- Learners are anonymous in this app; no account/email/name needs to be scrubbed because none is collected — the PII constraint is mainly a guardrail against accidental inclusion of quiz-answer content that could embarrass a user.
