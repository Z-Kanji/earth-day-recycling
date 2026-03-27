const urlParams = new URLSearchParams(window.location.search);
const ablyKey = urlParams.get("ablyKey");
const mode = urlParams.get("mode");

let ably, channel;

if (ablyKey) {
  ably = new Ably.Realtime(ablyKey);
  channel = ably.channels.get("recycling-game");
}

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
let currentIndex = 0;
let score = 0;
let time = 60;
let gameActive = false;
let timerInterval;

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

function publish(name, data) {
  if (mode === "master" && channel) {
    channel.publish(name, data);
  }
}

function subscribe() {
  if (mode !== "follow" || !channel) return;

  channel.subscribe(msg => {
    const { name, data } = msg;

    if (name === "start") startGame(false, data);
    if (name === "item") renderItem(data);
    if (name === "move") moveItem(data);
    if (name === "drop") handleDropResult(data);
    if (name === "flash") flashRed();
    if (name === "timer") updateTimer(data);
    if (name === "end") showEnd(data);
  });
}

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

function startGame(publishEvent = true, incomingData = null) {
  if (mode === "master") {
    itemsData = shuffleNoRepeat(itemsDataOriginal);
    publish("start", itemsData);
  } else {
    itemsData = incomingData;
  }

  currentIndex = 0;
  score = 0;
  time = 60;
  gameActive = true;

  scoreDisplay.innerText = "Score: 0";
  timerDisplay.innerText = "60";
  startBtn.disabled = true;
  endScreen.classList.add("hidden");

  showItem();

  if (mode === "master") startTimer();
}

function showItem() {
  const item = itemsData[currentIndex];
  renderItem(item);

  if (mode === "master") {
    publish("item", item);
  }
}

function renderItem(item) {
  container.innerHTML = "";

  const img = document.createElement("img");
  img.src = item.img;
  img.dataset.type = item.type;

  img.style.top = "50%";
  img.style.left = "50%";
  img.style.transform = "translate(-50%, -50%)";
  img.style.zIndex = 1000;

  if (mode === "master") {
    img.addEventListener("mousedown", startDrag);
  }

  container.appendChild(img);
}

function startDrag(e) {
  if (!gameActive) return;

  draggingItem = e.target;
  const rect = draggingItem.getBoundingClientRect();

  draggingItem.style.transform = "none";
  draggingItem.style.width = rect.width + "px";
  draggingItem.style.height = rect.height + "px";

  draggingItem.style.position = "fixed";
  draggingItem.style.left = rect.left + "px";
  draggingItem.style.top = rect.top + "px";
  draggingItem.style.zIndex = 1000;

  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;

  window.addEventListener("mousemove", drag);
  window.addEventListener("mouseup", drop);
}

function drag(e) {
  if (!draggingItem) return;

  const x = e.clientX - offsetX;
  const y = e.clientY - offsetY;

  draggingItem.style.left = x + "px";
  draggingItem.style.top = y + "px";

  publish("move", { x, y });
}

function moveItem(data) {
  const img = container.querySelector("img");
  if (!img) return;

  img.style.position = "fixed";
  img.style.left = data.x + "px";
  img.style.top = data.y + "px";
  img.style.transform = "none";
  img.style.zIndex = 1000;
}

function drop(e) {
  let correct = false;

  bins.forEach(bin => {
    const rect = bin.getBoundingClientRect();
    if (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    ) {
      if (bin.dataset.type === draggingItem.dataset.type) {
        correct = true;
      }
    }
  });

  handleDropResult({ correct });
  publish("drop", { correct });

  window.removeEventListener("mousemove", drag);
  window.removeEventListener("mouseup", drop);
  draggingItem = null;
}

function handleDropResult(data) {
  const img = container.querySelector("img");

  if (data.correct) {
    score++;
    scoreDisplay.innerText = "Score: " + score;

    img.remove();
    currentIndex++;

    if (currentIndex >= itemsData.length) {
      winGame();
    } else {
      showItem();
    }

  } else {
    flashRed();
    publish("flash");

    img.style.position = "absolute";
    img.style.left = "50%";
    img.style.top = "50%";
    img.style.transform = "translate(-50%, -50%)";
  }
}

function flashRed() {
  flash.style.opacity = 0.6;
  setTimeout(() => flash.style.opacity = 0, 1000);
}

function startTimer() {
  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    if (!gameActive) return;

    time--;
    updateTimer(time);
    publish("timer", time);

    if (time <= 0) {
      time = 0;
      loseGame();
    }
  }, 1000);
}

function updateTimer(t) {
  timerDisplay.innerText = t;
}

function winGame() {
  clearInterval(timerInterval);
  gameActive = false;

  endText.innerText = "YOU WIN";
  endScreen.classList.remove("hidden");
  startBtn.disabled = false;

  publish("end", "win");
  startConfetti();
}

function loseGame() {
  clearInterval(timerInterval);
  gameActive = false;

  endText.innerText = "YOU LOSE";
  endScreen.classList.remove("hidden");
  startBtn.disabled = false;

  publish("end", "lose");
}

function showEnd(result) {
  gameActive = false;

  endText.innerText = result === "win" ? "YOU WIN" : "YOU LOSE";
  endScreen.classList.remove("hidden");

  if (result === "win") startConfetti();
}

function startConfetti() {
  const colors = ["#ff4d4d", "#4dff88", "#4da6ff", "#ffff66", "#ff66ff"];

  const interval = setInterval(() => {
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
    clearInterval(interval);
    confettiContainer.innerHTML = "";
  }, 15000);
}

startBtn.addEventListener("click", () => startGame(true));
restartBtn.addEventListener("click", () => startGame(true));

subscribe();
