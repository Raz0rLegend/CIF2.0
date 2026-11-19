'use strict';
/* CIF 2.0 — v1.1.17 à 1.1.20 : champ touché (ou « Suivant » du clavier) recentré dans la partie visible de l'écran.
   Champ à suggestions (ville, pays, marque, couleur, motif…) : placé en haut de la zone visible pour que
   la liste des choix s'ouvre en entier entre le champ et le clavier. Une marge sous le formulaire
   permet de remonter même les derniers champs.
   1.1.19 / 1.1.20 : clavier ouvert, la fiche prend exactement la hauteur visible au-dessus du clavier (en-tête en haut,
   Annuler / Enregistrer juste au-dessus du clavier) et le décalage de page qu'iOS ajoute est annulé. */
(()=>{
  document.head.insertAdjacentHTML('beforeend', '<style>#form .body.kb{padding-bottom:62vh!important}#form.kbfit footer{padding-bottom:0!important}</style>');
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
  /* la fiche suit la partie visible (visualViewport) tant qu'un champ est en cours de saisie */
  const form = document.getElementById('form'), vv = window.visualViewport;
  function fit(){
    if (!form || !vv) return;
    if (cur && !form.classList.contains('hidden')) {
      form.classList.add('kbfit');
      form.style.top = '0px'; form.style.height = Math.round(vv.height) + 'px'; form.style.bottom = 'auto';
    } else if (form.classList.contains('kbfit')) {
      form.classList.remove('kbfit'); form.style.top = form.style.height = form.style.bottom = '';
    }
  }
  /* iOS « pousse » toute la page vers le haut pour montrer le champ : on la remet en place (la fiche tient déjà dans la zone visible) */
  function unpan(){
    if (!vv || (vv.offsetTop < 1 && scrollY < 1)) return;
    const L = document.getElementById('list'), s = L ? L.scrollTop : 0;
    window.scrollTo(0, 0); if (L) L.scrollTop = s;
  }
  function place(){
    fit(); unpan();
    const el = cur; if (!el || document.activeElement !== el) return;
    const host = el.closest('.body'); if (!host) return;
    const [top, bot] = zone(host), r = el.getBoundingClientRect();
    const lbl = el.closest('.cc')?.querySelector('label.f') || (el.previousElementSibling?.matches?.('label.f') ? el.previousElementSibling : null);
    const head = lbl ? Math.max(0, r.top - lbl.getBoundingClientRect().top) : 0;
    const sg = !!el.dataset.sg || SG.has(el.id);
    const target = sg || r.height > (bot - top) / 2 ? top + 8 + head : top + (bot - top - r.height) / 2;
    const d = Math.round(r.top - target);
    if (Math.abs(d) > 6) host.scrollTop = host.scrollTop + d;
    /* la liste de suggestions se recale sous le champ, avec toute la place jusqu'au clavier */
    if (dbg) dbg.textContent = `v${APP_VERSION} vv ${Math.round(vv?.offsetTop||0)}+${Math.round(vv?.height||0)} ih ${innerHeight} sy ${Math.round(scrollY)} zone ${Math.round(top)}-${Math.round(bot)} champ ${Math.round(r.top)}→${Math.round(target)} st ${Math.round(host.scrollTop)}`;
    if (sg) setTimeout(()=>{ try { if (sgInput === el && !sgBox.classList.contains('hidden')) sgPlace(el); } catch(e){} }, 40);
  }
  /* diagnostic : 5 appuis rapides sur le titre de la fiche affichent les mesures (pour régler le placement) */
  let dbg = null, taps = [];
  form?.querySelector('.top h2')?.addEventListener('click', ()=>{
    const n = Date.now(); taps = taps.filter(x=>n - x < 1500).concat(n);
    if (taps.length >= 5) { taps = []; if (dbg) { dbg.remove(); dbg = null; } else { dbg = document.createElement('div'); dbg.style.cssText = 'position:absolute;left:4px;right:4px;top:calc(env(safe-area-inset-top) + 2px);z-index:99;background:#ff0;color:#000;font:12px monospace;padding:3px;pointer-events:none'; dbg.textContent = 'diagnostic actif'; form.appendChild(dbg); } }
  });
  const later = ms => { clearTimeout(t); t = setTimeout(place, ms); };
  document.addEventListener('focusin', e=>{
    if (!ok(e.target)) return;
    clearTimeout(off); cur = e.target; cur.closest('.body')?.classList.add('kb'); fit();
    /* iOS fait défiler lui-même le formulaire pendant l'ouverture du clavier (juste au-dessus du clavier,
       donc souvent derrière le bandeau du bas) : on repasse derrière lui plusieurs fois */
    ts.forEach(clearTimeout); ts = [120, 380, 700, 1050, 1500].map(ms=>setTimeout(place, ms));
  });
  document.addEventListener('focusout', ()=>{
    clearTimeout(off);
    off = setTimeout(()=>{ if (!ok(document.activeElement)) { document.querySelectorAll('#form .body.kb').forEach(b=>b.classList.remove('kb')); cur = null; fit(); } }, 300);
  });
  /* le clavier s'ouvre ou change de taille : on recale */
  const vvChange = ()=>{ fit(); if (cur && document.activeElement === cur) later(60); };
  window.visualViewport?.addEventListener('resize', vvChange); window.visualViewport?.addEventListener('scroll', vvChange);
  /* en tapant dans un champ à suggestions, la liste apparaît : on remonte le champ si besoin */
  document.addEventListener('input', e=>{ if (e.target === cur && (cur.dataset.sg || SG.has(cur.id))) later(30); });
})();
