'use strict';
/* CIF 2.0 — v1.0.14 / 1.0.15 : ajouter une personne au même contrôle (passager, accompagnant)
   Nouvelle fiche avec la même heure, le même lieu, le même motif et le même véhicule : il ne reste que l'identité. */
(()=>{
  function openPassenger(src){
    if (!src) return;
    closeDetail();
    const gm = SETTINGS.geoMode; SETTINGS.geoMode = 'off'; try { openForm(null); } finally { SETTINGS.geoMode = gm; }
    const f = EDIT.f;
    f.type = src.type || 'CI'; setSeg('typeSeg', f.type);
    $('#f_dateHeure').value = src.dateHeure || '';
    $('#f_lieuControle').value = src.lieuControle || ''; if (src.geo) f.geo = {...src.geo};
    $('#f_motif').value = src.motif || ''; syncMotif();
    f.vehicules = structuredClone(src.vehicules || []); renderVehicles();
    f.avec = src.id;
    $('#geoHint').textContent = `🔗 Même contrôle que ${ficheName(src)} (heure, lieu, motif et véhicule repris)`;
    $('#formTitle').textContent = 'Personne du même contrôle';
    syncAge(); window.syncExp?.(); draftSoon();
  }
  window.openPassenger = openPassenger;
  /* Fiche ouverte : bouton sous l'en-tête */
  { const _od = openDetail; openDetail = async function(f){ await _od(f); if (DETAIL !== f.id || f.status !== 'pending') return;
    $('#detBody .hero')?.insertAdjacentHTML('afterend', `<button type="button" class="addveh" id="detPass" style="margin:10px 0 0">👥 Ajouter une personne au même contrôle</button>`);
    $('#detPass').onclick = ()=>openPassenger(f); }; }
  /* Formulaire : enregistrer puis enchaîner sur la personne suivante */
  /* Dans le bandeau du bas, entre « Annuler » et « Enregistrer » */
  $('#formSave').insertAdjacentHTML('beforebegin', `<button type="button" id="formNext" aria-label="Enregistrer et ajouter une personne au même contrôle" style="font-size:14px;line-height:1.15;font-weight:600;color:#7fb3ff">Enregistrer<br>+ personne</button>`);
  $('#formNext').onclick = async ()=>{
    if (!EDIT) return; const id = EDIT.f.id;
    await closeForm(true);
    if (EDIT) return;   /* enregistrement refusé (champs manquants) */
    const s = FICHES.find(x=>x.id === id); if (s) openPassenger(s);
  };
})();
