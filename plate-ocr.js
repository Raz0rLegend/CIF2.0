'use strict';
/* CIF 2.0 — Lecture de plaque sur photo (OCR Tesseract, dans le téléphone)
   La photo n'est jamais envoyée : la lecture se fait dans l'appli. Le moteur (≈ 7 Mo) est
   téléchargé une seule fois puis gardé hors ligne ; ses fichiers sont vérifiés (SHA-256). */
(function(){
const V = '5.1.1';
const LIBS = {
  tjs:    {h:'a8e29918d098b2b06e1012bdaeffb4aec0445c5d5654709023e0bd1f442a80e8', u:[`https://cdn.jsdelivr.net/npm/tesseract.js@${V}/dist/tesseract.min.js`, `https://unpkg.com/tesseract.js@${V}/dist/tesseract.min.js`]},
  worker: {h:'aca1229639fc9907d86f96e825955a2b7c5716d17f3bc3acd71f9c7ab66181fc', u:[`https://cdn.jsdelivr.net/npm/tesseract.js@${V}/dist/worker.min.js`, `https://unpkg.com/tesseract.js@${V}/dist/worker.min.js`]},
  coreS:  {h:'ce20eda9533cbed1e6c2b4276fbae1e0adc61b6754b5513084be601787b457cf', u:[`https://cdn.jsdelivr.net/npm/tesseract.js-core@${V}/tesseract-core-simd-lstm.wasm.js`, `https://unpkg.com/tesseract.js-core@${V}/tesseract-core-simd-lstm.wasm.js`]},
  core:   {h:'8f04aa0cc81e7bde33f80e92fa01a7a665f0b4884d098acf5de9c7104a11dfaa', u:[`https://cdn.jsdelivr.net/npm/tesseract.js-core@${V}/tesseract-core-lstm.wasm.js`, `https://unpkg.com/tesseract.js-core@${V}/tesseract-core-lstm.wasm.js`]}
};
const LANG = 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int';
const SIMD = (()=>{ try { return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11])); } catch { return false; } })();
const hex = b => [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function fetchLib(l){
  for (const u of l.u) { try { const r = await fetch(u, {cache:'no-cache'}); if (!r.ok) continue; const t = await r.text(); if (hex(await crypto.subtle.digest('SHA-256', te.encode(t))) === l.h) return t; } catch {} }
  throw new Error('lib');
}
const blobURL = t => URL.createObjectURL(new Blob([t], {type:'text/javascript'}));
let workerP = null;
async function getWorker(progress){
  return workerP ||= (async ()=>{
    const need = ['tjs','worker', SIMD ? 'coreS' : 'core'];
    let c = await dbGet('meta','ocrlib').catch(()=>null) || {}, changed = false;
    for (const [i,k] of need.entries()) if (!c[k]) { progress(`Téléchargement du module de lecture (${i+1}/4)…`); c[k] = await fetchLib(LIBS[k]); changed = true; }
    if (changed) await dbPut('meta', c, 'ocrlib');
    if (!window.Tesseract) await new Promise((res,rej)=>{ const s = document.createElement('script'); s.src = blobURL(c.tjs); s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    progress('Préparation de la lecture (4/4)…');
    const w = await Tesseract.createWorker('eng', 1, {
      workerPath: blobURL(c.worker), workerBlobURL: false,
      corePath: blobURL(c[need[2]]) + '#.js',            // le « .js » final indique un fichier précis au moteur
      langPath: LANG, cacheMethod: 'write', gzip: true
    });
    await w.setParameters({ tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-', preserve_interword_spaces: '1' });
    return w;
  })().catch(e=>{ workerP = null; throw e; });
}
async function stopWorker(){ const p = workerP; workerP = null; if (p) try { (await p).terminate(); } catch {} }

/* ---------- Image : recadrage + niveaux de gris + contraste ---------- */
function prep(img, r, targetW){
  r = r || {x:0, y:0, w:img.naturalWidth, h:img.naturalHeight};
  const s = Math.min(targetW / r.w, 3), c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(r.w*s)); c.height = Math.max(1, Math.round(r.h*s));
  const g = c.getContext('2d', {willReadFrequently:true}); g.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data, hist = new Uint32Array(256);
  for (let i=0; i<p.length; i+=4) { const y = (p[i]*299 + p[i+1]*587 + p[i+2]*114) / 1000 | 0; p[i] = y; hist[y]++; }
  const n = p.length/4; let lo = 0, hi = 255, acc = 0;
  while (lo < 255 && (acc += hist[lo]) < n*0.02) lo++; acc = 0;
  while (hi > 0 && (acc += hist[hi]) < n*0.02) hi--;
  const k = 255 / Math.max(1, hi - lo);
  for (let i=0; i<p.length; i+=4) { const v = Math.max(0, Math.min(255, (p[i]-lo)*k)); p[i] = p[i+1] = p[i+2] = v; }
  g.putImageData(d, 0, 0); return c;
}

/* ---------- Choix des candidats selon le pays ---------- */
const VALID = {
  F: v => /^[A-Z]{2}-\d{3}-[A-Z]{2}$/.test(v) || /^\d{1,4} [A-Z]{1,3} (\d{2}|2A|2B|97\d)$/.test(v),
  I: v => /^[A-Z]{2} \d{3} [A-Z]{2}$/.test(v),
  MC: v => /^[A-Z0-9]{2,4}$/.test(v) && /\d/.test(v)
};
function candidates(datas, pays){
  const out = new Map();
  const add = (raw, conf) => {
    const v = formatPlate(raw, pays); if (!v || v.replace(/[^A-Z0-9]/g,'').length < 2) return;
    const ok = (VALID[pays] || (x => /\d/.test(x) && /^[A-Z0-9 -]{4,12}$/.test(x)))(v);
    const score = (ok ? 100 : 0) + conf + (pays === 'MC' && v.length === 4 ? 5 : 0);
    if (!out.has(v) || out.get(v).score < score) out.set(v, {v, ok, score});
  };
  for (const data of [].concat(datas)) {
  add(String(data.text||'').replace(/\n+/g,' '), data.confidence || 0);
  for (const line of (data.lines || [])) {
    const ws = (line.words || []).filter(w => (w.text||'').trim());
    for (let i=0; i<ws.length; i++) for (let j=i; j<Math.min(ws.length, i+4); j++) {
      const part = ws.slice(i, j+1);
      add(part.map(w=>w.text).join(' '), part.reduce((a,w)=>a+w.confidence, 0) / part.length);
    }
    add(line.text || '', line.confidence || 0);
  }
  }
  const all = [...out.values()].sort((a,b)=>b.score-a.score);
  const good = all.filter(c=>c.ok);
  return (good.length ? good : all).slice(0, 4);
}

/* ---------- Interface ---------- */
const CAM = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
const BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>';
const sheet = document.createElement('div'); sheet.id = 'ocrSheet'; sheet.className = 'sheet hidden';
sheet.innerHTML = `<div class="top"><button class="ib" data-close aria-label="Retour">${BACK}</button><h2>Lire la plaque</h2></div>
  <div class="body">
    <p style="color:var(--muted);font-size:13px;margin:10px 0">Encadre la plaque avec le doigt pour une lecture plus sûre, puis touche « Lire ».</p>
    <div id="ocrWrap" style="position:relative;touch-action:none;border-radius:12px;overflow:hidden;background:#000">
      <canvas id="ocrView" style="display:block;width:100%"></canvas>
      <div id="ocrSel" style="position:absolute;border:3px solid #ffd54a;border-radius:6px;box-shadow:0 0 0 2000px rgba(0,0,0,.35);display:none;pointer-events:none"></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:12px">
      <button class="btn sec" id="ocrRetake" style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px">${CAM} Reprendre</button>
      <button class="btn" id="ocrRead" style="flex:1">Lire</button>
    </div>
    <p id="ocrStatus" style="text-align:center;color:var(--muted);font-size:14px;margin:14px 0 6px"></p>
    <div id="ocrRes" style="display:flex;flex-direction:column;gap:8px"></div>
  </div>`;
document.body.appendChild(sheet);
const fileIn = Object.assign(document.createElement('input'), {type:'file', accept:'image/*'}); fileIn.setAttribute('capture','environment'); fileIn.hidden = true; document.body.appendChild(fileIn);
const view = sheet.querySelector('#ocrView'), selBox = sheet.querySelector('#ocrSel'), wrap = sheet.querySelector('#ocrWrap');
const status = t => sheet.querySelector('#ocrStatus').textContent = t;
let TARGET = null, IMG = null, SEL = null, busy = false;

function close(){ sheet.classList.add('hidden'); sheet.querySelector('#ocrRes').innerHTML = ''; IMG && URL.revokeObjectURL(IMG.src); IMG = null; SEL = null; }
sheet.querySelector('[data-close]').onclick = close;
sheet.querySelector('#ocrRetake').onclick = ()=>fileIn.click();
function start(inp){ TARGET = inp; fileIn.value = ''; fileIn.click(); }
fileIn.onchange = async ()=>{
  const f = fileIn.files[0]; if (!f) return;
  const img = new Image(); img.src = URL.createObjectURL(f);
  try { await img.decode(); } catch { return toast('Photo illisible'); }
  if (IMG) URL.revokeObjectURL(IMG.src);
  IMG = img; SEL = null; selBox.style.display = 'none';
  const s = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
  view.width = Math.round(img.naturalWidth*s); view.height = Math.round(img.naturalHeight*s);
  view.getContext('2d').drawImage(img, 0, 0, view.width, view.height);
  sheet.querySelector('#ocrRes').innerHTML = '';
  sheet.classList.remove('hidden'); sheet.querySelector('.body').scrollTop = 0;
  read();
};

/* Sélection au doigt */
let p0 = null;
const pt = e => { const r = wrap.getBoundingClientRect(); return {x: Math.max(0, Math.min(r.width, e.clientX - r.left)), y: Math.max(0, Math.min(r.height, e.clientY - r.top)), W: r.width, H: r.height}; };
wrap.addEventListener('pointerdown', e=>{ if (!IMG) return; p0 = pt(e); wrap.setPointerCapture(e.pointerId); });
wrap.addEventListener('pointermove', e=>{
  if (!p0) return; const p = pt(e);
  const x = Math.min(p0.x, p.x), y = Math.min(p0.y, p.y), w = Math.abs(p.x - p0.x), h = Math.abs(p.y - p0.y);
  Object.assign(selBox.style, {display: w > 12 && h > 8 ? 'block' : 'none', left: x+'px', top: y+'px', width: w+'px', height: h+'px'});
  SEL = w > 12 && h > 8 ? {x: x/p.W, y: y/p.H, w: w/p.W, h: h/p.H} : null;
});
wrap.addEventListener('pointerup', ()=>{ p0 = null; if (SEL) read(); });
sheet.querySelector('#ocrRead').onclick = ()=>read();

async function read(){
  if (!IMG || busy) return; busy = true;
  const res = sheet.querySelector('#ocrRes'); res.innerHTML = '';
  try {
    const w = await getWorker(status);
    status('Lecture en cours…');
    const W = IMG.naturalWidth, H = IMG.naturalHeight;
    const r = SEL ? {x: SEL.x*W, y: SEL.y*H, w: SEL.w*W, h: SEL.h*H} : null;
    const pays = TARGET?.closest('.veh')?.querySelector('[data-k=pays]')?.value || 'F';
    const canvas = prep(IMG, r, r ? 900 : 1600), datas = [];
    let list = [];
    for (const psm of (r ? ['7','8','13'] : ['11','6'])) {        // plusieurs modes de lecture, arrêt dès qu'une plaque valide sort
      await w.setParameters({ tessedit_pageseg_mode: psm });
      datas.push((await w.recognize(canvas)).data);
      list = candidates(datas, pays);
      if (list[0]?.ok) break;
    }
    if (!list.length) { status(r ? 'Rien lu dans le cadre. Recadre plus large ou reprends la photo.' : 'Aucune plaque trouvée. Encadre-la avec le doigt.'); return; }
    status(list[0].ok ? 'Touche la bonne plaque :' : 'Lecture incertaine — vérifie ou encadre la plaque :');
    res.innerHTML = list.map(c=>`<button type="button" data-v="${esc(c.v)}" style="padding:14px;border-radius:12px;border:1px solid ${c.ok?'#3ccf4e':'var(--line)'};background:var(--panel);color:inherit;font-size:22px;font-weight:800;letter-spacing:.08em">${esc(c.v)}</button>`).join('');
  } catch (e) {
    status(e && e.message === 'lib' ? 'Connexion nécessaire une seule fois pour installer le module de lecture.' : 'Lecture impossible : ' + (e?.message || e));
  } finally { busy = false; }
}
sheet.querySelector('#ocrRes').addEventListener('click', e=>{
  const b = e.target.closest('[data-v]'); if (!b || !TARGET) return;
  TARGET.value = b.dataset.v; plateTidy(TARGET); TARGET.dispatchEvent(new Event('input', {bubbles:true}));
  close(); toast('Plaque insérée');
});

/* Bouton 📷 dans chaque ligne « Plaque » du formulaire */
function addButtons(){
  document.querySelectorAll('#vehicles .platerow').forEach(row=>{
    if (row.querySelector('.ocrBtn')) return;
    row.insertAdjacentHTML('beforeend', `<button type="button" class="ocrBtn" aria-label="Lire la plaque en photo" style="flex:0 0 50px;border:0;border-left:2px solid #d8d8d8;background:#e9eef8;color:#1f4fbf;display:flex;align-items:center;justify-content:center;padding:0">${CAM}</button>`);
  });
}
new MutationObserver(addButtons).observe($('#vehicles'), {childList:true, subtree:true});
$('#vehicles').addEventListener('click', e=>{ const b = e.target.closest('.ocrBtn'); if (b) start(b.closest('.platerow').querySelector('[data-k=plaque]')); });
addButtons();

/* Verrouillage : on ferme et on libère le moteur */
new MutationObserver(()=>{ if (!$('#lock').classList.contains('hidden')) { close(); stopWorker(); } }).observe($('#lock'), {attributes:true, attributeFilter:['class']});
window.PLATE_OCR = {start, candidates, getWorker, prep};
})();
