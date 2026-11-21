'use strict';
/* CIF 2.0 — v1.2.5 / 1.2.6 : chronologie de l'intervention (CHRONUS).
   Bouton horloge « + » à côté de « Date & heure » : chaque appui ajoute une ligne avec l'heure de l'appui
   (modifiable) et l'événement : choix rapide (SMUR, officier, permanence, levée du corps, pompiers…) ou texte libre
   avec correction orthographique. Main courante : lignes recopiées telles quelles, tout en bas. */
(()=>{
  const PRESETS = ['SMUR sur place', 'Officier sur place', 'Permanence sur place', 'Levée du corps', 'Pompiers sur place', 'Départ des pompiers'];
  const ICON_CLK = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/><path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21" stroke-width="1.6"/></svg>';
  document.head.insertAdjacentHTML('beforeend', `<style>
#evHead{display:flex;align-items:flex-end;justify-content:space-between;gap:8px}
#evHead label.f{flex:1}
#evAdd{flex:0 0 auto;width:40px;height:34px;margin:0 0 3px;border-radius:9px;border:1px solid var(--line);background:var(--panel);color:#7fb3ff;display:flex;align-items:center;justify-content:center;padding:0}
#evAdd:active{transform:scale(.94)}
#evList{display:flex;flex-direction:column;gap:6px;margin-top:6px}
#evList:empty{display:none}
.evRow{display:flex;gap:6px;align-items:center}
.evRow input[type=time]{flex:0 0 104px;min-width:0;padding:8px 6px;text-align:center}
.evRow .evTxt{flex:1;min-width:0;display:flex;gap:6px}
.evRow select,.evRow input[type=text]{flex:1;min-width:0}
.evRow .evDel{flex:0 0 34px;height:40px;border-radius:9px;border:1px solid var(--line);background:transparent;color:#e74c3c;font-size:20px;line-height:1;padding:0}
.evRow .evMenu{flex:0 0 34px;height:40px;border-radius:9px;border:1px solid var(--line);background:var(--panel);color:var(--muted);padding:0;font-size:14px}
</style>`);
  /* ----- Formulaire ----- */
  const dh = $('#f_dateHeure'), lbl = document.querySelector('#form label[for=f_dateHeure]');
  if (!dh || !lbl) return;
  const head = document.createElement('div'); head.id = 'evHead'; lbl.before(head); head.append(lbl);
  head.insertAdjacentHTML('beforeend', `<button type="button" id="evAdd" aria-label="Ajouter un événement à l'heure actuelle" title="Ajouter un événement (heure actuelle)">${ICON_CLK}</button>`);
  dh.insertAdjacentHTML('afterend', '<div id="evList"></div>');
  const list = $('#evList');
  const evs = () => (EDIT.f.evts ||= []);
  const now = () => { const d = new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };
  const opts = v => `<option value="">Événement…</option>${PRESETS.map(p=>`<option${p === v ? ' selected' : ''}>${p}</option>`).join('')}<option value="__autre">Autre (texte libre)…</option>`;
  function rowHTML(e, i){
    const free = e.t && !PRESETS.includes(e.t) || e.free;
    return `<div class="evRow" data-i="${i}"><input type="time" value="${esc(e.h || '')}" data-ek="h">
      <div class="evTxt">${free
        ? `<input type="text" value="${esc(e.t || '')}" data-ek="t" placeholder="Événement" spellcheck="true" autocorrect="on" autocapitalize="sentences" autocomplete="off"><button type="button" class="evMenu" data-ea="menu" aria-label="Choix rapides">▾</button>`
        : `<select data-ek="t">${opts(e.t)}</select>`}</div>
      <button type="button" class="evDel" data-ea="del" aria-label="Supprimer">×</button></div>`;
  }
  function draw(){ if (!EDIT) return; list.innerHTML = (EDIT.f.evts || []).map(rowHTML).join(''); }
  const openPick = sel => { try { sel.showPicker(); } catch { sel.focus(); } };
  $('#evAdd').onclick = ()=>{
    if (!EDIT) return;
    evs().push({h: now(), t: ''}); draw(); draftSoon();
    const sel = list.lastElementChild?.querySelector('select'); if (sel) openPick(sel);
  };
  list.addEventListener('change', e=>{
    const r = e.target.closest('.evRow'); if (!r || !EDIT) return; const ev = evs()[+r.dataset.i]; if (!ev) return;
    if (e.target.tagName === 'SELECT') {
      if (e.target.value === '__autre') { ev.t = ''; ev.free = true; draw(); const inp = list.querySelector(`.evRow[data-i="${r.dataset.i}"] input[type=text]`); inp?.focus(); }
      else { ev.t = e.target.value; delete ev.free; }
    } else if (e.target.dataset.ek === 'h') ev.h = e.target.value;
    draftSoon();
  });
  list.addEventListener('input', e=>{
    const r = e.target.closest('.evRow'); if (!r || !EDIT || e.target.dataset.ek !== 't' || e.target.tagName !== 'INPUT') return;
    const ev = evs()[+r.dataset.i]; if (ev) { ev.t = e.target.value; draftSoon(); }
  });
  list.addEventListener('click', e=>{
    const b = e.target.closest('[data-ea]'); if (!b || !EDIT) return; const i = +b.closest('.evRow').dataset.i, ev = evs()[i];
    if (b.dataset.ea === 'del') { evs().splice(i, 1); draw(); draftSoon(); }
    else if (b.dataset.ea === 'menu' && ev) { ev.free = false; if (!PRESETS.includes(ev.t)) ev.t = ''; draw(); const sel = list.querySelector(`.evRow[data-i="${i}"] select`); if (sel) openPick(sel); }
  });
  { const _of = openForm; openForm = function(...a){ const r = _of.apply(this, a); draw(); return r; }; }
  /* À l'enregistrement : lignes vides retirées, indicateur de saisie libre effacé */
  { const _sf = saveFiche; saveFiche = async function(f){ if (f && f.evts) { f.evts = f.evts.filter(x=>(x.t || '').trim()).map(x=>({h:x.h || '', t:x.t.trim()})); if (!f.evts.length) delete f.evts; } return _sf(f); }; }


  /* ----- Fiche enregistrée : barre « CHRONUS » repliable, tout en bas, avec ajout à l'heure actuelle (v1.2.6) ----- */
  document.head.insertAdjacentHTML('beforeend', `<style>
#chronus{margin-top:14px;border:1px solid var(--line);border-radius:14px;background:var(--panel);overflow:hidden}
#chronus>summary{list-style:none;display:flex;align-items:center;gap:10px;padding:12px 14px;font-weight:700;letter-spacing:.12em;font-size:13px;color:var(--muted);cursor:pointer}
#chronus>summary::-webkit-details-marker{display:none}
#chronus>summary svg{color:#7fb3ff;flex:0 0 auto}
#chronus>summary .n{margin-left:auto;letter-spacing:0;font-weight:600;font-size:12px;background:var(--line);color:var(--fg,#ddd);border-radius:10px;padding:2px 8px}
#chronus>summary .chev{transition:transform .2s;font-size:12px;letter-spacing:0}
#chronus[open]>summary .chev{transform:rotate(90deg)}
#chronus .cl{border-top:1px solid var(--line)}
#chronus .ce{display:flex;gap:12px;padding:10px 14px;border-bottom:1px solid var(--line);font-size:16px}
#chronus .ce b{flex:0 0 52px;font-variant-numeric:tabular-nums}
#chronus .cadd{display:flex;gap:6px;padding:10px 14px;align-items:center}
#chronus .cadd select,#chronus .cadd input{flex:1;min-width:0}
#chronus .cadd .btn{width:auto;margin:0;padding:0 14px;height:40px}
#chronus .empty{padding:10px 14px;color:var(--muted);font-size:14px}
</style>`);
  const CLK = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  let chrOpen = false;
  function chronus(f){
    document.getElementById('chronus')?.remove();
    const body = document.getElementById('detBody'); if (!body) return;
    const L = (f.evts || []).filter(x=>(x.t || '').trim());
    body.insertAdjacentHTML('beforeend', `<details id="chronus"${chrOpen ? ' open' : ''}><summary>${CLK}CHRONUS<span class="n">${L.length}</span><span class="chev">▶</span></summary>
      <div class="cl">${L.length ? L.map(x=>`<div class="ce"><b>${esc(x.h || '—')}</b><span>${esc(x.t)}</span></div>`).join('') : '<div class="empty">Aucun événement noté.</div>'}</div>
      <div class="cadd"><select id="chrSel">${opts('')}</select><input id="chrTxt" type="text" class="hidden" placeholder="Événement" spellcheck="true" autocorrect="on" autocapitalize="sentences" autocomplete="off"><button type="button" class="btn" id="chrAdd">+ ${now()}</button></div></details>`);
    const d = document.getElementById('chronus'), sel = document.getElementById('chrSel'), txt = document.getElementById('chrTxt'), add = document.getElementById('chrAdd');
    d.addEventListener('toggle', ()=>{ chrOpen = d.open; });
    const tick = setInterval(()=>{ if (!document.body.contains(add)) return clearInterval(tick); add.textContent = '+ ' + now(); }, 15000);
    sel.onchange = ()=>{ if (sel.value === '__autre') { sel.classList.add('hidden'); txt.classList.remove('hidden'); txt.focus(); } };
    add.onclick = async ()=>{
      const t = (sel.value && sel.value !== '__autre' ? sel.value : txt.value).trim();
      if (!t) { toast('Choisis ou écris l\'événement'); return; }
      (f.evts ||= []).push({h: now(), t}); await saveFiche(f); chrOpen = true; chronus(f); toast('Événement ajouté');
    };
  }
  { const _od = openDetail; openDetail = async function(f, ...a){ const r = await _od(f, ...a); if (DETAIL === f.id) chronus(f); return r; }; }
  /* ----- Main courante : tout en bas, brut ----- */
  const lines = f => (f.evts || []).filter(x=>(x.t || '').trim()).map(x=>`${x.h ? x.h + ' ' : ''}${x.t.trim()}`);
  { const _mc = mcText; mcText = function(f, ...a){ const t = _mc(f, ...a), L = lines(f); return typeof t === 'string' && L.length ? `${t.replace(/\s+$/,'')}\n\n${L.join('\n')}` : t; }; }
  /* ----- Fiche ouverte et mail ----- */
  { const _fs = ficheSections; ficheSections = function(f){ const S = _fs(f); const L = (f.evts || []).filter(x=>(x.t || '').trim()); if (L.length) S.push(['Chronologie', L.map(x=>[x.h || '—', x.t])]); return S; }; }
})();
