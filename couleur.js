'use strict';
/* CIF 2.0 — v1.1.17 : main courante, couleur du véhicule accordée au féminin (« de couleur blanche »,
   « grise métallisée », « blanche/noire ») ; couleurs composées (gris foncé, bleu marine…) et
   invariables (marron, orange, rouge…) inchangées. */
(()=>{
  const F = {blanc:'blanche', noir:'noire', gris:'grise', vert:'verte', bleu:'bleue', violet:'violette', brun:'brune', mat:'mate'};
  const INV = /(^|\s)(fonc[ée]|clair|ciel|marine|p[aâ]le|vif|nuit|bouteille|canard|turquoise|p[ée]trole|anthracite)(?=\s|$)/i;
  const coulF = c => { const t = c.trim().toLowerCase(); if (INV.test(t) && /\s/.test(t)) return t;
    return t.split(/(\s+|\/|-)/).map(w => F[w] || (/é$/.test(w) ? w + 'e' : w)).join(''); };
  window.coulF = coulF;
  const _mc = mcText;
  mcText = function(f, i, arr){
    const t = _mc(f, i, arr);
    return typeof t === 'string' ? t.replace(/de couleur (.+?)(?=,| immatricul| appartenant| conduit|\.|\n|$)/gm, (m, c) => 'de couleur ' + coulF(c)) : t;
  };
})();
