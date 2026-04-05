# Data Model: Card "Why?" Explainer

**Branch**: `004-card-why-explainer` | **Date**: 2026-04-05

## Entities

### Question (existing — no changes)

| Field | Type | Description |
|-------|------|-------------|
| question | string | The quiz question text |
| options | string[] | Array of 4 answer options |
| correct | number | Zero-based index of the correct option |

No schema changes to `js/questions.js`. The AI receives question data at runtime.

### ExplainRequest (runtime — Cloud Function input)

| Field | Type | Description |
|-------|------|-------------|
| question | string | The quiz question text |
| options | string[] | All answer options |
| correct | number | Index of the marked correct answer |

### ExplainResponse (runtime — Cloud Function output)

| Field | Type | Description |
|-------|------|-------------|
| explanation | string | 1-2 sentence explanation in English |
| hasWarning | boolean | True if the AI flagged the marked answer as potentially incorrect |

### Client-Side State (in-memory per question)

| Field | Type | Description |
|-------|------|-------------|
| cachedExplanation | string or null | Cached AI response for the current question (reset on advance) |
| hasWarning | boolean | Whether the cached response includes a correctness warning |
| isLoading | boolean | Whether an AI request is in flight |
| isExpanded | boolean | Whether the explanation section is visible |

## State Transitions

```
[Unanswered] → correct answer → [Auto-advance] (no "Why?" involvement)
[Unanswered] → wrong answer → [Answered-Wrong]
[Answered-Wrong] → tap "Why?" → [Loading]
[Loading] → success → [Explanation-Visible]
[Loading] → failure → [Error-Shown]
[Error-Shown] → tap retry → [Loading]
[Explanation-Visible] → tap "Why?" → [Explanation-Hidden]
[Explanation-Hidden] → tap "Why?" → [Explanation-Visible] (no new API call)
[Any post-answer state] → tap "Next" → [Unanswered] (reset all state)
```

## No Database Changes

- No changes to Firebase Realtime Database schema
- No changes to `database.rules.json`
- Explanations are ephemeral (not persisted)
