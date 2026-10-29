/* Card collection: 100 original pixel creatures, boosters bought with emeralds (max 2 per week). */
(function () {
  const { html, el } = UI;
  const esc = FR.esc;

  const BOOSTER_COST = 30;
  const BOOSTERS_PER_WEEK = 2;
  const CARDS_PER_BOOSTER = 5;

  /* ---------- elements ---------- */
  Object.assign(Pixel.SPRITES, {
    el_feu: ['...k...', '..kok..', '.koyok.', 'koyayok', 'koyaayk', '.koook.', '..kkk..'],
    el_eau: ['...k...', '..knk..', '.knnnk.', 'knnwnnk', 'knwnnnk', '.knnnk.', '..kkk..'],
    el_plante: ['....kk.', '..kkgk.', '.kglgk.', 'kglggk.', 'kgggk..', '.kkk...', 'k......'],
    el_foudre: ['...kkk.', '..kyyk.', '.kyyk..', 'kyyyykk', '.kkyyk.', '..kyk..', '..kk...'],
    el_roche: ['..kkk..', '.ksssk.', 'kssSsSk', 'ksSssSk', 'kSssSSk', '.kSSSk.', '..kkk..'],
    el_air: ['..kkk...', '.kwwwkk.', 'kwwwwwwk', 'kwwwwwwk', '.kkkkkk.'],
    el_ombre: ['..kkk..', '.kmmk..', 'kmmk...', 'kmmk...', 'kmmk...', '.kmmk..', '..kkk..'],
    el_glace: ['k..k..k', '.knknk.', '..kkk..', 'kkkwkkk', '..kkk..', '.knknk.', 'k..k..k'],
    pack: ['...kkkkkkkk', '..kyyyyyyyk', '.kkkkkkkkyk', 'kyyyyyyyykk', 'kynnnnnnykk', 'kynwnvnnyk.', 'kynnvvvnyk.', 'kynnnvnnyk.', 'kyyyyyyyyk.', 'kyykkkkyyk.', 'kyyyyyyyyk.', 'kkkkkkkkkk.']
  });

  const EL = {
    feu:    { name: 'Feu', h: [5, 30], s: 75, l: 55, a1: '#ff9d2e', a2: '#ffe14d', bg: '#ffd9b0', frame: '#e5533d', frame2: '#a3321f',
              atk: ['Boule de feu', 'Souffle brûlant', 'Danse des flammes', 'Éruption', 'Étincelle chaude'],
              txt: ['Il adore griller des chamallows.', 'Sa queue chauffe comme un radiateur.', 'Il éternue des étincelles.'] },
    eau:    { name: 'Eau', h: [195, 225], s: 70, l: 55, a1: '#7ec8f5', a2: '#ffffff', bg: '#cfeaff', frame: '#3d7be5', frame2: '#2552a8',
              atk: ['Pistolet à eau', 'Grosse vague', 'Bulles magiques', 'Plongeon', 'Tourbillon'],
              txt: ['Il fait des bulles quand il rigole.', 'Il vit dans les flaques après la pluie.', 'Il nage plus vite qu\'un poisson.'] },
    plante: { name: 'Plante', h: [85, 130], s: 55, l: 48, a1: '#8fdc5c', a2: '#3f7f27', bg: '#dff5c8', frame: '#5faa3c', frame2: '#3f7f27',
              atk: ['Fouet liane', 'Pluie de feuilles', 'Racines', 'Pollen dodo', 'Graine surprise'],
              txt: ['Il pousse un peu chaque matin.', 'Il sent bon la menthe.', 'Il fait la sieste au soleil.'] },
    foudre: { name: 'Foudre', h: [44, 56], s: 90, l: 58, a1: '#fff3a0', a2: '#2b1d12', bg: '#fff6c2', frame: '#f5c542', frame2: '#c8921c',
              atk: ['Mini-éclair', 'Choc électrique', 'Tonnerre', 'Charge rapide', 'Zigzag'],
              txt: ['Ses poils se dressent avant l\'orage.', 'Il recharge les piles en un clin d\'œil.', 'Il ne tient jamais en place.'] },
    roche:  { name: 'Roche', h: [20, 40], s: 22, l: 50, a1: '#6b6b6b', a2: '#c4c4c4', bg: '#e6dccf', frame: '#9a7a5a', frame2: '#5f4029',
              atk: ['Jet de cailloux', 'Coup de tête', 'Éboulement', 'Carapace', 'Roulé-boulé'],
              txt: ['Il est dur comme un rocher… et tout doux dedans.', 'Il dort au fond des grottes.', 'Il mange des graviers au petit-déj.'] },
    air:    { name: 'Air', h: [170, 200], s: 55, l: 72, a1: '#ffffff', a2: '#b9e3fb', bg: '#e6f7ff', frame: '#7ec8f5', frame2: '#3d8fc0',
              atk: ['Rafale', 'Plume tranchante', 'Tornade', 'Vol piqué', 'Souffle léger'],
              txt: ['Il fait la course avec les nuages.', 'Il est léger comme une plume.', 'Il siffle quand il vole.'] },
    ombre:  { name: 'Ombre', h: [255, 290], s: 38, l: 42, a1: '#c48bf0', a2: '#ffe066', bg: '#e3d4f2', frame: '#6b3398', frame2: '#3f1d5c',
              atk: ['Ombre furtive', 'Cri de la nuit', 'Clair de lune', 'Cache-cache', 'Rêve étrange'],
              txt: ['Il ne sort qu\'à la nuit tombée.', 'Il joue à cache-cache avec ton ombre.', 'Ses yeux brillent dans le noir.'] },
    glace:  { name: 'Glace', h: [180, 200], s: 60, l: 80, a1: '#e8fbff', a2: '#7ec8f5', bg: '#effcff', frame: '#9fe3f5', frame2: '#4aa8c8',
              atk: ['Flocon piquant', 'Souffle gelé', 'Glissade', 'Grêle', 'Bonhomme de neige'],
              txt: ['Il adore les glaces à la vanille.', 'Il fait de la luge sur son ventre.', 'Même l\'été, il a froid aux pieds.'] }
  };

  const NAMES = {
    feu: ['Flammouche', 'Brasero', 'Pyrolin', 'Cendrillot', 'Grillou', 'Braisette', 'Tisonix', 'Chaudrou', 'Fumeron', 'Volcanou', 'Magmatus', 'Fournaise'],
    eau: ['Ploufix', 'Bullette', 'Gouttelin', 'Flaquette', 'Clapotis', 'Ondin', 'Coralou', 'Marinet', 'Vaguelou', 'Aquarin', 'Tsunamo', 'Abyssor'],
    plante: ['Feuillou', 'Moussette', 'Glandu', 'Trèflon', 'Champinou', 'Bourgeonix', 'Racinot', 'Pétalia', 'Fougérix', 'Ronceline', 'Lianor', 'Sylvestor'],
    foudre: ['Zapzap', 'Bzzmouche', 'Watto', 'Pilou', 'Ampérine', 'Voltigou', 'Éclairon', 'Dynamo', 'Fulgurix', 'Orageon', 'Électrus', 'Tonnerrex'],
    roche: ['Caillou', 'Gravillon', 'Galetin', 'Pierrot', 'Silexou', 'Rocaille', 'Granitou', 'Menhirou', 'Bouldor', 'Cristalix', 'Basaltor', 'Montagnor'],
    air: ['Plumette', 'Pioupiou', 'Brisou', 'Ventilou', 'Hélicou', 'Nuageon', 'Zéphyrin', 'Planeur', 'Rafalon', 'Tourbillon', 'Cyclonix', 'Altitor'],
    ombre: ['Ombrinet', 'Lunette', 'Brumette', 'Noxou', 'Chauvinou', 'Hibouclette', 'Fantômou', 'Minuitor', 'Crépuscule', 'Éclipsa', 'Spectrix', 'Nocturnor'],
    glace: ['Givrou', 'Flocounet', 'Gelinou', 'Grêlon', 'Pingouinou', 'Iglouf', 'Frimas', 'Polarix', 'Banquisa', 'Stalactix', 'Blizzaro', 'Glaciator']
  };
  const LEGENDS = [['Dragor', 'feu'], ['Léviathor', 'eau'], ['Solarion', 'foudre'], ['Galaxor', 'ombre']];

  const RAR = {
    c:  { name: 'Commune', sym: '●', pv: [30, 60], dmg: [10, 30] },
    pc: { name: 'Peu commune', sym: '◆', pv: [50, 80], dmg: [30, 50] },
    r:  { name: 'Rare', sym: '★', pv: [70, 110], dmg: [50, 80] },
    ur: { name: 'Ultra rare', sym: '★★', pv: [100, 150], dmg: [80, 120] },
    or: { name: 'Dorée', sym: '♛', pv: [180, 250], dmg: [150, 250] }
  };
  const RANK = { c: 0, pc: 1, r: 2, ur: 3, or: 4 };

  function rng(seed) {
    let s = 2166136261;
    for (let i = 0; i < seed.length; i++) { s ^= seed.charCodeAt(i); s = Math.imul(s, 16777619); }
    return () => { s = Math.imul(s ^ (s >>> 15), 2246822507); s = Math.imul(s ^ (s >>> 13), 3266489909); s ^= s >>> 16; return (s >>> 0) / 4294967296; };
  }
  const between = (r, [a, b], step = 10) => Math.round((a + r() * (b - a)) / step) * step;

  /* ---------- the 100 cards ---------- */
  const CARDS = [];
  Object.keys(NAMES).forEach(elk => {
    NAMES[elk].forEach((name, i) => {
      const rar = i < 6 ? 'c' : i < 9 ? 'pc' : i < 11 ? 'r' : 'ur';
      CARDS.push({ name, el: elk, rar });
    });
  });
  LEGENDS.forEach(([name, elk]) => CARDS.push({ name, el: elk, rar: 'or' }));
  CARDS.forEach((c, i) => {
    c.id = i + 1;
    c.num = String(i + 1).padStart(3, '0');
    const r = rng('card-' + c.name);
    c.pv = between(r, RAR[c.rar].pv);
    c.atk = EL[c.el].atk[Math.floor(r() * EL[c.el].atk.length)];
    c.dmg = between(r, RAR[c.rar].dmg);
    c.txt = c.rar === 'or' ? 'Une légende que très peu de dresseurs ont vue.' : EL[c.el].txt[Math.floor(r() * 3)];
  });

  /* ---------- procedural pixel creature ---------- */
  const artCache = {};
  function art(card) {
    if (artCache[card.id]) return artCache[card.id];
    const W = 20, H = 20, C = 10;
    const r = rng('art-' + card.name);
    const E = EL[card.el];
    const g = Array.from({ length: H }, () => new Array(W).fill(0));
    const set = (y, x, v) => { if (y >= 0 && y < H && x >= 0 && x < W) { g[y][x] = v; g[y][W - 1 - x] = v; } };
    const put = (y, x, v) => { if (y >= 0 && y < H && x >= 0 && x < W) g[y][x] = v; };
    const big = card.rar === 'or' || card.rar === 'ur';
    const cy = 11 + Math.floor(r() * 2);
    const rx = (big ? 5 : 3.6) + r() * 2.4, ry = (big ? 4.4 : 3.2) + r() * 2;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (x + 0.5 - C) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) g[y][x] = 1;
    }
    const hasHead = r() < 0.55;
    let hy = 0;
    if (hasHead) {
      const hr = 2.6 + r() * 1.4;
      hy = cy - ry - hr * 0.35;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const dx = (x + 0.5 - C) / hr, dy = (y + 0.5 - hy) / (hr * 0.9);
        if (dx * dx + dy * dy <= 1) g[y][x] = 1;
      }
    }
    // belly
    if (r() < 0.75) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (x + 0.5 - C) / (rx * 0.6), dy = (y + 0.5 - cy - ry * 0.25) / (ry * 0.6);
      if (g[y][x] === 1 && dx * dx + dy * dy <= 1) g[y][x] = 2;
    }
    let top = H, bottom = 0;
    for (let y = 0; y < H; y++) if (g[y].some(v => v)) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
    // legs
    const legX = Math.round(C - rx * 0.55) - 1;
    for (let y = bottom + 1; y <= Math.min(H - 2, bottom + 2); y++) { set(y, legX, 1); set(y, legX + 1, 1); }
    bottom = Math.min(H - 2, bottom + 2);
    // element extras (3 = accent 1, 4 = accent 2)
    switch (card.el) {
      case 'feu':
        for (let x = 7; x < 10; x++) { const h = 2 + Math.floor(r() * 3); for (let k = 1; k <= h; k++) set(top - k, x, k === h ? 4 : 3); }
        break;
      case 'eau':
        for (let k = 1; k <= 3; k++) for (let x = C - 1 - (3 - k); x <= C - 1; x++) set(top - k + 1, x, 3);
        set(cy, Math.round(C - rx) - 1, 3); set(cy + 1, Math.round(C - rx) - 1, 3); set(cy + 1, Math.round(C - rx) - 2, 3);
        break;
      case 'plante':
        put(top - 1, C - 1, 4); put(top - 2, C - 1, 4);
        [[top - 3, C], [top - 3, C + 1], [top - 4, C + 1], [top - 4, C + 2], [top - 3, C - 2], [top - 3, C - 3], [top - 4, C - 3]].forEach(([y, x]) => put(y, x, 3));
        break;
      case 'foudre': {
        const ex = 3 + Math.floor(r() * 2);
        [[1, ex], [2, ex + 1], [3, ex], [4, ex + 1]].forEach(([k, d], i) => set(top - k + 1, C - 1 - d, i === 3 ? 4 : 3));
        break;
      }
      case 'roche':
        set(top, C - 4, 4); set(top - 1, C - 4, 4); set(top - 2, C - 5, 4);
        for (let k = 0; k < 6; k++) { const y = top + 2 + Math.floor(r() * (bottom - top - 3)), x = Math.floor(r() * C); if (g[y] && g[y][x] === 1) set(y, x, 3); }
        break;
      case 'air': {
        const ex = Math.round(C - rx);
        for (let k = 0; k < 4; k++) for (let d = 1; d <= 4 - k; d++) set(cy - 2 + k, ex - d, 3);
        break;
      }
      case 'ombre':
        for (let k = 1; k <= 3; k++) for (let d = 0; d < 4 - k; d++) set(top - k + 1, C - 3 - d + (k - 1), 1);
        if (r() < .6) { const ex = Math.round(C - rx); for (let k = 0; k < 3; k++) for (let d = 1; d <= 3 - k; d++) set(cy - 1 + k, ex - d, 3); }
        break;
      case 'glace':
        [[C - 1, 3], [C - 4, 2], [C - 6, 1]].forEach(([x, h]) => { for (let k = 1; k <= h; k++) set(top - k + (x === C - 1 ? 1 : 2), x, k === h ? 4 : 3); });
        break;
    }
    // crown for the golden legends
    if (card.rar === 'or') {
      const t = Math.max(3, top);
      [[t - 1, C - 3], [t - 1, C - 2], [t - 1, C - 1], [t - 2, C - 3], [t - 2, C - 1], [t - 3, C - 3]].forEach(([y, x]) => set(y, x, y === t - 3 ? 11 : 10));
    }
    // eyes
    const eyeY = Math.max(1, Math.round(hasHead ? hy - 0.5 : top + 2 + (r() < .5 ? 0 : 1)));
    const ex = 2 + (r() < 0.5 ? 1 : 0);
    const tall = r() < 0.4;
    const L1 = C - 1 - ex, L2 = C - ex;
    for (let k = 0; k < (tall ? 3 : 2); k++) { set(eyeY + k, L1, 5); set(eyeY + k, L2, 5); }
    set(eyeY + (tall ? 1 : 1), L2, 6);
    if (tall) set(eyeY + 2, L2, 6);
    const my = eyeY + (tall ? 3 : 2) + (r() < .4 ? 1 : 0);
    if (r() < 0.5) { set(my, C - 1, 7); } else { set(my, C - 2, 7); set(my + 1, C - 1, 7); }
    if (r() < 0.55 && g[my] && (g[my][L1 - 1] === 1 || g[my][L1 - 1] === 2)) set(my, L1 - 1, 8);
    if (card.rar !== 'c' && r() < 0.5 && card.el !== 'roche') set(my + 1, C - 2, 5); // little fang
    // outline
    const o = g.map(row => row.slice());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (g[y][x]) continue;
      if ((g[y - 1] && g[y - 1][x]) || (g[y + 1] && g[y + 1][x]) || g[y][x - 1] || g[y][x + 1]) o[y][x] = 9;
    }
    // paint
    const h = E.h[0] + r() * (E.h[1] - E.h[0]);
    const body = `hsl(${h},${E.s}%,${E.l}%)`, dark = `hsl(${h},${E.s}%,${E.l - 14}%)`, light = `hsl(${h},${E.s}%,${Math.min(92, E.l + 14)}%)`;
    const belly = `hsl(${h},${Math.max(10, E.s - 25)}%,${Math.min(90, E.l + 25)}%)`;
    const col = { 2: belly, 3: E.a1, 4: E.a2, 10: '#f5c542', 11: '#e5533d', 5: '#ffffff', 6: '#1a120b', 7: '#3a1a10', 8: '#ff8fb1', 9: '#2b1d12' };
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = o[y][x];
      if (!v) continue;
      let c = col[v];
      if (v === 1) {
        const br = !(o[y + 1] && o[y + 1][x] && o[y + 1][x] !== 9) || !(o[y][x + 1] && o[y][x + 1] !== 9);
        const tl = !(o[y - 1] && o[y - 1][x] && o[y - 1][x] !== 9);
        c = br && x >= C ? dark : tl && x < C ? light : body;
      }
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    }
    artCache[card.id] = cv.toDataURL();
    return artCache[card.id];
  }

  /* ---------- state ---------- */
  function weekKey(d = new Date()) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return t.getUTCFullYear() + '-W' + Math.ceil(((t - y0) / 86400000 + 1) / 7);
  }
  function state() {
    const d = Store.data;
    if (!d.cards) d.cards = { owned: {}, week: '', opened: 0, total: 0 };
    if (d.cards.week !== weekKey()) { d.cards.week = weekKey(); d.cards.opened = 0; }
    return d.cards;
  }
  const left = () => Math.max(0, BOOSTERS_PER_WEEK - state().opened);
  const ownedCount = () => Object.keys(state().owned).length;

  function draw() {
    const pickR = (slot) => {
      const x = Math.random();
      if (slot < 3) return x < 0.75 ? 'c' : 'pc';
      if (slot === 3) return x < 0.7 ? 'pc' : 'r';
      return x < 0.7 ? 'r' : x < 0.94 ? 'ur' : 'or';
    };
    const out = [];
    for (let s = 0; s < CARDS_PER_BOOSTER; s++) {
      const rr = pickR(s);
      const pool = CARDS.filter(c => c.rar === rr);
      let c = pool[Math.floor(Math.random() * pool.length)];
      for (let k = 0; k < 3 && out.includes(c); k++) c = pool[Math.floor(Math.random() * pool.length)];
      out.push(c);
    }
    return out.sort((a, b) => RANK[a.rar] - RANK[b.rar]);
  }

  /* ---------- card markup ---------- */
  function cardHTML(c, opts = {}) {
    const E = EL[c.el];
    const R = RAR[c.rar];
    const n = opts.count > 1 ? `<span class="tc-count">×${opts.count}</span>` : '';
    return `<div class="tcard r-${c.rar} el-${c.el}" data-id="${c.id}" style="--f:${E.frame};--f2:${E.frame2};--bg:${E.bg}">
      <div class="tc-in">
        <div class="tc-top"><span class="tc-name">${esc(c.name)}</span><span class="tc-pv">PV<b>${c.pv}</b></span><span class="tc-el">${Pixel.svg('el_' + c.el)}</span></div>
        <div class="tc-art"><img src="${art(c)}" alt=""></div>
        <div class="tc-meta">N°${c.num} · ${E.name} · ${R.name} ${R.sym}</div>
        <div class="tc-atk"><span class="tc-cost">${Pixel.svg('el_' + c.el)}${c.dmg >= 60 ? Pixel.svg('el_' + c.el) : ''}</span><b>${esc(c.atk)}</b><span class="tc-dmg">${c.dmg}</span></div>
        <div class="tc-txt">${esc(c.txt)}</div>
      </div>${n}${opts.isNew ? '<span class="tc-new">NOUVELLE !</span>' : ''}</div>`;
  }
  function missingHTML(c) {
    return `<div class="tcard missing" data-id="${c.id}"><div class="tc-in"><div class="tc-art"><img src="${art(c)}" alt=""></div><div class="tc-num">N°${c.num}</div></div></div>`;
  }
  const backHTML = () => `<div class="tcard back"><div class="tc-in"><div class="tc-back-logo">${Pixel.svg('mascot')}<span>AFTER<br>SCHOOL</span></div></div></div>`;

  /* ---------- collection screen ---------- */
  let filter = 'all';
  UI.register('cards', (root) => {
    UI.setTitle('Mes cartes');
    const st = state();
    const own = ownedCount();
    const gems = Store.data.stats.gems;
    const wrap = el(html`<div class="center-col">
      <div class="booster-bar panel">
        <div class="pack-mini">${packHTML()}</div>
        <div style="flex:1;min-width:220px">
          <div style="font-size:clamp(20px,3.4vmin,32px);font-weight:700">Ma collection : ${own} / ${CARDS.length}</div>
          <div class="progress"><div style="width:${own}%"></div></div>
          <div style="margin-top:10px;font-size:clamp(15px,2.4vmin,22px)">Boosters cette semaine : <b>${left()} / ${BOOSTERS_PER_WEEK}</b> ${left() ? '' : '— reviens lundi !'}</div>
        </div>
        <button class="pix-btn gold big" data-a="open" ${left() && gems >= BOOSTER_COST ? '' : 'disabled'}>Ouvrir un booster<br><span style="font-size:.7em;display:inline-flex;align-items:center;gap:4px"><span style="width:1.2em;display:inline-flex">${Pixel.svg('gem')}</span>${BOOSTER_COST} émeraudes</span></button>
      </div>
      ${left() && gems < BOOSTER_COST ? `<p class="prompt">Encore ${BOOSTER_COST - gems} émeraudes à gagner en jouant pour ouvrir un booster !</p>` : ''}
      <div class="tabs" style="margin-top:var(--gap)">
        <button class="pix-btn small ${filter === 'all' ? 'on' : ''}" data-f="all">Toutes</button>
        ${Object.entries(EL).map(([k, e]) => `<button class="pix-btn small ${filter === k ? 'on' : ''}" data-f="${k}"><span style="width:1.1em;display:inline-flex">${Pixel.svg('el_' + k)}</span>${e.name}</button>`).join('')}
        <button class="pix-btn small ${filter === 'or' ? 'on' : ''}" data-f="or">♛ Dorées</button>
      </div>
      <div class="album"></div></div>`);
    root.appendChild(wrap);
    const album = wrap.querySelector('.album');
    const list = CARDS.filter(c => filter === 'all' || c.el === filter || (filter === 'or' && c.rar === 'or'));
    album.innerHTML = list.map(c => st.owned[c.id] ? cardHTML(c, { count: st.owned[c.id] }) : missingHTML(c)).join('');
    album.querySelectorAll('.tcard').forEach((n, i) => {
      n.style.animationDelay = Math.min(i * 0.02, .8) + 's';
      n.onclick = () => {
        const c = CARDS[+n.dataset.id - 1];
        if (!st.owned[c.id]) { UI.toast('Carte N°' + c.num + ' : pas encore trouvée !'); return; }
        zoom(c);
      };
    });
    wrap.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; UI.go('cards', {}, { replace: true }); });
    wrap.querySelector('[data-a=open]').onclick = async () => {
      if (!left()) { UI.toast('Plus de booster cette semaine, reviens lundi !'); return; }
      if (Store.data.stats.gems < BOOSTER_COST) { UI.toast(`Il te faut ${BOOSTER_COST} émeraudes`); return; }
      if (!(await UI.confirm(`Ouvrir un booster pour ${BOOSTER_COST} émeraudes ?`, 'Oui !', 'Non'))) return;
      UI.go('booster');
    };
  });

  function zoom(c) {
    const m = UI.modal(`<div class="zoom-card">${cardHTML(c)}</div><div class="row center" style="margin-top:14px"><button class="pix-btn green">Fermer</button></div>`, { cls: 'zoom-modal' });
    m.querySelector('button').onclick = () => UI.closeModal();
    const card = m.querySelector('.tcard');
    // tilt with finger for a shiny effect
    card.addEventListener('pointermove', e => {
      const b = card.getBoundingClientRect();
      const px = (e.clientX - b.left) / b.width - .5, py = (e.clientY - b.top) / b.height - .5;
      card.style.transform = `rotateY(${px * 18}deg) rotateX(${-py * 18}deg)`;
      card.style.setProperty('--mx', (px + .5) * 100 + '%');
    });
    card.addEventListener('pointerleave', () => card.style.transform = '');
    SFX.play(c.rar === 'or' ? 'record' : 'pop');
  }

  function packHTML() {
    return `<div class="pack"><div class="pack-shine"></div><div class="pack-top"></div>
      <div class="pack-body"><div class="pack-logo">${Pixel.svg('mascot')}</div><div class="pack-title">CARTES<br>AFTER<br>SCHOOL</div><div class="pack-sub">5 cartes</div></div></div>`;
  }

  /* ---------- booster opening ---------- */
  UI.register('booster', (root) => {
    UI.setTitle('Booster !');
    const st = state();
    if (!left() || Store.data.stats.gems < BOOSTER_COST) { UI.back(); return; }
    // pay and draw immediately so leaving mid-animation never loses cards
    Store.spendGems(BOOSTER_COST);
    st.opened++; st.total = (st.total || 0) + 1;
    const pulled = draw();
    const isNew = pulled.map(c => !st.owned[c.id]);
    const seen = new Set();
    pulled.forEach((c, i) => { if (seen.has(c.id)) isNew[i] = false; seen.add(c.id); st.owned[c.id] = (st.owned[c.id] || 0) + 1; });
    Store.save(true);
    UI.refreshHud(true);

    const stage = el(`<div class="booster-stage">
      <div class="prompt" data-z="msg">Touche le booster pour l'ouvrir !</div>
      <div class="pack-big">${packHTML()}</div>
      <div class="reveal-zone"></div>
      <div class="pulled-row"></div>
      <div class="row center" data-z="end" style="display:none">
        <button class="pix-btn wood big" data-a="album">Voir mon album</button>
      </div></div>`);
    root.appendChild(stage);
    const msg = stage.querySelector('[data-z=msg]');
    const packBig = stage.querySelector('.pack-big');
    const zone = stage.querySelector('.reveal-zone');
    const row = stage.querySelector('.pulled-row');
    let taps = 0, idx = 0, phase = 'pack';

    packBig.onclick = () => {
      if (phase !== 'pack') return;
      taps++;
      SFX.play(taps < 3 ? 'place' : 'break');
      Haptic(30 * taps);
      packBig.classList.remove('wiggle'); void packBig.offsetWidth; packBig.classList.add('wiggle');
      UI.burstAt(packBig, { n: 6 * taps, spread: 60 * taps, colors: ['#f5c542', '#ffe58a', '#ffffff', '#4fe08a'] });
      if (taps === 1) msg.textContent = 'Encore !';
      if (taps === 2) msg.textContent = 'Plus fort !';
      if (taps >= 3) {
        phase = 'cards';
        packBig.classList.add('torn');
        UI.confetti();
        setTimeout(() => { packBig.style.display = 'none'; showStack(); }, 700);
      }
    };

    function showStack() {
      msg.textContent = 'Touche la carte pour la retourner !';
      zone.innerHTML = '';
      const remaining = pulled.length - idx;
      for (let k = remaining - 1; k >= 0; k--) {
        const f = el(`<div class="flip ${k === 0 ? 'top' : ''}" style="--k:${k}"><div class="flip-in"><div class="face back-face">${backHTML()}</div><div class="face front-face">${cardHTML(pulled[idx + k], { isNew: isNew[idx + k] })}</div></div></div>`);
        zone.appendChild(f);
      }
      const top = zone.querySelector('.flip.top');
      top.onclick = () => reveal(top);
    }

    function reveal(f) {
      if (f.classList.contains('flipped')) {
        // send it to the row and show the next one
        f.classList.add('away');
        SFX.play('whoosh');
        const c = pulled[idx];
        const mini = el(`<div class="mini-card">${cardHTML(c, { isNew: isNew[idx] })}</div>`);
        mini.onclick = () => zoom(c);
        row.appendChild(mini);
        idx++;
        setTimeout(() => {
          if (idx < pulled.length) showStack();
          else finish();
        }, 350);
        return;
      }
      const c = pulled[idx];
      f.classList.add('flipped');
      const rank = RANK[c.rar];
      setTimeout(() => {
        if (rank >= 4) {
          SFX.play('level'); UI.confetti(); stage.classList.add('golden-flash');
          setTimeout(() => stage.classList.remove('golden-flash'), 1600);
          msg.textContent = '♛ CARTE DORÉE !!! ♛';
        } else if (rank >= 3) { SFX.play('record'); UI.burstAt(f, { n: 40, spread: 260, colors: ['#ff8fb1', '#7ec8f5', '#f5c542', '#8fdc5c', '#c48bf0'] }); msg.textContent = 'ULTRA RARE !'; }
        else if (rank >= 2) { SFX.play('win'); UI.burstAt(f, { n: 24 }); msg.textContent = 'Une carte rare !'; }
        else { SFX.play(isNew[idx] ? 'good' : 'pop'); msg.textContent = isNew[idx] ? 'Nouvelle carte !' : 'Tu l\'avais déjà !'; }
        if (isNew[idx] && rank < 2) UI.burstAt(f, { n: 10, spread: 100 });
      }, 350);
    }

    function finish() {
      zone.innerHTML = '';
      const nb = isNew.filter(Boolean).length;
      msg.textContent = nb ? `${nb} nouvelle${nb > 1 ? 's' : ''} carte${nb > 1 ? 's' : ''} dans ta collection !` : 'Que des doubles cette fois… la prochaine sera la bonne !';
      row.classList.add('done');
      stage.querySelector('[data-z=end]').style.display = '';
      stage.querySelector('[data-a=album]').onclick = () => UI.back();
    }
  });

  window.Cards = { CARDS, art, cardHTML, state, left, ownedCount, BOOSTER_COST };
})();
