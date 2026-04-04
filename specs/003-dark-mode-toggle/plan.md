# Implementation Plan: Dark Mode with Visible Toggle

**Branch**: `003-dark-mode-toggle` | **Date**: 2026-04-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-dark-mode-toggle/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add a dark color theme as the default appearance for the Turkish Quiz app, implemented via CSS custom property overrides on a `data-theme` attribute. A visible toggle button in the sidebar header allows instant switching between dark and light modes, with the user's preference persisted in `localStorage`.

## Technical Context

**Language/Version**: HTML5, CSS3, vanilla JavaScript (ES6+)
**Primary Dependencies**: None (no new dependencies — uses existing CSS custom properties)
**Storage**: localStorage for theme preference (client-side only)
**Testing**: Manual browser testing (desktop + mobile viewport)
**Target Platform**: Modern evergreen browsers (Chrome, Firefox, Safari, Edge — latest two major versions)
**Project Type**: Static client-side web application (served via Firebase Hosting)
**Performance Goals**: Theme switch < 100ms, no flash of wrong theme on load
**Constraints**: No build tools, no frameworks, no new dependencies (per constitution Principle III)
**Scale/Scope**: Single-page app, 3 screens (start, quiz, results), 1 sidebar

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Content Accuracy | N/A | No quiz content changes |
| II. Progressive Difficulty | N/A | No content organization changes |
| III. Simplicity & Vanilla Stack | PASS | No new dependencies; uses vanilla CSS variables and JS; no build tools |
| IV. Responsive & Accessible UI | PASS | Toggle meets 44x44px touch target; dark palette designed for WCAG AA contrast; color not sole feedback indicator (existing check/cross icons preserved) |
| V. Data Persistence | PASS | Theme stored in localStorage (appropriate for UI preference); no Firebase changes needed; flagged cards unchanged |

**Gate result**: ALL PASS — no violations, no complexity justification needed.

**Post-Phase 1 re-check**: Same result. Design uses only existing CSS variable mechanism with a `data-theme` attribute. No new dependencies, no server-side code, no Firebase schema changes.

## Project Structure

### Documentation (this feature)

```text
specs/003-dark-mode-toggle/
├── plan.md              # This file
├── research.md          # Phase 0 output — research decisions
├── data-model.md        # Phase 1 output — data model
├── quickstart.md        # Phase 1 output — implementation guide
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
index.html               # Add inline theme script in <head>; add toggle button in sidebar header
css/
└── style.css            # Add [data-theme="dark"] variable overrides; toggle button styles
js/
└── quiz.js              # Add toggleTheme() function
```

**Structure Decision**: No new files or directories needed. All changes are modifications to the 3 existing files (`index.html`, `css/style.css`, `js/quiz.js`), consistent with the project's flat single-page architecture.

## Complexity Tracking

> No constitution violations — this section is intentionally empty.
