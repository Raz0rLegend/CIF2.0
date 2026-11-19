'use strict';
/* CIF 2.0 — v1.1.2 : Face ID lancé au toucher du champ « code », plus à l'ouverture de l'appli.
   Premier toucher sur le champ : Face ID. Annulé ou refusé : le toucher suivant ouvre le clavier. */
(()=>{
  const _bio = bioUnlock;
  bioUnlock = function(auto){ if (auto) return Promise.resolve(); return _bio(auto); };
  let tried = false;
  { const _sl = showLock; showLock = function(setup){ tried = false; return _sl(setup); }; }
  const go = e => {
    if (tried || KEY || lockMode !== 'unlock' || $('#bioBtn').classList.contains('hidden')) return;
    e.preventDefault(); tried = true; $('#pin').blur();
    _bio(false);
  };
  $('#pin').addEventListener('touchstart', go, {passive:false});
  $('#pin').addEventListener('mousedown', go);
})();
