'use strict';
/* CIF 2.0 — v1.1.17 / 1.1.18 : champ touché (ou « Suivant » du clavier) recentré dans la partie visible de l'écran.
   Champ à suggestions (ville, pays, marque, couleur, motif…) : placé en haut de la zone visible pour que
   la liste des choix s'ouvre en entier entre le champ et le clavier. Une marge sous le formulaire
   permet de remonter même les derniers champs. */
(()=>{
  document.head.insertAdjacentHTML('beforeend', '<style>#form .body.kb{padding-bottom:62vh!important}</style>');
  const SG = new Set(['f_adrVille','f_naisVille','f_lieuControle','f_nationalite']);
  const ok = el => el?.matches?.('#form .body input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=button]):not([type=file]):not([type=range]), #form .body textarea, #form .body select');
  let cur = null, t = null, off = null, ts = [];
  /* hauteur de la barre d'état (heure, batterie) qui recouvre le haut quand iOS décale l'écran */
  const probe = document.createElement('div'); probe.style.cssText = 'position:fixed;top:0;height:env(safe-area-inset-top);width:0;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  /* partie réellement visible du formulaire : sous la barre d'état et l'en-tête, au-dessus du bandeau Annuler / Enregistrer et du clavier */
  function zone(host){
    const vv = window.visualViewport, hr = host.getBoundingClientRect(), sa = probe.offsetHeight || 0;
    return [Math.max(hr.top, (vv ? vv.offsetTop : 0) + sa), Math.min(vv ? vv.offsetTop + vv.height : innerHeight, hr.bottom)];
  }
  function place(){
    const el = cur; if (!el || document.activeElement !== el) return;
    const host = el.closest('.body'); if (!host) return;
    const [top, bot] = zone(host), r = el.getBoundingClientRect();
    const lbl = el.closest('.cc')?.querySelector('label.f') || (el.previousElementSibling?.matches?.('label.f') ? el.previousElementSibling : null);
    const head = lbl ? Math.max(0, r.top - lbl.getBoundingClientRect().top) : 0;
    const sg = !!el.dataset.sg || SG.has(el.id);
    const target = sg || r.height > (bot - top) / 2 ? top + 8 + head : top + (bot - top - r.height) / 2;
    const d = Math.round(r.top - target);
    if (Math.abs(d) > 6) host.scrollTo({top: host.scrollTop + d, behavior: 'instant'});
    /* la liste de suggestions se recale sous le champ, avec toute la place jusqu'au clavier */
    if (sg) setTimeout(()=>{ try { if (sgInput === el && !sgBox.classList.contains('hidden')) sgPlace(el); } catch(e){} }, 40);
  }
  const later = ms => { clearTimeout(t); t = setTimeout(place, ms); };
  document.addEventListener('focusin', e=>{
    if (!ok(e.target)) return;
    clearTimeout(off); cur = e.target; cur.closest('.body')?.classList.add('kb');
    /* iOS fait défiler lui-même le formulaire pendant l'ouverture du clavier (juste au-dessus du clavier,
       donc souvent derrière le bandeau du bas) : on repasse derrière lui plusieurs fois */
    ts.forEach(clearTimeout); ts = [120, 380, 700, 1050, 1500].map(ms=>setTimeout(place, ms));
  });
  document.addEventListener('focusout', ()=>{
    clearTimeout(off);
    off = setTimeout(()=>{ if (!ok(document.activeElement)) { document.querySelectorAll('#form .body.kb').forEach(b=>b.classList.remove('kb')); cur = null; } }, 300);
  });
  /* le clavier s'ouvre ou change de taille : on recale */
  const vvChange = ()=>{ if (cur && document.activeElement === cur) later(60); };
  window.visualViewport?.addEventListener('resize', vvChange); window.visualViewport?.addEventListener('scroll', vvChange);
  /* en tapant dans un champ à suggestions, la liste apparaît : on remonte le champ si besoin */
  document.addEventListener('input', e=>{ if (e.target === cur && (cur.dataset.sg || SG.has(cur.id))) later(30); });
})();
