# Data Model: Gamification Sounds

**Feature Branch**: `001-gamification-sounds`
**Date**: 2026-04-04

## Entities

### Sound Event (runtime only, no persistence)

Represents a triggerable audio cue during quiz interaction.

| Attribute   | Type   | Description                                    |
|-------------|--------|------------------------------------------------|
| id          | string | Unique identifier: `"correct"`, `"wrong"`, `"complete"` |
| audioBuffer | AudioBuffer | Decoded audio data preloaded at init       |

- **Cardinality**: Exactly 3 instances, created at application startup.
- **Lifecycle**: Created once when audio buffers are decoded; reused for the lifetime of the page session. No state transitions.
- **No persistence**: Sound events are static assets, not user data.

### Mute Preference (persisted in localStorage)

A single boolean flag controlling whether sounds play.

| Attribute | Type    | Storage Key       | Default |
|-----------|---------|-------------------|---------|
| muted     | boolean | `"sound-muted"`   | `false` |

- **Cardinality**: One value per browser/device.
- **Lifecycle**: Created on first read (defaults to `false`). Toggled by user interaction. Persists across page reloads via `localStorage`.
- **Identity**: Keyed by the `localStorage` key `"sound-muted"`.
- **No Firebase sync**: This is device-local state per spec assumption.

## Relationships

```
Sound Event  ──triggers──>  AudioContext.play()
                               │
                               ├── gated by: Mute Preference
                               └── gated by: AudioContext state (user gesture required)
```

## No Schema Changes

This feature does not modify Firebase data or `database.rules.json`.
The `units` array in `js/questions.js` is unchanged.
