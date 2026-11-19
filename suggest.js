'use strict';
/* CIF 2.0 — v1.1.5 : suggestions (ville, nationalité, lieu…) affichées de préférence SOUS le champ.
   Si la place manque sous le champ (clavier ouvert), le formulaire défile pour faire de la place ;
   sinon la liste est raccourcie ; elle ne passe au-dessus du champ qu'en dernier recours. */
(()=>{
  const MIN = 150;   /* hauteur minimale utile (≈ 3 suggestions) */
  sgPlace = function(inp){
    const host = inp.closest('.body');
    sgBox.style.maxHeight = '';
    if (!host) { const r = inp.getBoundingClientRect(); sgBox.style.position = 'fixed'; sgBox.style.left = r.left+'px'; sgBox.style.width = r.width+'px'; sgBox.style.top = (r.bottom + 2)+'px'; return; }
    if (sgBox.parentNode !== host) host.appendChild(sgBox);
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    const vv = window.visualViewport;
    let hr = host.getBoundingClientRect(), r = inp.getBoundingClientRect();
    /* bas visible : le plus haut entre le clavier et le bas de la zone qui défile (barre Annuler / Enregistrer) */
    const visBottom = Math.min(vv ? vv.offsetTop + vv.height : window.innerHeight, hr.bottom);
    const visTop = Math.max(hr.top, vv ? vv.offsetTop : 0);
    const h = Math.min(sgBox.scrollHeight + 2, 260), need = h + 10, min = Math.min(MIN, h);
    /* Pas assez de place dessous : on fait défiler le formulaire pour remonter le champ */
    let below = visBottom - r.bottom;
    if (below < need) {
      const room = host.scrollHeight - host.clientHeight - host.scrollTop;          /* défilement encore possible */
      const keep = r.top - visTop - 8;                                              /* le champ reste visible en haut */
      const d = Math.max(0, Math.min(need - below + 2, room, keep));
      if (d > 0) { host.scrollTo({top: host.scrollTop + d, behavior: 'instant'}); hr = host.getBoundingClientRect(); r = inp.getBoundingClientRect(); below = visBottom - r.bottom; }
    }
    let up = false;
    if (below < need) {
      if (below - 8 >= min) sgBox.style.maxHeight = (below - 8) + 'px';           /* liste raccourcie, toujours dessous */
      else if (r.top - visTop > below) { up = true; sgBox.style.maxHeight = Math.min(260, r.top - visTop - 8) + 'px'; }
      else sgBox.style.maxHeight = Math.max(100, below - 8) + 'px';
    }
    const bh = sgBox.offsetHeight;
    sgBox.style.position = 'absolute'; sgBox.style.bottom = ''; sgBox.style.margin = '0';
    sgBox.style.left = (r.left - hr.left + host.scrollLeft) + 'px'; sgBox.style.width = r.width + 'px';
    sgBox.style.top = (up ? r.top - hr.top + host.scrollTop - bh - 2 : r.bottom - hr.top + host.scrollTop + 2) + 'px';
    sgBox.style.borderRadius = up ? '12px 12px 4px 4px' : '4px 4px 12px 12px';
  };
})();
