'use strict';
/* CIF 2.0 — v1.1.2 : bouton rouge « Intervention »
   Un appui au moment de l'appel du PC fige la date et l'heure de l'appel. Un bandeau rouge
   (même format que « Reprendre le contrôle précédent ») permet ensuite d'ouvrir la fiche :
   sa date et son heure sont celles de l'appel, verrouillées. Le bandeau disparaît une fois la fiche enregistrée. */
(()=>{
  let INTERV = [];
  const load = async () => { try { INTERV = (await dbGet('meta','interv')) || []; } catch { INTERV = []; } };
  const save = () => dbPut('meta', INTERV, 'interv').catch(()=>{});
  const hm = s => s.slice(11, 16);
  document.head.insertAdjacentHTML('beforeend', `<style>
#interBtn{position:fixed;left:20px;bottom:calc(84px + env(safe-area-inset-bottom) - var(--gb,0px));width:62px;height:62px;border-radius:50%;background:#d32f2f;color:#fff;border:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;box-shadow:0 6px 18px rgba(0,0,0,.5);z-index:6;font-size:9.5px;font-weight:800;letter-spacing:.4px;animation:interPulse 1.6s ease-out infinite}
#interBtn svg{width:26px;height:26px}
#interBtn:active{transform:scale(.94)}
@keyframes interPulse{0%{box-shadow:0 0 0 0 rgba(211,47,47,.65),0 6px 18px rgba(0,0,0,.5)}70%{box-shadow:0 0 0 18px rgba(211,47,47,0),0 6px 18px rgba(0,0,0,.5)}100%{box-shadow:0 0 0 0 rgba(211,47,47,0),0 6px 18px rgba(0,0,0,.5)}}
#interBtn.hidden{display:none}
.ivBan{display:flex;align-items:center;gap:10px;margin:10px 12px 4px;padding:11px 14px;border:1px solid #8a1f1f;border-radius:12px;background:#3a1212;color:#ffd0cc;font-size:15px;position:relative;z-index:2}
.ivBan button{border:0;background:none;color:inherit;padding:0;font-size:15px}
.ivBan .ivOpen{flex:1;text-align:left}
.ivBan small{color:#e7a49e}
.ivBan .ivDrop{color:#e7a49e;font-size:14px;padding:6px}
#intHint{font-size:13px;color:#ff8a80;margin-top:6px}
#intHint button{border:0;background:none;color:#7fb3ff;font-size:13px;padding:0 0 0 6px;text-decoration:underline}
</style>`);
  $('#fab').insertAdjacentHTML('afterend', `<button id="interBtn" type="button" aria-label="Intervention : figer l'heure de l'appel du PC"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18v-6a5 5 0 0 1 10 0v6"/><path d="M5 18h14v3H5z"/><path d="M12 2v2M4.2 5.2l1.4 1.4M19.8 5.2l-1.4 1.4M2 12h2M20 12h2"/></svg>INTER</button>`);

  const banner = () => INTERV.map(s=>{
    const mins = Math.max(0, Math.round((Date.now() - s.ts)/6e4));
    const ago = mins < 1 ? 'à l\'instant' : mins < 60 ? `il y a ${mins} min` : mins < 1440 ? `il y a ${Math.round(mins/60)} h` : `le ${fmtD(s.ts)}`;
    return `<div class="ivBan" data-iv="${s.id}"><span style="font-size:20px">🚨</span>
      <button type="button" class="ivOpen"><b>Intervention — appel PC à ${hm(s.at)}</b><br><small>${esc(fmtDT(s.at))} · ${ago} · ouvrir la fiche</small></button>
      <button type="button" class="ivDrop">Annuler</button></div>`;
  }).join('');
  { const _r = render; render = function(){
    _r();
    $('#interBtn').classList.toggle('hidden', $('#fab').classList.contains('hidden'));
    if (INTERV.length && !EDIT) $('#list').insertAdjacentHTML('afterbegin', banner());
  }; }

  $('#interBtn').onclick = async ()=>{
    const s = {id: uid(), at: nowLocal(), ts: Date.now()};
    INTERV.push(s); await save();
    navigator.vibrate?.(80);
    toast(`Appel PC à ${hm(s.at)} : heure figée`);
    render();
  };
  $('#list').addEventListener('click', async e=>{
    const ban = e.target.closest('.ivBan'); if (!ban) return;
    const s = INTERV.find(x=>x.id === ban.dataset.iv); if (!s) return;
    if (e.target.closest('.ivDrop')) {
      if (await ask(`Annuler l'intervention de ${hm(s.at)} ?`, 'Annuler l\'intervention', true, 'Garder')) { INTERV = INTERV.filter(x=>x !== s); await save(); render(); }
      return;
    }
    openForm(null);
    EDIT.f.intervId = s.id; EDIT.f.appelPC = s.at; EDIT.f.dateHeure = s.at;
    $('#f_dateHeure').value = s.at; window.syncAge?.(); lockTime();
    draftSoon();
  });

  /* Formulaire : date et heure verrouillées sur l'appel du PC */
  $('#f_dateHeure').insertAdjacentHTML('afterend', '<div id="intHint" class="hidden"></div>');
  function lockTime(){
    const f = EDIT?.f, h = $('#intHint'), inp = $('#f_dateHeure');
    if (!f || !f.appelPC) { h.classList.add('hidden'); inp.readOnly = false; inp.style.opacity = ''; return; }
    const locked = inp.value === f.appelPC && !f.intervUnlock;
    inp.readOnly = locked; inp.style.opacity = locked ? '.75' : '';
    h.innerHTML = `🚨 Intervention : appel du PC à ${esc(hm(f.appelPC))}${locked ? ' — date et heure verrouillées<button type="button" id="intUnlock">Modifier</button>' : ''}`;
    h.classList.remove('hidden');
    $('#intUnlock')?.addEventListener('click', ()=>{ f.intervUnlock = true; lockTime(); inp.focus(); });
  }
  { const _of = openForm; openForm = function(f, d){ _of(f, d); lockTime(); }; }
  { const _cf = closeForm; closeForm = async function(saveIt){
    const id = EDIT?.f?.intervId;
    await _cf(saveIt);
    if (saveIt && !EDIT && id && INTERV.some(x=>x.id === id)) { INTERV = INTERV.filter(x=>x.id !== id); await save(); render(); }
  }; }
  /* Fiche et envoi : heure de l'appel du PC */
  { const _fs = ficheSections; ficheSections = function(f){
    const S = _fs(f);
    if (f.appelPC && S[0]) S[0][1].splice(1, 0, ['Appel du PC', fmtDT(f.appelPC)]);
    return S; }; }

  load().then(()=>{ if (KEY && !EDIT) render(); });
})();
