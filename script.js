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

let state = {
  time: 60,
  score: 0,
  index: 0,
  item: null,
  x: 0,
  y: 0,
  dragging: false,
  status: "idle" // idle | playing | win | lose
};

let itemsData = [];
let timerInterval;

const container = document.getElementById("current-item");
const bins = document.querySelectorAll(".bin");
const timerDisplay = document.getElementById("timer");
const scoreDisplay = document.getElementById("score");
const startBtn = document.getElementById("startBtn");
const flash = document.getElementById("flash");
const endScreen = document.getElementById("endScreen");
const endText = document.getElementById("endText");

let dragging = false;
let offsetX = 0;
let offsetY = 0;

function publishState() {
  if (mode === "master" && channel) {
    channel.publish("state", state);
  }
}

function subscribe() {
  if (mode !== "follow" || !channel) return;

  channel.subscribe("state", msg => {
    state = msg.data;
    render();
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

function startGame() {
  itemsData = shuffleNoRepeat(itemsDataOriginal);

  state = {
    time: 60,
    score: 0,
    index: 0,
    item: itemsData[0],
    x: 0,
    y: 0,
    dragging: false,
    status: "playing"
  };

  startBtn.disabled = true;
  endScreen.classList.add("hidden");

  startTimer();
  gameLoop();
}

function startTimer() {
  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    if (state.status !== "playing") return;

    state.time--;

    if (state.time <= 0) {
      state.time = 0;
      state.status = "lose";
      clearInterval(timerInterval);
    }

  }, 1000);
}

function gameLoop() {
  if (mode === "master") {
    render();
    publishState();
    requestAnimationFrame(gameLoop);
  }
}

function render() {
  timerDisplay.innerText = state.time;
  scoreDisplay.innerText = "Score: " + state.score;

  container.innerHTML = "";

  if (!state.item) return;

  const img = document.createElement("img");
  img.src = state.item.img;

  if (state.dragging) {
    img.style.position = "fixed";
    img.style.left = state.x + "px";
    img.style.top = state.y + "px";
    img.style.zIndex = 1000;
  } else {
    img.style.position = "absolute";
    img.style.left = "50%";
    img.style.top = "50%";
    img.style.transform = "translate(-50%, -50%)";
  }

  if (mode === "master") {
    img.addEventListener("mousedown", startDrag);
  }

  container.appendChild(img);

  if (state.status === "win" || state.status === "lose") {
    endText.innerText = state.status === "win" ? "YOU WIN" : "YOU LOSE";
    endScreen.classList.remove("hidden");
  }
}

function startDrag(e) {
  dragging = true;
  state.dragging = true;

  const rect = e.target.getBoundingClientRect();
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;

  window.addEventListener("mousemove", drag);
  window.addEventListener("mouseup", drop);
}

function drag(e) {
  if (!dragging) return;

  state.x = e.clientX - offsetX;
  state.y = e.clientY - offsetY;
}

function drop(e) {
  dragging = false;
  state.dragging = false;

  let correct = false;

  bins.forEach(bin => {
    const rect = bin.getBoundingClientRect();
    if (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    ) {
      if (bin.dataset.type === state.item.type) {
        correct = true;
      }
    }
  });

  if (correct) {
    state.score++;
    state.index++;

    if (state.index >= itemsData.length) {
      state.status = "win";
      clearInterval(timerInterval);
    } else {
      state.item = itemsData[state.index];
    }
  } else {
    flashRed();
  }

  window.removeEventListener("mousemove", drag);
  window.removeEventListener("mouseup", drop);
}

function flashRed() {
  flash.style.opacity = 0.6;
  setTimeout(() => flash.style.opacity = 0, 1000);
}

startBtn.addEventListener("click", startGame);

subscribe();
