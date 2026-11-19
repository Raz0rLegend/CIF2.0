'use strict';
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
