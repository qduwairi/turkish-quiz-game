# Quickstart: Organize Deck Structure

**Branch**: `002-organize-deck-structure` | **Date**: 2026-04-04

## Prerequisites

- Modern browser (Chrome, Firefox, Safari, or Edge)
- Text editor
- The project served via any static file server, or opened directly as `index.html`

## Files to Modify

| File | What Changes |
|------|-------------|
| `js/questions.js` | Add `decks` array to each unit object |
| `js/quiz.js` | Rewrite `init()` sidebar rendering, update `startQuiz()` to work with decks, add collapse/expand logic |
| `css/style.css` | Add styles for unit headers (collapsible), deck buttons (nested), chevron indicators |

## Implementation Order

1. **`js/questions.js`** — Add deck definitions first. This is the data layer; everything else depends on it.
2. **`css/style.css`** — Add new CSS classes for the 3-level sidebar hierarchy.
3. **`js/quiz.js`** — Update sidebar rendering and quiz logic to use decks.

## Key Implementation Notes

### Adding Decks to questions.js

Add a `decks` property to each unit. Example:

```js
{
  id: "a1-unit2",
  name: "A1 — Unit 2",
  decks: [
    { name: "Present Continuous & Time", sections: [0, 1, 2, 3] },
    { name: "Materials & Daily Routine", sections: [4, 5, 6, 7, 8, 9] }
  ],
  sections: [ /* existing sections unchanged */ ]
}
```

For units with ≤60 questions, a single deck covering all sections:
```js
decks: [{ name: "Greetings & Copula", sections: [0, 1, 2, 3, 4, 5] }]
```

### Sidebar Rendering (quiz.js init())

Replace the flat button list with:

```
[Level Header: A1]
  [Unit Header: Unit 1 (Part 1)]  ▸  ← clickable, toggles deck visibility
    [Deck: Greetings & Copula · 56 questions]  ← hidden until unit expanded
  [Unit Header: Unit 2]  ▸
    [Deck: Present Continuous & Time · 57 questions]
    [Deck: Materials & Daily Routine · 43 questions]
```

### Quiz Start (quiz.js startQuiz())

Change from loading all unit sections to loading only the deck's referenced sections:

```js
// Before:
quizData = shuffle(unit.sections.flatMap(s => s.questions.map(q => ({...q, category: s.name}))));

// After:
const deck = unit.decks[deckIndex];
quizData = shuffle(deck.sections.flatMap(i => 
  unit.sections[i].questions.map(q => ({...q, category: unit.sections[i].name}))
));
```

## Testing Checklist

- [ ] All 2,263 questions accessible (sum deck question counts)
- [ ] Each deck has 20-70 questions
- [ ] 80%+ of decks have 40-60 questions
- [ ] Sidebar shows Level > Unit > Deck hierarchy
- [ ] Units start collapsed, expand on click
- [ ] Clicking a deck starts a quiz with only that deck's questions
- [ ] Score shows correct denominator (deck question count, not unit total)
- [ ] Flagged cards quiz still works
- [ ] Sounds play correctly (correct/wrong/complete)
- [ ] Mobile: sidebar toggle, overlay, auto-close on deck selection
- [ ] No "play all" option at unit level
