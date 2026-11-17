'use strict';
/* CIF 2.0 — v1.0.20 : bandeau du bas accroché au bas de l'écran
   Sur iPhone (appli sur l'écran d'accueil), après la fermeture du clavier, iOS laisse parfois la zone
   d'affichage décalée : les barres du bas (onglets CIF/CI, Tout/Archiver/Envoyer, bouton +) restent
   à la hauteur où était le clavier et l'en-tête disparaît en haut.
   On mesure ce décalage (visualViewport) et on recolle les barres au vrai bas de l'écran (--gb),
   puis on force iOS à se recaler par un défilement d'un pixel. */
(()=>{
  const vv = window.visualViewport; if (!vv) return;
  const root = document.documentElement.style;
  const typing = () => { const a = document.activeElement; return !!(a && a.matches && a.matches('input,textarea,select,[contenteditable="true"]')); };
  let gb = 0, nudged = 0;
  function sync(){
    let d = 0;
    /* Clavier réellement ouvert : on ne touche à rien */
    const kb = typing() && vv.height < window.innerHeight - 100;
    if (!kb && vv.scale < 1.05) {
      d = Math.round(vv.offsetTop + vv.height - window.innerHeight);
      if (d < 3) d = 0;
      /* Écran décalé vers le haut : on force iOS à se recaler */
      if (vv.offsetTop > 2 && Date.now() - nudged > 600) {
        nudged = Date.now(); const y = window.scrollY;
        window.scrollTo(0, y + 1); window.scrollTo(0, y);
        requestAnimationFrame(sync);
      }
    }
    if (d !== gb) { gb = d; root.setProperty('--gb', d + 'px'); }
  }
  const later = () => { sync(); [120, 400, 900].forEach(t=>setTimeout(sync, t)); };
  vv.addEventListener('resize', sync); vv.addEventListener('scroll', sync);
  window.addEventListener('resize', sync); window.addEventListener('scroll', sync, {passive:true});
  document.addEventListener('focusout', later); document.addEventListener('focusin', later);
  document.addEventListener('visibilitychange', ()=>{ if (!document.hidden) later(); });
  window.addEventListener('pageshow', later);
  document.addEventListener('touchend', ()=>{ if (gb || vv.offsetTop > 2) sync(); }, {passive:true});
  later();
})();
