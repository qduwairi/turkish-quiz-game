# Research: Gamification Sounds

**Feature Branch**: `001-gamification-sounds`
**Date**: 2026-04-04

## Audio Playback in Vanilla JS

**Decision**: Use the Web Audio API via `AudioContext` for sound playback, with `Audio` element as fallback.

**Rationale**: `AudioContext` provides low-latency playback (~5ms vs ~100ms for `<audio>` elements), supports overlapping sounds natively, and is well-supported across all modern evergreen browsers. For this project's needs (short clips, instant feedback), preloading audio buffers via `fetch` + `decodeAudioData` gives the best responsiveness.

**Alternatives considered**:
- `<audio>` HTML elements: Simpler API but higher latency, harder to overlap, and autoplay policies are stricter.
- Howler.js library: Excellent API but violates Constitution Principle III (Simplicity & Vanilla Stack) — adds an unnecessary dependency for 3 short sound clips.
- Tone.js: Overkill for simple sound effects; designed for music synthesis.

## Audio File Format

**Decision**: Use MP3 format for sound files.

**Rationale**: MP3 has universal browser support across all target evergreen browsers, good compression for short clips (keeps files under 50 KB), and is the most widely available format for free sound effects. No need for OGG/WAV fallbacks given the modern browser target.

**Alternatives considered**:
- WAV: Larger file sizes (~10x), no compression benefit for short clips.
- OGG Vorbis: Not supported in Safari without fallback.
- WebM audio: Less tooling support, no benefit over MP3 for short clips.

## Browser Autoplay Policy Handling

**Decision**: Create the `AudioContext` on the first user interaction (click/tap) to comply with autoplay policies, then reuse it for all subsequent sounds.

**Rationale**: All modern browsers require a user gesture to start an `AudioContext`. Since the quiz inherently requires clicking to select answers, the first answer selection naturally satisfies this requirement. The context is created lazily on first use, then persists.

**Alternatives considered**:
- Creating context on page load: Would be suspended by browsers; requires `resume()` on interaction anyway.
- Prompting user to "click to enable sounds": Unnecessary friction — the quiz interaction itself is the gesture.

## Mute Preference Storage

**Decision**: Use `localStorage` for persisting the mute preference.

**Rationale**: Mute is a device-specific preference (user may want sounds on desktop but not on phone). `localStorage` is synchronous, simple, and doesn't require Firebase writes. Aligns with Constitution Principle V — Firebase is for user state that syncs across devices (flagged cards), while device-local preferences belong in `localStorage`.

**Alternatives considered**:
- Firebase Realtime Database: Would sync mute across devices, which is undesirable for a per-device setting.
- Cookies: Larger overhead, sent with every request, less intuitive API.
- SessionStorage: Would not persist across sessions (violates FR-005).

## Sound Asset Source

**Decision**: Include 3 small MP3 files in a new `sounds/` directory at the project root.

**Rationale**: Self-hosting the files (rather than CDN or generated tones) keeps the app simple, offline-capable after first load, and avoids external dependencies. Files are small enough (<50 KB each, <150 KB total per SC-004) to have negligible impact on load time.

**Alternatives considered**:
- Programmatically generated tones via Web Audio oscillator: Would eliminate file dependencies but produces robotic sounds that feel less polished.
- CDN-hosted sounds: Adds external dependency, offline fragility.
