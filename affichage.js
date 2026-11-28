'use strict';
/* CIF 2.0 — v2.0.0 : affichage.js, regroupement de modules (écran principal, main courante, lieux connus, documents).
   Modules d'origine, dans l'ordre de chargement : ecran.js, mc.js, lieux.js, docs.js.
   Chaque module reste isolé : une erreur dans l'un n'empêche pas les suivants de se charger. */
/* ===== ecran.js ===== */
try {
/* CIF 2.0 — v1.0.21 : barres du bas fixes pendant le défilement
   Sur iPhone, c'était toute la page qui défilait, et iOS déplaçait les barres « fixes »
   (onglets CIF/CI, Tout/Archiver/Envoyer, bouton +) avec elle, surtout après le clavier.
   Désormais la page ne bouge plus : l'écran principal occupe tout l'écran (en-tête en haut,
   barres en bas) et seule la liste des fiches défile entre les deux. */
(()=>{
  document.head.insertAdjacentHTML('beforeend', `<style>
html,body{height:100%;overflow:hidden;overscroll-behavior:none}
#app:not(.hidden){position:fixed;inset:0;display:flex;flex-direction:column;overflow:hidden}
#app > *:not(#list){flex:none}
#app > header{position:relative}
#list{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y}
</style>`);
  const list = () => document.getElementById('list');
  /* Les retours en haut de liste (changement d'onglet, filtre, archives) visent maintenant la liste */
  const _st = window.scrollTo.bind(window);
  window.scrollTo = function(a, b){
    _st.apply(window, arguments);
    const top = typeof a === 'object' && a ? a.top : b;
    if (top === 0 && list()) list().scrollTop = 0;
  };
  /* Si iOS laisse malgré tout l'écran décalé après le clavier, on le recale */
  const vv = window.visualViewport; if (!vv) return;
  const typing = () => { const a = document.activeElement; return !!(a && a.matches && a.matches('input,textarea,select')); };
  const fix = () => { if (!typing() && vv.scale < 1.05 && (vv.offsetTop > 1 || window.scrollY > 1)) _st(0, 0); };
  const later = () => [150, 500, 1000].forEach(t=>setTimeout(fix, t));
  vv.addEventListener('resize', fix); vv.addEventListener('scroll', fix);
  document.addEventListener('focusout', later);
  document.addEventListener('visibilitychange', ()=>{ if (!document.hidden) later(); });
  window.addEventListener('pageshow', later);
})();
} catch (e) { console.error('[CIF] ecran.js', e); setTimeout(()=>{ throw e; }); }
/* ===== mc.js ===== */
try {
/* CIF 2.0 — v1.0.21 : main courante, antécédents
   « le nommé DUPONT Jean » si l'identité est établie sur pièce officielle,
   « le disant se nommer DUPONT Jean » si elle est établie sur ses dires (au lieu de « l'intéressé »). */
(()=>{
  const _mx = mcExtra;
  mcExtra = function(f){
    const t = _mx(f); if (!t) return t;
    const nm = [(f.nom||'').toUpperCase(), f.prenom].filter(Boolean).join(' '); if (!f.nom) return t;
    const F = f.sexe === 'F', le = F ? "l'intéressée" : "l'intéressé";
    const who = (f.docMode === 'Sur dires' ? (F ? 'la disant se nommer ' : 'le disant se nommer ') : (F ? 'la nommée ' : 'le nommé ')) + nm;
    return t.replace(`, ${le} nous répondait`, `, ${who} nous répondait`);
  };
})();
} catch (e) { console.error('[CIF] mc.js', e); setTimeout(()=>{ throw e; }); }
/* ===== lieux.js ===== */
try {
/* CIF 2.0 — lieux connus ajoutés (nom, coordonnées GPS, rayon en mètres).
   Une position relevée dans le rayon donne directement ce nom comme lieu du contrôle. */
GEO_PLACES.push(
  {n:'Place du Casino', lat:43.7395761, lng:7.4272088, r:15},
  {n:'Place d\'Armes', lat:43.7324213, lng:7.4189224, r:20},
  {n:'Point 3', lat:43.7305862, lng:7.4246436, r:10}
);
} catch (e) { console.error('[CIF] lieux.js', e); setTimeout(()=>{ throw e; }); }
/* ===== docs.js ===== */
try {
/* CIF 2.0 — v1.0.24 : documents du véhicule (carte grise, assurance)
   Deux cases sous chaque véhicule : vertes par défaut (présentées), un appui les passe en rouge (non présentées).
   La main courante du conducteur s'adapte : « dont les documents étaient en règle » ou
   « dont le certificat d'immatriculation n'était pas présenté », etc. */
(()=>{
  const DOCS = [['cg','Carte grise',"le certificat d'immatriculation"], ['as','Assurance',"le certificat d'assurance"]];
  const ok = (v, k) => v?.[k] !== 'ko';
  document.head.insertAdjacentHTML('beforeend', `<style>
.vdocs{display:flex;gap:8px;margin-top:12px}
.vdocs button{flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;padding:8px 6px;border-radius:10px;border:1.5px solid #2e7d4f;background:#173a26;color:#bff0d2;font-size:15px;font-weight:600}
.vdocs button small{font-size:12px;font-weight:500;opacity:.85}
.vdocs button.ko{border-color:#b3261e;background:#4a1512;color:#ffd0cc}
</style>`);
  const btn = (v, i, [k, l]) => `<button type="button" data-vdoc="${k}" data-i="${i}" class="${ok(v,k) ? '' : 'ko'}">${ok(v,k) ? '✓' : '✗'} ${l}<small>${ok(v,k) ? 'présentée' : 'non présentée'}</small></button>`;
  { const _rv = renderVehicles; renderVehicles = function(){
    _rv();
    document.querySelectorAll('#vehicles .veh').forEach((el, i)=>{
      const v = EDIT.f.vehicules[i]; if (!v) return;
      el.insertAdjacentHTML('beforeend', `<label class="f">Documents présentés</label><div class="vdocs">${DOCS.map(d=>btn(v, i, d)).join('')}</div>`);
    });
  }; }
  $('#vehicles').addEventListener('click', e=>{
    const b = e.target.closest('[data-vdoc]'); if (!b || !EDIT) return;
    const v = EDIT.f.vehicules[+b.dataset.i]; if (!v) return;
    const k = b.dataset.vdoc; if (ok(v, k)) v[k] = 'ko'; else delete v[k];
    b.outerHTML = btn(v, +b.dataset.i, DOCS.find(d=>d[0] === k));
    draftSoon();
  });
  /* Phrase de fin pour la main courante */
  window.vehDocsPhrase = (v, own) => {
    const miss = DOCS.filter(([k])=>!ok(v, k)).map(d=>d[2]);
    if (!miss.length) return 'dont les documents de bord étaient en règle';
    return miss.length === 1 ? `dont ${miss[0]} n'était pas présenté` : `dont ${miss.join(' et ')} n'étaient pas présentés`;
  };
  const docsTxt = v => DOCS.every(([k])=>ok(v, k)) ? 'Présentés (carte grise et assurance)' : DOCS.map(([k, l])=>`${l} ${ok(v, k) ? 'présentée' : 'NON présentée'}`).join(' · ');
  /* Envoi : ligne « Documents » dans chaque véhicule */
  { const _fs = ficheSections; ficheSections = function(f){
    const S = _fs(f);
    for (const s of S) { const m = /^Véhicule (\d+)/.exec(s[0]); const v = m && (f.vehicules||[])[+m[1]-1]; if (v) s[1].push(['Documents', docsTxt(v)]); }
    return S; }; }
  /* Fiche ouverte : même ligne sous chaque véhicule */
  { const _od = openDetail; openDetail = async function(f){ await _od(f); if (DETAIL !== f.id) return;
    $('#detBody').querySelectorAll('section.panel').forEach(p=>{
      const m = /^Véhicule (\d+)/.exec(p.querySelector('h4 span')?.textContent || ''); const v = m && (f.vehicules||[])[+m[1]-1]; if (!v) return;
      const bad = !DOCS.every(([k])=>ok(v, k));
      p.insertAdjacentHTML('beforeend', `<div style="padding:8px 12px;font-size:14px;border-top:1px solid var(--line);color:${bad ? '#ff8a80' : '#9fdcb8'}">${bad ? '✗' : '✓'} ${esc(docsTxt(v))}</div>`);
    });
  }; }
})();
} catch (e) { console.error('[CIF] docs.js', e); setTimeout(()=>{ throw e; }); }
