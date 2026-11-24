'use strict';
/* CIF 2.0 — v2.0.3 : plaque.js, lecture des plaques d'immatriculation et cadre commun à toutes les pièces.
   v2.0.4 : cadre et lecture adaptés aux plaques 2 roues (véhicule 2RM), plaques encadrées mieux lues.
   v2.0.5 / 2.0.6 : plus de texte sous les cadres (pièces, plaques).
   v2.0.12 : lecture en direct dans la visée des plaques : la caméra se ferme seule dès que la plaque est lue.
   v2.0.10 / 2.0.11 : plaque repérée par ses bandes bleues (redressée si penchée, lecture de la seule zone des caractères) ; M/H et Y/V départagés par la forme de la lettre ; pays reconnu par la lettre de la bande bleue (F, I, D…).
   Chargé après outils.js (utilise sa visée, window.cifVisor). */
/* ===== cadre pièce commun ===== */
try {
/* Un seul cadre pour toutes les pièces (carte, permis, titre de séjour, page photo du passeport) :
   ratio 1,5, entre la carte (1,59) et le passeport (1,42), les deux remplissent le cadre. */
(()=>{
  const btn = document.getElementById('mrzBtn'), inp = document.getElementById('mrzFile');
  if (!window.cifVisor || !btn || !inp || !navigator.mediaDevices?.getUserMedia) return;
  const FMT = {piece:{label:'Pièce d\'identité', ratio:1.5, hint:''}};   /* v2.0.5 : pas de texte sous le cadre */
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
  const FMT = {plaque:{label:'Plaque', ratio:520/110, hint:''}};
  const FMT2 = {moto:{label:'Plaque 2 roues', ratio:210/130, hint:''}};
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
    if (f instanceof HTMLCanvasElement) return f;   /* image de la caméra en direct */
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
  function rotate(img, a){
    const [iw, ih] = dims(img), c = document.createElement('canvas'), cs = Math.abs(Math.cos(a)), sn = Math.abs(Math.sin(a));
    c.width = Math.round(iw * cs + ih * sn); c.height = Math.round(iw * sn + ih * cs);
    const g = c.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, c.width, c.height); g.translate(c.width / 2, c.height / 2); g.rotate(a); g.imageSmoothingQuality = 'high'; g.drawImage(img, -iw / 2, -ih / 2); return c;
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
  /* ----- lettres qui se ressemblent : M/H, Y/V -----
     (et W, lu parfois à la place de V ou M). Après la lecture, chaque caractère est découpé sur l'image (taches d'encre de la hauteur des caractères, de gauche à
     droite, ligne par ligne pour les 2 roues) et sa forme est mesurée :
     • M : le creux entre les deux jambages se referme en descendant (les diagonales) ; H : il reste ouvert jusqu'à la barre ;
     • V : se rétrécit jusqu'en bas en pointe ; Y : garde une tige de largeur constante dans le bas.
     Réglé sur 9 polices (nettes, floues, étirées). La lettre n'est changée que si plusieurs traitements de l'image l'indiquent. */
  function glyphs(c, moto){
    const w = c.width, h = c.height, d = c.getContext('2d', {willReadFrequently:true}).getImageData(0, 0, w, h).data, L = new Uint8Array(w*h);
    const hist = new Uint32Array(256); for (let i = 0; i < w*h; i++) { L[i] = d[i*4]; hist[L[i]]++; }
    const pct = q => { let a = 0; for (let v = 0; v < 256; v++) { a += hist[v]; if (a >= w*h*q) return v; } return 255; };
    const t = (pct(.05) + pct(.95)) / 2, lab = new Int32Array(w*h), comps = [];
    for (let i = 0; i < w*h; i++) {
      if (L[i] >= t || lab[i]) continue;
      const id = comps.length + 1, st = [i], px = []; lab[i] = id; let x0 = w, x1 = 0, y0 = h, y1 = 0;
      while (st.length) { const j = st.pop(), x = j % w, y = (j / w) | 0; px.push(j); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        for (const k of [x > 0 ? j-1 : -1, x < w-1 ? j+1 : -1, y > 0 ? j-w : -1, y < h-1 ? j+w : -1]) if (k >= 0 && !lab[k] && L[k] < t) { lab[k] = id; st.push(k); } }
      comps.push({id, x0, x1, y0, y1, px});
    }
    let ch = comps.filter(o=>o.x0 > 0 && o.y0 > 0 && o.x1 < w-1 && o.y1 < h-1 && o.y1 - o.y0 > h * (moto ? .12 : .2) && o.px.length > 40);
    const hs = ch.map(o=>o.y1 - o.y0).sort((a,b)=>a-b), mh = hs[hs.length >> 1] || 0;
    ch = ch.filter(o=>{ const hh = o.y1 - o.y0; return hh > mh * .75 && hh < mh * 1.25 && o.x1 - o.x0 < mh * 1.4; });
    /* ordre de lecture : par ligne (centres verticaux éloignés de plus d'une demi-hauteur), puis de gauche à droite */
    ch.sort((a,b)=>(a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2);
    const lines = []; for (const o of ch) { const cy = (o.y0 + o.y1) / 2, l = lines.find(l=>Math.abs(l.cy - cy) < mh * .5); if (l) l.o.push(o); else lines.push({cy, o:[o]}); }
    return lines.flatMap(l=>l.o.sort((a,b)=>a.x0 - b.x0)).map(o=>{ const ww = o.x1 - o.x0 + 1, hh = o.y1 - o.y0 + 1, m = new Uint8Array(ww*hh); for (const j of o.px) m[((j / w | 0) - o.y0) * ww + (j % w - o.x0)] = 1; return {m, w:ww, h:hh}; });
  }
  function shape({m, w, h}){
    if (w < 5 || h < 10) return null;
    const ink = (x, y) => m[y*w + x], row = r => Math.min(h - 1, Math.floor(h * r));
    const gap = r => { const y = row(r), c0 = w >> 1; if (ink(c0, y)) return 0; let a = c0, z = c0; while (a > 0 && !ink(a-1, y)) a--; while (z < w-1 && !ink(z+1, y)) z++; return (z - a + 1) / w; };
    const span = r => { const y = row(r); let a = -1, z = -1; for (let x = 0; x < w; x++) if (ink(x, y)) { if (a < 0) a = x; z = x; } return a < 0 ? 0 : (z - a + 1) / w; };
    const mid = r => { const y = row(r); for (let x = Math.floor(w * .44); x <= Math.ceil(w * .56); x++) if (ink(x, y)) return true; return false; };
    return {mh: gap(.30) / Math.max(.01, Math.max(gap(.08), gap(.12))), vy: span(.93) / Math.max(.01, span(.62)), w: mid(.30) && !mid(.93), foot: span(.93)};
  }
  /* W : pointe du milieu en haut, rien au milieu en bas ; M/H : deux jambages jusqu'en bas ; V/Y : étroit en bas.
     Seules les confusions courantes sont corrigées. */
  const SWAP = {H:'M', M:'HW', V:'YW', Y:'V', W:'VM'};
  const judge = (ch, sh) => {
    if (!sh) return null;
    const g = sh.w && sh.foot > .5 && sh.foot < .82 ? 'W' : sh.foot >= .85 ? (sh.mh < .78 ? 'M' : sh.mh > .88 ? 'H' : null) : (sh.vy < .72 ? 'V' : sh.vy > .8 ? 'Y' : null);
    return g && (g === ch || SWAP[ch].includes(g)) ? g : null;
  };
  function refine(v, img, moto){
    const pos = [...v].map((ch, i)=>[ch, i]).filter(([ch])=>/[A-Z0-9]/.test(ch)), comp = pos.map(([ch])=>ch);
    const want = comp.map((ch, k)=>'HMVYW'.includes(ch) ? k : -1).filter(k=>k >= 0); if (!want.length) return v;
    const votes = want.map(()=>({}));
    for (const [mode, clr] of [['lum',128],['max',200],['bin',128]]) {
      const G = glyphs(prep(img, mode, moto ? 260 : 200, clr), moto); if (G.length !== comp.length) continue;
      want.forEach((k, j)=>{ const g = judge(comp[k], shape(G[k])); if (g) votes[j][g] = (votes[j][g]||0) + 1; });
    }
    window.cifPlateVotes = votes;
    const out = [...v];
    want.forEach((k, j)=>{ const e = Object.entries(votes[j]).sort((a,b)=>b[1]-a[1])[0]; const tot = Object.values(votes[j]).reduce((a,b)=>a+b, 0); if (e && e[0] !== comp[k] && e[1] >= 2 && e[1] / tot >= .67) out[pos[k][1]] = e[0]; });
    return out.join('');
  }

  /* ----- pays : lettre blanche de la bande bleue (F, I, D, E, B, NL…) à gauche de la plaque ----- */
  /* Repère de la plaque : les bandes bleues européennes (à gauche, et à droite pour F et I : département, province).
     Tache bleue haute et étroite, suivie d'une zone claire (le fond de la plaque) ; la plaque fait 4,7 fois la hauteur
     de la bande (520 × 110), une plaque 2 roues 1,6 fois (210 × 130). Renvoie la zone des caractères, entre les bandes,
     et la bande gauche, en coordonnées de la photo. */
  function findPlate(img, moto){
    const [iw, ih] = dims(img), s = Math.min(1, 900 / Math.max(iw, ih)), w = Math.round(iw * s), h = Math.round(ih * s);
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', {willReadFrequently:true}); g.drawImage(img, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data, B = new Uint8Array(w*h);
    /* seuils relatifs à la luminosité de la photo : la bande bleue et le fond clair restent repérables la nuit */
    const hist = new Uint32Array(256); for (let j = 0; j < d.length; j += 16) hist[Math.max(d[j], d[j+1], d[j+2])]++;
    let P90 = 255; { const tot = d.length / 16; let a = 0; for (let v = 0; v < 256; v++) { a += hist[v]; if (a >= tot * .9) { P90 = Math.max(60, v); break; } } }
    for (let i = 0, j = 0; i < w*h; i++, j += 4) B[i] = d[j+2] > Math.max(40, P90 * .35) && d[j+2] > d[j] * 1.4 + 15 && d[j+2] > d[j+1] * 1.1 + 8 ? 1 : 0;
    const lab = new Int32Array(w*h), bl = [];
    for (let i = 0; i < w*h; i++) {
      if (!B[i] || lab[i]) continue;
      const st = [i]; lab[i] = 1; let n = 0, x0 = w, x1 = 0, y0 = h, y1 = 0;
      while (st.length) { const j = st.pop(), x = j % w, y = (j / w) | 0; n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        for (const k of [x > 0 ? j-1 : -1, x < w-1 ? j+1 : -1, y > 0 ? j-w : -1, y < h-1 ? j+w : -1]) if (k >= 0 && B[k] && !lab[k]) { lab[k] = 1; st.push(k); } }
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      /* bande : pleine, environ deux fois plus haute que large (pas un caractère bleu d'une plaque de Monaco) */
      if (bh >= 12 && bh >= bw * 1.2 && bh <= bw * 4 && n > bw * bh * .45) bl.push({x0, x1, y0, y1, bw, bh, strict: bh >= bw * 1.4 && bh <= bw * 2.7 && n > bw * bh * .6});
    }
    /* part de pixels clairs (fond de plaque) dans une zone : les caractères n'en couvrent qu'une partie */
    const light = (x0, y0, x1, y1) => { let t = 0, n = 0; for (let y = Math.max(0, Math.round(y0)); y <= Math.min(h-1, y1); y++) for (let x = Math.max(0, Math.round(x0)); x <= Math.min(w-1, x1); x++) { const j = (y*w + x)*4; const mx = Math.max(d[j], d[j+1], d[j+2]), mn = Math.min(d[j], d[j+1], d[j+2]); if (mx > P90 * .55 && mx - mn < mx * .35 + 12) t++; n++; } return n ? t / n : 0; };
    let best = null;
    for (const L of bl.filter(b=>b.strict)) {   /* bande droite : critères plus souples (blason, département) */
      const ratio = moto ? 1.62 : 4.73, H = L.bh;
      /* fond de la plaque clair juste à droite de la bande */
      if (light(L.x1 + 1 + H * .03, L.y0 + H * .15, L.x1 + H * .9, L.y1 - H * .15) < .4) continue;
      const Rb = bl.filter(R=>R !== L && R.x0 > L.x1 && Math.abs((R.y0 + R.y1) / 2 - (L.y0 + L.y1) / 2) < H * .5 && Math.abs(R.bh - H) < H * .4 && (R.x1 - L.x0) > H * ratio * .75 && (R.x1 - L.x0) < H * ratio * 1.35).sort((a,b)=>b.bh - a.bh)[0];
      const x1 = Rb ? Rb.x0 - 1 : Math.min(w - 1, Math.round(L.x0 + H * (moto ? ratio : 5.2)));   /* sans bande droite : un peu de marge, la photo réelle est souvent plus longue que la théorie */
      if (x1 - L.x1 < H * (moto ? .8 : 2.5)) continue;
      const score = H * (Rb ? 2 : 1);
      /* inclinaison de la plaque : droite qui joint les centres des deux bandes */
      const angle = Rb ? Math.atan2((Rb.y0 + Rb.y1) / 2 - (L.y0 + L.y1) / 2, (Rb.x0 + Rb.x1) / 2 - (L.x0 + L.x1) / 2) : 0;
      if (!best || score > best.score) best = {score, angle, inner:[L.x1 + 1, L.y0 + H * .04, x1 - L.x1 - 1, H * .92], band:[L.x0, L.y0, L.bw, H]};
    }
    if (!best) return null;
    const sc = v => v.map(n=>n / s);
    return {inner:sc(best.inner), band:sc(best.band), angle:best.angle};
  }
  async function bandCode(img, box){
    const [iw, ih] = dims(img), s = Math.min(1, 900 / iw), w = Math.round(iw * s), h = Math.round(ih * s);
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', {willReadFrequently:true}); g.drawImage(img, 0, 0, w, h);
    let x0, x1, y0, y1;
    if (!box) return null;   /* pas de bande repérée : pas de pays deviné (une plaque de Monaco a des caractères bleus) */
    [x0, y0] = [Math.round(box[0] * s), Math.round(box[1] * s)]; x1 = Math.round((box[0] + box[2]) * s) - 1; y1 = Math.round((box[1] + box[3]) * s) - 1;
    /* moitié basse de la bande (sous les étoiles) : la lettre blanche, recadrée et agrandie, devient noire sur blanc */
    const by = y0 + Math.round((y1 - y0) * .45), bw = x1 - x0 + 1, bh = y1 - by + 1, q = g.getImageData(x0, by, bw, bh).data;
    /* blanc entouré de bleu seulement (pas la carrosserie visible aux coins quand la plaque est de biais) */
    const isB = (x, y) => { const i = (y*bw + x)*4; return q[i+2] > 90 && q[i+2] > q[i] + 45 && q[i+2] > q[i+1] + 15; };
    const rL = [], rR = [], cT = [], cB = [];
    for (let y = 0; y < bh; y++) { rL[y] = bw; rR[y] = -1; for (let x = 0; x < bw; x++) if (isB(x, y)) { if (x < rL[y]) rL[y] = x; rR[y] = x; } }
    for (let x = 0; x < bw; x++) { cT[x] = bh; cB[x] = -1; for (let y = 0; y < bh; y++) if (isB(x, y)) { if (y < cT[x]) cT[x] = y; cB[x] = y; } }
    const wh = (x, y) => { const i = (y*bw + x)*4; return q[i] > 150 && q[i+1] > 150 && q[i+2] > 150 && x > rL[y] && x < rR[y] && y > cT[x] && y < cB[x]; };
    let lx0 = bw, lx1 = -1, ly0 = bh, ly1 = -1;
    const m = Math.round(bw * .14);   /* marges : ni le bord de la plaque, ni le cadre */
    for (let y = 0; y < bh; y++) for (let x = m; x < bw - m; x++) if (wh(x, y)) { if (x < lx0) lx0 = x; if (x > lx1) lx1 = x; if (y < ly0) ly0 = y; if (y > ly1) ly1 = y; }
    if (lx1 < 0 || ly1 - ly0 < 5) return null;
    const lw = lx1 - lx0 + 1, lh = ly1 - ly0 + 1;
    if (lh / lw > 3.2) return 'I';   /* un simple trait vertical : le moteur lit mal une lettre seule aussi fine */
    const S = 80 / lh, o = document.createElement('canvas'); o.width = Math.round(lw * S) + 60; o.height = 140;
    const og = o.getContext('2d'); og.fillStyle = '#fff'; og.fillRect(0, 0, o.width, o.height); og.fillStyle = '#000';
    for (let y = ly0; y <= ly1; y++) for (let x = lx0; x <= lx1; x++) if (wh(x, y)) og.fillRect(30 + (x - lx0) * S, 30 + (y - ly0) * S, Math.ceil(S), Math.ceil(S));
    /* une lettre seule est difficile pour le moteur : plusieurs modes, le premier code de pays connu l'emporte */
    let txt = '';
    for (const psm of lw / lh > 1.3 ? ['8','7'] : ['10','8','7','13']) {
      await W.setParameters({tessedit_pageseg_mode:psm, tessedit_char_whitelist:'ABCDEFGHIJKLMNOPRSTUVZ'});
      txt = ((await W.recognize(o)).data.text || '').toUpperCase().replace(/[^A-Z]/g, '');
      if (BAND[txt]) break;
    }
    await W.setParameters({tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- '});
    return txt.length >= 1 && txt.length <= 3 ? txt : null;
  }
  /* code lu sur la bande → code du menu Pays de la plaque (les mêmes, sauf quelques cas) */
  const BAND = {F:'F', I:'I', D:'D', E:'E', B:'B', NL:'NL', L:'L', P:'P', A:'A', IRL:'IRL', GR:'GR', PL:'PL', CZ:'CZ', SK:'SK', H:'H', SLO:'SLO', HR:'HR', RO:'RO', BG:'BG', LT:'LT', LV:'LV', EST:'EST', FIN:'FIN', S:'S', DK:'DK', M:'M', CY:'CY', CH:'CH', GB:'GB', UK:'GB'};

  async function read(f, pays, moto, quick){
    W ||= await engine();
    await W.setParameters({tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ', preserve_interword_spaces:'1'});
    let img = await load(f); const [iw, ih] = dims(img), texts = [];
    let P = null; try { P = findPlate(img, moto); } catch (e) { console.error('[CIF] plaque', e); }
    /* plaque penchée (plus de 1,5°) : la photo est redressée, puis la plaque repérée à nouveau */
    if (P && Math.abs(P.angle) > .026) { const R0 = rotate(img, -P.angle); try { const P2 = findPlate(R0, moto); if (P2) { img = R0; P = P2; } } catch {} }
    window.cifPlateBox = P;
    let band = null; try { band = await bandCode(img, P && P.band); } catch {}
    window.cifPlateBand = band;
    const opts = new Set([...document.querySelectorAll('#vehicles [data-k=pays] option')].map(o=>o.value));
    const detected = band && BAND[band] && (!opts.size || opts.has(BAND[band])) ? BAND[band] : null;
    if (detected) pays = detected;
    const ocr = async (c, psm) => { await W.setParameters({tessedit_pageseg_mode:psm}); texts.push((await W.recognize(c)).data.text || ''); };
    const sure = () => { const r = vote(texts, pays, moto); return texts.length >= 2 && r && r.score >= 18; };
    /* lecture d'une ligne, plusieurs traitements d'image ; arrêt dès que deux lectures concordent */
    /* en direct (quick) : moins de passes, une nouvelle image arrive aussitôt */
    const line = async src => { for (const [m, psm, clr] of [['max','7'],['lum','7'],['bin','7'],['max','6'],['lum','7',128],['max','7',200]].slice(0, quick ? 3 : 6)) { await ocr(prep(src, m, 200, clr), psm); if (sure()) return true; } };
    /* photo recadrée par la visée (format plaque) : lecture directe ; sinon (photothèque, plaque petite) : recherche de la plaque */
    /* plaque 2 roues (cadre moto) : lecture d'un bloc de deux lignes */
    const block = async src => { for (const [m, psm, clr] of [['max','6',128],['max','6',200],['lum','6',128],['lum','6',200],['max','6'],['lum','11',200]].slice(0, quick ? 3 : 6)) { await ocr(prep(src, m, 200, clr), psm); if (sure()) return true; } };
    /* plaque repérée par ses bandes bleues : lecture de la seule zone des caractères (la plus fiable) */
    const zone = P ? cut(img, P.inner) : null;
    let done = zone ? (moto ? await block(zone) : await line(zone)) : false;
    if (!done) done = moto ? await block(img) : iw / ih > 2.4 && await line(img);
    if (!done && !quick && !moto && !vote(texts, pays, moto)) for (const z of locate(img)) if (await line(cut(img, z))) break;
    if (!quick && !vote(texts, pays, moto)) { await ocr(prep(img, 'max', iw / ih > 2.4 ? 300 : 1400), '11'); await ocr(prep(img, 'max', iw / ih > 2.4 ? 300 : 1400), '3'); }
    window.cifPlateDebug = texts;   /* mode test : lectures brutes, consultables depuis la console */
    const r = vote(texts, pays, moto);
    if (r) { if (zone || moto || iw / ih > 2.4) r.v = refine(r.v, zone || img, moto); r.pays = detected; }
    return r;
  }

  async function scan(f, btn){
    const box = btn.closest('.veh'), sel = box.querySelector('[data-k=pays]');
    btn.classList.add('busy'); toast('Lecture de la plaque…');
    try {
      const r = await read(f, sel.value, is2R(box));
      if (!r) return toast('Plaque non lue : rapproche-toi, de face, ou saisis-la');
      fill(r, btn);
    } catch (e) { console.error('[CIF] plaque', e); toast(e?.message === 'offline' ? 'Premier usage : il faut du réseau pour télécharger la lecture' : 'Lecture impossible'); }
    finally { btn.classList.remove('busy'); }
  }
  function fill(r, btn){
    const box = btn.closest('.veh'), inp = box.querySelector('[data-k=plaque]'), sel = box.querySelector('[data-k=pays]');
    {
      /* pays lu sur la bande bleue : le menu Pays suit */
      if (r.pays && r.pays !== sel.value) { sel.value = r.pays; sel.dispatchEvent(new Event('change', {bubbles:true})); }
      /* 7 caractères AB123CD avec Monaco choisi : c'est une plaque française */
      if (sel.value === 'MC' && /^[A-Z]{2}\d{3}[A-Z]{2}$/.test(r.v)) { sel.value = 'F'; sel.dispatchEvent(new Event('change', {bubbles:true})); }
      inp.value = r.v; plateTidy(inp);
      inp.style.outline = '2px solid #f39c34'; inp.style.outlineOffset = '-2px'; inp.dataset.chk = '1';
      if (typeof draftSoon === "function") draftSoon();
      toast(`Plaque lue : ${inp.value}${r.pays ? ` (${r.pays})` : ''} — vérifie`);
    }
  }
  /* ----- lecture en direct dans la visée -----
     Pendant que la visée est ouverte, l'image du cadre est lue en boucle (lecture allégée). Dès que deux lectures
     concordent (dans la même image ou sur deux images de suite), la plaque est remplie, le téléphone vibre et la
     caméra se ferme. Le déclencheur reste utilisable à tout moment. */
  const sleep = ms => new Promise(r=>setTimeout(r, ms));
  function frameNow(V){
    const video = V.querySelector('video'), frame = V.querySelector('.vf'), W0 = video.videoWidth, H0 = video.videoHeight; if (!W0 || !H0) return null;
    const vr = video.getBoundingClientRect(), s = Math.max(vr.width / W0, vr.height / H0), ox = vr.left + (vr.width - W0*s)/2, oy = vr.top + (vr.height - H0*s)/2;
    const r = frame.getBoundingClientRect(), mx = r.width * .04, my = r.height * .12;
    let x = Math.max(0, (r.left - mx - ox)/s), y = Math.max(0, (r.top - my - oy)/s), w = Math.min(W0 - x, (r.width + 2*mx)/s), h = Math.min(H0 - y, (r.height + 2*my)/s);
    if (w < 20 || h < 10) return null;
    const k = Math.min(1, 1400 / w), c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d').drawImage(video, x, y, w, h, 0, 0, c.width, c.height); return c;
  }
  function live(btn){
    const V = document.getElementById('visor'), box = btn.closest('.veh'), sel = box.querySelector('[data-k=pays]'), moto = is2R(box);
    let stop = false;
    const open = () => V && !V.classList.contains('hidden');
    const done = (async ()=>{
      await sleep(600);   /* aucun texte sous le cadre (choix de Kevin) */
      let last = null;
      while (!stop && open()) {
        const c = frameNow(V); if (!c) { await sleep(250); continue; }
        let r = null; try { r = await read(c, sel.value, moto, true); } catch { await sleep(500); }
        if (stop || !open()) break;
        if (r && (r.score >= 18 || last === r.v)) {
          stop = true; navigator.vibrate?.(80); fill(r, btn);
          V.querySelector('.vx')?.click();   /* referme la caméra */
          return true;
        }
        last = r ? r.v : null;
        await sleep(120);
      }
      return false;
    })();
    return {stop: ()=>{ stop = true; }, done};
  }
  window.cifPlateRead = read;
  file.addEventListener('change', ()=>{ const f = file.files[0], b = target; file.value = ''; if (f && b) scan(f, b); });
  const pick = (b, capture) => { target = b; if (capture) file.setAttribute('capture', 'environment'); else file.removeAttribute('capture'); file.click(); };

  document.addEventListener('click', async e=>{
    const b = e.target.closest('.pcam'); if (!b) return;
    if (!navigator.mediaDevices?.getUserMedia) return pick(b, true);
    let L = null;
    const p = window.cifVisor(is2R(b.closest('.veh')) ? FMT2 : FMT, {key:'cifVisorPlaque', library:()=>pick(b, false), native:()=>pick(b, true)});
    try { W ||= await engine(); L = live(b); } catch {}
    const r = await p;
    if (L) { L.stop(); await L.done; }   /* une lecture en cours se termine avant la photo prise au déclencheur */
    if (r instanceof File) scan(r, b);
  });
  /* bouton ajouté à chaque champ Plaque */
  const addBtns = () => document.querySelectorAll('#vehicles .platerow').forEach(row=>{ if (!row.querySelector('.pcam')) row.insertAdjacentHTML('beforeend', `<button type="button" class="pcam" aria-label="Photographier la plaque">${CAM}</button>`); });
  const vs = document.getElementById('vehicles');
  if (vs) new MutationObserver(addBtns).observe(vs, {childList:true, subtree:true});
  addBtns();
})();
} catch (e) { console.error('[CIF] plaque', e); setTimeout(()=>{ throw e; }); }
