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
  /* Date d'expiration AAMMJJ (toujours au XXIe siècle) */
  const expd = s => { s = dig(s); return /^\d{6}$/.test(s) && +s.slice(2,4) >= 1 && +s.slice(2,4) <= 12 ? `${s.slice(4,6)}/${s.slice(2,4)}/20${s.slice(0,2)}` : ''; };
  /* Correction par les chiffres de contrôle (v1.2.3) : si un champ ne « tombe » pas juste, on essaie les confusions
     lettre / chiffre du moteur (0/O/D/Q, 1/I/L, 2/Z, 5/S, 6/G, 8/B…) sur UN caractère, et on ne corrige que si une seule
     version est valide (sinon la lecture reste « incertaine », en orange). */
  const AMB = {'0':'OQD','O':'0QD','Q':'0O','D':'0O','1':'IL','I':'1L','L':'1I','2':'Z','Z':'2','5':'S','S':'5','6':'G','G':'6','8':'B','B':'8','7':'T','T':'7','4':'A','A':'4'};
  function fixChk(f, d, digits, ok = ()=>true){
    d = dig(d || ''); if (!/^\d$/.test(d) || chk(f, d)) return f;
    const found = new Set();
    for (let i = 0; i < f.length; i++) for (const a of (AMB[f[i]] || '')) {
      if (digits && !/[0-9]/.test(a)) continue;
      const g = f.slice(0,i) + a + f.slice(i+1); if (chk(g, d) && ok(g)) found.add(g);
    }
    return found.size === 1 ? [...found][0] : f;
  }
  function fixDate(f){ return dig(f); }   /* dates : lettres lues à la place des chiffres seulement */
  function parse(text){
    /* une lettre parasite (bord de la carte) devant la bande est retirée : « IIDFRA… » → « IDFRA… » */
    const head = l => { const i = l.search(/[I1]DFRA|D1FRA|P<[A-Z]{3}|I<[A-Z]{3}|ID[A-Z]{3}[A-Z0-9<]/); return i > 0 && i <= 3 ? l.slice(i) : l; };
    const L = text.split(/\n/).map(l=>head(l.toUpperCase().replace(/[^A-Z0-9<]/g,''))).filter(l=>l.length >= 26);
    for (let i = 0; i < L.length; i++) {
      const a = L[i], b = L[i+1] || '', c = L[i+2] || '';
      /* Permis de conduire européen (1 ligne de 30 : D1FRA + numéro + … + 8 premières lettres du nom + clé) */
      if (/^[DB0][1<I]FRA/.test(a) && a.length >= 28 && a.length <= 33) {
        /* Le nom suit la dernière date (6 chiffres) ; longueur de la ligne variable selon les permis */
        const m = /(\d{6})([A-Z][A-Z<]*)[0-9A-Z]?$/.exec(a.slice(14)), nf = m ? alpha(m[2]) : alpha(pad(a,30).slice(21,29));
        const nom = nf.split('<')[0], cut = !/</.test(nf) && nom.length >= 8;
        return {kind:'DL', type:'PC', pays:'FRA', nat:'', num:a.slice(5,14).replace(/</g,''), nom, prenom:'', dn:'', sexe:'', cut, exp:m ? expd(m[1]) : '', ok:a.length === 30 && chk(a.slice(0,29), dig(a[29]))};
      }
      /* Ancienne carte d'identité française (2 × 36) */
      if (/^[I1]DFRA/.test(a) && a.length >= 34 && a.length <= 38 && b.length >= 33 && b.length <= 38) {
        const l1 = pad(a,36); let l2 = pad(b,36);
        l2 = fixChk(dig(l2.slice(0,12)), l2[12], true) + l2.slice(12,27) + fixDate(l2.slice(27,33), l2[33]) + l2.slice(33);
        const txt = f => alpha(f).replace(/[^A-Z<]/g,'').replace(/<+$/,'').replace(/<+/g,' ').trim();
        return {kind:'FR', type:'CNI', pays:'FRA', nat:'FRA', num:dig(l2.slice(0,12)).replace(/</g,''), nom:txt(l1.slice(5,30)), prenom:cap(txt(l2.slice(13,27))), dn:dob(l2.slice(27,33)), sexe:sex(l2[34]), ok:chk(dig(l2.slice(0,12)), dig(l2[12])) && chk(dig(l2.slice(27,33)), dig(l2[33]))};
      }
      /* Passeport (2 × 44) */
      if (a[0] === 'P' && a.length >= 40 && b.length >= 40) {
        const l1 = pad(a,44); let l2 = pad(b,44);
        l2 = fixChk(l2.slice(0,9), l2[9]) + l2.slice(9,13) + fixDate(l2.slice(13,19), l2[19]) + l2.slice(19,21) + fixDate(l2.slice(21,27), l2[27]) + l2.slice(27);
        return {kind:'TD3', type:'PS', pays:alpha(l1.slice(2,5)), nat:alpha(l2.slice(10,13)), num:l2.slice(0,9).replace(/</g,''), ...names(l1.slice(5)), dn:dob(l2.slice(13,19)), sexe:sex(l2[20]), exp:expd(l2.slice(21,27)), ok:chk(l2.slice(0,9), dig(l2[9])) && chk(dig(l2.slice(13,19)), dig(l2[19]))};
      }
      /* Carte d'identité, titre de séjour (3 × 30) */
      if (/^[IAC1]/.test(a) && a.length >= 27 && a.length <= 33 && b.length >= 27 && b.length <= 33 && c.length >= 20) {
        let l1 = pad(a,30), l2 = pad(b,30); const t = alpha(l1.slice(0,2));
        l1 = l1.slice(0,5) + fixChk(l1.slice(5,14), l1[14]) + l1.slice(14);
        l2 = fixDate(l2.slice(0,6), l2[6]) + l2.slice(6,8) + fixDate(l2.slice(8,14), l2[14]) + l2.slice(14);
        return {kind:'TD1', type:/^I[D<]/.test(t) ? 'CNI' : 'TS', pays:alpha(l1.slice(2,5)), nat:alpha(l2.slice(15,18)), num:l1.slice(5,14).replace(/</g,''), ...names(pad(c,30)), dn:dob(l2.slice(0,6)), sexe:sex(l2[7]), exp:expd(l2.slice(8,14)), ok:chk(l1.slice(5,14), dig(l1[14])) && chk(dig(l2.slice(0,6)), dig(l2[6]))};
      }
      /* Format 2 × 36 */
      if (/^[IACV1]/.test(a) && a.length >= 33 && a.length <= 38 && b.length >= 33 && b.length <= 38) {
        const l1 = pad(a,36), t = alpha(l1.slice(0,2)); let l2 = pad(b,36);
        l2 = fixChk(l2.slice(0,9), l2[9]) + l2.slice(9,13) + fixDate(l2.slice(13,19), l2[19]) + l2.slice(19,21) + fixDate(l2.slice(21,27), l2[27]) + l2.slice(27);
        return {kind:'TD2', type:/^I[D<]/.test(t) ? 'CNI' : 'TS', pays:alpha(l1.slice(2,5)), nat:alpha(l2.slice(10,13)), num:l2.slice(0,9).replace(/</g,''), ...names(l1.slice(5)), dn:dob(l2.slice(13,19)), sexe:sex(l2[20]), exp:expd(l2.slice(21,27)), ok:chk(l2.slice(0,9), dig(l2[9])) && chk(dig(l2.slice(13,19)), dig(l2[19]))};
      }
    }
    return null;
  }
  const ISO3 = {FRA:'FR',MCO:'MC',ITA:'IT',DEU:'DE',D:'DE',CHE:'CH',BEL:'BE',NLD:'NL',LUX:'LU',GBR:'GB',ESP:'ES',PRT:'PT',MAR:'MA',DZA:'DZ',TUN:'TN',ROU:'RO',POL:'PL',RUS:'RU',UKR:'UA',USA:'US',SEN:'SN',CIV:'CI',TUR:'TR',AUT:'AT',GRC:'GR',SWE:'SE',NOR:'NO',DNK:'DK',CHN:'CN',JPN:'JP',BRA:'BR',ALB:'AL',BGR:'BG',HRV:'HR',SRB:'RS',MDA:'MD',IRL:'IE',CAN:'CA',AUS:'AU',IND:'IN',LBN:'LB',EGY:'EG',CMR:'CM',MLI:'ML',HUN:'HU',CZE:'CZ',SVK:'SK',SVN:'SI',LTU:'LT',LVA:'LV',EST:'EE',FIN:'FI',ISL:'IS',ISR:'IL',ARG:'AR',COL:'CO',MEX:'MX',GEO:'GE',ARM:'AM',BIH:'BA',MKD:'MK',MNE:'ME',RKS:'XK',AND:'AD',SMR:'SM',LIE:'LI',MLT:'MT',CYP:'CY',QAT:'QA',ARE:'AE',SAU:'SA',ZAF:'ZA',BLR:'BY',AZE:'AZ'};
  const iso2 = c => ISO3[String(c||'').replace(/</g,'')] || '';
  window.mrzParse = parse;
  window.rectoFields = (...a) => rectoFields(...a);

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
      const t = raw.trim();
      /* numéro de rubrique en début de ligne, parfois précédé de quelques signes parasites (« (ss 3. », « = a 4a ») */
      const m = /^[^A-Za-z0-9]{0,4}(4\s?[aAbBcCdD]|[1-5lIz|])\s?[.,:;]?\s+(.+)$/.exec(t)
        || /^.{0,8}?(?<![A-Za-z0-9])(4\s?[a-eA-E])[.,:;]?\s*(\S.*)$/.exec(t)
        || /^.{0,8}?(?<![A-Za-z0-9])([1-5])\s?[.,:;]\s*(\S.*)$/.exec(t);
      if (!m) continue;
      let k = m[1].replace(/\s/g,'').toLowerCase().replace(/^[li|]$/,'1').replace(/^z$/,'2').replace(/^4e$/,'4c'); const v = m[2].trim();
      if (k === '5' && /^[0-9OoDIl]{2}\s?[.\/,-]\s?[0-9OoDIl]{2}\s?[.\/,-]/.test(v)) k = '3';   /* « 3 » lu « 5 » (permis italien) */
      if (F[k]) continue;
      if (k === '1' || k === '2') {
        let ws = word(v).split(' ').filter(x=>x.length > 1 || /[A-Z]/.test(x));
        /* prénom : seulement les mots qui commencent par une majuscule (« Paul des 22 » → « Paul ») */
        if (k === '2') { const i = ws.findIndex(x=>!/^[A-ZÀ-Ý]/.test(x)); if (i > 0) ws = ws.slice(0, i); else if (i === 0) ws = []; }
        const w = ws.join(' '); if (w.replace(/[^A-Za-zÀ-ÿ]/g,'').length >= 2) F[k] = k === '1' ? w.toUpperCase() : cap(w); }
      else if (k === '3') { const d = dateIn(v); if (d) { F.dn = d.v; let r2 = v.slice(d.end).trim(); const pm = /^\(([^)]*)\)?/.exec(r2); r2 = pm ? pm[1] : r2.replace(/\([^)]*\)\s*$/,''); const lieu = word(r2); if (lieu.length >= 2) F.lieu = cap(lieu); } }
      else if (k === '4a') { const d = dateIn(v); if (d) F.del = d.v; }
      else if (k === '4b') { const d = dateIn(v); if (d) F.exp = d.v; }
      else if (k === '4c') { const w = v.replace(/^[^A-Za-zÀ-ÿ0-9]+/,'').trim(); if (w.length >= 3) F.aut = w; }
      else if (k === '5') { const n = v.replace(/[^A-Za-z0-9]/g,'').toUpperCase().replace(/^([A-Z]{0,3}\d{5,})[A-Z]{2,}$/,'$1'), nd = n.replace(/\D/g,'').length; if (n.length >= 5 && n.length <= 16 && nd >= 3 && nd >= n.length / 2) F.num = n; }   /* numéro : surtout des chiffres, sinon c'est une lecture ratée */
    }
    const lines = text.split(/\n/);
    /* 4c souvent sur la même ligne que 4a ; 4a parfois mal lu (« sa », « Aa », « da ») */
    for (const raw of lines) {
      const c4 = /(?<![A-Za-z0-9])4\s?[cCeE]\s?[.,:;]?\s*([A-Za-zÀ-ÿ0-9].{2,})$/.exec(raw); if (c4 && !F.aut) F.aut = c4[1].replace(/^[^A-Za-zÀ-ÿ0-9]+/,'').trim();
      if (!F.exp) { const b4 = /^[^A-Za-z0-9]{0,4}(?:[4AaSsdy]\s?)?[bB]\s?[.,:;]\s*(.+)$/.exec(raw.trim()); if (b4) { const d = dateIn(b4[1]); if (d) F.exp = d.v; } }
      if (!F.del) { const a4 = /^[^A-Za-z0-9]{0,3}[4AaSsdy]\s?[aàâ]\s?[.,:;]?\s+(.+)$/.exec(raw.trim()); if (a4) { const d = dateIn(a4[1]); if (d) F.del = d.v; } }
    }
    /* Date de naissance introuvable : date suivie du lieu entre parenthèses, sinon la plus ancienne d'au moins 14 ans */
    if (!F.dn) {
      for (const raw of lines) { const d = dateIn(raw); if (d && /^\s*\(/.test(raw.slice(d.end))) { F.dn = d.v; const pm = /^\s*\(([^)]*)\)?/.exec(raw.slice(d.end)); const lieu = pm ? word(pm[1]) : ''; if (lieu.length >= 2 && !F.lieu) F.lieu = cap(lieu); break; } }
      if (!F.dn) { const y14 = new Date().getFullYear() - 14, all = [];
        for (const raw of lines) for (const mm of raw.matchAll(/[0-9OoDIl]{2}\s?[.\/,-]\s?[0-9OoDIl]{2}\s?[.\/,-]\s?[0-9OoDIl]{4}/g)) { const d = dateIn(mm[0]); if (d && +d.v.slice(6) <= y14) all.push(d.v); }
        all.sort((a,b)=>a.split('/').reverse().join('').localeCompare(b.split('/').reverse().join(''))); if (all.length) F.dn = all[0]; }
    }
    /* Dernier recours : les dates du recto autres que la naissance, la plus ancienne passée = délivrance */
    if (!F.del) {
      const ds = []; const re = /[0-9OoDIl]{2}\s?[.\/,-]\s?[0-9OoDIl]{2}\s?[.\/,-]\s?[0-9OoDIl]{4}/g;
      for (const raw of lines) for (const m of raw.matchAll(re)) { const d = dateIn(m[0]); if (d && d.v !== F.dn && d.v !== F.exp) ds.push(d.v); }
      const t = v => { const [d, m, y] = v.split('/'); return new Date(+y, m-1, +d).getTime(); };
      const past = [...new Set(ds)].filter(v => t(v) <= Date.now() && (!F.dn || t(v) > t(F.dn))).sort((a,b)=>t(a)-t(b));
      if (past.length) F.del = past[0];
    }
    /* expiration introuvable : la date future la plus lointaine */
    if (!F.exp) { const t = v => { const [d, m, y] = v.split('/'); return new Date(+y, m-1, +d).getTime(); }, fut = [];
      for (const raw of lines) for (const m of raw.matchAll(/[0-9OoDIl]{2}\s?[.\/,-]\s?[0-9OoDIl]{2}\s?[.\/,-]\s?[0-9OoDIl]{4}/g)) { const d = dateIn(m[0]); if (d && t(d.v) > Date.now()) fut.push(d.v); }
      if (fut.length) F.exp = fut.sort((a,b)=>t(b)-t(a))[0]; }
    F.pays = paysDoc(text);
    /* autorité : signes et bouts de mots parasites en fin de ligne retirés (« Entidade Emissora- | Si ») */
    if (F.aut) { let w = F.aut.split(/\s+/); while (w.length > 1 && /^([A-Za-zÀ-ÿ]{1,2}|[^A-Za-zÀ-ÿ0-9]+)$/.test(w[w.length-1])) w.pop(); F.aut = w.join(' ').replace(/[^A-Za-zÀ-ÿ0-9)]+$/,''); }
    /* accents lus par le modèle français : ã, õ lus ä, ö ; ï, ü n'existent pas en portugais, espagnol ou italien */
    if (/^(PT|ES|IT)$/.test(F.pays)) { const fx = x => x && x.replace(/ä/g,'ã').replace(/Ä/g,'Ã').replace(/ö/g,'õ').replace(/Ö/g,'Õ').replace(/[ïî]/g,'i').replace(/[ÏÎ]/g,'I').replace(/ü/g,'u').replace(/Ü/g,'U').replace(/ë/g,'e').replace(/Ë/g,'E'); F[1] = fx(F[1]); F[2] = fx(F[2]); F.lieu = fx(F.lieu); }
    return F;
  }
  /* Pays de délivrance d'après l'en-tête imprimé (permis et cartes sans bande) */
  function paysDoc(text){
    const u = text.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Z]/g,'');
    if (/PATENTEDIGUIDA|REPUBBLICAITALIANA|REPUBBLICA|CARTADIIDENTITA/.test(u)) return 'IT';
    if (/MONACO/.test(u)) return 'MC';
    if (/OSTERREICH|OESTERREICH/.test(u)) return 'AT';
    if (/SCHWEIZ|SUISSE|SVIZZERA/.test(u)) return 'CH';
    if (/FUHRERSCHEIN|FUEHRERSCHEIN|DEUTSCHLAND|BUNDESREPUBLIK/.test(u)) return 'DE';
    if (/PERMISODECONDUC|ESPANA|REINODE/.test(u)) return 'ES';
    if (/CARTADECONDUC|PORTUGUESA|PORTUGAL/.test(u)) return 'PT';
    if (/BELGIQUE|BELGIE|BELGIEN|BELGIUM/.test(u)) return 'BE';
    if (/LUXEMBOURG/.test(u)) return 'LU';
    if (/NEDERLAND/.test(u)) return 'NL';
    if (/PERMISDECONDUIRE|REPUBLIQUEFRANCAISE/.test(u)) return 'FR';
    return '';
  }
  /* Carte d'identité étrangère à intitulés bilingues (« COGNOME / SURNAME » au-dessus de la valeur) : Italie (CIE)… (v1.2.9) */
  function labelFields(text){
    const L = text.split(/\n/).map(x=>x.trim()).filter(Boolean), F = {};
    const PART = /^(DI|DE|DA|DO|DEL|DELLA|DEGLI|DOS|DAS|LA|LE|LO|VAN|VON|DER|EL|AL)$/;
    const LBL = /SUR[NM]A[MN]E|COGNOME|GIVEN|\b[NM][AO][MN]E\b|BIRTH|NASCITA|\bSEX\b|SESSO|NATIONAL|CITTADIN|ISSU|EMISSION|EXPIR|SCADENZA|HEIGHT|STATURA|SIGNATURE|FIRMA|MUNICIPAL|COMUNE/i;
    const run = t => {
      const tok = t.replace(/[^A-Za-zÀ-ÿ'’ -]/g,' ').split(/\s+/).filter(Boolean), runs = []; let cur = [];
      const ok = w => w === w.toUpperCase() && /[A-ZÀ-Ý]/.test(w) && (w.replace(/[^A-ZÀ-Ý]/g,'').length >= 3 || PART.test(w));
      for (const w of [...tok, '·']) { if (w !== '·' && ok(w)) cur.push(w); else { while (cur.length && PART.test(cur[0])) cur.shift(); while (cur.length > 1 && (PART.test(cur[cur.length-1]) || cur[cur.length-1].length <= 3)) cur.pop(); if (cur.length) runs.push(cur.join(' ')); cur = []; } }
      return runs.sort((a,b)=>b.length - a.length)[0] || '';
    };
    const vals = (i, n = 3) => L.slice(i + 1, i + 1 + n).filter(x=>!LBL.test(x));
    const DR = /[0-9OoDIl]{2}\s?[.\/,-]\s?[0-9OoDIl]{2}\s?[.\/,-]\s?[0-9OoDIl]{4}/g;
    L.forEach((l, i) => {
      if (!F.nom && /SUR[NM]A[MN]E|COGNOME/i.test(l)) { const v = vals(i, 2)[0]; const u = v && run(v); if (u) F.nom = u; }
      else if (!F.prenom && /GIVEN|\b[NM][AO][MN]E\b/i.test(l) && !/SUR|COGNOME/i.test(l)) { const v = vals(i, 2)[0]; const u = v && run(v); if (u) F.prenom = cap(u.toLowerCase()); }
      if (!F.dn && /BIRTH|NASCITA/i.test(l)) for (const v of vals(i)) { const d = dateIn(v); if (d) { F.dn = d.v; const u = run(v.slice(0, v.search(/[0-9OoDIl]{2}\s?[.\/,-]\s?[0-9OoDIl]{2}/)).replace(/[({][^)}]*[)}]/g,'')); if (u) F.lieu = cap(u.toLowerCase()); break; } }
      if (/\bSEX\b|SESSO|NATIONAL|CITTADIN/i.test(l)) for (const v of vals(i)) {
        if (!F.nat) { const n = [...v.matchAll(/\b([A-Z]{3})\b/g)].find(m=>ISO3[m[1]]); if (n) F.nat = n[1]; }
        if (!F.sexe) { const sx = /(?:^|[^A-Za-z])([MF])\1?(?![A-Za-z])/.exec(v); if (sx) F.sexe = sx[1] === 'M' ? 'H' : 'F'; }
      }
      if (!F.exp && /EXPIR|SCADENZA/i.test(l)) for (const v of vals(i)) {
        const ds = [...v.matchAll(DR)].map(m=>dateIn(m[0])).filter(Boolean).map(d=>d.v);
        if (ds.length >= 2) { F.del = ds[0]; F.exp = ds[ds.length - 1]; break; }
        if (ds.length === 1) { const both = /ISSU|EMISSION/i.test(l); if (!both || v.search(DR) > v.length / 3) F.exp = ds[0]; else F.del = ds[0]; break; }
      }
      if (!F.aut && /MUNICIPAL|COMUNE/i.test(l)) { const v = vals(i, 1)[0]; const u = v && run(v); if (u) F.aut = 'Comune di ' + cap(u.toLowerCase()); }
    });
    /* lieu et date de naissance sans intitulé lisible : « … MAGGIORE (VA) 30.12.1964 » */
    if (!F.dn) for (const l of L) { const m = /([A-ZÀ-Ý][A-ZÀ-Ý' -]{2,}?)\s*[({]\s*[A-Z]{2}\s*[)}]\s*([0-9OoDIl]{2}\s?[.\/,-]\s?[0-9OoDIl]{2}\s?[.\/,-]\s?[0-9OoDIl]{4})/.exec(l); if (m) { const d = dateIn(m[2]); if (d) { F.dn = d.v; const u = run(m[1]); if (u && !F.lieu) F.lieu = cap(u.toLowerCase()); break; } } }
    /* numéro de la carte italienne : 2 lettres, 5 chiffres, 2 lettres (CA00000AA), en haut à droite ; ancien modèle papier : AX1234567 */
    F.pays = paysDoc(text);
    if (F.pays === 'IT') for (const l of L) {
      const m = /(?<![A-Z0-9])([A-Z]{2})\s?([0-9OoQD]{5})\s?([A-Z]{2})(?![A-Z0-9])/.exec(l) || /(?<![A-Z0-9])(A[A-Z])\s?([0-9OoQD]{7})()(?![A-Z0-9])/.exec(l);
      if (m && /\d{3}/.test(m[2])) { F.num = m[1] + m[2].replace(/[OoQD]/g,'0') + m[3]; break; }
    }
    return F;
  }
  window.labelFields = (...a) => labelFields(...a);
  /* Recto d'une carte d'identité, d'un passeport ou d'un titre de séjour : lieu de naissance (absent de la bande) */
  function lieuFields(text){
    const L = text.split(/\n/).map(x=>x.trim()).filter(Boolean), out = {};
    const clean = t => { const w = word(t.replace(/\([^)]*\)/g,'')).replace(/\b(lieu|de|naissance|place|of|birth|luogo|di|nascita|lugar|nacimiento|geburtsort)\b/gi,'').trim(); return w.length >= 2 ? cap(w) : ''; };
    for (let i = 0; i < L.length; i++) {
      const m = /(lieu\s*de\s*naissance|place\s*of\s*birth|luogo\s*di\s*nascita|lugar\s*de\s*nacimiento|geburtsort)[^A-Za-zÀ-ÿ]*(.*)$/i.exec(L[i]);
      if (m) { let v = clean(m[2].replace(/^.*birth/i,'')); if (!v && L[i+1]) v = clean(L[i+1]); if (v) { out.lieu = v; break; } }
      /* ancienne carte d'identité : ligne « à : PARIS 1ER (75) » */
      const a = /(?:^|[^A-Za-zÀ-ÿ])[àÀ]\s*:\s*([A-ZÀ-Ý][A-ZÀ-Ý0-9' -]{1,})/.exec(L[i]);
      if (a) { const v = a[1].replace(/\s+\d{1,3}\s*$/,'').trim(); if (v.replace(/[^A-ZÀ-Ý]/g,'').length >= 2) { out.lieu = cap(v.toLowerCase()); break; } }
      const o = /[nN][ée]e?\s*\(?e?\)?\s*le\b.*?(?:^|\s)[àa]\s*[:.]?\s+([A-ZÀ-Ý][A-ZÀ-Ý' -]{1,})/.exec(L[i]);
      if (o) { const v = clean(o[1]); if (v) { out.lieu = v; break; } }
    }
    return out;
  }
  /* Recto de la carte d'identité au format carte bancaire (depuis 2021) : pas de bande « <<< » sur cette face,
     on lit les rubriques imprimées (v1.2.6) */
  function rectoFields(text){
    const L = text.split(/\n/).map(x=>x.trim()).filter(Boolean), F = {};
    const after = re => { const i = L.findIndex(x=>re.test(x)); return i >= 0 ? L.slice(i + 1, i + 3) : []; };
    const BAD = /USAGE|SURNAME|PR[ÉE]NOM|NAISSANCE|DOCUMENT|NATIONALIT|SEXE|IDENTIT/;
    const upper = t => { const m = t.match(/[A-ZÀ-Ý][A-ZÀ-Ý'’ -]*[A-ZÀ-Ý]/g) || []; return m.map(x=>x.trim().replace(/\s+[A-ZÀ-Ý]$/,'')).filter(x=>x.replace(/[^A-ZÀ-Ý]/g,'').length >= 2 && !BAD.test(x)).sort((a,b)=>b.length - a.length)[0] || ''; };
    for (const t of after(/\bNOM\b(?!\s*D.?\s*USAGE)\s*\/?\s*Su[rmn]/i).slice(0,1)) { const u = upper(t); if (u) F.nom = u; }
    /* prénoms : la plus longue suite de mots à majuscule (« Maëlys-Gaëlle, Marie ») sur les deux lignes sous l'intitulé */
    const pre = [];
    for (const t of after(/Pr[ée]noms|Given\s*names/i)) for (const m of t.matchAll(/[A-ZÀ-Ý][a-zà-ÿ]+(?:\s*-\s*[A-ZÀ-Ý][a-zà-ÿ]+)*(?:\s*,\s*[A-ZÀ-Ý][a-zà-ÿ]+(?:\s*-\s*[A-ZÀ-Ý][a-zà-ÿ]+)*)*/g)) if (m[0].replace(/[^A-Za-zÀ-ÿ]/g,'').length >= 3) pre.push(m[0]);
    if (pre.length) F.prenom = pre.sort((a,b)=>b.length - a.length)[0].replace(/\s*-\s*/g,'-').replace(/\s*,\s*/g,', ');
    for (const t of after(/SEXE|Date\s*of\s*birth|NATIONALIT/i)) {
      const d = /([0-9OoDIl]{2})\s?[.\/ ]?\s?([0-9OoDIl]{2})\s?[.\/ ]?\s?([0-9OoDIl]{4})(?![0-9])/.exec(t); if (d && !F.dn) { const x = dateIn(`${d[1]}.${d[2]}.${d[3]}`); if (x) F.dn = x.v; }
      if (!F.nat) { const n = [...t.matchAll(/\b([A-Z]{3})\b/g)].find(m=>ISO3[m[1]]); if (n) { F.nat = n[1]; const sx = /\b([MF])\b[^A-Z]*$/.exec(t.slice(0, n.index)); if (sx) F.sexe = sx[1] === 'M' ? 'H' : 'F'; } }
      if (F.dn) break;
    }
    /* lieu : candidats en majuscules sur les deux lignes sous l'intitulé (le bon est vérifié dans la liste des communes) */
    const lc = []; for (const t of after(/LIEU\s*DE\s*NAISSANCE|Place\s*of\s*birth/i)) { const u = upper(t.replace(/\([^)]*\)/g,'')); if (u.replace(/[^A-ZÀ-Ý]/g,'').length >= 3 && !u.split(/[\s-]+/).some(w=>w.replace(/[^A-ZÀ-Ý]/g,'').length === 1)) lc.push(cap(u)); }
    if (lc.length) { F.lieuC = lc.sort((a,b)=>b.length - a.length); F.lieu = F.lieuC[0]; }
    for (const t of after(/DU\s*DOCUMENT|Document\s*No/i)) {
      const c = t.replace(/VV/g,'W').replace(/[^A-Za-z0-9 ]/g,' ').trim();
      const d = /(?<![0-9A-Za-z])([0-9OoDIl]{2})\s?([0-9OoDIl]{2})\s?([0-9OoDIl]{4})\s*\S{0,3}$/.exec(c);   /* date collée au numéro (« …Z79 27012031 ») : pas confondue */
      if (d) { const x = dateIn(`${d[1]}.${d[2]}.${d[3]}`); if (x) F.exp = x.v; }
      /* numéro : 9 caractères (lettres et chiffres), parfois coupé en morceaux par le moteur (« X4 RTBPFW4 ») */
      const tok = (d ? c.slice(0, d.index) : c).toUpperCase().split(/\s+/).filter(Boolean);
      for (let i = 0; i < tok.length && !F.num; i++) { let acc = ''; for (let j = i; j < tok.length && acc.length < 9; j++) { acc += tok[j]; if (acc.length === 9 && /\d.*\d/.test(acc) && /[A-Z]/.test(acc)) { if (j === i) F.num = acc; else F.numJ ||= acc; } } }
      if (F.num || F.exp) break;
    }
    /* date d'expiration aussi imprimée en petit en haut à droite de la carte */
    if (!F.exp) for (const t of L.slice(0, 3)) { const x = dateIn(t); if (x && +x.v.slice(6) >= new Date().getFullYear() - 1) { F.exp = x.v; break; } }
    return F;
  }
  /* Recto d'une carte d'identité étrangère sans bande (Portugal, Italie, Espagne…) : pas d'intitulés fiables,
     on s'appuie sur la ligne « sexe · nationalité (3 lettres) · date de naissance » (v1.2.8) */
  const HEAD = /^(CART[AÃEO]O?|CARTE|CARD|CITIZEN|CIDAD[AÃ]O|IDENTIT\w*|IDENTIDAD|IDENTIDADE|DOCUMENTO|NACIONAL|NATIONAL|NAZIONALE|REP[UÚ]BLI\w*|REPUBBLICA|PORTUGAL|PORTUGUESA|ITALIANA|ESPA[NÑ]A|BELGI\w*|ROYAUME|KINGDOM|PERSONALAUSWEIS|BUNDESREPUBLIK|DEUTSCHLAND|IDENTITY|DE|DA|DO|DI|DEL|SPECIMEN|ESPECIMEN|SPECIMEN)$/;
  function genericFields(text){
    const L = text.split(/\n/).map(x=>x.trim()).filter(Boolean), F = {};
    const DT = /([0-3][0-9])[\s.\/-]?([01][0-9])[\s.\/-]?([0-9]{4})/g;
    /* année mal lue (« 1081 », « 1681 ») : on garde les deux derniers chiffres */
    const yfix = y => /^(19|20)\d\d$/.test(y) ? y : (+y.slice(2) > new Date().getFullYear() % 100 ? '19' : '20') + y.slice(2);
    const iso = l => [...l.matchAll(/\b([A-Z]{3})\b/g)].find(m=>ISO3[m[1]]);
    const di = L.findIndex(l=>iso(l) && /\d{2}[\s.\/-]?\d{2}[\s.\/-]?\d{4}/.test(l.replace(/[Oo]/g,'0')));
    if (di < 0) return F;
    const dl = L[di], n = iso(dl);
    F.nat = n[1];
    const sx = /(?:^|[^A-Za-z])([MF])(?![A-Za-z])/.exec(dl.slice(0, n.index)); if (sx) F.sexe = sx[1] === 'M' ? 'H' : 'F';
    const d0 = [...dl.slice(n.index).replace(/[Oo]/g,'0').matchAll(DT)][0]; if (d0) { const x = dateIn(`${d0[1]}.${d0[2]}.${yfix(d0[3])}`); if (x) F.dn = x.v; }
    /* noms : lignes en MAJUSCULES au-dessus (hors en-tête du document) ; la première = nom, la suivante = prénoms */
    const caps = [];
    for (const l of L.slice(0, di)) {
      const w = l.replace(/[^A-Za-zÀ-ÿ' -]/g,' ').split(/\s+/).filter(x=>x.length >= 2 && x === x.toUpperCase() && /[A-ZÀ-Ý]/.test(x));
      const good = w.filter(x=>!HEAD.test(x.normalize('NFD').replace(/[̀-ͯ]/g,'')));
      if (good.some(x=>x.replace(/[^A-ZÀ-Ý]/g,'').length >= 3) && good.join('').length >= 4 && good.length >= w.length - 1 && !w.every(x=>HEAD.test(x.normalize('NFD').replace(/[̀-ͯ]/g,'')))) caps.push(w.filter((x,i)=>!(i === 0 && HEAD.test(x) && !/^(DA|DE|DO|DI|DEL)$/.test(x))).join(' '));
    }
    if (caps.length >= 2) { F.nom = caps[caps.length - 2]; F.prenom = cap(caps[caps.length - 1]); } else if (caps.length) F.nom = caps[0];
    /* numéro et date d'expiration : ligne(s) sous la ligne des données */
    for (const l of L.slice(di + 1, di + 3)) {
      const c = l.replace(/[Oo](?=\d)|(?<=\d)[Oo]/g,'0');
      const ds = [...c.matchAll(DT)]; const last = ds[ds.length - 1];
      if (last && !F.exp) { const x = dateIn(`${last[1]}.${last[2]}.${yfix(last[3])}`); if (x) F.exp = x.v; }
      const tok = (last ? c.slice(0, last.index) : c).toUpperCase().split(/\s+/).map(x=>x.replace(/[^A-Z0-9]/g,'')).filter(x=>x.length >= 6 && /\d/.test(x));
      if (tok.length && !F.num) F.num = tok[0];
      if (F.num || F.exp) break;
    }
    return F;
  }
  window.genericFields = (...a) => genericFields(...a);
  const isRecto = t => /IDENTIT/i.test(t) && /Surname|Given\s*names|NOM\s*D.?\s*USAGE|Pr[ée]noms/i.test(t) && !/COGNOME|REPUBBLICA|ITALIANA|APELLIDO|NAZIONALIT|CITTADIN/i.test(t);
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
  /* Verso d'une carte d'identité (ancienne : adresse, validité, délivrance, autorité ; nouvelle : adresse, date de délivrance) */
  function versoFields(text){
    const L = text.split(/\n/).map(x=>x.trim()).filter(Boolean), F = {};
    const STOP = /taille|height|carte\s*valable|valable|d[ée]livr|date\s*de|issue|par\s*[:.]|signature|r[ée]publique|<<|nom\s*d|signes/i;
    for (let i = 0; i < L.length; i++) {
      const l = L[i];
      if (!F.exp) { const m = /valable\s*jusqu.{0,4}au\s*[:.]?\s*(.*)$/i.exec(l); if (m) { const d = dateIn(m[1]); if (d) F.exp = d.v; } }
      if (!F.del) { const m = /(d[ée]livr[ée]e?\s*le|date\s*de\s*d[ée]livrance|date\s*of\s*issue)[^0-9A-Za-z]*(?:[A-Za-z ]*issue)?\s*[:.]?\s*(.*)$/i.exec(l); if (m) { const d = dateIn(m[2]) || (L[i+1] && dateIn(L[i+1])); if (d) F.del = d.v; } }
      if (!F.aut) { const m = /\bpar\s*[:.]\s*(.{3,})$/i.exec(l); if (m) { const a = m[1].trim(), dep = /pr[ée]fecture.*?\(?\b(\d{2,3}|2[AB])\)?\s*$/i.exec(a); F.aut = dep ? `Préfecture ${dep[1].toUpperCase()}` : a[0].toUpperCase() + a.slice(1).toLowerCase(); } }
      if (!F.rue && /^\W*adresse|^\W*address/i.test(l)) {
        const parts = [], first = l.replace(/^\W*adresse\s*(\/\s*address)?\s*[:.]?\s*/i,'').trim();
        if (first.length > 2) parts.push(first);
        for (let j = i + 1; j < L.length && parts.length < 4 && !STOP.test(L[j]); j++) parts.push(L[j]);
        const k = parts.findIndex(x=>/\b\d{5}\b/.test(x));
        if (k >= 0) {
          const m = /\b(\d{5})\s+([A-Za-zÀ-ÿ' -]{2,})/.exec(parts[k]);
          if (m) { F.cp = m[1]; F.ville = m[2].replace(/\s+(cedex.*)$/i,'').trim(); }
          F.rue = parts.slice(0, k).join(', ');
          const after = parts.slice(k+1).find(x=>/^[A-Za-zÀ-ÿ -]{3,}$/.test(x)); if (after) F.pays = cap(after);
        } else if (parts.length) F.rue = parts.join(', ');
        if (F.rue) F.rue = F.rue.replace(/\s+/g,' ').replace(/^\d+\s*[,.]?\s*/, m=>m.trim() + ' ').trim();
      }
    }
    return F;
  }
  window.versoFields = versoFields;
  /* Ville du code postal : nom officiel pris dans la liste des communes si possible */
  async function villeOff(cp, ville){
    try { const C = await loadCities(), n = norm(ville).replace(/[-'’]/g,' ');
      const idx = C.cps.map((c,i)=>c === cp ? i : -1).filter(i=>i >= 0);
      const best = idx.find(i=>C.nk[i].trim() === n) ?? idx.find(i=>n.includes(C.nk[i].trim()) || C.nk[i].includes(n)) ?? (idx.length === 1 ? idx[0] : undefined);
      if (best !== undefined) return C.names[best];
    } catch {}
    return cap(ville);
  }
  async function fillVerso(V){
    const got = [];
    const put = (id, v, lbl) => { const el = $('#'+id); if (!el || !v) return; el.value = v; mark(id); got.push(lbl); };
    if (V.rue || V.cp) {
      put('f_adrRue', cap(V.rue || '').replace(/\b(Bis|Ter)\b/g, x=>x.toLowerCase()), 'adresse');
      if (V.cp) put('f_adrVille', `${V.cp} ${await villeOff(V.cp, V.ville || '')}`, 'ville');
      const pays = V.pays || (V.cp ? (V.cp === '98000' ? 'Monaco' : 'France') : '');
      if (pays && !$('#f_adrPays').value.trim()) { $('#f_adrPays').value = pays; mark('f_adrPays'); }
      if (window.adrJoin) adrJoin();
    }
    if (V.del || V.exp || V.aut) setSeg('docSeg', 'Officiel');
    put('f_docDate', V.del, 'date de délivrance'); put('f_docExp', V.exp, 'date d\'expiration'); put('f_docLieu', V.aut, 'autorité');
    if (V.del || V.exp || V.aut) { if (!$('#f_docType').value) $('#f_docType').value = 'CNI'; if (!$('#f_docPays').value) { $('#f_docPays').value = 'FR'; syncDocPays(); } }
    window.syncExp?.(); draftSoon();
    return got;
  }
  async function readText(file, psms=['6','4'], mode){
    const w = await getFra(); status('Lecture du texte de la pièce…');
    const c = clean(await toCanvas(file, 2400, ''), mode);
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
  /* Fonds de sécurité colorés effacés (rose du permis, bleu des cartes) : on garde le canal le plus CLAIR de chaque point
     (une encre noire reste noire, un fond coloré devient blanc), contraste étiré, image agrandie si petite (v1.2.6) */
  function clean(c, mode = 'max'){
    const k = c.width < 1600 ? 2 : 1, o = document.createElement('canvas'); o.width = c.width*k; o.height = c.height*k;
    const g = o.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, o.width, o.height);
    const im = g.getImageData(0, 0, o.width, o.height), d = im.data, h = new Uint32Array(256), n = d.length/4;
    /* 'bin' : noir et blanc strict, efface les guillochis gris (carte italienne) */
    const px = mode === 'min' ? i => Math.min(d[i], d[i+1], d[i+2]) : i => Math.max(d[i], d[i+1], d[i+2]);   /* permis rose : canal le plus sombre */
    for (let i = 0; i < d.length; i += 4) h[px(i)]++;
    const pct = q => { let a = 0; for (let v = 0; v < 256; v++) { a += h[v]; if (a >= n*q) return v; } return 255; };
    const lo = pct(.02), hi = Math.max(lo + 1, pct(.6));
    for (let i = 0; i < d.length; i += 4) { let v = Math.max(0, Math.min(255, (px(i) - lo) * 255 / (hi - lo))); if (mode === 'bin') v = v < 70 ? 0 : 255; d[i] = d[i+1] = d[i+2] = v; }
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
    set('f_docType', r.type, true); set('f_docNumero', r.num, true); if (r.exp) set('f_docExp', r.exp, true);
    const p2 = iso2(r.pays); if (p2 && [...$('#f_docPays').options].some(o=>o.value === p2)) $('#f_docPays').value = p2;
    syncSexe(); syncDocPays(); syncAge(); window.syncExp?.();
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
    put('f_docDate', F.del, 'date de délivrance'); put('f_docExp', F.exp, 'date d\'expiration'); put('f_docLieu', F.aut, 'autorité');
    if (!r.num && F.num) put('f_docNumero', F.num, 'numéro');
    setSeg('docSeg', 'Officiel'); if (!$('#f_docType').value) $('#f_docType').value = 'PC';
    if (F.pays && !(r && r.pays) && [...$('#f_docPays').options].some(o=>o.value === F.pays)) { $('#f_docPays').value = F.pays; syncDocPays(); }
    syncAge(); window.syncExp?.(); $('#f_nom').dispatchEvent(new Event('change', {bubbles:true}));
    if (F[2] && !$('#f_sexe').value) $('#f_prenom').dispatchEvent(new Event('change', {bubbles:true}));   /* sexe deviné d'après le prénom */
    draftSoon();
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
      for (const part of [c, crop(c, .5, 1), crop(c, .25, .8)]) { const {data} = await w.recognize(part), x = parse(data.text || ''); if (x && x.nom && (!r || x.ok)) r = x; if (r && r.ok) break;
        /* recto de la nouvelle carte d'identité (sans bande) : inutile d'insister, on passe directement à la lecture du texte */
        if (!r && /IDENTITYCARD|CARTENATIONALE|SURNAME|GIVENNAMES/.test((data.text || '').replace(/[^A-Z]/g,''))) break; }
      let texts = [];
      if (!r || r.type === 'PC') {
        try { texts = await readText(file, ['6','4'], r ? 'min' : 'max'); } catch (e) { if (!r) throw e; }
        /* Recto de la carte d'identité récente (format carte bancaire) */
        if (!r && texts.some(isRecto)) {
          const R = merge(texts, rectoFields), got = [];
          if (!R.num && R.numJ) R.num = R.numJ;   /* numéro d'un seul tenant prioritaire, sinon recollé */
          if (!R.nat) R.nat = 'FRA';              /* la carte nationale d'identité n'est délivrée qu'aux Français */
          const put = (id, v, lbl) => { const el = $('#'+id); if (!el || !v) return; el.value = v; mark(id); got.push(lbl); };
          put('f_nom', R.nom, 'nom'); put('f_prenom', R.prenom, 'prénom'); put('f_dateNaissance', R.dn, 'date de naissance');
          if (R.sexe) { $('#f_sexe').value = R.sexe; syncSexe(); }
          if (R.nat) { const n2 = iso2(R.nat), adj = n2 && PAYS_ADJ[n2]; if (adj && !/^du /.test(adj)) { const a = adjFem(adj); put('f_nationalite', a[0].toUpperCase() + a.slice(1), 'nationalité'); } }
          R.lieuC = texts.flatMap(t=>rectoFields(t).lieuC || []);
          if (R.lieuC.length > 1) { try { const C = await loadCities(), set = C._set ||= new Set(C.nk.map(x=>x.trim())); const ok = R.lieuC.find(x=>set.has(norm(x).replace(/[-'’]/g,' ').trim())); if (ok) R.lieu = ok; } catch {} }
          if (R.lieu && $('#f_naisVille')) { $('#f_naisVille').value = R.lieu; if (window.naisJoin) naisJoin(); mark('f_naisVille'); got.push('lieu de naissance'); }
          put('f_docNumero', R.num, 'numéro'); put('f_docExp', R.exp, 'date d\'expiration');
          if (R.nom || R.num) {
            setSeg('docSeg', 'Officiel'); $('#f_docType').value = 'CNI'; if ([...$('#f_docPays').options].some(o=>o.value === 'FR')) $('#f_docPays').value = 'FR';
            syncDocPays(); syncAge(); window.syncExp?.(); $('#f_nom').dispatchEvent(new Event('change', {bubbles:true}));
            if (R.prenom && !R.sexe) $('#f_prenom').dispatchEvent(new Event('change', {bubbles:true}));
            draftSoon();
            const ei = window.expForm?.();
            status(`Recto de la carte d'identité lu · à vérifier, en orange : ${got.join(', ')} · scanne le verso (lignes « <<< ») pour confirmer nom et numéro` + (ei && ei.days < 0 ? ` · ⚠ ${ei.text}` : ''));
            if (ei && ei.days < 0) { toast('⚠ PIÈCE EXPIRÉE'); navigator.vibrate?.([200,100,200]); } else toast('Recto lu : vérifie les champs en orange');
            return;
          }
        }
        const F = merge(texts, permisFields), n = ['1','2','dn'].filter(k=>F[k]).length + (F.num ? 1 : 0);
        if (!r && n < 2) {
          const V = merge(texts, versoFields);
          if (V.rue || V.cp || V.del || V.exp) {
            const got = await fillVerso(V);
            const ei = window.expForm?.();
            status(`Verso lu · à vérifier, en orange : ${got.join(', ')}` + (ei ? ` · ${ei.days < 0 ? '⚠ ' : ''}${ei.text}` : ''));
            if (ei && ei.days < 0) { toast('⚠ PIÈCE EXPIRÉE'); navigator.vibrate?.([200,100,200]); } else toast('Verso lu : vérifie les champs en orange');
            return;
          }
          /* carte étrangère à intitulés bilingues (Italie…) : fond guilloché → 2e lecture en noir et blanc strict */
          const HINT = /COGNOME|SUR[NM]AME|IDENTITY|NATIONALITY|CITTADINANZA|REPUBBLICA/i;
          let B = merge(texts, labelFields);
          if (texts.some(t=>HINT.test(t)) && !(B.nom && B.prenom && B.dn)) { try { const bw = await readText(file, ['6'], 'bin'); texts = texts.concat(bw); B = merge(bw.concat(texts), labelFields); } catch {} }
          if (B.nom && (B.dn || B.prenom)) {
            const got = [], put = (id, v, lbl) => { const el = $('#'+id); if (!el || !v) return; el.value = v; mark(id); got.push(lbl); };
            put('f_nom', B.nom, 'nom'); put('f_prenom', B.prenom, 'prénom'); put('f_dateNaissance', B.dn, 'date de naissance');
            if (B.lieu && $('#f_naisVille')) { $('#f_naisVille').value = B.lieu; if (window.naisJoin) naisJoin(); mark('f_naisVille'); got.push('lieu de naissance'); }
            if (B.sexe) { $('#f_sexe').value = B.sexe; syncSexe(); }
            const n2 = iso2(B.nat), adj = n2 && PAYS_ADJ[n2]; if (adj && !/^du /.test(adj)) { const a = adjFem(adj); put('f_nationalite', a[0].toUpperCase() + a.slice(1), 'nationalité'); }
            put('f_docNumero', B.num, 'numéro'); put('f_docDate', B.del, 'date de délivrance'); put('f_docExp', B.exp, 'date d\'expiration'); put('f_docLieu', B.aut, 'autorité');
            setSeg('docSeg', 'Officiel'); $('#f_docType').value = 'CNI';
            const p2 = B.pays || n2; if (p2 && [...$('#f_docPays').options].some(o=>o.value === p2)) $('#f_docPays').value = p2;
            syncDocPays(); syncAge(); window.syncExp?.(); $('#f_nom').dispatchEvent(new Event('change', {bubbles:true}));
            if (B.prenom && !B.sexe) $('#f_prenom').dispatchEvent(new Event('change', {bubbles:true}));
            draftSoon();
            const ei = window.expForm?.();
            status(`Carte d'identité étrangère lue${p2 ? ' (' + p2 + ')' : ''} · à vérifier, en orange : ${got.join(', ')}` + (ei && ei.days < 0 ? ` · ⚠ ${ei.text}` : ''));
            if (ei && ei.days < 0) { toast('⚠ PIÈCE EXPIRÉE'); navigator.vibrate?.([200,100,200]); } else toast('Pièce lue : vérifie les champs en orange');
            return;
          }
          /* carte d'identité étrangère (recto sans bande) */
          const G = merge(texts, genericFields);
          if (G.nat && (G.nom || G.dn)) {
            const got = [], put = (id, v, lbl) => { const el = $('#'+id); if (!el || !v) return; el.value = v; mark(id); got.push(lbl); };
            put('f_nom', G.nom, 'nom'); put('f_prenom', G.prenom, 'prénom'); put('f_dateNaissance', G.dn, 'date de naissance');
            if (G.sexe) { $('#f_sexe').value = G.sexe; syncSexe(); }
            const n2 = iso2(G.nat), adj = n2 && PAYS_ADJ[n2]; if (adj && !/^du /.test(adj)) { const a = adjFem(adj); put('f_nationalite', a[0].toUpperCase() + a.slice(1), 'nationalité'); }
            put('f_docNumero', G.num, 'numéro'); put('f_docExp', G.exp, 'date d\'expiration');
            setSeg('docSeg', 'Officiel'); if (!$('#f_docType').value) $('#f_docType').value = 'CNI';
            if (n2 && [...$('#f_docPays').options].some(o=>o.value === n2)) $('#f_docPays').value = n2;
            syncDocPays(); syncAge(); window.syncExp?.(); $('#f_nom').dispatchEvent(new Event('change', {bubbles:true}));
            if (G.prenom && !G.sexe) $('#f_prenom').dispatchEvent(new Event('change', {bubbles:true}));
            draftSoon();
            const ei = window.expForm?.();
            status(`Pièce étrangère lue (${G.nat}) · à vérifier, en orange : ${got.join(', ')} · s'il y a des lignes « <<< » au verso, scanne-le pour confirmer` + (ei && ei.days < 0 ? ` · ⚠ ${ei.text}` : ''));
            if (ei && ei.days < 0) { toast('⚠ PIÈCE EXPIRÉE'); navigator.vibrate?.([200,100,200]); } else toast('Pièce lue : vérifie les champs en orange');
            return;
          }
          const lieu = await findLieu(texts);
          if (lieu && $('#f_naisVille')) { $('#f_naisVille').value = lieu; if (window.naisJoin) naisJoin(); mark('f_naisVille'); draftSoon(); status(`Recto lu : lieu de naissance « ${lieu} » (à vérifier, en orange)`); toast('Lieu de naissance lu'); return; }
          status('Rien de lisible. Passeport : page photo · carte d\'identité : les deux faces, l\'une après l\'autre · titre de séjour : face avec les lignes « <<< » · permis : recto. Pièce à plat, nette, sans reflet, cadrée de près.'); return;
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
      let vgot = [];
      try {
        texts = await readText(file, ['6']);
        if (r.kind !== 'TD1') lieu = merge(texts, lieuFields).lieu || '';
        else { const V = merge(texts, versoFields); delete V.exp; vgot = await fillVerso(V); }
      } catch {}
      if (lieu && $('#f_naisVille')) { $('#f_naisVille').value = lieu; if (window.naisJoin) naisJoin(); mark('f_naisVille'); draftSoon(); }
      status(`${r.ok ? '✓ Lu' : '⚠ Lecture incertaine, vérifie les champs'} : ${KIND[r.type] || 'document'} ${r.pays.replace(/</g,'')} — ${r.nom} ${r.prenom}` + (vgot.length ? ` · à vérifier, en orange : ${vgot.join(', ')}` : '') + (lieu ? ` · lieu de naissance « ${lieu} » à vérifier (orange)` : ' · lieu de naissance absent de cette face : scanne aussi l\'autre face'));
      const ei = r.exp ? window.expForm?.() : null;
      if (ei && ei.days < 0) { toast('⚠ PIÈCE EXPIRÉE'); navigator.vibrate?.([200,100,200]); } else toast(r.ok ? 'Pièce d\'identité lue' : 'Lecture incertaine : vérifie les champs');
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
