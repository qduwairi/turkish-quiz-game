# Tasks: Dark Mode with Visible Toggle

**Input**: Design documents from `/specs/003-dark-mode-toggle/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: Not requested — test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: No new project structure needed — this feature modifies 3 existing files only.

- [x] T001 Add inline theme-detection script in `<head>` of `index.html` that reads `localStorage("theme")`, defaults to `"dark"`, and sets `data-theme` attribute on `<html>` before first paint

---

## Phase 2: Foundational (Dark Theme CSS Variables)

**Purpose**: Define the dark color palette as CSS variable overrides — MUST be complete before any visual work.

**⚠️ CRITICAL**: No user story work can begin until the dark palette is defined.

- [x] T002 Add `[data-theme="dark"]` selector block in `css/style.css` that overrides all color variables (`--cream`, `--black`, `--muted`, `--accent`, `--accent-light`, `--green`, `--green-light`, `--red`, `--red-light`, `--border`) with dark palette values from research.md
- [x] T003 [P] Add `[data-theme="light"]` selector block in `css/style.css` that explicitly sets the current light palette values (same as existing `:root` defaults) for clarity and completeness
- [x] T004 Update any hardcoded color values in `css/style.css` that don't use CSS variables (e.g., `rgba(0, 0, 0, 0.3)` in `.sidebar-overlay`, `rgba(0, 0, 0, 0.025)` in `.sidebar-unit-header:hover`, `rgba(0, 0, 0, 0.02)` in `.sidebar-unit-header.expanded`, `rgba(0, 0, 0, 0.015)` in `.sidebar-unit-decks`) to use theme-aware values or ensure they work acceptably in both themes

**Checkpoint**: Both dark and light palettes defined. App should render in dark mode by default on fresh load.

---

## Phase 3: User Story 1 — Dark Mode as Default Experience (Priority: P1) 🎯 MVP

**Goal**: App loads in dark mode by default for first-time visitors. All screens (sidebar, quiz, results) are fully readable and visually consistent in dark mode.

**Independent Test**: Open app in fresh browser (clear localStorage) — all screens should render in dark mode with readable text, proper contrast, and no visual artifacts.

### Implementation for User Story 1

- [x] T005 [US1] Verify sidebar renders correctly in dark mode: sidebar background, header, borders, unit names, deck names, flagged section, chevrons, and hover/active states in `css/style.css`
- [x] T006 [US1] Verify start screen renders correctly in dark mode: title, subtitle, ornaments, meta text in `css/style.css`
- [x] T007 [US1] Verify quiz screen renders correctly in dark mode: header, progress bar, question text, watermark, options, option hover states, answer feedback (correct green, wrong red, reveal-correct), next button in `css/style.css`
- [x] T008 [US1] Verify results screen renders correctly in dark mode: title, score number, bar, message, restart button and its hover state in `css/style.css`
- [x] T009 [US1] Verify mobile-specific elements render correctly in dark mode: sidebar toggle button, sidebar overlay in `css/style.css`
- [x] T010 [US1] Adjust any elements where the dark palette reveals contrast issues — ensure all text meets WCAG AA (4.5:1 ratio for normal text) in both themes in `css/style.css`

**Checkpoint**: App loads in dark mode. All screens look correct. No flash of light theme.

---

## Phase 4: User Story 2 — Toggle Between Dark and Light Mode (Priority: P1)

**Goal**: A visible toggle button in the sidebar header lets users instantly switch between dark and light mode from any screen.

**Independent Test**: Click the toggle button — entire app switches themes instantly. Toggle from quiz screen mid-quiz — quiz state preserved. Toggle visible on mobile when sidebar is open.

### Implementation for User Story 2

- [x] T011 [US2] Add theme toggle button markup in the sidebar header of `index.html`, positioned after the subtitle, styled consistently with the existing sound toggle (44x44px touch target, border, emoji icon)
- [x] T012 [US2] Add `.theme-toggle` button styles in `css/style.css` matching the `.sound-toggle` pattern (size, border, hover states, transitions) and placed in the sidebar header
- [x] T013 [US2] Implement `toggleTheme()` function in `js/quiz.js` that reads current `data-theme` from `<html>`, flips it (`dark` ↔ `light`), updates the `data-theme` attribute, updates `localStorage("theme")`, and swaps the toggle button icon (🌙 ↔ ☀️)
- [x] T014 [US2] Add theme initialization logic in `js/quiz.js` that on DOMContentLoaded sets the correct toggle icon based on the current `data-theme` attribute (already set by the inline `<head>` script from T001)

**Checkpoint**: Toggle button visible in sidebar header. Clicking it switches themes instantly without page reload. Quiz state unaffected by toggling.

---

## Phase 5: User Story 3 — Preference Persistence Across Sessions (Priority: P2)

**Goal**: User's theme choice persists across browser sessions via localStorage.

**Independent Test**: Switch to light mode, close tab, reopen app — loads in light mode. Clear localStorage, reopen — loads in dark mode (default).

### Implementation for User Story 3

- [x] T015 [US3] Verify persistence round-trip in `js/quiz.js` and inline `<head>` script in `index.html`: confirm `toggleTheme()` writes to `localStorage("theme")` and the `<head>` script reads it on load — ensure the two are using the same key and value format (`"dark"` / `"light"`)

**Checkpoint**: Preference persists across sessions. Cleared storage defaults to dark.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final quality pass across all themes and screens.

- [x] T016 [P] Verify no flash of wrong theme on slow connections — test by throttling network in DevTools and confirming the inline `<head>` script prevents FOUWT in `index.html`
- [x] T017 [P] Test rapid toggle clicking — confirm no visual glitches or lag in theme switching
- [x] T018 [P] Test on mobile viewport (≤900px): open sidebar, verify toggle is accessible, switch theme, close sidebar — all states correct
- [x] T019 Run full manual test per `specs/003-dark-mode-toggle/quickstart.md` validation steps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T001 (inline script must exist for theme attribute to work)
- **User Story 1 (Phase 3)**: Depends on Phase 2 (dark palette must be defined)
- **User Story 2 (Phase 4)**: Depends on Phase 2 (both palettes must exist to toggle between them)
- **User Story 3 (Phase 5)**: Depends on Phase 4 (toggleTheme must write to localStorage)
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **User Story 2 (P1)**: Can start after Phase 2 — independent of US1 (but US1 validates visual correctness)
- **User Story 3 (P2)**: Depends on US2 (toggle must exist to test persistence)

### Within Each User Story

- CSS verification tasks (T005–T010) within US1 can run in parallel (different screen areas)
- US2 tasks are sequential: markup (T011) → styles (T012) → JS logic (T013) → initialization (T014)

### Parallel Opportunities

- T002 and T003 can run in parallel (different CSS selector blocks)
- T005–T009 can all run in parallel (different screen areas, same file but different sections)
- T011 and T012 can run in parallel (different files: HTML vs CSS)
- T016, T017, T018 can all run in parallel (independent test scenarios)

---

## Parallel Example: User Story 1

```bash
# All screen verification tasks can run in parallel (different CSS sections):
Task: "T005 - Verify sidebar dark mode rendering in css/style.css"
Task: "T006 - Verify start screen dark mode rendering in css/style.css"
Task: "T007 - Verify quiz screen dark mode rendering in css/style.css"
Task: "T008 - Verify results screen dark mode rendering in css/style.css"
Task: "T009 - Verify mobile elements dark mode rendering in css/style.css"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (inline script) — T001
2. Complete Phase 2: Foundational (CSS palettes) — T002, T003, T004
3. Complete Phase 3: User Story 1 (dark mode renders correctly) — T005–T010
4. Complete Phase 4: User Story 2 (toggle works) — T011–T014
5. **STOP and VALIDATE**: Test dark mode + toggle independently
6. Deploy/demo if ready — this is a complete, usable MVP

### Incremental Delivery

1. Setup + Foundational → Dark palette defined, app loads dark
2. Add User Story 1 → Verify all screens → Dark mode MVP
3. Add User Story 2 → Toggle works → Full interactivity
4. Add User Story 3 → Persistence verified → Complete feature
5. Polish → Cross-browser/device testing → Ship

---

## Notes

- [P] tasks = different files or independent code sections, no dependencies
- [Story] label maps task to specific user story for traceability
- No new files created — all changes to existing `index.html`, `css/style.css`, `js/quiz.js`
- Commit after each phase for clean git history
- The hardcoded rgba values in T004 are the main risk area — they use `rgba(0,0,0,...)` which may not look right on dark backgrounds
