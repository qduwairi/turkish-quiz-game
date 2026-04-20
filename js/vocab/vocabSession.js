// Vocabulary feature (009) — Quiz and Review session state machines.
// Picks next item, builds an MCQ via mcqGenerator, records answers via deckStore.

(function (global) {
  'use strict';

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  // Shared flow: append event, then refresh the reviewState cache for that item.
  function recordAnswer(deckId, itemId, payload) {
    var store = global.vocabDeckStore;
    return store.appendAnswerEvent(deckId, itemId, payload).then(function (evt) {
      // Two-step: re-read events + rewrite cache. Non-fatal on failure.
      return store.refreshReviewState(deckId, itemId).then(
        function (state) { return { event: evt, reviewState: state }; },
        function () { return { event: evt, reviewState: null }; }
      );
    });
  }

  // ---- Quiz session ---------------------------------------------------------
  function startQuizSession(deckId, direction) {
    var store = global.vocabDeckStore;
    var mcq = global.vocabMcqGenerator;
    return Promise.all([
      store.getItems(deckId),
      store.listAllUserItems(deckId),
    ]).then(function (results) {
      var deckItems = results[0];
      var otherDecks = results[1];
      var builtin = store.getBuiltinCorrectAnswers();

      if (deckItems.length === 0) return { empty: true };

      var queue = shuffle(deckItems.slice());
      var answered = 0;
      var score = 0;
      var wrongItems = [];
      var current = null;

      function nextQuestion() {
        if (queue.length === 0) return null;
        var correctItem = queue.shift();
        var q = mcq.buildMcq({
          correctItem: correctItem,
          deckItems: deckItems,
          otherDecksItems: otherDecks,
          builtinCorrectAnswers: builtin,
          direction: direction,
        });
        if (q.blocked) return { blocked: true, reason: q.reason };
        current = { question: q, correctItem: correctItem };
        return q;
      }

      function submitAnswer(optionIndex) {
        if (!current) return Promise.reject(new Error('No active question'));
        var q = current.question;
        var correctItem = current.correctItem;
        var isCorrect = optionIndex === q.correctIndex;
        answered++;
        if (isCorrect) score++;
        else wrongItems.push(correctItem);
        current = null;
        return recordAnswer(deckId, correctItem.itemId, { correct: isCorrect, direction: q.direction, mode: 'quiz' })
          .then(function () { return { correct: isCorrect, correctIndex: q.correctIndex }; });
      }

      return {
        total: deckItems.length,
        get answered() { return answered; },
        get score() { return score; },
        get wrongItems() { return wrongItems.slice(); },
        nextQuestion: nextQuestion,
        submitAnswer: submitAnswer,
      };
    });
  }

  // ---- Review session (T028) ------------------------------------------------
  // options: { deckId? }
  function startReviewSession(options) {
    options = options || {};
    var store = global.vocabDeckStore;
    var mcq = global.vocabMcqGenerator;

    return Promise.all([
      store.listDueItems({ deckId: options.deckId || null }),
      store.listAllUserItems(options.deckId || null),
    ]).then(function (results) {
      var dueList = results[0];
      var otherDecks = results[1];
      var builtin = store.getBuiltinCorrectAnswers();

      if (dueList.length === 0) return { empty: true };

      // For distractor building, collect all items across the due list's decks.
      var perDeckItemsCache = {};
      function getDeckItems(deckId) {
        if (perDeckItemsCache[deckId]) return Promise.resolve(perDeckItemsCache[deckId]);
        return store.getItems(deckId).then(function (its) { perDeckItemsCache[deckId] = its; return its; });
      }

      var queue = dueList.slice();
      var answered = 0;
      var score = 0;
      var current = null;

      function nextQuestion() {
        if (queue.length === 0) return Promise.resolve(null);
        var due = queue.shift();
        return getDeckItems(due.deckId).then(function (deckItems) {
          var correctItem = deckItems.find(function (x) { return x.itemId === due.itemId; });
          if (!correctItem) return nextQuestion();
          // In review mode, default direction is term → translation.
          var q = mcq.buildMcq({
            correctItem: correctItem,
            deckItems: deckItems,
            otherDecksItems: otherDecks,
            builtinCorrectAnswers: builtin,
            direction: 'termToTranslation',
          });
          if (q.blocked) return nextQuestion();
          current = { question: q, correctItem: correctItem, deckId: due.deckId };
          return q;
        });
      }

      function submitAnswer(optionIndex) {
        if (!current) return Promise.reject(new Error('No active question'));
        var q = current.question;
        var isCorrect = optionIndex === q.correctIndex;
        var correctItem = current.correctItem;
        var deckId = current.deckId;
        answered++;
        if (isCorrect) score++;
        current = null;
        return recordAnswer(deckId, correctItem.itemId, { correct: isCorrect, direction: q.direction, mode: 'review' })
          .then(function () { return { correct: isCorrect, correctIndex: q.correctIndex }; });
      }

      return {
        total: dueList.length,
        get answered() { return answered; },
        get score() { return score; },
        nextQuestion: nextQuestion,
        submitAnswer: submitAnswer,
      };
    });
  }

  global.vocabSession = {
    startQuizSession: startQuizSession,
    startReviewSession: startReviewSession,
    _recordAnswer: recordAnswer,
  };
})(window);
