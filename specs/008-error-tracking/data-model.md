# Phase 1 Data Model: Client-Side Error Tracking

**Feature**: 008-error-tracking
**Date**: 2026-04-10

## Storage location

Firebase Realtime Database, new top-level node `errors`. Records are appended via `push()` so each gets a chronologically sortable auto-ID.

```text
/errors/{pushId}
```

No nested structure, no indexes required at expected volume (<500 retained records).

## Entity: ErrorRecord

One record per captured error, written once by the learner client and never modified.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes | Firebase `push()` auto-ID (in the key, not the value). |
| `message` | string | yes | Error message, trimmed to 500 chars max. |
| `stack` | string \| null | yes | Stack trace when available from `ErrorEvent.error.stack` or `PromiseRejectionEvent.reason.stack`; `null` otherwise. Trimmed to 4 KB max. |
| `signature` | string | yes | Hash of `message + "::" + topStackFrame`; used for client-side dedup and grouping in the viewer. |
| `kind` | enum | yes | One of `js_error`, `unhandled_rejection`, `network_failure`. |
| `operation` | string \| null | yes | For `network_failure` kind: the operation name passed to `trackedCall` (e.g., `"flag_card"`, `"load_deck"`, `"fetch_explanation"`). `null` for the other kinds. |
| `page` | string | yes | `location.pathname + location.search + location.hash` at the moment of capture, max 500 chars. |
| `timestamp` | number | yes | Unix epoch milliseconds (client clock). |
| `env.browser` | string | yes | Coarse descriptor derived from `navigator.userAgent`: one of `chrome`, `firefox`, `safari`, `edge`, `other`. |
| `env.os` | string | yes | Coarse descriptor: one of `windows`, `macos`, `linux`, `android`, `ios`, `other`. |
| `env.viewport` | string | yes | `"{width}x{height}"` at capture time. |
| `sessionId` | string | yes | UUID v4 generated per page load, in-memory only. Opaque, non-identifying. |
| `breadcrumbs` | array of Breadcrumb | yes | Last ≤10 breadcrumbs at the time of capture, oldest first. Empty array if none. |
| `resolved` | boolean | no | Omitted on write (clients cannot set it). The developer viewer may write this when marking resolved — in v1 "resolve" is equivalent to "delete", so this field is not used in storage. |

### Validation rules

- Required fields above must be present on write. Firebase rules (see contracts) enforce presence and rough shape.
- `message` and `stack` are truncated client-side before write to respect size limits.
- `operation` MUST be set for `kind == "network_failure"` and MUST NOT be set for other kinds.
- `timestamp` MUST be a number, not a server timestamp placeholder (the learner's clock is acceptable since ordering uses the `push()` ID).

### Lifecycle / state transitions

```text
          (captured in the client)
                  │
                  ▼
     [pending — in-memory, offline or write-failed]
                  │ online & write succeeds
                  ▼
        [stored in /errors/{id}]
                  │ developer deletes from viewer
                  ▼
              [removed]
```

No update path exists from the learner client (write-only rule). The only post-write transition is deletion, performed by the developer viewer.

## Entity: Breadcrumb

Embedded inside `ErrorRecord.breadcrumbs`. Not stored independently.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `t` | number | yes | Epoch milliseconds of the action. |
| `msg` | string | yes | Short description, max 120 chars. Navigation-style only (e.g., `"open_deck A1"`, `"answer q=12 correct=true"`, `"flag_toggle"`, `"select_section Greetings"`). |

**Constraint**: Breadcrumbs MUST NOT contain the text of quiz questions, user-typed content, or anything else that could embarrass a learner (per FR-010). Instrumentation sites use symbolic identifiers only.

## Entity: SessionIdentifier

Not a persisted entity — generated once per page load via `crypto.randomUUID()` and held in a module-level variable in `js/error-tracker.js`. Attached to every `ErrorRecord` written during that session. Never written anywhere else; never logged to console; not visible to the learner.

## Relationships

- Many `ErrorRecord` → one `SessionIdentifier` (by value, not by reference).
- `ErrorRecord` → 0..10 `Breadcrumb` (embedded).

## Size & scale

- Expected steady-state volume: <100 records written per day project-wide.
- Retention cap: 500 records (enforced by the viewer on load). Older records dropped oldest-first.
- Estimated record size: ~2–6 KB including stack and breadcrumbs. Worst-case total `/errors` subtree: ~3 MB, well within RTDB limits.
