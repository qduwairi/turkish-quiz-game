# Data Model: Organize Deck Structure

**Branch**: `002-organize-deck-structure` | **Date**: 2026-04-04

## Entities

### Level (implicit — derived from unit ID prefix)

Not stored as a separate entity. Derived at runtime by extracting the prefix from `unit.id` (e.g., `"a1-unit2"` → `"A1"`).

| Attribute | Type | Description |
|-----------|------|-------------|
| id | string | CEFR level code, uppercase (e.g., "A1", "B1") |

### Unit (existing — enhanced)

```js
{
  id: "a1-unit7",                    // string — unique identifier (existing)
  name: "A1 — Unit 7",              // string — display name (existing)
  decks: [                           // array<Deck> — NEW: ordered list of deck definitions
    { name: "...", sections: [0, 1, 2] }
  ],
  sections: [                        // array<Section> — unchanged existing structure
    { name: "...", questions: [...] }
  ]
}
```

| Attribute | Type | Description | Status |
|-----------|------|-------------|--------|
| id | string | Unique unit identifier (e.g., "a1-unit7") | Existing |
| name | string | Display name shown in sidebar unit header | Existing |
| decks | array\<Deck\> | Ordered list of deck groupings | **NEW** |
| sections | array\<Section\> | Ordered list of topic sections with questions | Existing, unchanged |

### Deck (new)

A lightweight grouping that references sections by index. Does not duplicate question data.

```js
{
  name: "Future Tense & Olmak",    // string — descriptive label from section names
  sections: [0, 1, 2, 3, 4]       // array<number> — indices into parent unit's sections array
}
```

| Attribute | Type | Description | Validation |
|-----------|------|-------------|------------|
| name | string | Topic-based descriptive label | Required, non-empty |
| sections | array\<number\> | Indices into parent unit's `sections` array | Non-empty, valid indices, no duplicates, union of all decks must cover all sections |

### Section (existing — unchanged)

```js
{
  name: "Future Tense Fill in the Blank",
  questions: [
    { question: "...", options: ["...", "...", "...", "..."], correct: 0 }
  ]
}
```

### Question (existing — unchanged)

```js
{
  question: "...",       // string — question text with blanks
  options: ["a", "b", "c", "d"],  // array<string> — exactly 4 options
  correct: 0             // number — index of correct option (0-3)
}
```

## Relationships

```
Level (derived)
  └── has many → Unit
        ├── has many → Deck (NEW, ordered)
        │     └── references many → Section (via index)
        └── has many → Section (existing)
              └── has many → Question (existing)
```

- Each Unit belongs to exactly one Level (derived from `id` prefix)
- Each Unit contains 1+ Decks (NEW)
- Each Deck references 1+ Sections via index into the parent unit's `sections` array
- Every Section in a unit must be referenced by exactly one Deck (complete coverage, no overlap)
- Each Section contains 1+ Questions
- Question structure is unchanged

## Constraints

1. **Complete coverage**: The union of all `deck.sections` indices for a unit MUST equal `[0, 1, 2, ..., unit.sections.length - 1]`
2. **No overlap**: A section index MUST NOT appear in more than one deck within the same unit
3. **Deck size**: Each deck SHOULD have 40-60 questions; MUST have 20-70 questions
4. **Section integrity**: Sections are never split — a section's questions always belong to a single deck
5. **Ordering**: Deck section indices SHOULD be contiguous and ascending (sections are grouped sequentially, not cherry-picked)

## Firebase Data (unchanged)

The flagged cards stored in Firebase are not affected by this change. Flagged cards store question text and options directly — they have no reference to units, decks, or section indices.

```json
{
  "flagged": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correct": 0,
      "category": "section name"
    }
  ]
}
```
