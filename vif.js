'use strict';
/* CIF 2.0 — v1.1.9 : intervention VIF (violences intrafamiliales)
   Tuile « VIF » avec les autres types (Accident, IPM…) : elle ouvre un bloc rapide à cocher
   (lien entre les personnes, enfants, mesures du juge, signes d'ivresse, mémento fiche / feuillet VIF, circonstances).
   Repris dans le mail d'envoi et signalé par une balise VIF ; rien dans la main courante (rédigée à la main). */
(()=>{
  const G = [
    ['qual', 'Qualité de la personne', ['Victime','Mis en cause','Témoin'], 1],
    ['lien', 'Situation familiale / lien', ['Marié(e)s','Pacsé(e)s','Concubins','En couple sans vivre ensemble','En instance de divorce','Séparé(e)s','Divorcé(e)s','Ex-concubins','Parent / enfant','Frère / sœur','Autre'], 1],
    ['enf', 'Enfants en commun', ['Oui','Non'], 1],
    ['charge', 'Enfants à la charge de', ['Mère','Père','Garde alternée','Autre'], 1, 'enf'],
    ['present', 'Enfants présents lors des faits', ['Oui','Non'], 1, 'enf'],
    ['mesures', 'Antécédents / mesures du juge', ['Aucun connu','Ordonnance de protection','Interdiction de contact','Éloignement du domicile','Contrôle judiciaire','Plainte(s) antérieure(s)','Main(s) courante(s) antérieure(s)'], 0],
    ['sei', 'Signes extérieurs d\'ivresse', ['Oui','Non'], 1],
    ['opj', 'Dépistage sur instruction de l\'OPJ', ['Oui','Non'], 1, 'sei'],
    ['dep', 'Résultat du dépistage', ['Positif','Négatif','Refus','Non effectué'], 1, 'opj'],
  ];
  const T = [ /* champs texte : clé, libellé, après le groupe, placeholder */
    ['depuis', 'En couple depuis', 'lien', 'ex. 6 ans'],
    ['sepDepuis', 'Séparés / en instance depuis', 'lien', 'ex. 3 mois'],
    ['nbEnf', 'Nombre d\'enfants en commun (âges)', 'enf', 'ex. 2 (4 et 9 ans)'],
    ['mesTxt', 'Précisions (date, juridiction…)', 'mesures', ''],
    ['etho', 'Éthylomètre (mg/L d\'air expiré)', 'dep', 'ex. 0,45'],
  ];
  const MEM = [['fiche', 'Fiche VIF renseignée'], ['feuillet', 'Feuillet d\'information VIF remis']];
  const BADGE = '<span class="badge acc" style="background:#9d174d;color:#fff">VIF</span>';
  document.head.insertAdjacentHTML('beforeend', `<style>
#accGrid .switch.vif{grid-column:1/-1}
#accGrid .switch.vif.on{background:#3b0d22;border-color:#db2777}
#accGrid .switch.vif.on .swl{color:#fbcfe8}
#vifBlock{border-left-color:#db2777}
#vifBlock .ig{margin-top:12px}
#vifBlock .ig.hidden,#vifBlock .vt.hidden,#vifNote.hidden{display:none}
#vifBlock .ig>b{display:block;font-size:14px;color:var(--muted);margin-bottom:6px}
#vifBlock .ich{display:flex;flex-wrap:wrap;gap:6px}
#vifBlock .ich button{border:1px solid var(--line);background:var(--panel);color:inherit;border-radius:16px;padding:7px 11px;font-size:14px;line-height:1.2}
#vifBlock .ich button.on{background:#9d174d;border-color:#db2777;color:#fff;font-weight:700}
#vifNote{margin-top:8px;padding:8px 10px;border-radius:10px;background:#3b0d22;color:#fbcfe8;font-size:13px}
#vifMem{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
#vifMem button{border:1px solid #7a1d45;border-radius:10px;background:none;color:#e9a6c4;font-size:14px;font-weight:600;padding:10px 6px;line-height:1.2}
#vifMem button.on{background:#9d174d;border-color:#db2777;color:#fff}
</style>`);
  $('#accGrid').insertAdjacentHTML('beforeend', `<label class="switch vif"><input type="checkbox" id="f_vif"><span class="sw"></span><span class="swl">VIF</span></label>`);
  const grp = ([k, l, opts, one, dep]) => `<div class="ig" data-ig="${k}"${dep ? ` data-dep="${dep}"` : ''}><b>${esc(l)}${one ? '' : ' <small style="font-weight:400">(plusieurs choix possibles)</small>'}</b><div class="ich" data-g="${k}">${opts.map(o=>`<button type="button" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div></div>`;
  const txt = ([k, l, , ph]) => `<div class="vt" data-vt="${k}"><label class="f" for="vif_${k}">${esc(l)}</label><input id="vif_${k}" data-vk="${k}" autocomplete="off" autocorrect="off" placeholder="${esc(ph)}"></div>`;
  const body = G.map(g=>grp(g) + T.filter(t=>t[2] === g[0]).map(txt).join('') + (g[0] === 'sei' ? '<div id="vifNote" class="hidden">⚠ Mémento : pas de dépistage d\'alcool lors de violences sans instruction de l\'OPJ.</div>' : '')).join('');
  const anchor = $('#ipmBlock') || $('#atBlock');
  anchor.insertAdjacentHTML('afterend', `<div id="vifBlock" class="accblock hidden">
    <div class="sect" style="margin-top:6px">Violences intrafamiliales</div>
    ${body}
    <div class="sect" style="margin-top:18px">Mémento</div>
    <div id="vifMem">${MEM.map(([k, l])=>`<button type="button" data-m="${k}">${esc(l)}</button>`).join('')}</div>
    <label class="f" for="vif_circ">Circonstances / situation</label><textarea id="vif_circ" data-vk="circ" rows="3" placeholder="Faits, déclarations, contexte…"></textarea>
  </div>`);
  const data = () => (EDIT.f.vifData ||= {});
  const val = (d, k) => d[k] || (G.find(g=>g[0] === k)?.[3] ? '' : []);
  function sync(){
    const on = $('#f_vif').checked; $('#vifBlock').classList.toggle('hidden', !on);
    if (!EDIT) return; const d = EDIT.f.vifData || {};
    document.querySelectorAll('#vifBlock .ich').forEach(c=>{ const v = d[c.dataset.g]; c.querySelectorAll('button').forEach(b=>b.classList.toggle('on', Array.isArray(v) ? v.includes(b.dataset.o) : v === b.dataset.o)); });
    /* Questions qui dépendent d'une réponse « Oui » */
    document.querySelectorAll('#vifBlock .ig[data-dep]').forEach(x=>x.classList.toggle('hidden', d[x.dataset.dep] !== 'Oui'));
    $('#vifBlock .ig[data-ig=dep]').classList.toggle('hidden', d.sei !== 'Oui' || d.opj !== 'Oui');
    $('#vifBlock .vt[data-vt=etho]').classList.toggle('hidden', d.sei !== 'Oui' || d.opj !== 'Oui');
    $('#vifBlock .vt[data-vt=nbEnf]').classList.toggle('hidden', d.enf !== 'Oui');
    $('#vifBlock .vt[data-vt=sepDepuis]').classList.toggle('hidden', !/instance|Séparé|Divorcé|Ex-/.test(d.lien || ''));
    $('#vifNote').classList.toggle('hidden', d.sei !== 'Oui');
    document.querySelectorAll('#vifMem button').forEach(b=>b.classList.toggle('on', !!d[b.dataset.m]));
  }
  function load(){
    $('#f_vif').checked = !!EDIT?.f.vif;
    const d = EDIT?.f.vifData || {};
    document.querySelectorAll('#vifBlock [data-vk]').forEach(i=>{ i.value = d[i.dataset.vk] || ''; });
    sync(); paintTiles();
  }
  $('#f_vif').addEventListener('change', e=>{ if (EDIT) EDIT.f.vif = e.target.checked; sync(); paintTiles(); draftSoon(); });
  $('#vifBlock').addEventListener('click', e=>{
    if (!EDIT) return;
    const m = e.target.closest('#vifMem button');
    if (m) { const d = data(); d[m.dataset.m] = !d[m.dataset.m]; sync(); draftSoon(); return; }
    const b = e.target.closest('.ich button'); if (!b) return;
    const k = b.closest('.ich').dataset.g, one = G.find(g=>g[0] === k)[3], o = b.dataset.o, d = data();
    if (one) d[k] = d[k] === o ? '' : o;
    else { let v = Array.isArray(d[k]) ? d[k] : []; v = v.includes(o) ? v.filter(x=>x !== o) : [...v, o];
      if (k === 'mesures' && v.includes(o)) v = o === 'Aucun connu' ? ['Aucun connu'] : v.filter(x=>x !== 'Aucun connu');
      d[k] = v; }
    sync(); draftSoon();
  });
  $('#vifBlock').addEventListener('input', e=>{ const k = e.target.dataset?.vk; if (k && EDIT) { data()[k] = e.target.value; draftSoon(); } });
  { const _of = openForm; openForm = function(f, d){ _of(f, d); load(); }; }

  /* Résumé (fiche ouverte et mail) */
  function rows(f){
    const d = f.vifData || {}, j = v => Array.isArray(v) ? v.join(', ') : (v || '');
    const enf = d.enf === 'Oui' ? ['Oui', d.nbEnf, d.charge && `à la charge : ${d.charge}`, d.present && `présents lors des faits : ${d.present.toLowerCase()}`].filter(Boolean).join(' — ') : d.enf;
    const sei = d.sei === 'Oui' ? ['Oui', d.opj === 'Oui' ? `dépistage sur instruction OPJ : ${(d.dep || 'résultat non précisé').toLowerCase()}${d.etho ? `, éthylomètre ${d.etho} mg/L` : ''}` : d.opj === 'Non' ? 'pas de dépistage (pas d\'instruction OPJ)' : ''].filter(Boolean).join(' — ') : d.sei;
    return [
      ['Qualité', d.qual], ['Lien', d.lien], ['En couple depuis', d.depuis], ['Séparés / en instance depuis', d.sepDepuis],
      ['Enfants en commun', enf], ['Antécédents / mesures', [j(d.mesures), d.mesTxt].filter(Boolean).join(' — ')],
      ['Signes extérieurs d\'ivresse', sei],
      ['Fiche VIF renseignée', d.fiche ? 'Oui' : 'Non'], ['Feuillet VIF remis', d.feuillet ? 'Oui' : 'Non'],
      ['Circonstances', d.circ],
    ].filter(r=>r[1]);
  }
  { const _fs = ficheSections; ficheSections = function(f){ const S = _fs(f); if (f.vif) S.splice(1, 0, ['VIF — Violences intrafamiliales', rows(f)]); return S; }; }
  { const _od = openDetail; openDetail = async function(f){ await _od(f); if (DETAIL !== f.id || !f.vif) return;
    $('#detTitle').insertAdjacentHTML('afterbegin', BADGE);
    const p = panel('VIF — Violences intrafamiliales', rows(f).map(r=>[r[0], r[1]]));
    const id = [...$('#detBody').querySelectorAll('section.panel')].find(s=>s.querySelector('h4 span')?.textContent === 'Identité');
    id ? id.insertAdjacentHTML('beforebegin', p) : $('#detBody').insertAdjacentHTML('beforeend', p);
  }; }
  { const _r = render; render = function(){ _r();
    document.querySelectorAll('#list .card[data-id]').forEach(c=>{ const f = FICHES.find(x=>x.id === c.dataset.id); if (f?.vif) c.querySelector('.name')?.insertAdjacentHTML('afterbegin', BADGE); });
  }; }
  paintTiles();
})();
