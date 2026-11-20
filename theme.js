'use strict';
/* CIF 2.0 — v1.2.2 : affichage jour / nuit.
   Auto : clair le jour, sombre la nuit ; bascule au crépuscule et à l'aube (soleil à 6° sous l'horizon),
   heures calculées sur le téléphone pour Monaco, sans connexion. Réglage : Auto / Jour / Nuit (Réglages › Affichage).
   Le mode jour inverse l'affichage sombre ; photos, caméra et plaques gardent leurs vraies couleurs. */
(()=>{
  const LAT = 43.7333, LNG = 7.4167, KEY = 'cifTheme';
  document.head.insertAdjacentHTML('beforeend', `<style>
html.jour{filter:invert(1) hue-rotate(180deg);background:#fff}
html.jour img,html.jour video,html.jour canvas,html.jour .plate,html.jour .platerow,html.jour [data-noinv]{filter:invert(1) hue-rotate(180deg)}
html.jour body::after{content:'';position:fixed;left:0;right:0;top:0;height:env(safe-area-inset-top);background:#fff;z-index:2147483647;pointer-events:none}
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
