'use strict';
/* CIF 2.0 — v1.0.14 à 1.0.16 : personnes d'un même contrôle, passagers d'un véhicule
   « Enregistrer + personne » ou « Ajouter une personne au même contrôle » : nouvelle fiche avec la même heure,
   le même lieu et le même motif. Si le premier contrôlé avait un véhicule, la nouvelle personne est PASSAGER :
   pas de véhicule à elle, mais un renvoi vers celui du conducteur (propriétaire « LM » = le conducteur lui-même).
   Dans la liste, les passagers sont rangés sous leur conducteur (ligne repliable). */
(()=>{
  const SEAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="4.5" r="2"/><path d="M8 8.5v6.5h6l2.5 5.5"/><path d="M5.5 9.5v7.5a1 1 0 0 0 1 1H13"/><path d="M8 11.5h4.5"/></svg>';
  const PASS_BADGE = '<span class="badge" style="background:#2d4a7a;color:#dce8ff">PASSAGER</span>';
  const isLM = p => /^(lm|lui[\s-]?m[eê]me|elle[\s-]?m[eê]me)$/.test(norm(p).replace(/\./g,''));
  const plateTxt = v => v?.plaque ? `${v.plaque} (${v.pays||'F'})` : '';
  const vehTxt = v => [v?.marque, v?.modele, v?.couleur].filter(Boolean).join(' ');
  /* Véhicule du conducteur, propriétaire « LM » remplacé par son nom */
  function vehOf(drv){
    const v = (drv.vehicules||[])[0]; if (!v) return null;
    const r = structuredClone(v); if (isLM(r.proprio)) r.proprio = ficheName(drv);
    return r;
  }
  document.head.insertAdjacentHTML('beforeend', `<style>
.card.pass{margin-left:22px;border-left:3px solid #4a7fd0;padding-top:9px;padding-bottom:5px;background:rgba(24,30,42,.9)}
.card.pass .name{font-size:15px}
.card.pass .thumb{width:44px;height:44px}
.card.pass.hide{display:none}
.vgrp{display:flex;align-items:center;gap:8px;margin:0 0 0 22px;padding:7px 12px;border-left:3px solid #4a7fd0;border-bottom:1px solid var(--line);background:#16233a;color:#bcd2f5;font-size:14px;position:relative;z-index:1}
.vgrp b{color:#fff}
.vgrp .chev{margin-left:auto;font-size:13px;color:#7fb3ff}
#passBox{margin-top:10px;padding:10px 12px;border:1px solid #2d4a7a;border-radius:12px;background:#16233a;color:#dce8ff;font-size:14px;line-height:1.35}
#passBox .row2{display:flex;justify-content:flex-end;margin-top:6px}
#passBox button{border:0;background:none;color:#7fb3ff;font-size:13px;padding:4px 0}
</style>`);

  /* ----- Ouverture d'une nouvelle fiche liée ----- */
  function openPassenger(src){
    if (!src) return;
    const drv = src.passager ? (FICHES.find(x=>x.id === src.avec) || null) : src;
    const veh = src.passager ? (src.vehRef || (drv && vehOf(drv))) : vehOf(src);
    closeDetail();
    const gm = SETTINGS.geoMode; SETTINGS.geoMode = 'off'; try { openForm(null); } finally { SETTINGS.geoMode = gm; }
    const f = EDIT.f;
    f.type = src.type || 'CI'; setSeg('typeSeg', f.type);
    $('#f_dateHeure').value = src.dateHeure || '';
    $('#f_lieuControle').value = src.lieuControle || ''; if (src.geo) f.geo = {...src.geo};
    $('#f_motif').value = src.motif || ''; syncMotif();
    f.avec = drv ? drv.id : src.id;
    if (veh) { f.passager = true; f.vehRef = veh; f.conducteur = drv ? ficheName(drv) : (src.conducteur || ''); f.qualite = 'Passager'; f.vehicules = []; }
    else f.vehicules = [];
    renderVehicles(); passBox();
    $('#geoHint').textContent = `🔗 Même contrôle que ${ficheName(src)} (heure, lieu et motif repris)`;
    $('#formTitle').textContent = veh ? 'Passager du véhicule' : 'Personne du même contrôle';
    syncAge(); window.syncExp?.(); draftSoon();
  }
  window.openPassenger = openPassenger;

  /* ----- Formulaire : encadré « passager » à la place des véhicules ----- */
  $('#vehicles').insertAdjacentHTML('beforebegin', '<div id="passBox" class="hidden"></div>');
  function passBox(){
    const b = $('#passBox'), f = EDIT?.f;
    if (!f || !f.passager || !f.vehRef) { b.classList.add('hidden'); b.innerHTML = ''; return; }
    const v = f.vehRef;
    b.innerHTML = `<div>${SEAT.replace('<svg ','<svg width="18" height="18" style="vertical-align:-3px;margin-right:4px" ')}<b>Passager</b> du véhicule ${v.plaque ? `<b>${esc(plateTxt(v))}</b>` : ''} ${esc(vehTxt(v))}</div>
      ${f.conducteur ? `<div>Conducteur : <b>${esc(f.conducteur)}</b></div>` : ''}${v.proprio ? `<div>Propriétaire : ${esc(v.proprio)}</div>` : ''}
      <div class="row2"><button type="button" id="passOff">Ce n'est pas un passager</button></div>`;
    b.classList.remove('hidden');
    $('#passOff').onclick = ()=>{ f.passager = false; f.vehRef = null; f.qualite = ''; passBox(); draftSoon(); };
  }
  { const _of = openForm; openForm = function(f, d){ _of(f, d); passBox(); }; }

  /* ----- Fiche ouverte ----- */
  { const _od = openDetail; openDetail = async function(f){ await _od(f); if (DETAIL !== f.id) return;
    /* Propriétaire « LM » : lui-même */
    $('#detBody').querySelectorAll('.cell').forEach(c=>{ if (c.querySelector('.k')?.textContent === 'Propriétaire' && isLM(c.querySelector('.v')?.textContent)) c.querySelector('.v').textContent = f.sexe === 'F' ? 'Elle-même' : 'Lui-même'; });
    if (f.passager && f.vehRef) {
      const v = f.vehRef, drv = FICHES.find(x=>x.id === f.avec);
      $('#detTitle').insertAdjacentHTML('afterbegin', PASS_BADGE);
      const html = panel(`Passager du véhicule${v.type ? ` · ${v.type}` : ''}`, [['Marque', v.marque], ['Modèle', v.modele], ['Couleur', v.couleur],
        ['Conducteur', drv ? `<button type="button" data-mate="${drv.id}" style="border:0;background:none;color:#7fb3ff;padding:0;font-size:inherit;text-decoration:underline">${esc(ficheName(drv))}</button>` : esc(f.conducteur||''), true], ['Propriétaire', v.proprio]], v.plaque ? plateHTML(v) : '');
      const id = [...$('#detBody').querySelectorAll('section.panel')].find(s=>s.querySelector('h4 span')?.textContent === 'Identité');
      id ? id.insertAdjacentHTML('beforebegin', html) : $('#detBody .hero')?.insertAdjacentHTML('afterend', html);
      $('#detBody .hero .vics')?.replaceChildren(); $('#detBody .hero .vics')?.insertAdjacentHTML('beforeend', `<span class="vic" title="Passager">${SEAT}</span>`);
    }
    const pas = FICHES.filter(x=>x.passager && x.avec === f.id);
    if (pas.length) $('#detBody .hero .hl')?.insertAdjacentHTML('beforeend', `<div class="mates">${SEAT.replace('<svg ','<svg width="16" height="16" ')}<span>Passager${pas.length>1?'s':''} : ${pas.map(m=>`<button type="button" data-mate="${m.id}">${esc(ficheName(m))}</button>`).join(', ')}</span></div>`);
    if (f.status === 'pending') {
      $('#detBody .hero')?.insertAdjacentHTML('afterend', `<button type="button" class="addveh" id="detPass" style="margin:10px 0 0">👥 Ajouter ${f.passager || (f.vehicules||[]).length ? 'un passager' : 'une personne au même contrôle'}</button>`);
      $('#detPass').onclick = ()=>openPassenger(f);
    }
  }; }

  /* ----- Envoi et main courante ----- */
  { const _fs = ficheSections; ficheSections = function(f){
    const S = _fs(f);
    for (const [t, rows] of S) if (/^Véhicule/.test(t)) for (const r of rows) if (r[0] === 'Propriétaire' && isLM(r[1])) r[1] = f.sexe === 'F' ? 'elle-même' : 'lui-même';
    if (f.passager && f.vehRef) { const v = f.vehRef; S.splice(1, 0, ['Passager du véhicule', [['Plaque', plateTxt(v)], ['Véhicule', [v.type, vehTxt(v)].filter(Boolean).join(' — ')], ['Conducteur', f.conducteur], ['Propriétaire', v.proprio]].filter(r=>r[1])]); }
    const pas = FICHES.filter(x=>x.passager && x.avec === f.id);
    if (pas.length) S.splice(1, 0, ['Passagers', pas.map((m,i)=>[`Passager ${i+1}`, ficheName(m)])]);
    return S; }; }
  /* Main courante : phrase commune « Tous trois étaient passagers du véhicule … conduit par … ».
     mcText est appelé par l'envoi via list.map(mcText) : le 3e argument est la liste envoyée. */
  /* Plaque en main courante : AB-123-CD(F) — telle que saisie, en majuscules, pays toujours indiqué */
  const mcPlate = v => `${String(v.plaque).trim().toUpperCase()}(${v.pays||'F'})`;
  const NB = ['','','deux','trois','quatre','cinq','six','sept','huit','neuf','dix'];
  const vehPhrase = (v, cond) => [v.type === '2RM' ? 'du deux-roues' : 'du véhicule', v.marque ? `de marque ${[v.marque, v.modele].filter(Boolean).join(' ')}` : v.modele, v.couleur ? `de couleur ${v.couleur.toLowerCase()}` : '', v.plaque ? `immatriculé ${mcPlate(v)}` : ''].filter(Boolean).join(' ') + (cond ? `, conduit par ${cond}` : '');
  const groupPhrase = (pas, v, cond) => {
    if (pas.length === 1) { const F = pas[0].sexe === 'F'; return `${F ? "L'intéressée" : "L'intéressé"} était passag${F ? 'ère' : 'er'} ${vehPhrase(v, cond)}.`; }
    const allF = pas.every(p=>p.sexe === 'F'), n = NB[pas.length] || String(pas.length);
    return `${allF ? 'Toutes' : 'Tous'} ${n} étaient passag${allF ? 'ères' : 'ers'} ${vehPhrase(v, cond)}.`;
  };
  const passOf = drvId => FICHES.filter(x=>x.passager && x.avec === drvId && x.vehRef).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
  /* Conducteur : phrase « utilisateur / propriétaire » pour chaque véhicule */
  const VNOM = {VL:['du véhicule particulier',"d'un véhicule léger"], '2RM':['du deux-roues motorisé',"d'un deux-roues motorisé"], Camion:['du poids lourd',"d'un poids lourd"], 'Vélo':['du vélo',"d'un vélo"], Autre:['du véhicule',"d'un véhicule"]};
  function userPhrase(f, v){
    const F = f.sexe === 'F', own = isLM(v.proprio), nm = VNOM[v.type] || VNOM.VL;
    const bits = [v.marque && `de marque ${v.marque}`, v.modele && `de type ${v.modele}`, v.couleur && `de couleur ${v.couleur.toLowerCase()}`, v.plaque && `immatriculé ${mcPlate(v)}`].filter(Boolean);
    const head = `${F ? 'Elle' : 'Il'} était ${F ? "l'utilisatrice" : "l'utilisateur"}${own ? `, propriétaire ${nm[0]}` : ` ${nm[1]}`}`;
    const rest = [...bits.slice(1), ...(!own && v.proprio ? [`appartenant à ${v.proprio}`] : []), own ? 'dont les documents étaient en règle' : 'dont les documents de bord étaient en règle'];
    return [head + (bits[0] ? ' ' + bits[0] : ''), ...rest].join(', ') + '.';
  }
  { const _mc0 = mcText; mcText = function(f, i, arr){
    const t = _mc0(f, i, arr); if (f.passager || !(f.vehicules||[]).length) return t;
    const u = f.vehicules.filter(v=>v.plaque || v.marque).map(v=>userPhrase(f, v)); if (!u.length) return t;
    /* Après l'identité, la pièce relevée et le résultat du fichier, avant les antécédents et la vérification */
    const parts = t.split('\n\n'); let at = 1;
    while (at < parts.length && /^(Identité relevée|Non défavorablement noté|Défavorablement noté|Inconnu à notre fichier)/.test(parts[at])) at++;
    parts.splice(at, 0, ...u);
    return parts.join('\n\n');
  }; }
  window.userPhrase = userPhrase;
  { const _mc = mcText; mcText = function(f, i, arr){
    const t = _mc(f), sent = Array.isArray(arr) ? arr : [f];
    /* Conducteur : ses passagers absents de l'envoi sont ajoutés à la suite, avec la phrase commune */
    if (!f.passager) {
      const pas = passOf(f.id); if (!pas.length) return t;
      const missing = pas.filter(p=>!sent.some(x=>x.id === p.id));
      if (!missing.length) return t;
      if (missing.length < pas.length) return t + '\n\n' + missing.map(p=>_mc(p)).join('\n\n');
      return t + '\n\n' + pas.map(p=>_mc(p)).join('\n\n') + '\n\n' + groupPhrase(pas, vehOf(f) || pas[0].vehRef, ficheName(f));
    }
    if (!f.vehRef) return t;
    const drvSent = sent.find(x=>x.id === f.avec);
    const mates = sent.filter(x=>x.passager && x.avec === f.avec && x.vehRef);
    /* Conducteur dans l'envoi : c'est lui qui porte la phrase commune, après le dernier passager */
    if (drvSent) {
      const pas = passOf(f.avec).filter(p=>sent.some(x=>x.id === p.id));
      return pas.length && pas[pas.length-1].id === f.id ? t + '\n\n' + groupPhrase(passOf(f.avec), f.vehRef, f.conducteur) : t;
    }
    /* Passager seul */
    if (mates.length <= 1) { const parts = t.split('\n\n'); parts.splice(1, 0, groupPhrase([f], f.vehRef, f.conducteur)); return parts.join('\n\n'); }
    /* Plusieurs passagers envoyés ensemble : phrase commune après le dernier */
    return mates[mates.length-1].id === f.id ? t + '\n\n' + groupPhrase(mates, f.vehRef, f.conducteur) : t;
  }; }

  /* ----- Liste : passagers rangés sous leur conducteur ----- */
  const OPEN = new Set();
  { const _r = render; render = function(){
    _r();
    const list = $('#list'), cards = new Map([...list.querySelectorAll('.card[data-id]')].map(c=>[c.dataset.id, c]));
    for (const [id, c] of cards) {
      const f = FICHES.find(x=>x.id === id); if (!f || !f.passager) continue;
      c.querySelector('.name')?.insertAdjacentHTML('afterbegin', PASS_BADGE);
      const vics = c.querySelector('.vics'); if (vics) vics.innerHTML = `<span class="vic" title="Passager">${SEAT}</span>`;
      if (f.vehRef?.plaque) c.querySelector('.sub')?.insertAdjacentHTML('afterend', `<div class="note">Passager de ${esc(plateTxt(f.vehRef))}${f.conducteur ? ` · conducteur ${esc(f.conducteur)}` : ''}</div>`);
    }
    /* Regroupement sous le conducteur, s'il est affiché dans la même liste */
    const drivers = new Map();
    for (const [id] of cards) { const f = FICHES.find(x=>x.id === id); if (f?.passager && cards.has(f.avec)) (drivers.get(f.avec) || drivers.set(f.avec, []).get(f.avec)).push(id); }
    for (const [did, pids] of drivers) {
      const dc = cards.get(did), drv = FICHES.find(x=>x.id === did), v = vehOf(drv) || {};
      const open = OPEN.has(did);
      dc.insertAdjacentHTML('afterend', `<div class="vgrp" data-drv="${did}">${(VICON[v.type] || VICON.VL).replace('<svg ','<svg width="18" height="18" ')}<span><b>${esc(plateTxt(v) || 'Véhicule')}</b>${vehTxt(v) ? ' · ' + esc(vehTxt(v)) : ''} — ${pids.length} passager${pids.length>1?'s':''}</span><span class="chev">${open ? 'Masquer ▴' : 'Voir ▾'}</span></div>`);
      let after = dc.nextElementSibling;
      for (const pid of pids) {
        const pc = cards.get(pid), prev = pc.previousElementSibling;
        if (prev?.classList.contains('glink')) prev.remove();
        pc.classList.add('pass'); pc.classList.toggle('hide', !open);
        after.after(pc); after = pc;
      }
      const nx = after.nextElementSibling; if (nx?.classList.contains('glink')) nx.remove();
    }
  }; }
  $('#list').addEventListener('click', e=>{
    const g = e.target.closest('.vgrp'); if (!g) return;
    const id = g.dataset.drv; OPEN.has(id) ? OPEN.delete(id) : OPEN.add(id);
    const open = OPEN.has(id);
    g.querySelector('.chev').textContent = open ? 'Masquer ▴' : 'Voir ▾';
    let n = g.nextElementSibling; while (n && n.classList.contains('pass')) { n.classList.toggle('hide', !open); n = n.nextElementSibling; }
  });

  /* ----- Formulaire : « Enregistrer + personne » dans le bandeau du bas ----- */
  $('#formSave').insertAdjacentHTML('beforebegin', `<button type="button" id="formNext" aria-label="Enregistrer et ajouter une personne au même contrôle" style="font-size:14px;line-height:1.15;font-weight:600;color:#7fb3ff">Enregistrer<br>+ personne</button>`);
  $('#formNext').onclick = async ()=>{
    if (!EDIT) return; const id = EDIT.f.id;
    await closeForm(true);
    if (EDIT) return;   /* enregistrement refusé (champs manquants) */
    const s = FICHES.find(x=>x.id === id); if (s) openPassenger(s);
  };
})();
