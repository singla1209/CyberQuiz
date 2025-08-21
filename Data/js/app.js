/* ---------- Firebase SDK (v12) ---------- */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, updateProfile, signOut,
  GoogleAuthProvider, signInWithPopup, setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc,
  collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

/* ---------- Config (new Firebase project) ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyDHMrrJXvUkQ5Dg_j7ekskEqmkP1f73YSs",
  authDomain: "cyberquiz12.firebaseapp.com",
  projectId: "cyberquiz12",
  storageBucket: "cyberquiz12.firebasestorage.app",
  messagingSenderId: "611229251719",
  appId: "1:611229251719:web:851d64457f7ecfefcb6022"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const googleProvider = new GoogleAuthProvider();


// Temporary placeholder for last 5 results
async function fetchLastFive(userId) {
  // TODO: Later connect this with Firestore to get real results
  return [];
}


/* ---------- Persistence ---------- */
try {
  await setPersistence(auth, browserLocalPersistence);
  console.log("[Auth] Persistence set to browserLocalPersistence");
} catch (e) {
  console.warn("[Auth] Could not set persistence:", e);
}

/* ---------- Helpers ---------- */
const $ = (id) => document.getElementById(id);
function show(id){
  document.querySelectorAll('section').forEach(s=>{
    s.classList.remove('active');
    s.style.display = 'none';
    s.style.opacity = '0';
  });
  const target = $(id);
  target.style.display = 'flex';
  requestAnimationFrame(()=>{ target.style.opacity = '1'; target.classList.add('active'); });

  if(id === "quiz" && auth.currentUser){
    fetchLastFive();
  }
}
function msg(text){ $("auth-msg").textContent = text || ""; }
function dbg(...args){ console.log("[DBG]", ...args); }

/* ---------- Paths ---------- */
const RAW_BASE = "https://singla1209.github.io/CyberQuiz/Data/questions/";

/* ---------- Subjects ---------- */
const SUBJECTS = [
  { key:"cs10", label:"Computer Science - 10th", path:"Computer Science - 10th/" },
  { key:"cs11", label:"Computer Science - 11th", path:"Computer Science - 11th/" }
];

/* ---------- Utility ---------- */
function titleFromFilename(filename){
  const base = filename.replace(/\.json$/i,'').replace(/[_\-]+/g,' ').trim();
  return base.replace(/\s+/g,' ')
    .split(' ')
    .map(w=>w ? w[0].toUpperCase()+w.slice(1) : '')
    .join(' ');
}

async function listChapters(path){
  try {
    const url = RAW_BASE + path + "manifest.json";
    const res = await fetch(url, { cache:"no-store" });
    if(!res.ok) throw new Error("Manifest not found for " + path);
    const files = await res.json(); // array of filenames
    return files.map(name => ({ name, path: path + name }));
  } catch (e){
    console.error("listChapters error", e);
    return [];
  }
}

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
}

/* ---------- State ---------- */
let userName = "";
let userId   = null;
let subject  = null;
let currentChapterTitle = "";
let questions = [];
let idx = 0, correct = 0, incorrect = 0, responses = [];
let quizStartMs = null;

/* Build subject buttons */
const list = $("subject-list");
SUBJECTS.forEach(s => {
  const btn = document.createElement("button");
  btn.className = "btn subject";
  btn.textContent = s.label;
  btn.onclick = () => startSubject(s);
  list.appendChild(btn);
});

/* ---------- Auth actions ---------- */
$("login-btn").onclick = async () => {
  msg();
  let id = $("login-id").value.trim();
  const pass = $("login-pass").value;
  if(!id || !pass){ msg("Enter email/mobile and password."); return; }
  if(!id.includes("@")) id += "@mobile.com";
  try {
    const cred = await signInWithEmailAndPassword(auth, id, pass);
    dbg("Login success:", cred.user.uid);
    msg("");
  } catch(e){ msg(humanAuthError(e)); }
};

$("google-btn").onclick = async () => {
  msg();
  try {
    const cred = await signInWithPopup(auth, googleProvider);
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
  if(!id.includes("@")) id += "@mobile.com";
  try {
    if(auth.currentUser){ await signOut(auth); }
    const cred = await createUserWithEmailAndPassword(auth, id, pass);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, "users", cred.user.uid), {
      name, emailOrMobile: id, createdAt: serverTimestamp()
    }, { merge:true });
  } catch(e){ msg(humanAuthError(e)); }
};

$("logout-1").onclick = () => signOut(auth);
$("logout-2").onclick = () => signOut(auth);

onAuthStateChanged(auth, async (user) => {
  if(user){
    userId = user.uid;
    userName = user.displayName || user.email || "User";
    $("hello").textContent = `Hi ${userName}!`;
    show("subjects");
    fetchLastFive();
  } else {
    userId = null;
    show("auth");
  }
});

/* ---------- Quiz + Chapters ---------- */
async function startSubject(s){
  if(!auth.currentUser){ show("auth"); return; }
  subject = s;

  $("chapters-title").textContent = `Choose a chapter – ${s.label}`;
  $("chapters-subtitle").textContent = `CyberQuiz Session`;
  const container = $("chapter-list");
  container.innerHTML = `<div class="muted" style="grid-column:1/-1">Loading chapters…</div>`;

  try{
    const items = await listChapters(s.path);
    if(!items.length){
      container.innerHTML = `<div class="muted">No chapter files found.</div>`;
    } else {
      container.innerHTML = "";
      items.forEach(file=>{
        const pretty = titleFromFilename(file.name);
        const btn = document.createElement("button");
        btn.className = "btn chapter";
        btn.textContent = pretty;
        btn.onclick = () => startChapterQuiz(s, file.path, pretty);
        container.appendChild(btn);
      });
    }
  } catch(err){
    container.innerHTML = `<div class="muted">Couldn't load chapters.</div>`;
  }
  show("chapters");
}

async function startChapterQuiz(s, relPath, prettyTitle){
  const url = RAW_BASE + relPath;
  currentChapterTitle = prettyTitle;
  await beginQuizFromUrl(url, s.label, prettyTitle);
}

async function beginQuizFromUrl(url, subjectLabel, chapterTitle){
  idx = 0; correct = 0; incorrect = 0; responses = [];
  quizStartMs = null;
  $("stats").textContent = `✅ Correct: 0  |  ❌ Incorrect: 0`;
  $("qprogress").textContent = `Question 1/1`;
  $("bar-inner").style.width = "0%";

  show("quiz");

  try{
    const res = await fetch(url, {cache:"no-store"});
    questions = await res.json();
  } catch(e){
    console.error("Fetch questions error", e);
    questions = [];
  }

  if(!questions.length){
    $("question").textContent = "Could not load questions.";
    $("options").innerHTML = "";
    return;
  }

  shuffle(questions);
  questions = questions.map(q => {
    const entries = Object.entries(q.options || {}).map(([key,text]) => ({key, text}));
    shuffle(entries);
    return { ...q, _optionsArr: entries, _correctKey: q.correct };
  });

  renderQuestion();
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

  if(selectedKey === correctKey){ correct++; } else { incorrect++; }

  $("stats").textContent = `✅ Correct: ${correct}  |  ❌ Incorrect: ${incorrect}`;
  $("bar-inner").style.width = `${((idx+1)/questions.length)*100}%`;

  setTimeout(()=>{
    if(idx < questions.length-1){ idx++; renderQuestion(); }
    else { finishQuiz(); }
  }, 800);
}

async function finishQuiz(){
  $("question").textContent = "All done!";
  $("options").innerHTML = "";
  $("end-screen").style.display = "block";
  $("end-screen").innerHTML = `<h3>Score: ${correct} / ${questions.length}</h3>`;

  const timeTakenSec = quizStartMs ? (Date.now() - quizStartMs)/1000 : 0;

  try{
    const current = auth.currentUser;
    await addDoc(collection(db, "quiz_results"), {
      name: (userName || current?.displayName || ""),
      score: correct,
      totalQuestions: questions.length,
      correctAnswers: correct,
      incorrectAnswers: questions.length - correct,
      responses: responses,
      date: serverTimestamp(),
      subject: subject ? `${subject.label} : ${currentChapterTitle}` : null,
      userId: current ? current.uid : null,
      userEmail: current ? current.email : null,
      timeTakenSec: Math.round(timeTakenSec)
    });
  } catch(e){ console.error("Save failed:", e); }
}

/* ---------- Errors ---------- */
function humanAuthError(e){
  const code = (e && e.code) ? e.code : "";
  switch(code){
    case "auth/invalid-email": return "Please enter a valid email.";
    case "auth/wrong-password":
    case "auth/user-not-found": return "Invalid email or password.";
    case "auth/email-already-in-use": return "This email is already registered.";
    default: return e?.message || "Authentication error.";
  }
}

/* ---------- Nav ---------- */
$("back-to-subjects").onclick = () => show("subjects");

