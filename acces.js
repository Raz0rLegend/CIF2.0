'use strict';
/* CIF 2.0 — v2.0.0 : acces.js, regroupement de modules (verrou et Face ID, intervention, suggestions, sexe deviné, employeur, VIF).
   Modules d'origine, dans l'ordre de chargement : verrou.js, intervention.js, suggest.js, genre.js, employeur.js, vif.js.
   Chaque module reste isolé : une erreur dans l'un n'empêche pas les suivants de se charger. */
/* ===== verrou.js ===== */
try {
/* CIF 2.0 — v1.1.2 / 1.1.6 / 1.1.11 : Face ID ne se lance jamais tout seul.
   Toucher le champ du code ouvre le clavier ; seul le bouton « Face ID » lance la biométrie.
   À l'ouverture, l'appli lançait Face ID avant le chargement de ce module : la clé biométrique
   est donc rangée sous un autre nom (« bioX »), que le démarrage ne voit pas. Ce module traduit
   « bio » ↔ « bioX » pour le reste de l'appli (activation, désactivation, déverrouillage). */
(()=>{
  const _bio = bioUnlock;
  bioUnlock = function(auto){ if (auto) return Promise.resolve(); return _bio(auto); };
  const P = IDBObjectStore.prototype, G = P.get, PU = P.put, DE = P.delete;
  const map = (st, k) => st.name === 'meta' && k === 'bio' ? 'bioX' : k;
  P.get = function(k){ return G.call(this, map(this, k)); };
  P.put = function(v, k){ return arguments.length > 1 ? PU.call(this, v, map(this, k)) : PU.call(this, v); };
  P.delete = function(k){ return DE.call(this, map(this, k)); };
  /* Ancienne clé « bio » → « bioX », puis bouton Face ID affiché si besoin */
  try {
    const st = db.transaction('meta', 'readwrite').objectStore('meta'), r = G.call(st, 'bio');
    r.onsuccess = () => { if (r.result) { PU.call(st, r.result, 'bioX'); DE.call(st, 'bio'); } };
    st.transaction.oncomplete = async () => {
      if (KEY || lockMode !== 'unlock' || !(await dbGet('meta', 'bio'))) return;
      $('#bioLbl').textContent = IS_IOS ? 'Face ID' : 'Biométrie'; $('#bioBtn').classList.remove('hidden');
    };
  } catch {}
})();
} catch (e) { console.error('[CIF] verrou.js', e); setTimeout(()=>{ throw e; }); }
/* ===== intervention.js ===== */
try {
/* CIF 2.0 — v1.1.2 à 1.1.6 : bouton rouge « Intervention », sur l'écran du code (sans déverrouiller) et sur la liste
   Un appui au moment de l'appel du PC fige la date et l'heure de l'appel. Un bandeau rouge
   (même format que « Reprendre le contrôle précédent ») permet ensuite d'ouvrir la fiche :
   l'heure de l'appel y est gardée à part (verrouillée), la date et l'heure de la fiche sont celles de son ouverture.
   Le bandeau disparaît une fois la fiche enregistrée. */
(()=>{
  let INTERV = [];
  const load = async () => { try { INTERV = (await dbGet('meta','interv')) || []; } catch { INTERV = []; } };
  const save = () => dbPut('meta', INTERV, 'interv').catch(()=>{});
  const hm = s => s.slice(11, 16);
  document.head.insertAdjacentHTML('beforeend', `<style>
#interBtn{width:100%;margin-top:14px;padding:14px 12px;border-radius:14px;background:#d32f2f;color:#fff;border:0;display:flex;align-items:center;justify-content:center;gap:10px;font-size:17px;font-weight:800;letter-spacing:.5px;animation:interPulse 1.6s ease-out infinite}
#interBtn svg{width:24px;height:24px;flex:none}
#interBtn small{display:block;font-size:12px;font-weight:500;letter-spacing:0;opacity:.9}
#interBtn:active{transform:scale(.97)}
@keyframes interPulse{0%{box-shadow:0 0 0 0 rgba(211,47,47,.65)}70%{box-shadow:0 0 0 14px rgba(211,47,47,0)}100%{box-shadow:0 0 0 0 rgba(211,47,47,0)}}
#interBtn.hidden,#ivLock.hidden{display:none}
#ivLock{margin-top:8px;font-size:14px;color:#ff8a80}
#interFab{position:fixed;left:20px;bottom:calc(84px + env(safe-area-inset-bottom) - var(--gb,0px));width:62px;height:62px;border-radius:50%;background:#d32f2f;color:#fff;border:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;z-index:6;font-size:9.5px;font-weight:800;letter-spacing:.4px;animation:interPulse 1.6s ease-out infinite}
#interFab svg{width:26px;height:26px}
#interFab:active{transform:scale(.94)}
#interFab.hidden{display:none}
.ivBan{display:flex;align-items:center;gap:10px;margin:10px 12px 4px;padding:11px 14px;border:1px solid #8a1f1f;border-radius:12px;background:#3a1212;color:#ffd0cc;font-size:15px;position:relative;z-index:2}
.ivBan button{border:0;background:none;color:inherit;padding:0;font-size:15px}
.ivBan .ivOpen{flex:1;text-align:left}
.ivBan small{color:#e7a49e}
.ivBan .ivDrop{color:#e7a49e;font-size:14px;padding:6px}
#intHint{font-size:13px;color:#ff8a80;margin-top:6px}
#ivAppel.hidden,#intUnlock.hidden{display:none}
</style>`);
  $('#forgot').insertAdjacentHTML('beforebegin', `<button id="interBtn" type="button" aria-label="Intervention : figer l'heure de l'appel du PC"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18v-6a5 5 0 0 1 10 0v6"/><path d="M5 18h14v3H5z"/><path d="M12 2v2M4.2 5.2l1.4 1.4M19.8 5.2l-1.4 1.4M2 12h2M20 12h2"/></svg><span>INTERVENTION<small>figer l'heure de l'appel du PC</small></span></button><div id="ivLock" class="hidden"></div>`);
  /* Doublon sur la liste des fiches, en bas à gauche face au bouton + */
  $('#fab').insertAdjacentHTML('afterend', `<button id="interFab" type="button" aria-label="Intervention : figer l'heure de l'appel du PC"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18v-6a5 5 0 0 1 10 0v6"/><path d="M5 18h14v3H5z"/><path d="M12 2v2M4.2 5.2l1.4 1.4M19.8 5.2l-1.4 1.4M2 12h2M20 12h2"/></svg>INTER</button>`);
  /* Écran du code : bouton visible au déverrouillage (pas à la création du code), rappel des appels figés */
  const lockInfo = () => { const el = $('#ivLock'); el.textContent = INTERV.length ? `🚨 Appel${INTERV.length>1?'s':''} PC figé${INTERV.length>1?'s':''} : ${INTERV.map(x=>hm(x.at)).join(', ')}` : ''; el.classList.toggle('hidden', !INTERV.length || lockMode !== 'unlock'); };
  $('#interBtn').classList.toggle('hidden', lockMode === 'setup');
  { const _sl = showLock; showLock = function(setup){ const r = _sl(setup); $('#interBtn').classList.toggle('hidden', !!setup); lockInfo(); return r; }; }

  const banner = () => INTERV.map(s=>{
    const mins = Math.max(0, Math.round((Date.now() - s.ts)/6e4));
    const ago = mins < 1 ? 'à l\'instant' : mins < 60 ? `il y a ${mins} min` : mins < 1440 ? `il y a ${Math.round(mins/60)} h` : `le ${fmtD(s.ts)}`;
    return `<div class="ivBan" data-iv="${s.id}"><span style="font-size:20px">🚨</span>
      <button type="button" class="ivOpen"><b>Intervention — appel PC à ${hm(s.at)}</b><br><small>${esc(fmtDT(s.at))} · ${ago} · ouvrir la fiche</small></button>
      <button type="button" class="ivDrop">Annuler</button></div>`;
  }).join('');
  { const _r = render; render = function(){
    _r();
    $('#interFab').classList.toggle('hidden', $('#fab').classList.contains('hidden'));
    if (INTERV.length && !EDIT) $('#list').insertAdjacentHTML('afterbegin', banner());
  }; }

  $('#interBtn').onclick = $('#interFab').onclick = async ()=>{
    const s = {id: uid(), at: nowLocal(), ts: Date.now()};
    INTERV.push(s); await save();
    navigator.vibrate?.(80);
    toast(`Appel PC à ${hm(s.at)} : heure figée`);
    lockInfo(); if (KEY) render();
  };
  $('#list').addEventListener('click', async e=>{
    const ban = e.target.closest('.ivBan'); if (!ban) return;
    const s = INTERV.find(x=>x.id === ban.dataset.iv); if (!s) return;
    if (e.target.closest('.ivDrop')) {
      if (await ask(`Annuler l'intervention de ${hm(s.at)} ?`, 'Annuler l\'intervention', true, 'Garder')) { INTERV = INTERV.filter(x=>x !== s); await save(); render(); }
      return;
    }
    openForm(null);
    EDIT.f.intervId = s.id; EDIT.f.appelPC = s.at;   /* date & heure de la fiche = maintenant (ouverture) */
    lockTime(); placeMotif();
    draftSoon();
  });

  /* Formulaire : heure de l'appel du PC (verrouillée) au-dessus de la date et l'heure d'ouverture de la fiche */
  const dhLabel = $('label[for=f_dateHeure]');
  dhLabel.insertAdjacentHTML('beforebegin', `<div id="ivAppel" class="hidden"><label class="f" for="f_appelPC" style="color:#ff8a80">🚨 Appel du PC</label><div style="display:flex;gap:8px;align-items:center"><input id="f_appelPC" type="datetime-local" readonly style="flex:1;border-color:#8a1f1f"><button type="button" id="intUnlock" style="border:0;background:none;color:#7fb3ff;font-size:14px;text-decoration:underline;padding:6px 0">Modifier</button></div></div>`);
  $('#f_dateHeure').insertAdjacentHTML('afterend', '<div id="intHint" class="hidden"></div>');
  $('#f_appelPC').addEventListener('input', e=>{ if (EDIT?.f && e.target.value) { EDIT.f.appelPC = e.target.value; draftSoon(); } });
  $('#intUnlock').addEventListener('click', ()=>{ const i = $('#f_appelPC'); i.readOnly = false; $('#intUnlock').classList.add('hidden'); i.focus(); });
  function lockTime(){
    const f = EDIT?.f, iv = !!(f && f.appelPC);
    $('#ivAppel').classList.toggle('hidden', !iv);
    dhLabel.textContent = iv ? 'Ouverture de la fiche' : 'Date & heure';
    $('#f_dateHeure').readOnly = false; $('#f_dateHeure').style.opacity = '';
    if (!iv) { $('#intHint').classList.add('hidden'); return; }
    const a = $('#f_appelPC'); a.value = f.appelPC; a.readOnly = true; $('#intUnlock').classList.remove('hidden');
    $('#intHint').classList.add('hidden');
  }
  /* Fiche d'intervention : le motif remonte juste sous la date et l'heure */
  const motifNodes = [$('label[for=f_motif]'), $('#f_motif'), $('#motifChips')];
  const motifHome = document.createComment('motif'); motifNodes[0].before(motifHome);
  $('#intHint').insertAdjacentHTML('afterend', '<div id="ivMotif"></div>');
  function placeMotif(){
    const iv = !!EDIT?.f?.appelPC;
    if (iv && motifNodes[0].parentNode.id !== 'ivMotif') $('#ivMotif').append(...motifNodes);
    if (!iv && motifNodes[0].parentNode.id === 'ivMotif') motifHome.after(...motifNodes);
    motifNodes[0].textContent = iv ? 'Motif de l\'intervention' : 'Motif';
  }
  { const _of = openForm; openForm = function(f, d){ _of(f, d); lockTime(); placeMotif(); }; }
  { const _cf = closeForm; closeForm = async function(saveIt){
    const id = EDIT?.f?.intervId;
    await _cf(saveIt);
    if (saveIt && !EDIT && id && INTERV.some(x=>x.id === id)) { INTERV = INTERV.filter(x=>x.id !== id); await save(); render(); }
  }; }
  /* Fiche et envoi : heure de l'appel du PC */
  { const _fs = ficheSections; ficheSections = function(f){
    const S = _fs(f);
    if (f.appelPC && S[0]) { const r = S[0][1].find(x=>x[0] === 'Date & heure'); if (r) r[0] = 'Ouverture de la fiche'; S[0][1].unshift(['Appel du PC', fmtDT(f.appelPC)]); }
    return S; }; }

  /* Fiche ouverte et liste : heure de l'appel du PC en plus de l'heure de la fiche */
  { const _od = openDetail; openDetail = async function(f){ await _od(f); if (DETAIL !== f.id || !f.appelPC) return;
    const clock = [...$('#detBody').querySelectorAll('.hero .chip')].find(c=>c.querySelector('svg') && c.textContent.trim() === fmtDT(f.dateHeure));
    const html = `<span class="chip" style="color:#ff8a80;border:1px solid #8a1f1f">🚨 Appel PC ${esc(fmtDT(f.appelPC))}</span>`;
    clock ? clock.insertAdjacentHTML('beforebegin', html) : $('#detBody .hero .chips2')?.insertAdjacentHTML('afterbegin', html);
  }; }
  { const _r2 = render; render = function(){ _r2();
    document.querySelectorAll('#list .card[data-id]').forEach(c=>{ const f = FICHES.find(x=>x.id === c.dataset.id); if (f?.appelPC && f.appelPC !== f.dateHeure) (c.querySelector('.sub') || c.querySelector('.r1'))?.insertAdjacentHTML('afterend', `<div class="note" style="color:#ff8a80">🚨 Appel PC à ${esc(hm(f.appelPC))} · fiche ouverte à ${esc(hm(f.dateHeure||''))}</div>`); });
  }; }

  load().then(()=>{ lockInfo(); if (KEY && !EDIT) render(); });
})();
} catch (e) { console.error('[CIF] intervention.js', e); setTimeout(()=>{ throw e; }); }
/* ===== suggest.js ===== */
try {
/* CIF 2.0 — v1.1.5 / 1.1.19 : suggestions (ville, nationalité, lieu…) affichées de préférence SOUS le champ.
   Si la place manque sous le champ (clavier ouvert), le formulaire défile pour faire de la place ;
   sinon la liste est raccourcie ; elle ne passe au-dessus du champ qu'en dernier recours. */
(()=>{
  const MIN = 150;   /* hauteur minimale utile (≈ 3 suggestions) */
  sgPlace = function(inp){
    const host = inp.closest('.body');
    sgBox.style.maxHeight = '';
    if (!host) { const r = inp.getBoundingClientRect(); sgBox.style.position = 'fixed'; sgBox.style.left = r.left+'px'; sgBox.style.width = r.width+'px'; sgBox.style.top = (r.bottom + 2)+'px'; return; }
    if (sgBox.parentNode !== host) host.appendChild(sgBox);
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    const vv = window.visualViewport;
    let hr = host.getBoundingClientRect(), r = inp.getBoundingClientRect();
    /* bas visible : le plus haut entre le clavier et le bas de la zone qui défile (barre Annuler / Enregistrer) */
    const visBottom = Math.min(vv ? vv.offsetTop + vv.height : window.innerHeight, hr.bottom);
    const visTop = Math.max(hr.top, vv ? vv.offsetTop : 0);
    const h = Math.min(sgBox.scrollHeight + 2, 260), need = h + 10, min = Math.min(MIN, h);
    /* Pas assez de place dessous : on fait défiler le formulaire pour remonter le champ */
    let below = visBottom - r.bottom;
    if (below < need) {
      const room = host.scrollHeight - host.clientHeight - host.scrollTop;          /* défilement encore possible */
      const keep = r.top - visTop - 8;                                              /* le champ reste visible en haut */
      const d = Math.max(0, Math.min(need - below + 2, room, keep));
      if (d > 0) { host.scrollTop = host.scrollTop + d; hr = host.getBoundingClientRect(); r = inp.getBoundingClientRect(); below = visBottom - r.bottom; }
    }
    let up = false;
    if (below < need) {
      if (below - 8 >= min) sgBox.style.maxHeight = (below - 8) + 'px';           /* liste raccourcie, toujours dessous */
      else if (r.top - visTop > below) { up = true; sgBox.style.maxHeight = Math.min(260, r.top - visTop - 8) + 'px'; }
      else sgBox.style.maxHeight = Math.max(100, below - 8) + 'px';
    }
    const bh = sgBox.offsetHeight;
    sgBox.style.position = 'absolute'; sgBox.style.bottom = ''; sgBox.style.margin = '0';
    sgBox.style.left = (r.left - hr.left + host.scrollLeft) + 'px'; sgBox.style.width = r.width + 'px';
    sgBox.style.top = (up ? r.top - hr.top + host.scrollTop - bh - 2 : r.bottom - hr.top + host.scrollTop + 2) + 'px';
    sgBox.style.borderRadius = up ? '12px 12px 4px 4px' : '4px 4px 12px 12px';
  };
})();
} catch (e) { console.error('[CIF] suggest.js', e); setTimeout(()=>{ throw e; }); }
/* ===== genre.js ===== */
try {
/* CIF 2.0 — v1.1.7 : case Homme / Femme devinée d'après le prénom.
   Seulement si la case est vide (ou avait été devinée) : un choix fait à la main n'est jamais changé.
   Prénom mixte ou inconnu (Camille, Dominique, Claude…) : rien n'est coché.
   La liste des prénoms (prenoms.js, ≈ 45 Ko) est chargée une seule fois, au premier prénom tapé. */
(()=>{
  let M = null, F = null, loading = null;
  const load = () => loading || (loading = new Promise(res=>{
    const s = document.createElement('script'); s.src = 'prenoms.js?v=' + APP_VERSION;
    s.onload = () => { M = new Set((window.PRENOMS_M||'').split('|')); F = new Set((window.PRENOMS_F||'').split('|')); res(); };
    s.onerror = () => { loading = null; res(); };
    document.head.appendChild(s);
  }));
  const key = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z\- ]/g, '').trim();
  function guess(prenom){
    if (!M) return '';
    const full = key(prenom).split(/\s+/)[0] || '';            /* premier prénom (« Jean-Pierre Paul » → « jean-pierre ») */
    for (const k of [full, full.split('-')[0]]) {              /* sinon la première partie d'un prénom composé */
      if (!k) continue;
      if (M.has(k)) return 'H';
      if (F.has(k)) return 'F';
      if (k === full && /-/.test(full)) continue;
      return '';                                               /* inconnu ou mixte : on ne coche rien */
    }
    return '';
  }
  const sx = $('#f_sexe');
  const lbl = [...document.querySelectorAll('label.f')].find(l=>l.textContent === 'Sexe');
  if (lbl) lbl.insertAdjacentHTML('beforeend', '<span id="sxAuto" class="hidden" style="font-weight:400;color:var(--muted);font-size:12px;margin-left:6px">deviné d\'après le prénom</span>');
  const mark = on => { sx.dataset.auto = on ? '1' : ''; $('#sxAuto')?.classList.toggle('hidden', !on); };
  async function apply(){
    if (!EDIT) return;
    const p = $('#f_prenom').value.trim();
    if (sx.value && sx.dataset.auto !== '1') return;          /* choisi à la main : on ne touche pas */
    if (!p) { if (sx.dataset.auto === '1') { sx.value = ''; mark(false); syncSexe(); } return; }
    await load();
    const g = guess(p);
    if (g === sx.value) { mark(!!g); return; }
    sx.value = g; mark(!!g); syncSexe(); draftSoon();
  }
  let t = 0;
  $('#f_prenom').addEventListener('input', ()=>{ clearTimeout(t); t = setTimeout(apply, 400); });
  $('#f_prenom').addEventListener('change', apply);
  $('#f_prenom').addEventListener('focus', ()=>{ load(); }, {once:false});
  /* Un appui sur Homme / Femme = choix à la main */
  $('#sexeSeg').addEventListener('click', ()=>mark(false));
  { const _of = openForm; openForm = function(f, d){ _of(f, d); mark(false); }; }
  window.guessSexe = p => guess(p);
})();
} catch (e) { console.error('[CIF] genre.js', e); setTimeout(()=>{ throw e; }); }
/* ===== employeur.js ===== */
try {
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
} catch (e) { console.error('[CIF] employeur.js', e); setTimeout(()=>{ throw e; }); }
/* ===== vif.js ===== */
try {
/* CIF 2.0 — v1.1.9 à 1.1.12 : intervention VIF (violences intrafamiliales)
   Tuile « VIF » avec les autres types (Accident, IPM…) : elle ouvre un bloc rapide à cocher
   (lien entre les personnes, enfants, mesures du juge, signes d'ivresse, mémento grille d'évaluation du danger / feuillet AVIP, circonstances).
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
  const MEM = [['fiche', 'Grille d\'évaluation du danger renseignée'], ['feuillet', 'Feuillet AVIP remis']];
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
#vifMem button{border:1px solid var(--line);border-radius:10px;background:none;color:var(--muted);font-size:14px;font-weight:600;padding:10px 6px;line-height:1.2}
#vifMem button.on{background:#173a26;border-color:#2e7d4f;color:#bff0d2}
#vifMem button.on::before{content:'✓ '}
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
      ['Grille d\'évaluation du danger renseignée', d.fiche ? 'Oui' : 'Non'], ['Feuillet AVIP remis', d.feuillet ? 'Oui' : 'Non'],
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
} catch (e) { console.error('[CIF] vif.js', e); setTimeout(()=>{ throw e; }); }
