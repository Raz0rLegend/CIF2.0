'use strict';
/* CIF 2.0 — v1.1.2 / 1.1.6 : Face ID ne se lance plus tout seul à l'ouverture de l'appli.
   Toucher le champ du code ouvre le clavier ; toucher le bouton « Face ID » lance la biométrie. */
(()=>{
  const _bio = bioUnlock;
  bioUnlock = function(auto){ if (auto) return Promise.resolve(); return _bio(auto); };
})();
