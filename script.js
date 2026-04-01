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
  phase: "idle",
  score: 0,
  time: GAME_DURATION,
  currentIndex: 0,
  dragging: false,
  x: 0,
  y: 0,
  startTimeMs: 0,
  flashUntil: 0
};

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
let dragOffset = { x: 0, y: 0 };
let currentRenderedIndex = -1;
let currentImgEl = null;
let confettiInterval = null;
let confettiStarted = false;
let publishQueued = false;
let lastPublishedState = "";
let loopStarted = false;

if (mode === "follow") {
  startBtn.style.display = "none";
  restartBtn.style.display = "none";
}

// --- Publish functions for Ably ---
function publish(name, data) {
  if (mode === "master" && channel) {
    channel.publish(name, data);
  }
}

function publishState() {
  if (mode !== "master" || !channel || state.phase === "idle") return;
  const payload = { ...state };
  const serial = JSON.stringify(payload);
  if (serial === lastPublishedState) return;
  lastPublishedState = serial;
  publish("state", payload);
}

function schedulePublish() {
  if (mode !== "master" || publishQueued) return;
  publishQueued = true;
  requestAnimationFrame(() => {
    publishQueued = false;
    publishState();
  });
}

function subscribe() {
  if (mode !== "follow" || !channel) return;
  channel.subscribe(msg => {
    const { name, data } = msg;
    if (name === "gameStart") applyGameStart(data);
    else if (name === "state") applyStateSnapshot(data);
  });
}

// --- Shuffle function ---
function shuffleNoRepeat(arr) {
  let valid = false, result = [];
  while (!valid) {
    result = [...arr].sort(() => Math.random() - 0.5);
    valid = true;
    for (let i = 1; i < result.length; i++) {
      if (result[i].type === result[i-1].type) { valid = false; break; }
    }
  }
  return result;
}

// --- Game start ---
function startGame(publishEvent = true, incomingData = null) {
  if (mode === "master") {
    itemsData = shuffleNoRepeat(itemsDataOriginal);
    state.startTimeMs = Date.now();
    publish("gameStart", { itemsData, startTimeMs: state.startTimeMs });
  } else {
    itemsData = incomingData.itemsData;
    state.startTimeMs = incomingData.startTimeMs;
  }
  state.phase = "playing";
  state.score = 0;
  state.time = GAME_DURATION;
  state.currentIndex = 0;
  state.dragging = false;
  state.x = 0;
  state.y = 0;
  state.flashUntil = 0;

  draggingItem = null;
  dragOffset = { x: 0, y: 0 };
  currentRenderedIndex = -1;
  currentImgEl = null;

  scoreDisplay.innerText = "Score: 0";
  timerDisplay.innerText = String(GAME_DURATION);
  startBtn.disabled = true;
  endScreen.classList.add("hidden");
  confettiContainer.innerHTML = "";
  stopConfetti();

  renderState();
  startLoop();
}

function applyGameStart(data) {
  itemsData = data.itemsData || [];
  state.startTimeMs = data.startTimeMs || Date.now();
  state.phase = "playing";
  state.score = 0;
  state.time = GAME_DURATION;
  state.currentIndex = 0;
  state.dragging = false;
  state.x = 0;
  state.y = 0;
  state.flashUntil = 0;

  draggingItem = null;
  dragOffset = { x: 0, y: 0 };
  currentRenderedIndex = -1;
  currentImgEl = null;

  startBtn.disabled = true;
  endScreen.classList.add("hidden");
  confettiContainer.innerHTML = "";
  stopConfetti();

  renderState();
  startLoop();
}

function applyStateSnapshot(snapshot) {
  if (!snapshot) return;
  Object.assign(state, snapshot);
  renderState();
}

// --- Render item ---
function createCurrentItem() {
  container.innerHTML = "";
  currentRenderedIndex = state.currentIndex;

  const item = itemsData[state.currentIndex];
  if (!item) { currentImgEl = null; return; }

  const img = document.createElement("img");
  img.src = item.img;
  img.dataset.type = item.type;
  img.style.position = "absolute";
  img.style.top = "50%";
  img.style.left = "50%";
  img.style.transform = "translate(-50%, -50%)";
  img.style.zIndex = "1000";
  img.style.pointerEvents = "auto";
  img.style.userSelect = "none";
  img.style.webkitUserDrag = "none";

  if (mode === "master") img.addEventListener("mousedown", startDrag);

  container.appendChild(img);
  currentImgEl = img;
}

function updateClock() {
  if (state.phase !== "playing" || !state.startTimeMs) return;
  const elapsed = Math.floor((Date.now() - state.startTimeMs)/1000);
  state.time = Math.max(0, GAME_DURATION - elapsed);
  if (mode === "master" && state.time <= 0) endGame("lose");
}

function renderState() {
  timerDisplay.innerText = String(state.time);
  scoreDisplay.innerText = "Score: " + state.score;

  if (state.phase === "playing") {
    if (currentRenderedIndex !== state.currentIndex || !currentImgEl) createCurrentItem();

    if (currentImgEl) {
      currentImgEl.style.position = state.dragging ? "fixed" : "absolute";
      currentImgEl.style.left = state.dragging ? state.x + "px" : "50%";
      currentImgEl.style.top = state.dragging ? state.y + "px" : "50%";
      currentImgEl.style.transform = state.dragging ? "none" : "translate(-50%, -50%)";
    }

    if (state.flashUntil && Date.now() >= state.flashUntil) state.flashUntil = 0;
  } else if (state.phase === "win" || state.phase === "lose") {
    container.innerHTML = "";
    currentImgEl = null;
    currentRenderedIndex = -1;
    timerDisplay.innerText = String(state.time);
    scoreDisplay.innerText = "Score: " + state.score;
    endText.innerText = state.phase === "win" ? "YOU WIN" : "YOU LOSE";
    endScreen.classList.remove("hidden");
    if (state.phase === "win") startConfetti();
    else stopConfetti();
  }

  flash.style.opacity = (state.flashUntil && Date.now() < state.flashUntil) ? 0.6 : 0;
}

// --- Dragging ---
function startDrag(e) {
  if (state.phase !== "playing") return;
  draggingItem = e.target;
  const rect = draggingItem.getBoundingClientRect();
  dragOffset.x = e.clientX - rect.left;
  dragOffset.y = e.clientY - rect.top;
  state.dragging = true;
  state.x = rect.left;
  state.y = rect.top;

  window.addEventListener("mousemove", drag);
  window.addEventListener("mouseup", drop);
}

function drag(e) {
  if (!draggingItem) return;
  state.x = e.clientX - dragOffset.x;
  state.y = e.clientY - dragOffset.y;
  draggingItem.style.left = state.x + "px";
  draggingItem.style.top = state.y + "px";
  schedulePublish();
}

function drop(e) {
  if (!draggingItem) return;

  let hitBin = null;
  bins.forEach(bin => {
    const rect = bin.getBoundingClientRect();
    if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom)
      hitBin = bin;
  });

  const correct = hitBin && hitBin.dataset.type === draggingItem.dataset.type;
  if (correct) state.score++, state.currentIndex++;
  else if (hitBin) state.flashUntil = Date.now() + 1000;

  state.dragging = false;
  state.x = 0;
  state.y = 0;

  renderState();
  publishState();

  if (state.currentIndex >= itemsData.length) endGame("win");

  window.removeEventListener("mousemove", drag);
  window.removeEventListener("mouseup", drop);
  draggingItem = null;
}

// --- Game end ---
function endGame(result) {
  state.phase = result;
  state.dragging = false;
  state.x = 0;
  state.y = 0;
  state.flashUntil = 0;
  renderState();
  publishState();
  if (result === "win") startConfetti(); else stopConfetti();
}

// --- Confetti ---
function startConfetti() {
  if (confettiStarted) return;
  confettiStarted = true;
  const colors = ["#ff4d4d","#4dff88","#4da6ff","#ffff66","#ff66ff"];
  confettiInterval = setInterval(() => {
    for (let i=0;i<10;i++){
      const c = document.createElement("div");
      c.className = "confetti";
      c.style.left = Math.random()*100+"vw";
      c.style.background = colors[Math.floor(Math.random()*colors.length)];
      c.style.animationDuration = (2+Math.random()*2)+"s";
      confettiContainer.appendChild(c);
      setTimeout(()=>c.remove(),3000);
    }
  },200);
  setTimeout(stopConfetti,15000);
}

function stopConfetti() {
  confettiStarted = false;
  if (confettiInterval) clearInterval(confettiInterval);
  confettiContainer.innerHTML = "";
}

// --- Game loop ---
function startLoop() {
  if (loopStarted) return;
  loopStarted = true;
  const loop = () => { updateClock(); renderState(); if (mode==="master") publishState(); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}

startBtn.addEventListener("click", ()=>{ if(mode==="master") startGame(true); });
restartBtn.addEventListener("click", ()=>{ if(mode==="master"){stopConfetti();startGame(true);} });

subscribe();
startLoop();
