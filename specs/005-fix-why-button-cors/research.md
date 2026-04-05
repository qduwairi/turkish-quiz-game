# Research: Fix Why Button CORS and Deployment Issue

**Feature**: 005-fix-why-button-cors | **Date**: 2026-04-05

## R1: Serverless Function Platform for Free Deployment

**Decision**: Migrate from Firebase Cloud Functions to Vercel Serverless Functions

**Rationale**:
- The app is already deployed on Vercel (turkish-quiz-game.vercel.app), so no new platform is needed
- Vercel Hobby (free) plan includes 1M function invocations/month and 60-second execution timeout
- The current function needs only ~10-30 seconds and will be called sparingly (single-user learning app)
- Vercel serverless functions are created by placing files in an `api/` directory at the repo root — zero configuration needed
- Environment variables (ANTHROPIC_API_KEY) are set via Vercel dashboard, same as any platform

**Alternatives considered**:
- Firebase Cloud Functions: Rejected — requires Blaze (pay-as-you-go) plan, which the project doesn't have
- Cloudflare Workers: Viable free tier but adds a new platform; Vercel is already in use
- Netlify Functions: Viable but same argument — Vercel is already the deployment target

## R2: CORS Handling on Vercel Serverless Functions

**Decision**: Handle CORS manually in the Vercel serverless function by setting response headers

**Rationale**:
- Vercel serverless functions are standard Node.js HTTP handlers (req, res)
- CORS headers must be set explicitly: `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`
- Must handle OPTIONS preflight requests by returning 200 with CORS headers
- Origin should be restricted to production domain and localhost for security

**Alternatives considered**:
- `vercel.json` headers config: Only applies to static files, not serverless functions
- Wildcard `*` origin: Simpler but less secure; restricted origins preferred per spec FR-001

## R3: Client-Side Migration from Firebase SDK to Fetch

**Decision**: Replace `firebase.functions().httpsCallable()` with standard `fetch()` call

**Rationale**:
- Firebase Functions SDK (`firebase-functions-compat.js`) is only needed for `httpsCallable`
- Moving to Vercel means the function is a plain HTTP endpoint (`/api/explain-answer`)
- Standard `fetch()` is built into all modern browsers — no dependency needed
- The Firebase Functions SDK script tag can be removed from index.html
- Response format changes: Firebase callable wraps in `{ data: ... }`, Vercel returns plain JSON

**Alternatives considered**:
- Keep Firebase SDK and point to a custom endpoint: Unnecessary complexity; Firebase SDK adds overhead for no benefit

## R4: Constitution Impact — Firebase Exception Scope

**Decision**: The constitution amendment (v1.1.0) permits Firebase Cloud Functions as the sole server-side exception. Migrating to Vercel serverless functions requires a constitution amendment (v1.2.0) to expand the exception to cover Vercel Serverless Functions as an alternative AI proxy.

**Rationale**:
- Principle III and the "No server-side code" constraint specifically name Firebase Cloud Functions
- The spirit of the exception (proxy AI requests with secret API key) applies equally to Vercel
- The amendment should be minimal: expand "Firebase Cloud Functions" to include Vercel Serverless Functions as a permitted alternative

**Alternatives considered**:
- Ignore constitution: Violates governance rules
- Stay on Firebase: Not viable without Blaze plan
