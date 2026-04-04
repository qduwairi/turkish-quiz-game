const LETTERS = ["a", "b", "c", "d"];
const EXIT_DURATION = 400;

let quizData = [];
let current = 0;
let score = 0;
let answered = false;
let isFlaggedMode = false;
let flaggedCache = [];

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

function toggleFlag() {
  const data = quizData[current];
  const flagged = [...flaggedCache];
  const idx = flagged.findIndex(c => c.question === data.question);
  if (idx >= 0) {
    flagged.splice(idx, 1);
  } else {
    flagged.push({ question: data.question, options: data.options, correct: data.correct, category: data.category });
  }
  saveFlagged(flagged);
  updateFlagBtn();
  updateFlaggedDeck();
}

function updateFlagBtn() {
  const btn = $("flag-btn");
  const data = quizData[current];
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
  updateThemeBtn();
  updateMuteBtn();
  if (!isMuted()) {
    document.addEventListener("click", function initAudio() {
      preloadSounds();
      document.removeEventListener("click", initAudio);
    }, { once: true });
  }
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
  isFlaggedMode = false;
  $("flagged-deck-btn").classList.remove("active");

  const decks = unit.decks || [{ name: unit.name, sections: unit.sections.map((_, i) => i) }];
  const deck = decks[deckIndex != null ? deckIndex : 0];
  const deckId = `deck-${unit.id}-${deckIndex != null ? deckIndex : 0}`;

  setActiveDeck(deckId);

  quizData = shuffle(deck.sections.flatMap((si) => {
    const section = unit.sections[si];
    return section.questions.map((q) => ({ ...q, category: section.name }));
  }));

  $("quiz-title").textContent = deck.name;
  $("start-screen").classList.add("hidden");
  $("results-screen").classList.add("hidden");
  $("quiz-screen").classList.remove("hidden");
  $("results-bar").style.width = "0%";
  current = 0;
  score = 0;
  answered = false;
  updateScore();
  showQuestion();

  closeSidebar();
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
  const data = quizData[current];
  const layout = $("question-layout");

  $("q-watermark").textContent = String(current + 1).padStart(2, "0");
  $("q-category").textContent = data.category;
  $("q-text").textContent = data.question;
  $("feedback").classList.add("hidden");
  $("next-btn").classList.add("hidden");

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
  updateProgress();
  updateFlagBtn();
}

function selectAnswer(index) {
  if (answered) return;
  answered = true;

  const data = quizData[current];
  const buttons = document.querySelectorAll(".option-btn");
  const feedback = $("feedback");
  const correctIndex = data._shuffledCorrect;
  const isCorrect = index === correctIndex;

  if (isCorrect) {
    score++;
    updateScore();
    playSound("correct");
    if (navigator.vibrate) navigator.vibrate(50);

    // Skip all animation — jump to next question instantly
    if (current < quizData.length - 1) {
      current++;
      showQuestion();
    } else {
      showResults();
    }
    return;
  } else {
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

  $("next-btn").classList.remove("hidden");
}

function advanceQuestion() {
  if (current < quizData.length - 1) {
    $("question-layout").classList.add("exit");
    setTimeout(() => {
      current++;
      showQuestion();
    }, EXIT_DURATION);
  } else {
    showResults();
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
  setActiveDeck(null);
  isFlaggedMode = false;
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
