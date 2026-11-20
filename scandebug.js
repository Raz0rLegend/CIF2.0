'use strict';
/* CIF 2.0 — v1.2.2 : mode test de lecture (Réglages › Lecture des pièces).
   Activé : le bouton appareil photo propose la photothèque au lieu de l'appareil, et un panneau jaune
   affiche le texte brut lu par le moteur à chaque passage (pour comprendre les erreurs de lecture).
   Rien n'est envoyé : tout reste sur le téléphone. */
(()=>{
  const KEY = 'cifScanDbg', on = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
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
  /* Réglages */
  const sec = [...document.querySelectorAll('#settings h3')].find(x=>x.textContent === 'Sécurité');
  sec?.insertAdjacentHTML('beforebegin', `<h3>Lecture des pièces</h3>
    <label class="switch" style="margin-top:6px"><input type="checkbox" id="s_scanDbg"><span class="sw"></span><span class="swl">Mode test (photothèque + texte lu)</span></label>
    <p class="hint">Le bouton appareil photo de la fiche ouvre la photothèque et un panneau jaune montre ce que le moteur a lu. Tout reste sur le téléphone.</p>`);
  const cb = document.getElementById('s_scanDbg');
  if (cb) { cb.checked = on(); cb.onchange = e=>{ try { localStorage.setItem(KEY, e.target.checked ? '1' : '0'); } catch {} sync(); }; }
  document.getElementById('btnSettings')?.addEventListener('click', ()=>{ if (cb) cb.checked = on(); });
  sync();
})();
