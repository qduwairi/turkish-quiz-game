# Quickstart: Client-Side Error Tracking (008)

This feature adds silent client-side error capture and a developer-only viewer page. The learner experience is unchanged.

## What was added

- `js/error-tracker.js` — capture uncaught errors, unhandled rejections, and user-initiated network failures; dedupe; buffer offline; write to `/errors` in Firebase RTDB.
- `js/quiz.js` — instrumented at user-initiated call sites and breadcrumb points (no behavior change).
- `index.html` — loads `error-tracker.js` first so capture is live before the rest of the app.
- `dev/errors.html` + `dev/errors.js` — developer viewer; lists, inspects, and deletes stored errors; enforces the 500-record cap on load.
- `database.rules.json` — tightened with rules for the new `/errors` subtree (create-only from clients, no reads).

## Verify the capture path

1. Open the app in a browser and start a quiz.
2. Open DevTools Console and run: `throw new Error("smoke test")`
3. Wait a second, then open `dev/errors.html` (see "Running the developer viewer" below).
4. A record with `message: "smoke test"`, `kind: "js_error"`, the correct `page`, and a non-empty `breadcrumbs` array should appear at the top of the list.

## Verify network-failure capture

1. In DevTools, enable "Offline" in the Network tab.
2. In the running app, flag or unflag a card.
3. Re-enable the network.
4. The developer viewer should show a new record with `kind: "network_failure"`, `operation` matching the flag operation, and the correct page/breadcrumbs.

## Verify dedup

1. In the running app, open the console and run a loop that throws the same error 20 times: `for (let i=0;i<20;i++) try{throw new Error("dup")}catch(e){window.dispatchEvent(new ErrorEvent("error",{error:e,message:e.message}))}`
2. The developer viewer should show **no more than 5** records with `message: "dup"` from that session — any further occurrences were dropped client-side by signature dedup.

## Verify learner is unaffected when the error store is unreachable

1. Block the Firebase domain in DevTools Network conditions (or point `database.rules.json` at a non-existent project temporarily).
2. Use the app normally for a few minutes — take a quiz, flag cards.
3. The learner must see zero new popups, console toasts, or broken flows caused by error recording itself.

## Running the developer viewer

The viewer reads `/errors`, which is forbidden by the new rules for anonymous clients. Two supported ways to run it locally:

- **Preferred**: Serve `dev/errors.html` locally with a temporary rules override (`firebase database:set` or a local RTDB emulator), OR use a Firebase custom token minted from a service account to sign in before the viewer reads `/errors`. The exact local mechanism is an operational choice and does not affect the feature's contract.
- **Quick sanity checks during development**: Temporarily loosen `errors/.read` to `true` in the local rules file only, run the viewer, then revert before committing. Never deploy relaxed rules.

## Rolling back

Removing the feature requires:
1. Reverting `database.rules.json` to the previous shape (the root `.read/.write = true` already covers `/errors` by cascade — the new subtree rules go away with the revert).
2. Deleting `js/error-tracker.js`, `dev/`, and un-instrumenting `js/quiz.js` (remove `trackedCall` wraps and `breadcrumb` calls).
3. Optionally deleting the `/errors` subtree in RTDB.

No learner-visible state or quiz content is affected by a rollback.
