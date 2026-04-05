# Quickstart: Fix Why Button CORS and Deployment Issue

**Feature**: 005-fix-why-button-cors | **Date**: 2026-04-05

## Prerequisites

- Node.js 20+
- Vercel CLI (`npm i -g vercel`) — optional, for local testing
- Anthropic API key

## Local Development

### 1. Set up environment variable

Create a `.env` file at the repo root (already in `.gitignore`):

```
ANTHROPIC_API_KEY=your-key-here
```

### 2. Run with Vercel dev server

```bash
vercel dev
```

This serves the static site AND the `/api/explain-answer` function locally with environment variables loaded from `.env`.

### 3. Test the Why? button

1. Open http://localhost:3000
2. Start any quiz deck
3. Answer a question incorrectly
4. Tap "Why?" — an explanation should appear

## Deployment

The function deploys automatically with the rest of the site via Vercel's Git integration:

1. Set `ANTHROPIC_API_KEY` in Vercel dashboard → Project Settings → Environment Variables
2. Push to branch / merge to main
3. Vercel deploys the `api/` directory as serverless functions automatically

## File Structure

```
api/
└── explain-answer.js    # Vercel serverless function (replaces functions/index.js)
```

## Testing the API directly

```bash
curl -X POST http://localhost:3000/api/explain-answer \
  -H "Content-Type: application/json" \
  -d '{"question":"What is hello in Turkish?","options":["Merhaba","Güle güle","Teşekkürler","Evet"],"correct":0}'
```
