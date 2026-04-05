# Feature Specification: Fix Why Button CORS and Deployment Issue

**Feature Branch**: `005-fix-why-button-cors`  
**Created**: 2026-04-05  
**Status**: Draft  
**Input**: User description: "fix the issue with why button"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Why Button Works From Any Origin (Priority: P1)

A learner answers a quiz question incorrectly and taps the "Why?" button. Currently, the request to the AI explanation service fails with a CORS error because the backend function does not allow cross-origin requests. After this fix, the "Why?" button successfully calls the backend and displays the AI-generated explanation regardless of which domain or localhost port the app is served from.

**Why this priority**: The "Why?" feature is completely non-functional due to this bug. No user can receive an explanation until the CORS issue is resolved. This is the entire purpose of the fix.

**Independent Test**: Answer a question incorrectly on the deployed site (production URL) or localhost, tap "Why?", and verify an explanation appears without any console errors.

**Acceptance Scenarios**:

1. **Given** a user has answered incorrectly and taps "Why?", **When** the request is sent to the backend, **Then** the response is received successfully with no CORS errors in the browser console.
2. **Given** a user accesses the app from any allowed origin (production domain, localhost), **When** they tap "Why?", **Then** the backend accepts the request and returns an explanation.
3. **Given** the backend is deployed and running, **When** a preflight OPTIONS request is sent, **Then** the response includes appropriate access-control headers.

---

### User Story 2 - Backend Deploys Without Billing Barriers (Priority: P1)

The current backend cannot be deployed because the hosting platform requires a paid plan for serverless functions. The backend must be migrated to a hosting platform that supports serverless functions on a free tier so the feature can actually be deployed and used.

**Why this priority**: Without a deployable backend, the "Why?" feature cannot function at all. This is equally critical as the CORS fix — both must be resolved together.

**Independent Test**: Deploy the backend function and verify it is accessible at its endpoint by sending a test request and receiving a valid response.

**Acceptance Scenarios**:

1. **Given** the backend code is ready, **When** the developer deploys it, **Then** deployment succeeds without requiring a paid plan.
2. **Given** the backend is deployed, **When** the function endpoint is called with valid parameters, **Then** it returns an AI-generated explanation.
3. **Given** the backend is deployed on the free tier, **When** usage stays within normal single-user learning patterns, **Then** no charges are incurred.

---

### Edge Cases

- What happens if the backend's AI API key is missing or invalid? The backend should return a clear error message, and the client should display "Failed to generate explanation. Please try again."
- What happens if the backend receives a malformed request (missing fields, wrong types)? The backend should validate input and return an appropriate error.
- What happens if the user taps "Why?" while the backend is experiencing cold start delays? The existing 10-second client-side timeout handles this — the user sees a "Timed out" message with a retry option.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The backend function MUST accept cross-origin requests from the production domain and localhost development servers.
- **FR-002**: The backend MUST be deployable on a free-tier hosting platform without requiring a paid plan upgrade.
- **FR-003**: The backend MUST maintain the same request/response contract as the current backend function (accepts question, options, correct index; returns explanation text and warning flag).
- **FR-004**: The client-side code MUST be updated to call the new backend endpoint if the hosting platform changes.
- **FR-005**: The backend MUST keep the AI API key server-side and never expose it to the client.
- **FR-006**: The backend MUST validate all input parameters before calling the AI service.

### Key Entities

- **Explain Request**: Contains the question text, array of 4 option strings, and the index (0-3) of the marked correct answer.
- **Explain Response**: Contains the AI-generated explanation text and a boolean flag indicating whether the AI detected a potential answer correctness issue.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can tap "Why?" on any incorrectly answered question and see an explanation appear within 10 seconds.
- **SC-002**: No CORS errors appear in the browser console when using the "Why?" feature from any supported origin.
- **SC-003**: The backend deploys successfully on a free-tier plan with no billing required.
- **SC-004**: The existing "Why?" button behavior (loading indicator, toggle, error handling, caching) continues to work identically after the fix.

## Assumptions

- The app is currently deployed on Vercel, which offers serverless functions on its free Hobby plan — this is the likely migration target for the backend.
- The AI API key will be stored as an environment variable on the hosting platform.
- The existing client-side code uses a platform-specific SDK call and will need to switch to a standard HTTP request if migrating away from the current backend platform.
- Single-user learning app usage will remain well within free-tier limits of any major serverless platform.
