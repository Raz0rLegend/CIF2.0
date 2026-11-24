'use strict';
/* CIF 2.0 — galerie.js : photos.
   v2.0.7 : bouton « Vers la galerie » dans le bloc Photos d'une fiche enregistrée.
   v2.0.8 : photos du contrôle prises à la volée (liste et bandeau d'intervention), partagées entre les personnes du même contrôle.
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
/* ===== photos du contrôle ===== */
try {
/* v2.0.8 — Photos du contrôle (lieux, véhicules, dégâts…), prises à la volée sans ouvrir la fiche :
   • bouton appareil photo sur chaque fiche de la liste : la photo va sur cette fiche ET sur toutes les personnes
     reliées par « même contrôle » (chaque fiche a sa propre copie : supprimer une fiche ne retire rien aux autres) ;
   • bouton appareil photo sur le bandeau rouge d'intervention : la photo attend la fiche, sans l'ouvrir
     (l'heure de la fiche reste celle de son ouverture), et y est jointe quand on ouvre la fiche depuis le bandeau ;
   • une personne ajoutée ensuite au même contrôle reçoit une copie des photos du contrôle.
   Les photos prises depuis la fiche (bouton Photos, « à photographier » de l'accident : documents, permis…)
   restent propres à la fiche. Repère : f.ctrlPh = {id de la photo: clé commune aux copies}. */
(()=>{
  const CAM = ICON.cam;
  document.head.insertAdjacentHTML('beforeend', `<style>
.ivBan .ivCam{display:flex;align-items:center;gap:3px;color:#ffd0cc;padding:6px;font-size:13px}
.ivBan .ivCam svg{width:22px;height:22px}
</style>`);
  document.body.insertAdjacentHTML('beforeend', '<input type="file" id="ctrlCam" accept="image/*" hidden>');
  const inp = document.getElementById('ctrlCam');
  let onPick = null;
  const shoot = fn => { onPick = fn; if (window.cifIsDev?.()) inp.removeAttribute('capture'); else inp.setAttribute('capture', 'environment'); inp.click(); };
  inp.addEventListener('change', async ()=>{ const f = inp.files[0], fn = onPick; inp.value = ''; onPick = null; if (f && fn) { try { await fn(await shrink(f)); } catch (e) { console.error('[CIF] photo', e); toast('La photo n\'a pas pu être ajoutée'); } } });

  /* personnes reliées par « même contrôle » (dans les deux sens, de proche en proche) */
  function group(f){
    const ids = new Set([f.id]); let grew = true;
    while (grew) { grew = false;
      for (const x of FICHES) {
        if (ids.has(x.id)) continue;
        if ((x.avec && ids.has(x.avec)) || FICHES.some(y=>ids.has(y.id) && y.avec === x.id)) { ids.add(x.id); grew = true; }
      }
    }
    return [...ids].map(id=>FICHES.find(x=>x.id === id)).filter(Boolean);
  }
  const mark = (f, id, key) => { f.ctrlPh = {...(f.ctrlPh||{}), [id]:key}; };

  /* ----- Liste : bouton appareil photo à côté des actions ----- */
  { const _r = render; render = function(){ _r();
    document.querySelectorAll('#list .card[data-id] .acts').forEach(a=>{ if (!a.querySelector('[data-act=cam]')) a.insertAdjacentHTML('afterbegin', `<button class="ib" data-act="cam" aria-label="Photo du contrôle">${CAM}</button>`); });
    ivCams();
  }; }
  document.getElementById('list').addEventListener('click', e=>{
    const b = e.target.closest('[data-act=cam]'); if (!b) return;
    e.stopPropagation();
    const f = FICHES.find(x=>x.id === b.closest('.card')?.dataset.id); if (!f) return;
    shoot(async blob=>{
      const g = group(f), key = uid();
      for (const x of g) {
        const id = await savePhoto(blob);
        x.photos = [...(x.photos||[]), id]; mark(x, id, key); await saveFiche(x);
        if (DRAFT?.f?.id === x.id) { DRAFT.f.photos = [...(DRAFT.f.photos||[]), id]; mark(DRAFT.f, id, key); await saveDraft(KEY, DRAFT); }
      }
      render();
      toast(g.length > 1 ? `Photo ajoutée au contrôle (${g.length} personnes)` : 'Photo ajoutée à la fiche');
    });
  }, true);

  /* ----- Bandeau d'intervention : photos en attente de la fiche ----- */
  let PEND = {};
  const loadP = async () => { try { PEND = (await dbGet('meta','ivPh')) || {}; } catch { PEND = {}; } };
  const saveP = () => dbPut('meta', PEND, 'ivPh').catch(()=>{});
  function ivCams(){
    document.querySelectorAll('#list .ivBan[data-iv]').forEach(b=>{
      if (b.querySelector('.ivCam')) return;
      const n = (PEND[b.dataset.iv]||[]).length;
      b.querySelector('.ivDrop')?.insertAdjacentHTML('beforebegin', `<button type="button" class="ivCam" aria-label="Photo de l'intervention">${CAM}${n ? `<b>${n}</b>` : ''}</button>`);
    });
  }
  document.getElementById('list').addEventListener('click', async e=>{
    const ban = e.target.closest('.ivBan'); if (!ban) return;
    const iv = ban.dataset.iv;
    if (e.target.closest('.ivCam')) {
      e.stopPropagation();   /* la photo n'ouvre pas la fiche : l'heure de la fiche reste celle de son ouverture */
      return shoot(async blob=>{ const id = await savePhoto(blob); PEND[iv] = [...(PEND[iv]||[]), id]; await saveP(); render(); toast(`Photo gardée pour l'intervention (${PEND[iv].length})`); });
    }
    if (e.target.closest('.ivDrop')) {
      /* intervention annulée : ses photos en attente sont effacées */
      for (let i = 0; i < 40; i++) { await new Promise(r=>setTimeout(r, 500));
        const list = await dbGet('meta','interv').catch(()=>null) || [];
        if (!list.some(x=>x.id === iv)) { for (const id of PEND[iv]||[]) await removePhoto(id); delete PEND[iv]; await saveP(); return; }
      }
    }
  }, true);
  /* ouverture de la fiche depuis le bandeau (après le module intervention) : photos jointes */
  document.getElementById('list').addEventListener('click', e=>{
    const ban = e.target.closest('.ivBan'); if (!ban || !e.target.closest('.ivOpen')) return;
    const iv = ban.dataset.iv, ids = PEND[iv]||[];
    if (!ids.length || EDIT?.f?.intervId !== iv) return;
    for (const id of ids) if (!EDIT.f.photos.includes(id)) { EDIT.f.photos.push(id); mark(EDIT.f, id, id); }
    renderPhotos(); draftSoon();
  });
  { const _cf = closeForm; closeForm = async function(saveIt){
    const iv = EDIT?.f?.intervId;
    await _cf(saveIt);
    if (saveIt && !EDIT && iv && PEND[iv]) { delete PEND[iv]; await saveP(); }   /* photos désormais rangées dans la fiche */
  }; }

  /* ----- Personne ajoutée au même contrôle : copie des photos du contrôle ----- */
  { const _rv = renderVehicles; renderVehicles = function(...a){ const r = _rv.apply(this, a); copyCtrl(); return r; }; }
  async function copyCtrl(){
    const E = EDIT; if (!E || !E.isNew || E.ctrlDone || !E.f.avec) return;
    const src = FICHES.find(x=>x.id === E.f.avec); if (!src) return;
    E.ctrlDone = true;
    const have = new Set(Object.values(E.f.ctrlPh||{})), todo = new Map();
    for (const x of group(src)) for (const id of x.photos||[]) { const k = x.ctrlPh?.[id]; if (k && !have.has(k) && !todo.has(k)) todo.set(k, id); }
    if (!todo.size) return;
    for (const [k, id] of todo) {
      const b = await photoBuf(id); if (!b || EDIT !== E) continue;
      const nid = await savePhoto(new Blob([b], {type:'image/jpeg'}));
      E.f.photos.push(nid); E.added.push(nid); mark(E.f, nid, k);
    }
    if (EDIT === E) { renderPhotos(); draftSoon(); toast(`${todo.size} photo${todo.size>1?'s':''} du contrôle reprise${todo.size>1?'s':''}`); }
  }

  loadP().then(()=>{ if (KEY && !EDIT) render(); });
})();
} catch (e) { console.error('[CIF] photos du contrôle', e); setTimeout(()=>{ throw e; }); }
