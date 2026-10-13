document.addEventListener("DOMContentLoaded", () => {
  // --- 狀態控制 ---
  let isHardMode = false;
  let currentStep = 1;
  let targetNumber = 10;
  let questionPool = [];

  // 音訊合成器 (確保離線與行動裝置均能穩定播放提示聲)
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function playBeep(freq, type, duration) {
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  // --- DOM 節點 ---
  const boardEl = document.getElementById("hundred-board");
  const viewGrid = document.getElementById("view-grid");
  const viewQuiz = document.getElementById("view-quiz");
  const btnEasy = document.getElementById("btn-easy");
  const btnHard = document.getElementById("btn-hard");
  const btnToQuiz = document.getElementById("btn-to-quiz");
  const btnToGrid = document.getElementById("btn-to-grid");

  // 放大檢視彈窗節點
  const inspectModal = document.getElementById("inspect-modal");
  const btnCloseInspect = document.getElementById("btn-close-inspect");
  const inspectT = document.getElementById("inspect-t");
  const inspectO = document.getElementById("inspect-o");
  const pillTens = document.getElementById("pill-tens");
  const pillOnes = document.getElementById("pill-ones");
  const valTensTxt = document.getElementById("val-tens-txt");
  const valOnesTxt = document.getElementById("val-ones-txt");
  const inspectStatusText = document.getElementById("inspect-status-text");
  const btnReadAgain = document.getElementById("btn-read-again");

  // 認讀挑戰節點
  const quizNum = document.getElementById("quiz-num");
  const quizT = document.getElementById("quiz-t");
  const quizO = document.getElementById("quiz-o");
  const btnNextQuestion = document.getElementById("btn-next-question");

  // 通關彈窗節點
  const finishModal = document.getElementById("finish-modal");
  const btnRestartGame = document.getElementById("btn-restart-game");

  // 廣東話/國語語音導讀輔助
  function speakWord(text) {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "zh-HK"; // 可換為 zh-TW
      utt.rate = 0.8;
      window.speechSynthesis.speak(utt);
    }
  }

  // ==========================================================================
  // 1. 百格圖建構 (1-100)
  // ==========================================================================
  function renderHundredBoard() {
    boardEl.innerHTML = "";
    for (let i = 1; i <= 100; i++) {
      const cell = document.createElement("div");
      cell.className = "board-cell";

      if (i < 10) {
        cell.innerHTML = `<span class="num-ones">${i}</span>`;
      } else if (i === 100) {
        cell.innerHTML = `<span class="num-tens">10</span><span class="num-ones">0</span>`;
      } else {
        const tens = Math.floor(i / 10);
        const ones = i % 10;
        cell.innerHTML = `<span class="num-tens">${tens}</span><span class="num-ones">${ones}</span>`;
      }

      // 支援觸控與滑鼠
      cell.addEventListener("pointerdown", () => inspectNumber(i));
      boardEl.appendChild(cell);
    }
  }

  // 放大並依序高亮：十位 ➜ 個位 ➜ 完整引導
  function inspectNumber(num) {
    playBeep(440, "sine", 0.1);
    targetNumber = num;
    let t = Math.floor(num / 10);
    let o = num % 10;
    if (num === 100) { t = 10; o = 0; }

    inspectT.textContent = num < 10 ? "" : t;
    inspectO.textContent = o;
    valTensTxt.textContent = t;
    valOnesTxt.textContent = o;

    // 重置動畫與標籤
    inspectT.classList.remove("pulse-active");
    inspectO.classList.remove("pulse-active");
    pillTens.classList.remove("pill-active");
    pillOnes.classList.remove("pill-active");

    inspectModal.classList.add("active");

    if (num >= 10) {
      inspectStatusText.textContent = "觀察十位數...";
      setTimeout(() => {
        inspectT.classList.add("pulse-active");
        pillTens.classList.add("pill-active");
        playBeep(330, "triangle", 0.2);
        speakWord(`${t * 10}`);
        inspectStatusText.textContent = `十位是 ${t}，表示 ${t * 10}`;
      }, 300);

      setTimeout(() => {
        inspectT.classList.remove("pulse-active");
        inspectO.classList.add("pulse-active");
        pillOnes.classList.add("pill-active");
        playBeep(660, "triangle", 0.2);
        if (o > 0) speakWord(`${o}`);
        inspectStatusText.textContent = `個位是 ${o}，表示 ${o}`;
      }, 1600);

      setTimeout(() => {
        inspectO.classList.remove("pulse-active");
        inspectStatusText.textContent = `合起來讀作：${num}`;
        speakWord(`${num}`);
      }, 2800);
    } else {
      setTimeout(() => {
        inspectO.classList.add("pulse-active");
        pillOnes.classList.add("pill-active");
        playBeep(660, "triangle", 0.2);
        speakWord(`${num}`);
        inspectStatusText.textContent = `這是個位數：${num}`;
      }, 300);
    }
  }

  btnCloseInspect.addEventListener("pointerdown", () => inspectModal.classList.remove("active"));
  btnReadAgain.addEventListener("pointerdown", () => inspectNumber(targetNumber));

  // ==========================================================================
  // 2. 模式切換與分頁切換
  // ==========================================================================
  function setDifficulty(hard) {
    isHardMode = hard;
    if (isHardMode) {
      btnHard.classList.add("active");
      btnEasy.classList.remove("active");
      document.body.classList.add("hard-mode");
    } else {
      btnEasy.classList.add("active");
      btnHard.classList.remove("active");
      document.body.classList.remove("hard-mode");
    }
  }

  btnEasy.addEventListener("pointerdown", () => setDifficulty(false));
  btnHard.addEventListener("pointerdown", () => setDifficulty(true));

  btnToQuiz.addEventListener("pointerdown", () => {
    playBeep(520, "sine", 0.1);
    viewGrid.classList.remove("active");
    viewQuiz.classList.add("active");
    startQuiz();
  });

  btnToGrid.addEventListener("pointerdown", () => {
    playBeep(440, "sine", 0.1);
    viewQuiz.classList.remove("active");
    viewGrid.classList.add("active");
  });

  // ==========================================================================
  // 3. 認讀挑戰 (僅手動按「下一題」按鈕)
  // ==========================================================================
  function startQuiz() {
    currentStep = 1;
    questionPool = [];
    while (questionPool.length < 10) {
      const rand = Math.floor(Math.random() * 90) + 10;
      if (!questionPool.includes(rand)) questionPool.push(rand);
    }
    presentQuestion();
  }

  function presentQuestion() {
    if (currentStep > 10) {
      playBeep(784, "sine", 0.3);
      finishModal.classList.add("active");
      return;
    }
    quizNum.textContent = currentStep;
    targetNumber = questionPool[currentStep - 1];
    quizT.textContent = Math.floor(targetNumber / 10);
    quizO.textContent = targetNumber % 10;
  }

  // 手動按下一題
  btnNextQuestion.addEventListener("pointerdown", () => {
    playBeep(587, "sine", 0.12);
    currentStep++;
    presentQuestion();
  });

  btnRestartGame.addEventListener("pointerdown", () => {
    finishModal.classList.remove("active");
    startQuiz();
  });

  // 初始化百格圖
  renderHundredBoard();
});
