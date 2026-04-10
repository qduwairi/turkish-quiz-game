// Client-side error tracker — feature 008-error-tracking.
// Loaded from index.html AFTER firebase.initializeApp() and BEFORE js/quiz.js
// so its public API is live before the rest of the app boots.
//
// Public surface:
//   window.errorTracker.capture({kind, message, stack, operation})
//   window.errorTracker.trackedCall(operationName, promise)
//   window.errorTracker.breadcrumb(msg)
//
// Phase 2 (this file): skeleton, helpers, offline queue, writeRecord.
// Phase 3+ (US1/US3): capture listeners, trackedCall wrapping, breadcrumb push.

(function () {
  var MAX_BREADCRUMBS = 10;
  var DEDUP_CAP = 5;
  var MAX_MESSAGE = 500;
  var MAX_STACK = 4096;
  var MAX_PAGE = 500;
  var MAX_OPERATION = 100;

  var sessionId = (window.crypto && typeof window.crypto.randomUUID === "function")
    ? window.crypto.randomUUID()
    : fallbackUuidV4();

  var breadcrumbs = [];
  var seenSignatures = new Map();
  var pending = [];
  var draining = false;

  function fallbackUuidV4() {
    // Minimal RFC4122 v4 generator for browsers without crypto.randomUUID.
    var bytes = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    var hex = [];
    for (var i = 0; i < 16; i++) hex.push((bytes[i] + 0x100).toString(16).slice(1));
    return hex[0] + hex[1] + hex[2] + hex[3] + "-" +
           hex[4] + hex[5] + "-" +
           hex[6] + hex[7] + "-" +
           hex[8] + hex[9] + "-" +
           hex[10] + hex[11] + hex[12] + hex[13] + hex[14] + hex[15];
  }

  // ── Env detection ──

  function detectEnv() {
    var ua = (navigator && navigator.userAgent) || "";
    var browser = "other";
    if (/Edg\//.test(ua)) browser = "edge";
    else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = "chrome";
    else if (/Firefox\//.test(ua)) browser = "firefox";
    else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = "safari";

    var os = "other";
    if (/Windows/.test(ua)) os = "windows";
    else if (/Android/.test(ua)) os = "android";
    else if (/iPhone|iPad|iPod/.test(ua)) os = "ios";
    else if (/Mac OS X/.test(ua)) os = "macos";
    else if (/Linux/.test(ua)) os = "linux";

    var w = window.innerWidth || 0;
    var h = window.innerHeight || 0;
    return { browser: browser, os: os, viewport: w + "x" + h };
  }

  // ── Signature (djb2 over message + top stack frame) ──

  function topFrame(stack) {
    if (!stack || typeof stack !== "string") return "";
    var lines = stack.split("\n");
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line && line.indexOf("at ") === 0) return line;
    }
    return (lines[1] || lines[0] || "").trim();
  }

  function computeSignature(message, stack) {
    var input = String(message || "") + "::" + topFrame(stack);
    var hash = 5381;
    for (var i = 0; i < input.length; i++) {
      hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
    }
    return (hash >>> 0).toString(16);
  }

  // ── Record assembly ──

  function trimStr(s, max) {
    if (s == null) return null;
    s = String(s);
    return s.length > max ? s.slice(0, max) : s;
  }

  function buildRecord(input) {
    var kind = input.kind;
    var message = trimStr(input.message, MAX_MESSAGE) || "";
    var stack = input.stack == null ? null : trimStr(input.stack, MAX_STACK);
    var operation = kind === "network_failure"
      ? trimStr(input.operation, MAX_OPERATION)
      : null;

    var pageStr = (location.pathname || "") + (location.search || "") + (location.hash || "");
    if (pageStr.length > MAX_PAGE) pageStr = pageStr.slice(0, MAX_PAGE);

    return {
      message: message,
      stack: stack,
      signature: computeSignature(message, stack),
      kind: kind,
      operation: operation,
      page: pageStr,
      timestamp: Date.now(),
      env: detectEnv(),
      sessionId: sessionId,
      breadcrumbs: breadcrumbs.slice()
    };
  }

  // ── Persistence ──

  function getErrorsRef() {
    if (typeof window.firebase === "undefined" || !window.firebase.database) return null;
    try {
      return window.firebase.database().ref("/errors");
    } catch (e) {
      return null;
    }
  }

  function writeRecord(record) {
    var ref = getErrorsRef();
    if (!ref || (typeof navigator !== "undefined" && navigator.onLine === false)) {
      pending.push(record);
      return;
    }
    try {
      var result = ref.push(record);
      if (result && typeof result.then === "function") {
        result.then(drainPending, function () { pending.push(record); });
      } else if (result && typeof result.catch === "function") {
        result.catch(function () { pending.push(record); });
      } else {
        drainPending();
      }
    } catch (e) {
      pending.push(record);
    }
  }

  function drainPending() {
    if (draining) return;
    if (pending.length === 0) return;
    var ref = getErrorsRef();
    if (!ref) return;
    draining = true;
    try {
      var queue = pending.slice();
      pending.length = 0;
      for (var i = 0; i < queue.length; i++) {
        try { ref.push(queue[i]); } catch (e) { pending.push(queue[i]); }
      }
    } finally {
      draining = false;
    }
  }

  window.addEventListener("online", function () {
    try { drainPending(); } catch (e) {}
  });

  // ── Public API ──

  function capture(input) {
    try {
      if (!input || !input.kind) return;
      var message = input.message != null ? String(input.message) : "";
      var stack = input.stack != null ? String(input.stack) : null;
      var signature = computeSignature(message, stack);
      var count = seenSignatures.get(signature) || 0;
      if (count >= DEDUP_CAP) return;
      seenSignatures.set(signature, count + 1);
      var record = buildRecord({
        kind: input.kind,
        message: message,
        stack: stack,
        operation: input.operation || null
      });
      writeRecord(record);
    } catch (e) {
      // Intentionally silent — the tracker must never disturb the learner.
    }
  }

  function trackedCall(operationName, promise) {
    if (!promise || typeof promise.then !== "function") return promise;
    return promise.then(
      function (v) { return v; },
      function (err) {
        try {
          capture({
            kind: "network_failure",
            message: (err && (err.message || String(err))) || "network failure",
            stack: (err && err.stack) || null,
            operation: operationName
          });
        } catch (e) {}
        throw err;
      }
    );
  }

  function breadcrumb(msg) {
    try {
      var text = String(msg == null ? "" : msg);
      if (text.length > 120) text = text.slice(0, 120);
      breadcrumbs.push({ t: Date.now(), msg: text });
      while (breadcrumbs.length > MAX_BREADCRUMBS) breadcrumbs.shift();
    } catch (e) {}
  }

  // ── Global capture listeners ──

  window.addEventListener("error", function (evt) {
    try {
      var err = evt && evt.error;
      capture({
        kind: "js_error",
        message: (evt && evt.message) || (err && err.message) || String(err || "error"),
        stack: (err && err.stack) || null,
        operation: null
      });
    } catch (e) {}
  });

  window.addEventListener("unhandledrejection", function (evt) {
    try {
      var reason = evt && evt.reason;
      capture({
        kind: "unhandled_rejection",
        message: (reason && (reason.message || String(reason))) || "unhandled rejection",
        stack: (reason && reason.stack) || null,
        operation: null
      });
    } catch (e) {}
  });

  window.errorTracker = {
    capture: capture,
    trackedCall: trackedCall,
    breadcrumb: breadcrumb,
    // Exposed for tests/debugging only — not part of the public contract.
    _internal: {
      detectEnv: detectEnv,
      computeSignature: computeSignature,
      buildRecord: buildRecord,
      writeRecord: writeRecord,
      drainPending: drainPending,
      getSessionId: function () { return sessionId; },
      getPending: function () { return pending.slice(); },
      getSeenSignatures: function () { return seenSignatures; },
      getBreadcrumbs: function () { return breadcrumbs.slice(); },
      constants: {
        MAX_BREADCRUMBS: MAX_BREADCRUMBS,
        DEDUP_CAP: DEDUP_CAP,
        MAX_MESSAGE: MAX_MESSAGE,
        MAX_STACK: MAX_STACK,
        MAX_PAGE: MAX_PAGE,
        MAX_OPERATION: MAX_OPERATION
      }
    }
  };
})();
