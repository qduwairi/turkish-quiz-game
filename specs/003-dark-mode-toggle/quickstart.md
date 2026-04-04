# Quickstart: Dark Mode with Visible Toggle

**Branch**: `003-dark-mode-toggle` | **Date**: 2026-04-04

## What This Feature Does

Adds a dark color theme as the default appearance for the Turkish Quiz app, with a visible toggle button in the sidebar header that lets users switch between dark and light modes at any time. The user's preference is remembered across sessions.

## Files to Modify

| File | Change |
|------|--------|
| `index.html` | Add inline theme script in `<head>`; add toggle button in sidebar header |
| `css/style.css` | Add `[data-theme="dark"]` variable overrides; style the toggle button |
| `js/quiz.js` | Add `toggleTheme()` function and theme initialization logic |

## How It Works

1. **On page load**: A small inline script in `<head>` reads `localStorage("theme")`. If absent, defaults to `"dark"`. Sets `<html data-theme="dark|light">` before first paint.

2. **CSS variables**: The existing `:root` variables become the light theme. A new `[data-theme="dark"]` selector overrides the same variables with dark palette values. All existing CSS references (`var(--cream)`, `var(--black)`, etc.) automatically adapt.

3. **Toggle button**: A button in the sidebar header (next to title) shows 🌙/☀️. Clicking it flips the `data-theme` attribute, updates `localStorage`, and swaps the icon.

## How to Test

1. Open `index.html` in a browser — should load in dark mode
2. Click the theme toggle — should instantly switch to light mode (the original cream palette)
3. Refresh the page — should remain in light mode (persisted)
4. Clear localStorage and refresh — should revert to dark mode
5. Start a quiz, toggle mid-quiz — quiz state should be unaffected
6. Test on mobile viewport (≤900px) — toggle accessible via sidebar
