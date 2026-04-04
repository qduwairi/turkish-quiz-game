<!--
Sync Impact Report
═══════════════════
Version change: N/A → 1.0.0 (initial ratification)

Added sections:
  - Principle I: Content Accuracy
  - Principle II: Progressive Difficulty
  - Principle III: Simplicity & Vanilla Stack
  - Principle IV: Responsive & Accessible UI
  - Principle V: Data Persistence
  - Section: Technology Constraints
  - Section: Development Workflow
  - Governance

Removed sections: None (initial version)

Templates requiring updates:
  - .specify/templates/plan-template.md — ✅ no updates needed (generic, references constitution dynamically)
  - .specify/templates/spec-template.md — ✅ no updates needed (generic)
  - .specify/templates/tasks-template.md — ✅ no updates needed (generic)
  - .specify/templates/commands/ — ✅ no command files exist

Follow-up TODOs: None
-->

# Turkish Quiz Game Constitution

## Core Principles

### I. Content Accuracy

All quiz content MUST faithfully represent correct Turkish grammar,
vocabulary, and usage. Questions MUST be sourced from or validated
against established Turkish language curricula (A1, A2, B1, B2, C1
levels per CEFR). Incorrect answers among options MUST be plausible
distractors—not nonsensical—so learners develop genuine discrimination
skills. Every question MUST include exactly one unambiguously correct
answer.

### II. Progressive Difficulty

Content MUST be organized by CEFR proficiency level (A1 → C1) and
subdivided into units and sections within each level. Users MUST be
able to select any unit freely—there is no enforced gate—but the
sidebar ordering MUST reflect increasing difficulty. New content
additions MUST specify their target CEFR level and unit placement.

### III. Simplicity & Vanilla Stack

The application MUST use plain HTML, CSS, and vanilla JavaScript with
no build tools, bundlers, transpilers, or frontend frameworks. Adding
a dependency (library, CDN script, or npm package) MUST be justified
by a concrete need that cannot be met with a reasonable amount of
vanilla code. Firebase is the sole permitted external service
dependency. This principle exists to keep the project approachable
and instantly runnable by opening `index.html` or serving statically.

### IV. Responsive & Accessible UI

The interface MUST function correctly on mobile, tablet, and desktop
viewports. Interactive elements (buttons, options) MUST have adequate
touch targets (minimum 44×44 CSS pixels). Color MUST NOT be the only
means of conveying quiz feedback (correct/incorrect)—text or icon
indicators MUST accompany color changes. The sidebar MUST be
collapsible on small screens.

### V. Data Persistence

User-specific state (flagged cards) MUST be persisted via Firebase
Realtime Database so it survives across sessions and devices. Quiz
content (questions, options, correct indices) MUST live in
`js/questions.js` as a static data structure—not fetched at runtime
from a remote source—so the app works offline once loaded.
Schema changes to the Firebase data model MUST be reflected in
`database.rules.json`.

## Technology Constraints

- **Runtime**: Modern evergreen browsers (Chrome, Firefox, Safari,
  Edge — latest two major versions). No IE11 support required.
- **Hosting**: Firebase Hosting (static files only).
- **Database**: Firebase Realtime Database for user state.
- **Fonts**: Google Fonts loaded via CDN (Playfair Display,
  Source Sans 3).
- **No server-side code**: The project MUST remain a purely
  client-side application.

## Development Workflow

- **Branching**: Feature branches off `main`; merge via pull request.
- **Content additions**: New units/sections MUST be added to the
  `units` array in `js/questions.js` following the existing object
  schema (`id`, `name`, `sections[]` with `name` and `questions[]`).
- **Style changes**: All styles MUST reside in `css/style.css`.
  Inline styles are prohibited except for dynamically computed values
  set via JavaScript.
- **Testing**: Manual browser testing across at least one mobile
  and one desktop viewport before merging. Automated tests are
  encouraged but not required given the project's scope.

## Governance

This constitution is the authoritative source of project principles.
All contributions MUST comply with the principles above. When a
proposed change conflicts with a principle, the principle MUST be
amended first (with version bump) before the change is merged.

**Amendment procedure**:
1. Propose the amendment in a pull request modifying this file.
2. Document the rationale for the change.
3. Update the version per semantic versioning:
   - **MAJOR**: Removing or redefining a principle.
   - **MINOR**: Adding a new principle or materially expanding guidance.
   - **PATCH**: Clarifications, wording, or non-semantic refinements.
4. Update the Sync Impact Report comment at the top of this file.

**Compliance review**: Any pull request that touches project
architecture, adds dependencies, or modifies quiz content structure
MUST reference the relevant constitution principle in its description.

**Version**: 1.0.0 | **Ratified**: 2026-04-04 | **Last Amended**: 2026-04-04
