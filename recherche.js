'use strict';
/* CIF 2.0 — v2.0.9 : recherche.js, diffusions de recherche (Réglages › Outils).
   • Personnes : vocabulaire « personne recherchée » partout (l'ancien « nom diffusé » devient « même nom qu'une
     personne recherchée », à vérifier).
   • Véhicules recherchés (volés…) : plaque voiture ou 2 roues, pays, description, motif, date d'établissement de la
     diffusion. Une plaque saisie, scannée ou reprise dans une fiche (CI ou CIF) qui correspond déclenche l'alerte rouge
     « VÉHICULE RECHERCHÉ » : dans le formulaire sous la plaque, dans la liste, dans la fiche et dans l'envoi.
   Répertoire chiffré, rangé avec la diffusion des personnes (LEARN.diffVeh), donc dans la sauvegarde. Rien n'est envoyé. */
try {
(()=>{
  const sh = document.getElementById('diffusion'); if (!sh) return;
  const key = s => String(s||'').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const vList = () => LEARN.diffVeh || [];
  const plateTxt = d => `${formatPlate(d.plaque, d.pays||'F')} (${d.pays||'F'})`;
  const todayFR = () => { const d = new Date(); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; };
  /* véhicules d'une fiche : les siens et, pour un passager, celui du conducteur */
  const vehsOf = f => [...(f.vehicules||[]), ...(f.vehRef ? [f.vehRef] : [])].filter(v=>v && v.plaque);
  const vMatchPlate = p => { const k = key(p); return k.length >= 3 ? vList().filter(d=>key(d.plaque) === k) : []; };
  const vMatches = f => { const out = [], seen = new Set(); for (const v of vehsOf(f)) for (const d of vMatchPlate(v.plaque)) if (!seen.has(d.id)) { seen.add(d.id); out.push(d); } return out; };
  const ICO = t => t === '2RM' ? '🏍️' : '🚗';
  const VBADGE = '<span class="badge" style="background:#e01b1b;color:#fff;letter-spacing:.04em">VÉH. RECHERCHÉ</span>';
  const vAlert = d => `<div class="dalert vdal"><span class="noph">${ICO(d.type)}</span><span><b>⚠ VÉHICULE RECHERCHÉ</b><br>${esc(plateTxt(d))}${d.desc ? ` · ${esc(d.desc)}` : ''}<br><small>${esc(d.motif || 'Diffusion')}${d.le ? ` · diffusion établie le ${esc(d.le)}` : ''}</small></span></div>`;
  document.head.insertAdjacentHTML('beforeend', `<style>
.dalert small{color:#ffc9c9}
.vdiff:empty{display:none}
#diffTabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0 4px}
#diffTabs button{border:1px solid #444;background:#202020;color:var(--muted);border-radius:10px;padding:10px 4px;font-size:15px}
#diffTabs button.on{background:#e01b1b;color:#fff;border-color:#e01b1b;font-weight:700}
#diffV .vtyp{display:flex;gap:8px;margin-top:6px}
#diffV .vtyp button{flex:1;border:1px solid #444;background:#202020;color:var(--muted);border-radius:10px;padding:9px 4px;font-size:14px}
#diffV .vtyp button.on{background:#f2f2f2;color:#111;border-color:#f2f2f2;font-weight:700}
#diffV .prow{display:flex;gap:8px}
#diffV .prow select{flex:0 0 118px}
#vdList .drow{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)}
#vdList .drow .noph{flex:0 0 52px;width:52px;height:52px;border-radius:8px;background:#000;display:flex;align-items:center;justify-content:center;font-size:26px}
#vdList .drow .dn{flex:1;min-width:0}
#vdList .drow small{color:var(--muted)}
#vdList .drow button{border:0;background:none;color:inherit;opacity:.7;padding:8px}
#vdList .drow button svg{width:22px;height:22px}
html.jour #vdList .drow .noph{background:#ffffff}
html.jour #diffTabs button{background:#fff;color:#333;border-color:#8f8f98}
html.jour #diffTabs button.on{background:#e01b1b;color:#fff;border-color:#e01b1b}
html.jour #diffV .vtyp button{background:#fff;color:#333;border-color:#8f8f98}
html.jour #diffV .vtyp button.on{background:#222;color:#fff;border-color:#222}
</style>`);

  /* ----- Personnes : « personne recherchée » au lieu de « nom diffusé » ----- */
  diffAlertHTML = function(list){
    return list.map(({d, full})=>`<div class="dalert${full?'':' part'}">${d.photo ? `<img data-dph="${d.photo}" alt="">` : '<span class="noph">👤</span>'}<span>${full ? '<b>⚠ PERSONNE RECHERCHÉE</b>' : '<b>⚠ PERSONNE RECHERCHÉE ?</b> — même nom, vérifier l\'identité'}<br>${esc(diffName(d))}${d.dn ? ` · né(e) le ${esc(d.dn)}` : ''}</span></div>`).join('');
  };
  const reword = root => root?.querySelectorAll('.badge').forEach(b=>{ if (b.textContent === 'NOM DIFFUSÉ') b.textContent = 'RECHERCHÉ ?'; });

  /* ----- Répertoire : onglets Personnes / Véhicules ----- */
  sh.querySelector('.top h2').textContent = 'Diffusions de recherche';
  const tb = document.getElementById('t_diff'); if (tb) tb.lastChild.textContent = 'Diffusions de recherche (personnes, véhicules)';
  const body = sh.querySelector('.body');
  const hintP = body.querySelector('.hint'); if (hintP) hintP.textContent = 'Personnes recherchées : une fiche à la même identité est signalée en rouge (« même nom » si seul le nom correspond). Répertoire chiffré, gardé sur le téléphone.';
  const P = document.createElement('div'); P.id = 'diffP'; P.append(...body.childNodes);
  const V = document.createElement('div'); V.id = 'diffV'; V.className = 'hidden';
  V.innerHTML = `<p class="hint" style="color:var(--muted);font-size:13px;margin:10px 0 0">Véhicules recherchés (volés…) : une plaque identique saisie ou scannée dans une fiche est signalée en rouge. Répertoire chiffré, gardé sur le téléphone.</p>
    <div class="vtyp" id="v_type"><button type="button" data-t="VL" class="on">🚗 Voiture</button><button type="button" data-t="2RM">🏍️ 2 roues</button><button type="button" data-t="Autre">Autre</button></div>
    <label class="f" for="v_plaque">Plaque</label><div class="prow"><select id="v_pays" aria-label="Pays de la plaque">${paysOptions('F')}</select><input id="v_plaque" autocomplete="off" autocorrect="off" spellcheck="false" autocapitalize="characters" placeholder="AB-123-CD"></div>
    <label class="f" for="v_desc">Marque, modèle, couleur</label><input id="v_desc" autocomplete="off" spellcheck="false" placeholder="ex. Renault Clio grise">
    <label class="f" for="v_motif">Motif</label><input id="v_motif" autocomplete="off" spellcheck="false" value="Vol">
    <label class="f" for="v_le">Diffusion établie le</label><input id="v_le" inputmode="numeric" placeholder="JJ/MM/AAAA" autocomplete="off">
    <div style="display:flex;gap:8px;margin-top:14px"><button type="button" class="btn" id="v_save" style="flex:1">Ajouter</button><button type="button" class="btn" id="v_cancel" style="flex:0 0 110px;background:#333;color:#fff;display:none">Annuler</button></div>
    <div class="sect" id="vdCount">Répertoire</div><div id="vdList"></div>`;
  body.insertAdjacentHTML('afterbegin', '<div id="diffTabs"><button type="button" data-tab="P" class="on">👤 Personnes</button><button type="button" data-tab="V">🚗 Véhicules</button></div>');
  body.append(P, V);
  const tab = t => { document.querySelectorAll('#diffTabs button').forEach(b=>b.classList.toggle('on', b.dataset.tab === t)); P.classList.toggle('hidden', t !== 'P'); V.classList.toggle('hidden', t !== 'V'); if (t === 'V') vList_(); };
  document.getElementById('diffTabs').addEventListener('click', e=>{ const b = e.target.closest('[data-tab]'); if (b) tab(b.dataset.tab); });
  tb?.addEventListener('click', ()=>{ tab('P'); vReset(); });

  let vEdit = null, vType = 'VL';
  const $v = id => document.getElementById(id);
  const setType = t => { vType = t; $v('v_type').querySelectorAll('button').forEach(b=>b.classList.toggle('on', b.dataset.t === t)); $v('v_plaque').placeholder = t === '2RM' ? 'AB-123-CD (2 roues)' : 'AB-123-CD'; };
  $v('v_type').addEventListener('click', e=>{ const b = e.target.closest('[data-t]'); if (b) setType(b.dataset.t); });
  function vReset(){ vEdit = null; setType('VL'); $v('v_pays').value = 'F'; $v('v_plaque').value = ''; $v('v_desc').value = ''; $v('v_motif').value = 'Vol'; $v('v_le').value = todayFR(); $v('v_save').textContent = 'Ajouter'; $v('v_cancel').style.display = 'none'; }
  function vList_(){
    const L = [...vList()].sort((a,b)=>key(a.plaque).localeCompare(key(b.plaque)));
    $v('vdCount').textContent = `Répertoire (${L.length})`;
    $v('vdList').innerHTML = L.length ? L.map(d=>`<div class="drow" data-id="${d.id}"><span class="noph">${ICO(d.type)}</span><div class="dn"><b>${esc(plateTxt(d))}</b>${d.desc ? ' ' + esc(d.desc) : ''}<br><small>${esc(d.motif || 'Diffusion')}${d.le ? ' · établie le ' + esc(d.le) : ''}</small></div><button type="button" data-va="edit" aria-label="Modifier">${ICON.edit}</button><button type="button" data-va="del" aria-label="Supprimer">${ICON.trash}</button></div>`).join('') : '<p class="hint" style="color:var(--muted);font-size:14px;margin:10px 0">Aucun véhicule en diffusion.</p>';
  }
  $v('v_plaque').addEventListener('input', e=>{ const p = e.target.selectionStart; e.target.value = e.target.value.toUpperCase(); e.target.setSelectionRange(p, p); });
  $v('v_plaque').addEventListener('blur', e=>{ if (e.target.value.trim()) e.target.value = formatPlate(e.target.value, $v('v_pays').value); });
  $v('v_le').addEventListener('input', dateMask);
  $v('v_le').addEventListener('blur', e=>{ const m = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(e.target.value.trim()); if (m) e.target.value = `${m[1]}/${m[2]}/${fullYear(m[3])}`; });
  $v('v_cancel').onclick = vReset;
  $v('v_save').onclick = async ()=>{
    const pays = $v('v_pays').value, plaque = formatPlate($v('v_plaque').value.trim(), pays);
    if (key(plaque).length < 3) return toast('La plaque est obligatoire');
    const rec = {plaque, pays, type:vType, desc:$v('v_desc').value.trim(), motif:$v('v_motif').value.trim(), le:$v('v_le').value.trim()};
    const L = LEARN.diffVeh ||= [], old = vEdit && L.find(x=>x.id === vEdit);
    if (!old && L.some(x=>key(x.plaque) === key(plaque))) return toast('Cette plaque est déjà en diffusion');
    if (old) Object.assign(old, rec); else L.push({id:uid(), ...rec, at:Date.now()});
    try { await saveLearn(); toast(old ? 'Diffusion modifiée' : 'Véhicule ajouté à la diffusion'); } catch { toast('Enregistrement impossible'); }
    vReset(); vList_();
  };
  $v('vdList').addEventListener('click', async e=>{
    const row = e.target.closest('.drow'); if (!row) return; const d = vList().find(x=>x.id === row.dataset.id); if (!d) return;
    const a = e.target.closest('[data-va]')?.dataset.va;
    if (a === 'del') { if (!await ask(`Retirer ${plateTxt(d)} de la diffusion ?`, 'Retirer')) return; LEARN.diffVeh = vList().filter(x=>x.id !== d.id); await saveLearn().catch(()=>{}); if (vEdit === d.id) vReset(); return vList_(); }
    if (a === 'edit') { vEdit = d.id; setType(d.type || 'VL'); $v('v_pays').value = d.pays || 'F'; $v('v_plaque').value = d.plaque; $v('v_desc').value = d.desc || ''; $v('v_motif').value = d.motif || ''; $v('v_le').value = d.le || ''; $v('v_save').textContent = 'Enregistrer'; $v('v_cancel').style.display = ''; sh.querySelector('.body').scrollTop = 0; }
  });

  /* ----- Formulaire : alerte sous la plaque ----- */
  const seen = new Set();
  function vehAlert(box){
    if (!box) return;
    let el = box.querySelector('.vdiff'); if (!el) { (box.querySelector('[data-k=hint]') || box.querySelector('.platerow'))?.insertAdjacentHTML('afterend', '<div class="vdiff"></div>'); el = box.querySelector('.vdiff'); }
    const L = vMatchPlate(box.querySelector('[data-k=plaque]')?.value);
    const html = L.map(vAlert).join(''); if (el.innerHTML === html) return;
    el.innerHTML = html;
    for (const d of L) if (!seen.has(d.id)) { seen.add(d.id); toast('⚠ VÉHICULE RECHERCHÉ'); navigator.vibrate?.([200,100,200]); }
  }
  const allAlerts = () => document.querySelectorAll('#vehicles .veh').forEach(vehAlert);
  document.addEventListener('input', e=>{ if (e.target.matches?.('#vehicles [data-k=plaque]')) vehAlert(e.target.closest('.veh')); });
  document.addEventListener('change', e=>{ if (e.target.matches?.('#vehicles [data-k=pays], #vehicles [data-k=plaque]')) vehAlert(e.target.closest('.veh')); });
  { const _pt = plateTidy; plateTidy = function(inp){ const r = _pt.apply(this, arguments); if (inp) vehAlert(inp.closest('.veh')); return r; }; }
  { const _rv = renderVehicles; renderVehicles = function(...a){ const r = _rv.apply(this, a); allAlerts(); return r; }; }
  { const _of = openForm; openForm = function(...a){ seen.clear(); return _of.apply(this, a); }; }
  /* passager : véhicule du conducteur */
  const passAlert = () => { const b = document.getElementById('passBox'); if (!b) return; b.querySelector('.vdiff')?.remove(); const v = EDIT?.f?.passager && EDIT.f.vehRef; if (v) { const L = vMatchPlate(v.plaque); if (L.length) b.insertAdjacentHTML('beforeend', `<div class="vdiff">${L.map(vAlert).join('')}</div>`); } };
  { const pb = document.getElementById('passBox'); if (pb) new MutationObserver(()=>{ if (!pb.querySelector('.vdiff') && EDIT?.f?.vehRef) passAlert(); }).observe(pb, {childList:true}); }

  /* ----- Liste, fiche et envoi ----- */
  { const _r = render; render = function(){ _r(); reword(document.getElementById('list'));
    if (!vList().length) return;
    document.querySelectorAll('#list .card[data-id]').forEach(c=>{ const f = FICHES.find(x=>x.id === c.dataset.id); if (!f || !vMatches(f).length) return; c.classList.add('wanted'); c.querySelector('.name')?.insertAdjacentHTML('afterbegin', VBADGE); });
  }; }
  { const _od = openDetail; openDetail = async function(f){ await _od(f); if (DETAIL !== f.id) return;
    reword(document.getElementById('detTitle'));
    const L = vMatches(f); if (!L.length) return;
    document.getElementById('detTitle')?.insertAdjacentHTML('afterbegin', VBADGE);
    const anchor = document.getElementById('detDiff') || document.querySelector('#detBody .hero');
    anchor?.insertAdjacentHTML('afterend', `<div id="detVDiff">${L.map(vAlert).join('')}</div>`);
  }; }
  { const _fs = ficheSections; ficheSections = function(f){ const S = _fs(f);
    for (const [, rows] of S) for (const r of rows||[]) if (r[0] === 'Diffusion' && /^nom de famille figurant en diffusion/.test(r[1])) r[1] = r[1].replace(/^nom de famille figurant en diffusion/, 'même nom qu\'une personne recherchée, identité à vérifier');
    const L = vMatches(f);
    if (L.length) { const rows = L.map(d=>['Diffusion', `VÉHICULE RECHERCHÉ (${plateTxt(d)}${d.desc ? ', ' + d.desc : ''}${d.motif ? ' — ' + d.motif : ''}${d.le ? ', diffusion établie le ' + d.le : ''})`]); S[0] && S[0][0] === '' ? S[0][1].push(...rows) : S.unshift(['', rows]); }
    return S; }; }
})();
} catch (e) { console.error('[CIF] recherche', e); setTimeout(()=>{ throw e; }); }
