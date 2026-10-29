/* Reading fluency: sheets from photos (OCR), reading aid, chrono + voice recording. */
(function () {
  const { html, el } = UI;
  const esc = FR.esc;
  const TYPES = { sons: 'Sons', mots: 'Mots', phrases: 'Phrases', texte: 'Texte' };
  const fmt = ms => { const s = ms / 1000; const m = Math.floor(s / 60); const r = s - m * 60; return (m ? m + ':' + (r < 10 ? '0' : '') + r.toFixed(1) : r.toFixed(1) + ' s'); };
  const fmtShort = ms => { const s = Math.round(ms / 1000); return s >= 60 ? Math.floor(s / 60) + 'm' + String(s % 60).padStart(2, '0') : s + 's'; };
  const dateStr = t => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  let player = null;
  function playBlob(blob, btn) {
    if (player) { player.pause(); URL.revokeObjectURL(player.src); if (player._btn) player._btn.classList.remove('on'); player = null; }
    if (!blob) { UI.toast('Enregistrement introuvable'); return; }
    player = new Audio(URL.createObjectURL(blob));
    player._btn = btn;
    if (btn) btn.classList.add('on');
    player.onended = () => { if (btn) btn.classList.remove('on'); };
    player.play().catch(() => UI.toast('Lecture impossible'));
  }
  function stopPlayer() { if (player) { player.pause(); if (player._btn) player._btn.classList.remove('on'); player = null; } }

  /* ---------- list of sheets ---------- */
  UI.register('reading', (root) => {
    UI.setTitle('Lecture');
    const sheets = Store.sheets();
    const wrap = el(html`<div class="center-col">
      <div class="row" style="margin-bottom:var(--gap)"><h2 class="pix-title" style="margin:0">Mes fiches de lecture</h2><span class="spacer"></span>
      <button class="pix-btn gold" data-a="add">${Pixel.svg('camera')} Nouvelle fiche</button></div>
      <div class="list-cards"></div></div>`);
    const cards = wrap.querySelector('.list-cards');
    if (!sheets.length) {
      wrap.appendChild(el(html`<div class="home-hero">${UI.mascot()}<div class="bubble">Aucune fiche pour l'instant. Un parent peut prendre ta fiche en photo !</div></div>`));
    }
    sheets.forEach((s, i) => {
      const best = Store.best(s);
      const c = el(html`<div class="panel list-card" style="animation-delay:${i * 0.05}s;display:flex;gap:14px;align-items:center">
        <div class="thumb" style="width:clamp(64px,11vmin,110px);height:clamp(64px,11vmin,110px);flex:none;border:3px solid var(--ink);background:#eee center/cover;display:flex;align-items:center;justify-content:center">${Pixel.svg('book')}</div>
        <div style="min-width:0;flex:1">
          <div class="title">${esc(s.title)}</div>
          <div style="margin:6px 0"><span class="sheet-type t-${s.type}">${TYPES[s.type]}</span></div>
          <div style="font-size:clamp(14px,2.2vmin,20px);display:flex;align-items:center;gap:6px">${best ? `<span style="width:1.2em;display:inline-block">${Pixel.svg('trophy')}</span> Record : <b>${fmt(best.ms)}</b>` : '<span class="muted">Pas encore lu</span>'}</div>
        </div></div>`);
      c.onclick = () => UI.go('reader', { sheetId: s.id });
      cards.appendChild(c);
      if (s.imageId) Store.Blobs.get(s.imageId).then(img => { if (img) { const t = c.querySelector('.thumb'); t.innerHTML = ''; t.style.backgroundImage = `url(${img})`; } });
    });
    wrap.querySelector('[data-a=add]').onclick = async () => { if (await UI.parentGate()) UI.go('sheetEdit', {}); };
    root.appendChild(wrap);
  });

  /* ---------- sheet editor (photo + OCR + manual edit) ---------- */
  UI.register('sheetEdit', (root, { sheetId }) => {
    const existing = sheetId ? Store.sheet(sheetId) : null;
    const st = existing ? Object.assign({}, existing) : { title: 'Fiche du ' + new Date().toLocaleDateString('fr-FR'), type: 'mots', text: '' };
    let image = null, imageChanged = false;
    UI.setTitle(existing ? 'Modifier la fiche' : 'Nouvelle fiche');
    const wrap = el(html`<div class="center-col"><div class="panel">
      <div class="row center" data-zone="photo" style="margin-bottom:16px">
        <button class="pix-btn gold big" data-a="cam">${Pixel.svg('camera')} Prendre en photo</button>
        <button class="pix-btn wood big" data-a="pick">${Pixel.svg('image')} Choisir une image</button>
      </div>
      <div data-zone="preview" style="display:none;margin-bottom:14px"><img class="photo-view" style="max-height:34vh;object-fit:contain;background:#fff"></div>
      <div class="field"><label>Titre</label><input data-f="title" value="${esc(st.title)}"></div>
      <div class="field"><label>Type de fiche</label><div class="seg">${Object.entries(TYPES).map(([k, v]) => `<button class="pix-btn small ${st.type === k ? 'on' : ''}" data-t="${k}">${v}</button>`).join('')}</div></div>
      <div class="field"><label>Texte de la fiche <span class="muted" style="font-weight:400">(vérifie et corrige si besoin)</span></label><textarea data-f="text" placeholder="Prends la fiche en photo, ou écris le texte ici.&#10;Pour les sons ou les mots : un par ligne ou séparés par des espaces.">${esc(st.text)}</textarea></div>
      <div class="row end">
        ${existing ? `<button class="pix-btn red" data-a="del">${Pixel.svg('trash')} Supprimer</button><span class="spacer"></span>` : ''}
        <button class="pix-btn green big" data-a="save">${Pixel.svg('check')} Enregistrer</button>
      </div></div></div>`);
    root.appendChild(wrap);
    const preview = wrap.querySelector('[data-zone=preview]');
    const ta = wrap.querySelector('[data-f=text]');
    function setType(t) { st.type = t; wrap.querySelectorAll('[data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === t)); }
    wrap.querySelectorAll('[data-t]').forEach(b => b.onclick = () => setType(b.dataset.t));
    if (existing && existing.imageId) Store.Blobs.get(existing.imageId).then(img => { if (img) { image = img; preview.style.display = ''; preview.querySelector('img').src = img; } });

    function onResult(res) {
      UI.closeAllModals();
      if (!res) return;
      if (res.error && !res.image) { UI.toast('Oups, la photo n\'a pas marché'); return; }
      if (res.image) { image = res.image; imageChanged = true; preview.style.display = ''; preview.querySelector('img').src = image; }
      const text = (res.text || '').trim();
      if (text) {
        ta.value = text;
        setType(FR.guessType(text));
        UI.toast('Texte lu ! Vérifie-le avant d\'enregistrer.');
      } else {
        UI.toast(res.ocrError ? 'Lecture automatique indisponible : écris le texte' : 'Je n\'ai pas trouvé de texte, écris-le à la main');
      }
    }
    function onProcessing() {
      UI.modal(html`<div style="text-align:center"><div class="spinner"></div><h2>Je lis la fiche…</h2></div>`, { locked: true });
    }
    wrap.querySelector('[data-a=cam]').onclick = () => Photo.take(onResult, onProcessing);
    wrap.querySelector('[data-a=pick]').onclick = () => Photo.pick(onResult, onProcessing);
    wrap.querySelector('[data-a=save]').onclick = async () => {
      st.title = wrap.querySelector('[data-f=title]').value.trim() || 'Ma fiche';
      st.text = ta.value.trim();
      if (!st.text) { UI.toast('Ajoute le texte de la fiche'); UI.shake(ta); return; }
      if (imageChanged && image) {
        if (st.imageId) await Store.Blobs.del(st.imageId);
        st.imageId = 'img_' + Store.uid();
        await Store.Blobs.put(st.imageId, image);
      }
      const saved = Store.saveSheet(st);
      SFX.play('good');
      UI.toast('Fiche enregistrée !');
      UI.go('reader', { sheetId: saved.id }, { replace: true });
    };
    const del = wrap.querySelector('[data-a=del]');
    if (del) del.onclick = async () => {
      if (await UI.confirm('Supprimer cette fiche et ses enregistrements ?', 'Supprimer', 'Annuler')) { await Store.deleteSheet(existing.id); UI.home(); UI.go('reading'); }
    };
  });

  /* ---------- reader ---------- */
  /* split into whole sentences: OCR line breaks are ignored, dialogue in quotes is its own chunk */
  function sentences(t) {
    const flat = t.replace(/(\p{L})-\s*\n\s*(\p{Ll})/gu, '$1$2').replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim();
    const out = [];
    let cur = '';
    for (let i = 0; i < flat.length; i++) {
      const ch = flat[i], next = flat[i + 1] || '';
      if (/[«“]/.test(ch) && cur.trim()) { out.push(cur.trim()); cur = ''; }
      cur += ch;
      if (/[.!?…]/.test(ch) && !/[.!?…»”"]/.test(next) && !/^\s*[»”]/.test(flat.slice(i + 1, i + 3))) { out.push(cur.trim()); cur = ''; }
      else if (/[»”]/.test(ch)) { out.push(cur.trim()); cur = ''; }
    }
    if (cur.trim()) out.push(cur.trim());
    const merged = [];
    out.forEach(x => { if (!/\p{L}/u.test(x) && merged.length) merged[merged.length - 1] += ' ' + x; else if (x) merged.push(x); });
    return merged;
  }

  function buildUnits(sheet) {
    const t = sheet.text.replace(/\r/g, '');
    if (sheet.type === 'sons' || sheet.type === 'mots') {
      return t.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean).map(s => ({ text: s, grid: true }));
    }
    const paras = t.split(/\n\s*\n/).filter(p => p.trim());
    const units = [];
    paras.forEach((p, pi) => sentences(p).forEach((s, si) => units.push({ text: s, paraStart: si === 0 && pi > 0 })));
    return units;
  }

  function wordsIn(text) {
    const out = [];
    const re = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
    let m;
    while ((m = re.exec(text)) !== null) out.push({ s: m[0], i: m.index, e: m.index + m[0].length });
    return out;
  }

  UI.register('reader', (root, { sheetId }) => {
    const sheet = Store.sheet(sheetId);
    if (!sheet) { UI.home(); return; }
    UI.setTitle(sheet.title);
    root.classList.add('full');
    const settings = Store.data.settings;
    settings.readerScale = settings.readerScale || 1;
    let help = settings.readerHelp != null ? settings.readerHelp : (sheet.type === 'sons' ? 'snd' : 'syl');
    let ruler = false, focus = 0, mode = 'idle', speakingIdx = -1;
    const units = buildUnits(sheet);
    const grid = units.length && units[0].grid;

    const wrap = el(html`<div class="reader-wrap center-col">
      <div class="reader-tools">
        <button class="pix-btn small gold" data-a="listen">${Pixel.svg('speaker')} Écouter</button>
        <button class="pix-btn small gold" data-a="echo">${Pixel.svg('mic')} Lis après moi</button>
        <button class="pix-btn small" data-a="speed" title="Vitesse">${Pixel.svg('turtle')}</button>
        <button class="pix-btn small ${help === 'syl' ? 'on' : ''}" data-a="syl"><span><span style="color:#cfe0ff">sy</span><span style="color:#ffd0d0">lla</span>bes</span></button>
        <button class="pix-btn small ${help === 'snd' ? 'on' : ''}" data-a="snd"><span>s<span style="color:#9ff5a8;text-decoration:underline">on</span>s c<span style="color:#ffd27a;text-decoration:underline">om</span>plexes</span></button>
        <button class="pix-btn small" data-a="ruler">${Pixel.svg('ruler')} Règle</button>
        <button class="pix-btn small" data-a="minus">A−</button>
        <button class="pix-btn small" data-a="plus">A+</button>
        <span class="spacer"></span>
        ${sheet.imageId ? `<button class="pix-btn small wood" data-a="photo">${Pixel.svg('image')} Fiche</button>` : ''}
        <button class="pix-btn small wood" data-a="hist">${Pixel.svg('trophy')} Mes essais</button>
        <button class="pix-btn small wood" data-a="edit">${Pixel.svg('pencil')}</button>
      </div>
      <div class="reader ${grid ? 'grid-mode' : ''}"></div>
      <div class="ruler-nav row center" style="display:none">
        <button class="pix-btn small" data-a="up">▲ Ligne d'avant</button>
        <button class="pix-btn small green" data-a="down">Ligne suivante ▼</button>
      </div>
      <div class="chrono-bar">
        <div class="chrono">0.0 s</div>
        <span class="rec-dot" style="display:none"></span>
        <button class="pix-btn green big" data-a="go">${Pixel.svg('play')} C'est parti !</button>
        <button class="pix-btn small" data-a="cancel" style="display:none">Annuler</button>
      </div></div>`);
    root.appendChild(wrap);
    const reader = wrap.querySelector('.reader');
    const chrono = wrap.querySelector('.chrono');
    const goBtn = wrap.querySelector('[data-a=go]');
    const cancelBtn = wrap.querySelector('[data-a=cancel]');
    const recDot = wrap.querySelector('.rec-dot');
    const rulerNav = wrap.querySelector('.ruler-nav');
    const speedBtn = wrap.querySelector('[data-a=speed]');
    let slow = true;

    function base() {
      const vmin = Math.min(innerWidth, innerHeight) / 100;
      const b = sheet.type === 'sons' ? 9 : sheet.type === 'mots' ? 6.4 : sheet.type === 'phrases' ? 4.6 : 4;
      return Math.max(20, b * vmin * settings.readerScale);
    }
    function render() {
      reader.style.fontSize = base() + 'px';
      reader.classList.toggle('ruler', ruler);
      reader.innerHTML = '';
      units.forEach((u, ui) => {
        if (u.grid) {
          const it = el(`<span class="item w" data-u="${ui}">${FR.helpHTML(u.text, help)}</span>`);
          reader.appendChild(it);
          return;
        }
        const line = el(`<span class="line" data-u="${ui}"></span>`);
        if (u.paraStart) line.style.marginTop = '.6em';
        let pos = 0, out = '';
        wordsIn(u.text).forEach((w, wi) => {
          out += esc(u.text.slice(pos, w.i));
          out += `<span class="w" data-u="${ui}" data-wi="${wi}">${FR.helpHTML(w.s, help)}</span>`;
          pos = w.e;
        });
        out += esc(u.text.slice(pos));
        line.innerHTML = out;
        if (sheet.type === 'texte' && !u.paraStart) line.style.display = 'inline';
        reader.appendChild(line);
        if (sheet.type === 'texte') reader.appendChild(document.createTextNode(' '));
      });
      applyFocus();
    }
    function unitEls(ui) { return reader.querySelectorAll(`[data-u="${ui}"]`); }
    function applyFocus() {
      reader.querySelectorAll('.focus').forEach(n => n.classList.remove('focus'));
      if (!ruler) return;
      const n = reader.querySelector(grid ? `.item[data-u="${focus}"]` : `.line[data-u="${focus}"]`);
      if (n) { n.classList.add('focus'); n.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    }
    function clearHl() { reader.querySelectorAll('.hl').forEach(n => n.classList.remove('hl')); }

    reader.addEventListener('click', e => {
      if (mode === 'reading') { if (ruler) { focus = Math.min(units.length - 1, focus + 1); applyFocus(); } return; }
      const w = e.target.closest('.w');
      if (!w) return;
      const ui = +w.dataset.u;
      if (ruler) { focus = ui; applyFocus(); }
      clearHl(); w.classList.add('hl');
      const txt = w.textContent;
      Speech.speak(txt, { rate: slow ? 0.7 : 0.95, onDone: () => w.classList.remove('hl') });
    });

    /* listen & echo */
    let listenToken = 0;
    function stopListening() { listenToken++; Speech.stop(); clearHl(); speakingIdx = -1; setListenUi(); }
    function setListenUi() {
      wrap.querySelector('[data-a=listen]').innerHTML = mode === 'listen' ? Pixel.svg('stop') + ' Stop' : Pixel.svg('speaker') + ' Écouter';
      wrap.querySelector('[data-a=echo]').innerHTML = mode === 'echo' ? Pixel.svg('stop') + ' Stop' : Pixel.svg('mic') + ' Lis après moi';
    }
    function speakUnit(ui, token) {
      return new Promise(res => {
        const u = units[ui];
        clearHl();
        const els = unitEls(ui);
        if (u.grid) els.forEach(n => n.classList.add('hl'));
        if (ruler) { focus = ui; applyFocus(); }
        (els[0] && els[0].scrollIntoView({ block: 'center', behavior: 'smooth' }));
        const ws = wordsIn(u.text);
        Speech.speak(u.text, {
          rate: slow ? 0.7 : 0.95,
          onRange: (s) => {
            if (token !== listenToken || u.grid) return;
            const wi = ws.findIndex(w => s >= w.i && s < w.e + 1);
            if (wi < 0) return;
            reader.querySelectorAll('.w.hl').forEach(n => n.classList.remove('hl'));
            const n = reader.querySelector(`.w[data-u="${ui}"][data-wi="${wi}"]`);
            if (n) n.classList.add('hl');
          },
          onDone: () => res()
        });
      });
    }
    async function listenAll() {
      if (mode !== 'idle') { mode = 'idle'; stopListening(); return; }
      mode = 'listen'; setListenUi();
      const token = ++listenToken;
      const start = ruler ? focus : 0;
      for (let i = start; i < units.length; i++) {
        if (token !== listenToken) return;
        await speakUnit(i, token);
        await new Promise(r => setTimeout(r, units[i].grid ? 450 : 250));
      }
      if (token === listenToken) { mode = 'idle'; clearHl(); setListenUi(); }
    }
    async function echo() {
      if (mode !== 'idle') { mode = 'idle'; stopListening(); if (echoCleanup) echoCleanup(); return; }
      mode = 'echo'; setListenUi();
      const token = ++listenToken;
      for (let i = ruler ? focus : 0; i < units.length; i++) {
        if (token !== listenToken) return;
        await speakUnit(i, token);
        if (token !== listenToken) return;
        const els = unitEls(i);
        els.forEach(n => n.classList.add('hl'));
        const goOn = await new Promise(res => {
          const b = el(`<div style="position:fixed;left:50%;bottom:calc(9vh + 16px);transform:translateX(-50%);z-index:70" class="row">
            <button class="pix-btn green big">À toi ! J'ai lu ✔</button><button class="pix-btn small">Réécouter</button><button class="pix-btn small red">Stop</button></div>`);
          document.body.appendChild(b);
          const [ok, again, stop] = b.querySelectorAll('button');
          ok.onclick = () => { b.remove(); SFX.play('gem'); res('next'); };
          again.onclick = () => { b.remove(); res('again'); };
          stop.onclick = () => { b.remove(); res('stop'); };
          echoCleanup = () => { b.remove(); res('stop'); };
        });
        if (goOn === 'again') i--;
        if (goOn === 'stop') break;
      }
      echoCleanup = null;
      if (token === listenToken) { mode = 'idle'; clearHl(); setListenUi(); }
    }
    let echoCleanup = null;

    /* chrono + recording */
    let t0 = 0, tick = 0, rec = null, chunks = [], stream = null;
    async function startReading() {
      stopListening(); mode = 'countdown';
      goBtn.disabled = true;
      // ask for the mic before the countdown so the permission dialog doesn't eat the timer
      try {
        if (navigator.mediaDevices && window.MediaRecorder) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        }
      } catch (e) { stream = null; UI.toast('Micro non autorisé : le chrono marche quand même'); }
      if (mode !== 'countdown') { if (stream) stream.getTracks().forEach(t => t.stop()); return; }
      for (const n of ['3', '2', '1']) {
        const cd = el(`<div class="countdown"><span>${n}</span></div>`);
        document.body.appendChild(cd); SFX.play('beep');
        await new Promise(r => setTimeout(r, 850));
        cd.remove();
        if (mode !== 'countdown') { if (stream) stream.getTracks().forEach(t => t.stop()); return; }
      }
      const cd = el(`<div class="countdown"><span style="color:var(--grass-hi)">Lis !</span></div>`);
      document.body.appendChild(cd); setTimeout(() => cd.remove(), 900);
      SFX.play('go');
      chunks = [];
      if (stream) {
        try {
          const mt = MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
          rec = new MediaRecorder(stream, mt ? { mimeType: mt } : undefined);
          rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
          rec.start(500);
          recDot.style.display = '';
        } catch (e) { rec = null; }
      }
      mode = 'reading';
      if (ruler) { focus = 0; applyFocus(); }
      t0 = performance.now();
      chrono.classList.add('running');
      tick = setInterval(() => { chrono.textContent = fmt(performance.now() - t0); }, 100);
      goBtn.disabled = false;
      goBtn.className = 'pix-btn red big';
      goBtn.innerHTML = Pixel.svg('stop') + " J'ai fini !";
      cancelBtn.style.display = '';
    }
    function stopRecording() {
      return new Promise(res => {
        clearInterval(tick); chrono.classList.remove('running'); recDot.style.display = 'none';
        const done = () => { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; const b = chunks.length ? new Blob(chunks, { type: (rec && rec.mimeType) || 'audio/webm' }) : null; rec = null; res(b); };
        if (rec && rec.state !== 'inactive') { rec.onstop = done; rec.stop(); } else done();
      });
    }
    function resetChrono() {
      mode = 'idle';
      goBtn.className = 'pix-btn green big';
      goBtn.innerHTML = Pixel.svg('play') + " C'est parti !";
      cancelBtn.style.display = 'none';
      goBtn.disabled = false;
    }
    async function finishReading() {
      const ms = performance.now() - t0;
      const blob = await stopRecording();
      resetChrono();
      if (ms < 1500) { UI.toast('Trop rapide ! Recommence.'); return; }
      const prevBest = Store.best(sheet);
      const words = FR.countWords(sheet.text);
      const attempt = { id: Store.uid(), date: Date.now(), ms: Math.round(ms), words, recId: null };
      if (blob) { attempt.recId = 'rec_' + attempt.id; await Store.Blobs.put(attempt.recId, blob); }
      await Store.addAttempt(sheet, attempt);
      const isRecord = !prevBest || ms < prevBest.ms;
      const wpm = Math.round(words / (ms / 60000));
      const gems = 5 + (isRecord && prevBest ? 10 : 0);
      const reward = Store.addReward(gems, 20 + (isRecord ? 10 : 0));
      const stars = isRecord ? 3 : ms <= prevBest.ms * 1.1 ? 2 : 1;
      SFX.play(isRecord ? 'record' : 'good');
      const m = UI.modal(html`<div class="levelup">
        <div class="rays"></div>
        <h2>${isRecord ? (prevBest ? 'NOUVEAU RECORD !' : 'Premier chrono !') : 'Bien lu !'}</h2>
        <div class="result-stars">${[0, 1, 2].map(i => Pixel.svg('star', i < stars ? 'on' : '')).join('')}</div>
        <div class="big-num" style="font-size:clamp(50px,12vmin,120px)">${fmt(ms)}</div>
        <p style="font-size:clamp(18px,3vmin,28px);margin:.4em 0">${prevBest ? (isRecord ? `${((prevBest.ms - ms) / 1000).toFixed(1)} s plus vite que ton ancien record !` : `Ton record : ${fmt(prevBest.ms)}`) : 'Essaie de battre ce temps la prochaine fois !'}</p>
        <p style="font-size:clamp(16px,2.6vmin,24px);margin:.4em 0">${words} mot${words > 1 ? 's' : ''} · environ <b>${wpm}</b> mots par minute</p>
        <div class="row center" style="font-size:clamp(20px,3.4vmin,32px);font-weight:700;margin:1vmin 0"><span style="width:1.4em;display:inline-block">${Pixel.svg('gem')}</span> +${gems}</div>
        <div class="row center">
          ${attempt.recId ? `<button class="pix-btn gold big" data-a="play">${Pixel.svg('speaker')} M'écouter</button>` : ''}
          <button class="pix-btn green big" data-a="ok">Super !</button>
        </div></div>`, { locked: true });
      if (stars >= 2) UI.confetti();
      UI.flyGems(m, gems);
      m.querySelectorAll('.result-stars svg.on').forEach((s, i) => s.style.animationDelay = (0.25 + i * 0.3) + 's');
      const pb = m.querySelector('[data-a=play]');
      if (pb) pb.onclick = () => playBlob(blob, pb);
      m.querySelector('[data-a=ok]').onclick = () => { stopPlayer(); UI.closeModal(); if (reward.levelUp) UI.levelUp(reward.levelUp); };
    }
    goBtn.onclick = () => { if (mode === 'reading') finishReading(); else if (mode === 'idle' || mode === 'listen' || mode === 'echo') { if (echoCleanup) { echoCleanup(); echoCleanup = null; } startReading(); } };
    cancelBtn.onclick = async () => { await stopRecording(); chrono.textContent = '0.0 s'; resetChrono(); };

    /* history */
    function showHistory() {
      const att = (sheet.attempts || []).slice(-10);
      if (!att.length) { UI.toast('Pas encore d\'essai : lance le chrono !'); return; }
      const max = Math.max(...att.map(a => a.ms));
      const best = Store.best(sheet);
      const m = UI.modal(html`<h2 style="display:flex;gap:10px;align-items:center"><span style="width:1.2em">${Pixel.svg('trophy')}</span> Mes essais</h2>
        <p style="margin-top:0">Plus la barre est petite, plus tu as lu vite !</p>
        <div class="bars" style="margin-top:24px">${att.map((a, i) => `<div class="bar ${best && a.id === best.id ? 'best' : ''}" style="height:${Math.max(8, a.ms / max * 100)}%;animation-delay:${i * 0.05}s"><span>${fmtShort(a.ms)}</span></div>`).join('')}</div>
        <div style="margin-top:14px">${att.slice().reverse().map(a => `
          <div class="list-row"><div class="grow"><div class="t">${fmt(a.ms)} ${best && a.id === best.id ? '🏆' : ''}</div><div class="s">${dateStr(a.date)} · ${Math.round(a.words / (a.ms / 60000))} mots/min</div></div>
          ${a.recId ? `<button class="pix-btn small gold" data-rec="${a.recId}">${Pixel.svg('speaker')} Écouter</button>` : ''}</div>`).join('')}</div>
        <div class="row end"><button class="pix-btn green" data-a="close">Fermer</button></div>`, { cls: 'wide', onClose: stopPlayer });
      m.querySelectorAll('[data-rec]').forEach(b => b.onclick = async () => playBlob(await Store.Blobs.get(b.dataset.rec), b));
      m.querySelector('[data-a=close]').onclick = () => UI.closeModal();
    }

    wrap.querySelector('[data-a=listen]').onclick = () => { if (mode === 'reading' || mode === 'countdown') return; if (mode === 'echo') { echoCleanup && echoCleanup(); } listenAll(); };
    wrap.querySelector('[data-a=echo]').onclick = () => { if (mode === 'reading' || mode === 'countdown') return; if (mode === 'listen') { mode = 'idle'; stopListening(); } echo(); };
    speedBtn.onclick = () => { slow = !slow; speedBtn.innerHTML = Pixel.svg(slow ? 'turtle' : 'rabbit'); UI.toast(slow ? 'Lecture lente' : 'Lecture normale', 1200); };
    const setHelp = (m) => { help = help === m ? '' : m; settings.readerHelp = help; Store.save(); wrap.querySelector('[data-a=syl]').classList.toggle('on', help === 'syl'); wrap.querySelector('[data-a=snd]').classList.toggle('on', help === 'snd'); render(); };
    wrap.querySelector('[data-a=syl]').onclick = () => setHelp('syl');
    wrap.querySelector('[data-a=snd]').onclick = () => setHelp('snd');
    wrap.querySelector('[data-a=ruler]').onclick = (e) => { ruler = !ruler; e.currentTarget.classList.toggle('on', ruler); rulerNav.style.display = ruler ? '' : 'none'; render(); };
    wrap.querySelector('[data-a=up]').onclick = () => { focus = Math.max(0, focus - 1); applyFocus(); };
    wrap.querySelector('[data-a=down]').onclick = () => { focus = Math.min(units.length - 1, focus + 1); applyFocus(); };
    wrap.querySelector('[data-a=minus]').onclick = () => { settings.readerScale = Math.max(.6, settings.readerScale - .12); Store.save(); render(); };
    wrap.querySelector('[data-a=plus]').onclick = () => { settings.readerScale = Math.min(2.2, settings.readerScale + .12); Store.save(); render(); };
    wrap.querySelector('[data-a=hist]').onclick = showHistory;
    wrap.querySelector('[data-a=edit]').onclick = async () => { if (await UI.parentGate()) UI.go('sheetEdit', { sheetId: sheet.id }); };
    const ph = wrap.querySelector('[data-a=photo]');
    if (ph) ph.onclick = async () => {
      const img = await Store.Blobs.get(sheet.imageId);
      if (img) UI.modal(html`<img class="photo-view" src="${img}"><div class="row end" style="margin-top:12px"><button class="pix-btn green" onclick="UI.closeModal()">Fermer</button></div>`, { cls: 'wide' });
    };

    render();
    const onResize = () => render();
    addEventListener('resize', onResize);
    UI.onPause = () => { if (mode === 'listen' || mode === 'echo') stopListening(); };
    return () => {
      removeEventListener('resize', onResize);
      listenToken++; Speech.stop(); stopPlayer();
      if (echoCleanup) echoCleanup();
      clearInterval(tick);
      if (rec && rec.state !== 'inactive') try { rec.stop(); } catch (e) {}
      if (stream) stream.getTracks().forEach(t => t.stop());
      mode = 'gone';
      root.classList.remove('full');
      UI.onPause = null;
    };
  });

  window.Fluence = { TYPES };
})();
