# Research: Card "Why?" Explainer

**Branch**: `004-card-why-explainer` | **Date**: 2026-04-05

## R1: AI Service Selection

**Decision**: Anthropic Claude API (claude-haiku-4-5-20251001)

**Rationale**: Haiku is the most cost-effective model for short, structured responses (1-2 sentences). Turkish language knowledge is strong across Claude models. The task is simple — explain a quiz answer and validate correctness — so a smaller model suffices.

**Alternatives considered**:
- OpenAI GPT-4o-mini: Comparable cost/quality, but Anthropic aligns with the developer ecosystem already in use.
- Google Gemini Flash: Similar tier, but less straightforward API for simple completions.

## R2: Firebase Cloud Functions Setup

**Decision**: Firebase Cloud Functions v2 (2nd gen) with Node.js runtime

**Rationale**: 2nd gen functions use Cloud Run under the hood, offering better cold start times and concurrency. The project already uses Firebase (hosting, Realtime Database), so Cloud Functions are the natural extension. Requires `firebase-tools` CLI and a `functions/` directory with its own `package.json`.

**Key details**:
- Function: Single HTTPS callable function `explainAnswer`
- Runtime: Node.js 20
- Dependencies: `@anthropic-ai/sdk` in `functions/package.json`
- API key: Stored in Firebase environment config (`firebase functions:config:set`) or Google Cloud Secret Manager
- CORS: Restricted to the app's hosting domain

**Alternatives considered**:
- Cloudflare Workers: Would add a new service provider (violates constitution — Firebase is sole provider).
- Vercel/Netlify functions: Same issue — new service provider.
- Direct client-side call: User rejected — API key would be exposed.

## R3: AI Prompt Design

**Decision**: System prompt + structured user message containing question, all options, and marked correct index

**Rationale**: The AI needs full question context to explain the answer and validate correctness. A structured prompt ensures consistent, concise responses.

**Prompt structure**:
- System: "You are a Turkish language tutor. Given a quiz question, explain in 1-2 sentences in English why the correct answer is correct. Reference the relevant Turkish grammar rule, vocabulary meaning, or usage pattern. If you believe the marked correct answer is actually wrong, start your response with 'NOTE:' followed by your correction reasoning, then provide the explanation for what you believe is the correct answer."
- User: Question text, all options (labelled a-d), and which option is marked correct.

**Response format**: Plain text (not JSON). The client checks if the response starts with "NOTE:" to determine if a correctness warning should be displayed.

## R4: Client-Side Integration Point

**Decision**: Add "Why?" button to the wrong-answer feedback flow in `selectAnswer()`, call Firebase callable function via `firebase.functions().httpsCallable()`

**Rationale**: The wrong-answer flow already shows a feedback message and "Next" button. The "Why?" button fits naturally alongside these. Firebase callable functions handle auth/CORS automatically and integrate with the existing Firebase SDK.

**Key details**:
- Firebase Functions SDK: Add `firebase-functions-compat` script tag to `index.html` (same CDN pattern as existing Firebase imports)
- No build step needed — stays vanilla JS with CDN imports
- Explanation cached in a variable per question to avoid duplicate API calls

## R5: Cost Estimate

**Decision**: Acceptable cost for the project's scale

**Rationale**: Claude Haiku costs ~$0.25/MTok input, ~$1.25/MTok output. Each request is ~200 tokens in, ~100 tokens out. At ~$0.00017 per explanation, 1000 explanations/day = ~$0.17/day. No rate limiting needed per user's decision.
