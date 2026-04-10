# Contract: Firebase Realtime Database Rules for `/errors`

**Feature**: 008-error-tracking
**Applies to**: `database.rules.json`

## Goal

- Learner clients MAY append new error records to `/errors`.
- Learner clients MUST NOT read, list, update, or delete existing records.
- Developer viewer reads via a mechanism not subject to the learner rules (see quickstart).
- Existing open access for other subtrees (`/flagged`, etc.) is preserved.

## Rule shape

The current rules set `.read: true` and `.write: true` at the root, which would cascade to `/errors`. The change narrows the root defaults so `/errors` gets its own rules.

```json
{
  "rules": {
    ".read": true,
    ".write": true,
    "errors": {
      ".read": false,
      ".write": false,
      "$errorId": {
        ".write": "!data.exists() && newData.exists()",
        ".validate": "newData.hasChildren(['message', 'signature', 'kind', 'page', 'timestamp', 'sessionId', 'breadcrumbs']) && newData.child('message').isString() && newData.child('message').val().length <= 500 && newData.child('signature').isString() && newData.child('kind').isString() && (newData.child('kind').val() == 'js_error' || newData.child('kind').val() == 'unhandled_rejection' || newData.child('kind').val() == 'network_failure') && newData.child('page').isString() && newData.child('page').val().length <= 500 && newData.child('timestamp').isNumber() && newData.child('sessionId').isString()"
      }
    }
  }
}
```

## Semantics

- `errors/.read = false` blocks listing and reading any existing record from the client. The developer viewer uses a mechanism (service account / database secret / locally-generated admin token) that bypasses these rules; see [quickstart.md](../quickstart.md).
- `errors/.write = false` at the parent, combined with the per-child `.write` condition `!data.exists() && newData.exists()`, enforces **create-only**: a client may push a new record but cannot overwrite or delete existing ones (`data.exists()` is true for updates/deletes).
- `.validate` enforces required fields, types, and size limits so the store cannot be polluted with arbitrary payloads.

## Out of scope for the rules

- Enforcing the 500-record cap. This is enforced by the developer viewer on load (see `research.md` Decision 5).
- Rate limiting per session. Handled client-side via signature dedup (SC-004).
