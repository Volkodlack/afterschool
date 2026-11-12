/* Ear: l'IA qui écoute (reconnaissance vocale hors ligne, sherpa-onnx) et compare avec le texte attendu.
   Utilisé par la poésie pour vérifier une récitation au lieu de faire confiance au bouton « je l'ai dit ». */
(function () {
  const N = window.AfterSchoolNative || null;
  const AS = window.AS_native;
  const sessions = {};
  let seq = 0;

  AS.asrState = (id, st) => { const s = sessions[id]; s && s.onState && s.onState(st); };
  AS.onAsr = (id, text, final) => {
    const s = sessions[id]; if (!s) return;
    s.text = text || '';
    s.onText && s.onText(s.text);
    if (final) { delete sessions[id]; s.onEnd && s.onEnd(s.text); s.resolve && s.resolve({ text: s.text, blob: s.blob }); }
  };
  AS.onAsrAudio = (id, b64) => {
    const s = sessions[id]; if (!s) return;
    try {
      const bin = atob(b64), u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      s.blob = new Blob([u], { type: 'audio/wav' });
    } catch (e) { s.blob = null; }
  };
  AS.asrError = (id, msg) => {
    const s = sessions[id]; if (!s) return;
    delete sessions[id];
    s.onError && s.onError(msg);
    s.resolve && s.resolve({ text: s.text || '', blob: s.blob || null, error: msg });
  };

  /* ---------- comparaison tolérante (fautes de reconnaissance, voix d'enfant) ---------- */
  const strip = s => String(s).toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const toks = s => strip(s).match(/[a-z0-9]+/g) || [];
  function phon(w0) {
    let w = w0.replace(/^h/, '').replace(/ph/g, 'f').replace(/qu/g, 'k').replace(/c([eiy])/g, 's$1').replace(/[cq]/g, 'k')
      .replace(/g([eiy])/g, 'j$1').replace(/gu/g, 'g').replace(/eau|au/g, 'o').replace(/ai|ei/g, 'e').replace(/y/g, 'i')
      .replace(/(ent|es|s|t|x|d|z|p)$/, '').replace(/(er|ez|et)$/, 'e').replace(/e$/, '').replace(/(.)\1+/g, '$1')
      .replace(/(an|en|am|em)/g, 'A').replace(/(on|om)/g, 'O').replace(/(in|im|ain|ein|un)/g, 'I').replace(/s([aeiouAOI])/g, 'z$1');
    return w || w0;
  }
  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }
  function near(a, b) {
    if (a === b) return true;
    if (phon(a) === phon(b)) return true;
    const L = Math.max(a.length, b.length);
    if (L >= 5 && lev(a, b) <= 1) return true;
    if (L >= 8 && lev(a, b) <= 2) return true;
    return false;
  }
  /* lines: [string]  heard: string  ->  { lines:[{words:[{w, ok}], score}], score, said } */
  function match(lines, heard) {
    const H = toks(heard);
    // expected tokens, each linked to its display word
    const words = lines.map(t => (String(t).match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || []).map(w => ({ w, ok: false })));
    const E = [];
    words.forEach((ws, li) => ws.forEach((wd, wi) => toks(wd.w).forEach(tk => E.push({ tk, li, wi }))));
    const n = E.length, m = H.length;
    // LCS alignment with fuzzy equality
    const dp = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
      dp[i][j] = near(E[i].tk, H[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const hit = new Array(n).fill(false);
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (near(E[i].tk, H[j]) && dp[i][j] === dp[i + 1][j + 1] + 1) { hit[i] = true; i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
    }
    // a word is said when its main (longest) token was heard
    const best = {};
    E.forEach((e, k) => { const key = e.li + ':' + e.wi; if (!best[key] || e.tk.length > E[best[key]].tk.length) best[key] = k; });
    Object.entries(best).forEach(([key, k]) => { const [li, wi] = key.split(':').map(Number); words[li][wi].ok = hit[k]; });
    let tot = 0, ok = 0;
    const out = words.map(ws => {
      const s = ws.length ? ws.filter(x => x.ok).length / ws.length : 1;
      tot += ws.length; ok += ws.filter(x => x.ok).length;
      return { words: ws, score: s };
    });
    // how far the child got: last line with something heard
    let reached = -1; out.forEach((l, k) => { if (l.words.some(x => x.ok)) reached = k; });
    return { lines: out, score: tot ? ok / tot : 0, reached };
  }

  /* ---------- lecture ligne par ligne ----------
     L'IA ne s'occupe que de la ligne en cours : elle cherche ses mots, dans l'ordre, dans ce qui a été dit depuis
     la fin de la ligne précédente. La ligne suivante n'existe pour elle qu'une fois tous les mots de la ligne lus.
     Un mot répété ailleurs dans le texte ne peut donc plus « voler » la place d'un autre. */
  const wordsOf = t => (String(t).match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || []);
  function matchLine(text, H, from) {
    const ws = wordsOf(text).map(w => ({ w, ok: false }));
    const E = [];
    ws.forEach((wd, wi) => toks(wd.w).forEach(tk => E.push({ tk, wi })));
    // on ne cherche pas trop loin : un mot sauté ne doit pas être retrouvé trois lignes plus bas
    const to = Math.min(H.length, from + E.length * 2 + 8);
    const Hs = H.slice(from, to);
    const n = E.length, m = Hs.length;
    const dp = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
      dp[i][j] = near(E[i].tk, Hs[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const at = new Array(n).fill(-1);
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (near(E[i].tk, Hs[j]) && dp[i][j] === dp[i + 1][j + 1] + 1) { at[i] = from + j; i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
    }
    const best = {};
    E.forEach((e, k) => { if (best[e.wi] == null || e.tk.length > E[best[e.wi]].tk.length) best[e.wi] = k; });
    let end = from;
    Object.entries(best).forEach(([wi, k]) => { if (at[k] >= 0) { ws[wi].ok = true; end = Math.max(end, at[k] + 1); } });
    return { words: ws, done: ws.length > 0 && ws.every(x => x.ok), end };
  }
  /* suivi d'une lecture : update(texteEntendu) à chaque résultat, skip() pour passer une ligne bloquée */
  function tracker(lines) {
    const frozen = [];          // lignes terminées (ou passées) : résultat figé
    let cur = 0, from = 0, H = [], live = null;
    function update(heard) {
      H = toks(heard);
      if (from > H.length) from = H.length;
      while (cur < lines.length) {
        live = matchLine(lines[cur], H, from);
        if (!live.done) break;
        frozen[cur] = live.words; from = live.end; cur++; live = null;
      }
      return state();
    }
    function skip() {
      if (cur >= lines.length) return state();
      frozen[cur] = (live || matchLine(lines[cur], H, from)).words;
      from = H.length; cur++; live = null;
      return state();
    }
    function state(final) {
      const out = lines.map((t, li) => {
        const ws = frozen[li] || (li === cur && live ? live.words : wordsOf(t).map(w => ({ w, ok: false })));
        return { words: ws, score: ws.length ? ws.filter(x => x.ok).length / ws.length : 1 };
      });
      const tot = out.reduce((a, l) => a + l.words.length, 0), ok = out.reduce((a, l) => a + l.words.filter(x => x.ok).length, 0);
      return { lines: out, score: tot ? ok / tot : 0, cur, done: cur >= lines.length, reached: Math.min(cur, lines.length - 1) };
    }
    return { update, skip, state, get cur() { return cur; } };
  }

  /* version web (iPad / iPhone / navigateur) : reconnaissance vocale du navigateur (Safari, Chrome) */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  function webListen({ onText, onState, onError } = {}) {
    let active = true, finals = '', interim = '', rec = null, ended = false, resolve;
    const done = new Promise(r => resolve = r);
    const text = () => (finals + ' ' + interim).replace(/\s+/g, ' ').trim();
    const finish = () => { if (ended) return; ended = true; resolve({ text: text(), blob: null }); };
    const begin = () => {
      rec = new SR(); rec.lang = 'fr-FR'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
      rec.onstart = () => onState && onState('listening');
      rec.onresult = e => {
        interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finals += ' ' + r[0].transcript; else interim += ' ' + r[0].transcript;
        }
        onText && onText(text());
      };
      rec.onerror = e => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') { active = false; onError && onError('mic'); finish(); }
        else if (e.error === 'network') { active = false; onError && onError('network'); finish(); }
      };
      rec.onend = () => {
        if (interim) { finals += ' ' + interim; interim = ''; }
        if (active) { try { begin(); } catch (e) { finish(); } } else finish();
      };
      try { rec.start(); } catch (e) { active = false; onError && onError('start'); finish(); }
    };
    begin();
    return {
      stop() { active = false; try { rec && rec.stop(); } catch (e) {} setTimeout(finish, 1500); return done; },
      cancel() { active = false; ended = true; try { rec && rec.abort(); } catch (e) {} }
    };
  }

  function listen(opts = {}) {
    if (!N && SR) return webListen(opts);
    const { onText, onState, onError, onEnd } = opts;
    const id = 'asr' + (++seq);
    const s = sessions[id] = { onText, onState, onError, onEnd, text: '' };
    const done = new Promise(res => s.resolve = res);
    try { N.asrStart(id); } catch (e) { AS.asrError(id, 'start'); }
    return {
      stop() { try { N.asrStop(); } catch (e) {} return done; },
      cancel() { delete sessions[id]; try { N.asrCancel(); } catch (e) {} }
    };
  }

  window.Ear = {
    available() {
      if (N) { try { return !!(N.asrAvailable && N.asrAvailable()); } catch (e) { return false; } }
      return !!SR;
    },
    listen, match, toks, tracker, matchLine,
    /* hideFn(li, wi, w, nw) -> null (mot visible) ou texte du trou. Sans hideFn : tout est caché. */
    revealHTML(res, { showAll = false, hideFn = null } = {}) {
      const E = FR.esc;
      return res.lines.map((l, li) => `<div class="pl ear-line">${l.words.map((x, wi) => {
        const g = hideFn ? hideFn(li, wi, x.w, l.words.length) : '_'.repeat(Math.min(10, x.w.length));
        const cls = x.ok ? 'ok' : showAll ? 'miss' : g == null ? 'vis' : 'hid';
        const txt = x.ok || showAll || g == null ? x.w : g;
        return `<span class="ew ${cls}" data-w="${E(x.w)}"${g == null ? '' : ` data-g="${E(g)}"`}>${E(txt)}</span>`;
      }).join(' ')}</div>`).join('');
    },
    /* met à jour les mots déjà affichés sans tout redessiner (l'animation ne joue que sur les nouveaux mots) */
    update(box, res) {
      const lines = box.querySelectorAll('.ear-line');
      res.lines.forEach((l, li) => {
        const spans = lines[li] ? lines[li].querySelectorAll('.ew') : [];
        l.words.forEach((x, wi) => {
          const sp = spans[wi]; if (!sp) return;
          const ok = sp.classList.contains('ok');
          if (x.ok && !ok) { sp.className = 'ew ok'; sp.textContent = sp.dataset.w; }
          else if (!x.ok && ok) {
            if (sp.dataset.p || sp.dataset.g == null) { sp.className = 'ew vis'; sp.textContent = sp.dataset.w; }
            else { sp.className = 'ew hid'; sp.textContent = sp.dataset.g; }
          }
        });
      });
    }
  };
})();
