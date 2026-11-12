(() => {
  "use strict";

  /* =========================================================
     Data
     ========================================================= */

  const TYPE_META = {
    p1: {
      key: "p1",
      label: "正实雷",
      symbol: "+1",
      real: 1,
      imag: 0,
      color: "#e5a017",
      soft: "#fff2cc"
    },
    n1: {
      key: "n1",
      label: "负实雷",
      symbol: "-1",
      real: -1,
      imag: 0,
      color: "#2d98de",
      soft: "#e1f3ff"
    },
    pi: {
      key: "pi",
      label: "正虚雷",
      symbol: "+i",
      real: 0,
      imag: 1,
      color: "#7658f5",
      soft: "#eeeaff"
    },
    ni: {
      key: "ni",
      label: "负虚雷",
      symbol: "-i",
      real: 0,
      imag: -1,
      color: "#12a39b",
      soft: "#ddf7f4"
    }
  };

  const TYPE_ORDER = ["p1", "n1", "pi", "ni"];

  const DIFFICULTIES = {
    normal: {
      key: "normal",
      label: "普通",
      rows: 9,
      cols: 9,
      mines: 20,
      chances: 3
    },
    hard: {
      key: "hard",
      label: "困难",
      rows: 15,
      cols: 15,
      mines: 47,
      chances: 4
    }
  };

  const WHEEL_KEYS = [...TYPE_ORDER, "clear"];
  const WHEEL_ANGLES = [-90, -18, 54, 126, 198];


  /* =========================================================
     DOM
     ========================================================= */

  const dom = {};

  let state = null;
  let press = null;
  let wheelState = null;
  let toastTimer = null;
  let toastHideTimer = null;
  let resultTimer = null;
  let hitTimer = null;

  function cacheDom() {
    dom.screenMenu = document.getElementById("screen-menu");
    dom.screenGame = document.getElementById("screen-game");

    dom.menuActions = document.getElementById("menu-actions");
    dom.difficultyPanel = document.getElementById("difficulty-panel");
    dom.btnStart = document.getElementById("btn-start");
    dom.btnTutorial = document.getElementById("btn-tutorial");
    dom.btnDifficultyBack = document.getElementById("btn-difficulty-back");
    dom.difficultyCards = Array.from(document.querySelectorAll(".difficulty-card"));

    dom.btnBack = document.getElementById("btn-back");
    dom.btnRestart = document.getElementById("btn-restart");
    dom.timer = document.getElementById("timer");
    dom.topLives = document.getElementById("top-lives");
    dom.topLivesStat = document.getElementById("top-lives-stat");

    dom.board = document.getElementById("board");
    dom.boardWrap = document.getElementById("board-wrap");
    dom.boardFooter = document.getElementById("board-footer");
    dom.endBar = document.getElementById("end-bar");
    dom.endBarTitle = document.getElementById("end-bar-title");
    dom.btnEndNext = document.getElementById("btn-end-next");
    dom.btnEndMenu = document.getElementById("btn-end-menu");

    dom.gameStatus = document.getElementById("game-status");
    dom.gameStatusText = document.getElementById("game-status-text");
    dom.modeLabel = document.getElementById("mode-label");
    dom.modeSize = document.getElementById("mode-size");
    dom.boardModeTitle = document.getElementById("board-mode-title");
    dom.boardKicker = document.getElementById("board-kicker");

    dom.typeStats = document.getElementById("type-stats");
    dom.safeProgressText = document.getElementById("safe-progress-text");
    dom.safeProgressBar = document.getElementById("safe-progress-bar");
    dom.safeCount = document.getElementById("safe-count");
    dom.safeTotal = document.getElementById("safe-total");
    dom.mistakeCount = document.getElementById("mistake-count");
    dom.lifeHint = document.getElementById("life-hint");

    dom.flagWheel = document.getElementById("flag-wheel");
    dom.wheelOptions = document.getElementById("wheel-options");
    dom.wheelHint = document.getElementById("wheel-hint");

    dom.resultModal = document.getElementById("result-modal");
    dom.resultEmblem = document.getElementById("result-emblem");
    dom.resultKicker = document.getElementById("result-kicker");
    dom.resultTitle = document.getElementById("result-title");
    dom.resultDesc = document.getElementById("result-desc");
    dom.resultTime = document.getElementById("result-time");
    dom.resultSafe = document.getElementById("result-safe");
    dom.resultMistakes = document.getElementById("result-mistakes");

    dom.btnNext = document.getElementById("btn-next");
    dom.btnViewBoard = document.getElementById("btn-view-board");
    dom.btnMenu = document.getElementById("btn-menu");
    dom.toast = document.getElementById("toast");
  }

  /* =========================================================
     Init
     ========================================================= */

  function init() {
    cacheDom();
    buildWheel();
    bindEvents();
    updateTypeStatsPlaceholder();
  }

  function bindEvents() {
    dom.btnStart.addEventListener("click", () => openDifficulty(true));
    dom.btnDifficultyBack.addEventListener("click", () => openDifficulty(false));
    dom.btnTutorial.addEventListener("click", () => {
      showToast("教程还在制作中，先直接开一局吧");
    });

    dom.difficultyCards.forEach((card) => {
      card.addEventListener("click", () => {
        const difficulty = card.dataset.difficulty;
        if (difficulty === "hell") {
          showToast("地狱模式正在制作中，敬请期待");
          return;
        }
        startGame(difficulty);
      });
    });

    dom.btnBack.addEventListener("click", goMenu);
    dom.btnRestart.addEventListener("click", () => {
      if (state) startGame(state.difficulty);
    });

    dom.btnNext.addEventListener("click", restartCurrentGame);
    dom.btnEndNext.addEventListener("click", restartCurrentGame);
    dom.btnViewBoard.addEventListener("click", viewBoard);
    dom.btnMenu.addEventListener("click", goMenu);
    dom.btnEndMenu.addEventListener("click", goMenu);

    dom.resultModal.addEventListener("click", (event) => {
      if (event.target === dom.resultModal) viewBoard();
    });

    dom.board.addEventListener("pointerdown", onBoardPointerDown);
    dom.board.addEventListener("contextmenu", (event) => event.preventDefault());
    dom.board.addEventListener("mousedown", (event) => {
      if (event.button === 1) event.preventDefault();
    });
    dom.board.addEventListener("auxclick", (event) => {
      if (event.button === 1) event.preventDefault();
    });
    dom.board.addEventListener("dragstart", (event) => event.preventDefault());

    dom.flagWheel.addEventListener("pointerdown", onWheelBackdropDown);
    dom.flagWheel.addEventListener("click", onWheelClick);
    dom.wheelOptions.addEventListener("pointerover", onWheelOptionHover);

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    document.addEventListener("selectstart", onSelectStart);
    window.addEventListener("blur", () => {
      cancelPress();
      if (wheelState) closeWheel();
    });
    window.addEventListener("resize", () => {
      if (wheelState) closeWheel();
    });

    document.addEventListener("contextmenu", (event) => {
      if (!dom.screenGame.hidden) event.preventDefault();
    });

    document.addEventListener("keydown", onKeyDown);
  }

  function onKeyDown(event) {
    if (event.key !== "Escape") return;

    if (wheelState) {
      if (press) press.cancelled = true;
      closeWheel();
      return;
    }

    if (!dom.resultModal.hidden) {
      viewBoard();
      return;
    }

    if (!dom.difficultyPanel.hidden) {
      openDifficulty(false);
    }
  }

  /* =========================================================
     Menu / screen flow
     ========================================================= */

  function openDifficulty(open) {
    dom.menuActions.classList.toggle("is-hidden", open);
    dom.difficultyPanel.hidden = !open;

    if (open) {
      window.setTimeout(() => {
        const normalCard = dom.difficultyPanel.querySelector('[data-difficulty="normal"]');
        normalCard?.focus({ preventScroll: true });
      }, 60);
    } else {
      dom.btnStart.focus({ preventScroll: true });
    }
  }

  function goMenu() {
    clearGameTimers();
    cancelPress();
    closeWheel();
    hideResultModal();
    hideToast();

    if (state) state.screen = "menu";

    dom.screenGame.hidden = true;
    dom.screenMenu.hidden = false;
    openDifficulty(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function restartCurrentGame() {
    const difficulty = state?.difficulty || "normal";
    hideResultModal();
    startGame(difficulty);
  }

  function startGame(difficultyKey) {
    const config = DIFFICULTIES[difficultyKey] || DIFFICULTIES.normal;

    clearGameTimers();
    cancelPress();
    closeWheel();
    hideResultModal();
    hideToast();

    const board = Array.from({ length: config.rows * config.cols }, makeCell);
    const neighborMap = Array.from({ length: board.length }, (_, index) =>
      getNeighborIndices(index, config.rows, config.cols)
    );

    state = {
      screen: "game",
      difficulty: config.key,
      rows: config.rows,
      cols: config.cols,
      mines: config.mines,
      totalSafe: config.rows * config.cols - config.mines,
      chancesTotal: config.chances,
      chances: config.chances,
      mistakes: 0,
      safeRevealed: 0,
      board,
      neighborMap,
      typeTotals: createTypeTotals(config.mines),
      generated: false,
      ended: false,
      won: false,
      seconds: 0,
      timerId: null,
      timerStarted: false,
      startTime: 0
    };

    dom.screenMenu.hidden = true;
    dom.screenGame.hidden = false;
    dom.boardWrap.classList.remove("is-hit", "is-ended");
    dom.boardFooter.hidden = false;
    dom.endBar.hidden = true;
    dom.endBarTitle.textContent = "本局结束";
    dom.timer.textContent = "00:00";
    dom.gameStatus.classList.remove("is-ended", "is-warning");
    dom.gameStatusText.textContent = "进行中";

    const pad = (value) => String(value).padStart(2, "0");
    dom.modeLabel.textContent = `${config.label}模式`;
    dom.modeSize.textContent = `${config.cols} × ${config.rows}`;
    dom.boardModeTitle.textContent = `${config.label}模式`;
    dom.boardKicker.textContent = `MINE FIELD / ${pad(config.cols)} × ${pad(config.rows)}`;
    dom.topLivesStat.title = `${config.chances} 点血量，第 ${config.chances + 1} 次踩雷失败`;
    dom.board.classList.toggle("is-large", config.cols >= 15);

    buildBoard();
    buildTypeStats();
    updateLives();
    updateRunStats();
    updateTypeStats();
    updateGameStatus();

    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function clearGameTimers() {
    if (resultTimer) {
      window.clearTimeout(resultTimer);
      resultTimer = null;
    }
    if (hitTimer) {
      window.clearTimeout(hitTimer);
      hitTimer = null;
    }
    stopTimer();
  }

  /* =========================================================
     Game setup
     ========================================================= */

  function makeCell() {
    return {
      mine: null,
      mark: null,
      revealed: false,
      detonated: false,
      wrongFlag: false,
      neighborMines: 0,
      valueSq: 0
    };
  }

  function createTypeTotals(mineCount) {
    const totals = { p1: 2, n1: 2, pi: 2, ni: 2 };
    let remaining = Math.max(0, mineCount - 8);

    while (remaining > 0) {
      const key = TYPE_ORDER[Math.floor(Math.random() * TYPE_ORDER.length)];
      totals[key] += 1;
      remaining -= 1;
    }

    return totals;
  }

  function getNeighborIndices(index, rows, cols) {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const result = [];

    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
        if (rowOffset === 0 && colOffset === 0) continue;

        const nextRow = row + rowOffset;
        const nextCol = col + colOffset;

        if (nextRow >= 0 && nextRow < rows && nextCol >= 0 && nextCol < cols) {
          result.push(nextRow * cols + nextCol);
        }
      }
    }

    return result;
  }

  function buildBoard() {
    const fragment = document.createDocumentFragment();
    dom.board.innerHTML = "";
    dom.board.style.setProperty("--cols", String(state.cols));
    dom.board.style.setProperty("--rows", String(state.rows));

    for (let index = 0; index < state.board.length; index += 1) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.index = String(index);
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", describeCell(index));
      fragment.appendChild(cell);
    }

    dom.board.appendChild(fragment);
  }

  function createTypeTotalsPool(typeTotals) {
    const pool = [];
    TYPE_ORDER.forEach((type) => {
      for (let i = 0; i < typeTotals[type]; i += 1) pool.push(type);
    });
    return pool;
  }

  function placeMines(firstIndex) {
    if (state.generated) return;

    const forbidden = new Set([firstIndex, ...state.neighborMap[firstIndex]]);
    const allIndices = state.board.map((_, index) => index);
    let candidates = allIndices.filter(
      (index) => !forbidden.has(index) && !state.board[index].mark
    );

    if (candidates.length < state.mines) {
      candidates = allIndices.filter((index) => !forbidden.has(index));
    }

    if (candidates.length < state.mines) {
      candidates = allIndices.filter((index) => index !== firstIndex);
    }

    shuffle(candidates);

    const mineTypes = createTypeTotalsPool(state.typeTotals);
    shuffle(mineTypes);

    candidates.slice(0, state.mines).forEach((index, mineIndex) => {
      state.board[index].mine = mineTypes[mineIndex] || "p1";
    });

    computeNeighborValues();
    state.generated = true;
  }

  function computeNeighborValues() {
    state.board.forEach((cell, index) => {
      if (cell.mine) {
        cell.neighborMines = 0;
        cell.valueSq = 0;
        return;
      }

      let real = 0;
      let imaginary = 0;
      let count = 0;

      state.neighborMap[index].forEach((neighborIndex) => {
        const neighbor = state.board[neighborIndex];
        if (!neighbor.mine) return;

        const meta = TYPE_META[neighbor.mine];
        real += meta.real;
        imaginary += meta.imag;
        count += 1;
      });

      cell.neighborMines = count;
      cell.valueSq = real * real + imaginary * imaginary;
    });
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /* =========================================================
     Pointer interaction
     ========================================================= */

  function onBoardPointerDown(event) {
    if (!state || state.screen !== "game" || state.ended) return;
    if (wheelState) return;

    const cellElement = event.target.closest(".cell");
    if (!cellElement || !dom.board.contains(cellElement)) return;

    const index = Number(cellElement.dataset.index);
    if (!Number.isInteger(index)) return;

    const cell = state.board[index];
    if (!cell) return;

    if (cell.revealed) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (event.pointerType !== "mouse" && event.button !== 0) return;
      if (cell.mine || cell.neighborMines === 0) return;
      event.preventDefault();
      beginPress(event, index, cellElement, "number");
      return;
    }

    if (event.pointerType === "mouse") {
      if (event.button === 1) {
        event.preventDefault();
        openWheel(index, cellElement);
        return;
      }

      if (event.button === 2) {
        event.preventDefault();
        beginRightPress(event, index, cellElement);
        return;
      }

      if (event.button !== 0) return;
      event.preventDefault();
      beginPress(event, index, cellElement, "left");
      return;
    }

    if (event.button !== 0) return;
    event.preventDefault();
    beginPress(event, index, cellElement, "touch");
  }

  function beginPress(event, index, cellElement, kind) {
    if (press) return;

    press = {
      kind,
      index,
      cellElement,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
      cancelled: false,
      wheelOpen: false,
      longTimer: null
    };

    capturePointer(cellElement, event.pointerId);

    if (kind === "touch") {
      cellElement.classList.add("is-holding");
      press.longTimer = window.setTimeout(() => {
        if (!press || press.cancelled) return;
        press.wheelOpen = true;
        press.cellElement.classList.remove("is-holding");
        openWheel(press.index, press.cellElement);
      }, 380);
    }
  }

  function beginRightPress(event, index, cellElement) {
    if (press) return;

    press = {
      kind: "right",
      index,
      cellElement,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
      cancelled: false,
      wheelOpen: false,
      longTimer: null
    };

    capturePointer(cellElement, event.pointerId);
  }

  function capturePointer(element, pointerId) {
    try {
      element.setPointerCapture(pointerId);
    } catch {
      /* Pointer capture is an enhancement; the window listeners still work. */
    }
  }

  function releasePointer(element, pointerId) {
    try {
      if (element.hasPointerCapture(pointerId)) {
        element.releasePointerCapture(pointerId);
      }
    } catch {
      /* The browser may already have released it. */
    }
  }

  function onPointerMove(event) {
    if (!press || event.pointerId !== press.pointerId) return;

    press.lastX = event.clientX;
    press.lastY = event.clientY;

    const distance = Math.hypot(
      event.clientX - press.startX,
      event.clientY - press.startY
    );

    if (distance > 8) press.moved = true;

    if (press.kind === "right") {
      event.preventDefault();
    }

    if (press.wheelOpen) return;

    if (press.kind === "touch" && distance > 10) {
      if (press.longTimer) {
        window.clearTimeout(press.longTimer);
        press.longTimer = null;
      }
      press.cellElement.classList.remove("is-holding");
    }
  }

  function onPointerUp(event) {
    if (!press || event.pointerId !== press.pointerId) return;

    const finishedPress = press;
    press = null;

    if (finishedPress.longTimer) {
      window.clearTimeout(finishedPress.longTimer);
    }

    finishedPress.cellElement.classList.remove("is-holding");
    document.body.classList.remove("is-right-pressing");
    releasePointer(finishedPress.cellElement, finishedPress.pointerId);

    if (finishedPress.wheelOpen) {
      event.preventDefault();
      return;
    }

    if (finishedPress.cancelled || finishedPress.moved) return;

    if (finishedPress.kind === "right") {
      toggleGenericMark(finishedPress.index);
      return;
    }

    if (finishedPress.kind === "number") {
      tryChord(finishedPress.index);
      return;
    }

    revealCell(finishedPress.index);
  }

  function onPointerCancel(event) {
    if (!press || event.pointerId !== press.pointerId) return;

    const keepWheel = press.wheelOpen;
    cancelPress();
    if (wheelState && !keepWheel) closeWheel();
  }

  function cancelPress() {
    if (!press) return;

    if (press.longTimer) window.clearTimeout(press.longTimer);
    press.cellElement.classList.remove("is-holding");
    document.body.classList.remove("is-right-pressing");
    releasePointer(press.cellElement, press.pointerId);
    press = null;
  }

  function onSelectStart(event) {
    if (!dom.screenGame.hidden && (press?.kind === "right" || wheelState)) {
      event.preventDefault();
    }
  }

  /* =========================================================
     Reveal / marks / win & loss
     ========================================================= */

  function revealCell(index) {
    if (!state || state.screen !== "game" || state.ended) return;

    const cell = state.board[index];
    if (!cell || cell.revealed) return;

    if (cell.mark) {
      showToast("先取消这格的标记，再翻开");
      return;
    }

    if (!state.generated) {
      placeMines(index);
      startTimer();
    }

    if (cell.mine) {
      hitMine(index);
      return;
    }

    floodReveal(index);
    updateRunStats();

    if (!state.ended && state.safeRevealed >= state.totalSafe) {
      endGame(true);
    }
  }

  function tryChord(index) {
    if (!state || state.screen !== "game" || state.ended) return;

    const cell = state.board[index];
    if (!cell || !cell.revealed || cell.mine || cell.neighborMines === 0) return;

    const neighborIndices = state.neighborMap[index];
    const markedIndices = neighborIndices.filter((neighborIndex) => state.board[neighborIndex].mark);
    const revealedMineIndices = neighborIndices.filter((neighborIndex) => {
      const neighbor = state.board[neighborIndex];
      return neighbor.mine && neighbor.revealed;
    });
    const knownIndices = [...new Set([...markedIndices, ...revealedMineIndices])];
    const mineIndices = neighborIndices.filter((neighborIndex) => state.board[neighborIndex].mine);

    if (mineIndices.length !== knownIndices.length) {
      showToast("此数字无法扩展");
      return;
    }

    let knownReal = 0;
    let knownImaginary = 0;

    knownIndices.forEach((neighborIndex) => {
      const neighbor = state.board[neighborIndex];
      const type = neighbor.revealed && neighbor.mine ? neighbor.mine : neighbor.mark;
      if (!type || type === "generic") return;

      const meta = TYPE_META[type];
      if (!meta) return;
      knownReal += meta.real;
      knownImaginary += meta.imag;
    });

    if (knownReal * knownReal + knownImaginary * knownImaginary !== cell.valueSq) {
      showToast("此数字无法扩展");
      return;
    }

    const hiddenIndices = neighborIndices.filter((neighborIndex) => {
      const neighbor = state.board[neighborIndex];
      return !neighbor.revealed && !neighbor.mark;
    });

    if (hiddenIndices.length === 0) {
      showToast("此数字无法扩展");
      return;
    }

    const hiddenMineIndices = hiddenIndices.filter((neighborIndex) => state.board[neighborIndex].mine);

    hiddenIndices.forEach((neighborIndex) => {
      if (!state.board[neighborIndex].mine) floodReveal(neighborIndex);
    });

    if (hiddenMineIndices.length > 0) {
      hitMine(hiddenMineIndices[0], hiddenMineIndices.slice(1), { chord: true });
      return;
    }

    updateRunStats();

    if (!state.ended && state.safeRevealed >= state.totalSafe) {
      endGame(true);
    }
  }

  function floodReveal(startIndex) {
    const stack = [startIndex];

    while (stack.length > 0) {
      const index = stack.pop();
      const cell = state.board[index];

      if (!cell || cell.revealed || cell.mine || cell.mark) continue;

      cell.revealed = true;
      state.safeRevealed += 1;
      renderCell(index, { revealAnimation: true });

      if (cell.neighborMines === 0) {
        state.neighborMap[index].forEach((neighborIndex) => {
          const neighbor = state.board[neighborIndex];
          if (!neighbor.revealed && !neighbor.mine && !neighbor.mark) {
            stack.push(neighborIndex);
          }
        });
      }
    }
  }

  function hitMine(index, additionalIndices = [], options = {}) {
    if (!state || state.ended) return;

    const mineIndices = [...new Set([index, ...additionalIndices])].filter((mineIndex) => {
      const cell = state.board[mineIndex];
      return cell?.mine && !cell.revealed;
    });

    if (mineIndices.length === 0) return;

    mineIndices.forEach((mineIndex) => {
      const cell = state.board[mineIndex];
      cell.revealed = true;
      cell.detonated = true;
      renderCell(mineIndex, { revealAnimation: true });
    });

    state.mistakes += 1;
    state.chances = Math.max(0, state.chancesTotal - Math.min(state.mistakes, state.chancesTotal));

    shakeBoard();
    updateLives();
    updateRunStats();
    updateTypeStats();

    if (state.mistakes >= state.chancesTotal + 1) {
      endGame(false);
      return;
    }

    if (options.chord) {
      const countText = mineIndices.length > 1 ? `扩展踩中 ${mineIndices.length} 颗雷` : "扩展踩雷";
      showToast(`${countText}！损失 1 点血量`);
      return;
    }

    if (state.chances <= 0) {
      showToast("血量已用完，再踩雷就失败");
    } else {
      showToast(`踩雷！还剩 ${state.chances} 点血量`);
    }
  }

  function toggleGenericMark(index) {
    if (!state || state.ended) return;

    const cell = state.board[index];
    if (!cell || cell.revealed) return;

    setMark(index, cell.mark ? null : "generic");
  }

  function setMark(index, mark) {
    if (!state || state.ended) return;

    const cell = state.board[index];
    if (!cell || cell.revealed) return;

    cell.mark = mark;
    renderCell(index, { markAnimation: Boolean(mark) });
    updateTypeStats();
  }

  function endGame(won) {
    if (!state || state.ended) return;

    state.ended = true;
    state.won = won;
    hideToast();
    stopTimer();

    state.board.forEach((cell, index) => {
      if (cell.mine) {
        const correctFlag = cell.mark && cell.mark !== "generic" && cell.mark === cell.mine;
        if (!correctFlag) {
          if (cell.mark) cell.wrongFlag = true;
          cell.revealed = true;
          renderCell(index);
        }
        return;
      }

      if (!won && cell.mark) {
        cell.wrongFlag = true;
        renderCell(index);
      }
    });

    updateLives();
    updateRunStats();
    updateTypeStats();
    updateGameStatus();

    dom.boardFooter.hidden = true;
    dom.endBar.hidden = false;
    dom.endBarTitle.textContent = won ? "排雷成功 · 本局结束" : "血量用尽 · 本局结束";

    resultTimer = window.setTimeout(() => {
      if (state && state.screen === "game" && state.ended) {
        showResult(won);
      }
    }, won ? 620 : 790);
  }

  function shakeBoard() {
    if (hitTimer) window.clearTimeout(hitTimer);

    dom.boardWrap.classList.remove("is-hit");
    void dom.boardWrap.offsetWidth;
    dom.boardWrap.classList.add("is-hit");

    hitTimer = window.setTimeout(() => {
      dom.boardWrap.classList.remove("is-hit");
      hitTimer = null;
    }, 450);
  }


  /* =========================================================
     Flag wheel
     ========================================================= */

  function buildWheel() {
    dom.wheelOptions.innerHTML = WHEEL_KEYS.map((key) => {
      const isClear = key === "clear";
      const label = isClear
        ? "清除标记"
        : `${TYPE_META[key].label} ${TYPE_META[key].symbol}`;
      const visual = isClear ? '<span class="clear-glyph"></span>' : flagSvg(key);

      return `
        <div class="wheel-option" data-mark="${key}" role="option" aria-label="${label}">
          <div class="wheel-option-inner">${visual}</div>
        </div>
      `;
    }).join("");
  }

  function onWheelBackdropDown(event) {
    if (!wheelState) return;
    if (event.target.closest(".wheel-option")) return;

    event.preventDefault();
    closeWheel();
  }

  function onWheelClick(event) {
    if (!wheelState) return;

    const option = event.target.closest(".wheel-option");
    if (!option) return;

    event.preventDefault();
    chooseWheelOption(option.dataset.mark);
  }

  function onWheelOptionHover(event) {
    if (!wheelState) return;

    const option = event.target.closest(".wheel-option");
    if (!option) return;

    setWheelSelection(option.dataset.mark);
  }

  function chooseWheelOption(key) {
    if (!wheelState || !key) return;

    setWheelSelection(key);
    applyWheelSelection();
    closeWheel();
  }

  function openWheel(index, cellElement) {
    if (!state || state.ended) return;
    if (wheelState) closeWheel();

    const rect = cellElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const radius = Math.min(
      88,
      Math.max(54, Math.min(viewportWidth, viewportHeight) * 0.108)
    );

    const horizontalMargin = radius + 38;
    const topMargin = radius + 38;
    const bottomMargin = radius + 82;

    let centerX = rect.left + rect.width / 2;
    let centerY = rect.top + rect.height / 2;

    centerX = clamp(centerX, horizontalMargin, viewportWidth - horizontalMargin);
    centerY = clamp(centerY, topMargin, viewportHeight - bottomMargin);

    const options = Array.from(dom.wheelOptions.querySelectorAll(".wheel-option"));

    dom.flagWheel.style.setProperty("--cx", `${centerX}px`);
    dom.flagWheel.style.setProperty("--cy", `${centerY}px`);
    dom.flagWheel.style.setProperty("--r", `${radius}px`);

    const optionGeometry = options.map((element, index) => {
      const angle = (WHEEL_ANGLES[index] * Math.PI) / 180;
      const offsetX = Math.cos(angle) * radius;
      const offsetY = Math.sin(angle) * radius;

      element.style.setProperty("--tx", `${offsetX}px`);
      element.style.setProperty("--ty", `${offsetY}px`);

      return {
        key: element.dataset.mark,
        element,
        x: centerX + offsetX,
        y: centerY + offsetY
      };
    });

    const currentMark = state.board[index]?.mark;
    const initialSelection =
      currentMark && currentMark !== "generic" ? currentMark : null;

    wheelState = {
      index,
      cellElement,
      centerX,
      centerY,
      radius,
      options: optionGeometry,
      selected: initialSelection
    };

    dom.flagWheel.classList.add("is-open");
    dom.flagWheel.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    setWheelSelection(initialSelection);
  }

  function updateWheelSelection(pointerX, pointerY) {
    if (!wheelState) return;

    const distanceFromCenter = Math.hypot(
      pointerX - wheelState.centerX,
      pointerY - wheelState.centerY
    );

    if (distanceFromCenter < wheelState.radius * 0.3) {
      setWheelSelection(null);
      return;
    }

    let nearestKey = null;
    let nearestDistance = Infinity;

    wheelState.options.forEach((option) => {
      const distance = Math.hypot(pointerX - option.x, pointerY - option.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestKey = option.key;
      }
    });

    setWheelSelection(nearestKey);
  }

  function setWheelSelection(key) {
    if (!wheelState) return;

    wheelState.selected = key;

    wheelState.options.forEach((option) => {
      const selected = option.key === key;
      option.element.classList.toggle("is-selected", selected);
      option.element.setAttribute("aria-selected", selected ? "true" : "false");
    });

    if (!key) {
      dom.wheelHint.textContent = "点击选择 · 点空白关闭";
      return;
    }

    if (key === "clear") {
      dom.wheelHint.textContent = "清除标记 · 点击确认";
      return;
    }

    const meta = TYPE_META[key];
    dom.wheelHint.textContent = `${meta.label} ${meta.symbol} · 点击确认`;
  }

  function applyWheelSelection() {
    if (!wheelState || !wheelState.selected) return;

    if (wheelState.selected === "clear") {
      setMark(wheelState.index, null);
    } else {
      setMark(wheelState.index, wheelState.selected);
    }
  }

  function closeWheel() {
    if (!wheelState) return;

    wheelState.options.forEach((option) => {
      option.element.classList.remove("is-selected");
    });

    wheelState = null;
    dom.flagWheel.classList.remove("is-open");
    dom.flagWheel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-right-pressing");
    document.body.style.overflow = "";

    if (press) press.cancelled = true;
  }

  /* =========================================================
     Rendering
     ========================================================= */

  function renderCell(index, options = {}) {
    if (!state) return;

    const cell = state.board[index];
    const element = dom.board.children[index];
    if (!cell || !element) return;

    element.className = "cell";
    element.innerHTML = "";

    if (cell.wrongFlag) element.classList.add("is-wrong-flag");

    if (cell.revealed && cell.mine) {
      element.classList.add("is-revealed", cell.detonated ? "is-detonated" : "is-revealed-mine");
      element.innerHTML = mineSvg(cell.mine);
    } else if (cell.mark) {
      element.classList.add("is-flagged", `mark-${cell.mark}`);
      element.innerHTML = flagSvg(cell.mark);
    } else if (cell.revealed) {
      element.classList.add("is-revealed");

      if (cell.neighborMines === 0) {
        element.classList.add("is-empty");
      } else {
        element.classList.add("is-number");
        const value = formatMagnitude(cell.valueSq);
        const sizeClass = value.length >= 5 ? "len-5" : value.length === 4 ? "len-4" : "";
        element.innerHTML = `<span class="cell-value tone-${valueTone(cell.valueSq)} ${sizeClass}">${value}</span>`;
      }
    }

    element.setAttribute("aria-label", describeCell(index));

    if (options.revealAnimation) {
      element.classList.add("just-revealed");
      window.setTimeout(() => element.classList.remove("just-revealed"), 300);
    }

    if (options.markAnimation) {
      element.classList.add("mark-pop");
      window.setTimeout(() => element.classList.remove("mark-pop"), 340);
    }
  }

  function describeCell(index) {
    if (!state) return "";

    const row = Math.floor(index / state.cols) + 1;
    const col = (index % state.cols) + 1;
    const cell = state.board[index];
    let description = "未翻开";

    if (cell.wrongFlag && cell.mine) {
      description = `类型标记错误，实际是${TYPE_META[cell.mine].label}`;
    } else if (cell.wrongFlag) {
      description = "标记错误，这格是安全的";
    } else if (cell.mark === "generic") {
      description = "标有普通旗";
    } else if (cell.mark) {
      description = `标有${TYPE_META[cell.mark].label}旗`;
    } else if (!cell.revealed) {
      description = "未翻开";
    } else if (cell.mine) {
      description = TYPE_META[cell.mine].label;
    } else if (cell.neighborMines === 0) {
      description = "空白";
    } else {
      description = `数字 ${formatMagnitude(cell.valueSq)}`;
    }

    return `第 ${row} 行第 ${col} 列，${description}`;
  }

  function buildTypeStats() {
    dom.typeStats.innerHTML = TYPE_ORDER.map((type) => {
      const meta = TYPE_META[type];

      return `
        <div class="type-stat" data-type-stat="${type}" style="--c:${meta.color};--soft:${meta.soft}">
          <div class="type-icon">${flagSvg(type)}</div>
          <div class="type-main">
            <div class="type-line">
              <span class="type-name">${meta.label}<em>${meta.symbol}</em></span>
              <span class="type-count"><strong class="used">0</strong><span>/</span><span class="total">${state.typeTotals[type]}</span></span>
            </div>
            <div class="type-bar" aria-hidden="true"><i></i></div>
          </div>
        </div>
      `;
    }).join("");
  }

  function updateTypeStats() {
    if (!state) return;

    const used = { p1: 0, n1: 0, pi: 0, ni: 0 };

    state.board.forEach((cell) => {
      if (cell.detonated && cell.mine) {
        used[cell.mine] += 1;
      } else if (cell.mark && cell.mark !== "generic") {
        used[cell.mark] += 1;
      }
    });

    TYPE_ORDER.forEach((type) => {
      const root = dom.typeStats.querySelector(`[data-type-stat="${type}"]`);
      if (!root) return;

      const total = state.typeTotals[type];
      const usedCount = used[type];
      const percentage = total > 0 ? Math.min(100, (usedCount / total) * 100) : 0;

      root.querySelector(".used").textContent = String(usedCount);
      root.querySelector(".total").textContent = String(total);
      root.querySelector(".type-bar i").style.width = `${percentage}%`;
      root.classList.toggle("is-over", usedCount > total);
    });
  }

  function updateTypeStatsPlaceholder() {
    if (!dom.typeStats || state) return;

    dom.typeStats.innerHTML = `
      <div class="type-stat" style="--c:#2d98de;--soft:#e1f3ff">
        <div class="type-icon">${flagSvg("p1")}</div>
        <div class="type-main">
          <div class="type-line">
            <span class="type-name">雷型数据</span>
            <span class="type-count"><strong>--</strong></span>
          </div>
          <div class="type-bar"><i style="width:0"></i></div>
        </div>
      </div>
    `;
  }

  function updateLives() {
    if (!state) return;

    const filled = Math.max(0, state.chances);
    dom.topLives.innerHTML = Array.from({ length: state.chancesTotal }, (_, index) =>
      heartSvg(index < filled)
    ).join("");

    dom.topLives.setAttribute("aria-label", `剩余 ${filled} 点血量`);
    dom.topLives.classList.toggle("is-danger", filled === 0);
    dom.topLivesStat?.classList.toggle("is-danger", filled === 0);

    if (state.ended) {
      if (state.won) {
        dom.lifeHint.textContent = "排雷成功，所有安全格都已翻开。";
        dom.lifeHint.classList.remove("is-danger");
      } else {
        dom.lifeHint.textContent = `第 ${state.chancesTotal + 1} 次踩雷，本局结束。`;
        dom.lifeHint.classList.add("is-danger");
      }
      return;
    }

    if (filled <= 0) {
      dom.lifeHint.textContent = "血量已用完，再踩雷就失败。";
      dom.lifeHint.classList.add("is-danger");
    } else if (filled === 1) {
      dom.lifeHint.textContent = "只剩 1 点血量，谨慎翻开。";
      dom.lifeHint.classList.add("is-danger");
    } else {
      dom.lifeHint.textContent = `还可承受 ${filled} 次踩雷，第 ${state.chancesTotal + 1} 次失败。`;
      dom.lifeHint.classList.remove("is-danger");
    }
  }

  function updateRunStats() {
    if (!state) return;

    const percentage = state.totalSafe > 0
      ? Math.min(100, (state.safeRevealed / state.totalSafe) * 100)
      : 0;

    dom.safeProgressText.textContent = `${state.safeRevealed} / ${state.totalSafe}`;
    dom.safeProgressBar.style.width = `${percentage}%`;
    dom.safeCount.textContent = String(state.safeRevealed);
    dom.safeTotal.textContent = String(state.totalSafe);
    dom.mistakeCount.textContent = String(state.mistakes);
  }

  function updateGameStatus() {
    if (!state) return;

    dom.gameStatus.classList.toggle("is-ended", state.ended);
    dom.gameStatus.classList.toggle(
      "is-warning",
      !state.ended && state.chances <= 0
    );

    if (state.ended) {
      dom.gameStatusText.textContent = state.won ? "排雷成功" : "挑战结束";
    } else if (state.chances <= 0) {
      dom.gameStatusText.textContent = "危险";
    } else {
      dom.gameStatusText.textContent = "进行中";
    }
  }

  /* =========================================================
     Result modal
     ========================================================= */

  function showResult(won) {
    if (!state || !state.ended) return;

    hideToast();
    document.body.style.overflow = "hidden";

    dom.resultEmblem.className = `result-emblem ${won ? "is-win" : "is-lose"}`;
    dom.resultEmblem.innerHTML = won ? successIcon() : failureIcon();
    dom.resultKicker.textContent = won ? "FIELD CLEARED" : "FIELD LOST";
    dom.resultTitle.textContent = won ? "排雷成功" : "挑战失败";

    if (won) {
      dom.resultDesc.textContent = state.mistakes === 0
        ? "零失误清理了整片复平面。数字与雷，都在你的掌控之中。"
        : `踩了 ${state.mistakes} 次雷，但仍然排清了所有安全格。`;
    } else {
      dom.resultDesc.textContent = `第 ${state.chancesTotal + 1} 次踩雷，排雷结束。再试一次，读懂那些相互抵消的雷。`;
    }

    dom.resultTime.textContent = formatTime(state.seconds);
    dom.resultSafe.textContent = `${state.safeRevealed} / ${state.totalSafe}`;
    dom.resultMistakes.textContent = String(state.mistakes);

    dom.resultModal.hidden = false;
    window.setTimeout(() => {
      if (!dom.resultModal.hidden) dom.btnNext.focus({ preventScroll: true });
    }, 80);
  }

  function hideResultModal() {
    if (resultTimer) {
      window.clearTimeout(resultTimer);
      resultTimer = null;
    }
    dom.resultModal.hidden = true;
    document.body.style.overflow = "";
  }

  function viewBoard() {
    hideResultModal();

    if (state && state.ended) {
      dom.boardFooter.hidden = true;
      dom.endBar.hidden = false;
      dom.btnEndNext.focus({ preventScroll: true });
    }
  }

  /* =========================================================
     Timer
     ========================================================= */

  function startTimer() {
    if (!state || state.timerStarted || state.ended) return;

    state.timerStarted = true;
    state.startTime = performance.now() - state.seconds * 1000;

    state.timerId = window.setInterval(() => {
      if (!state) return;
      const seconds = Math.floor((performance.now() - state.startTime) / 1000);
      if (seconds !== state.seconds) {
        state.seconds = seconds;
        dom.timer.textContent = formatTime(seconds);
      }
    }, 250);
  }

  function stopTimer() {
    if (!state) return;

    if (state.timerId) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }

    if (state.timerStarted) {
      state.seconds = Math.floor((performance.now() - state.startTime) / 1000);
      dom.timer.textContent = formatTime(state.seconds);
      state.timerStarted = false;
    }
  }

  function formatTime(seconds) {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const secs = safeSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  /* =========================================================
     Formatting & SVG
     ========================================================= */

  function formatMagnitude(valueSq) {
    if (!valueSq) return "0";

    let coefficient = 1;
    let radicand = valueSq;

    for (let factor = Math.floor(Math.sqrt(valueSq)); factor >= 2; factor -= 1) {
      const square = factor * factor;
      if (valueSq % square === 0) {
        coefficient = factor;
        radicand = valueSq / square;
        break;
      }
    }

    if (radicand === 1) return String(coefficient);
    if (coefficient === 1) return `√${radicand}`;

    return `${coefficient}√${radicand}`;
  }

  function valueTone(valueSq) {
    if (valueSq === 0) return 0;
    if (valueSq <= 2) return 1;
    if (valueSq <= 5) return 2;
    if (valueSq <= 9) return 3;
    if (valueSq <= 17) return 4;
    if (valueSq <= 29) return 5;
    return 6;
  }

  function flagSvg(mark) {
    const isGeneric = mark === "generic";
    const meta = isGeneric ? null : TYPE_META[mark];
    if (!isGeneric && !meta) return "";

    const color = meta ? meta.color : "#e04d65";
    const label = meta
      ? `<text x="22.8" y="18.3" text-anchor="middle" fill="#ffffff" font-family="Cascadia Code, Consolas, monospace" font-size="11.4" font-weight="800">${meta.symbol}</text>`
      : '<circle cx="23" cy="15.7" r="2.8" fill="#ffffff" opacity="0.95"/>';

    return `
      <svg class="flag-svg" viewBox="0 0 40 46" style="color:${color}" aria-hidden="true" focusable="false">
        <path d="M9.8 5V41.5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>
        <path d="M11.4 5.6h22.4L29.2 15l4.6 9.6H11.4z" fill="currentColor"/>
        ${label}
        <path d="M5.3 41.5h11.1" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" opacity="0.72"/>
      </svg>
    `;
  }

  function mineSvg(type) {
    const meta = TYPE_META[type];
    if (!meta) return "";

    return `
      <svg class="mine-svg" viewBox="0 0 56 56" style="color:${meta.color}" aria-hidden="true" focusable="false">
        <circle cx="28" cy="28" r="25.2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-dasharray="2.4 4.2" opacity="0.32"/>
        <circle cx="28" cy="28" r="21.8" fill="currentColor" opacity="0.13"/>
        <circle cx="28" cy="28" r="18.8" fill="currentColor"/>
        <circle cx="28" cy="28" r="18.8" fill="none" stroke="#ffffff" stroke-width="0.9" opacity="0.22"/>
        <circle cx="21.8" cy="21.4" r="4.4" fill="#ffffff" opacity="0.14"/>
        <text x="28" y="32.1" text-anchor="middle" fill="#ffffff" font-family="Cascadia Code, Consolas, monospace" font-size="11.6" font-weight="800">${meta.symbol}</text>
      </svg>
    `;
  }

  function heartSvg(filled) {
    return `
      <svg class="heart-icon ${filled ? "is-filled" : "is-empty"}" viewBox="0 0 24 22" aria-hidden="true" focusable="false">
        <path d="M12 20.4S2.6 14.7 2.6 7.9A4.9 4.9 0 0 1 12 4.9a4.9 4.9 0 0 1 9.4 3c0 6.8-9.4 12.5-9.4 12.5Z"/>
      </svg>
    `;
  }

  function successIcon() {
    return `
      <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
        <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.35"/>
        <path d="M11 20.5l5.8 5.7L29 13.5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }

  function failureIcon() {
    return `
      <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
        <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.35"/>
        <path d="M13 13l14 14M27 13L13 27" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>
      </svg>
    `;
  }

  /* =========================================================
     Small utilities
     ========================================================= */

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function showToast(message) {
    if (!dom.toast) return;

    if (toastTimer) window.clearTimeout(toastTimer);
    if (toastHideTimer) window.clearTimeout(toastHideTimer);

    dom.toast.hidden = false;
    dom.toast.textContent = message;

    window.requestAnimationFrame(() => {
      dom.toast.classList.add("is-visible");
    });

    toastTimer = window.setTimeout(() => {
      dom.toast.classList.remove("is-visible");
      toastHideTimer = window.setTimeout(() => {
        dom.toast.hidden = true;
      }, 280);
    }, 2200);
  }

  function hideToast() {
    if (toastTimer) {
      window.clearTimeout(toastTimer);
      toastTimer = null;
    }
    if (toastHideTimer) {
      window.clearTimeout(toastHideTimer);
      toastHideTimer = null;
    }
    if (!dom.toast) return;

    dom.toast.classList.remove("is-visible");
    dom.toast.hidden = true;
  }

  /* =========================================================
     Go
     ========================================================= */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
