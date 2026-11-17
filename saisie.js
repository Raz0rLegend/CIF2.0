'use strict';
/* CIF 2.0 — v1.0.13 : pas de correction automatique du clavier sur les noms propres (prénom, adresse, villes, pays, responsable légal, tuteur) */
(()=>{
  for (const id of ['f_prenom','f_adrRue','f_adrVille','f_adrPays','f_naisVille','f_naisPays','f_respLegal','f_tuteur','f_filiation','d_nom','d_prenom']) {
    const el = document.getElementById(id); if (!el) continue;
    el.setAttribute('autocorrect', 'off'); el.setAttribute('autocomplete', 'off'); el.spellcheck = false;
  }
})();
