'use strict';
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
