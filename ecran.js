'use strict';
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
