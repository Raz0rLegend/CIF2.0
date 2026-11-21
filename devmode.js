'use strict';
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
