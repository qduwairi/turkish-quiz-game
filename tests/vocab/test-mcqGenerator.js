// Tests for js/vocab/mcqGenerator.js — US2 / T017.
(function () {
  var t = window.__vocabTest;
  t.suite('mcqGenerator');
  var build = window.vocabMcqGenerator.buildMcq;

  function item(id, term, translation) { return { itemId: id, term: term, translation: translation }; }

  var correct = item('a', 'merhaba', 'hello');
  var deck = [
    correct,
    item('b', 'lütfen', 'please'),
    item('c', 'teşekkürler', 'thank you'),
    item('d', 'günaydın', 'good morning'),
    item('e', 'iyi akşamlar', 'good evening'),
  ];

  t.add('builds 4 options with exactly one correct (termToTranslation)', function () {
    var q = build({ correctItem: correct, deckItems: deck, direction: 'termToTranslation' });
    window.assertEqual(q.options.length, 4);
    window.assertEqual(q.options[q.correctIndex], 'hello');
    window.assertEqual(q.prompt, 'merhaba');
  });

  t.add('builds 4 options in reverse direction (translationToTerm)', function () {
    var q = build({ correctItem: correct, deckItems: deck, direction: 'translationToTerm' });
    window.assertEqual(q.prompt, 'hello');
    window.assertEqual(q.options[q.correctIndex], 'merhaba');
  });

  t.add('all 4 options are pairwise distinct after case-insensitive trim', function () {
    for (var n = 0; n < 20; n++) {
      var q = build({ correctItem: correct, deckItems: deck, direction: 'termToTranslation' });
      var seen = new Set();
      for (var i = 0; i < q.options.length; i++) {
        var k = q.options[i].trim().toLowerCase();
        window.assert(!seen.has(k), 'duplicate option: ' + q.options[i]);
        seen.add(k);
      }
    }
  });

  t.add('falls back to other user decks when deck is too small', function () {
    var tinyDeck = [correct, item('z', 'a', 'alpha')]; // only 1 distractor available locally
    var other = [item('x', 'kitap', 'book'), item('y', 'masa', 'table')];
    var q = build({ correctItem: correct, deckItems: tinyDeck, otherDecksItems: other, direction: 'termToTranslation' });
    window.assertEqual(q.options.length, 4);
    window.assertEqual(q.options[q.correctIndex], 'hello');
  });

  t.add('falls back to built-in quiz answers as last resort', function () {
    var onlyCorrect = [correct];
    var builtin = ['elma', 'armut', 'süt'];
    var q = build({ correctItem: correct, deckItems: onlyCorrect, otherDecksItems: [], builtinCorrectAnswers: builtin, direction: 'termToTranslation' });
    window.assertEqual(q.options.length, 4);
  });

  t.add('filters sentence-like strings out of built-in fallback', function () {
    var onlyCorrect = [correct];
    var builtin = ['a sentence with a period.', 'question?', 'yell!', 'word1', 'word2', 'word3'];
    var q = build({ correctItem: correct, deckItems: onlyCorrect, builtinCorrectAnswers: builtin, direction: 'termToTranslation' });
    window.assertEqual(q.options.length, 4);
    for (var i = 0; i < q.options.length; i++) {
      window.assert(!/[.?!]/.test(q.options[i]) || q.options[i] === 'hello', 'sentence leaked into options: ' + q.options[i]);
    }
  });

  t.add('blocks the quiz when fewer than 3 distractors are available anywhere', function () {
    var q = build({ correctItem: correct, deckItems: [correct], otherDecksItems: [], builtinCorrectAnswers: [], direction: 'termToTranslation' });
    window.assertEqual(q.blocked, true);
    window.assertEqual(q.reason, 'insufficient-distractors');
  });

  t.add('dedups candidates identical to the correct answer (case-insensitive)', function () {
    var dupDeck = [correct, item('b', 'selam', 'Hello'), item('c', 'lütfen', 'please'), item('d', 'teşekkürler', 'thank you'), item('e', 'hoşça kal', 'bye')];
    for (var n = 0; n < 10; n++) {
      var q = build({ correctItem: correct, deckItems: dupDeck, direction: 'termToTranslation' });
      var lowered = q.options.map(function (o) { return o.toLowerCase(); });
      var helloCount = lowered.filter(function (s) { return s === 'hello'; }).length;
      window.assertEqual(helloCount, 1);
    }
  });
})();
