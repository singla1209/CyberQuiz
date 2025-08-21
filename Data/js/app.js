/* ================================
   Firebase Setup
================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { 
  getAuth, GoogleAuthProvider, 
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup,
  setPersistence, browserLocalPersistence, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, serverTimestamp,
  query, where, orderBy, limit, getDocs 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDHMrrJXvUkQ5Dg_j7ekskEqmkP1f73YSs",
  authDomain: "cyberquiz12.firebaseapp.com",
  projectId: "cyberquiz12",
  storageBucket: "cyberquiz12.appspot.com",   // fixed bucket
  messagingSenderId: "611229251719",
  appId: "1:611229251719:web:851d64457f7ecfefcb6022"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

/* ---------- Persistence ---------- */
try {
  await setPersistence(auth, browserLocalPersistence);
  console.log("[Auth] Persistence set to browserLocalPersistence");
} catch (e) {
  console.warn("[Auth] Could not set persistence:", e);
}

/* ================================
   Firestore Helpers
================================ */

async function saveResult(userId, subject, chapter, correct, incorrect, timeTaken) {
  try {
    await addDoc(collection(db, "quiz_results"), {
      userId,
      subject,
      chapter,
      correct,
      incorrect,
      timeTaken,
      timestamp: serverTimestamp()
    });
    console.log("Result saved to Firestore!");
  } catch (err) {
    console.error("Error saving result:", err);
  }
}

async function fetchLastFive(userId) {
  try {
    const q = query(
      collection(db, "quiz_results"),
      where("userId", "==", userId),
      orderBy("timestamp", "desc"),
      limit(5)
    );

    const querySnapshot = await getDocs(q);
    const results = [];
    querySnapshot.forEach(doc => results.push(doc.data()));
    return results;
  } catch (err) {
    console.error("Error fetching last 5 results:", err);
    return [];
  }
}

/* ================================
   Quiz Logic
================================ */

const RAW_BASE = "https://singla1209.github.io/CyberQuiz/Data/questions/";
let currentUser = null;
let currentSubject = "";
let currentChapter = "";
let questions = [];
let qIndex = 0, correctCount = 0, incorrectCount = 0, startTime = 0;

function titleFromFilename(name) {
  return name.replace(".json", "").replace(/[_-]/g, " ");
}

function showSection(id) {
  document.querySelectorAll("section").forEach(s => s.style.display = "none");
  document.getElementById(id).style.display = "block";
}

/* ----- Subjects ----- */
function loadSubjects() {
  const list = document.getElementById("subject-list");
  list.innerHTML = "";

  const subjects = ["Computer Science - 10th", "Computer Science - 11th"];
  subjects.forEach(sub => {
    const btn = document.createElement("button");
    btn.textContent = sub;
    btn.onclick = () => loadChapters(sub);
    list.appendChild(btn);
  });

  showSection("subjects");
}

/* ----- Chapters ----- */
async function loadChapters(subject) {
  currentSubject = subject;
  const url = RAW_BASE + subject + "/manifest.json";

  try {
    const res = await fetch(url, { cache: "no-store" });
    const files = await res.json();

    const list = document.getElementById("chapter-list");
    list.innerHTML = "";

    files.forEach(fname => {
      const btn = document.createElement("button");
      btn.textContent = titleFromFilename(fname);
      btn.onclick = () => startChapterQuiz(fname);
      list.appendChild(btn);
    });

    showSection("chapters");
  } catch (e) {
    console.error("Error loading manifest:", e);
    alert("Could not load chapters for " + subject);
  }
}

/* ----- Quiz ----- */
async function startChapterQuiz(filename) {
  currentChapter = filename;
  const url = RAW_BASE + currentSubject + "/" + filename;

  try {
    const res = await fetch(url, { cache: "no-store" });
    questions = await res.json();

    qIndex = 0;
    correctCount = 0;
    incorrectCount = 0;
    startTime = Date.now();

    showSection("quiz");
    showQuestion();
  } catch (e) {
    console.error("Error loading quiz:", e);
    alert("Could not load quiz file");
  }
}

function showQuestion() {
  const qEl = document.getElementById("question");
  const optEl = document.getElementById("options");
  const endEl = document.getElementById("end-screen");

  if (qIndex >= questions.length) {
    finishQuiz();
    return;
  }

  const q = questions[qIndex];
  qEl.textContent = (qIndex + 1) + ". " + q.question;
  optEl.innerHTML = "";
  endEl.style.display = "none";

  for (const key in q.options) {
    const btn = document.createElement("button");
    btn.textContent = key + ": " + q.options[key];
    btn.onclick = () => {
      if (key === q.correct) correctCount++;
      else incorrectCount++;
      qIndex++;
      showQuestion();
    };
    optEl.appendChild(btn);
  }
}

async function finishQuiz() {
  const qEl = document.getElementById("question");
  const optEl = document.getElementById("options");
  const endEl = document.getElementById("end-screen");

  const timeTaken = Math.floor((Date.now() - startTime) / 1000);
  qEl.textContent = "Quiz Finished!";
  optEl.innerHTML = "";
  endEl.innerHTML = `
    <p>Correct: ${correctCount}</p>
    <p>Incorrect: ${incorrectCount}</p>
    <p>Time: ${timeTaken}s</p>
  `;
  endEl.style.display = "block";

  if (currentUser) {
    await saveResult(
      currentUser.uid,
      currentSubject,
      titleFromFilename(currentChapter),
      correctCount,
      incorrectCount,
      timeTaken
    );
    loadLastFive();
  }
}

/* ----- Last 5 Results ----- */
async function loadLastFive() {
  if (!currentUser) return;
  const results = await fetchLastFive(currentUser.uid);
  const tbody = document.getElementById("last5-body");
  tbody.innerHTML = "";

  results.forEach(r => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${r.subject}</td>
      <td>${r.chapter}</td>
      <td>${r.correct}</td>
      <td>${r.incorrect}</td>
      <td>${r.timeTaken}s</td>
    `;
    tbody.appendChild(row);
  });
}

/* ================================
   Auth Handling
================================ */

onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    document.getElementById("auth").style.display = "none";
    loadSubjects();
    loadLastFive();
  } else {
    currentUser = null;
    showSection("auth");
  }
});

document.getElementById("signupBtn").onclick = async () => {
  const email = document.getElementById("email").value;
  const pass  = document.getElementById("password").value;
  await createUserWithEmailAndPassword(auth, email, pass);
};

document.getElementById("loginBtn").onclick = async () => {
  const email = document.getElementById("email").value;
  const pass  = document.getElementById("password").value;
  await signInWithEmailAndPassword(auth, email, pass);
};

document.getElementById("googleBtn").onclick = async () => {
  await signInWithPopup(auth, googleProvider);
};

document.getElementById("logout-1").onclick = async () => { await signOut(auth); };
document.getElementById("logout-2").onclick = async () => { await signOut(auth); };

document.getElementById("back-to-subjects").onclick = () => loadSubjects();
document.getElementById("back-to-subjects-2").onclick = () => loadSubjects();
