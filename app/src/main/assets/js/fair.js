/* Jeu sérieux : un enfant qui répond n'importe comment (lettres tapées au hasard, réponses cliquées à toute vitesse)
   reçoit d'abord un carton jaune (avertissement), puis un carton rouge qui retire quelques pièces.
   Une vraie erreur de quelqu'un qui cherche n'est jamais sanctionnée. Réglable dans l'espace parent. */
(function () {
  const FINE = 5, MAX_FINES = 3, COOLDOWN = 4000;
  let offences = 0, fines = 0, lastOff = 0, wrongs = [];
  const on = () => Store.data.settings.fair !== false;

  function lev(a, b) {
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
    return prev[n];
  }
  const clean = s => FR.norm(s).replace(/[\s'’-]/g, '');

  function showCard(kind, text) {
    const fx = document.getElementById('fx-layer');
    const c = document.createElement('div');
    c.className = 'fair-card ' + kind;
    c.innerHTML = `<div class="fair-rect"></div><div class="fair-txt">${text}</div>`;
    fx.appendChild(c);
    setTimeout(() => c.remove(), 2600);
  }

  function offence(reason) {
    if (!on()) return;
    const now = Date.now();
    if (now - lastOff < COOLDOWN) return;
    lastOff = now; offences++;
    SFX.play('bad'); Haptic(200);
    const st = Store.data.stats;
    st.fair = st.fair || { warn: 0, fines: 0, lost: 0 };
    if (offences === 1) {
      st.fair.warn++; Store.save();
      showCard('yellow', reason === 'fast'
        ? 'Carton jaune ! Doucement : prends le temps de réfléchir avant de répondre.'
        : 'Carton jaune ! Réponds sérieusement, sinon tu perdras des ' + Theme.t.cur + '.');
      return;
    }
    if (fines >= MAX_FINES) { showCard('yellow', 'Prends ton temps et applique-toi 🙂'); return; }
    const lose = Math.min(FINE, st.gems);
    st.gems -= lose; fines++;
    st.fair.fines++; st.fair.lost += lose; Store.save(true);
    UI.refreshHud(true);
    showCard('red', `Carton rouge : −${lose} ${Theme.t.cur}. Tu as répondu n'importe comment !`);
  }

  window.Fair = {
    /* nouvelle partie */
    reset() { offences = 0; fines = 0; lastOff = 0; wrongs = []; },
    /* une mauvaise réponse : trois en moins de 5 secondes = on clique au hasard */
    wrong() {
      const now = Date.now();
      wrongs = wrongs.filter(t => now - t < 5000); wrongs.push(now);
      if (wrongs.length >= 3) { wrongs = []; offence('fast'); }
    },
    /* un mot écrit : très loin du bon mot = tapé au hasard */
    attempt(a, target) {
      const x = clean(a), y = clean(target);
      if (y.length < 3 || x === y) return;
      const sim = 1 - lev(x, y) / Math.max(x.length, y.length);
      const shared = new Set([...x].filter(ch => y.includes(ch))).size / new Set(y).size;
      if (sim < 0.3 && shared < 0.5) offence('random');
    },
    offence
  };
})();
