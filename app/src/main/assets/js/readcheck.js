/* Lecture corrigée par l'IA : l'enfant lit sa fiche à voix haute, l'IA suit sa lecture mot à mot,
   repère les mots sautés ou mal lus et calcule les mots correctement lus par minute (MCLM).
   Le reste de la lecture (chrono, écoute, lis après moi) reste un travail accompagné par un adulte. */
(function () {
  const { html, el } = UI;
  const esc = FR.esc;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const dateStr = t => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const fmt = ms => { const s = ms / 1000; const m = Math.floor(s / 60); const r = s - m * 60; return (m ? m + ':' + (r < 10 ? '0' : '') + r.toFixed(1) : r.toFixed(1) + ' s'); };
  let player = null;
  const stopPlayer = () => { if (player) { player.pause(); player = null; } };
  const play = blob => { stopPlayer(); if (blob) { player = new Audio(URL.createObjectURL(blob)); player.play(); } };

  const canCheck = sheet => sheet && sheet.type !== 'sons' && window.Ear && Ear.available();

  UI.register('readCheck', (root, { sheetId }) => {
    const sheet = Store.sheet(sheetId);
    if (!sheet) { UI.home(); return; }
    UI.setTitle('Lecture corrigée');
    root.classList.add('full');
    const st = Store.data.settings;
    const units = Fluence.buildUnits(sheet);
    const grid = units.length && units[0].grid;
    const texts = units.map(u => u.text);
    let mode = 'idle', sess = null, t0 = 0, tick = 0, endT = 0, last = Ear.match(texts, '');

    const wrap = el(html`<div class="reader-wrap center-col">
      <div class="prompt rc-prompt">🤖 Lis la fiche à voix haute, sans te presser. Je t'écoute et je corrige !</div>
      <div class="ear-status rc-status"><span class="ear-mic">🎤</span><span class="st">Appuie sur « C'est parti » quand tu es prêt.</span></div>
      <div class="reader rc-reader ${grid ? 'grid-mode' : ''}"></div>
      <div class="chrono-bar">
        <div class="chrono">0.0 s</div>
        <button class="pix-btn green big" data-a="go">${Pixel.svg('play')} C'est parti !</button>
        <button class="pix-btn small wood" data-a="hist">${Pixel.svg('trophy')} Mes lectures</button>
      </div></div>`);
    root.appendChild(wrap);
    const reader = wrap.querySelector('.reader'), chrono = wrap.querySelector('.chrono'), go = wrap.querySelector('[data-a=go]');
    const status = wrap.querySelector('.rc-status'), stEl = status.querySelector('.st');

    function base() {
      const vmin = Math.min(innerWidth, innerHeight) / 100;
      const b = sheet.type === 'mots' ? 6.4 : sheet.type === 'phrases' ? 4.6 : 4;
      return Math.max(20, b * vmin * (st.readerScale || 1));
    }
    function render() {
      reader.style.fontSize = base() + 'px';
      reader.innerHTML = '';
      units.forEach((u, ui) => {
        if (u.grid) { reader.appendChild(el(`<span class="item w" data-u="${ui}" data-wi="0">${esc(u.text)}</span>`)); return; }
        const line = el(`<span class="line" data-u="${ui}"></span>`);
        if (u.paraStart) line.style.marginTop = '.6em';
        const re = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
        let pos = 0, out = '', wi = 0, m;
        while ((m = re.exec(u.text)) !== null) {
          out += esc(u.text.slice(pos, m.index));
          out += `<span class="w" data-u="${ui}" data-wi="${wi++}">${esc(m[0])}</span>`;
          pos = m.index + m[0].length;
        }
        line.innerHTML = out + esc(u.text.slice(pos));
        if (sheet.type === 'texte' && !u.paraStart) line.style.display = 'inline';
        reader.appendChild(line);
        if (sheet.type === 'texte') reader.appendChild(document.createTextNode(' '));
      });
      paint(last, false);
    }
    const span = (ui, wi) => reader.querySelector(`.w[data-u="${ui}"][data-wi="${wi}"]`);
    /* colore les mots lus et place le curseur sur le mot suivant */
    function paint(res, final) {
      reader.querySelectorAll('.rc-next').forEach(n => n.classList.remove('rc-next'));
      let lastOk = null;
      res.lines.forEach((l, ui) => l.words.forEach((x, wi) => {
        const s = span(ui, wi); if (!s) return;
        s.classList.toggle('rc-ok', x.ok);
        s.classList.toggle('rc-miss', !!final && !x.ok);
        if (x.ok) lastOk = [ui, wi];
      }));
      if (final || mode !== 'reading') return;
      // prochain mot à lire
      let found = !lastOk, nx = null;
      outer: for (let ui = 0; ui < res.lines.length; ui++) for (let wi = 0; wi < res.lines[ui].words.length; wi++) {
        if (found && !res.lines[ui].words[wi].ok) { nx = [ui, wi]; break outer; }
        if (lastOk && ui === lastOk[0] && wi === lastOk[1]) found = true;
      }
      if (nx) {
        const s = span(nx[0], nx[1]);
        if (s) {
          s.classList.add('rc-next');
          const r = s.getBoundingClientRect(), rr = reader.getBoundingClientRect();
          if (r.bottom > rr.bottom - 20 || r.top < rr.top) reader.scrollTop += r.top - rr.top - rr.height / 3;
        }
      }
    }

    async function start() {
      mode = 'countdown'; go.disabled = true;
      last = Ear.match(texts, ''); paint(last, false); reader.scrollTop = 0;
      for (const n of ['3', '2', '1']) {
        const cd = el(`<div class="countdown"><span>${n}</span></div>`);
        document.body.appendChild(cd); SFX.play('beep');
        await sleep(850); cd.remove();
        if (mode !== 'countdown') return;
      }
      const cd = el(`<div class="countdown"><span style="color:var(--grass-hi)">Lis !</span></div>`);
      document.body.appendChild(cd); setTimeout(() => cd.remove(), 900);
      SFX.play('go');
      mode = 'reading';
      sess = Ear.listen({
        onState(x) { if (x === 'listening' && mode === 'reading') { stEl.textContent = 'Je t\'écoute… Le mot à lire est surligné.'; status.classList.add('listening'); } },
        onText(t) {
          if (mode !== 'reading') return;
          last = Ear.match(texts, t); paint(last, false);
          const L = last.lines[last.lines.length - 1];
          const endDone = L.words.length ? L.words.slice(-2).some(x => x.ok) && last.score > 0.5 : false;
          clearTimeout(endT); if (endDone) endT = setTimeout(finish, 1600);
        },
        onError(m) { stEl.textContent = m === 'mic' ? 'Le micro n\'est pas autorisé 😕' : 'Oups, je n\'arrive pas à écouter.'; status.classList.remove('listening'); }
      });
      t0 = performance.now();
      chrono.classList.add('running');
      tick = setInterval(() => { chrono.textContent = fmt(performance.now() - t0); }, 100);
      go.disabled = false; go.className = 'pix-btn red big'; go.innerHTML = Pixel.svg('stop') + " J'ai fini !";
    }

    async function finish() {
      if (mode !== 'reading') return;
      mode = 'checking'; clearTimeout(endT);
      const ms = performance.now() - t0;
      clearInterval(tick); chrono.classList.remove('running');
      go.disabled = true; stEl.textContent = 'Je corrige…'; status.classList.remove('listening');
      const r = sess ? await sess.stop() : { text: '' }; sess = null;
      if (mode !== 'checking') return;
      const res = Ear.match(texts, r.text);
      last = res; paint(res, true);
      const total = res.lines.reduce((a, l) => a + l.words.length, 0);
      const correct = res.lines.reduce((a, l) => a + l.words.filter(x => x.ok).length, 0);
      const missed = [];
      res.lines.forEach(l => l.words.forEach(x => { if (!x.ok && missed.length < 40 && !missed.includes(x.w)) missed.push(x.w); }));
      const pct = total ? Math.round(correct / total * 100) : 0;
      const mclm = Math.round(correct / Math.max(ms / 60000, 1 / 60));
      const prev = (sheet.ai || []).slice(-1)[0];
      const entry = { id: Store.uid(), date: Date.now(), ms: Math.round(ms), total, correct, pct, mclm, missed, recId: null };
      if (r.blob) { entry.recId = 'airec_' + entry.id; await Store.Blobs.put(entry.recId, r.blob); }
      sheet.ai = (sheet.ai || []).concat(entry);
      while (sheet.ai.filter(x => x.recId).length > 8) { const o = sheet.ai.find(x => x.recId); await Store.Blobs.del(o.recId); o.recId = null; }
      Store.save(true);
      const gems = pct >= 95 ? 10 : pct >= 85 ? 7 : pct >= 60 ? 4 : 2;
      const reward = Store.addReward(gems, 15 + Math.round(pct / 5));
      const stars = pct >= 95 ? 3 : pct >= 80 ? 2 : 1;
      SFX.play(pct >= 80 ? 'record' : 'good');
      const title = pct === 100 ? 'Lecture parfaite !' : pct >= 85 ? 'Très bien lu !' : pct >= 60 ? 'Bien lu !' : 'Continue, ça progresse !';
      const m = UI.modal(html`<div class="levelup">
        <div class="rays"></div>
        <h2>${title}</h2>
        <div class="result-stars">${[0, 1, 2].map(i => Pixel.svg('star', i < stars ? 'on' : '')).join('')}</div>
        <div class="rc-stats">
          <div><div class="big-num">${pct} %</div><div class="muted">mots bien lus (${correct} / ${total})</div></div>
          <div><div class="big-num">${mclm}</div><div class="muted">mots bien lus par minute${prev ? ` (avant : ${prev.mclm})` : ''}</div></div>
          <div><div class="big-num">${fmt(ms)}</div><div class="muted">temps de lecture</div></div>
        </div>
        ${missed.length ? `<p style="margin:.6em 0 .3em">Les mots à retravailler (touche-les pour les entendre) :</p>
          <div class="chips rc-missed">${missed.slice(0, 18).map(w => `<button class="chip" data-w="${esc(w)}">${esc(w)}</button>`).join('')}</div>` : '<p>Tous les mots ont été bien lus, bravo !</p>'}
        <div class="row center" style="font-size:clamp(20px,3.4vmin,32px);font-weight:700;margin:1vmin 0"><span style="width:1.4em;display:inline-block">${Pixel.svg('gem')}</span> +${gems}</div>
        <div class="row center">
          ${entry.recId ? `<button class="pix-btn gold big" data-a="play">${Pixel.svg('speaker')} M'écouter</button>` : ''}
          <button class="pix-btn wood big" data-a="see">Voir ma fiche</button>
          <button class="pix-btn green big" data-a="ok">Super !</button>
        </div></div>`, { locked: true });
      if (stars >= 2) UI.confetti();
      UI.flyGems(m, gems);
      m.querySelectorAll('.result-stars svg.on').forEach((s, i) => s.style.animationDelay = (0.25 + i * 0.3) + 's');
      m.querySelectorAll('[data-w]').forEach(b => b.onclick = () => Speech.speak(b.dataset.w, { rate: .75 }));
      const pb = m.querySelector('[data-a=play]'); if (pb) pb.onclick = () => play(r.blob);
      const close = () => { stopPlayer(); UI.closeModal(); if (reward.levelUp) UI.levelUp(reward.levelUp); reset(); };
      m.querySelector('[data-a=ok]').onclick = close;
      m.querySelector('[data-a=see]').onclick = () => { stopPlayer(); UI.closeModal(); if (reward.levelUp) UI.levelUp(reward.levelUp); reset(true); };
    }
    function reset(keepMarks) {
      mode = 'idle';
      go.disabled = false; go.className = 'pix-btn green big'; go.innerHTML = Pixel.svg('play') + ' Je recommence';
      stEl.textContent = keepMarks ? 'En vert : bien lu. En rouge : à retravailler (touche un mot pour l\'entendre).' : 'Appuie sur « Je recommence » pour relire.';
      if (!keepMarks) { last = Ear.match(texts, ''); paint(last, false); chrono.textContent = '0.0 s'; }
    }
    reader.addEventListener('click', e => {
      if (mode === 'reading' || mode === 'countdown') return;
      const w = e.target.closest('.w'); if (!w) return;
      Speech.speak(w.textContent, { rate: .75 });
    });
    go.onclick = () => { if (mode === 'idle') start(); else if (mode === 'reading') finish(); };
    wrap.querySelector('[data-a=hist]').onclick = () => {
      const list = (sheet.ai || []).slice().reverse().slice(0, 10);
      if (!list.length) { UI.toast('Pas encore de lecture corrigée.'); return; }
      const m = UI.modal(html`<h2>🤖 Mes lectures corrigées</h2>
        ${list.map(a => `<div class="list-row"><div class="grow"><div class="t">${dateStr(a.date)} · <b>${a.pct} %</b> · ${a.mclm} mots/min</div>
          <div class="s">${fmt(a.ms)}${a.missed && a.missed.length ? ' · à revoir : ' + a.missed.slice(0, 6).map(esc).join(', ') : ''}</div></div>
          ${a.recId ? `<button class="pix-btn small gold" data-rec="${a.recId}">${Pixel.svg('speaker')} Écouter</button>` : ''}</div>`).join('')}
        <div class="row end"><button class="pix-btn green" data-a="close">Fermer</button></div>`, { cls: 'wide', onClose: stopPlayer });
      m.querySelectorAll('[data-rec]').forEach(b => b.onclick = async () => play(await Store.Blobs.get(b.dataset.rec)));
      m.querySelector('[data-a=close]').onclick = () => UI.closeModal();
    };
    render();
    const onResize = () => render();
    addEventListener('resize', onResize);
    return () => {
      mode = 'gone'; clearInterval(tick); clearTimeout(endT); stopPlayer(); Speech.stop();
      if (sess) sess.cancel();
      removeEventListener('resize', onResize);
      root.classList.remove('full');
    };
  });

  window.ReadCheck = { canCheck };
})();
