'use strict';
/* CIF 2.0 — v1.2.1 : un véhicule ajouté après coup sur une fiche (contrôle piéton devenu routier)
   rattache automatiquement les personnes du même contrôle comme passagers de ce véhicule.
   Ne sont pas touchées : celles qui ont leur propre véhicule, celles déjà passagères d'un autre véhicule,
   celles marquées « Ce n'est pas un passager ». Si le véhicule du conducteur est modifié, ses passagers suivent. */
(()=>{
  const isLM = p => /^(lm|lui[\s-]?m[eê]me|elle[\s-]?m[eê]me)$/.test(norm(p).replace(/\./g,''));
  const vehOf = drv => { const v = (drv.vehicules||[])[0]; if (!v) return null; const r = structuredClone(v); if (isLM(r.proprio)) r.proprio = ficheName(drv); return r; };
  /* « Ce n'est pas un passager » : choix retenu, la personne ne sera plus rattachée automatiquement */
  document.addEventListener('click', e=>{ if (e.target?.id === 'passOff' && EDIT?.f) EDIT.f.notPass = true; }, true);
  /* toutes les fiches reliées par « même contrôle » (dans les deux sens, de proche en proche) */
  function group(f){
    const ids = new Set([f.id]); let grew = true;
    while (grew) { grew = false;
      for (const x of FICHES) {
        if (ids.has(x.id)) continue;
        if ((x.avec && ids.has(x.avec)) || FICHES.some(y=>ids.has(y.id) && y.avec === x.id)) { ids.add(x.id); grew = true; }
      }
    }
    ids.delete(f.id); return [...ids].map(id=>FICHES.find(x=>x.id === id)).filter(Boolean);
  }
  let busy = false;
  const _save = saveFiche;
  saveFiche = async function(f){
    await _save(f);
    if (busy || !f || f.passager || !(f.vehicules||[]).length) return;
    busy = true;
    try {
      const v = vehOf(f), name = ficheName(f); let added = 0, changed = 0;
      for (const x of group(f)) {
        if (x.notPass || (x.vehicules||[]).length) continue;
        if (x.passager && x.vehRef && x.avec !== f.id) continue;              /* passager d'un autre véhicule */
        if (x.qualite && x.qualite !== 'Passager') continue;                   /* témoin, victime… */
        const was = x.passager && x.avec === f.id && x.vehRef;
        if (was && JSON.stringify(x.vehRef) === JSON.stringify(v) && x.conducteur === name) continue;
        x.passager = true; x.avec = f.id; x.vehRef = v; x.conducteur = name; x.qualite = 'Passager';
        await _save(x); was ? changed++ : added++;
      }
      if (added || changed) setTimeout(()=>{ try { render(); } catch(e){}
        if (added) toast(`${added} personne${added>1?'s':''} du contrôle rattachée${added>1?'s':''} comme passag${added>1?'ers':'er'} du véhicule`); }, 900);
    } finally { busy = false; }
  };
})();
