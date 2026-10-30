/* Virtual pet ("compagnon") living on the home screen, fed with stars earned in the exercises. */
(function () {
  const { html, el } = UI;
  const esc = FR.esc;
  const isPony = () => Theme.id === 'poney';

  /* ---------------- species ---------------- */
  const PIXEL_SPECIES = {
    chat:   { name: 'Chat', body: [28, 70, 62], belly: '#fff3e0', ears: 'cat', acc: '#ff8fb1' },
    renard: { name: 'Renard', body: [22, 85, 55], belly: '#ffffff', ears: 'fox', tail: true, acc: '#2b1d12' },
    lapin:  { name: 'Lapin', body: [0, 0, 92], belly: '#ffe3ec', ears: 'bunny', acc: '#ff8fb1' },
    slime:  { name: 'Slime', body: [110, 60, 55], belly: '#c8ffb0', ears: 'none', acc: '#8fdc5c' },
    dragon: { name: 'Dragon', body: [270, 45, 58], belly: '#ffe58a', ears: 'horns', wings: true, acc: '#ffe58a' },
    mouton: { name: 'Mouton', body: [30, 30, 40], belly: '#f6efe6', ears: 'wool', acc: '#ffffff' }
  };
  const PONY_SPECIES = {
    poney:   { name: 'Poney', o: { coat: '#e8a66b', coatDark: '#c9844c', mane: '#ff8fb1', mane2: '#ffb3c7', muzzle: '#fff1e0', hoof: '#8a5a4a', blaze: 'star', socks: true } },
    licorne: { name: 'Licorne', o: { coat: '#ffffff', coatDark: '#e6dce8', mane: '#ff8fb1', rainbow: true, muzzle: '#fff0f5', hoof: '#c49bf0', horn: true } },
    pegase:  { name: 'Pégase', o: { coat: '#e8e0f8', coatDark: '#c4b4e8', mane: '#7ec8f5', mane2: '#c49bf0', muzzle: '#faf6ff', hoof: '#9c70d0', wings: true } },
    poulain: { name: 'Poulain', o: { coat: '#c98a5c', coatDark: '#a46a40', mane: '#5a3a2a', mane2: '#8a5a3c', muzzle: '#f6dcc4', hoof: '#5a3a2a', blaze: 'stripe' } },
    nuit:    { name: 'Cheval noir', o: { coat: '#5a4450', coatDark: '#3f2e38', mane: '#2b1d26', mane2: '#6a5cb8', muzzle: '#c8b0bc', hoof: '#2b1d26', blaze: 'star', socks: true } },
    tachete: { name: 'Poney tacheté', o: { coat: '#f2d6a8', coatDark: '#d9b880', mane: '#ffffff', mane2: '#ffd1e3', muzzle: '#fff6e6', hoof: '#8a5a4a', spots: true } }
  };
  const species = () => isPony() ? PONY_SPECIES : PIXEL_SPECIES;

  /* ---------------- accessories & food ---------------- */
  /* [id, name, price, slot] — one item per slot can be worn at the same time */
  const ACC = {
    pixel: [
      ['bow', 'Nœud rose', 120, 'head'], ['flower', 'Fleur', 150, 'head'], ['glasses', 'Lunettes', 180, 'eyes'], ['scarf', 'Écharpe', 200, 'neck'],
      ['cap', 'Casquette', 220, 'head'], ['bowtie', 'Nœud papillon', 250, 'neck'], ['headphones', 'Casque audio', 300, 'head'], ['eyepatch', 'Cache-œil de pirate', 300, 'eyes'],
      ['sunglasses', 'Lunettes de soleil', 350, 'eyes'], ['santa', 'Bonnet de Noël', 400, 'head'], ['hat', 'Chapeau haut-de-forme', 450, 'head'], ['bandana', 'Bandana de pirate', 600, 'head'],
      ['wizard', 'Chapeau de magicien', 700, 'head'], ['viking', 'Casque viking', 850, 'head'], ['necklace', 'Médaille d\'or', 900, 'neck'], ['sparkle', 'Aura d\'étoiles', 1000, 'aura'],
      ['halo', 'Auréole', 1200, 'head'], ['crown', 'Couronne', 1500, 'head'], ['rainbow', 'Aura arc-en-ciel', 2000, 'aura'], ['diamond', 'Couronne de diamants', 3000, 'head']
    ],
    poney: [
      ['bow', 'Nœud', 120, 'head'], ['flowers', 'Couronne de fleurs', 180, 'head'], ['scarf', 'Écharpe', 200, 'neck'], ['helmet', 'Bombe d\'équitation', 250, 'head'],
      ['bowtie', 'Nœud papillon', 250, 'neck'], ['glasses', 'Lunettes de soleil', 350, 'eyes'], ['santa', 'Bonnet de Noël', 400, 'head'], ['blanket', 'Couverture étoilée', 450, 'body'],
      ['heartglasses', 'Lunettes cœur', 500, 'eyes'], ['witch', 'Chapeau de fée', 650, 'head'], ['saddle', 'Selle de concours', 750, 'body'], ['necklace', 'Médaille d\'or', 900, 'neck'],
      ['tiara', 'Diadème', 950, 'head'], ['sparkle', 'Aura d\'étoiles', 1000, 'aura'], ['halo', 'Auréole', 1200, 'head'], ['crown', 'Couronne royale', 1500, 'head'],
      ['rainbow', 'Aura arc-en-ciel', 2000, 'aura'], ['horn', 'Corne magique', 2500, 'horn'], ['wings', 'Ailes de pégase', 3000, 'wings']
    ]
  };
  const accInfo = id => ACC[Theme.id].find(a => a[0] === id);
  /* wear: {slot: id}; older saves stored a single string */
  function wearOf(p) {
    let w = p.wear;
    if (!w) return {};
    if (typeof w === 'string') { const a = accInfo(w); w = a ? { [a[3]]: w } : {}; p.wear = w; }
    return w;
  }
  const wornIds = p => Object.values(wearOf(p)).filter(Boolean);
  const FOOD = {
    pixel: [['apple', 'Pomme', 2, 20, 0], ['bread', 'Pain', 3, 30, 0], ['fish', 'Poisson', 4, 40, 0], ['cookie', 'Cookie', 3, 15, 15], ['melon', 'Pastèque', 5, 35, 10], ['cake', 'Gâteau', 8, 60, 25]],
    poney: [['carrot', 'Carotte', 2, 20, 0], ['apple', 'Pomme', 3, 30, 0], ['hay', 'Foin', 4, 40, 0], ['sugar', 'Sucre', 3, 15, 15], ['cookie', 'Biscuit', 5, 35, 10], ['cupcake', 'Gâteau', 8, 60, 25]]
  };
  Object.assign(Pixel.SPRITES, {
    food_apple: ['....kk...', '...kgk...', '.kkkkkkk.', 'krrwrrrRk', 'krwrrrrRk', 'krrrrrrRk', 'krrrrrRRk', '.krrrRRk.', '..kkkkk..'],
    food_bread: ['..kkkkkk..', '.kyyyyyyk.', 'kyaayyyyYk', 'kyayyyyyYk', 'kddddddddk', 'kYYYYYYYYk', '.kkkkkkkk.'].map(r => r.replace(/d/g, 'Y')),
    food_fish: ['...kkk......', '.kknnnkk..kk', 'knwknnnnkknk', 'knnnnnnnnnnk', 'kNnnnnnnkkNk', '.kkNNNNkk..k', '...kkkk.....'],
    food_cookie: ['..kkkkk..', '.kyyyyyk.', 'kyDyyyDyk', 'kyyyDyyyk', 'kyDyyyyYk', '.kyyyDYk.', '..kkkkk..'].map(r => r.replace(/D/g, 'B')),
    food_melon: ['k.........k', 'kgk.....kgk', '.klrrrrrlk.', '.krrPrrPrk.', '..krrrrrk..', '...krPrk...', '....kkk....'].map(r => r.replace(/l/g, 'w').replace(/P/g, 'k')),
    food_cake: ['....kRk....', '....kyk....', '.kkkkkkkkk.', 'kwpwwpwwpwk', 'kppppppppPk', 'kyyyyyyyyYk', 'kppppppppPk', '.kkkkkkkkk.'],
    star_mini: ['....k....', '...kyk...', 'kkkkyykkk', 'kyyyyyyYk', '.kyyyyYk.', '.kyykyYk.', 'kYk...kYk']
  });
  function foodIcon(kind) {
    if (isPony()) return CardSets.gearSVG(kind, { a: ({ carrot: '#ffa24d', apple: '#ff6f7d', hay: '#f2d06b', sugar: '#ffffff', cookie: '#e8b77a', cupcake: '#ff9cc6' })[kind], b: ({ carrot: '#e07a20', apple: '#d94a58', hay: '#d9a93a', sugar: '#f0e6f0', cookie: '#8a5a3c', cupcake: '#c49bf0' })[kind] });
    return Pixel.svg('food_' + kind);
  }
  const starIcon = () => isPony() ? Pixel.svg('star') : Pixel.svg('star_mini');

  /* ---------------- pixel pet renderer ---------------- */
  const cache = {};
  function pixelPet(sp, mood, accs) {
    accs = accs || [];
    const has = id => accs.includes(id);
    const key = sp + mood + accs.slice().sort().join(',');
    if (cache[key]) return cache[key];
    const S = PIXEL_SPECIES[sp];
    const W = 24, H = 24;
    const g = Array.from({ length: H }, () => new Array(W).fill(0));
    const P = (x, y, v) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = v; };
    const M = (x, y, v) => { P(x, y, v); P(W - 1 - x, y, v); };
    const ell = (cx, cy, rx, ry, v, only) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1 && (!only || g[y][x] === only)) P(x, y, v); };
    // ears behind the body
    if (S.ears === 'cat' || S.ears === 'fox') { const t = S.ears === 'fox' ? 4 : 5; for (let k = 0; k < 5; k++) for (let i = 0; i <= k; i++) { M(5 + i, t + k, 1); } M(6, t + 3, 7); M(6, t + 4, 7); M(7, t + 4, 7); if (S.ears === 'fox') { M(5, t, 10); } }
    if (S.ears === 'bunny') { for (let y = 1; y < 10; y++) { M(7, y, 1); M(8, y, 1); M(9, y, 1); } for (let y = 3; y < 9; y++) M(8, y, 7); }
    if (S.ears === 'horns') { M(7, 4, 10); M(7, 5, 10); M(8, 6, 10); M(6, 3, 10); }
    if (S.wings) { for (let k = 0; k < 4; k++) for (let i = 0; i < 4 - k; i++) { M(1 + i, 10 + k, 6); } M(2, 9, 6); M(3, 9, 6); }
    if (S.tail) { for (let k = 0; k < 6; k++) { P(19 + Math.floor(k / 2), 17 - k, 1); P(20 + Math.floor(k / 2), 17 - k, 1); P(21 + Math.floor(k / 2), 16 - k, 1); } P(22, 11, 11); P(23, 11, 11); P(22, 12, 11); P(23, 12, 11); P(22, 10, 11); }
    // body
    ell(12, 14, 8.6, 7.4, 1);
    if (S.ears === 'none') { ell(12, 9, 3, 3, 1); P(12, 5, 1); P(11, 6, 1); P(12, 6, 1); }
    if (S.ears === 'wool') { [[6, 8], [9, 6], [12, 5.5], [15, 6], [18, 8], [5, 12], [19, 12], [6, 17], [18, 17]].forEach(([x, y]) => ell(x, y, 2.6, 2.4, 11)); }
    ell(12, 17.5, 5, 3.4, 2, 1);
    if (S.ears === 'fox') ell(12, 16, 4, 2.4, 2, 1);
    // feet
    [[7, 21], [8, 21], [15, 21], [16, 21]].forEach(([x, y]) => P(x, y, 1));
    // face
    const ey = 12;
    const eye = (x) => {
      if (mood === 'blink' || mood === 'sleep') { P(x, ey + 1, 3); P(x + 1, ey + 1, 3); return; }
      if (mood === 'happy') { P(x, ey + 1, 3); P(x + 1, ey, 3); P(x + 2, ey + 1, 3); return; }
      if (mood === 'sad') { P(x, ey, 3); P(x + 1, ey + 1, 3); P(x, ey + 1, 3); P(x + 1, ey + 2, 3); P(x, ey + 2, 3); return; }
      P(x, ey, 3); P(x + 1, ey, 3); P(x, ey + 1, 3); P(x + 1, ey + 1, 3); P(x, ey + 2, 3); P(x + 1, ey + 2, 3); P(x + 1, ey, 4);
    };
    eye(7); eye(15);
    P(5, 15, 5); P(6, 15, 5); P(17, 15, 5); P(18, 15, 5);
    if (mood === 'eat') { P(11, 15, 3); P(12, 15, 3); P(11, 16, 8); P(12, 16, 8); P(10, 15, 3); P(13, 15, 3); P(11, 17, 3); P(12, 17, 3); }
    else if (mood === 'sad') { P(11, 16, 3); P(12, 16, 3); P(10, 17, 3); P(13, 17, 3); }
    else { P(11, 15, 3); P(12, 15, 3); P(10, 14, 3); P(13, 14, 3); }
    if (mood === 'sad') { P(17, 14, 12); P(17, 15, 12); }
    // accessories
    if (has('bow')) { [[4, 5], [5, 6], [6, 6], [7, 5], [5, 4], [6, 4], [4, 7], [7, 7]].forEach(([x, y]) => P(x, y + 1, 5)); P(5, 6, 13); P(6, 6, 13); }
    if (has('glasses')) { for (let x = 6; x < 10; x++) { P(x, 11, 3); P(x, 14, 3); } for (let x = 14; x < 18; x++) { P(x, 11, 3); P(x, 14, 3); } [6, 9, 14, 17].forEach(x => { P(x, 12, 3); P(x, 13, 3); }); P(10, 12, 3); P(11, 12, 3); P(12, 12, 3); P(13, 12, 3); }
    if (has('sunglasses')) { for (let y = 11; y < 14; y++) { for (let x = 6; x < 10; x++) P(x, y, 19); for (let x = 14; x < 18; x++) P(x, y, 19); } P(7, 11, 15); P(15, 11, 15); for (let x = 10; x < 14; x++) P(x, 11, 3); P(5, 11, 3); P(18, 11, 3); }
    if (has('eyepatch')) { for (let y = 11; y < 15; y++) for (let x = 14; x < 18; x++) P(x, y, 3); for (let i = 0; i < 9; i++) P(5 + i, 8 + Math.floor(i / 3), 3); P(18, 11, 3); P(19, 10, 3); }
    if (has('scarf')) { for (let x = 6; x < 18; x++) { P(x, 18, 14); P(x, 19, 14); } P(16, 20, 14); P(17, 20, 14); P(16, 21, 14); P(17, 21, 14); [7, 10, 13, 16].forEach(x => P(x, 18, 15)); }
    if (has('bowtie')) { P(9, 18, 8); P(9, 19, 8); P(9, 20, 8); P(10, 19, 8); P(10, 18, 8); P(10, 20, 8); P(11, 19, 13); P(12, 19, 13); P(13, 18, 8); P(13, 19, 8); P(13, 20, 8); P(14, 18, 8); P(14, 19, 8); P(14, 20, 8); }
    if (has('necklace')) { for (let x = 7; x < 17; x++) P(x, 18 + (x > 9 && x < 14 ? 1 : 0), 10); P(11, 20, 10); P(12, 20, 10); P(11, 21, 10); P(12, 21, 10); }
    if (has('flower')) { [[15, 5], [17, 5], [16, 4], [16, 6]].forEach(([x, y]) => P(x, y, 5)); P(16, 5, 10); }
    if (has('cap')) { for (let y = 4; y < 8; y++) for (let x = 7; x < 17; x++) P(x, y, 12); for (let x = 15; x < 21; x++) P(x, 7, 19); P(11, 3, 12); P(12, 3, 12); P(11, 5, 15); P(12, 5, 15); }
    if (has('headphones')) { for (let x = 6; x < 18; x++) P(x, 4, 16); P(5, 5, 16); P(18, 5, 16); for (let y = 6; y < 11; y++) { P(4, y, 16); P(19, y, 16); } for (let y = 10; y < 15; y++) { P(2, y, 3); P(3, y, 3); P(4, y, 8); P(19, y, 8); P(20, y, 3); P(21, y, 3); } }
    if (has('santa')) { for (let y = 3; y < 7; y++) for (let x = 7 + (6 - y); x < 17; x++) P(x, y, 8); for (let x = 15; x < 19; x++) P(x, 2, 8); for (let x = 6; x < 18; x++) { P(x, 7, 15); P(x, 6, 15); } P(19, 1, 15); P(20, 1, 15); P(19, 2, 15); P(20, 2, 15); }
    if (has('hat')) { for (let x = 6; x < 18; x++) P(x, 7, 3); for (let y = 1; y < 7; y++) for (let x = 8; x < 16; x++) P(x, y, 3); for (let x = 8; x < 16; x++) P(x, 5, 8); }
    if (has('bandana')) { for (let y = 5; y < 9; y++) for (let x = 6; x < 18; x++) if (y > 5 || (x > 7 && x < 16)) P(x, y, 8); [8, 11, 14, 16].forEach(x => P(x, 7, 15)); P(18, 8, 8); P(19, 9, 8); P(20, 10, 8); P(19, 8, 8); }
    if (has('wizard')) { for (let y = 0; y < 7; y++) for (let x = 12 - Math.floor(y / 1.5); x <= 12 + Math.floor(y / 1.5); x++) P(x, y, 17); for (let x = 4; x < 20; x++) P(x, 7, 17); P(11, 4, 10); P(12, 3, 10); P(13, 5, 10); }
    if (has('viking')) { for (let y = 4; y < 8; y++) for (let x = 7; x < 17; x++) P(x, y, 16); for (let x = 6; x < 18; x++) P(x, 7, 10); P(12, 3, 16); P(11, 3, 16); for (let k = 0; k < 4; k++) { P(5 - Math.floor(k / 2), 6 - k, 15); P(18 + Math.floor(k / 2), 6 - k, 15); P(6 - Math.floor(k / 2), 6 - k, 15); P(17 + Math.floor(k / 2), 6 - k, 15); } }
    if (has('halo')) { for (let x = 9; x < 15; x++) { P(x, 0, 10); P(x, 2, 10); } P(8, 1, 10); P(15, 1, 10); }
    if (has('crown')) { for (let x = 7; x < 17; x++) { P(x, 6, 10); P(x, 7, 10); } [7, 10, 13, 16].forEach(x => { P(x, 5, 10); P(x, 4, 10); }); P(11, 6, 8); P(8, 6, 13); P(15, 6, 13); }
    if (has('diamond')) { for (let x = 6; x < 18; x++) { P(x, 6, 15); P(x, 7, 10); } for (let y = 2; y < 6; y++) { [6, 9, 12, 15, 17].forEach(x => P(x, y + (x % 2), 10)); } [[8, 6], [11, 5], [14, 6]].forEach(([x, y]) => { P(x, y, 12); P(x + 1, y, 12); }); P(12, 2, 12); P(12, 1, 15); }
    // outline
    const o = g.map(r => r.slice());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (g[y][x]) continue;
      if ((g[y - 1] && g[y - 1][x]) || (g[y + 1] && g[y + 1][x]) || g[y][x - 1] || g[y][x + 1]) o[y][x] = 9;
    }
    const [h, s, l] = S.body;
    const body = `hsl(${h},${s}%,${l}%)`, dark = `hsl(${h},${s}%,${l - 13}%)`, light = `hsl(${h},${s}%,${Math.min(96, l + 12)}%)`;
    const col = { 2: S.belly, 3: '#1a120b', 4: '#ffffff', 5: '#ff8fb1', 6: `hsl(${h},${s}%,${l - 20}%)`, 7: '#ffb3c7', 8: '#e5533d', 9: '#2b1d12', 10: '#f5c542', 11: S.ears === 'wool' ? '#ffffff' : '#ffffff', 12: '#7ec8f5', 13: '#e5533d', 14: '#e5533d', 15: '#ffffff', 16: '#a8a8b4', 17: '#7b4cc4', 19: '#2b2b44' };
    if (S.ears === 'fox') col[10] = '#2b1d12';
    if (sp === 'mouton') { col[2] = '#f6efe6'; }
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = o[y][x]; if (!v) continue;
      let c = col[v];
      if (v === 1) { const up = !(o[y - 1] && o[y - 1][x] && o[y - 1][x] !== 9); const rt = !(o[y][x + 1] && o[y][x + 1] !== 9); const dn = !(o[y + 1] && o[y + 1][x] && o[y + 1][x] !== 9); c = up ? light : (dn || (rt && x > 12)) ? dark : body; }
      if (sp === 'slime' && v === 1 && (x + y) % 7 === 0) c = light;
      ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1);
    }
    return (cache[key] = cv.toDataURL());
  }
  function ponyPet(sp, accs) {
    const o = Object.assign({}, PONY_SPECIES[sp].o);
    (accs || []).forEach(id => {
      if (id === 'bow') o.bow = '#7ec8f5';
      else if (id === 'glasses') o.glasses = true;
      else if (id === 'scarf') o.scarf = '#ff8fb1';
      else if (id === 'flowers') o.flowers = true;
      else if (id === 'blanket') o.blanket = '#6a5cb8';
      else if (id === 'saddle') { o.saddle = '#3d7be5'; o.rosette = '#ffe066'; }
      else if (id === 'crown') o.crown = true;
      else if (id === 'horn') o.horn = true;
      else if (id === 'wings') o.wings = true;
      else o[id] = true;
    });
    return Theme.ponySVG(Object.assign({ cls: 'pet-svg' }, o), true);
  }
  function petMarkup(p, mood) {
    const accs = p.wear ? wornIds(p) : [];
    if (isPony()) return ponyPet(p.species, accs);
    return `<img class="pet-img" src="${pixelPet(p.species, mood || 'idle', accs)}" alt="">`;
  }

  /* ---------------- state ---------------- */
  const RATES = { hunger: 4, joy: 3, clean: 2 }; // points lost per hour
  function pet() { return Store.data.pet; }
  function tick() {
    const p = pet(); if (!p) return;
    const now = Date.now();
    const h = Math.max(0, (now - (p.t || now)) / 3600000);
    for (const k in RATES) p[k] = Math.max(0, Math.min(100, (p[k] == null ? 80 : p[k]) - RATES[k] * h));
    p.t = now;
  }
  const level = p => 1 + Math.floor((p.xp || 0) / 40);
  const stage = p => { const l = level(p); return l < 3 ? 1 : l < 7 ? 2 : 3; };
  const stars = () => Store.data.stats.stars || 0;
  function addXp(n) { const p = pet(); const before = level(p); p.xp = (p.xp || 0) + n; Store.save(); return level(p) > before; }
  let awakeUntil = 0;
  const isNight = () => { const h = new Date().getHours() + new Date().getMinutes() / 60; return h >= 20.75 || h < 7; };
  const sleeping = () => isNight() && Date.now() > awakeUntil;
  /* the single most important need, used for animations, widget and notifications */
  function need(p) {
    if (sleeping()) return 'sleep';
    if (p.hunger < 30) return 'hungry';
    if (p.clean < 35) return 'dirty';
    if (p.joy < 30) return 'bored';
    if (p.hunger > 70 && p.joy > 70 && p.clean > 60) return 'happy';
    return 'idle';
  }
  function mood(p) { const n = need(p); return n === 'sleep' ? 'sleep' : (n === 'hungry' || n === 'dirty' || n === 'bored') ? 'sad' : n; }
  function message(p) {
    const n = Store.data.settings.name;
    if (sleeping()) return `Chut… ${p.name} dort. Zzz…`;
    if (p.hunger < 30) return stars() < 2 ? `J'ai faim… Fais un exercice pour gagner des étoiles !` : `J'ai faim ! Tu me donnes à manger ?`;
    if (p.clean < 30) return 'Je suis tout sale… Un petit bain ?';
    if (p.joy < 30) return 'On joue ensemble ?';
    const happy = [`Coucou ${n || ''} ! Je suis content de te voir !`, 'Fais tes devoirs, je t\'encourage !', `Tu as ${stars()} étoiles ! Bravo !`, 'Je t\'aime très fort !', 'Les mots de la semaine, c\'est facile avec toi !', 'Un petit chrono de lecture ?'];
    return happy[Math.floor(Math.random() * happy.length)];
  }

  /* ---------------- home widget ---------------- */
  function widget() {
    const p = pet();
    if (!p) {
      const w = el(html`<div class="pet-panel panel">
        <div class="pet-scene egg-scene"><div class="egg">${eggSVG()}</div></div>
        <p class="pet-hint">Un compagnon t'attend ! Choisis-le et donne-lui un nom.</p>
        <button class="pix-btn gold big" data-a="adopt">${Pixel.svg('heart')} Choisir mon compagnon</button></div>`);
      w.querySelector('[data-a=adopt]').onclick = () => UI.go('adopt');
      return w;
    }
    tick(); Store.save();
    const lv = level(p);
    const w = el(html`<div class="pet-panel panel">
      <div class="pet-head"><span class="pet-name">${esc(p.name)}</span><span class="pet-lvl">Niv. ${lv}</span><span class="spacer"></span>
        <span class="stars-chip"><span class="ic">${starIcon()}</span><b>${stars()}</b></span></div>
      <div class="pet-scene">
        <div class="pet-bubble"></div>
        <div class="pet-floor"></div>
        <div class="night-sky"><span class="moon"></span><i></i><i></i><i></i><i></i></div>
        <div class="needs"></div>
        <div class="pet stage-${stage(p)} ${auraCls(p)}"><div class="pet-body">${petMarkup(p, mood(p))}</div></div>
        <div class="pet-fx"></div>
      </div>
      <div class="pet-bars">
        ${bar('hunger', 'Faim', p.hunger)}${bar('joy', 'Joie', p.joy)}${bar('clean', 'Propreté', p.clean)}
      </div>
      <div class="pet-actions">
        <button class="pix-btn small gold" data-a="feed">${foodIcon(FOOD[Theme.id][0][0])} Nourrir</button>
        <button class="pix-btn small blue" data-a="play">${Pixel.svg('star')} Jouer</button>
        <button class="pix-btn small gem" data-a="wash">${Pixel.svg('rain')} Laver</button>
        <button class="pix-btn small purple" data-a="shop">${Pixel.svg('chest')} Boutique</button>
      </div></div>`);
    const scene = w.querySelector('.pet-scene'), petEl = w.querySelector('.pet'), bubble = w.querySelector('.pet-bubble');
    const say = (t, ms = 3600) => { bubble.textContent = t; bubble.classList.remove('show'); void bubble.offsetWidth; bubble.classList.add('show'); clearTimeout(bubble._t); bubble._t = setTimeout(() => bubble.classList.remove('show'), ms); };
    const setMood = (m, ms) => {
      if (!isPony()) w.querySelector('.pet-body').innerHTML = petMarkup(p, m);
      petEl.dataset.mood = m;
      if (ms) setTimeout(() => { if (petEl.isConnected) setMood(mood(p)); }, ms);
    };
    const refresh = () => {
      ['hunger', 'joy', 'clean'].forEach(k => { const b = w.querySelector(`[data-bar=${k}] i`); b.style.width = p[k] + '%'; b.parentElement.classList.toggle('low', p[k] < 30); });
      w.querySelector('.stars-chip b').textContent = stars();
      w.querySelector('.pet-lvl').textContent = 'Niv. ' + level(p);
      petEl.className = 'pet stage-' + stage(p) + ' ' + auraCls(p);
      showNeeds();
      w.querySelectorAll('.dirt').forEach(d => d.remove());
      if (p.clean < 50) for (let i = 0; i < (p.clean < 25 ? 4 : 2); i++) { const d = el('<i class="dirt"></i>'); d.style.left = (30 + Math.random() * 40) + '%'; d.style.top = (40 + Math.random() * 35) + '%'; petEl.appendChild(d); }
      UI.refreshHud();
    };
    function showNeeds() {
      const n = need(p), box = w.querySelector('.needs');
      scene.classList.toggle('night', n === 'sleep');
      ['hungry', 'dirty', 'bored', 'sleep', 'happy'].forEach(k => petEl.classList.toggle('need-' + k, n === k || (k === 'dirty' && p.clean < 35 && n !== 'sleep')));
      let h = '';
      if (n === 'sleep') h = '<span class="zzz"><b>Z</b><b>z</b><b>z</b></span>';
      else if (n === 'hungry') h = `<span class="thought"><span class="th-icon">${foodIcon(FOOD[Theme.id][0][0])}</span></span>`;
      else if (n === 'bored') h = `<span class="thought"><span class="th-ball"></span></span><span class="tear"></span>`;
      if (n !== 'sleep' && p.clean < 35) h += '<span class="stink"><i></i><i></i><i></i></span><span class="fly"></span><span class="fly f2"></span>';
      if (n === 'happy') h += '<span class="sparkle-fx">✦</span><span class="sparkle-fx s2">✧</span>';
      box.innerHTML = h;
      Pet.sync();
    }
    const fx = (txt, cls = '') => { const f = el(`<span class="pet-pop ${cls}">${txt}</span>`); f.style.left = (35 + Math.random() * 30) + '%'; w.querySelector('.pet-fx').appendChild(f); setTimeout(() => f.remove(), 1300); };
    const hearts = (n = 3) => { for (let i = 0; i < n; i++) setTimeout(() => fx(isPony() ? '♥' : '❤', 'heart'), i * 120); };
    const levelCheck = (up) => { if (up) { SFX.play('level'); UI.confetti(); say(`Youpi ! Je passe au niveau ${level(p)} !`, 4000); } };
    refresh(); setMood(mood(p));
    setTimeout(() => say(message(p)), 600);
    // blink for pixel pets
    const blink = setInterval(() => { if (!petEl.isConnected) return clearInterval(blink); if (!isPony() && (!petEl.dataset.mood || petEl.dataset.mood === 'idle')) { setMood('blink'); setTimeout(() => petEl.isConnected && setMood(mood(p)), 160); } }, 3800);

    const life = setInterval(() => { if (!petEl.isConnected) return clearInterval(life); tick(); Store.save(); refresh(); setMood(mood(p)); }, 60000);
    let lastPet = 0;
    petEl.onclick = () => {
      if (Date.now() - lastPet < 900) return; lastPet = Date.now();
      if (sleeping()) {
        awakeUntil = Date.now() + 3 * 60000; SFX.play('pop'); setMood(mood(p)); refresh();
        say(`*Bâille*… Coucou ${Store.data.settings.name || ''} ! Il est tard, on fait vite ?`); return;
      }
      p.joy = Math.min(100, p.joy + 3); Store.save();
      SFX.play('pop'); hearts(2); setMood('happy', 900); petEl.classList.remove('jump'); void petEl.offsetWidth; petEl.classList.add('jump');
      refresh();
      if (Math.random() < .35) say(message(p));
    };

    /* feed */
    w.querySelector('[data-a=feed]').onclick = () => {
      const tray = el(`<div class="pet-tray"><div class="tray-title">Que veux-tu lui donner ? <button class="pix-btn small" data-x>✕</button></div><div class="tray-items"></div></div>`);
      FOOD[Theme.id].forEach(([kind, name, cost, food, joy]) => {
        const b = el(`<button class="tray-item"><span class="fi">${foodIcon(kind)}</span><span>${name}</span><span class="cost"><span class="ic">${starIcon()}</span>${cost}</span></button>`);
        if (stars() < cost) b.classList.add('poor');
        b.onclick = () => {
          if (stars() < cost) { UI.shake(b); SFX.play('bad'); say('Il te faut plus d\'étoiles : fais un exercice pour en gagner !'); return; }
          if (p.hunger >= 98) { say('Je n\'ai plus faim, merci !'); return; }
          Store.data.stats.stars -= cost;
          tray.remove();
          const f = el(`<div class="flying-food">${foodIcon(kind)}</div>`);
          scene.appendChild(f);
          setTimeout(() => f.classList.add('go'), 20);
          setTimeout(() => {
            f.remove(); SFX.play('gem');
            let n = 0; const chomp = setInterval(() => { setMood(n % 2 ? 'idle' : 'eat'); if (++n > 5) { clearInterval(chomp); setMood('happy', 1200); } }, 180);
            UI.burstAt(petEl, { n: 10, spread: 70, colors: ['#e8b77a', '#ffe58a', '#ff8fb1'] });
            p.hunger = Math.min(100, p.hunger + food); p.joy = Math.min(100, p.joy + joy);
            const up = addXp(3); Store.save(true); refresh(); hearts(3);
            say(['Miam ! Délicieux !', 'Merci ! C\'était trop bon !', 'Hmmm, j\'adore !'][Math.floor(Math.random() * 3)]);
            levelCheck(up);
          }, 650);
        };
        tray.querySelector('.tray-items').appendChild(b);
      });
      tray.querySelector('[data-x]').onclick = () => tray.remove();
      scene.querySelectorAll('.pet-tray').forEach(t => t.remove());
      scene.appendChild(tray);
    };

    /* play: tap the ball 5 times */
    w.querySelector('[data-a=play]').onclick = () => {
      if (scene.querySelector('.ball')) return;
      if (p.hunger < 10) { say('Je suis trop fatigué… J\'ai besoin de manger d\'abord.'); return; }
      let hits = 0;
      const ball = el(`<button class="ball" aria-label="balle"></button>`);
      const move = () => { ball.style.left = (10 + Math.random() * 70) + '%'; ball.style.top = (8 + Math.random() * 45) + '%'; };
      move(); scene.appendChild(ball);
      say('Attrape la balle 5 fois !', 2500);
      const timeout = setTimeout(() => { if (ball.isConnected) { ball.remove(); say('On rejoue quand tu veux !'); } }, 15000);
      ball.onclick = (e) => {
        e.stopPropagation();
        hits++; SFX.play('pop'); petEl.classList.remove('jump'); void petEl.offsetWidth; petEl.classList.add('jump'); fx(hits + '/5');
        if (hits >= 5) {
          clearTimeout(timeout); ball.remove();
          p.joy = Math.min(100, p.joy + 30); p.hunger = Math.max(0, p.hunger - 6);
          const up = addXp(4); Store.save(true); refresh(); hearts(4); setMood('happy', 1500); SFX.play('good');
          say('Trop drôle ! Encore !'); levelCheck(up);
        } else move();
      };
    };

    /* wash: rub the bubbles */
    w.querySelector('[data-a=wash]').onclick = () => {
      if (scene.querySelector('.bubble-spot')) return;
      if (p.clean > 95) { say('Je suis déjà tout propre !'); return; }
      say('Frotte les bulles avec ton doigt !', 2500);
      const n = 7; let left = n;
      for (let i = 0; i < n; i++) {
        const b = el('<span class="bubble-spot"></span>');
        b.style.left = (28 + Math.random() * 44) + '%'; b.style.top = (30 + Math.random() * 50) + '%';
        scene.appendChild(b);
      }
      const pop = (t) => {
        const b = t && t.closest && t.closest('.bubble-spot');
        if (!b || b.classList.contains('popped')) return;
        b.classList.add('popped'); SFX.play('pop'); setTimeout(() => b.remove(), 300);
        if (--left === 0) {
          p.clean = 100; const up = addXp(3); Store.save(true); refresh(); setMood('happy', 1500); SFX.play('good');
          UI.burstAt(petEl, { n: 18, spread: 120, colors: ['#ffffff', '#cfeaff', '#7ec8f5'] });
          say('Je brille comme un sou neuf !'); levelCheck(up);
        }
      };
      scene.onpointerdown = e => { scene._rub = true; pop(e.target); };
      scene.onpointermove = e => { if (scene._rub) pop(document.elementFromPoint(e.clientX, e.clientY)); };
      scene.onpointerup = scene.onpointercancel = () => { scene._rub = false; };
    };

    w.querySelector('[data-a=shop]').onclick = () => shop(() => { const host = document.querySelector('.home-pet'); if (host) { host.innerHTML = ''; host.appendChild(widget()); } });
    return w;
  }
  function auraCls(p) { const a = wearOf(p).aura; return a ? 'aura-' + a : ''; }
  function bar(k, label, v) { return `<div class="pbar" data-bar="${k}"><span>${label}</span><div class="pbar-track"><i style="width:${v}%"></i></div></div>`; }

  /* ---------------- shop ---------------- */
  const SLOT_NAMES = { head: 'Tête', eyes: 'Yeux', neck: 'Cou', body: 'Dos', aura: 'Aura', horn: 'Corne', wings: 'Ailes' };
  function shop(onChange) {
    const p = pet();
    p.owned = p.owned || [];
    const w = wearOf(p);
    const m = UI.modal(html`<h2 style="display:flex;align-items:center;gap:10px"><span style="width:1.3em;height:1.3em;display:inline-flex">${Pixel.svg('chest')}</span> Boutique de ${esc(p.name)}</h2>
      <div class="shop-top"><div class="shop-me ${auraCls(p)}">${petMarkup(p, 'happy')}</div>
        <p style="margin:0">Tu as <b class="shop-stars">${stars()}</b> étoiles.<br><small>Gagne-en en faisant tes exercices. Tu peux porter un objet par partie du corps !</small></p></div>
      <div class="shop-grid"></div>
      <div class="row end" style="margin-top:12px"><button class="pix-btn green" data-x>Fermer</button></div>`, { cls: 'wide', onClose: onChange });
    const grid = m.querySelector('.shop-grid');
    ACC[Theme.id].forEach(([id, name, price, slot]) => {
      const owned = p.owned.includes(id), worn = w[slot] === id;
      const preview = Object.assign({}, p, { wear: Object.assign({}, w, { [slot]: id }) });
      const pct = Math.min(100, Math.round(stars() / price * 100));
      const b = el(`<div class="shop-item ${worn ? 'worn' : ''} ${owned ? 'owned' : ''}">
        <span class="slot-tag">${SLOT_NAMES[slot]}</span>
        <div class="shop-prev ${slot === 'aura' ? 'aura-' + id : ''}">${petMarkup(preview, 'happy')}</div><b>${name}</b>
        ${owned ? `<button class="pix-btn small ${worn ? '' : 'green'}">${worn ? 'Enlever' : 'Mettre'}</button>`
          : `<button class="pix-btn small gold"><span style="width:1.1em;display:inline-flex">${starIcon()}</span> ${price}</button>
             ${pct < 100 ? `<div class="save-bar"><i style="width:${pct}%"></i></div><small>${price - stars()} de plus</small>` : ''}`}</div>`);
      b.querySelector('button').onclick = async () => {
        if (!owned) {
          if (stars() < price) { UI.shake(b); SFX.play('bad'); UI.toast(`Encore ${price - stars()} étoiles à gagner !`); return; }
          if (!(await UI.confirm(`Acheter « ${name} » pour ${price} étoiles ?`, 'Oui !', 'Non'))) return;
          Store.data.stats.stars -= price; p.owned.push(id); w[slot] = id; SFX.play('level'); UI.confetti();
        } else w[slot] = worn ? null : id;
        p.wear = w;
        Store.save(true); UI.closeModal(); shop(onChange);
      };
      grid.appendChild(b);
    });
    m.querySelector('[data-x]').onclick = () => UI.closeModal();
  }

  /* ---------------- adoption ---------------- */
  function eggSVG() {
    return `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg"><path d="M50 8 C22 8 10 52 10 74 C10 100 30 114 50 114 C70 114 90 100 90 74 C90 52 78 8 50 8Z" fill="${isPony() ? '#fff4f9' : '#f6efe6'}" stroke="${isPony() ? '#6b4a5a' : '#2b1d12'}" stroke-width="5"/><circle cx="34" cy="50" r="7" fill="${isPony() ? '#ffb3d1' : '#8fdc5c'}"/><circle cx="62" cy="70" r="10" fill="${isPony() ? '#c49bf0' : '#4fe3d8'}"/><circle cx="40" cy="88" r="6" fill="${isPony() ? '#8fc4f5' : '#f5c542'}"/><path class="crack" d="M26 62 L36 54 L44 64 L54 52 L64 62 L74 54" fill="none" stroke="${isPony() ? '#6b4a5a' : '#2b1d12'}" stroke-width="4" stroke-linejoin="round"/></svg>`;
  }
  UI.register('adopt', (root) => {
    UI.setTitle('Mon compagnon');
    let choice = null, name = '';
    function stepChoose() {
      root.innerHTML = '';
      root.classList.remove('typing', 'full');
      const w = el(html`<div class="game center-col">
        <h2 class="pix-title" style="text-align:center">Choisis ton compagnon !</h2>
        <div class="adopt-grid">${Object.entries(species()).map(([k, s], i) => `<button class="adopt-pick" data-k="${k}" style="animation-delay:${i * .06}s"><span class="ap">${petMarkup({ species: k }, 'happy')}</span><b>${s.name}</b></button>`).join('')}</div>
        <button class="pix-btn green big" data-ok disabled>${Pixel.svg('check')} Celui-là !</button></div>`);
      root.appendChild(w);
      w.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { choice = b.dataset.k; SFX.play('pop'); w.querySelectorAll('[data-k]').forEach(x => x.classList.toggle('sel', x === b)); w.querySelector('[data-ok]').disabled = false; });
      w.querySelector('[data-ok]').onclick = () => { if (choice) stepName(); };
    }
    function stepName() {
      root.innerHTML = '';
      root.classList.add('typing', 'full');
      const w = el(html`<div class="game center-col">
        <div class="home-hero" style="margin:0"><span class="adopt-mini">${petMarkup({ species: choice }, 'happy')}</span><div class="bubble">Comment vas-tu m'appeler ?</div></div>
        <div class="name-display"></div></div>`);
      root.appendChild(w);
      const disp = w.querySelector('.name-display'); const show = () => disp.textContent = name; show();
      w.appendChild(UI.keyboard({
        space: true,
        onKey(ch) { if (name.length < 14) { name += name.length === 0 || name.endsWith(' ') ? ch.toUpperCase() : ch; show(); } },
        onDel() { name = name.slice(0, -1); show(); },
        onOk() { name = name.trim(); if (!name) { UI.shake(disp); return; } hatch(); }
      }));
    }
    function hatch() {
      root.innerHTML = '';
      root.classList.remove('typing', 'full');
      const w = el(html`<div class="game center-col" style="text-align:center"><h2 class="pix-title">Touche l'œuf !</h2><div class="egg big">${eggSVG()}</div></div>`);
      root.appendChild(w);
      const egg = w.querySelector('.egg'); let taps = 0;
      egg.onclick = () => {
        taps++; SFX.play(taps < 3 ? 'place' : 'break'); egg.classList.remove('wobble'); void egg.offsetWidth; egg.classList.add('wobble', 'c' + Math.min(taps, 3));
        if (taps >= 3) {
          Store.data.pet = { species: choice, name, hunger: 80, joy: 90, clean: 100, t: Date.now(), xp: 0, owned: [], wear: null, born: Date.now() };
          Store.data.stats.stars = (Store.data.stats.stars || 0) + 10;
          Store.save(true);
          setTimeout(() => {
            w.innerHTML = `<h2 class="pix-title">Bienvenue ${esc(name)} !</h2><div class="hatched">${petMarkup(Store.data.pet, 'happy')}</div><p class="prompt">Cadeau : 10 étoiles pour lui préparer un bon repas !</p><button class="pix-btn green big">${Pixel.svg('heart')} Allons-y !</button>`;
            SFX.play('level'); UI.confetti();
            w.querySelector('button').onclick = () => UI.home();
          }, 500);
        }
      };
    }
    stepChoose();
    return () => root.classList.remove('typing', 'full');
  });

  /* ---------------- home-screen widget + notifications (native side) ---------------- */
  let syncT = 0;
  function sync() {
    clearTimeout(syncT);
    syncT = setTimeout(doSync, 600);
  }
  function doSync() {
    const N = window.AfterSchoolNative;
    if (!N || !N.syncPets) return;
    try {
      const list = [];
      Store.global.profiles.filter(pr => pr.onboarded).forEach(pr => {
        const d = pr.id === Store.currentId() ? Store.data : Store.profileData(pr.id);
        if (!d || !d.pet) return;
        const q = d.pet;
        list.push({ childId: pr.id, child: (d.settings && d.settings.name) || pr.name || '', name: q.name, hunger: q.hunger, joy: q.joy, clean: q.clean, t: q.t || Date.now(),
          lastDay: d.stats && d.stats.lastDay, current: pr.id === Store.currentId(), theme: (d.settings && d.settings.theme) || 'pixel' });
      });
      N.syncPets(JSON.stringify(list));
      if (pet()) frames();
    } catch (e) { console.warn(e); }
  }
  const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const svgUrl = (svg, size) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', `<svg width="${size}" height="${size}" `));
  async function frames() {
    const N = window.AfterSchoolNative;
    const p = pet();
    if (!N || !N.setPetFrames || !p) return;
    const key = [Theme.id, p.species, JSON.stringify(p.wear || {}), stage(p), 4].join('|');
    try { if (localStorage.getItem('afterschool.frames.' + Store.currentId()) === key) return; } catch (e) {}
    const S = 192;
    const face = { idle: ['idle', 'blink'], happy: ['happy', 'idle'], hungry: ['sad', 'eat'], dirty: ['sad', 'sad'], bored: ['sad', 'blink'], sleep: ['sleep', 'sleep'] };
    const accs = wornIds(p);
    const petSrc = async m => isPony() ? loadImg(svgUrl(ponyPet(p.species, accs), 300)) : loadImg(pixelPet(p.species, m, accs));
    const food = await loadImg(svgUrl(foodIcon(FOOD[Theme.id][0][0]).replace(/class="[^"]*"/, ''), 64)).catch(() => null);
    const out = {};
    for (const k of Object.keys(face)) {
      out[k] = [];
      for (let f = 0; f < 2; f++) {
        const cv = document.createElement('canvas'); cv.width = cv.height = S;
        const c = cv.getContext('2d');
        c.imageSmoothingEnabled = isPony();
        const img = await petSrc(face[k][f]);
        let dy = 0, rot = 0, sx = 1, sy = 1;
        if (k === 'happy' && f === 1) dy = -12;
        if (k === 'idle' && f === 1) { sx = 1.03; sy = .97; }
        if (k === 'hungry' && f === 1) rot = -.04;
        if (k === 'bored') rot = f ? .03 : -.03;
        if (k === 'sleep') { sx = f ? 1.02 : 1; sy = f ? .98 : 1; }
        const size = 150;
        c.save();
        c.translate(S / 2, S - 14 + dy); c.rotate(rot); c.scale(sx, sy);
        c.drawImage(img, -size / 2, -size, size, size);
        c.restore();
        c.font = 'bold 30px Pixel, Kawaii, sans-serif'; c.textAlign = 'center';
        if (k === 'sleep') { c.fillStyle = '#6a5cb8'; c.strokeStyle = '#fff'; c.lineWidth = 4; const z = f ? [[150, 36, 30], [170, 18, 22]] : [[140, 48, 24], [160, 28, 30]]; z.forEach(([x, y, s]) => { c.font = `bold ${s}px sans-serif`; c.strokeText('Z', x, y); c.fillText('Z', x, y); }); }
        if (k === 'hungry' || k === 'bored') {
          c.fillStyle = '#fff'; c.strokeStyle = '#2b1d12'; c.lineWidth = 3;
          [[150, 48, 28], [118, 82, 7], [108, 94, 4]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y - (f ? 4 : 0), r, 0, 7); c.fill(); c.stroke(); });
          if (k === 'hungry' && food) c.drawImage(food, 128, 26 - (f ? 4 : 0), 44, 44);
          if (k === 'bored') { c.fillStyle = '#ff8fb1'; c.beginPath(); c.arc(150, 44 - (f ? 4 : 0), 14, 0, 7); c.fill(); c.fillStyle = '#7ec8f5'; c.beginPath(); c.ellipse(70, 110 + f * 8, 5, 8, 0, 0, 7); c.fill(); }
        }
        if (k === 'dirty') {
          c.strokeStyle = '#7bbf4a'; c.lineWidth = 4;
          for (let i = 0; i < 3; i++) { c.beginPath(); const x = 60 + i * 36; for (let y = 0; y < 34; y++) c.lineTo(x + Math.sin((y + f * 8) / 5) * 6, 70 - y - f * 6); c.stroke(); }
          c.fillStyle = 'rgba(107,74,42,.75)'; [[80, 140], [116, 128], [100, 156]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill(); });
        }
        if (k === 'happy' && f === 1) { c.fillStyle = '#ff5c8a'; c.font = 'bold 26px sans-serif'; c.fillText('♥', 40, 50); c.fillText('♥', 160, 40); }
        out[k].push(cv.toDataURL('image/png').split(',')[1]);
      }
    }
    N.setPetFrames(JSON.stringify(out));
    try { localStorage.setItem('afterschool.frames.' + Store.currentId(), key); } catch (e) {}
  }

  window.Pet = { widget, starIcon, tick, sync, need };
})();
