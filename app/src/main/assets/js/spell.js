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

  window.Spell = { letters };
})();
