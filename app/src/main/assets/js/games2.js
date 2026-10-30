/* More spelling games, based on classroom memorisation methods:
   - Feu tricolore (regarder → épeler dans sa tête → écrire)
   - Syllabes (découper le mot en syllabes, CP/CE1)
   - Le mot qui s'efface (copie avec disparition progressive du modèle)
   - Memory des sons (associer le mot écrit au mot entendu)
   - Mots mêlés (repérer l'orthographe exacte dans une grille) */
(function () {
  const { html, el } = UI;
  const esc = FR.esc;
  const G = window.Games;
  const say = (t, o = {}) => Speech.speak(t, Object.assign({ rate: Store.data.settings.ttsRate }, o));
  const isSep = ch => ch === ' ' || ch === "'" || ch === '-';
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  Object.assign(G.GAMES, {
    feu:       { name: 'Feu tricolore', icon: 'clock', tex: 'laine', desc: 'Regarde, épelle, écris' },
    syllabes:  { name: 'Syllabes', icon: 'letters', tex: 'tronc', desc: 'Remets les syllabes' },
    efface:    { name: 'Le mot qui s\'efface', icon: 'eye', tex: 'violet', desc: 'Copie sans modèle' },
    memory:    { name: 'Memory des sons', icon: 'speaker', tex: 'gemme', desc: 'Associe mot et son' },
    motsmeles: { name: 'Mots mêlés', icon: 'hole', tex: 'champi', desc: 'Retrouve les mots' }
  });

  /* ---------- spelled-out letters for TTS ---------- */
  const letterName = ch => ({ "'": 'apostrophe', '-': 'trait d\'union', ' ': 'espace', 'é': 'é accent aigu', 'è': 'è accent grave', 'ê': 'ê accent circonflexe', 'à': 'a accent grave', 'ç': 'c cédille', 'ù': 'u accent grave', 'â': 'a accent circonflexe', 'î': 'i accent circonflexe', 'ô': 'o accent circonflexe', 'û': 'u accent circonflexe', 'ë': 'e tréma', 'ï': 'i tréma', 'œ': 'o e collés' })[ch.toLowerCase()] || ch.toLowerCase();
  function speakAsync(t, rate) { return new Promise(res => Speech.speak(t, { rate: rate || Store.data.settings.ttsRate, onDone: res })); }

  /* ================= FEU TRICOLORE ================= */
  G.ROUNDS.feu = async function (area, word, done, root) {
    let errors = 0, alive = true;
    area.innerHTML = '';
    const light = el(`<div class="traffic"><i class="g on"></i><i class="o"></i><i class="r"></i></div>`);
    const prompt = el('<div class="prompt">Feu vert : regarde bien le mot !</div>');
    const big = el(`<div class="word-big">${[...word].map(c => `<span class="lt">${esc(c)}</span>`).join('')}</div>`);
    const row = el('<div class="row center"></div>');
    area.append(light, prompt, big, row);
    const setLight = c => light.querySelectorAll('i').forEach(i => i.classList.toggle('on', i.classList.contains(c)));
    area._stop = () => { alive = false; };
    await speakAsync(word);
    if (!alive || !area.isConnected) return;
    // spell letter by letter, highlighting
    const lts = big.querySelectorAll('.lt');
    prompt.textContent = 'Écoute-le épelé, lettre par lettre…';
    for (let i = 0; i < lts.length; i++) {
      if (!area.isConnected) return;
      lts.forEach(x => x.classList.remove('hl')); lts[i].classList.add('hl');
      if (!isSep(word[i]) || word[i] !== ' ') await speakAsync(letterName(word[i]), 0.9);
      await sleep(120);
    }
    lts.forEach(x => x.classList.remove('hl'));
    if (!area.isConnected) return;
    // orange: in your head
    setLight('o');
    big.classList.add('covered');
    prompt.textContent = 'Feu orange : ferme les yeux et épelle-le dans ta tête !';
    const cd = el('<div class="cd-dots"><i></i><i></i><i></i><i></i></div>');
    row.appendChild(cd);
    for (let i = 0; i < 4; i++) { await sleep(900); if (!area.isConnected) return; cd.children[i].classList.add('on'); SFX.play('beep'); }
    row.innerHTML = '';
    // red: write
    setLight('r');
    prompt.textContent = 'Feu rouge : écris-le !';
    row.appendChild(UI.speakBtn(word));
    const t = G.typer(area, word, {
      onSubmit(v) {
        if (G.same(v, word)) { big.classList.remove('covered'); setLight('g'); G.success(root, big); setTimeout(() => done(errors), 1100); return; }
        errors++; G.fail(root, t.slots); t.showDiff(); big.classList.remove('covered');
        prompt.textContent = 'Regarde encore le mot…';
        setTimeout(() => { big.classList.add('covered'); t.keepCorrect(); prompt.textContent = 'Feu rouge : à toi !'; }, 2400);
      }
    });
  };

  /* ================= SYLLABES ================= */
  G.ROUNDS.syllabes = function (area, word, done, root) {
    let errors = 0;
    area.innerHTML = '';
    let parts = FR.syllables(word).filter(p => p.w).map(p => p.s);
    let mode = 'syl';
    if (parts.length < 2) { parts = [...word].filter(c => !isSep(c)); mode = 'let'; }
    const prompt = el(`<div class="prompt">${mode === 'syl' ? 'Remets les syllabes dans l\'ordre !' : 'Mot en une syllabe : remets les lettres !'}</div>`);
    const tools = el('<div class="row center"></div>');
    tools.appendChild(UI.speakBtn(() => parts.join(' - '), 'Écouter les syllabes'));
    const slots = el('<div class="syl-slots"></div>');
    const pool = el('<div class="letter-blocks"></div>');
    area.append(prompt, tools, slots, pool);
    const filled = parts.map(() => null);
    const tex = FR.shuffle(G.TEX)[0];
    const colors = ['syl-a', 'syl-b'];
    function drawSlots() {
      slots.innerHTML = '';
      parts.forEach((p, i) => {
        const s = el(`<div class="syl-slot ${filled[i] != null ? 'filled ' + colors[i % 2] : ''}">${filled[i] != null ? esc(parts[filled[i]]) : ''}</div>`);
        s.style.minWidth = Math.max(1.4, p.length * .72) + 'em';
        s.onclick = () => { if (filled[i] != null) { pool.querySelector(`[data-i="${filled[i]}"]`).classList.remove('used'); filled[i] = null; drawSlots(); } };
        slots.appendChild(s);
      });
    }
    let order = FR.shuffle(parts.map((_, i) => i));
    for (let k = 0; k < 5 && order.every((v, i) => v === i); k++) order = FR.shuffle(order);
    order.forEach((i, k) => {
      const b = el(`<button class="lblock syl-block" data-i="${i}">${esc(parts[i])}</button>`);
      b.style.backgroundImage = `url(${Pixel.texture(tex)})`; b.style.animationDelay = (k * 0.07) + 's';
      b.onclick = () => {
        const at = filled.findIndex(f => f == null); if (at < 0) return;
        filled[at] = i; b.classList.add('used'); SFX.play('place'); say(parts[i], { rate: 0.8 });
        drawSlots();
        if (filled.every(f => f != null)) check();
      };
      pool.appendChild(b);
    });
    drawSlots();
    setTimeout(() => say(word), 300);
    function check() {
      const built = filled.map(i => parts[i]).join('');
      const target = parts.join('');
      if (built.toLowerCase() === target.toLowerCase()) {
        slots.classList.add('ok'); G.success(root, slots);
        setTimeout(() => say(parts.join(' '), { rate: 0.7 }), 300);
        setTimeout(() => done(errors), 1500); return;
      }
      errors++; G.fail(root, slots);
      slots.querySelectorAll('.syl-slot').forEach((s, i) => s.classList.add(parts[filled[i]] === parts[i] ? 'good' : 'bad'));
      setTimeout(() => {
        filled.forEach((f, i) => { if (parts[f] !== parts[i]) { pool.querySelector(`[data-i="${f}"]`).classList.remove('used'); filled[i] = null; } });
        drawSlots();
      }, 1100);
    }
  };

  /* ================= LE MOT QUI S'EFFACE ================= */
  G.ROUNDS.efface = function (area, word, done, root) {
    let errors = 0, step = 0;
    const idx = [...word].map((c, i) => i).filter(i => !isSep(word[i]));
    const hideOrder = FR.shuffle(idx);
    const steps = [0, Math.ceil(idx.length / 2), idx.length];
    function render() {
      area.innerHTML = '';
      const hidden = new Set(hideOrder.slice(0, steps[step]));
      const labels = ['Copie le mot.', 'Des lettres se sont envolées : écris le mot entier !', 'Le mot a disparu : écris-le de mémoire !'];
      const prompt = el(`<div class="prompt">Étape ${step + 1}/3 · ${labels[step]}</div>`);
      const big = el(`<div class="word-big fade-word">${[...word].map((c, i) => hidden.has(i) ? `<span class="gone">${esc(c)}</span>` : `<span>${esc(c)}</span>`).join('')}</div>`);
      const tools = el('<div class="row center"></div>'); tools.appendChild(UI.speakBtn(word));
      area.append(prompt, big, tools);
      requestAnimationFrame(() => big.querySelectorAll('.gone').forEach((s, k) => setTimeout(() => s.classList.add('vanish'), 150 + k * 120)));
      const t = G.typer(area, word, {
        onSubmit(v) {
          if (G.same(v, word)) {
            SFX.play('good'); UI.burstAt(big, { n: 10, spread: 90 });
            if (step < 2) { step++; setTimeout(render, 700); }
            else { G.success(root, big); setTimeout(() => done(errors), 1100); }
            return;
          }
          if (step === 2) errors++;
          G.fail(root, t.slots); t.showDiff();
          big.querySelectorAll('.gone').forEach(s => s.classList.remove('vanish'));
          setTimeout(() => { big.querySelectorAll('.gone').forEach(s => s.classList.add('vanish')); t.keepCorrect(); }, 2000);
        }
      });
    }
    render();
    say(word);
  };

  /* ================= MEMORY DES SONS ================= */
  UI.register('memory', (root, { title, words }) => {
    UI.setTitle(title);
    const ws = FR.shuffle(words).slice(0, 6);
    const cards = FR.shuffle(ws.flatMap((w, i) => [{ w, i, kind: 'txt' }, { w, i, kind: 'snd' }]));
    const wrap = el(`<div class="game center-col"><div class="prompt">Trouve les paires : un mot écrit et le même mot entendu !</div><div class="mem-grid"></div><div class="prompt" data-z="tries"></div></div>`);
    root.appendChild(wrap);
    const grid = wrap.querySelector('.mem-grid');
    grid.style.gridTemplateColumns = `repeat(${cards.length > 8 ? 4 : cards.length > 6 ? 4 : 3}, minmax(0, 1fr))`;
    let open = [], found = 0, tries = 0, lock = false;
    const errs = {};
    cards.forEach((c, k) => {
      const b = el(`<button class="mem-card" style="animation-delay:${k * 0.04}s"><span class="mem-back">${Pixel.svg('star')}</span><span class="mem-front">${c.kind === 'txt' ? `<b>${esc(c.w)}</b>` : `<span class="mem-snd">${Pixel.svg('speaker')}</span>`}</span></button>`);
      b.onclick = () => {
        if (lock || b.classList.contains('up') || b.classList.contains('done')) return;
        b.classList.add('up'); SFX.play('pop');
        if (c.kind === 'snd') say(c.w); else say(c.w);
        open.push([b, c]);
        if (open.length === 2) {
          tries++; lock = true;
          const [[b1, c1], [b2, c2]] = open;
          if (c1.i === c2.i && c1.kind !== c2.kind) {
            setTimeout(() => {
              b1.classList.add('done'); b2.classList.add('done'); SFX.play('good'); UI.burstAt(b2, { n: 12, spread: 90 });
              Store.recordWord(c1.w, !errs[c1.i]); found++; open = []; lock = false;
              if (found === ws.length) finish();
            }, 500);
          } else {
            errs[c1.i] = 1; errs[c2.i] = 1;
            setTimeout(() => { b1.classList.remove('up'); b2.classList.remove('up'); open = []; lock = false; }, 1100);
          }
          wrap.querySelector('[data-z=tries]').textContent = `Essais : ${tries}`;
        }
      };
      grid.appendChild(b);
    });
    function finish() {
      const perfect = ws.length, ratio = perfect / tries;
      const stars = ratio > .8 ? 3 : ratio > .5 ? 2 : 1;
      UI.results({ title: 'Toutes les paires !', stars, gems: ws.length * 2 + stars * 2, xp: ws.length * 8, lines: [`${tries} essais pour ${ws.length} paires`],
        onAgain: () => UI.go('memory', { title, words }, { replace: true }), onDone: () => UI.back() });
    }
  });

  /* ================= MOTS MÊLÉS ================= */
  UI.register('motsmeles', (root, { title, words }) => {
    UI.setTitle(title);
    const usable = FR.shuffle(words.filter(w => !/[\s'-]/.test(w) && w.length >= 2 && w.length <= 10)).slice(0, 6);
    if (usable.length < 2) {
      root.appendChild(el(`<div class="center-col"><p class="prompt">Il faut au moins 2 mots sans espace pour jouer aux mots mêlés.</p></div>`));
      return;
    }
    const N = Math.max(8, Math.min(11, Math.max(...usable.map(w => w.length)) + 3));
    const grid = Array.from({ length: N }, () => new Array(N).fill(null));
    const placed = [];
    usable.forEach(w => {
      const L = [...w.toLowerCase()];
      for (let t = 0; t < 200; t++) {
        const dir = Math.random() < .5 ? [1, 0] : [0, 1];
        const x0 = Math.floor(Math.random() * (N - (dir[0] ? L.length : 0) + (dir[0] ? 1 : 0)) ), y0 = Math.floor(Math.random() * (N - (dir[1] ? L.length : 0) + (dir[1] ? 1 : 0)));
        if (x0 + dir[0] * (L.length - 1) >= N || y0 + dir[1] * (L.length - 1) >= N) continue;
        let ok = true;
        for (let i = 0; i < L.length; i++) { const c = grid[y0 + dir[1] * i][x0 + dir[0] * i]; if (c && c !== L[i]) { ok = false; break; } }
        if (!ok) continue;
        const cells = [];
        for (let i = 0; i < L.length; i++) { grid[y0 + dir[1] * i][x0 + dir[0] * i] = L[i]; cells.push((y0 + dir[1] * i) * N + x0 + dir[0] * i); }
        placed.push({ w, cells, found: false });
        return;
      }
    });
    // filler letters: common French letters, plus the words' own letters to make it fair
    const pool = 'eeeaaaiiissnnrrttuoollcdmp' + usable.join('').toLowerCase();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!grid[y][x]) grid[y][x] = pool[Math.floor(Math.random() * pool.length)];
    const wrap = el(html`<div class="mm-wrap center-col">
      <div class="mm-grid" style="grid-template-columns:repeat(${N}, 1fr)">${grid.flat().map((c, i) => `<span class="mm-cell" data-i="${i}">${esc(c)}</span>`).join('')}</div>
      <div class="mm-side"><div class="prompt">Glisse ton doigt sur chaque mot !</div><div class="mm-list">${placed.map((p, i) => `<button class="chip mm-word" data-w="${i}">${esc(p.w)}</button>`).join('')}</div></div></div>`);
    root.appendChild(wrap);
    const gridEl = wrap.querySelector('.mm-grid');
    const cellsEl = [...gridEl.children];
    wrap.querySelectorAll('.mm-word').forEach(b => b.onclick = () => say(placed[+b.dataset.w].w));
    let start = null, sel = [], misses = 0;
    const cellAt = (x, y) => { const t = document.elementFromPoint(x, y); return t && t.classList && t.classList.contains('mm-cell') ? +t.dataset.i : null; };
    const line = (a, b) => {
      const ax = a % N, ay = Math.floor(a / N), bx = b % N, by = Math.floor(b / N);
      if (ax !== bx && ay !== by) return [a];
      const out = []; const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
      for (let i = 0; i <= n; i++) out.push((ay + Math.sign(by - ay) * i) * N + ax + Math.sign(bx - ax) * i);
      return out;
    };
    const paint = () => cellsEl.forEach((c, i) => c.classList.toggle('sel', sel.includes(i)));
    gridEl.addEventListener('pointerdown', e => { const i = cellAt(e.clientX, e.clientY); if (i == null) return; start = i; sel = [i]; paint(); gridEl.setPointerCapture(e.pointerId); });
    gridEl.addEventListener('pointermove', e => { if (start == null) return; const i = cellAt(e.clientX, e.clientY); if (i == null) return; sel = line(start, i); paint(); });
    const end = () => {
      if (start == null) return;
      const key = sel.join(','), rev = sel.slice().reverse().join(',');
      const hit = placed.find(p => !p.found && (p.cells.join(',') === key || p.cells.join(',') === rev));
      if (hit) {
        hit.found = true; SFX.play('good'); say(hit.w);
        hit.cells.forEach(i => cellsEl[i].classList.add('found', 'f' + (placed.indexOf(hit) % 6)));
        const chip = wrap.querySelector(`[data-w="${placed.indexOf(hit)}"]`); chip.classList.add('done'); UI.burstAt(chip, { n: 10, spread: 80 });
        Store.recordWord(hit.w, true);
        if (placed.every(p => p.found)) finish();
      } else if (sel.length > 1) { misses++; SFX.play('bad'); UI.shake(gridEl); }
      start = null; sel = []; paint();
    };
    gridEl.addEventListener('pointerup', end); gridEl.addEventListener('pointercancel', end);
    function finish() {
      const stars = misses === 0 ? 3 : misses < 3 ? 2 : 1;
      setTimeout(() => UI.results({ title: 'Tous trouvés !', stars, gems: placed.length * 2 + stars * 2, xp: placed.length * 8, lines: [`${placed.length} mots trouvés`],
        onAgain: () => UI.go('motsmeles', { title, words }, { replace: true }), onDone: () => UI.back() }), 600);
    }
  });
})();
