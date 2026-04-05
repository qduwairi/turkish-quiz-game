# Implementation Plan: Fix Why Button CORS and Deployment Issue

**Branch**: `005-fix-why-button-cors` | **Date**: 2026-04-05 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-fix-why-button-cors/spec.md`

## Summary

Migrate the AI explanation backend from Firebase Cloud Functions (which requires a paid Blaze plan) to Vercel Serverless Functions (free on the Hobby plan). This resolves both the deployment blocker and the CORS error by creating a standard HTTP endpoint at `/api/explain-answer` with explicit CORS headers, and updating the client to use `fetch()` instead of the Firebase Functions SDK.

## Technical Context

**Language/Version**: HTML5, CSS3, vanilla JavaScript (ES6+), Node.js 20 (serverless function)
**Primary Dependencies**: @anthropic-ai/sdk (serverless function only)
**Storage**: Firebase Realtime Database (existing, unchanged)
**Testing**: Manual browser testing (mobile + desktop), curl for API
**Target Platform**: Modern evergreen browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Static web application + single Vercel serverless function
**Performance Goals**: Explanation visible within 10 seconds of tapping "Why?"
**Constraints**: No build tools, no frameworks, API key must remain server-side
**Scale/Scope**: Single-user learning app, ~450+ questions across multiple decks

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
| --------- | ------ | ----- |
| I. Content Accuracy | ✅ Pass | No impact on quiz content |
| II. Progressive Difficulty | ✅ Pass | No impact on content organization |
| III. Simplicity & Vanilla Stack | ⚠️ Amendment needed | Constitution permits Firebase Cloud Functions; Vercel serverless needs to be added as permitted alternative |
| IV. Responsive & Accessible UI | ✅ Pass | No UI changes |
| V. Data Persistence | ✅ Pass | No changes to database schema |
| No server-side code | ⚠️ Amendment needed | Same as Principle III — must expand exception to include Vercel |
| AI Service | ✅ Pass | Same AI API (Anthropic Claude), just different proxy host |

**Constitution Amendment Required**: Principle III and the "No server-side code" / "AI Service" technology constraints must be updated (v1.1.0 → v1.2.0) to permit Vercel Serverless Functions as an alternative to Firebase Cloud Functions for AI proxy purposes. The spirit is identical — secret API key proxying — only the host platform changes.

**Post-Phase 1 re-check**: All gates pass with the planned amendment. The design replaces one serverless function with an equivalent one on a different platform. No new dependencies are added to the client side (Firebase Functions SDK is removed, `fetch` is built-in). The `@anthropic-ai/sdk` dependency moves from `functions/package.json` to `api/package.json`.

## Project Structure

### Documentation (this feature)

```text
specs/005-fix-why-button-cors/
├── spec.md
├── plan.md              # This file
├── research.md          # Platform selection, CORS approach, migration strategy
├── data-model.md        # Request/response schemas (transient, no persistence)
├── quickstart.md        # Local dev and deployment guide
├── contracts/
│   └── explain-answer.md  # API endpoint contract
├── checklists/
│   └── requirements.md
└── tasks.md             # (created by /speckit.tasks)
```

### Source Code (repository root)

```text
turkish-quiz-game/
├── index.html           # MODIFY: Remove firebase-functions-compat.js script tag
├── js/
│   ├── questions.js     # UNCHANGED
│   └── quiz.js          # MODIFY: Replace httpsCallable with fetch to /api/explain-answer
├── css/
│   └── style.css        # UNCHANGED
├── api/                 # NEW: Vercel serverless function
│   ├── explain-answer.js  # Replaces functions/index.js
│   └── package.json     # @anthropic-ai/sdk dependency
├── functions/           # REMOVE: No longer needed (Firebase Cloud Functions)
│   ├── index.js
│   └── package.json
├── firebase.json        # MODIFY: Remove functions configuration
├── .env                 # NEW (gitignored): Local dev ANTHROPIC_API_KEY
└── sounds/              # UNCHANGED
```

**Structure Decision**: Vercel convention — serverless functions in `api/` directory at repo root. Each `.js` file becomes an endpoint (e.g., `api/explain-answer.js` → `POST /api/explain-answer`). The old `functions/` directory is removed.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| Vercel Serverless Function (server-side code) | AI API key must not be in client code | Direct client-side API call rejected for security |
| External AI dependency (Anthropic) | Generating Turkish language explanations cannot be done with vanilla code | Pre-authored static explanations rejected by user |
| Constitution amendment (v1.2.0) | Firebase Cloud Functions not deployable on free plan | Staying on Firebase requires paid Blaze plan |
