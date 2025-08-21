import { app, auth, db, googleProvider,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updateProfile, signOut, signInWithPopup
} from "./firebase.js";

import { SUBJECTS, RAW_BASE, listChapters, prettifyChapterName, shuffle } from "./subjects.js";
import { saveResult, fetchLastFive } from "./results.js";
import { $, msg, show, initModal, initCelebration } from "./ui.js";
import { humanAuthError } from "./firebase.js";

/* ========= Global (kept together for simplicity) ========= */
let userName = "";
let userId   = null;
let subject  = null;
let currentChapterTitle = "";
let questions = [];
let idx = 0, correct = 0, incorrect = 0, responses = [];
let quizStartMs = null;

/* Build subject buttons */
(function buildSubjectButtons(){
  const list = $("subject-list");
  list.innerHTML = "";
  SUBJECTS.forEach(s => {
    const btn = document.createElement("button");
    btn.className = "btn subject";
    btn.textContent = s.label;
    btn.onclick = () => startSubject(s);
    list.appendChild(btn);
  });
})();

/* ===== Auth UI handlers ===== */
$("login-btn").onclick = async () => {
  msg();
  let id = $("login-id").value.trim();
  const pass = $("login-pass").value;
  if(!id || !pass){ msg("Enter email/mobile and password."); return; }
  if(!id.includes("@")) id += "@mobile.com";
  try { await signInWithEmailAndPassword(auth, id, pass); }
  catch(e){ msg(humanAuthError(e)); }
};

$("google-btn").onclick = async () => {
  msg();
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const { setDoc, doc, serverTimestamp } = await import("./firebase.js");
    await setDoc(doc(db, "users", cred.user.uid), {
      name: cred.user.displayName || "",
      emailOrMobile: cred.user.email || "",
      createdAt: serverTimestamp()
    }, { merge:true });
  } catch(e){ msg(humanAuthError(e)); }
};

$("signup-btn").onclick = async () => {
  msg();
  const name = $("signup-name").value.trim();
  let id = $("signup-id").value.trim();
  const pass = $("signup-pass").value;
  if(!name || !id || !pass){ msg("Fill all sign up fields."); return; }
  const rawId = id;
  if(!id.includes("@")) id += "@mobile.com";
  try {
    const cred = await createUserWithEmailAndPassword(auth, id, pass);
    await updateProfile(cred.user, { displayName: name });
    const { setDoc, doc, serverTimestamp } = await import("./firebase.js");
    await setDoc(doc(db, "users", cred.user.uid), {
      name, emailOrMobile: rawId, createdAt: serverTimestamp()
    }, { merge:true });
  } catch(e){ msg(humanAuthError(e)); }
};

$("logout-1").onclick = () => signOut(auth);
$("logout-2").onclick = () => signOut(auth);

/* ===== Auth state ===== */
onAuthStateChanged(auth, async (user) => {
  if(user){
    userId = user.uid;
    userName = user.displayName || "";
    if(!userName){
      const { getDoc, doc } = await import("./firebase.js");
      const snap = await getDoc(doc(db,"users",user.uid));
      userName = (snap.exists() && snap.data().name) ? snap.data().name : (user.email || "User");
    }
    $("hello").textContent = `Hi ${userName}!`;
    show("subjects");
    fetchLastFive({ userId, userName });
  }else{
    userId = null;
    $("login-pass").value = "";
    $("signup-pass").value = "";
    show("auth");
  }
});

/* ===== Subject → Chapters (dynamic for all) ===== */
async function startSubject(s){
  if(!auth.currentUser){ show("auth"); return; }
  subject = s;

  // List chapters from GitHub
  $("chapters-title").textContent = `Choose a chapter – ${s.label}`;
  $("chapters-subtitle").textContent = `NCERT Class 10 • Session 2025–26`;
  const container = $("chapter-list");
  container.innerHTML = `<div class="muted" style="grid-column:1/-1">Loading chapters…</div>`;

  try{
    const items = await listChapters(s.path);
    if(!items.length){
      container.innerHTML = `<div class="muted" style="grid-column:1/-1">No chapter files found.</div>`;
    }else{
      container.innerHTML = "";
      items.forEach(file=>{
        const pretty = prettifyChapterName(file.name, s.key);
        const btn = document.createElement("button");
        btn.className = "btn chapter";
        btn.textContent = pretty;
        btn.onclick = () => startChapterQuiz(s, file.path, pretty);
        container.appendChild(btn);
      });
    }
  }catch(err){
    console.error(err);
    container.innerHTML = `<div class="muted" style="grid-column:1/-1">Couldn't load chapters.</div>`;
  }
  show("chapters");
}

$("back-to-subjects-2").onclick = () => show("subjects");

async function startChapterQuiz(s, ghPath, prettyTitle){
  const url = RAW_BASE + ghPath; // raw github json
  currentChapterTitle = prettyTitle;
  await beginQuizFromUrl(url, s.label, prettyTitle);
}

/* ===== Quiz flow ===== */
async function beginQuizFromUrl(url, subjectLabel, chapterTitle){
  idx = 0; correct = 0; incorrect = 0; responses = [];
  quizStartMs = null;
  $("stats").textContent = `✅ Correct: 0  |  ❌ Incorrect: 0`;
  $("qprogress").textContent = `Question 1/1`;
  $("bar-inner").style.width = "0%";
  $("end-screen").style.display = "none";

  $("welcome-banner").innerHTML =
    `Welcome <span class="name">${userName}</span> in BrainQuest of <b>‘${subjectLabel}’ : ${chapterTitle.replace(/^Chapter\s*\d+\s*:\s*/i,'')}</b>`;

  show("quiz");

  try{
    const res = await fetch(url, {cache:"no-store"});
    const raw = await res.json();
    questions = Array.isArray(raw) ? raw.slice() : [];
  }catch(e){ questions = []; }

  if(!questions.length){
    $("question").textContent = "Could not load questions.";
    $("options").innerHTML = "";
    fetchLastFive({ userId, userName });
    return;
  }

  shuffle(questions);

  questions = questions.map(q => {
    const entries = Object.entries(q.options || {}).map(([key,text]) => ({key, text}));
    shuffle(entries);
    return { ...q, _optionsArr: entries, _correctKey: q.correct };
  });

  renderQuestion();
  fetchLastFive({ userId, userName });
}

function renderQuestion(){
  const q = questions[idx];
  $("question").textContent = `Q${idx+1}. ${q.question}`;
  const optionsDiv = $("options");
  optionsDiv.innerHTML = "";

  q._optionsArr.forEach(opt=>{
    const div = document.createElement("div");
    div.className = "option";
    div.textContent = opt.text;
    div.onclick = () => choose(opt.key, div);
    optionsDiv.appendChild(div);
  });

  $("qprogress").textContent = `Question ${idx+1}/${questions.length}`;
  $("bar-inner").style.width = `${((idx)/questions.length)*100}%`;
  if(quizStartMs === null) quizStartMs = Date.now();
}

function choose(selectedKey, el){
  document.querySelectorAll(".option").forEach(o => o.style.pointerEvents = "none");
  const q = questions[idx];
  const correctKey = q._correctKey;

  document.querySelectorAll(".option").forEach(o=>{
    const isCorrect = q._optionsArr.find(x => x.text === o.textContent)?.key === correctKey;
    if(isCorrect) o.classList.add("correct");
  });
  if(selectedKey !== correctKey) el.classList.add("wrong");

  const selectedObj = q._optionsArr.find(x=>x.key===selectedKey);
  const correctObj  = q._optionsArr.find(x=>x.key===correctKey);
  const selectedAnswer = selectedObj ? selectedObj.text : "No answer";
  const correctAnswer  = correctObj  ? correctObj.text  : "";

  responses.push({ question: q.question, selected: selectedAnswer, correct: correctAnswer });

  if(selectedKey === correctKey){ correct++; $("correct-sound").play(); }
  else { incorrect++; $("wrong-sound").play(); }

  $("stats").textContent = `✅ Correct: ${correct}  |  ❌ Incorrect: ${incorrect}`;
  $("bar-inner").style.width = `${((idx+1)/questions.length)*100}%`;

  setTimeout(()=>{
    if(idx < questions.length-1){ idx++; renderQuestion(); }
    else { finishQuiz(); }
  }, 900);
}

async function finishQuiz(){
  $("question").textContent = "All done!";
  $("options").innerHTML = "";
  $("end-screen").style.display = "block";
  $("end-screen").innerHTML = `<h3>Score: ${correct} / ${questions.length}</h3>`;

  const timeTakenSec = quizStartMs ? (Date.now() - quizStartMs)/1000 : 0;

  try{
    await saveResult({
      userName,
      subjectText: subject?.label || null,
      correct,
      total: questions.length,
      responses,
      timeTakenSec,
      chapterTitle: currentChapterTitle
    });
    fetchLastFive({ userId, userName });
  }catch(e){
    console.error("Save failed:", e);
  }

  window.launchCelebration(correct, questions.length, userName);
}

/* ===== Misc nav ===== */
$("back-to-subjects").onclick = () => show("subjects");

/* ===== Init UI bits ===== */
initModal();
initCelebration();

/* When quiz screen becomes visible (after auth), we also keep the last-5 fresh */
document.addEventListener("visibilitychange", ()=>{
  if(document.visibilityState === "visible" && auth.currentUser){
    fetchLastFive({ userId, userName });
  }
});
