# Tasks: Fix Why Button CORS and Deployment Issue

**Input**: Design documents from `/specs/005-fix-why-button-cors/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested — no test tasks included.

**Organization**: Tasks are grouped by user story. US1 (CORS fix) and US2 (deployment migration) are tightly coupled in this bug fix — US2 is foundational (must deploy before CORS can be verified), and US1 builds on it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Prepare the new serverless function directory structure

- [x] T001 Create api/ directory and api/package.json with @anthropic-ai/sdk dependency at repo root
- [x] T002 Add .env to .gitignore if not already present (for local ANTHROPIC_API_KEY)

---

## Phase 2: Foundational (Constitution Amendment)

**Purpose**: Update constitution to permit Vercel Serverless Functions before implementation

**⚠️ CRITICAL**: Constitution must be amended before implementing the migration

- [x] T003 Amend .specify/memory/constitution.md (v1.1.0 → v1.2.0): expand Principle III, "No server-side code", and "AI Service" constraints to permit Vercel Serverless Functions as an alternative to Firebase Cloud Functions for AI proxy purposes

**Checkpoint**: Constitution updated — implementation can proceed

---

## Phase 3: User Story 2 - Backend Deploys Without Billing Barriers (Priority: P1) 🎯 MVP

**Goal**: Create a working Vercel serverless function that replaces the Firebase Cloud Function

**Independent Test**: Deploy to Vercel and call the endpoint with curl to verify it returns an AI explanation

### Implementation for User Story 2

- [x] T004 [US2] Create Vercel serverless function in api/explain-answer.js: port logic from functions/index.js to standard Node.js HTTP handler (req, res) with input validation, Anthropic API call, and JSON response per contracts/explain-answer.md
- [x] T005 [US2] Add CORS handling to api/explain-answer.js: handle OPTIONS preflight, set Access-Control-Allow-Origin (production domain + localhost), Access-Control-Allow-Methods (POST, OPTIONS), Access-Control-Allow-Headers (Content-Type)
- [x] T006 [US2] Remove functions/ directory (functions/index.js and functions/package.json) — no longer needed
- [x] T007 [US2] Remove functions configuration from firebase.json (remove the "functions" array entry, keep "database" config)

**Checkpoint**: Backend function exists in api/ and is ready to deploy. Firebase Cloud Functions artifacts are removed.

---

## Phase 4: User Story 1 - Why Button Works From Any Origin (Priority: P1)

**Goal**: Update client code to call the new Vercel endpoint so the Why? button works without CORS errors

**Independent Test**: Open app on localhost or production, answer incorrectly, tap Why?, and verify explanation appears with no console errors

### Implementation for User Story 1

- [x] T008 [US1] Replace firebase.functions().httpsCallable("explainAnswer") call in js/quiz.js (~line 435) with fetch("/api/explain-answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(...) }) and update response handling (no .data wrapper)
- [x] T009 [US1] Remove firebase-functions-compat.js script tag from index.html (~line 118) — no longer needed
- [x] T010 [US1] Reset explainerCache on retry after error/timeout in js/quiz.js — ensure tapping Why? again after a failure triggers a new fetch instead of re-showing the error (verified: already correct — cache stays null on error/timeout, so retry naturally triggers a new fetch)

**Checkpoint**: Client calls the new endpoint. Full flow (incorrect answer → Why? → explanation appears) works end-to-end.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup and verify everything works together

- [x] T011 Verify .env file with ANTHROPIC_API_KEY works with vercel dev for local testing
- [ ] T012 Set ANTHROPIC_API_KEY environment variable in Vercel dashboard for production deployment
- [ ] T013 Manual end-to-end test: deploy to Vercel, open production URL, answer incorrectly, tap Why?, verify explanation appears, verify toggle and caching still work, verify error/timeout handling

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: No code dependencies, but must be done for governance compliance
- **User Story 2 (Phase 3)**: Depends on Setup (T001 for api/ directory)
- **User Story 1 (Phase 4)**: Depends on User Story 2 (needs the endpoint to exist to test against)
- **Polish (Phase 5)**: Depends on both user stories being complete

### Within Each Phase

- T004 and T005 are sequential (T005 adds CORS to the file T004 creates)
- T006 and T007 are parallel [P] with each other but depend on T004 being done (to confirm migration is ready)
- T008 and T009 are parallel [P] (different files)
- T010 depends on T008 (modifies the same code section)

### Parallel Opportunities

- T001 and T002 can run in parallel (different files)
- T006 and T007 can run in parallel (different files/directories)
- T008 and T009 can run in parallel (js/quiz.js vs index.html)

---

## Parallel Example: User Story 1

```text
# After US2 is complete, launch these in parallel:
Task T008: "Replace httpsCallable with fetch in js/quiz.js"
Task T009: "Remove firebase-functions-compat.js from index.html"

# Then sequentially:
Task T010: "Reset explainerCache on retry in js/quiz.js" (depends on T008)
```

---

## Implementation Strategy

### MVP First (User Story 2 → User Story 1)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Constitution amendment (T003)
3. Complete Phase 3: User Story 2 — create Vercel function (T004-T007)
4. Complete Phase 4: User Story 1 — update client code (T008-T010)
5. **STOP and VALIDATE**: Test full Why? flow locally with `vercel dev`
6. Complete Phase 5: Deploy and verify in production (T011-T013)

### Notes

- US1 and US2 are both P1 and tightly coupled — US2 (backend) must be done before US1 (client) can be tested
- This is a small bug fix with 13 total tasks — can be completed in a single session
- The favicon fix (already applied in index.html) is not tracked here as it was done before this feature branch

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Commit after each phase completion
- Stop at Phase 3 checkpoint to verify the API works with curl before changing client code
