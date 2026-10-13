document.addEventListener("DOMContentLoaded", () => {
  // --- 狀態控制 ---
  let isHardMode = false;
  let currentStep = 1;
  let targetNumber = 10;
  let questionPool = [];

  // 音訊合成器 (支援跨裝置離線低延遲提示聲)
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  function playTone(freq, type, duration) {
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
  const btnReadAgain = document.getElementById("btn-read-again");

  // 挑戰模式節點
  const quizNum = document.getElementById("quiz-num");
  const quizT = document.getElementById("quiz-t");
  const quizO = document.getElementById("quiz-o");
  const btnNextQuestion = document.getElementById("btn-next-question");

  // 通關彈窗
  const finishModal = document.getElementById("finish-modal");
  const btnRestartGame = document.getElementById("btn-restart-game");

  // Web Speech API 語音朗讀
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

  // 動態生成數柱（1 條 10 粒）
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

  // 動態生成數粒（1 個 1 粒）
  function renderOnesCubes(count) {
    onesCubesCanvas.innerHTML = "";
    for (let c = 0; c < count; c++) {
      const cube = document.createElement("div");
      cube.className = "cube-unit";
      onesCubesCanvas.appendChild(cube);
    }
  }

  // 點選數字：放大並依序高亮（十位數柱 ➜ 個位數粒 ➜ 完整讀出）
  function inspectNumber(num) {
    playTone(440, "sine", 0.1);
    targetNumber = num;
    let t = Math.floor(num / 10);
    let o = num % 10;
    if (num === 100) { t = 10; o = 0; }

    inspectT.textContent = num < 10 ? "" : t;
    inspectO.textContent = o;
    valTensTxt.textContent = t;
    valOnesTxt.textContent = o;

    // 繪製蒙特梭利具象數柱與數粒
    renderTensRods(t);
    renderOnesCubes(o);

    // 重置動畫與高亮標記
    inspectT.classList.remove("pulse-active");
    inspectO.classList.remove("pulse-active");
    blockTens.classList.remove("block-active");
    blockOnes.classList.remove("block-active");

    inspectModal.classList.add("active");

    if (num >= 10) {
      inspectStatusText.textContent = `十位是 ${t}，看淡藍色方塊！`;
      // 0.3秒後：高亮十位與數柱
      setTimeout(() => {
        inspectT.classList.add("pulse-active");
        blockTens.classList.add("block-active");
        playTone(330, "triangle", 0.2);
        speakWord(`${t}個十，代表${t * 10}粒`);
        inspectStatusText.textContent = `十位是 ${t}：有 ${t} 條數柱，每條 10 粒，代表 ${t * 10}！`;
      }, 300);

      // 1.8秒後：高亮個位與數粒
      setTimeout(() => {
        inspectT.classList.remove("pulse-active");
        blockTens.classList.remove("block-active");

        inspectO.classList.add("pulse-active");
        blockOnes.classList.add("block-active");
        playTone(660, "triangle", 0.2);
        if (o > 0) {
          speakWord(`${o}個一，代表${o}粒`);
          inspectStatusText.textContent = `個位是 ${o}：有 ${o} 顆數粒，每顆 1 粒，代表 ${o}！`;
        } else {
          speakWord("0個一");
          inspectStatusText.textContent = "個位是 0：沒有多出來的單粒！";
        }
      }, 2000);

      // 3.5秒後：合讀
      setTimeout(() => {
        inspectO.classList.remove("pulse-active");
        blockOnes.classList.remove("block-active");
        inspectStatusText.textContent = `合起來讀作：${num}`;
        speakWord(`${num}`);
      }, 3600);
    } else {
      setTimeout(() => {
        inspectO.classList.add("pulse-active");
        blockOnes.classList.add("block-active");
        playTone(660, "triangle", 0.2);
        speakWord(`${num}個一`);
        inspectStatusText.textContent = `個位是 ${num}：有 ${num} 顆數粒！`;
      }, 300);
    }
  }

  btnCloseInspect.addEventListener("pointerdown", () => inspectModal.classList.remove("active"));
  btnReadAgain.addEventListener("pointerdown", () => inspectNumber(targetNumber));

  // ==========================================================================
  // 2. 模式切換與視圖切換
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
    playTone(520, "sine", 0.1);
    viewGrid.classList.remove("active");
    viewQuiz.classList.add("active");
    startQuiz();
  });

  btnToGrid.addEventListener("pointerdown", () => {
    playTone(440, "sine", 0.1);
    viewQuiz.classList.remove("active");
    viewGrid.classList.add("active");
  });

  // ==========================================================================
  // 3. 認讀挑戰邏輯 (共10題，單一「下一題」按鈕)
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
      playTone(784, "sine", 0.3);
      finishModal.classList.add("active");
      return;
    }
    quizNum.textContent = currentStep;
    targetNumber = questionPool[currentStep - 1];
    quizT.textContent = Math.floor(targetNumber / 10);
    quizO.textContent = targetNumber % 10;
  }

  btnNextQuestion.addEventListener("pointerdown", () => {
    playTone(587, "sine", 0.12);
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
