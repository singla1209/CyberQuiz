// Firebase SDK imports (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ✅ Firebase config (your working one)
const firebaseConfig = {
  apiKey: "AIzaSyDHMrrJXvUkQ5Dg_j7ekskEqmkP1f73YSs",
  authDomain: "cyberquiz12.firebaseapp.com",
  projectId: "cyberquiz12",
  storageBucket: "cyberquiz12.firebasestorage.app",   // ✅ Correct bucket
  messagingSenderId: "611229251719",
  appId: "1:611229251719:web:851d64457f7ecfefcb6022"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ✅ Keep user logged in
setPersistence(auth, browserLocalPersistence);

// ✅ Section switching (your index uses .active)
function showSection(id) {
  document.querySelectorAll("section").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ✅ Auth state
onAuthStateChanged(auth, user => {
  if (user) {
    loadSubjects();
    fetchLastFive(user.uid);
  } else {
    showSection("auth");
  }
});

// ✅ Signup
document.getElementById("signup-btn").addEventListener("click", async () => {
  const email = document.getElementById("signup-id").value;
  const password = document.getElementById("signup-pass").value;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (e) {
    alert(e.message);
  }
});

// ✅ Login
document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("login-id").value;
  const password = document.getElementById("login-pass").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    alert(e.message);
  }
});

// ✅ Google login
document.getElementById("google-btn").addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (e) {
    alert(e.message);
  }
});

// ✅ Logout buttons
document.getElementById("logout-1").addEventListener("click", () => signOut(auth));
document.getElementById("logout-2").addEventListener("click", () => signOut(auth));

// ✅ Subjects (manual, like your old code)
async function loadSubjects() {
  const subjectList = document.getElementById("subject-list");
  subjectList.innerHTML = "";

  const subjects = ["Computer Science - 10th", "Computer Science - 11th"];
  subjects.forEach(subject => {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = subject;
    btn.addEventListener("click", () => loadChapters(subject));
    subjectList.appendChild(btn);
  });

  showSection("subjects");
}

// ✅ Chapters (direct JSON files, no manifest)
async function loadChapters(subject) {
  const chapterList = document.getElementById("chapter-list");
  chapterList.innerHTML = "";

  // Manually list JSON files here (like your original approach)
  let chapters = [];
  if (subject === "Computer Science - 10th") {
    chapters = [
      "1 Office Tools.json",
      "2 HTML PART - 1.json",
      "3 HTML PART - 2.json",
      "4 HTML PART - 3.json",
      "5 Operating System.json"
    ];
  } else if (subject === "Computer Science - 11th") {
    chapters = [
      "1 Python Basics.json",
      "2 Data Structures.json"
    ];
  }

  chapters.forEach(chapter => {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.textContent = chapter.replace(".json", "");
    btn.addEventListener("click", () => loadQuiz(subject, chapter));
    chapterList.appendChild(btn);
  });

  showSection("chapters");
}

document.getElementById("back-to-subjects").addEventListener("click", () => showSection("subjects"));
document.getElementById("back-to-subjects-2").addEventListener("click", () => showSection("subjects"));

// ✅ Quiz
async function loadQuiz(subject, chapterFile) {
  const res = await fetch(`Data/questions/${subject}/${chapterFile}`);
  const questions = await res.json();

  let current = 0, correct = 0;

  function renderQuestion() {
    if (current >= questions.length) {
      endQuiz();
      return;
    }
    const q = questions[current];
    document.getElementById("question").textContent = q.question;
    const optionsDiv = document.getElementById("options");
    optionsDiv.innerHTML = "";
    q.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = opt;
      btn.onclick = () => {
        if (opt === q.answer) correct++;
        current++;
        renderQuestion();
      };
      optionsDiv.appendChild(btn);
    });
  }

  function endQuiz() {
    document.getElementById("end-screen").textContent =
      `Quiz complete! Correct: ${correct} / ${questions.length}`;

    saveResult(subject, chapterFile, correct, questions.length - correct);
    fetchLastFive(auth.currentUser.uid);
  }

  renderQuestion();
  showSection("quiz");
}

// ✅ Save result
async function saveResult(subject, chapter, correct, incorrect) {
  if (!auth.currentUser) return;
  try {
    await addDoc(collection(db, "results"), {
      uid: auth.currentUser.uid,
      subject,
      chapter,
      correct,
      incorrect,
      time: new Date()
    });
  } catch (e) {
    console.error("Error saving result:", e);
  }
}

// ✅ Fetch last 5 results
async function fetchLastFive(uid) {
  const q = query(
    collection(db, "results"),
    orderBy("time", "desc"),
    limit(5)
  );

  const snapshot = await getDocs(q);
  const tbody = document.getElementById("last5-body");
  tbody.innerHTML = "";

  snapshot.forEach(doc => {
    const r = doc.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.subject}</td>
      <td>${r.chapter}</td>
      <td>${r.correct}</td>
      <td>${r.incorrect}</td>
      <td>${new Date(r.time.seconds * 1000).toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  });
}
