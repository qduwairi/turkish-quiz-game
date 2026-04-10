const LETTERS = ["a", "b", "c", "d"];
const EXIT_DURATION = 400;

let quizData = [];
let current = 0;
let score = 0;
let answered = false;
let isFlaggedMode = false;
let flaggedCache = [];

// Retry phase state (spec 007-retry-wrong-cards)
let wrongCards = [];   // cards missed in main pass
let retryMode = false; // true once retry phase is active
let retryQueue = [];   // FIFO: shift on correct, push on wrong

// Explainer state
let explainerCache = null;   // { explanation, hasWarning } or null
let explainerLoading = false;
let explainerExpanded = false;
let explainerAborted = false;

const $ = (id) => document.getElementById(id);

// ── Theme Toggle ──

function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme') || 'dark';
  var next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeBtn();
}

function updateThemeBtn() {
  var btn = $('theme-toggle');
  if (!btn) return;
  var theme = document.documentElement.getAttribute('data-theme') || 'dark';
  btn.innerHTML = theme === 'dark' ? '&#9788;' : '&#127769;';
  btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
}

// ── Sound Engine ──

let audioCtx = null;
const soundBuffers = {};

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function preloadSounds() {
  const files = { correct: "sounds/correct.wav", wrong: "sounds/wrong.wav", complete: "sounds/complete.wav" };
  Object.entries(files).forEach(([id, url]) => {
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((buf) => getAudioContext().decodeAudioData(buf))
      .then((decoded) => { soundBuffers[id] = decoded; })
      .catch(() => {});
  });
}

function playSound(id) {
  if (isMuted()) return;
  const buffer = soundBuffers[id];
  if (!buffer) return;
  try {
    const ctx = getAudioContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch (e) {}
}

function isMuted() {
  return localStorage.getItem("sound-muted") === "true";
}

function setMuted(muted) {
  localStorage.setItem("sound-muted", muted ? "true" : "false");
}

function toggleMute() {
  const muted = !isMuted();
  setMuted(muted);
  updateMuteBtn();
  if (!muted && !audioCtx) preloadSounds();
}

function updateMuteBtn() {
  const btn = $("sound-toggle");
  if (!btn) return;
  btn.innerHTML = isMuted() ? "&#128263;" : "&#128266;";
  btn.title = isMuted() ? "Unmute sounds" : "Mute sounds";
}

// ── Flagged Cards (Firebase) ──

function initFlaggedSync() {
  db.ref("flagged").on("value", (snapshot) => {
    flaggedCache = snapshot.val() || [];
    updateFlaggedDeck();
    renderSidebarCounts();
    if (!document.querySelector("#quiz-screen.hidden") && quizData.length > 0) {
      updateFlagBtn();
    }
  });
}

function getFlagged() {
  return flaggedCache;
}

function saveFlagged(arr) {
  flaggedCache = arr;
  db.ref("flagged").set(arr);
}

function isFlagged(questionText) {
  return flaggedCache.some(c => c.question === questionText);
}

// Compose the effective card list for a deck, excluding any card currently
// in flaggedCache (suspended). Pure read of unit + flaggedCache.
function availableCardsForDeck(unit, deck) {
  return deck.sections.flatMap((si) => {
    const section = unit.sections[si];
    return section.questions.map((q) => ({ ...q, category: section.name }));
  }).filter((q) => !isFlagged(q.question));
}

function toggleFlag() {
  const data = currentCard();
  const flagged = [...flaggedCache];
  const idx = flagged.findIndex(c => c.question === data.question);
  const wasFlagged = idx >= 0;
  if (wasFlagged) {
    flagged.splice(idx, 1);
  } else {
    flagged.push({ question: data.question, options: data.options, correct: data.correct, category: data.category });
  }
  saveFlagged(flagged);
  updateFlagBtn();
  updateFlaggedDeck();

  // Mid-session drop: if the user just flagged the current card during a normal
  // deck session, remove it from the in-progress queue and advance (spec FR-003).
  // In Flagged Cards mode, never mutate quizData — unflag takes effect on next
  // session start only (spec FR-005a).
  if (!wasFlagged && !isFlaggedMode) {
    if (retryMode) {
      retryQueue = retryQueue.filter(c => c !== data);
      updateRetryProgress();
      if (retryQueue.length === 0) {
        finishRetrySession();
      } else {
        showQuestion();
      }
    } else {
      quizData.splice(current, 1);
      if (quizData.length === 0 || current >= quizData.length) {
        endOfMainPass();
      } else {
        showQuestion();
      }
    }
  }
}

function updateFlagBtn() {
  const btn = $("flag-btn");
  const data = currentCard();
  if (isFlagged(data.question)) {
    btn.innerHTML = "&#9733;";
    btn.classList.add("active");
  } else {
    btn.innerHTML = "&#9734;";
    btn.classList.remove("active");
  }
}

function updateFlaggedDeck() {
  const count = getFlagged().length;
  const section = $("flagged-section");
  $("flagged-count").textContent = `${count} card${count !== 1 ? "s" : ""}`;
  if (count > 0) section.classList.remove("hidden");
  else section.classList.add("hidden");
}

function startFlaggedQuiz() {
  const flagged = getFlagged();
  if (flagged.length === 0) return;

  hideDeckEmptyState();
  isFlaggedMode = true;
  setActiveDeck(null);
  $("flagged-deck-btn").classList.add("active");

  quizData = shuffle([...flagged]);
  $("quiz-title").textContent = "Flagged Cards";
  $("start-screen").classList.add("hidden");
  $("results-screen").classList.add("hidden");
  $("quiz-screen").classList.remove("hidden");
  $("results-bar").style.width = "0%";
  current = 0;
  score = 0;
  answered = false;
  wrongCards = [];
  retryMode = false;
  retryQueue = [];
  $("retry-banner").classList.add("hidden");
  $("retry-progress").classList.add("hidden");
  $("progress-row").classList.remove("hidden");
  $("question-layout").classList.remove("hidden");
  updateScore();
  showQuestion();
  closeSidebar();
}


function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Retry Phase (spec 007-retry-wrong-cards) ──

function currentCard() {
  return retryMode ? retryQueue[0] : quizData[current];
}

function updateRetryProgress() {
  $("retry-progress-count").textContent = retryQueue.length;
}

function endOfMainPass() {
  if (isFlaggedMode || wrongCards.length === 0) {
    showResults();
  } else {
    enterRetryPhase();
  }
}

function enterRetryPhase() {
  retryMode = true;
  retryQueue = shuffle(wrongCards.slice());
  $("question-layout").classList.add("hidden");
  $("progress-row").classList.add("hidden");
  $("score-display").textContent = "Retry";
  $("retry-banner-count").textContent = retryQueue.length;
  $("retry-banner").classList.remove("hidden");
  const btn = $("retry-continue-btn");
  if (btn) btn.focus();
}

function exitRetryBanner() {
  $("retry-banner").classList.add("hidden");
  $("retry-progress").classList.remove("hidden");
  updateRetryProgress();
  $("question-layout").classList.remove("hidden");
  showQuestion();
}

function finishRetrySession() {
  retryMode = false;
  retryQueue = [];
  wrongCards = [];
  $("retry-progress").classList.add("hidden");
  $("progress-row").classList.remove("hidden");
  updateScore();
  showResults();
}

function init() {
  const nav = $("sidebar-nav");
  let currentLevel = "";
  units.forEach((unit) => {
    const level = unit.id.split("-")[0].toUpperCase();
    if (level !== currentLevel) {
      currentLevel = level;
      const header = document.createElement("div");
      header.className = "sidebar-level-header";
      header.textContent = level;
      nav.appendChild(header);
    }

    const totalQuestions = unit.sections.reduce((sum, s) => sum + s.questions.length, 0);
    const decks = unit.decks || [{ name: unit.name, sections: unit.sections.map((_, i) => i) }];

    // Unit header (collapsible)
    const unitHeader = document.createElement("button");
    unitHeader.className = "sidebar-unit-header";
    unitHeader.id = `unit-header-${unit.id}`;
    unitHeader.innerHTML = `<div class="sidebar-unit-header-text"><span class="sidebar-unit-header-name">${unit.name}</span><span class="sidebar-unit-header-meta">${decks.length} deck${decks.length !== 1 ? "s" : ""} · ${totalQuestions} questions</span></div><span class="sidebar-unit-chevron">&#9656;</span>`;
    unitHeader.addEventListener("click", () => toggleUnit(unit.id));
    nav.appendChild(unitHeader);

    // Deck container (hidden by default)
    const decksContainer = document.createElement("div");
    decksContainer.className = "sidebar-unit-decks";
    decksContainer.id = `unit-decks-${unit.id}`;

    decks.forEach((deck, di) => {
      const deckQuestions = deck.sections.reduce((sum, si) => sum + unit.sections[si].questions.length, 0);
      const btn = document.createElement("button");
      btn.className = "sidebar-deck";
      btn.id = `deck-${unit.id}-${di}`;
      btn.innerHTML = `<span class="sidebar-deck-name">${deck.name}</span><span class="sidebar-deck-meta">${deckQuestions} questions</span>`;
      btn.addEventListener("click", () => startQuiz(unit, di));
      decksContainer.appendChild(btn);
    });

    nav.appendChild(decksContainer);
  });
  initFlaggedSync();
  renderSidebarCounts();
  updateThemeBtn();
  updateMuteBtn();
  if (!isMuted()) {
    document.addEventListener("click", function initAudio() {
      preloadSounds();
      document.removeEventListener("click", initAudio);
    }, { once: true });
  }
}

// Recompute and update sidebar deck/unit count labels to reflect the current
// suspension state (flaggedCache). Does NOT rebuild DOM or detach listeners.
function renderSidebarCounts() {
  units.forEach((unit) => {
    const decks = unit.decks || [{ name: unit.name, sections: unit.sections.map((_, i) => i) }];
    let unitTotal = 0;
    decks.forEach((deck, di) => {
      const available = availableCardsForDeck(unit, deck).length;
      unitTotal += available;
      const deckBtn = $(`deck-${unit.id}-${di}`);
      if (deckBtn) {
        const meta = deckBtn.querySelector(".sidebar-deck-meta");
        if (meta) meta.textContent = `${available} questions`;
      }
    });
    const unitHeader = $(`unit-header-${unit.id}`);
    if (unitHeader) {
      const meta = unitHeader.querySelector(".sidebar-unit-header-meta");
      if (meta) meta.textContent = `${decks.length} deck${decks.length !== 1 ? "s" : ""} · ${unitTotal} questions`;
    }
  });
}

function toggleUnit(unitId) {
  const header = $(`unit-header-${unitId}`);
  const container = $(`unit-decks-${unitId}`);
  const isOpen = container.classList.contains("open");
  if (isOpen) {
    container.classList.remove("open");
    header.classList.remove("expanded");
  } else {
    container.classList.add("open");
    header.classList.add("expanded");
  }
}

function setActiveDeck(deckId) {
  document.querySelectorAll(".sidebar-deck").forEach((btn) => btn.classList.remove("active"));
  if (deckId) {
    const el = $(deckId);
    if (el) el.classList.add("active");
  }
}

function startQuiz(unit, deckIndex) {
  const decks = unit.decks || [{ name: unit.name, sections: unit.sections.map((_, i) => i) }];
  const deck = decks[deckIndex != null ? deckIndex : 0];
  const deckId = `deck-${unit.id}-${deckIndex != null ? deckIndex : 0}`;

  // Filter suspended (flagged) cards before composing the session.
  const available = availableCardsForDeck(unit, deck);

  // Empty-deck short-circuit: every card in this deck is currently flagged.
  // Do not switch screens or reset quiz state; surface a message and let the
  // user pick another deck from the still-open sidebar.
  if (available.length === 0) {
    showDeckEmptyState(deck);
    return;
  }

  // Success path: entering a real session — clear any lingering empty-state msg.
  hideDeckEmptyState();

  isFlaggedMode = false;
  $("flagged-deck-btn").classList.remove("active");
  setActiveDeck(deckId);

  quizData = shuffle(available);

  $("quiz-title").textContent = deck.name;
  $("start-screen").classList.add("hidden");
  $("results-screen").classList.add("hidden");
  $("quiz-screen").classList.remove("hidden");
  $("results-bar").style.width = "0%";
  current = 0;
  score = 0;
  answered = false;
  wrongCards = [];
  retryMode = false;
  retryQueue = [];
  $("retry-banner").classList.add("hidden");
  $("retry-progress").classList.add("hidden");
  $("progress-row").classList.remove("hidden");
  $("question-layout").classList.remove("hidden");
  updateScore();
  showQuestion();

  closeSidebar();
}

function showDeckEmptyState(deck) {
  const el = $("deck-empty-msg");
  if (!el) return;
  el.textContent = `All cards in "${deck.name}" are flagged. Review them in the Flagged Cards section.`;
  el.classList.remove("hidden");
}

function hideDeckEmptyState() {
  const el = $("deck-empty-msg");
  if (!el) return;
  el.classList.add("hidden");
  el.textContent = "";
}

function updateScore() {
  $("score-display").textContent = `Score: ${score}`;
}

function updateProgress() {
  const pct = (current / quizData.length) * 100;
  $("progress-fill").style.width = `${pct}%`;
  $("progress-fraction").innerHTML = `${current + 1} <span>/ ${quizData.length}</span>`;
}

function showQuestion() {
  answered = false;
  const data = currentCard();
  const layout = $("question-layout");

  if (retryMode) {
    $("q-watermark").textContent = String(retryQueue.length).padStart(2, "0");
  } else {
    $("q-watermark").textContent = String(current + 1).padStart(2, "0");
  }
  $("q-category").textContent = data.category;
  $("q-text").textContent = data.question;
  $("feedback").classList.add("hidden");
  $("next-btn").classList.add("hidden");

  // Reset explainer state
  explainerAborted = true;
  explainerCache = null;
  explainerLoading = false;
  explainerExpanded = false;
  $("why-btn").classList.add("hidden");
  $("explainer-section").classList.remove("visible", "explainer-warning");
  $("explainer-text").classList.add("hidden");
  $("explainer-text").textContent = "";
  $("explainer-loading").classList.add("hidden");

  const list = $("options-list");
  list.innerHTML = "";

  // Shuffle options while tracking the correct answer
  const indexed = data.options.map((opt, i) => ({ opt, orig: i }));
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }
  data._shuffledCorrect = indexed.findIndex(o => o.orig === data.correct);

  indexed.forEach((item, i) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.innerHTML = `<span class="option-letter">${LETTERS[i]})</span><span>${item.opt}</span>`;
    btn.addEventListener("click", () => selectAnswer(i));
    list.appendChild(btn);
  });

  layout.classList.remove("exit");
  layout.classList.add("enter");
  setTimeout(() => layout.classList.remove("enter"), 500);
  if (!retryMode) updateProgress();
  updateFlagBtn();
}

function selectAnswer(index) {
  if (answered) return;
  answered = true;

  const data = currentCard();
  const buttons = document.querySelectorAll(".option-btn");
  const feedback = $("feedback");
  const correctIndex = data._shuffledCorrect;
  const isCorrect = index === correctIndex;

  if (isCorrect) {
    if (!retryMode) {
      score++;
      updateScore();
    }
    playSound("correct");
    if (navigator.vibrate) navigator.vibrate(50);

    // Skip all animation — jump to next question instantly
    if (retryMode) {
      retryQueue.shift();
      updateRetryProgress();
      if (retryQueue.length === 0) {
        finishRetrySession();
      } else {
        showQuestion();
      }
    } else if (current < quizData.length - 1) {
      current++;
      showQuestion();
    } else {
      endOfMainPass();
    }
    return;
  } else {
    if (!retryMode) {
      wrongCards.push(data);
    }
    playSound("wrong");
    buttons[index].classList.add("wrong");
    buttons.forEach((btn, i) => {
      if (i === correctIndex) btn.classList.add("reveal-correct");
    });
    feedback.textContent = `The answer was: ${data.options[data.correct]}`;
    feedback.className = "feedback wrong-fb";
  }

  buttons.forEach((btn, i) => {
    if (i !== index && i !== data.correct) btn.classList.add("disabled");
  });

  $("why-btn").classList.remove("hidden");
  $("next-btn").classList.remove("hidden");
}

function handleWhyClick() {
  var section = $("explainer-section");
  var textEl = $("explainer-text");
  var loadingEl = $("explainer-loading");

  // Toggle: if cached and visible, collapse (US2)
  if (explainerCache && explainerExpanded) {
    section.classList.remove("visible");
    explainerExpanded = false;
    return;
  }

  // Toggle: if cached and hidden, re-expand without new API call (US2)
  if (explainerCache && !explainerExpanded) {
    section.classList.add("visible");
    explainerExpanded = true;
    return;
  }

  // Debounce: if already loading, ignore
  if (explainerLoading) return;

  // Fetch explanation from Cloud Function
  explainerLoading = true;
  explainerAborted = false;
  loadingEl.classList.remove("hidden");
  textEl.classList.add("hidden");
  textEl.textContent = "";
  section.classList.add("visible");
  section.classList.remove("explainer-warning");
  explainerExpanded = true;

  var data = currentCard();
  var requestGeneration = current; // track which question this request is for

  // 10-second client-side timeout
  var timedOut = false;
  var timeoutId = setTimeout(function () {
    timedOut = true;
    explainerLoading = false;
    loadingEl.classList.add("hidden");
    textEl.innerHTML = '<span class="explainer-error">Timed out. Tap Why? to retry.</span>';
    textEl.classList.remove("hidden");
  }, 10000);

  fetch("/api/explain-answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: data.question,
      options: data.options,
      correct: data.correct
    })
  }).then(function (res) {
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }).then(function (result) {
    clearTimeout(timeoutId);
    if (timedOut || explainerAborted) return;

    explainerLoading = false;
    explainerCache = result;
    loadingEl.classList.add("hidden");
    textEl.textContent = result.explanation;
    textEl.classList.remove("hidden");

    // US3: warning styling
    if (result.hasWarning) {
      section.classList.add("explainer-warning");
    }
  }).catch(function (err) {
    clearTimeout(timeoutId);
    if (timedOut || explainerAborted) return;

    explainerLoading = false;
    loadingEl.classList.add("hidden");
    textEl.innerHTML = '<span class="explainer-error">Could not load explanation. Tap Why? to retry.</span>';
    textEl.classList.remove("hidden");
  });
}

function advanceQuestion() {
  if (retryMode) {
    // Wrong answer in retry phase: send the missed card to the end of the
    // queue so the learner cycles through all other remaining retry cards
    // before seeing it again (FR-013).
    const missed = retryQueue.shift();
    retryQueue.push(missed);
    updateRetryProgress();
    $("question-layout").classList.add("exit");
    setTimeout(() => {
      showQuestion();
    }, EXIT_DURATION);
    return;
  }
  if (current < quizData.length - 1) {
    $("question-layout").classList.add("exit");
    setTimeout(() => {
      current++;
      showQuestion();
    }, EXIT_DURATION);
  } else {
    $("question-layout").classList.add("exit");
    setTimeout(() => {
      endOfMainPass();
    }, EXIT_DURATION);
  }
}

function showResults() {
  playSound("complete");
  $("quiz-screen").classList.add("hidden");
  $("results-screen").classList.remove("hidden");

  const pct = Math.round((score / quizData.length) * 100);
  $("final-score-num").textContent = score;
  $("final-score-total").textContent = ` / ${quizData.length}`;

  setTimeout(() => {
    $("results-bar").style.width = `${pct}%`;
  }, 100);

  let msg;
  if (pct === 100) msg = "A perfect score. You have an excellent grasp of Turkish.";
  else if (pct >= 80) msg = "Very well done. Just a small slip.";
  else if (pct >= 60) msg = "A respectable showing. Keep at it.";
  else if (pct >= 40) msg = "There\u2019s room to grow. Practice makes perfect.";
  else msg = "A humble beginning. The journey continues.";

  $("results-message").textContent = msg;
}

function backToUnits() {
  $("results-screen").classList.add("hidden");
  $("results-bar").style.width = "0%";
  $("start-screen").classList.remove("hidden");
  hideDeckEmptyState();
  setActiveDeck(null);
  isFlaggedMode = false;
  wrongCards = [];
  retryMode = false;
  retryQueue = [];
  $("retry-banner").classList.add("hidden");
  $("retry-progress").classList.add("hidden");
  $("progress-row").classList.remove("hidden");
  $("flagged-deck-btn").classList.remove("active");
  updateFlaggedDeck();
}

function toggleSidebar() {
  $("sidebar").classList.toggle("open");
  $("sidebar-overlay").classList.toggle("open");
  $("sidebar-overlay").classList.toggle("hidden");
}

function closeSidebar() {
  $("sidebar").classList.remove("open");
  $("sidebar-overlay").classList.remove("open");
  $("sidebar-overlay").classList.add("hidden");
}

init();
