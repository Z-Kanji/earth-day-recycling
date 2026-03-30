const urlParams = new URLSearchParams(window.location.search);
const ablyKey = urlParams.get("ablyKey");
const mode = urlParams.get("mode");

let ably, channel;

if (ablyKey) {
  ably = new Ably.Realtime(ablyKey);
  channel = ably.channels.get("recycling-game");
}

const GAME_DURATION = 60;

const itemsDataOriginal = [
  { img: "aerosol.png", type: "metal" },
  { img: "bag.png", type: "paper" },
  { img: "bottle.png", type: "plastic" },
  { img: "box.png", type: "paper" },
  { img: "can.png", type: "metal" },
  { img: "coke.png", type: "glass" },
  { img: "jar.png", type: "glass" },
  { img: "ketchup.png", type: "plastic" },
  { img: "milk.png", type: "plastic" },
  { img: "paper.png", type: "paper" },
  { img: "perfume.png", type: "glass" },
  { img: "tin.png", type: "metal" }
];

let itemsData = [];
let state = {
  phase: "idle", // idle | playing | win | lose
  score: 0,
  time: GAME_DURATION,
  currentIndex: 0,
  dragging: false,
  x: 0,
  y: 0,
  startTimeMs: 0,
  itemKey: ""
};

let timerRafId = null;
let renderRafId = null;
let confettiInterval = null;
let confettiStarted = false;

const container = document.getElementById("current-item");
const bins = document.querySelectorAll(".bin");
const timerDisplay = document.getElementById("timer");
const scoreDisplay = document.getElementById("score");
const startBtn = document.getElementById("startBtn");
const flash = document.getElementById("flash");
const endScreen = document.getElementById("endScreen");
const endText = document.getElementById("endText");
const restartBtn = document.getElementById("restartBtn");
const confettiContainer = document.getElementById("confetti-container");

let draggingItem = null;
let offsetX = 0;
let offsetY = 0;

let currentImgEl = null;
let currentRenderedKey = "";
let sizeLocked = false;
let lastPublishedState = "";

function shuffleNoRepeat(arr) {
  let valid = false;
  let result = [];

  while (!valid) {
    result = [...arr].sort(() => Math.random() - 0.5);
    valid = true;

    for (let i = 1; i < result.length; i++) {
      if (result[i].type === result[i - 1].type) {
        valid = false;
        break;
      }
    }
  }

  return result;
}

function publish(name, data) {
  if (mode === "master" && channel) {
    channel.publish(name, data);
  }
}

function publishState() {
  if (mode !== "master" || !channel || state.phase === "idle") return;

  const payload = {
    phase: state.phase,
    score: state.score,
    time: state.time,
    currentIndex: state.currentIndex,
    dragging: state.dragging,
    x: state.x,
    y: state.y,
    startTimeMs: state.startTimeMs,
    itemKey: state.itemKey
  };

  const serial = JSON.stringify(payload);
  if (serial === lastPublishedState) return;
  lastPublishedState = serial;

  publish("state", payload);
}

function subscribe() {
  if (mode !== "follow" || !channel) return;

  channel.subscribe(msg => {
    const { name, data } = msg;

    if (name === "gameStart") {
      applyGameStart(data);
    } else if (name === "state") {
      applyStateSnapshot(data);
    }
  });
}

function applyGameStart(data) {
  itemsData = data.itemsData || [];
  state.phase = "playing";
  state.score = 0;
  state.time = GAME_DURATION;
  state.currentIndex = 0;
  state.dragging = false;
  state.x = 0;
  state.y = 0;
  state.startTimeMs = data.startTimeMs || Date.now();
  state.itemKey = itemsData[0] ? itemsData[0].img : "";
  currentRenderedKey = "";
  currentImgEl = null;
  sizeLocked = false;

  startBtn.disabled = true;
  endScreen.classList.add("hidden");
  stopConfetti();

  renderState();
  startRenderLoop();
}

function applyStateSnapshot(snapshot) {
  if (!snapshot) return;

  state.phase = snapshot.phase;
  state.score = snapshot.score;
  state.time = snapshot.time;
  state.currentIndex = snapshot.currentIndex;
  state.dragging = snapshot.dragging;
  state.x = snapshot.x;
  state.y = snapshot.y;
  state.startTimeMs = snapshot.startTimeMs;
  state.itemKey = snapshot.itemKey;

  renderState();
}

function startGame() {
  stopConfetti();

  itemsData = shuffleNoRepeat(itemsDataOriginal);

  state = {
    phase: "playing",
    score: 0,
    time: GAME_DURATION,
    currentIndex: 0,
    dragging: false,
    x: 0,
    y: 0,
    startTimeMs: Date.now(),
    itemKey: itemsData[0] ? itemsData[0].img : ""
  };

  currentRenderedKey = "";
  currentImgEl = null;
  sizeLocked = false;
  lastPublishedState = "";

  scoreDisplay.innerText = "Score: 0";
  timerDisplay.innerText = String(GAME_DURATION);
  startBtn.disabled = true;
  endScreen.classList.add("hidden");
  confettiContainer.innerHTML = "";

  renderState();
  publish("gameStart", {
    itemsData,
    startTimeMs: state.startTimeMs
  });

  startTimerLoops();
}

function startTimerLoops() {
  cancelAnimationFrame(timerRafId);
  cancelAnimationFrame(renderRafId);

  const tick = () => {
    if (state.phase === "playing") {
      const elapsed = Math.floor((Date.now() - state.startTimeMs) / 1000);
      const remaining = Math.max(0, GAME_DURATION - elapsed);
      state.time = remaining;

      if (mode === "master" && remaining <= 0) {
        endGame("lose");
        return;
      }
    }

    renderState();

    if (mode === "master") {
      publishState();
    }

    timerRafId = requestAnimationFrame(tick);
  };

  timerRafId = requestAnimationFrame(tick);
}

function startRenderLoop() {
  cancelAnimationFrame(renderRafId);

  const loop = () => {
    renderState();
    renderRafId = requestAnimationFrame(loop);
  };

  renderRafId = requestAnimationFrame(loop);
}

function renderState() {
  timerDisplay.innerText = String(state.time);
  scoreDisplay.innerText = "Score: " + state.score;

  if (state.phase === "playing") {
    const currentItem = itemsData[state.currentIndex];
    if (!currentItem) return;

    const itemKey = currentItem.img;

    if (!currentImgEl || currentRenderedKey !== itemKey) {
      container.innerHTML = "";
      currentRenderedKey = itemKey;

      const img = document.createElement("img");
      img.src = currentItem.img;
      img.dataset.type = currentItem.type;
      img.dataset.key = itemKey;
      img.style.position = "absolute";
      img.style.top = "50%";
      img.style.left = "50%";
      img.style.transform = "translate(-50%, -50%)";
      img.style.zIndex = "1000";
      img.style.willChange = "transform, left, top";
      img.style.pointerEvents = "auto";

      if (mode === "master") {
        img.addEventListener("mousedown", startDrag);
      }

      container.appendChild(img);
      currentImgEl = img;
      sizeLocked = false;
    }

    if (currentImgEl) {
      currentImgEl.style.zIndex = "1000";

      if (state.dragging) {
        if (!sizeLocked) {
          const rect = currentImgEl.getBoundingClientRect();
          currentImgEl.style.width = rect.width + "px";
          currentImgEl.style.height = rect.height + "px";
          sizeLocked = true;
        }

        currentImgEl.style.position = "fixed";
        currentImgEl.style.left = state.x + "px";
        currentImgEl.style.top = state.y + "px";
        currentImgEl.style.transform = "none";
      } else {
        currentImgEl.style.position = "absolute";
        currentImgEl.style.left = "50%";
        currentImgEl.style.top = "50%";
        currentImgEl.style.transform = "translate(-50%, -50%)";
        currentImgEl.style.width = "";
        currentImgEl.style.height = "";
        sizeLocked = false;
      }
    }
  } else {
    container.innerHTML = "";
    currentImgEl = null;
    currentRenderedKey = "";
    sizeLocked = false;

    if (state.phase === "win" || state.phase === "lose") {
      endText.innerText = state.phase === "win" ? "YOU WIN" : "YOU LOSE";
      endScreen.classList.remove("hidden");

      if (state.phase === "win") {
        if (!confettiStarted) startConfetti();
      } else {
        stopConfetti();
      }
    }
  }
}

function startDrag(e) {
  if (state.phase !== "playing") return;

  draggingItem = e.target;
  const rect = draggingItem.getBoundingClientRect();

  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;

  state.dragging = true;
  state.x = rect.left;
  state.y = rect.top;

  draggingItem.style.position = "fixed";
  draggingItem.style.left = rect.left + "px";
  draggingItem.style.top = rect.top + "px";
  draggingItem.style.transform = "none";
  draggingItem.style.zIndex = "1000";

  publishState();

  window.addEventListener("mousemove", drag);
  window.addEventListener("mouseup", drop);
}

function drag(e) {
  if (!draggingItem || state.phase !== "playing") return;

  state.x = e.clientX - offsetX;
  state.y = e.clientY - offsetY;

  draggingItem.style.left = state.x + "px";
  draggingItem.style.top = state.y + "px";
  draggingItem.style.zIndex = "1000";

  publishState();
}

function drop(e) {
  if (!draggingItem || state.phase !== "playing") return;

  let hitBin = null;

  bins.forEach(bin => {
    const rect = bin.getBoundingClientRect();
    if (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    ) {
      hitBin = bin;
    }
  });

  const droppedCorrectly =
    !!hitBin && hitBin.dataset.type === draggingItem.dataset.type;

  if (droppedCorrectly) {
    state.score += 1;
    state.currentIndex += 1;
    state.dragging = false;
    state.x = 0;
    state.y = 0;

    if (state.currentIndex >= itemsData.length) {
      state.phase = "win";
      publishState();
      endGame("win");
    } else {
      state.itemKey = itemsData[state.currentIndex].img;
      currentRenderedKey = "";
      currentImgEl = null;
      sizeLocked = false;
      renderState();
      publishState();
    }
  } else if (hitBin) {
    flashRed();
    state.dragging = false;
    state.x = 0;
    state.y = 0;
    renderState();
    publishState();
  } else {
    state.dragging = false;
    state.x = 0;
    state.y = 0;
    renderState();
    publishState();
  }

  window.removeEventListener("mousemove", drag);
  window.removeEventListener("mouseup", drop);
  draggingItem = null;
}

function flashRed() {
  flash.style.opacity = 0.6;
  setTimeout(() => {
    flash.style.opacity = 0;
  }, 1000);
}

function endGame(result) {
  state.phase = result;
  state.dragging = false;
  state.x = 0;
  state.y = 0;

  cancelAnimationFrame(timerRafId);

  endText.innerText = result === "win" ? "YOU WIN" : "YOU LOSE";
  endScreen.classList.remove("hidden");
  startBtn.disabled = false;

  if (result === "win") {
    startConfetti();
  } else {
    stopConfetti();
  }

  publish("state", {
    phase: state.phase,
    score: state.score,
    time: state.time,
    currentIndex: state.currentIndex,
    dragging: false,
    x: 0,
    y: 0,
    startTimeMs: state.startTimeMs,
    itemKey: state.itemKey
  });
}

function startConfetti() {
  if (confettiStarted) return;
  confettiStarted = true;

  const colors = ["#ff4d4d", "#4dff88", "#4da6ff", "#ffff66", "#ff66ff"];

  confettiInterval = setInterval(() => {
    for (let i = 0; i < 10; i++) {
      const c = document.createElement("div");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = colors[Math.floor(Math.random() * colors.length)];
      c.style.animationDuration = (2 + Math.random() * 2) + "s";
      confettiContainer.appendChild(c);

      setTimeout(() => c.remove(), 3000);
    }
  }, 200);

  setTimeout(() => {
    stopConfetti();
  }, 15000);
}

function stopConfetti() {
  confettiStarted = false;

  if (confettiInterval) {
    clearInterval(confettiInterval);
    confettiInterval = null;
  }

  confettiContainer.innerHTML = "";
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", () => {
  stopConfetti();
  startGame();
});

subscribe();
startRenderLoop();
