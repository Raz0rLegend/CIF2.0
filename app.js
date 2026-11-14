'use strict';
/* CIF 2.0 — logique de l'application */
const APP_VERSION = '4.2';
/* ---------- Utilitaires ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const te = new TextEncoder(), td = new TextDecoder();
const uid = () => Date.now().toString(36) + crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
const DAY = 864e5;
const RES_COLORS = {'NDN':'#3ccf4e','Oméga':'#b77cff','CDPA':'#ff5a52','CDPU':'#ff5a52','CDPJ':'#ff5a52'};
const resColor = f => RES_COLORS[effRes(f)] || '#cfcfcf';
const vehTypes = f => { const t=[...new Set((f.vehicules||[]).map(v=>v.type||'Autre'))]; return t.length ? t : ['Piéton']; };
const vehIcons = f => vehTypes(f).map(t=>`<span class="vic" title="${esc(t)}">${VICON[t]||VICON.Autre}</span>`).join('');
const QUALITES = ['Piéton','Conducteur VL','Passager','2RM','PL','Autre'];
const FIELDS = ['dateHeure','nom','prenom','dateNaissance','lieuNaissance','nationalite','profession','adresse','telephone','resultat','filiation','docType','docPays','docNumero','docDate','docLieu','lieuControle','motif','observations','sitFam','email','nbEnfants','nbCharge','alcHeure','alcRes','alcTaux','stupHeure','stupRes','kilometrage','employeur'];
const ACC_FIELDS = ['kilometrage','employeur','sitFam','email','nbEnfants','nbCharge','alcHeure','alcRes','alcTaux','stupHeure','stupRes'];
const resTest = r => r ? `<span style="color:${r==='Positif'?'#ff5a52':'#3ccf4e'};font-weight:600">${r}</span>` : '';
const kmTxt = k => { const d = String(k||'').replace(/\D/g,''); return d ? (+d).toLocaleString('fr-FR').replace(/\s/g,' ') + ' km' : ''; };
const taux = t => t ? `${String(t).replace('.',',')} mg/L` : '';
/* Taux alcool : < 0,25 vert · ≥ 0,25 orange · ≥ 0,40 rouge */
const tauxColor = t => { const v = parseFloat(String(t||'').replace(',','.')); return isNaN(v) ? '' : v >= 0.40 ? '#ff5a52' : v >= 0.25 ? '#f39c34' : '#3ccf4e'; };
const MEMO = [['memoCG','Carte grise','carte grise'],['memoAss','Assurance','assurance'],['memoPR','Permis (recto)','permis recto'],['memoPV','Permis (verso)','permis verso'],['memoGR','Garanties de représentation','garanties de représentation']];
const CIF_FIELDS = ['telephone','filiation','docType','docPays','docNumero','docDate','docLieu'];
/* Pièce d'identité : abréviations et pays de délivrance (codes ISO) */
const DOC_TYPES = [['CNI','Carte nationale d\'identité'],['PS','Passeport'],['PC','Permis de conduire'],['CS','Carte de séjour'],['TS','Titre de séjour']];
const DOC_ABBR = Object.fromEntries(DOC_TYPES);
const DOC_PAYS_TOP = [['FR','France'],['MC','Monaco'],['IT','Italie'],['DE','Allemagne'],['CH','Suisse'],['BE','Belgique'],['NL','Pays-Bas'],['LU','Luxembourg'],['GB','Royaume-Uni'],['ES','Espagne'],['PT','Portugal']];
const DOC_PAYS_ALL = [['ZA','Afrique du Sud'],['AL','Albanie'],['DZ','Algérie'],['AD','Andorre'],['SA','Arabie saoudite'],['AR','Argentine'],['AM','Arménie'],['AU','Australie'],['AT','Autriche'],['AZ','Azerbaïdjan'],['BY','Biélorussie'],['BA','Bosnie-Herzégovine'],['BR','Brésil'],['BG','Bulgarie'],['CM','Cameroun'],['CA','Canada'],['CN','Chine'],['CY','Chypre'],['CO','Colombie'],['CI','Côte d\'Ivoire'],['HR','Croatie'],['DK','Danemark'],['EG','Égypte'],['AE','Émirats arabes unis'],['EE','Estonie'],['US','États-Unis'],['FI','Finlande'],['GE','Géorgie'],['GR','Grèce'],['HU','Hongrie'],['IN','Inde'],['IE','Irlande'],['IS','Islande'],['IL','Israël'],['JP','Japon'],['XK','Kosovo'],['LV','Lettonie'],['LB','Liban'],['LI','Liechtenstein'],['LT','Lituanie'],['MK','Macédoine du Nord'],['ML','Mali'],['MT','Malte'],['MA','Maroc'],['MX','Mexique'],['MD','Moldavie'],['ME','Monténégro'],['NO','Norvège'],['PL','Pologne'],['QA','Qatar'],['RO','Roumanie'],['RU','Russie'],['SM','Saint-Marin'],['SN','Sénégal'],['RS','Serbie'],['SK','Slovaquie'],['SI','Slovénie'],['SE','Suède'],['CZ','Tchéquie'],['TN','Tunisie'],['TR','Turquie'],['UA','Ukraine'],['VA','Vatican'],['??','Autre / inconnu']];
const NAT_ISO = [['franc','FR'],['moneg','MC'],['ital','IT'],['allem','DE'],['suisse','CH'],['belg','BE'],['neerland','NL'],['hollan','NL'],['luxemb','LU'],['britann','GB'],['anglais','GB'],['espagn','ES'],['portug','PT'],['maroc','MA'],['alger','DZ'],['tunis','TN'],['roum','RO'],['polon','PL'],['russe','RU'],['ukrain','UA'],['americ','US'],['senegal','SN'],['ivoir','CI'],['turc','TR'],['autrich','AT'],['grec','GR'],['suedois','SE'],['norveg','NO'],['danois','DK'],['chinois','CN'],['japon','JP'],['bresil','BR']];
const docPaysOptions = sel => `<option value="" ${!sel?'selected':''}>Pays</option><optgroup label="Fréquents">${DOC_PAYS_TOP.map(([c,n])=>`<option value="${c}" ${c===sel?'selected':''}>${c} — ${n}</option>`).join('')}</optgroup><optgroup label="Tous les pays">${DOC_PAYS_ALL.map(([c,n])=>`<option value="${c}" ${c===sel?'selected':''}>${c} — ${n}</option>`).join('')}</optgroup>`;
const VERIF_BADGE = '<span class="badge" style="background:#b3261e;color:#fff;letter-spacing:.04em">VERIF</span>';
/* Âge à la date du contrôle (date de naissance JJ/MM/AAAA ou JJ/MM/AA) */
function ageOf(f){
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(String(f.dateNaissance||'').trim()); if (!m) return null;
  const y = +fullYear(m[3]), mo = +m[2], d = +m[1]; if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const ref = f.dateHeure && !isNaN(new Date(f.dateHeure)) ? new Date(f.dateHeure) : new Date();
  let a = ref.getFullYear() - y; if (ref.getMonth()+1 < mo || (ref.getMonth()+1 === mo && ref.getDate() < d)) a--;
  return a >= 0 && a < 130 ? a : null;
}
const isMinor = f => { const a = ageOf(f); return a !== null && a < 18; };
const MINOR_BADGE = '<span class="badge" style="background:#f39c34;color:#111;letter-spacing:.04em">MINEUR</span>';
const signaLabel = f => f.signa ? 'SIGNA' + (f.signaAn ? ' ' + f.signaAn : '') : '';
const docLabel = f => [f.docType, f.docPays].filter(Boolean).join(' ');
const paysOptions = sel => `<optgroup label="Fréquents">${PAYS_TOP.map(([c,n])=>`<option value="${c}" ${c===sel?'selected':''}>${c} — ${n}</option>`).join('')}</optgroup><optgroup label="Tous les pays">${PAYS_ALL.map(([c,n])=>`<option value="${c}" ${c===sel?'selected':''}>${c} — ${n}</option>`).join('')}</optgroup>`;
const plateHTML = v => `<span class="plate"><i>${esc(v.pays||'F')}</i>${esc(v.plaque)}</span>`;
const VEH_TYPES = ['VL','2RM','Camion','Vélo','Autre'];
const VEH_FIELDS = [['plaque','Plaque'],['marque','Marque'],['modele','Type / modèle'],['couleur','Couleur'],['proprio','Propriétaire']];
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
function ask(msg, yes='Confirmer', danger=true, no='Annuler'){
  return new Promise(res=>{
    $('#mNo').textContent=no; $('#mMsg').textContent=msg; const y=$('#mYes'); y.textContent=yes; y.className='btn'+(danger?' danger':'');
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
let SEL = null, PIN = null, VFILTER = '';
let FICHES = [], SETTINGS = {purgeDays:30, lockMinutes:1, groupMin:10, backupDays:5, lastBackup:0, geoMode:'addr'}, TAB='CIF', QUERY='', EDIT=null, lockMode='unlock', hiddenAt=0;
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
  if (EDIT && KEY) saveDraft(KEY, snapshot());
  DRAFT = null;
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
  await loadDraft();
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

/* ---------- Contrôles groupés (même créneau, réglable) ---------- */
let GROUPS = new Map(); // id -> {n, ids}
function computeGroups(){
  GROUPS = new Map();
  const win = +SETTINGS.groupMin; if (!win) return;
  const list = FICHES.filter(f=>f.dateHeure && !isNaN(new Date(f.dateHeure))).sort((a,b)=>a.dateHeure.localeCompare(b.dateHeure));
  let cur = [], start = 0;
  const flush = () => { if (cur.length > 1) { const g = {n:cur.length, ids:cur.map(f=>f.id)}; cur.forEach(f=>GROUPS.set(f.id, g)); } };
  for (const f of list) {
    const t = new Date(f.dateHeure).getTime();
    if (cur.length && t - start <= win*6e4) cur.push(f);
    else { flush(); cur = [f]; start = t; }
  }
  flush();
}
const groupMates = f => { const g = GROUPS.get(f.id); return g ? g.ids.filter(id=>id!==f.id).map(id=>FICHES.find(x=>x.id===id)).filter(Boolean) : []; };
/* Résultat : saisi sur les CIF ; un CI hérite du résultat du dernier CIF de la même personne */
const idKey = f => [norm(f.nom), norm(f.prenom)].join('|');
function cifSource(f){
  if ((f.type||'CI') !== 'CI' || !norm(f.nom)) return null;
  return FICHES.filter(x => x.type==='CIF' && x.resultat && idKey(x)===idKey(f) && (!x.dateNaissance || !f.dateNaissance || x.dateNaissance===f.dateNaissance))
    .sort((a,b)=>(b.dateHeure||'').localeCompare(a.dateHeure||''))[0] || null;
}
const effRes = f => (f.type||'CI') === 'CI' ? (cifSource(f)?.resultat || '') : (f.resultat || '');
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
  syncVFilter(items);
  if (VFILTER) items = items.filter(f => vehTypes(f).includes(VFILTER));
  if (q) items = items.filter(f => [...FIELDS.map(k=>f[k]||''), f.qualite, f.type, f.verif?'VERIF':'', signaLabel(f), ...(f.vehicules||[]).flatMap(v=>Object.values(v))].join(' ').toLowerCase().includes(q));
  items.sort((a,b)=> TAB==='archived' ? b.archivedAt - a.archivedAt : (b.dateHeure||'').localeCompare(a.dateHeure||''));
  window.visibleIds = items.map(f=>f.id);
  if (!items.length) {
    $('#list').innerHTML = backupBanner() + draftBanner() + `<div class="empty">${q ? 'Aucun résultat.' : VFILTER ? `Aucune fiche « ${esc(VFILTER)} » ici.<br><a href="#" id="vfReset" style="color:#7fb3ff">Tout afficher</a>` : TAB==='archived' ? 'Aucune archive.' : `Aucun ${TAB} en cours.<br>Touche + pour en créer un.`}</div>`;
    return;
  }
  $('#list').innerHTML = backupBanner() + draftBanner() + items.map((f,i)=>{
    const name = [ (f.nom||'').toUpperCase(), f.prenom ].filter(Boolean).join(' | ') || '<span style="color:var(--muted)">Sans identité</span>';
    const sub = [f.dateNaissance && (ageOf(f)!==null ? `${f.dateNaissance} (${ageOf(f)} ans)` : f.dateNaissance), f.nationalite].filter(Boolean).join(' | ');
    const n = (f.photos||[]).length;
    const purgeInfo = f.status==='archived' ? `Archivée le ${fmtD(f.archivedAt)}${+SETTINGS.purgeDays ? ` · suppression le ${fmtD(f.archivedAt + SETTINGS.purgeDays*DAY)}` : ''}` : '';
    const g = GROUPS.get(f.id), prev = items[i-1];
    const link = g && prev && GROUPS.get(prev.id) === g ? `<div class="glink" title="Contrôlés ensemble">${ICON_LINK}</div>` : '';
    return `${link}<article class="card${SEL&&SEL.has(f.id)?' sel':''}" data-id="${f.id}">
      ${SEL ? `<div class="chk">${SEL.has(f.id)?ICON.check:''}</div>` : ''}
      ${n ? `<img class="thumb" data-ph="${f.photos[0]}" alt="">` : ''}
      <div class="main">
        <div class="r1"><div class="name"><span class="badge ${f.type==='CIF'?'cif':''}">${esc(f.type||'CI')}</span>${f.accident?'<span class="badge acc">Accident</span>':''}${f.verif?VERIF_BADGE:''}${isMinor(f)?MINOR_BADGE:''}${f.nom||f.prenom ? esc(name) : name}</div><div class="date" style="color:${resColor(f)}">${effRes(f)?`<b>${esc(effRes(f))}</b> · `:''}${esc(fmtDT(f.dateHeure))}</div></div>
        ${sub ? `<div class="sub">${esc(sub)}</div>` : ''}
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
$('#fab').onclick = async ()=>{
  if (DRAFT) {
    if (await ask(`Un contrôle non enregistré est en attente (${ficheName(DRAFT.f)}).\nLe reprendre ?`, 'Reprendre', false, 'Nouveau')) return resumeDraft();
    await discardDraft();
  }
  openForm(null);
};
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
  const cif = f.type === 'CIF', col = resColor(f), n = (f.photos||[]).length, src = cifSource(f);
  computeGroups(); const mates = groupMates(f);
  $('#detTitle').innerHTML = `<span class="badge ${cif?'cif':''}">${esc(f.type||'CI')}</span>${f.accident?'<span class="badge acc">Accident</span>':''}${f.verif?VERIF_BADGE:''}${isMinor(f)?MINOR_BADGE:''}${f.status==='archived'?'Archivée':'En cours'}`;
  const nom = (f.nom||'').toUpperCase(), born = [f.dateNaissance && `Né(e) le ${f.dateNaissance}`, f.lieuNaissance && `à ${f.lieuNaissance}`].filter(Boolean).join(' ');
  const hero = `<div class="hero"><div class="hl">
      <div class="nm">${nom||f.prenom ? `${esc(nom)} <span>${esc(f.prenom||'')}</span>` : '<span style="color:var(--muted)">Sans identité</span>'}</div>
      <div class="chips2">
        ${!cif ? (src ? `<button type="button" class="chip" data-mate="${src.id}" style="background:${col}22;color:${col};border:1px solid ${col}66">${esc(src.resultat)} · hérité du CIF ›</button>` : '') : `<label class="chip" style="position:relative;${f.resultat ? `background:${col}22;color:${col};border:1px solid ${col}66` : 'border:1px dashed #666;color:#bdbdbd'}">${f.resultat ? esc(f.resultat) : 'Résultat'} ▾<select id="detRes" aria-label="Changer le résultat" style="position:absolute;inset:0;width:100%;height:100%;opacity:0;padding:0;border:0">${['','NDN','Oméga','CDPA','CDPU','CDPJ'].map(r=>`<option value="${r}" ${r===(f.resultat||'')?'selected':''}>${r||'—'}</option>`).join('')}</select></label>`}
        <button type="button" class="chip" id="detVerif" style="${f.verif ? 'background:#b3261e;color:#fff;border:1px solid #b3261e;font-weight:700' : 'border:1px dashed #666;color:#bdbdbd'}">VERIF</button>
        <span class="chip" style="color:${col}">${ICON_CLOCK}${esc(fmtDT(f.dateHeure))}</span>
        ${f.lieuControle ? (f.geo ? `<a class="chip" href="https://maps.apple.com/?ll=${f.geo.lat},${f.geo.lng}&q=${encodeURIComponent(f.lieuControle)}" style="text-decoration:none;color:inherit">${ICON_PIN}${esc(f.lieuControle)} ›</a>` : `<span class="chip">${ICON_PIN}${esc(f.lieuControle)}</span>`) : ''}
      </div>${mates.length ? `<div class="mates">${ICON_LINK}<span>Avec ${mates.map(m=>`<button type="button" data-mate="${m.id}">${esc(ficheName(m))}</button>`).join(', ')}</span></div>` : ''}</div><div class="vics">${vehIcons(f)}</div></div>`;
  const veh = (f.vehicules||[]).map((v,i)=>panel(`Véhicule ${i+1}${v.type?` · ${v.type}`:''}`,
      [['Marque',v.marque],['Modèle',v.modele],['Couleur',v.couleur],['Propriétaire',v.proprio]],
      v.plaque ? plateHTML(v) : '')).join('');
  const tel = f.telephone ? `<a href="tel:${esc(f.telephone.replace(/[^\d+]/g,''))}">${esc(f.telephone)}</a>` : '';
  const ident = panel('Identité', [['Date de naissance',f.dateNaissance && (ageOf(f)!==null ? `${f.dateNaissance} (${ageOf(f)} ans)` : f.dateNaissance)],['Lieu de naissance',f.lieuNaissance],['Nationalité',f.nationalite],['Profession',f.profession], ...(cif ? [['Téléphone',tel,true]] : []), ['Adresse',f.adresse], ...(cif ? [['Filiation',f.filiation],['Signalisation',signaLabel(f)]] : [])]);
  const doc = !cif ? '' : f.docMode==='Sur dires' ? panel('Pièce d\'identité', [['Identité établie','Sur dires']])
      : panel('Pièce d\'identité', [['Type',docLabel(f)],['Numéro',f.docNumero],['Délivré le',f.docDate],['Délivré à / par',f.docLieu]]);
  const ok = b => b ? '<span style="color:#3ccf4e">✓ photo prise</span>' : '<span style="color:#ff5a52">✗ à faire</span>';
  const acc = !f.accident ? '' : panel('Accident', [['Kilométrage',kmTxt(f.kilometrage)],['Employeur',f.employeur],['Situation familiale',f.sitFam],['E-mail',f.email?`<a href="mailto:${esc(f.email)}">${esc(f.email)}</a>`:'',true],
      ['Enfants',f.nbEnfants],['Dont à charge',f.nbCharge], ...MEMO.map(([k,l])=>[l, k==='memoGR' ? (f[k] ? '<span style="color:#3ccf4e;font-weight:700">✓ Oui</span>' : '<span style="color:#ff5a52;font-weight:700">✗ Non</span>') : ok(f[k]), true])]);
  const dep = !f.accident ? '' : panel('Dépistages', [['Alcool — heure',f.alcHeure],['Alcool — résultat',resTest(f.alcRes),true],['Alcool — taux', f.alcTaux ? `<span style="color:${tauxColor(f.alcTaux)||'inherit'};font-weight:700">${esc(taux(f.alcTaux))}</span>` : '', true],
      ['Stupéfiants — heure',f.stupHeure],['Stupéfiants — résultat',resTest(f.stupRes),true]]);
  const ctx = panel('Contexte', [['Motif',f.motif],['Observations',f.observations]]);
  const photos = n ? `<section class="panel"><h4><span>Photos</span><span>${n}</span></h4><div class="photos" style="padding:10px">${f.photos.map(id=>`<div class="ph" data-id="${id}"><img alt=""></div>`).join('')}</div></section>` : '';
  const recu = f.recu ? `<p class="hint" style="margin-top:16px;color:var(--muted);font-size:13px">Reçue par QR code le ${fmtD(f.recu)}</p>` : '';
  const arch = f.status==='archived' ? `<p class="hint" style="margin-top:16px;color:var(--muted);font-size:13px">Archivée le ${fmtD(f.archivedAt)}${+SETTINGS.purgeDays?` · suppression auto le ${fmtD(f.archivedAt+SETTINGS.purgeDays*DAY)}`:''}</p>` : '';
  $('#detBody').innerHTML = hero + (cif ? ident + acc + dep + doc + veh : veh + ident + acc + dep) + ctx + photos + recu + arch;
  $('#detArchive').innerHTML = f.status==='archived' ? ICON.restore + '<span>Remettre</span>' : ICON.archive + '<span>Archiver</span>';
  $('#detArchive').setAttribute('aria-label', f.status==='archived' ? 'Remettre en cours' : 'Archiver');
  $('#detVerif').onclick = async ()=>{ const sc = $('#detail .body').scrollTop; f.verif = !f.verif; await saveFiche(f); render(); await openDetail(f); $('#detail .body').scrollTop = sc; toast(f.verif ? 'Marquée VERIF' : 'VERIF retiré'); };
  if ($('#detRes')) $('#detRes').onchange = async e=>{ const sc = $('#detail .body').scrollTop; f.resultat = e.target.value; await saveFiche(f); render(); await openDetail(f); $('#detail .body').scrollTop = sc; toast(f.resultat ? `Résultat : ${f.resultat}` : 'Résultat effacé'); };
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
function openForm(f, d){
  const isNew = d ? d.isNew : !f;
  EDIT = d ? { isNew, f: structuredClone(d.f), added:[...(d.added||[])], removed:[...(d.removed||[])] } : { isNew, f: isNew ? {id:uid(), status:'pending', type:(TAB==='CI'?'CI':'CIF'), docMode:'Officiel', photos:[], vehicules:[], createdAt:Date.now(), dateHeure:nowLocal()} : structuredClone(f), added:[], removed:[] };
  if (!EDIT.f.vehicules) EDIT.f.vehicules = [];
  for (const k of FIELDS) $('#f_'+k).value = EDIT.f[k] || '';
  syncDocPays(); $('#f_accident').checked = !!EDIT.f.accident; for (const k of MEMO) $('#f_'+k[0]).checked = !!EDIT.f[k[0]]; syncAcc(); syncTaux();
  setSeg('typeSeg', EDIT.f.type || 'CI'); setSeg('docSeg', EDIT.f.docMode || 'Officiel');
  renderVehicles();
  $('#formTitle').textContent = isNew ? 'Nouvelle fiche' : 'Modifier la fiche';
  $('#formDelete').classList.toggle('hidden', isNew);
  $('#formErr').textContent = '';
  renderPhotos();
  syncExtra(); $('#geoHint').textContent = EDIT.f.geo ? '📍 Position GPS enregistrée' : '';
  $('#form').classList.remove('hidden'); $('#form .body').scrollTop = 0;
  if (isNew && !d && SETTINGS.geoMode !== 'off') geoFill(true);
}
async function closeForm(save){
  if (!EDIT) return;
  const E = EDIT;
  if (save) {
    for (const k of FIELDS) E.f[k] = $('#f_'+k).value.trim();
    E.f.type = segVal('typeSeg'); E.f.docMode = segVal('docSeg');
    E.f.accident = $('#f_accident').checked; for (const [k] of MEMO) E.f[k] = E.f.accident && $('#f_'+k).checked;
    if (!E.f.accident) for (const k of ACC_FIELDS) E.f[k] = '';
    E.f.verif = $('#f_verif').classList.contains('on'); E.f.signa = $('#f_signa').checked; E.f.signaAn = E.f.signa ? $('#f_signaAn').value : '';
    readVehicles(); E.f.vehicules = E.f.vehicules.filter(v=>VEH_FIELDS.some(([k])=>v[k]));
    if (E.f.type === 'CI') { for (const k of CIF_FIELDS) E.f[k] = ''; E.f.resultat = ''; E.f.signa = false; E.f.signaAn = ''; }
    if (E.f.type === 'CIF' && E.f.docMode === 'Sur dires') for (const k of ['docType','docPays','docNumero','docDate','docLieu']) E.f[k] = '';
    if (!E.f.nom && !E.f.prenom && !E.f.observations && !E.f.photos.length && !E.f.vehicules.length) { $('#formErr').textContent = 'Renseigne au moins un nom, une observation ou une photo.'; return; }
    const miss = E.f.accident ? MEMO.filter(([k])=>k!=='memoGR' && !E.f[k]).map(m=>m[2]) : [];
    if (miss.length && !await ask(`Accident — photos non cochées :\n• ${miss.join('\n• ')}\n\nEnregistrer quand même ?`, 'Enregistrer', false)) return;
    for (const id of E.removed) await removePhoto(id);
    await saveFiche(E.f); toast('Fiche enregistrée'); clearTimeout(draftT); await clearDraft();
    if (learnFrom(E.f)) saveLearn().catch(()=>{});
    if (E.f.status==='pending') { TAB = E.f.type; window.lastTab = TAB; }
  } else {
    clearTimeout(draftT);
    const snap = snapshot();
    if (isDirty(snap)) { await saveDraft(KEY, snap); toast('Contrôle gardé en brouillon : tu peux le reprendre'); }
    else { if (DRAFT && DRAFT.f.id === E.f.id) await clearDraft(); for (const id of E.added) await removePhoto(id); }
  }
  EDIT = null; sgHide(); $('#form').classList.add('hidden'); render();
  if (save && !E.isNew) openDetail(E.f);
}
$('#formSave').onclick = ()=>closeForm(true);
$('#formCancel').onclick = $('#formBack').onclick = ()=>closeForm(false);
$('#formDelete').onclick = async ()=>{
  if (!await ask('Supprimer cette fiche et ses photos ?', 'Supprimer')) return;
  for (const id of EDIT.added) await removePhoto(id);
  clearTimeout(draftT); if (DRAFT && DRAFT.f.id === EDIT.f.id) await clearDraft();
  await removeFiche(EDIT.f.id); EDIT=null; $('#form').classList.add('hidden'); render(); toast('Fiche supprimée');
};
const dateMask = e=>{
  const d = e.target.value.replace(/\D/g,'').slice(0,8);
  e.target.value = d.length>4 ? `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}` : d.length>2 ? `${d.slice(0,2)}/${d.slice(2)}` : d;
};
$('#f_dateNaissance').addEventListener('input', dateMask);
$('#f_docDate').addEventListener('input', dateMask);

/* Âge sous la date de naissance, alerte si mineur */
$('#f_dateNaissance').insertAdjacentHTML('afterend', `<div id="ageHint" style="margin-top:6px;font-size:14px"></div>`);
function syncAge(){
  const el = $('#ageHint'); if (!el) return;
  const a = ageOf({dateNaissance:$('#f_dateNaissance').value, dateHeure:$('#f_dateHeure').value});
  if (a === null) { el.innerHTML = ''; el.style.cssText = 'margin-top:6px;font-size:14px'; return; }
  if (a < 18) { el.innerHTML = `⚠️ <b>MINEUR</b> — ${a} an${a>1?'s':''}`; el.style.cssText = 'margin-top:8px;font-size:15px;padding:9px 12px;border-radius:10px;background:#f39c34;color:#111'; }
  else { el.textContent = `${a} ans`; el.style.cssText = 'margin-top:6px;font-size:14px;color:#9cc0ff'; }
}
['input','blur','change'].forEach(ev=>$('#f_dateNaissance').addEventListener(ev, ()=>setTimeout(syncAge)));
$('#f_dateHeure').addEventListener('change', syncAge);
/* Accident */
$('#accBlock .memo').insertAdjacentHTML('afterend', `<label class="f" for="f_kilometrage" style="margin-top:16px">Kilométrage du véhicule</label><input id="f_kilometrage" inputmode="numeric" placeholder="ex. 85 000" autocomplete="off">`);
$('#memoPhoto').insertAdjacentHTML('beforebegin', `<label class="mc"><input type="checkbox" id="f_memoGR"><span>Garanties de représentation</span></label>`);
$('label[for=f_sitFam]').insertAdjacentHTML('beforebegin', `<label class="f" for="f_employeur">Employeur</label><input id="f_employeur" autocomplete="off" spellcheck="false" placeholder="Nom de l'employeur">`);
$('#f_kilometrage').addEventListener('input', e=>{ const d = e.target.value.replace(/\D/g,'').slice(0,7); e.target.value = d ? (+d).toLocaleString('fr-FR').replace(/\s/g,' ') : ''; });
function syncAcc(){ $('#accBlock').classList.toggle('hidden', !$('#f_accident').checked); }
$('#f_accident').addEventListener('change', syncAcc);
$('#memoPhoto').onclick = ()=>$('#phInput').click();
function syncTaux(){ const el = $('#f_alcTaux'), c = tauxColor(el.value); el.style.color = c; el.style.borderColor = c; el.style.fontWeight = c ? '700' : ''; }
$('#f_alcTaux').addEventListener('input', syncTaux);

/* Sélecteurs CI/CIF et Sur dires/Officiel */
function setSeg(id, v){ document.querySelectorAll(`#${id} button`).forEach(b=>b.classList.toggle('on', b.dataset.v===v)); syncBlocks(); }
const segVal = id => document.querySelector(`#${id} button.on`)?.dataset.v;
function syncBlocks(){
  const isCI = segVal('typeSeg') === 'CI';
  $('#f_resultat').classList.toggle('hidden', isCI); document.querySelector('label[for=f_resultat]').textContent = isCI ? 'Vérification' : 'Résultat';
  $('#cifBlock').classList.toggle('hidden', segVal('typeSeg') !== 'CIF');
  $('#signaRow')?.classList.toggle('hidden', segVal('typeSeg') !== 'CIF');
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
      ? `<label class="f">Plaque</label><div class="platerow"><label class="pays"><span>${esc(v.pays||'F')}</span><small>▾</small><select data-k="pays" aria-label="Pays de la plaque">${paysOptions(v.pays||'F')}</select></label><input data-k="plaque" value="${esc(v.plaque||'')}" autocomplete="off" spellcheck="false" autocapitalize="characters"></div><div class="phint" data-k="hint" style="font-size:13px;color:#9cc0ff;margin-top:6px;min-height:0"></div>`
      : `<label class="f">${l}</label><input data-k="${k}" value="${esc(v[k]||'')}" autocomplete="off" spellcheck="false"${k==='marque'?' data-sg="brands"':''}${k==='couleur'?' data-sg="colors"':''}>`).join('')}
  </div>`).join('');
}
$('#addVeh').onclick = ()=>{ readVehicles(); EDIT.f.vehicules.push({type:'VL', pays:'F'}); renderVehicles(); $('#vehicles .veh:last-child').scrollIntoView({behavior:'smooth', block:'start'}); };
$('#vehicles').addEventListener('click', async e=>{
  const b = e.target.closest('[data-rmveh]'); if (!b) return;
  if (!await ask('Retirer ce véhicule ?', 'Retirer')) return;
  readVehicles(); EDIT.f.vehicules.splice(+b.dataset.rmveh, 1); renderVehicles();
});
$('#vehicles').addEventListener('change', e=>{
  if (e.target.dataset.k==='pays') { e.target.closest('.pays').querySelector('span').textContent = e.target.value; plateTidy(e.target.closest('.veh').querySelector('[data-k=plaque]')); }
  if (e.target.dataset.k==='plaque') plateTidy(e.target);
});
$('#vehicles').addEventListener('input', e=>{
  if (e.target.dataset.k!=='plaque') return;
  // Texte inséré d'un coup (« Scanner le texte » d'iOS, coller) : mise au format immédiate
  if (/^insert(FromPaste|ReplacementText|FromDrop)/.test(e.inputType||'') || (e.data && e.data.length > 1)) return plateTidy(e.target);
  const p=e.target.selectionStart; e.target.value=e.target.value.toUpperCase(); e.target.setSelectionRange(p,p); plateInherit(e.target);
});
/* Mise au format d'une plaque selon le pays (utile après un scan iOS) */
const TO_LETTER = {'0':'D','1':'I','2':'Z','5':'S','6':'G','8':'B'}, TO_DIGIT = {'O':'0','Q':'0','D':'0','I':'1','L':'1','Z':'2','S':'5','G':'6','B':'8','T':'7'};
const fixAt = (s, mask) => [...s].map((c,i)=> mask[i]==='L' ? (TO_LETTER[c]||c) : mask[i]==='9' ? (TO_DIGIT[c]||c) : c).join('');
function formatPlate(raw, pays){
  const up = String(raw||'').toUpperCase().replace(/[\r\n\t]+/g,' ');
  const c = up.replace(/[^A-Z0-9]/g,'');
  if (!c) return '';
  if (pays === 'MC') return (c.length > 4 && c.startsWith('MC') ? c.slice(2) : c).slice(0,4);
  if (pays === 'F') {
    let x = c;
    if (x.length >= 8 && /^F[A-Z0-9]{2}[A-Z0-9]{3}[A-Z0-9]{2}/.test(x) && !/^[A-Z]{2}\d{3}[A-Z]{2}/.test(x)) x = x.slice(1);   // « F » de la bande bleue
    else if (x.length === 8 && x[0]==='F' && /^[A-Z]{2}\d{3}[A-Z]{2}$/.test(x.slice(1))) x = x.slice(1);
    const siv = x.slice(0,7);
    if (x.length >= 7 && x.length <= 10) { const f = fixAt(siv, 'LL999LL'); if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(f)) return `${f.slice(0,2)}-${f.slice(2,5)}-${f.slice(5)}`; }
    const fni = /^(\d{1,4})([A-Z]{1,3})(\d{2}|2A|2B|97\d)$/.exec(x);                                         // ancien format 123 ABC 06
    if (fni) return `${fni[1]} ${fni[2]} ${fni[3]}`;
    return x;
  }
  if (pays === 'I') {
    let x = c; if (x.length === 8 && x[0]==='I') x = x.slice(1);
    if (x.length === 7) { const f = fixAt(x, 'LL999LL'); if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(f)) return `${f.slice(0,2)} ${f.slice(2,5)} ${f.slice(5)}`; }
    return x;
  }
  return up.replace(/[^A-Z0-9 -]/g,'').replace(/\s+/g,' ').trim();
}
function plateTidy(inp){
  if (!inp) return;
  const pays = inp.closest('.veh').querySelector('[data-k=pays]').value, v = formatPlate(inp.value, pays);
  if (v !== inp.value) inp.value = v;
  plateInherit(inp);
}
/* Plaque déjà connue dans une ancienne fiche : on reprend le véhicule (champs vides uniquement) */
const normPlate = s => String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
function plateLookup(plate){
  const np = normPlate(plate); if (np.length < 4) return null;
  let best = null;
  for (const f of FICHES) { if (EDIT && f.id === EDIT.f.id) continue;
    for (const v of (f.vehicules||[])) if (normPlate(v.plaque) === np && (!best || (f.dateHeure||'') > (best.f.dateHeure||''))) best = {f, v}; }
  return best;
}
function plateInherit(inp){
  const box = inp.closest('.veh'), hint = box.querySelector('[data-k=hint]'), np = normPlate(inp.value);
  if (box.dataset.known === np) return;
  const m = plateLookup(inp.value);
  if (!m) { hint.textContent = ''; box.dataset.known = ''; return; }
  box.dataset.known = np; let n = 0;
  for (const k of ['marque','modele','couleur','proprio']) { const el = box.querySelector(`[data-k=${k}]`); if (!el.value.trim() && m.v[k]) { el.value = m.v[k]; n++; } }
  if (m.v.type) { const r = box.querySelector(`input[type=radio][value="${m.v.type}"]`); if (r) r.checked = true; }
  if (m.v.pays) { const s = box.querySelector('[data-k=pays]'); s.value = m.v.pays; s.closest('.pays').querySelector('span').textContent = m.v.pays; }
  hint.textContent = `↺ Véhicule déjà contrôlé le ${fmtDT(m.f.dateHeure)} (${ficheName(m.f)})` + (n ? ' — infos reprises' : '');
}
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
  renderPhotos(); draftSoon();
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
  const src = cifSource(f);
  add('', [['Date & heure',fmtDT(f.dateHeure)],['Résultat', src ? `${src.resultat} (hérité du CIF du ${fmtDT(src.dateHeure)})` : (f.type==='CIF' ? f.resultat : '')],['Vérification',f.verif?'VERIF':''],['Lieu du contrôle',f.lieuControle],['Coordonnées GPS',f.geo?`${f.geo.lat.toFixed(5)}, ${f.geo.lng.toFixed(5)}`:''],['Contrôlé(e) avec',groupMates(f).map(ficheName).join(', ')]]);
  const addVeh = () => (f.vehicules||[]).forEach((v,i)=>add(`Véhicule ${i+1}${v.type?` — ${v.type}`:''}`, VEH_FIELDS.map(([k,l])=>[l, k==='plaque' && v.plaque ? `${v.plaque} (${v.pays||'F'} — ${PAYS_NAME[v.pays||'F']||''})` : v[k]])));
  if (!cif) addVeh(); // CI : le véhicule passe en premier
  add('Identité', [['Nom',(f.nom||'').toUpperCase()],['Prénom',f.prenom],['Date de naissance',f.dateNaissance && (ageOf(f)!==null ? `${f.dateNaissance} (${ageOf(f)} ans${isMinor(f)?' — MINEUR':''})` : f.dateNaissance)],['Lieu de naissance',f.lieuNaissance],
    ['Nationalité',f.nationalite],['Profession',f.profession],['Adresse',f.adresse], ...(cif ? [['Téléphone',f.telephone],['Filiation',f.filiation],['Signalisation',signaLabel(f)]] : [])]);
  if (f.accident) add('Accident', [['Kilométrage du véhicule',kmTxt(f.kilometrage)],['Employeur',f.employeur],['Situation familiale',f.sitFam],['E-mail',f.email],['Nombre d\'enfants',f.nbEnfants],['Dont à charge',f.nbCharge],
    ...MEMO.map(([k,l])=>[l, k==='memoGR' ? (f[k]?'oui':'non') : f[k]?'photographié(e)':'non photographié(e)'])]);
  if (f.accident) add('Dépistages', [['Test alcool',[f.alcHeure && `à ${f.alcHeure}`, f.alcRes, taux(f.alcTaux)].filter(Boolean).join(' — ')],
    ['Test stupéfiants',[f.stupHeure && `à ${f.stupHeure}`, f.stupRes].filter(Boolean).join(' — ')]]);
  if (cif) add('Document', f.docMode === 'Sur dires' ? [['Identité établie','Sur dires']]
    : !(f.docType||f.docPays||f.docNumero||f.docDate||f.docLieu) ? [] : [['Identité établie','Pièce officielle'],['Type',docLabel(f)],['Numéro',f.docNumero],['Délivré le',f.docDate],['Délivré à / par',f.docLieu]]);
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
  if (choice === 'qr') { if (SEL) { SEL = null; render(); } return window.QRS?.show(list); }
  if (choice === 'mc') { const t = list.map(mcText).join('\n\n'); await shareOut({title:list.map(ficheSubject).join(' / '), text:t}, t); if (SEL) { SEL = null; render(); } return; }
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
const SG_LEARN_MAP = [['nationalite','nats'],['lieuNaissance','villes'],['lieuControle','lieux'],['profession','prof'],['docType','docAbbr'],['docLieu','docLieu'],['motif','motifs']];
let LEARN = {};
const norm = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
function sgList(key){ const seen=new Set(), out=[]; for (const v of [...(LEARN[key]||[]), ...(SG_BASE[key]||[])]) { const n=norm(v); if (n && !seen.has(n)) { seen.add(n); out.push(v); } } return out; }
function learnFrom(f){
  let changed = false;
  const add = (key, val) => { val=(val||'').trim(); if (!val || val.length<2 || (key==='docAbbr' && DOC_ABBR[val])) return; if (sgList(key).some(x=>norm(x)===norm(val))) return; (LEARN[key] ||= []).unshift(val); LEARN[key]=LEARN[key].slice(0,300); changed = true; };
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
(()=>{ const h = [...document.querySelectorAll('#settings h3')].find(x=>x.textContent==='Sécurité'); h.insertAdjacentHTML('beforebegin', `<h3>Contrôles groupés</h3>
    <label class="f" for="s_group">Relier les contrôles effectués à moins de</label>
    <select id="s_group"><option value="5">5 minutes d'écart</option><option value="10">10 minutes d'écart</option><option value="15">15 minutes d'écart</option><option value="20">20 minutes d'écart</option><option value="0">Ne pas relier</option></select>`); })();
$('#btnSettings').onclick = async ()=>{
  $('#s_purge').value = String(SETTINGS.purgeDays); $('#s_group').value = String(SETTINGS.groupMin); $('#s_backup').value = String(SETTINGS.backupDays); syncBackupInfo(); $('#s_lock').value = String(SETTINGS.lockMinutes);
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
$('#s_group').onchange = async e=>{ SETTINGS.groupMin = +e.target.value; await dbPut('meta', SETTINGS, 'settings'); render(); };
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
  if (DRAFT) await saveDraft(KEY, DRAFT);
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
async function doBackup(){
  const auth = await dbGet('meta','auth');
  const pack = r => ({id:r.id, iv:b64(r.iv), data:b64(r.data)});
  const obj = {app:'renseignement', v:1, date:new Date().toISOString(), salt:b64(auth.salt),
    verifier:{iv:b64(auth.verifier.iv), data:b64(auth.verifier.data)},
    fiches:(await dbAll('fiches')).map(pack), photos:(await dbAll('photos')).map(pack)};
  const lrec = await dbGet('meta','learn'); if (lrec) obj.learn = {iv:b64(lrec.iv), data:b64(lrec.data)};
  const name = `sauvegarde-CIF2.0-${new Date().toISOString().slice(0,10)}.json`;
  const file = new File([JSON.stringify(obj)], name, {type:'application/json'});
  if (navigator.canShare && navigator.canShare({files:[file]})) {
    try { await navigator.share({files:[file]}); } catch (e) { if (e.name!=='AbortError') toast('Export impossible'); return; }
  } else {
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
  }
  SETTINGS.lastBackup = Date.now(); await dbPut('meta', SETTINGS, 'settings');
  toast('Sauvegarde effectuée'); render(); syncBackupInfo();
}
$('#backupOut').onclick = doBackup;
/* Section « Outils » des réglages (l'outil ADR s'y ajoute) */
(()=>{ const h = [...document.querySelectorAll('#settings h3')].find(x=>x.textContent==='Application'); h.insertAdjacentHTML('beforebegin', `<h3>Outils</h3>`); })();
/* Rappel de sauvegarde périodique */
const backupDue = () => +SETTINGS.backupDays > 0 && FICHES.length > 0 && Date.now() - (+SETTINGS.lastBackup||0) > SETTINGS.backupDays*DAY;
function backupBanner(){
  if (!backupDue()) return '';
  const last = +SETTINGS.lastBackup ? `dernière il y a ${Math.floor((Date.now()-SETTINGS.lastBackup)/DAY)} j` : 'aucune pour l\'instant';
  return `<button type="button" id="bkDue" style="display:flex;align-items:center;gap:10px;width:calc(100% - 24px);margin:10px 12px 4px;padding:11px 14px;border:1px solid #2d4a7a;border-radius:12px;background:#1b2a42;color:#dce8ff;font-size:15px;text-align:left;position:relative;z-index:2"><span style="font-size:20px">💾</span><span style="flex:1"><b>Sauvegarde à faire</b><br><small style="color:#9db4d8">${last} · toucher pour l'enregistrer dans Fichiers</small></span></button>`;
}
$('#list').addEventListener('click', e=>{ if (e.target.closest('#bkDue')) doBackup(); });
function syncBackupInfo(){
  const el = $('#bkInfo'); if (!el) return;
  el.textContent = +SETTINGS.lastBackup ? `Dernière sauvegarde : ${fmtDT(new Date(SETTINGS.lastBackup).toISOString())}` : 'Aucune sauvegarde effectuée pour l\'instant.';
}
(()=>{ const h = [...document.querySelectorAll('#settings h3')].find(x=>x.textContent==='Zone sensible'); h.insertAdjacentHTML('beforebegin', `<label class="f" for="s_backup">Rappel de sauvegarde</label>
    <select id="s_backup"><option value="3">Tous les 3 jours</option><option value="5">Tous les 5 jours</option><option value="7">Tous les 7 jours</option><option value="14">Tous les 14 jours</option><option value="0">Pas de rappel</option></select>
    <p class="hint" id="bkInfo"></p>
    <p class="hint">À l'échéance, un bandeau apparaît en haut de la liste : un tap prépare la sauvegarde chiffrée, puis choisis « Enregistrer dans Fichiers ».</p>`); })();
$('#s_backup').onchange = async e=>{ SETTINGS.backupDays = +e.target.value; await dbPut('meta', SETTINGS, 'settings'); render(); };
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

/* ---------- Filtre de la liste par type (VL, 2RM…) ---------- */
const VF_TYPES = ['VL','2RM','Camion','Vélo','Piéton','Autre'];
$('#searchbar').insertAdjacentHTML('afterend', `<div id="vfBar" style="display:flex;align-items:center;gap:8px;padding:8px 12px 2px;position:relative;z-index:2">
  <label id="vfPill" style="position:relative;display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:18px;border:1px solid var(--line);background:var(--panel);font-size:14px;color:var(--muted)">
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/></svg>
    <span id="vfLbl">Tous</span><small>▾</small>
    <select id="vfSel" aria-label="Filtrer par type" style="position:absolute;inset:0;opacity:0;width:100%;height:100%"></select>
  </label>
  <button type="button" id="vfClear" class="hidden" style="border:0;background:none;color:#7fb3ff;font-size:14px;padding:6px">Effacer</button></div>`);
function syncVFilter(items){
  const n = t => items.filter(f=>vehTypes(f).includes(t)).length;
  $('#vfSel').innerHTML = `<option value="">Tous (${items.length})</option>` + VF_TYPES.map(t=>`<option value="${t}" ${t===VFILTER?'selected':''}>${t} (${n(t)})</option>`).join('');
  $('#vfSel').value = VFILTER;
  $('#vfLbl').textContent = VFILTER || 'Tous';
  const on = !!VFILTER; $('#vfPill').style.color = on ? '#111' : ''; $('#vfPill').style.background = on ? '#fff' : ''; $('#vfClear').classList.toggle('hidden', !on);
}
$('#vfSel').onchange = e=>{ VFILTER = e.target.value; render(); window.scrollTo(0,0); };
$('#vfClear').onclick = ()=>{ VFILTER = ''; render(); };
$('#list').addEventListener('click', e=>{ if (e.target.id==='vfReset') { e.preventDefault(); VFILTER = ''; render(); } });

/* ---------- Pièce d'identité : type abrégé + pays sur la même ligne ---------- */
SG_BASE.docAbbr = DOC_TYPES.map(([a,n])=>`${a} — ${n}`);
(()=>{
  const inp = $('#f_docType'); inp.dataset.sg = 'docAbbr'; inp.placeholder = 'CNI, PS, PC, CS, TS…'; inp.autocapitalize = 'characters';
  const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;align-items:stretch';
  inp.replaceWith(row); row.appendChild(inp); inp.style.flex = '1'; inp.style.minWidth = '0';
  row.insertAdjacentHTML('beforeend', `<label id="docPaysBox" style="position:relative;flex:0 0 86px;display:flex;align-items:center;justify-content:center;gap:4px;border:1px solid var(--line);border-radius:10px;background:var(--panel);font-weight:700;font-size:16px">
    <span id="docPaysLbl">Pays</span><small style="font-size:10px;opacity:.7">▾</small>
    <select id="f_docPays" aria-label="Pays de délivrance" style="position:absolute;inset:0;opacity:0;width:100%;height:100%">${docPaysOptions('')}</select></label>`);
  $('label[for=f_docType]').textContent = 'Type de document et pays';
})();
function syncDocPays(){ const v = $('#f_docPays').value; $('#docPaysLbl').textContent = v || 'Pays'; $('#docPaysLbl').style.color = v ? '' : 'var(--muted)'; }
$('#f_docPays').addEventListener('change', syncDocPays);
function guessPays(){ const n = norm($('#f_nationalite').value); const m = NAT_ISO.find(([k])=>n.startsWith(k)); return m ? m[1] : 'FR'; }
function normDocType(){
  const el = $('#f_docType'), v = el.value.trim(); if (!v) return;
  let abbr = /^([A-Z]{2,3}) — /.exec(v)?.[1];
  if (!abbr) { const nv = norm(v); abbr = DOC_TYPES.find(([a,n])=>norm(a)===nv || norm(n)===nv)?.[0]; }
  if (abbr) { el.value = abbr; if (!$('#f_docPays').value) { $('#f_docPays').value = guessPays(); syncDocPays(); } }
}
$('#f_docType').addEventListener('change', normDocType);
$('#f_docType').addEventListener('blur', ()=>setTimeout(normDocType, 250));

/* ---------- VERIF (à côté du résultat) et SIGNA (tout en bas, après les observations, CIF seulement) ---------- */
(()=>{
  const sel = $('#f_resultat'), row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;align-items:stretch';
  sel.replaceWith(row); row.appendChild(sel); sel.style.flex = '1'; sel.style.minWidth = '0';
  row.insertAdjacentHTML('beforeend', `<button type="button" id="f_verif" aria-pressed="false" style="flex:0 0 96px;border-radius:10px;font-weight:800;letter-spacing:.05em;font-size:15px">VERIF</button>`);
  $('#f_observations').insertAdjacentHTML('afterend', `<div id="signaRow" style="display:flex;align-items:center;gap:12px;margin-top:18px">
    <label class="switch" style="flex:1;margin:0"><input type="checkbox" id="f_signa"><span class="sw"></span><span class="swl">SIGNA</span></label>
    <select id="f_signaAn" aria-label="Année de signalisation" style="flex:0 0 120px">${'<option value="">Année</option>' + Array.from({length:new Date().getFullYear()-1969}, (_,i)=>new Date().getFullYear()-i).map(y=>`<option>${y}</option>`).join('')}</select></div>`);
})();
function syncExtra(){
  const on = !!EDIT?.f.verif, b = $('#f_verif');
  b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
  b.style.cssText = 'flex:0 0 96px;border-radius:10px;font-weight:800;letter-spacing:.05em;font-size:15px;' + (on ? 'background:#b3261e;color:#fff;border:1px solid #b3261e' : 'background:transparent;color:#9a9a9a;border:1px dashed #666');
  $('#f_signa').checked = !!EDIT?.f.signa; $('#f_signaAn').value = EDIT?.f.signaAn || ''; syncSigna(); syncMotif(); syncAge();
}
function syncSigna(){ const on = $('#f_signa').checked; $('#f_signaAn').disabled = !on; $('#f_signaAn').style.opacity = on ? '1' : '.4'; }
$('#f_verif').onclick = ()=>{ if (!EDIT) return; EDIT.f.verif = !EDIT.f.verif; syncExtra(); };
$('#f_signa').addEventListener('change', ()=>{ syncSigna(); if ($('#f_signa').checked && !$('#f_signaAn').value) $('#f_signaAn').value = String(new Date().getFullYear()); });

/* ---------- Lieu du contrôle : géolocalisation ----------
   Le GPS reste sur le téléphone. En mode « adresse », seules les coordonnées sont envoyées
   à OpenStreetMap (Nominatim) pour obtenir le nom de la rue : aucune donnée de fiche. */
(()=>{
  const inp = $('#f_lieuControle'), row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;align-items:stretch';
  inp.replaceWith(row); row.appendChild(inp); inp.style.flex = '1'; inp.style.minWidth = '0';
  row.insertAdjacentHTML('beforeend', `<button type="button" id="geoBtn" aria-label="Me localiser" style="flex:0 0 52px;border-radius:10px;border:1px solid var(--line);background:var(--panel);color:#7fb3ff;display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7.5"/></svg></button>`);
  row.insertAdjacentHTML('afterend', `<div id="geoHint" style="font-size:13px;color:#9cc0ff;margin-top:6px"></div>`);
  const h = [...document.querySelectorAll('#settings h3')].find(x=>x.textContent==='Sécurité');
  h.insertAdjacentHTML('beforebegin', `<h3>Localisation</h3>
    <label class="f" for="s_geo">À la création d'une fiche</label>
    <select id="s_geo"><option value="addr">Remplir le lieu avec l'adresse</option><option value="gps">Coordonnées GPS seules (hors ligne)</option><option value="off">Ne pas localiser automatiquement</option></select>
    <p class="hint">« Adresse » envoie uniquement la position (pas la fiche) à OpenStreetMap pour trouver le nom de la rue. Le bouton de localisation du formulaire reste toujours disponible.</p>`);
})();
$('#s_geo').onchange = async e=>{ SETTINGS.geoMode = e.target.value; await dbPut('meta', SETTINGS, 'settings'); };
$('#btnSettings').addEventListener('click', ()=>{ $('#s_geo').value = SETTINGS.geoMode || 'addr'; });
async function reverseGeo(lat, lng){
  const ctl = new AbortController(), t = setTimeout(()=>ctl.abort(), 7000);
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=fr`, {signal:ctl.signal});
    if (!r.ok) return '';
    const a = (await r.json()).address || {};
    const street = [a.house_number, a.road || a.pedestrian || a.footway || a.square || a.place].filter(Boolean).join(' ');
    const area = a.suburb || a.quarter || a.neighbourhood || a.city_district || '';
    const city = a.city || a.town || a.village || a.municipality || '';
    return [street, area, city].filter((x,i,arr)=>x && arr.indexOf(x)===i).join(', ');
  } catch { return ''; } finally { clearTimeout(t); }
}
let geoBusy = false;
async function geoFill(auto){
  if (!EDIT || geoBusy) return;
  if (!navigator.geolocation) { if (!auto) toast('Localisation indisponible sur cet appareil'); return; }
  const id = EDIT.f.id, hint = $('#geoHint'); geoBusy = true; hint.textContent = '📍 Localisation en cours…';
  try {
    const pos = await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res, rej, {enableHighAccuracy:true, timeout:15000, maximumAge:60000}));
    if (!EDIT || EDIT.f.id !== id) return;
    const lat = +pos.coords.latitude.toFixed(6), lng = +pos.coords.longitude.toFixed(6);
    EDIT.f.geo = {lat, lng, acc:Math.round(pos.coords.accuracy||0)};
    let label = SETTINGS.geoMode === 'gps' ? '' : await reverseGeo(lat, lng);
    if (!EDIT || EDIT.f.id !== id) return;
    const inp = $('#f_lieuControle');
    if (!inp.value.trim() || !auto) inp.value = label || `GPS ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    hint.textContent = `📍 Position enregistrée (précision ± ${EDIT.f.geo.acc} m)` + (label || SETTINGS.geoMode === 'gps' ? '' : ' — adresse introuvable, coordonnées notées');
  } catch (e) {
    hint.textContent = e && e.code === 1 ? '📍 Localisation refusée : autorise-la dans Réglages iPhone › Confidentialité › Service de localisation › Safari' : (auto ? '' : '📍 Position introuvable, réessaie');
  } finally { geoBusy = false; }
}
$('#geoBtn').onclick = ()=>geoFill(false);

/* ---------- Envoi au format « main courante » ---------- */
const MC_RES = {
  'NDN':'non défavorablement noté à notre fichier central et inconnu au fichier Interpol 24/7',
  'Oméga':'inconnu à notre fichier central et inconnu au fichier Interpol 24/7',
  'CDPA':'défavorablement noté à notre fichier central et inconnu au fichier Interpol 24/7',
  'CDPU':'défavorablement noté à notre fichier central et inconnu au fichier Interpol 24/7',
  'CDPJ':'défavorablement noté à notre fichier central et inconnu au fichier Interpol 24/7'
};
const MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const fullYear = y => y.length === 4 ? y : String((+y > new Date().getFullYear() % 100 ? 1900 : 2000) + +y);
const dateLettres = d => { const m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})$/.exec(String(d||'').trim()); if (!m || +m[2] < 1 || +m[2] > 12) return d; return `${+m[1] === 1 ? '1er' : +m[1]} ${MOIS[+m[2]-1]} ${fullYear(m[3])}`; };
/* Date de naissance saisie avec une année sur 2 chiffres (12/06/80) : complétée en 12/06/1980 */
$('#f_dateNaissance').addEventListener('blur', e=>{ const m = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(e.target.value.trim()); if (m) e.target.value = `${m[1]}/${m[2]}/${fullYear(m[3])}`; });
/* Pièce d'identité en toutes lettres : « sa carte nationale d'identité française » */
const DOC_FULL = {CNI:['carte nationale d\'identité','f'], PS:['passeport','m'], PC:['permis de conduire','m'], CS:['carte de séjour','f'], TS:['titre de séjour','m']};
const PAYS_ADJ = {FR:'français',MC:'monégasque',IT:'italien',DE:'allemand',CH:'suisse',BE:'belge',NL:'néerlandais',LU:'luxembourgeois',GB:'britannique',ES:'espagnol',PT:'portugais',ZA:'sud-africain',AL:'albanais',DZ:'algérien',AD:'andorran',SA:'saoudien',AR:'argentin',AM:'arménien',AU:'australien',AT:'autrichien',AZ:'azerbaïdjanais',BY:'biélorusse',BA:'bosnien',BR:'brésilien',BG:'bulgare',CM:'camerounais',CA:'canadien',CN:'chinois',CY:'chypriote',CO:'colombien',CI:'ivoirien',HR:'croate',DK:'danois',EG:'égyptien',AE:'émirien',EE:'estonien',US:'américain',FI:'finlandais',GE:'géorgien',GR:'grec',HU:'hongrois',IN:'indien',IE:'irlandais',IS:'islandais',IL:'israélien',JP:'japonais',XK:'kosovar',LV:'letton',LB:'libanais',LI:'liechtensteinois',LT:'lituanien',MK:'macédonien',ML:'malien',MT:'maltais',MA:'marocain',MX:'mexicain',MD:'moldave',ME:'monténégrin',NO:'norvégien',PL:'polonais',QA:'qatarien',RO:'roumain',RU:'russe',SM:'saint-marinais',SN:'sénégalais',RS:'serbe',SK:'slovaque',SI:'slovène',SE:'suédois',CZ:'tchèque',TN:'tunisien',TR:'turc',UA:'ukrainien',VA:'du Vatican'};
const adjFem = a => a==='grec' ? 'grecque' : a==='turc' ? 'turque' : /e$|^du /.test(a) ? a : /(ien|en)$/.test(a) ? a+'ne' : a+'e';
function docPhrase(f){
  const d = DOC_FULL[(f.docType||'').toUpperCase()];
  if (!d) return { txt: docLabel(f) || 'pièce d\'identité', fem: true, art: '' };
  const fem = d[1] === 'f', adj = PAYS_ADJ[f.docPays];
  return { txt: d[0] + (adj ? ' ' + (fem ? adjFem(adj) : adj) : f.docPays && f.docPays !== '??' ? ` (${f.docPays})` : ''), fem, art: fem ? 'sa ' : 'son ' };
}
/* « pref 06 », « préf. 84 » : nom complet de la préfecture d'après le n° de département */
const DEPTS = {'01':"de l'Ain",'02':"de l'Aisne",'03':"de l'Allier",'04':"des Alpes-de-Haute-Provence",'05':"des Hautes-Alpes",'06':"des Alpes-Maritimes",'07':"de l'Ardèche",'08':"des Ardennes",'09':"de l'Ariège",'10':"de l'Aube",'11':"de l'Aude",'12':"de l'Aveyron",'13':"des Bouches-du-Rhône",'14':"du Calvados",'15':"du Cantal",'16':"de la Charente",'17':"de la Charente-Maritime",'18':"du Cher",'19':"de la Corrèze",'2A':"de la Corse-du-Sud",'2B':"de la Haute-Corse",'21':"de la Côte-d'Or",'22':"des Côtes-d'Armor",'23':"de la Creuse",'24':"de la Dordogne",'25':"du Doubs",'26':"de la Drôme",'27':"de l'Eure",'28':"d'Eure-et-Loir",'29':"du Finistère",'30':"du Gard",'31':"de la Haute-Garonne",'32':"du Gers",'33':"de la Gironde",'34':"de l'Hérault",'35':"d'Ille-et-Vilaine",'36':"de l'Indre",'37':"d'Indre-et-Loire",'38':"de l'Isère",'39':"du Jura",'40':"des Landes",'41':"de Loir-et-Cher",'42':"de la Loire",'43':"de la Haute-Loire",'44':"de la Loire-Atlantique",'45':"du Loiret",'46':"du Lot",'47':"de Lot-et-Garonne",'48':"de la Lozère",'49':"de Maine-et-Loire",'50':"de la Manche",'51':"de la Marne",'52':"de la Haute-Marne",'53':"de la Mayenne",'54':"de Meurthe-et-Moselle",'55':"de la Meuse",'56':"du Morbihan",'57':"de la Moselle",'58':"de la Nièvre",'59':"du Nord",'60':"de l'Oise",'61':"de l'Orne",'62':"du Pas-de-Calais",'63':"du Puy-de-Dôme",'64':"des Pyrénées-Atlantiques",'65':"des Hautes-Pyrénées",'66':"des Pyrénées-Orientales",'67':"du Bas-Rhin",'68':"du Haut-Rhin",'69':"du Rhône",'70':"de la Haute-Saône",'71':"de Saône-et-Loire",'72':"de la Sarthe",'73':"de la Savoie",'74':"de la Haute-Savoie",'75':"de police de Paris",'76':"de la Seine-Maritime",'77':"de Seine-et-Marne",'78':"des Yvelines",'79':"des Deux-Sèvres",'80':"de la Somme",'81':"du Tarn",'82':"de Tarn-et-Garonne",'83':"du Var",'84':"de Vaucluse",'85':"de la Vendée",'86':"de la Vienne",'87':"de la Haute-Vienne",'88':"des Vosges",'89':"de l'Yonne",'90':"du Territoire de Belfort",'91':"de l'Essonne",'92':"des Hauts-de-Seine",'93':"de la Seine-Saint-Denis",'94':"du Val-de-Marne",'95':"du Val-d'Oise",'971':"de la Guadeloupe",'972':"de la Martinique",'973':"de la Guyane",'974':"de La Réunion",'976':"de Mayotte"};
function prefLieu(t){
  const m = /^pr[ée]f(?:ecture|\.)?\s*(?:de\s*|du\s*)?(\d{1,3}|2[ab])$/i.exec(String(t||'').trim());
  const d = m && DEPTS[m[1].toUpperCase().replace(/^(\d)$/, '0$1')];
  return d ? `la préfecture ${d}` : null;
}
/* « FR », « Italie », « MCO », « UK »… : « par les autorités françaises / italiennes », Monaco : « par nos autorités » */
const PAYS_ALIAS = {M:'MC',MCO:'MC',MON:'MC',UK:'GB',GBR:'GB',ANGLETERRE:'GB',F:'FR',FRA:'FR',I:'IT',ITA:'IT',D:'DE',DEU:'DE',ALL:'DE',CHE:'CH',SUI:'CH',BEL:'BE',ESP:'ES',PRT:'PT',POR:'PT',NLD:'NL',LUX:'LU',USA:'US',ROU:'RO',POL:'PL',MAR:'MA',DZA:'DZ',ALG:'DZ',TUN:'TN',AUT:'AT',GRC:'GR',RUS:'RU',UKR:'UA',TUR:'TR',CHN:'CN',SEN:'SN'};
function paysLieu(t){
  const raw = norm(t).replace(/^(par\s+)?(les\s+|nos\s+)?(autorites\s+)?/, '').replace(/^(de\s+la\s+|de\s+l'|du\s+|des\s+|de\s+)/, '').trim();
  if (!raw) return null;
  const up = raw.toUpperCase().replace(/[^A-Z]/g,'');
  let code = PAYS_ALIAS[up] || (up.length === 2 && PAYS_ADJ[up] ? up : null);
  if (!code) { const hit = [...DOC_PAYS_TOP, ...DOC_PAYS_ALL].find(([c,n]) => norm(n) === raw); code = hit?.[0] || (/^principaute de monaco$/.test(raw) ? 'MC' : /^royaume.uni$/.test(raw) ? 'GB' : null); }
  if (!code) return null;
  if (code === 'MC') return 'par nos autorités';
  const adj = PAYS_ADJ[code]; if (!adj) return null;
  return 'par les autorités ' + (/^du /.test(adj) ? adj : adjFem(adj) + 's');
}
function lieuPhrase(t){ const p = prefLieu(t); if (p) return 'par ' + p; const q = paysLieu(t); if (q) return q; if (/^(les |nos )?autorit/i.test(t)) return 'par ' + (/^(les|nos) /i.test(t) ? t : 'les ' + t); if (/^((sous-)?pr[ée]fecture|mairie|ambassade)\b/i.test(t)) return "par la " + t[0].toLowerCase() + t.slice(1); if (/^consulat\b/i.test(t)) return 'par le c' + t.slice(1); return /^(par|à|a)\s/i.test(t) ? t : 'par ' + t; }
const isMonacoAddr = a => /monaco|monte[\s-]?carlo|98000|fontvieille|condamine|larvotto|moneghetti|saint[\s-]roman|jardin[\s-]exotique|port[\s-]hercule/i.test(a||'');
function mcText(f){
  const nom = (f.nom||'').toUpperCase(), cif = f.type === 'CIF';
  const parts = [[nom, f.prenom].filter(Boolean).join(' ') || 'Individu non identifié'];
  if (f.dateNaissance || f.lieuNaissance) parts.push('né(e)' + (f.dateNaissance ? ` le ${dateLettres(f.dateNaissance)}` : '') + (f.lieuNaissance ? ` à ${f.lieuNaissance}` : ''));
  if (cif && f.filiation) parts.push(f.filiation);
  if (f.nationalite) parts.push(`de nationalité ${f.nationalite.toLowerCase()}`);
  if (f.profession) parts.push(/^[A-ZÀ-Ý][a-zà-ÿ]/.test(f.profession) ? f.profession[0].toLowerCase() + f.profession.slice(1) : f.profession);
  if (f.adresse) parts.push(`${isMonacoAddr(f.adresse) ? 'résidant' : 'demeurant'} ${f.adresse}`);
  let txt = parts.join(', ') + '.';
  if (cif && f.telephone) txt += ` Joignable au ${f.telephone}.`;
  if (cif && f.docMode !== 'Sur dires' && (f.docType || f.docNumero)) { const dp = docPhrase(f); txt += `\n\nIdentité relevée sur ${dp.art}${dp.txt}` + (f.docNumero ? ` nº ${f.docNumero}` : '') + (f.docDate || f.docLieu ? (dp.art ? (dp.fem ? ' délivrée' : ' délivré') : ' délivré(e)') : '') + (f.docDate ? ` le ${f.docDate}` : '') + (f.docLieu ? ` ${lieuPhrase(f.docLieu)}` : '') + '.'; }
  const r = effRes(f); if (MC_RES[r]) txt += `\n\n${MC_RES[r][0].toUpperCase()}${MC_RES[r].slice(1)}.`;
  return txt;
}
(()=>{ const c = document.querySelector('#shareSheet [data-sh=cancel]'); if (c) c.insertAdjacentHTML('beforebegin', `<button data-sh="mc"><b>Format main courante</b><small>Texte rédigé, prêt à coller ou à envoyer</small></button>`); })();

/* ---------- Motif : choix rapides (liste à compléter ici) ---------- */
const MOTIFS = ['Trouvaille','Contrôle routier','Infraction','Accident du travail','AVP corporel','AVP matériel','AVP avec refus','Autre'];
SG_BASE.motifs = MOTIFS.filter(m=>m!=='Autre');
(()=>{
  const inp = $('#f_motif'); inp.dataset.sg = 'motifs'; inp.placeholder = 'Choisis ci-dessous ou écris';
  inp.insertAdjacentHTML('afterend', `<div id="motifChips" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">${MOTIFS.map(m=>`<button type="button" data-motif="${esc(m)}" style="border:1px solid var(--line);background:var(--panel);color:inherit;border-radius:16px;padding:7px 12px;font-size:14px">${esc(m)}</button>`).join('')}</div>`);
})();
function syncMotif(){
  const v = norm($('#f_motif').value);
  document.querySelectorAll('#motifChips [data-motif]').forEach(b=>{ const on = v && norm(b.dataset.motif) === v; b.style.background = on ? '#fff' : 'var(--panel)'; b.style.color = on ? '#111' : 'inherit'; b.style.fontWeight = on ? '700' : ''; });
}
$('#motifChips').addEventListener('click', e=>{
  const b = e.target.closest('[data-motif]'); if (!b) return;
  const inp = $('#f_motif');
  if (b.dataset.motif === 'Autre') { inp.value = ''; inp.placeholder = 'Préciser le motif…'; inp.focus(); }
  else { inp.value = norm(inp.value) === norm(b.dataset.motif) ? '' : b.dataset.motif; inp.placeholder = 'Choisis ci-dessous ou écris'; }
  syncMotif();
});
$('#f_motif').addEventListener('input', syncMotif);
$('#f_motif').addEventListener('change', syncMotif);

/* ---------- Brouillon : reprendre un contrôle fermé sans enregistrer ----------
   Le formulaire en cours est copié (chiffré) toutes les secondes de saisie, à la sortie de l'appli
   et au verrouillage. Il disparaît dès que la fiche est enregistrée ou que tu l'ignores. */
let DRAFT = null, draftT = null;
function snapshot(){
  const f = structuredClone(EDIT.f);
  for (const k of FIELDS) f[k] = $('#f_'+k).value.trim();
  f.type = segVal('typeSeg'); f.docMode = segVal('docSeg');
  f.accident = $('#f_accident').checked; for (const [k] of MEMO) f[k] = $('#f_'+k).checked;
  f.verif = $('#f_verif').classList.contains('on'); f.signa = $('#f_signa').checked; f.signaAn = f.signa ? $('#f_signaAn').value : '';
  readVehicles(); f.vehicules = structuredClone(EDIT.f.vehicules);
  return {f, isNew:EDIT.isNew, added:[...EDIT.added], removed:[...EDIT.removed], at:Date.now()};
}
const draftKey = f => JSON.stringify([FIELDS.filter(k=>k!=='dateHeure').map(k=>f[k]||''), f.type, f.accident||false, MEMO.map(([k])=>!!f[k]), !!f.verif, !!f.signa, f.signaAn||'', (f.vehicules||[]).map(v=>[v.type||'',v.pays||'',...VEH_FIELDS.map(([k])=>v[k]||'')]), f.photos||[]]);
function isDirty(snap){
  const f = snap.f;
  if (snap.isNew) return FIELDS.some(k=>k!=='dateHeure' && k!=='lieuControle' && f[k]) || (f.photos||[]).length > 0 || (f.vehicules||[]).some(v=>VEH_FIELDS.some(([k])=>v[k])) || !!f.accident || !!f.verif || !!f.signa;
  const orig = FICHES.find(x=>x.id===f.id); return !orig || draftKey(orig) !== draftKey(f);
}
async function saveDraft(key, snap){
  try { if (!isDirty(snap)) return; const r = await encJSON(key, snap); await dbPut('meta', {iv:r.iv, data:r.data}, 'draft'); if (key === KEY) DRAFT = snap; } catch {}
}
function draftSoon(){ clearTimeout(draftT); draftT = setTimeout(()=>{ if (EDIT && KEY) saveDraft(KEY, snapshot()); }, 800); }
async function loadDraft(){ DRAFT = null; const r = await dbGet('meta','draft').catch(()=>null); if (r) try { DRAFT = await decJSON(KEY, r); } catch { await dbDel('meta','draft').catch(()=>{}); } }
async function clearDraft(){ DRAFT = null; await dbDel('meta','draft').catch(()=>{}); }
async function discardDraft(){
  const d = DRAFT; if (!d) return;
  const used = new Set(FICHES.flatMap(f=>f.photos||[]));
  for (const id of (d.added||[])) if (!used.has(id)) await removePhoto(id);
  await clearDraft();
}
function resumeDraft(){
  const d = DRAFT; if (!d) return;
  if (!d.isNew && !FICHES.some(x=>x.id===d.f.id)) d.isNew = true;
  closeDetail(); openForm(null, d);
}
function draftBanner(){
  if (!DRAFT || EDIT) return '';
  const mins = Math.max(0, Math.round((Date.now() - DRAFT.at)/6e4));
  const ago = mins < 1 ? 'à l\'instant' : mins < 60 ? `il y a ${mins} min` : mins < 1440 ? `il y a ${Math.round(mins/60)} h` : `le ${fmtD(DRAFT.at)}`;
  return `<div id="drDue" style="display:flex;align-items:center;gap:10px;margin:10px 12px 4px;padding:11px 14px;border:1px solid #7a5a1c;border-radius:12px;background:#33270f;color:#ffe2a8;font-size:15px;position:relative;z-index:2">
    <span style="font-size:20px">↺</span>
    <button type="button" id="drResume" style="flex:1;border:0;background:none;color:inherit;text-align:left;padding:0;font-size:15px"><b>Reprendre le contrôle précédent</b><br><small style="color:#d9bf86">${esc(ficheName(DRAFT.f))} · ${esc(DRAFT.f.type||'CI')} · non enregistré · ${ago}</small></button>
    <button type="button" id="drDrop" style="border:0;background:none;color:#d9bf86;font-size:14px;padding:6px">Ignorer</button></div>`;
}
$('#list').addEventListener('click', async e=>{
  if (e.target.closest('#drResume')) return resumeDraft();
  if (e.target.closest('#drDrop')) { if (await ask('Supprimer ce contrôle non enregistré ?', 'Supprimer', true)) { await discardDraft(); render(); toast('Brouillon supprimé'); } }
});
['input','change','click'].forEach(ev=>$('#form').addEventListener(ev, ()=>{ if (EDIT) draftSoon(); }));
document.addEventListener('visibilitychange', ()=>{ if (document.hidden && EDIT && KEY) { clearTimeout(draftT); saveDraft(KEY, snapshot()); } });

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
/* Outil Matières dangereuses (ADR) : module séparé */
(()=>{ const sc = document.createElement('script'); sc.src = 'adr.js?v=' + APP_VERSION; document.body.appendChild(sc); })();
/* Partage de fiches par QR code : module séparé */
(()=>{ const sc = document.createElement('script'); sc.src = 'share.js?v=' + APP_VERSION; document.body.appendChild(sc); })();
/* Ancien module de lecture de plaque (retiré en 3.5) : on libère son cache */
setTimeout(()=>{ if (db) dbDel('meta','ocrlib').catch(()=>{}); }, 3000);
