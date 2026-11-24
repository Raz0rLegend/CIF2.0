'use strict';
/* CIF 2.0 — v2.0.13 : direct.js, lecture des pièces d'identité en direct dans la visée.
   Pendant que la caméra vise la pièce, l'image du cadre est lue en boucle ; ce qui est compris (nom, prénoms, naissance,
   nationalité, numéro…) s'affiche en surcouche sous le cadre, en vert quand c'est confirmé par deux lectures.
   Dès que la lecture est sûre (bande « <<< » avec ses chiffres de contrôle justes, ou deux lectures identiques du nom
   et de la date de naissance), le téléphone vibre, la caméra se ferme et la fiche est remplie par la lecture habituelle,
   à partir de cette même image. Le déclencheur reste disponible. Rien n'est envoyé ni gardé.
   v2.0.14 : recto puis verso à la suite ; contrôle express par la plaque (bouton bleu au-dessus du « + »). */
try {
(()=>{
  const btn = document.getElementById('mrzBtn'), inp = document.getElementById('mrzFile');
  if (!window.cifVisor || !btn || !inp || !navigator.mediaDevices?.getUserMedia) return;
  /* Fonctions de lecture des pièces : reprises telles quelles de pieces.js (partie « Analyse de la bande » à « Image »),
     pour lire sans rien remplir. Toute amélioration de la lecture des pièces profite donc aussi au direct. */
  let P = null;
  async function lib(){
    if (P) return P;
    const src = await (await fetch(`pieces.js?v=${window.CIF?.version || ''}`)).text();
    const a = src.indexOf('  /* ----- Analyse de la bande ----- */'), b = src.indexOf('  /* ----- Formulaire ----- */');
    if (a < 0 || b < a) throw new Error('lecture');
    P = new Function(`'use strict';\n${src.slice(a, b).replace(/^\s*window\.\w+\s*=.*$/gm, '')}\nreturn {parse, iso2, toCanvas, clean, crop, isRecto, rectoFields, permisFields, versoFields, labelFields, genericFields, paysDoc};`)();
    return P;
  }
  /* moteurs de lecture (les mêmes modèles que pour les pièces, déjà gardés sur le téléphone) */
  let WM = null, WF = null;
  const blobURL = d => URL.createObjectURL(new Blob([d], {type:'text/javascript'}));
  const seed = (data, name) => new Promise((res,rej)=>{ const rq = indexedDB.open('keyval-store'); rq.onupgradeneeded = ()=>rq.result.createObjectStore('keyval'); rq.onerror = ()=>rej(rq.error);
    rq.onsuccess = ()=>{ const d = rq.result, tx = d.transaction('keyval','readwrite'); tx.objectStore('keyval').put(data, `./${name}.traineddata`); tx.oncomplete = ()=>{ d.close(); res(); }; tx.onerror = ()=>{ d.close(); rej(tx.error); }; }; });
  async function engines(){
    if (WM && WF) return;
    let L = await dbGet('meta','mrzlib').catch(()=>null), fra = await dbGet('meta','ocrfra').catch(()=>null);
    /* jamais scanné sur ce téléphone : téléchargement unique, rangé au même endroit que pour la lecture habituelle */
    const get = async (urls, bin) => { for (const u of urls) { try { const r = await fetch(u); if (r.ok) return bin ? await r.arrayBuffer() : await r.text(); } catch {} } throw new Error('offline'); };
    const J = 'https://cdn.jsdelivr.net/npm/', U = 'https://unpkg.com/', T = 'tesseract.js@5.1.1/dist/', C = 'tesseract.js-core@5.1.1/tesseract-core-lstm.wasm.js', FR = '@tesseract.js-data/fra@1.0.0/4.0.0_best_int/fra.traineddata.gz';
    if (!L || L.v !== 1) {
      L = {v:1, tess:await get([J+T+'tesseract.min.js', U+T+'tesseract.min.js']), worker:await get([J+T+'worker.min.js', U+T+'worker.min.js']), core:await get([J+C, U+C]),
        lang:await get(['https://cdn.jsdelivr.net/gh/DoubangoTelecom/tesseractMRZ@master/tessdata_fast/mrz.traineddata', 'https://raw.githubusercontent.com/DoubangoTelecom/tesseractMRZ/master/tessdata_fast/mrz.traineddata'], true)};
      await dbPut('meta', L, 'mrzlib').catch(()=>{});
    }
    if (!fra) { fra = await get([J+FR, U+FR], true); await dbPut('meta', fra, 'ocrfra').catch(()=>{}); }
    if (!window.Tesseract) await new Promise((res,rej)=>{ const sc = document.createElement('script'); sc.src = blobURL(L.tess); sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); });
    const opt = {workerPath:blobURL(L.worker), corePath:blobURL(L.core) + '#core.js', workerBlobURL:false, cacheMethod:'readOnly', gzip:false, langPath:'.'};
    if (!WM) { await seed(new Uint8Array(L.lang), 'mrz'); WM = await Tesseract.createWorker('mrz', 1, opt); await WM.setParameters({tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<', tessedit_pageseg_mode:'6'}); }
    if (!WF) { await seed(new Uint8Array(fra), 'fra'); WF = await Tesseract.createWorker('fra', 1, opt); await WF.setParameters({tessedit_pageseg_mode:'6'}); }
  }
  const FMT = window.cifVisorFormats || {piece:{label:'Pièce d\'identité', ratio:1.5, hint:''}};
  document.head.insertAdjacentHTML('beforeend', `<style>
#visor .vlive{position:absolute;left:50%;transform:translateX(-50%);width:min(92vw,560px);background:rgba(0,0,0,.62);border-radius:12px;padding:6px 12px;font-size:14px;line-height:1.4;color:#fff;pointer-events:none;overflow:hidden}
#visor .vlive:empty{display:none}
#visor .vlive div{display:flex;gap:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#visor .vlive span{color:#bbb;flex:0 0 96px}
#visor .vlive b{font-weight:600;overflow:hidden;text-overflow:ellipsis}
#visor .vlive .ok b{color:#5de07a}
#visor .vlive .ok b::after{content:' ✓'}
</style>`);
  const sleep = ms => new Promise(r=>setTimeout(r, ms));
  const feed = f => { try { const dt = new DataTransfer(); dt.items.add(f); inp.files = dt.files; inp.dispatchEvent(new Event('change', {bubbles:true})); } catch { toast('Lecture impossible : utilise l\'appareil photo de l\'iPhone'); } };
  const pick = capture => { if (capture) inp.setAttribute('capture', 'environment'); else inp.removeAttribute('capture'); inp.click(); };
  const nat = (c, sx) => { const n2 = P.iso2(c) || (/^[A-Z]{2}$/.test(c||'') ? c : ''); let a = n2 && PAYS_ADJ[n2]; if (a && sx === 'F') a = adjFem(a); return a ? a[0].toUpperCase() + a.slice(1) : (c || ''); };
  const KIND = {PS:'Passeport', CNI:'Carte d\'identité', TS:'Titre de séjour', PC:'Permis de conduire'};

  /* image du cadre (mêmes marges que la photo de la visée) */
  function frameNow(V){
    const video = V.querySelector('video'), frame = V.querySelector('.vf'), W0 = video.videoWidth, H0 = video.videoHeight; if (!W0 || !H0) return null;
    const vr = video.getBoundingClientRect(), s = Math.max(vr.width / W0, vr.height / H0), ox = vr.left + (vr.width - W0*s)/2, oy = vr.top + (vr.height - H0*s)/2;
    const r = frame.getBoundingClientRect(), mx = r.width * .04, my = r.height * .06;
    const x = Math.max(0, (r.left - mx - ox)/s), y = Math.max(0, (r.top - my - oy)/s), w = Math.min(W0 - x, (r.width + 2*mx)/s), h = Math.min(H0 - y, (r.height + 2*my)/s);
    if (w < 40 || h < 30) return null;
    const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h);
    c.getContext('2d').drawImage(video, x, y, w, h, 0, 0, c.width, c.height); return c;
  }
  const toFile = c => new Promise(res=>c.toBlob(b=>res(b ? new File([b], 'visee.jpg', {type:'image/jpeg'}) : null), 'image/jpeg', .92));

  /* Lecture « à blanc » : ce que la pièce dit, sans toucher à la fiche */
  async function analyze(file){
    const w = WM, c = await P.toCanvas(file, 1800);
    let r = null;
    for (const part of [c, P.crop(c, .5, 1)]) { const x = P.parse((await w.recognize(part)).data.text || ''); if (x && x.nom && (!r || x.ok)) r = x; if (r && r.ok) break; }
    if (r && r.ok && r.type !== 'PC') return {sure:true, type:r.type, F:{nom:r.nom, prenom:r.prenom, dn:r.dn, sexe:r.sexe, nat:r.nat, num:r.num, exp:r.exp}};
    const fw = WF;
    const t = (await fw.recognize(P.clean(await P.toCanvas(file, 1800, ''), 'max'))).data.text || '';
    const PERMIS = /PERMIS|LICEN[CS]E|F[ÜU]HRER|PATENTE|CONDU[CÇ]|RIJBEWIJS|^\W{0,3}4\s?[abc]\b/im;
    if (P.isRecto(t)) { const R = P.rectoFields(t); return {type:'CNI', F:{nom:R.nom, prenom:R.prenom, dn:R.dn, lieu:R.lieu, sexe:R.sexe, nat:R.nat || (P.paysDoc(t) === 'MC' ? 'MCO' : 'FRA'), num:R.num || R.numJ, exp:R.exp}}; }
    if (PERMIS.test(t) || (r && r.type === 'PC')) { const F = P.permisFields(t); return {type:'PC', F:{nom:F[1] || r?.nom, prenom:F[2] || r?.prenom, dn:F.dn, lieu:F.lieu, num:r?.num || F.num, del:F.del, exp:F.exp}}; }
    const B = P.labelFields(t); if (B.nom && (B.dn || B.prenom)) return {type:'CNI', F:{nom:B.nom, prenom:B.prenom, dn:B.dn, lieu:B.lieu, sexe:B.sexe, nat:B.nat, num:B.num, exp:B.exp}};
    const G = P.genericFields(t); if (G.nat && (G.nom || G.dn)) return {type:'CNI', F:{nom:G.nom, prenom:G.prenom, dn:G.dn, sexe:G.sexe, nat:G.nat, num:G.num, exp:G.exp}};
    const V = P.versoFields(t); if (V.rue || V.cp) return {type:'verso', F:{adr:[V.rue, V.cp, V.ville].filter(Boolean).join(' '), del:V.del, exp:V.exp}};
    if (r && r.nom) return {type:r.type, F:{nom:r.nom, prenom:r.prenom, dn:r.dn, sexe:r.sexe, nat:r.nat, num:r.num, exp:r.exp}};
    return null;
  }
  const ROWS = [['nom','Nom'],['prenom','Prénoms'],['dn','Né(e) le'],['lieu','Lieu'],['sexe','Sexe'],['nat','Nationalité'],['adr','Adresse'],['num','N°'],['del','Délivrée le'],['exp','Expire le']];
  const show = (el, a, prev, sure) => {
    if (!a) { el.innerHTML = ''; return; }
    const v = (k, x) => k === 'nat' ? nat(x, a.F.sexe) : k === 'sexe' ? (x === 'H' ? 'Homme' : x === 'F' ? 'Femme' : x) : x;
    el.innerHTML = `<div><span>Pièce</span><b>${esc(KIND[a.type] || (a.type === 'verso' ? 'Verso' : 'Document'))}</b></div>` +
      ROWS.filter(([k])=>a.F[k]).map(([k, l])=>`<div class="${sure || (prev && prev.F[k] === a.F[k]) ? 'ok' : ''}"><span>${l}</span><b>${esc(v(k, a.F[k]))}</b></div>`).join('');
  };
  /* sûr : bande « <<< » vérifiée, ou mêmes nom, prénoms et date de naissance (verso : même adresse) sur deux images de suite */
  const same = (a, b) => a && b && a.type === b.type && (a.type === 'verso' ? a.F.adr && a.F.adr === b.F.adr : a.F.nom && a.F.nom === b.F.nom && a.F.dn && a.F.dn === b.F.dn && (a.F.prenom || '') === (b.F.prenom || ''));

  function live(){
    const V = document.getElementById('visor'); if (!V) return null;
    let box = V.querySelector('.vlive'); if (!box) { V.insertAdjacentHTML('beforeend', '<div class="vlive"></div>'); box = V.querySelector('.vlive'); }
    /* entre le bas du cadre et le déclencheur, sans le cacher */
    const place = () => { const r = V.querySelector('.vf').getBoundingClientRect(), b = V.querySelector('.vbot')?.getBoundingClientRect(), top = Math.round(r.bottom + 8);
      box.style.top = `${top}px`; box.style.maxHeight = b ? `${Math.max(60, Math.round(b.top - 8 - top))}px` : ''; };
    let stop = false;
    const open = () => !V.classList.contains('hidden');
    const done = (async ()=>{
      await sleep(700); let prev = null;
      while (!stop && open()) {
        const c = frameNow(V); if (!c) { await sleep(300); continue; }
        const f = await toFile(c); let a = null;
        try { a = f && await analyze(f); } catch { await sleep(600); }
        if (stop || !open()) break;
        place(); const ok = a && (a.sure || same(a, prev)); show(box, a, prev, ok);
        if (ok) { stop = true; navigator.vibrate?.(80); await sleep(450); box.innerHTML = ''; V.querySelector('.vx')?.click(); return f; }
        prev = a; await sleep(100);
      }
      box.innerHTML = ''; return null;
    })();
    return {stop: ()=>{ stop = true; }, done};
  }

  /* v2.0.14 : recto puis verso à la suite — quand la lecture demande l'autre face (carte d'identité, titre de séjour),
     la caméra se rouvre seule après « Retourne la pièce ». Une seule fois par pièce ; pas pour le passeport ni le permis. */
  const scanEnd = async () => { for (let i = 0; i < 40 && !btn.disabled; i++) await sleep(100); for (let i = 0; i < 600 && btn.disabled; i++) await sleep(100); };
  async function chain(){
    await scanEnd();
    const t = document.getElementById('mrzInfo')?.textContent || '', type = document.getElementById('f_docType')?.value || '';
    if (!EDIT || /^(PS|PC)$/.test(type) || !/scanne le verso|scanne-le pour confirmer|scanne aussi l'autre face/.test(t)) return;
    toast('Retourne la pièce'); await sleep(1100);
    if (EDIT && document.getElementById('visor')?.classList.contains('hidden') !== false) openPiece(true);
  }
  async function openPiece(other){
    let L = null;
    const F2 = other ? {piece:{...Object.values(FMT)[0], label:'Autre face'}} : FMT;
    const p = window.cifVisor(F2, {key:'cifVisorPiece', library:()=>pick(false), native:()=>pick(true)});
    try { await lib(); await engines(); L = live(); } catch (e) { console.warn('[CIF] direct', e.message); }
    const r = await p;
    let f = null; if (L) { L.stop(); f = await L.done; }
    /* moteurs du direct libérés (mémoire du téléphone) : la lecture habituelle prend le relais */
    try { await WM?.terminate(); await WF?.terminate(); } catch {} WM = WF = null;
    /* photo du déclencheur, sinon image lue en direct : la lecture habituelle remplit la fiche */
    const got = r instanceof File ? r : f;
    if (got) { feed(got); if (!other) chain(); }
    return !!got;
  }
  window.cifPiece = openPiece;
  btn.onclick = ()=>{ openPiece(false); };

  /* v2.0.14 : contrôle express par la plaque (en option, à côté du « + ») : nouvelle fiche, véhicule ajouté,
     caméra plaque ; la plaque lue (alerte « véhicule recherché » comprise), la caméra pièce s'ouvre pour le conducteur. */
  const fab = document.getElementById('fab');
  if (fab) {
    document.head.insertAdjacentHTML('beforeend', `<style>
#expressFab{position:fixed;right:26px;bottom:calc(84px + 74px + env(safe-area-inset-bottom) - var(--gb,0px));width:50px;height:50px;border-radius:50%;background:#1f4fbf;color:#fff;border:0;display:grid;place-items:center;box-shadow:0 6px 18px rgba(0,0,0,.45);z-index:6}
#expressFab svg{width:28px;height:28px}
#expressFab:active{transform:scale(.94)}
#expressFab.hidden{display:none}
</style>`);
    fab.insertAdjacentHTML('afterend', `<button id="expressFab" type="button" aria-label="Contrôle express : commencer par la plaque"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16l1.5-5h11L19 16"/><path d="M3 16h18v3H3z"/><circle cx="7" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/><path d="M8 7h8"/></svg></button>`);
    const xf = document.getElementById('expressFab');
    const sync = () => xf.classList.toggle('hidden', fab.classList.contains('hidden'));
    new MutationObserver(sync).observe(fab, {attributes:true, attributeFilter:['class']}); sync();
    xf.onclick = async ()=>{
      /* contrôle non enregistré en attente : le « + » habituel pose la question, sans caméra automatique */
      if (DRAFT) return fab.click();
      openForm(null);
      document.getElementById('addVeh')?.click();
      const row = document.querySelector('#vehicles .veh:last-child .platerow'); if (!row) return;
      let cam = row.querySelector('.pcam');
      if (!cam) { row.insertAdjacentHTML('beforeend', '<button type="button" class="pcam" aria-label="Photographier la plaque"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></button>'); cam = row.querySelector('.pcam'); }
      cam.click();   /* dans le même toucher : iOS autorise la caméra */
      const V = document.getElementById('visor');
      for (let i = 0; i < 30 && V?.classList.contains('hidden'); i++) await sleep(100);
      while (V && !V.classList.contains('hidden')) await sleep(200);
      const plate = row.querySelector('[data-k=plaque]')?.value;
      if (!EDIT || !plate) return;
      await sleep(500); toast('Conducteur : vise sa pièce'); openPiece(false);
    };
  }
})();
} catch (e) { console.error('[CIF] direct', e); setTimeout(()=>{ throw e; }); }
