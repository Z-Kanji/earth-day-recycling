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

let draggingItem = null;
let offsetX = 0;
let offsetY = 0;

// prevent same type back-to-back
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
  currentIndex = 0;
  score = 0;
  time = 60;
  gameActive = true;

  scoreDisplay.innerText = "Score: 0";
  timerDisplay.innerText = "60";
  startBtn.disabled = true;
  endScreen.classList.add("hidden");

  showItem();
  startTimer();
}

function showItem() {
  container.innerHTML = "";

  if (currentIndex >= itemsData.length) {
    winGame();
    return;
  }

  const item = itemsData[currentIndex];
  const img = document.createElement("img");
  img.src = item.img;
  img.dataset.type = item.type;

  img.onload = () => {
    const c = container.getBoundingClientRect();
    const r = img.getBoundingClientRect();
    img.style.left = (c.width / 2 - r.width / 2) + "px";
    img.style.top = (c.height / 2 - r.height / 2) + "px";
  };

  img.addEventListener("mousedown", startDrag);
  container.appendChild(img);
}

function startDrag(e) {
  if (!gameActive) return;

  draggingItem = e.target;
  const rect = draggingItem.getBoundingClientRect();

  // preserve size
  draggingItem.style.width = rect.width + "px";
  draggingItem.style.height = rect.height + "px";

  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;

  draggingItem.style.position = "fixed";
  draggingItem.style.left = rect.left + "px";
  draggingItem.style.top = rect.top + "px";
  draggingItem.style.zIndex = 1000;

  window.addEventListener("mousemove", drag);
  window.addEventListener("mouseup", drop);
}

function drag(e) {
  if (!draggingItem) return;

  draggingItem.style.left = (e.clientX - offsetX) + "px";
  draggingItem.style.top = (e.clientY - offsetY) + "px";
}

function drop(e) {
  if (!draggingItem) return;

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

  if (hitBin && hitBin.dataset.type === draggingItem.dataset.type) {
    // CORRECT
    score++;
    scoreDisplay.innerText = "Score: " + score;

    draggingItem.remove();
    currentIndex++;
    showItem();

  } else if (hitBin) {
    // WRONG
    flashRed();

    // reset to center
    draggingItem.style.position = "absolute";
    draggingItem.style.left = "50%";
    draggingItem.style.top = "0px";
    draggingItem.style.transform = "translateX(-50%)";
  } else {
    // dropped outside, just reset
    draggingItem.style.position = "absolute";
    draggingItem.style.left = "50%";
    draggingItem.style.top = "0px";
    draggingItem.style.transform = "translateX(-50%)";
  }

  window.removeEventListener("mousemove", drag);
  window.removeEventListener("mouseup", drop);
  draggingItem = null;
}

function flashRed() {
  flash.style.opacity = 0.6;
  setTimeout(() => flash.style.opacity = 0, 1000);
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    time--;
    timerDisplay.innerText = time;

    if (time <= 0) loseGame();
  }, 1000);
}

function winGame() {
  clearInterval(timerInterval);
  gameActive = false;
  endText.innerText = "YOU WIN";
  endScreen.classList.remove("hidden");
  startBtn.disabled = false;
}

function loseGame() {
  clearInterval(timerInterval);
  gameActive = false;
  endText.innerText = "YOU LOSE";
  endScreen.classList.remove("hidden");
  startBtn.disabled = false;
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);
