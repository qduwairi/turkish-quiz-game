# Contract: Vocabulary UI Surfaces

**Feature**: 009-vocab-tool
**Consumers**: end-users; Constitution IV (Responsive & Accessible UI)
**Producer**: `js/vocab/vocabUI.js` + `css/style.css`

Describes the user-visible surfaces the feature introduces and the behavior each must satisfy.

---

## Surfaces

### S1 — Sidebar entry group "Vocabulary"

- Appears as a new collapsible group in the existing sidebar, below the curriculum deck list.
- Contains three fixed entries followed by a dynamic sub-list of user decks:
  - `Upload CSV` → opens S2
  - `My Decks` → opens S3
  - `Review` → opens S5, shows a badge with the count of items due today
  - For each user deck: an entry opening S4 scoped to that deck
- Collapsible on viewports ≤ 768 px wide (Constitution IV).
- All entries are 44×44 px minimum touch targets.

### S2 — Upload view

- File dropzone + "Choose file" button.
- Accepts `.csv`, `.tsv`, `.txt`; one file at a time.
- Deck naming input: defaults to the filename stem; user can edit before confirming.
- Radio choice: "Create new deck" (default) / "Append to existing deck" (shown only if the user already has ≥1 deck; selecting it reveals a deck dropdown).
- Progress indicator appears when row count > 200 (FR-016).
- Post-import summary panel:
  - Accepted count, skipped count, skipped-reason breakdown (with up to 5 example row numbers per reason).
  - Buttons: "Start a quiz", "Go to review", "Import another file".

### S3 — My Decks view

- Card grid of the user's decks, each showing: name, item count, created date, last-reviewed date.
- Per-card actions: `Quiz` (→ S4), `Review` (→ S5 scoped to deck), `Rename`, `Export CSV` (FR-015), `Delete`.
- Delete requires a confirmation modal (text + "type the deck name to confirm").
- Rename is inline; Enter confirms, Esc cancels.

### S4 — Quiz view (per deck)

- Reuses the existing curriculum-quiz layout; changes are:
  - Prompt can be shown in either direction — a toggle in the quiz header (FR-007) selects `term → translation` or `translation → term`. Choice persists for the session.
  - Options are built per §MCQ rules below.
- Feedback: icon + color + text (Constitution IV; color is never the sole signal).
- Session ends when all items have been answered once; end-of-session card shows score and a "Queue wrong answers into Review" button.

### S5 — Review view

- Header with counts: `<N> due today`, `<N> overdue`.
- Ordered list of due items, most-overdue first (FR-010).
- Each item behaves like a single quiz card; answering one advances to the next.
- When no items are due, shows a friendly empty state and a link back to S3.
- Optional global mode (reviewing across all decks) or per-deck mode when entered from S3.

---

## MCQ Build Rules (used by S4 and S5)

1. Present the correct answer plus 3 distractors.
2. Distractor sourcing — in order, until 3 unique distinct-from-answer options are collected:
   - Other items in the same deck, preferring recently-seen items.
   - Items from the user's other vocabulary decks.
   - Strings drawn from the `correct`-answer field of built-in `js/questions.js` entries, filtered to remove sentence-like strings (contains `.` / `?` / `!`).
3. All four options must be pairwise distinct after case-insensitive trim.
4. If fewer than 3 distractors can be gathered, block the quiz and show: *"This deck needs more items — add a few more words before quizzing."*
5. Option order is randomised per question; index of correct answer is never fixed.

---

## Accessibility & Responsiveness (Constitution IV)

- All interactive elements: 44×44 px minimum.
- Focus ring visible on all buttons and option tiles.
- Feedback always includes a text label (e.g., "Correct", "Try again") — never color alone.
- Layout breakpoints identical to the existing app; mobile stacks card grid to one column.
- Dark mode tokens (from feature 003) apply automatically — no hard-coded colors.

---

## Error & Empty States

| State | Surface | Behavior |
|---|---|---|
| User not signed in | Any vocab surface | Disable with "Sign in to use Vocabulary" prompt; reuse existing sign-in flow. |
| Firebase offline | S2 upload | Allow parse + preview, hold write until reconnect; show "Offline — your deck will upload when you're back online." |
| Firebase offline | S4 quiz / S5 review | Read from last cached snapshot; events queued and flushed on reconnect. |
| Empty deck | S4 | Show "This deck is empty — add some words via Upload CSV." |
| Insufficient distractors | S4 | Block with the message defined in the MCQ Build Rules. |
| Corrupt CSV | S2 | Show parse-error summary; no partial deck is created. |
| Zero items due | S5 | Show illustrated empty state + link to S3. |

---

## Telemetry Hooks

Minimum (reuses the client-side error-tracking subtree from feature 008):

- On CSV parse error: log to `/errors/...` with `source="vocab.csvImport"`.
- On Firebase write failure during import or answer recording: log the same way.

No new telemetry product is introduced.
