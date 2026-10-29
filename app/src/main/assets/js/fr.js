/* French helpers: syllables, plausible misspellings, parsing. */
(function () {
  const VOW = 'aeiouyàâäéèêëîïôöùûüœæ';
  const isV = ch => VOW.includes(ch.toLowerCase());
  const isL = ch => /\p{L}/u.test(ch);
  const INSEP = ['bl', 'cl', 'fl', 'gl', 'pl', 'br', 'cr', 'dr', 'fr', 'gr', 'pr', 'tr', 'vr', 'ch', 'ph', 'th', 'gn'];

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s).trim().replace(/[’`´]/g, "'").replace(/\s+/g, ' ').toLowerCase().normalize('NFC');

  /* --- syllables of one word (letters only) --- */
  function sylWord(w) {
    if (w.length <= 2) return [w];
    // groups: alternating consonant/vowel runs
    const groups = [];
    for (let i = 0; i < w.length; i++) {
      let v = isV(w[i]);
      // "qu" / "gu" + vowel: the u belongs to the consonant
      if ((w[i] === 'u' || w[i] === 'U') && i > 0 && /[qg]/i.test(w[i - 1]) && i + 1 < w.length && isV(w[i + 1])) v = false;
      const last = groups[groups.length - 1];
      if (last && last.v === v) last.s += w[i]; else groups.push({ v, s: w[i] });
    }
    const vowelCount = groups.filter(g => g.v).length;
    if (vowelCount <= 1) return [w];
    const syl = [];
    let cur = '';
    groups.forEach((g, gi) => {
      if (g.v) { cur += g.s; return; }
      const isFirst = gi === 0, isLast = gi === groups.length - 1;
      if (isFirst) { cur += g.s; return; }
      if (isLast) { cur += g.s; return; }
      const c = g.s;
      let keep, next;
      if (c.length === 1) { keep = ''; next = c; }
      else if (c.length === 2) {
        if (INSEP.includes(c.toLowerCase()) || /^[qg]u$/i.test(c)) { keep = ''; next = c; } else { keep = c[0]; next = c[1]; }
      } else {
        const last2 = c.slice(-2).toLowerCase();
        if (INSEP.includes(last2) || /^[qg]u$/.test(last2)) { keep = c.slice(0, -2); next = c.slice(-2); }
        else { keep = c.slice(0, -1); next = c.slice(-1); }
      }
      cur += keep; syl.push(cur); cur = next;
    });
    if (cur) syl.push(cur);
    // final mute "e" alone after consonant stays its own syllable (school convention), fine.
    return syl.filter(Boolean);
  }

  function syllables(text) {
    const out = [];
    let buf = '';
    for (const ch of String(text)) {
      if (isL(ch)) buf += ch;
      else { if (buf) { sylWord(buf).forEach(s => out.push({ s, w: true })); buf = ''; } out.push({ s: ch, w: false }); }
    }
    if (buf) sylWord(buf).forEach(s => out.push({ s, w: true }));
    return out;
  }

  function colorize(text, startAlt = 0) {
    let k = startAlt;
    return syllables(text).map(p => p.w ? `<span class="${(k++ % 2) ? 'syl-b' : 'syl-a'}">${esc(p.s)}</span>` : (/\s/.test(p.s) ? (k = 0, esc(p.s)) : esc(p.s))).join('');
  }

  /* --- misspelling rules --- */
  const R = (re, alts, w = 1) => ({ re, alts, w });
  const RULES = [
    R(/eau/g, ['o', 'au', 'ot'], 2),
    R(/(?<!e)au/g, ['o', 'eau'], 2),
    R(/(?<![aeo])o(?![uinm])/g, ['au', 'eau'], 1),
    R(/é$/g, ['er', 'ez', 'ée', 'és'], 3),
    R(/é(?!$)/g, ['e', 'è', 'ai'], 3),
    R(/è/g, ['ai', 'é', 'e', 'ê'], 3),
    R(/ê/g, ['è', 'ai', 'e'], 3),
    R(/ai(?![nm])/g, ['é', 'è', 'ê', 'ei'], 2),
    R(/ei(?![nm])/g, ['ai', 'è'], 2),
    R(/er$/g, ['é', 'ez'], 3),
    R(/ez$/g, ['é', 'er'], 3),
    R(/et$/g, ['è', 'ai', 'é'], 2),
    R(/an(?![aeiouyn])/g, ['en'], 3),
    R(/en(?![aeiouyn])/g, ['an'], 3),
    R(/am(?=[bp])/g, ['an', 'em'], 2),
    R(/em(?=[bp])/g, ['en', 'am'], 2),
    R(/om(?=[bp])/g, ['on'], 2),
    R(/[ae]n(?=[bp])/g, ['am', 'em'], 1),
    R(/ain/g, ['in', 'ein', 'un'], 3),
    R(/ein/g, ['ain', 'in'], 3),
    R(/(?<![aeo])in(?![aeiouyn])/g, ['ain', 'ein', 'un'], 2),
    R(/ss/g, ['s', 'c'], 3),
    R(/(?<=[aeiouyéèê])s(?=[aeiouyéèê])/g, ['ss', 'z'], 2),
    R(/c(?=[eiéèêy])/g, ['s', 'ss'], 2),
    R(/ç/g, ['c', 's', 'ss'], 3),
    R(/ph/g, ['f'], 3),
    R(/^h/g, [''], 2),
    R(/^(?=[aeiouéè])/g, ['h'], 1),
    R(/qu/g, ['k', 'c'], 2),
    R(/c(?=[aou])/g, ['k', 'qu'], 1),
    R(/k/g, ['c', 'qu'], 2),
    R(/g(?=[eiéèêy])/g, ['j'], 2),
    R(/ge(?=[aou])/g, ['g', 'j'], 2),
    R(/j/g, ['g'], 1),
    R(/gu(?=[eiéèê])/g, ['g'], 2),
    R(/([bcdfglmnprt])\1/g, m => [m[0]], 3),
    R(/(?<=[aeiouéèê])([lmnprtf])(?=[aeiouéèê])/g, m => [m + m], 2),
    R(/[tdsxp]$/g, [''], 3),
    R(/(?<=[éiuo])$/g, ['e', 's', 't'], 2),
    R(/eu/g, ['oeu', 'e'], 2),
    R(/œu|oeu/g, ['eu'], 3),
    R(/ou/g, ['u', 'oo'], 1),
    R(/oi/g, ['oa', 'oua'], 1),
    R(/ill/g, ['y', 'il', 'll'], 2),
    R(/y/g, ['i', 'ill'], 2),
    R(/gn/g, ['ni', 'ng'], 2),
    R(/x$/g, ['s'], 2),
    R(/(?<=[aeiou])s$/g, ['x', 't'], 1),
    R(/[àâ]/g, ['a'], 2),
    R(/[îï]/g, ['i'], 2),
    R(/ô/g, ['o', 'au'], 2),
    R(/[ûù]/g, ['u'], 2),
    R(/(?<=[^aeiouy])e$/g, [''], 1),
    R(/ent$/g, ['ant', 'en'], 2),
    R(/tion$/g, ['sion', 'cion'], 3),
    R(/(?<=[aeiouy])m(?=[aeiouy])/g, ['mm'], 1)
  ];

  function matches(word, rule) {
    const out = [];
    const re = new RegExp(rule.re.source, 'g');
    let m;
    while ((m = re.exec(word)) !== null) {
      out.push({ i: m.index, len: m[0].length, s: m[0] });
      if (m[0].length === 0) re.lastIndex++;
      if (out.length > 10) break;
    }
    return out;
  }

  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function keepCase(orig, w) { return orig[0] && orig[0] !== orig[0].toLowerCase() ? w[0].toUpperCase() + w.slice(1) : w; }

  function misspellings(word, n = 3) {
    const lw = norm(word);
    const cands = new Map();
    RULES.forEach(rule => {
      matches(lw, rule).forEach(m => {
        const alts = typeof rule.alts === 'function' ? rule.alts(m.s) : rule.alts;
        alts.forEach(a => {
          const v = lw.slice(0, m.i) + a + lw.slice(m.i + m.len);
          if (v !== lw && v.replace(/[\s'-]/g, '').length >= 2 && !cands.has(v)) cands.set(v, rule.w + Math.random() * 1.5);
        });
      });
    });
    // fallbacks
    const letters = [...lw];
    for (let t = 0; t < 30 && cands.size < n + 2; t++) {
      const i = Math.floor(Math.random() * letters.length);
      if (!isL(letters[i])) continue;
      let v;
      const kind = t % 3;
      if (kind === 2 && i > 0 && i < letters.length - 1 && isV(letters[i]) && isV(letters[i + 1]) && letters[i] !== letters[i + 1]) { const a = letters.slice(); [a[i], a[i + 1]] = [a[i + 1], a[i]]; v = a.join(''); }
      else if (kind === 1 && letters.length > 3 && i > 0) { v = letters.slice(0, i).join('') + letters.slice(i + 1).join(''); }
      else if (!isV(letters[i]) && i > 0) { v = letters.slice(0, i + 1).join('') + letters[i] + letters.slice(i + 1).join(''); }
      if (v && v !== lw && !cands.has(v)) cands.set(v, 0.2 + Math.random() * .3);
    }
    const sorted = [...cands.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
    return sorted.slice(0, n).map(v => keepCase(word, v));
  }

  /* --- chunks for "missing letters" --- */
  function holes(word) {
    const lw = norm(word);
    const list = [];
    RULES.forEach(rule => {
      matches(lw, rule).forEach(m => {
        if (m.len === 0) return;
        let alts = typeof rule.alts === 'function' ? rule.alts(m.s) : rule.alts;
        if (/\[tdsxp\]\$/.test(rule.re.source)) alts = ['t', 'd', 's', 'x', 'p'];
        alts = alts.filter(a => a && a !== m.s);
        if (!alts.length) return;
        list.push({ i: m.i, len: m.len, s: word.slice(m.i, m.i + m.len), alts: [...new Set(alts)], w: rule.w });
      });
    });
    if (!list.length) {
      [...lw].forEach((ch, i) => {
        if (isV(ch)) list.push({ i, len: 1, s: word[i], alts: ['a', 'e', 'i', 'o', 'u', 'é'].filter(x => x !== ch), w: .5 });
      });
    }
    return list;
  }

  function pickHoles(word, count) {
    const all = shuffle(holes(word)).sort((a, b) => b.w - a.w + (Math.random() - .5) * 2);
    const chosen = [];
    for (const h of all) {
      if (chosen.length >= count) break;
      if (chosen.some(c => !(h.i + h.len <= c.i || c.i + c.len <= h.i))) continue;
      chosen.push(h);
    }
    return chosen.sort((a, b) => a.i - b.i);
  }

  /* --- parsing --- */
  function parseWords(text) {
    const seen = new Set();
    return String(text).split(/[\n,;]+/).map(s => s.replace(/^\s*(\d+[.)]|[-•*])\s*/, '').trim().replace(/[’`]/g, "'").replace(/\s+/g, ' '))
      .filter(s => s && /\p{L}/u.test(s)).filter(s => { const k = s.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  }

  function guessType(text) {
    const lines = String(text).split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return 'mots';
    const tokens = lines.join(' ').split(/\s+/).filter(Boolean);
    const avgTok = tokens.length / lines.length;
    const avgLen = tokens.reduce((a, t) => a + t.length, 0) / tokens.length;
    const punct = (String(text).match(/[.!?]/g) || []).length;
    if (avgLen <= 3.2 && punct < 2) return 'sons';
    if (punct === 0 || avgTok <= 2) return avgLen <= 3.2 ? 'sons' : 'mots';
    if (lines.length >= 2 && punct >= lines.length * .6 && avgTok < 14) return 'phrases';
    return 'texte';
  }

  function countWords(text) { return (String(text).match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || []).length; }

  window.FR = { esc, norm, syllables, sylWord, colorize, misspellings, holes, pickHoles, parseWords, guessType, countWords, shuffle, isL, isV };
})();
