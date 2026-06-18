/* ============================================================
   RoseAI — script.js
   5 Model Ensemble: 4 Teachable Machine + 1 Roboflow
   Labels forced by URL — no Class 1/2/3 confusion
   ============================================================ */

/* ──────────────────────────────────────────────────────────
   MODEL URLS — each URL = one specific disease
   ────────────────────────────────────────────────────────── */
const TM_MODELS = [
  {
    url:     "https://teachablemachine.withgoogle.com/models/my-hLQlRu/",
    disease: "Black Spot"      // forced label — ignore class names
  },
  {
    url:     "https://teachablemachine.withgoogle.com/models/bm9QFLzGu/",
    disease: "Downy Mildew"
  },
  {
    url:     "https://teachablemachine.withgoogle.com/models/kr9RhegUe/",
    disease: "Healthy Leaf"
  },
  {
    url:     "https://teachablemachine.withgoogle.com/models/tK7_aMfSB/",
    disease: "Rose Sawfly"
  }
];

/* ──────────────────────────────────────────────────────────
   ROBOFLOW MODEL
   Classes: Black Spot, Downy Mildew, Powdery Mildew, Normal
   ────────────────────────────────────────────────────────── */
const ROBOFLOW_API_KEY = "NCL5UXX4bV1pwgALh6Fw";
const ROBOFLOW_URL     = "https://serverless.roboflow.com/rose-leaf-diseases/4";

/* Roboflow "Normal" maps to Healthy Leaf */
const ROBOFLOW_CLASS_MAP = {
  "Black Spot":     "Black Spot",
  "Downy Mildew":   "Downy Mildew",
  "Powdery Mildew": "Powdery Mildew",
  "Normal":         "Healthy Leaf"
};

/* ──────────────────────────────────────────────────────────
   SETTINGS
   ────────────────────────────────────────────────────────── */
const CONFIDENCE_CUTOFF = 0.15;   // 15% minimum to show a result
const MAX_RESULTS       = 4;      // show max 4 disease cards

/* ──────────────────────────────────────────────────────────
   DISEASE INFO — cause + treatment for every disease
   Pre-written, friendly, simple language
   ────────────────────────────────────────────────────────── */
const DISEASE_INFO = {
  "Black Spot": {
    cause: "Black Spot is caused by a fungus that loves warm and wet weather. Dark circular spots spread across the leaf surface and grow bigger over time. It spreads fast when water stays on leaves too long.",
    treat: "Remove every spotted leaf and throw them in the bin — never compost them. Buy a rose fungicide spray from any garden shop and spray the whole plant every 7 to 10 days. Always water the soil at the base, never the leaves directly."
  },
  "Downy Mildew": {
    cause: "Downy Mildew is caused by a water mold that thrives in cool and damp conditions. You will see yellow patches on top of the leaves and a fuzzy grey or purple coating underneath them.",
    treat: "Remove all affected leaves immediately and throw them away. Spray the plant with a copper-based fungicide from any garden centre. Improve airflow by trimming nearby branches and avoid watering the leaves."
  },
  "Healthy Leaf": {
    cause: "No disease detected! Your rose leaf looks perfectly healthy with no signs of infection, damage, or pest activity. The leaf shows a vibrant green color and smooth surface.",
    treat: "Keep doing what you are doing! Water at the base of the plant every morning, ensure your rose gets at least 6 hours of sunlight daily, and check the underside of leaves once a week for any early signs of disease."
  },
  "Rose Rust": {
    cause: "Rose Rust is a fungal disease that produces bright orange or rusty-coloured powdery spots mainly on the underside of leaves. It spreads very quickly in warm and humid weather conditions.",
    treat: "Remove and bin all infected leaves straight away. Spray the entire plant with a sulfur-based fungicide from any garden shop, once every week until the spots disappear. Avoid wetting the leaves when watering."
  },
  "Rose Sawfly": {
    cause: "Rose Sawfly damage is caused by tiny caterpillar-like larvae that eat through leaf tissue leaving it looking see-through, skeletonized, or full of small holes. They usually hide on the underside of leaves.",
    treat: "Check underneath every leaf carefully and manually pick off any larvae you find. Spray the plant with neem oil or an insecticide spray from a garden shop, focusing on the underside of leaves. Repeat every week as new eggs can hatch."
  },
  "Powdery Mildew": {
    cause: "Powdery Mildew is a fungal disease that produces a white or grey powdery coating on the surface of leaves, stems, and buds. It thrives in warm days with cool nights and spreads fast in crowded areas.",
    treat: "Remove and bin all heavily infected leaves. Spray the plant with a baking soda solution (1 teaspoon baking soda in 1 litre of water) or a fungicide from your garden shop. Improve airflow by pruning nearby plants and avoid overhead watering."
  }
};

/* ──────────────────────────────────────────────────────────
   REGISTER GSAP PLUGINS
   ────────────────────────────────────────────────────────── */
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/* ──────────────────────────────────────────────────────────
   STATE
   ────────────────────────────────────────────────────────── */
let loadedModels = [];   // holds all 4 loaded TM models
let hasImage     = false;

/* ──────────────────────────────────────────────────────────
   DOM REFERENCES
   ────────────────────────────────────────────────────────── */
const fileIn             = document.getElementById("fileIn");
const dz                 = document.getElementById("dz");
const dzIdle             = document.getElementById("dzIdle");
const dzPrev             = document.getElementById("dzPrev");
const prevImg            = document.getElementById("prevImg");
const dzRemove           = document.getElementById("dzRemove");
const analyzeBtn         = document.getElementById("analyzeBtn");
const diagStatus         = document.getElementById("diagStatus");
const summaryBox         = document.getElementById("summaryBox");
const summaryBody        = document.getElementById("summaryBody");
const resultsPlaceholder = document.getElementById("resultsPlaceholder");
const resultsCards       = document.getElementById("resultsCards");
const loadingOverlay     = document.getElementById("loadingOverlay");
const loaderTitle        = document.getElementById("loaderTitle");

/* ══════════════════════════════════════════════════════════
   GSAP — CURSOR
   ══════════════════════════════════════════════════════════ */
const cursor         = document.getElementById("cursor");
const cursorFollower = document.getElementById("cursorFollower");
let mouseX = 0, mouseY = 0;
let followerX = 0, followerY = 0;

document.addEventListener("mousemove", e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  gsap.to(cursor, { x: mouseX, y: mouseY, duration: 0.1 });
});

function animateFollower() {
  followerX += (mouseX - followerX) * 0.08;
  followerY += (mouseY - followerY) * 0.08;
  gsap.set(cursorFollower, { x: followerX, y: followerY });
  requestAnimationFrame(animateFollower);
}
animateFollower();

document.querySelectorAll("a, button, .d-card, .team-card, .nav-link").forEach(el => {
  el.addEventListener("mouseenter", () => {
    gsap.to(cursor,         { scale: 2.5, duration: 0.3 });
    gsap.to(cursorFollower, { scale: 1.5, borderColor: "rgba(74,222,128,0.6)", duration: 0.3 });
  });
  el.addEventListener("mouseleave", () => {
    gsap.to(cursor,         { scale: 1, duration: 0.3 });
    gsap.to(cursorFollower, { scale: 1, borderColor: "rgba(74,222,128,0.4)", duration: 0.3 });
  });
});

/* ══════════════════════════════════════════════════════════
   GSAP — FLOATING LEAVES
   ══════════════════════════════════════════════════════════ */
function createLeaves() {
  const layer  = document.getElementById("leavesLayer");
  if (!layer) return;
  const emojis = ["🌿","🍃","🌱","☘️","🍀"];
  for (let i = 0; i < 18; i++) {
    const leaf = document.createElement("div");
    leaf.className   = "leaf";
    leaf.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    leaf.style.left    = Math.random() * 100 + "vw";
    leaf.style.top     = Math.random() * 100 + "vh";
    leaf.style.fontSize = (0.8 + Math.random() * 1.4) + "rem";
    layer.appendChild(leaf);
    gsap.to(leaf, {
      y: -40 - Math.random() * 60,
      x: (Math.random() - 0.5) * 60,
      rotation: (Math.random() - 0.5) * 40,
      duration: 6 + Math.random() * 8,
      ease: "sine.inOut",
      repeat: -1, yoyo: true,
      delay: Math.random() * 5
    });
  }
}
createLeaves();

/* ══════════════════════════════════════════════════════════
   GSAP — NAVBAR SCROLL
   ══════════════════════════════════════════════════════════ */
ScrollTrigger.create({
  start: "top -80",
  onUpdate: self => {
    const nav = document.getElementById("navbar");
    if (!nav) return;
    nav.style.background = self.progress > 0
      ? "rgba(4,8,10,0.95)"
      : "rgba(4,8,10,0.75)";
  }
});

/* ══════════════════════════════════════════════════════════
   GSAP — SMOOTH SCROLL NAV
   ══════════════════════════════════════════════════════════ */
document.querySelectorAll(".nav-link[data-section], .nav-link-scroll").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    const href   = link.getAttribute("href") || "#" + link.dataset.section;
    const target = document.querySelector(href);
    if (target) {
      gsap.to(window, { duration: 1.2, scrollTo: { y: target, offsetY: 64 }, ease: "expo.inOut" });
    }
  });
});

/* Active nav on scroll */
document.querySelectorAll(".section").forEach(section => {
  ScrollTrigger.create({
    trigger: section,
    start: "top 60%", end: "bottom 40%",
    onEnter:     () => setActiveNav(section.id),
    onEnterBack: () => setActiveNav(section.id)
  });
});
function setActiveNav(id) {
  document.querySelectorAll(".nav-link[data-section]").forEach(l => {
    l.classList.toggle("active", l.dataset.section === id);
  });
}

/* ══════════════════════════════════════════════════════════
   GSAP — HERO ANIMATIONS
   ══════════════════════════════════════════════════════════ */
window.addEventListener("load", () => {
  const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

  tl.to("#heroTag",   { opacity: 1, y: 0, duration: 0.8 }, 0.3)
    .from(".hero-title .line", { y: 80, opacity: 0, duration: 1, stagger: 0.15, ease: "expo.out" }, 0.5)
    .to("#heroSub",   { opacity: 1, y: 0, duration: 0.8 }, 1.1)
    .to("#heroBtns",  { opacity: 1, y: 0, duration: 0.7 }, 1.3)
    .to("#heroStats", { opacity: 1, y: 0, duration: 0.7 }, 1.5)
    .to("#heroRight", { opacity: 1, scale: 1, duration: 1.2, ease: "expo.out" }, 0.6)
    .from(".glow-ring",{ scale: 0.5, opacity: 0, duration: 1, stagger: 0.15, ease: "expo.out" }, 0.8)
    .to(["#fb1","#fb2","#fb3","#fb4"], { opacity: 1, y: 0, duration: 0.6, stagger: 0.25, ease: "back.out(1.7)" }, 1.4)
    .to("#scrollInd", { opacity: 1, duration: 0.8 }, 2);

  gsap.to(".tag-pulse", { scale: 0.6, opacity: 0.4, duration: 1, repeat: -1, yoyo: true, ease: "sine.inOut" });
  gsap.to(".glow-ring", { scale: 1.04, opacity: 0.7, duration: 2.5, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: 0.4 });
  gsap.to(["#fb1","#fb2","#fb3","#fb4"], { y: -10, duration: 3, repeat: -1, yoyo: true, ease: "sine.inOut", stagger: 0.6 });
});

gsap.set("#heroTag",   { opacity: 0, y: 20 });
gsap.set("#heroSub",   { opacity: 0, y: 20 });
gsap.set("#heroBtns",  { opacity: 0, y: 20 });
gsap.set("#heroStats", { opacity: 0, y: 20 });
gsap.set("#heroRight", { opacity: 0, scale: 0.85 });
gsap.set(["#fb1","#fb2","#fb3","#fb4"], { opacity: 0, y: 20 });
gsap.set("#scrollInd", { opacity: 0 });

/* Hero parallax on mouse move */
document.addEventListener("mousemove", e => {
  const xPos = (e.clientX / window.innerWidth  - 0.5) * 20;
  const yPos = (e.clientY / window.innerHeight - 0.5) * 20;
  gsap.to("#roseStage", { rotationY: xPos * 0.3, rotationX: -yPos * 0.3, duration: 1.2, ease: "power2.out", transformPerspective: 1000 });
  gsap.to(".hero-bg-orb", { x: xPos * 0.8, y: yPos * 0.8, duration: 2, ease: "power2.out" });
});

/* Hero scroll fade out */
gsap.to(".hero-section .hero-layout", {
  scrollTrigger: { trigger: ".hero-section", start: "top top", end: "bottom top", scrub: 1 },
  opacity: 0, y: -60
});

/* ══════════════════════════════════════════════════════════
   GSAP — DIAGNOSE + DISEASE + ABOUT SCROLL ANIMATIONS
   ══════════════════════════════════════════════════════════ */
gsap.to("#uploadPanel", {
  scrollTrigger: { trigger: "#diagnose", start: "top 70%", toggleActions: "play none none none" },
  opacity: 1, x: 0, duration: 1, ease: "expo.out"
});
gsap.to(".results-panel", {
  scrollTrigger: { trigger: "#diagnose", start: "top 70%", toggleActions: "play none none none" },
  opacity: 1, x: 0, duration: 1, ease: "expo.out", delay: 0.2
});
gsap.to(".d-card", {
  scrollTrigger: { trigger: "#diseases", start: "top 70%", toggleActions: "play none none none" },
  opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: "expo.out"
});
gsap.from(".about-text-col .eyebrow, .about-big-title, .about-desc", {
  scrollTrigger: { trigger: "#about", start: "top 70%" },
  opacity: 0, y: 40, duration: 1, stagger: 0.15, ease: "expo.out"
});
gsap.to(".ab-feat", {
  scrollTrigger: { trigger: ".about-features", start: "top 80%" },
  opacity: 1, x: 0, duration: 0.8, stagger: 0.15, ease: "expo.out"
});
gsap.to(".p-step", {
  scrollTrigger: { trigger: ".process-block", start: "top 75%" },
  opacity: 1, y: 0, duration: 0.7, stagger: 0.18, ease: "expo.out"
});
gsap.to(".team-card", {
  scrollTrigger: { trigger: ".team-block", start: "top 80%" },
  opacity: 1, x: 0, duration: 0.6, stagger: 0.1, ease: "expo.out"
});
gsap.to(".mission-box", {
  scrollTrigger: { trigger: ".team-block", start: "top 80%" },
  opacity: 1, x: 0, duration: 0.8, ease: "expo.out", delay: 0.3
});

/* Disease card hover */
document.querySelectorAll(".d-card").forEach(card => {
  card.addEventListener("mouseenter", () => {
    gsap.to(card, { y: -8, scale: 1.02, duration: 0.4, ease: "power2.out" });
    const icon = card.querySelector(".d-card-icon");
    if (icon) gsap.to(icon, { scale: 1.2, rotation: 8, duration: 0.4, ease: "back.out(1.7)" });
  });
  card.addEventListener("mouseleave", () => {
    gsap.to(card, { y: 0, scale: 1, duration: 0.5, ease: "expo.out" });
    const icon = card.querySelector(".d-card-icon");
    if (icon) gsap.to(icon, { scale: 1, rotation: 0, duration: 0.4, ease: "power2.out" });
  });
});

/* ══════════════════════════════════════════════════════════
   LOAD ALL 4 TEACHABLE MACHINE MODELS
   ══════════════════════════════════════════════════════════ */
async function loadAllModels() {
  setStatus("Loading AI models…");
  try {
    /* Load all 4 TM models in parallel for speed */
    const promises = TM_MODELS.map(async (m) => {
      const model = await tmImage.load(
        m.url + "model.json",
        m.url + "metadata.json"
      );
      return { model, disease: m.disease };
    });
    loadedModels = await Promise.all(promises);
    setStatus("✅ All models ready. Upload a leaf image.");
    console.log("✅ All 4 TM models loaded.");
  } catch (err) {
    setStatus("⚠ Model loading failed. Check internet connection.");
    console.error("Model load error:", err);
  }
}
loadAllModels();

/* ══════════════════════════════════════════════════════════
   FILE UPLOAD + DRAG AND DROP
   ══════════════════════════════════════════════════════════ */
fileIn.addEventListener("change", e => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

dz.addEventListener("dragover",  e => { e.preventDefault(); dz.classList.add("drag-over"); });
dz.addEventListener("dragleave", () => dz.classList.remove("drag-over"));
dz.addEventListener("drop", e => {
  e.preventDefault();
  dz.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) handleFile(file);
  else showToast("Please drop a valid image file.");
});

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    prevImg.src              = e.target.result;
    dzIdle.style.display     = "none";
    dzPrev.style.display     = "block";
    analyzeBtn.disabled      = false;
    hasImage                 = true;
    setStatus("Image ready — press Analyze.");
    hideResults();
    gsap.from(prevImg,    { scale: 0.85, opacity: 0, duration: 0.5, ease: "back.out(1.7)" });
    gsap.to(analyzeBtn,   { scale: 1.02, duration: 0.3, ease: "back.out(2)", yoyo: true, repeat: 1 });
  };
  reader.readAsDataURL(file);
}

dzRemove.addEventListener("click", e => { e.stopPropagation(); resetAll(); });

function resetAll() {
  prevImg.src              = "";
  fileIn.value             = "";
  dzPrev.style.display     = "none";
  dzIdle.style.display     = "flex";
  analyzeBtn.disabled      = true;
  hasImage                 = false;
  summaryBox.style.display = "none";
  hideResults();
  setStatus("Upload a leaf image to begin.");
}

/* ══════════════════════════════════════════════════════════
   ANALYZE BUTTON
   ══════════════════════════════════════════════════════════ */
analyzeBtn.addEventListener("click", async () => {
  if (!hasImage)              { showToast("Please upload a leaf image first."); return; }
  if (loadedModels.length < 4){ showToast("Models still loading. Please wait."); return; }
  await runPipeline();
});

/* ══════════════════════════════════════════════════════════
   FULL AI PIPELINE
   ══════════════════════════════════════════════════════════ */
async function runPipeline() {
  showLoader("Scanning leaf with 5 AI models…");

  /* results map — key = disease name, value = highest confidence */
  const resultsMap = {};

  /* ── Step 1: Run all 4 Teachable Machine models in parallel ── */
  try {
    const tmPromises = loadedModels.map(async ({ model, disease }) => {
      const predictions = await model.predict(prevImg);
      /*
        Each model is a binary classifier:
        predictions[0] = the disease class (highest confidence = detected)
        We take predictions[0].probability as the disease confidence
        because Class 1 (index 0) is the disease the model was trained for
      */
      const confidence = predictions[0].probability;
      console.log(`${disease}: ${Math.round(confidence * 100)}%`);
      return { disease, confidence };
    });
    const tmResults = await Promise.all(tmPromises);

    /* Add TM results to map */
    tmResults.forEach(({ disease, confidence }) => {
      if (confidence >= CONFIDENCE_CUTOFF) {
        /* Keep higher score if already exists */
        if (!resultsMap[disease] || confidence > resultsMap[disease]) {
          resultsMap[disease] = confidence;
        }
      }
    });

  } catch (err) {
    console.error("TM model error:", err);
  }

  /* ── Step 2: Run Roboflow model ── */
  try {
    /* Convert image to base64 for Roboflow */
    const canvas  = document.createElement("canvas");
    canvas.width  = prevImg.naturalWidth  || prevImg.width;
    canvas.height = prevImg.naturalHeight || prevImg.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(prevImg, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg").split(",")[1];

    const response = await fetch(
      `${ROBOFLOW_URL}?api_key=${ROBOFLOW_API_KEY}`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body:    base64
      }
    );

    if (response.ok) {
      const data = await response.json();
      /* Roboflow returns predictions array */
      const rfPreds = data.predictions || data.top || [];
      rfPreds.forEach(pred => {
        const rawClass  = pred.class || pred.label || "";
        const confidence = pred.confidence || pred.score || 0;
        const disease   = ROBOFLOW_CLASS_MAP[rawClass] || rawClass;
        if (disease && confidence >= CONFIDENCE_CUTOFF) {
          /* Deduplicate — keep higher score */
          if (!resultsMap[disease] || confidence > resultsMap[disease]) {
            resultsMap[disease] = confidence;
          }
        }
      });
    }
  } catch (err) {
    console.warn("Roboflow error (continuing with TM results):", err);
  }

  hideLoader();

  /* ── Step 3: Sort + take top MAX_RESULTS ── */
  const finalResults = Object.entries(resultsMap)
    .map(([disease, probability]) => ({ disease, probability }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, MAX_RESULTS);

  if (finalResults.length === 0) {
    showNoResult();
    return;
  }

  /* Healthy leaf special card */
  if (
    finalResults.length === 1 &&
    finalResults[0].disease === "Healthy Leaf" &&
    finalResults[0].probability >= 0.70
  ) {
    showHealthyCard();
    updateSummary(finalResults, true);
    return;
  }

  /* Remove "Healthy Leaf" from results if diseases are present */
  const diseaseResults = finalResults.filter(r => r.disease !== "Healthy Leaf");
  const showResults    = diseaseResults.length > 0 ? diseaseResults : finalResults;

  showResultShells(showResults);
  updateSummary(showResults, false);
}

/* ══════════════════════════════════════════════════════════
   BUILD RESULT CARDS
   ══════════════════════════════════════════════════════════ */
function showResultShells(results) {
  resultsPlaceholder.style.display = "none";
  resultsCards.style.display       = "flex";
  resultsCards.innerHTML           = "";

  const rankLabels  = ["👑 Top Match", "2nd Match", "3rd Match", "4th Match"];
  const rankClasses = ["rb-1", "rb-2", "rb-3", "rb-3"];

  results.forEach((item, i) => {
    const pct         = Math.round(item.probability * 100);
    const displayName = item.disease;
    const info        = DISEASE_INFO[displayName] || {
      cause: "This disease affects rose plants and can spread quickly if left untreated.",
      treat: "Remove affected leaves and consult a local garden centre for the right treatment spray."
    };
    const fillCls = pct >= 60 ? "fill-high" : pct >= 30 ? "fill-med" : "fill-low";
    const pctCls  = pct >= 60 ? "pct-high"  : pct >= 30 ? "pct-med"  : "pct-low";

    const card = document.createElement("div");
    card.className = `res-card${i === 0 ? " rank-1" : ""}`;
    card.innerHTML = `
      <div class="res-card-top">
        <div class="res-name">${displayName}</div>
        <div class="res-rank ${rankClasses[i]}">${rankLabels[i]}</div>
      </div>
      <div class="conf-row">
        <span class="conf-lbl">Match</span>
        <div class="conf-track">
          <div class="conf-fill ${fillCls}" id="fill-${i}"></div>
        </div>
        <span class="conf-pct ${pctCls}">${pct}%</span>
      </div>
      <div class="res-info">
        <div class="info-b cause">
          <div class="info-b-head"><span>🔍</span><h4>What's Causing This</h4></div>
          <p>${info.cause}</p>
        </div>
        <div class="info-b treat">
          <div class="info-b-head"><span>💊</span><h4>What You Should Do</h4></div>
          <p>${info.treat}</p>
        </div>
      </div>
    `;

    resultsCards.appendChild(card);
    gsap.from(card, { opacity: 0, y: 30, duration: 0.6, ease: "expo.out", delay: i * 0.15 });

    setTimeout(() => {
      const fill = document.getElementById(`fill-${i}`);
      if (fill) fill.style.width = pct + "%";
    }, 300 + i * 150);
  });

  /* Analyze again */
  const again = document.createElement("button");
  again.className   = "btn-again";
  again.textContent = "↺  Analyze Another Leaf";
  again.addEventListener("click", () => {
    resetAll();
    gsap.to(window, { scrollTo: "#diagnose", duration: 1, ease: "expo.inOut" });
  });
  resultsCards.appendChild(again);
  gsap.from(again, { opacity: 0, y: 20, duration: 0.5, delay: results.length * 0.15 + 0.2 });
}

/* ══════════════════════════════════════════════════════════
   HEALTHY CARD
   ══════════════════════════════════════════════════════════ */
function showHealthyCard() {
  resultsPlaceholder.style.display = "none";
  resultsCards.style.display       = "flex";
  const info = DISEASE_INFO["Healthy Leaf"];
  resultsCards.innerHTML = `
    <div class="healthy-card">
      <span class="healthy-emoji">🌹</span>
      <h3>Your Rose Looks Healthy!</h3>
      <p>${info.cause}<br/><br/><strong>Care tip:</strong> ${info.treat}</p>
    </div>
    <button class="btn-again" id="btnAgain">↺  Analyze Another Leaf</button>
  `;
  gsap.from(".healthy-card", { scale: 0.9, opacity: 0, duration: 0.6, ease: "back.out(1.7)" });
  document.getElementById("btnAgain").addEventListener("click", () => {
    resetAll();
    gsap.to(window, { scrollTo: "#diagnose", duration: 1, ease: "expo.inOut" });
  });
}

/* ══════════════════════════════════════════════════════════
   NO RESULT
   ══════════════════════════════════════════════════════════ */
function showNoResult() {
  resultsPlaceholder.style.display = "none";
  resultsCards.style.display       = "flex";
  resultsCards.innerHTML = `
    <div class="healthy-card" style="border-color:rgba(239,68,68,0.2)">
      <span class="healthy-emoji">🤔</span>
      <h3>No Clear Result</h3>
      <p>The AI could not confidently identify any condition above the 15% threshold.
         Please try a clearer, well-lit photo of a single rose leaf on a plain white background.</p>
    </div>
  `;
  gsap.from(".healthy-card", { scale: 0.9, opacity: 0, duration: 0.5, ease: "back.out(1.7)" });
}

/* ══════════════════════════════════════════════════════════
   SUMMARY BOX
   ══════════════════════════════════════════════════════════ */
function updateSummary(results, isHealthy) {
  summaryBox.style.display = "block";
  if (isHealthy) {
    summaryBody.innerHTML = `<span style="color:var(--green-l)">✅ Plant appears healthy</span>`;
  } else {
    const lines = results.map((item, i) => {
      const pct = Math.round(item.probability * 100);
      return `<div>${i + 1}. ${item.disease} — <strong>${pct}%</strong></div>`;
    }).join("");
    summaryBody.innerHTML = `
      <div style="color:#ef4444;margin-bottom:0.4rem">
        ⚠ ${results.length} condition${results.length > 1 ? "s" : ""} detected
      </div>${lines}`;
  }
  gsap.from(summaryBox, { opacity: 0, y: 10, duration: 0.4, ease: "power2.out" });
}

/* ══════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════ */
function hideResults() {
  resultsPlaceholder.style.display = "flex";
  resultsCards.style.display       = "none";
  resultsCards.innerHTML           = "";
}

function showLoader(title) {
  if (loaderTitle) loaderTitle.textContent = title;
  loadingOverlay.style.display = "flex";
  gsap.from(".loading-box", { scale: 0.85, opacity: 0, duration: 0.4, ease: "back.out(1.7)" });
}

function hideLoader() {
  gsap.to(".loading-box", {
    scale: 0.85, opacity: 0, duration: 0.3, ease: "power2.in",
    onComplete: () => { loadingOverlay.style.display = "none"; }
  });
}

function setStatus(msg) {
  if (diagStatus) diagStatus.textContent = msg;
}

function showToast(msg) {
  const old = document.getElementById("toast");
  if (old) old.remove();
  const t = document.createElement("div");
  t.id = "toast";
  t.textContent = msg;
  Object.assign(t.style, {
    position: "fixed", bottom: "2rem", left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(4,8,10,0.96)", color: "#ede8df",
    padding: "0.75rem 1.6rem", borderRadius: "100px",
    fontSize: "0.88rem", fontFamily: "'Plus Jakarta Sans',sans-serif",
    fontWeight: "500", zIndex: "9999",
    boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
    border: "1px solid rgba(74,222,128,0.15)",
    whiteSpace: "nowrap"
  });
  document.body.appendChild(t);
  gsap.from(t, { y: 20, opacity: 0, duration: 0.4, ease: "back.out(1.7)" });
  setTimeout(() => {
    gsap.to(t, {
      y: 20, opacity: 0, duration: 0.3, ease: "power2.in",
      onComplete: () => t.remove()
    });
  }, 3500);
}
