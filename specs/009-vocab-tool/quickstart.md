# Quickstart: Vocabulary Tool

**Feature**: 009-vocab-tool
**Audience**: developer picking up this feature for implementation

A concrete walkthrough of how the feature fits together and how to run it locally. Complements `plan.md`, `data-model.md`, and the three contract files.

---

## 1. Repo layout you'll touch

```text
index.html                   — add sidebar "Vocabulary" group
css/style.css                — styles for upload dropzone, deck cards, review view
js/vocab/                    — NEW — all feature logic lives here
  csvImport.js
  deckStore.js
  mcqGenerator.js
  srsScheduler.js
  vocabSession.js
  vocabUI.js
database.rules.json          — add /vocabulary/$uid/... rules
tests/vocab/                 — NEW — in-browser test harness for pure modules
  index.html
  test-csvImport.js
  test-srsScheduler.js
  test-mcqGenerator.js
```

Nothing outside this list should change. `js/questions.js` is read-only for distractor fallback; `js/quiz.js` may export one or two helpers (DOM render for an MCQ card, icon+color feedback toggler) — if it doesn't already, that's a small refactor.

---

## 2. Run it locally

The project serves static files; no build step.

```bash
# From repo root
npx http-server -c-1     # or any static server on port 8080
# Then open
http://localhost:8080/index.html
```

Sign in with any existing Firebase auth path the app already supports; you should see the new "Vocabulary" sidebar group.

To run the vanilla-JS test harness:

```
http://localhost:8080/tests/vocab/index.html
```

The harness auto-runs all `test-*.js` modules on load and prints a green/red summary.

---

## 3. End-to-end happy path (5 minutes)

1. Sign in, expand the **Vocabulary** sidebar group, click **Upload CSV**.
2. Drop a file like `sample-greetings.csv` with 5 rows:
   ```csv
   term,translation
   merhaba,hello
   günaydın,good morning
   iyi akşamlar,good evening
   teşekkürler,thank you
   lütfen,please
   ```
3. Name the deck `Greetings`, choose **Create new deck**, click **Import**.
4. Verify summary panel shows `Accepted: 5, Skipped: 0`, deck appears under **My Decks**.
5. Click **Quiz** on the deck card — 5 questions, 4 options each, Turkish characters rendered correctly.
6. Answer all 5 (mix correct + incorrect).
7. Open **Review** — incorrect items are due today; correct items appear in the list tomorrow (simulate by advancing the system clock or by temporarily shortening intervals in `srsScheduler.js`).

---

## 4. Edge cases to hit while developing

Reference: `spec.md` → Edge Cases; `contracts/csv-format.md`; `data-model.md` §4.

- Empty file / header-only file → friendly rejection, no deck created.
- File with `;` delimiter and Turkish headers (`kelime;çeviri`) → auto-detected, imports cleanly.
- Tab-delimited export from Google Sheets → auto-detected.
- 2,001-row CSV → rejected up front with the "split the file" message.
- CSV containing a row with `merhaba,hello` after a deck with `Merhaba,Greeting` already exists → skipped as `duplicate_in_deck` (case-insensitive).
- Deck with exactly 2 items → quiz view borrows distractors from other user decks / built-in quiz answers per `contracts/ui-contract.md` MCQ rules.
- Two browser tabs reviewing the same item → both writes succeed as separate events; reloading shows converged state per the derivation rule in `data-model.md` §1.4.

---

## 5. Wiring order (suggested)

Work from the inside out so each layer can be tested in isolation:

1. `srsScheduler.js` — pure functions, no DOM, no Firebase. Cover with `tests/vocab/test-srsScheduler.js`.
2. `csvImport.js` — takes a string, returns `{ accepted: [...], skipped: [{ row, reason }] }`. Cover with fixtures.
3. `mcqGenerator.js` — takes a deck + full user decks + built-in `js/questions.js` + correct item, returns 4 options. Cover with unit tests for the fallback chain.
4. `deckStore.js` — Firebase CRUD. Mirror existing `flagged` / retry-pool store patterns.
5. `vocabSession.js` — session state machine: next-item picker, answer recorder, event appender.
6. `vocabUI.js` — DOM rendering; consumes all of the above.
7. `database.rules.json` — add rules after schema is stable.
8. `index.html` + `css/style.css` — plug the new views into the shell.

---

## 6. Definition-of-done checklist

Before opening the PR:

- [ ] All acceptance scenarios in `spec.md` pass manually on desktop and mobile viewports.
- [ ] `tests/vocab/index.html` shows all green.
- [ ] Import of a 2,000-row CSV completes within 10 s on a dev laptop (Performance Goals in `plan.md`).
- [ ] Review view renders a 1,000-item deck in ≤2 s (SC-005).
- [ ] Turkish characters round-trip through import → quiz → export with no corruption (SC-006).
- [ ] Deleting a deck removes `decks`, `items`, `events`, and `reviewState` under the same `deckId` (no orphans).
- [ ] New Firebase rules deploy without breaking existing `flagged` / retry-pool / errors rules.
- [ ] Dark mode styling inherited automatically — no new hard-coded colors.
