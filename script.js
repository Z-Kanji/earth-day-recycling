const itemsData = [
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

const itemsContainer = document.getElementById("items");
const bins = document.querySelectorAll(".bin");
const timerDisplay = document.getElementById("timer");
const scoreDisplay = document.getElementById("score");

let score = 0;
let time = 60;

/* SHUFFLE */
itemsData.sort(() => Math.random() - 0.5);

/* CREATE ITEMS */
itemsData.forEach(item => {
  const img = document.createElement("img");
  img.src = item.img;
  img.classList.add("item");
  img.draggable = true;
  img.dataset.type = item.type;

  img.addEventListener("dragstart", () => {
    img.classList.add("dragging");
  });

  img.addEventListener("dragend", () => {
    img.classList.remove("dragging");
  });

  itemsContainer.appendChild(img);
});

/* DRAG LOGIC */
bins.forEach(bin => {
  bin.addEventListener("dragover", e => e.preventDefault());

  bin.addEventListener("drop", () => {
    const dragged = document.querySelector(".dragging");
    if (!dragged) return;

    const itemType = dragged.dataset.type;
    const binType = bin.dataset.type;

    if (itemType === binType) {
      score++;
      scoreDisplay.innerText = "Score: " + score;

      dragged.classList.add("correct");
      bin.classList.add("correct");

      setTimeout(() => bin.classList.remove("correct"), 300);
    } else {
      bin.classList.add("wrong");
      setTimeout(() => bin.classList.remove("wrong"), 300);
    }
  });
});

/* TIMER */
const countdown = setInterval(() => {
  time--;
  timerDisplay.innerText = time;

  if (time <= 0) {
    clearInterval(countdown);
    endGame();
  }
}, 1000);

/* END GAME */
function endGame() {
  alert("Time's up! Final Score: " + score);
}