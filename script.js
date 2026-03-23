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

/* SHUFFLE FUNCTION */
function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

/* START GAME */
startBtn.addEventListener("click", () => {
  itemsData = shuffle([...itemsDataOriginal]);
  currentIndex = 0;
  score = 0;
  time = 60;
  gameActive = true;

  scoreDisplay.innerText = "Score: 0";
  timerDisplay.innerText = time;

  startBtn.disabled = true;

  showNextItem();
  startTimer();
});

/* SHOW ITEM */
function showNextItem() {
  currentItemContainer.innerHTML = "";

  if (currentIndex >= itemsData.length) {
    endGame();
    return;
  }

  const item = itemsData[currentIndex];
  const img = document.createElement("img");
  img.src = item.img;
  img.draggable = true;
  img.dataset.type = item.type;

  img.addEventListener("dragstart", () => {
    img.classList.add("dragging");
  });

  img.addEventListener("dragend", () => {
    img.classList.remove("dragging");
  });

  currentItemContainer.appendChild(img);
}

/* DROP LOGIC */
bins.forEach(bin => {
  bin.addEventListener("dragover", e => e.preventDefault());

  bin.addEventListener("drop", () => {
    if (!gameActive) return;

    const dragged = document.querySelector(".dragging");
    if (!dragged) return;

    const itemType = dragged.dataset.type;
    const binType = bin.dataset.type;

    if (itemType === binType) {
      score++;
      scoreDisplay.innerText = "Score: " + score;

      bin.classList.add("correct");
      setTimeout(() => bin.classList.remove("correct"), 200);

      currentIndex++;
      showNextItem();
    } else {
      bin.classList.add("wrong");
      setTimeout(() => bin.classList.remove("wrong"), 300);
    }
  });
});

/* TIMER */
function startTimer() {
  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    time--;
    timerDisplay.innerText = time;

    if (time <= 0) {
      endGame();
    }
  }, 1000);
}

/* END GAME */
function endGame() {
  clearInterval(timerInterval);
  gameActive = false;
  currentItemContainer.innerHTML = "";
  alert("Final Score: " + score);

  startBtn.disabled = false;
}
