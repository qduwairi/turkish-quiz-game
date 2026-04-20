# Phase 1 Data Model: Vocabulary Tool

**Feature**: 009-vocab-tool
**Date**: 2026-04-20

Describes the logical entities, Firebase layout, validation rules, and state-transition behavior for the vocabulary tool. All data lives under the authenticated user's subtree in Firebase Realtime Database.

---

## 1. Entities

### 1.1 VocabularyDeck

A named collection owned by one user.

| Field | Type | Required | Notes |
|---|---|---|---|
| `deckId` | string (push ID) | yes | Firebase-generated, globally unique |
| `name` | string | yes | 1–64 chars, user-editable (FR-012) |
| `description` | string | no | 0–200 chars |
| `createdAt` | number (epoch ms) | yes | Set at creation, never mutated |
| `itemCount` | number | no (derived) | Cached; recomputed on import/delete |

**Validation**:
- `name` trimmed, non-empty after trim
- `name` unique per user (case-insensitive)
- `description` optional; empty string omitted from the record

**Lifecycle**:
- `created` → `active` (default on first successful import)
- `active` ↔ `active` (rename via FR-012)
- `active` → `deleted` (hard delete — removes `items`, `events`, `reviewState` under same deckId)

### 1.2 VocabularyItem

A single term/translation pair belonging to a deck. Unique within its parent deck only; no cross-deck linkage (Q2).

| Field | Type | Required | Notes |
|---|---|---|---|
| `itemId` | string (push ID) | yes | Firebase-generated |
| `term` | string | yes | 1–200 chars, Turkish letters preserved (FR-013) |
| `translation` | string | yes | 1–200 chars |
| `extras` | map<string, string> | no | Preserves arbitrary additional CSV columns (FR-002) |
| `importedAt` | number (epoch ms) | yes | Epoch ms of successful import |

**Validation**:
- Uniqueness per deck: case-insensitive match on `trim(term)` (FR-003, Q2)
- `term` and `translation` both required and non-empty after trim; rows that fail this are skipped with a per-row reason (FR-003)
- `extras` keys are the original CSV header names (trimmed, first-occurrence wins if duplicated in the header)

**Lifecycle**:
- `imported` → `active` (default)
- `active` → `deleted` (user deletes a single item, or cascade from deck delete)

### 1.3 AnswerEvent

An append-only record of a single answered question. Never mutated after write.

| Field | Type | Required | Notes |
|---|---|---|---|
| `eventId` | string (push ID) | yes | Firebase-generated; sorts chronologically |
| `ts` | number (epoch ms) | yes | Client-local clock at answer time |
| `correct` | boolean | yes | `true` if user selected the correct option |
| `direction` | enum `"termToTranslation"` / `"translationToTerm"` | yes | Which direction the question was posed |
| `mode` | enum `"quiz"` / `"review"` | yes | Which surface recorded the event |

**Validation**:
- All fields required; no validation dependencies across events
- Events are *never* edited or deleted individually (deck deletion removes the whole `events/{deckId}` subtree)

### 1.4 ReviewRecord (derived)

Per-(user, deck, item) scheduler state. **Derived** deterministically from the event log in chronological order. Cached in `reviewState/` for fast reads, but always refreshable from events (Q3).

| Field | Type | Required | Notes |
|---|---|---|---|
| `interval` | number (days) | yes | Current spacing; `>= 1` |
| `ease` | number | yes | Float in `[1.3, 3.0]` |
| `streak` | number | yes | Count of consecutive correct answers since last incorrect |
| `dueDate` | string (`YYYY-MM-DD`, user-local) | yes | `lastSeenDate + interval` days |
| `lastSeen` | number (epoch ms) | yes | Timestamp of the most-recent event |
| `totalSeen` | number | yes | Count of all answer events for this item |

**Initial state** (no events yet): item is "new" and not included in the Review view. First MCQ answer transitions it into the schedule.

**Derivation rule** (pseudo-code):

```text
state = { interval: 0, ease: 2.5, streak: 0, dueDate: null, lastSeen: 0, totalSeen: 0 }
for event in events ordered by ts asc:
  state.totalSeen += 1
  state.lastSeen  = event.ts
  if event.correct:
    state.streak += 1
    if state.streak == 1:     state.interval = 1
    elif state.streak == 2:   state.interval = 3
    else:                     state.interval = round(state.interval * state.ease)
    state.ease = min(3.0, state.ease + 0.1)
  else:
    state.streak   = 0
    state.interval = 1
    state.ease     = max(1.3, state.ease - 0.2)
  state.dueDate = formatDateLocal(addDays(event.ts, state.interval))
```

Two devices applying the same event log in the same order converge to identical state; last-write-wins by `ts` is achieved because Firebase push IDs order events and late-arriving events simply re-trigger the derivation on the next read.

---

## 2. Firebase Layout

All paths are relative to the RTDB root.

```text
/vocabulary/{uid}
  /decks/{deckId}               → VocabularyDeck record (without deckId, which is the key)
  /items/{deckId}/{itemId}      → VocabularyItem record (without itemId)
  /events/{deckId}/{itemId}/{eventId} → AnswerEvent record
  /reviewState/{deckId}/{itemId}      → cached ReviewRecord (derivable)
  /meta/deckOrder               → ordered list of deckIds for sidebar display order
```

**Security (`database.rules.json` additions)**:

```json
"vocabulary": {
  "$uid": {
    ".read":  "auth != null && auth.uid === $uid",
    ".write": "auth != null && auth.uid === $uid",
    "events": {
      "$deckId": {
        "$itemId": {
          "$eventId": {
            ".validate":
              "newData.hasChildren(['ts','correct','direction','mode']) && !data.exists()"
          }
        }
      }
    }
  }
}
```

Event nodes are create-only (`!data.exists()` in `.validate`) to enforce the append-only invariant.

---

## 3. Relationships

```text
User (uid)
 └── VocabularyDeck (1..N)
      ├── VocabularyItem (0..N)   [unique per (deckId, trim+lowercased term)]
      │   ├── AnswerEvent (0..N)  [append-only]
      │   └── ReviewRecord (0..1) [derived; cached]
      └── deleted => cascade delete items + events + reviewState
```

---

## 4. Validation Rules (centralized)

| Rule ID | Scope | Description | Source |
|---|---|---|---|
| V1 | CSV row | Both `term` and `translation` non-empty after trim | FR-003 |
| V2 | CSV row | Row is unique within target deck by case-insensitive + trimmed `term` | FR-003, Q2 |
| V3 | CSV upload | Row count `<= 2000` | FR-016 |
| V4 | CSV upload | Delimiter is one of `,` `;` `\t` as sniffed from first non-empty line | FR-002, Q5 |
| V5 | Character set | All fields preserve Turkish characters (ç, ğ, ı, ö, ş, ü) after round-trip | FR-013, SC-006 |
| V6 | Deck | `name` non-empty, ≤64 chars, unique per user (case-insensitive) | FR-005 |
| V7 | MCQ build | 4 options, exactly one correct; all 4 distinct after case-insensitive trim | FR-006, SC-003 |
| V8 | Distractor fallback | Order: other items same deck → other user decks → built-in quiz answers; block with warning if still `<3` | FR-014, Q1 |
| V9 | AnswerEvent | Create-only; 4 required fields; timestamp is client-local epoch ms | FR-008 |
| V10 | Review view | List only items whose `dueDate <= today` in user-local timezone, sorted by most-overdue first | FR-010 |

---

## 5. State Transitions

**Deck**: `created → active → (renamed | item-added | item-removed)* → deleted`

**Item**: `imported → active → (answered-correct | answered-incorrect)* → deleted`

**Review status** (derived view over Item):

```
new         (totalSeen == 0)
 └── on first answer → scheduled
scheduled   (dueDate > today)
 └── as time passes → due
due         (dueDate <= today)
 └── on correct answer → scheduled (longer interval)
 └── on incorrect answer → due (interval reset to 1 day)
```

No manual suspension in v1; delete the item or the deck if the user wants to remove it from the schedule.
