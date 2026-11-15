const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const OUT = path.join(__dirname, "figures");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const base = `
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #fff; font-family: "Times New Roman", Times, serif; color: #111; }
  .wrap { padding: 24px; }
  .box { border: 2px solid #222; border-radius: 6px; padding: 12px 14px; background: #fff; }
  .title { font-weight: bold; text-align: center; font-size: 22px; margin-bottom: 8px; letter-spacing: 1px; }
  ul { margin: 0; padding-left: 20px; font-size: 17px; line-height: 1.35; }
  li { margin-bottom: 5px; }
  .arrow { font-size: 40px; display: flex; align-items: center; justify-content: center; }
  .small { font-size: 16px; text-align: center; line-height: 1.3; }
</style>`;

const figs = {
  fig1_ipo: { w: 1200, h: 640, html: `${base}
<div class="wrap">
 <div style="display:grid;grid-template-columns:1fr 50px 1fr 50px 1fr;gap:0;align-items:stretch;height:470px">
  <div class="box"><div class="title">INPUT</div><ul>
   <li>Identified problems in traditional rice harvest timing</li>
   <li>Farmer needs and requirements (survey of 100 farmers)</li>
   <li>RGB images of rice panicles at different maturity stages</li>
   <li>Rice panicle dataset (5,572 annotated images)</li>
   <li>Software: React, Vite, FastAPI (Python), Supabase, Roboflow, OpenCV</li>
   <li>Hardware: smartphone or computer with camera and web browser</li>
  </ul></div>
  <div class="arrow">&#10148;</div>
  <div class="box"><div class="title">PROCESS</div><ul>
   <li>Collecting and preparing rice crop images</li>
   <li>Designing and training the panicle detection model</li>
   <li>HSV colour analysis for maturity classification</li>
   <li>Integrating the model into the web-based system</li>
   <li>Prototype Model: requirements, design, prototyping, user testing, refinement</li>
   <li>Evaluation using ISO/IEC 25010 (100 respondents)</li>
  </ul></div>
  <div class="arrow">&#10148;</div>
  <div class="box"><div class="title">OUTPUT</div><ul>
   <li>PaddyScan: a functional web-based system that predicts the optimal paddy rice harvest timing</li>
   <li>Per-panicle maturity classification (Immature, Nearly Mature, Ready for Harvest)</li>
   <li>Annotated images and harvest advice</li>
   <li>System evaluation report</li>
  </ul></div>
 </div>
 <div style="position:relative;height:90px;margin:0 8% 0 8%">
  <div style="position:absolute;left:0;right:0;top:10px;height:50px;border:2px solid #222;border-top:none"></div>
  <div style="position:absolute;left:-9px;top:-6px;font-size:22px">&#9650;</div>
  <div style="position:absolute;left:0;right:0;top:62px;text-align:center;font-size:19px;font-weight:bold">FEEDBACK</div>
 </div>
</div>` },

  fig2_prototype: { w: 1100, h: 720, html: `${base}
<div class="wrap" style="position:relative;height:700px">
 ${[
   ["Requirements Gathering", 410, 10],
   ["Design", 780, 170],
   ["Prototyping", 780, 420],
   ["User Input (Testing)", 410, 560],
   ["Refinement", 40, 420],
   ["Engineered Product", 40, 170],
 ].map(([t, x, y]) => `<div class="box" style="position:absolute;left:${x}px;top:${y}px;width:260px;height:90px;display:flex;align-items:center;justify-content:center;font-size:21px;font-weight:bold;text-align:center">${t}</div>`).join("")}
 <svg width="1100" height="700" style="position:absolute;left:0;top:0">
  <defs><marker id="a" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#222"/></marker></defs>
  <path d="M694 55 Q 880 70 910 185" stroke="#222" stroke-width="2.5" fill="none" marker-end="url(#a)"/>
  <path d="M910 285 L 910 430" stroke="#222" stroke-width="2.5" fill="none" marker-end="url(#a)"/>
  <path d="M910 535 Q 880 640 696 625" stroke="#222" stroke-width="2.5" fill="none" marker-end="url(#a)"/>
  <path d="M432 625 Q 200 640 170 535" stroke="#222" stroke-width="2.5" fill="none" marker-end="url(#a)"/>
  <path d="M300 470 Q 600 380 785 470" stroke="#222" stroke-width="2.5" fill="none" stroke-dasharray="8 6" marker-end="url(#a)"/>
  <path d="M170 430 L 170 285" stroke="#222" stroke-width="2.5" fill="none" marker-end="url(#a)"/>
  <text x="545" y="398" font-size="17" text-anchor="middle" font-family="Times New Roman">next iteration</text>
 </svg>
</div>` },

  fig3_pipeline: { w: 1300, h: 330, html: `${base}
<div class="wrap" style="font-family:'Courier New',monospace;display:grid;grid-template-columns:1fr 40px 1fr 40px 1.25fr 40px 1.3fr 40px 1.15fr;align-items:center;height:330px">
 <div class="box small"><b>Field Image</b><br/>Uploaded or captured by the farmer; too dark or blurry photos are rejected</div>
 <div class="arrow">&#10148;</div>
 <div class="box small"><b>Stage 1: Panicle Detection</b><br/>YOLO26 model trained on Roboflow (8,200 images) draws a box around each panicle</div>
 <div class="arrow">&#10148;</div>
 <div class="box small"><b>Stage 2: Maturity Classification</b><br/>ViT model trained on Roboflow (1,054 images) gives the probability that the paddy is mature</div>
 <div class="arrow">&#10148;</div>
 <div class="box small"><b>Labels</b><br/>Field: &lt; 0.35 Immature, 0.35&ndash;0.65 Nearly Mature, &gt; 0.65 Ready for Harvest<br/>Each box: HSV green / golden ratio</div>
 <div class="arrow">&#10148;</div>
 <div class="box small"><b>Field Result</b><br/>Maturity, confidence, harvest advice, and colour-coded annotated image</div>
</div>` },

  fig4_architecture: { w: 1200, h: 620, html: `${base}
<div class="wrap" style="display:grid;grid-template-columns:1fr 60px 1fr 60px 1fr;align-items:center;height:580px">
 <div class="box" style="height:300px"><div class="title">Client Layer</div><ul>
  <li>Web browser on smartphone or computer</li>
  <li>React + Vite single-page application</li>
  <li>Pages: Login, Dashboard, Classify, History, Settings, Admin</li>
 </ul></div>
 <div class="arrow">&#8644;</div>
 <div class="box" style="height:300px"><div class="title">Application Layer</div><ul>
  <li>FastAPI (Python) REST backend</li>
  <li>Token verification of Supabase sessions</li>
  <li>Classifier: panicle detection + HSV analysis (OpenCV)</li>
  <li>Annotated image generation</li>
 </ul></div>
 <div class="arrow">&#8644;</div>
 <div style="display:flex;flex-direction:column;gap:30px">
  <div class="box"><div class="title">Supabase</div><ul>
   <li>Auth (farmer and admin accounts)</li>
   <li>PostgreSQL database (scans, profiles)</li>
   <li>Storage (uploaded and annotated images)</li>
  </ul></div>
  <div class="box"><div class="title">Roboflow</div><ul>
   <li>Serverless inference API for rice panicle detection</li>
  </ul></div>
 </div>
</div>` },
};

function shoot(name, { w, h, html }) {
  const htmlPath = path.join(OUT, `${name}.html`);
  const pngPath = path.join(OUT, `${name}.png`);
  fs.writeFileSync(htmlPath, `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`);
  execFileSync(CHROME, ["--headless", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2",
    `--window-size=${w},${h}`, `--screenshot=${pngPath}`, htmlPath], { stdio: "pipe" });
  console.log("wrote", pngPath);
}

function evalChart(means) {
  const max = 5;
  const bars = means.map(([label, v, desc, overall]) => `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;width:170px">
      <div style="font-size:20px;font-weight:bold;margin-bottom:${desc ? 0 : 6}px">${v.toFixed(2)}</div>
      ${desc ? `<div style="font-size:15px;margin-bottom:6px">${desc}</div>` : ""}
      <div style="width:90px;height:${(v / max) * 360}px;background:${overall ? "#1f4a1f" : "#3d7a3d"};border:1.5px solid #222"></div>
      <div style="font-size:17px;text-align:center;margin-top:8px;height:48px">${label}</div>
    </div>`).join("");
  const ticks = [1, 2, 3, 4, 5].map(t => `<div style="position:absolute;left:0;right:0;bottom:${(t / max) * 360 + 62}px;border-top:1px dashed #bbb"><span style="position:absolute;left:-34px;top:-11px;font-size:16px">${t}.00</span></div>`).join("");
  return { w: 1000, h: 560, html: `${base}
<div class="wrap"><div style="position:relative;margin-left:50px;height:500px;border-left:2px solid #222;border-bottom:2px solid #222;display:flex;justify-content:space-around;align-items:flex-end;padding-bottom:0">
 ${ticks}${bars}
</div></div>` };
}

module.exports = { shoot, evalChart, figs };

if (require.main === module) {
  for (const [name, fig] of Object.entries(figs)) shoot(name, fig);
  const means = JSON.parse(process.argv[2] || "[]");
  if (means.length) shoot("fig5_evaluation", evalChart(means));
}
