'use strict';
/* CIF 2.0 — Partage de fiches entre collègues par QR code
   Écran à écran, sans réseau ni fichier. Les photos ne sont pas transmises.
   Le contenu du QR est compressé puis chiffré (AES-GCM) : illisible hors de l'appli. */
(function(){
/* Bibliothèques QR (open source, MIT / Apache-2.0), téléchargées une seule fois puis gardées
   hors ligne. Leur empreinte SHA-256 est vérifiée : un fichier modifié est refusé. */
const LIBS = [
  {k:'qrgen', g:'qrcode', h:'18ae399f81182bc9de916e9c77b195df20cc58d6f2d55a62b085a299f1bf1780',
   u:['https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js','https://unpkg.com/qrcode-generator@1.4.4/qrcode.js']},
  {k:'jsqr', g:'jsQR', h:'bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859',
   u:['https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js','https://unpkg.com/jsqr@1.4.0/dist/jsQR.js']}
];
const hex = b => [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function fetchLib(l){
  for (const u of l.u) {
    try { const r = await fetch(u, {cache:'no-cache'}); if (!r.ok) continue;
      const t = await r.text(); if (hex(await crypto.subtle.digest('SHA-256', te.encode(t))) === l.h) return t; } catch {}
  }
  throw new Error('lib');
}
let libsP = null;
function ensureLibs(){
  if (window.qrcode && window.jsQR) return Promise.resolve();
  return libsP ||= (async ()=>{
    let c = await dbGet('meta','qrlib').catch(()=>null) || {};
    let changed = false;
    for (const l of LIBS) if (!c[l.k]) { c[l.k] = await fetchLib(l); changed = true; }
    if (changed) await dbPut('meta', c, 'qrlib');
    for (const l of LIBS) if (!window[l.g]) await new Promise((res,rej)=>{
      const s = document.createElement('script'); s.src = URL.createObjectURL(new Blob([c[l.k]], {type:'text/javascript'}));
      s.onload = ()=>{ URL.revokeObjectURL(s.src); res(); }; s.onerror = rej; document.head.appendChild(s);
    });
  })().catch(e=>{ libsP = null; throw e; });
}
const libErr = () => toast('Connexion nécessaire une seule fois pour installer le module QR');

/* ---------- Encodage d'une fiche ---------- */
const MAGIC = [0x43,0x49,0x46,0x31]; // « CIF1 »
const KEYRAW = new Uint8Array([0x5e,0x91,0x2c,0xd4,0x07,0xb8,0x63,0xfa,0x1d,0x8e,0x44,0xc2,0x9b,0x30,0x7f,0xe6,0xa5,0x12,0xdb,0x68,0x3c,0xf1,0x87,0x0e,0x56,0xbd,0x29,0x94,0xe3,0x4a,0x71,0xc8]);
let QKEY = null;
const qkey = async () => QKEY ||= await crypto.subtle.importKey('raw', KEYRAW, {name:'AES-GCM'}, false, ['encrypt','decrypt']);
async function pipe(bytes, stream){ return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
const SKIP = new Set(['photos','status','archivedAt','updatedAt','recu']);
function slim(f){
  const o = {};
  for (const [k,v] of Object.entries(f)) {
    if (SKIP.has(k) || v === '' || v == null || v === false) continue;
    if (k === 'vehicules') { const vs = v.map(x=>Object.fromEntries(Object.entries(x).filter(([,y])=>y))).filter(x=>Object.keys(x).length); if (vs.length) o.vehicules = vs; continue; }
    o[k] = v;
  }
  return o;
}
async function encode(f){
  const z = await pipe(te.encode(JSON.stringify(slim(f))), new CompressionStream('deflate-raw'));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv}, await qkey(), z));
  const out = new Uint8Array(4 + 12 + ct.length); out.set(MAGIC); out.set(iv, 4); out.set(ct, 16);
  return out;
}
async function decode(bytes){
  if (bytes.length < 30 || MAGIC.some((m,i)=>bytes[i]!==m)) return null;
  const pt = await crypto.subtle.decrypt({name:'AES-GCM', iv:bytes.slice(4,16)}, await qkey(), bytes.slice(16));
  return JSON.parse(td.decode(await pipe(new Uint8Array(pt), new DecompressionStream('deflate-raw'))));
}
function qrCanvas(bytes){
  let bin = ''; for (const b of bytes) bin += String.fromCharCode(b);
  let q = null;
  for (const ec of ['M','L']) { try { q = qrcode(0, ec); q.addData(bin, 'Byte'); q.make(); break; } catch { q = null; } }
  if (!q) return null;
  const n = q.getModuleCount(), quiet = 4, cell = Math.max(4, Math.floor(900 / (n + quiet*2)));
  const c = document.createElement('canvas'); c.width = c.height = (n + quiet*2) * cell;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#000';
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect((k+quiet)*cell, (r+quiet)*cell, cell, cell);
  c.style.cssText = 'display:block;width:100%;max-width:420px;margin:0 auto;border-radius:10px;image-rendering:pixelated';
  return c;
}

/* ---------- Interface ---------- */
const BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>';
const QR_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M14 21h3M21 18v3h-3"/></svg>';
function mkSheet(id, title, body){
  const s = document.createElement('div'); s.id = id; s.className = 'sheet hidden';
  s.innerHTML = `<div class="top"><button class="ib" data-close aria-label="Retour">${BACK}</button><h2>${title}</h2></div><div class="body">${body}</div>`;
  document.body.appendChild(s); return s;
}

/* Affichage des QR (envoi) */
const show = mkSheet('qrShow', 'Partager par QR', `
  <p id="qsName" style="text-align:center;font-size:19px;font-weight:700;margin:12px 0 4px"></p>
  <p id="qsSub" style="text-align:center;color:var(--muted);font-size:13px;margin:0 0 14px"></p>
  <div id="qsBox"></div>
  <div id="qsNav" style="display:flex;gap:10px;margin-top:14px"><button class="btn sec" id="qsPrev" style="flex:1">‹ Précédente</button><button class="btn" id="qsNext" style="flex:1">Suivante ›</button></div>
  <p class="hint" style="color:var(--muted);font-size:13px;margin-top:16px;line-height:1.45">Ton collègue ouvre CIF 2.0 › menu › Outils › <b>Scanner une fiche</b> et vise cet écran. Les photos ne sont pas transmises. Monte la luminosité si le scan peine.</p>`);
let LIST = [], IDX = 0, showT = null;
async function renderQR(){
  const f = LIST[IDX]; if (!f) return;
  show.querySelector('#qsName').textContent = ficheName(f);
  show.querySelector('#qsSub').textContent = [f.type||'CI', fmtDT(f.dateHeure), LIST.length > 1 ? `fiche ${IDX+1} / ${LIST.length}` : ''].filter(Boolean).join(' · ');
  const box = show.querySelector('#qsBox'); box.innerHTML = '';
  const c = qrCanvas(await encode(f));
  box.appendChild(c || Object.assign(document.createElement('p'), {textContent:'Fiche trop longue pour un QR code : raccourcis les observations ou envoie-la par Outlook.', style:'color:#ff5a52;text-align:center'}));
  show.querySelector('#qsNav').style.display = LIST.length > 1 ? 'flex' : 'none';
  show.querySelector('#qsPrev').disabled = IDX === 0;
  show.querySelector('#qsNext').disabled = IDX === LIST.length - 1;
  clearTimeout(showT); showT = setTimeout(closeShow, 3*6e4); // le QR ne reste pas affiché indéfiniment
}
function closeShow(){ clearTimeout(showT); show.classList.add('hidden'); show.querySelector('#qsBox').innerHTML = ''; LIST = []; }
async function showFiches(list){
  try { await ensureLibs(); } catch { return libErr(); }
  LIST = list; IDX = 0; show.classList.remove('hidden'); show.querySelector('.body').scrollTop = 0; await renderQR();
}
show.querySelector('[data-close]').onclick = closeShow;
show.querySelector('#qsPrev').onclick = ()=>{ if (IDX > 0) { IDX--; renderQR(); } };
show.querySelector('#qsNext').onclick = ()=>{ if (IDX < LIST.length-1) { IDX++; renderQR(); } };

/* Scanner (réception) */
const scan = mkSheet('qrScan', 'Scanner une fiche', `
  <div style="position:relative;margin-top:10px;border-radius:14px;overflow:hidden;background:#000;aspect-ratio:3/4">
    <video id="qcVideo" playsinline muted autoplay style="width:100%;height:100%;object-fit:cover;display:block"></video>
    <div style="position:absolute;inset:14%;border:3px solid rgba(255,255,255,.75);border-radius:16px;pointer-events:none"></div>
  </div>
  <p id="qcStatus" style="text-align:center;color:var(--muted);font-size:14px;margin:12px 0"></p>
  <div id="qcList"></div>`);
const video = scan.querySelector('#qcVideo'), cv = document.createElement('canvas'), cx = cv.getContext('2d', {willReadFrequently:true});
let stream = null, timer = null, busy = false, seen = new Set(), got = [];
const status = t => scan.querySelector('#qcStatus').textContent = t;
function stopCam(){ clearTimeout(timer); timer = null; if (stream) stream.getTracks().forEach(t=>t.stop()); stream = null; video.srcObject = null; }
async function openScan(){
  try { await ensureLibs(); } catch { return libErr(); }
  seen = new Set(); got = []; scan.querySelector('#qcList').innerHTML = '';
  scan.classList.remove('hidden'); status('Ouverture de la caméra…');
  try {
    stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment', width:{ideal:1280}, height:{ideal:720}}, audio:false});
    video.srcObject = stream; await video.play().catch(()=>{});
    status('Vise le QR code affiché sur le téléphone de ton collègue');
    tick();
  } catch (e) {
    status(e.name === 'NotAllowedError' ? 'Accès à la caméra refusé. Autorise-le dans Réglages iPhone › Safari › Caméra, puis réessaie.' : 'Caméra indisponible : ' + (e.message || e.name));
  }
}
function tick(){
  if (!stream) return;
  timer = setTimeout(async ()=>{
    if (!busy && video.readyState >= 2 && video.videoWidth) {
      const s = Math.min(1, 800 / Math.max(video.videoWidth, video.videoHeight));
      cv.width = Math.round(video.videoWidth * s); cv.height = Math.round(video.videoHeight * s);
      cx.drawImage(video, 0, 0, cv.width, cv.height);
      const img = cx.getImageData(0, 0, cv.width, cv.height);
      const r = jsQR(img.data, img.width, img.height, {inversionAttempts:'dontInvert'});
      if (r && r.binaryData) { busy = true; try { await receive(new Uint8Array(r.binaryData)); } finally { busy = false; } }
    }
    tick();
  }, 140);
}
async function receive(bytes){
  const sig = hex(bytes.slice(4,16)); if (seen.has(sig)) return; seen.add(sig);
  let d; try { d = await decode(bytes); } catch { d = null; }
  if (!d || !d.id) { status('Ce QR code n\'est pas une fiche CIF 2.0'); return; }
  const line = (txt, col) => scan.querySelector('#qcList').insertAdjacentHTML('afterbegin', `<div class="panel" style="padding:10px 12px;margin-top:8px;border-color:${col}"><b>${esc(ficheName(d))}</b> <span style="color:var(--muted)">· ${esc(d.type||'CI')} · ${esc(fmtDT(d.dateHeure))}</span><br><small style="color:${col}">${txt}</small></div>`);
  if (navigator.vibrate) navigator.vibrate(60);
  if (FICHES.some(f=>f.id === d.id)) { line('Déjà présente dans ton appli', '#9a9a9a'); status('Fiche déjà reçue — tu peux scanner la suivante'); return; }
  const f = {...d, status:'pending', photos:[], vehicules:d.vehicules||[], recu:Date.now(), createdAt:d.createdAt||Date.now()};
  await saveFiche(f);
  if (learnFrom(f)) saveLearn().catch(()=>{});
  got.push(f.id);
  line('Ajoutée ✓', '#3ccf4e');
  status(`${got.length} fiche(s) reçue(s) — scanne la suivante ou reviens en arrière`);
  window.render?.();
}
scan.querySelector('[data-close]').onclick = ()=>{ stopCam(); scan.classList.add('hidden'); };
document.addEventListener('visibilitychange', ()=>{ if (document.hidden) { stopCam(); scan.classList.add('hidden'); closeShow(); } });

/* Boutons : Outils (scanner) et feuille de partage (afficher le QR) */
const h = [...document.querySelectorAll('#settings h3')].find(x=>x.textContent==='Outils');
if (h) {
  h.insertAdjacentHTML('afterend', `<button class="btn sec" id="t_scan" style="display:flex;align-items:center;justify-content:center;gap:10px">${QR_ICON}Scanner une fiche (QR)</button>`);
  $('#t_scan').onclick = ()=>{ $('#settings').classList.add('hidden'); openScan(); };
}
const cancel = document.querySelector('#shareSheet [data-sh=cancel]');
if (cancel) cancel.insertAdjacentHTML('beforebegin', `<button data-sh="qr"><b>Partager par QR code</b><small>À un collègue équipé de CIF 2.0, sans les photos</small></button>`);

/* Fermer au verrouillage */
new MutationObserver(()=>{ if (!$('#lock').classList.contains('hidden')) { stopCam(); scan.classList.add('hidden'); closeShow(); } }).observe($('#lock'), {attributes:true, attributeFilter:['class']});

/* Installe le module QR en arrière-plan dès qu'il y a du réseau (aucune donnée envoyée) */
setTimeout(()=>{ if (navigator.onLine) ensureLibs().catch(()=>{}); }, 8000);

window.QRS = {show:showFiches, scan:openScan, encode, decode};
})();
