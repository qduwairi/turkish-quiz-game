# Quickstart: Gamification Sounds

**Feature Branch**: `001-gamification-sounds`

## How to Verify

1. Serve the app locally:
   ```bash
   python3 -m http.server 5000
   ```
   Open `http://localhost:5000` in a browser.

2. **Correct answer sound**: Select any unit from the sidebar. Choose the correct answer — a success chime should play instantly.

3. **Incorrect answer sound**: Select a wrong answer — a distinct error tone should play.

4. **Completion sound**: Finish all questions in a unit — a celebration sound should play on the results screen.

5. **Mute toggle**: In the quiz header (next to the score), click the sound icon to mute. Answer more questions — no sounds should play. Click again to unmute. Reload the page — mute state should persist.

6. **Autoplay policy**: Open a fresh incognito tab, navigate to the app, and start a quiz. The first answer tap should play sound (the tap itself satisfies the browser gesture requirement).

## File Changes Overview

| File               | Change                                      |
|--------------------|---------------------------------------------|
| `index.html`       | Add mute toggle button in quiz header       |
| `js/quiz.js`       | Add sound playback logic and mute toggle    |
| `css/style.css`    | Add styles for mute toggle button           |
| `sounds/correct.mp3` | New: success sound effect (~15 KB)        |
| `sounds/wrong.mp3`   | New: error sound effect (~15 KB)          |
| `sounds/complete.mp3` | New: completion celebration sound (~30 KB)|
