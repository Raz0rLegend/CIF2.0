'use strict';
/* CIF 2.0 — logique de l'application */
const APP_VERSION = '1.6';
/* ---------- Utilitaires ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const te = new TextEncoder(), td = new TextDecoder();
const uid = () => Date.now().toString(36) + crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
const DAY = 864e5;
const RES_COLORS = {'NDN':'#3ccf4e','Oméga':'#b77cff','CDPA':'#ff5a52','CDPU':'#ff5a52','CDPJ':'#ff5a52'};
const resColor = f => RES_COLORS[f.resultat] || '#cfcfcf';
const vehTypes = f => { const t=[...new Set((f.vehicules||[]).map(v=>v.type||'Autre'))]; return t.length ? t : ['Piéton']; };
const vehIcons = f => vehTypes(f).map(t=>`<span class="vic" title="${esc(t)}">${VICON[t]||VICON.Autre}</span>`).join('');
const QUALITES = ['Piéton','Conducteur VL','Passager','2RM','PL','Autre'];
const FIELDS = ['dateHeure','nom','prenom','dateNaissance','lieuNaissance','nationalite','profession','adresse','telephone','resultat','filiation','docType','docNumero','docDate','docLieu','lieuControle','motif','observations','sitFam','email','nbEnfants','nbCharge','alcHeure','alcRes','alcTaux','stupHeure','stupRes'];
const ACC_FIELDS = ['sitFam','email','nbEnfants','nbCharge','alcHeure','alcRes','alcTaux','stupHeure','stupRes'];
const resTest = r => r ? `<span style="color:${r==='Positif'?'#ff5a52':'#3ccf4e'};font-weight:600">${r}</span>` : '';
const taux = t => t ? `${String(t).replace('.',',')} mg/L` : '';
const MEMO = [['memoCG','Carte grise','carte grise'],['memoAss','Assurance','assurance'],['memoPR','Permis (recto)','permis recto'],['memoPV','Permis (verso)','permis verso']];
const CIF_FIELDS = ['telephone','filiation','docType','docNumero','docDate','docLieu'];
const paysOptions = sel => `<optgroup label="Fréquents">${PAYS_TOP.map(([c,n])=>`<option value="${c}" ${c===sel?'selected':''}>${c} — ${n}</option>`).join('')}</optgroup><optgroup label="Tous les pays">${PAYS_ALL.map(([c,n])=>`<option value="${c}" ${c===sel?'selected':''}>${c} — ${n}</option>`).join('')}</optgroup>`;
const plateHTML = v => `<span class="plate"><i>${esc(v.pays||'F')}</i>${esc(v.plaque)}</span>`;
const VEH_TYPES = ['VL','2RM','Camion','Vélo','Autre'];
const VEH_FIELDS = [['marque','Marque'],['modele','Type / modèle'],['couleur','Couleur'],['plaque','Plaque'],['proprio','Propriétaire']];
const ICON = {
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>',
  archive:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M12 12v5M9.5 14.5 12 17l2.5-2.5"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  restore:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5M4 4v4.5h4.5"/></svg>',
  send:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.7 2.3 2.9 9.6c-.8.3-.8 1.4 0 1.7l6.4 2.6 2.6 6.4c.3.8 1.4.8 1.7 0l7.3-18.8c.2-.6-.4-1.2-1.2-1.2zM10.4 12.6l6.8-5.8-5.8 6.8-.3 3.6-.7-4.6z"/></svg>',
  cam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'
};
const fmtDT = iso => { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return iso;
  return d.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'}) + ' ' + d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}); };
const fmtD = ts => new Date(ts).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'});
const nowLocal = () => { const d = new Date(); d.setSeconds(0,0); return new Date(d - d.getTimezoneOffset()*6e4).toISOString().slice(0,16); };

let toastT;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'),2200); }
function ask(msg, yes='Confirmer', danger=true){
  return new Promise(res=>{
    $('#mMsg').textContent=msg; const y=$('#mYes'); y.textContent=yes; y.className='btn'+(danger?' danger':'');
    $('#modal').classList.remove('hidden');
    const done=v=>{ $('#modal').classList.add('hidden'); y.onclick=$('#mNo').onclick=null; res(v); };
    y.onclick=()=>done(true); $('#mNo').onclick=()=>done(false);
  });
}

/* ---------- Base locale (IndexedDB) ---------- */
let db;
const req = r => new Promise((res,rej)=>{ r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
function openDB(){ return new Promise((res,rej)=>{ const r=indexedDB.open('renseignement',1);
  r.onupgradeneeded=()=>{ const d=r.result; d.createObjectStore('meta'); d.createObjectStore('fiches',{keyPath:'id'}); d.createObjectStore('photos',{keyPath:'id'}); };
  r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
const os = (s,m='readonly') => db.transaction(s,m).objectStore(s);
const dbGet = (s,k) => req(os(s).get(k));
const dbPut = (s,v,k) => req(k===undefined ? os(s,'readwrite').put(v) : os(s,'readwrite').put(v,k));
const dbDel = (s,k) => req(os(s,'readwrite').delete(k));
const dbAll = s => req(os(s).getAll());
function writeAll(ops){ // une seule transaction : tout ou rien
  return new Promise((res,rej)=>{ const tx=db.transaction(['meta','fiches','photos'],'readwrite');
    for (const [s,fn] of ops) fn(tx.objectStore(s));
    tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); tx.onabort=()=>rej(tx.error); });
}

/* ---------- Chiffrement (AES-GCM 256, clé dérivée du code par PBKDF2) ---------- */
let KEY = null;
async function deriveKey(pin, salt){
  const base = await crypto.subtle.importKey('raw', te.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations:310000, hash:'SHA-256'}, base, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
}
async function encBytes(key, buf){ const iv=crypto.getRandomValues(new Uint8Array(12)); return { iv, data: await crypto.subtle.encrypt({name:'AES-GCM',iv}, key, buf) }; }
const decBytes = (key, r) => crypto.subtle.decrypt({name:'AES-GCM', iv:r.iv}, key, r.data);
const encJSON = (key, o) => encBytes(key, te.encode(JSON.stringify(o)));
const decJSON = async (key, r) => JSON.parse(td.decode(await decBytes(key, r)));

/* ---------- État ---------- */
let SEL = null, PIN = null;
let FICHES = [], SETTINGS = {purgeDays:30, lockMinutes:1}, TAB='CIF', QUERY='', EDIT=null, lockMode='unlock', hiddenAt=0;
const urlCache = new Map();

async function saveFiche(f){
  f.updatedAt = Date.now();
  const r = await encJSON(KEY, f);
  await dbPut('fiches', {id:f.id, iv:r.iv, data:r.data});
  const i = FICHES.findIndex(x=>x.id===f.id); if (i<0) FICHES.push(f); else FICHES[i]=f;
}
async function removeFiche(id){
  const f = FICHES.find(x=>x.id===id);
  for (const p of (f?.photos||[])) await removePhoto(p);
  await dbDel('fiches', id); FICHES = FICHES.filter(x=>x.id!==id);
}
async function savePhoto(blob){ const id=uid(); const r=await encBytes(KEY, await blob.arrayBuffer()); await dbPut('photos',{id, iv:r.iv, data:r.data}); return id; }
async function removePhoto(id){ await dbDel('photos', id); const u=urlCache.get(id); if(u){ URL.revokeObjectURL(u); urlCache.delete(id); } }
async function photoBuf(id){ const r=await dbGet('photos',id); return r ? decBytes(KEY, r) : null; }
async function photoURL(id){
  if (urlCache.has(id)) return urlCache.get(id);
  const b = await photoBuf(id); if (!b) return '';
  const u = URL.createObjectURL(new Blob([b],{type:'image/jpeg'})); urlCache.set(id,u); return u;
}
async function purge(){
  if (!+SETTINGS.purgeDays) return;
  const lim = Date.now() - SETTINGS.purgeDays*DAY;
  for (const f of FICHES.filter(f=>f.status==='archived' && f.archivedAt < lim)) await removeFiche(f.id);
}

/* ---------- Verrouillage ---------- */
function showLock(setup){
  lockMode = setup ? 'setup' : 'unlock';
  $('#lock').classList.remove('hidden'); $('#app').classList.add('hidden');
  $('#lockTitle').textContent = setup ? 'Créer ton code' : 'Déverrouiller';
  $('#lockHint').textContent = setup ? "Ce code chiffre toutes les fiches et photos. Sans lui, elles sont irrécupérables." : '';
  $('#pin2').classList.toggle('hidden', !setup); $('#forgot').classList.toggle('hidden', setup);
  $('#pin').value = $('#pin2').value = ''; $('#lockErr').textContent = '';
  $('#bioBtn').classList.add('hidden');
  if (!setup) dbGet('meta','bio').then(b=>{ if (b && lockMode==='unlock') { $('#bioLbl').textContent = IS_IOS ? 'Face ID' : 'Biométrie'; $('#bioBtn').classList.remove('hidden'); bioUnlock(true); } else setTimeout(()=>$('#pin').focus(), 150); }).catch(()=>{});
  else setTimeout(()=>$('#pin').focus(), 150);
}
function lock(){
  KEY = null; PIN = null; FICHES = []; EDIT = null; SEL = null; LEARN = {}; sgHide();
  for (const u of urlCache.values()) URL.revokeObjectURL(u); urlCache.clear();
  DETAIL = null;
  ['#form','#detail','#settings','#viewer','#modal','#shareSheet'].forEach(s=>$(s).classList.add('hidden'));
  $('#list').innerHTML = ''; $('#q').value=''; QUERY='';
  showLock(false);
}
$('#lockForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const pin = $('#pin').value, err = m => { $('#lockErr').textContent = m; $('#pin').select(); };
  const btn = $('#lockBtn'); btn.disabled = true; btn.textContent = '…';
  try {
    if (lockMode === 'setup') {
      if (pin.length < 4) return err('4 caractères minimum');
      if (pin !== $('#pin2').value) return err('Les deux codes ne correspondent pas');
      const salt = crypto.getRandomValues(new Uint8Array(16));
      KEY = await deriveKey(pin, salt);
      const v = await encJSON(KEY, {ok:true});
      await dbPut('meta', {salt, verifier:{iv:v.iv, data:v.data}}, 'auth');
      PIN = pin; await openApp();
      if (await bioAvailable()) setTimeout(async ()=>{ if (KEY && await ask(`Activer ${bioName()} pour ouvrir l'appli sans taper le code ?`, 'Activer', false)) enableBio(); }, 600);
    } else {
      if (!await unlockWith(pin)) return err('Code incorrect');
    }
  } catch (ex) { err('Erreur : ' + ex.message); }
  finally { btn.disabled = false; btn.textContent = 'Valider'; }
});
async function unlockWith(pin){
  const auth = await dbGet('meta','auth');
  const k = await deriveKey(pin, auth.salt);
  try { await decJSON(k, auth.verifier); } catch { return false; }
  KEY = k; PIN = pin; await openApp(); return true;
}
async function openApp(){
  FICHES = await Promise.all((await dbAll('fiches')).map(r=>decJSON(KEY, r)));
  await loadLearn();
  await purge();
  $('#lock').classList.add('hidden'); $('#app').classList.remove('hidden');
  render(); checkUpdate(false);
}
$('#forgot').onclick = async ()=>{
  if (!await ask("Effacer TOUTES les fiches et photos de cet appareil ?\nCette action est définitive.", 'Tout effacer')) return;
  await wipeAll();
};
async function wipeAll(){
  await writeAll([['meta',s=>s.clear()],['fiches',s=>s.clear()],['photos',s=>s.clear()]]);
  await dbPut('meta', SETTINGS, 'settings');
  lock(); showLock(true); toast('Données effacées');
}
$('#btnLock').onclick = lock;
document.addEventListener('visibilitychange', ()=>{
  if (document.hidden) { hiddenAt = Date.now(); if (KEY) $('#cover').classList.remove('hidden'); }
  else {
    if (KEY && Date.now() - hiddenAt >= SETTINGS.lockMinutes*6e4) lock();
    $('#cover').classList.add('hidden');
  }
});

/* ---------- Contrôles groupés (même créneau de 20 min) ---------- */
const GROUP_MIN = 20, GROUP_COLORS = ['#f0b429','#4fb3ff','#ff7ab6','#7ee081','#c49bff','#ff9a52'];
let GROUPS = new Map(); // id -> {n, color, ids}
function computeGroups(){
  GROUPS = new Map();
  const list = FICHES.filter(f=>f.dateHeure && !isNaN(new Date(f.dateHeure))).sort((a,b)=>a.dateHeure.localeCompare(b.dateHeure));
  let cur = [], start = 0, gi = 0;
  const flush = () => { if (cur.length > 1) { const g = {n:cur.length, color:GROUP_COLORS[gi++ % GROUP_COLORS.length], ids:cur.map(f=>f.id)}; cur.forEach(f=>GROUPS.set(f.id, g)); } };
  for (const f of list) {
    const t = new Date(f.dateHeure).getTime();
    if (cur.length && t - start <= GROUP_MIN*6e4) cur.push(f);
    else { flush(); cur = [f]; start = t; }
  }
  flush();
}
const groupMates = f => { const g = GROUPS.get(f.id); return g ? g.ids.filter(id=>id!==f.id).map(id=>FICHES.find(x=>x.id===id)).filter(Boolean) : []; };
const ICON_LINK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>';

/* ---------- Liste ---------- */
function render(){
  computeGroups();
  const q = QUERY.trim().toLowerCase();
  const pend = FICHES.filter(f=>f.status==='pending'), nA = FICHES.length - pend.length;
  const nCIF = pend.filter(f=>f.type==='CIF').length, nCI = pend.length - nCIF;
  $('#tabCIF').textContent = `CIF${nCIF?` (${nCIF})`:''}`;
  $('#tabCI').textContent = `CI${nCI?` (${nCI})`:''}`;
  document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.toggle('on', b.dataset.tab===TAB));
  $('#btnArchives').classList.toggle('on', TAB==='archived');
  $('#title').textContent = TAB==='archived' ? `Archives${nA?` (${nA})`:''}` : 'CIF 2.0';
  $('#fab').classList.toggle('hidden', TAB==='archived' || !!SEL);
  $('#btnSelect').classList.toggle('on', !!SEL);
  $('#selBar').classList.toggle('hidden', !SEL);
  if (SEL) { const n=SEL.size; $('#selSend').textContent = `Envoyer${n?` (${n})`:''}`; $('#selSend').disabled = $('#selArchive').disabled = !n;
    $('#selArchive').textContent = TAB==='archived' ? 'Remettre' : 'Archiver'; $('#title').textContent = n ? `${n} choisie${n>1?'s':''}` : 'Sélection'; }
  let items = TAB==='archived' ? FICHES.filter(f=>f.status==='archived') : pend.filter(f=>(f.type||'CI')===TAB);
  if (q) items = items.filter(f => [...FIELDS.map(k=>f[k]||''), f.qualite, f.type, ...(f.vehicules||[]).flatMap(v=>Object.values(v))].join(' ').toLowerCase().includes(q));
  items.sort((a,b)=> TAB==='archived' ? b.archivedAt - a.archivedAt : (b.dateHeure||'').localeCompare(a.dateHeure||''));
  window.visibleIds = items.map(f=>f.id);
  if (!items.length) {
    $('#list').innerHTML = `<div class="empty">${q ? 'Aucun résultat.' : TAB==='archived' ? 'Aucune archive.' : `Aucun ${TAB} en cours.<br>Touche + pour en créer un.`}</div>`;
    return;
  }
  $('#list').innerHTML = items.map(f=>{
    const name = [ (f.nom||'').toUpperCase(), f.prenom ].filter(Boolean).join(' | ') || '<span style="color:var(--muted)">Sans identité</span>';
    const sub = [f.dateNaissance, f.nationalite].filter(Boolean).join(' | ');
    const n = (f.photos||[]).length;
    const purgeInfo = f.status==='archived' ? `Archivée le ${fmtD(f.archivedAt)}${+SETTINGS.purgeDays ? ` · suppression le ${fmtD(f.archivedAt + SETTINGS.purgeDays*DAY)}` : ''}` : '';
    const g = GROUPS.get(f.id);
    return `<article class="card${SEL&&SEL.has(f.id)?' sel':''}${g?' grp':''}" data-id="${f.id}"${g?` style="--gc:${g.color}"`:''}>
      ${SEL ? `<div class="chk">${SEL.has(f.id)?ICON.check:''}</div>` : ''}
      ${n ? `<img class="thumb" data-ph="${f.photos[0]}" alt="">` : ''}
      <div class="main">
        <div class="r1"><div class="name"><span class="badge ${f.type==='CIF'?'cif':''}">${esc(f.type||'CI')}</span>${f.accident?'<span class="badge acc">Accident</span>':''}${f.nom||f.prenom ? esc(name) : name}</div><div class="date" style="color:${resColor(f)}">${f.resultat?`<b>${esc(f.resultat)}</b> · `:''}${esc(fmtDT(f.dateHeure))}</div></div>
        ${sub ? `<div class="sub">${esc(sub)}</div>` : ''}
        ${g ? `<div class="gtag">${ICON_LINK}Contrôlés ensemble · ${g.n}</div>` : ''}
        ${f.lieuControle ? `<div class="note">${esc(f.lieuControle)}</div>` : ''}
        ${(f.vehicules||[]).length ? `<div class="note">${esc(f.vehicules.map(v=>[v.type,v.marque,v.plaque && `${v.plaque} (${v.pays||'F'})`].filter(Boolean).join(' ')).join(' · '))}</div>` : ''}
        ${purgeInfo ? `<div class="note">${purgeInfo}</div>` : ''}
        <div class="r2">
          <div class="meta"><span class="vics">${vehIcons(f)}</span>${n ? ICON.cam + n : ''}</div>
          <div class="acts${SEL?' hidden':''}">
            <button class="ib" data-act="del" aria-label="Supprimer">${ICON.trash}</button>
            <button class="ib" data-act="edit" aria-label="Modifier">${ICON.edit}</button>
            ${f.status==='pending'
              ? `<button class="ib" data-act="archive" aria-label="Archiver (intégrée au PC)">${ICON.archive}</button>`
              : `<button class="ib" data-act="restore" aria-label="Remettre en cours">${ICON.restore}</button>`}
            <button class="ib" data-act="share" aria-label="Partager">${ICON.send}</button>
          </div>
        </div>
      </div></article>`;
  }).join('');
  document.querySelectorAll('img[data-ph]').forEach(async img=>{ img.src = await photoURL(img.dataset.ph); });
}
$('#list').addEventListener('click', async e=>{
  const card = e.target.closest('.card'); if (!card) return;
  const f = FICHES.find(x=>x.id===card.dataset.id); if (!f) return;
  if (SEL) { SEL.has(f.id) ? SEL.delete(f.id) : SEL.add(f.id); return render(); }
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (!act) return openDetail(f);
  if (act==='edit') return openForm(f);
  if (act==='del') { if (await ask(`Supprimer la fiche ${f.nom||''} ${f.prenom||''} et ses photos ?`, 'Supprimer')) { await removeFiche(f.id); render(); toast('Fiche supprimée'); } }
  if (act==='archive') { f.status='archived'; f.archivedAt=Date.now(); await saveFiche(f); render(); toast('Fiche archivée'); }
  if (act==='restore') { f.status='pending'; f.archivedAt=null; await saveFiche(f); render(); toast('Remise en cours'); }
  if (act==='share') shareFiche(f);
});
document.querySelectorAll('nav.tabs button').forEach(b=>b.onclick=()=>{ SEL=null; TAB=b.dataset.tab; window.lastTab=TAB; render(); window.scrollTo(0,0); });
$('#btnSearch').onclick = ()=>{ const s=$('#searchbar'); s.classList.toggle('hidden'); if(!s.classList.contains('hidden')) $('#q').focus(); else { $('#q').value=''; QUERY=''; render(); } };
$('#q').oninput = e=>{ QUERY=e.target.value; render(); };
$('#fab').onclick = ()=>openForm(null);
$('#btnSelect').onclick = ()=>{ SEL = SEL ? null : new Set(); render(); };
$('#selAll').onclick = ()=>{ const ids = window.visibleIds||[]; if (ids.every(id=>SEL.has(id))) SEL.clear(); else ids.forEach(id=>SEL.add(id)); render(); };
$('#selArchive').onclick = async ()=>{
  const list = FICHES.filter(f=>SEL.has(f.id)); if (!list.length) return;
  for (const f of list) { if (TAB==='archived') { f.status='pending'; f.archivedAt=null; } else { f.status='archived'; f.archivedAt=Date.now(); } await saveFiche(f); }
  toast(TAB==='archived' ? `${list.length} fiche(s) remise(s) en cours` : `${list.length} fiche(s) archivée(s)`); SEL=null; render();
};
$('#selSend').onclick = async ()=>{
  const list = FICHES.filter(f=>SEL.has(f.id)).sort((a,b)=>(a.dateHeure||'').localeCompare(b.dateHeure||'')); if (!list.length) return;
  await shareFiches(list);
};
$('#btnArchives').onclick = ()=>{ SEL=null; TAB = TAB==='archived' ? (window.lastTab||'CIF') : (window.lastTab=TAB, 'archived'); render(); window.scrollTo(0,0); };

/* ---------- Fiche (lecture) ---------- */
let DETAIL = null;
const ICON_CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
const ICON_PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
function panel(title, rows, right=''){
  rows = rows.filter(r=>r[1]); if (!rows.length && !right) return '';
  const LONG = /Adresse|Observations|Filiation|Motif|taux/;
  let col = 0; const cells = [];
  rows.forEach(([k,v,raw],i)=>{
    let full = LONG.test(k) || String(raw ? '' : v).length > 22;
    if (!full && col===0) { const nx = rows[i+1]; if (!nx || LONG.test(nx[0]) || String(nx[2]?'':nx[1]).length > 22) full = true; }
    cells.push(`<div class="cell${full?' full':''}"><div class="k">${esc(k)}</div><div class="v">${raw ? v : esc(v)}</div></div>`);
    col = full ? 0 : 1 - col;
  });
  return `<section class="panel"><h4><span>${esc(title)}</span>${right}</h4>${cells.length?`<div class="grid">${cells.join('')}</div>`:''}</section>`;
}
async function openDetail(f){
  DETAIL = f.id;
  const cif = f.type === 'CIF', col = resColor(f), n = (f.photos||[]).length;
  computeGroups(); const mates = groupMates(f);
  $('#detTitle').innerHTML = `<span class="badge ${cif?'cif':''}">${esc(f.type||'CI')}</span>${f.accident?'<span class="badge acc">Accident</span>':''}${f.status==='archived'?'Archivée':'En cours'}`;
  const nom = (f.nom||'').toUpperCase(), born = [f.dateNaissance && `Né(e) le ${f.dateNaissance}`, f.lieuNaissance && `à ${f.lieuNaissance}`].filter(Boolean).join(' ');
  const hero = `<div class="hero"><div class="hl">
      <div class="nm">${nom||f.prenom ? `${esc(nom)} <span>${esc(f.prenom||'')}</span>` : '<span style="color:var(--muted)">Sans identité</span>'}</div>
      <div class="chips2">
        ${f.resultat ? `<span class="chip" style="background:${col}22;color:${col};border:1px solid ${col}66">${esc(f.resultat)}</span>` : ''}
        <span class="chip" style="color:${col}">${ICON_CLOCK}${esc(fmtDT(f.dateHeure))}</span>
        ${f.lieuControle ? `<span class="chip">${ICON_PIN}${esc(f.lieuControle)}</span>` : ''}
      </div>${mates.length ? `<div class="mates" style="--gc:${GROUPS.get(f.id).color}">${ICON_LINK}<span>Avec ${mates.map(m=>`<button type="button" data-mate="${m.id}">${esc(ficheName(m))}</button>`).join(', ')}</span></div>` : ''}</div><div class="vics">${vehIcons(f)}</div></div>`;
  const veh = (f.vehicules||[]).map((v,i)=>panel(`Véhicule ${i+1}${v.type?` · ${v.type}`:''}`,
      [['Marque',v.marque],['Modèle',v.modele],['Couleur',v.couleur],['Propriétaire',v.proprio]],
      v.plaque ? plateHTML(v) : '')).join('');
  const tel = f.telephone ? `<a href="tel:${esc(f.telephone.replace(/[^\d+]/g,''))}">${esc(f.telephone)}</a>` : '';
  const ident = panel('Identité', [['Date de naissance',f.dateNaissance],['Lieu de naissance',f.lieuNaissance],['Nationalité',f.nationalite],['Profession',f.profession], ...(cif ? [['Téléphone',tel,true]] : []), ['Adresse',f.adresse], ...(cif ? [['Filiation',f.filiation]] : [])]);
  const doc = !cif ? '' : f.docMode==='Sur dires' ? panel('Pièce d\'identité', [['Identité établie','Sur dires']])
      : panel('Pièce d\'identité', [['Type',f.docType],['Numéro',f.docNumero],['Délivré le',f.docDate],['Délivré à / par',f.docLieu]]);
  const ok = b => b ? '<span style="color:#3ccf4e">✓ photo prise</span>' : '<span style="color:#ff5a52">✗ à faire</span>';
  const acc = !f.accident ? '' : panel('Accident', [['Situation familiale',f.sitFam],['E-mail',f.email?`<a href="mailto:${esc(f.email)}">${esc(f.email)}</a>`:'',true],
      ['Enfants',f.nbEnfants],['Dont à charge',f.nbCharge], ...MEMO.map(([k,l])=>[l, ok(f[k]), true])]);
  const dep = !f.accident ? '' : panel('Dépistages', [['Alcool — heure',f.alcHeure],['Alcool — résultat',resTest(f.alcRes),true],['Alcool — taux',taux(f.alcTaux)],
      ['Stupéfiants — heure',f.stupHeure],['Stupéfiants — résultat',resTest(f.stupRes),true]]);
  const ctx = panel('Contexte', [['Motif',f.motif],['Observations',f.observations]]);
  const photos = n ? `<section class="panel"><h4><span>Photos</span><span>${n}</span></h4><div class="photos" style="padding:10px">${f.photos.map(id=>`<div class="ph" data-id="${id}"><img alt=""></div>`).join('')}</div></section>` : '';
  const arch = f.status==='archived' ? `<p class="hint" style="margin-top:16px;color:var(--muted);font-size:13px">Archivée le ${fmtD(f.archivedAt)}${+SETTINGS.purgeDays?` · suppression auto le ${fmtD(f.archivedAt+SETTINGS.purgeDays*DAY)}`:''}</p>` : '';
  $('#detBody').innerHTML = hero + (cif ? ident + acc + dep + doc + veh : veh + ident + acc + dep) + ctx + photos + arch;
  $('#detArchive').innerHTML = f.status==='archived' ? ICON.restore + '<span>Remettre</span>' : ICON.archive + '<span>Archiver</span>';
  $('#detArchive').setAttribute('aria-label', f.status==='archived' ? 'Remettre en cours' : 'Archiver');
  $('#detail').classList.remove('hidden'); $('#detail .body').scrollTop = 0;
  for (const el of $('#detBody').querySelectorAll('.ph')) el.querySelector('img').src = await photoURL(el.dataset.id);
}
const detFiche = () => FICHES.find(x=>x.id===DETAIL);
const closeDetail = () => { DETAIL = null; $('#detail').classList.add('hidden'); };
$('#detBack').onclick = closeDetail;
$('#detBody').addEventListener('click', async e=>{ const mt=e.target.closest('[data-mate]'); if (mt) { const m=FICHES.find(x=>x.id===mt.dataset.mate); if (m) openDetail(m); return; } const ph=e.target.closest('.ph'); if (!ph) return; $('#viewer img').src = await photoURL(ph.dataset.id); $('#viewer').classList.remove('hidden'); });
$('#detEdit').onclick = ()=>{ const f=detFiche(); closeDetail(); openForm(f); };
$('#detSend').onclick = ()=>shareFiche(detFiche());
$('#detArchive').onclick = async ()=>{
  const f = detFiche();
  if (f.status==='pending') { f.status='archived'; f.archivedAt=Date.now(); toast('Fiche archivée'); }
  else { f.status='pending'; f.archivedAt=null; toast('Remise en cours'); }
  await saveFiche(f); closeDetail(); render();
};
$('#detDelete').onclick = async ()=>{
  const f = detFiche();
  if (!await ask('Supprimer cette fiche et ses photos ?', 'Supprimer')) return;
  await removeFiche(f.id); closeDetail(); render(); toast('Fiche supprimée');
};

/* ---------- Formulaire ---------- */
function openForm(f){
  const isNew = !f;
  EDIT = { isNew, f: isNew ? {id:uid(), status:'pending', type:(TAB==='CI'?'CI':'CIF'), docMode:'Officiel', photos:[], vehicules:[], createdAt:Date.now(), dateHeure:nowLocal()} : structuredClone(f), added:[], removed:[] };
  if (!EDIT.f.vehicules) EDIT.f.vehicules = [];
  for (const k of FIELDS) $('#f_'+k).value = EDIT.f[k] || '';
  $('#f_accident').checked = !!EDIT.f.accident; for (const k of MEMO) $('#f_'+k[0]).checked = !!EDIT.f[k[0]]; syncAcc();
  setSeg('typeSeg', EDIT.f.type || 'CI'); setSeg('docSeg', EDIT.f.docMode || 'Officiel');
  renderVehicles();
  $('#formTitle').textContent = isNew ? 'Nouvelle fiche' : 'Modifier la fiche';
  $('#formDelete').classList.toggle('hidden', isNew);
  $('#formErr').textContent = '';
  renderPhotos();
  $('#form').classList.remove('hidden'); $('#form .body').scrollTop = 0;
}
async function closeForm(save){
  if (!EDIT) return;
  const E = EDIT;
  if (save) {
    for (const k of FIELDS) E.f[k] = $('#f_'+k).value.trim();
    E.f.type = segVal('typeSeg'); E.f.docMode = segVal('docSeg');
    E.f.accident = $('#f_accident').checked; for (const [k] of MEMO) E.f[k] = E.f.accident && $('#f_'+k).checked;
    if (!E.f.accident) for (const k of ACC_FIELDS) E.f[k] = '';
    readVehicles(); E.f.vehicules = E.f.vehicules.filter(v=>VEH_FIELDS.some(([k])=>v[k]));
    if (E.f.type === 'CI') for (const k of CIF_FIELDS) E.f[k] = '';
    if (E.f.type === 'CIF' && E.f.docMode === 'Sur dires') for (const k of ['docType','docNumero','docDate','docLieu']) E.f[k] = '';
    if (!E.f.nom && !E.f.prenom && !E.f.observations && !E.f.photos.length && !E.f.vehicules.length) { $('#formErr').textContent = 'Renseigne au moins un nom, une observation ou une photo.'; return; }
    const miss = E.f.accident ? MEMO.filter(([k])=>!E.f[k]).map(m=>m[2]) : [];
    if (miss.length && !await ask(`Accident — photos non cochées :\n• ${miss.join('\n• ')}\n\nEnregistrer quand même ?`, 'Enregistrer', false)) return;
    for (const id of E.removed) await removePhoto(id);
    await saveFiche(E.f); toast('Fiche enregistrée');
    if (learnFrom(E.f)) saveLearn().catch(()=>{});
    if (E.f.status==='pending') { TAB = E.f.type; window.lastTab = TAB; }
  } else {
    for (const id of E.added) await removePhoto(id);
  }
  EDIT = null; sgHide(); $('#form').classList.add('hidden'); render();
  if (save && !E.isNew) openDetail(E.f);
}
$('#formSave').onclick = ()=>closeForm(true);
$('#formCancel').onclick = $('#formBack').onclick = ()=>closeForm(false);
$('#formDelete').onclick = async ()=>{
  if (!await ask('Supprimer cette fiche et ses photos ?', 'Supprimer')) return;
  for (const id of EDIT.added) await removePhoto(id);
  await removeFiche(EDIT.f.id); EDIT=null; $('#form').classList.add('hidden'); render(); toast('Fiche supprimée');
};
const dateMask = e=>{
  const d = e.target.value.replace(/\D/g,'').slice(0,8);
  e.target.value = d.length>4 ? `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}` : d.length>2 ? `${d.slice(0,2)}/${d.slice(2)}` : d;
};
$('#f_dateNaissance').addEventListener('input', dateMask);
$('#f_docDate').addEventListener('input', dateMask);

/* Accident */
function syncAcc(){ $('#accBlock').classList.toggle('hidden', !$('#f_accident').checked); }
$('#f_accident').addEventListener('change', syncAcc);
$('#memoPhoto').onclick = ()=>$('#phInput').click();

/* Sélecteurs CI/CIF et Sur dires/Officiel */
function setSeg(id, v){ document.querySelectorAll(`#${id} button`).forEach(b=>b.classList.toggle('on', b.dataset.v===v)); syncBlocks(); }
const segVal = id => document.querySelector(`#${id} button.on`)?.dataset.v;
function syncBlocks(){
  $('#cifBlock').classList.toggle('hidden', segVal('typeSeg') !== 'CIF');
  $('#docBlock').classList.toggle('hidden', segVal('docSeg') !== 'Officiel');
}
['typeSeg','docSeg'].forEach(id=>$('#'+id).addEventListener('click', e=>{ const b=e.target.closest('button'); if (b) setSeg(id, b.dataset.v); }));

/* Véhicules */
function readVehicles(){
  document.querySelectorAll('#vehicles .veh').forEach((el,i)=>{
    const v = EDIT.f.vehicules[i]; if (!v) return;
    v.type = el.querySelector('input[type=radio]:checked')?.value || '';
    for (const [k] of VEH_FIELDS) v[k] = el.querySelector(`[data-k=${k}]`).value.trim();
    v.pays = el.querySelector('[data-k=pays]').value;
  });
}
function renderVehicles(){
  $('#vehicles').innerHTML = EDIT.f.vehicules.map((v,i)=>`<div class="veh">
    <div class="vh"><b>Véhicule ${i+1}</b><button type="button" class="ib" data-rmveh="${i}" aria-label="Retirer le véhicule">${ICON.trash}</button></div>
    <div class="chips">${VEH_TYPES.map(t=>`<label><input type="radio" name="vt${i}" value="${t}" ${v.type===t?'checked':''}><span>${t}</span></label>`).join('')}</div>
    ${VEH_FIELDS.map(([k,l])=> k==='plaque'
      ? `<label class="f">Plaque</label><div class="platerow"><label class="pays"><span>${esc(v.pays||'F')}</span><small>▾</small><select data-k="pays" aria-label="Pays de la plaque">${paysOptions(v.pays||'F')}</select></label><input data-k="plaque" value="${esc(v.plaque||'')}" autocomplete="off" spellcheck="false" autocapitalize="characters"></div>`
      : `<label class="f">${l}</label><input data-k="${k}" value="${esc(v[k]||'')}" autocomplete="off" spellcheck="false"${k==='marque'?' data-sg="brands"':''}${k==='couleur'?' data-sg="colors"':''}>`).join('')}
  </div>`).join('');
}
$('#addVeh').onclick = ()=>{ readVehicles(); EDIT.f.vehicules.push({type:'VL', pays:'F'}); renderVehicles(); $('#vehicles .veh:last-child').scrollIntoView({behavior:'smooth', block:'start'}); };
$('#vehicles').addEventListener('click', async e=>{
  const b = e.target.closest('[data-rmveh]'); if (!b) return;
  if (!await ask('Retirer ce véhicule ?', 'Retirer')) return;
  readVehicles(); EDIT.f.vehicules.splice(+b.dataset.rmveh, 1); renderVehicles();
});
$('#vehicles').addEventListener('change', e=>{ if (e.target.dataset.k==='pays') e.target.closest('.pays').querySelector('span').textContent = e.target.value; });
$('#vehicles').addEventListener('input', e=>{ if (e.target.dataset.k==='plaque') { const p=e.target.selectionStart; e.target.value=e.target.value.toUpperCase(); e.target.setSelectionRange(p,p); } });
$('#f_nom').addEventListener('input', e=>{ const p=e.target.selectionStart; e.target.value=e.target.value.toUpperCase(); e.target.setSelectionRange(p,p); });

async function renderPhotos(){
  const ids = EDIT.f.photos;
  const box = $('#photos');
  box.innerHTML = ids.map(id=>`<div class="ph" data-id="${id}"><img alt=""><button class="x" aria-label="Retirer la photo">${ICON.x}</button></div>`).join('')
    + `<button class="addph" id="addph">${ICON.cam}Ajouter</button>`;
  $('#addph').onclick = ()=>$('#phInput').click();
  for (const el of box.querySelectorAll('.ph')) el.querySelector('img').src = await photoURL(el.dataset.id);
}
$('#photos').addEventListener('click', async e=>{
  const ph = e.target.closest('.ph'); if (!ph) return;
  const id = ph.dataset.id;
  if (e.target.closest('.x')) {
    if (!await ask('Retirer cette photo ?', 'Retirer')) return;
    EDIT.f.photos = EDIT.f.photos.filter(x=>x!==id);
    if (EDIT.added.includes(id)) { EDIT.added = EDIT.added.filter(x=>x!==id); await removePhoto(id); } else EDIT.removed.push(id);
    renderPhotos();
  } else { $('#viewer img').src = await photoURL(id); $('#viewer').classList.remove('hidden'); }
});
$('#viewer').onclick = ()=>$('#viewer').classList.add('hidden');
$('#phInput').onchange = async e=>{
  const files = [...e.target.files]; e.target.value = '';
  if (!files.length) return;
  toast(files.length>1 ? `Ajout de ${files.length} photos…` : 'Ajout de la photo…');
  for (const file of files) {
    try { const id = await savePhoto(await shrink(file)); EDIT.added.push(id); EDIT.f.photos.push(id); }
    catch { toast('Une photo n’a pas pu être lue'); }
  }
  renderPhotos();
};
// Redimensionne (1600 px max) et réencode en JPEG : allège le stockage et retire les métadonnées (GPS…).
async function shrink(file, max=1600, q=.82){
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=url; });
    const s = Math.min(1, max/Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth*s); c.height = Math.round(img.naturalHeight*s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('jpeg')), 'image/jpeg', q));
  } finally { URL.revokeObjectURL(url); }
}

/* ---------- Partage ---------- */
function ficheSections(f){
  const cif = f.type === 'CIF', S = [];
  const add = (title, rows) => { rows = rows.filter(r=>r[1]); if (rows.length) S.push([title, rows]); };
  add('', [['Date & heure',fmtDT(f.dateHeure)],['Résultat',f.resultat],['Lieu du contrôle',f.lieuControle],['Contrôlé(e) avec',groupMates(f).map(ficheName).join(', ')]]);
  const addVeh = () => (f.vehicules||[]).forEach((v,i)=>add(`Véhicule ${i+1}${v.type?` — ${v.type}`:''}`, VEH_FIELDS.map(([k,l])=>[l, k==='plaque' && v.plaque ? `${v.plaque} (${v.pays||'F'} — ${PAYS_NAME[v.pays||'F']||''})` : v[k]])));
  if (!cif) addVeh(); // CI : le véhicule passe en premier
  add('Identité', [['Nom',(f.nom||'').toUpperCase()],['Prénom',f.prenom],['Date de naissance',f.dateNaissance],['Lieu de naissance',f.lieuNaissance],
    ['Nationalité',f.nationalite],['Profession',f.profession],['Adresse',f.adresse], ...(cif ? [['Téléphone',f.telephone],['Filiation',f.filiation]] : [])]);
  if (f.accident) add('Accident', [['Situation familiale',f.sitFam],['E-mail',f.email],['Nombre d\'enfants',f.nbEnfants],['Dont à charge',f.nbCharge],
    ...MEMO.map(([k,l])=>[l, f[k]?'photographié(e)':'non photographié(e)'])]);
  if (f.accident) add('Dépistages', [['Test alcool',[f.alcHeure && `à ${f.alcHeure}`, f.alcRes, taux(f.alcTaux)].filter(Boolean).join(' — ')],
    ['Test stupéfiants',[f.stupHeure && `à ${f.stupHeure}`, f.stupRes].filter(Boolean).join(' — ')]]);
  if (cif) add('Document', f.docMode === 'Sur dires' ? [['Identité établie','Sur dires']]
    : !(f.docType||f.docNumero||f.docDate||f.docLieu) ? [] : [['Identité établie','Pièce officielle'],['Type',f.docType],['Numéro',f.docNumero],['Délivré le',f.docDate],['Délivré à / par',f.docLieu]]);
  if (cif) addVeh();
  add('Contexte', [['Motif',f.motif],['Observations',f.observations]]);
  return S;
}
function ficheText(f){
  const n = (f.photos||[]).length;
  return `${ficheName(f)} — ${f.type==='CIF'?'CIF':'CI'}${f.accident?' — ACCIDENT':''}\n`
    + ficheSections(f).map(([t,rows])=>(t?t.toUpperCase()+'\n':'') + rows.map(r=>`${r[0]} : ${r[1]}`).join('\n')).join('\n\n')
    + (n ? `\n\nPhotos jointes : ${n}` : '');
}
const ficheName = f => [(f.nom||'').toUpperCase(), f.prenom].filter(Boolean).join(' ') || 'Sans identité';
const ficheSubject = f => ficheName(f) + (f.accident ? ' (accident)' : '');
async function shareOut(data, fallbackText){
  try {
    if (data.files?.length && !(navigator.canShare && navigator.canShare({files:data.files}))) delete data.files;
    if (navigator.share) { await navigator.share(data); return; }
    throw new Error('noshare');
  } catch (e) {
    if (e.name === 'AbortError') return;
    try { await navigator.clipboard.writeText(fallbackText); toast('Texte copié dans le presse-papiers'); }
    catch { toast('Partage impossible sur cet appareil'); }
  }
}
function openOutlook(subject, body){
  const url = `ms-outlook://compose?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  location.href = url;
}
const shareFiche = f => shareFiches([f]);
async function shareFiches(list){
  computeGroups();
  const n = list.reduce((a,f)=>a+(f.photos||[]).length, 0);
  const choice = await new Promise(res=>{
    const m = $('#shareSheet'); m.classList.remove('hidden');
    $('#shOutlookHint').textContent = 'Texte seul, tu saisis le destinataire' + (n ? ' (sans les photos)' : '');
    $('#shShareHint').textContent = n ? `Texte + ${n} photo(s), choisis Outlook dans la liste` : 'Outlook, Mail, AirDrop…';
    m.onclick = e=>{ const b=e.target.closest('[data-sh]'); if (!b && e.target!==m) return; m.classList.add('hidden'); m.onclick=null; res(b?.dataset.sh); };
  });
  if (!choice || choice === 'cancel') return;
  const subject = list.map(ficheSubject).join(' / ');
  const text = list.map(ficheText).join('\n\n— — — — —\n\n');
  if (choice === 'outlook') openOutlook(subject, text);
  else {
    const files = [];
    for (const f of list) {
      const base = ((f.nom||'fiche')+'_'+(f.prenom||'')).replace(/[^\w-]+/g,'_');
      for (const [i,id] of (f.photos||[]).entries()) { const b = await photoBuf(id); if (b) files.push(new File([b], `${base}_${i+1}.jpg`, {type:'image/jpeg'})); }
    }
    await shareOut({title:subject, text, files}, text);
  }
  if (SEL) { SEL = null; render(); }
}

/* ---------- Suggestions (saisie rapide) ---------- */
const SG_LEARN_MAP = [['nationalite','nats'],['lieuNaissance','villes'],['lieuControle','lieux'],['profession','prof'],['docType','docTypes'],['docLieu','docLieu']];
let LEARN = {};
const norm = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
function sgList(key){ const seen=new Set(), out=[]; for (const v of [...(LEARN[key]||[]), ...(SG_BASE[key]||[])]) { const n=norm(v); if (n && !seen.has(n)) { seen.add(n); out.push(v); } } return out; }
function learnFrom(f){
  let changed = false;
  const add = (key, val) => { val=(val||'').trim(); if (!val || val.length<2) return; if (sgList(key).some(x=>norm(x)===norm(val))) return; (LEARN[key] ||= []).unshift(val); LEARN[key]=LEARN[key].slice(0,300); changed = true; };
  for (const [field,key] of SG_LEARN_MAP) add(key, f[field]);
  for (const v of (f.vehicules||[])) { add('brands', v.marque); add('colors', v.couleur); }
  return changed;
}
async function saveLearn(){ const r = await encJSON(KEY, LEARN); await dbPut('meta', {iv:r.iv, data:r.data}, 'learn'); }
async function loadLearn(){ const r = await dbGet('meta','learn'); LEARN = {}; if (r) try { LEARN = await decJSON(KEY, r); } catch {} }

const sgBox = document.createElement('div'); sgBox.id = 'sg'; sgBox.className = 'hidden'; document.body.appendChild(sgBox);
let sgInput = null;
function sgHide(){ sgBox.classList.add('hidden'); sgInput = null; }
function sgShow(inp){
  const q = norm(inp.value); if (!q) return sgHide();
  const list = sgList(inp.dataset.sg);
  const starts = [], words = [], inc = [];
  for (const v of list) { const n = norm(v); if (n === q) continue; if (n.startsWith(q)) starts.push(v); else if (n.split(/[\s\-'/]+/).some(w=>w.startsWith(q))) words.push(v); else if (q.length>1 && n.includes(q)) inc.push(v); }
  const res = [...starts.sort((a,b)=>a.localeCompare(b,'fr')), ...words, ...inc].slice(0,8);
  if (!res.length) return sgHide();
  sgInput = inp;
  const r = inp.getBoundingClientRect();
  sgBox.style.left = r.left+'px'; sgBox.style.width = r.width+'px';
  const below = window.innerHeight - r.bottom;
  if (below < 220 && r.top > below) { sgBox.style.top=''; sgBox.style.bottom = (window.innerHeight - r.top + 4)+'px'; }
  else { sgBox.style.bottom=''; sgBox.style.top = (r.bottom + 4)+'px'; }
  sgBox.innerHTML = res.map(v=>{ const n=norm(v), i=n.indexOf(q); return `<button type="button" data-v="${esc(v)}">${i>=0 ? esc(v.slice(0,i))+'<b>'+esc(v.slice(i,i+q.length))+'</b>'+esc(v.slice(i+q.length)) : esc(v)}</button>`; }).join('');
  sgBox.classList.remove('hidden');
}
document.addEventListener('input', e=>{ if (e.target.dataset?.sg) sgShow(e.target); });
document.addEventListener('focusin', e=>{ if (e.target.dataset?.sg) sgShow(e.target); else if (!sgBox.contains(e.target)) sgHide(); });
document.addEventListener('focusout', e=>{ if (e.target===sgInput) setTimeout(()=>{ if (document.activeElement!==sgInput) sgHide(); }, 200); });
sgBox.addEventListener('pointerdown', e=>e.preventDefault());
sgBox.addEventListener('click', e=>{
  const b = e.target.closest('button'); if (!b || !sgInput) return;
  const inp = sgInput; inp.value = b.dataset.v; inp.dispatchEvent(new Event('change',{bubbles:true})); sgHide();
  const all = [...inp.closest('.body').querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=file]),textarea')].filter(x=>x.offsetParent);
  const nx = all[all.indexOf(inp)+1]; if (nx) nx.focus(); else inp.blur();
});
document.querySelectorAll('.sheet .body').forEach(b=>b.addEventListener('scroll', ()=>{ if (sgInput) sgShow(sgInput); }, {passive:true}));

/* ---------- Déverrouillage biométrique (WebAuthn + PRF) ----------
   Le téléphone crée une clé d'accès (passkey) liée à Face ID / l'empreinte.
   Son extension PRF fournit un secret qui n'est délivré qu'après validation biométrique :
   il sert à chiffrer le code de l'appli, lui-même nécessaire pour déchiffrer les fiches. */
const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
const bioName = () => IS_IOS ? 'Face ID' : 'la biométrie';
const rnd = n => crypto.getRandomValues(new Uint8Array(n));
async function bioAvailable(){
  try { return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch { return false; }
}
async function prfKey(out){ return crypto.subtle.importKey('raw', out, {name:'AES-GCM'}, false, ['encrypt','decrypt']); }
async function prfGet(credId, prfSalt){
  const cred = await navigator.credentials.get({publicKey:{
    challenge: rnd(32), rpId: location.hostname, userVerification:'required', timeout: 60000,
    allowCredentials:[{type:'public-key', id: credId}],
    extensions:{prf:{eval:{first: prfSalt}}}
  }});
  const out = cred.getClientExtensionResults()?.prf?.results?.first;
  if (!out) throw new Error('noprf');
  return out;
}
async function enableBio(){
  if (!KEY || !PIN) return toast('Déverrouille d\'abord avec ton code');
  if (!await bioAvailable()) return toast('Biométrie non disponible sur cet appareil');
  try {
    const prfSalt = rnd(32);
    const cred = await navigator.credentials.create({publicKey:{
      rp:{name:'CIF 2.0', id: location.hostname},
      user:{id: rnd(16), name:'CIF 2.0', displayName:'CIF 2.0'},
      challenge: rnd(32), timeout: 60000,
      pubKeyCredParams:[{type:'public-key', alg:-7},{type:'public-key', alg:-257}],
      authenticatorSelection:{authenticatorAttachment:'platform', residentKey:'required', userVerification:'required'},
      extensions:{prf:{eval:{first: prfSalt}}}
    }});
    const ext = cred.getClientExtensionResults()?.prf;
    if (ext && ext.enabled === false) throw new Error('noprf');
    const credId = new Uint8Array(cred.rawId);
    const out = ext?.results?.first || await prfGet(credId, prfSalt);
    const r = await encBytes(await prfKey(out), te.encode(PIN));
    await dbPut('meta', {credId, prfSalt, iv:r.iv, data:r.data}, 'bio');
    toast('Déverrouillage biométrique activé'); syncBioUI();
  } catch (e) {
    if (e.name === 'NotAllowedError' || e.name === 'AbortError') return toast('Activation annulée');
    toast(e.message==='noprf' ? 'Appareil non compatible (iOS 18 ou Android récent requis)' : 'Activation impossible : ' + (e.message||e.name));
  }
}
let bioBusy = false;
async function bioUnlock(auto){
  if (bioBusy || KEY) return; bioBusy = true;
  try {
    const b = await dbGet('meta','bio'); if (!b) return;
    const out = await prfGet(b.credId, b.prfSalt);
    const pin = td.decode(await decBytes(await prfKey(out), b));
    if (!await unlockWith(pin)) { await dbDel('meta','bio'); $('#bioBtn').classList.add('hidden'); $('#lockErr').textContent = 'Déverrouillage biométrique désactivé : saisis ton code.'; }
  } catch (e) {
    if (!auto && e.name !== 'NotAllowedError' && e.name !== 'AbortError') $('#lockErr').textContent = 'Biométrie indisponible : saisis ton code.';
    if (auto) setTimeout(()=>$('#pin').focus(), 150);
  } finally { bioBusy = false; }
}
$('#bioBtn').onclick = ()=>bioUnlock(false);
async function syncBioUI(){
  const on = !!(await dbGet('meta','bio')), avail = await bioAvailable();
  const t = $('#bioToggle'); t.textContent = on ? `Désactiver ${bioName()}` : `Activer ${bioName()}`; t.disabled = !avail && !on;
  $('#bioInfo').textContent = !avail && !on ? 'Biométrie non disponible sur cet appareil.'
    : on ? `L'appli s'ouvre avec ${bioName()}. Ton code reste utilisable en secours.`
    : `Ouvre l'appli avec ${bioName()} au lieu de taper le code (iOS 18 ou Android récent).`;
}
$('#bioToggle').onclick = async ()=>{
  if (await dbGet('meta','bio')) { if (await ask(`Désactiver ${bioName()} ?`, 'Désactiver')) { await dbDel('meta','bio'); toast('Déverrouillage biométrique désactivé'); syncBioUI(); } }
  else enableBio();
};

/* ---------- Réglages ---------- */
$('#btnSettings').onclick = async ()=>{
  $('#s_purge').value = String(SETTINGS.purgeDays); $('#s_lock').value = String(SETTINGS.lockMinutes);
  ['#c_old','#c_new','#c_new2'].forEach(s=>$(s).value='');
  $('#storageInfo').textContent = ''; $('#verTag').textContent = `v${APP_VERSION}`; syncBioUI();
  $('#versionInfo').textContent = `Version installée : ${APP_VERSION}. Tes fiches sont conservées lors des mises à jour.` + ` (écran ${screen.height} · fenêtre ${window.innerHeight})`;
  try { const est = await navigator.storage.estimate(); const persisted = await navigator.storage.persisted?.();
    $('#storageInfo').textContent = `Espace utilisé : ${(est.usage/1048576).toFixed(1)} Mo · ${FICHES.length} fiche(s)` + (persisted ? ' · stockage persistant' : ''); } catch {}
  $('#settings').classList.remove('hidden');
};
async function remoteVersion(){
  const r = await fetch('./app.js?v=' + Date.now(), {cache:'reload'});
  if (!r.ok) throw new Error(r.status);
  return ((await r.text()).match(/APP_VERSION = '([^']+)'/) || [])[1] || null;
}
async function applyUpdate(){
  toast('Mise à jour…');
  try {
    for (const f of ['./index.html','./app.js','./data.js','./style.css','./sw.js']) await fetch(f, {cache:'reload'});
    const reg = await navigator.serviceWorker?.getRegistration(); await reg?.update();
    for (const k of await caches.keys()) await caches.delete(k);
  } catch {}
  setTimeout(()=>location.reload(), 500);
}
async function checkUpdate(manual){
  try {
    const v = await remoteVersion();
    if (v && v !== APP_VERSION) { if (manual) applyUpdate(); else { $('#updBanner').textContent = `Version ${v} disponible (installée : ${APP_VERSION}) — toucher pour mettre à jour`; $('#updBanner').classList.remove('hidden'); } }
    else if (manual) toast(`Déjà à jour (v${APP_VERSION})`);
  } catch { if (manual) toast('Pas de réseau : vérification impossible'); }
}
$('#btnUpdate').onclick = ()=>checkUpdate(true);
$('#updBanner').onclick = applyUpdate;
$('#setBack').onclick = ()=>$('#settings').classList.add('hidden');
$('#s_purge').onchange = async e=>{ SETTINGS.purgeDays = +e.target.value; await dbPut('meta', SETTINGS, 'settings'); await purge(); render(); };
$('#s_lock').onchange = async e=>{ SETTINGS.lockMinutes = +e.target.value; await dbPut('meta', SETTINGS, 'settings'); };

$('#c_btn').onclick = async ()=>{
  const o=$('#c_old').value, n=$('#c_new').value, n2=$('#c_new2').value;
  const auth = await dbGet('meta','auth');
  try { await decJSON(await deriveKey(o, auth.salt), auth.verifier); } catch { return toast('Code actuel incorrect'); }
  if (n.length < 4) return toast('Nouveau code : 4 caractères minimum');
  if (n !== n2) return toast('Les nouveaux codes ne correspondent pas');
  toast('Rechiffrement en cours…');
  const salt = crypto.getRandomValues(new Uint8Array(16)), nk = await deriveKey(n, salt);
  const v = await encJSON(nk, {ok:true});
  const fiches = [], photos = [], lr = await encJSON(nk, LEARN);
  for (const f of FICHES) { const r = await encJSON(nk, f); fiches.push({id:f.id, iv:r.iv, data:r.data}); }
  for (const p of await dbAll('photos')) { const r = await encBytes(nk, await decBytes(KEY, p)); photos.push({id:p.id, iv:r.iv, data:r.data}); }
  await writeAll([
    ['meta', s=>{ s.put({salt, verifier:{iv:v.iv, data:v.data}}, 'auth'); s.put({iv:lr.iv, data:lr.data}, 'learn'); }],
    ['fiches', s=>fiches.forEach(x=>s.put(x))],
    ['photos', s=>photos.forEach(x=>s.put(x))]
  ]);
  KEY = nk; PIN = n; ['#c_old','#c_new','#c_new2'].forEach(s=>$(s).value='');
  if (await dbGet('meta','bio')) { await dbDel('meta','bio'); toast('Code modifié — réactive le déverrouillage biométrique'); syncBioUI(); } else toast('Code modifié');
};

$('#exportOutlook').onclick = ()=>{
  const list = FICHES.filter(f=>f.status==='pending').sort((a,b)=>(a.dateHeure||'').localeCompare(b.dateHeure||''));
  if (!list.length) return toast('Aucune fiche en cours');
  openOutlook(`CIF 2.0 — ${list.length} fiches — ${fmtD(Date.now())}`, list.map(ficheText).join('\n\n— — — — —\n\n'));
};
$('#exportText').onclick = ()=>{
  const list = FICHES.filter(f=>f.status==='pending').sort((a,b)=>(a.dateHeure||'').localeCompare(b.dateHeure||''));
  if (!list.length) return toast('Aucune fiche en cours');
  const text = list.map(ficheText).join('\n\n— — —\n\n');
  shareOut({title:'CIF 2.0', text}, text);
};

const b64 = u => { const a = u instanceof Uint8Array ? u : new Uint8Array(u); let s=''; for (let i=0;i<a.length;i+=0x8000) s += String.fromCharCode.apply(null, a.subarray(i,i+0x8000)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c=>c.charCodeAt(0));
$('#backupOut').onclick = async ()=>{
  const auth = await dbGet('meta','auth');
  const pack = r => ({id:r.id, iv:b64(r.iv), data:b64(r.data)});
  const obj = {app:'renseignement', v:1, date:new Date().toISOString(), salt:b64(auth.salt),
    verifier:{iv:b64(auth.verifier.iv), data:b64(auth.verifier.data)},
    fiches:(await dbAll('fiches')).map(pack), photos:(await dbAll('photos')).map(pack)};
  const lrec = await dbGet('meta','learn'); if (lrec) obj.learn = {iv:b64(lrec.iv), data:b64(lrec.data)};
  const name = `sauvegarde-CIF2.0-${new Date().toISOString().slice(0,10)}.json`;
  const file = new File([JSON.stringify(obj)], name, {type:'application/json'});
  if (navigator.canShare && navigator.canShare({files:[file]})) {
    try { await navigator.share({files:[file]}); } catch (e) { if (e.name!=='AbortError') toast('Export impossible'); }
  } else {
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
  }
};
$('#backupIn').onclick = ()=>$('#backupFile').click();
$('#backupFile').onchange = async e=>{
  const file = e.target.files[0]; e.target.value=''; if (!file) return;
  let obj; try { obj = JSON.parse(await file.text()); if (obj.app!=='renseignement') throw 0; } catch { return toast('Fichier de sauvegarde invalide'); }
  if (!await ask(`Restaurer la sauvegarde du ${fmtD(obj.date)} (${obj.fiches.length} fiche(s)) ?\nToutes les données actuelles seront remplacées. Il faudra ensuite saisir le code de la sauvegarde.`, 'Restaurer')) return;
  const unpack = r => ({id:r.id, iv:unb64(r.iv), data:unb64(r.data)});
  await writeAll([
    ['meta', s=>{ s.delete('auth'); s.delete('learn'); s.delete('bio'); s.put({salt:unb64(obj.salt), verifier:{iv:unb64(obj.verifier.iv), data:unb64(obj.verifier.data)}}, 'auth'); if (obj.learn) s.put({iv:unb64(obj.learn.iv), data:unb64(obj.learn.data)}, 'learn'); }],
    ['fiches', s=>{ s.clear(); obj.fiches.forEach(r=>s.put(unpack(r))); }],
    ['photos', s=>{ s.clear(); obj.photos.forEach(r=>s.put(unpack(r))); }]
  ]);
  lock(); toast('Sauvegarde restaurée');
};
$('#wipe').onclick = async ()=>{
  if (!await ask('Effacer TOUTES les fiches, archives et photos ?\nCette action est définitive.', 'Tout effacer')) return;
  await wipeAll();
};

$('#detSend').innerHTML = ICON.send + '<span>Envoyer</span>'; $('#detEdit').innerHTML = ICON.edit + '<span>Modifier</span>';

/* ---------- Correctif iPhone : bande noire après le clavier ----------
   En mode « écran d'accueil », iOS rétrécit la fenêtre à la première ouverture du clavier
   (saisie du code) et ne la rétablit pas : d'où la bande noire en bas.
   À la fermeture du clavier, on force iOS à remesurer l'écran. */
(function(){
  const peak = {}; const key = () => window.innerWidth;
  const note = () => { peak[key()] = Math.max(peak[key()]||0, window.innerHeight); };
  note(); window.addEventListener('resize', note);
  function remeasure(){
    const ae = document.activeElement;
    if (ae && ae.matches && ae.matches('input,textarea,select')) return; // clavier encore ouvert
    if ((peak[key()]||0) - window.innerHeight <= 4) return;               // pas bloqué
    const scrolls = [...document.querySelectorAll('.sheet .body, #list')].map(el=>[el, el.scrollTop]);
    const y = window.scrollY, b = document.body;
    b.style.display = 'none'; void b.offsetHeight; b.style.display = '';
    scrolls.forEach(([el,t])=>el.scrollTop = t); window.scrollTo(0, y);
  }
  document.addEventListener('focusout', ()=>{ setTimeout(remeasure, 350); setTimeout(remeasure, 900); });
  document.addEventListener('visibilitychange', ()=>{ if (!document.hidden) setTimeout(remeasure, 300); });
})();

/* ---------- Démarrage ---------- */
(async ()=>{
  try {
    db = await openDB();
    const s = await dbGet('meta','settings'); if (s) SETTINGS = {...SETTINGS, ...s};
    showLock(!(await dbGet('meta','auth')));
    navigator.storage?.persist?.().catch(()=>{});
  } catch (e) {
    $('#lockErr').textContent = 'Stockage indisponible : ' + e.message;
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
