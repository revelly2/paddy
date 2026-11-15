// Full system architecture figure (replaces Figure 4), drawn from what the app actually does.
const path = require("path");
const { shoot } = require("./figures.js");

const SHOTS = path.join(__dirname, "screenshots").replace(/\\/g, "/");
const img = f => `file:///${SHOTS}/${f}`;

const icon = {
  user: `<svg viewBox="0 0 64 48" width="96" height="72"><circle cx="20" cy="14" r="8" fill="#2f5d8a"/><circle cx="44" cy="14" r="8" fill="#2f5d8a"/><circle cx="32" cy="11" r="10" fill="#1e4670"/><path d="M4 44c0-10 7-16 16-16s16 6 16 16z" fill="#2f5d8a"/><path d="M28 44c0-10 7-16 16-16s16 6 16 16z" fill="#2f5d8a"/><path d="M14 46c0-12 8-19 18-19s18 7 18 19z" fill="#1e4670"/></svg>`,
  server: `<svg viewBox="0 0 64 56" width="80" height="70"><rect x="8" y="4" width="48" height="14" rx="3" fill="#5b4b8a"/><rect x="8" y="21" width="48" height="14" rx="3" fill="#6d5ca3"/><rect x="8" y="38" width="48" height="14" rx="3" fill="#5b4b8a"/><circle cx="16" cy="11" r="2.5" fill="#b7f0c2"/><circle cx="16" cy="28" r="2.5" fill="#b7f0c2"/><circle cx="16" cy="45" r="2.5" fill="#b7f0c2"/></svg>`,
  db: `<svg viewBox="0 0 48 56" width="62" height="72"><ellipse cx="24" cy="9" rx="20" ry="7" fill="#3c3a7a"/><path d="M4 9v38c0 4 9 7 20 7s20-3 20-7V9c0 4-9 7-20 7S4 13 4 9z" fill="#4e4c97"/><path d="M4 22c0 4 9 7 20 7s20-3 20-7M4 35c0 4 9 7 20 7s20-3 20-7" stroke="#c9c7f2" stroke-width="2" fill="none"/></svg>`,
  advice: `<svg viewBox="0 0 64 64" width="74" height="74"><rect x="10" y="6" width="36" height="48" rx="4" fill="#fff" stroke="#1f6b5c" stroke-width="3"/><path d="M17 18h22M17 27h22M17 36h14" stroke="#1f6b5c" stroke-width="3"/><path d="M48 58c-8 0-12-7-10-15 8 0 12 7 10 15z" fill="#3d9a4f"/><path d="M48 58c6-2 10-8 8-15-7 1-10 8-8 15z" fill="#57b862"/></svg>`,
};

const arrow = `<div class="arr">&#10148;</div>`;
const col = (cls, title, body) => `<div class="card ${cls}"><div class="ct">${title}</div>${body}</div>`;
const ul = items => `<ul>${items.map(i => `<li>${i}</li>`).join("")}</ul>`;
const step = (n, cls, title, body) => `<div class="step ${cls}"><div class="sh"><span class="num">${n}</span>${title}</div><div class="sb">${body}</div></div>`;
const flow = (cls, svg, t) => `<div class="fl ${cls}">${svg}<span>${t}</span></div>`;
const mini = c => `<svg viewBox="0 0 24 24" width="34" height="34"><circle cx="12" cy="12" r="10" fill="${c}"/></svg>`;

const html = `
<style>
*{box-sizing:border-box} body{margin:0;background:#fff;font-family:"Segoe UI",Arial,sans-serif;color:#1d2a33}
.page{width:1600px;padding:18px}
.banner{background:#1f5640;color:#fff;border-radius:14px;padding:14px 20px;text-align:center}
.banner h1{margin:0;font-size:38px;letter-spacing:.3px} .banner h2{margin:2px 0 0;font-size:26px;font-weight:600} .banner h3{margin:4px 0 0;font-size:21px;font-style:italic;font-weight:500}
.row{display:flex;align-items:stretch;margin-top:14px}
.card{flex:1;border-radius:10px;border:2px solid;padding:10px 10px 12px;min-width:0}
.ct{font-weight:700;font-size:19px;text-align:center;line-height:1.2;margin-bottom:8px}
.card ul{margin:6px 0 0;padding-left:18px;font-size:14.5px;line-height:1.35} .card li{margin-bottom:3px}
.sub{font-size:13.5px;text-align:center;color:#3b4a55;margin-top:-4px;margin-bottom:6px}
.arr{display:flex;align-items:center;justify-content:center;width:26px;font-size:22px;color:#1f5640}
.c1{background:#eef6fd;border-color:#86b6e3}.c2{background:#eef8ef;border-color:#7cc08a}.c3{background:#f3effa;border-color:#a998d3}
.c4{background:#eaf4fb;border-color:#6aa9d8}.c5{background:#fff4e8;border-color:#f0a85a}.c6{background:#e9f7f4;border-color:#5fb8a6}.c7{background:#f2f0fb;border-color:#9a93d6}
.ic{text-align:center;margin:4px 0}
.thumb{display:block;margin:4px auto;border-radius:6px;border:1px solid #9bb;object-fit:cover}
.chip{border-radius:6px;padding:5px 8px;font-size:13.5px;font-weight:600;margin:5px 0;line-height:1.25}
.im{background:#d9f1d4}.nm{background:#fdf0b8}.rh{background:#fbd0c4}
.tag{display:inline-block;font-size:12.5px;background:#fff;border:1px solid #6aa9d8;border-radius:5px;padding:2px 6px;margin:2px}
.section{margin-top:16px;border:2px solid #b9d7e8;border-radius:12px;padding:10px 12px 12px;background:#f7fbfd}
.stitle{display:inline-block;background:#1f4f7a;color:#fff;font-weight:700;font-size:20px;padding:6px 16px;border-radius:8px}
.steps{display:flex;margin-top:10px;align-items:stretch}
.step{flex:1;border:2px solid;border-radius:10px;background:#fff;overflow:hidden;min-width:0}
.sh{color:#fff;font-weight:700;font-size:16.5px;padding:7px 10px;display:flex;align-items:center;gap:8px;line-height:1.2}
.num{background:#fff;border-radius:50%;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-size:17px;flex:0 0 28px}
.sb{padding:8px 10px;font-size:14px;line-height:1.35} .sb ul{margin:0;padding-left:17px} .sb li{margin-bottom:3px}
.s1{border-color:#3d7fc0}.s1 .sh{background:#3d7fc0}.s1 .num{color:#3d7fc0}
.s2{border-color:#3d9a4f}.s2 .sh{background:#3d9a4f}.s2 .num{color:#3d9a4f}
.s3{border-color:#7a5bb5}.s3 .sh{background:#7a5bb5}.s3 .num{color:#7a5bb5}
.s4{border-color:#e08a2e}.s4 .sh{background:#e08a2e}.s4 .num{color:#e08a2e}
.s5{border-color:#1f8f80}.s5 .sh{background:#1f8f80}.s5 .num{color:#1f8f80}
.flows{display:flex;margin-top:10px;align-items:center}
.fl{flex:1;display:flex;align-items:center;gap:8px;border:2px solid;border-radius:9px;padding:7px 9px;font-size:14.5px;font-weight:600;background:#fff;min-width:0;line-height:1.2}
.f1{border-color:#3d9a4f}.f2{border-color:#3d7fc0}.f3{border-color:#7a5bb5}.f4{border-color:#e08a2e}.f5{border-color:#1f8f80}.f6{border-color:#5b4b8a}.f7{border-color:#4e4c97}
</style>
<div class="page">
 <div class="banner"><h1>Web-Based Image Classification System</h1><h2>for Predicting Paddy Rice Harvesting Time (PaddyScan)</h2><h3>System Architecture</h3></div>

 <div class="row">
  ${col("c1", "User", `<div class="ic">${icon.user}</div>${ul(["Farmer", "Administrator", "Uses any web browser on a smartphone or computer"])}`)}
  ${arrow}
  ${col("c2", "Web Application", `<div class="sub">React + Vite</div><img class="thumb" src="${img("plate_dashboard.jpg")}" width="190" height="104">${ul(["Login / registration", "Upload or capture a paddy photo", "View result and annotated image", "Harvest advice", "Scan history and CSV export", "Settings and alerts"])}`)}
  ${arrow}
  ${col("c3", "Backend API", `<div class="sub">FastAPI (Python)</div><div class="ic">${icon.server}</div>${ul(["Verifies the Supabase session token", "Receives the uploaded image", "Rejects photos that are too dark or blurry", "Runs the two trained models", "Returns result to the web app"])}`)}
  ${arrow}
  ${col("c4", "Stage 1: Panicle Detection", `<div class="sub">YOLO26 detector trained on Roboflow</div><img class="thumb" src="${img("plate6_annotated.jpg")}" width="150" height="112"><div style="text-align:center"><span class="tag">8,200 images</span><span class="tag">test mAP@50 77.7%</span></div>${ul(["Finds every rice panicle", "Draws a bounding box per panicle", "Detection confidence per box"])}`)}
  ${arrow}
  ${col("c5", "Stage 2: Maturity Classification", `<div class="sub">ViT model trained on Roboflow + OpenCV HSV</div><div class="chip im">Immature &mdash; P(mature) &lt; 0.35</div><div class="chip nm">Nearly Mature &mdash; 0.35 to 0.65</div><div class="chip rh">Ready for Harvest &mdash; P(mature) &gt; 0.65</div>${ul(["Model labels the whole photo and gives the confidence", "HSV colour analysis labels each panicle box", "HSV-only fallback if the model is unavailable"])}`)}
  ${arrow}
  ${col("c6", "Harvest Recommendation", `<div class="ic">${icon.advice}</div>${ul(["Field-level maturity and confidence from the maturity model", "Immature: wait 2&ndash;3 weeks", "Nearly Mature: harvest in 7&ndash;10 days", "Ready: harvest in 1&ndash;2 days", "Colour-coded annotated image"])}`)}
  ${arrow}
  ${col("c7", "Database &amp; Storage", `<div class="sub">Supabase</div><div class="ic">${icon.db}</div>${ul(["Auth: farmer and admin accounts", "PostgreSQL: scans, results, profiles", "Storage: uploaded and annotated images", "History, reports, admin dashboard"])}`)}
 </div>

 <div class="section">
  <span class="stitle">Model Development</span>
  <div class="steps">
   ${step(1, "s1", "Dataset Preparation", ul(["Public datasets forked into the team&rsquo;s Roboflow workspace", "Detection: Tasnuva + EWURicedataset, 8,200 boxed images", "Maturity: Kelompok Genius 3, 1,054 images (Immature / Mature)"]))}
   ${arrow}
   ${step(2, "s2", "Preprocessing &amp; Augmentation", ul(["Auto-orient; resize to 640&times;640 (detection) and 224&times;224 (maturity)", "Random augmentation every epoch (flip, rotate, brightness, blur)", "No hue changes for maturity: colour is the signal"]))}
   ${arrow}
   ${step(3, "s3", "Model Training on Roboflow", ul(["YOLO26 Nano panicle detector, 156 epochs", "ViT-Base maturity classifier, 36 epochs", "Both hosted on the Roboflow inference API"]))}
   ${arrow}
   ${step(4, "s4", "Independent Testing", ul(["233 photos not used in training", "Ready-to-harvest accuracy: 66.5% (HSV only) &rarr; 94.8% (trained model)", "Detector test mAP@50: 77.7%"]))}
   ${arrow}
   ${step(5, "s5", "System Evaluation", ul(["Functional testing on field images", "ISO/IEC 25010 survey, 100 respondents", "Overall weighted mean 4.39 (Excellent)"]))}
  </div>
 </div>

 <div class="section">
  <span class="stitle">End-to-End Workflow</span>
  <div class="flows">
   ${flow("f1", mini("#3d9a4f"), "Capture or upload paddy image")}${arrow}
   ${flow("f2", mini("#3d7fc0"), "Send to FastAPI backend")}${arrow}
   ${flow("f3", mini("#7a5bb5"), "Detect panicles (YOLO26)")}${arrow}
   ${flow("f4", mini("#e08a2e"), "Classify maturity (ViT + HSV)")}${arrow}
   ${flow("f5", mini("#1f8f80"), "Show result, advice and annotated image")}${arrow}
   ${flow("f7", mini("#4e4c97"), "Save scan to Supabase")}
  </div>
 </div>
</div>`;

shoot("fig4_architecture", { w: 1636, h: 1130, html });
