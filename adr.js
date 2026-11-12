'use strict';
/* CIF 2.0 — Outil « Matières dangereuses (ADR) »
   Recherche hors ligne : panneau orange (code danger / n° ONU) ou nom de matière.
   Aucune donnée de fiche n'est utilisée ni transmise. */
(function(){
/* Désignations françaises des numéros ONU les plus courants sur la route */
const UN_FR = {
1001:'Acétylène dissous',1002:'Air comprimé',1005:'Ammoniac anhydre',1006:'Argon comprimé',1011:'Butane',1013:'Dioxyde de carbone (CO₂)',
1016:'Monoxyde de carbone comprimé',1017:'Chlore',1028:'Dichlorodifluorométhane (gaz réfrigérant R12)',1038:'Éthylène liquide réfrigéré',1040:'Oxyde d\'éthylène',
1046:'Hélium comprimé',1049:'Hydrogène comprimé',1050:'Chlorure d\'hydrogène anhydre',1052:'Fluorure d\'hydrogène anhydre',1053:'Sulfure d\'hydrogène',
1060:'Méthylacétylène et propadiène en mélange stabilisé',1066:'Azote comprimé',1072:'Oxygène comprimé',1073:'Oxygène liquide réfrigéré',
1075:'Gaz de pétrole liquéfiés (GPL)',1076:'Phosgène',1077:'Propylène',1078:'Gaz frigorifique, n.s.a.',1079:'Dioxyde de soufre',1086:'Chlorure de vinyle stabilisé',
1090:'Acétone',1093:'Acrylonitrile stabilisé',1114:'Benzène',1120:'Butanols',1133:'Adhésifs (contenant un liquide inflammable)',1155:'Éther diéthylique',
1170:'Éthanol (alcool éthylique) ou éthanol en solution',1173:'Acétate d\'éthyle',1193:'Méthyléthylcétone',
1202:'Gazole, carburant diesel ou huile de chauffe légère (fioul domestique)',1203:'Essence (carburant pour moteurs)',1219:'Isopropanol (alcool isopropylique)',
1223:'Kérosène',1230:'Méthanol',1263:'Peintures ou matières apparentées aux peintures',1267:'Pétrole brut',1268:'Distillats de pétrole, n.s.a. / produits pétroliers, n.s.a.',
1280:'Oxyde de propylène',1294:'Toluène',1300:'White-spirit (succédané d\'essence de térébenthine)',1307:'Xylènes',1325:'Solide inflammable organique, n.s.a.',
1350:'Soufre',1361:'Charbon',1381:'Phosphore blanc ou jaune',1402:'Carbure de calcium',1428:'Sodium',1479:'Solide comburant, n.s.a.',1547:'Aniline',
1593:'Dichlorométhane',1648:'Acétonitrile',1689:'Cyanure de sodium',1710:'Trichloréthylène',1759:'Solide corrosif, n.s.a.',1760:'Liquide corrosif, n.s.a.',
1789:'Acide chlorhydrique',1790:'Acide fluorhydrique',1791:'Hypochlorite en solution (eau de Javel)',1805:'Acide phosphorique en solution',
1814:'Hydroxyde de potassium en solution (potasse)',1823:'Hydroxyde de sodium solide (soude)',1824:'Hydroxyde de sodium en solution (soude caustique)',
1830:'Acide sulfurique (plus de 51 % d\'acide)',1846:'Tétrachlorure de carbone',1863:'Carburéacteur (kérosène aviation)',1866:'Résine en solution inflammable',
1888:'Chloroforme',1897:'Tétrachloréthylène',1942:'Nitrate d\'ammonium',1950:'Aérosols',1951:'Argon liquide réfrigéré',
1965:'Mélange d\'hydrocarbures gazeux liquéfié, n.s.a. (propane / butane, GPL)',1966:'Hydrogène liquide réfrigéré',
1971:'Méthane comprimé ou gaz naturel comprimé (GNC)',1972:'Méthane liquide réfrigéré ou gaz naturel liquéfié (GNL)',1977:'Azote liquide réfrigéré',
1978:'Propane',1987:'Alcools, n.s.a.',1993:'Liquide inflammable, n.s.a.',1999:'Goudrons liquides (y compris bitumes routiers)',
2014:'Peroxyde d\'hydrogène en solution aqueuse (eau oxygénée)',2015:'Peroxyde d\'hydrogène stabilisé (plus de 60 %)',2031:'Acide nitrique',
2055:'Styrène monomère stabilisé',2067:'Engrais au nitrate d\'ammonium',2187:'Dioxyde de carbone liquide réfrigéré',2201:'Protoxyde d\'azote liquide réfrigéré',
2209:'Formaldéhyde en solution',2211:'Polymères expansibles en granulés',2304:'Naphtalène fondu',2312:'Phénol fondu',2448:'Soufre fondu',
2672:'Ammoniac en solution aqueuse',2735:'Amines liquides corrosives, n.s.a.',2789:'Acide acétique glacial',2790:'Acide acétique en solution',
2794:'Accumulateurs électriques remplis d\'électrolyte liquide acide (batteries)',2796:'Acide sulfurique (51 % au plus) ou électrolyte acide pour accumulateurs',
2800:'Accumulateurs électriques inversables',2810:'Liquide organique toxique, n.s.a.',2811:'Solide organique toxique, n.s.a.',
2814:'Matière infectieuse pour l\'homme',2900:'Matière infectieuse pour les animaux uniquement',2910:'Matières radioactives, quantités limitées en colis exceptés',
2915:'Matières radioactives en colis de type A',2920:'Liquide corrosif, inflammable, n.s.a.',2922:'Liquide corrosif, toxique, n.s.a.',2924:'Liquide inflammable, corrosif, n.s.a.',
3065:'Boissons alcoolisées',3077:'Matière dangereuse du point de vue de l\'environnement, solide, n.s.a.',
3082:'Matière dangereuse du point de vue de l\'environnement, liquide, n.s.a.',3090:'Piles au lithium métal',3091:'Piles au lithium métal contenues dans un équipement',
3166:'Moteur à combustion interne ou véhicule à propulsion par gaz ou liquide inflammable',3171:'Véhicule mû par accumulateurs ou appareil mû par accumulateurs',
3175:'Solides contenant du liquide inflammable, n.s.a.',3257:'Liquide transporté à chaud, n.s.a. (100 °C ou plus, ex. bitume)',3258:'Solide transporté à chaud, n.s.a.',
3264:'Liquide inorganique corrosif, acide, n.s.a.',3265:'Liquide organique corrosif, acide, n.s.a.',3266:'Liquide inorganique corrosif, basique, n.s.a.',
3267:'Liquide organique corrosif, basique, n.s.a.',3268:'Dispositifs de sécurité (airbags, prétensionneurs) à amorçage électrique',3269:'Trousse de résine polyester',
3291:'Déchet d\'hôpital non spécifié, n.s.a.',3295:'Hydrocarbures liquides, n.s.a.',3373:'Matière biologique, catégorie B',
3475:'Mélange d\'éthanol et d\'essence (plus de 10 % d\'éthanol, ex. E85)',3480:'Piles au lithium ionique',3481:'Piles au lithium ionique contenues dans un équipement',
3536:'Piles au lithium installées dans un engin de transport'
};
for (let n = 3101; n <= 3120; n++) UN_FR[n] = UN_FR[n] || 'Peroxyde organique (types B à F)';

const CLASSES = {'1':'Matières et objets explosibles','2':'Gaz','2.1':'Gaz inflammable','2.2':'Gaz non inflammable, non toxique','2.3':'Gaz toxique',
'3':'Liquide inflammable','4.1':'Solide inflammable, matière autoréactive ou explosible désensibilisée','4.2':'Matière sujette à l\'inflammation spontanée',
'4.3':'Matière qui, au contact de l\'eau, dégage des gaz inflammables','5.1':'Matière comburante','5.2':'Peroxyde organique','6.1':'Matière toxique',
'6.2':'Matière infectieuse','7':'Matière radioactive','8':'Matière corrosive','9':'Matières et objets dangereux divers'};
const className = c => { c = String(c||''); return CLASSES[c] || CLASSES[c.split('.')[0]] || ''; };

/* Code danger (partie haute du panneau orange) */
const KEMLER = {
'20':'Gaz asphyxiant ou ne présentant pas de risque subsidiaire','22':'Gaz liquéfié réfrigéré, asphyxiant','223':'Gaz liquéfié réfrigéré, inflammable',
'225':'Gaz liquéfié réfrigéré, comburant','23':'Gaz inflammable','238':'Gaz inflammable, corrosif','239':'Gaz inflammable pouvant produire spontanément une réaction violente',
'25':'Gaz comburant (favorise l\'incendie)','26':'Gaz toxique','263':'Gaz toxique, inflammable','265':'Gaz toxique et comburant','268':'Gaz toxique et corrosif',
'30':'Liquide inflammable (point d\'éclair de 23 à 60 °C) ou matière transportée à chaud','323':'Liquide inflammable réagissant avec l\'eau en dégageant des gaz inflammables',
'33':'Liquide très inflammable (point d\'éclair inférieur à 23 °C)','333':'Liquide pyrophorique','336':'Liquide très inflammable et toxique',
'338':'Liquide très inflammable et corrosif','339':'Liquide très inflammable pouvant produire spontanément une réaction violente',
'36':'Liquide inflammable présentant un degré mineur de toxicité','368':'Liquide inflammable, toxique et corrosif','38':'Liquide inflammable présentant un degré mineur de corrosivité',
'40':'Solide inflammable, matière autoréactive ou auto-échauffante','423':'Solide réagissant avec l\'eau en dégageant des gaz inflammables',
'44':'Solide inflammable qui, à température élevée, est à l\'état fondu','50':'Matière comburante (favorise l\'incendie)','539':'Peroxyde organique inflammable',
'55':'Matière très comburante','556':'Matière très comburante et toxique','558':'Matière très comburante et corrosive','559':'Matière très comburante pouvant produire spontanément une réaction violente',
'60':'Matière toxique ou présentant un degré mineur de toxicité','606':'Matière infectieuse','63':'Matière toxique et inflammable (point d\'éclair de 23 à 60 °C)',
'66':'Matière très toxique','663':'Matière très toxique et inflammable','668':'Matière très toxique et corrosive','69':'Matière toxique pouvant produire spontanément une réaction violente',
'70':'Matière radioactive','78':'Matière radioactive, corrosive','80':'Matière corrosive ou présentant un degré mineur de corrosivité',
'83':'Matière corrosive et inflammable (point d\'éclair de 23 à 60 °C)','86':'Matière corrosive et toxique','88':'Matière très corrosive',
'883':'Matière très corrosive et inflammable','886':'Matière très corrosive et toxique',
'90':'Matière dangereuse pour l\'environnement ou matières dangereuses diverses','99':'Matières dangereuses diverses transportées à chaud'
};
const DIGIT = {'2':'émanation de gaz (pression ou réaction chimique)','3':'inflammabilité (liquides, vapeurs, gaz)','4':'inflammabilité (solides)','5':'comburant',
'6':'toxicité ou risque d\'infection','7':'radioactivité','8':'corrosivité','9':'réaction violente spontanée'};
function kemler(code){
  code = String(code||'').toUpperCase().replace(/[^0-9X]/g,'');
  if (!code) return null;
  const x = code.startsWith('X'), d = code.replace('X','');
  if (!/^[2-9]\d{1,2}$/.test(d)) return {code, txt:'Code danger non reconnu', x};
  let txt = KEMLER[d];
  if (!txt) {
    const parts = [];
    [...d].forEach((c,i)=>{ if (c==='0') return; if (i>0 && c===d[i-1]) { parts[parts.length-1] += ' (danger renforcé)'; return; } if (DIGIT[c]) parts.push(DIGIT[c]); });
    txt = parts.length ? parts.join(' + ').replace(/^./, m=>m.toUpperCase()) : 'Code danger non reconnu';
  }
  return {code, txt, x};
}

/* Liste complète (plus de 2 000 numéros ONU, désignations anglaises de la liste ONU/US 49 CFR), téléchargée une fois puis stockée sur le téléphone */
const SRC = 'https://cdn.jsdelivr.net/npm/hazmat-cfr-mcp@0.3.0/dist/data/hmt-generated.js';
let FULL = null, loading = null;
async function loadFull(force){
  if (FULL && !force) return FULL;
  if (!force) { try { const c = await dbGet('meta','adrdb'); if (c && c.rows) return (FULL = c.rows); } catch {} }
  if (!loading) loading = (async ()=>{
    const r = await fetch(SRC, {cache:'no-cache'}); if (!r.ok) throw new Error(r.status);
    let t = await r.text(); t = t.replace(/^[\s\S]*?=\s*/,'').replace(/;\s*$/,'').replace(/,\s*\]\s*$/,']');
    const rows = {};
    for (const x of JSON.parse(t)) {
      const m = /^UN(\d{4})$/.exec(x.idNumber||''); if (!m) continue;
      const k = +m[1], e = rows[k] || (rows[k] = {n:[], c:x.hazardClass, s:[]});
      if (x.properShippingName && !e.n.includes(x.properShippingName) && e.n.length < 6) e.n.push(x.properShippingName);
      for (const s of (x.subsidiaryRisks||[])) if (!e.s.includes(s)) e.s.push(s);
    }
    await dbPut('meta', {rows, date:Date.now()}, 'adrdb');
    return (FULL = rows);
  })().finally(()=>{ loading = null; });
  return loading;
}

/* ---------- Interface ---------- */
const sheet = document.createElement('div');
sheet.id = 'adr'; sheet.className = 'sheet hidden';
sheet.innerHTML = `<div class="top">
    <button class="ib" id="adrBack" aria-label="Retour"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg></button>
    <h2>Matières dangereuses</h2></div>
  <div class="body">
    <p class="hint" style="color:var(--muted);font-size:13px;margin:10px 0 12px">Recopie le panneau orange du camion : code danger en haut, n° ONU en bas.</p>
    <div style="margin:0 auto;width:min(300px,100%);aspect-ratio:4/3;background:#ef7d00;border:5px solid #111;border-radius:6px;display:flex;flex-direction:column;box-shadow:0 6px 20px rgba(0,0,0,.5)">
      <input id="adrTop" inputmode="text" maxlength="4" placeholder="33" autocomplete="off" autocapitalize="characters" spellcheck="false" style="flex:1;border:0;border-bottom:4px solid #111;border-radius:0;background:transparent;color:#111;text-align:center;font:800 44px ui-monospace,Menlo,monospace;letter-spacing:.08em">
      <input id="adrBot" inputmode="numeric" maxlength="4" placeholder="1203" autocomplete="off" style="flex:1;border:0;border-radius:0;background:transparent;color:#111;text-align:center;font:800 44px ui-monospace,Menlo,monospace;letter-spacing:.08em">
    </div>
    <label class="f" for="adrQ">Ou rechercher par nom</label>
    <input id="adrQ" placeholder="ex. essence, chlore, propane…" autocomplete="off">
    <div id="adrOut" style="margin-top:14px"></div>
    <p class="hint" id="adrInfo" style="color:var(--muted);font-size:12px;margin-top:18px"></p>
  </div>`;
document.body.appendChild(sheet);
const out = sheet.querySelector('#adrOut');

function card(title, body, color){
  return `<section class="panel" style="border-color:${color||'#2e2e2e'}"><h4><span>${esc(title)}</span></h4><div style="padding:10px 12px;font-size:16px;line-height:1.4">${body}</div></section>`;
}
function unCard(n, full){
  const fr = UN_FR[n], e = full && full[n];
  if (!fr && !e) return card(`N° ONU ${String(n).padStart(4,'0')}`, '<span style="color:var(--muted)">Numéro introuvable dans la liste' + (full ? '' : ' française (liste complète non téléchargée)') + '.</span>');
  const cls = e ? `<div style="margin-top:6px;color:#ffb366"><b>Classe ${esc(e.c)}</b> — ${esc(className(e.c))}${e.s.length ? `<br><small>Danger(s) subsidiaire(s) : ${e.s.map(s=>esc(s)+' '+esc(className(s))).join(', ')}</small>` : ''}</div>` : '';
  const en = e ? `<div style="margin-top:6px;color:var(--muted);font-size:13px">Désignation anglaise : ${e.n.map(esc).join(' · ')}</div>` : '';
  return card(`N° ONU ${String(n).padStart(4,'0')}`, `${fr ? `<b style="font-size:18px">${esc(fr)}</b>` : ''}${cls}${en}`, '#ef7d00');
}
let FULLC = null;
async function update(){
  const top = sheet.querySelector('#adrTop').value, bot = sheet.querySelector('#adrBot').value.replace(/\D/g,''), q = norm(sheet.querySelector('#adrQ').value);
  let html = '';
  const k = kemler(top);
  if (k) html += card(`Code danger ${k.code}`, `<b style="font-size:18px">${esc(k.txt)}</b>${k.x ? '<div style="margin-top:6px;color:#ff5a52;font-weight:700">X : réagit dangereusement avec l\'eau — ne pas utiliser d\'eau</div>' : ''}`, '#ef7d00');
  if (bot.length === 4) html += unCard(+bot, FULLC);
  if (q.length >= 3) {
    const hits = new Map();
    for (const [n, t] of Object.entries(UN_FR)) if (norm(t).includes(q)) hits.set(+n, true);
    if (FULLC) for (const [n, e] of Object.entries(FULLC)) if (hits.size < 40 && e.n.some(x=>norm(x).includes(q))) hits.set(+n, true);
    const list = [...hits.keys()].sort((a,b)=>a-b).slice(0,40);
    html += list.length ? card(`${list.length} résultat(s) pour « ${sheet.querySelector('#adrQ').value.trim()} »`,
      list.map(n=>`<button type="button" data-un="${n}" style="display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #2a2a2a;background:none;padding:8px 0;font-size:15px"><b style="font-family:ui-monospace,Menlo,monospace;color:#ffb366">${String(n).padStart(4,'0')}</b> ${esc(UN_FR[n] || (FULLC[n]?.n[0]||''))}</button>`).join(''))
      : card('Recherche', '<span style="color:var(--muted)">Aucun résultat.</span>');
  }
  out.innerHTML = html;
}
out.addEventListener('click', e=>{ const b = e.target.closest('[data-un]'); if (!b) return; sheet.querySelector('#adrBot').value = String(b.dataset.un).padStart(4,'0'); sheet.querySelector('#adrQ').value = ''; update(); sheet.querySelector('.body').scrollTop = 0; });
sheet.querySelector('#adrTop').addEventListener('input', e=>{ e.target.value = e.target.value.toUpperCase().replace(/[^0-9X]/g,''); update(); });
sheet.querySelector('#adrBot').addEventListener('input', e=>{ e.target.value = e.target.value.replace(/\D/g,''); update(); });
sheet.querySelector('#adrQ').addEventListener('input', update);
sheet.querySelector('#adrBack').onclick = ()=>sheet.classList.add('hidden');

async function syncInfo(){
  const info = sheet.querySelector('#adrInfo');
  const c = await dbGet('meta','adrdb').catch(()=>null);
  info.innerHTML = c ? `Liste complète : ${Object.keys(c.rows).length} numéros ONU, téléchargée le ${fmtD(c.date)}. Fonctionne hors connexion. <a href="#" id="adrRefresh" style="color:#7fb3ff">Mettre à jour</a>`
    : `Hors liste française (${Object.keys(UN_FR).length} matières courantes), la liste complète sera téléchargée une fois (aucune donnée envoyée). <a href="#" id="adrRefresh" style="color:#7fb3ff">Télécharger maintenant</a>`;
  const a = info.querySelector('#adrRefresh'); if (a) a.onclick = async ev=>{ ev.preventDefault(); toast('Téléchargement de la liste…'); try { FULLC = await loadFull(true); toast('Liste à jour'); syncInfo(); update(); } catch { toast('Pas de réseau : réessaie plus tard'); } };
}
async function openAdr(){
  sheet.classList.remove('hidden'); sheet.querySelector('.body').scrollTop = 0;
  syncInfo();
  try { FULLC = await loadFull(false); update(); syncInfo(); } catch {}
}
/* Bouton dans Réglages › Outils */
const h = [...document.querySelectorAll('#settings h3')].find(x=>x.textContent==='Outils');
if (h) {
  h.insertAdjacentHTML('afterend', `<button class="btn sec" id="t_adr" style="display:flex;align-items:center;justify-content:center;gap:10px"><span style="display:inline-block;width:26px;height:18px;background:#ef7d00;border:2px solid #111;border-radius:2px;position:relative"><span style="position:absolute;left:0;right:0;top:50%;border-top:2px solid #111"></span></span>Matières dangereuses (ADR)</button>`);
  $('#t_adr').onclick = openAdr;
}
/* Masquer l'outil au verrouillage */
new MutationObserver(()=>{ if (!$('#lock').classList.contains('hidden')) sheet.classList.add('hidden'); }).observe($('#lock'), {attributes:true, attributeFilter:['class']});
window.ADR = {kemler, UN_FR, openAdr};
})();
