/* Dictée « pour de vrai » : lancée avec le code parent.
   La voix dicte chaque mot ; l'enfant l'écrit sans aide (ni cases, ni longueur) et valide par OK,
   sans savoir s'il a juste. À la fin : la note, la correction, une animation et la voix qui félicite.
   10/10 : tous les mots de la liste passent en « Maîtrisé ». */
(function () {
  const { html, el } = UI;
  const esc = FR.esc;
  const same = (a, b) => FR.norm(a) === FR.norm(b);

  UI.register('dictation', (root, { listId }) => {
    const l = Store.list(listId) || Store.lists()[0];
    if (!l || !l.words.length) { setTimeout(() => UI.back(), 0); return; }
    UI.setTitle('Dictée — ' + l.title);
    const words = FR.shuffle(l.words.slice());
    const answers = [];
    let i = 0, txt = '', done = false;
    root.classList.add('typing', 'full');
    const wrap = el(html`<div class="game center-col dct">
      <div class="game-area">
        <div class="dct-top"><span class="dct-n"></span><span class="muted">Écoute bien, écris le mot, puis appuie sur OK</span></div>
        <div class="row center"><button class="pix-btn gold dct-say">🔊 Réécouter</button></div>
        <div class="dct-answer"><span class="dct-txt"></span><span class="dct-caret"></span></div>
      </div></div>`);
    root.appendChild(wrap);
    const area = wrap.querySelector('.game-area');
    const show = () => { wrap.querySelector('.dct-txt').textContent = txt; };
    const kb = UI.keyboard({
      space: true,
      onKey(ch) { if (done || txt.length >= 40) return; txt += ch; show(); },
      onDel() { if (done) return; txt = txt.slice(0, -1); show(); },
      onOk() {
        if (done) return;
        if (!txt.trim()) { UI.shake(wrap.querySelector('.dct-answer')); SFX.play('bad'); return; }
        SFX.play('pop');
        answers.push(txt.trim());
        txt = ''; show();
        i++;
        if (i >= words.length) return finish();
        next();
      }
    });
    area.appendChild(kb);
    const dictate = () => UI.say(words[i]);
    wrap.querySelector('.dct-say').onclick = () => { SFX.play('pop'); dictate(); };
    function next() {
      wrap.querySelector('.dct-n').textContent = `Mot ${i + 1} / ${words.length}`;
      setTimeout(dictate, 350);
    }
    next();

    function finish() {
      done = true;
      root.classList.remove('typing', 'full');
      const res = words.map((w, k) => ({ w, a: answers[k], ok: same(answers[k], w) }));
      const good = res.filter(r => r.ok).length;
      const note = Math.round(good / words.length * 20) / 2; // sur 10, au demi-point
      const perfect = good === words.length;
      // la dictée compte comme un exercice de mémoire pour chaque mot
      res.forEach(r => Store.recordWord(r.w, r.ok, 'dictee'));
      if (perfect) Store.masterWords(l.words);
      const quest = window.Quests ? Quests.check() : [];
      const name = (Store.data.settings.name || '').split(' ')[0];
      const stars = note >= 9 ? 3 : note >= 6 ? 2 : 1;
      const gems = [0, 50, 100, 150][stars];
      const reward = Store.addReward(gems, words.length * 12 + good * 6, stars * 5);
      const msg = perfect ? `Bravo ${name} ! Dix sur dix, c'est parfait ! Tous tes mots sont maîtrisés !`
        : note >= 8 ? `Bravo ${name} ! Très belle dictée !`
        : note >= 5 ? `Bien joué ${name} ! Encore un petit effort et ce sera parfait.`
        : `Courage ${name} ! On va s'entraîner encore un peu, et la prochaine fois ce sera mieux !`;
      const title = perfect ? 'Parfait !' : note >= 8 ? 'Bravo !' : note >= 5 ? 'Bien joué !' : 'Courage !';
      const fmt = n => String(n).replace('.', ',');
      root.innerHTML = '';
      const page = el(html`<div class="center-col dct-res ${perfect ? 'perfect' : ''}">
        <div class="dct-hero">${UI.mascot()}<div class="bubble">${esc(msg)}</div></div>
        <div class="dct-note"><span class="dct-score">${fmt(note)}</span><span class="dct-on">/ 10</span></div>
        <div class="result-stars">${[0, 1, 2].map(k => Pixel.svg('star', k < stars ? 'on' : '')).join('')}</div>
        <div class="muted dct-sub">${good} mot${good > 1 ? 's' : ''} juste${good > 1 ? 's' : ''} sur ${words.length} · +${gems} ${esc(Theme.t.cur)} · +${reward.stars} étoiles${perfect ? ' · ⭐ tous les mots passent en Maîtrisé' : ''}</div>
        <div class="dct-list">${res.map(r => `<div class="dct-row ${r.ok ? 'ok' : 'ko'}"><span class="dct-ic">${r.ok ? '✓' : '✗'}</span>
          <span class="dct-w">${FR.colorize(r.w)}</span>${r.ok ? '' : `<span class="dct-a">tu as écrit : <s>${esc(r.a)}</s></span>`}</div>`).join('')}</div>
        <div class="row center"><button class="pix-btn green big" data-a="ok">Super !</button></div>
      </div>`);
      root.appendChild(page);
      page.querySelector('[data-a=ok]').onclick = () => UI.back();
      SFX.play(stars >= 2 ? 'win' : 'good');
      page.querySelectorAll('.result-stars svg.on').forEach((s, k) => { s.style.animationDelay = (0.3 + k * 0.3) + 's'; });
      if (stars >= 2) { setTimeout(() => UI.confetti(), 300); if (perfect) setTimeout(() => UI.confetti(), 1200); }
      setTimeout(() => UI.say(msg), 600);
      if (quest && quest.length && window.Quests && Quests.flush) setTimeout(() => Quests.flush(), 2500);
    }
    return () => { done = true; root.classList.remove('typing', 'full'); };
  });
})();
