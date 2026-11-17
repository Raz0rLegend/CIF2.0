'use strict';
/* CIF 2.0 — v1.0.21 : main courante, antécédents
   « le nommé DUPONT Jean » si l'identité est établie sur pièce officielle,
   « le disant se nommer DUPONT Jean » si elle est établie sur ses dires (au lieu de « l'intéressé »). */
(()=>{
  const _mx = mcExtra;
  mcExtra = function(f){
    const t = _mx(f); if (!t) return t;
    const nm = [(f.nom||'').toUpperCase(), f.prenom].filter(Boolean).join(' '); if (!f.nom) return t;
    const F = f.sexe === 'F', le = F ? "l'intéressée" : "l'intéressé";
    const who = (f.docMode === 'Sur dires' ? (F ? 'la disant se nommer ' : 'le disant se nommer ') : (F ? 'la nommée ' : 'le nommé ')) + nm;
    return t.replace(`, ${le} nous répondait`, `, ${who} nous répondait`);
  };
})();
