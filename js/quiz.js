const LETTERS = ["a", "b", "c", "d"];
const EXIT_DURATION = 400;

let quizData = [];
let activeUnitId = null;
let current = 0;
let score = 0;
let answered = false;

const $ = (id) => document.getElementById(id);

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function init() {
  const nav = $("sidebar-nav");
  units.forEach((unit) => {
    const totalQuestions = unit.sections.reduce((sum, s) => sum + s.questions.length, 0);
    const btn = document.createElement("button");
    btn.className = "sidebar-unit";
    btn.id = `unit-${unit.id}`;
    btn.innerHTML = `<span class="sidebar-unit-name">${unit.name}</span><span class="sidebar-unit-meta">${unit.sections.length} sections · ${totalQuestions} questions</span>`;
    btn.addEventListener("click", () => startQuiz(unit));
    nav.appendChild(btn);
  });
}

function setActiveUnit(unitId) {
  document.querySelectorAll(".sidebar-unit").forEach((btn) => btn.classList.remove("active"));
  if (unitId) $(`unit-${unitId}`).classList.add("active");
  activeUnitId = unitId;
}

function startQuiz(unit) {
  setActiveUnit(unit.id);

  quizData = shuffle(unit.sections.flatMap((section) =>
    section.questions.map((q) => ({ ...q, category: section.name }))
  ));

  $("quiz-title").textContent = unit.name;
  $("start-screen").classList.add("hidden");
  $("results-screen").classList.add("hidden");
  $("quiz-screen").classList.remove("hidden");
  $("results-bar").style.width = "0%";
  current = 0;
  score = 0;
  answered = false;
  updateScore();
  showQuestion();

  // Close sidebar on mobile after selection
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

  data.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.innerHTML = `<span class="option-letter">${LETTERS[i]})</span><span>${opt}</span>`;
    btn.addEventListener("click", () => selectAnswer(i));
    list.appendChild(btn);
  });

  layout.classList.remove("exit");
  layout.classList.add("enter");
  setTimeout(() => layout.classList.remove("enter"), 500);
  updateProgress();
}

function selectAnswer(index) {
  if (answered) return;
  answered = true;

  const data = quizData[current];
  const buttons = document.querySelectorAll(".option-btn");
  const feedback = $("feedback");
  const isCorrect = index === data.correct;

  if (isCorrect) {
    score++;
    updateScore();

    // Skip all animation — jump to next question instantly
    if (current < quizData.length - 1) {
      current++;
      showQuestion();
    } else {
      showResults();
    }
    return;
  } else {
    buttons[index].classList.add("wrong");
    buttons.forEach((btn, i) => {
      if (i === data.correct) btn.classList.add("reveal-correct");
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
  setActiveUnit(null);
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
