/* Mode Poésie : apprendre une poésie par cœur.
   Méthodes (fiches pédagogiques d'école) : comprendre puis écouter, apprendre strophe par strophe en
   « boule de neige », effacer progressivement (rimes, puis mots-clés, puis tout), répéter avec des voix
   variées, compléter les vers, remettre les vers dans l'ordre, illustrer, s'enregistrer et se réécouter,
   réviser souvent. */
(function () {
  const { html, el } = UI;
  const esc = FR.esc;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const speakAsync = (t, rate) => new Promise(res => Speech.speak(t, { rate: rate || Store.data.settings.ttsRate, onDone: res }));
  const rnd = a => a[Math.floor(Math.random() * a.length)];

  /* ---------------- data ---------------- */
  const poems = () => { const d = Store.data; d.poems = d.poems || []; return d.poems; };
  const poem = id => poems().find(p => p.id === id);
  function parse(text) {
    const raw = String(text || '').replace(/\r/g, '').split('\n');
    const lines = []; let s = 0, blank = false;
    raw.forEach(l => {
      const t = l.trim();
      if (!t) { if (lines.length && !blank) s++; blank = true; return; }
      blank = false; lines.push({ t, s });
    });
    // no blank lines at all in a long poem (typical OCR): make stanzas of 4 lines
    if (lines.length > 8 && lines.every(l => l.s === 0)) lines.forEach((l, i) => l.s = Math.floor(i / 4));
    return lines;
  }
  const strophes = lines => [...new Set(lines.map(l => l.s))];
  const wordsOf = t => (t.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || []);
  const lastWord = t => { const w = wordsOf(t); return w[w.length - 1] || ''; };
  function rhymeKey(t) {
    let w = lastWord(t).toLowerCase().normalize('NFC');
    w = w.replace(/(ent|es|s|x|t|d)$/, '').replace(/e$/, '');
    return w.slice(-2);
  }
  function mastery(p) {
    const lines = parse(p.text);
    p.m = p.m || [];
    if (!lines.length) return 0;
    return lines.reduce((a, _, i) => a + Math.min(3, p.m[i] || 0), 0) / (lines.length * 3);
  }
  /* 3 = « maîtrisé ». Quand l'IA qui écoute est disponible, seul un vers vraiment récité (vérifié) peut l'atteindre :
     cocher « je l'ai dit » ne suffit plus pour arriver à 100 %. */
  function bump(p, idx, d, verified) {
    p.m = p.m || [];
    const cap = verified || !Ear.available() ? 3 : 2;
    idx.forEach(i => { const o = p.m[i] || 0; p.m[i] = Math.max(0, Math.min(Math.max(cap, d > 0 ? 0 : o), o + d)); });
    p.last = Date.now();
    Store.save(true);
  }
  const RHYME_COLORS = ['#e5533d', '#3d7be5', '#2f9e44', '#c2410c', '#9b59d0', '#0e9aa7', '#d6336c', '#7c5c00'];
  function rhymeColors(lines) {
    const keys = lines.map(l => rhymeKey(l.t)), map = {}; let n = 0;
    return keys.map((k, i) => {
      if (!k || keys.filter(x => x === k).length < 2) return null;
      if (!(k in map)) map[k] = RHYME_COLORS[n++ % RHYME_COLORS.length];
      return map[k];
    });
  }
  function lineHTML(t, color) {
    const lw = lastWord(t);
    if (!lw || !color) return esc(t);
    const i = t.lastIndexOf(lw);
    return esc(t.slice(0, i)) + `<b class="rhyme" style="color:${color}">${esc(lw)}</b>` + esc(t.slice(i + lw.length));
  }

  /* ---------------- list ---------------- */
  UI.register('poems', (root) => {
    UI.setTitle('Poésie');
    const list = poems().slice().sort((a, b) => b.createdAt - a.createdAt);
    const wrap = el(html`<div class="center-col">
      <div class="row" style="margin-bottom:var(--gap)"><h2 class="pix-title" style="margin:0">Mes poésies</h2><span class="spacer"></span>
        <button class="pix-btn gold" data-a="add">${Pixel.svg('camera')} Nouvelle poésie</button></div>
      <div class="list-cards"></div></div>`);
    const cards = wrap.querySelector('.list-cards');
    if (!list.length) wrap.appendChild(el(html`<div class="home-hero">${UI.mascot()}<div class="bubble">Pas encore de poésie ! Un parent peut la prendre en photo.</div></div>`));
    list.forEach((p, i) => {
      const pct = Math.round(mastery(p) * 100);
      const c = el(html`<div class="panel list-card" style="animation-delay:${i * .05}s">
        <div class="title">${esc(p.title)}</div><div class="muted" style="font-size:clamp(14px,2.2vmin,19px)">${esc(p.author || '')}</div>
        <div class="progress"><div style="width:${pct}%"></div></div><div style="margin-top:6px;font-weight:700">${pct}% appris ${pct >= 100 ? '🏆' : ''}</div></div>`);
      c.onclick = () => UI.go('poem', { id: p.id });
      cards.appendChild(c);
    });
    wrap.querySelector('[data-a=add]').onclick = async () => { if (await UI.parentGate()) UI.go('poemEdit', {}); };
    root.appendChild(wrap);
  });

  /* ---------------- editor (photo + OCR) ---------------- */
  UI.register('poemEdit', (root, { id }) => {
    const ex = id ? poem(id) : null;
    const st = ex ? Object.assign({}, ex) : { title: '', author: '', text: '' };
    let image = null, imageChanged = false;
    UI.setTitle(ex ? 'Modifier la poésie' : 'Nouvelle poésie');
    const w = el(html`<div class="center-col"><div class="panel">
      <div class="row center" style="margin-bottom:14px">
        <button class="pix-btn gold big" data-a="cam">${Pixel.svg('camera')} Prendre en photo</button>
        <button class="pix-btn wood big" data-a="pick">${Pixel.svg('image')} Choisir une image</button></div>
      <div data-z="prev" style="display:none;margin-bottom:12px"><img class="photo-view" style="max-height:30vh;object-fit:contain;background:#fff"></div>
      <div class="field"><label>Titre</label><input data-f="title" value="${esc(st.title)}" placeholder="Le titre de la poésie"></div>
      <div class="field"><label>Auteur</label><input data-f="author" value="${esc(st.author)}" placeholder="Victor Hugo, Maurice Carême…"></div>
      <div class="field"><label>Texte <span class="muted" style="font-weight:400">(un vers par ligne, une ligne vide entre les strophes)</span></label><textarea data-f="text">${esc(st.text)}</textarea></div>
      <div class="row end">${ex ? `<button class="pix-btn red" data-a="del">${Pixel.svg('trash')} Supprimer</button><span class="spacer"></span>` : ''}
        <button class="pix-btn green big" data-a="save">${Pixel.svg('check')} Enregistrer</button></div></div></div>`);
    root.appendChild(w);
    const ta = w.querySelector('[data-f=text]'), prev = w.querySelector('[data-z=prev]');
    if (ex && ex.imageId) Store.Blobs.get(ex.imageId).then(img => { if (img) { image = img; prev.style.display = ''; prev.querySelector('img').src = img; } });
    const onRes = res => {
      UI.closeAllModals();
      if (!res) return;
      if (res.image) { image = res.image; imageChanged = true; prev.style.display = ''; prev.querySelector('img').src = image; }
      const lines = (res.text || '').split('\n').map(l => l.trim());
      if (lines.filter(Boolean).length) {
        // first short line is often the title
        const first = lines.find(Boolean);
        if (!w.querySelector('[data-f=title]').value && first && first.length < 40 && !/[.,;:!?]$/.test(first)) { w.querySelector('[data-f=title]').value = first; lines.splice(lines.indexOf(first), 1); }
        ta.value = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
        UI.toast('Texte lu ! Vérifie les vers et les strophes.');
      } else UI.toast('Je n\'ai pas trouvé de texte : écris-le à la main');
    };
    const onProc = () => UI.modal(html`<div style="text-align:center"><div class="spinner"></div><h2>Je lis la poésie…</h2></div>`, { locked: true });
    w.querySelector('[data-a=cam]').onclick = () => Photo.take(onRes, onProc);
    w.querySelector('[data-a=pick]').onclick = () => Photo.pick(onRes, onProc);
    w.querySelector('[data-a=save]').onclick = async () => {
      st.title = w.querySelector('[data-f=title]').value.trim() || 'Ma poésie';
      st.author = w.querySelector('[data-f=author]').value.trim();
      st.text = ta.value.trim();
      if (parse(st.text).length < 2) { UI.toast('Ajoute le texte de la poésie'); UI.shake(ta); return; }
      if (imageChanged && image) { if (st.imageId) await Store.Blobs.del(st.imageId); st.imageId = 'img_' + Store.uid(); await Store.Blobs.put(st.imageId, image); }
      if (ex) { if (ex.text !== st.text) st.m = []; Object.assign(ex, st); }
      else { st.id = Store.uid(); st.createdAt = Date.now(); st.m = []; st.recs = []; st.draws = {}; poems().push(st); }
      Store.save(true); SFX.play('good'); UI.toast('Poésie enregistrée !');
      UI.go('poem', { id: (ex || st).id }, { replace: true });
    };
    const del = w.querySelector('[data-a=del]');
    if (del) del.onclick = async () => {
      if (!(await UI.confirm('Supprimer cette poésie et ses enregistrements ?', 'Supprimer', 'Annuler'))) return;
      await Store.Blobs.del(ex.imageId); for (const r of ex.recs || []) await Store.Blobs.del(r.recId); for (const k in ex.draws || {}) await Store.Blobs.del(ex.draws[k]);
      Store.data.poems = poems().filter(x => x.id !== ex.id); Store.save(true); UI.home(); UI.go('poems');
    };
  });

  /* ---------------- hub ---------------- */
  const ACTS = [
    ['listen', '🎧', 'Écouter', 'Écoute et comprends la poésie'],
    ['voices', '🤖', 'Les voix rigolotes', 'Répète avec des voix lente, rapide, robot'],
    ['snow', '❄️', 'Boule de neige', 'Vers par vers, en ajoutant le suivant'],
    ['erase', '🧽', 'La poésie s\'efface', 'Les rimes, puis les mots, disparaissent'],
    ['complete', '🎯', 'Complète le vers', 'Trouve le mot de la rime'],
    ['next', '➡️', 'Le vers suivant', 'Quel vers vient après ?'],
    ['order', '🔀', 'Vers mélangés', 'Remets la strophe dans l\'ordre'],
    ['draw', '🎨', 'Dessine la strophe', 'Une image pour s\'en souvenir'],
    ['recite', '🎤', 'Je récite', 'Je t\'écoute et je vérifie']
  ];
  let scope = {};
  UI.register('poem', (root, { id }) => {
    const p = poem(id); if (!p) { UI.home(); return; }
    UI.setTitle(p.title);
    const lines = parse(p.text), ss = strophes(lines);
    if (scope[id] == null) scope[id] = 'all';
    const pct = Math.round(mastery(p) * 100);
    const sMast = s => { const idx = lines.map((l, i) => l.s === s ? i : -1).filter(i => i >= 0); return idx.reduce((a, i) => a + Math.min(3, (p.m || [])[i] || 0), 0) / (idx.length * 3); };
    const advice = (() => {
      const weakest = ss.slice().sort((a, b) => sMast(a) - sMast(b))[0];
      if (pct === 0) return ['listen', 'Commence par écouter la poésie et bien la comprendre.'];
      if (pct < 35) return ['snow', `Apprends la strophe ${weakest + 1} en boule de neige.`];
      if (pct < 70) return [rnd(['erase', 'complete', 'next']), `Entraîne-toi sur la strophe ${weakest + 1}.`];
      if (pct < 100) return ['recite', 'Tu y es presque : récite et réécoute-toi !'];
      return ['recite', 'Tu la connais ! Récite-la encore demain matin pour ne pas l\'oublier.'];
    })();
    const w = el(html`<div class="center-col poem-hub">
      <div class="panel poem-head">
        <div class="row"><div><div class="poem-title">${esc(p.title)}</div><div class="muted">${esc(p.author || '')}</div></div><span class="spacer"></span>
          <button class="pix-btn small wood" data-a="edit">${Pixel.svg('pencil')}</button></div>
        <div class="poem-progress"><div class="progress big"><div style="width:${pct}%"></div></div><b>${pct}%</b></div>
        <div class="strophe-stars">${ss.map(s => `<span class="sst">Strophe ${s + 1} <i>${'★'.repeat(Math.round(sMast(s) * 3))}${'☆'.repeat(3 - Math.round(sMast(s) * 3))}</i></span>`).join('')}</div>
        <div class="advice">💡 ${advice[1]} <button class="pix-btn small gold" data-act="${advice[0]}">C'est parti</button></div>
      </div>
      <div class="tabs scope-tabs"><button class="pix-btn small ${scope[id] === 'all' ? 'on' : ''}" data-s="all">Toute la poésie</button>
        ${ss.map(s => `<button class="pix-btn small ${scope[id] === s ? 'on' : ''}" data-s="${s}">Strophe ${s + 1}</button>`).join('')}</div>
      <div class="games-grid poem-acts">${ACTS.map(([k, ic, n, d], i) => `<button class="tile game-tile" data-act="${k}" style="background-image:url(${Pixel.texture(['herbe', 'laine', 'pierre', 'eau', 'bois', 'sable', 'brique', 'violet', 'or'][i])});animation-delay:${i * .05}s"><span class="emo">${ic}</span><span>${n}</span><span class="sub">${d}</span></button>`).join('')}</div>
      <div class="panel tips"><b>Conseils pour bien apprendre</b><ol>
        <li>Comprends d'abord : de quoi parle la poésie ? Quelles images vois-tu ?</li>
        <li>Une strophe à la fois, et ajoute un vers à chaque fois (boule de neige).</li>
        <li>Les rimes sont en couleur : elles t'aident à retrouver la fin des vers.</li>
        <li>Répète à voix haute, puis enregistre-toi et réécoute-toi.</li>
        <li>Révise un peu le soir avant de dormir et le lendemain matin : c'est là que la mémoire travaille !</li></ol></div>
    </div>`);
    root.appendChild(w);
    w.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { scope[id] = b.dataset.s === 'all' ? 'all' : +b.dataset.s; UI.go('poem', { id }, { replace: true }); });
    w.querySelectorAll('[data-act]').forEach(b => b.onclick = () => UI.go('poemGame', { id, act: b.dataset.act, scope: scope[id] }));
    w.querySelector('[data-a=edit]').onclick = async () => { if (await UI.parentGate()) UI.go('poemEdit', { id }); };
  });

  /* ---------------- activities ---------------- */
  UI.register('poemGame', (root, { id, act, scope: sc }) => {
    const p = poem(id); if (!p) { UI.home(); return; }
    const all = parse(p.text);
    const idxs = all.map((l, i) => (sc === 'all' || l.s === sc) ? i : -1).filter(i => i >= 0);
    const lines = idxs.map(i => all[i]);
    const colors = rhymeColors(all);
    const A = ACTS.find(a => a[0] === act);
    UI.setTitle(A[2] + (sc === 'all' ? '' : ' · strophe ' + (sc + 1)));
    let alive = true;
    const done = (gems, xp, title, extra = []) => {
      Speech.stop();
      UI.results({ title, stars: gems > 8 ? 3 : gems > 4 ? 2 : 1, gems, xp, lines: [`Poésie apprise à ${Math.round(mastery(p) * 100)}%`].concat(extra),
        onAgain: () => UI.go('poemGame', { id, act, scope: sc }, { replace: true }), onDone: () => UI.back() });
    };
    const wrap = el('<div class="game center-col poem-game"></div>');
    root.appendChild(wrap);
    const poemBox = (fn) => `<div class="poem-text">${all.map((l, i) => idxs.includes(i) ? `<div class="pl ${i > 0 && all[i - 1].s !== l.s && idxs.includes(i - 1) ? 'new-s' : ''}" data-i="${i}">${fn ? fn(l, i) : lineHTML(l.t, colors[i])}</div>` : '').join('')}</div>`;

    /* --- l'IA écoute : les mots apparaissent quand ils sont récités --- */
    const EAR = Ear.available();
    function earPanel(box, lineIdxs, { onEnd, auto = true }) {
      const texts = lineIdxs.map(i => all[i].t);
      box.innerHTML = `<div class="ear-status"><span class="ear-mic">🎤</span><span class="st">Je prépare mes oreilles…</span></div><div class="poem-text ear-box">${Ear.revealHTML(Ear.match(texts, ''))}</div>`;
      const eb = box.querySelector('.ear-box'), st = box.querySelector('.st');
      let ended = false, passT = 0;
      const sess = Ear.listen({
        onState(x) { if (x === 'listening') { st.textContent = 'Je t\'écoute ! Vas-y, récite…'; box.classList.add('listening'); } },
        onText(t) {
          const r = Ear.match(texts, t);
          Ear.update(eb, r);
          const last = r.lines[r.lines.length - 1];
          if (auto && r.score >= 0.85 && last.score >= 0.6 && !passT) passT = setTimeout(finish, 900);
        },
        onError(m) { st.textContent = m === 'mic' ? 'Le micro n\'est pas autorisé 😕' : 'Oups, je n\'arrive pas à écouter.'; box.classList.remove('listening'); }
      });
      async function finish() {
        if (ended) return; ended = true; clearTimeout(passT);
        st.textContent = 'Je vérifie…'; box.classList.remove('listening');
        const r = await sess.stop();
        if (!alive) return;
        onEnd(Ear.match(texts, r.text), r.blob, r.error);
      }
      const api = { finish, cancel() { ended = true; clearTimeout(passT); sess.cancel(); } };
      cleanups.push(api.cancel);
      return api;
    }
    const cleanups = [];
    const verdict = res => res.score >= 0.999 ? 'Parfait, tous les mots y sont !' : res.score >= 0.8 ? 'Très bien, presque tout !' : res.score >= 0.5 ? 'Il manque encore des mots.' : 'Il manque beaucoup de mots.';

    /* --- écouter --- */
    if (act === 'listen') {
      wrap.innerHTML = `<div class="prompt">Écoute bien. Ferme les yeux et imagine la scène !</div>${poemBox()}<div class="row center"><button class="pix-btn gold big" data-a="play">${Pixel.svg('speaker')} Écouter</button><button class="pix-btn green" data-a="ok">J'ai compris !</button></div>`;
      const play = async () => {
        for (const i of idxs) { if (!alive) return; wrap.querySelectorAll('.pl').forEach(x => x.classList.toggle('hl', +x.dataset.i === i)); await speakAsync(all[i].t, 0.8); await sleep(all[i + 1] && all[i + 1].s !== all[i].s ? 700 : 250); }
        wrap.querySelectorAll('.pl').forEach(x => x.classList.remove('hl'));
      };
      wrap.querySelectorAll('.pl').forEach(x => x.onclick = () => Speech.speak(all[+x.dataset.i].t, { rate: .75 }));
      wrap.querySelector('[data-a=play]').onclick = play;
      wrap.querySelector('[data-a=ok]').onclick = () => { bump(p, idxs.filter(i => !(p.m || [])[i]), 1); done(3, 15, 'Bonne écoute !'); };
      setTimeout(play, 500);
    }

    /* --- voix rigolotes --- */
    if (act === 'voices') {
      let k = 0;
      const voices = [['🐢 Voix lente', .6, false], ['🐇 Voix rapide', 1.35, false], ['🤖 Voix de robot', 1, true], ['🙂 Voix normale', .9, false]];
      const render = () => {
        const i = idxs[k];
        wrap.innerHTML = `<div class="prompt">Vers ${k + 1} / ${idxs.length} : écoute, puis répète-le avec la même voix !</div>
          <div class="big-line">${lineHTML(all[i].t, colors[i])}</div>
          <div class="row center voice-btns">${voices.map((v, j) => `<button class="pix-btn ${j === 2 ? 'purple' : 'gold'}" data-v="${j}">${v[0]}</button>`).join('')}</div>
          <div class="row center"><button class="pix-btn green big" data-a="next">${k + 1 < idxs.length ? 'Vers suivant ➜' : 'Terminé !'}</button></div>`;
        wrap.querySelectorAll('[data-v]').forEach(b => b.onclick = async () => {
          const [, rate, robot] = voices[+b.dataset.v];
          if (robot) { for (const wd of wordsOf(all[i].t)) { await speakAsync(wd, 1.1); await sleep(140); } }
          else Speech.speak(all[i].t, { rate });
        });
        wrap.querySelector('[data-a=next]').onclick = () => { if (++k < idxs.length) render(); else { bump(p, idxs, 1); done(4, 20, 'Quelle voix !'); } };
      };
      render();
    }

    /* --- boule de neige --- */
    if (act === 'snow') {
      let n = 1, ok = 0;
      const render = () => {
        const part = idxs.slice(0, n);
        wrap.innerHTML = `<div class="prompt">Étape ${n} / ${idxs.length} : lis ${n > 1 ? 'ces ' + n + ' vers' : 'ce vers'}, cache-${n > 1 ? 'les' : 'le'}, puis dis-${n > 1 ? 'les' : 'le'} sans regarder !</div>
          <div class="snow-box">${part.map(i => `<div class="pl ${i === part[part.length - 1] ? 'fresh' : ''}">${lineHTML(all[i].t, colors[i])}</div>`).join('')}</div>
          <div class="row center"><button class="pix-btn gold" data-a="hear">${Pixel.svg('speaker')} Écouter</button><button class="pix-btn blue big" data-a="hide">🙈 Je cache et je récite</button></div>`;
        wrap.querySelector('[data-a=hear]').onclick = async () => { for (const i of part) { await speakAsync(all[i].t, .8); await sleep(200); } };
        const success = (verified) => {
          SFX.play('good'); UI.burstAt(wrap.querySelector('.snow-box') || wrap, { n: 14, spread: 100 }); ok++;
          bump(p, [part[part.length - 1]], 1, verified);
          if (n < idxs.length) { n++; setTimeout(render, verified ? 900 : 500); } else { bump(p, idxs, 1, verified); done(Math.min(12, 3 + ok), 10 + ok * 4, 'Boule de neige réussie !'); }
        };
        if (EAR) wrap.querySelector('[data-a=hide]').onclick = () => {
          Speech.stop();
          const sb = wrap.querySelector('.snow-box');
          sb.classList.add('hidden-lines'); sb.style.display = 'none';
          const eb = el('<div class="ear-panel"></div>'); sb.after(eb);
          const r = wrap.querySelector('.row:last-child');
          r.innerHTML = `<button class="pix-btn" data-a="peek">👀 Regarder</button><button class="pix-btn green big" data-a="end">✔ J'ai fini</button>`;
          let peek = 0;
          r.querySelector('[data-a=peek]').onclick = () => { peek++; sb.style.display = sb.style.display === 'none' ? '' : 'none'; sb.classList.remove('hidden-lines'); };
          const ear = earPanel(eb, part, { onEnd(res) {
            const pass = res.score >= 0.8;
            if (pass) { eb.querySelector('.st').textContent = verdict(res); return success(!peek); }
            SFX.play('bad');
            eb.innerHTML = `<div class="ear-status"><span class="st">${verdict(res)} Les mots en rouge ont été oubliés :</span></div><div class="poem-text ear-box">${Ear.revealHTML(res, { showAll: true })}</div>`;
            r.innerHTML = `<button class="pix-btn gold big" data-a="again">🔁 Je réessaie</button>`;
            r.querySelector('[data-a=again]').onclick = () => { SFX.play('pop'); render(); };
          } });
          r.querySelector('[data-a=end]').onclick = () => ear.finish();
        };
        else wrap.querySelector('[data-a=hide]').onclick = () => {
          wrap.querySelector('.snow-box').classList.add('hidden-lines');
          const r = wrap.querySelector('.row:last-child');
          r.innerHTML = `<button class="pix-btn" data-a="peek">👀 Regarder</button><button class="pix-btn red" data-a="no">Pas encore</button><button class="pix-btn green big" data-a="yes">✔ Je l'ai dit !</button>`;
          r.querySelector('[data-a=peek]').onclick = () => wrap.querySelector('.snow-box').classList.toggle('hidden-lines');
          r.querySelector('[data-a=no]').onclick = () => { SFX.play('pop'); render(); };
          r.querySelector('[data-a=yes]').onclick = () => success(false);
        };
        Speech.speak(all[part[part.length - 1]].t, { rate: .8 });
      };
      render();
    }

    /* --- effacement progressif --- */
    if (act === 'erase') {
      let level = 0, peeks = 0;
      const LV = ['Lis la poésie à voix haute.', 'Les rimes ont disparu ! Relis-la en entier.', 'Les mots importants s\'envolent aussi…', 'Il ne reste que la première lettre de chaque mot !', 'Plus rien ! Récite-la de mémoire.'];
      const hideWord = (w, li, wi, nw) => {
        if (level === 0) return false;
        if (level === 1) return wi === nw - 1;
        if (level === 2) return wi === nw - 1 || w.length >= 5;
        return true;
      };
      const eraseLine = (l, i) => {
        const re = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
        const nw = wordsOf(l.t).length; let out = '', pos = 0, wi = 0, mm;
        while ((mm = re.exec(l.t)) !== null) {
          const w = mm[0], k = wi++;
          out += esc(l.t.slice(pos, mm.index)); pos = mm.index + w.length;
          if (!hideWord(w, i, k, nw)) out += k === nw - 1 && colors[i] ? `<b class="rhyme" style="color:${colors[i]}">${esc(w)}</b>` : esc(w);
          else out += `<span class="gap" data-w="${esc(w)}">${level === 3 ? esc(w[0]) + '<i>' + '_'.repeat(Math.max(1, w.length - 1)) + '</i>' : '<i>' + '_'.repeat(w.length) + '</i>'}</span>`;
        }
        return out + esc(l.t.slice(pos));
      };
      const renderEar = () => {
        wrap.innerHTML = `<div class="prompt">Niveau 5 / 5 · Plus rien ! Récite-la de mémoire, je t'écoute.</div><div class="erase-dots">${LV.map(() => `<i class="on"></i>`).join('')}</div>
          <div class="ear-panel"></div><div class="row center"><button class="pix-btn green big" data-a="end">✔ J'ai fini</button></div>`;
        const ear = earPanel(wrap.querySelector('.ear-panel'), idxs, { onEnd(res) {
          res.lines.forEach((l, k) => bump(p, [idxs[k]], l.score >= 0.85 ? (peeks <= 2 ? 2 : 1) : l.score >= 0.6 ? 1 : 0, true));
          const pc = Math.round(res.score * 100);
          if (res.score >= 0.8) SFX.play('good'); else SFX.play('bad');
          done(res.score >= 0.95 ? 10 : res.score >= 0.8 ? 7 : res.score >= 0.5 ? 4 : 2, 10 + Math.round(res.score * 25), verdict(res), [`${pc} % des mots récités`, `${peeks} coup${peeks > 1 ? 's' : ''} d'œil`]);
        } });
        wrap.querySelector('[data-a=end]').onclick = () => ear.finish();
      };
      const render = () => {
        if (EAR && level === 4) return renderEar();
        wrap.innerHTML = `<div class="prompt">Niveau ${level + 1} / 5 · ${LV[level]}</div><div class="erase-dots">${LV.map((_, j) => `<i class="${j <= level ? 'on' : ''}"></i>`).join('')}</div>
          ${poemBox((l, i) => eraseLine(l, i))}
          <div class="muted">Touche un trou pour voir le mot (essaie de ne pas le faire 😉)</div>
          <div class="row center"><button class="pix-btn green big" data-a="ok">${level < 4 ? '✔ Je l\'ai lue, niveau suivant' : '✔ Je l\'ai récitée !'}</button></div>`;
        wrap.querySelectorAll('.gap').forEach(g => g.onclick = () => { if (g.classList.contains('peek')) return; peeks++; g.classList.add('peek'); g.innerHTML = g.dataset.w; SFX.play('pop'); });
        // touche un vers : il est lu à voix haute, sans les mots cachés
        wrap.querySelectorAll('.pl').forEach(x => x.onclick = (e) => {
          if (e.target.closest('.gap')) return;
          const c = x.cloneNode(true);
          c.querySelectorAll('.gap:not(.peek)').forEach(g => g.replaceWith(' … '));
          const t = c.textContent.replace(/\s+/g, ' ').replace(/…\s*[,.;:!?]+/g, '…').trim();
          if (t.replace(/[…\s.,;:!?'’-]/g, '')) { x.classList.add('hl'); Speech.speak(t, { rate: .8, onDone: () => x.classList.remove('hl') }); }
        });
        wrap.querySelector('[data-a=ok]').onclick = () => {
          SFX.play('good');
          if (level < 4) { level++; render(); }
          else { bump(p, idxs, peeks <= 2 ? 2 : 1); done(peeks === 0 ? 10 : peeks < 4 ? 7 : 4, 30, peeks === 0 ? 'Sans regarder, bravo !' : 'Bien joué !', [`${peeks} coup${peeks > 1 ? 's' : ''} d'œil`]); }
        };
      };
      render();
    }

    /* --- complète le vers (rime) --- */
    if (act === 'complete' || act === 'next') {
      const order = FR.shuffle(idxs.filter(i => act === 'complete' ? lastWord(all[i].t).length > 0 : all[i + 1] && idxs.includes(i + 1)));
      if (!order.length) { wrap.innerHTML = '<p class="prompt">Choisis une strophe plus longue pour ce jeu.</p>'; return; }
      let k = 0, good = 0;
      const render = () => {
        const i = order[k], l = all[i];
        let promptHTML, answer, opts;
        if (act === 'complete') {
          const lw = lastWord(l.t), cut = l.t.lastIndexOf(lw);
          answer = lw;
          const pool = [...new Set(all.map(x => lastWord(x.t)).filter(x => x && x.toLowerCase() !== lw.toLowerCase()))];
          opts = FR.shuffle([lw, ...FR.shuffle(pool).slice(0, 2)]);
          promptHTML = `<div class="big-line">${esc(l.t.slice(0, cut))}<span class="gap big"><i>?</i></span>${esc(l.t.slice(cut + lw.length))}</div>`;
          Speech.speak(l.t.slice(0, cut), { rate: .8 });
        } else {
          answer = all[i + 1].t;
          const pool = all.filter((x, j) => j !== i + 1 && j !== i).map(x => x.t);
          opts = FR.shuffle([answer, ...FR.shuffle(pool).slice(0, 2)]);
          promptHTML = `<div class="big-line">${lineHTML(l.t, colors[i])}</div><div class="prompt">Et ensuite ?</div>`;
          Speech.speak(l.t, { rate: .8 });
        }
        let errs = 0;
        wrap.innerHTML = `<div class="game-progress">${order.map((_, j) => `<i class="${j < k ? 'done' : j === k ? 'cur' : ''}"></i>`).join('')}</div>${promptHTML}<div class="choices ${act === 'next' ? 'lines' : ''}">${opts.map(o => `<button class="pix-btn wood choice">${esc(o)}</button>`).join('')}</div>`;
        wrap.querySelectorAll('.choice').forEach((b, j) => b.onclick = () => {
          if (opts[j] === answer) {
            SFX.play('good'); UI.burstAt(b, { n: 12, spread: 90 }); if (!errs) good++;
            bump(p, [act === 'complete' ? i : i + 1], errs ? 0 : 1);
            setTimeout(() => { if (++k < order.length) render(); else done(Math.max(2, good * 2), good * 8 + 10, good === order.length ? 'Sans faute !' : 'Bien joué !', [`${good} / ${order.length} du premier coup`]); }, 900);
          } else { errs++; SFX.play('bad'); b.disabled = true; UI.shake(b); }
        });
      };
      render();
    }

    /* --- vers mélangés --- */
    if (act === 'order') {
      const groups = sc === 'all' ? strophes(all) : [sc];
      let gi = 0, firstTry = 0;
      const render = () => {
        const g = groups[gi];
        const gl = all.map((l, i) => l.s === g ? i : -1).filter(i => i >= 0);
        let shuffled = FR.shuffle(gl); for (let t = 0; t < 5 && gl.length > 1 && shuffled.every((v, j) => v === gl[j]); t++) shuffled = FR.shuffle(gl);
        const placed = []; let errs = 0;
        wrap.innerHTML = `<div class="prompt">Strophe ${g + 1} : touche les vers dans le bon ordre !</div><div class="order-done"></div><div class="order-pool">${shuffled.map(i => `<button class="pix-btn wood order-line" data-i="${i}">${esc(all[i].t)}</button>`).join('')}</div>`;
        wrap.querySelectorAll('.order-line').forEach(b => b.onclick = () => {
          const i = +b.dataset.i, expect = gl[placed.length];
          if (i === expect) {
            placed.push(i); b.remove(); SFX.play('place');
            wrap.querySelector('.order-done').insertAdjacentHTML('beforeend', `<div class="pl">${lineHTML(all[i].t, colors[i])}</div>`);
            Speech.speak(all[i].t, { rate: .85 });
            if (placed.length === gl.length) {
              if (!errs) firstTry++; bump(p, gl, errs ? 0 : 1); SFX.play('good');
              setTimeout(() => { if (++gi < groups.length) render(); else done(3 + firstTry * 2, 15 + firstTry * 8, 'Tout est dans l\'ordre !'); }, 1100);
            }
          } else { errs++; SFX.play('bad'); UI.shake(b); }
        });
      };
      render();
    }

    /* --- dessine la strophe --- */
    if (act === 'draw') {
      const groups = sc === 'all' ? strophes(all) : [sc];
      let gi = 0;
      p.draws = p.draws || {};
      const render = async () => {
        const g = groups[gi];
        const gl = all.filter(l => l.s === g);
        wrap.innerHTML = `<div class="prompt">Strophe ${g + 1} : dessine ce que tu imagines. Ton dessin t'aidera à t'en souvenir !</div>
          <div class="draw-wrap"><div class="poem-text small">${gl.map(l => `<div class="pl">${esc(l.t)}</div>`).join('')}</div>
          <div><canvas class="draw-cv" width="600" height="420"></canvas>
          <div class="row center draw-tools">${['#2b1d12', '#e5533d', '#3d7be5', '#5faa3c', '#f5c542', '#ff8fb1', '#9b59d0', '#ffffff'].map((c, j) => `<button class="swatch ${j === 0 ? 'sel' : ''}" data-c="${c}" style="background:${c}"></button>`).join('')}
            <button class="pix-btn small" data-a="clear">Effacer</button></div></div></div>
          <div class="row center"><button class="pix-btn green big" data-a="save">✔ ${gi + 1 < groups.length ? 'Strophe suivante' : 'Terminé'}</button></div>`;
        const cv = wrap.querySelector('.draw-cv'), c = cv.getContext('2d');
        c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height);
        const old = p.draws[g] && await Store.Blobs.get(p.draws[g]);
        if (old) { const im = new Image(); im.onload = () => c.drawImage(im, 0, 0); im.src = old; }
        let color = '#2b1d12', drawing = false, last = null;
        c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = 9;
        const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
        cv.onpointerdown = e => { drawing = true; last = pos(e); cv.setPointerCapture(e.pointerId); };
        cv.onpointermove = e => { if (!drawing) return; const q = pos(e); c.strokeStyle = color; c.lineWidth = color === '#ffffff' ? 26 : 9; c.beginPath(); c.moveTo(last[0], last[1]); c.lineTo(q[0], q[1]); c.stroke(); last = q; };
        cv.onpointerup = cv.onpointercancel = () => { drawing = false; };
        wrap.querySelectorAll('.swatch').forEach(b => b.onclick = () => { color = b.dataset.c; wrap.querySelectorAll('.swatch').forEach(x => x.classList.toggle('sel', x === b)); });
        wrap.querySelector('[data-a=clear]').onclick = () => { c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height); };
        wrap.querySelector('[data-a=save]').onclick = async () => {
          const key = p.draws[g] || 'draw_' + Store.uid();
          await Store.Blobs.put(key, cv.toDataURL('image/jpeg', .8)); p.draws[g] = key; Store.save(true); SFX.play('good');
          if (++gi < groups.length) render(); else done(4, 20, 'Quel artiste !');
        };
      };
      render();
    }

    /* --- récitation : chrono + enregistrement + souffleur --- */
    if (act === 'recite') {
      let stream = null, rec = null, chunks = [], t0 = 0, tick = 0, shown = -1, hints = 0;
      const render = async () => {
        const draws = {};
        for (const s of strophes(all)) if (p.draws && p.draws[s]) draws[s] = await Store.Blobs.get(p.draws[s]);
        wrap.innerHTML = `<div class="prompt">Récite toute la ${sc === 'all' ? 'poésie' : 'strophe'} sans regarder. Le souffleur peut t'aider !</div>
          <div class="recite-stage">${strophes(all).filter(s => sc === 'all' || s === sc).map(s => draws[s] ? `<img class="draw-thumb" src="${draws[s]}">` : `<div class="draw-thumb empty">Strophe ${s + 1}</div>`).join('')}</div>
          <div class="souffleur"></div>
          <div class="chrono-bar"><div class="chrono">0.0 s</div><span class="rec-dot" style="display:none"></span>
            <button class="pix-btn green big" data-a="go">${Pixel.svg('mic')} Je récite !</button>
            <button class="pix-btn gold" data-a="hint" disabled>🤫 Souffleur</button></div>
          <div class="recs"></div>`;
        drawRecs();
        const go = wrap.querySelector('[data-a=go]'), hint = wrap.querySelector('[data-a=hint]'), chrono = wrap.querySelector('.chrono'), sf = wrap.querySelector('.souffleur');
        hint.onclick = () => {
          shown = Math.min(idxs.length - 1, shown + 1); hints++;
          const l = all[idxs[shown]].t; const ws = wordsOf(l);
          sf.innerHTML = `<div class="pl">${esc(ws.slice(0, Math.max(2, Math.ceil(ws.length / 3))).join(' '))}…</div>`;
          SFX.play('pop');
        };
        if (EAR) {
          let ear = null, earBox = el('<div class="ear-panel"></div>');
          wrap.querySelector('.recite-stage').after(earBox);
          go.onclick = () => {
            if (ear) { go.disabled = true; ear.finish(); return; }
            Speech.stop();
            t0 = performance.now(); chrono.classList.add('running'); hint.disabled = false; shown = -1; hints = 0; sf.innerHTML = '';
            tick = setInterval(() => chrono.textContent = ((performance.now() - t0) / 1000).toFixed(1) + ' s', 100);
            go.className = 'pix-btn red big'; go.innerHTML = Pixel.svg('stop') + " J'ai fini !";
            ear = earPanel(earBox, idxs, { auto: false, async onEnd(res, blob) {
              const ms = performance.now() - t0;
              clearInterval(tick); chrono.classList.remove('running');
              const entry = { id: Store.uid(), date: Date.now(), ms: Math.round(ms), hints, recId: null, score: Math.round(res.score * 100) };
              if (blob) { entry.recId = 'prec_' + entry.id; await Store.Blobs.put(entry.recId, blob); }
              p.recs = (p.recs || []).concat(entry);
              while (p.recs.filter(x => x.recId).length > 10) { const o = p.recs.find(x => x.recId); await Store.Blobs.del(o.recId); o.recId = null; }
              res.lines.forEach((l, k) => bump(p, [idxs[k]], l.score >= 0.9 ? (hints === 0 ? 3 : 2) : l.score >= 0.6 ? 1 : l.score < 0.3 ? -1 : 0, true));
              entry.self = res.score >= 0.9 ? 2 : res.score >= 0.6 ? 1 : 0;
              Store.save(true);
              earEval(entry, res, blob);
            } });
          };
          return;
        }
        go.onclick = async () => {
          if (rec) { stop(); return; }
          try { if (navigator.mediaDevices && window.MediaRecorder) stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { stream = null; UI.toast('Micro non autorisé : le chrono marche quand même'); }
          chunks = [];
          if (stream) { try { rec = new MediaRecorder(stream); rec.ondataavailable = e => e.data && e.data.size && chunks.push(e.data); rec.start(500); wrap.querySelector('.rec-dot').style.display = ''; } catch (e) { rec = null; } }
          if (!rec) rec = { fake: true, state: 'recording', stop() { this.state = 'inactive'; this.onstop && this.onstop(); } };
          t0 = performance.now(); chrono.classList.add('running'); hint.disabled = false; shown = -1; hints = 0; sf.innerHTML = '';
          tick = setInterval(() => chrono.textContent = ((performance.now() - t0) / 1000).toFixed(1) + ' s', 100);
          go.className = 'pix-btn red big'; go.innerHTML = Pixel.svg('stop') + " J'ai fini !";
        };
        const stop = () => {
          const ms = performance.now() - t0;
          clearInterval(tick); chrono.classList.remove('running'); wrap.querySelector('.rec-dot').style.display = 'none';
          const r = rec; rec = null;
          const fin = async () => {
            if (stream) stream.getTracks().forEach(t => t.stop()); stream = null;
            const blob = chunks.length ? new Blob(chunks, { type: (r && r.mimeType) || 'audio/webm' }) : null;
            const entry = { id: Store.uid(), date: Date.now(), ms: Math.round(ms), hints, recId: null };
            if (blob) { entry.recId = 'prec_' + entry.id; await Store.Blobs.put(entry.recId, blob); }
            p.recs = (p.recs || []).concat(entry);
            while (p.recs.filter(x => x.recId).length > 10) { const o = p.recs.find(x => x.recId); await Store.Blobs.del(o.recId); o.recId = null; }
            Store.save(true);
            selfEval(entry, blob);
          };
          if (r.fake) fin(); else { r.onstop = fin; r.stop(); }
        };
      };
      const earEval = (entry, res, blob) => {
        const pc = entry.score;
        const m = UI.modal(html`<h2>${pc >= 95 ? '😎' : pc >= 80 ? '🙂' : '😅'} ${pc} % des mots récités</h2>
          <p>${verdict(res)} · ${(entry.ms / 1000).toFixed(1)} s · ${entry.hints} aide${entry.hints > 1 ? 's' : ''} du souffleur</p>
          <div class="progress big"><div style="width:${pc}%"></div></div>
          <div class="poem-text ear-box ear-result">${Ear.revealHTML(res, { showAll: true })}</div>
          <p class="muted">En rouge : les mots que je n'ai pas entendus.</p>
          <div class="row center">${blob ? `<button class="pix-btn gold big" data-a="play">${Pixel.svg('speaker')} Me réécouter</button>` : ''}
            <button class="pix-btn green big" data-a="ok">Continuer</button></div>`, { locked: true });
        let player = null;
        const pb = m.querySelector('[data-a=play]');
        if (pb) pb.onclick = () => { if (player) player.pause(); player = new Audio(URL.createObjectURL(blob)); player.play(); };
        m.querySelector('[data-a=ok]').onclick = () => {
          if (player) player.pause();
          UI.closeModal();
          done(pc >= 95 ? 12 : pc >= 80 ? 8 : pc >= 50 ? 4 : 2, 15 + Math.round(pc / 3), pc >= 95 ? 'Bravo, quelle récitation !' : pc >= 80 ? 'Tu y es presque !' : 'Continue, ça va venir !', [`${pc} % des mots récités`]);
        };
      };
      const selfEval = (entry, blob) => {
        const m = UI.modal(html`<h2>Comment ça s'est passé ?</h2>
          <p>${(entry.ms / 1000).toFixed(1)} s · ${entry.hints} aide${entry.hints > 1 ? 's' : ''} du souffleur</p>
          ${blob ? `<div class="row center"><button class="pix-btn gold big" data-a="play">${Pixel.svg('speaker')} Me réécouter</button></div>` : ''}
          <div class="row center" style="margin-top:12px">
            <button class="pix-btn green big" data-r="2">😎 Parfait</button><button class="pix-btn gold big" data-r="1">🙂 Presque</button><button class="pix-btn red big" data-r="0">😅 Pas encore</button></div>`, { locked: true });
        let player = null;
        const pb = m.querySelector('[data-a=play]');
        if (pb) pb.onclick = () => { if (player) player.pause(); player = new Audio(URL.createObjectURL(blob)); player.play(); };
        m.querySelectorAll('[data-r]').forEach(b => b.onclick = () => {
          if (player) player.pause();
          const r = +b.dataset.r; entry.self = r;
          bump(p, idxs, r === 2 ? (entry.hints === 0 ? 3 : 2) : r);
          UI.closeModal();
          done(r === 2 ? 10 : r === 1 ? 6 : 3, 20 + r * 10, r === 2 ? 'Bravo, quelle récitation !' : r === 1 ? 'Tu y es presque !' : 'Continue, ça va venir !');
        });
      };
      function drawRecs() {
        const box = wrap.querySelector('.recs');
        const list = (p.recs || []).slice().reverse().slice(0, 8);
        if (!list.length) return;
        box.innerHTML = `<h3>Mes récitations</h3>` + list.map(r => `<div class="list-row"><div class="grow"><div class="t">${new Date(r.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${(r.ms / 1000).toFixed(1)} s ${['😅', '🙂', '😎'][r.self] || ''}${r.score != null ? ` · <b>${r.score} %</b>` : ''}</div><div class="s">${r.hints} aide${r.hints > 1 ? 's' : ''} du souffleur</div></div>
          ${r.recId ? `<button class="pix-btn small gold" data-rec="${r.recId}">${Pixel.svg('speaker')} Écouter</button>` : ''}</div>`).join('');
        let player = null;
        box.querySelectorAll('[data-rec]').forEach(b => b.onclick = async () => { const blob = await Store.Blobs.get(b.dataset.rec); if (!blob) return; if (player) player.pause(); player = new Audio(URL.createObjectURL(blob)); player.play(); });
      }
      render();
      return () => { alive = false; clearInterval(tick); cleanups.forEach(f => f()); if (stream) stream.getTracks().forEach(t => t.stop()); };
    }
    return () => { alive = false; Speech.stop(); cleanups.forEach(f => f()); };
  });

  window.Poems = { parse, mastery, poems };
})();
