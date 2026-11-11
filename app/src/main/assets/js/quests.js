/* Quêtes : chaque liste de mots de la semaine est un chapitre de l'aventure de l'année scolaire (36 semaines).
   Quand toute la liste franchit une étape, l'enfant gagne une carte « full art » (4 par semaine) :
     1 Découverte (le parcours est lancé ou tous les mots ont été essayés), 2 Apprentissage, 3 Confirmation, 4 Maîtrise.
   Le héros du chapitre grandit d'une carte à l'autre ; le décor suit la saison et l'heure (aube, jour, soir, nuit dorée). */
(function () {
  const { html, el } = UI;
  const esc = FR.esc;
  const PONY = Theme.id === 'poney';

  /* ---------------- les 36 chapitres de chaque monde ---------------- */
  const C = (place, hero, el, kind) => ({ place, hero, el, kind });
  const CHAPTERS = {
    pixel: [
      C('Prairie du Départ', 'Pousseton', 'plante', 'plain'), C('Ruisseau Clair', 'Glouglou', 'eau', 'river'),
      C('Forêt des Chênes', 'Mousseline', 'plante', 'forest'), C('Colline aux Vents', 'Zéphy', 'air', 'hills'),
      C('Verger d\'Automne', 'Pomelot', 'plante', 'forest'), C('Grottes de Cristal', 'Cristalou', 'roche', 'cave'),
      C('Marais Brumeux', 'Brumy', 'ombre', 'lake'), C('Forge du Village', 'Tisonnet', 'feu', 'village'),
      C('Mine Profonde', 'Piochon', 'roche', 'cave'), C('Tour des Orages', 'Zapik', 'foudre', 'tower'),
      C('Lac Gelé', 'Givrin', 'glace', 'lake'), C('Volcan Grondant', 'Magmo', 'feu', 'volcano'),
      C('Village Enneigé', 'Flocounet', 'glace', 'village'), C('Forêt des Lumières', 'Lucio', 'foudre', 'forest'),
      C('Nuit Étoilée', 'Nocturne', 'ombre', 'hills'), C('Pics Glacés', 'Banquiz', 'glace', 'mountain'),
      C('Désert Doré', 'Sablo', 'roche', 'desert'), C('Oasis Cachée', 'Mirabo', 'eau', 'desert'),
      C('Temple Perdu', 'Totemi', 'roche', 'temple'), C('Jungle Épaisse', 'Lianou', 'plante', 'forest'),
      C('Cascade Géante', 'Cascado', 'eau', 'waterfall'), C('Îles Volantes', 'Nuageon', 'air', 'islands'),
      C('Château des Brumes', 'Spectrel', 'ombre', 'castle'), C('Champ de Fleurs', 'Pétalix', 'plante', 'flowers'),
      C('Ruche Dorée', 'Bzzou', 'foudre', 'flowers'), C('Rivière aux Saumons', 'Saumy', 'eau', 'river'),
      C('Canyon Rouge', 'Ocra', 'roche', 'desert'), C('Plage aux Coquillages', 'Coquillo', 'eau', 'sea'),
      C('Phare du Bout du Monde', 'Lumino', 'foudre', 'lighthouse'), C('Récif de Corail', 'Corallie', 'eau', 'sea'),
      C('Ruines Antiques', 'Pierrot', 'roche', 'temple'), C('Montagne Sacrée', 'Aigleron', 'air', 'mountain'),
      C('Cité des Nuages', 'Cumulus', 'air', 'islands'), C('Labyrinthe Végétal', 'Feuillu', 'plante', 'forest'),
      C('Fête des Lanternes', 'Lanterno', 'feu', 'village'), C('Palais de l\'Été', 'Solaris', 'feu', 'castle')
    ],
    poney: [
      C('Pré de la Rentrée', 'Pâquerette', 'prairie', 'plain'), C('Écurie des Lilas', 'Biscotte', 'concours', 'village'),
      C('Sentier des Mûres', 'Myrtille', 'foret', 'forest'), C('Manège du Village', 'Praline', 'carrousel', 'village'),
      C('Verger aux Pommes', 'Reinette', 'prairie', 'forest'), C('Bois des Écureuils', 'Noisette', 'foret', 'forest'),
      C('Lac aux Cygnes', 'Perle', 'plage', 'lake'), C('Fête des Citrouilles', 'Citrouille', 'nuit', 'village'),
      C('Colline Brumeuse', 'Brume', 'nuit', 'hills'), C('Concours d\'Automne', 'Cannelle', 'concours', 'castle'),
      C('Forêt Dorée', 'Ambre', 'foret', 'forest'), C('Première Neige', 'Flocon', 'neige', 'mountain'),
      C('Chalet des Sapins', 'Sapinette', 'neige', 'village'), C('Marché de Noël', 'Guimauve', 'carrousel', 'village'),
      C('Nuit des Étoiles', 'Comète', 'nuit', 'hills'), C('Lac Gelé', 'Givre', 'neige', 'lake'),
      C('Montagne Blanche', 'Avalanche', 'neige', 'mountain'), C('Château de Glace', 'Cristal', 'neige', 'castle'),
      C('Carnaval des Rubans', 'Confetti', 'carrousel', 'village'), C('Arc-en-ciel d\'Hiver', 'Iris', 'arcenciel', 'hills'),
      C('Grand Concours', 'Tornade', 'concours', 'castle'), C('Pré des Jonquilles', 'Jonquille', 'prairie', 'flowers'),
      C('Ruisseau Chantant', 'Clochette', 'foret', 'river'), C('Ferme aux Agneaux', 'Barbapapa', 'prairie', 'village'),
      C('Jardin des Papillons', 'Papillon', 'arcenciel', 'flowers'), C('Cerisiers en Fleurs', 'Cerise', 'prairie', 'flowers'),
      C('Plage de Printemps', 'Coquillage', 'plage', 'sea'), C('Phare Rose', 'Corail', 'plage', 'lighthouse'),
      C('Île aux Mouettes', 'Écume', 'plage', 'islands'), C('Prairie Arc-en-ciel', 'Prisme', 'arcenciel', 'hills'),
      C('Cascade Fleurie', 'Rosée', 'foret', 'waterfall'), C('Château des Licornes', 'Opale', 'arcenciel', 'castle'),
      C('Grand Prix d\'Été', 'Éclair', 'concours', 'plain'), C('Nuit d\'Été', 'Luciole', 'nuit', 'lake'),
      C('Fête Foraine', 'Berlingot', 'carrousel', 'village'), C('Vacances à la Mer', 'Soleil', 'plage', 'sea')
    ]
  };
  const CH = CHAPTERS[Theme.id];
  const STEPS = [
    { key: 'dec', name: 'Découverte', icon: '🌱', rar: 'pc', time: 'dawn', tag: 'Full Art' },
    { key: 'app', name: 'Apprentissage', icon: '📘', rar: 'r', time: 'day', tag: 'Full Art' },
    { key: 'conf', name: 'Confirmation', icon: '🎯', rar: 'ur', time: 'dusk', tag: 'Full Art Holo' },
    { key: 'maitre', name: 'Maîtrise', icon: '⭐', rar: 'or', time: 'night', tag: 'Full Art Or ♛' }
  ];
  const TITLE = [h => h, h => 'Super ' + h, h => 'Méga ' + h, h => h + ' d\'Or'];
  const TXT = [
    (c) => `La quête commence à ${c.place} ! ${c.hero} te suit partout.`,
    (c) => `Tous les mots sont en apprentissage. ${c.hero} grandit à vue d'œil !`,
    (c) => `Tous les mots sont confirmés. ${c.hero} est prêt pour l'aventure.`,
    (c) => `Tous les mots sont maîtrisés ! ${c.hero} brille au-dessus de ${c.place}.`
  ];
  // mois de l'année scolaire de chaque semaine (0 = septembre … 9 = juin)
  const monthOf = w => Math.min(9, Math.floor((w - 1) / 3.75));
  const SEASON = ['late', 'autumn', 'autumn', 'winter', 'winter', 'winter', 'spring', 'spring', 'summer', 'summer'];

  /* toutes les cartes de quête de ce monde : Q001 … Q144 */
  const QCARDS = [];
  CH.forEach((c, i) => STEPS.forEach((s, k) => {
    const n = i * 4 + k + 1;
    QCARDS.push({ n, num: 'Q' + String(n).padStart(3, '0'), ch: i + 1, step: k, chap: c,
      name: TITLE[k](c.hero), txt: TXT[k](c), heroCard: { id: 'q-' + Theme.id + '-' + n, name: c.hero, el: c.el, rar: s.rar, set: 1 } });
  }));

  /* ---------------- décors procéduraux (SVG 63×88, plein cadre) ---------------- */
  function rng(seed) {
    let s = 2166136261;
    for (let i = 0; i < seed.length; i++) { s ^= seed.charCodeAt(i); s = Math.imul(s, 16777619); }
    return () => { s = Math.imul(s ^ (s >>> 15), 2246822507); s = Math.imul(s ^ (s >>> 13), 3266489909); s ^= s >>> 16; return (s >>> 0) / 4294967296; };
  }
  const SKY = {
    dawn: { late: ['#ffc8d8', '#ffe8c0'], autumn: ['#f7b6a0', '#ffe2b8'], winter: ['#c9c2f0', '#fde0ea'], spring: ['#ffd0e6', '#fff1c8'], summer: ['#ffc4a8', '#fff0c0'] },
    day: { late: ['#5fb4ee', '#bfe6ff'], autumn: ['#7fb8e6', '#f6e3c0'], winter: ['#9fc8ef', '#eef7ff'], spring: ['#7ccfff', '#dff6ff'], summer: ['#3fa8f0', '#bdeaff'] },
    dusk: { late: ['#5b3f8f', '#ff9a6a'], autumn: ['#6a3c7a', '#ff8a4a'], winter: ['#3f4a8f', '#f7a0b8'], spring: ['#6a4aa0', '#ffa8a0'], summer: ['#4a3a90', '#ffb060'] },
    night: { late: ['#0f1640', '#2c3a80'], autumn: ['#1a1238', '#3a2a6a'], winter: ['#0c1a3a', '#2a4a80'], spring: ['#151a48', '#3a3a88'], summer: ['#101848', '#30408a'] }
  };
  const GROUND = { late: ['#6fbf4a', '#4f9a34'], autumn: ['#c98a3a', '#9a6a2a'], winter: ['#f4f8ff', '#cfdcf0'], spring: ['#8fd86a', '#5fae4a'], summer: ['#7acb48', '#4f9a34'] };
  const PGROUND = { late: ['#a8e3b4', '#86cf96'], autumn: ['#f2c48a', '#e0a070'], winter: ['#ffffff', '#e2ecfa'], spring: ['#b8ebc0', '#93d8a0'], summer: ['#9ee0a8', '#7ccf8c'] };

  const sceneCache = {};
  function scene(q) {
    const key = Theme.id + q.n;
    if (sceneCache[key]) return sceneCache[key];
    const r = rng('scene-' + key);
    const season = SEASON[monthOf(q.ch)], time = STEPS[q.step].time, kind = q.chap.kind;
    const [s1, s2] = SKY[time][season];
    const [g1, g2] = (PONY ? PGROUND : GROUND)[season];
    const night = time === 'night', dusk = time === 'dusk';
    const px = !PONY; // le monde des blocs est dessiné en blocs
    const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = c => Math.max(0, Math.min(255, Math.round(c * k))); return `rgb(${f(n >> 16 & 255)},${f(n >> 8 & 255)},${f(n & 255)})`; };
    const dim = night ? .45 : dusk ? .7 : 1;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 63 88" preserveAspectRatio="xMidYMid slice"${px ? ' shape-rendering="crispEdges"' : ''}>
      <defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s1}"/><stop offset="1" stop-color="${s2}"/></linearGradient>
      <radialGradient id="gl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6c0" stop-opacity=".9"/><stop offset="1" stop-color="#ffd84a" stop-opacity="0"/></radialGradient></defs>
      <rect width="63" height="88" fill="url(#sk)"/>`;
    // étoiles / soleil / lune
    if (night || dusk) for (let i = 0; i < (night ? 26 : 8); i++) { const x = r() * 63, y = r() * 44, z = .4 + r() * .8; s += px ? `<rect x="${x | 0}" y="${y | 0}" width="1" height="1" fill="#fff" opacity="${.5 + r() * .5}"/>` : `<circle cx="${x}" cy="${y}" r="${z * .5}" fill="#fff" opacity="${.5 + r() * .5}"/>`; }
    if (night) s += px ? `<rect x="46" y="8" width="8" height="8" fill="#fff4c8"/><rect x="49" y="8" width="5" height="5" fill="${s1}"/>` : `<circle cx="50" cy="12" r="5" fill="#fff4c8"/><circle cx="52.5" cy="10.5" r="4.4" fill="${s1}"/>`;
    else { const sy = time === 'dawn' ? 30 : dusk ? 34 : 12, col = dusk ? '#ffb060' : time === 'dawn' ? '#ffe08a' : '#fff27a';
      s += `<circle cx="48" cy="${sy}" r="9" fill="url(#gl)"/>` + (px ? `<rect x="44" y="${sy - 4}" width="8" height="8" fill="${col}"/>` : `<circle cx="48" cy="${sy}" r="4.6" fill="${col}"/>`); }
    // nuages
    if (!night) for (let i = 0; i < 3; i++) { const x = r() * 50, y = 6 + r() * 22, w = 8 + r() * 8;
      s += px ? `<rect x="${x | 0}" y="${y | 0}" width="${w | 0}" height="3" fill="#fff" opacity=".85"/><rect x="${(x + 2) | 0}" y="${(y - 2) | 0}" width="${(w * .5) | 0}" height="2" fill="#fff" opacity=".85"/>`
        : `<ellipse cx="${x + w / 2}" cy="${y}" rx="${w / 2}" ry="2.2" fill="#fff" opacity=".85"/><circle cx="${x + w * .4}" cy="${y - 1.4}" r="2.4" fill="#fff" opacity=".85"/>`; }
    // arrière-plan selon le lieu
    const far = shade(PONY ? '#c9b4e8' : '#7a8fb0', dim), mid = shade(g2, dim * .92), gnd = shade(g1, dim);
    const mountain = (x, w, h, col, snow) => {
      if (px) { let o = ''; for (let k = 0; k < h; k += 3) { const ww = w * (1 - k / h); o += `<rect x="${(x + (w - ww) / 2) | 0}" y="${(60 - k - 3) | 0}" width="${Math.max(2, ww | 0)}" height="3" fill="${snow && k > h * .62 ? '#fff' : col}"/>`; } return o; }
      return `<path d="M${x} 60 L${x + w / 2} ${60 - h} L${x + w} 60Z" fill="${col}"/>` + (snow ? `<path d="M${x + w / 2 - w * .14} ${60 - h * .72} L${x + w / 2} ${60 - h} L${x + w / 2 + w * .14} ${60 - h * .72} Z" fill="#fff"/>` : '');
    };
    const tree = (x, y, sc, col) => px
      ? `<rect x="${x | 0}" y="${(y - 3 * sc) | 0}" width="${Math.max(1, sc | 0)}" height="${(3 * sc) | 0}" fill="${shade('#6b4a2a', dim)}"/><rect x="${(x - 2.5 * sc) | 0}" y="${(y - 9 * sc) | 0}" width="${(6 * sc) | 0}" height="${(6 * sc) | 0}" fill="${col}"/>`
      : `<rect x="${x - .4 * sc}" y="${y - 3 * sc}" width="${.8 * sc}" height="${3 * sc}" fill="${shade('#9a6a4a', dim)}"/><circle cx="${x}" cy="${y - 5.5 * sc}" r="${3.4 * sc}" fill="${col}"/>`;
    const treeCol = shade(season === 'autumn' ? (r() < .5 ? '#e0802a' : '#c84a2a') : season === 'winter' ? '#3f7f5a' : season === 'spring' ? '#6fcf5a' : '#3f9a3a', dim);
    switch (kind) {
      case 'mountain': s += mountain(-6, 40, 34, far, true) + mountain(22, 46, 42, shade(PONY ? '#b49ad8' : '#62779a', dim), true); break;
      case 'volcano': s += mountain(6, 52, 36, shade('#5a4040', dim), false) + (px ? `<rect x="29" y="22" width="5" height="6" fill="#ff7a2a"/><rect x="30" y="16" width="3" height="6" fill="#ffb02a" opacity=".8"/>` : `<path d="M28 24 Q31.5 14 35 24Z" fill="#ff7a2a"/>`); break;
      case 'hills': case 'plain': case 'flowers': s += px ? `<rect x="0" y="50" width="26" height="10" fill="${mid}"/><rect x="20" y="46" width="30" height="14" fill="${shade(g2, dim * .85)}"/><rect x="44" y="52" width="19" height="8" fill="${mid}"/>`
        : `<ellipse cx="12" cy="60" rx="22" ry="11" fill="${mid}"/><ellipse cx="44" cy="60" rx="26" ry="15" fill="${shade(g2, dim * .85)}"/>`; break;
      case 'forest': for (let i = 0; i < 7; i++) s += tree(2 + i * 9 + r() * 4, 62, .9 + r() * .6, treeCol); break;
      case 'desert': s += px ? `<rect x="0" y="52" width="30" height="8" fill="${shade('#e8c070', dim)}"/><rect x="26" y="48" width="37" height="12" fill="${shade('#d8a850', dim)}"/>` : `<ellipse cx="14" cy="60" rx="24" ry="9" fill="${shade('#f0cf8a', dim)}"/><ellipse cx="46" cy="60" rx="26" ry="13" fill="${shade('#e0b870', dim)}"/>`; break;
      case 'sea': case 'islands': case 'lighthouse': {
        s += `<rect x="0" y="48" width="63" height="14" fill="${shade(PONY ? '#8fd0f0' : '#3d7be5', dim)}"/>`;
        for (let i = 0; i < 5; i++) s += px ? `<rect x="${(r() * 58) | 0}" y="${(50 + r() * 9) | 0}" width="4" height="1" fill="#fff" opacity=".7"/>` : `<path d="M${r() * 58} ${50 + r() * 9} q1.5 -1 3 0" stroke="#fff" stroke-width=".6" fill="none" opacity=".8"/>`;
        if (kind === 'islands') s += px ? `<rect x="6" y="24" width="14" height="5" fill="${mid}"/><rect x="9" y="29" width="8" height="3" fill="${shade('#86603f', dim)}"/><rect x="40" y="18" width="16" height="5" fill="${mid}"/><rect x="43" y="23" width="10" height="3" fill="${shade('#86603f', dim)}"/>`
          : `<ellipse cx="13" cy="27" rx="8" ry="2.6" fill="${mid}"/><path d="M6 27 Q13 34 20 27Z" fill="${shade('#c9a080', dim)}"/><ellipse cx="48" cy="21" rx="9" ry="2.8" fill="${mid}"/><path d="M40 21 Q48 29 56 21Z" fill="${shade('#c9a080', dim)}"/>`;
        if (kind === 'lighthouse') s += px ? `<rect x="44" y="26" width="7" height="26" fill="#fff"/><rect x="44" y="32" width="7" height="4" fill="#e5533d"/><rect x="44" y="42" width="7" height="4" fill="#e5533d"/><rect x="43" y="22" width="9" height="4" fill="${shade('#2b1d12', dim)}"/><rect x="45" y="18" width="5" height="4" fill="#ffe14d"/>`
          : `<path d="M44 52 L45.5 26 L49.5 26 L51 52Z" fill="#fff"/><path d="M44.6 40 L50.4 40 L50.8 45 L44.2 45Z" fill="#ff8fb1"/><rect x="44.5" y="22" width="6" height="4" rx="1" fill="#ff8fb1"/><circle cx="47.5" cy="21" r="2" fill="#ffe066"/>`;
        if (night || dusk) s += `<path d="M47.5 21 L0 10 L0 26Z" fill="#fff6b0" opacity="${kind === 'lighthouse' ? .25 : 0}"/>`;
        break; }
      case 'lake': case 'river': s += px ? `<rect x="0" y="50" width="63" height="10" fill="${mid}"/>` : `<ellipse cx="31" cy="60" rx="40" ry="10" fill="${mid}"/>`; break;
      case 'waterfall': s += mountain(-4, 30, 30, shade('#8a7a6a', dim), false) + mountain(30, 38, 34, shade('#7a6a5a', dim), false) + (px ? `<rect x="26" y="26" width="9" height="34" fill="${shade('#9fe3f5', dim)}"/><rect x="28" y="26" width="2" height="34" fill="#fff" opacity=".6"/>` : `<path d="M26 26 Q31 24 36 26 L36 60 L26 60Z" fill="${shade('#a8e4f8', dim)}"/><path d="M29 26 L29 60" stroke="#fff" stroke-width="1.2" opacity=".6"/>`); break;
      case 'cave': s += `<rect width="63" height="88" fill="${shade('#3a2a3a', dim)}" opacity=".0"/>` + (px ? `<rect x="0" y="0" width="63" height="8" fill="${shade('#4a3a3a', 1)}"/><rect x="0" y="0" width="8" height="66" fill="${shade('#4a3a3a', 1)}"/><rect x="55" y="0" width="8" height="66" fill="${shade('#4a3a3a', 1)}"/>`
          : `<path d="M0 0 H63 V66 H56 Q56 14 31.5 12 Q7 14 7 66 H0Z" fill="${shade('#6a5070', 1)}"/>`);
        for (let i = 0; i < 6; i++) { const x = 10 + r() * 43, y = 20 + r() * 34, c = ['#7ef0ff', '#c49bf0', '#ff8fb1'][i % 3]; s += px ? `<rect x="${x | 0}" y="${y | 0}" width="2" height="4" fill="${c}"/>` : `<path d="M${x} ${y + 4} L${x + 1} ${y} L${x + 2} ${y + 4}Z" fill="${c}"/>`; }
        break;
      case 'village': for (let i = 0; i < 4; i++) { const x = 3 + i * 15 + r() * 3, w = 9 + r() * 3, h = 8 + r() * 5, wall = shade(PONY ? ['#fff0f5', '#fff6e0', '#eef6ff'][i % 3] : ['#d8b88a', '#c9a070', '#e0c8a0'][i % 3], dim), roof = shade(PONY ? ['#ff8fb1', '#c49bf0', '#8fc4f5'][i % 3] : ['#a3321f', '#7c522a', '#5a5a6a'][i % 3], dim);
          s += px ? `<rect x="${x | 0}" y="${(60 - h) | 0}" width="${w | 0}" height="${h | 0}" fill="${wall}"/><rect x="${(x - 1) | 0}" y="${(60 - h - 4) | 0}" width="${(w + 2) | 0}" height="4" fill="${roof}"/><rect x="${(x + w / 2 - 1) | 0}" y="${(60 - h + 3) | 0}" width="3" height="3" fill="${night || dusk ? '#ffe066' : '#7ec8f5'}"/>`
            : `<rect x="${x}" y="${60 - h}" width="${w}" height="${h}" rx="1" fill="${wall}"/><path d="M${x - 1.5} ${60 - h} L${x + w / 2} ${60 - h - 6} L${x + w + 1.5} ${60 - h}Z" fill="${roof}"/><rect x="${x + w / 2 - 1.4}" y="${60 - h + 2.5}" width="2.8" height="2.8" rx=".6" fill="${night || dusk ? '#ffe066' : '#bfe6ff'}"/>`; } break;
      case 'tower': case 'castle': case 'temple': {
        const wall = shade(PONY ? '#f6eaff' : kind === 'temple' ? '#b8a070' : '#9a9aa8', dim), roof = shade(PONY ? '#c49bf0' : kind === 'temple' ? '#8a7040' : '#5a4a7a', dim);
        if (kind === 'tower') s += px ? `<rect x="24" y="14" width="14" height="46" fill="${wall}"/><rect x="22" y="10" width="18" height="5" fill="${roof}"/><rect x="29" y="24" width="4" height="5" fill="#ffe066"/>` : `<rect x="24" y="16" width="14" height="44" rx="1.5" fill="${wall}"/><path d="M22 17 L31 4 L40 17Z" fill="${roof}"/><rect x="29" y="26" width="4" height="6" rx="2" fill="#ffe066"/>`;
        else if (kind === 'temple') s += px ? `<rect x="10" y="44" width="43" height="16" fill="${wall}"/><rect x="16" y="34" width="31" height="10" fill="${wall}"/><rect x="22" y="26" width="19" height="8" fill="${roof}"/><rect x="29" y="50" width="6" height="10" fill="${shade('#2b1d12', dim)}"/>` : `<path d="M8 60 L14 40 L49 40 L55 60Z" fill="${wall}"/><path d="M12 40 L31.5 26 L51 40Z" fill="${roof}"/><rect x="28" y="48" width="7" height="12" rx="3" fill="${shade('#6b4a5a', dim)}"/>`;
        else s += px ? `<rect x="10" y="34" width="43" height="26" fill="${wall}"/><rect x="6" y="24" width="10" height="36" fill="${wall}"/><rect x="47" y="24" width="10" height="36" fill="${wall}"/><rect x="5" y="20" width="12" height="4" fill="${roof}"/><rect x="46" y="20" width="12" height="4" fill="${roof}"/><rect x="27" y="46" width="9" height="14" fill="${shade('#2b1d12', dim)}"/>`
          : `<rect x="10" y="34" width="43" height="26" rx="1" fill="${wall}"/><rect x="6" y="26" width="10" height="34" rx="1" fill="${wall}"/><rect x="47" y="26" width="10" height="34" rx="1" fill="${wall}"/><path d="M5 27 L11 16 L17 27Z" fill="${roof}"/><path d="M46 27 L52 16 L58 27Z" fill="${roof}"/><path d="M27 60 V50 a4.5 4.5 0 0 1 9 0 V60Z" fill="${shade('#c49bf0', dim)}"/>`;
        break; }
    }
    // sol
    s += px ? `<rect x="0" y="60" width="63" height="28" fill="${gnd}"/><rect x="0" y="60" width="63" height="2" fill="${shade(g2, dim)}"/>` : `<path d="M0 62 Q31.5 56 63 62 V88 H0Z" fill="${gnd}"/>`;
    // premier plan
    for (let i = 0; i < 6; i++) {
      const x = r() * 60, y = 68 + r() * 16;
      if (kind === 'flowers' || season === 'spring') { const c = ['#ff8fb1', '#ffe066', '#c49bf0', '#fff'][i % 4]; s += px ? `<rect x="${x | 0}" y="${y | 0}" width="2" height="2" fill="${c}"/><rect x="${(x + .5) | 0}" y="${(y + 2) | 0}" width="1" height="2" fill="#3f7f27"/>` : `<circle cx="${x}" cy="${y}" r="1.1" fill="${c}"/><circle cx="${x}" cy="${y}" r=".4" fill="#ffe066"/>`; }
      else if (kind === 'sea' || kind === 'lighthouse' || kind === 'islands') s += px ? `<rect x="${x | 0}" y="${y | 0}" width="2" height="1" fill="#ffd1b0"/>` : `<path d="M${x} ${y} q1 -1.6 2 0z" fill="#ffd1e3"/>`;
      else if (season === 'autumn') s += px ? `<rect x="${x | 0}" y="${y | 0}" width="2" height="1" fill="${['#e0802a', '#c84a2a', '#f5c542'][i % 3]}"/>` : `<ellipse cx="${x}" cy="${y}" rx="1.2" ry=".6" fill="${['#e0802a', '#ff8a5c', '#f5c542'][i % 3]}" transform="rotate(${r() * 90} ${x} ${y})"/>`;
      else s += px ? `<rect x="${x | 0}" y="${y | 0}" width="1" height="2" fill="${shade(g2, dim)}"/>` : `<path d="M${x} ${y} l.6 -2 l.6 2" stroke="${shade(g2, dim)}" stroke-width=".5" fill="none"/>`;
    }
    // particules de saison
    if (season === 'winter') for (let i = 0; i < 18; i++) { const x = r() * 63, y = r() * 80; s += px ? `<rect x="${x | 0}" y="${y | 0}" width="1" height="1" fill="#fff"/>` : `<circle cx="${x}" cy="${y}" r=".55" fill="#fff" opacity=".9"/>`; }
    if (night && season !== 'winter') for (let i = 0; i < 7; i++) { const x = r() * 63, y = 40 + r() * 40; s += `<circle cx="${x}" cy="${y}" r=".7" fill="#fff59a" opacity=".9"/>`; }
    // halo doré de la carte Maîtrise
    if (q.step === 3) s += `<circle cx="31.5" cy="56" r="26" fill="url(#gl)" opacity=".75"/>`;
    s += '</svg>';
    return (sceneCache[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s));
  }

  /* ---------------- état ---------------- */
  const DAY = 86400000;
  function schoolWeek(t) {
    const d = new Date(t);
    const y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1; // l'année scolaire commence fin août
    const start = new Date(y, 8, 1); // 1er septembre
    const day = (start.getDay() + 6) % 7; start.setDate(start.getDate() - day); // lundi de cette semaine
    return Math.max(1, Math.min(36, Math.floor((d - start) / (7 * DAY)) + 1));
  }
  function st() {
    const d = Store.data;
    d.quests = d.quests || {};
    const q = d.quests;
    q.chap = q.chap || {}; q.done = q.done || {}; q.started = q.started || {}; q.owned = q.owned || {}; q.pending = q.pending || [];
    q.owned[Theme.id] = q.owned[Theme.id] || {};
    return q;
  }
  /* chapitre de la liste : la semaine scolaire de sa création (ou le suivant libre) */
  function chapterOf(list) {
    const q = st();
    if (q.chap[list.id]) return q.chap[list.id];
    const used = new Set(Object.values(q.chap));
    let c = schoolWeek(list.createdAt || Date.now());
    for (let k = 0; k < 36 && used.has(c); k++) c = c % 36 + 1;
    q.chap[list.id] = c;
    Store.save();
    return c;
  }
  function progress(list) {
    const ws = list.words || [];
    const at = k => ws.filter(w => Store.mastery(w) >= k).length;
    const q = st();
    const a1 = at(1), a2 = at(2), a3 = at(3), n = ws.length || 1;
    return [
      { ok: !!q.started[list.id] || a1 >= n, have: q.started[list.id] ? n : a1, need: n, hint: 'Lance « Mon parcours » sur cette liste' },
      { ok: a1 >= n, have: a1, need: n, hint: 'Tous les mots en Apprentissage' },
      { ok: a2 >= n, have: a2, need: n, hint: 'Tous les mots en Confirmation' },
      { ok: a3 >= n, have: a3, need: n, hint: 'Tous les mots Maîtrisés' }
    ];
  }
  const cardFor = (ch, step) => QCARDS[(ch - 1) * 4 + step];

  /* vérifie toutes les listes et attribue les cartes gagnées */
  function check() {
    const q = st();
    const won = [];
    Store.lists().forEach(l => {
      if (!l.words || !l.words.length) return;
      const ch = chapterOf(l);
      const p = progress(l);
      q.done[l.id] = q.done[l.id] || [false, false, false, false];
      p.forEach((x, k) => {
        if (x.ok && !q.done[l.id][k]) {
          q.done[l.id][k] = true;
          const c = cardFor(ch, k);
          q.owned[Theme.id][c.n] = (q.owned[Theme.id][c.n] || 0) + 1;
          q.pending.push(c.n);
          won.push(c);
          // toute la liste maîtrisée : un booster offert en plus de la carte dorée
          if (k === 3) { const d = Store.data; d.freeBoosters = (d.freeBoosters || 0) + 1; c.gift = true; }
        }
      });
    });
    if (won.length) Store.save(true);
    return won;
  }
  function markStarted(listId) { if (!listId) return; st().started[listId] = true; Store.save(); check(); }

  /* ---------------- cartes : rendu ---------------- */
  const drawnHTML = c => `<img class="fa-scene" src="${scene(c)}" alt=""><img class="fa-hero" src="${Cards.art(c.heroCard)}" alt="">`;
  function faHTML(c, opts = {}) {
    const S = STEPS[c.step];
    const ph = Cards.photo && Cards.photo('q' + String(c.n).padStart(3, '0'));
    return `<div class="tcard fa fa-s${c.step} ${ph ? 'has-photo' : ''}" data-q="${c.n}">
      <div class="tc-in">
        ${ph ? `<img class="fa-photo" src="${ph}" alt="" data-fb="q" onerror="AS_artFail(this)">` : drawnHTML(c)}
        <div class="fa-top"><span class="fa-name">${esc(c.name)}</span><span class="fa-step" title="${S.name}">${S.icon}</span></div>
        <div class="fa-bottom"><div class="fa-chap">Quête ${c.ch} · ${esc(c.chap.place)}</div><div class="fa-txt">${esc(c.txt)}</div>
          <div class="fa-meta">${c.num} · ${S.name} · ${S.tag}</div></div>
        <div class="fa-foil"></div>
      </div>${opts.count > 1 ? `<span class="tc-count">×${opts.count}</span>` : ''}${opts.isNew ? '<span class="tc-new">NOUVELLE !</span>' : ''}</div>`;
  }
  function lockedHTML(c) {
    return `<div class="tcard fa-lock" data-q="${c.n}"><div class="tc-in"><div class="fa-lock-ic">${STEPS[c.step].icon}</div><div class="tc-num">${c.num}</div><div class="fa-lock-t">${esc(c.chap.place)}</div></div></div>`;
  }
  function zoomQ(c) {
    const m = UI.modal(`<div class="zoom-card">${faHTML(c)}</div><div class="row center" style="margin-top:14px"><button class="pix-btn green">Fermer</button></div>`, { cls: 'zoom-modal' });
    m.querySelector('button').onclick = () => UI.closeModal();
    tilt(m.querySelector('.tcard'));
    SFX.play(c.step === 3 ? 'record' : 'pop');
  }
  function tilt(card) {
    card.addEventListener('pointermove', e => {
      const b = card.getBoundingClientRect();
      const px = (e.clientX - b.left) / b.width - .5, py = (e.clientY - b.top) / b.height - .5;
      card.style.transform = `rotateY(${px * 18}deg) rotateX(${-py * 18}deg)`;
      card.style.setProperty('--mx', (px + .5) * 100 + '%'); card.style.setProperty('--my', (py + .5) * 100 + '%');
    });
    card.addEventListener('pointerleave', () => card.style.transform = '');
  }

  /* révélation des cartes gagnées (une par une) */
  let revealing = false;
  function flush() {
    const q = st();
    if (revealing || !q.pending.length || document.querySelector('.modal')) return;
    const n = q.pending.shift(); Store.save();
    const c = QCARDS[n - 1]; if (!c) return flush();
    revealing = true;
    const S = STEPS[c.step];
    const m = UI.modal(html`<div class="q-reveal">
        <div class="rays"></div>
        <h2>🏆 Quête accomplie !</h2>
        <p class="q-sub">${S.icon} Étape « ${S.name} » · Quête ${c.ch} : ${esc(c.chap.place)}</p>
        ${c.step === 3 ? '<p class="q-gift">🎁 Tous les mots sont maîtrisés : <b>un booster t\'est offert</b> ! Ouvre-le dans « Mes cartes ».</p>' : ''}
        <div class="zoom-card q-card"><div class="q-flip">${'<div class="tcard back"><div class="tc-in"><div class="tc-back-logo">' + Pixel.svg('mascot') + '<span>QUÊTE</span></div></div></div>'}</div></div>
        <p class="q-hint">Touche la carte pour la retourner !</p>
        <div class="row center"><button class="pix-btn green big" data-a="ok" style="visibility:hidden">Génial !</button></div></div>`, { cls: 'zoom-modal q-modal', locked: true });
    SFX.play('level');
    const flip = m.querySelector('.q-flip'), hint = m.querySelector('.q-hint'), ok = m.querySelector('[data-a=ok]');
    let turned = false;
    const turn = () => {
      if (turned) return; turned = true;
      flip.classList.add('flip-out');
      setTimeout(() => {
        flip.innerHTML = faHTML(c, { isNew: (st().owned[Theme.id][c.n] || 0) <= 1 });
        flip.classList.remove('flip-out'); flip.classList.add('flip-in');
        tilt(flip.querySelector('.tcard'));
        SFX.play(c.step === 3 ? 'record' : 'win'); UI.confetti();
        hint.textContent = c.step === 3 ? 'Carte dorée ! Tous les mots sont maîtrisés !' : 'Ajoutée à ta collection « Quêtes » !';
        ok.style.visibility = '';
      }, 260);
    };
    flip.onclick = turn; setTimeout(turn, 2600);
    ok.onclick = () => { UI.closeModal(); revealing = false; setTimeout(flush, 350); };
  }

  /* ---------------- panneau de quête (écran des mots) ---------------- */
  function panel(list) {
    check();
    const ch = chapterOf(list), p = progress(list), q = st();
    const C0 = CH[ch - 1];
    const w = el(html`<div class="panel quest-panel">
      <div class="quest-head"><span class="quest-badge">Quête ${ch}</span><b>${esc(C0.place)}</b><span class="muted quest-sub">Fais avancer toute la liste pour gagner les cartes</span></div>
      <div class="quest-cards">${STEPS.map((S, k) => {
        const c = cardFor(ch, k), got = q.done[list.id] && q.done[list.id][k];
        return `<div class="quest-slot ${got ? 'got' : ''}" data-k="${k}">${got ? faHTML(c) : lockedHTML(c)}
          <div class="quest-step">${S.icon} ${S.name}<small>${got ? 'Gagnée !' : (k === 0 ? (p[0].ok ? '✓' : 'Lance ton parcours') : p[k].have + ' / ' + p[k].need + ' mots')}</small></div></div>`;
      }).join('')}</div></div>`);
    w.querySelectorAll('.quest-slot').forEach(s => s.onclick = () => {
      const k = +s.dataset.k, c = cardFor(ch, k);
      if (q.done[list.id] && q.done[list.id][k]) zoomQ(c);
      else UI.toast(`${STEPS[k].icon} ${p[k].hint} pour gagner cette carte !`);
    });
    return w;
  }

  /* ---------------- album « Quêtes » (écran Mes cartes) ---------------- */
  function album(root) {
    const own = st().owned[Theme.id];
    const n = Object.keys(own).length;
    const box = el(html`<div><p class="quest-album-sum"><b>${n} / ${QCARDS.length}</b> cartes de quête · 4 par semaine, une quête par liste de mots</p><div class="album quest-album"></div></div>`);
    const a = box.querySelector('.quest-album');
    a.innerHTML = QCARDS.map(c => own[c.n] ? faHTML(c, { count: own[c.n] }) : lockedHTML(c)).join('');
    a.querySelectorAll('.tcard').forEach(nd => nd.onclick = () => {
      const c = QCARDS[+nd.dataset.q - 1];
      if (own[c.n]) zoomQ(c); else UI.toast(`${c.num} · ${c.chap.place} : à gagner pendant la quête ${c.ch} !`);
    });
    root.appendChild(box);
  }

  window.Quests = { drawnHTML, QCARDS, STEPS, check, flush, panel, album, markStarted, chapterOf, faHTML, pendingCount: () => st().pending.length, ownedCount: () => Object.keys(st().owned[Theme.id]).length };
})();
