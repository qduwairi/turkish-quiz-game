# Implementation Plan: Card "Why?" Explainer

**Branch**: `004-card-why-explainer` | **Date**: 2026-04-05 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-card-why-explainer/spec.md`

## Summary

Add an AI-powered "Why?" explainer to quiz cards that appears after incorrect answers. When tapped, it calls a Firebase Cloud Function that proxies to Claude Haiku to generate a concise (1-2 sentence) English explanation of why the correct answer is correct. The AI also validates whether the marked answer is actually correct, flagging potential errors. The explanation section is collapsible and resets on question advance.

## Technical Context

**Language/Version**: HTML5, CSS3, vanilla JavaScript (ES6+) — no build tools
**Primary Dependencies**: Firebase 9.23.0 (compat SDK), Firebase Cloud Functions v2, Anthropic Claude API (Haiku)
**Storage**: Firebase Realtime Database (existing, unchanged) — explanations are ephemeral (not persisted)
**Testing**: Manual browser testing (mobile + desktop)
**Target Platform**: Modern evergreen browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Static web application + single Cloud Function
**Performance Goals**: Explanation visible within 10 seconds of tapping "Why?"
**Constraints**: No build tools, no frameworks, API key must remain server-side
**Scale/Scope**: Single-user learning app, ~450+ questions across multiple decks

## Constitution Check

*GATE: Passed after constitution amendment v1.1.0*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Content Accuracy | ✅ Pass | AI validates answer correctness — supports this principle |
| II. Progressive Difficulty | ✅ Pass | No impact — feature is orthogonal to content organization |
| III. Simplicity & Vanilla Stack | ✅ Pass (amended) | Firebase Cloud Functions permitted as proxy exception per v1.1.0 |
| IV. Responsive & Accessible UI | ✅ Pass | Explanation section will be responsive, touch-friendly |
| V. Data Persistence | ✅ Pass | No changes to question data or Firebase DB schema |
| No server-side code | ✅ Pass (amended) | Firebase Cloud Functions exception per v1.1.0 |

**Post-Phase 1 re-check**: All gates still pass. The design adds one Cloud Function, one SDK script tag, and client-side UI changes — minimal footprint consistent with constitution.

## Project Structure

### Documentation (this feature)

```text
specs/004-card-why-explainer/
├── spec.md
├── plan.md              # This file
├── research.md          # AI service selection, prompt design, cost analysis
├── data-model.md        # Request/response schemas, state transitions
├── quickstart.md        # Setup and development guide
├── contracts/
│   └── explain-answer.md  # Cloud Function contract
├── checklists/
│   ├── requirements.md
│   └── full-review.md
└── tasks.md             # (created by /speckit.tasks)
```

### Source Code (repository root)

```text
turkish-quiz-game/
├── index.html           # MODIFY: Add Functions SDK, "Why?" button markup
├── js/
│   ├── questions.js     # UNCHANGED
│   └── quiz.js          # MODIFY: "Why?" button logic, AI call, state management
├── css/
│   └── style.css        # MODIFY: Styles for explainer UI (button, section, loading, warning)
├── functions/            # NEW: Firebase Cloud Functions
│   ├── index.js         # explainAnswer callable function
│   └── package.json     # @anthropic-ai/sdk dependency
├── firebase.json        # MODIFY: Add functions configuration
└── sounds/              # UNCHANGED
```

**Structure Decision**: Minimal addition — one new `functions/` directory for the Cloud Function, modifications to the three existing files (index.html, quiz.js, style.css), and firebase.json config update.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Firebase Cloud Function (server-side code) | AI API key must not be in client code | Direct client-side API call rejected by user for security |
| External AI dependency (Anthropic) | Generating Turkish language explanations with answer validation cannot be done with vanilla code | Pre-authored static explanations rejected by user — wants AI generation |
