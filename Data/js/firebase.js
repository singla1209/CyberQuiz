/* ---------- Firebase SDK (v12) ---------- */
export { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
export {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, updateProfile, signOut,
  GoogleAuthProvider, signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
export {
  getFirestore, doc, setDoc, getDoc,
  collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

/* ---------- Config (your existing project) ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyDHMrrJXvUkQ5Dg_j7ekskEqmkP1f73YSs",
  authDomain: "cyberquiz12.firebaseapp.com",
  projectId: "cyberquiz12",
  storageBucket: "cyberquiz12.firebasestorage.app",
  messagingSenderId: "611229251719",
  appId: "1:611229251719:web:851d64457f7ecfefcb6022",
  measurementId: ""
};

import { initializeApp as _init } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth as _getAuth, GoogleAuthProvider as _GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore as _getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

export const app  = _init(firebaseConfig);
export const auth = _getAuth(app);
export const db   = _getFirestore(app);
export const googleProvider = new _GoogleAuthProvider();

/* Small helper for auth error → human text */
export function humanAuthError(e){
  const code = (e && e.code) ? e.code : "";
  switch(code){
    case "auth/invalid-email": return "Please enter a valid email.";
    case "auth/missing-password": return "Please enter your password.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found": return "Invalid email/mobile or password.";
    case "auth/cancelled-popup-request":
    case "auth/popup-closed-by-user": return "Google sign-in was closed. Try again.";
    case "auth/email-already-in-use": return "This email/mobile is already registered. Try logging in.";
    case "auth/weak-password": return "Password should be at least 6 characters.";
    default: return e?.message || "Authentication error.";
  }
}
