/* Correction du texte lu sur une photo.
   1. Nettoyage immédiat, sur l'appareil : apostrophes, mots coupés en fin de ligne, barres « | » prises pour des « l »,
      lignes parasites (numéros de page, traits, puces).
   2. Puis l'IA (service After School sur Cloudflare) corrige les accents, apostrophes manquantes et lettres mal lues
      selon le sens de la phrase, sans reformuler. Sans connexion, on garde le nettoyage de l'étape 1. */
(function () {
  function clean(t) {
    let s = String(t || '').replace(/\r/g, '');
    s = s.replace(/[’‘`´]/g, "'").replace(/[“”]/g, '"').replace(/ /g, ' ');
    // mot coupé en fin de ligne : « mar-\nche » -> « marche »
    s = s.replace(/(\p{L})[-‐‑]\s*\n\s*(\p{Ll})/gu, '$1$2');
    // « | » ou « 1 » collés à des lettres : c'est un « l »
    s = s.replace(/(^|[\s'(«"])\|(?=\p{L})/gu, '$1l').replace(/(\p{L})\|(?=\p{L}|\s|$)/gu, '$1l').replace(/(\p{Ll})1(?=\p{Ll})/gu, '$1l');
    // lignes sans lettres (numéro de page, traits, puces seules)
    s = s.split('\n').filter(l => !l.trim() || /\p{L}/u.test(l)).join('\n');
    // puces en début de ligne
    s = s.replace(/^[ \t]*[•·▪◦*■□>]+[ \t]*/gmu, '');
    // espaces
    s = s.replace(/[ \t]+/g, ' ').replace(/ ([,.])/g, '$1').replace(/' +(?=\p{L})/gu, "'").replace(/ +\n/g, '\n').replace(/\n{3,}/g, '\n\n');
    return s.trim();
  }
  const tidy = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  /* garde-fou : l'IA ne doit pas réécrire le texte (trop de lettres changées = on garde l'original) */
  function plausible(a, b) {
    if (!b) return false;
    const x = tidy(a), y = tidy(b);
    if (!x.length) return true;
    const r = y.length / x.length;
    if (r < .8 || r > 1.2) return false;
    // les mots de l'original (sans accents) doivent presque tous se retrouver, dans l'ordre du texte corrigé
    const wa = a.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z]+/).filter(w => w.length > 3);
    let keep = 0; wa.forEach(w => { if (y.includes(w)) keep++; });
    return !wa.length || keep / wa.length >= .75;
  }
  async function ai(text, kind) {
    const url = window.AS_IA_URL;
    if (!url || !navigator.onLine) return null;
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 25000);
    try {
      const r = await fetch(url.replace(/\/$/, '') + '/fix', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, kind }), signal: ctl.signal });
      if (!r.ok) return null;
      const j = await r.json();
      return j && j.text ? String(j.text).trim() : null;
    } catch (e) { return null; } finally { clearTimeout(to); }
  }
  /* -> { text, ai: true|false } */
  async function fix(text, kind) {
    const c = clean(text);
    if (!c) return { text: c, ai: false };
    const out = await ai(c, kind);
    if (out && plausible(c, out)) return { text: out, ai: out !== c };
    return { text: c, ai: false };
  }
  window.OcrFix = { clean, fix, plausible, get available() { return !!window.AS_IA_URL; } };
})();
