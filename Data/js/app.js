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

// ✅ Firebase config (your project)
const firebaseConfig = {
  apiKey: "AIzaSyDHMrrJXvUkQ5Dg_j7ekskEqmkP1f73YSs",
  authDomain: "cyberquiz12.firebaseapp.com",
  projectId: "cyberquiz12",
  storageBucket: "cyberquiz12.appspot.com",
  messagingSenderId: "611229251719",
  appId: "1:611229251719:web:851d64457f7ecfefcb6022"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ✅ Keep user logged in
setPersistence(auth, browserLocalPersistence);

// ✅ Section Switching (matches your CSS)
function showSection(id) {
  document.querySelectorAll("section").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ✅ Handle auth state
onAuthStateChanged(auth, user => {
  if (user) {
    loadSubjects();
    fetchLastFive(user.uid);
  } else {
    showSection("auth");
  }
});

// ✅ Signup
document.getElementById("signupBtn").addEventListener("click", async () => {
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (e) {
    alert(e.message);
  }
});

// ✅ Login
document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    alert(e.message);
  }
});

// ✅ Google login
document.getElementById("googleBtn").addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (e) {
    alert(e.message);
  }
});

// ✅ Logout buttons
document.getElementById("logout-1").addEventListener("click", () => signOut(auth));
document.getElementById("logout-2").addEventListener("click", () => signOut(auth));

// ✅ Load subjects
async function loadSubjects() {
  const subjectList = document.getElementById("subject-list");
  subjectList.innerHTML = "";

  // Add subject folders (dynamic if you expand later)
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

// ✅ Load chapters from manifest.json
async function loadChapters(subject) {
  const chapterList = document.getElementById("chapter-list");
  chapterList.innerHTML = "";

  const manifestUrl = `Data/questions/${subject}/manifest.json`;
  const res = await fetch(manifestUrl);
  const chapters = await res.json();

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

// ✅ Load quiz
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

// ✅ Save result to Firestore
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
