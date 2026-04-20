// Vocabulary feature (009) — DOM rendering for Upload, My Decks, Quiz, and Review views.
// Top-level sidebar click router and view-switcher live here.

(function (global) {
  'use strict';

  var NAV_IDS = { upload: 'vocab-nav-upload', decks: 'vocab-nav-decks', review: 'vocab-nav-review' };
  var SCREEN_ID = 'vocab-screen';
  var ACTIVE_CLASS = 'active';

  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.indexOf('on') === 0 && typeof attrs[k] === 'function') node.addEventListener(k.substring(2), attrs[k]);
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function hideBuiltinScreens() {
    ['start-screen', 'quiz-screen', 'results-screen'].forEach(function (id) {
      var e = $(id); if (e) e.classList.add('hidden');
    });
  }

  function clearActiveNav() {
    Object.keys(NAV_IDS).forEach(function (k) {
      var e = $(NAV_IDS[k]); if (e) e.classList.remove(ACTIVE_CLASS);
    });
  }

  function setActiveNav(key) {
    clearActiveNav();
    var e = $(NAV_IDS[key]); if (e) e.classList.add(ACTIVE_CLASS);
  }

  function screen() { return $(SCREEN_ID); }
  function showScreen() { var s = screen(); if (s) s.classList.remove('hidden'); }
  function clearScreen() { var s = screen(); if (s) s.innerHTML = ''; }

  // ---------------------------------------------------------------------------
  // Upload view (T014)
  // ---------------------------------------------------------------------------
  function renderUpload() {
    hideBuiltinScreens(); setActiveNav('upload'); clearScreen(); showScreen();
    var s = screen();
    s.appendChild(el('h1', { text: 'Upload CSV' }));
    s.appendChild(el('p', { class: 'vocab-subtitle', text: 'Upload a CSV of term / translation pairs to build a new vocabulary deck.' }));

    var fileInput = el('input', { type: 'file', accept: '.csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain', id: 'vocab-file-input' });
    var dropBtn = el('button', { class: 'vocab-dropzone-btn', type: 'button', text: 'Choose file' });
    dropBtn.addEventListener('click', function () { fileInput.click(); });

    var dropzone = el('div', { class: 'vocab-dropzone', id: 'vocab-dropzone' }, [
      el('div', { text: 'Drop a CSV file here or click to choose one.' }),
      dropBtn,
      fileInput,
    ]);
    s.appendChild(dropzone);

    ['dragover', 'dragenter'].forEach(function (ev) {
      dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.add('is-dragover'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.remove('is-dragover'); });
    });
    dropzone.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handleFile(f);
    });
    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
    });

    var form = el('div', { id: 'vocab-upload-form', class: 'hidden' });
    s.appendChild(form);
    var summary = el('div', { id: 'vocab-upload-summary' });
    s.appendChild(summary);
  }

  function handleFile(file) {
    var form = $('vocab-upload-form');
    form.innerHTML = '';
    form.classList.remove('hidden');

    var filenameStem = file.name.replace(/\.[^.]+$/, '').trim() || 'Untitled deck';

    var nameInput = el('input', { type: 'text', id: 'vocab-deck-name', value: filenameStem, maxlength: 64, style: 'width:100%;padding:10px;font:inherit;margin-top:4px;' });
    form.appendChild(el('label', { for: 'vocab-deck-name', style: 'display:block;margin-top:16px;font-weight:600;' }, ['Deck name']));
    form.appendChild(nameInput);

    var modeWrap = el('div', { style: 'margin-top:16px;' });
    modeWrap.appendChild(el('div', { style: 'font-weight:600;margin-bottom:6px;', text: 'Where should this go?' }));
    var newRadio = el('input', { type: 'radio', name: 'vocab-upload-mode', value: 'new', id: 'vocab-mode-new', checked: 'checked' });
    var appendRadio = el('input', { type: 'radio', name: 'vocab-upload-mode', value: 'append', id: 'vocab-mode-append' });
    modeWrap.appendChild(el('label', { style: 'display:block;padding:6px 0;min-height:32px;' }, [newRadio, ' Create a new deck']));
    var appendLabel = el('label', { style: 'display:block;padding:6px 0;min-height:32px;' }, [appendRadio, ' Append to existing deck']);
    modeWrap.appendChild(appendLabel);
    var existingSelect = el('select', { id: 'vocab-existing-deck', class: 'hidden', style: 'margin-left:24px;padding:8px;font:inherit;' });
    modeWrap.appendChild(existingSelect);
    form.appendChild(modeWrap);

    global.vocabDeckStore.listDecks().then(function (decks) {
      if (decks.length === 0) {
        appendLabel.style.display = 'none';
      } else {
        decks.forEach(function (d) {
          existingSelect.appendChild(el('option', { value: d.deckId, text: d.name + ' (' + d.itemCount + ' items)' }));
        });
      }
    });

    appendRadio.addEventListener('change', function () {
      existingSelect.classList.toggle('hidden', !appendRadio.checked);
      nameInput.disabled = appendRadio.checked;
    });
    newRadio.addEventListener('change', function () {
      existingSelect.classList.toggle('hidden', !appendRadio.checked);
      nameInput.disabled = false;
    });

    var progress = el('div', { class: 'vocab-progress hidden', id: 'vocab-progress' }, [el('div', { class: 'vocab-progress-fill' })]);
    form.appendChild(progress);

    var submit = el('button', { class: 'vocab-dropzone-btn', style: 'margin-top:16px;', text: 'Import' });
    form.appendChild(submit);

    submit.addEventListener('click', function () {
      submit.disabled = true;
      runImport(file, {
        mode: appendRadio.checked ? 'append' : 'new',
        deckName: nameInput.value,
        existingDeckId: existingSelect.value,
      }).catch(function (err) {
        showSummary({ fileError: 'unexpected_error', errorMessage: err && err.message });
      }).finally(function () { submit.disabled = false; });
    });
  }

  function runImport(file, opts) {
    return file.text().then(function (text) {
      var mode = opts.mode;
      var deckName = (opts.deckName || '').trim();

      // Quick pre-scan to decide whether to show the progress bar.
      var lineCount = (text.match(/\n/g) || []).length;
      if (lineCount > 200) {
        var p = $('vocab-progress'); if (p) p.classList.remove('hidden');
      }

      function doImport(targetDeckId) {
        return global.vocabDeckStore.listDeckTerms(targetDeckId).then(function (existing) {
          var result = global.vocabCsvImport.importCsv(text, { existingTerms: existing });
          if (result.fileError) {
            showSummary(result);
            return;
          }
          return global.vocabDeckStore.addItems(targetDeckId, result.accepted).then(function () {
            return global.vocabDeckStore.listDecks().then(function (decks) {
              var current = decks.find(function (d) { return d.deckId === targetDeckId; });
              showSummary(result, current);
            });
          });
        });
      }

      if (mode === 'append') {
        return doImport(opts.existingDeckId);
      }
      return global.vocabDeckStore.createDeck(deckName).then(function (deck) {
        return doImport(deck.deckId);
      }).catch(function (err) {
        showSummary({ fileError: err.code || 'create_failed', errorMessage: err.message });
      });
    });
  }

  function showSummary(result, deck) {
    var s = $('vocab-upload-summary');
    s.innerHTML = '';
    var div = el('div', { class: 'vocab-import-summary' + ((result.fileError || (result.skipped && result.skipped.length > 0)) ? ' has-errors' : '') });
    if (result.fileError) {
      div.appendChild(el('strong', { text: 'Import failed.' }));
      div.appendChild(el('div', { text: fileErrorMessage(result.fileError, result.errorMessage) }));
      s.appendChild(div);
      return;
    }
    var header = 'Accepted ' + result.accepted.length + ' row' + (result.accepted.length === 1 ? '' : 's');
    if (deck) header += ' into "' + deck.name + '" (total ' + deck.itemCount + ' items)';
    div.appendChild(el('strong', { text: header }));
    if (result.skipped && result.skipped.length > 0) {
      var byReason = {};
      result.skipped.forEach(function (r) { (byReason[r.reason] = byReason[r.reason] || []).push(r.rowNumber); });
      var ul = el('ul');
      Object.keys(byReason).forEach(function (reason) {
        var rows = byReason[reason];
        var preview = rows.slice(0, 5).join(', ') + (rows.length > 5 ? ', …' : '');
        ul.appendChild(el('li', { text: prettyReason(reason) + ' — ' + rows.length + ' row(s) (row#: ' + preview + ')' }));
      });
      div.appendChild(ul);
    }
    var ctaWrap = el('div', { style: 'margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;' });
    if (deck) {
      var quizBtn = el('button', { class: 'vocab-dropzone-btn', text: 'Start a quiz' });
      quizBtn.addEventListener('click', function () { renderQuiz(deck.deckId); });
      ctaWrap.appendChild(quizBtn);
    }
    var anotherBtn = el('button', { class: 'vocab-dropzone-btn', text: 'Import another file' });
    anotherBtn.addEventListener('click', renderUpload);
    ctaWrap.appendChild(anotherBtn);
    var decksBtn = el('button', { class: 'vocab-dropzone-btn', text: 'Go to My Decks' });
    decksBtn.addEventListener('click', renderDeckList);
    ctaWrap.appendChild(decksBtn);
    div.appendChild(ctaWrap);
    s.appendChild(div);
  }

  function prettyReason(code) {
    return ({
      empty_row: 'Empty rows',
      missing_required_field: 'Missing term or translation',
      duplicate_within_file: 'Duplicate within this file',
      duplicate_in_deck: 'Already in the deck',
      too_long: 'Term or translation longer than 200 chars',
    })[code] || code;
  }
  function fileErrorMessage(code, detail) {
    return ({
      too_many_rows: 'File has more than 2,000 rows. Please split it into smaller files.',
      unrecognized_delimiter: 'Could not detect delimiter. Use comma, semicolon, or tab.',
      parse_failed: 'Could not parse the file. Make sure it is UTF-8 CSV.',
      duplicate_deck_name: detail || 'A deck with that name already exists.',
      create_failed: detail || 'Could not create the deck.',
      unexpected_error: detail || 'Unexpected error during import.',
    })[code] || (detail || code);
  }

  // ---------------------------------------------------------------------------
  // My Decks view (T015) + Quiz-button enable (T023)
  // ---------------------------------------------------------------------------
  function renderDeckList() {
    hideBuiltinScreens(); setActiveNav('decks'); clearScreen(); showScreen();
    var s = screen();
    s.appendChild(el('h1', { text: 'My Decks' }));
    s.appendChild(el('p', { class: 'vocab-subtitle', text: 'Your imported vocabulary decks.' }));
    var grid = el('div', { class: 'vocab-deck-grid', id: 'vocab-deck-grid' }, [
      el('div', { text: 'Loading…' }),
    ]);
    s.appendChild(grid);

    global.vocabDeckStore.listDecks().then(function (decks) {
      grid.innerHTML = '';
      if (decks.length === 0) {
        grid.appendChild(el('p', { text: 'No decks yet. Start by uploading a CSV.' }));
        return;
      }
      decks.forEach(function (d) { grid.appendChild(renderDeckCard(d)); });
    });
  }

  function renderDeckCard(deck) {
    var created = new Date(deck.createdAt || 0);
    var card = el('div', { class: 'vocab-deck-card' });
    var title = el('h3', { text: deck.name });
    card.appendChild(title);
    var meta = el('div', { class: 'meta', text: deck.itemCount + ' item' + (deck.itemCount === 1 ? '' : 's') + ' · created ' + created.toLocaleDateString() });
    card.appendChild(meta);

    var actions = el('div', { class: 'actions' });
    var quizBtn = el('button', { type: 'button', text: 'Quiz' });
    quizBtn.disabled = deck.itemCount === 0;
    quizBtn.addEventListener('click', function () { renderQuiz(deck.deckId); });
    actions.appendChild(quizBtn);

    var reviewBtn = el('button', { type: 'button', text: 'Review' });
    reviewBtn.addEventListener('click', function () { renderReview({ deckId: deck.deckId }); });
    actions.appendChild(reviewBtn);

    var renameBtn = el('button', { type: 'button', text: 'Rename' });
    renameBtn.addEventListener('click', function () { inlineRename(card, title, deck); });
    actions.appendChild(renameBtn);

    var exportBtn = el('button', { type: 'button', text: 'Export CSV' });
    exportBtn.addEventListener('click', function () { exportDeck(deck); });
    actions.appendChild(exportBtn);

    var deleteBtn = el('button', { type: 'button', text: 'Delete' });
    deleteBtn.addEventListener('click', function () { confirmDelete(deck); });
    actions.appendChild(deleteBtn);

    card.appendChild(actions);
    return card;
  }

  function inlineRename(card, titleEl, deck) {
    var input = el('input', { type: 'text', value: deck.name, maxlength: 64, style: 'font:inherit;padding:6px;width:100%;' });
    card.replaceChild(input, titleEl);
    input.focus(); input.select();
    var finish = function (commit) {
      if (commit) {
        var newName = input.value.trim();
        if (newName.length === 0 || newName === deck.name) { renderDeckList(); return; }
        global.vocabDeckStore.renameDeck(deck.deckId, newName).then(renderDeckList, function (err) {
          alert(err.message || 'Rename failed'); renderDeckList();
        });
      } else {
        renderDeckList();
      }
    };
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') finish(true);
      else if (e.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', function () { finish(true); });
  }

  function exportDeck(deck) {
    global.vocabDeckStore.exportDeckToCsv(deck.deckId).then(function (out) {
      var safeName = (out.deckName || 'deck').replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '') || 'deck';
      var blob = new Blob(['\uFEFF' + out.csv], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = safeName + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }, function (err) {
      alert('Export failed: ' + (err && err.message ? err.message : err));
    });
  }

  function confirmDelete(deck) {
    var typed = prompt('Deleting "' + deck.name + '" will remove ' + deck.itemCount + ' item(s) and all review history.\nType the deck name to confirm:');
    if (typed == null) return;
    if (typed.trim() !== deck.name) { alert('Name did not match — nothing deleted.'); return; }
    global.vocabDeckStore.deleteDeck(deck.deckId).then(renderDeckList, function (err) {
      alert(err.message || 'Delete failed');
    });
  }

  // ---------------------------------------------------------------------------
  // Quiz view (T022)
  // ---------------------------------------------------------------------------
  function renderQuiz(deckId) {
    hideBuiltinScreens(); clearActiveNav(); clearScreen(); showScreen();
    var s = screen();
    var header = el('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;' });
    var title = el('h1', { text: 'Quiz', style: 'margin:0;' });
    var directionSelect = el('select', { style: 'padding:8px;font:inherit;min-height:44px;' }, [
      el('option', { value: 'termToTranslation', text: 'Term → Translation' }),
      el('option', { value: 'translationToTerm', text: 'Translation → Term' }),
    ]);
    var scoreSpan = el('span', { id: 'vocab-quiz-score', text: 'Score: 0', style: 'font-weight:600;' });
    header.appendChild(title);
    header.appendChild(directionSelect);
    header.appendChild(scoreSpan);
    s.appendChild(header);
    s.appendChild(el('p', { class: 'vocab-subtitle', id: 'vocab-quiz-progress', text: 'Loading…' }));

    var body = el('div', { id: 'vocab-quiz-body' });
    s.appendChild(body);

    function boot(direction) {
      body.innerHTML = '';
      global.vocabSession.startQuizSession(deckId, direction).then(function (session) {
        if (!session || session.empty) {
          body.appendChild(el('p', { text: 'This deck is empty — add some words via Upload CSV.' }));
          return;
        }
        runSession(session, body, scoreSpan);
      });
    }

    directionSelect.addEventListener('change', function () { boot(directionSelect.value); });
    boot('termToTranslation');
  }

  function runSession(session, body, scoreSpan) {
    function render() {
      body.innerHTML = '';
      $('vocab-quiz-progress').textContent = 'Question ' + (session.answered + 1) + ' of ' + session.total;
      var q = session.nextQuestion();
      if (!q) {
        renderEnd(body, session);
        return;
      }
      if (q.blocked) {
        body.appendChild(el('p', { text: 'This deck needs more items — add a few more words before quizzing.' }));
        return;
      }
      var promptEl = el('h2', { text: q.prompt, style: 'margin-top:16px;' });
      body.appendChild(promptEl);
      var optsWrap = el('div', { style: 'display:grid;gap:10px;margin-top:12px;' });
      q.options.forEach(function (opt, idx) {
        var btn = el('button', {
          class: 'vocab-dropzone-btn',
          style: 'width:100%;text-align:left;padding:14px 16px;min-height:48px;',
          text: opt,
        });
        btn.addEventListener('click', function () { handleAnswer(idx, q, optsWrap, body, session, scoreSpan); });
        optsWrap.appendChild(btn);
      });
      body.appendChild(optsWrap);
    }

    function handleAnswer(idx, q, optsWrap, body, session, scoreSpan) {
      Array.prototype.slice.call(optsWrap.children).forEach(function (b, i) {
        b.disabled = true;
        if (i === q.correctIndex) b.style.borderColor = 'var(--green)';
        if (i === idx && idx !== q.correctIndex) b.style.borderColor = 'var(--red)';
      });
      session.submitAnswer(idx).then(function (res) {
        scoreSpan.textContent = 'Score: ' + session.score;
        var fb = el('div', {
          style: 'margin-top:14px;padding:10px 14px;border-radius:6px;' +
                 (res.correct ? 'background:var(--green-light);color:var(--green);' : 'background:var(--red-light);color:var(--red);'),
          text: (res.correct ? '✓ Correct' : '✗ Incorrect — the answer was: ' + q.options[q.correctIndex]),
        });
        body.appendChild(fb);
        var nextBtn = el('button', { class: 'vocab-dropzone-btn', style: 'margin-top:12px;', text: 'Next' });
        nextBtn.addEventListener('click', render);
        body.appendChild(nextBtn);
      });
    }

    render();
  }

  function renderEnd(body, session) {
    $('vocab-quiz-progress').textContent = 'Session complete';
    body.innerHTML = '';
    body.appendChild(el('h2', { text: 'Finished — ' + session.score + ' / ' + session.total }));
    // Wrong answers are already in the review pool automatically (event log drives
    // scheduling); this button just jumps to the Review view.
    var queueBtn = el('button', { class: 'vocab-dropzone-btn', text: 'Go to Review', style: 'margin-right:8px;' });
    queueBtn.addEventListener('click', function () { renderReview({}); });
    body.appendChild(queueBtn);
    var decksBtn = el('button', { class: 'vocab-dropzone-btn', text: 'Back to My Decks' });
    decksBtn.addEventListener('click', renderDeckList);
    body.appendChild(decksBtn);
    refreshReviewBadge();
  }

  // ---------------------------------------------------------------------------
  // Review view (T029) — due items across all decks (or scoped to one)
  // ---------------------------------------------------------------------------
  function renderReview(options) {
    options = options || {};
    hideBuiltinScreens(); setActiveNav('review'); clearScreen(); showScreen();
    var s = screen();
    s.appendChild(el('h1', { text: options.deckId ? 'Review deck' : 'Review' }));
    var subtitle = el('p', { class: 'vocab-subtitle', text: 'Loading due items…' });
    s.appendChild(subtitle);

    var body = el('div', { id: 'vocab-review-body' });
    s.appendChild(body);

    global.vocabDeckStore.listDueItems({ deckId: options.deckId || null }).then(function (due) {
      var today = global.vocabSrsScheduler.todayLocalYmd();
      var overdue = due.filter(function (x) { return x.reviewState.dueDate < today; });
      subtitle.textContent = due.length + ' due today · ' + overdue.length + ' overdue';
      if (due.length === 0) {
        body.innerHTML = '';
        body.appendChild(el('p', { text: 'No items are due right now. Come back tomorrow or quiz a deck to add items to the schedule.' }));
        var back = el('button', { class: 'vocab-dropzone-btn', style: 'margin-top:12px;', text: 'Go to My Decks' });
        back.addEventListener('click', renderDeckList);
        body.appendChild(back);
        return;
      }
      runReviewSession(options, body, subtitle);
    }, function (err) {
      subtitle.textContent = 'Failed to load: ' + (err && err.message ? err.message : err);
    });
  }

  function runReviewSession(options, body, subtitle) {
    global.vocabSession.startReviewSession({ deckId: options.deckId || null }).then(function (session) {
      if (!session || session.empty) {
        body.innerHTML = '';
        body.appendChild(el('p', { text: 'No items are due right now.' }));
        return;
      }
      var scoreSpan = el('span', { text: 'Score: 0', style: 'margin-left:12px;font-weight:600;' });
      subtitle.appendChild(document.createTextNode('  '));
      subtitle.appendChild(scoreSpan);

      function advance() {
        body.innerHTML = '';
        Promise.resolve(session.nextQuestion()).then(function (q) {
          if (!q) {
            body.appendChild(el('h2', { text: 'Review complete — ' + session.score + ' / ' + session.total }));
            var doneBtn = el('button', { class: 'vocab-dropzone-btn', text: 'Back to My Decks' });
            doneBtn.addEventListener('click', renderDeckList);
            body.appendChild(doneBtn);
            refreshReviewBadge();
            return;
          }
          if (q.blocked) {
            body.appendChild(el('p', { text: 'One or more items could not be quizzed (insufficient distractors). Add more words to your decks.' }));
            return;
          }
          body.appendChild(el('h2', { text: q.prompt, style: 'margin-top:16px;' }));
          var optsWrap = el('div', { style: 'display:grid;gap:10px;margin-top:12px;' });
          q.options.forEach(function (opt, idx) {
            var btn = el('button', {
              class: 'vocab-dropzone-btn',
              style: 'width:100%;text-align:left;padding:14px 16px;min-height:48px;',
              text: opt,
            });
            btn.addEventListener('click', function () {
              Array.prototype.slice.call(optsWrap.children).forEach(function (b, i) {
                b.disabled = true;
                if (i === q.correctIndex) b.style.borderColor = 'var(--green)';
                if (i === idx && idx !== q.correctIndex) b.style.borderColor = 'var(--red)';
              });
              session.submitAnswer(idx).then(function (res) {
                scoreSpan.textContent = 'Score: ' + session.score;
                var fb = el('div', {
                  style: 'margin-top:14px;padding:10px 14px;border-radius:6px;' +
                         (res.correct ? 'background:var(--green-light);color:var(--green);' : 'background:var(--red-light);color:var(--red);'),
                  text: (res.correct ? '✓ Correct' : '✗ Incorrect — the answer was: ' + q.options[q.correctIndex]),
                });
                body.appendChild(fb);
                var nextBtn = el('button', { class: 'vocab-dropzone-btn', style: 'margin-top:12px;', text: 'Next' });
                nextBtn.addEventListener('click', advance);
                body.appendChild(nextBtn);
              });
            });
            optsWrap.appendChild(btn);
          });
          body.appendChild(optsWrap);
        });
      }
      advance();
    });
  }

  // Sidebar badge (T030) — cross-deck due count.
  function refreshReviewBadge() {
    var badge = $('vocab-review-badge');
    if (!badge) return;
    global.vocabDeckStore.listDueItems({}).then(function (due) {
      badge.textContent = due.length > 0 ? String(due.length) : '';
    }, function () { /* swallow */ });
  }

  // ---------------------------------------------------------------------------
  // Router
  // ---------------------------------------------------------------------------
  function showView(key) {
    if (key === 'upload') renderUpload();
    else if (key === 'decks') renderDeckList();
    else if (key === 'review') renderReview();
  }

  function bindSidebar() {
    Object.keys(NAV_IDS).forEach(function (key) {
      var node = $(NAV_IDS[key]);
      if (node) node.addEventListener('click', function () { showView(key); });
    });
  }

  function init() {
    if (!$(SCREEN_ID)) return;
    bindSidebar();
    // Populate the sidebar Review badge on initial load.
    if (global.vocabSrsScheduler && global.vocabDeckStore && global.vocabDeckStore.listDueItems) {
      refreshReviewBadge();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  global.vocabUI = {
    showView: showView,
    renderUpload: renderUpload,
    renderDeckList: renderDeckList,
    renderQuiz: renderQuiz,
    renderReview: renderReview,
  };
})(window);
