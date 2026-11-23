'use strict';
/* CIF 2.0 — v2.0.3 : plaque.js, lecture des plaques d'immatriculation et cadre commun à toutes les pièces.
   v2.0.4 : cadre et lecture adaptés aux plaques 2 roues (véhicule 2RM), plaques encadrées mieux lues.
   Chargé après outils.js (utilise sa visée, window.cifVisor). */
/* ===== cadre pièce commun ===== */
try {
/* Un seul cadre pour toutes les pièces (carte, permis, titre de séjour, page photo du passeport) :
   ratio 1,5, entre la carte (1,59) et le passeport (1,42), les deux remplissent le cadre. */
(()=>{
  const btn = document.getElementById('mrzBtn'), inp = document.getElementById('mrzFile');
  if (!window.cifVisor || !btn || !inp || !navigator.mediaDevices?.getUserMedia) return;
  const FMT = {piece:{label:'Pièce d\'identité', ratio:1.5, hint:'Carte, permis, titre de séjour ou page photo du passeport : la pièce remplit le cadre'}};
  window.cifVisorFormats = FMT;
  const feed = f => { try { const dt = new DataTransfer(); dt.items.add(f); inp.files = dt.files; inp.dispatchEvent(new Event('change', {bubbles:true})); } catch { toast('Lecture impossible : utilise l\'appareil photo de l\'iPhone'); } };
  const pick = capture => { if (capture) inp.setAttribute('capture', 'environment'); else inp.removeAttribute('capture'); inp.click(); setTimeout(()=>window.cifScanSync?.(), 1000); };
  btn.onclick = async ()=>{
    const r = await window.cifVisor(FMT, {key:'cifVisorPiece', library:()=>pick(false), native:()=>pick(true)});
    if (r instanceof File) feed(r);
  };
})();
} catch (e) { console.error('[CIF] cadre pièce', e); setTimeout(()=>{ throw e; }); }
/* ===== plaque ===== */
try {
/* CIF 2.0 — v2.0.3 : lecture des plaques d'immatriculation en photo.
   Bouton appareil photo à droite de chaque champ Plaque : visée avec un cadre au format plaque (long et étroit),
   lecture sur le téléphone (même moteur que les pièces), plusieurs lectures comparées, puis mise au format du pays
   (SIV AB-123-CD, ancien 123 ABC 06, Monaco, Italie…). Mode développeur : photothèque dans la visée.
   La photo n'est ni gardée ni envoyée. */
(()=>{
  if (!window.cifVisor) return;
  /* v2.0.4 : deux cadres, choisis selon le type du véhicule ; 2RM : plaque moto, plus petite et sur deux lignes (210 × 130) */
  const FMT = {plaque:{label:'Plaque', ratio:520/110, hint:'La plaque remplit le cadre, de face si possible. Lampe la nuit.'}};
  const FMT2 = {moto:{label:'Plaque 2 roues', ratio:210/130, hint:'Plaque moto ou scooter : elle remplit le cadre, de face si possible. Lampe la nuit.'}};
  /* Italie 2 roues (AB 12345) : sans ce cas, la mise au format voiture transformait les 2 derniers chiffres en lettres */
  const fp0 = formatPlate;
  formatPlate = function(raw, pays){ if (pays === 'I') { const c = String(raw||'').toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/^I(?=[A-Z]{2}\d{5}$)/, ''); if (/^[A-Z]{2}\d{5}$/.test(c)) return c.slice(0,2) + ' ' + c.slice(2); } return fp0.apply(this, arguments); };
  const is2R = box => box.querySelector('input[name^="vt"]:checked')?.value === '2RM';
  const CAM = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
  document.head.insertAdjacentHTML('beforeend', `<style>
.platerow .pcam{flex:0 0 48px;border:0;border-left:2px solid #d8d8d8;border-radius:0;background:#e9e9ec;color:#1f4fbf;display:flex;align-items:center;justify-content:center;padding:0}
.platerow .pcam:active{background:#d4d4da}
.platerow .pcam.busy{opacity:.5;pointer-events:none}
</style>`);
  document.body.insertAdjacentHTML('beforeend', '<input type="file" id="plateFile" accept="image/*" hidden>');
  const file = document.getElementById('plateFile');
  let target = null, W = null;
  /* Moteur de lecture : le même que pour les pièces, téléchargé une seule fois puis gardé sur le téléphone (aucune photo envoyée) */
  const blobURL = d => URL.createObjectURL(new Blob([d], {type:'text/javascript'}));
  async function engine(){
    let lib = await dbGet('meta','mrzlib').catch(()=>null), fra = await dbGet('meta','ocrfra').catch(()=>null);
    /* jamais scanné de pièce sur ce téléphone : téléchargement unique, rangé au même endroit que pour les pièces */
    const get = async (urls, bin) => { for (const u of urls) { try { const r = await fetch(u); if (r.ok) return bin ? await r.arrayBuffer() : await r.text(); } catch {} } throw new Error('offline'); };
    const J = 'https://cdn.jsdelivr.net/npm/', U = 'https://unpkg.com/', T = 'tesseract.js@5.1.1/dist/', C = 'tesseract.js-core@5.1.1/tesseract-core-lstm.wasm.js', FR = '@tesseract.js-data/fra@1.0.0/4.0.0_best_int/fra.traineddata.gz';
    if (!lib || lib.v !== 1) {
      toast('Premier usage : téléchargement de la lecture (≈ 6 Mo)…');
      lib = {v:1, tess:await get([J+T+'tesseract.min.js', U+T+'tesseract.min.js']), worker:await get([J+T+'worker.min.js', U+T+'worker.min.js']), core:await get([J+C, U+C]),
        lang:await get(['https://cdn.jsdelivr.net/gh/DoubangoTelecom/tesseractMRZ@master/tessdata_fast/mrz.traineddata', 'https://raw.githubusercontent.com/DoubangoTelecom/tesseractMRZ/master/tessdata_fast/mrz.traineddata'], true)};
      await dbPut('meta', lib, 'mrzlib').catch(()=>{});
    }
    if (!fra) { fra = await get([J+FR, U+FR], true); await dbPut('meta', fra, 'ocrfra').catch(()=>{}); }
    if (!window.Tesseract) await new Promise((res,rej)=>{ const sc = document.createElement('script'); sc.src = blobURL(lib.tess); sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); });
    await new Promise((res,rej)=>{ const rq = indexedDB.open('keyval-store'); rq.onupgradeneeded = ()=>rq.result.createObjectStore('keyval'); rq.onerror = ()=>rej(rq.error);
      rq.onsuccess = ()=>{ const d = rq.result, tx = d.transaction('keyval','readwrite'); tx.objectStore('keyval').put(new Uint8Array(fra), './fra.traineddata'); tx.oncomplete = ()=>{ d.close(); res(); }; tx.onerror = ()=>{ d.close(); rej(tx.error); }; }; });
    return Tesseract.createWorker('fra', 1, {workerPath:blobURL(lib.worker), corePath:blobURL(lib.core) + '#core.js', workerBlobURL:false, cacheMethod:'readOnly', gzip:false, langPath:'.'});
  }

  /* ----- image ----- */
  async function load(f){
    const url = URL.createObjectURL(f);
    try { return await new Promise((res,rej)=>{ const i = new Image(); i.onload = ()=>res(i); i.onerror = rej; i.src = url; }); }
    finally { setTimeout(()=>URL.revokeObjectURL(url), 1000); }
  }
  const dims = c => [c.naturalWidth || c.width, c.naturalHeight || c.height];
  /* mode 'max' : canal le plus clair (les bandes bleues F / I disparaissent), 'lum' : gris, 'bin' : noir et blanc */
  function prep(img, mode, H, clr){
    const [iw, ih] = dims(img), s = Math.min(3, H / ih, 2400 / iw);
    const c = document.createElement('canvas'); c.width = Math.round(iw * s); c.height = Math.round(ih * s);
    const g = c.getContext('2d', {willReadFrequently:true}); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, c.width, c.height);
    const im = g.getImageData(0, 0, c.width, c.height), d = im.data, n = d.length / 4, h = new Uint32Array(256);
    const px = mode === 'lum' ? i => d[i]*.3 + d[i+1]*.59 + d[i+2]*.11 | 0 : i => Math.max(d[i], d[i+1], d[i+2]);
    for (let i = 0; i < d.length; i += 4) h[px(i)]++;
    const pct = q => { let a = 0; for (let v = 0; v < 256; v++) { a += h[v]; if (a >= n*q) return v; } return 255; };
    const lo = pct(.03), hi = Math.max(lo + 1, pct(.95)), mid = (lo + hi) / 2;
    for (let i = 0; i < d.length; i += 4) { let v = (px(i) - lo) * 255 / (hi - lo); if (mode === 'bin') v = px(i) < mid ? 0 : 255; d[i] = d[i+1] = d[i+2] = Math.max(0, Math.min(255, v)); }
    /* clr (seuil 128 ou 200) : le cadre sombre autour de la plaque (bordure, carrosserie) est blanchi depuis les bords de l'image ;
       sans ça, le moteur prend souvent la plaque encadrée pour une image et ne lit rien */
    if (clr) {
      const w = c.width, h = c.height, dk = i => d[i*4] < clr, seen = new Uint8Array(w*h), q = [];
      const push = i => { if (!seen[i] && dk(i)) { seen[i] = 1; q.push(i); } };
      for (let x = 0; x < w; x++) { push(x); push((h-1)*w + x); } for (let y = 0; y < h; y++) { push(y*w); push(y*w + w-1); }
      while (q.length) { const i = q.pop(), x = i % w; d[i*4] = d[i*4+1] = d[i*4+2] = 255; if (x > 0) push(i-1); if (x < w-1) push(i+1); if (i >= w) push(i-w); if (i < w*(h-1)) push(i+w); }
    }
    g.putImageData(im, 0, 0); return c;
  }
  function cut(img, [x, y, w, h]){ const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); c.getContext('2d').drawImage(img, x, y, w, h, 0, 0, c.width, c.height); return c; }
  /* Recherche de la plaque dans une photo entière : zone claire, au format plaque, pleine de traits verticaux (les caractères).
     On garde la plus grande zone presque aussi « dense » que la meilleure. Renvoie jusqu'à 2 zones (coordonnées de l'image). */
  function locate(img){
    const [iw, ih] = dims(img), s = Math.min(1, 640 / iw), w = Math.round(iw * s), h = Math.round(ih * s);
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', {willReadFrequently:true}); g.drawImage(img, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data, mx = new Float32Array(w*h);
    for (let i = 0; i < w*h; i++) mx[i] = Math.max(d[i*4], d[i*4+1], d[i*4+2]);
    const W1 = w + 1, E = new Float64Array(W1*(h+1)), B = new Float64Array(W1*(h+1));
    for (let y = 0; y < h; y++) { let re = 0, rb = 0; for (let x = 0; x < w; x++) { const i = y*w + x, e = x > 0 && x < w-1 && Math.abs(mx[i+1] - mx[i-1]) > 60 ? 1 : 0; re += e; rb += mx[i]; E[(y+1)*W1 + x+1] = E[y*W1 + x+1] + re; B[(y+1)*W1 + x+1] = B[y*W1 + x+1] + rb; } }
    const S = (M, y, x, hh, ww) => M[(y+hh)*W1 + x+ww] - M[y*W1 + x+ww] - M[(y+hh)*W1 + x] + M[y*W1 + x];
    const all = []; let best = 0;
    for (let hh = 10; hh < h*.5; hh += 3) for (const ratio of [4.7, 3.1]) {
      const ww = Math.round(hh * ratio); if (ww >= w) continue; const ar = hh*ww;
      for (let y = 0; y + hh < h; y += 2) for (let x = 0; x + ww < w; x += 3) {
        const v = S(E, y, x, hh, ww) / ar * (S(B, y, x, hh, ww) / ar / 255) ** 2; if (v > best * .5) all.push([v, x, y, ww, hh]); if (v > best) best = v;
      }
    }
    const good = all.filter(o=>o[0] >= best * .55).sort((a,b)=>b[3]*b[4] - a[3]*a[4]), out = [];
    for (const [, x, y, ww, hh] of good) {
      if (out.some(o=>!(x > o[0] + o[2] || x + ww < o[0] || y > o[1] + o[3] || y + hh < o[1]))) continue;
      out.push([x, y, ww, hh]); if (out.length === 2) break;
    }
    /* marge autour de la zone, retour aux dimensions de la photo */
    return out.map(([x, y, ww, hh])=>{ const X = Math.max(0, (x - ww*.06) / s), Y = Math.max(0, (y - hh*.3) / s); return [X, Y, Math.min(iw - X, ww*1.12 / s), Math.min(ih - Y, hh*1.6 / s)]; });
  }

  /* ----- texte → plaque ----- */
  const L2 = {'0':'O','1':'I','2':'Z','4':'A','5':'S','6':'G','8':'B'}, D2 = {O:'0',Q:'0',D:'0',U:'0',I:'1',L:'1',J:'1',Z:'2',S:'5',G:'6',B:'8',T:'7',A:'4'};
  function fix(raw, mask){ let n = 0; const o = [...raw].map((c,i)=>{ if (mask[i] === 'L' && /\d/.test(c)) { n++; return L2[c] || c; } if (mask[i] === '9' && /[A-Z]/.test(c)) { n++; return D2[c] || c; } return c; }).join(''); return {o, n}; }
  function cands(text, pays, moto){
    const out = [], add = (v, sc) => out.push([v, sc]);
    const ls = text.toUpperCase().split(/\n+/).filter(l=>l.trim());
    /* plaque 2 roues : les deux lignes mises bout à bout ; elles comptent un peu moins qu'une ligne seule */
    for (const line of moto ? [ls.join(' '), ...ls.slice(0, -1).map((l, i)=>l + ' ' + ls[i+1])] : ls) {
      const sp = line.replace(/[^A-Z0-9]+/g, ' ').trim(), c = sp.replace(/ /g, ''); if (!c) continue;
      /* SIV (France) / Italie : 2 lettres, 3 chiffres, 2 lettres */
      for (let i = 0; i + 7 <= c.length; i++) {
        const {o, n} = fix(c.slice(i, i+7), 'LL999LL');
        if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(o) && n <= 2) add(o, 10 - 4*n - (c.length > 9 ? 1 : 0));
      }
      /* ancien format français : 123 ABC 06 */
      const fni = pays !== 'MC' && !(moto && pays === 'I') && /(?:^| )(\d{1,4}) ?([A-Z]{1,3}) ?(\d{2}|2A|2B|97\d)(?= |$)/.exec(sp);
      if (fni) add(`${fni[1]} ${fni[2]} ${fni[3]}`, 7);
      /* Monaco : 4 caractères (parfois précédés de MC) */
      if (pays === 'MC') for (const t of sp.split(' ')) { const x = t.replace(/^MC(?=.{3,4}$)/, ''); if (/^[A-Z0-9]{3,4}$/.test(x) && /\d/.test(x)) add(x, x.length === 4 ? 6 : 4); }
      /* Italie 2 roues : 2 lettres, 5 chiffres (AB 12345) */
      if (moto && pays === 'I') for (let i = 0; i + 7 <= c.length; i++) { const {o, n} = fix(c.slice(i, i+7), 'LL99999'); if (/^[A-Z]{2}\d{5}$/.test(o) && n <= 2) add(o.slice(0,2) + ' ' + o.slice(2), 10 - 3*n); }
      /* autres pays : la ligne entière, si elle a la tête d'une plaque */
      if (!/^(F|I|MC)$/.test(pays) && c.length >= 4 && c.length <= 10 && /\d/.test(c) && /[A-Z]/.test(c)) add(sp, 3);
    }
    return out;
  }
  function vote(texts, pays, moto){
    const S = new Map();
    for (const t of texts) { const seen = new Set(); for (const [v, sc] of cands(t, pays, moto)) { if (seen.has(v)) continue; seen.add(v); S.set(v, (S.get(v) || 0) + sc); } }
    let best = null, bs = 0; for (const [v, sc] of S) if (sc > bs) { best = v; bs = sc; }
    return best && {v:best, score:bs};
  }
  async function read(f, pays, moto){
    W ||= await engine();
    await W.setParameters({tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ', preserve_interword_spaces:'1'});
    const img = await load(f), [iw, ih] = dims(img), texts = [];
    const ocr = async (c, psm) => { await W.setParameters({tessedit_pageseg_mode:psm}); texts.push((await W.recognize(c)).data.text || ''); };
    const sure = () => { const r = vote(texts, pays, moto); return texts.length >= 2 && r && r.score >= 18; };
    /* lecture d'une ligne, plusieurs traitements d'image ; arrêt dès que deux lectures concordent */
    const line = async src => { for (const [m, psm, clr] of [['max','7'],['lum','7'],['bin','7'],['max','6'],['lum','7',128],['max','7',200]]) { await ocr(prep(src, m, 200, clr), psm); if (sure()) return true; } };
    /* photo recadrée par la visée (format plaque) : lecture directe ; sinon (photothèque, plaque petite) : recherche de la plaque */
    /* plaque 2 roues (cadre moto) : lecture d'un bloc de deux lignes */
    const block = async src => { for (const [m, psm, clr] of [['max','6',128],['max','6',200],['lum','6',128],['lum','6',200],['max','6'],['lum','11',200]]) { await ocr(prep(src, m, 200, clr), psm); if (sure()) return true; } };
    const done = moto ? await block(img) : iw / ih > 2.4 && await line(img);
    if (!done && !moto && !vote(texts, pays, moto)) for (const z of locate(img)) if (await line(cut(img, z))) break;
    if (!vote(texts, pays, moto)) { await ocr(prep(img, 'max', iw / ih > 2.4 ? 300 : 1400), '11'); await ocr(prep(img, 'max', iw / ih > 2.4 ? 300 : 1400), '3'); }
    window.cifPlateDebug = texts;   /* mode test : lectures brutes, consultables depuis la console */
    return vote(texts, pays, moto);
  }

  async function scan(f, btn){
    const box = btn.closest('.veh'), inp = box.querySelector('[data-k=plaque]'), sel = box.querySelector('[data-k=pays]');
    btn.classList.add('busy'); toast('Lecture de la plaque…');
    try {
      const r = await read(f, sel.value, is2R(box));
      if (!r) return toast('Plaque non lue : rapproche-toi, de face, ou saisis-la');
      /* 7 caractères AB123CD avec Monaco choisi : c'est une plaque française */
      if (sel.value === 'MC' && /^[A-Z]{2}\d{3}[A-Z]{2}$/.test(r.v)) { sel.value = 'F'; sel.dispatchEvent(new Event('change', {bubbles:true})); }
      inp.value = r.v; plateTidy(inp);
      inp.style.outline = '2px solid #f39c34'; inp.style.outlineOffset = '-2px'; inp.dataset.chk = '1';
      if (typeof draftSoon === "function") draftSoon();
      toast(`Plaque lue : ${inp.value} — vérifie`);
    } catch (e) { console.error('[CIF] plaque', e); toast(e?.message === 'offline' ? 'Premier usage : il faut du réseau pour télécharger la lecture' : 'Lecture impossible'); }
    finally { btn.classList.remove('busy'); }
  }
  window.cifPlateRead = read;
  file.addEventListener('change', ()=>{ const f = file.files[0], b = target; file.value = ''; if (f && b) scan(f, b); });
  const pick = (b, capture) => { target = b; if (capture) file.setAttribute('capture', 'environment'); else file.removeAttribute('capture'); file.click(); };

  document.addEventListener('click', async e=>{
    const b = e.target.closest('.pcam'); if (!b) return;
    if (!navigator.mediaDevices?.getUserMedia) return pick(b, true);
    const r = await window.cifVisor(is2R(b.closest('.veh')) ? FMT2 : FMT, {key:'cifVisorPlaque', library:()=>pick(b, false), native:()=>pick(b, true)});
    if (r instanceof File) scan(r, b);
  });
  /* bouton ajouté à chaque champ Plaque */
  const addBtns = () => document.querySelectorAll('#vehicles .platerow').forEach(row=>{ if (!row.querySelector('.pcam')) row.insertAdjacentHTML('beforeend', `<button type="button" class="pcam" aria-label="Photographier la plaque">${CAM}</button>`); });
  const vs = document.getElementById('vehicles');
  if (vs) new MutationObserver(addBtns).observe(vs, {childList:true, subtree:true});
  addBtns();
})();
} catch (e) { console.error('[CIF] plaque', e); setTimeout(()=>{ throw e; }); }
