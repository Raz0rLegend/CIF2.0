'use strict';
/* CIF 2.0 — v2.0.17 : secours.js, secours intervenus sur la fiche (pompiers, SMUR).
   Case « Secours » dans le contexte : Pompiers (chef d'agrès et chef des opérations de secours, grade et nom) et/ou
   SMUR (nom du médecin). Les noms déjà saisis sont proposés à la frappe (le grade connu revient avec le nom).
   Réglable à la création comme après l'enregistrement (bouton dans la fiche). Une personne ajoutée au même contrôle
   reprend les secours du contrôle. */
try {
(()=>{
  const obs = document.getElementById('f_observations'); if (!obs) return;
  const GR = [['SAP','Sapeur'],['CPL','Caporal'],['CCH','Caporal-chef'],['SGT','Sergent'],['SCH','Sergent-chef'],['ADJ','Adjudant'],['ADC','Adjudant-chef']];
  const opts = `<option value="">Grade</option>${GR.map(([a, l])=>`<option value="${a}" title="${l}">${a}</option>`).join('')}`;
  document.head.insertAdjacentHTML('beforeend', `<style>
#secBox{margin-top:10px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.03)}
#secBox .secChips{display:flex;gap:8px}
#secBox .secChips button{flex:1;padding:10px;border-radius:10px;border:1px solid var(--line);background:var(--panel);color:inherit;font-size:15px;font-weight:600}
#secBox .secChips button.on{background:#fff;color:#111}
#secBox .secRow{display:flex;gap:8px;align-items:center}
#secBox .secRow select{flex:0 0 92px}
#secBox .secRow input{flex:1;min-width:0}
#secBox .secRow .dr{flex:0 0 auto;font-weight:600;color:var(--muted)}
</style>`);
  const wrap = document.createElement('div');
  wrap.innerHTML = `<label class="switch" style="margin-top:14px"><input type="checkbox" id="f_secours"><span class="sw"></span><span class="swl">Secours</span></label>
<div id="secBox" class="hidden">
  <div class="secChips"><button type="button" data-s="sp">Pompiers</button><button type="button" data-s="smur">SMUR</button></div>
  <div id="secSp" class="hidden">
    <label class="f" for="sec_caNom">Chef d'agrès</label>
    <div class="secRow"><select id="sec_caGr" aria-label="Grade du chef d'agrès">${opts}</select><input id="sec_caNom" data-sg="spNoms" autocomplete="off" spellcheck="false" autocapitalize="characters" placeholder="Nom"></div>
    <label class="f" for="sec_cosNom">Chef des opérations de secours (COS)</label>
    <div class="secRow"><select id="sec_cosGr" aria-label="Grade du chef des opérations de secours">${opts}</select><input id="sec_cosNom" data-sg="spNoms" autocomplete="off" spellcheck="false" autocapitalize="characters" placeholder="Nom"></div>
  </div>
  <div id="secSmur" class="hidden">
    <label class="f" for="sec_med">Médecin du SMUR</label>
    <div class="secRow"><span class="dr">Dr</span><input id="sec_med" data-sg="medecins" autocomplete="off" spellcheck="false" autocapitalize="characters" placeholder="Nom du médecin"></div>
  </div>
</div>`;
  obs.after(...wrap.childNodes);
  const $s = id => document.getElementById(id);
  const ST = {sp:false, smur:false};
  function sync(){
    const on = $s('f_secours').checked;
    $s('secBox').classList.toggle('hidden', !on);
    document.querySelectorAll('#secBox [data-s]').forEach(b=>b.classList.toggle('on', !!ST[b.dataset.s]));
    $s('secSp').classList.toggle('hidden', !ST.sp); $s('secSmur').classList.toggle('hidden', !ST.smur);
  }
  function read(){
    if (!$s('f_secours').checked) return null;
    const v = id => $s(id).value.trim();
    const s = {sp:ST.sp, smur:ST.smur};
    if (ST.sp) Object.assign(s, {caGr:v('sec_caGr'), caNom:v('sec_caNom'), cosGr:v('sec_cosGr'), cosNom:v('sec_cosNom')});
    if (ST.smur) s.med = v('sec_med');
    return s;
  }
  function load(s){
    s = s || {};
    $s('f_secours').checked = !!(s.sp || s.smur || s.on);
    ST.sp = !!s.sp; ST.smur = !!s.smur;
    $s('sec_caGr').value = s.caGr || ''; $s('sec_caNom').value = s.caNom || '';
    $s('sec_cosGr').value = s.cosGr || ''; $s('sec_cosNom').value = s.cosNom || '';
    $s('sec_med').value = s.med || '';
    sync();
  }
  $s('f_secours').addEventListener('change', ()=>{ if ($s('f_secours').checked && !ST.sp && !ST.smur) ST.sp = true; sync(); draftSoon(); });
  $s('secBox').addEventListener('click', e=>{ const b = e.target.closest('[data-s]'); if (!b) return; ST[b.dataset.s] = !ST[b.dataset.s]; sync(); draftSoon(); });
  $s('secBox').addEventListener('change', ()=>draftSoon());
  /* nom déjà connu : son grade revient tout seul */
  for (const [g, n] of [['sec_caGr','sec_caNom'], ['sec_cosGr','sec_cosNom']])
    $s(n).addEventListener('change', ()=>{ const gr = (LEARN.spGrade || {})[norm($s(n).value)]; if (gr && !$s(g).value) $s(g).value = gr; draftSoon(); });

  /* ----- Formulaire ----- */
  /* noms des fiches déjà enregistrées (archives comprises) proposés aussi : relevés une fois, à la première fiche ouverte */
  let scanned = false;
  { const _of = openForm; openForm = function(f, d){ _of(f, d); load(EDIT?.f?.secours);
      if (!scanned && KEY) { scanned = true; try { for (const x of FICHES) if (x.secours) learn(x.secours); } catch {} } }; }
  { const _sn = snapshot; snapshot = function(){ const f = _sn(); f.secours = read(); return f; }; }
  { const _cf = closeForm; closeForm = async function(save){
      if (save && EDIT) EDIT.f.secours = read();
      const s = save && EDIT ? EDIT.f.secours : null;
      await _cf(save);
      if (s && !EDIT) learn(s);
    }; }
  /* personne ajoutée au même contrôle : mêmes secours */
  const copied = new Set();
  { const _rv = renderVehicles; renderVehicles = function(){ _rv();
      const f = EDIT?.f; if (!f || !EDIT.isNew || !f.avec || copied.has(f.id) || read()) return;
      copied.add(f.id); const src = FICHES.find(x=>x.id === f.avec); if (src?.secours) load(structuredClone(src.secours));
    }; }
  /* noms retenus pour les prochaines fiches (avec le grade des pompiers) */
  function learn(s){
    let ch = false;
    const add = (key, v) => { v = (v || '').trim(); if (v.length < 2) return; const L = (LEARN[key] ||= []); if (!L.some(x=>norm(x) === norm(v))) { L.push(v); ch = true; } };
    for (const [g, n] of [[s.caGr, s.caNom], [s.cosGr, s.cosNom]]) { add('spNoms', n); if (n && g) { const m = (LEARN.spGrade ||= {}); if (m[norm(n)] !== g) { m[norm(n)] = g; ch = true; } } }
    add('medecins', s.med);
    if (ch) saveLearn().catch(()=>{});
  }

  /* ----- Affichage, envoi, main courante ----- */
  const who = (g, n) => [g, (n || '').toUpperCase()].filter(Boolean).join(' ');
  const rows = s => [
    ...(s.sp ? [['Pompiers', 'sur place'], ['Chef d\'agrès', who(s.caGr, s.caNom)], ['Chef des opérations de secours', who(s.cosGr, s.cosNom)]] : []),
    ...(s.smur ? [['SMUR', s.med ? `Dr ${s.med.toUpperCase()}` : 'sur place']] : [])];
  { const _fs = ficheSections; ficheSections = function(f){ const S = _fs(f); const s = f.secours;
      if (s && (s.sp || s.smur)) { const r = rows(s).filter(x=>x[1]); const i = S.findIndex(x=>x[0] === 'Contexte'); i >= 0 ? S.splice(i, 0, ['Secours', r]) : S.push(['Secours', r]); }
      return S; }; }
  function phrase(s){
    const out = [];
    if (s.sp) { const ca = who(s.caGr, s.caNom), cos = who(s.cosGr, s.cosNom);
      const d = [ca && `${ca}, chef d'agrès`, cos && `${cos}, chef des opérations de secours`].filter(Boolean);
      out.push(`Les sapeurs-pompiers sont intervenus sur les lieux${d.length ? ` (${d.join(' ; ')})` : ''}.`); }
    if (s.smur) out.push(`Le SMUR est intervenu sur les lieux${s.med ? `, avec le docteur ${s.med.toUpperCase()}` : ''}.`);
    return out.join(' ');
  }
  { const _mc = mcText; mcText = function(f, i, arr){ const t = _mc(f, i, arr), s = f.secours;
      if (!s || !(s.sp || s.smur) || /sapeurs-pompiers sont intervenus|Le SMUR est intervenu/.test(t)) return t;
      return t + '\n\n' + phrase(s); }; }

  /* Fiche enregistrée : bloc Secours avec bouton pour régler, ou bouton pour en ajouter */
  function editSec(f){
    closeDetail(); openForm(f);
    if (!$s('f_secours').checked) { $s('f_secours').checked = true; ST.sp = true; sync(); }
    setTimeout(()=>$s('f_secours').closest('label').scrollIntoView({block:'start', behavior:'smooth'}), 80);
  }
  { const _od = openDetail; openDetail = async function(f){ await _od(f); if (DETAIL !== f.id) return;
      const body = document.getElementById('detBody'); if (!body) return;
      const s = f.secours, btn = `<button type="button" class="secEdit" style="margin-left:auto;border:0;background:none;color:#7fb3ff;font-size:14px;padding:0 2px">${s && (s.sp || s.smur) ? 'Régler' : '＋ Secours'}</button>`;
      const html = s && (s.sp || s.smur) ? panel('Secours', rows(s), btn) : `<div style="display:flex;justify-content:flex-end;margin-top:8px">${btn}</div>`;
      const ctx = [...body.querySelectorAll('section.panel')].find(x=>x.querySelector('h4 span')?.textContent === 'Contexte');
      const last = [...body.querySelectorAll('section.panel')].pop();
      if (ctx) ctx.insertAdjacentHTML('afterend', html); else if (last) last.insertAdjacentHTML('afterend', html); else body.insertAdjacentHTML('beforeend', html);
      body.querySelector('.secEdit').onclick = ()=>editSec(FICHES.find(x=>x.id === f.id) || f);
    }; }
})();
} catch (e) { console.error('[CIF] secours', e); setTimeout(()=>{ throw e; }); }
