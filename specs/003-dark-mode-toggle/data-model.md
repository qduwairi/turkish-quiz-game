# Data Model: Dark Mode with Visible Toggle

**Branch**: `003-dark-mode-toggle` | **Date**: 2026-04-04

## Entities

### Theme Preference

| Attribute | Type | Description |
|-----------|------|-------------|
| key | string (constant) | `"theme"` — localStorage key |
| value | string enum | `"dark"` or `"light"` |

**Default**: `"dark"` (when key is absent from localStorage)

**Lifecycle**:
- Created: On first theme toggle by user
- Read: On every page load (inline `<head>` script)
- Updated: On every toggle click
- Deleted: Only when user clears browser data (app does not delete)

### Theme State (Runtime)

| Attribute | Type | Description |
|-----------|------|-------------|
| `data-theme` attribute on `<html>` | string | `"dark"` or `"light"` — controls active CSS variables |
| Toggle button icon | visual | 🌙 (moon) when dark is active, ☀️ (sun) when light is active |

**State transitions**:
```
[Page Load] → Read localStorage("theme")
  → Key exists: Apply stored value to <html data-theme>
  → Key absent: Apply "dark" (default)

[Toggle Click] → Read current data-theme
  → "dark" → set "light" (update attribute + localStorage + icon)
  → "light" → set "dark" (update attribute + localStorage + icon)
```

## No Firebase Schema Changes

Theme preference is stored client-side only via `localStorage`. No changes to `database.rules.json` or Firebase data model are required.
