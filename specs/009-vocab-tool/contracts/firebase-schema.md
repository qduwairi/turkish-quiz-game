# Contract: Firebase Realtime Database Schema (Vocabulary)

**Feature**: 009-vocab-tool
**Consumers**: `js/vocab/deckStore.js`, any future read-only analytics surface
**Producer**: same client; no server-side writer

All paths are rooted at `/vocabulary/{uid}`. `uid` is the Firebase Auth UID of the signed-in user; every read/write MUST be performed while authenticated as that user.

---

## Tree

```text
/vocabulary/$uid
  /meta
    /deckOrder : [ deckId, deckId, ... ]    // ordered for sidebar rendering
  /decks
    /$deckId
      /name        : string        // required, 1..64 chars
      /description : string        // optional, 0..200 chars
      /createdAt   : number (ms)   // required, immutable
      /itemCount   : number        // derived cache; refreshed on import & delete
  /items
    /$deckId
      /$itemId
        /term        : string      // required, 1..200 chars
        /translation : string      // required, 1..200 chars
        /importedAt  : number (ms) // required
        /extras
          /$headerName : string    // optional; arbitrary additional CSV columns
  /events
    /$deckId
      /$itemId
        /$eventId                 // Firebase push ID; chronologically ordered
          /ts        : number (ms)                           // required
          /correct   : boolean                               // required
          /direction : "termToTranslation" | "translationToTerm"  // required
          /mode      : "quiz" | "review"                     // required
  /reviewState
    /$deckId
      /$itemId
        /interval   : number     // days, >= 1
        /ease       : number     // 1.3 .. 3.0
        /streak     : number     // consecutive correct
        /dueDate    : string     // "YYYY-MM-DD" in user local TZ
        /lastSeen   : number (ms)
        /totalSeen  : number
```

---

## Security Rules (`database.rules.json` additions)

```json
{
  "rules": {
    "vocabulary": {
      "$uid": {
        ".read":  "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid",
        "decks": {
          "$deckId": {
            ".validate": "newData.hasChildren(['name','createdAt'])",
            "name":        { ".validate": "newData.isString() && newData.val().length <= 64" },
            "description": { ".validate": "newData.isString() && newData.val().length <= 200" },
            "createdAt":   { ".validate": "newData.isNumber()" },
            "itemCount":   { ".validate": "newData.isNumber()" },
            "$other":      { ".validate": false }
          }
        },
        "items": {
          "$deckId": {
            "$itemId": {
              ".validate": "newData.hasChildren(['term','translation','importedAt'])",
              "term":        { ".validate": "newData.isString() && newData.val().length <= 200" },
              "translation": { ".validate": "newData.isString() && newData.val().length <= 200" },
              "importedAt":  { ".validate": "newData.isNumber()" },
              "extras":      { "$key": { ".validate": "newData.isString() && newData.val().length <= 200" } },
              "$other":      { ".validate": false }
            }
          }
        },
        "events": {
          "$deckId": {
            "$itemId": {
              "$eventId": {
                ".validate": "newData.hasChildren(['ts','correct','direction','mode']) && !data.exists()",
                "ts":        { ".validate": "newData.isNumber()" },
                "correct":   { ".validate": "newData.isBoolean()" },
                "direction": { ".validate": "newData.isString() && (newData.val() === 'termToTranslation' || newData.val() === 'translationToTerm')" },
                "mode":      { ".validate": "newData.isString() && (newData.val() === 'quiz' || newData.val() === 'review')" },
                "$other":    { ".validate": false }
              }
            }
          }
        },
        "reviewState": {
          "$deckId": {
            "$itemId": {
              ".validate": "newData.hasChildren(['interval','ease','dueDate','lastSeen','totalSeen','streak'])"
            }
          }
        }
      }
    }
  }
}
```

Existing rules elsewhere in `database.rules.json` (flagged, retry pool, error tracking) are unchanged.

---

## Read Patterns

| Surface | Query | Frequency |
|---|---|---|
| Sidebar deck list | `ref("/vocabulary/$uid/decks").once("value")` + `meta/deckOrder` | On app load + on deck CRUD |
| Deck quiz session | `ref("/vocabulary/$uid/items/$deckId").once("value")` | On quiz start |
| Review view | `ref("/vocabulary/$uid/reviewState").once("value")` — filter client-side by `dueDate <= today` | On opening Review |
| Answer-event replay (cache refresh) | `ref("/vocabulary/$uid/events/$deckId/$itemId").orderByKey().once("value")` | On conflict detection or on demand |

## Write Patterns

| Action | Operation |
|---|---|
| Import | Multi-path `update()` — writes `decks/$deckId`, `items/$deckId/*` in one atomic operation |
| Answer recorded | Two-step: `push()` to `events/$deckId/$itemId`, then `set()` on `reviewState/$deckId/$itemId` after re-deriving |
| Rename deck | `update({ "decks/$deckId/name": newName })` |
| Delete deck | Multi-path `update()` with `null` values for the deck across `decks`, `items`, `events`, `reviewState`, and update `meta/deckOrder` |

## Consistency Invariants

1. `events/$deckId/$itemId` is append-only (enforced by `!data.exists()` in rules).
2. `reviewState` is *always* derivable from `events`; if the cache is missing or appears stale, the client rebuilds it from the event stream before rendering the Review view.
3. `decks/$deckId/itemCount` is a hint; the authoritative count is `Object.keys(items/$deckId).length`. UI must never refuse to render because the cached count is off.
4. `meta/deckOrder` may contain stale deck IDs immediately after a delete; the renderer filters against `decks/*` on each render.
