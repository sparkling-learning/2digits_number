document.addEventListener("DOMContentLoaded", () => {
  // --- 狀態控制 ---
  let isHardMode = false;
  let currentStep = 1;
  let targetNumber = 10;
  let questionPool = [];

  // 輕量提示音效 (Web Audio API)
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function playBeep(freq, type, duration) {
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  // --- DOM 節點引用 ---
  const boardEl = document.getElementById("hundred-board");
  const viewGrid = document.getElementById("view-grid");
  const viewQuiz = document.getElementById("view-quiz");
  const btnEasy = document.getElementById("btn-easy");
  const btnHard = document.getElementById("btn-hard");
  const btnToQuiz = document.getElementById("btn-to-quiz");
  const btnToGrid = document.getElementById("btn-to-grid");

  // 放大檢視彈窗
  const inspectModal = document.getElementById("inspect-modal");
  const btnCloseInspect = document.getElementById("btn-close-inspect");
  const inspectT = document.getElementById("inspect-t");
  const inspectO = document.getElementById("inspect-o");
  
  const blockTens = document.getElementById("block-tens");
  const blockOnes = document.getElementById("block-ones");
  const valTensTxt = document.getElementById("val-tens-txt");
  const valOnesTxt = document.getElementById("val-ones-txt");
  const tensRodsCanvas = document.getElementById("tens-rods-canvas");
  const onesCubesCanvas = document.getElementById("ones-cubes-canvas");

  const inspectStatusText = document.getElementById("inspect-status-text");
  const btnReplayAnim = document.getElementById("btn-replay-anim");

  // 挑戰模式節點
  const quizNum = document.getElementById("quiz-num");
  const quizT = document.getElementById("quiz-t");
  const quizO = document.getElementById("quiz-o");
  const btnNextQuestion = document.getElementById("btn-next-question");

  // 通關彈窗
  const finishModal = document.getElementById("finish-modal");
  const btnRestartGame = document.getElementById("btn-restart-game");

  // ==========================================================================
  // 1. 建構百格圖 (1-100)
  // ==========================================================================
  function renderHundredBoard() {
    boardEl.innerHTML = "";
    for (let i = 1; i <= 100; i++) {
      const cell = document.createElement("div");
      cell.className = "board-cell";

      if (i < 10) {
        cell.innerHTML = `
          <div class="digit-wrapper">
            <span class="num-ones">${i}</span>
          </div>`;
      } else if (i === 100) {
        cell.innerHTML = `
          <div class="digit-wrapper">
            <span class="num-tens">10</span><span class="num-ones">0</span>
          </div>`;
      } else {
        const tens = Math.floor(i / 10);
        const ones = i % 10;
        cell.innerHTML = `
          <div class="digit-wrapper">
            <span class="num-tens">${tens}</span><span class="num-ones">${ones}</span>
          </div>`;
      }

      cell.addEventListener("pointerdown", () => inspectNumber(i));
      boardEl.appendChild(cell);
    }
  }

  // 生成十位數柱 (一條 10 粒)
  function renderTensRods(count) {
    tensRodsCanvas.innerHTML = "";
    for (let r = 0; r < count; r++) {
      const rod = document.createElement("div");
      rod.className = "rod-pillar";
      for (let dot = 0; dot < 10; dot++) {
        const dotEl = document.createElement("div");
        dotEl.className = "rod-unit-dot";
        rod.appendChild(dotEl);
      }
      tensRodsCanvas.appendChild(rod);
    }
  }

  // 生成個位數粒 (5 粒一行，放滿第 1 行才轉下行)
  function renderOnesCubes(count) {
    onesCubesCanvas.innerHTML = "";
    for (let c = 0; c < count; c++) {
      const cube = document.createElement("div");
      cube.className = "cube-unit";
      onesCubesCanvas.appendChild(cube);
    }
  }

  // 點選數字：純視覺依序高亮 (十位數柱 ➜ 個位數粒)
  function inspectNumber(num) {
    playBeep(440, "sine", 0.08);
    targetNumber = num;
    let t = Math.floor(num / 10);
    let o = num % 10;
    if (num === 100) { t = 10; o = 0; }

    inspectT.textContent = num < 10 ? "" : t;
    inspectO.textContent = o;
    valTensTxt.textContent = t;
    valOnesTxt.textContent = o;

    // 繪製具象圖形
    renderTensRods(t);
    renderOnesCubes(o);

    // 重置高亮
    inspectT.classList.remove("pulse-active");
    inspectO.classList.remove("pulse-active");
    blockTens.classList.remove("block-active");
    blockOnes.classList.remove("block-active");

    inspectModal.classList.add("active");

    if (num >= 10) {
      inspectStatusText.textContent = "請看淡藍色方塊：有幾條數柱？";
      
      // 第一階段：高亮十位
      setTimeout(() => {
        inspectT.classList.add("pulse-active");
        blockTens.classList.add("block-active");
        playBeep(330, "triangle", 0.15);
        inspectStatusText.textContent = `十位是 ${t}：代表 ${t} 條十粒 (${t * 10})`;
      }, 300);

      // 第二階段：高亮個位 (5 粒一行展示)
      setTimeout(() => {
        inspectT.classList.remove("pulse-active");
        blockTens.classList.remove("block-active");

        inspectO.classList.add("pulse-active");
        blockOnes.classList.add("block-active");
        playBeep(660, "triangle", 0.15);
        if (o > 0) {
          inspectStatusText.textContent = `個位是 ${o}：代表 ${o} 個一粒 (${o})`;
        } else {
          inspectStatusText.textContent = "個位是 0：代表 0 個一粒";
        }
      }, 2000);

      // 第三階段：提示朗讀
      setTimeout(() => {
        inspectO.classList.remove("pulse-active");
        blockOnes.classList.remove("block-active");
        inspectStatusText.textContent = `合起來讀作：${num}，請小朋友大聲讀出來！`;
      }, 3600);
    } else {
      setTimeout(() => {
        inspectO.classList.add("pulse-active");
        blockOnes.classList.add("block-active");
        playBeep(660, "triangle", 0.15);
        inspectStatusText.textContent = `個位是 ${num}：代表 ${num} 粒！請讀出數字`;
      }, 300);
    }
  }

  btnCloseInspect.addEventListener("pointerdown", () => inspectModal.classList.remove("active"));
  btnReplayAnim.addEventListener("pointerdown", () => inspectNumber(targetNumber));

  // ==========================================================================
  // 2. 模式切換與分頁
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
    playBeep(520, "sine", 0.08);
    viewGrid.classList.remove("active");
    viewQuiz.classList.add("active");
    startQuiz();
  });

  btnToGrid.addEventListener("pointerdown", () => {
    playBeep(440, "sine", 0.08);
    viewQuiz.classList.remove("active");
    viewGrid.classList.add("active");
  });

  // ==========================================================================
  // 3. 認讀挑戰邏輯 (單一「下一題」按鈕)
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

  btnNextQuestion.addEventListener("pointerdown", () => {
    playBeep(587, "sine", 0.1);
    currentStep++;
    presentQuestion();
  });

  btnRestartGame.addEventListener("pointerdown", () => {
    finishModal.classList.remove("active");
    startQuiz();
  });

  // 初始繪製
  renderHundredBoard();
});
