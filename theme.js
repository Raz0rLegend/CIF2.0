'use strict';
/* CIF 2.0 — v1.2.2 : affichage jour / nuit.
   Auto : clair le jour, sombre la nuit ; bascule au crépuscule et à l'aube (soleil à 6° sous l'horizon),
   heures calculées sur le téléphone pour Monaco, sans connexion. Réglage : Auto / Jour / Nuit (Réglages › Affichage).
   Mode jour : palette claire dédiée (v1.2.6), le logo, les photos et les plaques gardent leurs vraies couleurs. */
(()=>{
  const LAT = 43.7333, LNG = 7.4167, KEY = 'cifTheme';
  /* Mode jour (v1.2.6) : vraies couleurs claires (plus d'inversion de l'écran, qui abîmait le logo et les photos) */
  document.head.insertAdjacentHTML('beforeend', `<style>
html.jour{--bg:#f2f2f6;--panel:#ffffff;--card:#ffffff;--line:#d8d8de;--text:#141414;--muted:#6a6a70;--accent:#1f9d35;--danger:#d93a32;--field:#ffffff;--border:#b9b9bf;color-scheme:light}
html.jour #lock img{filter:drop-shadow(0 6px 16px rgba(0,0,0,.25))}
html.jour #form label.f{color:#5f5f66}
html.jour body::after{content:'';position:fixed;left:0;right:0;top:0;height:env(safe-area-inset-top);background:#000;z-index:2147483647;pointer-events:none}
html.jour .btn{background:#000000;color:#eeeeee}
html.jour .btn.sec{background:#d4d4d4}
html.jour .ib:active{background:#d3d3d3}
html.jour .ib.on{background:#000000;color:#eeeeee}
html.jour .card{background:rgba(227,227,227,.88)}
html.jour .card .thumb{background:#ffffff}
html.jour .card .sub{color:#303030}
html.jour .acts .ib svg{color:#424242}
html.jour #fab{background:#000000;color:#eeeeee}
html.jour #selBar button{background:#d4d4d4}
html.jour #selBar button.primary{background:#000000;color:#eeeeee}
html.jour .card .chk{border:2px solid #888888}
html.jour .card.sel .chk{background:#000000;border-color:#000000;color:#eeeeee}
html.jour nav.tabs button.on{background:#000000;color:#eeeeee}
html.jour label.f{color:#2f2f2f}
html.jour input:focus,html.jour select:focus,html.jour textarea:focus{border-color:#444444}
html.jour .chips input:checked+span{background:#000000;color:#eeeeee;border-color:#000000}
html.jour .ph{background:#ffffff}
html.jour .addph{border:1px dashed #999999}
html.jour .seg button.on{background:#000000;color:#eeeeee}
html.jour .veh{background:#e6e6e6}
html.jour .veh .ib svg{color:#424242}
html.jour .switch .sw{background:#bbbbbb}
html.jour .test{background:#e6e6e6}
html.jour .addveh{border:1px dashed #999999}
html.jour #modal{background:rgba(255,255,255,.6)}
html.jour #modal .box{background:#d9d9d9}
html.jour #shareSheet{background:rgba(255,255,255,.55)}
html.jour #shareSheet button{background:#d5d5d5}
html.jour #shareSheet button.cancel{background:#000000;color:#eeeeee}
html.jour #sg{background:#d5d5d5;border:1px solid #bbbbbb}
html.jour #sg button{border-bottom:1px solid #c7c7c7}
html.jour #sg button:active{background:#c5c5c5}
html.jour #sg b{color:#000000}
html.jour .hero .sub2{color:#3b3b3b}
html.jour .hero .vic{background:#d9d9d9;border:1px solid #c5c5c5;color:#0f0f0f}
html.jour .card .vic svg{color:#424242}
html.jour .chip{background:#d5d5d5;color:#222222}
html.jour .panel{background:#e6e6e6;border:1px solid #d1d1d1}
html.jour .panel h4{color:#575757;background:#dedede}
html.jour .grid{background:#d5d5d5;border-top:1px solid #d5d5d5}
html.jour .cell{background:#e6e6e6}
html.jour .cell .k{color:#727272}
html.jour .actbar button{background:#d4d4d4}
html.jour .actbar button#detSend{background:#000000;color:#eeeeee}
html.jour .glink svg{background:#d9d9d9;border:1px solid #c5c5c5;color:#656565}
html.jour .mates{color:#575757}
html.jour .mates button{color:#272727}
html.jour .glink svg{background:#eeeeee;border:2px solid #191919;color:#000000}
html.jour #lsvc .sq{background:#e2e2e2;border:1px solid #c5c5c5}
html.jour #lsvc .ms{background:#e2e2e2;border:1px solid #c5c5c5}
html.jour #lsvc .mh button{color:#303030}
html.jour #lsvc .mi{background:#d9d9d9}
html.jour #lsvc .mi.now{background:#0d0d0d;color:#eeeeee}
html.jour #svcEd .seg button{border:1px solid #bbbbbb;background:#dfdfdf}
html.jour #svcEd .seg button.on{background:#0d0d0d;color:#eeeeee;border-color:#0d0d0d}
html.jour #svcEd .row{background:#dcdcdc}
html.jour #svcEd .btns button{border:1px solid #bbbbbb;background:#dfdfdf}
html.jour .dalert img,html.jour .dalert .noph{background:#ffffff}
html.jour #diffList .drow img,html.jour #diffList .drow .noph{background:#ffffff}
html.jour #chronus>summary .n{color:var(--fg,#222222)}
html.jour #form label.f{color:#565656}
html.jour .vgrp b{color:#000000}
</style>`);
  /* ----- Lever / coucher du soleil (méthode des éphémérides simplifiées, précision ≈ 1 min) ----- */
  const rad = Math.PI / 180, DAYMS = 864e5, J1970 = 2440588, J2000 = 2451545, J0 = 0.0009, E = rad * 23.4397;
  const toDays = d => d.valueOf() / DAYMS - 0.5 + J1970 - J2000, fromJ = j => new Date((j + 0.5 - J1970) * DAYMS);
  function sun(date, h = -6){
    const lw = -LNG * rad, phi = LAT * rad, d = toDays(date);
    const n = Math.round(d - J0 - lw / (2 * Math.PI)), ds = J0 + lw / (2 * Math.PI) + n;
    const M = rad * (357.5291 + 0.98560028 * ds);
    const L = M + rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI;
    const dec = Math.asin(Math.sin(E) * Math.sin(L));
    const noon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
    const w = Math.acos((Math.sin(h * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
    const set = J2000 + J0 + (w + lw) / (2 * Math.PI) + n + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
    return {aube: fromJ(noon - (set - noon)), crep: fromJ(set)};
  }
  window.cifSun = sun;
  const mode = () => { try { return localStorage.getItem(KEY) || 'auto'; } catch { return 'auto'; } };
  const isDay = (now = new Date()) => { const s = sun(now); return now >= s.aube && now < s.crep; };
  const hm = d => d.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
  function apply(){
    const m = mode(), day = m === 'jour' || (m === 'auto' && isDay());
    document.documentElement.classList.toggle('jour', day);
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', day ? '#e1e1e1' : '#1e1e1e');
    const h = document.getElementById('themeHint');
    if (h) { const s = sun(new Date()); h.textContent = m === 'auto' ? `Aujourd'hui : jour de ${hm(s.aube)} à ${hm(s.crep)}, nuit ensuite (Monaco).` : m === 'jour' ? 'Affichage clair en permanence.' : 'Affichage sombre en permanence.'; }
  }
  apply();
  setInterval(apply, 60000);
  document.addEventListener('visibilitychange', ()=>{ if (!document.hidden) apply(); });
  /* ----- Réglages ----- */
  const sec = [...document.querySelectorAll('#settings h3')].find(x=>x.textContent === 'Localisation' || x.textContent === 'Sécurité');
  sec?.insertAdjacentHTML('beforebegin', `<h3>Affichage</h3>
    <label class="f" for="s_theme">Jour / nuit</label>
    <select id="s_theme"><option value="auto">Automatique (sombre au crépuscule)</option><option value="jour">Toujours clair (jour)</option><option value="nuit">Toujours sombre (nuit)</option></select>
    <p class="hint" id="themeHint"></p>`);
  const sel = document.getElementById('s_theme');
  if (sel) { sel.value = mode(); sel.onchange = e=>{ try { localStorage.setItem(KEY, e.target.value); } catch {} apply(); }; }
  document.getElementById('btnSettings')?.addEventListener('click', ()=>{ if (sel) sel.value = mode(); apply(); });
  apply();
})();
