# Feature Specification: Suspend Flagged Cards from Normal Decks

**Feature Branch**: `006-suspend-flagged-cards`
**Created**: 2026-04-10
**Status**: Draft
**Input**: User description: "I would like for that cards cards that are already flagged and the card that is going to be flagged in the future to be suspended meaning they would appear in the deck, only in the flagged section."

## Clarifications

### Session 2026-04-10

- Q: When a user unflags a card while actively inside the Flagged Cards session, what should happen to the current run? → A: The current Flagged Cards session is not altered; the unflagged card returns to its original deck on the next time that deck is started.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Flagging a card removes it from its normal deck (Priority: P1)

A learner is reviewing a deck and encounters a card they want to set aside for focused review later (e.g., one they keep getting wrong or find confusing). When they flag the card, it should immediately stop appearing in that deck's normal rotation and only be reachable through the dedicated Flagged Cards section.

**Why this priority**: This is the core behavior change requested. Without it, flagged cards continue to interrupt regular practice, which defeats the purpose of using the flag as a "park this for later" signal.

**Independent Test**: Start a deck that contains a known card, flag that card mid-session, restart the same deck, and verify the card no longer appears in that deck's rotation while still being accessible from the Flagged Cards section.

**Acceptance Scenarios**:

1. **Given** a learner is in the middle of a regular deck, **When** they flag the currently displayed card, **Then** the card is removed from the remaining cards of the current session and will not appear in future runs of that deck until unflagged.
2. **Given** a deck containing 50 cards of which 3 are flagged, **When** the learner starts that deck, **Then** the session contains only the 47 unflagged cards and the deck's reported card count reflects the reduced total.
3. **Given** a flagged card, **When** the learner opens the Flagged Cards section, **Then** the card is present and fully reviewable there.

---

### User Story 2 - Existing flagged cards are suspended retroactively (Priority: P1)

A learner who has already flagged cards in prior sessions expects the new behavior to apply to those cards as well, without needing to re-flag them.

**Why this priority**: Users will have an existing backlog of flagged cards. Requiring them to re-flag would be confusing and would make the feature feel broken on first use.

**Independent Test**: With a pre-existing set of flagged cards saved, load the app fresh and confirm those cards are absent from their normal decks while still appearing in the Flagged Cards section.

**Acceptance Scenarios**:

1. **Given** a user opens the app with cards already flagged from before this change, **When** they start any normal deck containing one of those cards, **Then** the flagged card is excluded from the session automatically.
2. **Given** a user has flagged cards from before, **When** they open the Flagged Cards section, **Then** all previously flagged cards are listed there unchanged.

---

### User Story 3 - Unflagging a card returns it to its normal deck (Priority: P2)

A learner has reviewed a flagged card enough times to feel confident on it and wants it back in regular rotation. Unflagging should restore the card to its original deck and remove it from the Flagged Cards section.

**Why this priority**: Suspension must be reversible for the feature to be useful long-term. Without a clean unflag path, users accumulate a permanently shrinking main deck.

**Independent Test**: Flag a card, confirm it is suspended from its deck, unflag it (either from the quiz view or the Flagged section), and confirm it reappears in its original deck.

**Acceptance Scenarios**:

1. **Given** a flagged (suspended) card, **When** the learner unflags it, **Then** it reappears in its original deck's rotation on the next start of that deck.
2. **Given** a flagged card being reviewed inside the Flagged Cards section, **When** the learner unflags it, **Then** the current Flagged Cards session continues unchanged for the remainder of its run, and the card is absent from the Flagged Cards section and restored to its source deck on their next respective starts.

---

### Edge Cases

- **Deck becomes empty**: If every card in a deck has been flagged, starting that deck should show a clear empty state (e.g., "All cards in this deck are flagged — review them in the Flagged Cards section") rather than launching an empty quiz.
- **Flagging the last card of a session**: When the learner flags the card currently on screen and it is the last card of the session, the session should end gracefully with the normal completion flow (the flagged card is not replayed).
- **Flagging mid-session affects only remaining cards**: Flagging a card that has already been answered earlier in the current session does not retroactively alter prior answers or scores for that session.
- **Flagged Cards section itself**: The Flagged Cards section must continue to show and quiz flagged cards even though they are suspended from normal decks — suspension applies only to normal decks, not to the Flagged section.
- **Sidebar counts**: Any deck card counts shown in the sidebar should reflect the unflagged (available) card count so users are not misled about how many cards a deck will actually present.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST exclude any currently flagged card from all normal decks (decks other than the Flagged Cards section) when a deck session is started.
- **FR-002**: System MUST apply exclusion retroactively to cards that were flagged prior to this feature being released, with no user action required.
- **FR-003**: System MUST remove a card from the remaining cards of the in-progress session at the moment it is flagged, so the learner is not asked that card again within the same run.
- **FR-004**: System MUST continue to display and allow reviewing of flagged cards within the dedicated Flagged Cards section.
- **FR-005**: System MUST restore a card to its original deck's rotation when it is unflagged, on the next time that deck is started.
- **FR-005a**: System MUST NOT mutate an in-progress session's remaining queue when a card is unflagged during a Flagged Cards session; the current run continues unchanged, and the unflag takes effect on the next start of the relevant decks.
- **FR-006**: System MUST reflect the post-exclusion card count in any user-visible deck card count (e.g., sidebar counts), so the number shown matches the number of cards the learner will actually see.
- **FR-007**: System MUST handle the case where all cards in a deck are flagged by showing a clear empty-state message instead of starting an empty quiz session.
- **FR-008**: System MUST preserve all existing flagged-card data (question, options, correct answer, category) so suspended cards remain fully reviewable in the Flagged Cards section.
- **FR-009**: System MUST keep flag state synchronized across devices so suspension behavior is consistent wherever the learner uses the app.

### Key Entities

- **Card**: A single quiz item (question, answer options, correct answer, source category/deck). Gains a derived state of "suspended" whenever it is present in the flagged collection.
- **Flagged Collection**: The set of cards the learner has marked for focused review. Membership in this collection is what causes a card to be suspended from its normal deck.
- **Deck**: A named grouping of cards the learner studies together. A deck's effective contents at session start are its full card list minus any cards currently in the Flagged Collection. The Flagged Cards section is itself a special deck whose contents are exactly the Flagged Collection and is not subject to this exclusion.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of flagged cards are absent from normal deck sessions started after the flag is applied (verifiable by flagging a card and starting its source deck).
- **SC-002**: 100% of flagged cards remain visible and reviewable inside the Flagged Cards section.
- **SC-003**: Unflagging a card restores it to its source deck on the next deck start in 100% of cases.
- **SC-004**: Deck card counts displayed to the learner match the actual number of cards served in the subsequent session (zero discrepancy).
- **SC-005**: Users with pre-existing flagged cards see the new suspension behavior apply immediately on first app load after release, with no manual migration step.

## Assumptions

- The existing Flagged Cards section and its sync mechanism are reused as the single source of truth for which cards are suspended; no separate "suspended" state is introduced.
- Suspension is deck-wide and not scoped per-session: once flagged, a card stays suspended from all normal decks until unflagged.
- The Flagged Cards section continues to behave as today — flagged cards are not suspended from it.
- In-progress sessions react to a new flag immediately (the just-flagged card is dropped from the remaining queue) but previously-served cards in that session are not retroactively altered.
- Deck card counts shown in the UI (e.g., sidebar) are expected to reflect available (unflagged) cards; this is treated as a bug fix implied by the feature, not a separate feature.
- Flag state continues to sync via the existing cross-device mechanism; no new sync infrastructure is required.
