# Data Model: Fix Why Button CORS and Deployment Issue

**Feature**: 005-fix-why-button-cors | **Date**: 2026-04-05

## Entities

No new persistent entities are introduced. The feature operates on ephemeral request/response data only.

### Explain Request (transient)

| Field    | Type     | Constraints                        |
|----------|----------|------------------------------------|
| question | string   | Required, max 500 characters       |
| options  | string[] | Required, exactly 4 items          |
| options[i] | string | Required, non-empty, max 200 chars |
| correct  | integer  | Required, 0-3 inclusive            |

### Explain Response (transient)

| Field       | Type    | Description                                         |
|-------------|---------|-----------------------------------------------------|
| explanation | string  | AI-generated 1-2 sentence explanation               |
| hasWarning  | boolean | True if AI flagged the marked answer as potentially wrong |

### Error Response (transient)

| Field   | Type   | Description                          |
|---------|--------|--------------------------------------|
| error   | string | Human-readable error message         |

## State Transitions

None. The explain function is stateless — each request is independent.

## Storage Impact

None. No database schema changes. No new persistent data.
