'use strict';
/* CIF 2.0 — v2.0.17 à 2.0.19 : secours.js, secours intervenus sur la fiche (pompiers, SMUR).
   Case « Secours » dans le contexte : Pompiers (chef d'agrès et chef des opérations de secours, grade et nom) et/ou
   SMUR (nom du médecin). Les noms déjà saisis sont proposés à la frappe (le grade connu revient avec le nom).
   Réglable à la création comme après l'enregistrement (fenêtre rapide depuis la fiche, sans rouvrir l'édition). Une personne ajoutée au même contrôle
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
.secI{display:inline-flex;vertical-align:-3px;margin:0 3px;font-size:17px;line-height:1}
.secI.gyro{filter:hue-rotate(215deg) saturate(1.5)}
.secI svg{width:17px;height:17px}
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
  /* v2.0.18 : à l'endroit du résultat (juste sous la ligne Résultat / Antécédents) */
  const res = document.getElementById('f_resultat'), anchor = res?.closest('.cr') || res || obs;
  anchor.after(...wrap.childNodes);
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

  /* Icônes dans le titre : gyrophare bleu (pompiers), croix verte (SMUR) */
  const GYRO = '<span class="secI gyro" title="Pompiers">🚨</span>';
  const CROSS = '<span class="secI" title="SMUR"><svg viewBox="0 0 24 24"><path fill="#1fae4b" d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z"/></svg></span>';
  const icons = f => (f.secours?.sp ? GYRO : '') + (f.secours?.smur ? CROSS : '');
  { const _r = render; render = function(){ _r();
      document.querySelectorAll('#list .card[data-id]').forEach(c=>{ const f = FICHES.find(x=>x.id === c.dataset.id), ic = f && icons(f); if (ic) c.querySelector('.name')?.insertAdjacentHTML('beforeend', ic); });
    }; }

  /* Fiche enregistrée : réglage des secours à la volée (v2.0.19), sans rouvrir l'édition de la fiche */
  document.head.insertAdjacentHTML('beforeend', `<style>
#secSheet{position:fixed;inset:0;z-index:8000;background:rgba(0,0,0,.6);display:flex;align-items:flex-start;justify-content:center;padding:calc(60px + env(safe-area-inset-top)) 14px 14px}
#secSheet.hidden{display:none}
#secSheet .box{width:min(100%,480px);background:var(--panel);border:1px solid #3a5f9e;border-radius:16px;padding:14px 16px;position:relative;overflow:visible}
#secSheet h3{margin:0 0 10px;font-size:18px}
#secSheet .secChips{display:flex;gap:8px}
#secSheet .secChips button{flex:1;padding:10px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:inherit;font-size:15px;font-weight:600}
#secSheet .secChips button.on{background:#fff;color:#111}
#secSheet .secRow{display:flex;gap:8px;align-items:center}
#secSheet .secRow select{flex:0 0 92px}
#secSheet .secRow input{flex:1;min-width:0}
#secSheet .secRow .dr{flex:0 0 auto;font-weight:600;color:var(--muted)}
#secSheet .natb{display:flex;gap:10px;margin-top:16px}
#secSheet .natb button{flex:1;padding:12px;border-radius:12px;border:1px solid var(--line);background:none;color:inherit;font-size:16px}
#secSheet .natb .ok{background:#1f4fbf;border-color:#1f4fbf;color:#fff;font-weight:700}
</style>`);
  document.body.insertAdjacentHTML('beforeend', `<div id="secSheet" class="hidden"><div class="box body"><h3>Secours</h3>
  <div class="secChips"><button type="button" data-s="sp">Pompiers</button><button type="button" data-s="smur">SMUR</button></div>
  <div id="ssSp" class="hidden">
    <label class="f" for="ss_caNom">Chef d'agrès</label>
    <div class="secRow"><select id="ss_caGr" aria-label="Grade du chef d'agrès">${opts}</select><input id="ss_caNom" data-sg="spNoms" autocomplete="off" spellcheck="false" autocapitalize="characters" placeholder="Nom"></div>
    <label class="f" for="ss_cosNom">Chef des opérations de secours (COS)</label>
    <div class="secRow"><select id="ss_cosGr" aria-label="Grade du chef des opérations de secours">${opts}</select><input id="ss_cosNom" data-sg="spNoms" autocomplete="off" spellcheck="false" autocapitalize="characters" placeholder="Nom"></div>
  </div>
  <div id="ssSmur" class="hidden">
    <label class="f" for="ss_med">Médecin du SMUR</label>
    <div class="secRow"><span class="dr">Dr</span><input id="ss_med" data-sg="medecins" autocomplete="off" spellcheck="false" autocapitalize="characters" placeholder="Nom du médecin"></div>
  </div>
  <div class="natb"><button type="button" class="no">Annuler</button><button type="button" class="ok">Enregistrer</button></div></div></div>`);
  const SS = {sp:false, smur:false}; let ssId = null;
  const ssSync = () => { document.querySelectorAll('#secSheet [data-s]').forEach(b=>b.classList.toggle('on', !!SS[b.dataset.s])); $s('ssSp').classList.toggle('hidden', !SS.sp); $s('ssSmur').classList.toggle('hidden', !SS.smur); };
  function editSec(f){
    const s = f.secours || {}; ssId = f.id;
    SS.sp = !!s.sp || !(s.sp || s.smur); SS.smur = !!s.smur;   /* rien encore : Pompiers proposé d'office */
    for (const k of ['caGr','caNom','cosGr','cosNom','med']) $s('ss_' + k).value = s[k] || '';
    ssSync(); $s('secSheet').classList.remove('hidden');
  }
  const ssClose = () => { sgHide(); document.activeElement?.blur?.(); $s('secSheet').classList.add('hidden'); ssId = null; };
  $s('secSheet').addEventListener('click', async e=>{
    const b = e.target.closest('[data-s]'); if (b) { SS[b.dataset.s] = !SS[b.dataset.s]; ssSync(); return; }
    if (e.target === $s('secSheet') || e.target.closest('.no')) return ssClose();
    if (!e.target.closest('.ok')) return;
    const f = FICHES.find(x=>x.id === ssId); if (!f) return ssClose();
    const v = id => $s('ss_' + id).value.trim();
    const n = {sp:SS.sp, smur:SS.smur};
    if (SS.sp) Object.assign(n, {caGr:v('caGr'), caNom:v('caNom'), cosGr:v('cosGr'), cosNom:v('cosNom')});
    if (SS.smur) n.med = v('med');
    f.secours = n.sp || n.smur ? n : null;
    ssClose();
    await saveFiche(f); if (f.secours) learn(f.secours);
    toast(f.secours ? 'Secours enregistrés' : 'Secours retirés');
    render(); if (DETAIL === f.id) openDetail(f);
  });
  /* nom déjà connu : son grade revient tout seul (fenêtre rapide) */
  for (const [g, n] of [['ss_caGr','ss_caNom'], ['ss_cosGr','ss_cosNom']])
    $s(n).addEventListener('change', ()=>{ const gr = (LEARN.spGrade || {})[norm($s(n).value)]; if (gr && !$s(g).value) $s(g).value = gr; });
  { const _od = openDetail; openDetail = async function(f){ await _od(f); if (DETAIL !== f.id) return;
      const body = document.getElementById('detBody'); if (!body) return;
      const s = f.secours, on = !!(s && (s.sp || s.smur)), ic = icons(f);
      if (ic) { const t = document.getElementById('detTitle'), b = [...t.querySelectorAll('.badge')].pop(); b ? b.insertAdjacentHTML('afterend', ic) : t.insertAdjacentHTML('afterbegin', ic); }
      const chip = `<button type="button" class="chip secEdit" style="${on ? 'border:1px solid #3a5f9e;color:#cfe0ff' : 'border:1px dashed #666;color:#bdbdbd'}">${on ? `${ic} Secours` : '＋ Secours'}</button>`;
      const verif = body.querySelector('#detVerif'), chips = body.querySelector('.hero .chips2');
      verif ? verif.insertAdjacentHTML('afterend', chip) : chips?.insertAdjacentHTML('beforeend', chip);
      if (on) body.querySelector('.hero')?.insertAdjacentHTML('afterend', panel('Secours', rows(s), '<button type="button" class="secEdit" style="margin-left:auto;border:0;background:none;color:#7fb3ff;font-size:14px;padding:0 2px">Régler</button>'));
      body.querySelectorAll('.secEdit').forEach(b=>b.onclick = ()=>editSec(FICHES.find(x=>x.id === f.id) || f));
    }; }
})();
} catch (e) { console.error('[CIF] secours', e); setTimeout(()=>{ throw e; }); }
