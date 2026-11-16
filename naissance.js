'use strict';
/* CIF 2.0 — v1.0.9 : lieu de naissance en un seul champ (plus de champ « Pays »).
   « 06000 Nice » (liste des communes) → « né à Nice (06000) » ; « Monaco » → « né à Monaco » ;
   ville étrangère en saisie libre : « Pigna » → « né à Pigna », ou « Pigna, Italie » → « né à Pigna en Italie ». */
(()=>{
  const v = $('#f_naisVille'), p = $('#f_naisPays'); if (!v || !p) return;
  p.style.display = 'none';
  v.placeholder = 'Ville ou code postal (ex. Nice, Pigna)';
  const _ni = naisInfo;
  naisInfo = function(f){
    let raw = (f.naisVille||'').trim(), pays = (f.naisPays||'').trim();
    const m = /^([^,]+?)\s*,\s*(.+)$/.exec(raw);
    if (m && !/^\d{5}\s/.test(raw)) { raw = m[1]; pays = pays || m[2]; }
    return _ni({naisVille:raw, naisPays:pays});
  };
  /* Anciennes fiches avec un pays : regroupé dans le champ ville (« Pigna, Italie ») */
  const merge = () => {
    const pays = p.value.trim(); if (!pays) return;
    const np = norm(pays);
    if (np !== 'france' && np !== 'monaco' && v.value.trim() && !v.value.includes(',')) v.value = `${v.value.trim()}, ${pays}`;
    else if (np !== 'france' && np !== 'monaco' && !v.value.trim()) v.value = pays;
    p.value = ''; naisJoin();
  };
  { const _of = openForm; openForm = function(f, d){ _of(f, d); merge(); }; const _ii = idInherit; idInherit = function(src){ _ii(src); merge(); }; }
  /* Commune choisie dans la liste : pas de pays à garder */
  v.addEventListener('change', ()=>setTimeout(()=>{ if (/^\d{5}\s/.test(v.value)) { p.value = ''; naisJoin(); } }));
  v.addEventListener('input', ()=>{ if (!/^\d{5}\s/.test(v.value)) p.value = ''; });
})();
