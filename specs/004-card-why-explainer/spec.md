# Feature Specification: Card "Why?" Explainer

**Feature Branch**: `004-card-why-explainer`  
**Created**: 2026-04-05  
**Status**: Draft  
**Input**: User description: "I would like to add an explainer section to each card. Meaning when the user clicks on a 'Why?' button under the question an explanation is generated explaining why the answer is this."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Explanation After Answering (Priority: P1)

A learner answers a quiz question incorrectly and wants to understand **why** the correct answer is what it is. After an incorrect answer, a "Why?" button appears on the card (alongside the existing "Next" button). The learner taps "Why?" and the system calls an AI service to generate a concise explanation (1-2 sentences) specific to the question. The explanation appears on the card, helping them internalize the Turkish language concept behind the question. On correct answers, the existing auto-advance behavior is preserved and no "Why?" button is shown.

As part of generating the explanation, the AI also validates whether the marked correct answer is actually correct. If the AI detects the answer may be wrong, it flags this to the user within the explanation (e.g., "Note: the marked answer may be incorrect — [reasoning]").

**Why this priority**: This is the core value of the feature. Without the ability to see explanations, the feature has no purpose. Understanding "why" transforms passive quizzing into active learning. AI generation ensures every question gets a high-quality explanation without requiring manual authoring. Answer validation adds a quality-control layer to catch content errors.

**Independent Test**: Can be fully tested by answering a question incorrectly and tapping "Why?" — the explanation should appear, be relevant to the question, and be concise. If a question has an incorrect marked answer, the explanation should flag it.

**Acceptance Scenarios**:

1. **Given** a user has answered a question incorrectly, **When** they tap the "Why?" button, **Then** an AI-generated explanation (1-2 sentences) expands on the card explaining why the correct answer is correct (not why their answer was wrong).
2. **Given** a user has answered a question correctly, **When** the answer is submitted, **Then** the quiz auto-advances to the next question with no "Why?" button shown.
3. **Given** a user has not yet answered, **When** they view the question card, **Then** no "Why?" button is visible.
4. **Given** a question where the marked correct answer is actually wrong, **When** the user answers incorrectly and taps "Why?", **Then** the explanation flags that the marked answer may be incorrect and provides the reasoning.
5. **Given** the user taps "Why?", **When** the AI is generating the response, **Then** a loading indicator is shown until the explanation is ready.

---

### User Story 2 - Toggle Explanation Visibility (Priority: P2)

A learner who has opened an explanation wants to collapse it to reduce visual clutter before moving to the next question. Tapping the "Why?" button again (or a close indicator) collapses the explanation section.

**Why this priority**: Improves usability by letting learners control the card layout and not feel overwhelmed by extra content.

**Independent Test**: Can be tested by opening an explanation and tapping to close it — the explanation should collapse smoothly.

**Acceptance Scenarios**:

1. **Given** the explanation is currently visible, **When** the user taps the "Why?" button again, **Then** the explanation section collapses.
2. **Given** the explanation is collapsed, **When** the user advances to the next question, **Then** the explanation section is hidden and reset for the new question.

---

### User Story 3 - Answer Correctness Validation (Priority: P3)

A content author or diligent learner notices that some quiz questions may have the wrong answer marked as correct. When the AI generates an explanation, it also evaluates the correctness of the marked answer. If the AI believes the marked answer is wrong, it includes a visible flag in the explanation so the learner is not misled.

**Why this priority**: This is a quality-control feature that builds trust. Without it, learners could memorize incorrect answers. It's P3 because it's a secondary benefit of the AI generation — the core explanation is more important.

**Independent Test**: Can be tested by creating a question with a deliberately wrong marked answer, tapping "Why?", and verifying the AI flags the issue.

**Acceptance Scenarios**:

1. **Given** a question with a correctly marked answer, **When** the AI generates the explanation, **Then** no correctness warning is shown.
2. **Given** a question with an incorrectly marked answer, **When** the AI generates the explanation, **Then** the explanation includes a visible note that the marked answer may be incorrect, with reasoning.

---

### Edge Cases

- What happens if the AI service is unavailable or slow? The system should show a timeout message after 10 seconds and allow the user to retry or continue without an explanation.
- What happens if the user rapidly taps "Why?" multiple times? The system should debounce the request — only one AI call per question.
- What happens on small screens / mobile? The explanation section must remain readable within a scrollable container (max height ~150px) and not break the card layout.
- What happens if the user taps "Why?" and then immediately advances to the next question? Any in-flight AI request for the previous question should be cancelled and its result discarded.
- What happens if the AI returns an empty, malformed, or excessively long response? The system should show a generic error message with a retry option.
- What happens on the last question in a deck? The "Why?" button should still appear on incorrect answers; the user can view the explanation before proceeding to the results screen.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a "Why?" button on the quiz card only after the user has submitted an incorrect answer. The button MUST NOT appear on correct answers (auto-advance is preserved).
- **FR-002**: System MUST call an AI service to generate the explanation on-demand when the user taps "Why?" — explanations are not pre-stored.
- **FR-003**: The AI-generated explanation MUST be concise (1-2 sentences), written in English, and specific to the current question — referencing the Turkish language concept, grammar rule, vocabulary meaning, or contextual reason that makes the answer correct.
- **FR-004**: The AI MUST also evaluate whether the marked correct answer is actually correct. If the AI determines the marked answer is likely wrong, the explanation MUST include a visible warning with reasoning.
- **FR-005**: System MUST show a loading indicator while the AI is generating the explanation.
- **FR-006**: The explanation section MUST be collapsible — tapping "Why?" again hides the explanation.
- **FR-007**: The explanation section MUST be hidden and reset when advancing to the next question.
- **FR-008**: The "Why?" button and explanation section MUST be visually consistent with the existing card design and support both light and dark themes.
- **FR-009**: System MUST handle AI service failures gracefully — showing an error message with a retry option if the explanation cannot be generated.
- **FR-010**: System MUST debounce "Why?" taps — only one AI request per question, and subsequent taps toggle the already-generated explanation.

### Key Entities

- **Question**: The existing question with its text, options, and marked correct answer — sent as context to the AI service for explanation generation.
- **Explanation**: An AI-generated response containing a concise rationale (1-2 sentences) and optionally a correctness warning if the marked answer appears wrong.
- **Explanation Display**: A collapsible UI section on the quiz card that renders the explanation text, loading state, or error state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can request an explanation for any incorrectly answered quiz question via a single tap.
- **SC-002**: Explanations are concise — no more than 2 sentences for the core rationale.
- **SC-003**: The explanation is visible and readable on screens as small as 320px wide.
- **SC-004**: The "Why?" interaction (expand/collapse) completes with a visual transition (no layout jumps or flicker).
- **SC-005**: When a question has an incorrect marked answer, the AI flags it at least 90% of the time.
- **SC-006**: If the AI service is unavailable, the user sees a clear error message and can retry or continue.

## Clarifications

### Session 2026-04-05

- Q: Should auto-advance on correct answers be changed to allow "Why?" on all questions? → A: No — keep auto-advance; "Why?" button only appears on incorrect answers.
- Q: What language should explanations be written in? → A: English — the learner is learning Turkish and needs rationale in their fluent language.
- Q: Should the proxy have rate limiting to control AI API costs? → A: No — no rate limiting; keep it simple and trust users.

## Assumptions

- Explanations are generated on-demand by an AI service at runtime — no pre-authored explanations are stored in the question data.
- The AI service requires an API key, which will be kept secret on the server. The browser will communicate with a lightweight backend proxy (e.g., a serverless function) that holds the API key and forwards requests to the AI service.
- The explanation text will be kept concise (1-2 sentences) to fit the quiz card format without overwhelming the learner.
- The AI's answer-correctness validation is advisory — it flags potential issues but does not automatically change the marked answer in the quiz data.
- The "Why?" button only appears on incorrect answers. The existing auto-advance behavior on correct answers is preserved unchanged.
- Network connectivity is required to generate explanations. If the user is offline, the "Why?" feature will show an appropriate error.
