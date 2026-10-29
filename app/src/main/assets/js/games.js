/* Spelling mini-games, game sessions, word list screens. */
(function () {
  const { html, el } = UI;
  const esc = FR.esc;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rate = () => Store.data.settings.ttsRate;
  const say = (t, o = {}) => Speech.speak(t, Object.assign({ rate: rate() }, o));
  const isSep = ch => ch === ' ' || ch === "'" || ch === '-';
  const TEX = ['pierre', 'bois', 'brique', 'herbe', 'violet', 'eau', 'terre', 'tronc', 'champi'];

  const GAMES = {
    look:    { name: 'Regarde & Écris', icon: 'eye', tex: 'herbe', desc: 'Mémorise puis écris' },
    anagram: { name: 'Lettres mélangées', icon: 'letters', tex: 'bois', desc: 'Remets les lettres' },
    trous:   { name: 'Mot à trous', icon: 'hole', tex: 'sable', desc: 'Trouve les lettres' },
    ore:     { name: 'Le bon bloc', icon: 'pickaxe', tex: 'pierre', desc: 'Casse le bon mot' },
    dictee:  { name: 'Dictée magique', icon: 'pencil', tex: 'brique', desc: 'Écoute et écris' },
    pluie:   { name: 'Pluie de mots', icon: 'rain', tex: 'eau', desc: 'Attrape le bon mot' }
  };

  /* ---------- feedback helpers ---------- */
  function success(root, node) {
    SFX.play('good');
    Haptic(25);
    UI.burstAt(node || root.querySelector('.game-area'));
    UI.mascotReact(root, 'jump');
    const r = (node || root).getBoundingClientRect();
    UI.floatText(FR.shuffle(['Bravo !', 'Super !', 'Génial !', 'Parfait !', 'Trop fort !', 'Yes !'])[0], r.left + r.width / 2, r.top + 10);
  }
  function fail(root, node) {
    SFX.play('bad');
    Haptic(120);
    if (node) UI.shake(node);
    UI.mascotReact(root, 'sad');
  }

  /* ---------- typing slots ---------- */
  function typer(area, target, { onSubmit, hideLength } = {}) {
    const chars = [...target];
    document.getElementById('screen').classList.add('typing', 'full');
    const slots = el('<div class="slots"></div>');
    let typed = [];
    const editable = chars.map((c, i) => isSep(c) ? -1 : i).filter(i => i >= 0);
    function render() {
      slots.innerHTML = '';
      let ti = 0;
      chars.forEach((c, i) => {
        if (isSep(c)) { slots.appendChild(el(`<div class="slot ${c === ' ' ? 'space' : 'filled'}">${c === ' ' ? '' : esc(c)}</div>`)); return; }
        const v = typed[ti];
        const s = el(`<div class="slot ${v ? 'filled' : ''} ${ti === typed.length ? 'cursor' : ''}">${v ? esc(v) : ''}</div>`);
        s.dataset.ti = ti;
        slots.appendChild(s);
        ti++;
      });
      if (hideLength) slots.querySelectorAll('.slot:not(.filled):not(.cursor)').forEach(s => s.style.opacity = .35);
    }
    render();
    const kb = UI.keyboard({
      space: false,
      onKey(ch) { if (ch === ' ' || ch === "'" || ch === '-') return; if (typed.length < editable.length) { typed.push(ch); render(); } },
      onDel() { typed.pop(); render(); },
      onOk() {
        if (typed.length < editable.length) { UI.shake(slots); SFX.play('bad'); return; }
        onSubmit(attempt());
      }
    });
    function attempt() {
      let ti = 0;
      return chars.map(c => isSep(c) ? c : typed[ti++]).join('');
    }
    area.appendChild(slots);
    area.appendChild(kb);
    return {
      slots, kb,
      showDiff() {
        const lt = [...target.toLowerCase()];
        let ti = 0;
        slots.querySelectorAll('.slot').forEach((s, i) => {
          if (isSep(chars[i])) return;
          s.classList.add(typed[ti] === lt[i] ? 'good' : 'bad');
          ti++;
        });
      },
      keepCorrect() {
        const lt = [...target.toLowerCase()];
        const kept = [];
        let ti = 0;
        for (let i = 0; i < chars.length; i++) {
          if (isSep(chars[i])) continue;
          if (typed[ti] === lt[i]) kept.push(typed[ti]); else break;
          ti++;
        }
        typed = kept; render();
      },
      reset() { typed = []; render(); },
      setFirst(ch) { if (!typed.length) { typed = [ch]; render(); } }
    };
  }

  const same = (a, b) => FR.norm(a) === FR.norm(b);

  /* ---------- round implementations: each calls done(errors) ---------- */
  const ROUNDS = {
    async look(area, word, done, root) {
      let errors = 0;
      area.innerHTML = '';
      const prompt = el('<div class="prompt">Regarde bien le mot…</div>');
      const big = el(`<div class="word-big">${FR.colorize(word)}</div>`);
      const tools = el('<div class="row center"></div>');
      tools.appendChild(UI.speakBtn(word, 'Écouter'));
      const ready = el(`<button class="pix-btn green big">${Pixel.svg('check')} Je l'ai dans la tête !</button>`);
      tools.appendChild(ready);
      area.append(prompt, big, tools);
      say(word);
      ready.onclick = () => startWrite();
      function startWrite() {
        big.classList.add('covered');
        SFX.play('place');
        prompt.textContent = 'Écris-le sans regarder !';
        tools.innerHTML = '';
        tools.appendChild(UI.speakBtn(word));
        const peek = el('<button class="pix-btn wood">Revoir</button>');
        tools.appendChild(peek);
        peek.onclick = () => { errors++; big.classList.remove('covered'); setTimeout(() => big.classList.add('covered'), 1600); };
        const t = typer(area, word, {
          onSubmit(v) {
            if (same(v, word)) { big.classList.remove('covered'); success(root, big); setTimeout(() => done(errors), 1100); }
            else {
              errors++; fail(root, t.slots); t.showDiff();
              prompt.textContent = 'Presque ! Regarde encore…';
              big.classList.remove('covered');
              setTimeout(() => { big.classList.add('covered'); t.keepCorrect(); prompt.textContent = 'À toi !'; }, 2400);
            }
          }
        });
      }
    },

    async anagram(area, word, done, root) {
      let errors = 0;
      area.innerHTML = '';
      const chars = [...word];
      const prompt = el('<div class="prompt">Remets les lettres dans l\'ordre !</div>');
      const tools = el('<div class="row center"></div>');
      tools.appendChild(UI.speakBtn(word, 'Écouter le mot'));
      const slots = el('<div class="slots"></div>');
      const pool = el('<div class="letter-blocks"></div>');
      area.append(prompt, tools, slots, pool);
      const fill = chars.map(c => isSep(c) ? c : null);
      const owner = chars.map(() => null);
      let letters = chars.map((c, i) => ({ c: c.toLowerCase(), i })).filter(x => !isSep(x.c));
      let order = FR.shuffle(letters);
      if (order.length > 2) for (let k = 0; k < 5 && order.map(x => x.c).join('') === letters.map(x => x.c).join(''); k++) order = FR.shuffle(letters);
      const tex = FR.shuffle(TEX)[0];
      order.forEach((x, k) => {
        const b = el(`<button class="lblock">${esc(x.c)}</button>`);
        b.style.backgroundImage = `url(${Pixel.texture(tex)})`;
        b.style.animationDelay = (k * 0.06) + 's';
        b.onclick = () => place(b, x.c);
        pool.appendChild(b);
      });
      function renderSlots() {
        slots.innerHTML = '';
        chars.forEach((c, i) => {
          if (isSep(c)) { slots.appendChild(el(`<div class="slot ${c === ' ' ? 'space' : 'filled'}">${c === ' ' ? '' : esc(c)}</div>`)); return; }
          const s = el(`<div class="slot ${fill[i] ? 'filled' : ''}">${fill[i] ? esc(fill[i]) : ''}</div>`);
          s.onclick = () => { if (fill[i] && owner[i]) { owner[i].classList.remove('used'); fill[i] = null; owner[i] = null; SFX.play('pop'); renderSlots(); } };
          slots.appendChild(s);
        });
      }
      renderSlots();
      say(word);
      function place(b, c) {
        const i = fill.findIndex(f => f === null);
        if (i < 0) return;
        fill[i] = c; owner[i] = b; b.classList.add('used'); SFX.play('place');
        renderSlots();
        if (fill.every(f => f !== null)) check();
      }
      function check() {
        const v = fill.join('');
        if (same(v, word)) { success(root, slots); setTimeout(() => done(errors), 1100); return; }
        errors++; fail(root, slots);
        const lw = [...word.toLowerCase()];
        slots.querySelectorAll('.slot').forEach((s, i) => { if (!isSep(chars[i])) s.classList.add(fill[i] === lw[i] ? 'good' : 'bad'); });
        setTimeout(() => {
          chars.forEach((c, i) => { if (!isSep(c) && fill[i] !== lw[i]) { owner[i] && owner[i].classList.remove('used'); fill[i] = null; owner[i] = null; } });
          renderSlots();
        }, 1000);
      }
    },

    async trous(area, word, done, root) {
      let errors = 0;
      area.innerHTML = '';
      const nb = [...word].filter(c => !isSep(c)).length <= 4 ? 1 : 2;
      const hs = FR.pickHoles(word, nb);
      const prompt = el('<div class="prompt">Quelles lettres manquent ?</div>');
      const tools = el('<div class="row center"></div>');
      tools.appendChild(UI.speakBtn(word, 'Écouter le mot'));
      const big = el('<div class="word-big"></div>');
      const choices = el('<div class="choices"></div>');
      area.append(prompt, tools, big, choices);
      say(word);
      let cur = 0;
      const filled = hs.map(() => false);
      function renderWord() {
        let out = '', pos = 0;
        hs.forEach((h, k) => {
          out += esc(word.slice(pos, h.i));
          out += filled[k]
            ? `<span style="color:var(--grass-lo)">${esc(h.s)}</span>`
            : `<span style="display:inline-block;min-width:${Math.max(1, h.s.length) * .62}em;border-bottom:.12em solid ${k === cur ? 'var(--gold-lo)' : 'var(--stone)'};background:${k === cur ? '#fff3b0' : 'transparent'}">&nbsp;</span>`;
          pos = h.i + h.len;
        });
        out += esc(word.slice(pos));
        big.innerHTML = out;
      }
      function renderChoices() {
        choices.innerHTML = '';
        if (cur >= hs.length) return;
        const h = hs[cur];
        const opts = FR.shuffle([h.s, ...FR.shuffle(h.alts).slice(0, 3)]);
        opts.forEach(o => {
          const b = el(`<button class="pix-btn wood choice">${esc(o) || '∅'}</button>`);
          b.onclick = () => {
            if (o.toLowerCase() === h.s.toLowerCase()) {
              filled[cur] = true; cur++; SFX.play('place'); UI.burstAt(big, { n: 10, spread: 100 });
              renderWord(); renderChoices();
              if (cur >= hs.length) { big.innerHTML = FR.colorize(word); success(root, big); setTimeout(() => done(errors), 1200); }
            } else { errors++; b.disabled = true; fail(root, b); }
          };
          choices.appendChild(b);
        });
      }
      renderWord(); renderChoices();
    },

    async ore(area, word, done, root) {
      let errors = 0;
      area.innerHTML = '';
      const prompt = el('<div class="prompt">Écoute, puis casse le bloc du mot bien écrit !</div>');
      const tools = el('<div class="row center"></div>');
      tools.appendChild(UI.speakBtn(word, 'Écouter le mot'));
      const grid = el('<div class="ore-grid"></div>');
      area.append(prompt, tools, grid);
      const opts = FR.shuffle([word, ...FR.misspellings(word, 3)]);
      const tex = FR.shuffle(['pierre', 'pierre', 'sable', 'terre'])[0];
      opts.forEach((o, k) => {
        const b = el(`<div class="ore"><span>${esc(o)}</span><div class="crack"></div></div>`);
        b.style.backgroundImage = `url(${Pixel.texture(tex)})`;
        b.style.animationDelay = (k * 0.08) + 's';
        b.onclick = () => {
          if (o === word) {
            b.classList.add('mined'); SFX.play('break');
            setTimeout(() => { UI.burstAt(b, { colors: ['#9a9a9a', '#6b6b6b', '#c4c4c4', '#4fe3d8'] }); success(root, b); }, 420);
            setTimeout(() => done(errors), 1400);
          } else { errors++; b.classList.add('wrong'); fail(root); }
        };
        grid.appendChild(b);
      });
      say(word);
    },

    async dictee(area, word, done, root) {
      let errors = 0;
      area.innerHTML = '';
      const canSpeak = Speech.available();
      const prompt = el(`<div class="prompt">${canSpeak ? 'Écoute bien et écris le mot !' : 'Regarde vite, puis écris le mot !'}</div>`);
      const tools = el('<div class="row center"></div>');
      const show = el(`<div class="word-big covered">${FR.colorize(word)}</div>`);
      tools.appendChild(UI.speakBtn(word, 'Réécouter'));
      const hint = el('<button class="pix-btn gold">Indice</button>');
      tools.appendChild(hint);
      area.append(prompt, tools, show);
      if (canSpeak) { show.style.display = 'none'; setTimeout(() => say(word), 350); }
      else { show.classList.remove('covered'); setTimeout(() => show.classList.add('covered'), 1800); }
      const t = typer(area, word, {
        onSubmit(v) {
          if (same(v, word)) { show.style.display = ''; show.classList.remove('covered'); success(root, show); setTimeout(() => done(errors), 1200); return; }
          errors++; fail(root, t.slots); t.showDiff();
          show.style.display = ''; show.classList.remove('covered');
          prompt.textContent = 'Voici le mot. Regarde bien !';
          setTimeout(() => { show.classList.add('covered'); t.keepCorrect(); prompt.textContent = 'Essaie encore !'; say(word); }, 2600);
        }
      });
      hint.onclick = () => { t.setFirst(word[0].toLowerCase()); hint.disabled = true; };
    }
  };

  /* ---------- session runner ---------- */
  function runSession(root, cfg) {
    // cfg: {title, rounds:[{game, word}], again: fn}
    UI.setTitle(cfg.title);
    root.innerHTML = '';
    const wrap = el(`<div class="game center-col"></div>`);
    const top = el('<div class="row game-top" style="width:100%;justify-content:center;gap:16px"></div>');
    const prog = el('<div class="game-progress"></div>');
    top.append(el(`<div class="mascot-box" style="width:clamp(54px,9vmin,90px)">${UI.mascot('small')}</div>`), prog);
    const area = el('<div class="game game-area" style="width:100%"></div>');
    wrap.append(top, area);
    root.appendChild(wrap);
    const rounds = cfg.rounds;
    rounds.forEach(() => prog.appendChild(el('<i></i>')));
    let idx = 0, firstTry = 0, alive = true;
    const results = [];
    function next() {
      if (!alive) return;
      prog.querySelectorAll('i').forEach((d, k) => d.className = k < idx ? 'done' : k === idx ? 'cur' : '');
      if (idx >= rounds.length) return finish();
      const r = rounds[idx];
      root.classList.remove('typing', 'full');
      UI.setTitle(cfg.title + ' — ' + GAMES[r.game].name);
      ROUNDS[r.game](area, r.word, (errors) => {
        if (!alive) return;
        Store.recordWord(r.word, errors === 0);
        if (errors === 0) firstTry++;
        results.push({ word: r.word, errors });
        idx++; next();
      }, root);
    }
    function finish() {
      const ratio = firstTry / rounds.length;
      const stars = ratio >= .9 ? 3 : ratio >= .6 ? 2 : 1;
      const gems = results.reduce((a, r) => a + (r.errors === 0 ? 3 : 1), 0);
      const xp = rounds.length * 10 + firstTry * 5;
      const hard = results.filter(r => r.errors > 0).map(r => `<b style="font-family:Lecture">${esc(r.word)}</b>`);
      UI.results({
        title: stars === 3 ? 'Incroyable !' : stars === 2 ? 'Bien joué !' : 'Continue comme ça !',
        stars, gems, xp,
        lines: [`${firstTry} mot${firstTry > 1 ? 's' : ''} sur ${rounds.length} réussi${firstTry > 1 ? 's' : ''} du premier coup`]
          .concat(hard.length ? ['À revoir : ' + hard.join(', ')] : []),
        onAgain: cfg.again,
        onDone: () => UI.back()
      });
    }
    next();
    return () => { alive = false; };
  }

  /* ---------- rain game ---------- */
  function runRain(root, { title, words }) {
    UI.setTitle(title);
    root.innerHTML = '';
    const wrap = el('<div class="game center-col"></div>');
    const bar = el('<div class="row" style="width:100%;justify-content:space-between"></div>');
    const hearts = el('<div class="hearts"></div>');
    const banner = el('<div class="target-banner"></div>');
    const score = el('<div class="hud-chip"></div>');
    const speak = UI.speakBtn(() => target);
    bar.append(hearts, el('<div class="row"></div>'), score);
    bar.children[1].append(speak, banner);
    const field = el('<div class="rain-area"></div>');
    wrap.append(bar, field);
    root.appendChild(wrap);
    let lives = 3, caught = 0, missesWrong = 0, alive = true, raf = 0, last = 0, spawnT = 0;
    const queue = FR.shuffle(words).slice(0, 10);
    let wi = 0, target = queue[0], need = 3, got = 0, speed = 70;
    const drops = [];
    const perWordErr = {};
    function drawHearts() { hearts.innerHTML = [0, 1, 2].map(i => Pixel.svg('heart', i < lives ? '' : 'lost')).join(''); }
    function drawScore() { score.innerHTML = Pixel.svg('gem') + '<span>' + caught + '</span>'; }
    function setTarget() {
      target = queue[wi]; got = 0;
      banner.innerHTML = 'Attrape : <span style="font-family:Lecture">' + esc(target) + '</span>';
      say(target);
      banner.animate([{ transform: 'scale(1.4)' }, { transform: 'scale(1)' }], { duration: 400, easing: 'steps(4)' });
    }
    function spawn() {
      const W = field.clientWidth;
      const good = Math.random() < .45;
      const pool = FR.misspellings(target, 4);
      const text = good || !pool.length ? target : pool[Math.floor(Math.random() * pool.length)];
      const d = el(`<div class="drop">${esc(text)}</div>`);
      field.appendChild(d);
      const w = d.offsetWidth;
      const x = Math.random() * Math.max(10, W - w - 10) + 5;
      const o = { el: d, x, y: -60, good: text === target, v: speed * (0.8 + Math.random() * .5) };
      d.style.transform = `translate(${x}px, ${o.y}px)`;
      d.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (o.dead) return;
        o.dead = true;
        if (o.good) {
          d.classList.add('hit'); SFX.play('gem'); caught++; got++; drawScore(); UI.burstAt(d, { n: 12, spread: 120 });
          if (got >= need) { Store.recordWord(target, !perWordErr[target]); wi++; if (wi >= queue.length) return end(true); speed += 12; setTarget(); }
        } else {
          d.classList.add('miss'); SFX.play('bad'); Haptic(120); lives--; missesWrong++; perWordErr[target] = 1; drawHearts();
          if (lives <= 0) return end(false);
        }
        setTimeout(() => d.remove(), 700);
      });
      drops.push(o);
    }
    function loop(t) {
      if (!alive) return;
      const dt = last ? Math.min(.05, (t - last) / 1000) : 0; last = t;
      spawnT -= dt;
      if (spawnT <= 0) { spawn(); spawnT = Math.max(.7, 1.6 - wi * .08); }
      const H = field.clientHeight;
      for (let i = drops.length - 1; i >= 0; i--) {
        const o = drops[i];
        if (o.dead) { drops.splice(i, 1); continue; }
        o.y += o.v * dt;
        o.el.style.transform = `translate(${o.x}px, ${o.y}px)`;
        if (o.y > H) { o.el.remove(); drops.splice(i, 1); }
      }
      raf = requestAnimationFrame(loop);
    }
    function end(won) {
      alive = false; cancelAnimationFrame(raf);
      drops.forEach(o => o.el.remove());
      const stars = won ? (missesWrong === 0 ? 3 : missesWrong === 1 ? 2 : 1) : (caught >= 6 ? 1 : 0);
      UI.results({
        title: won ? 'Tous attrapés !' : 'Plus de cœurs !',
        stars, gems: Math.max(1, caught), xp: caught * 5 + (won ? 20 : 0),
        lines: [`Tu as attrapé ${caught} bon${caught > 1 ? 's' : ''} mot${caught > 1 ? 's' : ''} !`],
        onAgain: () => UI.go('rain', { title, words }, { replace: true }),
        onDone: () => UI.back()
      });
    }
    drawHearts(); drawScore(); setTarget();
    raf = requestAnimationFrame(loop);
    UI.onPause = () => { /* keeps running; fine for short pauses */ };
    return () => { alive = false; cancelAnimationFrame(raf); };
  }
  UI.register('rain', (root, p) => runRain(root, p));

  /* ---------- builders ---------- */
  function buildRounds(words, game) {
    return FR.shuffle(words).map(w => ({ game, word: w }));
  }
  function adventureRounds(words) {
    const ws = FR.shuffle(words);
    const early = ['look', 'anagram', 'trous', 'ore'];
    const late = ['trous', 'ore', 'dictee', 'anagram', 'dictee'];
    return ws.map((w, i) => {
      const pool = i < ws.length / 2 ? early : late;
      const mastered = Store.mastery(w) >= 2;
      return { game: mastered ? FR.shuffle(['dictee', 'ore', 'trous'])[0] : pool[Math.floor(Math.random() * pool.length)], word: w };
    });
  }

  UI.register('session', (root, p) => {
    const again = () => UI.go('session', p, { replace: true });
    let rounds;
    if (p.mode === 'adventure') rounds = adventureRounds(p.words);
    else if (p.mode === 'revision') rounds = p.words.map(w => ({ game: FR.shuffle(['anagram', 'trous', 'ore', 'dictee', 'dictee', 'look'])[0], word: w }));
    else rounds = buildRounds(p.words, p.game);
    if (p.mode === 'revision') return runSession(root, { title: p.title, rounds, again: () => UI.go('session', Object.assign({}, p, { words: Store.revisionWords(p.words.length) }), { replace: true }) });
    return runSession(root, { title: p.title, rounds, again });
  });

  /* ---------- screens: word lists ---------- */
  function masteryStars(w) {
    const m = Store.mastery(w);
    return m >= 3 ? Pixel.svg('star', 'star') : m === 2 ? `<span class="star" style="opacity:.5;width:.8em;display:inline-block">${Pixel.svg('star')}</span>` : '';
  }

  UI.register('list', (root, { listId }) => {
    const l = Store.list(listId) || Store.lists()[0];
    if (!l) return emptyLists(root);
    UI.setTitle(l.title);
    const pct = Math.round(Store.listMastery(l) * 100);
    root.appendChild(el(html`
      <div class="center-col">
        <div class="panel">
          <div class="row"><h3 style="margin:0;font-size:clamp(18px,3vmin,28px)">Mes ${l.words.length} mots — touche un mot pour l'entendre</h3><span class="spacer"></span>
            ${Store.lists().length > 1 ? '<button class="pix-btn small wood" data-a="all">Autres listes</button>' : ''}</div>
          <div class="chips" style="margin-top:12px">${l.words.map((w, i) => `<span class="chip" data-w="${esc(w)}" style="animation-delay:${i * 0.04}s"><span>${FR.colorize(w)}</span>${masteryStars(w)}</span>`).join('')}</div>
          <div class="progress"><div style="width:${pct}%"></div></div>
          <div class="muted" style="margin-top:6px;font-size:clamp(14px,2.2vmin,20px)">Maîtrise : ${pct}%</div>
        </div>
        <div style="height:var(--gap)"></div>
        <button class="tile" data-a="adv" style="width:100%;min-height:clamp(110px,18vmin,170px);flex-direction:row;gap:3vmin;background-image:url(${Pixel.texture('gemme')})">
          <span class="ic">${Pixel.svg('sword')}</span><span>AVENTURE<br><span class="sub">Tous les jeux mélangés</span></span>
        </button>
        <h2 class="pix-title">Mini-jeux</h2>
        <div class="games-grid">${Object.entries(GAMES).map(([k, g], i) => `
          <button class="tile game-tile" data-g="${k}" style="background-image:url(${Pixel.texture(g.tex)});animation-delay:${i * 0.06}s">
            <span class="ic">${Pixel.svg(g.icon)}</span><span>${g.name}</span><span class="sub">${g.desc}</span></button>`).join('')}
        </div>
      </div>`));
    root.querySelectorAll('.chip').forEach(c => c.onclick = () => UI.say(c.dataset.w));
    const all = root.querySelector('[data-a=all]');
    if (all) all.onclick = () => UI.go('lists');
    root.querySelector('[data-a=adv]').onclick = () => UI.go('session', { title: 'Aventure', mode: 'adventure', words: l.words });
    root.querySelectorAll('[data-g]').forEach(b => b.onclick = () => {
      const g = b.dataset.g;
      if (g === 'pluie') UI.go('rain', { title: 'Pluie de mots', words: l.words });
      else UI.go('session', { title: GAMES[g].name, game: g, words: l.words });
    });
  });

  function emptyLists(root) {
    UI.setTitle('Mots de la semaine');
    root.appendChild(el(html`
      <div class="center-col" style="text-align:center">
        <div class="home-hero">${UI.mascot()}<div class="bubble">Pas encore de mots ! Demande à un parent d'ajouter ta liste de la semaine.</div></div>
        <button class="pix-btn gold big">${Pixel.svg('plus')} Ajouter une liste (parent)</button>
      </div>`));
    root.querySelector('button').onclick = async () => { if (await UI.parentGate()) UI.go('listEdit', {}); };
  }

  UI.register('lists', (root) => {
    const lists = Store.lists();
    if (!lists.length) return emptyLists(root);
    UI.setTitle('Toutes mes listes');
    const wrap = el('<div class="center-col"><div class="list-cards"></div></div>');
    const cards = wrap.firstElementChild;
    lists.forEach((l, i) => {
      const pct = Math.round(Store.listMastery(l) * 100);
      const c = el(html`<div class="panel list-card" style="animation-delay:${i * 0.05}s">
        <div class="row"><span class="title">${esc(l.title)}</span><span class="spacer"></span>${i === 0 ? '<span class="sheet-type t-texte">Cette semaine</span>' : ''}</div>
        <div class="muted" style="font-family:Lecture;font-size:clamp(15px,2.3vmin,20px);margin-top:6px">${esc(l.words.slice(0, 6).join(', '))}${l.words.length > 6 ? '…' : ''}</div>
        <div class="progress"><div style="width:${pct}%"></div></div></div>`);
      c.onclick = () => UI.go('list', { listId: l.id });
      cards.appendChild(c);
    });
    root.appendChild(wrap);
  });

  UI.register('revision', (root) => {
    UI.setTitle('Révision');
    const all = Store.allWords();
    if (!all.length) {
      root.appendChild(el(html`<div class="center-col" style="text-align:center"><div class="home-hero">${UI.mascot()}<div class="bubble">Il faut d'abord une liste de mots pour réviser !</div></div></div>`));
      return;
    }
    const n1 = Math.min(10, all.length), n2 = Math.min(20, all.length);
    root.appendChild(el(html`
      <div class="center-col">
        <div class="home-hero">${UI.mascot()}<div class="bubble">Les mots de toutes tes listes sortent au hasard. Ceux qui sont durs reviennent plus souvent !</div></div>
        <div class="tiles">
          <button class="tile" data-n="${n1}" style="background-image:url(${Pixel.texture('pierre')})"><span class="ic">${Pixel.svg('dice')}</span>Révision express<span class="sub">${n1} mots au hasard</span></button>
          <button class="tile" data-n="${n2}" style="background-image:url(${Pixel.texture('or')})"><span class="ic">${Pixel.svg('trophy')}</span>Grande révision<span class="sub">${n2} mots</span></button>
          <button class="tile" data-r="1" style="background-image:url(${Pixel.texture('eau')})"><span class="ic">${Pixel.svg('rain')}</span>Pluie de mots<span class="sub">Tous les mots</span></button>
        </div>
        <p class="prompt" style="margin-top:3vmin">${all.length} mots à réviser</p>
      </div>`));
    root.querySelectorAll('[data-n]').forEach(b => b.onclick = () => UI.go('session', { title: 'Révision', mode: 'revision', words: Store.revisionWords(+b.dataset.n) }));
    root.querySelector('[data-r]').onclick = () => UI.go('rain', { title: 'Pluie de mots', words: Store.revisionWords(10) });
  });

  window.Games = { GAMES, ROUNDS };
})();
