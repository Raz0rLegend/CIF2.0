'use strict';
/* CIF 2.0 — v1.0.14 : date d'expiration de la pièce et alerte « pièce expirée » (à la date du contrôle).
   Cartes d'identité délivrées du 02/01/2004 au 31/12/2013 à un majeur : valables 5 ans après la date imprimée
   (décret n° 2013-1188 du 18 décembre 2013). Mineur à la délivrance : pas de prolongation. */
(()=>{
  FIELDS.push('docExp'); ID_FIELDS.push('docExp'); CIF_FIELDS.push('docExp');
  const row = $('#f_docDate')?.closest('div')?.parentNode; if (!row) return;
  row.insertAdjacentHTML('afterend', `<label class="f" for="f_docExp">Date d'expiration (imprimée)</label><input id="f_docExp" inputmode="numeric" placeholder="JJ/MM/AAAA" autocomplete="off"><div id="expHint" style="font-size:14px;margin-top:6px"></div>`);
  const toD = s => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s||'').trim()); return m ? new Date(+m[3], m[2]-1, +m[1]) : null; };
  const fmt = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  /* f : {docExp, docDate, dateNaissance, docType, dateHeure} → date de fin réelle, jours restants au contrôle, prolongation */
  function expInfo(f){
    const e = toD(f.docExp); if (!e) return null;
    let end = e, pro = false, unsure = false;
    const del = toD(f.docDate), t = String(f.docType||'').toUpperCase();
    if ((t === 'CNI' || !t) && del && del >= new Date(2004,0,2) && del <= new Date(2013,11,31)) {
      const dn = toD(f.dateNaissance);
      const adult = dn ? (new Date(dn.getFullYear()+18, dn.getMonth(), dn.getDate()) <= del) : null;
      if (adult !== false) { end = new Date(e.getFullYear()+5, e.getMonth(), e.getDate()); pro = true; unsure = adult === null; }
    }
    const r = f.dateHeure && !isNaN(new Date(f.dateHeure)) ? new Date(f.dateHeure) : new Date(); r.setHours(0,0,0,0);
    const days = Math.round((end - r) / 864e5);
    const note = pro ? ` (date imprimée ${f.docExp} + 5 ans : carte délivrée entre 2004 et 2013${unsure ? ', si majeur à la délivrance' : ' à un majeur'})` : '';
    const text = (days < 0 ? `PIÈCE EXPIRÉE depuis le ${fmt(end)}` : days <= 30 ? `expire dans ${days} jour${days>1?'s':''} (le ${fmt(end)})` : `valide jusqu'au ${fmt(end)}`) + note;
    return {end: fmt(end), days, pro, unsure, text};
  }
  window.expInfo = expInfo;
  const formF = () => ({docExp:$('#f_docExp').value, docDate:$('#f_docDate').value, dateNaissance:$('#f_dateNaissance').value, docType:$('#f_docType').value, dateHeure:$('#f_dateHeure').value});
  window.expForm = () => expInfo(formF());
  function syncExp(){
    const el = $('#expHint'), i = expInfo(formF());
    if (!i) { el.textContent = ''; el.style.cssText = 'font-size:14px;margin-top:6px'; return; }
    el.textContent = (i.days <= 30 ? '⚠ ' : '✓ ') + i.text;
    el.style.cssText = i.days < 0 ? 'margin-top:8px;font-size:15px;font-weight:700;padding:9px 12px;border-radius:10px;background:#b3261e;color:#fff'
      : i.days <= 30 ? 'margin-top:6px;font-size:14px;color:#f39c34;font-weight:600' : 'margin-top:6px;font-size:14px;color:#3ccf4e';
  }
  window.syncExp = syncExp;
  $('#f_docExp').addEventListener('input', e=>{ dateMask(e); syncExp(); });
  $('#f_docExp').addEventListener('blur', e=>{ const m = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(e.target.value.trim()); if (m) e.target.value = `${m[1]}/${m[2]}/20${m[3]}`; syncExp(); });
  ['f_dateHeure','f_docDate','f_dateNaissance','f_docType'].forEach(id=>['input','change','blur'].forEach(ev=>$('#'+id)?.addEventListener(ev, ()=>setTimeout(syncExp))));
  { const _of = openForm; openForm = function(f, d){ _of(f, d); syncExp(); }; }
  { const _ii = idInherit; idInherit = function(src){ _ii(src); syncExp(); }; }
  { const _cf = closeForm; closeForm = async function(save){ if (save && EDIT && segVal('docSeg') === 'Sur dires') $('#f_docExp').value = ''; return _cf(save); }; }
  const docOK = f => f.type === 'CIF' && f.docMode !== 'Sur dires' && f.docExp;
  const expired = f => { if (!docOK(f)) return false; const i = expInfo(f); return !!i && i.days < 0; };
  /* Fiche */
  { const _od = openDetail; openDetail = async function(f){ await _od(f); if (DETAIL !== f.id || !docOK(f)) return;
    const i = expInfo(f); if (!i) return;
    const sec = [...$('#detBody').querySelectorAll('section.panel')].find(s=>s.querySelector('h4 span')?.textContent === 'Pièce d\'identité');
    const col = i.days < 0 ? '#ff5a52' : i.days <= 30 ? '#f39c34' : '#3ccf4e';
    sec?.querySelector('.grid')?.insertAdjacentHTML('beforeend', `<div class="cell full"><div class="k">Validité</div><div class="v" style="color:${col};font-weight:700">${esc(i.text)}</div></div>`);
    if (i.days < 0) $('#detTitle').insertAdjacentHTML('beforeend', '<span class="badge" style="background:#b3261e;color:#fff;margin-left:6px">PIÈCE EXPIRÉE</span>'); }; }
  /* Envoi */
  { const _fs = ficheSections; ficheSections = function(f){ const S = _fs(f), d = S.find(x=>x[0] === 'Document'); if (d && docOK(f)) { const i = expInfo(f); if (i) d[1].push(['Validité', i.text]); } return S; }; }
  /* Main courante */
  { const _mc = mcText; mcText = function(f){ const t = _mc(f); if (!expired(f)) return t; const i = expInfo(f); return t.replace(/(\n\nIdentité relevée sur[^\n]*?\.)(?=\n|$)/, `$1 Cette pièce est expirée depuis le ${dateLettres(i.end)}.`); }; }
  /* Liste : badge */
  { const _r = render; render = function(){ _r(); document.querySelectorAll('#list .card[data-id]').forEach(c=>{ const f = FICHES.find(x=>x.id===c.dataset.id); if (f && expired(f)) c.querySelector('.name')?.insertAdjacentHTML('afterbegin', '<span class="badge" style="background:#b3261e;color:#fff">EXPIRÉE</span>'); }); }; }
})();
