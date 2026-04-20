// Vocabulary feature (009) — Spaced-repetition scheduler (SM-2 variant).
// Pure functions that derive ReviewRecord from an append-only answer-event log.

(function (global) {
  'use strict';

  var INITIAL_EASE = 2.5;
  var MIN_EASE = 1.3;
  var MAX_EASE = 3.0;
  var EASE_UP = 0.1;
  var EASE_DOWN = 0.2;

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function formatLocalYmd(dateOrMs) {
    var d = dateOrMs instanceof Date ? dateOrMs : new Date(dateOrMs);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function addDaysLocal(ms, days) {
    var d = new Date(ms);
    d.setDate(d.getDate() + days);
    return d;
  }

  function todayLocalYmd() { return formatLocalYmd(new Date()); }

  function initialState() {
    return { interval: 0, ease: INITIAL_EASE, streak: 0, dueDate: null, lastSeen: 0, totalSeen: 0 };
  }

  function deriveReviewRecord(events) {
    var state = initialState();
    if (!events || events.length === 0) return state;
    var sorted = events.slice().sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
    for (var i = 0; i < sorted.length; i++) {
      var e = sorted[i];
      state.totalSeen += 1;
      state.lastSeen = e.ts || 0;
      if (e.correct) {
        state.streak += 1;
        if (state.streak === 1) state.interval = 1;
        else if (state.streak === 2) state.interval = 3;
        else state.interval = Math.max(1, Math.round(state.interval * state.ease));
        state.ease = Math.min(MAX_EASE, state.ease + EASE_UP);
      } else {
        state.streak = 0;
        state.interval = 1;
        state.ease = Math.max(MIN_EASE, state.ease - EASE_DOWN);
      }
      state.dueDate = formatLocalYmd(addDaysLocal(state.lastSeen, state.interval));
    }
    // Round ease to 3 decimals for stable storage + comparisons.
    state.ease = Math.round(state.ease * 1000) / 1000;
    return state;
  }

  function isDue(record, todayYmd) {
    if (!record || !record.dueDate) return false;
    return record.dueDate <= (todayYmd || todayLocalYmd());
  }

  // Sort most-overdue first (oldest dueDate first).
  function compareOverdue(a, b) {
    var ad = (a && a.dueDate) || '9999-99-99';
    var bd = (b && b.dueDate) || '9999-99-99';
    if (ad < bd) return -1;
    if (ad > bd) return 1;
    return 0;
  }

  global.vocabSrsScheduler = {
    deriveReviewRecord: deriveReviewRecord,
    isDue: isDue,
    compareOverdue: compareOverdue,
    todayLocalYmd: todayLocalYmd,
    formatLocalYmd: formatLocalYmd,
    INITIAL_EASE: INITIAL_EASE,
    MIN_EASE: MIN_EASE,
    MAX_EASE: MAX_EASE,
  };
})(window);
