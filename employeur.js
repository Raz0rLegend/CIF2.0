'use strict';
/* CIF 2.0 — v1.1.8 : champ « Employeur » toujours visible, juste sous la profession
   (société, commerce, restaurant…). Il n'était jusqu'ici proposé que pour les accidents.
   Main courante : « maçon, employé chez SBM ». */
(()=>{
  /* Le champ n'est plus effacé quand la fiche n'est pas un accident */
  const i = ACC_FIELDS.indexOf('employeur'); if (i >= 0) ACC_FIELDS.splice(i, 1);
  /* Déplacement sous la profession */
  const lbl = $('label[for=f_employeur]'), inp = $('#f_employeur');
  $('#f_profession').after(lbl, inp);
  inp.placeholder = 'Société, commerce, restaurant…';
  inp.setAttribute('autocorrect', 'off'); inp.setAttribute('autocapitalize', 'words');
  const emp = f => String(f.employeur || '').trim();
  /* Main courante */
  { const _mc = mcText; mcText = function(f, i, arr){
    const e = emp(f); if (!e) return _mc(f, i, arr);
    const who = f.sexe === 'F' ? 'employée' : f.sexe === 'H' ? 'employé' : 'employé(e)';
    const g = {...f, profession: [f.profession, `${who} chez ${e}`].filter(Boolean).join(', ')};
    return _mc(g, i, arr);
  }; }
  /* Envoi : ligne « Employeur » sous la profession (déjà dans le bloc Accident pour un accident) */
  { const _fs = ficheSections; ficheSections = function(f){
    const S = _fs(f); if (!emp(f) || f.accident) return S;
    const sec = S.find(([t])=>t === 'Identité'); if (!sec) return S;
    const rows = sec[1], p = rows.findIndex(r=>r[0] === 'Profession');
    rows.splice(p >= 0 ? p + 1 : rows.length, 0, ['Employeur', emp(f)]);
    return S; }; }
  /* Fiche ouverte : case « Employeur » dans l'identité */
  { const _od = openDetail; openDetail = async function(f){ await _od(f); if (DETAIL !== f.id || !emp(f) || f.accident) return;
    const id = [...$('#detBody').querySelectorAll('section.panel')].find(s=>s.querySelector('h4 span')?.textContent === 'Identité'); if (!id) return;
    const html = `<div class="cell full"><div class="k">Employeur</div><div class="v">${esc(emp(f))}</div></div>`;
    const prof = [...id.querySelectorAll('.cell')].find(c=>c.querySelector('.k')?.textContent === 'Profession');
    prof ? prof.insertAdjacentHTML('afterend', html) : id.querySelector('.grid')?.insertAdjacentHTML('beforeend', html);
  }; }
})();
