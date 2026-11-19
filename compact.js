'use strict';
/* CIF 2.0 — v1.1.13 : formulaire de contrôle compact
   Champs plus bas, libellés plus petits, espacements réduits, et champs courts côte à côte :
   résultat + antécédents, nom + prénom, sexe + date de naissance, lieu de naissance + nationalité,
   profession + employeur, ville + pays, téléphone + identité établie, numéro + expiration…
   Les champs restent en 16 px pour que l'iPhone ne zoome pas en les touchant. */
(()=>{
  document.head.insertAdjacentHTML('beforeend', `<style>
#form .body{padding:2px 14px 24px}
#form label.f{margin:9px 0 3px;font-size:12.5px;color:#a9a9a9;letter-spacing:.01em}
#form input,#form select{padding:8px 10px;min-height:40px;border-radius:8px}
#form input[type=datetime-local],#form input[type=time]{min-height:40px}
#form textarea{min-height:72px;padding:8px 10px}
#form .sect{margin:16px 0 0;font-size:12px}
#form .seg{padding:2px}
#form .seg button{height:34px;font-size:15px}
#form #accGrid{grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}
#form #accGrid .switch{min-height:38px;padding:6px 4px;border-radius:9px;margin:0}
#form #accGrid .switch .swl{font-size:13.5px;line-height:1.15}
#form #accGrid .switch.vif{grid-column:auto}
#form .switch{margin-top:9px;padding:6px 10px;gap:10px}
#form .switch .sw{width:40px;height:24px}
#form .switch .sw::after{width:18px;height:18px}
#form .switch input:checked+.sw::after{left:19px}
#form .switch .swl{font-size:15px}
#form .addveh{height:40px;margin-top:8px;font-size:15px}
#form .veh{padding:2px 10px 10px;margin-top:8px}
#form .cr{display:flex;gap:8px;align-items:flex-end}
#form .cr>.cc{flex:1 1 0;min-width:0}
#form .cr>.cc>label.f{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#form .cr #sexeSeg{margin:0}
#form .cr #sexeSeg{gap:6px!important}
#form .cr #sexeSeg button{height:40px!important;min-height:40px!important;padding:0 4px!important;font-size:15px!important;display:block!important;white-space:nowrap}
#form .cr .seg{min-height:40px}
#form #mrzBtn{flex:0 0 40px!important;height:40px!important;width:40px}
#form #f_verif{height:40px;min-height:40px}
#form #motifChips{gap:6px!important}
#form #motifChips button{padding:5px 10px!important;font-size:13.5px!important}
#form .veh .chips span{padding:5px 11px}
#form #signaRow{margin-top:10px!important}
#form .photos{margin-top:6px}
#form #docSeg button{white-space:nowrap}
#form .vdocs{margin-top:6px}
#form .vdocs button{flex-direction:row;gap:6px;padding:8px 6px;font-size:14px}
#form .vdocs button small{font-size:12px}
</style>`);
  const lab = id => document.querySelector(`#form label[for=${id}]`);
  const $f = id => document.getElementById(id);
  /* Une ligne de cellules ; chaque cellule = liste d'éléments (manquants ignorés), largeur relative */
  function row(cells){
    const list = cells.map(c=>({n: c.n.filter(Boolean), w: c.w || 1})).filter(c=>c.n.length);
    if (list.length < 2) return;
    const r = document.createElement('div'); r.className = 'cr';
    list[0].n[0].before(r);
    for (const c of list) { const d = document.createElement('div'); d.className = 'cc'; d.style.flex = `${c.w} 1 0`; d.append(...c.n); r.append(d); }
    return r;
  }
  const typeLbl = [...document.querySelectorAll('#form label.f')].find(l=>l.textContent.trim() === 'Type de contrôle');
  if (typeLbl) typeLbl.remove();                                       /* le choix CI / CIF parle de lui-même */
  $f('typeSeg').style.marginTop = '6px';
  /* Résultat (+ VERIF) à côté du bouton Antécédents */
  const resBox = $f('f_resultat')?.parentElement;
  const antSw = $f('f_antecedents')?.closest('label.switch') || [...document.querySelectorAll('#form label.switch')].find(l=>/Antécédents/.test(l.textContent));
  if (antSw) { antSw.style.margin = '0'; antSw.style.minHeight = '40px'; const t = antSw.querySelector('.swl'); if (t) t.textContent = 'Antécédents'; }
  row([{n:[lab('f_resultat'), resBox], w:1.15}, {n:[antSw], w:1}]);
  const sexLbl = [...document.querySelectorAll('#form label.f')].find(l=>/^Sexe/.test(l.textContent.trim()));
  const nomBox = $f('f_nom')?.parentElement;
  const rNom = row([{n:[lab('f_nom'), nomBox]}, {n:[lab('f_prenom'), $f('f_prenom')]}]);
  const rSexe = row([{n:[sexLbl, $f('f_sexe'), $f('sexeSeg')]}, {n:[lab('f_dateNaissance'), $f('f_dateNaissance')]}]);
  /* nom et prénom d'abord, puis sexe et date de naissance (les aides : scan, âge… restent en dessous) */
  if (rNom && rSexe) { rNom.after(rSexe); const hints = ['mrzInfo','idSug','diffAlert'].map($f).filter(Boolean); rNom.after(...hints); }
  row([{n:[lab('f_naisVille'), $f('f_lieuNaissance'), $f('f_naisVille'), $f('f_naisPays')]}, {n:[lab('f_nationalite'), $f('f_nationalite')]}]);
  row([{n:[lab('f_profession'), $f('f_profession')]}, {n:[lab('f_employeur'), $f('f_employeur')]}]);
  row([{n:[$f('f_adrVille')?.parentElement]}, {n:[$f('f_adrPays')], w:.6}]);
  const idLbl = [...document.querySelectorAll('#form label.f')].find(l=>l.textContent.trim() === 'Identité établie');
  const off = $f('docSeg')?.querySelector('[data-v=Officiel]'); if (off) off.textContent = 'Officielle';
  row([{n:[lab('f_telephone'), $f('f_telephone')]}, {n:[idLbl, $f('docSeg')], w:1.3}]);
  row([{n:[lab('f_docNumero'), $f('f_docNumero')]}, {n:[lab('f_docExp'), $f('f_docExp')]}]);
  /* Accident : petits champs côte à côte */
  row([{n:[lab('f_kilometrage'), $f('f_kilometrage')]}, {n:[lab('f_sitFam'), $f('f_sitFam')]}]);
  /* Véhicules : marque + modèle, couleur + propriétaire */
  const pairVeh = () => document.querySelectorAll('#vehicles .veh').forEach(v=>{
    const f = k => { const i = v.querySelector(`input[data-k=${k}]`); return i ? [i.previousElementSibling?.matches('label.f') ? i.previousElementSibling : null, i] : [null]; };
    if (v.querySelector('.cr')) return;
    row([{n:f('marque')}, {n:f('modele')}]); row([{n:f('couleur')}, {n:f('proprio')}]);
  });
  { const _rv = renderVehicles; renderVehicles = function(){ _rv(); pairVeh(); }; }
  pairVeh();
  /* Le sexe deviné : mention plus discrète */
  const sx = $f('sxAuto'); if (sx) { sx.textContent = '(deviné)'; }
})();
