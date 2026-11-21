'use strict';
/* CIF 2.0 — v1.2.5 : chronologie de l'intervention.
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

  /* ----- Main courante : tout en bas, brut ----- */
  const lines = f => (f.evts || []).filter(x=>(x.t || '').trim()).map(x=>`${x.h ? x.h + ' ' : ''}${x.t.trim()}`);
  { const _mc = mcText; mcText = function(f, ...a){ const t = _mc(f, ...a), L = lines(f); return typeof t === 'string' && L.length ? `${t.replace(/\s+$/,'')}\n\n${L.join('\n')}` : t; }; }
  /* ----- Fiche ouverte et mail ----- */
  { const _fs = ficheSections; ficheSections = function(f){ const S = _fs(f); const L = (f.evts || []).filter(x=>(x.t || '').trim()); if (L.length) S.push(['Chronologie', L.map(x=>[x.h || '—', x.t])]); return S; }; }
})();
