'use strict';
/* CIF 2.0 — v2.0.0 : outils.js, regroupement de modules (thème jour/nuit, mode test de lecture, mode développeur, chronologie).
   Modules d'origine, dans l'ordre de chargement : theme.js, scandebug.js, devmode.js, chrono.js.
   Chaque module reste isolé : une erreur dans l'un n'empêche pas les suivants de se charger. */
/* ===== theme.js ===== */
try {
/* CIF 2.0 — v1.2.2 : affichage jour / nuit.
   Auto : clair le jour, sombre la nuit ; bascule au crépuscule et à l'aube (soleil à 6° sous l'horizon),
   heures calculées sur le téléphone pour Monaco, sans connexion. Réglage : Auto / Jour / Nuit (Réglages › Affichage).
   Mode jour : palette claire dédiée (v1.2.6), le logo, les photos et les plaques gardent leurs vraies couleurs. */
(()=>{
  const LAT = 43.7333, LNG = 7.4167, KEY = 'cifTheme';
  /* Mode jour (v1.2.6) : vraies couleurs claires (plus d'inversion de l'écran, qui abîmait le logo et les photos) */
  document.head.insertAdjacentHTML('beforeend', `<style>
html.jour{--bg:#f2f2f6;--panel:#ffffff;--card:#ffffff;--line:#d8d8de;--text:#141414;--muted:#6a6a70;--accent:#1f9d35;--danger:#d93a32;--field:#ffffff;--border:#b9b9bf;color-scheme:light}
html.jour #lock img{filter:drop-shadow(0 6px 16px rgba(0,0,0,.25))}
html.jour #form label.f{color:#5f5f66}
html.jour body::after{content:'';position:fixed;left:0;right:0;top:0;height:env(safe-area-inset-top);background:#000;z-index:2147483647;pointer-events:none}
html.jour .btn{background:#000000;color:#eeeeee}
html.jour .btn.sec{background:#d4d4d4}
html.jour .ib:active{background:#d3d3d3}
html.jour .ib.on{background:#000000;color:#eeeeee}
html.jour .card{background:rgba(227,227,227,.88)}
html.jour .card .thumb{background:#ffffff}
html.jour .card .sub{color:#303030}
html.jour .acts .ib svg{color:#424242}
html.jour #fab{background:#000000;color:#eeeeee}
html.jour #selBar button{background:#d4d4d4}
html.jour #selBar button.primary{background:#000000;color:#eeeeee}
html.jour .card .chk{border:2px solid #888888}
html.jour .card.sel .chk{background:#000000;border-color:#000000;color:#eeeeee}
html.jour nav.tabs button.on{background:#000000;color:#eeeeee}
html.jour label.f{color:#2f2f2f}
html.jour input:focus,html.jour select:focus,html.jour textarea:focus{border-color:#444444}
html.jour .chips input:checked+span{background:#000000;color:#eeeeee;border-color:#000000}
html.jour .ph{background:#ffffff}
html.jour .addph{border:1px dashed #999999}
html.jour .seg button.on{background:#000000;color:#eeeeee}
html.jour .veh{background:#e6e6e6}
html.jour .veh .ib svg{color:#424242}
html.jour .switch .sw{background:#bbbbbb}
html.jour .test{background:#e6e6e6}
html.jour .addveh{border:1px dashed #999999}
html.jour #modal{background:rgba(255,255,255,.6)}
html.jour #modal .box{background:#d9d9d9}
html.jour #shareSheet{background:rgba(255,255,255,.55)}
html.jour #shareSheet button{background:#d5d5d5}
html.jour #shareSheet button.cancel{background:#000000;color:#eeeeee}
html.jour #sg{background:#d5d5d5;border:1px solid #bbbbbb}
html.jour #sg button{border-bottom:1px solid #c7c7c7}
html.jour #sg button:active{background:#c5c5c5}
html.jour #sg b{color:#000000}
html.jour .hero .sub2{color:#3b3b3b}
html.jour .hero .vic{background:#d9d9d9;border:1px solid #c5c5c5;color:#0f0f0f}
html.jour .card .vic svg{color:#424242}
html.jour .chip{background:#d5d5d5;color:#222222}
html.jour .panel{background:#e6e6e6;border:1px solid #d1d1d1}
html.jour .panel h4{color:#575757;background:#dedede}
html.jour .grid{background:#d5d5d5;border-top:1px solid #d5d5d5}
html.jour .cell{background:#e6e6e6}
html.jour .cell .k{color:#727272}
html.jour .actbar button{background:#d4d4d4}
html.jour .actbar button#detSend{background:#000000;color:#eeeeee}
html.jour .glink svg{background:#d9d9d9;border:1px solid #c5c5c5;color:#656565}
html.jour .mates{color:#575757}
html.jour .mates button{color:#272727}
html.jour .glink svg{background:#eeeeee;border:2px solid #191919;color:#000000}
html.jour #lsvc .sq{background:#e2e2e2;border:1px solid #c5c5c5}
html.jour #lsvc .ms{background:#e2e2e2;border:1px solid #c5c5c5}
html.jour #lsvc .mh button{color:#303030}
html.jour #lsvc .mi{background:#d9d9d9}
html.jour #lsvc .mi.now{background:#0d0d0d;color:#eeeeee}
html.jour #svcEd .seg button{border:1px solid #bbbbbb;background:#dfdfdf}
html.jour #svcEd .seg button.on{background:#0d0d0d;color:#eeeeee;border-color:#0d0d0d}
html.jour #svcEd .row{background:#dcdcdc}
html.jour #svcEd .btns button{border:1px solid #bbbbbb;background:#dfdfdf}
html.jour .dalert img,html.jour .dalert .noph{background:#ffffff}
html.jour #diffList .drow img,html.jour #diffList .drow .noph{background:#ffffff}
html.jour #chronus>summary .n{color:var(--fg,#222222)}
html.jour #form label.f{color:#565656}
html.jour .vgrp b{color:#000000}
</style>`);
  /* ----- Lever / coucher du soleil (méthode des éphémérides simplifiées, précision ≈ 1 min) ----- */
  const rad = Math.PI / 180, DAYMS = 864e5, J1970 = 2440588, J2000 = 2451545, J0 = 0.0009, E = rad * 23.4397;
  const toDays = d => d.valueOf() / DAYMS - 0.5 + J1970 - J2000, fromJ = j => new Date((j + 0.5 - J1970) * DAYMS);
  function sun(date, h = -6){
    const lw = -LNG * rad, phi = LAT * rad, d = toDays(date);
    const n = Math.round(d - J0 - lw / (2 * Math.PI)), ds = J0 + lw / (2 * Math.PI) + n;
    const M = rad * (357.5291 + 0.98560028 * ds);
    const L = M + rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI;
    const dec = Math.asin(Math.sin(E) * Math.sin(L));
    const noon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
    const w = Math.acos((Math.sin(h * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
    const set = J2000 + J0 + (w + lw) / (2 * Math.PI) + n + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
    return {aube: fromJ(noon - (set - noon)), crep: fromJ(set)};
  }
  window.cifSun = sun;
  const mode = () => { try { return localStorage.getItem(KEY) || 'auto'; } catch { return 'auto'; } };
  const isDay = (now = new Date()) => { const s = sun(now); return now >= s.aube && now < s.crep; };
  const hm = d => d.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
  function apply(){
    const m = mode(), day = m === 'jour' || (m === 'auto' && isDay());
    document.documentElement.classList.toggle('jour', day);
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', day ? '#e1e1e1' : '#1e1e1e');
    const h = document.getElementById('themeHint');
    if (h) { const s = sun(new Date()); h.textContent = m === 'auto' ? `Aujourd'hui : jour de ${hm(s.aube)} à ${hm(s.crep)}, nuit ensuite (Monaco).` : m === 'jour' ? 'Affichage clair en permanence.' : 'Affichage sombre en permanence.'; }
  }
  apply();
  setInterval(apply, 60000);
  document.addEventListener('visibilitychange', ()=>{ if (!document.hidden) apply(); });
  /* ----- Réglages ----- */
  const sec = [...document.querySelectorAll('#settings h3')].find(x=>x.textContent === 'Localisation' || x.textContent === 'Sécurité');
  sec?.insertAdjacentHTML('beforebegin', `<h3>Affichage</h3>
    <label class="f" for="s_theme">Jour / nuit</label>
    <select id="s_theme"><option value="auto">Automatique (sombre au crépuscule)</option><option value="jour">Toujours clair (jour)</option><option value="nuit">Toujours sombre (nuit)</option></select>
    <p class="hint" id="themeHint"></p>`);
  const sel = document.getElementById('s_theme');
  if (sel) { sel.value = mode(); sel.onchange = e=>{ try { localStorage.setItem(KEY, e.target.value); } catch {} apply(); }; }
  document.getElementById('btnSettings')?.addEventListener('click', ()=>{ if (sel) sel.value = mode(); apply(); });
  apply();
})();
/* v1.2.13 : mode jour plus contrasté (bordures, textes et icônes des boutons plus foncés) ; bouton Face ID en bleu
   (dans les deux modes) pour ne plus le confondre avec « Valider » ni avec le bouton rouge INTERVENTION */
(()=>{
  document.head.insertAdjacentHTML('beforeend', `<style>
.btn.bio,html.jour .btn.bio{background:#1a73e8!important;color:#fff!important}
html.jour{--line:#a9a9b2;--border:#8f8f98;--muted:#4c4c53}
html.jour #form button:not(.on):not(.ib):not(#formCancel):not(#formNext):not(#formSave):not(#f_verif),html.jour .chips span{box-shadow:0 1px 2px rgba(0,0,0,.16)}
html.jour #mrzBtn,html.jour #evAdd,html.jour #geoBtn,html.jour #formNext{color:#0b62d6!important}
html.jour #f_verif{color:#2e2e33!important;border-color:#55555c!important}
html.jour .seg button:not(.on){color:#26262b}
html.jour #sexeSeg button:not(.on){color:#1d1d22}
html.jour #lsvc .sq,html.jour #lsvc .ms{background:#fff!important;border:1px solid #9a9aa2!important;color:#222;box-shadow:0 1px 3px rgba(0,0,0,.14)}
html.jour #lsvc .mh button{color:#0b62d6!important;font-weight:600}
html.jour .addveh,html.jour .addph{border-color:#6f6f78!important;color:#1d1d22}
</style>`);
})();
} catch (e) { console.error('[CIF] theme.js', e); setTimeout(()=>{ throw e; }); }
/* ===== scandebug.js ===== */
try {
/* CIF 2.0 — v1.2.2 / 1.2.4 : mode test de lecture (Réglages › Zone sensible › Mode développeur).
   Activé : le bouton appareil photo propose la photothèque au lieu de l'appareil, et un panneau jaune
   affiche le texte brut lu par le moteur à chaque passage (pour comprendre les erreurs de lecture).
   Rien n'est envoyé : tout reste sur le téléphone. */
(()=>{
  const KEY = 'cifScanDbg', on = () => { try { return localStorage.getItem('cifDev') === '1' && localStorage.getItem(KEY) === '1'; } catch { return false; } };
  const log = [];
  function panel(){
    let p = document.getElementById('scanDbg');
    if (!on()) { p?.remove(); return null; }
    if (!p) {
      const info = document.getElementById('mrzInfo'); if (!info) return null;
      info.insertAdjacentHTML('afterend', `<div id="scanDbg" data-noinv style="margin-top:8px;background:#fff7c2;color:#111;border-radius:8px;padding:8px;font:12px/1.35 ui-monospace,Menlo,monospace;white-space:pre-wrap;word-break:break-all;max-height:320px;overflow:auto"><b>Mode test de lecture</b> — choisis une photo dans la photothèque.</div>`);
      p = document.getElementById('scanDbg');
    }
    return p;
  }
  function show(){
    const p = panel(); if (!p) return;
    p.innerHTML = `<b>Mode test de lecture</b> · ${log.length} passage${log.length > 1 ? 's' : ''}\n` +
      log.map((x, i)=>`— ${i + 1}. ${x.lang} (${x.ms} ms, confiance ${x.conf}) —\n${esc(x.text.trim()) || '(rien)'}`).join('\n');
  }
  /* Le moteur de lecture est chargé à la demande : on observe ses résultats dès qu'il apparaît */
  let real = window.Tesseract;
  const wrap = T => {
    if (!T || T._dbg) return T;
    const cw = T.createWorker;
    T.createWorker = async function(lang, ...a){
      const w = await cw.call(this, lang, ...a), rec = w.recognize.bind(w);
      w.recognize = async (...r)=>{ const t0 = Date.now(), res = await rec(...r);
        if (on()) { log.push({lang, ms: Date.now() - t0, conf: Math.round(res?.data?.confidence ?? 0), text: res?.data?.text || ''}); show(); }
        return res; };
      return w;
    };
    T._dbg = true; return T;
  };
  if (real) wrap(real);
  else Object.defineProperty(window, 'Tesseract', {configurable:true, get(){ return real; }, set(v){ real = wrap(v); }});
  /* Bouton appareil photo : photothèque en mode test, appareil sinon ; on vide le journal à chaque nouvelle photo */
  function sync(){
    const f = document.getElementById('mrzFile'); if (!f) return;
    if (on()) f.removeAttribute('capture'); else f.setAttribute('capture', 'environment');
    panel();
  }
  document.addEventListener('change', e=>{ if (e.target?.id === 'mrzFile' && on()) { log.length = 0; show(); } }, true);
  const _of = openForm; openForm = function(...a){ const r = _of.apply(this, a); log.length = 0; document.getElementById('scanDbg')?.remove(); sync(); return r; };
  window.cifScanSync = sync;
  sync();
})();
} catch (e) { console.error('[CIF] scandebug.js', e); setTimeout(()=>{ throw e; }); }
/* ===== devmode.js ===== */
try {
/* CIF 2.0 — v1.2.4 : mode développeur (Réglages › Zone sensible › Mode développeur, code 3110).
   Regroupe les outils de dépannage : mode test de lecture des pièces, bandeau de diagnostic du clavier,
   informations techniques, vérification des modules, journal d'erreurs, rapport à copier, remises à zéro.
   Le rapport ne contient aucune donnée de fiche (ni nom, ni plaque, ni photo). */
(()=>{
  const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch {} };
  const isDev = () => LS('cifDev') === '1';
  window.cifIsDev = isDev;

  /* ----- Journal d'erreurs (messages techniques seulement, 60 derniers) ----- */
  const ERRK = 'cifErrLog';
  const errs = () => { try { return JSON.parse(LS(ERRK) || '[]'); } catch { return []; } };
  function logErr(kind, msg, src, line){
    const e = errs(); e.push({t: new Date().toLocaleString('fr-FR'), v: APP_VERSION, kind, msg: String(msg || '').slice(0, 300), src: String(src || '').split('/').pop().split('?')[0], line: line || ''});
    LS(ERRK, JSON.stringify(e.slice(-60))); if (isDev()) showErrs();
  }
  window.addEventListener('error', e=>{ if (e.target && e.target !== window && (e.target.src || e.target.href)) logErr('chargement', 'Fichier introuvable', e.target.src || e.target.href); else logErr('erreur', e.message, e.filename, e.lineno); }, true);
  window.addEventListener('unhandledrejection', e=>logErr('promesse', e.reason?.message || e.reason, e.reason?.stack?.split('\n')[1] || '', ''));
  window.cifLogErr = logErr;

  /* ----- Infos techniques ----- */
  async function info(){
    const vv = window.visualViewport, sa = getComputedStyle(document.documentElement);
    const probe = document.createElement('div'); probe.style.cssText = 'position:fixed;top:0;height:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);visibility:hidden'; document.body.appendChild(probe);
    const safe = `${probe.offsetHeight} / ${parseFloat(getComputedStyle(probe).paddingBottom) || 0}`; probe.remove();
    const L = [];
    L.push(`CIF 2.0 v${APP_VERSION} · ${new Date().toLocaleString('fr-FR')}`);
    L.push(`Appareil : ${navigator.userAgent}`);
    L.push(`Écran : ${screen.width}×${screen.height} @${devicePixelRatio} · fenêtre ${innerWidth}×${innerHeight} · visible ${Math.round(vv?.width||0)}×${Math.round(vv?.height||0)} (décalage ${Math.round(vv?.offsetTop||0)}) · encoches ${safe}`);
    L.push(`Mode : ${matchMedia('(display-mode: standalone)').matches || navigator.standalone ? 'appli (écran d\'accueil)' : 'navigateur'} · ${navigator.onLine ? 'en ligne' : 'hors ligne'} · affichage ${document.documentElement.classList.contains('jour') ? 'jour' : 'nuit'} (${LS('cifTheme') || 'auto'})`);
    try { const est = await navigator.storage.estimate(); L.push(`Stockage : ${(est.usage/1048576).toFixed(1)} Mo utilisés / ${(est.quota/1048576).toFixed(0)} Mo · persistant : ${await navigator.storage.persisted?.() ? 'oui' : 'non'}`); } catch {}
    L.push(`Fiches : ${typeof FICHES !== 'undefined' ? FICHES.length : '?'}`);
    try { const reg = await navigator.serviceWorker?.getRegistration(); L.push(`Service hors ligne : ${reg ? (reg.active ? 'actif' : 'en attente') : 'absent'} · contrôle la page : ${navigator.serviceWorker?.controller ? 'oui' : 'non'} · caches : ${(await caches.keys()).join(', ') || 'aucun'}`); } catch {}
    try { const lib = await dbGet('meta','mrzlib').catch(()=>null), fra = await dbGet('meta','ocrfra').catch(()=>null); L.push(`Module de lecture : ${lib ? 'installé (v' + lib.v + ')' : 'non installé'} · lecture permis : ${fra ? 'installée' : 'non installée'}`); } catch {}
    L.push(`Modules : ${(window.CIF?.modules || []).length} déclarés`);
    return L.join('\n');
  }
  async function checkModules(){
    const out = [];
    for (const m of ['version.js', 'app.js', 'share.js', ...(window.CIF?.modules || [])]) {
      try { const r = await fetch(m + (m === 'version.js' || m === 'app.js' ? '' : '?v=' + APP_VERSION)); const t = r.ok ? await r.text() : '';
        out.push(`${r.ok ? '✓' : '✗'} ${m} ${r.ok ? (t.length/1024).toFixed(1) + ' ko' : 'HTTP ' + r.status}`); }
      catch (e) { out.push(`✗ ${m} ${e.message}`); }
    }
    return out.join('\n');
  }
  const errText = () => { const e = errs(); return e.length ? e.map(x=>`${x.t} v${x.v} [${x.kind}] ${x.msg}${x.src ? ' — ' + x.src + (x.line ? ':' + x.line : '') : ''}`).join('\n') : 'Aucune erreur enregistrée.'; };

  /* ----- Réglages : entrée par la zone sensible ----- */
  document.head.insertAdjacentHTML('beforeend', `<style>
#devSec pre{background:#111;color:#cfe3ff;border:1px solid var(--line);border-radius:8px;padding:8px;font:11.5px/1.4 ui-monospace,Menlo,monospace;white-space:pre-wrap;word-break:break-all;max-height:260px;overflow:auto;margin:6px 0}
#devSec .row2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
#devSec .row2 .btn{margin:0}
#devCode{display:flex;gap:8px;margin-top:8px}#devCode input{flex:1;min-width:0}#devCode .btn{width:auto;margin:0;padding:0 16px}
</style>`);
  const wipe = document.getElementById('wipe');
  wipe?.insertAdjacentHTML('afterend', `<button class="btn sec" id="devBtn" style="margin-top:8px">Mode développeur</button><div id="devCode" class="hidden"><input id="devPin" type="password" inputmode="numeric" maxlength="8" placeholder="Code développeur" autocomplete="off"><button class="btn" id="devOk">Valider</button></div><div id="devSec" class="hidden"></div>`);
  const sec = document.getElementById('devSec');
  function build(){
    sec.innerHTML = `<h3>Mode développeur</h3>
      <p class="hint">Outils de dépannage. Le rapport copié ne contient aucune donnée de fiche.</p>
      <label class="switch"><input type="checkbox" id="dvScan"><span class="sw"></span><span class="swl">Test de lecture des pièces (photothèque + texte lu)</span></label>
      <label class="switch"><input type="checkbox" id="dvKb"><span class="sw"></span><span class="swl">Bandeau jaune de diagnostic du clavier</span></label>
      <label class="f">Informations</label><pre id="dvInfo">…</pre>
      <label class="f">Modules</label><pre id="dvMods">Toucher « Vérifier les modules ».</pre>
      <label class="f">Journal d'erreurs</label><pre id="dvErr"></pre>
      <div class="row2"><button class="btn sec" id="dvCopy">Copier le rapport</button><button class="btn sec" id="dvCheck">Vérifier les modules</button></div>
      <div class="row2"><button class="btn sec" id="dvClrErr">Vider le journal</button><button class="btn sec" id="dvCache">Vider le cache et recharger</button></div>
      <div class="row2"><button class="btn sec" id="dvOcr">Réinstaller la lecture</button><button class="btn sec" id="dvOut">Quitter le mode</button></div>
      <p class="hint">« Vider le cache » recharge l'appli depuis internet sans toucher aux fiches. « Réinstaller la lecture » retélécharge le module de lecture des pièces au prochain scan.</p>`;
    const sw = (id, key, after) => { const c = document.getElementById(id); c.checked = LS(key) === '1'; c.onchange = ()=>{ LS(key, c.checked ? '1' : '0'); after?.(); }; };
    sw('dvScan', 'cifScanDbg', ()=>window.cifScanSync?.());
    sw('dvKb', 'cifKbDbg', ()=>window.cifKbSync?.());
    document.getElementById('dvCopy').onclick = async ()=>{
      const txt = `${await info()}\n\n— Modules —\n${await checkModules()}\n\n— Erreurs —\n${errText()}`;
      try { await navigator.clipboard.writeText(txt); toast('Rapport copié : colle-le dans la conversation'); } catch { document.getElementById('dvInfo').textContent = txt; toast('Copie impossible : sélectionne le texte'); }
    };
    document.getElementById('dvCheck').onclick = async ()=>{ const p = document.getElementById('dvMods'); p.textContent = 'Vérification…'; p.textContent = await checkModules(); };
    document.getElementById('dvClrErr').onclick = ()=>{ LS(ERRK, null); showErrs(); toast('Journal vidé'); };
    document.getElementById('dvCache').onclick = async ()=>{
      toast('Rechargement…');
      try { for (const k of await caches.keys()) await caches.delete(k); const reg = await navigator.serviceWorker?.getRegistration(); await reg?.update(); } catch {}
      setTimeout(()=>location.reload(), 400);
    };
    document.getElementById('dvOcr').onclick = async ()=>{ await dbDel('meta','mrzlib').catch(()=>{}); await dbDel('meta','ocrfra').catch(()=>{}); toast('Module de lecture retiré : il sera retéléchargé au prochain scan (réseau nécessaire)'); refresh(); };
    document.getElementById('dvOut').onclick = ()=>{ LS('cifDev', null); LS('cifScanDbg', null); LS('cifKbDbg', null); window.cifScanSync?.(); window.cifKbSync?.(); show(); toast('Mode développeur désactivé'); };
  }
  function showErrs(){ const p = document.getElementById('dvErr'); if (p) p.textContent = errText(); }
  async function refresh(){ const p = document.getElementById('dvInfo'); if (p) p.textContent = await info(); showErrs(); }
  function show(){
    const on = isDev();
    document.getElementById('devBtn').classList.toggle('hidden', on);
    document.getElementById('devCode').classList.add('hidden');
    sec.classList.toggle('hidden', !on);
    if (on) { if (!sec.firstChild) build(); refresh(); } else sec.innerHTML = '';
  }
  document.getElementById('devBtn').onclick = ()=>{ const c = document.getElementById('devCode'); c.classList.remove('hidden'); const p = document.getElementById('devPin'); p.value = ''; p.focus(); };
  const tryCode = ()=>{ const p = document.getElementById('devPin');
    if (p.value === '3110') { LS('cifDev', '1'); show(); toast('Mode développeur activé'); setTimeout(()=>sec.scrollIntoView({block:'start', behavior:'smooth'}), 100); }
    else { p.value = ''; toast('Code incorrect'); navigator.vibrate?.(150); } };
  document.getElementById('devOk').onclick = tryCode;
  document.getElementById('devPin').addEventListener('keydown', e=>{ if (e.key === 'Enter') tryCode(); });
  document.getElementById('btnSettings')?.addEventListener('click', ()=>setTimeout(show, 0));
  show();
})();
} catch (e) { console.error('[CIF] devmode.js', e); setTimeout(()=>{ throw e; }); }
/* ===== chrono.js ===== */
try {
/* CIF 2.0 — v1.2.5 / 1.2.6 : chronologie de l'intervention (CHRONUS).
   Bouton horloge « + » à côté de « Date & heure » : chaque appui ajoute une ligne avec l'heure de l'appui
   (modifiable) et l'événement : choix rapide (SMUR, officier, permanence, levée du corps, pompiers…) ou texte libre
   avec correction orthographique. Main courante : lignes recopiées telles quelles, tout en bas. */
(()=>{
  const PRESETS = ['SMUR sur place', 'Officier sur place', 'Permanence sur place', 'Levée du corps', 'Pompiers sur place', 'Départ des pompiers'];
  const ICON_CLK = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/><path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21" stroke-width="1.6"/></svg>';
  document.head.insertAdjacentHTML('beforeend', `<style>
#evHead{display:flex;align-items:flex-end;justify-content:space-between;gap:8px}
#evHead label.f{flex:1}
#evAdd{flex:0 0 auto;width:40px;height:34px;margin:0 0 3px;border-radius:9px;border:1px solid var(--line);background:var(--panel);color:#7fb3ff;display:flex;align-items:center;justify-content:center;padding:0}
#evAdd:active{transform:scale(.94)}
#evList{display:flex;flex-direction:column;gap:6px;margin-top:6px}
#evList:empty{display:none}
.evRow{display:flex;gap:6px;align-items:center}
.evRow input[type=time]{flex:0 0 104px;min-width:0;padding:8px 6px;text-align:center}
.evRow .evTxt{flex:1;min-width:0;display:flex;gap:6px}
.evRow select,.evRow input[type=text]{flex:1;min-width:0}
.evRow .evDel{flex:0 0 34px;height:40px;border-radius:9px;border:1px solid var(--line);background:transparent;color:#e74c3c;font-size:20px;line-height:1;padding:0}
.evRow .evMenu{flex:0 0 34px;height:40px;border-radius:9px;border:1px solid var(--line);background:var(--panel);color:var(--muted);padding:0;font-size:14px}
</style>`);
  /* ----- Formulaire ----- */
  const dh = $('#f_dateHeure'), lbl = document.querySelector('#form label[for=f_dateHeure]');
  if (!dh || !lbl) return;
  const head = document.createElement('div'); head.id = 'evHead'; lbl.before(head); head.append(lbl);
  head.insertAdjacentHTML('beforeend', `<button type="button" id="evAdd" aria-label="Ajouter un événement à l'heure actuelle" title="Ajouter un événement (heure actuelle)">${ICON_CLK}</button>`);
  dh.insertAdjacentHTML('afterend', '<div id="evList"></div>');
  const list = $('#evList');
  const evs = () => (EDIT.f.evts ||= []);
  const now = () => { const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };
  const opts = v => `<option value="">Événement…</option>${PRESETS.map(p=>`<option${p === v ? ' selected' : ''}>${p}</option>`).join('')}<option value="__autre">Autre (texte libre)…</option>`;
  function rowHTML(e, i){
    const free = e.t && !PRESETS.includes(e.t) || e.free;
    return `<div class="evRow" data-i="${i}"><input type="time" value="${esc(e.h || '')}" data-ek="h">
      <div class="evTxt">${free
        ? `<input type="text" value="${esc(e.t || '')}" data-ek="t" placeholder="Événement" spellcheck="true" autocorrect="on" autocapitalize="sentences" autocomplete="off"><button type="button" class="evMenu" data-ea="menu" aria-label="Choix rapides">▾</button>`
        : `<select data-ek="t">${opts(e.t)}</select>`}</div>
      <button type="button" class="evDel" data-ea="del" aria-label="Supprimer">×</button></div>`;
  }
  function draw(){ if (!EDIT) return; list.innerHTML = (EDIT.f.evts || []).map(rowHTML).join(''); }
  const openPick = sel => { try { sel.showPicker(); } catch { sel.focus(); } };
  $('#evAdd').onclick = ()=>{
    if (!EDIT) return;
    evs().push({h: now(), t: ''}); draw(); draftSoon();
    const sel = list.lastElementChild?.querySelector('select'); if (sel) openPick(sel);
  };
  list.addEventListener('change', e=>{
    const r = e.target.closest('.evRow'); if (!r || !EDIT) return; const ev = evs()[+r.dataset.i]; if (!ev) return;
    if (e.target.tagName === 'SELECT') {
      if (e.target.value === '__autre') { ev.t = ''; ev.free = true; draw(); const inp = list.querySelector(`.evRow[data-i="${r.dataset.i}"] input[type=text]`); inp?.focus(); }
      else { ev.t = e.target.value; delete ev.free; }
    } else if (e.target.dataset.ek === 'h') ev.h = e.target.value;
    draftSoon();
  });
  list.addEventListener('input', e=>{
    const r = e.target.closest('.evRow'); if (!r || !EDIT || e.target.dataset.ek !== 't' || e.target.tagName !== 'INPUT') return;
    const ev = evs()[+r.dataset.i]; if (ev) { ev.t = e.target.value; draftSoon(); }
  });
  list.addEventListener('click', e=>{
    const b = e.target.closest('[data-ea]'); if (!b || !EDIT) return; const i = +b.closest('.evRow').dataset.i, ev = evs()[i];
    if (b.dataset.ea === 'del') { evs().splice(i, 1); draw(); draftSoon(); }
    else if (b.dataset.ea === 'menu' && ev) { ev.free = false; if (!PRESETS.includes(ev.t)) ev.t = ''; draw(); const sel = list.querySelector(`.evRow[data-i="${i}"] select`); if (sel) openPick(sel); }
  });
  { const _of = openForm; openForm = function(...a){ const r = _of.apply(this, a); draw(); return r; }; }
  /* À l'enregistrement : lignes vides retirées, indicateur de saisie libre effacé */
  { const _sf = saveFiche; saveFiche = async function(f){ if (f && f.evts) { f.evts = f.evts.filter(x=>(x.t || '').trim()).map(x=>({h:x.h || '', t:x.t.trim()})); if (!f.evts.length) delete f.evts; } return _sf(f); }; }


  /* ----- Fiche enregistrée : barre « CHRONUS » repliable, tout en bas, avec ajout à l'heure actuelle (v1.2.6) ----- */
  document.head.insertAdjacentHTML('beforeend', `<style>
#chronus{margin-top:14px;border:1px solid var(--line);border-radius:14px;background:var(--panel);overflow:hidden}
#chronus>summary{list-style:none;display:flex;align-items:center;gap:10px;padding:12px 14px;font-weight:700;letter-spacing:.12em;font-size:13px;color:var(--muted);cursor:pointer}
#chronus>summary::-webkit-details-marker{display:none}
#chronus>summary svg{color:#7fb3ff;flex:0 0 auto}
#chronus>summary .n{margin-left:auto;letter-spacing:0;font-weight:600;font-size:12px;background:var(--line);color:var(--fg,#ddd);border-radius:10px;padding:2px 8px}
#chronus>summary .chev{transition:transform .2s;font-size:12px;letter-spacing:0}
#chronus[open]>summary .chev{transform:rotate(90deg)}
#chronus .cl{border-top:1px solid var(--line)}
#chronus .ce{display:flex;gap:12px;padding:10px 14px;border-bottom:1px solid var(--line);font-size:16px}
#chronus .ce b{flex:0 0 52px;font-variant-numeric:tabular-nums}
#chronus .cadd{display:flex;gap:6px;padding:10px 14px;align-items:center}
#chronus .cadd select,#chronus .cadd input{flex:1;min-width:0}
#chronus .cadd .btn{width:auto;margin:0;padding:0 14px;height:40px}
#chronus .empty{padding:10px 14px;color:var(--muted);font-size:14px}
</style>`);
  const CLK = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  let chrOpen = false;
  function chronus(f){
    document.getElementById('chronus')?.remove();
    const body = document.getElementById('detBody'); if (!body) return;
    const L = (f.evts || []).filter(x=>(x.t || '').trim());
    body.insertAdjacentHTML('beforeend', `<details id="chronus"${chrOpen ? ' open' : ''}><summary>${CLK}CHRONUS<span class="n">${L.length}</span><span class="chev">▶</span></summary>
      <div class="cl">${L.length ? L.map(x=>`<div class="ce"><b>${esc(x.h || '—')}</b><span>${esc(x.t)}</span></div>`).join('') : '<div class="empty">Aucun événement noté.</div>'}</div>
      <div class="cadd"><select id="chrSel">${opts('')}</select><input id="chrTxt" type="text" class="hidden" placeholder="Événement" spellcheck="true" autocorrect="on" autocapitalize="sentences" autocomplete="off"><button type="button" class="btn" id="chrAdd">+ ${now()}</button></div></details>`);
    const d = document.getElementById('chronus'), sel = document.getElementById('chrSel'), txt = document.getElementById('chrTxt'), add = document.getElementById('chrAdd');
    d.addEventListener('toggle', ()=>{ chrOpen = d.open; });
    const tick = setInterval(()=>{ if (!document.body.contains(add)) return clearInterval(tick); add.textContent = '+ ' + now(); }, 15000);
    sel.onchange = ()=>{ if (sel.value === '__autre') { sel.classList.add('hidden'); txt.classList.remove('hidden'); txt.focus(); } };
    add.onclick = async ()=>{
      const t = (sel.value && sel.value !== '__autre' ? sel.value : txt.value).trim();
      if (!t) { toast('Choisis ou écris l\'événement'); return; }
      (f.evts ||= []).push({h: now(), t}); await saveFiche(f); chrOpen = true; chronus(f); toast('Événement ajouté');
    };
  }
  { const _od = openDetail; openDetail = async function(f, ...a){ const r = await _od(f, ...a); if (DETAIL === f.id) chronus(f); return r; }; }
  /* ----- Main courante : tout en bas, brut ----- */
  const lines = f => (f.evts || []).filter(x=>(x.t || '').trim()).map(x=>`${x.h ? x.h + ' ' : ''}${x.t.trim()}`);
  { const _mc = mcText; mcText = function(f, ...a){ const t = _mc(f, ...a), L = lines(f); return typeof t === 'string' && L.length ? `${t.replace(/\s+$/,'')}\n\n${L.join('\n')}` : t; }; }
  /* ----- Fiche ouverte et mail ----- */
  { const _fs = ficheSections; ficheSections = function(f){ const S = _fs(f); const L = (f.evts || []).filter(x=>(x.t || '').trim()); if (L.length) S.push(['Chronologie', L.map(x=>[x.h || '—', x.t])]); return S; }; }
})();
} catch (e) { console.error('[CIF] chrono.js', e); setTimeout(()=>{ throw e; }); }
