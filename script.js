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

let draggingItem = null;
let offsetX = 0;
let offsetY = 0;

function shuffleNoBackToBackSameType(array) {
  let shuffled = [];
  let attempts = 0;
  while (attempts < 1000) {
    attempts++;
    const candidate = [...array].sort(() => Math.random() - 0.5);
    let valid = true;
    for (let i = 1; i < candidate.length; i++) {
      if (candidate[i].type === candidate[i - 1].type) { valid = false; break; }
    }
    if (valid) { shuffled = candidate; break; }
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
  img.dataset.type = item.type;
  img.style.left = "0px";
  img.style.top = "0px";

  img.addEventListener("mousedown", startDrag);

  currentItemContainer.appendChild(img);
}

function startDrag(e) {
  if (!gameActive) return;
  draggingItem = e.target;
  const rect = draggingItem.getBoundingClientRect();
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;

  draggingItem.style.position = "fixed";
  draggingItem.style.zIndex = 1000;

  window.addEventListener("mousemove", dragItem);
  window.addEventListener("mouseup", dropItem);
}

function dragItem(e) {
  if (!draggingItem) return;
  draggingItem.style.left = e.clientX - offsetX + "px";
  draggingItem.style.top = e.clientY - offsetY + "px";
}

function dropItem(e) {
  if (!draggingItem) return;

  let droppedInBin = false;
  bins.forEach(bin => {
    const binRect = bin.getBoundingClientRect();
    const itemRect = draggingItem.getBoundingClientRect();
    const itemCenterX = itemRect.left + itemRect.width/2;
    const itemCenterY = itemRect.top + itemRect.height/2;

    if (
      itemCenterX >= binRect.left &&
      itemCenterX <= binRect.right &&
      itemCenterY >= binRect.top &&
      itemCenterY <= binRect.bottom
    ) {
      droppedInBin = true;

      // Animate into bin
      const dx = binRect.left + binRect.width/2 - itemCenterX;
      const dy = binRect.top + binRect.height/2 - itemCenterY;
      draggingItem.style.transition = "transform 0.3s ease";
      draggingItem.style.transform = `translate(${dx}px, ${dy}px) scale(0.2)`;

      setTimeout(() => {
        draggingItem.remove();
        if (draggingItem.dataset.type === bin.dataset.type) {
          score++;
          scoreDisplay.innerText = "Score: " + score;
          bin.classList.add("correct");
          setTimeout(() => bin.classList.remove("correct"), 200);
        } else {
          flashRed();
          bin.classList.add("wrong");
          setTimeout(() => bin.classList.remove("wrong"), 300);
        }
        currentIndex++;
        showNextItem();
      }, 300);
    }
  });

  if (!droppedInBin) {
    // Return to center of item zone
    draggingItem.style.transition = "all 0.2s ease";
    draggingItem.style.left = "0px";
    draggingItem.style.top = "0px";
  }

  window.removeEventListener("mousemove", dragItem);
  window.removeEventListener("mouseup", dropItem);
  draggingItem = null;
}

function flashRed() {
  flash.style.opacity = "0.6";
  setTimeout(() => { flash.style.opacity = "0"; }, 1000);
}

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
window.addEventListener("load", () => hideEndScreen());
