'use strict';
/* CIF 2.0 — v2.0.7 : galerie.js, bouton « Vers la galerie » dans le bloc Photos d'une fiche enregistrée.
   Une appli web ne peut pas écrire seule dans la galerie : le bouton ouvre la feuille de partage avec
   uniquement les photos (sans texte), où l'on touche « Enregistrer X images ». Rien n'est envoyé sur internet. */
try {
(()=>{
  const body = document.getElementById('detBody'); if (!body) return;
  document.head.insertAdjacentHTML('beforeend', `<style>
#detBody .togal{margin-left:auto;margin-right:10px;border:0;border-radius:8px;background:#1a73e8;color:#fff;font-size:13px;font-weight:600;padding:5px 10px}
#detBody .togal:disabled{opacity:.5}
</style>`);
  let files = [];
  /* photos préparées dès l'affichage de la fiche : le partage part tout de suite au toucher (iOS l'exige) */
  async function prepare(panel){
    const ids = [...panel.querySelectorAll('.ph[data-id]')].map(e=>e.dataset.id);
    const f = FICHES.find(x=>(x.photos||[]).includes(ids[0])) || {};
    const base = ((f.nom||'fiche') + '_' + (f.prenom||'')).replace(/[^\w-]+/g,'_').replace(/_+$/,'');
    const out = [];
    for (const [i, id] of ids.entries()) { const b = await photoBuf(id); if (b) out.push(new File([b], `${base}_${i+1}.jpg`, {type:'image/jpeg'})); }
    return out;
  }
  function add(){
    const panel = [...body.querySelectorAll('section.panel')].find(s=>s.querySelector('.photos .ph'));
    if (!panel || panel.querySelector('.togal')) return;
    const h = panel.querySelector('h4'); if (!h) return;
    h.style.display = 'flex'; h.style.alignItems = 'center';
    h.lastElementChild.insertAdjacentHTML('beforebegin', '<button type="button" class="togal" disabled>Vers la galerie</button>');
    const b = h.querySelector('.togal'); files = [];
    prepare(panel).then(fs=>{ files = fs; b.disabled = !fs.length; }).catch(()=>{});
  }
  new MutationObserver(add).observe(body, {childList:true, subtree:true});
  body.addEventListener('click', async e=>{
    if (!e.target.closest('.togal')) return;
    e.stopPropagation();
    if (!files.length) return;
    if (!(navigator.canShare && navigator.canShare({files}))) return toast('Partage de photos impossible sur cet appareil');
    try { await navigator.share({files}); }
    catch (err) { if (err.name !== 'AbortError') toast('Partage impossible'); return; }
    toast('Une fois copiées sur le PC, supprime-les de la galerie et vide « Supprimés récemment »');
  }, true);
})();
} catch (e) { console.error('[CIF] galerie', e); setTimeout(()=>{ throw e; }); }
