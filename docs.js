'use strict';
/* CIF 2.0 — v1.0.24 : documents du véhicule (carte grise, assurance)
   Deux cases sous chaque véhicule : vertes par défaut (présentées), un appui les passe en rouge (non présentées).
   La main courante du conducteur s'adapte : « dont les documents étaient en règle » ou
   « dont le certificat d'immatriculation n'était pas présenté », etc. */
(()=>{
  const DOCS = [['cg','Carte grise',"le certificat d'immatriculation"], ['as','Assurance',"le certificat d'assurance"]];
  const ok = (v, k) => v?.[k] !== 'ko';
  document.head.insertAdjacentHTML('beforeend', `<style>
.vdocs{display:flex;gap:8px;margin-top:12px}
.vdocs button{flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;padding:8px 6px;border-radius:10px;border:1.5px solid #2e7d4f;background:#173a26;color:#bff0d2;font-size:15px;font-weight:600}
.vdocs button small{font-size:12px;font-weight:500;opacity:.85}
.vdocs button.ko{border-color:#b3261e;background:#4a1512;color:#ffd0cc}
</style>`);
  const btn = (v, i, [k, l]) => `<button type="button" data-vdoc="${k}" data-i="${i}" class="${ok(v,k) ? '' : 'ko'}">${ok(v,k) ? '✓' : '✗'} ${l}<small>${ok(v,k) ? 'présentée' : 'non présentée'}</small></button>`;
  { const _rv = renderVehicles; renderVehicles = function(){
    _rv();
    document.querySelectorAll('#vehicles .veh').forEach((el, i)=>{
      const v = EDIT.f.vehicules[i]; if (!v) return;
      el.insertAdjacentHTML('beforeend', `<label class="f">Documents présentés</label><div class="vdocs">${DOCS.map(d=>btn(v, i, d)).join('')}</div>`);
    });
  }; }
  $('#vehicles').addEventListener('click', e=>{
    const b = e.target.closest('[data-vdoc]'); if (!b || !EDIT) return;
    const v = EDIT.f.vehicules[+b.dataset.i]; if (!v) return;
    const k = b.dataset.vdoc; if (ok(v, k)) v[k] = 'ko'; else delete v[k];
    b.outerHTML = btn(v, +b.dataset.i, DOCS.find(d=>d[0] === k));
    draftSoon();
  });
  /* Phrase de fin pour la main courante */
  window.vehDocsPhrase = (v, own) => {
    const miss = DOCS.filter(([k])=>!ok(v, k)).map(d=>d[2]);
    if (!miss.length) return own ? 'dont les documents étaient en règle' : 'dont les documents de bord étaient en règle';
    return miss.length === 1 ? `dont ${miss[0]} n'était pas présenté` : `dont ${miss.join(' et ')} n'étaient pas présentés`;
  };
  const docsTxt = v => DOCS.every(([k])=>ok(v, k)) ? 'Présentés (carte grise et assurance)' : DOCS.map(([k, l])=>`${l} ${ok(v, k) ? 'présentée' : 'NON présentée'}`).join(' · ');
  /* Envoi : ligne « Documents » dans chaque véhicule */
  { const _fs = ficheSections; ficheSections = function(f){
    const S = _fs(f);
    for (const s of S) { const m = /^Véhicule (\d+)/.exec(s[0]); const v = m && (f.vehicules||[])[+m[1]-1]; if (v) s[1].push(['Documents', docsTxt(v)]); }
    return S; }; }
  /* Fiche ouverte : même ligne sous chaque véhicule */
  { const _od = openDetail; openDetail = async function(f){ await _od(f); if (DETAIL !== f.id) return;
    $('#detBody').querySelectorAll('section.panel').forEach(p=>{
      const m = /^Véhicule (\d+)/.exec(p.querySelector('h4 span')?.textContent || ''); const v = m && (f.vehicules||[])[+m[1]-1]; if (!v) return;
      const bad = !DOCS.every(([k])=>ok(v, k));
      p.insertAdjacentHTML('beforeend', `<div style="padding:8px 12px;font-size:14px;border-top:1px solid var(--line);color:${bad ? '#ff8a80' : '#9fdcb8'}">${bad ? '✗' : '✓'} ${esc(docsTxt(v))}</div>`);
    });
  }; }
})();
