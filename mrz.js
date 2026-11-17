'use strict';
/* CIF 2.0 — lecture de la bande MRZ (lignes « <<< ») d'une pièce d'identité ou d'un permis de conduire.
   Tout se passe sur le téléphone : la photo n'est ni envoyée ni conservée.
   Le module de lecture (Tesseract + modèle MRZ, ≈ 5 Mo) est téléchargé une seule fois puis gardé. */
(()=>{
  const SRC = {
    tess:   ['https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js', 'https://unpkg.com/tesseract.js@5.1.1/dist/tesseract.min.js'],
    worker: ['https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js', 'https://unpkg.com/tesseract.js@5.1.1/dist/worker.min.js'],
    core:   ['https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1/tesseract-core-lstm.wasm.js', 'https://unpkg.com/tesseract.js-core@5.1.1/tesseract-core-lstm.wasm.js'],
    lang:   ['https://cdn.jsdelivr.net/gh/DoubangoTelecom/tesseractMRZ@master/tessdata_fast/mrz.traineddata', 'https://raw.githubusercontent.com/DoubangoTelecom/tesseractMRZ/master/tessdata_fast/mrz.traineddata'],
    fra:    ['https://cdn.jsdelivr.net/npm/@tesseract.js-data/fra@1.0.0/4.0.0_best_int/fra.traineddata.gz', 'https://unpkg.com/@tesseract.js-data/fra@1.0.0/4.0.0_best_int/fra.traineddata.gz']
  };
  const LIBV = 1;
  let worker = null, loading = null;
  const status = t => { const el = $('#mrzInfo'); if (el) el.textContent = t; };
  async function grab(urls, bin){
    for (const u of urls) { try { const r = await fetch(u); if (r.ok) return bin ? await r.arrayBuffer() : await r.text(); } catch {} }
    throw new Error('offline');
  }
  const blobURL = (data, type='text/javascript') => URL.createObjectURL(new Blob([data], {type}));
  /* Le modèle de lecture est déposé là où le moteur le cherche (sa propre petite base locale), sans aucun accès réseau */
  const seed = (data, name='mrz') => new Promise((res,rej)=>{
    const rq = indexedDB.open('keyval-store');
    rq.onupgradeneeded = ()=>rq.result.createObjectStore('keyval');
    rq.onerror = ()=>rej(rq.error);
    rq.onsuccess = ()=>{ const d = rq.result, tx = d.transaction('keyval','readwrite'); tx.objectStore('keyval').put(data, `./${name}.traineddata`); tx.oncomplete = ()=>{ d.close(); res(); }; tx.onerror = ()=>{ d.close(); rej(tx.error); }; };
  });
  function getWorker(){
    if (worker) return Promise.resolve(worker);
    return loading ||= (async ()=>{
      let lib = await dbGet('meta','mrzlib').catch(()=>null);
      if (!lib || lib.v !== LIBV) {
        status('Premier usage : téléchargement du module de lecture (≈ 5 Mo)…');
        lib = {v:LIBV, tess:await grab(SRC.tess), worker:await grab(SRC.worker), core:await grab(SRC.core), lang:await grab(SRC.lang, true)};
        await dbPut('meta', lib, 'mrzlib').catch(()=>{});
      }
      if (!window.Tesseract) await new Promise((res,rej)=>{ const sc = document.createElement('script'); sc.src = blobURL(lib.tess); sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); });
      status('Préparation de la lecture…');
      await seed(new Uint8Array(lib.lang));
      const w = await Tesseract.createWorker('mrz', 1, {workerPath:blobURL(lib.worker), corePath:blobURL(lib.core) + '#core.js', workerBlobURL:false, cacheMethod:'readOnly', gzip:false, langPath:'.'});
      await w.setParameters({tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<', tessedit_pageseg_mode:'6'});
      return worker = w;
    })().catch(e=>{ loading = null; throw e; });
  }
  /* Lecture du texte imprimé (champs numérotés du permis) : modèle français, ≈ 0,7 Mo, téléchargé une fois */
  let fraW = null, fraLoading = null;
  function getFra(){
    if (fraW) return Promise.resolve(fraW);
    return fraLoading ||= (async ()=>{
      await getWorker();
      let d = await dbGet('meta','ocrfra').catch(()=>null);
      if (!d) { status('Premier usage : téléchargement de la lecture du permis (≈ 0,7 Mo)…'); d = await grab(SRC.fra, true); await dbPut('meta', d, 'ocrfra').catch(()=>{}); }
      const lib = await dbGet('meta','mrzlib');
      await seed(new Uint8Array(d), 'fra');
      const w = await Tesseract.createWorker('fra', 1, {workerPath:blobURL(lib.worker), corePath:blobURL(lib.core) + '#core.js', workerBlobURL:false, cacheMethod:'readOnly', gzip:false, langPath:'.'});
      await w.setParameters({tessedit_pageseg_mode:'6'});
      return fraW = w;
    })().catch(e=>{ fraLoading = null; throw e; });
  }

  /* ----- Analyse de la bande ----- */
  const DIG = {O:'0',Q:'0',D:'0',I:'1',L:'1',Z:'2',S:'5',G:'6',B:'8',T:'7'}, LET = {'0':'O','1':'I','2':'Z','5':'S','8':'B','6':'G'};
  const dig = s => [...s].map(c=>DIG[c]||c).join(''), alpha = s => [...s].map(c=>LET[c]||c).join('');
  const val = c => c === '<' ? 0 : c >= '0' && c <= '9' ? +c : c.charCodeAt(0) - 55;
  const chk = (s, d) => /^\d$/.test(d) && [...s].reduce((a,c,i)=>a + val(c) * [7,3,1][i%3], 0) % 10 === +d;
  const pad = (s, n) => (s + '<'.repeat(n)).slice(0, n);
  const cap = s => s.toLowerCase().replace(/(^|[\s-])([a-zà-ÿ])/g, (m,a,b)=>a + b.toUpperCase());
  function names(field){
    let f = alpha(field).replace(/[^A-Z<]/g,'').replace(/[<KCL]{4,}$/,'').replace(/<+$/,'');
    const i = f.indexOf('<<'), sur = i < 0 ? f : f.slice(0,i), giv = i < 0 ? '' : f.slice(i+2).replace(/<<.*$/,'');
    return {nom:sur.replace(/</g,' ').trim(), prenom:cap(giv.replace(/</g,' ').trim())};
  }
  function dob(s){ s = dig(s); if (!/^\d{6}$/.test(s)) return ''; const yy = +s.slice(0,2), y = (yy > new Date().getFullYear() % 100 ? 1900 : 2000) + yy; return `${s.slice(4,6)}/${s.slice(2,4)}/${y}`; }
  const sex = c => c === 'M' ? 'H' : c === 'F' ? 'F' : '';
  function parse(text){
    const L = text.split(/\n/).map(l=>l.toUpperCase().replace(/[^A-Z0-9<]/g,'')).filter(l=>l.length >= 26);
    for (let i = 0; i < L.length; i++) {
      const a = L[i], b = L[i+1] || '', c = L[i+2] || '';
      /* Permis de conduire européen (1 ligne de 30 : D1FRA + numéro + … + 8 premières lettres du nom + clé) */
      if (/^[DB0][1<I]FRA/.test(a) && a.length >= 28 && a.length <= 33) {
        /* Le nom suit la dernière date (6 chiffres) ; longueur de la ligne variable selon les permis */
        const m = /(\d{6})([A-Z][A-Z<]*)[0-9A-Z]?$/.exec(a.slice(14)), nf = m ? alpha(m[2]) : alpha(pad(a,30).slice(21,29));
        const nom = nf.split('<')[0], cut = !/</.test(nf) && nom.length >= 8;
        return {kind:'DL', type:'PC', pays:'FRA', nat:'', num:a.slice(5,14).replace(/</g,''), nom, prenom:'', dn:'', sexe:'', cut, ok:a.length === 30 && chk(a.slice(0,29), dig(a[29]))};
      }
      /* Ancienne carte d'identité française (2 × 36) */
      if (/^[I1]DFRA/.test(a) && a.length >= 34 && a.length <= 38 && b.length >= 33 && b.length <= 38) {
        const l1 = pad(a,36), l2 = pad(b,36), txt = f => alpha(f).replace(/[^A-Z<]/g,'').replace(/<+$/,'').replace(/<+/g,' ').trim();
        return {kind:'FR', type:'CNI', pays:'FRA', nat:'FRA', num:dig(l2.slice(0,12)).replace(/</g,''), nom:txt(l1.slice(5,30)), prenom:cap(txt(l2.slice(13,27))), dn:dob(l2.slice(27,33)), sexe:sex(l2[34]), ok:chk(dig(l2.slice(0,12)), dig(l2[12])) && chk(dig(l2.slice(27,33)), dig(l2[33]))};
      }
      /* Passeport (2 × 44) */
      if (a[0] === 'P' && a.length >= 40 && b.length >= 40) {
        const l1 = pad(a,44), l2 = pad(b,44);
        return {kind:'TD3', type:'PS', pays:alpha(l1.slice(2,5)), nat:alpha(l2.slice(10,13)), num:l2.slice(0,9).replace(/</g,''), ...names(l1.slice(5)), dn:dob(l2.slice(13,19)), sexe:sex(l2[20]), ok:chk(l2.slice(0,9), dig(l2[9])) && chk(dig(l2.slice(13,19)), dig(l2[19]))};
      }
      /* Carte d'identité, titre de séjour (3 × 30) */
      if (/^[IAC1]/.test(a) && a.length >= 27 && a.length <= 33 && b.length >= 27 && b.length <= 33 && c.length >= 20) {
        const l1 = pad(a,30), l2 = pad(b,30), t = alpha(l1.slice(0,2));
        return {kind:'TD1', type:/^I[D<]/.test(t) ? 'CNI' : 'TS', pays:alpha(l1.slice(2,5)), nat:alpha(l2.slice(15,18)), num:l1.slice(5,14).replace(/</g,''), ...names(pad(c,30)), dn:dob(l2.slice(0,6)), sexe:sex(l2[7]), ok:chk(l1.slice(5,14), dig(l1[14])) && chk(dig(l2.slice(0,6)), dig(l2[6]))};
      }
      /* Format 2 × 36 */
      if (/^[IACV1]/.test(a) && a.length >= 33 && a.length <= 38 && b.length >= 33 && b.length <= 38) {
        const l1 = pad(a,36), l2 = pad(b,36), t = alpha(l1.slice(0,2));
        return {kind:'TD2', type:/^I[D<]/.test(t) ? 'CNI' : 'TS', pays:alpha(l1.slice(2,5)), nat:alpha(l2.slice(10,13)), num:l2.slice(0,9).replace(/</g,''), ...names(l1.slice(5)), dn:dob(l2.slice(13,19)), sexe:sex(l2[20]), ok:chk(l2.slice(0,9), dig(l2[9])) && chk(dig(l2.slice(13,19)), dig(l2[19]))};
      }
    }
    return null;
  }
  const ISO3 = {FRA:'FR',MCO:'MC',ITA:'IT',DEU:'DE',D:'DE',CHE:'CH',BEL:'BE',NLD:'NL',LUX:'LU',GBR:'GB',ESP:'ES',PRT:'PT',MAR:'MA',DZA:'DZ',TUN:'TN',ROU:'RO',POL:'PL',RUS:'RU',UKR:'UA',USA:'US',SEN:'SN',CIV:'CI',TUR:'TR',AUT:'AT',GRC:'GR',SWE:'SE',NOR:'NO',DNK:'DK',CHN:'CN',JPN:'JP',BRA:'BR',ALB:'AL',BGR:'BG',HRV:'HR',SRB:'RS',MDA:'MD',IRL:'IE',CAN:'CA',AUS:'AU',IND:'IN',LBN:'LB',EGY:'EG',CMR:'CM',MLI:'ML',HUN:'HU',CZE:'CZ',SVK:'SK',SVN:'SI',LTU:'LT',LVA:'LV',EST:'EE',FIN:'FI',ISL:'IS',ISR:'IL',ARG:'AR',COL:'CO',MEX:'MX',GEO:'GE',ARM:'AM',BIH:'BA',MKD:'MK',MNE:'ME',RKS:'XK',AND:'AD',SMR:'SM',LIE:'LI',MLT:'MT',CYP:'CY',QAT:'QA',ARE:'AE',SAU:'SA',ZAF:'ZA',BLR:'BY',AZE:'AZ'};
  const iso2 = c => ISO3[String(c||'').replace(/</g,'')] || '';
  window.mrzParse = parse;

  /* ----- Permis de conduire européen : champs numérotés (directive 2006/126/CE, identiques dans toute l'UE) -----
     1 nom · 2 prénom · 3 date et lieu de naissance · 4a délivrance · 4b expiration · 4c autorité · 5 numéro */
  const DFIX = {O:'0',o:'0',Q:'0',D:'0',I:'1',l:'1','|':'1','!':'1',Z:'2',z:'2',S:'5',B:'8',G:'6',C:'0',c:'0',e:'6'};
  function dateIn(t){
    const m = /([0-9OoQDIl|!ZzSBGCc]{2})\s?[.\/,;:-]?\s?([0-9OoQDIl|!ZzSBGCc]{2})\s?[.\/,;:-]?\s?([0-9OoQDIl|!ZzSBGCce]{4}|[0-9OoQDIl|!ZzSBGCce]{2})(?![0-9])/.exec(t);
    if (!m) return null;
    const f = x => [...x].map(c=>DFIX[c]||c).join(''), dd = +f(m[1]), mm = +f(m[2]); let y = f(m[3]);
    if (!/^\d+$/.test(y) || !(dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12)) return null;
    if (y.length === 2) y = String((+y > new Date().getFullYear() % 100 ? 1900 : 2000) + +y);
    if (+y < 1900 || +y > new Date().getFullYear() + 20) return null;
    return {v:`${String(dd).padStart(2,'0')}/${String(mm).padStart(2,'0')}/${y}`, end:m.index + m[0].length};
  }
  const word = t => t.replace(/[^A-Za-zÀ-ÿ' -]/g,' ').replace(/\s+/g,' ').trim();
  function permisFields(text){
    const F = {};
    for (const raw of text.split(/\n/)) {
      const m = /^[^A-Za-z0-9]{0,4}(4\s?[aAbBcCdD]|[1-5lIz|])\s?[.,:;]?\s+(.+)$/.exec(raw.trim()); if (!m) continue;
      let k = m[1].replace(/\s/g,'').toLowerCase().replace(/^[li|]$/,'1').replace(/^z$/,'2'); const v = m[2].trim();
      if (F[k]) continue;
      if (k === '1' || k === '2') { const w = word(v).split(' ').filter(x=>x.length > 1 || /[A-Z]/.test(x)).join(' '); if (w.replace(/[^A-Za-zÀ-ÿ]/g,'').length >= 2) F[k] = k === '1' ? w.toUpperCase() : cap(w); }
      else if (k === '3') { const d = dateIn(v); if (d) { F.dn = d.v; let r2 = v.slice(d.end).trim(); const pm = /^\(([^)]*)\)?/.exec(r2); r2 = pm ? pm[1] : r2.replace(/\([^)]*\)\s*$/,''); const lieu = word(r2); if (lieu.length >= 2) F.lieu = cap(lieu); } }
      else if (k === '4a') { const d = dateIn(v); if (d) F.del = d.v; }
      else if (k === '4c') { const w = v.replace(/^[^A-Za-zÀ-ÿ0-9]+/,'').trim(); if (w.length >= 3) F.aut = w; }
      else if (k === '5') { const n = v.replace(/[^A-Za-z0-9]/g,'').toUpperCase(); if (n.length >= 5 && n.length <= 16) F.num = n; }
    }
    const lines = text.split(/\n/);
    /* 4c souvent sur la même ligne que 4a ; 4a parfois mal lu (« sa », « Aa », « da ») */
    for (const raw of lines) {
      const c4 = /4\s?[cC]\s?[.,:;]?\s+(.{3,})$/.exec(raw); if (c4 && !F.aut) F.aut = c4[1].replace(/^[^A-Za-zÀ-ÿ0-9]+/,'').trim();
      if (!F.del) { const a4 = /^[^A-Za-z0-9]{0,3}[4AaSsdy]\s?[aàâ]\s?[.,:;]?\s+(.+)$/.exec(raw.trim()); if (a4) { const d = dateIn(a4[1]); if (d) F.del = d.v; } }
    }
    /* Dernier recours : les dates du recto autres que la naissance, la plus ancienne passée = délivrance */
    if (!F.del) {
      const ds = []; const re = /[0-9OoDIl]{2}\s?[.\/,-]\s?[0-9OoDIl]{2}\s?[.\/,-]\s?[0-9OoDIl]{4}/g;
      for (const raw of lines) for (const m of raw.matchAll(re)) { const d = dateIn(m[0]); if (d && d.v !== F.dn) ds.push(d.v); }
      const t = v => { const [d, m, y] = v.split('/'); return new Date(+y, m-1, +d).getTime(); };
      const past = [...new Set(ds)].filter(v => t(v) <= Date.now() && (!F.dn || t(v) > t(F.dn))).sort((a,b)=>t(a)-t(b));
      if (past.length) F.del = past[0];
    }
    return F;
  }
  /* Recto d'une carte d'identité, d'un passeport ou d'un titre de séjour : lieu de naissance (absent de la bande) */
  function lieuFields(text){
    const L = text.split(/\n/).map(x=>x.trim()).filter(Boolean), out = {};
    const clean = t => { const w = word(t.replace(/\([^)]*\)/g,'')).replace(/\b(lieu|de|naissance|place|of|birth|luogo|di|nascita|lugar|nacimiento|geburtsort)\b/gi,'').trim(); return w.length >= 2 ? cap(w) : ''; };
    for (let i = 0; i < L.length; i++) {
      const m = /(lieu\s*de\s*naissance|place\s*of\s*birth|luogo\s*di\s*nascita|lugar\s*de\s*nacimiento|geburtsort)[^A-Za-zÀ-ÿ]*(.*)$/i.exec(L[i]);
      if (m) { let v = clean(m[2].replace(/^.*birth/i,'')); if (!v && L[i+1]) v = clean(L[i+1]); if (v) { out.lieu = v; break; } }
      const o = /[nN][ée]e?\s*\(?e?\)?\s*le\b.*?(?:^|\s)[àa]\s*[:.]?\s+([A-ZÀ-Ý][A-ZÀ-Ý' -]{1,})/.exec(L[i]);
      if (o) { const v = clean(o[1]); if (v) { out.lieu = v; break; } }
    }
    return out;
  }
  window.lieuFields = lieuFields;
  /* Intitulé illisible (trop petit) : on cherche une commune connue parmi les lignes en majuscules, près de « NOM D'USAGE » d'abord */
  async function findLieu(texts){
    const V = merge(texts, lieuFields); if (V.lieu) return V.lieu;
    let C = null; try { C = await loadCities(); } catch {}
    if (!C) return '';
    const set = C._set ||= new Set(C.nk.map(x=>x.trim()));
    const skip = new Set([norm($('#f_nom')?.value), norm($('#f_prenom')?.value), 'france','republique','francaise'].filter(Boolean));
    const isCity = t => { const k = norm(t).replace(/[-'’]/g,' ').replace(/\s+/g,' ').trim(); return k.length >= 3 && !skip.has(k) && set.has(k); };
    for (const t of texts) {
      const L = t.split(/\n/).map(x=>x.trim()).filter(Boolean);
      const u = L.findIndex(x=>/NOM\s*D.?USAGE|ALTERNATE/i.test(x));
      const near = u > 0 ? L.slice(Math.max(0, u-4), u).reverse() : [];
      for (const line of [...near, ...L]) {
        const w = line.replace(/\([^)]*\)/g,'').replace(/[^A-ZÀ-Ý' -]/g,' ').replace(/\s+/g,' ').trim();
        if (w.length >= 3 && isCity(w)) return cap(w);
        for (const part of w.split(' ')) if (part.length >= 4 && isCity(part)) return cap(part);
      }
    }
    return '';
  }
  window.permisFields = permisFields;
  async function readText(file, psms=['6','4']){
    const w = await getFra(); status('Lecture du texte de la pièce…');
    const c = clean(await toCanvas(file, 2400, ''));
    const out = [];
    for (const psm of psms) { await w.setParameters({tessedit_pageseg_mode:psm}); out.push((await w.recognize(c)).data.text || ''); }
    return out;
  }
  const merge = (texts, fn) => { const best = {}; for (const t of texts) { const F = fn(t); for (const k in F) if (!best[k]) best[k] = F[k]; } return best; };

  /* ----- Image ----- */
  async function toCanvas(file, max=2000, filter='grayscale(1) contrast(1.4)'){
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res,rej)=>{ const i = new Image(); i.onload = ()=>res(i); i.onerror = rej; i.src = url; });
      const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth*s); c.height = Math.round(img.naturalHeight*s);
      const g = c.getContext('2d'); if (filter) g.filter = filter; g.drawImage(img, 0, 0, c.width, c.height);
      return c;
    } finally { URL.revokeObjectURL(url); }
  }
  /* Fond rose de sécurité effacé : on garde le canal le plus sombre, contraste étiré, image agrandie si petite */
  function clean(c){
    const k = c.width < 1600 ? 2 : 1, o = document.createElement('canvas'); o.width = c.width*k; o.height = c.height*k;
    const g = o.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, o.width, o.height);
    const im = g.getImageData(0, 0, o.width, o.height), d = im.data, h = new Uint32Array(256), n = d.length/4;
    for (let i = 0; i < d.length; i += 4) h[Math.min(d[i], d[i+1], d[i+2])]++;
    const pct = q => { let a = 0; for (let v = 0; v < 256; v++) { a += h[v]; if (a >= n*q) return v; } return 255; };
    const lo = pct(.02), hi = Math.max(lo + 1, pct(.6));
    for (let i = 0; i < d.length; i += 4) { const v = Math.max(0, Math.min(255, (Math.min(d[i], d[i+1], d[i+2]) - lo) * 255 / (hi - lo))); d[i] = d[i+1] = d[i+2] = v; }
    g.putImageData(im, 0, 0); return o;
  }
  function crop(c, y0, y1){ const o = document.createElement('canvas'); o.width = c.width; o.height = Math.round(c.height*(y1-y0)); o.getContext('2d').drawImage(c, 0, c.height*y0, c.width, o.height, 0, 0, o.width, o.height); return o; }

  /* ----- Formulaire ----- */
  function fill(r){
    const set = (id, v, force) => { const el = $('#'+id); if (el && v && (force || !el.value.trim())) el.value = v; };
    set('f_nom', r.nom, true); set('f_prenom', r.prenom, true); set('f_dateNaissance', r.dn, true);
    if (r.sexe) $('#f_sexe').value = r.sexe;
    const n2 = iso2(r.nat), adj = n2 && PAYS_ADJ[n2];
    if (adj && !/^du /.test(adj)) { const a = adjFem(adj); set('f_nationalite', a[0].toUpperCase() + a.slice(1)); }
    setSeg('docSeg', 'Officiel');
    set('f_docType', r.type, true); set('f_docNumero', r.num, true);
    const p2 = iso2(r.pays); if (p2 && [...$('#f_docPays').options].some(o=>o.value === p2)) $('#f_docPays').value = p2;
    syncSexe(); syncDocPays(); syncAge();
    $('#f_nom').dispatchEvent(new Event('change', {bubbles:true}));
    draftSoon();
  }
  const mark = id => { const el = $('#'+id); if (!el) return; el.style.outline = '2px solid #f39c34'; el.style.outlineOffset = '-1px'; el.dataset.chk = '1'; };
  document.addEventListener('input', e=>{ if (e.target.dataset?.chk) { e.target.style.outline = ''; delete e.target.dataset.chk; } });
  function fillPermis(r, F){
    const got = [];
    const put = (id, v, lbl) => { const el = $('#'+id); if (!el || !v) return; el.value = v; mark(id); got.push(lbl); };
    if (F[1] && (!r.nom || F[1].replace(/\s/g,'').startsWith(r.nom.replace(/\s/g,'')))) { if (!r.nom || F[1].length > r.nom.length) put('f_nom', F[1], 'nom'); }
    put('f_prenom', F[2], 'prénom'); put('f_dateNaissance', F.dn, 'date de naissance');
    if (F.lieu && $('#f_naisVille')) { $('#f_naisVille').value = F.lieu; if (window.naisJoin) naisJoin(); mark('f_naisVille'); got.push('lieu de naissance'); }
    put('f_docDate', F.del, 'date de délivrance'); put('f_docLieu', F.aut, 'autorité');
    if (!r.num && F.num) put('f_docNumero', F.num, 'numéro');
    setSeg('docSeg', 'Officiel'); if (!$('#f_docType').value) $('#f_docType').value = 'PC';
    syncAge(); $('#f_nom').dispatchEvent(new Event('change', {bubbles:true})); draftSoon();
    return got;
  }
  const KIND = {PS:'passeport', CNI:'carte d\'identité', TS:'titre de séjour', PC:'permis de conduire'};
  async function scan(file){
    if (!EDIT) return;
    const btn = $('#mrzBtn'); btn.disabled = true; btn.style.opacity = '.6';
    try {
      const w = await getWorker();
      status('Lecture de la pièce…');
      const c = await toCanvas(file);
      let r = null;
      for (const part of [c, crop(c, .5, 1), crop(c, .25, .8)]) { const {data} = await w.recognize(part), x = parse(data.text || ''); if (x && x.nom && (!r || x.ok)) r = x; if (r && r.ok) break; }
      let texts = [];
      if (!r || r.type === 'PC') {
        try { texts = await readText(file); } catch (e) { if (!r) throw e; }
        const F = merge(texts, permisFields), n = ['1','2','dn'].filter(k=>F[k]).length + (F.num ? 1 : 0);
        if (!r && n < 2) {
          const lieu = await findLieu(texts);
          if (lieu && $('#f_naisVille')) { $('#f_naisVille').value = lieu; if (window.naisJoin) naisJoin(); mark('f_naisVille'); draftSoon(); status(`Recto lu : lieu de naissance « ${lieu} » (à vérifier, en orange)`); toast('Lieu de naissance lu'); return; }
          status('Rien de lisible. Passeport : page photo · carte d\'identité ou titre de séjour : face avec les lignes « <<< » (puis le recto pour le lieu de naissance) · permis : recto. Pièce à plat, nette, sans reflet, cadrée de près.'); return;
        }
        if (r) fill(r);
        const got = fillPermis(r || {}, F);
        status(`${r && r.ok ? '✓ Permis lu (nom et numéro sûrs)' : '⚠ Permis lu sans bande : tout vérifier'}` + (got.length ? ` · à vérifier, en orange : ${got.join(', ')}` : ' · champs du permis illisibles : prénom et date de naissance à saisir'));
        toast('Permis lu : vérifie les champs en orange');
        return;
      }
      fill(r);
      /* Lieu de naissance : sur la même face pour le passeport et l'ancienne carte, sinon au recto (2e scan) */
      let lieu = '';
      /* Verso des cartes récentes (3 lignes) : l'adresse y figure, on ne cherche pas le lieu ici pour ne pas la confondre */
      if (r.kind !== 'TD1') try { texts = await readText(file, ['6']); lieu = merge(texts, lieuFields).lieu || ''; } catch {}
      if (lieu && $('#f_naisVille')) { $('#f_naisVille').value = lieu; if (window.naisJoin) naisJoin(); mark('f_naisVille'); draftSoon(); }
      status(`${r.ok ? '✓ Lu' : '⚠ Lecture incertaine, vérifie les champs'} : ${KIND[r.type] || 'document'} ${r.pays.replace(/</g,'')} — ${r.nom} ${r.prenom}` + (lieu ? ` · lieu de naissance « ${lieu} » à vérifier (orange)` : ' · lieu de naissance absent de cette face : scanne aussi le recto'));
      toast(r.ok ? 'Pièce d\'identité lue' : 'Lecture incertaine : vérifie les champs');
    } catch (e) {
      status(e && e.message === 'offline' ? 'Il faut du réseau la première fois pour télécharger le module de lecture.' : 'Lecture impossible sur cet appareil.');
    } finally { btn.disabled = false; btn.style.opacity = ''; }
  }
  /* Petit bouton appareil photo au bout de la ligne « Nom » */
  const nomInp = $('#f_nom');
  if (!nomInp) return;
  const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;align-items:stretch';
  nomInp.replaceWith(row); row.appendChild(nomInp); nomInp.style.flex = '1'; nomInp.style.minWidth = '0';
  row.insertAdjacentHTML('beforeend', `<button type="button" id="mrzBtn" aria-label="Scanner une pièce d'identité" title="Scanner une pièce d'identité" style="flex:0 0 48px;border-radius:10px;border:1px solid var(--line);background:var(--panel);color:#7fb3ff;display:flex;align-items:center;justify-content:center;padding:0">${ICON.cam.replace('<svg ', '<svg width="22" height="22" ')}</button>`);
  row.insertAdjacentHTML('afterend', `<div id="mrzInfo" style="font-size:13px;color:#9cc0ff;margin-top:6px"></div><input type="file" id="mrzFile" accept="image/*" capture="environment" hidden>`);
  $('#mrzBtn').onclick = ()=>$('#mrzFile').click();
  $('#mrzFile').onchange = e=>{ const f = e.target.files[0]; e.target.value = ''; if (f) scan(f); };
  { const _of = openForm; openForm = function(f, d){ _of(f, d); status(''); document.querySelectorAll('[data-chk]').forEach(el=>{ el.style.outline = ''; delete el.dataset.chk; }); }; }
})();
