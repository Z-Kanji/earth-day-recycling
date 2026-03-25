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

  // CENTER ITEM
  img.onload = () => {
    const containerRect = currentItemContainer.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();

    img.style.left = (containerRect.width / 2 - imgRect.width / 2) + "px";
    img.style.top = (containerRect.height / 2 - imgRect.height / 2) + "px";
  };

  img.addEventListener("mousedown", startDrag);

  currentItemContainer.appendChild(img);
}

function startDrag(e) {
  if (!gameActive) return;

  draggingItem = e.target;

  const rect = draggingItem.getBoundingClientRect();

  // LOCK SIZE (prevents resize bug)
  draggingItem.style.width = rect.width + "px";
  draggingItem.style.height = rect.height + "px";

  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;

  draggingItem.style.position = "fixed";
  draggingItem.style.left = rect.left + "px";
  draggingItem.style.top = rect.top + "px";
  draggingItem.style.zIndex = 1000;
  draggingItem.style.transition = "none";

  window.addEventListener("mousemove", dragItem);
  window.addEventListener("mouseup", dropItem);
}

function dragItem(e) {
  if (!draggingItem) return;

  draggingItem.style.left = (e.clientX - offsetX) + "px";
  draggingItem.style.top = (e.clientY - offsetY) + "px";
}

function dropItem() {
  if (!draggingItem) return;

  let matchedBin = null;

  bins.forEach(bin => {
    const binRect = bin.getBoundingClientRect();
    const itemRect = draggingItem.getBoundingClientRect();

    const centerX = itemRect.left + itemRect.width / 2;
    const centerY = itemRect.top + itemRect.height / 2;

    if (
      centerX >= binRect.left &&
      centerX <= binRect.right &&
      centerY >= binRect.top &&
      centerY <= binRect.bottom
    ) {
      matchedBin = bin;
    }
  });

  if (matchedBin) {
    const itemRect = draggingItem.getBoundingClientRect();
    const binRect = matchedBin.getBoundingClientRect();

    const dx = binRect.left + binRect.width/2 - (itemRect.left + itemRect.width/2);
    const dy = binRect.top + binRect.height/2 - (itemRect.top + itemRect.height/2);

    draggingItem.style.transition = "transform 0.25s ease";
    draggingItem.style.transform = `translate(${dx}px, ${dy}px) scale(0.2)`;

    setTimeout(() => {
      draggingItem.remove();

      if (draggingItem.dataset.type === matchedBin.dataset.type) {
        score++;
        scoreDisplay.innerText = "Score: " + score;
      } else {
        flashRed();
      }

      currentIndex++;
      showNextItem();
    }, 250);

  } else {
    // RESET BACK TO CENTER
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
