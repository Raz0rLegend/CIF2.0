'use strict';
/* CIF 2.0 — logique de l'application */
let APP_VERSION = '1.0.8';
/* ---------- Utilitaires ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const te = new TextEncoder(), td = new TextDecoder();
const uid = () => Date.now().toString(36) + crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
const DAY = 864e5;
const RES_COLORS = {'NDN':'#3ccf4e','Oméga':'#b77cff','CDPA':'#ff5a52','CDPU':'#ff5a52','CDPJ':'#ff5a52','Non contrôlé':'#e3b341'};
const resColor = f => RES_COLORS[effRes(f)] || '#cfcfcf';
const vehTypes = f => { const t=[...new Set((f.vehicules||[]).map(v=>v.type||'Autre'))]; return t.length ? t : ['Piéton']; };
const vehIcons = f => vehTypes(f).map(t=>`<span class="vic" title="${esc(t)}">${VICON[t]||VICON.Autre}</span>`).join('');
const QUALITES = ['Piéton','Conducteur VL','Passager','2RM','PL','Autre'];
const FIELDS = ['dateHeure','sexe','nom','prenom','dateNaissance','lieuNaissance','nationalite','profession','adresse','telephone','resultat','filiation','docType','docPays','docNumero','docDate','docLieu','lieuControle','motif','observations','sitFam','email','nbEnfants','nbCharge','alcHeure','alcRes','alcTaux','stupHeure','stupRes','kilometrage','employeur','atCirconstances','atHauteur','atBlessures','ipmHeure','ipmAveu','ipmTemoins','ipmDerniere','adrRue','adrVille','adrPays'];
const AT_FIELDS = ['atCirconstances','atHauteur','atBlessures'];
const AT_EPI = [['atChaussures','Chaussures de sécurité','Chaussures'],['atGants','Gants de sécurité','Gants'],['atCasque','Casque','Casque'],['atPermis','Permis de travail','Permis de travail']];
const CEEA_BADGE = '<span class="badge acc" style="background:#1f5fa8;color:#fff">CEEA</span>';
const DEP_FIELDS = ['alcHeure','alcRes','alcTaux','stupHeure','stupRes'];
const IPM_FIELDS = ['ipmHeure','ipmAveu','ipmTemoins','ipmDerniere'];
/* Fiche « A » — examen de comportement : [clé, libellé, choix, choix unique ?, section] */
const IPM_GROUPS = [
  ['lieu','Lieu de l\'examen',['Sur les lieux des faits','Dans un local de service','Chez le médecin ou à l\'hôpital'],true,''],
  ['constitution','Constitution physique',['Corpulent','Mince','Moyen'],true,'Aspect général extérieur'],
  ['lesions','Lésions',['Indemne','Confusions','Blessures'],false,'Aspect général extérieur'],
  ['visage','Visage',['Normal','Congestionné','Pâle','En sueurs'],false,'Aspect général extérieur'],
  ['allure','Allure',['Bien éveillé','Somnolent','Abattu','Tremblant','Hoquets','Vomissements','Présence déjections','Vêtements désordonnés','Vêtements ordonnés'],false,'Aspect général extérieur'],
  ['attitude','Attitude',['Maître de soi','Énervé','Arrogant','Agressif'],false,'Aspects particuliers'],
  ['regard','Regard',['Normal','Anormal','Yeux voilés','Yeux brillants'],false,'Aspects particuliers'],
  ['haleine','Odeur de l\'haleine',['Sentant l\'alcool','Indéterminée'],true,'Aspects particuliers'],
  ['elocution','Élocution',['Normale','Pâteuse','Bégayante','Ne parle pas'],false,'Aspects particuliers'],
  ['explications','Explications',['Nettes','Embrouillées','Incohérentes','Répétitives','Ne parle pas'],false,'Aspects particuliers'],
  ['equilibre','Équilibre',['Tient debout','Titube'],true,'Aspects particuliers']
];
const IPM_BADGE = '<span class="badge acc" style="background:#0f766e;color:#fff">IPM</span>';
const ipmVal = (f,k) => (f.ipmSel?.[k]||[]).map(x=>x==='Contusions'?'Confusions':x).join(', ');
const AT_BADGE = '<span class="badge acc" style="background:#5a3a8c;color:#fff">Acc. travail</span>';
const epiTxt = (v, k) => k === 'atPermis' ? (v === 'oui' ? 'en règle' : v === 'non' ? 'non en règle' : '') : v === 'oui' ? 'porté(s)' : v === 'non' ? 'non porté(s)' : '';
const epiHTML = (v, k) => { const ok = k === 'atPermis' ? ['En règle','Non en règle'] : ['Porté','Non porté']; return v === 'oui' ? `<span style="color:#3ccf4e;font-weight:700">✓ ${ok[0]}</span>` : v === 'non' ? `<span style="color:#ff5a52;font-weight:700">✗ ${ok[1]}</span>` : ''; };
const hautTxt = h => { const v = String(h||'').trim().replace('.',','); return v ? (/m$/i.test(v) ? v : v + ' m') : ''; };
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
    return `${link}<article class="card${SEL&&SEL.has(f.id)?' sel':''}${effRes(f)==='Non contrôlé'?' nc':''}" data-id="${f.id}">
      ${SEL ? `<div class="chk">${SEL.has(f.id)?ICON.check:''}</div>` : ''}
      ${n ? `<img class="thumb" data-ph="${f.photos[0]}" alt="">` : ''}
      <div class="main">
        <div class="r1"><div class="name"><span class="badge ${f.type==='CIF'?'cif':''}">${esc(f.type||'CI')}</span>${f.accident?'<span class="badge acc">Accident</span>':''}${f.at?AT_BADGE:''}${f.ceea?CEEA_BADGE:''}${f.ipm?IPM_BADGE:''}${f.verif?VERIF_BADGE:''}${isMinor(f)?MINOR_BADGE:''}${f.nom||f.prenom ? esc(name) : name}</div><div class="date" style="color:${resColor(f)}">${effRes(f)?`<b>${esc(effRes(f))}</b> · `:''}${esc(fmtDT(f.dateHeure))}</div></div>
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
  const LONG = /Adresse|Observations|Filiation|Motif|taux|Circonstances|blessures/;
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
  $('#detTitle').innerHTML = `<span class="badge ${cif?'cif':''}">${esc(f.type||'CI')}</span>${f.accident?'<span class="badge acc">Accident</span>':''}${f.at?AT_BADGE:''}${f.ceea?CEEA_BADGE:''}${f.ipm?IPM_BADGE:''}${f.verif?VERIF_BADGE:''}${isMinor(f)?MINOR_BADGE:''}${f.status==='archived'?'Archivée':'En cours'}`;
  const nom = (f.nom||'').toUpperCase(), born = [f.dateNaissance && `Né(e) le ${f.dateNaissance}`, f.lieuNaissance && `à ${f.lieuNaissance}`].filter(Boolean).join(' ');
  const hero = `<div class="hero"><div class="hl">
      <div class="nm">${nom||f.prenom ? `${esc(nom)} <span>${esc(f.prenom||'')}</span>` : '<span style="color:var(--muted)">Sans identité</span>'}</div>
      <div class="chips2">
        ${!cif ? (src ? `<button type="button" class="chip" data-mate="${src.id}" style="background:${col}22;color:${col};border:1px solid ${col}66">${esc(src.resultat)} · hérité du CIF ›</button>` : '') : `<label class="chip" style="position:relative;${f.resultat ? `background:${col}22;color:${col};border:1px solid ${col}66` : 'border:1px dashed #666;color:#bdbdbd'}">${f.resultat ? esc(f.resultat) : 'Résultat'} ▾<select id="detRes" aria-label="Changer le résultat" style="position:absolute;inset:0;width:100%;height:100%;opacity:0;padding:0;border:0">${['','NDN','Oméga','CDPA','CDPU','CDPJ','Non contrôlé'].map(r=>`<option value="${r}" ${r===(f.resultat||'')?'selected':''}>${r||'—'}</option>`).join('')}</select></label>`}
        <button type="button" class="chip" id="detVerif" style="${f.verif ? 'background:#b3261e;color:#fff;border:1px solid #b3261e;font-weight:700' : 'border:1px dashed #666;color:#bdbdbd'}">VERIF</button>
        <span class="chip" style="color:${col}">${ICON_CLOCK}${esc(fmtDT(f.dateHeure))}</span>
        ${f.lieuControle ? (f.geo ? `<a class="chip" href="https://maps.apple.com/?ll=${f.geo.lat},${f.geo.lng}&q=${encodeURIComponent(f.lieuControle)}" style="text-decoration:none;color:inherit">${ICON_PIN}${esc(f.lieuControle)} ›</a>` : `<span class="chip">${ICON_PIN}${esc(f.lieuControle)}</span>`) : ''}
      </div>${mates.length ? `<div class="mates">${ICON_LINK}<span>Avec ${mates.map(m=>`<button type="button" data-mate="${m.id}">${esc(ficheName(m))}</button>`).join(', ')}</span></div>` : ''}</div><div class="vics">${vehIcons(f)}</div></div>`;
  const veh = (f.vehicules||[]).map((v,i)=>panel(`Véhicule ${i+1}${v.type?` · ${v.type}`:''}`,
      [['Marque',v.marque],['Modèle',v.modele],['Couleur',v.couleur],['Propriétaire',v.proprio]],
      v.plaque ? plateHTML(v) : '')).join('');
  const tel = f.telephone ? `<a href="tel:${esc(f.telephone.replace(/[^\d+]/g,''))}">${esc(f.telephone)}</a>` : '';
  const ident = panel('Identité', [['Sexe', f.sexe==='H'?'Homme':f.sexe==='F'?'Femme':''],['Date de naissance',f.dateNaissance && (ageOf(f)!==null ? `${f.dateNaissance} (${ageOf(f)} ans)` : f.dateNaissance)],['Lieu de naissance',f.lieuNaissance],['Nationalité',f.nationalite],['Profession',f.profession], ...(cif ? [['Téléphone',tel,true]] : []), ['Adresse',f.adresse], ...(cif ? [['Filiation',f.filiation],['Signalisation',signaLabel(f)]] : [])]);
  const doc = !cif ? '' : f.docMode==='Sur dires' ? panel('Pièce d\'identité', [['Identité établie','Sur dires']])
      : panel('Pièce d\'identité', [['Type',docLabel(f)],['Numéro',f.docNumero],['Délivré le',f.docDate],['Délivré à / par',f.docLieu]]);
  const ok = b => b ? '<span style="color:#3ccf4e">✓ photo prise</span>' : '<span style="color:#ff5a52">✗ à faire</span>';
  const acc = !f.accident ? '' : panel('Accident', [['Kilométrage',kmTxt(f.kilometrage)],['Employeur',f.employeur],['Situation familiale',f.sitFam],['E-mail',f.email?`<a href="mailto:${esc(f.email)}">${esc(f.email)}</a>`:'',true],
      ['Enfants',f.nbEnfants],['Dont à charge',f.nbCharge], ...MEMO.map(([k,l])=>[l, k==='memoGR' ? (f[k] ? '<span style="color:#3ccf4e;font-weight:700">✓ Oui</span>' : '<span style="color:#ff5a52;font-weight:700">✗ Non</span>') : ok(f[k]), true])]);
  const dep = !(f.accident||f.ceea) ? '' : panel('Dépistages', [['Alcool — heure',f.alcHeure],['Alcool — résultat',resTest(f.alcRes),true],['Alcool — taux', f.alcTaux ? `<span style="color:${tauxColor(f.alcTaux)||'inherit'};font-weight:700">${esc(taux(f.alcTaux))}</span>` : '', true],
      ['Stupéfiants — heure',f.stupHeure],['Stupéfiants — résultat',resTest(f.stupRes),true]]);
  const atp = !f.at ? '' : panel('Accident du travail', [...AT_EPI.map(([k,l])=>[l, epiHTML(f[k], k), true]), ['Hauteur de chute',hautTxt(f.atHauteur)], ['Circonstances',f.atCirconstances], ['Nature des blessures',f.atBlessures]]);
  const ipmp = !(f.ipm||f.ceea) ? '' : panel('Examen de comportement (fiche A)', [['Heure de l\'examen',f.ipmHeure], ...IPM_GROUPS.filter(g=>g[0]!=='resume').map(([k,l])=>[l, ipmVal(f,k)]),
      ['Alcool (3 h) — aveu de la personne',f.ipmAveu],['Alcool (3 h) — aveu des témoins',f.ipmTemoins],['Dernière absorption d\'alcool',f.ipmDerniere]]);
  const ctx = panel('Contexte', [['Motif',f.motif],['Observations',f.observations]]);
  const photos = n ? `<section class="panel"><h4><span>Photos</span><span>${n}</span></h4><div class="photos" style="padding:10px">${f.photos.map(id=>`<div class="ph" data-id="${id}"><img alt=""></div>`).join('')}</div></section>` : '';
  const recu = f.recu ? `<p class="hint" style="margin-top:16px;color:var(--muted);font-size:13px">Reçue par QR code le ${fmtD(f.recu)}</p>` : '';
  const arch = f.status==='archived' ? `<p class="hint" style="margin-top:16px;color:var(--muted);font-size:13px">Archivée le ${fmtD(f.archivedAt)}${+SETTINGS.purgeDays?` · suppression auto le ${fmtD(f.archivedAt+SETTINGS.purgeDays*DAY)}`:''}</p>` : '';
  $('#detBody').innerHTML = hero + (cif ? ident + acc + dep + atp + ipmp + doc + veh : veh + ident + acc + dep + atp + ipmp) + ctx + photos + recu + arch;
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
  syncDocPays(); $('#f_accident').checked = !!EDIT.f.accident; $('#f_at').checked = !!EDIT.f.at; $('#f_ceea').checked = !!EDIT.f.ceea; $('#f_ipm').checked = !!EDIT.f.ipm; for (const k of MEMO) $('#f_'+k[0]).checked = !!EDIT.f[k[0]]; syncAcc(); syncTaux();
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
    E.f.ceea = $('#f_ceea').checked;
    E.f.ipm = $('#f_ipm').checked; if (!E.f.ipm && !E.f.ceea) { for (const k of IPM_FIELDS) E.f[k] = ''; E.f.ipmSel = {}; }
    if (!E.f.accident) for (const k of ACC_FIELDS) if (!(E.f.ceea && DEP_FIELDS.includes(k))) E.f[k] = '';
    E.f.at = $('#f_at').checked; if (!E.f.at) { for (const k of AT_FIELDS) E.f[k] = ''; for (const [k] of AT_EPI) E.f[k] = ''; }
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
  add('Identité', [['Nom',(f.nom||'').toUpperCase()],['Prénom',f.prenom],['Sexe', f.sexe==='H'?'Homme':f.sexe==='F'?'Femme':''],['Date de naissance',f.dateNaissance && (ageOf(f)!==null ? `${f.dateNaissance} (${ageOf(f)} ans${isMinor(f)?' — MINEUR':''})` : f.dateNaissance)],['Lieu de naissance',f.lieuNaissance],
    ['Nationalité',f.nationalite],['Profession',f.profession],['Adresse',f.adresse], ...(cif ? [['Téléphone',f.telephone],['Filiation',f.filiation],['Signalisation',signaLabel(f)]] : [])]);
  if (f.accident) add('Accident', [['Kilométrage du véhicule',kmTxt(f.kilometrage)],['Employeur',f.employeur],['Situation familiale',f.sitFam],['E-mail',f.email],['Nombre d\'enfants',f.nbEnfants],['Dont à charge',f.nbCharge],
    ...MEMO.map(([k,l])=>[l, k==='memoGR' ? (f[k]?'oui':'non') : f[k]?'photographié(e)':'non photographié(e)'])]);
  if (f.accident || f.ceea) add('Dépistages', [['Test alcool',[f.alcHeure && `à ${f.alcHeure}`, f.alcRes, taux(f.alcTaux)].filter(Boolean).join(' — ')],
    ['Test stupéfiants',[f.stupHeure && `à ${f.stupHeure}`, f.stupRes].filter(Boolean).join(' — ')]]);
  if (f.at) add('Accident du travail', [...AT_EPI.map(([k,l])=>[l, epiTxt(f[k], k)]), ['Hauteur de chute',hautTxt(f.atHauteur)], ['Circonstances',f.atCirconstances], ['Nature des blessures',f.atBlessures]]);
  if (f.ipm || f.ceea) add('Examen de comportement (fiche A)', [['Heure de l\'examen',f.ipmHeure], ...IPM_GROUPS.map(([k,l])=>[l, ipmVal(f,k)]),
    ['Absorption d\'alcool (3 dernières heures) — aveu de la personne',f.ipmAveu],['Absorption d\'alcool (3 dernières heures) — aveu des témoins',f.ipmTemoins],['Dernière heure d\'absorption d\'alcool',f.ipmDerniere]]);
  if (cif) add('Document', f.docMode === 'Sur dires' ? [['Identité établie','Sur dires']]
    : !(f.docType||f.docPays||f.docNumero||f.docDate||f.docLieu) ? [] : [['Identité établie','Pièce officielle'],['Type',docLabel(f)],['Numéro',f.docNumero],['Délivré le',f.docDate],['Délivré à / par',f.docLieu]]);
  if (cif) addVeh();
  add('Contexte', [['Motif',f.motif],['Observations',f.observations]]);
  return S;
}
function ficheText(f){
  const n = (f.photos||[]).length;
  return `${ficheName(f)} — ${f.type==='CIF'?'CIF':'CI'}${f.accident?' — ACCIDENT':''}${f.ceea?' — CEEA / CEI / CAUS':''}${f.ipm?' — IPM':''}\n`
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
/* Envoi rapide : ouvre l'appli e-mail par défaut de l'iPhone (Mail, Outlook, Gmail…) */
function openOutlook(subject, body){
  const enc = t => encodeURIComponent(String(t).replace(/\r?\n/g, '\r\n'));
  location.href = `mailto:?subject=${enc(subject)}&body=${enc(body)}`;
}
const shareFiche = f => shareFiches([f]);
async function shareFiches(list){
  computeGroups();
  const n = list.reduce((a,f)=>a+(f.photos||[]).length, 0);
  const choice = await new Promise(res=>{
    const m = $('#shareSheet'); m.classList.remove('hidden');
    $('#shOutlookHint').textContent = 'Texte seul, dans ton appli e-mail par défaut' + (n ? ' (sans les photos)' : '');
    $('#shShareHint').textContent = n ? `Texte + ${n} photo(s), choisis ton appli e-mail dans la liste` : 'Mail, Outlook, Gmail, AirDrop…';
    m.onclick = e=>{ const b=e.target.closest('[data-sh]'); if (!b && e.target!==m) return; m.classList.add('hidden'); m.onclick=null; res(b?.dataset.sh); };
  });
  if (!choice || choice === 'cancel') return;
  if (choice === 'qr') { if (SEL) { SEL = null; render(); } return window.QRS?.show(list); }
  if (choice === 'jpg') { await shareJPG(list); if (SEL) { SEL = null; render(); } return; }
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
const SG_LEARN_MAP = [['nationalite','nats'],['naisVille','villes'],['lieuControle','lieux'],['profession','prof'],['docType','docAbbr'],['docLieu','docLieu'],['motif','motifs']];
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
  sgBox.innerHTML = res.map(v=>{ const n=norm(v), i=n.indexOf(q); return `<button type="button" data-v="${esc(v)}">${i>=0 ? esc(v.slice(0,i))+'<b>'+esc(v.slice(i,i+q.length))+'</b>'+esc(v.slice(i+q.length)) : esc(v)}</button>`; }).join('');
  sgBox.classList.remove('hidden'); sgPlace(inp);
}
/* Liste de suggestions collée sous le champ : elle est placée dans la zone qui défile, et suit donc le champ */
function sgPlace(inp){
  const host = inp.closest('.body');
  if (!host) { const r = inp.getBoundingClientRect(); sgBox.style.position = 'fixed'; sgBox.style.left = r.left+'px'; sgBox.style.width = r.width+'px'; sgBox.style.top = (r.bottom + 2)+'px'; return; }
  if (sgBox.parentNode !== host) host.appendChild(sgBox);
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  const hr = host.getBoundingClientRect(), r = inp.getBoundingClientRect(), h = sgBox.offsetHeight;
  const vv = window.visualViewport, visBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
  const up = visBottom - r.bottom < h + 8 && r.top - hr.top > h + 8;
  sgBox.style.position = 'absolute'; sgBox.style.bottom = ''; sgBox.style.margin = '0';
  sgBox.style.left = (r.left - hr.left + host.scrollLeft) + 'px'; sgBox.style.width = r.width + 'px';
  sgBox.style.top = (up ? r.top - hr.top + host.scrollTop - h - 2 : r.bottom - hr.top + host.scrollTop + 2) + 'px';
  sgBox.style.borderRadius = up ? '12px 12px 4px 4px' : '4px 4px 12px 12px';
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
window.visualViewport?.addEventListener('resize', ()=>{ if (sgInput && !sgBox.classList.contains('hidden')) sgPlace(sgInput); });

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
  const r = await fetch('./version.js', {cache:'reload'});
  if (!r.ok) throw new Error(r.status);
  return ((await r.text()).match(/version:\s*'([^']+)'/) || [])[1] || null;
}
async function applyUpdate(){
  toast('Mise à jour…');
  try {
    for (const f of ['./index.html','./app.js','./data.js','./style.css','./sw.js','./version.js', ...((window.CIF && CIF.modules) || []).map(m=>'./' + m)]) await fetch(f, {cache:'reload'});
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
  $('#f_resultat').insertAdjacentHTML('beforeend', '<option>Non contrôlé</option>');
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
  $('#f_signa').checked = !!EDIT?.f.signa; $('#f_signaAn').value = EDIT?.f.signaAn || ''; syncSigna(); syncMotif(); syncAge(); syncAT();
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
    if (a.country_code && a.country_code !== 'mc') { const e = nearestEntry(lat, lng); geoNote = ` — position en France, ramenée à l'${e.n[0].toLowerCase() + e.n.slice(1)}`; return e.n; }
    const street = [a.house_number, a.road || a.pedestrian || a.footway || a.square || a.place].filter(Boolean).join(' ');
    const area = a.suburb || a.quarter || a.neighbourhood || a.city_district || '';
    const city = a.city || a.town || a.village || a.municipality || '';
    return [street, area, city].filter((x,i,arr)=>x && arr.indexOf(x)===i).join(', ');
  } catch { return ''; } finally { clearTimeout(t); }
}
/* Lieux connus (rayon en mètres) et entrées de ville de Monaco */
const GEO_PLACES = [
  {n:'Entrée de ville Saint-Roman', lat:43.7515236, lng:7.4378675, r:50, entry:true},
  {n:'Entrée de ville Jardin Exotique', lat:43.7317343, lng:7.4135701, r:50, entry:true},
  {n:'Entrée de ville Wurtemberg', lat:43.7288362, lng:7.4124804, r:50, entry:true},
  {n:'Les Poivriers', lat:43.7379667, lng:7.4268282, r:15}
];
const geoDist = (a1, o1, a2, o2) => { const R = 6371000, rad = Math.PI/180, dA = (a2-a1)*rad, dO = (o2-o1)*rad; const h = Math.sin(dA/2)**2 + Math.cos(a1*rad)*Math.cos(a2*rad)*Math.sin(dO/2)**2; return 2*R*Math.asin(Math.sqrt(h)); };
const namedPlace = (lat, lng) => GEO_PLACES.map(p=>({p, d:geoDist(lat, lng, p.lat, p.lng)})).filter(x=>x.d <= x.p.r).sort((a,b)=>a.d-b.d)[0]?.p || null;
const nearestEntry = (lat, lng) => GEO_PLACES.filter(p=>p.entry).sort((a,b)=>geoDist(lat,lng,a.lat,a.lng)-geoDist(lat,lng,b.lat,b.lng))[0];
let geoNote = '';
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
    geoNote = ''; const known = namedPlace(lat, lng);
    let label = known ? known.n : SETTINGS.geoMode === 'gps' ? '' : await reverseGeo(lat, lng);
    if (!EDIT || EDIT.f.id !== id) return;
    const inp = $('#f_lieuControle');
    if (!inp.value.trim() || !auto) inp.value = label || `GPS ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    hint.textContent = `📍 Position enregistrée (précision ± ${EDIT.f.geo.acc} m)` + (known ? ' — lieu connu' : geoNote) + (label || SETTINGS.geoMode === 'gps' ? '' : ' — adresse introuvable, coordonnées notées');
  } catch (e) {
    hint.textContent = e && e.code === 1 ? '📍 Localisation refusée : autorise-la dans Réglages iPhone › Confidentialité › Service de localisation › Safari' : (auto ? '' : '📍 Position introuvable, réessaie');
  } finally { geoBusy = false; }
}
$('#geoBtn').onclick = ()=>geoFill(false);

/* ---------- Accident du travail : EPI, circonstances, hauteur de chute, blessures ---------- */
$('#accBlock').insertAdjacentHTML('afterend', `<label class="switch"><input type="checkbox" id="f_at"><span class="sw"></span><span class="swl">Accident du travail</span></label>
  <div id="atBlock" class="accblock hidden">
    <div class="sect" style="margin-top:6px">Équipements de protection et permis de travail</div>
    <div id="atEpi" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:8px"></div>
    <p class="hint" style="font-size:12px;color:var(--muted);margin:6px 0 0">Touche : vert = porté / en règle · rouge = non porté / non en règle · gris = non renseigné</p>
    <label class="f" for="f_atHauteur">Hauteur de chute (m)</label><input id="f_atHauteur" inputmode="decimal" placeholder="ex. 2,5" autocomplete="off">
    <label class="f" for="f_atCirconstances">Circonstances de l'accident</label><textarea id="f_atCirconstances" rows="3"></textarea>
    <label class="f" for="f_atBlessures">Nature des blessures</label><textarea id="f_atBlessures" rows="2"></textarea>
  </div>`);
function syncAT(){
  $('#atBlock').classList.toggle('hidden', !$('#f_at').checked);
  const f = EDIT?.f || {};
  $('#atEpi').innerHTML = AT_EPI.map(([k,,s])=>{ const v = f[k] || ''; const st = v==='oui' ? 'background:#1f5d2a;border-color:#3ccf4e;color:#fff' : v==='non' ? 'background:#6b1f1b;border-color:#ff5a52;color:#fff' : 'background:var(--panel);border-color:var(--line);color:var(--muted)';
    return `<button type="button" data-epi="${k}" style="border:1px solid;border-radius:12px;padding:10px 4px;font-size:14px;font-weight:700;line-height:1.25;${st}">${v==='oui'?'✓':v==='non'?'✗':'·'}<br>${s}</button>`; }).join('');
}
$('#f_at').addEventListener('change', syncAT);
$('#atEpi').addEventListener('click', e=>{ const b = e.target.closest('[data-epi]'); if (!b || !EDIT) return; const k = b.dataset.epi; EDIT.f[k] = !EDIT.f[k] ? 'oui' : EDIT.f[k]==='oui' ? 'non' : ''; syncAT(); draftSoon(); });

/* ---------- Grille de boutons (Accident / Acc. travail / mémo) — v4.4 ---------- */
document.head.insertAdjacentHTML('beforeend', `<style>
#accGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}
#accGrid .switch{position:relative;margin:0;justify-content:center;text-align:center;padding:12px 6px;border-radius:12px;min-height:52px}
#accGrid .switch .sw{display:none}
#accGrid .switch .swl{font-size:15px;color:var(--muted)}
#accGrid .switch.on{background:#3a2a14;border-color:#f08a24}
#accGrid .switch.on .swl{color:#ffcf8a}
#accGrid .switch.at.on{background:#2e2147;border-color:#8a63d2}
#accGrid .switch.at.on .swl{color:#d6c4ff}
#accGrid .switch .swl::before{content:'○ ';opacity:.6}
#accGrid .switch.on .swl::before{content:'✓ ';opacity:1}
#atBlock{border-left-color:#8a63d2}
.memo .mgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px}
.memo .mc{position:relative;justify-content:center;text-align:center;padding:9px 4px;border:1px solid #7a5420;border-radius:10px;font-size:14px;font-weight:600;color:#c9a774;line-height:1.2;min-height:44px}
.memo .mc input{position:absolute;opacity:0;pointer-events:none}
.memo .mc.on{background:#f08a24;border-color:#f08a24;color:#1a1004}
.memo .mc.gr{grid-column:1/-1;background:#4a1714;border-color:#ff5a52;color:#ffb1ab}
.memo .mc.gr.on{background:#1f5d2a;border-color:#3ccf4e;color:#fff}
</style>`);
(()=>{
  const sa = $('#f_accident').closest('label'), st = $('#f_at').closest('label');
  sa.insertAdjacentHTML('beforebegin', '<div id="accGrid"></div>');
  const g = $('#accGrid'); g.append(sa, st); st.classList.add('at');
  $('#accBlock').after($('#atBlock'));
  sa.querySelector('.swl').textContent = 'Accident'; st.querySelector('.swl').textContent = 'Acc. travail';
  const memo = $('#accBlock .memo'); const mg = document.createElement('div'); mg.className = 'mgrid';
  memo.querySelector('.memo-t').after(mg);
  const short = {memoCG:'Carte grise', memoAss:'Assurance', memoPR:'Permis recto', memoPV:'Permis verso', memoGR:'Garanties de représentation'};
  for (const [k] of MEMO) { const l = $('#f_'+k).closest('label'); mg.append(l); l.querySelector('span').textContent = short[k] || l.querySelector('span').textContent; if (k==='memoGR') l.classList.add('gr'); }
})();
function paintTiles(){
  for (const l of document.querySelectorAll('#accGrid .switch, .memo .mc')) { const i = l.querySelector('input'); l.classList.toggle('on', !!i?.checked); }
  const gr = $('#f_memoGR'); if (gr) gr.nextElementSibling.textContent = (gr.checked ? '✓ ' : '✗ ') + 'Garanties de représentation';
}
document.addEventListener('change', e=>{ if (e.target.closest?.('#accGrid, .memo')) paintTiles(); });
{ const _sa = syncAcc; syncAcc = function(){ _sa(); paintTiles(); }; const _st = syncAT; syncAT = function(){ _st(); paintTiles(); }; }
paintTiles();

/* ---------- CEEA / CEI / CAUS : dépistages alcool et stupéfiants (partagés avec Accident) ---------- */
document.head.insertAdjacentHTML('beforeend', `<style>
#accGrid .switch.ceea.on{background:#14304f;border-color:#4a90e2}
#accGrid .switch.ceea.on .swl{color:#bcd8ff}
#depBlock{border-left-color:#4a90e2}
</style>`);
(()=>{
  $('#accGrid').insertAdjacentHTML('beforeend', `<label class="switch ceea"><input type="checkbox" id="f_ceea"><span class="sw"></span><span class="swl">CEEA / CEI / CAUS</span></label>`);
  $('#accBlock').insertAdjacentHTML('afterend', `<div id="depBlock" class="accblock hidden"></div>`);
  const dep = $('#depBlock'), sect = [...document.querySelectorAll('#accBlock .sect')].find(x=>/pistage/i.test(x.textContent));
  if (sect) { sect.style.marginTop = '6px'; dep.append(sect); }
  document.querySelectorAll('#accBlock .test').forEach(t=>dep.append(t));
})();
function syncDep(){ $('#depBlock').classList.toggle('hidden', !($('#f_accident').checked || $('#f_ceea').checked)); }
$('#f_ceea').addEventListener('change', ()=>{ syncDep(); paintTiles(); });
$('#f_accident').addEventListener('change', syncDep);
{ const _sa2 = syncAcc; syncAcc = function(){ _sa2(); syncDep(); }; }
paintTiles();

/* ---------- IPM : examen de comportement (fiche « A ») ---------- */
document.head.insertAdjacentHTML('beforeend', `<style>
#accGrid .switch.ipm.on{background:#0d3532;border-color:#14b8a6}
#accGrid .switch.ipm.on .swl{color:#99f6e4}
#ipmBlock{border-left-color:#14b8a6}
#ipmBlock .ig{margin-top:12px}
#ipmBlock .ig>b{display:block;font-size:14px;color:var(--muted);margin-bottom:6px}
#ipmBlock .ich{display:flex;flex-wrap:wrap;gap:6px}
#ipmBlock .ich button{border:1px solid var(--line);background:var(--panel);color:inherit;border-radius:16px;padding:7px 11px;font-size:14px;line-height:1.2}
#ipmBlock .ich button.on{background:#0f766e;border-color:#14b8a6;color:#fff;font-weight:700}
#ipmBlock .ig.res .ich button{flex:1 1 100%;text-align:left;border-radius:10px}
</style>`);
(()=>{
  $('#accGrid').insertAdjacentHTML('beforeend', `<label class="switch ipm"><input type="checkbox" id="f_ipm"><span class="sw"></span><span class="swl">IPM</span></label>`);
  let sec = '';
  const groups = IPM_GROUPS.map(([k,l,opts,one,s])=>{ const h = s && s!==sec ? `<div class="sect" style="margin-top:18px">${esc(s)}</div>` : ''; sec = s || sec;
    return `${h}<div class="ig${k==='resume'?' res':''}"><b>${esc(l)}${one?'':' <small style="font-weight:400">(plusieurs choix possibles)</small>'}</b><div class="ich" data-g="${k}">${opts.map(o=>`<button type="button" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div></div>`; });
  $('#atBlock').insertAdjacentHTML('afterend', `<div id="ipmBlock" class="accblock hidden">
    <div class="sect" style="margin-top:6px">Examen de comportement</div>
    <label class="f" for="f_ipmHeure">Heure de l'examen</label><input id="f_ipmHeure" type="time">
    ${groups.join('')}
    <div class="sect" style="margin-top:18px">Renseignements particuliers</div>
    <p class="hint" style="font-size:13px;color:var(--muted);margin:6px 0 0">Absorption d'alcool au cours des 3 dernières heures</p>
    <label class="f" for="f_ipmAveu">De l'aveu de la personne concernée</label><textarea id="f_ipmAveu" rows="2"></textarea>
    <label class="f" for="f_ipmTemoins">De l'aveu du ou des témoins</label><textarea id="f_ipmTemoins" rows="2"></textarea>
    <label class="f" for="f_ipmDerniere">Dernière heure d'absorption d'alcool</label><input id="f_ipmDerniere" autocomplete="off" placeholder="ex. 21h30">
  </div>`);
})();
function syncIPM(){
  const ls = EDIT?.f.ipmSel?.lesions; if (ls) EDIT.f.ipmSel.lesions = ls.map(x=>x==='Contusions'?'Confusions':x);
  $('#ipmBlock').classList.toggle('hidden', !($('#f_ipm').checked || $('#f_ceea').checked));
  const sel = EDIT?.f.ipmSel || {};
  document.querySelectorAll('#ipmBlock .ich').forEach(c=>{ const v = sel[c.dataset.g]||[]; c.querySelectorAll('button').forEach(b=>b.classList.toggle('on', v.includes(b.dataset.o))); });
}
$('#ipmBlock').addEventListener('click', e=>{
  const b = e.target.closest('.ich button'); if (!b || !EDIT) return;
  const g = b.closest('.ich').dataset.g, one = IPM_GROUPS.find(x=>x[0]===g)[3], o = b.dataset.o;
  const sel = EDIT.f.ipmSel ||= {}; let v = sel[g] || [];
  v = v.includes(o) ? v.filter(x=>x!==o) : one ? [o] : [...v, o];
  /* « Indemne » exclut confusions / blessures, et inversement */
  if (g==='lesions' && v.includes(o)) v = o==='Indemne' ? ['Indemne'] : v.filter(x=>x!=='Indemne');
  sel[g] = v; syncIPM(); draftSoon();
});
['#f_ipm','#f_ceea'].forEach(id=>$(id).addEventListener('change', e=>{ syncIPM(); paintTiles(); if (e.target.checked && !$('#f_ipmHeure').value) $('#f_ipmHeure').value = new Date().toTimeString().slice(0,5); }));
{ const _sa3 = syncAcc; syncAcc = function(){ _sa3(); syncIPM(); }; }
paintTiles();

/* ---------- Personne déjà connue : suggestions sur le nom, reprise de l'identité ---------- */
const ID_FIELDS = ['sexe','nom','prenom','dateNaissance','lieuNaissance','nationalite','profession','adresse','adrRue','adrVille','adrPays','telephone','filiation','docType','docPays','docNumero','docDate','docLieu','sitFam','email','nbEnfants','nbCharge','employeur'];
$('#f_nom').insertAdjacentHTML('afterend', `<div id="idSug" class="hidden" style="margin-top:6px;border:1px solid #2d4a7a;border-radius:12px;background:#16233a;overflow:hidden"></div>`);
function idMatches(q){
  const n = norm(q); if (n.length < 2) return [];
  const seen = new Map();
  for (const f of FICHES) {
    if (EDIT && f.id === EDIT.f.id) continue;
    if (!norm(f.nom).startsWith(n)) continue;
    const k = [norm(f.nom), norm(f.prenom), f.dateNaissance||''].join('|');
    const cur = seen.get(k); if (!cur) seen.set(k, {f, n:1, all:[f]}); else { cur.n++; cur.all.push(f); if ((f.dateHeure||'') > (cur.f.dateHeure||'')) cur.f = f; }
  }
  return [...seen.values()].sort((a,b)=>(b.f.dateHeure||'').localeCompare(a.f.dateHeure||'')).slice(0,6);
}
function idSugShow(){
  const box = $('#idSug'), list = idMatches($('#f_nom').value);
  if (!list.length) { box.classList.add('hidden'); box.innerHTML = ''; return; }
  box.innerHTML = `<div style="padding:7px 12px;font-size:12px;color:#9db4d8;border-bottom:1px solid #2d4a7a">Déjà contrôlé · toucher pour reprendre l'identité</div>` + list.map(({f,n})=>`<button type="button" data-idsrc="${f.id}" style="display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #22355a;background:none;color:#e6eefc;padding:10px 12px;font-size:15px">
    <b>${esc((f.nom||'').toUpperCase())}</b> ${esc(f.prenom||'')}${f.dateNaissance ? ` <span style="color:#9cc0ff">· né(e) le ${esc(f.dateNaissance)}</span>` : ''}
    <br><small style="color:#9db4d8">${esc(f.type||'CI')} du ${esc(fmtDT(f.dateHeure))}${f.status==='archived'?' · archivé':''}${n>1?` · ${n} contrôles`:''}${f.lieuNaissance?` · ${esc(f.lieuNaissance)}`:''}</small></button>`).join('');
  box.classList.remove('hidden');
}
function idInherit(src){
  if (!EDIT || !src) return;
  /* Fusion de tous les contrôles de la même personne (même nom, prénom, date de naissance) :
     pour chaque champ, la valeur la plus récente renseignée (un CI récent ne masque pas le téléphone ou la pièce d'un ancien CIF) */
  const k0 = [norm(src.nom), norm(src.prenom), src.dateNaissance||''].join('|');
  const all = FICHES.filter(f=>f.id !== EDIT.f.id && [norm(f.nom), norm(f.prenom), f.dateNaissance||''].join('|') === k0).sort((a,b)=>(b.dateHeure||'').localeCompare(a.dateHeure||''));
  const pick = k => all.find(f=>f[k])?.[k] || '';
  for (const k of ID_FIELDS) { const v = pick(k); if (v) $('#f_'+k).value = v; }
  const docSrc = all.find(f=>f.docType || f.docNumero);
  if (docSrc) { setSeg('docSeg', 'Officiel'); for (const k of ['docType','docPays','docNumero','docDate','docLieu']) $('#f_'+k).value = docSrc[k] || ''; }
  const sg = all.find(f=>f.signa);
  if (sg) { $('#f_signa').checked = true; $('#f_signaAn').value = sg.signaAn || ''; syncSigna(); }
  if ((pick('telephone') || docSrc || pick('filiation')) && segVal('typeSeg') === 'CI') toast('Astuce : passe en CIF pour garder téléphone, filiation et pièce d\'identité');
  syncDocPays(); syncAge(); $('#idSug').classList.add('hidden');
  if (!((pick('telephone') || docSrc || pick('filiation')) && segVal('typeSeg') === 'CI')) toast(`Identité reprise (${all.length} contrôle${all.length>1?'s':''})`); draftSoon();
}
$('#f_nom').addEventListener('input', idSugShow);
$('#f_nom').addEventListener('focus', idSugShow);
$('#f_nom').addEventListener('blur', ()=>setTimeout(()=>$('#idSug').classList.add('hidden'), 250));
$('#idSug').addEventListener('pointerdown', e=>e.preventDefault());
$('#idSug').addEventListener('click', e=>{ const b = e.target.closest('[data-idsrc]'); if (b) idInherit(FICHES.find(x=>x.id===b.dataset.idsrc)); });
$('#formSave').addEventListener('click', ()=>$('#idSug').classList.add('hidden'), true);
$('#formCancel').addEventListener('click', ()=>$('#idSug').classList.add('hidden'), true);

/* ---------- Adresse : rue + ville avec code postal (toutes les communes de France + Monaco) ----------
   La liste publique des communes (Etalab) est téléchargée une seule fois puis gardée sur le téléphone :
   la recherche se fait hors ligne, aucune donnée de fiche n'est envoyée. */
const COMMUNES_URLS = ['https://cdn.jsdelivr.net/npm/@etalab/decoupage-administratif@6.0.0/data/communes.json',
                       'https://unpkg.com/@etalab/decoupage-administratif@6.0.0/data/communes.json'];
let CITIES = null, citiesLoading = null;
function cityIndex(txt){
  const names = [], cps = [], nk = [];
  for (const l of txt.split('\n')) { const i = l.indexOf(';'); if (i < 0) continue; const n = l.slice(0,i); names.push(n); cps.push(l.slice(i+1)); nk.push(' ' + norm(n).replace(/[-'’]/g,' ')); }
  return {names, cps, nk};
}
function compactCommunes(d){
  const rows = [], seen = new Set();
  const add = (n, cp, pop) => { const k = n + ';' + cp; if (!seen.has(k)) { seen.add(k); rows.push([pop, k]); } };
  for (const x of d) if (x.type === 'commune-actuelle') for (const cp of (x.codesPostaux||[])) add(x.nom, cp, x.population||0);
  for (const x of d) if (x.type === 'commune-deleguee' || x.type === 'commune-associee') for (const cp of (x.codesPostaux||[])) add(x.nom, cp, (x.population||0)/4);
  rows.sort((a,b)=>b[0]-a[0]);
  return ['Monaco;98000','Monte-Carlo;98000', ...rows.map(r=>r[1])].join('\n');
}
function loadCities(){
  if (CITIES) return Promise.resolve(CITIES);
  if (citiesLoading) return citiesLoading;
  citiesLoading = (async ()=>{
    let txt = await dbGet('meta','communes').catch(()=>null);
    if (!txt) {
      for (const u of COMMUNES_URLS) { try { const r = await fetch(u); if (r.ok) { txt = compactCommunes(await r.json()); break; } } catch {} }
      if (!txt) throw new Error('offline');
      await dbPut('meta', txt, 'communes').catch(()=>{});
    }
    return CITIES = cityIndex(txt);
  })().catch(e=>{ citiesLoading = null; throw e; });
  return citiesLoading;
}
(()=>{
  const a = $('#f_adresse'); a.type = 'hidden';
  $('label[for=f_adresse]').setAttribute('for', 'f_adrRue');
  a.insertAdjacentHTML('afterend', `<input id="f_adrRue" autocomplete="off" spellcheck="false" placeholder="N° et rue">
    <div style="position:relative;margin-top:8px"><input id="f_adrVille" autocomplete="off" spellcheck="false" placeholder="Ville ou code postal (ex. Roqu…, 06190)"></div>
    <input id="f_adrPays" data-sg="paysAdr" autocomplete="off" spellcheck="false" placeholder="Pays" style="margin-top:8px">
    <div id="adrHint" style="font-size:12px;color:var(--muted);margin-top:4px"></div>`);
})();
function adrJoin(){ const ville = $('#f_adrVille').value.trim(), pays = $('#f_adrPays').value.trim();
  $('#f_adresse').value = [$('#f_adrRue').value.trim(), ville, pays && norm(ville).includes(norm(pays)) ? '' : pays].filter(Boolean).join(', '); }
function adrSplit(){
  /* Anciennes fiches (adresse en un seul bloc) : découpage rue / ville / pays */
  if ($('#f_adrRue').value || $('#f_adrVille').value || $('#f_adrPays').value) return;
  const v = $('#f_adresse').value.trim(), parts = v.split(/,\s*/), j = parts.findIndex(x=>/^\d{5}\s/.test(x));
  $('#f_adrRue').value = j < 0 ? v : parts.slice(0,j).join(', ');
  $('#f_adrVille').value = j < 0 ? '' : parts[j];
  $('#f_adrPays').value = j < 0 ? '' : parts.slice(j+1).join(', ') || (parts[j].startsWith('98000') ? 'Monaco' : '');
}
SG_BASE.paysAdr = [...DOC_PAYS_TOP, ...DOC_PAYS_ALL].map(x=>x[1]).filter(n=>n!=='Autre / inconnu');
$('#f_adrPays').addEventListener('input', adrJoin); $('#f_adrPays').addEventListener('change', adrJoin);
/* Ville choisie dans la liste : pays rempli automatiquement (France ou Monaco) s'il est vide */
$('#f_adrVille').addEventListener('change', e=>{ const v = e.target.value; if (/^\d{5}\s/.test(v) && !$('#f_adrPays').value.trim()) { $('#f_adrPays').value = v.startsWith('98000') ? 'Monaco' : 'France'; adrJoin(); } });
['input','change'].forEach(ev=>{ $('#f_adrRue').addEventListener(ev, adrJoin); $('#f_adrVille').addEventListener(ev, adrJoin); });
function villeShow(inp){
  const raw = norm(inp.value).replace(/[-'’]/g,' ').replace(/^st /,'saint ').replace(/^ste /,'sainte ').trim();
  if (!raw) return sgHide();
  if (!CITIES) { const hint = $(inp.id === 'f_naisVille' ? '#naisHint' : '#adrHint'); hint.textContent = 'Chargement de la liste des communes…'; loadCities().then(()=>{ hint.textContent = ''; if (document.activeElement === inp) sgShow(inp); }).catch(()=>{ hint.textContent = 'Liste des communes indisponible hors ligne pour l\'instant : saisie libre.'; }); return; }
  const {names, cps, nk} = CITIES, res = [], isCp = /^\d/.test(raw), q = ' ' + raw;
  for (let i = 0; i < names.length && res.length < 60; i++) {
    if (isCp ? cps[i].startsWith(raw) : (nk[i].startsWith(q) || (raw.length > 2 && nk[i].includes(q)))) res.push(`${cps[i]} ${names[i]}`);
  }
  /* Priorité : Monaco et Alpes-Maritimes, puis début de nom, puis population */
  const rank = v => (/^(98|06)/.test(v) ? 0 : 2) + (isCp || (' ' + norm(v.slice(6)).replace(/[-'’]/g,' ')).startsWith(q) ? 0 : 1);
  res.sort((x,y)=>rank(x)-rank(y)); res.length = Math.min(res.length, 8);
  if (!res.length) return sgHide();
  sgInput = inp;
  sgBox.innerHTML = res.map(v=>`<button type="button" data-v="${esc(v)}">${esc(v)}</button>`).join('');
  sgBox.classList.remove('hidden'); sgPlace(inp);
}
{ const _sgShow = sgShow; sgShow = inp => inp && inp.id === 'f_adrVille' ? villeShow(inp) : _sgShow(inp); }
$('#f_adrVille').addEventListener('input', e=>villeShow(e.target));
$('#f_adrVille').addEventListener('focus', e=>{ loadCities().catch(()=>{}); if (e.target.value) villeShow(e.target); });
{ const _of = openForm; openForm = function(f, d){ _of(f, d); adrSplit(); }; const _ii = idInherit; idInherit = function(src){ _ii(src); adrSplit(); }; }
/* Téléchargement en arrière-plan, une seule fois, quand l'appli est ouverte */
setTimeout(()=>{ if (db) dbGet('meta','communes').then(t=>{ if (!t && navigator.onLine) loadCities().catch(()=>{}); }).catch(()=>{}); }, 6000);

/* ---------- Sexe : Homme / Femme (accord « né » / « née » dans la main courante) ---------- */
(()=>{
  $('label[for=f_nom]').insertAdjacentHTML('beforebegin', `<label class="f">Sexe</label><input type="hidden" id="f_sexe">
    <div id="sexeSeg" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <button type="button" data-sx="H" style="border:1px solid var(--line);background:var(--panel);color:var(--muted);border-radius:10px;padding:11px;font-size:15px;font-weight:600">♂ Homme</button>
      <button type="button" data-sx="F" style="border:1px solid var(--line);background:var(--panel);color:var(--muted);border-radius:10px;padding:11px;font-size:15px;font-weight:600">♀ Femme</button></div>`);
})();
function syncSexe(){ const v = $('#f_sexe').value; document.querySelectorAll('#sexeSeg [data-sx]').forEach(b=>{ const on = b.dataset.sx === v; b.style.background = on ? (v==='H' ? '#1f5fa8' : '#a3367a') : 'var(--panel)'; b.style.color = on ? '#fff' : 'var(--muted)'; b.style.borderColor = on ? 'transparent' : 'var(--line)'; }); }
$('#sexeSeg').addEventListener('click', e=>{ const b = e.target.closest('[data-sx]'); if (!b) return; const i = $('#f_sexe'); i.value = i.value === b.dataset.sx ? '' : b.dataset.sx; syncSexe(); draftSoon(); });
{ const _of2 = openForm; openForm = function(f, d){ _of2(f, d); syncSexe(); }; const _ii2 = idInherit; idInherit = function(src){ _ii2(src); syncSexe(); }; }

/* ---------- Libellés « e-mail » et journal des modifications (réglages) ---------- */
(()=>{ const b = document.querySelector('#shareSheet [data-sh=outlook] b'); if (b) b.textContent = 'Envoi rapide par e-mail';
  $('#exportOutlook').textContent = 'Envoyer toutes les fiches en cours par e-mail'; })();
const CHANGELOG = [
  ['1.0.7', ['Réglages › Outils : répertoire « Diffusion » (personnes recherchées : nom, prénom, date de naissance, photo), chiffré et inclus dans la sauvegarde', 'Nouvelle fiche : alerte rouge « PERSONNE RECHERCHÉE » si l\'identité correspond à une diffusion, alerte « nom diffusé » si seul le nom de famille correspond', 'Badge rouge RECHERCHÉ dans la liste, bandeau dans la fiche et mention dans l\'envoi']],
  ['1.0.6', ['Accident du travail : tuile « Permis de travail » (en règle / non en règle), reprise dans la fiche et l\'envoi']],
  ['1.0.5', ['Localisation : lieux connus reconnus automatiquement (entrées de ville Saint-Roman, Jardin Exotique et Wurtemberg dans un rayon de 50 m, Les Poivriers dans un rayon de 15 m)', 'Position détectée en France : le lieu devient l\'entrée de ville de Monaco la plus proche']],
  ['1.0.4', ['Mineur : champ « Responsable légal » affiché automatiquement', 'Case « Sous tutelle » avec le nom du tuteur', 'Badge SDS (sans adresse ni profession) et main courante « sans profession et sans adresse »', 'VERIF : champ du capitaine de permanence et phrase de main courante (antécédents, avis à la permanence judiciaire, conduite en nos locaux)', 'Case « Antécédents judiciaires » : garde à vue, incarcération, condamnation… par année et motif, rédigés dans la main courante']],
  ['1.0.3', ['Écrans verrouillés : plus de zoom (pincement, double tap, zoom automatique sur un champ) ni de glissement de la page vers la gauche ou la droite, le défilement reste vertical', 'Zoom conservé uniquement sur les photos ouvertes en plein écran (fiche et feuille de service)', 'Numérotation des versions : petites mises à jour en 1.0.x']],
  ['1.0.2', ['Service du jour déplacé sur l\'écran de déverrouillage : photo de la feuille dans un carré à gauche, missions du jour à droite (3 affichées, celle en cours mise en avant)', 'Bouton « Modifier » : photo, missions, DPU / SPG (effacé à minuit) ou DPU / SN (effacé à midi)']],
  ['1.0.1', ['Envoi d\'une fiche en image JPG, telle qu\'elle s\'affiche dans l\'appli', 'Accueil : « Service du jour » avec la photo de la feuille de service et les consignes (heure de début – heure de fin : consigne), consigne en cours mise en avant', 'Service DPU / SPG effacé automatiquement à minuit, DPU / SN à midi']],
  ['1.0.0', ['Grosse mise à jour : passage en version 1.0.0', 'Fiches : glisser le doigt vers la gauche ou la droite pour passer à la fiche suivante ou précédente', 'Suggestions collées sous le champ en cours de saisie', 'Nom de famille : plus de correction automatique du clavier', 'Icône « contrôlés ensemble » plus visible', 'Fiches « Non contrôlé » affichées en plus petit et atténuées dans la liste']],
  ['5.4', ['Main courante : filiation précédée de « fils de » ou « fille de » selon le bouton Homme / Femme']],
  ['5.3', ['Fiche A : rubrique « En résumé, l\'intéressé semble » retirée (formulaire, fiche et envoi)']],
  ['5.2', ['Main courante (IPM) : phrase finale « Lors du contrôle, l\'intéressé présentait tous les signes extérieurs de l\'ivresse, à savoir : une élocution pâteuse, une allure somnolente, un visage congestionné, une haleine sentant l\'alcool, les yeux voilés et des explications embrouillées », rédigée d\'après la fiche A']],
  ['5.1', ['Fiche A : « Confusions » à la place de « Contusions » (comme sur le formulaire papier)']],
  ['5.0', ['Main courante : adresse rédigée « résidant 5 avenue X à Monaco », « demeurant 5 avenue X à Nice (06000) » ou « demeurant au 5 via Y à Sanremo en Italie »', 'Rue, ville et pays enregistrés séparément (ville étrangère en saisie libre, sans code postal)']],
  ['4.9', ['Adresse en trois champs : rue, ville avec suggestions et code postal (toutes les communes de France + Monaco, liste gardée sur le téléphone, recherche hors ligne), pays avec suggestions', 'Bouton Homme / Femme : la main courante écrit « né » ou « née »']],
  ['4.8', ['Nouveau bouton « CEEA / CEI / CAUS » : dépistages alcool (heure, résultat, taux) et stupéfiants (heure, résultat), badge bleu, rubrique Dépistages dans la fiche et l\'envoi', 'Résultat : nouveau choix « Non contrôlé » (en jaune)', 'Nouveaux boutons « IPM » et « CEEA » : examen de comportement de la fiche A (lieu, constitution, lésions, visage, allure, attitude, regard, haleine, élocution, explications, équilibre), absorption d\'alcool et résumé']],
  ['4.7', ['Reprise d\'identité : fusionne tous les contrôles de la personne (téléphone, pièce, filiation d\'un ancien CIF repris même si le dernier contrôle est un CI)']],
  ['4.6', ['Personne déjà contrôlée (CI ou CIF, archivé ou non) : en tapant le nom, une liste propose nom, prénom et date de naissance, un appui reprend toute l\'identité et la pièce d\'identité']],
  ['4.5', ['Envoi rapide par e-mail : ouvre l\'appli e-mail par défaut du téléphone (Mail, Outlook, Gmail…)', 'Journal des modifications dans les réglages']],
  ['4.4', ['Accident / Acc. travail en boutons côte à côte', 'Mémo photos en grille, garanties de représentation en vert / rouge']],
  ['4.3', ['Bloc « Accident du travail » : chaussures, gants, casque (porté / non porté), hauteur de chute, circonstances, nature des blessures']],
  ['4.2', ['Garanties de représentation : simple oui / non (vert / rouge)']],
  ['4.1', ['Accident : champ Employeur et case Garanties de représentation']],
  ['4.0', ['Main courante : « FR », « IT », « UK »… donne « par les autorités françaises / italiennes… », Monaco donne « par nos autorités »']],
  ['3.9', ['Âge calculé à la date du contrôle, alerte MINEUR']],
  ['3.8', ['Accident : kilométrage du véhicule']],
  ['3.7', ['Main courante : « pref 06 » donne « par la préfecture des Alpes-Maritimes »']],
  ['3.6', ['Main courante : pièce d\'identité écrite en toutes lettres']],
  ['3.5', ['Lecture de plaque en direct retirée']]
];
function renderChangelog(){ $('#changelog')?.remove(); $('#versionInfo').insertAdjacentHTML('afterend', `<details id="changelog" style="margin-top:10px;border:1px solid var(--line);border-radius:10px;padding:8px 12px;background:var(--panel)">
  <summary style="font-weight:600;cursor:pointer">Nouveautés (changelog)</summary>
  ${CHANGELOG.map(([v,items],i)=>`<div style="margin-top:10px"><b style="color:${i?'inherit':'#7fb3ff'}">v${v}</b>${i?'':' <small style="color:var(--muted)">(actuelle)</small>'}<ul style="margin:4px 0 0;padding-left:18px;font-size:14px;color:var(--muted);line-height:1.4">${items.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div>`).join('')}
</details>`); }
renderChangelog();

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
/* Adresse en main courante :
   Monaco → « résidant 5 avenue X à Monaco » ; France → « demeurant 5 avenue X à Nice (06000) » ;
   étranger → « demeurant au 5 via Y à Sanremo en Italie » */
const PAYS_PREP = {'etats-unis':'aux','pays-bas':'aux','emirats arabes unis':'aux','philippines':'aux','seychelles':'aux','comores':'aux','maldives':'aux',
  'mexique':'au','cambodge':'au','mozambique':'au','zimbabwe':'au','belize':'au','chypre':'à','malte':'à','cuba':'à','madagascar':'à','singapour':'à','andorre':'en','israel':'en'};
function enPays(p){
  const n = norm(p).replace(/^(l'|la |le |les )/,''); if (!n) return '';
  const prep = PAYS_PREP[n] || (/^[aeiouy]/.test(n) || /e$/.test(n) ? 'en' : 'au');
  return `${prep} ${p.trim().replace(/^(l'|la |le |les )/i,'')}`;
}
const aVille = v => /^le /i.test(v) ? 'au ' + v.slice(3) : /^les /i.test(v) ? 'aux ' + v.slice(4) : 'à ' + v;
function adrPhrase(f){
  const rue = (f.adrRue||'').trim(), villeRaw = (f.adrVille||'').trim(), pays = (f.adrPays||'').trim();
  if (!rue && !villeRaw && !pays) return `${isMonacoAddr(f.adresse) ? 'résidant' : 'demeurant'} ${f.adresse}`;
  const m = /^(\d{5})\s+(.+)$/.exec(villeRaw), cp = m ? m[1] : '', ville = m ? m[2] : villeRaw;
  const np = norm(pays), isMC = np === 'monaco' || cp === '98000' || (!np && /^(monaco|monte.carlo)/.test(norm(ville)));
  const isFR = !isMC && (np === 'france' || (!np && !!cp) || (!np && !!ville));
  if (isMC) return `résidant ${[rue, aVille(ville || 'Monaco')].filter(Boolean).join(' ')}`;
  if (isFR) return `demeurant ${[rue, ville && aVille(ville) + (cp ? ` (${cp})` : '')].filter(Boolean).join(' ')}`;
  return `demeurant ${[rue && 'au ' + rue.replace(/^au\s+/i,''), ville && aVille(ville), enPays(pays)].filter(Boolean).join(' ')}`;
}
/* Filiation : « fils de » / « fille de » selon le sexe (« fils d'Antoine et de Marie ») */
function filPhrase(f){
  const t = f.filiation.trim(); if (/^(fils|fille|enfant)\s+d/i.test(t)) return t;
  const rest = t.replace(/^d(e\s+|')/i, ''), who = f.sexe==='F' ? 'fille' : f.sexe==='H' ? 'fils' : 'fils/fille';
  return `${who} ${/^[aeiouyhàâéèêîïôûAEIOUYHÀÂÉÈÊÎÏÔÛ]/.test(rest) ? "d'" : 'de '}${rest}`;
}
function mcText(f){
  const nom = (f.nom||'').toUpperCase(), cif = f.type === 'CIF';
  const parts = [[nom, f.prenom].filter(Boolean).join(' ') || 'Individu non identifié'];
  if (f.dateNaissance || f.lieuNaissance) parts.push((f.sexe==='F' ? 'née' : f.sexe==='H' ? 'né' : 'né(e)') + (f.dateNaissance ? ` le ${dateLettres(f.dateNaissance)}` : '') + (naisPhrase(f) ? ' ' + naisPhrase(f) : ''));
  if (cif && f.filiation) parts.push(filPhrase(f));
  if (f.nationalite) parts.push(`de nationalité ${f.nationalite.toLowerCase()}`);
  if (f.profession) parts.push(/^[A-ZÀ-Ý][a-zà-ÿ]/.test(f.profession) ? f.profession[0].toLowerCase() + f.profession.slice(1) : f.profession);
  if (f.adresse) parts.push(adrPhrase(f));
  if (isSDS(f)) parts.push('sans profession et sans adresse');
  let txt = parts.join(', ') + '.';
  if (cif && f.telephone) txt += ` Joignable au ${f.telephone}.`;
  txt += mcIdExtra(f);
  if (cif && f.docMode !== 'Sur dires' && (f.docType || f.docNumero)) { const dp = docPhrase(f); txt += `\n\nIdentité relevée sur ${dp.art}${dp.txt}` + (f.docNumero ? ` nº ${f.docNumero}` : '') + (f.docDate || f.docLieu ? (dp.art ? (dp.fem ? ' délivrée' : ' délivré') : ' délivré(e)') : '') + (f.docDate ? ` le ${f.docDate}` : '') + (f.docLieu ? ` ${lieuPhrase(f.docLieu)}` : '') + '.'; }
  const r = effRes(f); if (MC_RES[r]) txt += `\n\n${MC_RES[r][0].toUpperCase()}${MC_RES[r].slice(1)}.`;
  txt += mcExtra(f);
  if (f.ipm) { const ip = ipmPhrase(f); if (ip) txt += `\n\n${ip}`; }
  return txt;
}
/* IPM : signes extérieurs de l'ivresse relevés sur la fiche A, rédigés en phrase */
const etList = a => a.length > 1 ? a.slice(0,-1).join(', ') + ' et ' + a[a.length-1] : (a[0] || '');
const ALLURE_ADJ = {'Bien éveillé':'bien éveillée','Somnolent':'somnolente','Abattu':'abattue','Tremblant':'tremblante'};
const ALLURE_NOM = {'Hoquets':'des hoquets','Vomissements':'des vomissements','Présence déjections':'la présence de déjections','Vêtements désordonnés':'des vêtements désordonnés','Vêtements ordonnés':'des vêtements ordonnés'};
function ipmPhrase(f){
  const sel = k => f.ipmSel?.[k] || [], lc = x => x.toLowerCase(), items = [];
  const elo = sel('elocution').map(x => x === 'Ne parle pas' ? 'inexistante' : lc(x));
  if (elo.length) items.push(`une élocution ${etList(elo)}`);
  const al = sel('allure'), adj = al.filter(x=>ALLURE_ADJ[x]).map(x=>ALLURE_ADJ[x]), nom = al.filter(x=>ALLURE_NOM[x]).map(x=>ALLURE_NOM[x]);
  if (adj.length || nom.length) items.push(adj.length ? `une allure ${etList(adj)}${nom.length ? `, avec ${etList(nom)}` : ''}` : etList(nom));
  if (sel('visage').length) items.push(`un visage ${etList(sel('visage').map(lc))}`);
  for (const h of sel('haleine')) items.push(h === 'Sentant l\'alcool' ? 'une haleine sentant l\'alcool' : `une odeur de l'haleine ${lc(h)}`);
  const yeux = sel('regard').filter(x=>/^Yeux/.test(x)).map(x=>lc(x.slice(5)));
  if (yeux.length) items.push(`les yeux ${etList(yeux)}`);
  if (sel('regard').includes('Anormal')) items.push('un regard anormal');
  const ex = sel('explications').filter(x => x !== 'Ne parle pas' || !sel('elocution').includes('Ne parle pas'));
  if (ex.length) items.push(ex.length === 1 && ex[0] === 'Ne parle pas' ? 'aucune explication' : `des explications ${etList(ex.filter(x=>x!=='Ne parle pas').map(lc))}`);
  if (!items.length) return '';
  return `Lors du contrôle, ${f.sexe==='F' ? 'l\'intéressée' : 'l\'intéressé'} présentait tous les signes extérieurs de l'ivresse, à savoir : ${etList(items)}.`;
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
/* Motif « Accident du travail » : ouvre le bloc correspondant */
$('#motifChips').addEventListener('click', e=>{ const b = e.target.closest('[data-motif]'); if (b && b.dataset.motif === 'Accident du travail' && norm($('#f_motif').value) === norm('Accident du travail') && !$('#f_at').checked) { $('#f_at').checked = true; syncAT(); } });

/* ---------- Brouillon : reprendre un contrôle fermé sans enregistrer ----------
   Le formulaire en cours est copié (chiffré) toutes les secondes de saisie, à la sortie de l'appli
   et au verrouillage. Il disparaît dès que la fiche est enregistrée ou que tu l'ignores. */
let DRAFT = null, draftT = null;
function snapshot(){
  const f = structuredClone(EDIT.f);
  for (const k of FIELDS) f[k] = $('#f_'+k).value.trim();
  f.type = segVal('typeSeg'); f.docMode = segVal('docSeg');
  f.accident = $('#f_accident').checked; for (const [k] of MEMO) f[k] = $('#f_'+k).checked;
  f.at = $('#f_at').checked; f.ceea = $('#f_ceea').checked; f.ipm = $('#f_ipm').checked;
  f.verif = $('#f_verif').classList.contains('on'); f.signa = $('#f_signa').checked; f.signaAn = f.signa ? $('#f_signaAn').value : '';
  readVehicles(); f.vehicules = structuredClone(EDIT.f.vehicules);
  return {f, isNew:EDIT.isNew, added:[...EDIT.added], removed:[...EDIT.removed], at:Date.now()};
}
const draftKey = f => JSON.stringify([FIELDS.filter(k=>k!=='dateHeure').map(k=>f[k]||''), f.type, f.accident||false, MEMO.map(([k])=>!!f[k]), !!f.at, !!f.ceea, !!f.ipm, JSON.stringify(f.ipmSel||{}), AT_EPI.map(([k])=>f[k]||''), !!f.verif, !!f.signa, f.signaAn||'', (f.vehicules||[]).map(v=>[v.type||'',v.pays||'',...VEH_FIELDS.map(([k])=>v[k]||'')]), f.photos||[]]);
function isDirty(snap){
  const f = snap.f;
  if (snap.isNew) return FIELDS.some(k=>k!=='dateHeure' && k!=='lieuControle' && f[k]) || (f.photos||[]).length > 0 || (f.vehicules||[]).some(v=>VEH_FIELDS.some(([k])=>v[k])) || !!f.accident || !!f.at || !!f.ceea || !!f.ipm || !!f.verif || !!f.signa;
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

/* ---------- v1.0.0 : affichage, clavier, navigation entre fiches ---------- */
document.head.insertAdjacentHTML('beforeend', `<style>
#sg{max-height:260px}
.glink svg{width:30px;height:30px;padding:5px;margin-top:-15px;background:#111;border:2px solid #e6e6e6;color:#fff;box-shadow:0 0 0 3px rgba(0,0,0,.55)}
.card.nc{opacity:.5;padding-top:7px;padding-bottom:3px}
.card.nc .name{font-size:15px}
.card.nc .sub{font-size:13px;margin-top:2px}
.card.nc .note{display:none}
.card.nc .thumb{width:40px;height:40px}
</style>`);
/* Nom de famille : ni correction ni suggestion orthographique du clavier */
['autocorrect','autocomplete'].forEach(a=>$('#f_nom').setAttribute(a,'off')); $('#f_nom').spellcheck = false;
/* Fiche ouverte : glisser vers la gauche = fiche suivante, vers la droite = fiche précédente (ordre de la liste) */
(()=>{
  const el = $('#detail'); let sx = 0, sy = 0, st = 0, on = false;
  el.addEventListener('touchstart', e=>{ on = e.touches.length === 1 && !e.target.closest('select,a,.ph'); if (!on) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now(); }, {passive:true});
  el.addEventListener('touchend', async e=>{
    if (!on || !DETAIL) return; on = false;
    const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) < 70 || Math.abs(dx) < 1.6 * Math.abs(dy) || Date.now() - st > 900) return;
    const ids = (window.visibleIds||[]).filter(id=>FICHES.some(x=>x.id===id)), i = ids.indexOf(DETAIL); if (i < 0) return;
    const dir = dx < 0 ? 1 : -1, j = i + dir;
    if (j < 0 || j >= ids.length) return toast(dir > 0 ? 'Dernière fiche de la liste' : 'Première fiche de la liste');
    await openDetail(FICHES.find(x=>x.id===ids[j]));
    $('#detBody').animate?.([{transform:`translateX(${dir*60}px)`, opacity:.2},{transform:'none', opacity:1}], {duration:200, easing:'ease-out'});
    toast(`Fiche ${j+1} / ${ids.length}`);
  }, {passive:true});
})();

/* ---------- v1.0.1 : fiche en image JPG ----------
   La fiche est dessinée sur le téléphone (bibliothèque html2canvas, téléchargée une fois puis gardée) : rien n'est envoyé. */
const H2C_URLS = ['https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js','https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js'];
let h2cLoading = null;
function loadH2C(){
  if (window.html2canvas) return Promise.resolve(window.html2canvas);
  return h2cLoading ||= (async ()=>{
    let txt = await dbGet('meta','h2c').catch(()=>null);
    if (!txt) {
      for (const u of H2C_URLS) { try { const r = await fetch(u); if (r.ok) { txt = await r.text(); break; } } catch {} }
      if (!txt) throw new Error('offline');
      await dbPut('meta', txt, 'h2c').catch(()=>{});
    }
    const url = URL.createObjectURL(new Blob([txt], {type:'text/javascript'}));
    await new Promise((res,rej)=>{ const sc = document.createElement('script'); sc.src = url; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); });
    URL.revokeObjectURL(url);
    if (!window.html2canvas) throw new Error('h2c');
    return window.html2canvas;
  })().catch(e=>{ h2cLoading = null; throw e; });
}
async function ficheJPG(f){
  const h2c = await loadH2C(), was = DETAIL;
  await openDetail(f);
  const bg = getComputedStyle($('#detail')).backgroundColor || '#1c1c1c';
  const box = document.createElement('div');
  box.style.cssText = `position:fixed;left:-10000px;top:0;width:430px;background:${bg};color:#f2f2f2;padding:10px 14px 18px;box-sizing:border-box`;
  box.innerHTML = `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:15px;font-weight:600;padding:2px 2px 8px;border-bottom:1px solid #333">${$('#detTitle').innerHTML}</div>` + $('#detBody').innerHTML;
  box.querySelectorAll('select').forEach(x=>x.remove());
  if (!f.verif) box.querySelector('#detVerif')?.remove();
  box.querySelectorAll('.chip').forEach(x=>{ for (const n of x.childNodes) if (n.nodeType === 3) n.textContent = n.textContent.replace(/\s*[▾›]\s*$/,''); });
  document.body.appendChild(box);
  try {
    await Promise.all([...box.querySelectorAll('img')].map(i=>i.complete ? 0 : new Promise(r=>{ i.onload = i.onerror = r; })));
    const c = await h2c(box, {backgroundColor:bg, scale:2, logging:false});
    return await new Promise((res,rej)=>c.toBlob(b=>b ? res(b) : rej(new Error('jpeg')), 'image/jpeg', .9));
  } finally {
    box.remove();
    if (!was) closeDetail(); else if (was !== f.id) { const w = FICHES.find(x=>x.id===was); if (w) await openDetail(w); }
  }
}
async function shareJPG(list){
  toast('Préparation de l\'image…');
  let files = [];
  try {
    for (const f of list) files.push(new File([await ficheJPG(f)], `${((f.nom||'fiche')+'_'+(f.prenom||'')).replace(/[^\w-]+/g,'_')}.jpg`, {type:'image/jpeg'}));
  } catch { return toast('Image impossible : il faut du réseau la première fois'); }
  const go = () => navigator.share({files, title:list.map(ficheSubject).join(' / ')});
  if (!(navigator.canShare && navigator.canShare({files}))) {
    for (const fl of files) { const a = document.createElement('a'); a.href = URL.createObjectURL(fl); a.download = fl.name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 5000); }
    return;
  }
  try { await go(); }
  catch (e) {
    if (e.name === 'AbortError') return;
    /* iOS refuse parfois le partage après le calcul de l'image : on redemande un appui */
    if (await ask(files.length > 1 ? `${files.length} images prêtes.` : 'Image prête.', 'Partager', false)) go().catch(()=>{});
  }
}
(()=>{ const c = document.querySelector('#shareSheet [data-sh=cancel]'); if (c) c.insertAdjacentHTML('beforebegin', `<button data-sh="jpg"><b>Fiche en image (JPG)</b><small>Telle qu'elle s'affiche dans l'appli</small></button>`); })();

/* ---------- v1.0.2 : Service du jour sur l'écran de déverrouillage ----------
   Carré à gauche : photo de la feuille de service. À droite : missions du jour (début – fin : mission).
   Visible avant le code, donc gardé sur le téléphone SANS chiffrement (aucune fiche n'y figure).
   DPU / SPG : effacé à minuit · DPU / SN : effacé à midi. */
document.head.insertAdjacentHTML('beforeend', `<style>
#lock{flex-direction:column;gap:16px}
#lock.svcOn img#lockIcon{height:110px;margin-bottom:14px}
#lsvc{width:100%;max-width:340px;display:flex;gap:10px;text-align:left}
#lsvc .sq{flex:0 0 118px;height:118px;border-radius:14px;overflow:hidden;background:#1d1d1d;border:1px solid #3a3a3a;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:12px;text-align:center;line-height:1.3;padding:0}
#lsvc .sq img{width:100%;height:100%;object-fit:cover;margin:0;filter:none}
#lsvc .ms{flex:1;min-width:0;border-radius:14px;background:#1d1d1d;border:1px solid #3a3a3a;padding:8px 10px;display:flex;flex-direction:column;gap:4px}
#lsvc .mh{display:flex;justify-content:space-between;align-items:center;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
#lsvc .mh button{border:0;background:none;color:#cfcfcf;font-size:13px;padding:0 2px;letter-spacing:0;text-transform:none}
#lsvc .mi{font-size:13px;line-height:1.25;padding:4px 6px;border-radius:7px;background:#262626}
#lsvc .mi span{overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
#lsvc .mi.now{background:#f2f2f2;color:#111;font-weight:600}
#lsvc .none{font-size:12px;color:var(--muted);margin:auto 0}
#svcEd,#svcView{position:fixed;inset:0;z-index:60;background:var(--bg)}
#svcView{background:#000;display:flex;align-items:center;justify-content:center}
#svcView img{max-width:100%;max-height:100%}
#svcEd{overflow-y:auto;padding:calc(env(safe-area-inset-top) + 12px) 16px calc(env(safe-area-inset-bottom) + 24px)}
#svcEd h3{margin:4px 0 10px;font-size:20px}
#svcEd .seg{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#svcEd .seg button{border:1px solid #444;background:#202020;color:var(--muted);border-radius:10px;padding:10px 4px;font-size:14px;line-height:1.25}
#svcEd .seg button.on{background:#f2f2f2;color:#111;border-color:#f2f2f2;font-weight:700}
#svcEd .row{display:flex;align-items:center;gap:8px;padding:9px 10px;margin-top:6px;border-radius:10px;background:#232323;font-size:15px}
#svcEd .row span{flex:1}
#svcEd .row button{border:0;background:none;color:inherit;opacity:.6;font-size:18px}
#svcEd .add{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px}
#svcEd .add input{min-width:0}
#svcEd .add #svcT{grid-column:1/-1}
#svcEd .btns{display:flex;gap:8px;margin-top:10px}
#svcEd .btns button{flex:1;border:1px solid #444;background:#202020;color:inherit;border-radius:10px;padding:11px 6px;font-size:15px}
#svcEd .sect{margin-top:18px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
#modal{z-index:80}
</style>`);
$('#lock').insertAdjacentHTML('afterbegin', '<div id="lsvc"></div>');
document.body.insertAdjacentHTML('beforeend', '<input type="file" id="svcFile" accept="image/*" hidden><div id="svcEd" class="hidden"></div><div id="svcView" class="hidden"><img alt=""></div>');
let SVC = {items:[]}, svcUrl = '';
const hm = t => String(t||'').replace(':','h');
const nowHM = () => new Date().toTimeString().slice(0,5);
const isNow = (it, n) => it.d && (!it.f ? n >= it.d : it.f > it.d ? n >= it.d && n < it.f : n >= it.d || n < it.f);
const svcSorted = () => [...SVC.items].sort((a,b)=>(a.d||'').localeCompare(b.d||''));
const svcLine = it => `${esc(hm(it.d))}${it.f ? ' – ' + esc(hm(it.f)) : ''} : ${esc(it.t)}`;
async function svcLoad(){ SVC = await dbGet('meta','svc').catch(()=>null) || {items:[]}; SVC.items ||= []; svcSetUrl(); }
function svcSetUrl(){ if (svcUrl) URL.revokeObjectURL(svcUrl); svcUrl = SVC.photo ? URL.createObjectURL(new Blob([SVC.photo], {type:'image/jpeg'})) : ''; }
async function svcSave(){ await dbPut('meta', SVC, 'svc').catch(()=>{}); }
const svcTouch = () => { if (!SVC.start) SVC.start = Date.now(); };
function svcExpired(){
  if (!SVC.type || !SVC.start) return false;
  const d = new Date(SVC.start), b = new Date(SVC.start);
  if (SVC.type === 'SN') { b.setHours(12,0,0,0); if (b <= d) b.setDate(b.getDate()+1); } else b.setHours(24,0,0,0);
  return Date.now() >= b.getTime();
}
async function svcReset(){ SVC = {items:[], type:SVC.type}; svcSetUrl(); await svcSave(); }
async function renderLockSvc(){
  if (svcExpired()) await svcReset();
  const el = $('#lsvc'), n = nowHM(), items = svcSorted(), cur = items.find(it=>isNow(it, n));
  /* Au plus 3 missions affichées : la mission en cours et les suivantes en priorité */
  const ci = cur ? items.indexOf(cur) : items.findIndex(it=>(it.d||'') > n), start = Math.max(0, Math.min(ci < 0 ? items.length - 3 : ci, items.length - 3));
  const shown = items.slice(start, start + 3);
  const lbl = SVC.type === 'SN' ? 'DPU / SN' : SVC.type === 'SPG' ? 'DPU / SPG' : 'Missions du jour';
  el.innerHTML = `<button type="button" class="sq" data-ls="photo">${svcUrl ? `<img src="${svcUrl}" alt="Service du jour">` : '📷<br>Service<br>du jour'}</button>
    <div class="ms"><div class="mh"><span>${lbl}</span><button type="button" data-ls="edit">✎ Modifier</button></div>
    ${shown.length ? shown.map(it=>`<div class="mi${it===cur?' now':''}"><span>${svcLine(it)}</span></div>`).join('') : '<div class="none">Aucune mission. Touche « Modifier » pour les ajouter.</div>'}</div>`;
  $('#lock').classList.add('svcOn');
}
function renderSvcEd(){
  const n = nowHM(), items = svcSorted();
  $('#svcEd').innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between"><h3>Service du jour</h3><button type="button" class="btn" data-se="close" style="width:auto;padding:8px 16px">Terminé</button></div>
    <div class="seg"><button type="button" data-se="type" data-t="SPG" class="${SVC.type==='SPG'?'on':''}">DPU / SPG<br><small>effacé à minuit</small></button><button type="button" data-se="type" data-t="SN" class="${SVC.type==='SN'?'on':''}">DPU / SN<br><small>effacé à midi</small></button></div>
    <div class="sect">Feuille de service</div>
    ${svcUrl ? `<img src="${svcUrl}" alt="" data-se="view" style="display:block;width:100%;max-height:260px;object-fit:contain;margin-top:8px;border-radius:10px;background:#000">` : ''}
    <div class="btns"><button type="button" data-se="photo">📷 ${svcUrl ? 'Changer la photo' : 'Prendre la feuille en photo'}</button>${svcUrl ? '<button type="button" data-se="rmphoto">Retirer</button>' : ''}</div>
    <div class="sect">Missions</div>
    ${items.map(it=>`<div class="row"${isNow(it, n)?' style="background:#f2f2f2;color:#111"':''}><span><b>${esc(hm(it.d))}${it.f ? ' – ' + esc(hm(it.f)) : ''}</b> : ${esc(it.t)}</span><button type="button" data-se="del" data-i="${SVC.items.indexOf(it)}" aria-label="Supprimer">✕</button></div>`).join('')}
    <div class="add"><input type="time" id="svcD" aria-label="Heure de début"><input type="time" id="svcF" aria-label="Heure de fin"><input id="svcT" placeholder="Mission (ex. ronde secteur X)" autocomplete="off"></div>
    <div class="btns"><button type="button" data-se="add"><b>+ Ajouter la mission</b></button></div>
    <div class="btns" style="margin-top:22px"><button type="button" data-se="reset" style="color:#ff8a80">Nouveau service (tout effacer)</button></div>`;
}
function openSvcEd(){ renderSvcEd(); $('#svcEd').classList.remove('hidden'); }
$('#lsvc').addEventListener('click', e=>{
  const b = e.target.closest('[data-ls]'); if (!b) return;
  if (b.dataset.ls === 'edit') return openSvcEd();
  if (svcUrl) { $('#svcView img').src = svcUrl; $('#svcView').classList.remove('hidden'); } else $('#svcFile').click();
});
$('#svcView').onclick = ()=>$('#svcView').classList.add('hidden');
$('#svcEd').addEventListener('click', async e=>{
  const b = e.target.closest('[data-se]'); if (!b) return; const a = b.dataset.se;
  if (a === 'close') { $('#svcEd').classList.add('hidden'); return renderLockSvc(); }
  if (a === 'view') { $('#svcView img').src = svcUrl; $('#svcView').classList.remove('hidden'); return; }
  if (a === 'type') { SVC.type = SVC.type === b.dataset.t ? '' : b.dataset.t; svcTouch(); await svcSave(); return renderSvcEd(); }
  if (a === 'photo') return $('#svcFile').click();
  if (a === 'rmphoto') { if (!await ask('Retirer la photo du service ?', 'Retirer')) return; SVC.photo = null; svcSetUrl(); await svcSave(); return renderSvcEd(); }
  if (a === 'del') { SVC.items.splice(+b.dataset.i, 1); await svcSave(); return renderSvcEd(); }
  if (a === 'add') {
    const d = $('#svcD').value, f = $('#svcF').value, t = $('#svcT').value.trim();
    if (!d || !t) return toast('Indique au moins l\'heure de début et la mission');
    SVC.items.push({d, f, t}); svcTouch(); await svcSave(); renderSvcEd(); return;
  }
  if (a === 'reset') { if (!await ask('Effacer la feuille et toutes les missions du service ?', 'Effacer')) return; await svcReset(); renderSvcEd(); }
});
$('#svcFile').onchange = async e=>{
  const file = e.target.files[0]; e.target.value = ''; if (!file) return;
  try { SVC.photo = await (await shrink(file, 2200, .85)).arrayBuffer(); svcTouch(); svcSetUrl(); await svcSave(); if (!$('#svcEd').classList.contains('hidden')) renderSvcEd(); renderLockSvc(); toast(SVC.type ? 'Photo du service enregistrée' : 'Photo enregistrée : choisis DPU / SPG ou DPU / SN dans « Modifier »'); }
  catch { toast('La photo n’a pas pu être lue'); }
};
{ const _sl = showLock; showLock = function(setup){ _sl(setup); svcLoad().then(renderLockSvc).catch(()=>{}); }; }
/* Ancien emplacement (v1.0.1, sur l'accueil et chiffré) : on reprend la feuille et les consignes une fois déverrouillé */
{ const _oa = openApp; openApp = async function(){ await _oa(); const o = LEARN.svc; if (!o) return;
  try { await svcLoad(); if (!SVC.items.length && !SVC.photo) { SVC = {items:o.items||[], type:o.type||'', start:o.start}; if (o.photo) { const buf = await photoBuf(o.photo); if (buf) SVC.photo = buf; } svcSetUrl(); await svcSave(); }
    if (o.photo) await removePhoto(o.photo).catch(()=>{}); delete LEARN.svc; await saveLearn(); } catch {} }; }
setInterval(()=>{ if (!$('#lock').classList.contains('hidden') && $('#svcEd').classList.contains('hidden')) renderLockSvc(); }, 60000);

/* ---------- v1.0.3 : écran verrouillé (ni zoom, ni glissement latéral) ----------
   Seul le défilement vertical est permis. Le zoom reste possible sur les photos en plein écran. */
(()=>{
  const vp = document.querySelector('meta[name=viewport]'), VP = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
  if (vp) vp.content = VP;
  document.head.insertAdjacentHTML('beforeend', `<style>
html,body{overflow-x:hidden;max-width:100%;overscroll-behavior-x:none;touch-action:pan-y;-webkit-text-size-adjust:100%;text-size-adjust:100%}
.sheet,.sheet .body,#list,#app,#lock,#svcEd{overflow-x:hidden;touch-action:pan-y}
.switch{position:relative;overflow:hidden}
input,select,textarea{min-width:0;max-width:100%}
#viewer,#viewer *,#svcView,#svcView *{touch-action:pinch-zoom pan-x pan-y}
</style>`);
  const inViewer = t => !!(t && t.closest && t.closest('#viewer,#svcView'));
  ['gesturestart','gesturechange'].forEach(ev=>document.addEventListener(ev, e=>{ if (!inViewer(e.target)) e.preventDefault(); }, {passive:false}));
  document.addEventListener('touchmove', e=>{ if (e.touches.length > 1 && !inViewer(e.target)) e.preventDefault(); }, {passive:false});
  /* Double tap : déjà neutralisé par touch-action:pan-y */
  /* En quittant une photo zoomée : retour à l'échelle normale */
  const unzoom = () => { if (!vp) return; vp.content = VP.replace('maximum-scale=1', 'maximum-scale=1.01'); setTimeout(()=>{ vp.content = VP; }, 60); window.scrollTo(0, window.scrollY); };
  ['#viewer','#svcView'].forEach(s=>$(s)?.addEventListener('click', unzoom));
})();

/* ---------- v1.0.4 : responsable légal, tutelle, SDS, VERIF et antécédents ---------- */
FIELDS.push('respLegal','tuteur','permCap'); ID_FIELDS.push('tuteur');
const ANT_TYPES = [['GAV','Garde à vue','ayant donné lieu à un placement en garde à vue'],['INC','Incarcération','ayant donné lieu à une incarcération'],['CDN','Condamnation','ayant donné lieu à une condamnation'],['MEX','Mise en examen','ayant donné lieu à une mise en examen'],['AUT','Autre','']];
SG_BASE.antMotif = ['vol','vol avec violences','violences volontaires','violences conjugales','usage de stupéfiants','trafic de stupéfiants','escroquerie','recel','cambriolage','dégradations','outrage','rébellion','menaces','harcèlement','port d\'arme prohibée','conduite sous l\'empire d\'un état alcoolique','conduite sans permis','agression sexuelle','viol','abus de confiance','faux et usage de faux'];
const isSDS = f => !!(f.nom || f.prenom) && !String(f.adresse||'').trim() && !String(f.profession||'').trim();
const SDS_BADGE = '<span class="badge" style="background:#5c5c5c;color:#fff">SDS</span>';
const TUT_BADGE = '<span class="badge" style="background:#8a6d3b;color:#fff">TUTELLE</span>';
const antOK = f => f.antec ? (f.antList||[]).filter(a=>a.y || a.m) : [];
document.head.insertAdjacentHTML('beforeend', `<style>
#antList .ar{display:grid;grid-template-columns:1fr 84px 40px;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid var(--line)}
#antList .ar:first-child{border-top:0;padding-top:0}
#antList .ar input[data-a=m]{grid-column:1/3}
#antList .ar button{border:0;background:none;color:inherit;opacity:.6;font-size:18px}
#antBlock,#tutBlock{border-left-color:#8a6d3b}
</style>`);
(()=>{
  $('#ageHint').insertAdjacentHTML('afterend', `<div id="respBox" class="hidden"><label class="f" for="f_respLegal">Responsable légal</label><input id="f_respLegal" autocomplete="off" spellcheck="false" placeholder="Nom, prénom, lien (père, mère…), téléphone"></div>`);
  $('#adrHint').insertAdjacentHTML('afterend', `<label class="switch"><input type="checkbox" id="f_tutelle"><span class="sw"></span><span class="swl">Sous tutelle</span></label>
    <div id="tutBlock" class="accblock hidden"><label class="f" for="f_tuteur" style="margin-top:4px">Tuteur</label><input id="f_tuteur" autocomplete="off" spellcheck="false" placeholder="Nom du tuteur ou de l'organisme"></div>`);
  $('#f_verif').parentNode.insertAdjacentHTML('afterend', `<div id="permBox" class="hidden"><label class="f" for="f_permCap">Permanence judiciaire — capitaine de police</label><input id="f_permCap" autocomplete="off" spellcheck="false" placeholder="Nom (XXXX si vide)"></div>
    <label class="switch"><input type="checkbox" id="f_antec"><span class="sw"></span><span class="swl">Antécédents judiciaires</span></label>
    <div id="antBlock" class="accblock hidden"><div id="antList"></div><button type="button" class="addveh" id="antAdd">+ Ajouter un antécédent</button></div>`);
})();
function renderAnt(){
  const L = EDIT?.f.antList || [];
  $('#antList').innerHTML = L.map((a,i)=>`<div class="ar" data-i="${i}"><select data-a="t" aria-label="Type">${ANT_TYPES.map(([c,n])=>`<option value="${c}" ${a.t===c?'selected':''}>${n}</option>`).join('')}</select>
    <input data-a="y" inputmode="numeric" maxlength="4" placeholder="Année" value="${esc(a.y||'')}" autocomplete="off">
    <button type="button" data-rmant="${i}" aria-label="Retirer">✕</button>
    <input data-a="m" data-sg="antMotif" placeholder="Motif (ex. vol, violences…)" value="${esc(a.m||'')}" autocomplete="off" spellcheck="false"></div>`).join('');
}
function readAnt(){ if (!EDIT) return; EDIT.f.antList = [...document.querySelectorAll('#antList .ar')].map(r=>({t:r.querySelector('[data-a=t]').value, y:r.querySelector('[data-a=y]').value.replace(/\D/g,'').slice(0,4), m:r.querySelector('[data-a=m]').value.trim()})); }
function syncNew(){
  if (!EDIT) return;
  const a = ageOf({dateNaissance:$('#f_dateNaissance').value, dateHeure:$('#f_dateHeure').value});
  $('#respBox').classList.toggle('hidden', !((a !== null && a < 18) || $('#f_respLegal').value.trim()));
  $('#tutBlock').classList.toggle('hidden', !$('#f_tutelle').checked);
  $('#permBox').classList.toggle('hidden', !EDIT.f.verif);
  $('#antBlock').classList.toggle('hidden', !$('#f_antec').checked);
  for (const id of ['#f_tutelle','#f_antec']) $(id).closest('.switch').style.borderColor = $(id).checked ? '#c9a227' : '';
}
$('#f_tutelle').addEventListener('change', e=>{ if (EDIT) EDIT.f.tutelle = e.target.checked; syncNew(); if (e.target.checked) $('#f_tuteur').focus(); });
$('#f_antec').addEventListener('change', e=>{ if (!EDIT) return; EDIT.f.antec = e.target.checked; EDIT.f.antList ||= []; if (e.target.checked && !EDIT.f.antList.length) { EDIT.f.antList.push({t:'GAV', y:'', m:''}); renderAnt(); } syncNew(); });
$('#antAdd').onclick = ()=>{ readAnt(); EDIT.f.antList.push({t:'GAV', y:'', m:''}); renderAnt(); draftSoon(); };
$('#antList').addEventListener('click', e=>{ const b = e.target.closest('[data-rmant]'); if (!b) return; readAnt(); EDIT.f.antList.splice(+b.dataset.rmant, 1); renderAnt(); draftSoon(); });
['input','change'].forEach(ev=>$('#antList').addEventListener(ev, readAnt));
{ const _sa = syncAge; syncAge = function(){ _sa(); syncNew(); }; }
{ const _se = syncExtra; syncExtra = function(){ _se(); syncNew(); }; }
{ const _of = openForm; openForm = function(f, d){ _of(f, d); EDIT.f.antList ||= []; $('#f_tutelle').checked = !!EDIT.f.tutelle; $('#f_antec').checked = !!EDIT.f.antec; renderAnt(); syncNew(); }; }
{ const _ii = idInherit; idInherit = function(src){ _ii(src); if (!EDIT) return; if ($('#f_tuteur').value.trim()) { EDIT.f.tutelle = true; $('#f_tutelle').checked = true; } syncNew(); }; }
{ const _cf = closeForm; closeForm = async function(save){
  if (save && EDIT) {
    readAnt(); EDIT.f.tutelle = $('#f_tutelle').checked; EDIT.f.antec = $('#f_antec').checked;
    if (!EDIT.f.tutelle) $('#f_tuteur').value = '';
    if (!$('#f_verif').classList.contains('on')) $('#f_permCap').value = '';
    EDIT.f.antList = EDIT.f.antec ? EDIT.f.antList.filter(a=>a.y || a.m) : [];
    if (!EDIT.f.antList.length) EDIT.f.antec = false;
  }
  return _cf(save);
}; }
/* Badges SDS / TUTELLE dans la liste et la fiche */
const extraBadges = f => (isSDS(f) ? SDS_BADGE : '') + (f.tutelle ? TUT_BADGE : '');
const addBadges = (el, f) => { const b = extraBadges(f); if (!b || !el) return; const last = [...el.querySelectorAll('.badge')].pop(); last ? last.insertAdjacentHTML('afterend', b) : el.insertAdjacentHTML('afterbegin', b); };
{ const _r = render; render = function(){ _r(); document.querySelectorAll('#list .card[data-id]').forEach(c=>{ const f = FICHES.find(x=>x.id===c.dataset.id); if (f) addBadges(c.querySelector('.name'), f); }); }; }
const antLabel = a => [ANT_TYPES.find(t=>t[0]===a.t)?.[1], a.y].filter(Boolean).join(' ');
const sitRows = f => [['Responsable légal', f.respLegal], ['Sous tutelle', f.tutelle ? (f.tuteur ? `oui — tuteur : ${f.tuteur}` : 'oui') : ''], ['Situation', isSDS(f) ? 'SDS — sans profession et sans adresse' : ''],
  ...antOK(f).map((a,i)=>[`Antécédent ${i+1}`, [antLabel(a), a.m].filter(Boolean).join(' — ')]), ['Permanence judiciaire', f.verif && f.permCap ? `Capitaine de police ${f.permCap}` : '']];
{ const _od = openDetail; openDetail = async function(f){ await _od(f); if (DETAIL !== f.id) return; addBadges($('#detTitle'), f);
  const html = panel('Situation', sitRows(f)); if (!html) return;
  const id = [...$('#detBody').querySelectorAll('section.panel')].find(s=>s.querySelector('h4 span')?.textContent === 'Identité');
  id ? id.insertAdjacentHTML('afterend', html) : $('#detBody .hero')?.insertAdjacentHTML('afterend', html); }; }
{ const _fs = ficheSections; ficheSections = function(f){ const S = _fs(f), rows = sitRows(f).filter(r=>r[1]); if (rows.length) { const i = S.findIndex(x=>x[0]==='Identité'); S.splice(i < 0 ? S.length : i+1, 0, ['Situation', rows]); } return S; }; }
/* Main courante */
function mcIdExtra(f){
  const F = f.sexe==='F', le = F ? "L'intéressée" : "L'intéressé", e = F ? 'e' : '';
  let t = '';
  if (f.respLegal && isMinor(f)) t += ` ${le} étant mineur${e}, son responsable légal est ${f.respLegal}.`;
  else if (f.respLegal) t += ` Responsable légal : ${f.respLegal}.`;
  if (f.tutelle) t += ` ${le} est placé${e} sous tutelle${f.tuteur ? `, son tuteur étant ${f.tuteur}` : ''}.`;
  return t;
}
const lcFirst = s => /^[A-ZÀ-Ý][a-zà-ÿ]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
function mcExtra(f){
  const ants = antOK(f); if (!ants.length && !f.verif) return '';
  const F = f.sexe==='F', le = F ? "l'intéressée" : "l'intéressé", e = F ? 'e' : '';
  const items = ants.map((a,i)=>{
    const m = lcFirst(a.m||''), de = /^[aeiouyhàâéèêîïôû]/i.test(m) ? "d'" : 'de ';
    const head = m ? (i ? de : 'des faits ' + de) + m : (i ? 'de faits' : 'des faits') + ' non précisés';
    const tp = ANT_TYPES.find(t=>t[0]===a.t)?.[2];
    return head + (a.y ? ` en ${a.y}` : '') + (tp ? `, ${tp}` : '');
  });
  let t = `\n\nInterrogé${e} sur d'éventuels antécédents judiciaires, ${le} nous répondait d'initiative être défavorablement connu${e} des services de police${items.length ? ' pour ' + (items.length > 1 && items.some(x=>x.includes(',')) ? items.slice(0,-1).join(', ') + ', et ' + items[items.length-1] : etList(items)) : ''}.`;
  if (f.verif) t += ` Fort de ces éléments, nous avisions le service de la permanence judiciaire en la personne du capitaine de police ${f.permCap || 'XXXX'}. Sur ces instructions, ${le} était invité${e} à nous suivre en nos locaux à des fins de vérification d'identité.`;
  return t;
}

/* ---------- v1.0.7 : Diffusion (personnes recherchées) ----------
   Répertoire chiffré (gardé avec les suggestions, donc dans la sauvegarde) : nom, prénom, date de naissance, photo.
   Une fiche dont le nom (ou l'identité complète) correspond est signalée en rouge. */
const diffList = () => LEARN.diff || [];
function diffMatches(f){
  const n = norm(f.nom); if (!n) return [];
  return diffList().filter(d=>norm(d.nom) === n).map(d=>({d, full: !!norm(d.prenom) && norm(d.prenom) === norm(f.prenom) && (!d.dn || !f.dateNaissance || d.dn === f.dateNaissance)})).sort((a,b)=>b.full - a.full);
}
const diffMatch = f => diffMatches(f)[0] || null;
const diffName = d => [(d.nom||'').toUpperCase(), d.prenom].filter(Boolean).join(' ');
const WANTED_BADGE = '<span class="badge" style="background:#e01b1b;color:#fff;letter-spacing:.04em">RECHERCHÉ</span>';
const WANTED2_BADGE = '<span class="badge" style="background:transparent;color:#ff6b6b;border:1px solid #e01b1b">NOM DIFFUSÉ</span>';
document.head.insertAdjacentHTML('beforeend', `<style>
.card.wanted{box-shadow:inset 5px 0 0 #e01b1b;background:rgba(92,12,12,.72)}
.card.wanted2{box-shadow:inset 5px 0 0 #e01b1b}
.dalert{display:flex;align-items:center;gap:10px;margin-top:8px;padding:10px 12px;border-radius:12px;border:2px solid #e01b1b;background:#4a0d0d;color:#fff;font-size:15px;line-height:1.3}
.dalert.part{background:#2a1212;border-width:1px}
.dalert img,.dalert .noph{flex:0 0 54px;width:54px;height:54px;border-radius:8px;object-fit:cover;background:#000;display:flex;align-items:center;justify-content:center;font-size:22px}
.dalert b{color:#ff8a8a;letter-spacing:.03em}
#diffList .drow{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)}
#diffList .drow img,#diffList .drow .noph{flex:0 0 52px;width:52px;height:52px;border-radius:8px;object-fit:cover;background:#000;display:flex;align-items:center;justify-content:center;font-size:20px}
#diffList .drow .dn{flex:1;min-width:0}
#diffList .drow small{color:var(--muted)}
#diffList .drow button{border:0;background:none;color:inherit;opacity:.7;padding:8px}
#diffList .drow button svg{width:22px;height:22px}
</style>`);
function diffAlertHTML(list){
  return list.map(({d, full})=>`<div class="dalert${full?'':' part'}">${d.photo ? `<img data-dph="${d.photo}" alt="">` : '<span class="noph">👤</span>'}<span>${full ? '<b>⚠ PERSONNE RECHERCHÉE</b>' : '<b>⚠ NOM DIFFUSÉ</b> — vérifier l\'identité'}<br>${esc(diffName(d))}${d.dn ? ` · né(e) le ${esc(d.dn)}` : ''}</span></div>`).join('');
}
function diffLoadImgs(root){ root.querySelectorAll('img[data-dph]').forEach(async img=>{ img.src = await photoURL(img.dataset.dph); }); }
/* Formulaire : alerte sous le nom */
$('#idSug').insertAdjacentHTML('afterend', '<div id="diffAlert"></div>');
let diffSeen = '';
function diffAlertShow(){
  const box = $('#diffAlert'); if (!box || !EDIT) return;
  const list = diffMatches({nom:$('#f_nom').value, prenom:$('#f_prenom').value, dateNaissance:$('#f_dateNaissance').value});
  const key = list.map(x=>x.d.id + (x.full?'F':'p')).join(',');
  if (key === diffSeen) return; diffSeen = key;
  box.innerHTML = diffAlertHTML(list); diffLoadImgs(box);
  if (list.some(x=>x.full)) { toast('⚠ PERSONNE RECHERCHÉE'); navigator.vibrate?.([200,100,200]); }
}
['f_nom','f_prenom','f_dateNaissance'].forEach(id=>['input','change','blur'].forEach(ev=>$('#'+id).addEventListener(ev, ()=>setTimeout(diffAlertShow))));
{ const _of = openForm; openForm = function(f, d){ _of(f, d); diffSeen = ' '; diffAlertShow(); }; }
{ const _ii = idInherit; idInherit = function(src){ _ii(src); diffAlertShow(); }; }
/* Liste, fiche et envoi */
{ const _r = render; render = function(){ _r(); if (!diffList().length) return; document.querySelectorAll('#list .card[data-id]').forEach(c=>{ const f = FICHES.find(x=>x.id===c.dataset.id), m = f && diffMatch(f); if (!m) return; c.classList.add(m.full ? 'wanted' : 'wanted2'); c.querySelector('.name')?.insertAdjacentHTML('afterbegin', m.full ? WANTED_BADGE : WANTED2_BADGE); }); }; }
{ const _od = openDetail; openDetail = async function(f){ await _od(f); if (DETAIL !== f.id) return; const list = diffMatches(f); if (!list.length) return;
  $('#detTitle').insertAdjacentHTML('afterbegin', list[0].full ? WANTED_BADGE : WANTED2_BADGE);
  const hero = $('#detBody .hero'); if (hero) { hero.insertAdjacentHTML('afterend', `<div id="detDiff">${diffAlertHTML(list)}</div>`); const imgs = [...$('#detDiff').querySelectorAll('img[data-dph]')]; await Promise.all(imgs.map(async i=>{ i.src = await photoURL(i.dataset.dph); })); } }; }
{ const _fs = ficheSections; ficheSections = function(f){ const S = _fs(f), m = diffMatch(f); if (m) { const row = ['Diffusion', m.full ? `PERSONNE RECHERCHÉE (${diffName(m.d)}${m.d.dn ? ', né(e) le ' + m.d.dn : ''})` : `nom de famille figurant en diffusion (${diffName(m.d)})`]; S[0] && S[0][0] === '' ? S[0][1].push(row) : S.unshift(['', [row]]); } return S; }; }
/* Répertoire : Réglages › Outils › Diffusion */
(()=>{
  const sh = document.createElement('div'); sh.id = 'diffusion'; sh.className = 'sheet hidden';
  sh.innerHTML = `<div class="top"><button class="ib" id="diffBack" aria-label="Retour"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg></button><h2>Diffusion</h2></div>
  <div class="body">
    <p class="hint" style="color:var(--muted);font-size:13px;margin:10px 0 0">Personnes recherchées. Une fiche portant le même nom est signalée en rouge. Répertoire chiffré, gardé sur le téléphone.</p>
    <label class="f" for="d_nom">Nom</label><input id="d_nom" autocomplete="off" autocorrect="off" spellcheck="false" autocapitalize="characters">
    <label class="f" for="d_prenom">Prénom</label><input id="d_prenom" autocomplete="off" spellcheck="false">
    <label class="f" for="d_dn">Date de naissance</label><input id="d_dn" inputmode="numeric" placeholder="JJ/MM/AAAA" autocomplete="off">
    <div style="display:flex;align-items:center;gap:10px;margin-top:14px"><div id="d_prev" style="flex:0 0 64px;width:64px;height:64px;border-radius:10px;background:#000;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:24px">👤</div>
      <button type="button" class="addveh" id="d_photo" style="margin:0;flex:1">📷 Photo</button></div>
    <input type="file" id="d_file" accept="image/*" hidden>
    <div style="display:flex;gap:8px;margin-top:14px"><button type="button" class="btn" id="d_save" style="flex:1">Ajouter</button><button type="button" class="btn" id="d_cancel" style="flex:0 0 110px;background:#333;color:#fff;display:none">Annuler</button></div>
    <div class="sect" id="diffCount">Répertoire</div>
    <div id="diffList"></div>
  </div>`;
  document.body.appendChild(sh);
  const h = [...document.querySelectorAll('#settings h3')].find(x=>x.textContent==='Outils');
  h?.insertAdjacentHTML('afterend', `<button class="btn sec" id="t_diff" style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:8px"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#e01b1b"></span>Diffusion (personnes recherchées)</button>`);
  let editId = null, photo = null, photoNew = false;
  const prev = async () => { $('#d_prev').innerHTML = photo ? `<img src="${await photoURL(photo)}" alt="" style="width:100%;height:100%;object-fit:cover">` : '👤'; };
  const dropNew = async () => { if (photo && photoNew) await removePhoto(photo).catch(()=>{}); };
  const reset = () => { editId = null; photo = null; photoNew = false; for (const id of ['d_nom','d_prenom','d_dn']) $('#'+id).value = ''; $('#d_save').textContent = 'Ajouter'; $('#d_cancel').style.display = 'none'; prev(); };
  function list(){
    const L = [...diffList()].sort((a,b)=>diffName(a).localeCompare(diffName(b), 'fr'));
    $('#diffCount').textContent = `Répertoire (${L.length})`;
    $('#diffList').innerHTML = L.length ? L.map(d=>`<div class="drow" data-id="${d.id}">${d.photo ? `<img data-dph="${d.photo}" alt="">` : '<span class="noph">👤</span>'}<div class="dn"><b>${esc((d.nom||'').toUpperCase())}</b> ${esc(d.prenom||'')}<br><small>${d.dn ? 'né(e) le ' + esc(d.dn) : 'date de naissance inconnue'}</small></div><button type="button" data-da="edit" aria-label="Modifier">${ICON.edit}</button><button type="button" data-da="del" aria-label="Supprimer">${ICON.trash}</button></div>`).join('') : '<p class="hint" style="color:var(--muted);font-size:14px;margin:10px 0">Aucune personne en diffusion.</p>';
    diffLoadImgs($('#diffList'));
  }
  $('#t_diff')?.addEventListener('click', ()=>{ if (!KEY) return; reset(); list(); sh.classList.remove('hidden'); sh.querySelector('.body').scrollTop = 0; });
  $('#diffBack').onclick = async ()=>{ await dropNew(); reset(); sh.classList.add('hidden'); render(); };
  $('#d_nom').addEventListener('input', e=>{ const p = e.target.selectionStart; e.target.value = e.target.value.toUpperCase(); e.target.setSelectionRange(p, p); });
  $('#d_dn').addEventListener('input', dateMask);
  $('#d_dn').addEventListener('blur', e=>{ const m = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(e.target.value.trim()); if (m) e.target.value = `${m[1]}/${m[2]}/${fullYear(m[3])}`; });
  $('#d_photo').onclick = ()=>$('#d_file').click();
  $('#d_file').onchange = async e=>{
    const file = e.target.files[0]; e.target.value = ''; if (!file || !KEY) return;
    try { const id = await savePhoto(await shrink(file, 1200, .82)); await dropNew(); photo = id; photoNew = true; prev(); } catch { toast('La photo n’a pas pu être lue'); }
  };
  $('#d_cancel').onclick = async ()=>{ await dropNew(); reset(); };
  $('#d_save').onclick = async ()=>{
    const nom = $('#d_nom').value.trim().toUpperCase(), prenom = $('#d_prenom').value.trim(), dn = $('#d_dn').value.trim();
    if (!nom) return toast('Le nom est obligatoire');
    const L = LEARN.diff ||= [], old = editId && L.find(x=>x.id===editId);
    if (old) { if (old.photo && old.photo !== photo) await removePhoto(old.photo).catch(()=>{}); Object.assign(old, {nom, prenom, dn, photo}); }
    else L.push({id:uid(), nom, prenom, dn, photo, at:Date.now()});
    photoNew = false;
    try { await saveLearn(); toast(old ? 'Diffusion modifiée' : 'Ajouté à la diffusion'); } catch { toast('Enregistrement impossible'); }
    reset(); list();
  };
  $('#diffList').addEventListener('click', async e=>{
    const row = e.target.closest('.drow'); if (!row) return; const d = diffList().find(x=>x.id===row.dataset.id); if (!d) return;
    const a = e.target.closest('[data-da]')?.dataset.da;
    if (a === 'del') { if (!await ask(`Retirer ${diffName(d)} de la diffusion ?`, 'Retirer')) return; if (d.photo) await removePhoto(d.photo).catch(()=>{}); LEARN.diff = diffList().filter(x=>x.id!==d.id); await saveLearn().catch(()=>{}); if (editId === d.id) reset(); return list(); }
    if (a === 'edit') { await dropNew(); editId = d.id; photo = d.photo || null; photoNew = false; $('#d_nom').value = d.nom||''; $('#d_prenom').value = d.prenom||''; $('#d_dn').value = d.dn||''; $('#d_save').textContent = 'Enregistrer'; $('#d_cancel').style.display = ''; prev(); sh.querySelector('.body').scrollTop = 0; return; }
    if (e.target.closest('img') && d.photo) { $('#viewer img').src = await photoURL(d.photo); $('#viewer').classList.remove('hidden'); }
  });
  { const _lk = lock; lock = function(){ sh.classList.add('hidden'); _lk(); }; }
})();

/* ---------- v1.0.8 : lieu de naissance (ville + code postal, ou ville + pays) ----------
   « née à Nice (06000) », « né à Pigna en Italie », « né à Monaco » */
FIELDS.push('naisVille','naisPays'); ID_FIELDS.push('naisVille','naisPays');
(()=>{
  const l = $('#f_lieuNaissance'); l.removeAttribute('data-sg'); l.type = 'hidden';
  $('label[for=f_lieuNaissance]')?.setAttribute('for', 'f_naisVille');
  l.insertAdjacentHTML('afterend', `<input id="f_naisVille" data-sg="villes" autocapitalize="words" autocomplete="off" spellcheck="false" placeholder="Ville ou code postal (ex. Nice, Pigna)">
    <input id="f_naisPays" data-sg="paysAdr" autocomplete="off" spellcheck="false" placeholder="Pays" style="margin-top:8px">
    <div id="naisHint" style="font-size:12px;color:var(--muted);margin-top:4px"></div>`);
})();
function naisInfo(f){
  const raw = (f.naisVille||'').trim(), pays = (f.naisPays||'').trim(), m = /^(\d{5})\s+(.+)$/.exec(raw);
  const cp = m ? m[1] : '', ville = m ? m[2] : raw, np = norm(pays);
  const isMC = np === 'monaco' || cp === '98000' || (!np && /^(monaco|monte.carlo)$/.test(norm(ville)));
  return {cp, ville, pays, isMC, isFR: !isMC && (np === 'france' || !np)};
}
function naisPhrase(f){
  if (!(f.naisVille||'').trim() && !(f.naisPays||'').trim()) return f.lieuNaissance ? `à ${f.lieuNaissance}` : '';
  const i = naisInfo(f);
  if (i.isMC) return aVille(i.ville || 'Monaco');
  if (i.isFR) return i.ville ? aVille(i.ville) + (i.cp ? ` (${i.cp})` : '') : 'en France';
  return [i.ville && aVille(i.ville), i.pays && enPays(i.pays)].filter(Boolean).join(' ');
}
function naisJoin(){
  const i = naisInfo({naisVille:$('#f_naisVille').value, naisPays:$('#f_naisPays').value});
  $('#f_lieuNaissance').value = i.isMC ? (i.ville || 'Monaco') : i.isFR ? (i.ville ? i.ville + (i.cp ? ` (${i.cp})` : '') : i.pays) : (i.ville && i.pays ? `${i.ville} (${i.pays})` : i.ville || i.pays);
}
function naisSplit(){
  /* Anciennes fiches : « Nice (06000) », « Pigna (Italie) » ou texte libre */
  if ($('#f_naisVille').value || $('#f_naisPays').value) return;
  const v = $('#f_lieuNaissance').value.trim(); if (!v) return;
  let m = /^(.+?)\s*\((\d{5})\)$/.exec(v);
  if (m) { $('#f_naisVille').value = `${m[2]} ${m[1]}`; return; }
  m = /^(.+?)\s*\(([^)\d]+)\)$/.exec(v);
  if (m) { $('#f_naisVille').value = m[1]; $('#f_naisPays').value = m[2]; return; }
  $('#f_naisVille').value = v;
}
['input','change'].forEach(ev=>{ $('#f_naisVille').addEventListener(ev, naisJoin); $('#f_naisPays').addEventListener(ev, naisJoin); });
$('#f_naisVille').addEventListener('change', e=>{ const v = e.target.value; if (/^\d{5}\s/.test(v) && !$('#f_naisPays').value.trim()) { $('#f_naisPays').value = v.startsWith('98000') ? 'Monaco' : 'France'; naisJoin(); } });
$('#f_naisVille').addEventListener('focus', ()=>loadCities().catch(()=>{}));
/* Suggestions : communes de France et Monaco avec code postal, sinon villes déjà saisies */
{ const _s = sgShow; sgShow = inp => {
    if (!inp || inp.id !== 'f_naisVille') return _s(inp);
    if (/^\d{5}\s/.test(inp.value)) return sgHide();
    const np = norm($('#f_naisPays').value);
    if (!np || np === 'france' || np === 'monaco') { villeShow(inp); if (!sgBox.classList.contains('hidden')) return; }
    _s(inp);
  }; }
{ const _of = openForm; openForm = function(f, d){ _of(f, d); naisSplit(); }; const _ii = idInherit; idInherit = function(src){ _ii(src); naisSplit(); }; }

/* ---------- v1.0.8 : zoom sur la feuille de service et les photos ----------
   Zoom à deux doigts, double tap pour zoomer / revenir, un doigt pour se déplacer une fois zoomé.
   Un tap simple (sans zoom) ou la croix ferment. Le reste de l'appli reste verrouillé. */
(()=>{
  document.head.insertAdjacentHTML('beforeend', `<style>
#viewer,#viewer *,#svcView,#svcView *{touch-action:none}
#viewer,#svcView{overflow:hidden}
#viewer img,#svcView img{transform-origin:0 0;will-change:transform;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
#svcView .zx{position:absolute;top:calc(env(safe-area-inset-top) + 8px);right:10px;color:#fff;background:rgba(40,40,40,.7)}
</style>`);
  document.addEventListener('gesturestart', e=>e.preventDefault(), {passive:false});
  if (!$('#svcView .zx')) $('#svcView').insertAdjacentHTML('beforeend', `<button class="ib zx" aria-label="Fermer">${ICON.x}</button>`);
  function zoomable(box){
    const img = box.querySelector('img'); if (!img) return;
    let s = 1, x = 0, y = 0, g = null, quiet = 0, lastTap = 0, tt = null;
    const clampXY = () => {
      const w = img.offsetWidth, h = img.offsetHeight, bw = box.clientWidth, bh = box.clientHeight, ox = img.offsetLeft, oy = img.offsetTop;
      const fit = (v, size, bsize, o) => { const sz = size * s; return sz <= bsize ? (bsize - sz) / 2 - o : Math.min(-o, Math.max(bsize - o - sz, v)); };
      x = fit(x, w, bw, ox); y = fit(y, h, bh, oy);
    };
    const apply = () => { if (s <= 1.001) { s = 1; x = y = 0; img.style.transform = ''; } else { clampXY(); img.style.transform = `translate(${x}px,${y}px) scale(${s})`; } };
    const reset = () => { s = 1; x = y = 0; apply(); };
    const local = (cx, cy) => { const r = box.getBoundingClientRect(); return [cx - r.left - img.offsetLeft, cy - r.top - img.offsetTop]; };
    const zoomTo = (ns, cx, cy) => { const [px, py] = local(cx, cy), lx = (px - x) / s, ly = (py - y) / s; s = Math.min(6, Math.max(1, ns)); x = px - s * lx; y = py - s * ly; apply(); };
    const pts = e => [...e.touches].map(t=>[t.clientX, t.clientY]);
    box.addEventListener('touchstart', e=>{
      const p = pts(e);
      if (p.length >= 2) { const [a, b] = p; g = {pinch:true, s0:s, x0:x, y0:y, d0:Math.hypot(a[0]-b[0], a[1]-b[1]) || 1, m0:local((a[0]+b[0])/2, (a[1]+b[1])/2)}; }
      else if (p.length === 1) g = {pinch:false, x0:x, y0:y, p0:p[0], moved:false};
    }, {passive:true});
    box.addEventListener('touchmove', e=>{
      if (!g) return; e.preventDefault(); const p = pts(e);
      if (g.pinch && p.length >= 2) {
        const [a, b] = p, d = Math.hypot(a[0]-b[0], a[1]-b[1]), m = local((a[0]+b[0])/2, (a[1]+b[1])/2);
        const ns = Math.min(6, Math.max(1, g.s0 * d / g.d0)), lx = (g.m0[0] - g.x0) / g.s0, ly = (g.m0[1] - g.y0) / g.s0;
        s = ns; x = m[0] - s * lx; y = m[1] - s * ly; apply(); quiet = Date.now() + 400;
      } else if (!g.pinch && p.length === 1) {
        const dx = p[0][0] - g.p0[0], dy = p[0][1] - g.p0[1];
        if (Math.abs(dx) + Math.abs(dy) > 8) g.moved = true;
        if (g.moved) { quiet = Date.now() + 400; if (s > 1) { x = g.x0 + dx; y = g.y0 + dy; apply(); } }
      }
    }, {passive:false});
    box.addEventListener('touchend', e=>{
      if (!e.touches.length) g = null;
      else if (e.touches.length === 1) { const t = e.touches[0]; g = {pinch:false, x0:x, y0:y, p0:[t.clientX, t.clientY], moved:true}; }
    }, {passive:true});
    const close = () => { clearTimeout(tt); box.classList.add('hidden'); reset(); };
    box.onclick = e => {
      if (e.target.closest('button')) return close();
      if (Date.now() < quiet) return;
      const now = Date.now();
      if (now - lastTap < 320) { clearTimeout(tt); lastTap = 0; if (s > 1) reset(); else zoomTo(2.5, e.clientX, e.clientY); return; }
      lastTap = now; clearTimeout(tt);
      if (s === 1) tt = setTimeout(close, 330);
    };
    img.addEventListener('load', reset);
    new MutationObserver(()=>{ if (box.classList.contains('hidden')) reset(); }).observe(box, {attributes:true, attributeFilter:['class']});
  }
  zoomable($('#viewer')); zoomable($('#svcView'));
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
/* Outil Matières dangereuses (ADR) : module séparé */
(()=>{ const sc = document.createElement('script'); sc.src = 'adr.js?v=' + APP_VERSION; document.body.appendChild(sc); })();
/* Partage de fiches par QR code : module séparé */
(()=>{ const sc = document.createElement('script'); sc.src = 'share.js?v=' + APP_VERSION; document.body.appendChild(sc); })();
/* Version, nouveautés et modules récents : décrits dans version.js (petit fichier mis à jour seul) */
(async ()=>{
  const load = src => new Promise(res=>{ const sc = document.createElement('script'); sc.src = src; sc.onload = sc.onerror = res; document.body.appendChild(sc); });
  await load('version.js');
  const C = window.CIF; if (!C) return;
  if (C.version) APP_VERSION = C.version;
  for (const e of [...(C.changelog || [])].reverse()) if (!CHANGELOG.some(x=>x[0] === e[0])) CHANGELOG.unshift(e);
  renderChangelog();
  for (const m of (C.modules || [])) await load(m + '?v=' + APP_VERSION);
  if (KEY) render();
})();
/* Ancien module de lecture de plaque (retiré en 3.5) : on libère son cache */
setTimeout(()=>{ if (db) dbDel('meta','ocrlib').catch(()=>{}); }, 3000);
