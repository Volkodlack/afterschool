/* Parent area: word lists, reading sheets, progress, settings. */
(function () {
  const { html, el } = UI;
  const esc = FR.esc;
  let tab = 'mots';

  function weekTitle() {
    const d = new Date();
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    return 'Semaine du ' + d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  }

  UI.register('listEdit', (root, { listId }) => {
    const l = listId ? Store.list(listId) : null;
    UI.setTitle(l ? 'Modifier la liste' : 'Nouvelle liste de mots');
    const wrap = el(html`<div class="center-col"><div class="panel">
      <div class="field"><label>Nom de la liste</label><input data-f="title" value="${esc(l ? l.title : weekTitle())}"></div>
      <div class="field"><label>Les mots <span class="muted" style="font-weight:400">(un par ligne, ou séparés par des virgules)</span></label>
        <textarea data-f="words" placeholder="maison&#10;jardin&#10;le chat&#10;beaucoup">${esc(l ? l.words.join('\n') : '')}</textarea></div>
      <div class="field"><label>Aperçu</label><div class="chips" data-z="preview"></div></div>
      <div class="row end">
        ${l ? `<button class="pix-btn red" data-a="del">${Pixel.svg('trash')} Supprimer</button><span class="spacer"></span>` : ''}
        <button class="pix-btn green big" data-a="save">${Pixel.svg('check')} Enregistrer</button>
      </div></div></div>`);
    root.appendChild(wrap);
    const ta = wrap.querySelector('[data-f=words]'), prev = wrap.querySelector('[data-z=preview]');
    const refresh = () => {
      const ws = FR.parseWords(ta.value);
      prev.innerHTML = ws.length ? ws.map(w => `<span class="chip" style="animation:none"><span>${FR.colorize(w)}</span></span>`).join('') : '<span class="muted">Aucun mot pour l\'instant</span>';
    };
    ta.addEventListener('input', refresh); refresh();
    wrap.querySelector('[data-a=save]').onclick = () => {
      const words = FR.parseWords(ta.value);
      if (!words.length) { UI.toast('Ajoute au moins un mot'); UI.shake(ta); return; }
      const title = wrap.querySelector('[data-f=title]').value.trim() || weekTitle();
      const saved = Store.saveList(Object.assign(l || {}, { title, words }));
      SFX.play('good');
      UI.toast(words.length + ' mots enregistrés !');
      UI.go('list', { listId: saved.id }, { replace: true });
    };
    const del = wrap.querySelector('[data-a=del]');
    if (del) del.onclick = async () => {
      if (await UI.confirm('Supprimer la liste « ' + l.title + ' » ?', 'Supprimer', 'Annuler')) { Store.deleteList(l.id); UI.back(); }
    };
  });

  UI.register('parent', (root) => {
    UI.setTitle('Espace parent');
    const wrap = el(`<div class="center-col">
      <div class="tabs">
        <button class="pix-btn" data-t="mots">${Pixel.svg('book')} Mots</button>
        <button class="pix-btn" data-t="lecture">${Pixel.svg('clock')} Lecture</button>
        <button class="pix-btn" data-t="progres">${Pixel.svg('trophy')} Progrès</button>
        <button class="pix-btn" data-t="reglages">${Pixel.svg('pencil')} Réglages</button>
      </div><div class="panel" data-z="body"></div></div>`);
    root.appendChild(wrap);
    const body = wrap.querySelector('[data-z=body]');
    const tabs = wrap.querySelectorAll('[data-t]');
    function show(t) {
      tab = t;
      tabs.forEach(b => b.classList.toggle('on', b.dataset.t === t));
      body.innerHTML = '';
      ({ mots, lecture, progres, reglages })[t](body);
    }
    tabs.forEach(b => b.onclick = () => show(b.dataset.t));
    show(tab);
  });

  function mots(body) {
    const lists = Store.lists();
    body.appendChild(el(html`<div class="row"><h2 style="margin:0">Listes de mots</h2><span class="spacer"></span>
      <button class="pix-btn green" data-a="new">${Pixel.svg('plus')} Nouvelle liste</button></div>`));
    body.querySelector('[data-a=new]').onclick = () => UI.go('listEdit', {});
    if (!lists.length) body.appendChild(el('<p class="muted">Ajoutez la liste de mots de la semaine : elle apparaîtra tout de suite dans les jeux.</p>'));
    lists.forEach((l, i) => {
      const r = el(html`<div class="list-row"><div class="grow"><div class="t">${esc(l.title)} ${i === 0 ? '<span class="sheet-type t-texte">en cours</span>' : ''}</div>
        <div class="s">${l.words.length} mots · ${esc(l.words.join(', '))}</div></div>
        <button class="pix-btn small wood">${Pixel.svg('pencil')} Modifier</button></div>`);
      r.querySelector('button').onclick = () => UI.go('listEdit', { listId: l.id });
      body.appendChild(r);
    });
    body.appendChild(el('<p class="muted" style="font-size:clamp(14px,2vmin,18px)">La liste la plus récente est celle proposée sur l\'écran d\'accueil. La révision mélange les mots de toutes les listes.</p>'));
  }

  function lecture(body) {
    const sheets = Store.sheets();
    body.appendChild(el(html`<div class="row"><h2 style="margin:0">Fiches de lecture</h2><span class="spacer"></span>
      <button class="pix-btn gold" data-a="new">${Pixel.svg('camera')} Nouvelle fiche</button></div>`));
    body.querySelector('[data-a=new]').onclick = () => UI.go('sheetEdit', {});
    if (!sheets.length) body.appendChild(el('<p class="muted">Prenez une fiche en photo : le texte est lu automatiquement, vous pouvez le corriger avant d\'enregistrer.</p>'));
    sheets.forEach(s => {
      const best = Store.best(s);
      const r = el(html`<div class="list-row"><div class="grow"><div class="t">${esc(s.title)} <span class="sheet-type t-${s.type}">${Fluence.TYPES[s.type]}</span></div>
        <div class="s">${(s.attempts || []).length} essai(s)${best ? ' · record ' + (best.ms / 1000).toFixed(1) + ' s' : ''}</div></div>
        <button class="pix-btn small wood">${Pixel.svg('pencil')} Modifier</button></div>`);
      r.querySelector('button').onclick = () => UI.go('sheetEdit', { sheetId: s.id });
      body.appendChild(r);
    });
  }

  function progres(body) {
    const st = Store.data.stats;
    const lv = Store.level();
    body.appendChild(el(html`<h2>Progrès</h2>
      <div class="row" style="font-size:clamp(16px,2.6vmin,24px);gap:24px;margin-bottom:12px">
        <span>Niveau <b>${lv.lvl}</b></span><span><b>${st.gems}</b> émeraudes</span><span><b>${Cards.ownedCount()}</b>/100 cartes</span><span><b>${st.totalCorrect}</b> mots réussis du premier coup</span>
      </div>`));
    const words = Object.entries(st.words).map(([w, s]) => ({ w, ...s })).filter(x => x.err > 0).sort((a, b) => (b.err / (b.ok + b.err)) - (a.err / (a.ok + a.err))).slice(0, 12);
    body.appendChild(el(html`<h3>Mots les plus difficiles</h3>`));
    body.appendChild(el(words.length ? `<div class="chips">${words.map(x => `<span class="chip" style="animation:none">${esc(x.w)} <small class="muted">${x.err}✗ ${x.ok}✓</small></span>`).join('')}</div>` : '<p class="muted">Rien à signaler pour l\'instant.</p>'));
    body.appendChild(el('<h3 style="margin-top:20px">Maîtrise des listes</h3>'));
    Store.lists().forEach(l => {
      const pct = Math.round(Store.listMastery(l) * 100);
      body.appendChild(el(html`<div class="list-row"><div class="grow"><div class="t">${esc(l.title)}</div><div class="progress"><div style="width:${pct}%"></div></div></div><b>${pct}%</b></div>`));
    });
    body.appendChild(el('<h3 style="margin-top:20px">Lecture (temps des 6 derniers essais)</h3>'));
    const sheets = Store.sheets().filter(s => (s.attempts || []).length);
    if (!sheets.length) body.appendChild(el('<p class="muted">Pas encore de chrono.</p>'));
    sheets.forEach(s => {
      const att = s.attempts.slice(-6);
      body.appendChild(el(html`<div class="list-row"><div class="grow"><div class="t">${esc(s.title)}</div>
        <div class="s">${att.map(a => (a.ms / 1000).toFixed(1) + ' s').join(' → ')}</div></div></div>`));
    });
  }

  function reglages(body) {
    const s = Store.data.settings;
    body.appendChild(el(html`<h2>Réglages</h2>
      <div class="field"><label>Prénom de l'enfant</label><input data-f="name" value="${esc(s.name)}" placeholder="Prénom"></div>
      <div class="field"><label>Vitesse de la voix</label><div class="seg">
        ${[[0.7, 'Lente'], [0.85, 'Normale'], [1, 'Rapide']].map(([v, l]) => `<button class="pix-btn small ${Math.abs(s.ttsRate - v) < .01 ? 'on' : ''}" data-r="${v}">${l}</button>`).join('')}
        <button class="pix-btn small gold" data-a="test">${Pixel.svg('speaker')} Tester</button></div></div>
      <div class="field"><label>Sons du jeu</label><div class="seg">
        <button class="pix-btn small ${s.sound ? 'on' : ''}" data-s="1">Activés</button><button class="pix-btn small ${!s.sound ? 'on' : ''}" data-s="0">Coupés</button></div></div>
      <div class="field"><label>Remise à zéro</label><div class="seg"><button class="pix-btn small red" data-a="reset">Effacer la progression (émeraudes, niveaux, cartes, chronos)</button></div></div>
      <p class="muted" style="font-size:clamp(13px,1.9vmin,17px)">After School · ${Speech.available() ? 'voix française disponible' : 'voix non disponible : installez « Synthèse vocale Google » et la voix française dans les réglages Android'}</p>`));
    const name = body.querySelector('[data-f=name]');
    name.onchange = () => { s.name = name.value.trim(); Store.save(true); UI.toast('Prénom enregistré'); };
    body.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { s.ttsRate = +b.dataset.r; Store.save(true); body.querySelectorAll('[data-r]').forEach(x => x.classList.toggle('on', x === b)); });
    body.querySelector('[data-a=test]').onclick = () => UI.say('Bonjour ' + (s.name || '') + ' ! On va bien travailler aujourd\'hui.');
    body.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { s.sound = b.dataset.s === '1'; SFX.enabled = s.sound; Store.save(true); body.querySelectorAll('[data-s]').forEach(x => x.classList.toggle('on', x === b)); });
    body.querySelector('[data-a=reset]').onclick = async () => {
      if (await UI.confirm('Effacer toute la progression ? Les listes et les fiches sont gardées.', 'Effacer', 'Annuler')) { Store.resetProgress(); UI.refreshHud(); UI.toast('Progression effacée'); }
    };
  }
})();
