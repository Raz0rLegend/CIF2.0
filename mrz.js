'use strict';
/* CIF 2.0 — lecture de la bande MRZ (lignes « <<< ») d'une pièce d'identité ou d'un permis de conduire.
   Tout se passe sur le téléphone : la photo n'est ni envoyée ni conservée.
   Le module de lecture (Tesseract + modèle MRZ, ≈ 5 Mo) est téléchargé une seule fois puis gardé. */
(()=>{
  const SRC = {
    tess:   ['https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js', 'https://unpkg.com/tesseract.js@5.1.1/dist/tesseract.min.js'],
    worker: ['https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js', 'https://unpkg.com/tesseract.js@5.1.1/dist/worker.min.js'],
    core:   ['https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1/tesseract-core-lstm.wasm.js', 'https://unpkg.com/tesseract.js-core@5.1.1/tesseract-core-lstm.wasm.js'],
    lang:   ['https://cdn.jsdelivr.net/gh/DoubangoTelecom/tesseractMRZ@master/tessdata_fast/mrz.traineddata', 'https://raw.githubusercontent.com/DoubangoTelecom/tesseractMRZ/master/tessdata_fast/mrz.traineddata']
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
  const seed = data => new Promise((res,rej)=>{
    const rq = indexedDB.open('keyval-store');
    rq.onupgradeneeded = ()=>rq.result.createObjectStore('keyval');
    rq.onerror = ()=>rej(rq.error);
    rq.onsuccess = ()=>{ const d = rq.result, tx = d.transaction('keyval','readwrite'); tx.objectStore('keyval').put(data, './mrz.traineddata'); tx.oncomplete = ()=>{ d.close(); res(); }; tx.onerror = ()=>{ d.close(); rej(tx.error); }; };
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
      if (/^D[1<I]FRA/.test(a) && a.length >= 28 && a.length <= 32) {
        const l = pad(a,30), nf = alpha(l.slice(21,29)), cut = !/</.test(nf);
        return {kind:'DL', type:'PC', pays:'FRA', nat:'', num:l.slice(5,14).replace(/</g,''), nom:nf.replace(/[^A-Z<]/g,'').replace(/<+/g,' ').trim(), prenom:'', dn:'', sexe:'', cut, ok:chk(l.slice(0,29), dig(l[29]))};
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

  /* ----- Image ----- */
  async function toCanvas(file, max=2000){
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res,rej)=>{ const i = new Image(); i.onload = ()=>res(i); i.onerror = rej; i.src = url; });
      const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth*s); c.height = Math.round(img.naturalHeight*s);
      const g = c.getContext('2d'); g.filter = 'grayscale(1) contrast(1.4)'; g.drawImage(img, 0, 0, c.width, c.height);
      return c;
    } finally { URL.revokeObjectURL(url); }
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
      if (!r) { status('Bande non trouvée. Cadre de près les lignes « <<< », pièce bien à plat, nette et sans reflet.'); return; }
      fill(r);
      status(`${r.ok ? '✓ Lu' : '⚠ Lecture incertaine, vérifie les champs'} : ${KIND[r.type] || 'document'} ${r.pays.replace(/</g,'')} — ${r.nom} ${r.prenom}` + (r.type === 'PC' ? ` · le permis ne donne que le numéro et le nom${r.cut ? ' (8 premières lettres, à compléter)' : ''} : prénom et date de naissance à saisir` : ''));
      toast(r.ok ? 'Pièce d\'identité lue' : 'Lecture incertaine : vérifie les champs');
    } catch (e) {
      status(e && e.message === 'offline' ? 'Il faut du réseau la première fois pour télécharger le module de lecture.' : 'Lecture impossible sur cet appareil.');
    } finally { btn.disabled = false; btn.style.opacity = ''; }
  }
  const anchor = $('#f_sexe')?.previousElementSibling;
  if (!anchor) return;
  anchor.insertAdjacentHTML('beforebegin', `<button type="button" class="addveh" id="mrzBtn" style="margin-top:14px">📷 Scanner une pièce d'identité</button>
    <div id="mrzInfo" style="font-size:13px;color:#9cc0ff;margin-top:6px"></div><input type="file" id="mrzFile" accept="image/*" capture="environment" hidden>`);
  $('#mrzBtn').onclick = ()=>$('#mrzFile').click();
  $('#mrzFile').onchange = e=>{ const f = e.target.files[0]; e.target.value = ''; if (f) scan(f); };
  { const _of = openForm; openForm = function(f, d){ _of(f, d); status(''); }; }
})();
