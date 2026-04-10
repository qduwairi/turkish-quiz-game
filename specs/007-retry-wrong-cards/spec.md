# Feature Specification: Retry Wrong Cards Until Mastered

**Feature Branch**: `007-retry-wrong-cards`
**Created**: 2026-04-10
**Status**: Draft
**Input**: User description: "So after the user finishes a session, the questions they got wrong during the session needs to be asked again and the user needs to get this right to be able to finish the deck"

## Clarifications

### Session 2026-04-10

- Q: Does retry logic apply to the Flagged Cards review session too? → A: Normal deck sessions only. Flagged Cards review is unchanged.
- Q: When a retry card is answered incorrectly again, when does it reappear? → A: Sent to the end of the current retry queue; the system cycles through all other remaining retry cards before presenting it again.
- Q: What happens to the Score counter during the retry phase? → A: The Score label/counter is replaced with a "Retry" label during the retry phase; the numeric first-pass score is not shown during retry.
- Q: How should the main progress bar behave when the retry phase starts? → A: Hide the main progress bar during retry; show a text count like "3 cards left to master" instead.
- Q: How is the transition from main pass to retry phase signaled? → A: Show a brief intermediate screen/banner ("Retry phase: N cards to master") before the first retry card; user taps to continue.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Retry wrong answers before finishing a deck (Priority: P1)

A learner works through a deck session. Whenever they answer a card incorrectly, that card is set aside. After they reach the end of the main question list, instead of immediately seeing the results screen, the app re-presents each card they got wrong, one at a time, until they have answered every previously-missed card correctly. Only then does the deck session complete.

**Why this priority**: This is the entire feature. It turns a passing-through quiz into a learning tool by guaranteeing the learner has demonstrated mastery of every card in the deck before the session ends, reinforcing retention on the exact items they struggled with.

**Independent Test**: Start any deck, intentionally answer one or more cards incorrectly, and continue until the main list is exhausted. Verify that the app then re-presents the wrong cards (rather than showing final results), and that the session only ends — showing the results screen — after every re-presented card is answered correctly.

**Acceptance Scenarios**:

1. **Given** a deck session where the learner answered every card correctly on the first pass, **When** the last card is answered, **Then** the results screen is shown immediately with no retry phase.
2. **Given** a deck session where the learner answered some cards incorrectly, **When** the main list of cards is exhausted, **Then** the app enters a retry phase and re-presents the missed cards instead of showing results.
3. **Given** the learner is in the retry phase and answers a re-presented card correctly, **When** there are still other missed cards remaining, **Then** the next missed card is presented.
4. **Given** the learner is in the retry phase and answers a re-presented card correctly, **When** it was the last missed card, **Then** the results screen is shown.
5. **Given** the learner is in the retry phase and answers a re-presented card incorrectly, **When** they confirm the answer, **Then** that card remains in the retry pool and will be presented again before the session can end.
6. **Given** the learner has just finished the main pass and at least one card was missed, **When** the retry phase begins, **Then** a brief intermediate screen/banner appears reading "Retry phase: N cards to master" and the learner taps to continue to the first retry card.
7. **Given** the learner is in the retry phase, **When** they look at the screen, **Then** the Score label is replaced with a "Retry" label and a text count shows how many cards are still left to master, making it clear they are reviewing previously-missed cards.

---

### User Story 2 - Clear progress signal during retry phase (Priority: P2)

During the retry phase, the learner can see how many cards remain to be mastered so they understand the session is not stuck in a loop and know how close they are to finishing.

**Why this priority**: Without a progress signal, a learner who misses several cards may feel the quiz is endless or broken. Visibility preserves motivation and trust.

**Independent Test**: Enter the retry phase with at least 3 missed cards. Verify the main progress bar is hidden, a text count of remaining cards is shown, and it updates as cards are mastered or as incorrectly-answered cards get re-queued to the end of the pool.

**Acceptance Scenarios**:

1. **Given** the learner enters the retry phase with N missed cards, **When** the first retry card appears, **Then** the main progress bar is hidden and a text count reads "N cards left to master" (or equivalent wording).
2. **Given** a retry card is answered correctly, **When** the next card appears, **Then** the remaining count decreases by one.
3. **Given** a retry card is answered incorrectly, **When** the next card appears, **Then** the remaining count does not decrease (the card is still owed) and the missed card has been moved to the end of the retry queue.

---

### Edge Cases

- **Deck of one card answered wrong**: A single-card deck where the learner answers wrong — they must retry that same card until correct before the results screen appears.
- **All cards answered wrong**: Every card in the deck was missed on the first pass; the retry phase contains every card and continues until all are mastered.
- **Repeated mistakes on the same card**: A learner keeps getting the same card wrong in the retry phase — the card keeps returning until answered correctly, with no session timeout or forced exit.
- **Learner abandons mid-retry**: The learner closes the session or navigates away during the retry phase — the session is treated as incomplete (same behavior as abandoning mid-main-pass today); no partial "finished" state is recorded.
- **Learner flags a card during retry phase**: If the existing flagging behavior allows flagging mid-session, a card flagged during retry is removed from the retry pool (consistent with how flagging suspends cards from a session today).
- **Learner revisits the same deck later**: Retry state is per-session only. Starting the deck again begins a fresh main pass; previously-missed cards from an earlier abandoned session are not remembered.
- **Empty deck**: No cards in the deck — the session cannot start (existing behavior); retry logic does not apply.
- **Flagged Cards review session**: The separate "Flagged Cards" review mode is explicitly out of scope for this feature; it does not enforce retry-until-mastered and its behavior is unchanged.
- **Only one card left in the retry pool and learner answers it wrong**: With only one card remaining, there is no "other" card to cycle to, so the same card is presented again on the next turn as the natural consequence of the end-of-queue rule.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST track, during an active deck session, every card the learner answers incorrectly.
- **FR-002**: After the learner answers the final card of the main deck list, the system MUST check whether any cards were answered incorrectly during the session.
- **FR-003**: If no cards were answered incorrectly, the system MUST show the results screen immediately, matching current end-of-session behavior.
- **FR-004**: If one or more cards were answered incorrectly, the system MUST enter a retry phase instead of showing the results screen.
- **FR-005**: During the retry phase, the system MUST present only cards the learner previously answered incorrectly in the current session.
- **FR-006**: When a card is answered correctly in the retry phase, the system MUST remove it from the retry pool.
- **FR-007**: When a card is answered incorrectly in the retry phase, the system MUST keep that card in the retry pool so it will be presented again before the session can end.
- **FR-008**: The system MUST only show the results screen once the retry pool is empty (every previously-missed card has been answered correctly at least once).
- **FR-009**: The system MUST show a brief intermediate screen or banner at the transition into the retry phase that reads "Retry phase: N cards to master" (where N is the number of cards currently in the retry pool) and requires a learner tap/click to continue to the first retry card.
- **FR-010**: During the retry phase, the system MUST hide the main progress bar and instead display a text indicator showing how many cards are still left to master (e.g., "3 cards left to master"), updating after each answer.
- **FR-010a**: During the retry phase, the system MUST replace the Score label/counter with a "Retry" label; the numeric first-pass score is not displayed during retry and is restored (as the first-pass score) on the results screen.
- **FR-011**: The system MUST NOT alter the first-pass score when a card is answered correctly during the retry phase; the score on the results screen continues to reflect first-pass performance so the learner sees their true starting accuracy.
- **FR-012**: The system MUST preserve existing mid-session flagging behavior: a card flagged during the retry phase is removed from the retry pool and the session continues with any remaining retry cards.
- **FR-013**: When a retry card is answered incorrectly, the system MUST move that card to the end of the current retry queue so the learner cycles through all other remaining retry cards before encountering it again. The initial order of the retry pool when the phase begins is varied (not strictly the order cards were missed in the main pass) so the learner cannot memorize a fixed sequence.
- **FR-014**: If the learner abandons the session during the retry phase, the system MUST treat the session as incomplete, consistent with abandoning during the main pass today; no retry state is persisted across sessions.
- **FR-015**: The retry-until-mastered behavior MUST apply only to normal deck sessions. The separate Flagged Cards review session is out of scope and its behavior is unchanged.

### Key Entities *(include if feature involves data)*

- **Deck Session**: An in-progress attempt at a deck. Now additionally tracks a retry pool — the set of cards missed during the current session that must still be answered correctly before the session can end. Session state remains in-memory only and is discarded on abandonment.
- **Retry Pool**: The collection of cards the learner has answered incorrectly in the current session and has not yet answered correctly. Cards enter the pool on an incorrect answer (first pass or retry phase) and leave it when subsequently answered correctly. The pool's emptiness is the gate for showing results.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of deck sessions where the learner answered at least one card incorrectly, the results screen is shown only after every missed card has been answered correctly at least once.
- **SC-002**: In 100% of deck sessions where the learner answered every card correctly on the first pass, the end-of-session behavior is unchanged — results are shown immediately with no retry phase.
- **SC-003**: When the learner enters the retry phase, they can identify within 5 seconds that they are in a retry phase and see how many cards still need to be mastered.
- **SC-004**: Learners report (qualitatively, via observation or feedback) that the retry phase feels like helpful reinforcement rather than a frustrating loop, and that they understand why they are seeing cards again.
- **SC-005**: No deck session ever shows a "finished" results screen while leaving previously-missed cards un-mastered.

## Assumptions

- Retry state is per-session only and lives in memory; it is not persisted to Firebase or any long-term store. Closing or abandoning the session discards it.
- The score shown on the results screen reflects first-pass accuracy only. Remediation in the retry phase is for learning, not for inflating the displayed score.
- Existing flagging behavior (flagging a card mid-session removes it from the active queue) continues to apply during the retry phase.
- The existing end-of-session results screen, score display, and deck-completion UI are reused; this feature only changes *when* the results screen appears, not what it looks like.
- The retry phase reuses the same question UI, answer-selection flow, feedback, and "Why?" explainer as the main pass; no new interaction model is introduced.
- A session that has a non-empty retry pool is considered "not finished" for any existing deck-completion tracking, consistent with the FR-008 gate.
