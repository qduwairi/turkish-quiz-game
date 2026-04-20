// Vocabulary feature (009) — Multiple-choice question builder with distractor fallback.
// Pure functions; consumes deck items + other-deck items + built-in answers.

(function (global) {
  'use strict';

  var TARGET_DISTRACTORS = 3;
  var SENTENCE_RE = /[.?!]/;

  function norm(s) { return String(s || '').trim().toLowerCase(); }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function answerOf(item, direction) {
    return direction === 'translationToTerm' ? item.term : item.translation;
  }
  function promptOf(item, direction) {
    return direction === 'translationToTerm' ? item.translation : item.term;
  }

  function pushUnique(target, seenSet, candidate) {
    var k = norm(candidate);
    if (k.length === 0) return;
    if (seenSet.has(k)) return;
    seenSet.add(k);
    target.push(candidate);
  }

  // opts: { correctItem, deckItems, otherDecksItems, builtinCorrectAnswers, direction }
  function buildMcq(opts) {
    var correctItem = opts.correctItem;
    var direction = opts.direction || 'termToTranslation';
    var deckItems = (opts.deckItems || []).filter(function (it) { return it !== correctItem && it.itemId !== correctItem.itemId; });
    var otherDecks = opts.otherDecksItems || [];
    var builtin = opts.builtinCorrectAnswers || [];

    var correctAnswer = answerOf(correctItem, direction);
    var seen = new Set([norm(correctAnswer)]);
    var distractors = [];

    // Tier 1 — same deck, shuffled to randomise.
    var tier1 = shuffle(deckItems);
    for (var i = 0; i < tier1.length && distractors.length < TARGET_DISTRACTORS; i++) {
      pushUnique(distractors, seen, answerOf(tier1[i], direction));
    }

    // Tier 2 — other user decks.
    if (distractors.length < TARGET_DISTRACTORS) {
      var tier2 = shuffle(otherDecks);
      for (var j = 0; j < tier2.length && distractors.length < TARGET_DISTRACTORS; j++) {
        pushUnique(distractors, seen, answerOf(tier2[j], direction));
      }
    }

    // Tier 3 — built-in quiz answers, filtered to non-sentence strings.
    if (distractors.length < TARGET_DISTRACTORS) {
      var tier3 = shuffle(builtin.filter(function (s) { return s && !SENTENCE_RE.test(s); }));
      for (var k = 0; k < tier3.length && distractors.length < TARGET_DISTRACTORS; k++) {
        pushUnique(distractors, seen, tier3[k]);
      }
    }

    if (distractors.length < TARGET_DISTRACTORS) {
      return { blocked: true, reason: 'insufficient-distractors' };
    }

    var options = shuffle([correctAnswer].concat(distractors));
    var correctIndex = options.indexOf(correctAnswer);
    return {
      prompt: promptOf(correctItem, direction),
      options: options,
      correctIndex: correctIndex,
      direction: direction,
      itemId: correctItem.itemId,
    };
  }

  global.vocabMcqGenerator = {
    buildMcq: buildMcq,
    _norm: norm,
  };
})(window);
