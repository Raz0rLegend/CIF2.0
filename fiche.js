'use strict';
/* CIF 2.0 — v2.0.0 : fiche.js, regroupement de modules (fiche compacte, champ visible au-dessus du clavier, couleurs au féminin, accompagnants).
   Modules d'origine, dans l'ordre de chargement : compact.js, focus.js, couleur.js, accomp.js.
   Chaque module reste isolé : une erreur dans l'un n'empêche pas les suivants de se charger. */
/* ===== compact.js ===== */
try {
/* CIF 2.0 — v1.1.16 / 1.2.6 : formulaire de contrôle compact
   Champs plus bas, libellés plus petits, espacements réduits, et champs courts côte à côte :
   résultat + antécédents, nom + sexe (M/F), prénom + date de naissance, lieu de naissance + nationalité,
   profession + employeur, ville + pays, téléphone + identité établie, numéro + expiration…
   Les champs restent en 16 px pour que l'iPhone ne zoome pas en les touchant. */
(()=>{
  document.head.insertAdjacentHTML('beforeend', `<style>
#form .body{padding:2px 14px 24px}
#form label.f{margin:9px 0 3px;font-size:12.5px;color:#a9a9a9;letter-spacing:.01em}
#form input,#form select{padding:8px 10px;min-height:40px;border-radius:8px}
#form input[type=datetime-local],#form input[type=time]{min-height:40px}
#form textarea{min-height:72px;padding:8px 10px}
#form .sect{margin:16px 0 0;font-size:12px}
#form .seg{padding:2px}
#form .seg button{height:34px;font-size:15px}
#form #accGrid{grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}
#form #accGrid .switch{min-height:38px;padding:6px 4px;border-radius:9px;margin:0}
#form #accGrid .switch .swl{font-size:13.5px;line-height:1.15}
#form #accGrid .switch.vif{grid-column:auto}
#form .switch{margin-top:9px;padding:6px 10px;gap:10px}
#form .switch .sw{width:40px;height:24px}
#form .switch .sw::after{width:18px;height:18px}
#form .switch input:checked+.sw::after{left:19px}
#form .switch .swl{font-size:15px}
#form .addveh{height:40px;margin-top:8px;font-size:15px}
#form .veh{padding:2px 10px 10px;margin-top:8px}
#form .cr{display:flex;gap:8px;align-items:flex-end}
#form .cr>.cc{flex:1 1 0;min-width:0}
#form .cr>.cc>label.f{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#form .cr #sexeSeg{margin:0}
#form .cr #sexeSeg{gap:6px!important}
#form .cr #sexeSeg button{height:40px!important;min-height:40px!important;padding:0 2px!important;font-size:16px!important;display:flex!important;align-items:center;justify-content:center;gap:5px;white-space:nowrap}
#form #sexeSeg .sxi{width:17px;height:17px;flex:0 0 17px;display:block}
#form .cr .cc.sx>label.f{overflow:visible}
#form .cr .seg{min-height:40px}
#form #mrzBtn{flex:0 0 40px!important;height:40px!important;width:40px}
#form #f_verif{height:40px;min-height:40px}
#form #motifChips{gap:6px!important}
#form #motifChips button{padding:5px 10px!important;font-size:13.5px!important}
#form .veh .chips span{padding:5px 11px}
#form #signaRow{margin-top:10px!important}
#form .photos{margin-top:6px}
#form #docSeg button{white-space:nowrap}
#form .vdocs{margin-top:6px}
#form .vdocs button{flex-direction:row;gap:6px;padding:8px 6px;font-size:14px}
#form .vdocs button small{font-size:12px}
</style>`);
  const lab = id => document.querySelector(`#form label[for=${id}]`);
  const $f = id => document.getElementById(id);
  /* Une ligne de cellules ; chaque cellule = liste d'éléments (manquants ignorés), largeur relative */
  function row(cells){
    const list = cells.map(c=>({n: c.n.filter(Boolean), w: c.w || 1})).filter(c=>c.n.length);
    if (list.length < 2) return;
    const r = document.createElement('div'); r.className = 'cr';
    list[0].n[0].before(r);
    for (const c of list) { const d = document.createElement('div'); d.className = 'cc'; d.style.flex = `${c.w} 1 0`; d.append(...c.n); r.append(d); }
    return r;
  }
  const typeLbl = [...document.querySelectorAll('#form label.f')].find(l=>l.textContent.trim() === 'Type de contrôle');
  if (typeLbl) typeLbl.remove();                                       /* le choix CI / CIF parle de lui-même */
  $f('typeSeg').style.marginTop = '6px';
  /* Résultat (+ VERIF) à côté du bouton Antécédents */
  const resBox = $f('f_resultat')?.parentElement;
  const antSw = $f('f_antecedents')?.closest('label.switch') || [...document.querySelectorAll('#form label.switch')].find(l=>/Antécédents/.test(l.textContent));
  if (antSw) { antSw.style.margin = '0'; antSw.style.minHeight = '40px'; const t = antSw.querySelector('.swl'); if (t) t.textContent = 'Antécédents'; }
  row([{n:[lab('f_resultat'), resBox], w:1.15}, {n:[antSw], w:1}]);
  const sexLbl = [...document.querySelectorAll('#form label.f')].find(l=>/^Sexe/.test(l.textContent.trim()));
  /* Nom | Sexe (♂ M / ♀ F), puis Prénom | Date de naissance : deux colonnes alignées */
  /* symboles ♂ / ♀ dessinés (alignés sur la lettre, quelle que soit la police de l'iPhone) */
  const SX_M = '<svg class="sxi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="14" r="6"/><path d="M14.5 9.5 20 4M15 4h5v5"/></svg>';
  const SX_F = '<svg class="sxi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="9" r="6"/><path d="M12 15v7M8.5 19h7"/></svg>';
  document.querySelectorAll('#sexeSeg [data-sx]').forEach(b=>{ b.innerHTML = b.dataset.sx === 'H' ? `${SX_M}<span>M</span>` : `${SX_F}<span>F</span>`; b.title = b.dataset.sx === 'H' ? 'Masculin' : 'Féminin'; });
  const nomBox = $f('f_nom')?.parentElement;
  const rNom = row([{n:[lab('f_nom'), nomBox]}, {n:[sexLbl, $f('f_sexe'), $f('sexeSeg')], w:.72}]);
  rNom?.lastElementChild.classList.add('sx');
  const rPre = row([{n:[lab('f_prenom'), $f('f_prenom')]}, {n:[lab('f_dateNaissance'), $f('f_dateNaissance')], w:.72}]);
  if (rNom && rPre) { rNom.after(rPre); const hints = ['mrzInfo','idSug','diffAlert'].map($f).filter(Boolean); rPre.after(...hints); }
  row([{n:[lab('f_naisVille'), $f('f_lieuNaissance'), $f('f_naisVille'), $f('f_naisPays')]}, {n:[lab('f_nationalite'), $f('f_nationalite')]}]);
  /* Filiation remontée dans l'identité, juste après la naissance (toujours réservée au CIF) */
  const rNais = $f('f_nationalite')?.closest('.cr'), fil = $f('f_filiation');
  if (rNais && fil) {
    const w = document.createElement('div'); w.id = 'filWrap'; w.append(lab('f_filiation'), fil); rNais.after(w);
    const cb = $f('cifBlock'), sync = () => w.classList.toggle('hidden', cb.classList.contains('hidden'));
    new MutationObserver(sync).observe(cb, {attributes:true, attributeFilter:['class']}); sync();
  }
  row([{n:[lab('f_profession'), $f('f_profession')]}, {n:[lab('f_employeur'), $f('f_employeur')]}]);
  row([{n:[$f('f_adrVille')?.parentElement]}, {n:[$f('f_adrPays')], w:.6}]);
  const idLbl = [...document.querySelectorAll('#form label.f')].find(l=>l.textContent.trim() === 'Identité établie');
  const off = $f('docSeg')?.querySelector('[data-v=Officiel]'); if (off) off.textContent = 'Officielle';
  row([{n:[lab('f_telephone'), $f('f_telephone')]}, {n:[idLbl, $f('docSeg')], w:1.3}]);
  row([{n:[lab('f_docNumero'), $f('f_docNumero')]}, {n:[lab('f_docExp'), $f('f_docExp')]}]);
  /* Accident : petits champs côte à côte */
  row([{n:[lab('f_kilometrage'), $f('f_kilometrage')]}, {n:[lab('f_sitFam'), $f('f_sitFam')]}]);
  /* Véhicules : marque + modèle, couleur + propriétaire */
  const pairVeh = () => document.querySelectorAll('#vehicles .veh').forEach(v=>{
    const f = k => { const i = v.querySelector(`input[data-k=${k}]`); return i ? [i.previousElementSibling?.matches('label.f') ? i.previousElementSibling : null, i] : [null]; };
    if (v.querySelector('.cr')) return;
    row([{n:f('marque')}, {n:f('modele')}]); row([{n:f('couleur')}, {n:f('proprio')}]);
  });
  { const _rv = renderVehicles; renderVehicles = function(){ _rv(); pairVeh(); }; }
  pairVeh();
  /* Propriétaire : « lm » devient « Lui-même » ou « Elle-même » selon le sexe (et suit le sexe s'il change) */
  const meme = () => $f('f_sexe')?.value === 'F' ? 'Elle-même' : 'Lui-même';
  const setV = (i, v) => { if (i.value !== v) { i.value = v; i.dispatchEvent(new Event('input', {bubbles:true})); } };
  document.addEventListener('input', e=>{ const i = e.target; if (i.matches?.('#vehicles input[data-k=proprio]') && /^lm\.?$/i.test(i.value.trim())) setV(i, meme()); });
  const fixLM = () => setTimeout(()=>document.querySelectorAll('#vehicles input[data-k=proprio]').forEach(i=>{ if (/^(lui|elle)-même$/i.test(i.value.trim())) setV(i, meme()); }), 50);
  $f('sexeSeg')?.addEventListener('click', fixLM); $f('f_prenom')?.addEventListener('input', fixLM);
  /* Le sexe deviné : mention plus discrète */
  const sx = $f('sxAuto'); if (sx) { sx.textContent = '(deviné)'; sx.style.fontSize = '11px'; }
})();
} catch (e) { console.error('[CIF] compact.js', e); setTimeout(()=>{ throw e; }); }
/* ===== focus.js ===== */
try {
/* CIF 2.0 — v1.1.17 à 1.2.4 : champ touché (ou « Suivant » du clavier) recentré dans la partie visible de l'écran.
   Champ à suggestions (ville, pays, marque, couleur, motif…) : placé en haut de la zone visible pour que
   la liste des choix s'ouvre en entier entre le champ et le clavier. Une marge sous le formulaire
   permet de remonter même les derniers champs.
   1.1.19 / 1.1.20 : clavier ouvert, la fiche prend exactement la hauteur visible au-dessus du clavier (en-tête en haut,
   Annuler / Enregistrer juste au-dessus du clavier) et le décalage de page qu'iOS ajoute est annulé. */
(()=>{
  document.head.insertAdjacentHTML('beforeend', '<style>#form .body.kb{padding-bottom:62vh!important}#form.kbfit footer{padding-bottom:0!important}</style>');
  const SG = new Set(['f_adrVille','f_naisVille','f_lieuControle','f_nationalite']);
  const ok = el => el?.matches?.('#form .body input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=button]):not([type=file]):not([type=range]), #form .body textarea, #form .body select');
  let cur = null, t = null, off = null, ts = [];
  /* hauteur de la barre d'état (heure, batterie) qui recouvre le haut quand iOS décale l'écran */
  const probe = document.createElement('div'); probe.style.cssText = 'position:fixed;top:0;height:env(safe-area-inset-top);width:0;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  /* partie réellement visible du formulaire : sous la barre d'état et l'en-tête, au-dessus du bandeau Annuler / Enregistrer et du clavier */
  function zone(host){
    const vv = window.visualViewport, hr = host.getBoundingClientRect(), sa = probe.offsetHeight || 0;
    return [Math.max(hr.top, (vv ? vv.offsetTop : 0) + sa), Math.min(vv ? vv.offsetTop + vv.height : innerHeight, hr.bottom)];
  }
  /* la fiche suit la partie visible (visualViewport) tant qu'un champ est en cours de saisie */
  const form = document.getElementById('form'), vv = window.visualViewport;
  function fit(){
    if (!form || !vv) return;
    if (cur && !form.classList.contains('hidden')) {
      form.classList.add('kbfit');
      form.style.top = '0px'; form.style.height = Math.round(vv.height) + 'px'; form.style.bottom = 'auto';
    } else if (form.classList.contains('kbfit')) {
      form.classList.remove('kbfit'); form.style.top = form.style.height = form.style.bottom = '';
    }
  }
  /* iOS « pousse » toute la page vers le haut pour montrer le champ : on la remet en place (la fiche tient déjà dans la zone visible) */
  function unpan(){
    if (!vv || (vv.offsetTop < 1 && scrollY < 1)) return;
    const L = document.getElementById('list'), s = L ? L.scrollTop : 0;
    window.scrollTo(0, 0); if (L) L.scrollTop = s;
  }
  function place(){
    fit(); unpan();
    const el = cur; if (!el || document.activeElement !== el) return;
    const host = el.closest('.body'); if (!host) return;
    const [top, bot] = zone(host), r = el.getBoundingClientRect();
    const lbl = el.closest('.cc')?.querySelector('label.f') || (el.previousElementSibling?.matches?.('label.f') ? el.previousElementSibling : null);
    const head = lbl ? Math.max(0, r.top - lbl.getBoundingClientRect().top) : 0;
    const sg = !!el.dataset.sg || SG.has(el.id);
    const target = sg || r.height > (bot - top) / 2 ? top + 8 + head : top + (bot - top - r.height) / 2;
    const d = Math.round(r.top - target);
    if (Math.abs(d) > 6) host.scrollTop = host.scrollTop + d;
    /* la liste de suggestions se recale sous le champ, avec toute la place jusqu'au clavier */
    if (dbg) dbg.textContent = `v${APP_VERSION} vv ${Math.round(vv?.offsetTop||0)}+${Math.round(vv?.height||0)} ih ${innerHeight} sy ${Math.round(scrollY)} zone ${Math.round(top)}-${Math.round(bot)} champ ${Math.round(r.top)}→${Math.round(target)} st ${Math.round(host.scrollTop)}`;
    if (sg) setTimeout(()=>{ try { if (sgInput === el && !sgBox.classList.contains('hidden')) sgPlace(el); } catch(e){} }, 40);
  }
  /* diagnostic (mode développeur) : bandeau jaune avec les mesures du clavier et du champ */
  let dbg = null;
  const kbDbg = () => { try { return localStorage.getItem('cifDev') === '1' && localStorage.getItem('cifKbDbg') === '1'; } catch { return false; } };
  window.cifKbSync = () => {
    if (kbDbg() && !dbg && form) { dbg = document.createElement('div'); dbg.style.cssText = 'position:absolute;left:4px;right:4px;top:calc(env(safe-area-inset-top) + 2px);z-index:99;background:#ff0;color:#000;font:12px monospace;padding:3px;pointer-events:none'; dbg.setAttribute('data-noinv',''); dbg.textContent = 'diagnostic clavier actif : touche un champ'; form.appendChild(dbg); }
    else if (!kbDbg() && dbg) { dbg.remove(); dbg = null; }
  };
  window.cifKbSync();
  const later = ms => { clearTimeout(t); t = setTimeout(place, ms); };
  document.addEventListener('focusin', e=>{
    if (!ok(e.target)) return;
    clearTimeout(off); cur = e.target; cur.closest('.body')?.classList.add('kb'); fit();
    /* iOS fait défiler lui-même le formulaire pendant l'ouverture du clavier (juste au-dessus du clavier,
       donc souvent derrière le bandeau du bas) : on repasse derrière lui plusieurs fois */
    ts.forEach(clearTimeout); ts = [120, 380, 700, 1050, 1500].map(ms=>setTimeout(place, ms));
  });
  document.addEventListener('focusout', ()=>{
    clearTimeout(off);
    off = setTimeout(()=>{ if (!ok(document.activeElement)) { document.querySelectorAll('#form .body.kb').forEach(b=>b.classList.remove('kb')); cur = null; fit(); } }, 300);
  });
  /* le clavier s'ouvre ou change de taille : on recale */
  const vvChange = ()=>{ fit(); if (cur && document.activeElement === cur) later(60); };
  window.visualViewport?.addEventListener('resize', vvChange); window.visualViewport?.addEventListener('scroll', vvChange);
  /* en tapant dans un champ à suggestions, la liste apparaît : on remonte le champ si besoin */
  document.addEventListener('input', e=>{ if (e.target === cur && (cur.dataset.sg || SG.has(cur.id))) later(30); });
})();
} catch (e) { console.error('[CIF] focus.js', e); setTimeout(()=>{ throw e; }); }
/* ===== couleur.js ===== */
try {
/* CIF 2.0 — v1.1.17 : main courante, couleur du véhicule accordée au féminin (« de couleur blanche »,
   « grise métallisée », « blanche/noire ») ; couleurs composées (gris foncé, bleu marine…) et
   invariables (marron, orange, rouge…) inchangées. */
(()=>{
  const F = {blanc:'blanche', noir:'noire', gris:'grise', vert:'verte', bleu:'bleue', violet:'violette', brun:'brune', mat:'mate'};
  const INV = /(^|\s)(fonc[ée]|clair|ciel|marine|p[aâ]le|vif|nuit|bouteille|canard|turquoise|p[ée]trole|anthracite)(?=\s|$)/i;
  const coulF = c => { const t = c.trim().toLowerCase(); if (INV.test(t) && /\s/.test(t)) return t;
    return t.split(/(\s+|\/|-)/).map(w => F[w] || (/é$/.test(w) ? w + 'e' : w)).join(''); };
  window.coulF = coulF;
  const _mc = mcText;
  mcText = function(f, i, arr){
    const t = _mc(f, i, arr);
    return typeof t === 'string' ? t.replace(/de couleur (.+?)(?=,| immatricul| appartenant| conduit|\.|\n|$)/gm, (m, c) => 'de couleur ' + coulF(c)) : t;
  };
})();
} catch (e) { console.error('[CIF] couleur.js', e); setTimeout(()=>{ throw e; }); }
/* ===== accomp.js ===== */
try {
/* CIF 2.0 — v1.2.1 : un véhicule ajouté après coup sur une fiche (contrôle piéton devenu routier)
   rattache automatiquement les personnes du même contrôle comme passagers de ce véhicule.
   Ne sont pas touchées : celles qui ont leur propre véhicule, celles déjà passagères d'un autre véhicule,
   celles marquées « Ce n'est pas un passager ». Si le véhicule du conducteur est modifié, ses passagers suivent. */
(()=>{
  const isLM = p => /^(lm|lui[\s-]?m[eê]me|elle[\s-]?m[eê]me)$/.test(norm(p).replace(/\./g,''));
  const vehOf = drv => { const v = (drv.vehicules||[])[0]; if (!v) return null; const r = structuredClone(v); if (isLM(r.proprio)) r.proprio = ficheName(drv); return r; };
  /* « Ce n'est pas un passager » : choix retenu, la personne ne sera plus rattachée automatiquement */
  document.addEventListener('click', e=>{ if (e.target?.id === 'passOff' && EDIT?.f) EDIT.f.notPass = true; }, true);
  /* toutes les fiches reliées par « même contrôle » (dans les deux sens, de proche en proche) */
  function group(f){
    const ids = new Set([f.id]); let grew = true;
    while (grew) { grew = false;
      for (const x of FICHES) {
        if (ids.has(x.id)) continue;
        if ((x.avec && ids.has(x.avec)) || FICHES.some(y=>ids.has(y.id) && y.avec === x.id)) { ids.add(x.id); grew = true; }
      }
    }
    ids.delete(f.id); return [...ids].map(id=>FICHES.find(x=>x.id === id)).filter(Boolean);
  }
  let busy = false;
  const _save = saveFiche;
  saveFiche = async function(f){
    await _save(f);
    if (busy || !f || f.passager || !(f.vehicules||[]).length) return;
    busy = true;
    try {
      const v = vehOf(f), name = ficheName(f); let added = 0, changed = 0;
      for (const x of group(f)) {
        if (x.notPass || (x.vehicules||[]).length) continue;
        if (x.passager && x.vehRef && x.avec !== f.id) continue;              /* passager d'un autre véhicule */
        if (x.qualite && x.qualite !== 'Passager') continue;                   /* témoin, victime… */
        const was = x.passager && x.avec === f.id && x.vehRef;
        if (was && JSON.stringify(x.vehRef) === JSON.stringify(v) && x.conducteur === name) continue;
        x.passager = true; x.avec = f.id; x.vehRef = v; x.conducteur = name; x.qualite = 'Passager';
        await _save(x); was ? changed++ : added++;
      }
      if (added || changed) setTimeout(()=>{ try { render(); } catch(e){}
        if (added) toast(`${added} personne${added>1?'s':''} du contrôle rattachée${added>1?'s':''} comme passag${added>1?'ers':'er'} du véhicule`); }, 900);
    } finally { busy = false; }
  };
})();
} catch (e) { console.error('[CIF] accomp.js', e); setTimeout(()=>{ throw e; }); }
