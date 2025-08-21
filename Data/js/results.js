import { db, auth } from "./firebase.js";
import {
  collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs
} from "./firebase.js";

/* Save result to Firestore */
export async function saveResult({ userName, subjectText, correct, total, responses, timeTakenSec, chapterTitle }){
  const current = auth.currentUser;
  await addDoc(collection(db, "quiz_results"), {
    name: (userName || current?.displayName || ""),
    score: correct,
    totalQuestions: total,
    correctAnswers: correct,
    incorrectAnswers: total - correct,
    responses,
    date: serverTimestamp(),
    subject: subjectText ? `${subjectText} : ${chapterTitle}` : null,
    userId: current ? current.uid : null,
    userEmail: current ? current.email : null,
    timeTakenSec: Math.round(timeTakenSec)
  });
}

/* Fetch last 5 rows for current user and render table body */
export async function fetchLastFive({ userId, userName }){
  const body = document.getElementById("last5-body");
  const current = auth.currentUser;

  if(!current){
    body.innerHTML = `<tr><td class="muted" colspan="6">Please log in to see results.</td></tr>`;
    return;
  }
  body.innerHTML = `<tr><td class="muted" colspan="6">Loading…</td></tr>`;

  try{
    const snap = await getDocs(query(
      collection(db, "quiz_results"),
      orderBy("date","desc"),
      limit(50)
    ));

    const email = current?.email || null;
    const list = [];
    snap.forEach(docSnap=>{
      const d = docSnap.data();
      const match =
        (d.userId && userId && d.userId === userId) ||
        (d.userEmail && email && d.userEmail === email) ||
        (d.name && userName && String(d.name).trim().toLowerCase() === String(userName).trim().toLowerCase());
      if(match) list.push(d);
    });

    if(!list.length){
      body.innerHTML = `<tr><td class="muted" colspan="6">No results yet. Finish a quiz to see it here.</td></tr>`;
      return;
    }

    const toMillis = (df)=>{
      if(!df) return 0;
      if(typeof df.toDate === "function") return df.toDate().getTime();
      return new Date(df).getTime() || 0;
    };

    list.sort((a,b)=> toMillis(b.date) - toMillis(a.date));
    const top5 = list.slice(0,5);

    const secsToText = (s)=>{
      s = Math.max(0, Math.round(s));
      const m = Math.floor(s/60);
      const r = s%60;
      return `${m}m ${r}s`;
    };

    body.innerHTML = "";
    top5.forEach(d=>{
      const dt = d.date?.toDate ? d.date.toDate() : (d.date ? new Date(d.date) : null);
      const dtTxt = dt ? dt.toLocaleString() : "";
      const total = Number(d.totalQuestions)||0;
      const corr  = Number(d.correctAnswers)||0;
      const inc   = Number(d.incorrectAnswers) || Math.max(0,total-corr);
      const secs  = Number(d.timeTakenSec)||0;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${dtTxt}</td>
        <td>${d.subject||"N/A"}</td>
        <td>${d.name||""}</td>
        <td>${corr}</td>
        <td>${inc}</td>
        <td>${secsToText(secs)}</td>
      `;
      tr.onclick = ()=> window.openModalForResult && window.openModalForResult(d);
      body.appendChild(tr);
    });
  }catch(err){
    console.error(err);
    body.innerHTML = `<tr><td class="muted" colspan="6">Couldn't load results.</td></tr>`;
  }
}
