# Quickstart: Card "Why?" Explainer

**Branch**: `004-card-why-explainer` | **Date**: 2026-04-05

## Prerequisites

- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- Anthropic API key
- Firebase project `turkish-quiz-game` access

## Setup

### 1. Initialize Firebase Cloud Functions

```bash
cd /home/qasim/projects/turkish-language-game/turkish-quiz-game
firebase init functions
# Select: JavaScript, No ESLint, Yes install dependencies
```

This creates a `functions/` directory with `package.json` and `index.js`.

### 2. Install Anthropic SDK

```bash
cd functions
npm install @anthropic-ai/sdk
```

### 3. Set API Key

```bash
firebase functions:secrets:set ANTHROPIC_API_KEY
# Paste your Anthropic API key when prompted
```

### 4. Add Firebase Functions SDK to index.html

Add after the existing Firebase database script tag:

```html
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-functions-compat.js"></script>
```

### 5. Local Development

```bash
# Terminal 1: Run Firebase emulators (functions + hosting)
firebase emulators:start --only functions,hosting

# Terminal 2: Open in browser
open http://localhost:5000
```

### 6. Deploy

```bash
firebase deploy --only functions
```

## Key Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `functions/index.js` | Create | Cloud Function: `explainAnswer` |
| `functions/package.json` | Create | Dependencies: `@anthropic-ai/sdk` |
| `index.html` | Modify | Add Firebase Functions SDK, "Why?" button HTML |
| `js/quiz.js` | Modify | Add "Why?" button logic, AI call, expand/collapse |
| `css/style.css` | Modify | Styles for "Why?" button, explanation section, loading, warning |
| `firebase.json` | Modify | Add functions config |

## Testing

1. Answer a question incorrectly
2. Tap "Why?" button
3. Verify loading indicator appears
4. Verify explanation appears (1-2 sentences, English)
5. Tap "Why?" again to collapse
6. Tap "Next" — verify explanation resets
7. Test with Firebase emulator offline to verify error handling
