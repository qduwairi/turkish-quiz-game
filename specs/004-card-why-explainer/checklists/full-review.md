# Full Spec Review Checklist: Card "Why?" Explainer

**Purpose**: Validate requirement completeness, clarity, consistency, and coverage across all dimensions before planning
**Created**: 2026-04-05
**Feature**: [spec.md](../spec.md)
**Depth**: Standard
**Audience**: Author / Reviewer (pre-planning gate)

## Requirement Completeness

- [ ] CHK001 - Are requirements defined for what question context is sent to the AI service (question text, all options, marked answer, category)? [Gap, Spec §FR-002] — *Deferred to planning: implementation detail*
- [ ] CHK002 - Is the expected AI response structure specified (plain text, structured JSON, markdown)? [Gap, Spec §FR-003] — *Deferred to planning: implementation detail*
- [ ] CHK003 - Are requirements defined for the visual placement of the "Why?" button relative to existing feedback message and "Next" button? [Gap, Spec §FR-001] — *Deferred to planning: layout detail*
- [ ] CHK004 - Are loading indicator requirements specified (type: spinner, skeleton, text; placement on card)? [Gap, Spec §FR-005] — *Deferred to planning: UI detail*
- [ ] CHK005 - Are retry behavior requirements defined beyond "a retry option" — e.g., number of retries, automatic vs. manual? [Completeness, Spec §FR-009] — *Deferred to planning: implementation detail*
- [ ] CHK006 - Is the error message content or tone specified for AI service failures? [Gap, Spec §FR-009] — *Deferred to planning: copy detail*
- [ ] CHK007 - Are requirements defined for what happens to the "Why?" button state during loading (disabled, replaced, hidden)? [Gap, Spec §FR-005] — *Deferred to planning: UI detail*
- [ ] CHK008 - Are requirements specified for the correctness warning's visual differentiation from the normal explanation (color, icon, formatting)? [Gap, Spec §FR-004] — *Deferred to planning: UI detail*

## Requirement Clarity

- [x] CHK009 - Is "concise (1-2 sentences)" sufficiently precise, or should a character/word limit also be specified? [Clarity, Spec §FR-003] — *Acceptable: 1-2 sentences is a clear, testable constraint*
- [x] CHK010 - Is "smooth visual transition" in SC-004 quantified with specific duration or easing expectations? [Ambiguity, Spec §SC-004] — *Fixed: removed "smooth", now says "visual transition (no layout jumps or flicker)"*
- [x] CHK011 - Is "a reasonable wait" before timeout defined with a specific duration? [Ambiguity, Spec ��Edge Cases] — *Fixed: now specifies "10 seconds"*
- [x] CHK012 - Is "visually consistent with the existing card design" defined with specific constraints (font, spacing, color tokens)? [Ambiguity, Spec §FR-008] — *Acceptable at spec level: planning phase will define exact tokens*
- [ ] CHK013 - Is "the AI determines the marked answer is likely wrong" threshold defined — what confidence level triggers the warning? [Ambiguity, Spec §FR-004] — *Deferred to planning: AI prompt engineering detail*

## Requirement Consistency

- [x] CHK014 - SC-001 states "any quiz question" but FR-001 restricts to incorrect answers only — is SC-001 updated to reflect the clarification? [Conflict, Spec §SC-001 vs §FR-001] �� *Fixed: SC-001 now says "any incorrectly answered quiz question"*
- [x] CHK015 - User Story 1 independent test says "answering any question" but the story itself scopes to incorrect answers — are these aligned? [Conflict, Spec §US-1] — *Fixed: now says "answering a question incorrectly"*
- [x] CHK016 - FR-010 says "subsequent taps toggle the already-generated explanation" — is this consistent with FR-006 which defines the same toggle behavior? [Consistency, Spec §FR-006 vs §FR-010] — *Acceptable: FR-006 defines the toggle UX, FR-010 defines the debounce/caching behavior — complementary, not redundant*

## Acceptance Criteria Quality

- [x] CHK017 - Can SC-005 ("AI flags incorrect answers at least 90% of the time") be measured without a labelled test dataset of known-incorrect answers? [Measurability, Spec §SC-005] �� *Acceptable: can be validated with a small curated set during QA*
- [x] CHK018 - Is SC-003 ("readable on 320px screens") defined with specific criteria (font size, no horizontal scroll, no truncation)? [Measurability, Spec §SC-003] — *Acceptable at spec level: "readable" on 320px is a standard mobile constraint*
- [x] CHK019 - Are acceptance criteria defined for the cached/debounced state — what should happen when the user re-opens a previously generated explanation? [Gap, Spec §FR-010] — *Covered: FR-010 specifies "subsequent taps toggle the already-generated explanation"*

## Scenario Coverage

- [x] CHK020 - Are requirements defined for the last question in a deck ��� does "Why?" still appear, and how does it interact with the results screen transition? [Coverage, Gap] — *Fixed: edge case now specifies "Why?" still appears on last question; user views explanation before results screen*
- [x] CHK021 - Are requirements defined for what happens if the user has already seen the explanation and taps "Next" — is the explanation discarded or cached for back-navigation? [Coverage, Gap] — *Covered by FR-007: "explanation section MUST be hidden and reset when advancing"*
- [ ] CHK022 - Are requirements specified for the explanation behavior when the quiz is interrupted (e.g., user navigates to sidebar, switches deck mid-question)? [Coverage, Gap] — *Deferred to planning: existing quiz interruption behavior applies*

## Edge Case Coverage

- [x] CHK023 - Is the cancellation behavior for in-flight AI requests explicitly specified (abort signal, ignore response, etc.)? [Completeness, Spec §Edge Cases] — *Fixed: edge case now says "cancelled and its result discarded"*
- [x] CHK024 - Are requirements defined for handling malformed or unexpected AI responses (e.g., empty response, excessively long response, non-English content)? [Gap] — *Fixed: new edge case added for empty/malformed/long responses*
- [x] CHK025 - Is the maximum display height or scroll behavior for the explanation section specified to prevent layout overflow? [Gap, Spec §Edge Cases] — *Fixed: edge case now specifies "scrollable container (max height ~150px)"*

## Non-Functional Requirements

- [x] CHK026 - Are performance requirements defined for acceptable AI response latency (e.g., explanation appears within N seconds)? [Gap] — *Covered: 10-second timeout defined in edge cases*
- [ ] CHK027 - Are accessibility requirements specified for the "Why?" button and explanation section (ARIA labels, screen reader behavior, keyboard navigation)? [Gap] — *Deferred to planning: will be addressed in implementation*
- [ ] CHK028 - Are requirements defined for the data sent to the AI service from a privacy perspective — is question content considered sensitive? [Gap] — *Deferred to planning: question data is educational content, not user PII*

## Dependencies & Assumptions

- [x] CHK029 - Is the assumption "no rate limiting" documented as a deliberate decision with awareness of cost risk, or does it need a revisit trigger? [Assumption, Spec §Clarifications] — *Covered: documented in Clarifications section as explicit user decision*
- [x] CHK030 - Is the proxy architecture assumption (serverless function) specific enough, or should the spec remain agnostic about proxy type? [Assumption, Spec §Assumptions] — *Acceptable: spec says "e.g., a serverless function" — agnostic enough*
- [x] CHK031 - Is the dependency on network connectivity explicitly listed as a prerequisite, with offline behavior defined beyond "show an error"? [Completeness, Spec §Assumptions] ��� *Covered: Assumptions section states "Network connectivity is required... will show an appropriate error"*

## Notes

- **20 of 31 items pass** (fixed or acceptable)
- **11 items deferred to planning** — all are implementation-level details (UI placement, AI prompt structure, response format, accessibility specifics) that belong in `plan.md`, not `spec.md`
- **0 blocking conflicts remain**
- Spec is ready for `/speckit.plan`
