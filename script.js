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
let timerInterval = null;

const currentItemContainer = document.getElementById("current-item");
const bins = document.querySelectorAll(".bin");
const timerDisplay = document.getElementById("timer");
const scoreDisplay = document.getElementById("score");
const startBtn = document.getElementById("startBtn");
const flash = document.getElementById("flash");
const endScreen = document.getElementById("endScreen");
const endText = document.getElementById("endText");
const restartBtn = document.getElementById("restartBtn");

function shuffleNoBackToBackSameType(array) {
  let shuffled = [];
  let attempts = 0;

  while (attempts < 1000) {
    attempts++;
    const candidate = [...array].sort(() => Math.random() - 0.5);

    let valid = true;
    for (let i = 1; i < candidate.length; i++) {
      if (candidate[i].type === candidate[i - 1].type) {
        valid = false;
        break;
      }
    }

    if (valid) {
      shuffled = candidate;
      break;
    }
  }

  if (shuffled.length === 0) shuffled = [...array];
  return shuffled;
}

function hideEndScreen() {
  endScreen.classList.add("hidden");
  endText.innerText = "";
}

function startGame() {
  itemsData = shuffleNoBackToBackSameType(itemsDataOriginal);
  currentIndex = 0;
  score = 0;
  time = 60;
  gameActive = true;

  scoreDisplay.innerText = "Score: 0";
  timerDisplay.innerText = "60";

  startBtn.disabled = true;
  hideEndScreen();
  currentItemContainer.innerHTML = "";

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
  img.draggable = true;
  img.dataset.type = item.type;
  img.style.position = "relative";

  img.addEventListener("dragstart", () => {
    img.classList.add("dragging");
  });
  img.addEventListener("dragend", () => {
    img.classList.remove("dragging");
  });

  currentItemContainer.appendChild(img);
}

function flashRed() {
  flash.style.opacity = "0.6";
  setTimeout(() => { flash.style.opacity = "0"; }, 1000);
}

function animateIntoBin(item, bin, callback) {
  const itemRect = item.getBoundingClientRect();
  const binRect = bin.getBoundingClientRect();

  const dx = binRect.left + binRect.width/2 - (itemRect.left + itemRect.width/2);
  const dy = binRect.top + binRect.height/2 - (itemRect.top + itemRect.height/2);

  item.style.position = "fixed";
  item.style.left = itemRect.left + "px";
  item.style.top = itemRect.top + "px";
  item.style.zIndex = 1000;
  item.style.transition = "transform 0.6s ease";
  item.style.transform = `translate(${dx}px, ${dy}px) scale(0.2)`;

  setTimeout(() => {
    item.remove();
    callback();
  }, 600);
}

bins.forEach(bin => {
  bin.addEventListener("dragover", e => e.preventDefault());

  bin.addEventListener("drop", () => {
    if (!gameActive) return;
    const dragged = document.querySelector(".dragging");
    if (!dragged) return;

    if (dragged.dataset.type === bin.dataset.type) {
      animateIntoBin(dragged, bin, () => {
        score++;
        scoreDisplay.innerText = "Score: " + score;
        currentIndex++;
        showNextItem();
      });

      bin.classList.add("correct");
      setTimeout(() => bin.classList.remove("correct"), 200);

    } else {
      bin.classList.add("wrong");
      setTimeout(() => bin.classList.remove("wrong"), 300);
      flashRed();
    }
  });
});

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    time--;
    timerDisplay.innerText = String(time);
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

window.addEventListener("load", () => { hideEndScreen(); });
