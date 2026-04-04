# Research: Dark Mode with Visible Toggle

**Branch**: `003-dark-mode-toggle` | **Date**: 2026-04-04

## R1: Theme Switching Strategy via CSS Custom Properties

**Decision**: Use CSS custom properties (already in `:root`) with a `[data-theme="dark"]` / `[data-theme="light"]` attribute on `<html>`, overriding color variables per theme.

**Rationale**: The app already defines all colors as CSS variables in `:root` (e.g., `--cream`, `--black`, `--muted`, `--accent`, `--border`). Adding a `[data-theme="dark"]` selector that redefines these same variables is the simplest, most maintainable approach — zero structural CSS changes needed, just color overrides. The existing light palette becomes the `[data-theme="light"]` set.

**Alternatives considered**:
- Separate `dark.css` stylesheet: Rejected — doubles maintenance burden, risk of missed selectors
- CSS `prefers-color-scheme` media query: Rejected — spec requires dark as default regardless of OS setting; also doesn't support user toggle persistence
- Class-based toggle (`body.dark`): Viable but `data-theme` on `<html>` is more semantic and allows flash prevention via inline script in `<head>`

## R2: Preventing Flash of Wrong Theme (FOUWT)

**Decision**: Place a small inline `<script>` in `<head>` (before CSS loads) that reads `localStorage` and sets `data-theme` on `<html>` immediately.

**Rationale**: If theme is applied via JS at the bottom of the page (where scripts currently load), there's a visible flash of the default CSS before JS executes. An inline script in `<head>` runs synchronously before first paint, eliminating the flash entirely. This is the industry standard approach (used by GitHub, MDN, etc.).

**Alternatives considered**:
- CSS-only approach with `prefers-color-scheme`: Doesn't support localStorage persistence or forced default
- `<body onload>` handler: Too late — paint has already occurred
- Server-side rendering of theme class: Not applicable — this is a static client-side app

## R3: Dark Mode Color Palette

**Decision**: Create dark palette by mapping each existing CSS variable to a dark equivalent, maintaining the same semantic naming.

**Rationale**: The current palette is warm (cream `#FAF7F2`, border `#E2DDD5`). The dark palette should maintain the warm character with dark warm grays rather than pure black. Accent color (`#C4572A`) works well on dark backgrounds. Green/red feedback colors need slight lightening for contrast on dark backgrounds.

**Variable mapping approach**:
| Variable | Light Value | Dark Value | Notes |
|----------|------------|------------|-------|
| `--cream` | `#FAF7F2` | `#1A1A1E` | Main background → dark warm gray |
| `--black` | `#1A1A1A` | `#E8E4DE` | Text color → warm light |
| `--muted` | `#8C8577` | `#9A9590` | Slightly lighter for dark bg readability |
| `--accent` | `#C4572A` | `#D4673A` | Slightly brighter on dark bg |
| `--accent-light` | `rgba(196,87,42,0.08)` | `rgba(212,103,58,0.12)` | Slightly more visible on dark |
| `--green` | `#2D7A4F` | `#3D9A5F` | Brighter for dark bg contrast |
| `--green-light` | `rgba(45,122,79,0.08)` | `rgba(61,154,95,0.12)` | More visible on dark |
| `--red` | `#B83B3B` | `#D04B4B` | Brighter for dark bg contrast |
| `--red-light` | `rgba(184,59,59,0.08)` | `rgba(208,75,75,0.12)` | More visible on dark |
| `--border` | `#E2DDD5` | `#2E2E32` | Subtle border on dark bg |

**Alternatives considered**:
- Pure black background (`#000`): Rejected — too harsh, doesn't match the warm editorial aesthetic
- Inverting colors algorithmically: Rejected — loses warmth and editorial feel; manual curation is better for this small variable set

## R4: Toggle Button Placement and Design

**Decision**: Add a toggle button in the sidebar header, next to the existing title area, using sun/moon emoji icons consistent with the existing sound toggle's style.

**Rationale**: Per clarification, the toggle belongs in the sidebar header. The existing sound toggle uses a simple emoji icon in a bordered button (`.sound-toggle` class pattern: 44x44px, border, emoji). The theme toggle should follow the same visual pattern for consistency. On mobile, when the sidebar is hidden, the toggle also needs to be accessible — it will be visible when sidebar is opened.

**Alternatives considered**:
- Floating FAB: Rejected per clarification — sidebar header was chosen
- Text toggle ("Dark / Light"): Rejected — icon-based is more compact and language-neutral
- Custom SVG icons: Rejected — emoji (🌙/☀️) is simpler and consistent with existing emoji-based controls (🔊/🔇 for sound)

## R5: LocalStorage Persistence Pattern

**Decision**: Use `localStorage.getItem("theme")` / `localStorage.setItem("theme", "dark"|"light")`, mirroring the existing `sound-muted` pattern.

**Rationale**: The app already uses `localStorage` for the mute preference with a simple string key/value. Following the same pattern ensures consistency and simplicity. Default is `"dark"` when no key exists.

**Alternatives considered**:
- Firebase persistence: Rejected — theme is a UI preference, not user data; Firebase is for content state (flagged cards). Adding a Firebase write for every theme toggle is wasteful.
- Cookie: Rejected — no server-side rendering; localStorage is simpler and already used
- SessionStorage: Rejected — doesn't persist across sessions
