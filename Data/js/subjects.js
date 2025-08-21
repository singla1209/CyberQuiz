/* ---------- Paths + Subjects ---------- */
export const RAW_BASE = "https://raw.githubusercontent.com/singla1209/Quizzy/main/";
export const API_BASE = "https://api.github.com/repos/singla1209/Quizzy/contents/";

/* Science & Math have pretty chapter-name dictionaries.
   English/SST/CS will just use the filename as the title. */
export const CHAPTER_TITLES = {
  science: {
    1: "Chemical Reactions and Equations",
    2: "Acids, Bases and Salts",
    3: "Metals and Non-metals",
    4: "Carbon and its Compounds",
    5: "Periodic Classification of Elements",
    6: "Life Processes",
    7: "Control and Coordination",
    8: "How do Organisms Reproduce?",
    9: "Heredity and Evolution",
    10: "Light – Reflection and Refraction",
    11: "The Human Eye and the Colourful World",
    12: "Electricity",
    13: "Magnetic Effects of Electric Current",
    14: "Sources of Energy",
    15: "Our Environment",
    16: "Management of Natural Resources"
  },
  math: {
    1: "Real Numbers",
    2: "Polynomials",
    3: "Pair of Linear Equations in Two Variables",
    4: "Quadratic Equations",
    5: "Arithmetic Progressions",
    6: "Triangles",
    7: "Coordinate Geometry",
    8: "Introduction to Trigonometry",
    9: "Applications of Trigonometry",
    10: "Circles",
    11: "Constructions",
    12: "Areas Related to Circles",
    13: "Surface Areas and Volumes",
    14: "Statistics",
    15: "Probability"
  }
};

/* All 5 subjects dynamic (your requirement). */
export const SUBJECTS = [
  { key:"science", label:"Science",          dynamic:true, path:"Data/science/"  },
  { key:"math",    label:"Mathematics",      dynamic:true, path:"Data/math/"     },
  { key:"english", label:"English",          dynamic:true, path:"Data/english/"  },
  { key:"sst",     label:"Social Studies",   dynamic:true, path:"Data/sst/"      },
  { key:"cs",      label:"Computer Science", dynamic:true, path:"Data/cs/"       },
];

/* ---------- Helpers for names ---------- */
export function titleFromFilename(filename){
  const base = filename.replace(/\.json$/i,'').replace(/[_\-]+/g,' ').trim();
  return base.replace(/\s+/g,' ')
    .split(' ')
    .map(w=>w ? w[0].toUpperCase()+w.slice(1) : '')
    .join(' ');
}

export function prettifyChapterName(filename, subjectKey){
  // Science/Math: try dictionary
  if (subjectKey === "science" || subjectKey === "math") {
    const m = filename.match(/chapter\s*(\d+)/i);
    if(m){
      const n = parseInt(m[1],10);
      const pretty = (CHAPTER_TITLES[subjectKey]||{})[n];
      if(pretty) return `Chapter ${n}: ${pretty}`;
    }
  }
  // Others: use file name as-is (Title Case)
  return titleFromFilename(filename);
}

/* ---------- GitHub listing ---------- */
export async function listChapters(path){
  const res = await fetch(API_BASE + path, { cache:"no-store" });
  if(!res.ok) throw new Error("GitHub API error");
  const items = await res.json();
  return items
    .filter(x => x.type === "file" && x.name.toLowerCase().endsWith(".json"))
    .sort((a,b)=>{
      const na = parseInt((a.name.match(/\d+/)||[9999])[0],10);
      const nb = parseInt((b.name.match(/\d+/)||[9999])[0],10);
      if(na !== nb) return na - nb;
      return a.name.localeCompare(b.name);
    });
}

/* Utilities */
export function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
}
