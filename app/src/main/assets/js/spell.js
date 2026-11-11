/* Épeler un mot à voix haute : « cé, ache, a, té » -> c h a t.
   La reconnaissance vocale écrit ce qu'elle entend (« c'est hache a thé », « c h a t », « deux l »…) :
   on le transforme en lettres, avec les accents dits après la lettre (« e accent aigu » -> é). */
(function () {
  const strip = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  /* nom de la lettre tel qu'il peut être transcrit -> lettre */
  const NAMES = {
    a: ['a', 'ah', 'ha', 'as', 'à'],
    b: ['b', 'be', 'bee', 'bes', 'bai', 'bay'],
    c: ['c', 'ce', 'ces', 'ses', 'sait', 'cest', 'sest', 'seh', 'sai', 'se'],
    d: ['d', 'de', 'des', 'dai', 'des'],
    e: ['e', 'eu', 'euh', 'oeufs', 'heu', 'heure'],
    f: ['f', 'ef', 'eff', 'effe', 'ephe', 'f'],
    g: ['g', 'ge', 'jai', 'geai', 'gee', 'jet'],
    h: ['h', 'ache', 'hache', 'ash', 'ach', 'hash'],
    i: ['i', 'y', 'hi', 'il', 'ile', 'ils', 'yi'],
    j: ['j', 'ji', 'gi', 'jy', 'gy', 'gie', 'jie'],
    k: ['k', 'ka', 'ca', 'cas', 'qa', 'kah'],
    l: ['l', 'el', 'elle', 'elles', 'aile', 'ailes', 'ell', 'ele'],
    m: ['m', 'em', 'emme', 'aime', 'aiment', 'eme', 'aim'],
    n: ['n', 'en', 'enne', 'haine', 'aine', 'ene', 'ene'],
    o: ['o', 'oh', 'eau', 'eaux', 'au', 'aux', 'ho', 'os'],
    p: ['p', 'pe', 'pes', 'paix', 'pet', 'pai'],
    q: ['q', 'ku', 'cu', 'qu', 'cul', 'que'],
    r: ['r', 'er', 'erre', 'air', 'aire', 'ere', 'hair', 'erres'],
    s: ['s', 'es', 'esse', 'ess', 'ece'],
    t: ['t', 'te', 'the', 'tes', 'tait', 'tai'],
    u: ['u', 'hu', 'hue', 'eut', 'us'],
    v: ['v', 've', 'vee', 'vais', 'vai'],
    w: ['w'],
    x: ['x', 'ix', 'ixe', 'iks', 'ics', 'icse'],
    y: ['igrec', 'ygrec', 'yigrec'],
    z: ['z', 'zed', 'zede', 'zaid']
  };
  const MAP = {};
  for (const [l, ns] of Object.entries(NAMES)) ns.forEach(n => { if (!(n in MAP)) MAP[n] = l; });
  // « e » se dit aussi « é » quand il porte un accent : géré par les mots « accent … »
  const ACC = {
    aigu: { e: 'é' },
    grave: { e: 'è', a: 'à', u: 'ù' },
    circonflexe: { e: 'ê', a: 'â', i: 'î', o: 'ô', u: 'û' },
    trema: { e: 'ë', i: 'ï', u: 'ü' },
    cedille: { c: 'ç' }
  };
  const ACC_ALIAS = { aigus: 'aigu', aigue: 'aigu', egu: 'aigu', graves: 'grave', circonflex: 'circonflexe', circonflexes: 'circonflexe', tremas: 'trema', cedilles: 'cedille', sedille: 'cedille' };
  const NUM = { deux: 2, double: 2, trois: 3 };
  const SKIP = new Set(['accent', 'accents', 'avec', 'un', 'une', 'le', 'la', 'et', 'puis', 'apres', 'ensuite', 'lettre', 'majuscule', 'minuscule', 'alors', 'euh', 'hum', 'voila', 'cest', 'tout']);

  /* transcription -> tableau de lettres (avec accents) */
  function letters(text, target) {
    let t = String(text || '').toLowerCase().replace(/œ/g, 'oe').replace(/’/g, "'");
    // séparateurs dits à voix haute
    t = t.replace(/trait d'union|tiret/g, ' # ').replace(/apostrophe/g, ' # ');
    t = t.replace(/\be dans l'o\b|\be dans le o\b|\bo e collés?\b/g, ' œ ');
    t = t.replace(/\bi grecs?(?=[\s,.]|$)/g, ' igrec ').replace(/\bdoubles? v[ée]?s?(?=[\s,.]|$)/g, ' w ').replace(/\bou(?=[\s,.]|$)/g, ' o u ');
    t = t.replace(/\bc'est\b/g, ' cest ').replace(/\bs'est\b/g, ' cest ').replace(/\bj'ai\b/g, ' jai ').replace(/\bqu'a\b/g, ' ka ').replace(/\bqu'/g, ' ku ').replace(/\bl'/g, ' l ').replace(/\bd'/g, ' d ').replace(/\bm'/g, ' m ').replace(/\bn'/g, ' n ');
    const raw = t.match(/[a-zàâäéèêëîïôöùûüçœ#]+|\d+/g) || [];
    const out = [];
    let mult = 1;
    for (let i = 0; i < raw.length; i++) {
      const w = raw[i], s = strip(w);
      if (w === '#') continue;
      if (NUM[s]) { mult = NUM[s]; continue; }
      if (s === '2' || s === '3') { mult = +s; continue; }
      if (w === 'œ') { out.push('œ'); continue; }
      const accKey = ACC[s] ? s : ACC_ALIAS[s];
      if (accKey) {
        // l'accent va sur la dernière lettre qui peut le porter (« f o r e t accent circonflexe » -> ê)
        for (let k = out.length - 1; k >= Math.max(0, out.length - 2); k--) {
          const base = strip(out[k]);
          if (ACC[accKey][base] && out[k] === base) { out[k] = ACC[accKey][base]; break; }
        }
        continue;
      }
      if (s === 'e' && (w === 'é' || w === 'è' || w === 'ê')) { for (let k = 0; k < mult; k++) out.push(w); mult = 1; continue; }
      let l = MAP[s];
      // une suite de lettres collées (« cha t ») : on la garde telle quelle si elle colle au mot attendu
      if (!l && s.length > 1 && !SKIP.has(s) && target && strip(target.toLowerCase()).replace(/[^a-z]/g, '').includes(s)) {
        [...w].forEach(ch => out.push(ch)); mult = 1; continue;
      }
      if (!l) continue;
      for (let k = 0; k < mult; k++) out.push(l);
      mult = 1;
    }
    return out;
  }

  /* ---------- doute : lettres qui se ressemblent à l'oreille ---------- */
  // noms « propres » d'une lettre : quand la reconnaissance écrit exactement ça, on lui fait confiance
  const CLEAR = { a: ['a'], b: ['b', 'be'], c: ['c', 'ce'], d: ['d', 'de'], e: ['e', 'eu'], f: ['f', 'effe'], g: ['g', 'ge'], h: ['h', 'ache'],
    i: ['i'], j: ['j', 'ji'], k: ['k', 'ka'], l: ['l', 'elle'], m: ['m', 'emme'], n: ['n', 'enne'], o: ['o'], p: ['p', 'pe'], q: ['q', 'ku'],
    r: ['r', 'erre'], s: ['s', 'esse'], t: ['t', 'te'], u: ['u'], v: ['v', 've'], w: ['w'], x: ['x', 'ixe'], y: ['igrec'], z: ['z', 'zede'] };
  // familles de sons proches (lettres en « é », en « è », a/ka/ache…)
  const GROUPS = [['b', 'c', 'd', 'g', 'p', 't', 'v', 'w'], ['f', 'l', 'm', 'n', 'r', 's', 'x'], ['a', 'k', 'h'], ['e', 'u', 'o'], ['i', 'y', 'j'], ['q', 'u', 'k'], ['s', 'c', 'x', 'z'], ['g', 'j']];
  const ACCENTED = { e: ['é', 'è', 'ê', 'ë'], a: ['à', 'â'], u: ['ù', 'û'], i: ['î', 'ï'], o: ['ô'], c: ['ç'] };
  function lev(a, b) {
    const m = a.length, n = b.length; let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
    return prev[n];
  }
  /* lettres les plus proches d'un son jamais vu (« bé » mal transcrit en « bey », « ka » en « cat »…) */
  function nearest(tok, n) {
    const sc = {};
    for (const [w, l] of Object.entries(MAP)) { if (w.length > 6) continue; const d = lev(tok, w) / Math.max(tok.length, w.length); if (sc[l] == null || d < sc[l]) sc[l] = d; }
    return Object.entries(sc).sort((x, y) => x[1] - y[1]).slice(0, n).map(x => x[0]);
  }
  /* un énoncé (souvent une seule lettre) -> [{ letter, choices }]
     choices vide = sûr ; sinon les lettres à proposer autour du bouton, celle entendue en premier */
  function guess(text, target) {
    const tl = strip(String(target || '').toLowerCase());
    const tAcc = String(target || '').toLowerCase();
    const res = [];
    let t = String(text || '').toLowerCase().trim();
    if (!t) return res;
    const ls = letters(t, null);
    const toks = (strip(t).replace(/['’]/g, '').match(/[a-z]+/g) || []).filter(w => !SKIP.has(w) && !NUM[w] && !ACC[w] && !ACC_ALIAS[w]);
    if (!ls.length) {
      // rien de reconnu : les lettres dont le nom ressemble le plus à ce qui a été entendu
      const tok = toks.join('') || strip(t).replace(/[^a-z]/g, '');
      if (tok) res.push({ letter: null, choices: nearest(tok, 6) });
      return res;
    }
    ls.forEach((l, k) => {
      const base = strip(l);
      const tok = toks[k] || '';
      // lettres qui se confondent très souvent à l'oreille : toujours une proposition, même si le nom est bien transcrit
      const ALWAYS = 'abcdgkhmnptvue';
      const clear = !ALWAYS.includes(base) && ((CLEAR[base] || []).includes(tok) || ls.length > 1 && tok.length === 1);
      let ch = [];
      if (!clear) {
        const g = new Set([base]);
        GROUPS.forEach(gr => { if (gr.includes(base)) gr.forEach(x => g.add(x)); });
        ch = [...g];
        // on garde les plus proches à l'oreille si la famille est grande
        if (ch.length > 6) { const near = nearest(tok || base, 10).filter(x => g.has(x)); ch = [base, ...near.filter(x => x !== base)].slice(0, 6); }
      }
      // voyelle accentuée possible dans le mot : on propose aussi les accents (sans dire où ils sont)
      if (ACCENTED[base] && l === base && ACCENTED[base].some(x => tAcc.includes(x))) {
        const acc = ACCENTED[base].filter(x => tAcc.includes(x));
        ch = [...new Set([...(ch.length ? ch : [base]), ...acc])];
      }
      if (ch.length && ch[0] !== l) ch = [l, ...ch.filter(x => x !== l)];
      res.push({ letter: l, choices: ch.length > 1 ? ch.slice(0, 8) : [] });
    });
    return res;
  }

  window.Spell = { letters, guess };
})();
