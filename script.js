document.addEventListener("DOMContentLoaded", () => {
  // ==========================================================================
  // 1. 全螢幕動態適配 (Letterbox Viewport Scaling)
  // ==========================================================================
  const scaler = document.getElementById("viewport-scaler");
  const baseWidth = 960;
  const baseHeight = 640;

  function resizeStage() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    // 計算最小縮放比，確保 960x640 完整可見且完全等比例居中
    const scale = Math.min(windowWidth / baseWidth, windowHeight / baseHeight);
    scaler.style.transform = `scale(${scale})`;
  }

  window.addEventListener("resize", resizeStage);
  window.addEventListener("orientationchange", resizeStage);
  resizeStage();

  // ==========================================================================
  // 2. 輕量化音效生成器 (Web Audio API)
  // ==========================================================================
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  function playTone(freq, type, duration) {
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  function soundClick() { playTone(440, "sine", 0.1); }
  function soundStepTens() { playTone(330, "triangle", 0.2); }
  function soundStepOnes() { playTone(660, "triangle", 0.2); }
  function soundSuccess() {
    playTone(523.25, "sine", 0.15);
    setTimeout(() => playTone(659.25, "sine", 0.15), 100);
    setTimeout(() => playTone(783.99, "sine", 0.25), 200);
  }

  // ==========================================================================
  // 3. 狀態與元素引用
  // ==========================================================================
  let isAdvancedMode = false;
  let currentStep = 1;
  let targetNumber = 10;
  let questionPool = [];

  // DOM 節點
  const gridStage = document.getElementById("game-stage");
  const gridBoard = document.getElementById("hundred-board");
  const pageGrid = document.getElementById("page-grid");
  const pageQuiz = document.getElementById("page-quiz");
  const btnGotoChallenge = document.getElementById("btn-goto-challenge");
  const btnGotoGrid = document.getElementById("btn-goto-grid");

  const btnModeEasy = document.getElementById("btn-mode-easy");
  const btnModeHard = document.getElementById("btn-mode-hard");

  // 第一頁 彈窗元素
  const modalInspect = document.getElementById("modal-inspect");
  const btnCloseInspect = document.getElementById("btn-close-inspect");
  const zoomTens = document.getElementById("zoom-tens");
  const zoomOnes = document.getElementById("zoom-ones");
  const valTens = document.getElementById("val-tens");
  const valOnes = document.getElementById("val-ones");
  const readPromptText = document.getElementById("read-prompt-text");
  const btnReplayRead = document.getElementById("btn-replay-read");

  // 第二頁 挑戰元素
  const quizIndex = document.getElementById("quiz-index");
  const quizTens = document.getElementById("quiz-tens");
  const quizOnes = document.getElementById("quiz-ones");
  const btnPass = document.getElementById("btn-pass");
  const btnTryAgain = document.getElementById("btn-try-again");

  // 正向反饋彈窗
  const modalFeedback = document.getElementById("modal-feedback");
  const fbIcon = document.getElementById("fb-icon");
  const fbTitle = document.getElementById("fb-title");
  const fbMessage = document.getElementById("fb-message");
  const btnFbNext = document.getElementById("btn-fb-next");
  const btnFbReplay = document.getElementById("btn-fb-replay");

  // ==========================================================================
  // 4. 正向語句庫與朗讀模組
  // ==========================================================================
  const praises = [
    "太棒了！你做到了！🌟",
    "好厲害，你對雙位數越來越熟悉了！🎉",
    "欣賞你的專注與努力！❤️",
    "朗讀得真清晰，你真優秀！✨",
    "一步一步來，你做得非常好！🚀"
  ];

  function speakText(text) {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "zh-HK"; // 可換為 zh-TW 或 zh-CN
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  }

  // ==========================================================================
  // 5. 初始化百格圖 (1-100)
  // ==========================================================================
  function buildHundredGrid() {
    gridBoard.innerHTML = "";
    for (let i = 1; i <= 100; i++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      if (i < 10) {
        cell.innerHTML = `<span class="digit-ones">${i}</span>`;
      } else if (i === 100) {
        cell.innerHTML = `<span class="digit-tens">10</span><span class="digit-ones">0</span>`;
      } else {
        const tens = Math.floor(i / 10);
        const ones = i % 10;
        cell.innerHTML = `<span class="digit-tens">${tens}</span><span class="digit-ones">${ones}</span>`;
      }

      // 觸控與點擊通用綁定
      cell.addEventListener("pointerdown", () => inspectNumber(i));
      gridBoard.appendChild(cell);
    }
  }

  // 點選數字：放大 ➜ 十位高亮 ➜ 個位高亮 ➜ 完整引導
  function inspectNumber(num) {
    soundClick();
    targetNumber = num;
    let t = Math.floor(num / 10);
    let o = num % 10;

    if (num === 100) {
      t = 10; o = 0;
    }

    zoomTens.textContent = num < 10 ? "" : t;
    zoomOnes.textContent = o;
    valTens.textContent = t;
    valOnes.textContent = o;

    // 清除既有動畫
    zoomTens.classList.remove("pulse");
    zoomOnes.classList.remove("pulse");
    readPromptText.textContent = "請看十位數...";
    modalInspect.classList.add("active");

    // 時序引導
    if (num >= 10) {
      setTimeout(() => {
        zoomTens.classList.add("pulse");
        soundStepTens();
        speakText(`${t * 10}`);
        readPromptText.textContent = `十位是 ${t}，表示 ${t * 10}`;
      }, 300);

      setTimeout(() => {
        zoomTens.classList.remove("pulse");
        zoomOnes.classList.add("pulse");
        soundStepOnes();
        if (o > 0) speakText(`${o}`);
        readPromptText.textContent = `個位是 ${o}，表示 ${o}`;
      }, 1500);

      setTimeout(() => {
        zoomOnes.classList.remove("pulse");
        readPromptText.textContent = `合起來讀作：${num}`;
        speakText(`${num}`);
      }, 2700);
    } else {
      setTimeout(() => {
        zoomOnes.classList.add("pulse");
        soundStepOnes();
        speakText(`${num}`);
        readPromptText.textContent = `這是個位數：${num}`;
      }, 300);
    }
  }

  btnCloseInspect.addEventListener("pointerdown", () => {
    modalInspect.classList.remove("active");
  });

  btnReplayRead.addEventListener("pointerdown", () => {
    inspectNumber(targetNumber);
  });

  // ==========================================================================
  // 6. 難度切換與挑戰模式控制
  // ==========================================================================
  function setMode(advanced) {
    isAdvancedMode = advanced;
    if (isAdvancedMode) {
      btnModeHard.classList.add("active");
      btnModeEasy.classList.remove("active");
      gridStage.classList.add("no-color-hints");
    } else {
      btnModeEasy.classList.add("active");
      btnModeHard.classList.remove("active");
      gridStage.classList.remove("no-color-hints");
    }
  }

  btnModeEasy.addEventListener("pointerdown", () => setMode(false));
  btnModeHard.addEventListener("pointerdown", () => setMode(true));

  btnGotoChallenge.addEventListener("pointerdown", () => {
    soundClick();
    pageGrid.classList.remove("active");
    pageQuiz.classList.add("active");
    initQuiz();
  });

  btnGotoGrid.addEventListener("pointerdown", () => {
    soundClick();
    pageQuiz.classList.remove("active");
    pageGrid.classList.add("active");
  });

  function initQuiz() {
    currentStep = 1;
    questionPool = [];
    while (questionPool.length < 10) {
      const rand = Math.floor(Math.random() * 90) + 10; // 雙位數 10-99
      if (!questionPool.includes(rand)) questionPool.push(rand);
    }
    loadQuizQuestion();
  }

  function loadQuizQuestion() {
    if (currentStep > 10) {
      finishAllQuiz();
      return;
    }
    quizIndex.textContent = currentStep;
    targetNumber = questionPool[currentStep - 1];
    const t = Math.floor(targetNumber / 10);
    const o = targetNumber % 10;
    quizTens.textContent = t;
    quizOnes.textContent = o;
  }

  // 正確按鈕：「我讀對了！」
  btnPass.addEventListener("pointerdown", () => {
    soundSuccess();
    const praise = praises[Math.floor(Math.random() * praises.length)];
    fbIcon.textContent = "🌟";
    fbTitle.textContent = "太厲害了！";
    fbMessage.textContent = praise;
    btnFbNext.classList.remove("hide");
    btnFbReplay.classList.add("hide");
    modalFeedback.classList.add("active");
  });

  // 嘗試/錯誤回饋：「欣賞你努力、再試一次」
  btnTryAgain.addEventListener("pointerdown", () => {
    soundClick();
    fbIcon.textContent = "💪";
    fbTitle.textContent = "加油！";
    fbMessage.textContent = "欣賞你努力、再試一次！";
    btnFbNext.classList.add("hide");
    btnFbReplay.classList.add("hide");
    modalFeedback.classList.add("active");

    setTimeout(() => {
      modalFeedback.classList.remove("active");
    }, 1800);
  });

  btnFbNext.addEventListener("pointerdown", () => {
    modalFeedback.classList.remove("active");
    currentStep++;
    loadQuizQuestion();
  });

  // 通關大獎
  function finishAllQuiz() {
    soundSuccess();
    fbIcon.textContent = "🏆";
    fbTitle.textContent = "挑戰完成！";
    fbMessage.textContent = "恭喜你讀完 10 個雙位數！你是個不怕困難的小勇士！";
    btnFbNext.classList.add("hide");
    btnFbReplay.classList.remove("hide");
    modalFeedback.classList.add("active");
  }

  btnFbReplay.addEventListener("pointerdown", () => {
    modalFeedback.classList.remove("active");
    initQuiz();
  });

  // 啟動建構
  buildHundredGrid();
});
