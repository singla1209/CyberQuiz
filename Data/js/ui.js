/* Tiny DOM helpers */
export const $ = (id) => document.getElementById(id);
export function msg(text){ $("auth-msg").textContent = text || ""; }

/* Show only one <section> at a time */
export function show(id){
  document.querySelectorAll('section').forEach(s=>{
    s.classList.remove('active');
    s.style.display = 'none';
    s.style.opacity = '0';
  });
  const target = $(id);
  target.style.display = 'flex';
  requestAnimationFrame(()=>{ target.style.opacity = '1'; target.classList.add('active'); });
}

/* ===== Modal (Last-5 detail) ===== */
export function initModal(){
  window.openModalForResult = (data)=>{
    const content = $("modal-content");
    const dt = data.date?.toDate ? data.date.toDate().toLocaleString() :
               (data.date ? new Date(data.date).toLocaleString() : "");
    const total = Number(data.totalQuestions)||0;
    const corr  = Number(data.correctAnswers)||0;
    const secs  = Number(data.timeTakenSec)||0;

    let html = `
      <h3 style="margin:0 24px 6px 6px;text-align:left">
        ${data.subject || "Result"} 
        <span class="tag">${dt}</span>
      </h3>
      <p class="muted" style="text-align:left;margin:0 0 10px 6px">
        Name: <b>${data.name||""}</b> &nbsp; • &nbsp; Score: <b>${corr}/${total}</b> &nbsp; • &nbsp; Time: <b>${secsToText(secs)}</b>
      </p>
    `;

    if(Array.isArray(data.responses) && data.responses.length){
      data.responses.forEach((r,i)=>{
        html += `
          <div class="qrow">
            <div class="q">Q${i+1}. ${r.question || ""}</div>
            <div>Attempted: <b>${r.selected || ""}</b></div>
            <div>Correct: <b>${r.correct || ""}</b></div>
          </div>
        `;
      });
    }else{
      html += `<div class="qrow">No response details saved.</div>`;
    }

    content.innerHTML = html;
    $("modal-overlay").style.display = "flex";
  };

  $("modal-close").onclick = ()=> $("modal-overlay").style.display = "none";
  $("modal-overlay").addEventListener("click", (e)=>{
    if(e.target.id === "modal-overlay") $("modal-overlay").style.display = "none";
  });
}

function secsToText(s){
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s/60);
  const r = s%60;
  return `${m}m ${r}s`;
}

/* ===== Celebration (confetti + donut) ===== */
let confettiAnimating = false;
let confettiParticles = [];
let ribbons = [];

export function initCelebration(){
  const confettiCanvas = $("confetti");
  const ctxC = confettiCanvas.getContext("2d");

  const messagesLow = [
    "Every step counts — keep going!",
    "Good try! Let’s push a little more next time.",
    "You’re learning fast — don’t stop!",
    "Progress over perfection!",
    "Nice effort — keep at it!"
  ];
  const messagesMid = [
    "Nice work — you’re getting there!",
    "Solid score! Keep the momentum.",
    "You’re on the right track!",
    "Nice rhythm — consistency wins.",
    "Great effort — aim higher next time!"
  ];
  const messagesHigh = [
    "Outstanding! You’re a star!",
    "Brilliant performance — keep shining!",
    "Fantastic! You nailed it!",
    "Superb — excellence achieved!",
    "Incredible work — way to go!"
  ];

  function pickRandom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  function sizeCanvas(){
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  sizeCanvas();
  window.addEventListener("resize", sizeCanvas);

  function spawnConfetti(count, speedMin, speedMax){
    for(let i=0;i<count;i++){
      confettiParticles.push({
        x: Math.random()*confettiCanvas.width,
        y: -20 - Math.random()*confettiCanvas.height*0.5,
        w: 6 + Math.random()*6,
        h: 10 + Math.random()*10,
        tilt: Math.random()*2*Math.PI,
        tiltSpeed: 0.02 + Math.random()*0.08,
        vy: speedMin + Math.random()*(speedMax-speedMin),
        vx: (Math.random()-0.5)*2,
        color: `hsl(${Math.floor(Math.random()*360)}, 90%, 60%)`
      });
    }
  }
  function spawnRibbons(count){
    for(let i=0;i<count;i++){
      ribbons.push({
        x: Math.random()*confettiCanvas.width,
        y: -50 - Math.random()*200,
        len: 80 + Math.random()*100,
        amp: 10 + Math.random()*20,
        phase: Math.random()*Math.PI*2,
        vy: 1.2 + Math.random()*2,
        color: `hsl(${Math.floor(Math.random()*360)}, 90%, 60%)`
      });
    }
  }

  function drawConfetti(){
    const w = confettiCanvas.width, h = confettiCanvas.height;
    ctxC.clearRect(0,0,w,h);

    confettiParticles.forEach(p=>{
      p.tilt += p.tiltSpeed;
      p.y += p.vy;
      p.x += p.vx + Math.sin(p.tilt)*0.3;
      ctxC.fillStyle = p.color;
      ctxC.save();
      ctxC.translate(p.x, p.y);
      ctxC.rotate(p.tilt);
      ctxC.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctxC.restore();
    });
    confettiParticles = confettiParticles.filter(p => p.y < h + 40);

    ribbons.forEach(r=>{
      r.y += r.vy;
      r.phase += 0.08;
      ctxC.strokeStyle = r.color;
      ctxC.lineWidth = 6;
      ctxC.beginPath();
      for(let t=0;t<r.len;t+=6){
        const xx = r.x + Math.sin(r.phase + t*0.08)*r.amp;
        const yy = r.y + t;
        if(t===0) ctxC.moveTo(xx,yy); else ctxC.lineTo(xx,yy);
      }
      ctxC.stroke();
    });
    ribbons = ribbons.filter(r => r.y < h + r.len);

    if(confettiParticles.length || ribbons.length){
      requestAnimationFrame(drawConfetti);
    }else{
      confettiAnimating = false;
    }
  }

  function startConfetti(level){
    sizeCanvas();
    if(level === "low"){
      spawnConfetti(120, 2, 3.5);
      spawnRibbons(6);
    }else if(level === "mid"){
      spawnConfetti(280, 2.5, 4.2);
      spawnRibbons(10);
    }else{
      spawnConfetti(480, 3, 5);
      spawnRibbons(16);
      for(let i=0;i<4;i++){
        setTimeout(()=>spawnConfetti(120, 3, 5), i*220);
      }
    }
    if(!confettiAnimating){
      confettiAnimating = true;
      drawConfetti();
    }
  }

  function renderDonut(score, total){
    const c = $("donut");
    const ctx = c.getContext("2d");
    ctx.clearRect(0,0,c.width,c.height);

    const pct = total ? score/total : 0;
    const cx = c.width/2, cy = c.height/2, r = 70, thickness = 22;

    ctx.lineWidth = thickness;
    ctx.strokeStyle = "rgba(255,255,255,.2)";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.stroke();

    let color = "#ffb703";
    if(pct >= 0.8) color = "#00e6b0";
    else if(pct >= 0.5) color = "#5ab0ff";

    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI/2, -Math.PI/2 + pct*2*Math.PI, false);
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${Math.round(pct*100)}%`, cx, cy-6);

    ctx.font = "12px Arial";
    ctx.fillStyle = "rgba(255,255,255,.8)";
    ctx.fillText(`${score}/${total}`, cx, cy+14);
  }

  /* Public: launch celebration */
  window.launchCelebration = (score, total, displayName)=>{
    let level = "low";
    let msgText = "Every step counts — keep going!";
    const pct = total ? (score/total)*100 : 0;
    if(pct >= 80){ level = "high"; msgText = "Outstanding! You’re a star!"; }
    else if(pct >= 50){ level = "mid"; msgText = "Nice work — you’re getting there!"; }

    $("celebrate-overlay").style.display = "flex";
    $("big-name").textContent = `${displayName || "Great Job!"}`;
    $("motivation").textContent = msgText;

    renderDonut(score, total);
    startConfetti(level);
  };

  $("celebrate-close").onclick = () => {
    $("celebrate-overlay").style.display = "none";
  };
  $("play-again-btn").onclick = () => {
    $("celebrate-overlay").style.display = "none";
    show("subjects");
  };
}
