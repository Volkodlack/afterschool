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
    if (final) { delete sessions[id]; s.resolve && s.resolve({ text: s.text, blob: s.blob }); }
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

  function listen({ onText, onState, onError } = {}) {
    const id = 'asr' + (++seq);
    const s = sessions[id] = { onText, onState, onError, text: '' };
    const done = new Promise(res => s.resolve = res);
    try { N.asrStart(id); } catch (e) { AS.asrError(id, 'start'); }
    return {
      stop() { try { N.asrStop(); } catch (e) {} return done; },
      cancel() { delete sessions[id]; try { N.asrCancel(); } catch (e) {} }
    };
  }

  window.Ear = {
    available() { try { return !!(N && N.asrAvailable && N.asrAvailable()); } catch (e) { return false; } },
    listen, match, toks,
    /* met à jour les mots déjà affichés sans tout redessiner (l'animation ne joue que sur les nouveaux mots) */
    update(box, res) {
      const lines = box.querySelectorAll('.ear-line');
      res.lines.forEach((l, li) => {
        const spans = lines[li] ? lines[li].querySelectorAll('.ew') : [];
        l.words.forEach((x, wi) => {
          const sp = spans[wi]; if (!sp) return;
          const ok = sp.classList.contains('ok');
          if (x.ok && !ok) { sp.className = 'ew ok'; sp.textContent = x.w; }
          else if (!x.ok && ok) { sp.className = 'ew hid'; sp.textContent = '_'.repeat(Math.min(10, x.w.length)); }
        });
      });
    },
    /* HTML of lines where words appear as they are recited */
    revealHTML(res, { showAll = false, cls = '' } = {}) {
      return res.lines.map(l => `<div class="pl ear-line ${cls}">${l.words.map(x => x.ok ? `<span class="ew ok">${FR.esc(x.w)}</span>`
        : showAll ? `<span class="ew miss">${FR.esc(x.w)}</span>` : `<span class="ew hid">${'_'.repeat(Math.min(10, x.w.length))}</span>`).join(' ')}</div>`).join('');
    }
  };
})();
