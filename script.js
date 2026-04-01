const urlParams = new URLSearchParams(window.location.search);
const ablyKey = urlParams.get("ablyKey");
const mode = urlParams.get("mode");

let ably, channel;
if (ablyKey) { ably = new Ably.Realtime(ablyKey); channel = ably.channels.get("recycling-game"); }

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
let state = { phase: "idle", score:0, time: GAME_DURATION, currentIndex:0, dragging:false, x:0, y:0, startTimeMs:0, flashUntil:0 };

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
let currentRenderedIndex = -1;
let currentImgEl = null;
let sizeLockedThisDrag = false;
let confettiInterval = null;
let confettiStarted = false;
let publishQueued = false;
let lastPublishedState = "";
let loopStarted = false;

if (mode === "follow") { startBtn.style.display="none"; restartBtn.style.display="none"; }

function publish(name,data){ if(mode==="master" && channel){ channel.publish(name,data); } }
function publishState(){ 
  if(mode!=="master"||!channel||state.phase==="idle") return;
  const payload={phase:state.phase,score:state.score,time:state.time,currentIndex:state.currentIndex,dragging:state.dragging,x:state.x,y:state.y,startTimeMs:state.startTimeMs,flashUntil:state.flashUntil};
  const serial=JSON.stringify(payload);
  if(serial===lastPublishedState) return;
  lastPublishedState=serial;
  publish("state",payload);
}
function schedulePublish(){ if(mode!=="master"||publishQueued) return; publishQueued=true; requestAnimationFrame(()=>{publishQueued=false; publishState();}); }
function subscribe(){ if(mode!=="follow"||!channel) return; channel.subscribe(msg=>{ const {name,data}=msg; if(name==="gameStart"){applyGameStart(data);} else if(name==="state"){applyStateSnapshot(data);} }); }

function shuffleNoRepeat(arr){ let valid=false; let result=[]; while(!valid){ result=[...arr].sort(()=>Math.random()-0.5); valid=true; for(let i=1;i<result.length;i++){ if(result[i].type===result[i-1].type){ valid=false; break; } } } return result; }

function startGame(publishEvent=true,incomingData=null){
  if(mode==="master"){ itemsData=shuffleNoRepeat(itemsDataOriginal); state.startTimeMs=Date.now(); publish("gameStart",{itemsData,startTimeMs:state.startTimeMs}); } 
  else { itemsData=incomingData.itemsData; state.startTimeMs=incomingData.startTimeMs; }
  state.phase="playing"; state.score=0; state.time=GAME_DURATION; state.currentIndex=0; state.dragging=false; state.x=0; state.y=0; state.flashUntil=0;
  draggingItem=null; offsetX=0; offsetY=0; currentRenderedIndex=-1; currentImgEl=null; sizeLockedThisDrag=false;
  scoreDisplay.innerText="Score: 0"; timerDisplay.innerText=String(GAME_DURATION);
  startBtn.disabled=false; endScreen.classList.add("hidden"); confettiContainer.innerHTML=""; stopConfetti();
  renderState(); startLoop();
}

function applyGameStart(data){ itemsData=data.itemsData||[]; state.startTimeMs=data.startTimeMs||Date.now(); state.phase="playing"; state.score=0; state.time=GAME_DURATION; state.currentIndex=0; state.dragging=false; state.x=0; state.y=0; state.flashUntil=0; draggingItem=null; offsetX=0; offsetY=0; currentRenderedIndex=-1; currentImgEl=null; sizeLockedThisDrag=false; startBtn.disabled=true; endScreen.classList.add("hidden"); confettiContainer.innerHTML=""; stopConfetti(); renderState(); startLoop(); }

function applyStateSnapshot(snapshot){ if(!snapshot) return; state.phase=snapshot.phase; state.score=snapshot.score; state.time=snapshot.time; state.currentIndex=snapshot.currentIndex; state.dragging=snapshot.dragging; state.x=snapshot.x; state.y=snapshot.y; state.startTimeMs=snapshot.startTimeMs; state.flashUntil=snapshot.flashUntil||0; renderState(); }

function createCurrentItem(){
  container.innerHTML=""; currentRenderedIndex=state.currentIndex; sizeLockedThisDrag=false;
  const item=itemsData[state.currentIndex]; if(!item){ currentImgEl=null; return; }
  const img=document.createElement("img"); img.src=item.img; img.dataset.type=item.type;
  img.style.position="absolute"; img.style.top="50%"; img.style.left="50%"; img.style.transform="translate(-50%,-50%)"; img.style.zIndex="1000"; img.style.willChange="transform,left,top"; img.style.pointerEvents="auto";
  if(mode==="master"){ img.addEventListener("mousedown",startDrag); }
  container.appendChild(img); currentImgEl=img;
}

function updateClock(){ if(state.phase!=="playing"||!state.startTimeMs) return; const elapsed=Math.floor((Date.now()-state.startTimeMs)/1000); const remaining=Math.max(0,GAME_DURATION-elapsed); state.time=remaining; if(mode==="master"&&remaining<=0&&state.phase==="playing"){ endGame("lose"); } }

function renderState(){
  if(state.phase==="playing"){
    timerDisplay.innerText=String(state.time); scoreDisplay.innerText="Score: "+state.score;
    if(currentRenderedIndex!==state.currentIndex||!currentImgEl){ createCurrentItem(); }
    if(currentImgEl){
      currentImgEl.style.zIndex="1000";
      if(state.dragging){
        currentImgEl.style.position="fixed"; currentImgEl.style.left=state.x+"px"; currentImgEl.style.top=state.y+"px"; currentImgEl.style.transform="none";
      } else { currentImgEl.style.position="absolute"; currentImgEl.style.left="50%"; currentImgEl.style.top="50%"; currentImgEl.style.transform="translate(-50%,-50%)"; }
    }
    updateFlashOverlay();
    if(state.flashUntil&&Date.now()>=state.flashUntil){ state.flashUntil=0; updateFlashOverlay(); }
  } else if(state.phase==="win"||state.phase==="lose"){
    container.innerHTML=""; currentImgEl=null; currentRenderedIndex=-1; sizeLockedThisDrag=false;
    timerDisplay.innerText=String(state.time); scoreDisplay.innerText="Score: "+state.score;
    endText.innerText=state.phase==="win"?"YOU WIN":"YOU LOSE"; endScreen.classList.remove("hidden");
    if(state.phase==="win"&&!confettiStarted) startConfetti(); else stopConfetti();
    updateFlashOverlay();
  } else { timerDisplay.innerText=String(state.time); scoreDisplay.innerText="Score: "+state.score; updateFlashOverlay(); }
}

function updateFlashOverlay(){ flash.style.opacity=(state.flashUntil&&Date.now()<state.flashUntil)?0.6:0; }

function startDrag(e){
  if(state.phase!=="playing") return;
  draggingItem=e.target;
  const rect=draggingItem.getBoundingClientRect();
  offsetX=e.clientX-rect.left; offsetY=e.clientY-rect.top;
  state.dragging=true; state.x=e.clientX-offsetX; state.y=e.clientY-offsetY;
  window.addEventListener("mousemove",drag); window.addEventListener("mouseup",drop);
  schedulePublish();
}

function drag(e){
  if(!draggingItem||state.phase!=="playing") return;
  state.x=e.clientX-offsetX; state.y=e.clientY-offsetY;
  draggingItem.style.left=state.x+"px"; draggingItem.style.top=state.y+"px";
  schedulePublish();
}

function drop(e){
  if(!draggingItem||state.phase!=="playing") return;
  let hitBin=null;
  bins.forEach(bin=>{ const rect=bin.getBoundingClientRect(); if(e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom){ hitBin=bin; } });
  const correct=!!hitBin&&hitBin.dataset.type===draggingItem.dataset.type;
  if(correct){ state.score+=1; state.currentIndex+=1; state.dragging=false; state.x=0; state.y=0; state.flashUntil=0;
    if(state.currentIndex>=itemsData.length){ endGame("win"); } else { currentRenderedIndex=-1; currentImgEl=null; sizeLockedThisDrag=false; renderState(); publishState(); }
  } else if(hitBin){ state.dragging=false; state.x=0; state.y=0; state.flashUntil=Date.now()+1000; renderState(); publishState(); }
  else{ state.dragging=false; state.x=0; state.y=0; renderState(); publishState(); }
  window.removeEventListener("mousemove",drag); window.removeEventListener("mouseup",drop); draggingItem=null;
}

function endGame(result){ state.phase=result; state.dragging=false; state.x=0; state.y=0; state.flashUntil=0; renderState(); publishState(); if(result==="win") startConfetti(); else stopConfetti(); }

function startConfetti(){ if(confettiStarted) return; confettiStarted=true; const colors=["#ff4d4d","#4dff88","#4da6ff","#ffff66","#ff66ff"]; confettiInterval=setInterval(()=>{for(let i=0;i<10;i++){const c=document.createElement("div"); c.className="confetti"; c.style.left=Math.random()*100+"vw"; c.style.background=colors[Math.floor(Math.random()*colors.length)]; c.style.animationDuration=(2+Math.random()*2)+"s"; confettiContainer.appendChild(c); setTimeout(()=>c.remove(),3000);}},200); setTimeout(()=>{stopConfetti();},15000); }
function stopConfetti(){ confettiStarted=false; if(confettiInterval){ clearInterval(confettiInterval); confettiInterval=null; } confettiContainer.innerHTML=""; }

function startLoop(){ if(loopStarted) return; loopStarted=true; const loop=()=>{ updateClock(); renderState(); if(mode==="master") publishState(); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }

startBtn.addEventListener("click",()=>{ if(mode!=="master") return; startGame(true); });
restartBtn.addEventListener("click",()=>{ if(mode!=="master") return; stopConfetti(); startGame(true); });

subscribe();
startLoop();
