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
    ore:     { name: Theme.t.oreName, icon: 'pickaxe', tex: 'pierre', desc: Theme.t.oreDesc },
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
    if (window.Fair) Fair.wrong();
    SFX.play('bad');
    Haptic(120);
    if (node) UI.shake(node);
    UI.mascotReact(root, 'sad');
  }

  const same = (a, b) => FR.norm(a) === FR.norm(b);
  /* ---------- typing slots ---------- */
  function typer(area, target, { onSubmit, hideLength } = {}) {
    const chars = [...target];
    document.getElementById('screen').classList.add('typing', 'full');
    const slots = el('<div class="slots"></div>');
    slots.style.setProperty('--n', chars.length);
    let typed = [], locked = false, raw = null, mode = 'kbd', seg = 0;
    const editable = chars.map((c, i) => isSep(c) ? -1 : i).filter(i => i >= 0);
    // les mots de l'expression (« la campagne » = 2 mots), en positions de lettres à écrire
    const segs = [];
    { let cur = null, ti = 0; chars.forEach(c => { if (c === ' ') { cur = null; return; } if (isSep(c)) return; if (!cur) { cur = { start: ti, len: 0 }; segs.push(cur); } cur.len++; ti++; }); }
    const segRaw = [];
    const multi = segs.length > 1;
    function render() {
      slots.innerHTML = '';
      let ti = 0;
      const cs = segs[seg];
      chars.forEach((c, i) => {
        if (isSep(c)) { slots.appendChild(el(`<div class="slot ${c === ' ' ? 'space' : 'filled'}">${c === ' ' ? '' : esc(c)}</div>`)); return; }
        const v = typed[ti];
        const inSeg = mode === 'ink' && multi && cs && ti >= cs.start && ti < cs.start + cs.len;
        const cursor = mode === 'ink' ? false : ti === typed.length;
        const s = el(`<div class="slot ${v ? 'filled' : ''} ${cursor ? 'cursor' : ''} ${inSeg ? 'seg-cur' : ''}">${v ? esc(v) : ''}</div>`);
        s.dataset.ti = ti;
        slots.appendChild(s);
        ti++;
      });
      if (hideLength) slots.querySelectorAll('.slot:not(.filled):not(.cursor)').forEach(s => s.style.opacity = .35);
    }
    render();
    const submit = () => {
      if (locked) return;
      if (sess) stopListen();
      if (voiceBox) hideRing();
      if (raw == null && typed.length < editable.length) { UI.shake(slots); SFX.play('bad'); return; }
      const a = raw != null ? raw : attempt();
      if (same(a, target)) locked = true;
      else if (window.Fair && mode !== 'voice') Fair.attempt(a, target); // la reconnaissance vocale peut se tromper : jamais de carton
      onSubmit(a);
    };
    const kb = UI.keyboard({
      space: false,
      onKey(ch) { raw = null; if (ch === ' ' || ch === "'" || ch === '-') return; if (typed.length < editable.length) { typed.push(ch); render(); } },
      onDel() { raw = null; typed.pop(); render(); },
      onOk: submit
    });
    function attempt() {
      let ti = 0;
      return chars.map(c => isSep(c) ? c : (typed[ti++] || '')).join('');
    }
    /* texte reconnu (écriture à la main) -> cases du mot en cours */
    function setText(txt) {
      const s = segs[seg] || { start: 0, len: editable.length };
      const t = FR.norm(txt || '');
      const letters = [...t].filter(c => !isSep(c) && c.trim());
      typed = typed.slice(0, s.start);
      while (typed.length < s.start) typed.push('');
      typed = typed.concat(letters.slice(0, s.len));
      // ce que l'enfant a vraiment écrit (même trop long ou trop court) est ce qui est évalué
      segRaw[seg] = letters.length === s.len ? null : t;
      raw = null;
      render();
    }
    function inkAttempt() {
      if (!segRaw.some(x => x != null) && typed.length >= editable.length && typed.every(Boolean)) return null;
      return segs.map((s, i) => segRaw[i] != null ? segRaw[i] : typed.slice(s.start, s.start + s.len).join('')).join(' ');
    }
    let segLabel = null;
    function drawSeg() {
      if (!segLabel) return;
      segLabel.style.display = mode === 'ink' && multi ? '' : 'none';
      segLabel.innerHTML = `<span>✏️ Écris le mot <b>${seg + 1}</b> sur <b>${segs.length}</b>${seg < segs.length - 1 ? ', puis appuie sur OK' : ''}</span>`
        + (seg > 0 ? `<button class="pix-btn small" data-a="prev">↩︎ Mot d'avant</button>` : '');
      const pv = segLabel.querySelector('[data-a=prev]');
      if (pv) pv.onclick = () => { seg--; if (pad) pad.clear(); render(); drawSeg(); };
    }
    area.appendChild(slots);
    /* ----- clavier ou écriture à la main ----- */
    let pad = null, recoT = 0, recoN = 0;
    const st = Store.data.settings;
    const canInk = Ink.supported(), canVoice = !!(window.Ear && window.Spell && Ear.available());
    const sw = canInk || canVoice ? el(`<div class="input-switch"><button class="pix-btn small" data-m="kbd">⌨️ Clavier</button>${canInk ? '<button class="pix-btn small" data-m="ink">✏️ À la main</button>' : ''}${canVoice ? '<button class="pix-btn small" data-m="voice">🎤 J\'épelle</button>' : ''}</div>`) : null;
    /* ----- épeler à voix haute : un gros bouton micro à la place du clavier ;
       en cas de doute, les lettres possibles apparaissent autour du bouton ----- */
    let voiceBox = null, sess = null, stableT = 0, autoT = 0, listening = false, empties = 0;
    const vq = s0 => voiceBox && voiceBox.querySelector(s0);
    function vStatus(t) { const x = vq('.vsp-txt'); if (x) x.textContent = t; }
    function full() { return typed.length >= editable.length; }
    function addLetter(l) {
      if (full()) return;
      typed.push(l); raw = null; render(); SFX.play('pop');
      if (full()) { stopListen(); hideRing(); vStatus('Toutes les lettres sont là ! Vérifie puis appuie sur OK ✔'); }
    }
    function hideRing() { clearTimeout(autoT); const r = vq('.vsp-ring'); if (r) r.querySelectorAll('.vsp-c').forEach(b => b.remove()); voiceBox && voiceBox.classList.remove('doubt'); }
    function showRing(item) {
      hideRing();
      const ring = vq('.vsp-ring'); voiceBox.classList.add('doubt');
      const n = item.choices.length;
      item.choices.forEach((l, k) => {
        const a = -Math.PI / 2 + k / n * Math.PI * 2;
        const b = el(`<button class="vsp-c ${k === 0 && item.letter ? 'best' : ''}" style="left:${50 + Math.cos(a) * 41}%;top:${50 + Math.sin(a) * 41}%;animation-delay:${k * .04}s">${esc(l)}</button>`);
        b.onclick = e => { e.stopPropagation(); hideRing(); addLetter(l); if (!full()) setTimeout(listen, 200); };
        ring.appendChild(b);
      });
      vStatus(item.letter ? 'J\'ai un doute : touche la bonne lettre !' : 'Je n\'ai pas bien compris : c\'est laquelle ?');
      // sans réponse, on garde la lettre entendue au bout de 4 secondes
      if (item.letter) autoT = setTimeout(() => { if (!voiceBox.classList.contains('doubt')) return; hideRing(); addLetter(item.letter); if (!full()) listen(); }, 4000);
    }
    function process(t) {
      const items = Spell.guess(t, target).filter(x => !x.letter || !isSep(x.letter));
      if (!items.length) return false;
      for (const it of items) {
        if (full()) break;
        if (it.choices.length) { showRing(it); return true; }
        addLetter(it.letter);
      }
      if (!full()) setTimeout(listen, 200);
      return true;
    }
    function stopListen() {
      clearTimeout(stableT); listening = false;
      if (voiceBox) voiceBox.classList.remove('on');
      const s0 = sess; sess = null; if (s0) s0.cancel();
    }
    function listen() {
      if (locked || !voiceBox || !voiceBox.isConnected || full() || listening) return;
      hideRing(); listening = true; voiceBox.classList.add('on');
      vStatus('Je t\'écoute… dis une lettre');
      let last = '';
      const me = sess = Ear.listen({
        onText(t) {
          if (sess !== me) return;
          if (!voiceBox.isConnected) return stopListen();
          last = t || '';
          if (last) vStatus('« ' + last + ' »');
          clearTimeout(stableT);
          // la phrase ne bouge plus depuis un moment : on la lit
          if (last.trim()) stableT = setTimeout(() => { if (sess !== me) return; stopListen(); empties = 0; if (!process(last)) { vStatus('Je n\'ai pas compris, recommence 🙂'); setTimeout(listen, 600); } }, 700);
        },
        onEnd() {
          if (sess !== me) return;
          stopListen();
          if (last.trim()) { if (!process(last)) setTimeout(listen, 400); }
          else if (++empties < 3) setTimeout(listen, 200);
          else { empties = 0; vStatus('Appuie sur le micro pour continuer 🎤'); }
        },
        onError(e) { UI.toast(e === 'mic' ? 'Autorise le micro pour épeler 🎤' : 'Le micro ne marche pas, utilise le clavier'); stopListen(); }
      });
    }
    function buildVoice() {
      voiceBox = el(`<div class="vsp">
        <div class="vsp-txt">Appuie sur le micro et dis les lettres une par une. Pour un accent : « e accent aigu ».</div>
        <div class="vsp-ring"><button class="vsp-mic" aria-label="Épeler">🎤</button></div>
        <div class="vsp-row"><button class="pix-btn vsp-del">⌫ Effacer</button><button class="pix-btn green vsp-ok">OK ✔</button></div></div>`);
      vq('.vsp-mic').onclick = () => { SFX.play('pop'); empties = 0; if (listening) { stopListen(); vStatus('En pause : appuie sur le micro pour continuer'); } else listen(); };
      vq('.vsp-del').onclick = () => { hideRing(); typed.pop(); raw = null; render(); if (!listening && !full()) listen(); };
      vq('.vsp-ok').onclick = () => { if (!full()) { UI.shake(slots); SFX.play('bad'); return; } submit(); };
    }
    async function readInk(strokes) {
      const n = ++recoN;
      if (!strokes.length) { setText(''); segRaw[seg] = null; return true; }
      slots.classList.add('reading');
      const c = await Ink.recognize(strokes, pad.w, pad.h);
      if (n !== recoN) return false;
      slots.classList.remove('reading');
      if (c == null) { UI.toast('Je n\'arrive pas à lire, réessaie 🙂'); return false; }
      setText(c[0] || '');
      return true;
    }
    function setMode(m) {
      if (m === 'ink' && !canInk) m = 'kbd';
      if (m === 'voice' && !canVoice) m = 'kbd';
      if (sess) stopListen();
      if (voiceBox) voiceBox.remove();
      st.inputMode = m; Store.save(); mode = m; seg = 0; segRaw.length = 0;
      if (sw) sw.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === m));
      typed = []; raw = null; render();
      if (m === 'ink') {
        kb.remove();
        if (!pad) pad = Ink.pad({
          onChange(strokes) { clearTimeout(recoT); recoT = setTimeout(() => readInk(strokes), 450); },
          async onOk(strokes) {
            if (locked) return;
            if (!strokes.length) { UI.shake(slots); SFX.play('bad'); return; }
            clearTimeout(recoT);
            if (!await readInk(strokes)) return;
            // une expression s'écrit mot par mot
            if (seg < segs.length - 1) { seg++; pad.clear(); SFX.play('pop'); render(); drawSeg(); return; }
            raw = inkAttempt();
            submit();
          }
        });
        if (!segLabel) segLabel = el('<div class="ink-seg"></div>');
        area.appendChild(segLabel); drawSeg();
        area.appendChild(pad.el);
        if (Ink.status() !== 'ready') {
          const t = UI.toast('✏️ Je prépare l\'écriture à la main…');
          Ink.prepare().then(ok => {
            if (ok) UI.toast('✏️ C\'est prêt, tu peux écrire !');
            else { UI.toast('Il faut internet une première fois pour l\'écriture à la main.'); setMode('kbd'); }
          });
        }
      } else {
        if (pad) pad.el.remove();
        if (segLabel) segLabel.remove();
        if (m === 'voice') {
          // pas de clavier : le gros bouton micro prend sa place
          kb.remove();
          if (!voiceBox) buildVoice();
          area.appendChild(voiceBox);
        } else area.appendChild(kb);
      }
    }
    if (sw) {
      area.appendChild(sw);
      sw.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { SFX.play('pop'); setMode(b.dataset.m); });
    }
    area.appendChild(kb);
    setMode(st.inputMode === 'ink' || st.inputMode === 'voice' ? st.inputMode : 'kbd');
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
        raw = null;
        if (mode === 'ink') { pad.clear(); typed = []; seg = 0; segRaw.length = 0; render(); drawSeg(); return; }
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
      reset() { typed = []; raw = null; seg = 0; segRaw.length = 0; if (pad) pad.clear(); render(); drawSeg(); },
      setFirst(ch) { if (!typed.length) { typed = [ch]; render(); } },
      /* reveal: keep the correct beginning, then add the next correct letter */
      hint() {
        raw = null; segRaw.length = 0; if (mode === 'ink') pad.clear();
        const lt = [...target.toLowerCase()].filter(c => !isSep(c));
        let k = 0;
        while (k < typed.length && typed[k] === lt[k]) k++;
        if (k >= lt.length) return false;
        typed = lt.slice(0, k + 1);
        if (mode === 'ink') { seg = Math.max(0, segs.findIndex(x => k < x.start + x.len)); drawSeg(); }
        render();
        const s = slots.querySelectorAll('.slot.filled:not(.space)');
        const last = [...slots.querySelectorAll('.slot')].filter(x => x.dataset.ti != null)[k];
        if (last) { last.classList.add('hinted'); setTimeout(() => last.classList.remove('hinted'), 900); }
        return true;
      }
    };
  }


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
        // un seul coup d'œil « bonus » pendant l'écriture, pas plus ; une erreur ne remontre pas le mot
        const peek = el(`<button class="pix-btn wood">${Pixel.svg('eye')} Revoir (1 fois)</button>`);
        tools.appendChild(peek);
        peek.onclick = () => {
          errors++; peek.remove(); SFX.play('pop');
          big.classList.remove('covered'); setTimeout(() => big.classList.add('covered'), 1600);
        };
        const t = typer(area, word, {
          onSubmit(v) {
            if (same(v, word)) { big.classList.remove('covered'); success(root, big); setTimeout(() => done(errors), 1100); }
            else {
              errors++; fail(root, t.slots); t.showDiff();
              prompt.textContent = 'Presque ! Les lettres vertes sont justes.';
              setTimeout(() => { t.keepCorrect(); prompt.textContent = 'À toi !'; }, 2400);
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
      const prompt = el(`<div class="prompt">${Theme.t.orePrompt}</div>`);
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
      let hints = 0;
      hint.onclick = () => {
        if (t.hint()) {
          hints++; if (hints === 1) errors++;
          SFX.play('pop'); say(word);
          hint.textContent = 'Indice (' + hints + ')';
        }
      };
    }
  };

  /* ---------- session runner ---------- */
  function runSession(root, cfg) {
    if (window.Fair) Fair.reset();
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
    const rounds = cfg.rounds.slice();
    const firstPass = rounds.length;
    /* partie chronométrée (parcours, révision) : environ cfg.timed secondes, quel que soit le nombre de mots ;
       chaque mot est vu au moins une fois, puis on enchaîne d'autres tours avec d'autres mini-jeux */
    const t0 = Date.now(), T = (cfg.timed || 0) * 1000;
    let tick = 0;
    if (T) {
      prog.classList.add('timed');
      prog.innerHTML = '<span class="tb"><span></span></span>';
      const bar = prog.querySelector('.tb span');
      tick = setInterval(() => { if (!prog.isConnected) return clearInterval(tick); bar.style.width = Math.min(100, (Date.now() - t0) / T * 100) + '%'; }, 1000);
    } else rounds.forEach(() => prog.appendChild(el('<i></i>')));
    let idx = 0, firstTry = 0, alive = true;
    const promos = [];
    const results = [];
    function next() {
      if (!alive) return;
      if (T) {
        const late = Date.now() - t0 >= T;
        if (late && idx >= firstPass) return finish();
        if (idx >= rounds.length) rounds.push(...cfg.more(rounds));
      } else {
        prog.querySelectorAll('i').forEach((d, k) => d.className = k < idx ? 'done' : k === idx ? 'cur' : '');
        if (idx >= rounds.length) return finish();
      }
      const r = rounds[idx];
      root.classList.remove('typing', 'full');
      UI.setTitle(cfg.title + ' — ' + GAMES[r.game].name);
      let finished = false;
      ROUNDS[r.game](area, r.word, (errors) => {
        if (!alive || finished) return;
        finished = true;
        const ch = Store.recordWord(r.word, errors === 0, r.game);
        if (ch.to > ch.from) promos.push({ word: r.word, to: ch.to });
        if (errors === 0) firstTry++;
        results.push({ word: r.word, errors });
        idx++; next();
      }, root);
    }
    function finish() {
      clearInterval(tick);
      // quêtes : le parcours est lancé, et les étapes des mots ont peut-être avancé
      let quest = [];
      if (window.Quests) { if (cfg.listId) Quests.markStarted(cfg.listId); quest = Quests.check(); }
      const played = results.length || 1;
      const ratio = firstTry / played;
      const stars = ratio >= .9 ? 3 : ratio >= .6 ? 2 : 1;
      // la monnaie se gagne seulement dans « Mon parcours » (et la révision), pas dans les mini-jeux : selon les étoiles
      const gems = cfg.paid ? [0, 50, 100, 150][stars] : 0;
      const xp = played * 10 + firstTry * 5;
      const hard = results.filter(r => r.errors > 0).map(r => `<b style="font-family:Lecture">${esc(r.word)}</b>`);
      UI.results({
        title: stars === 3 ? 'Incroyable !' : stars === 2 ? 'Bien joué !' : 'Continue comme ça !',
        stars, gems, xp, petStars: gems ? stars * 5 : 0, // étoiles du compagnon : 5 / 10 / 15, comme avant
        lines: [`${firstTry} réponse${firstTry > 1 ? 's' : ''} sur ${played} réussie${firstTry > 1 ? 's' : ''} du premier coup`]
          .concat(hard.length ? ['À revoir : ' + hard.join(', ')] : [])
          .concat(window.Quests && Quests.pendingCount && Quests.pendingCount() ? ['🏆 <b>Nouvelle carte de quête à découvrir !</b>'] : [])
          .concat(promos.length ? [promos.map(pr => `<span class="promo">${Store.STAGES[pr.to].icon} <b style="font-family:Lecture">${esc(pr.word)}</b> passe en <b>${Store.STAGES[pr.to].name}</b> !</span>`).join('<br>')] : []),
        onAgain: cfg.again,
        onDone: () => UI.back()
      });
    }
    next();
    return () => { alive = false; clearInterval(tick); };
  }

  /* ---------- rain game ---------- */
  function runRain(root, { title, words }) {
    if (window.Fair) Fair.reset();
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
          if (got >= need) { Store.recordWord(target, !perWordErr[target], 'pluie'); wi++; if (wi >= queue.length) return end(true); speed += 12; setTarget(); }
        } else {
          d.classList.add('miss'); SFX.play('bad'); Haptic(120); lives--; missesWrong++; if (window.Fair) Fair.wrong(); perWordErr[target] = 1; drawHearts();
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
        stars, gems: 0, xp: caught * 5 + (won ? 20 : 0),
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
  /* each word gets a game that fits its step on the path */
  const BY_STAGE = [['look', 'feu', 'syllabes'], ['anagram', 'trous', 'ore', 'syllabes', 'efface'], ['dictee', 'feu', 'efface', 'dictee'], ['dictee', 'feu']];
  function adventureRounds(words) {
    return FR.shuffle(words).map(w => { const pool = BY_STAGE[Store.mastery(w)]; return { game: pool[Math.floor(Math.random() * pool.length)], word: w }; });
  }
  const SESSION_SECONDS = 300; // un parcours dure environ 5 minutes
  /* tour suivant d'une partie chronométrée : chaque mot revient avec un autre mini-jeu adapté à son étape */
  function moreRounds(words) {
    return done => {
      const used = {}; done.forEach(r => (used[r.word] = used[r.word] || []).push(r.game));
      const allGames = [...new Set(BY_STAGE.flat())];
      let list = FR.shuffle(words);
      if (list.length > 1 && done.length && list[0] === done[done.length - 1].word) list.push(list.shift());
      let prevGame = done.length ? done[done.length - 1].game : null;
      return list.map(w => {
        let pool = BY_STAGE[Store.mastery(w)].filter(g => g !== prevGame);
        const fresh = pool.filter(g => !(used[w] || []).includes(g));
        if (fresh.length) pool = fresh;
        else { const others = allGames.filter(g => g !== prevGame && !(used[w] || []).includes(g) && Store.mastery(w) > 0); if (others.length && Math.random() < .5) pool = others; }
        if (!pool.length) pool = BY_STAGE[Store.mastery(w)];
        const game = pool[Math.floor(Math.random() * pool.length)];
        prevGame = game;
        return { game, word: w };
      });
    };
  }

  UI.register('session', (root, p) => {
    const again = () => UI.go('session', p, { replace: true });
    let rounds;
    if (p.mode === 'adventure') rounds = adventureRounds(p.words);
    else if (p.mode === 'revision') rounds = adventureRounds(p.words);
    else rounds = buildRounds(p.words, p.game);
    if (p.mode === 'revision') return runSession(root, { title: p.title, rounds, paid: true, timed: SESSION_SECONDS, more: moreRounds(p.words), again: () => UI.go('session', Object.assign({}, p, { words: Store.revisionWords(p.words.length) }), { replace: true }) });
    if (p.mode === 'adventure') return runSession(root, { title: p.title, rounds, again, paid: true, timed: SESSION_SECONDS, more: moreRounds(p.words), listId: p.listId });
    return runSession(root, { title: p.title, rounds, again, paid: false });
  });

  /* ---------- screens: word lists ---------- */
  function masteryStars(w) {
    const st = Store.mastery(w);
    return `<span class="stage-ic" title="${Store.STAGES[st].name}">${Store.STAGES[st].icon}</span>`;
  }
  function pathPanel(words) {
    return `<div class="path">${Store.STAGES.map((S, i) => {
      const ws = words.filter(w => Store.mastery(w) === i);
      return `<div class="path-step st${i}"><div class="path-h"><span class="path-ic">${S.icon}</span><b>${S.name}</b><span class="path-n">${ws.length}</span></div>
        <div class="path-words">${ws.map(w => `<span>${esc(w)}</span>`).join('')}</div></div>`;
    }).join('<div class="path-arrow">➜</div>')}</div>`;
  }


  UI.register('list', (root, { listId }) => {
    const l = Store.list(listId) || Store.lists()[0];
    if (!l) return emptyLists(root);
    UI.setTitle(l.title);
    const pct = Math.round(Store.listMastery(l) * 100);
    const lists = Store.lists();
    root.appendChild(el(html`
      <div class="center-col">
        <div class="list-head">
          <div class="list-switch">${lists.slice(0, 8).map(x => `<button class="pix-btn small ${x.id === l.id ? 'on' : ''}" data-l="${x.id}">${esc(x.title)}</button>`).join('')}</div>
          <button class="pix-btn small gold" data-a="new">${Pixel.svg('plus')} Nouvelle liste</button>
        </div>
        <div data-z="quest"></div>
        <button class="tile adv-tile" data-a="adv" style="background-image:url(${Pixel.texture('gemme')})">
          <span class="ic">${Pixel.svg('sword')}</span><span><span class="t1">Mon parcours</span><span class="sub">Chaque mot avec le jeu qui lui convient</span></span>
        </button>
        <div class="panel word-panel">
          <h3>Mes ${l.words.length} mots <span class="muted" style="font-weight:500">· touche un mot pour l'entendre</span></h3>
          <div class="chips" style="margin-top:12px">${l.words.map((w, i) => `<span class="chip" data-w="${esc(w)}" style="animation-delay:${i * 0.04}s"><span>${FR.colorize(w)}</span>${masteryStars(w)}</span>`).join('')}</div>
          ${pathPanel(l.words)}
          <div class="progress"><div style="width:${pct}%"></div></div>
          <div class="muted" style="margin-top:6px;font-size:clamp(15px,2.2vmin,20px)">Maîtrise : ${pct}%</div>
        </div>
        <h2 class="pix-title">Mini-jeux</h2>
        <div class="games-grid">${Object.entries(GAMES).map(([k, g], i) => `
          <button class="tile game-tile" data-g="${k}" style="background-image:url(${Pixel.texture(g.tex)});animation-delay:${i * 0.06}s">
            <span class="ic">${Pixel.svg(g.icon)}</span><span>${g.name}</span><span class="sub">${g.desc}</span></button>`).join('')}
        </div>
      </div>`));
    if (window.Quests) { root.querySelector('[data-z=quest]').replaceWith(Quests.panel(l)); setTimeout(() => Quests.flush(), 450); }
    root.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { if (b.dataset.l !== l.id) UI.go('list', { listId: b.dataset.l }, { replace: true }); });
    root.querySelector('[data-a=new]').onclick = async () => { if (await UI.parentGate()) UI.go('listEdit', {}); };
    root.querySelectorAll('.chip').forEach(c => c.onclick = () => UI.say(c.dataset.w));
    root.querySelector('[data-a=adv]').onclick = () => UI.go('session', { title: 'Aventure', mode: 'adventure', words: l.words, listId: l.id });
    root.querySelectorAll('[data-g]').forEach(b => b.onclick = () => {
      const g = b.dataset.g;
      if (g === 'pluie') UI.go('rain', { title: 'Pluie de mots', words: l.words });
      else if (g === 'memory' || g === 'motsmeles') UI.go(g, { title: GAMES[g].name, words: l.words });
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
    const wrap = el(`<div class="center-col"><div class="list-head"><span class="spacer"></span><button class="pix-btn small gold" data-a="new">${Pixel.svg('plus')} Nouvelle liste</button></div><div class="list-cards"></div></div>`);
    const cards = wrap.querySelector('.list-cards');
    wrap.querySelector('[data-a=new]').onclick = async () => { if (await UI.parentGate()) UI.go('listEdit', {}); };
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
        <div class="boxes">${Store.STAGES.map((S, i) => {
          const n = all.filter(w => Store.mastery(w) === i).length;
          return `<div class="box box${i + 1}"><div class="box-lid"></div><div class="box-n">${n}</div><b>${S.icon} ${S.name}</b></div>`;
        }).join('')}</div>
        <p class="prompt" style="margin-top:2vmin">Un mot passe à l'étape suivante quand tu le réussis du premier coup. Pour être maîtrisé, il faut le réussir de mémoire deux fois, à deux moments différents !</p>
      </div>`));
    root.querySelectorAll('[data-n]').forEach(b => b.onclick = () => UI.go('session', { title: 'Révision', mode: 'revision', words: Store.revisionWords(+b.dataset.n) }));
    root.querySelector('[data-r]').onclick = () => UI.go('rain', { title: 'Pluie de mots', words: Store.revisionWords(10) });
  });

  window.Games = { GAMES, ROUNDS, typer, success, fail, same, TEX };
})();
