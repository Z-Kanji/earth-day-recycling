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

const currentItemContainer = document.getElementById("current-item");
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

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function startGame() {
  itemsData = shuffle(itemsDataOriginal);
  currentIndex = 0;
  score = 0;
  time = 60;
  gameActive = true;

  scoreDisplay.innerText = "Score: 0";
  timerDisplay.innerText = "60";
  startBtn.disabled = true;
  endScreen.classList.add("hidden");

  showNextItem();
  startTimer();
}

function showNextItem() {
  currentItemContainer.innerHTML = "";

  if (currentIndex >= itemsData.length) {
    winGame();
    return;
  }

  const item = itemsData[currentIndex];
  const img = document.createElement("img");
  img.src = item.img;
  img.dataset.type = item.type;

  img.onload = () => {
    const container = currentItemContainer.getBoundingClientRect();
    const rect = img.getBoundingClientRect();
    img.style.left = (container.width / 2 - rect.width / 2) + "px";
    img.style.top = (container.height / 2 - rect.height / 2) + "px";
  };

  img.addEventListener("mousedown", startDrag);
  currentItemContainer.appendChild(img);
}

function startDrag(e) {
  if (!gameActive) return;

  draggingItem = e.target;
  const rect = draggingItem.getBoundingClientRect();

  draggingItem.style.width = rect.width + "px";
  draggingItem.style.height = rect.height + "px";

  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;

  draggingItem.style.position = "fixed";
  draggingItem.style.left = rect.left + "px";
  draggingItem.style.top = rect.top + "px";
  draggingItem.style.zIndex = 1000;

  window.addEventListener("mousemove", dragItem);
  window.addEventListener("mouseup", dropItem);
}

function dragItem(e) {
  if (!draggingItem) return;
  draggingItem.style.left = (e.clientX - offsetX) + "px";
  draggingItem.style.top = (e.clientY - offsetY) + "px";
}

function dropItem(e) {
  if (!draggingItem) return;

  let matchedBin = null;

  // ✅ KEY FIX: use mouse position instead of item bounds
  const mouseX = e.clientX;
  const mouseY = e.clientY;

  bins.forEach(bin => {
    const rect = bin.getBoundingClientRect();

    if (
      mouseX >= rect.left &&
      mouseX <= rect.right &&
      mouseY >= rect.top &&
      mouseY <= rect.bottom
    ) {
      matchedBin = bin;
    }
  });

  if (matchedBin) {
    if (draggingItem.dataset.type === matchedBin.dataset.type) {
      score++;
      scoreDisplay.innerText = "Score: " + score;
    } else {
      flashRed();
    }

    draggingItem.remove();
    currentIndex++;
    showNextItem();
  } else {
    draggingItem.remove();
    showNextItem();
  }

  window.removeEventListener("mousemove", dragItem);
  window.removeEventListener("mouseup", dropItem);
  draggingItem = null;
}

function flashRed() {
  flash.style.opacity = 0.6;
  setTimeout(() => flash.style.opacity = 0, 1000);
}

function startTimer() {
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
