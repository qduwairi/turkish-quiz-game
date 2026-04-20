// Vocabulary feature (009) — Firebase Realtime Database access for decks, items, events,
// and the derived reviewState cache. Also owns getCurrentUserId() / requireAuth() helpers.

(function (global) {
  'use strict';

  // The app does not currently use Firebase Auth (see existing /flagged writes in js/quiz.js).
  // Until auth is added, every user is the same "default" namespace, mirroring the app's
  // single-user convention. When Firebase Auth lands, replace the body of getCurrentUserId()
  // with `firebase.auth().currentUser.uid` and update requireAuth() to wait for onAuthStateChanged.
  var DEFAULT_UID = 'default';

  function getCurrentUserId() {
    return DEFAULT_UID;
  }

  function requireAuth(onReady) {
    setTimeout(function () { onReady(getCurrentUserId()); }, 0);
  }

  function vocabRoot() {
    return 'vocabulary/' + getCurrentUserId();
  }

  function db() {
    return global.db || firebase.database();
  }

  // Keep the vocabulary subtree synced so Review/Quiz reads survive a disconnect
  // (Firebase queues writes automatically; keepSynced mirrors recent reads into the
  // offline cache).
  try {
    db().ref('vocabulary/' + DEFAULT_UID).keepSynced(true);
  } catch (_) { /* ignored — Firebase not ready yet during unit tests */ }

  function report(operation, err) {
    if (global.errorTracker) {
      global.errorTracker.capture({
        kind: 'js_error',
        message: (err && err.message) || String(err),
        stack: err && err.stack,
        operation: operation,
      });
    }
  }

  function normTerm(s) { return String(s || '').trim().toLowerCase(); }

  // --- Deck CRUD --------------------------------------------------------------

  function listDecks() {
    return db().ref(vocabRoot() + '/decks').once('value').then(function (snap) {
      var val = snap.val() || {};
      var out = [];
      Object.keys(val).forEach(function (id) {
        var d = val[id];
        out.push({
          deckId: id,
          name: d.name,
          description: d.description || '',
          createdAt: d.createdAt || 0,
          itemCount: typeof d.itemCount === 'number' ? d.itemCount : 0,
        });
      });
      out.sort(function (a, b) { return a.createdAt - b.createdAt; });
      return out;
    }).catch(function (err) { report('vocab.deckStore.listDecks', err); throw err; });
  }

  function createDeck(name, description) {
    name = String(name || '').trim();
    if (name.length < 1 || name.length > 64) {
      return Promise.reject(new Error('Deck name must be 1–64 characters.'));
    }
    return listDecks().then(function (decks) {
      var nameKey = name.toLowerCase();
      for (var i = 0; i < decks.length; i++) {
        if (decks[i].name.toLowerCase() === nameKey) {
          var e = new Error('A deck named "' + decks[i].name + '" already exists.');
          e.code = 'duplicate_deck_name';
          throw e;
        }
      }
      var ref = db().ref(vocabRoot() + '/decks').push();
      var record = { name: name, createdAt: Date.now(), itemCount: 0 };
      if (description && String(description).trim().length > 0) record.description = String(description).trim();
      return ref.set(record).then(function () {
        return { deckId: ref.key, name: record.name, description: record.description || '', createdAt: record.createdAt, itemCount: 0 };
      });
    }).catch(function (err) {
      if (err && err.code !== 'duplicate_deck_name') report('vocab.deckStore.createDeck', err);
      throw err;
    });
  }

  function renameDeck(deckId, newName) {
    newName = String(newName || '').trim();
    if (newName.length < 1 || newName.length > 64) {
      return Promise.reject(new Error('Deck name must be 1–64 characters.'));
    }
    return listDecks().then(function (decks) {
      var nameKey = newName.toLowerCase();
      for (var i = 0; i < decks.length; i++) {
        if (decks[i].deckId !== deckId && decks[i].name.toLowerCase() === nameKey) {
          var e = new Error('A deck named "' + decks[i].name + '" already exists.');
          e.code = 'duplicate_deck_name';
          throw e;
        }
      }
      return db().ref(vocabRoot() + '/decks/' + deckId + '/name').set(newName);
    }).catch(function (err) {
      if (err && err.code !== 'duplicate_deck_name') report('vocab.deckStore.renameDeck', err);
      throw err;
    });
  }

  function deleteDeck(deckId) {
    var root = vocabRoot();
    var update = {};
    update[root + '/decks/' + deckId] = null;
    update[root + '/items/' + deckId] = null;
    update[root + '/events/' + deckId] = null;
    update[root + '/reviewState/' + deckId] = null;
    return db().ref().update(update).catch(function (err) {
      report('vocab.deckStore.deleteDeck', err); throw err;
    });
  }

  // --- Item import ------------------------------------------------------------

  function getItems(deckId) {
    return db().ref(vocabRoot() + '/items/' + deckId).once('value').then(function (snap) {
      var val = snap.val() || {};
      var out = [];
      Object.keys(val).forEach(function (id) {
        var it = val[id];
        out.push({ itemId: id, term: it.term, translation: it.translation, extras: it.extras || {}, importedAt: it.importedAt || 0 });
      });
      return out;
    }).catch(function (err) { report('vocab.deckStore.getItems', err); throw err; });
  }

  function listDeckTerms(deckId) {
    return getItems(deckId).then(function (items) {
      var set = new Set();
      items.forEach(function (it) { set.add(normTerm(it.term)); });
      return set;
    });
  }

  function addItems(deckId, items) {
    if (!Array.isArray(items) || items.length === 0) return Promise.resolve({ added: 0 });
    var root = vocabRoot();
    var itemsRef = db().ref(root + '/items/' + deckId);
    var update = {};
    var now = Date.now();
    items.forEach(function (it) {
      var push = itemsRef.push();
      var record = { term: it.term, translation: it.translation, importedAt: now };
      if (it.extras && Object.keys(it.extras).length > 0) record.extras = it.extras;
      update['items/' + deckId + '/' + push.key] = record;
    });
    // Multi-path update plus refresh the itemCount cache.
    return getItems(deckId).then(function (existing) {
      update['decks/' + deckId + '/itemCount'] = existing.length + items.length;
      return db().ref(root).update(update).then(function () { return { added: items.length }; });
    }).catch(function (err) { report('vocab.deckStore.addItems', err); throw err; });
  }

  // --- Cross-deck reads & event log ------------------------------------------

  function listAllUserItems(exceptDeckId) {
    return db().ref(vocabRoot() + '/items').once('value').then(function (snap) {
      var val = snap.val() || {};
      var out = [];
      Object.keys(val).forEach(function (deckId) {
        if (deckId === exceptDeckId) return;
        var itemsInDeck = val[deckId] || {};
        Object.keys(itemsInDeck).forEach(function (itemId) {
          var it = itemsInDeck[itemId];
          out.push({ itemId: itemId, deckId: deckId, term: it.term, translation: it.translation });
        });
      });
      return out;
    }).catch(function (err) { report('vocab.deckStore.listAllUserItems', err); throw err; });
  }

  function getBuiltinCorrectAnswers() {
    var seen = new Set();
    var out = [];
    var units = global.units || [];
    try {
      for (var u = 0; u < units.length; u++) {
        var sections = units[u].sections || [];
        for (var s = 0; s < sections.length; s++) {
          var qs = sections[s].questions || [];
          for (var q = 0; q < qs.length; q++) {
            var opts = qs[q].options || [];
            var correctIdx = qs[q].correct;
            var ans = opts[correctIdx];
            if (!ans || typeof ans !== 'string') continue;
            if (/[.?!]/.test(ans)) continue;
            var k = ans.trim().toLowerCase();
            if (k.length === 0 || seen.has(k)) continue;
            seen.add(k);
            out.push(ans);
          }
        }
      }
    } catch (err) { report('vocab.deckStore.getBuiltinCorrectAnswers', err); }
    return out;
  }

  function appendAnswerEvent(deckId, itemId, payload) {
    var record = {
      ts: Date.now(),
      correct: !!payload.correct,
      direction: payload.direction === 'translationToTerm' ? 'translationToTerm' : 'termToTranslation',
      mode: payload.mode === 'review' ? 'review' : 'quiz',
    };
    var ref = db().ref(vocabRoot() + '/events/' + deckId + '/' + itemId).push();
    return ref.set(record).then(function () { return { eventId: ref.key, ts: record.ts }; })
      .catch(function (err) { report('vocab.deckStore.appendAnswerEvent', err); throw err; });
  }

  function getEvents(deckId, itemId) {
    return db().ref(vocabRoot() + '/events/' + deckId + '/' + itemId).orderByKey().once('value').then(function (snap) {
      var val = snap.val() || {};
      var keys = Object.keys(val).sort();
      return keys.map(function (k) { return val[k]; });
    }).catch(function (err) { report('vocab.deckStore.getEvents', err); throw err; });
  }

  // --- reviewState cache (T026) ----------------------------------------------

  function readReviewStateCache(deckId) {
    var path = vocabRoot() + '/reviewState' + (deckId ? '/' + deckId : '');
    return db().ref(path).once('value').then(function (snap) { return snap.val() || {}; })
      .catch(function (err) { report('vocab.deckStore.readReviewStateCache', err); throw err; });
  }

  function writeReviewStateCache(deckId, itemId, state) {
    var record = {
      interval: state.interval || 0,
      ease: state.ease || 2.5,
      streak: state.streak || 0,
      dueDate: state.dueDate || '9999-12-31',
      lastSeen: state.lastSeen || 0,
      totalSeen: state.totalSeen || 0,
    };
    return db().ref(vocabRoot() + '/reviewState/' + deckId + '/' + itemId).set(record)
      .catch(function (err) { report('vocab.deckStore.writeReviewStateCache', err); throw err; });
  }

  // Re-derive + rewrite the cache for one item. Called after every answer.
  function refreshReviewState(deckId, itemId) {
    var srs = global.vocabSrsScheduler;
    return getEvents(deckId, itemId).then(function (events) {
      var state = srs.deriveReviewRecord(events);
      return writeReviewStateCache(deckId, itemId, state).then(function () { return state; });
    });
  }

  // --- Due items query (T027) ------------------------------------------------

  function listDueItems(options) {
    options = options || {};
    var deckFilter = options.deckId || null;
    var today = (global.vocabSrsScheduler || {}).todayLocalYmd ? global.vocabSrsScheduler.todayLocalYmd() : null;

    return Promise.all([
      readReviewStateCache(null),
      db().ref(vocabRoot() + '/items').once('value').then(function (s) { return s.val() || {}; }),
    ]).then(function (results) {
      var cache = results[0];
      var allItems = results[1];
      var out = [];
      var missingCaches = [];

      Object.keys(allItems).forEach(function (deckId) {
        if (deckFilter && deckId !== deckFilter) return;
        var itemsInDeck = allItems[deckId] || {};
        var cacheForDeck = (cache && cache[deckId]) || {};
        Object.keys(itemsInDeck).forEach(function (itemId) {
          var it = itemsInDeck[itemId];
          var state = cacheForDeck[itemId];
          if (!state) {
            // Self-heal missing cache entry from events.
            missingCaches.push({ deckId: deckId, itemId: itemId });
            return;
          }
          if (state.dueDate && state.dueDate <= today) {
            out.push({
              deckId: deckId, itemId: itemId,
              term: it.term, translation: it.translation, extras: it.extras || {},
              reviewState: state,
            });
          }
        });
      });

      // Best-effort self-heal — derive missing caches so the next call is fast.
      var healPromises = missingCaches.map(function (k) {
        return refreshReviewState(k.deckId, k.itemId).then(function (state) {
          if (state.dueDate && state.dueDate <= today) {
            var it = allItems[k.deckId][k.itemId];
            out.push({
              deckId: k.deckId, itemId: k.itemId,
              term: it.term, translation: it.translation, extras: it.extras || {},
              reviewState: state,
            });
          }
        }).catch(function () { /* swallow; this is a cache refresh */ });
      });

      return Promise.all(healPromises).then(function () {
        out.sort(function (a, b) {
          var cmp = global.vocabSrsScheduler.compareOverdue(a.reviewState, b.reviewState);
          return cmp;
        });
        return out;
      });
    }).catch(function (err) { report('vocab.deckStore.listDueItems', err); throw err; });
  }

  // --- Export (T033) ---------------------------------------------------------

  function csvEscape(v) {
    var s = String(v == null ? '' : v);
    if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0 || s.indexOf('\r') >= 0) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function exportDeckToCsv(deckId) {
    return Promise.all([listDecks(), getItems(deckId)]).then(function (results) {
      var deck = (results[0] || []).find(function (d) { return d.deckId === deckId; });
      var items = results[1] || [];
      var extraKeys = [];
      var seen = new Set();
      items.forEach(function (it) {
        Object.keys(it.extras || {}).forEach(function (k) {
          if (!seen.has(k)) { seen.add(k); extraKeys.push(k); }
        });
      });
      var header = ['term', 'translation'].concat(extraKeys);
      var lines = [header.map(csvEscape).join(',')];
      items.forEach(function (it) {
        var row = [it.term, it.translation];
        extraKeys.forEach(function (k) { row.push((it.extras && it.extras[k]) || ''); });
        lines.push(row.map(csvEscape).join(','));
      });
      return { deckName: deck ? deck.name : 'deck', csv: lines.join('\n') + '\n' };
    });
  }

  global.vocabDeckStore = {
    getCurrentUserId: getCurrentUserId,
    requireAuth: requireAuth,
    vocabRoot: vocabRoot,
    listDecks: listDecks,
    createDeck: createDeck,
    renameDeck: renameDeck,
    deleteDeck: deleteDeck,
    getItems: getItems,
    listDeckTerms: listDeckTerms,
    addItems: addItems,
    listAllUserItems: listAllUserItems,
    getBuiltinCorrectAnswers: getBuiltinCorrectAnswers,
    appendAnswerEvent: appendAnswerEvent,
    getEvents: getEvents,
    readReviewStateCache: readReviewStateCache,
    writeReviewStateCache: writeReviewStateCache,
    refreshReviewState: refreshReviewState,
    listDueItems: listDueItems,
    exportDeckToCsv: exportDeckToCsv,
  };
})(window);
