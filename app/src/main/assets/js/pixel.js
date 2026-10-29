/* Pixel-art sprites (SVG from character maps) and procedural block textures. All art is original. */
(function () {
  const PAL = {
    k: '#2b1d12', w: '#ffffff', e: '#d9d9d9', s: '#9a9a9a', S: '#6b6b6b',
    g: '#5faa3c', G: '#3f7f27', l: '#8fdc5c', d: '#86603f', D: '#5f4029',
    y: '#f5c542', Y: '#c8921c', a: '#ffe58a', o: '#ff9d2e', c: '#4fe3d8', C: '#1fa59b',
    b: '#b07a45', B: '#7c522a', r: '#e5533d', R: '#a3321f', p: '#ff8fb1',
    n: '#3d7be5', N: '#2552a8', m: '#9b59d0', E: '#ffffff', P: '#1a120b'
  };

  const SPRITES = {
    gem: [
      '...kkkkk...', '..kwcccCk..', '.kwccccCCk.', 'kkkkkkkkkkk', 'kwcccccccCk',
      '.kwcccccCk.', '..kccccCk..', '...kcccCk..', '....kcCk...', '.....kk....'],
    star: [
      '.....k.....', '....kyk....', '....kyk....', 'kkkkyyykkkk', 'kyaayyyyyYk',
      '.kyyyyyyYk.', '..kyyyyYk..', '..kyykyYk..', '.kyYk.kYYk.', '.kYk...kYk.', '.kk.....kk.'],
    heart: [
      '.kk...kk.', 'krrk.krrk', 'krwrkrrRk', 'krrrrrrRk', '.krrrrRk.', '..krrRk..', '...krk...', '....k....'],
    pickaxe: [
      '..kkkkkk....', '.kceeeccCk..', 'kcCkkkkkcCk.', 'kCk...kbkkCk', 'kk...kbBk.kk', '....kbBk....',
      '...kbBk.....', '..kbBk......', '.kbBk.......', 'kbBk........', 'kBk.........', '.k..........'],
    book: [
      '.kkkk..kkkk.', 'kwwwwkkwwwwk', 'kwSSwkkwSSwk', 'kwwwwkkwwwwk', 'kwSSwkkwSSwk',
      'kwwwwkkwwwwk', 'kwSSwkkwSSwk', 'kwwwwkkwwwwk', 'knnnnkknnnnk', '.kkkkkkkkkk.'],
    clock: [
      '....kkk....', '.....k.....', '...kkkkk...', '..kwwwwwk..', '.kwwwkwwwk.', 'kwwwwkwwwwk',
      'kwwwwkkkwwk', 'kwwwwwwwwwk', '.kwwwwwwwk.', '..kwwwwwk..', '...kkkkk...'],
    mic: [
      '..kkkkk..', '.keeeeek.', '.keSeSek.', '.keeeeek.', '.keSeSek.', '.keeeeek.',
      'k.kkkkk.k', 'k.......k', '.k.....k.', '..kkkkk..', '....k....', '..kkkkk..'],
    camera: [
      '...kkkk.....', 'kkkkSSkkkkkk', 'kSSSSSSSSyyk', 'kSSkkkkSSSSk', 'kSkwnnwkSSSk',
      'kSknNnnkSSSk', 'kSkwnnwkSSSk', 'kSSkkkkSSSSk', 'kkkkkkkkkkkk'],
    image: [
      'kkkkkkkkkkkk', 'kccccccccyyk', 'kccccccccyyk', 'kcccccccccck', 'kcccgcccccck',
      'kccgggcccgck', 'kcgggggcgggk', 'kggggggggggk', 'kkkkkkkkkkkk'],
    speaker: [
      '.....kk.....', '....kwk...k.', 'kkkkkwk.k..k', 'kwwwwwk..k.k', 'kwwwwwk..k.k',
      'kwwwwwk..k.k', 'kkkkkwk.k..k', '....kwk...k.', '.....kk.....'],
    chest: [
      '.kkkkkkkkkk.', 'kbbbbbbbbbbk', 'kbBBBBBBBBbk', 'kkkkkyykkkkk', 'kbbbbyYbbbbk',
      'kbbbbkkbbbbk', 'kbbbbbbbbbbk', 'kbBBBBBBBBbk', 'kkkkkkkkkkkk'],
    lock: [
      '...kkkk...', '..kSSSSk..', '..kk..kk..', '..k....k..', '.kkkkkkkk.', '.kyyyyyyk.',
      '.kyykkyyk.', '.kyykkyyk.', '.kyyykyyk.', '.kYYYYYYk.', '.kkkkkkkk.'],
    back: [
      '....k.....', '...kwk....', '..kwwkkkk.', '.kwwwwwwwk', 'kwwwwwwwwk',
      '.kwwwwwwwk', '..kwwkkkk.', '...kwk....', '....k.....'],
    play: ['kk.....', 'kwk....', 'kwwk...', 'kwwwk..', 'kwwwwk.', 'kwwwwwk', 'kwwwwk.', 'kwwwk..', 'kwwk...', 'kwk....', 'kk.....'],
    stop: ['kkkkkkkk', 'kwwwwwwk', 'kwwwwwwk', 'kwwwwwwk', 'kwwwwwwk', 'kwwwwwwk', 'kwwwwwwk', 'kkkkkkkk'],
    check: [
      '.........kk', '........kgk', '.......kggk', 'kk....kggk.', 'kgk..kggk..',
      'kggkkggk...', '.kggggk....', '..kggk.....', '...kk......'],
    cross: ['kk....kk', 'krk..krk', '.krkkrk.', '..krrk..', '..krrk..', '.krkkrk.', 'krk..krk', 'kk....kk'],
    plus: ['...kk...', '...kk...', '...kk...', 'kkkkkkkk', 'kkkkkkkk', '...kk...', '...kk...', '...kk...'],
    pencil: [
      '.......kk.', '......krrk', '.....kyykk', '....kyyyk.', '...kyyyk..', '..kyyyk...',
      '.kyyyk....', 'kdyyk.....', 'kddk......', 'kkk.......'],
    trash: ['..kkkk..', 'kkkkkkkk', '.kSSSSk.', '.kSkSkk.', '.kSkSkk.', '.kSkSkk.', '.kSSSSk.', '..kkkk..'],
    sword: [
      '.........kk', '........kek', '.......keSk', '......keSk.', '.k...keSk..', '.kk.keSk...',
      '..kkeSk....', '..kbkk.....', '.kbBk.k....', 'kbBk.......', 'kkk........'],
    fire: ['...k....', '..kok...', '..koyk..', '.koyyk.k', '.koyyokok', 'koyaayok', 'koyaayok', '.koyyok.', '..kkkk..'].map(r => (r + '........').slice(0, 9)),
    trophy: [
      'kkkkkkkkkk', 'kyaayyyyYk', 'kyayyyyyYk', '.kyyyyyYk.', '..kyyyYk..', '...kyYk...', '....kk....', '...kyYk...', '..kkkkkk..'],
    ruler: ['kkkkkkkkkkkk', 'kakakakakaak', 'kaaaaaaaaaak', 'kyyyyyyyyyyk', 'kkkkkkkkkkkk'],
    eye: ['...kkkk...', '.kkwwwwkk.', 'kwwwkkwwwk', 'kwwkPPkwwk', 'kwwwkkwwwk', '.kkwwwwkk.', '...kkkk...'],
    turtle: ['....kkk.....', '...kgGgk.kk.', '..kgGgGgkgwk', '.kgGgGgGkggk', 'kkkkkkkkkkk.', '.kgk..kgk...'],
    rabbit: ['.kk.kk....', '.kwkkwk...', '.kwkkwk...', '.kwwwwk...', 'kwwPwwwk..', 'kwwwwwwkkk', '.kwwwwwwwk', '.kwkkkwwk.', '.kk..kkk..'],
    dice: ['kkkkkkkkk', 'kwwwwwwwk', 'kwPwwwPwk', 'kwwwwwwwk', 'kwwwPwwwk', 'kwwwwwwwk', 'kwPwwwPwk', 'kwwwwwwwk', 'kkkkkkkkk'],
    brain: ['..kkkkkk..', '.kppkppppk.', 'kppkpppkppk', 'kpppkpkpppk', 'kppkpppkppk', '.kpppkpppk.', '..kkkkkkk..'].map(r => (r + '...........').slice(0, 11)),
    letters: ['kkkkk.kkkkk', 'kwkwk.kwwwk', 'kwwwk.kwkkk', 'kwkwk.kwwwk', 'kkkkk.kkkkk'],
    rain: ['..k...k...', '.kck.kck..', '.kck.kck.k', '..k...k.kck', '....k...kck', '...kck...k.', '...kck.....', '....k......'].map(r => (r + '...........').slice(0, 11)),
    hole: ['kkkkkkkkkk', 'kwwkkwwwwk', 'kwwkkwwwwk', 'kwwwwwkkwk', 'kwwwwwkkwk', 'kkkkkkkkkk'],
    mascot: [
      '.kkkkkkkkkkkk.', 'kllglgllglglGk', 'kglgGglgglgGGk', 'kgGgdgGgdgGgdk', 'kddDdddddDdddk',
      'kdEEPddddEEPdk', 'kdEPPddddEPPdk', 'kdpddddddddpdk', 'kdddkddddkdddk', 'kddddkkkkddddk',
      'kDddddddddddDk', 'kDDDDDDDDDDDDk', '.kkkkkkkkkkkk.', '..kDk....kDk..', '..kkk....kkk..']
  };

  const cache = {};
  function svg(name, cls = '') {
    const key = name + '|' + cls;
    if (cache[key]) return cache[key];
    const rows = SPRITES[name];
    if (!rows) return '';
    const w = Math.max(...rows.map(r => r.length)), h = rows.length;
    let body = '', eyes = '';
    rows.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const ch = row[x];
        if (ch === '.' || !PAL[ch]) { x++; continue; }
        let x2 = x + 1;
        while (x2 < row.length && row[x2] === ch) x2++;
        const r = `<rect x="${x}" y="${y}" width="${x2 - x}" height="1" fill="${PAL[ch]}"/>`;
        if (ch === 'E' || ch === 'P') eyes += r; else body += r;
        x = x2;
      }
    });
    const out = `<svg class="${cls}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" preserveAspectRatio="xMidYMid meet">${body}${eyes ? `<g class="eye">${eyes}</g>` : ''}</svg>`;
    cache[key] = out;
    return out;
  }

  /* ---------- Procedural 16x16 block textures ---------- */
  function rng(seed) {
    let s = 0;
    for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) | 0;
    return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

  const BLOCKS = {
    herbe:      { name: 'Herbe', cost: 0 },
    terre:      { name: 'Terre', cost: 0 },
    pierre:     { name: 'Pierre', cost: 0 },
    bois:       { name: 'Planches', cost: 10 },
    feuilles:   { name: 'Feuilles', cost: 12 },
    sable:      { name: 'Sable', cost: 12 },
    brique:     { name: 'Briques', cost: 20 },
    tronc:      { name: 'Tronc', cost: 20 },
    verre:      { name: 'Verre', cost: 25 },
    eau:        { name: 'Eau', cost: 25 },
    neige:      { name: 'Neige', cost: 30 },
    laine:      { name: 'Laine rose', cost: 30 },
    citrouille: { name: 'Citrouille', cost: 40 },
    champi:     { name: 'Champignon', cost: 45 },
    nuage:      { name: 'Nuage', cost: 50 },
    or:         { name: 'Or', cost: 70 },
    lave:       { name: 'Lave', cost: 80 },
    gemme:      { name: 'Gemmes', cost: 100 },
    violet:     { name: 'Cristal', cost: 120 },
    arcenciel:  { name: 'Arc-en-ciel', cost: 200 }
  };

  const texCache = {};
  function texture(type) {
    if (texCache[type]) return texCache[type];
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const x = c.getContext('2d');
    const r = rng(type);
    const px = (i, j, col) => { x.fillStyle = col; x.fillRect(i, j, 1, 1); };
    const fillNoise = (cols) => { for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) px(i, j, pick(r, cols)); };
    switch (type) {
      case 'herbe': {
        fillNoise(['#86603f', '#79563a', '#956c49', '#6b4b31']);
        for (let i = 0; i < 16; i++) { const h = 3 + Math.floor(r() * 3); for (let j = 0; j < h; j++) px(i, j, pick(r, ['#5faa3c', '#6cbc44', '#4f9832'])); }
        break;
      }
      case 'terre': fillNoise(['#86603f', '#79563a', '#956c49', '#6b4b31']); break;
      case 'pierre': fillNoise(['#9a9a9a', '#8c8c8c', '#a8a8a8', '#7d7d7d', '#9a9a9a']); break;
      case 'bois': {
        for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) px(i, j, pick(r, ['#b07a45', '#a5713f', '#bb8550']));
        for (let i = 0; i < 16; i++) { px(i, 3, '#7c522a'); px(i, 7, '#7c522a'); px(i, 11, '#7c522a'); px(i, 15, '#7c522a'); }
        [[5, 0], [12, 4], [3, 8], [10, 12]].forEach(([i, j]) => { for (let k = 0; k < 3; k++) px(i, j + k, '#7c522a'); });
        break;
      }
      case 'tronc': {
        for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) px(i, j, (i % 4 === 0 || r() < .15) ? '#4f3520' : pick(r, ['#6b4a2c', '#7a5634']));
        break;
      }
      case 'feuilles': fillNoise(['#3f8f2c', '#4fa83a', '#2f7020', '#5fbf46', '#3f8f2c']); break;
      case 'sable': fillNoise(['#e8d79a', '#dccb8b', '#f1e2a9', '#d6c483']); break;
      case 'brique': {
        fillNoise(['#a9442f', '#b84f37', '#9c3c28']);
        for (let j = 0; j < 16; j += 4) for (let i = 0; i < 16; i++) px(i, j + 3, '#d8c8b8');
        for (let j = 0; j < 16; j += 4) { const off = (j / 4) % 2 ? 4 : 0; for (let i = off; i < 16; i += 8) for (let k = 0; k < 3; k++) px(i, j + k, '#d8c8b8'); }
        break;
      }
      case 'verre': {
        for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) px(i, j, 'rgba(200,240,255,.35)');
        for (let i = 0; i < 16; i++) { px(i, 0, '#e8fbff'); px(i, 15, '#e8fbff'); px(0, i, '#e8fbff'); px(15, i, '#e8fbff'); }
        px(3, 3, '#fff'); px(4, 4, '#fff'); px(4, 3, '#fff'); px(11, 10, '#fff'); px(12, 11, '#fff');
        break;
      }
      case 'eau': fillNoise(['#3d7be5', '#4a88f0', '#336ed2', '#5a95f5']); break;
      case 'neige': fillNoise(['#ffffff', '#f0f6ff', '#e4eefb']); break;
      case 'laine': fillNoise(['#ff8fb1', '#f57fa3', '#ffa0be']); break;
      case 'citrouille': {
        for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) px(i, j, (i % 5 === 0) ? '#c86a10' : pick(r, ['#ff9d2e', '#f39122']));
        for (let i = 6; i < 10; i++) { px(i, 0, '#3f7f27'); px(i, 1, '#3f7f27'); }
        break;
      }
      case 'champi': {
        fillNoise(['#e5533d', '#d94a35', '#ee5f48']);
        [[3, 3], [10, 2], [6, 8], [12, 10], [2, 11]].forEach(([i, j]) => { px(i, j, '#fff'); px(i + 1, j, '#fff'); px(i, j + 1, '#fff'); px(i + 1, j + 1, '#fff'); });
        break;
      }
      case 'nuage': fillNoise(['#ffffff', '#f4f9ff', '#ffffff', '#e9f3ff']); break;
      case 'or': {
        fillNoise(['#f5c542', '#ffd65e', '#e8b733']);
        for (let i = 0; i < 16; i++) { px(i, 0, '#ffe9a0'); px(0, i, '#ffe9a0'); px(i, 15, '#c8921c'); px(15, i, '#c8921c'); }
        break;
      }
      case 'lave': fillNoise(['#ff6a00', '#ff8c1a', '#ffb02e', '#e04e00', '#ff6a00']); break;
      case 'gemme': {
        fillNoise(['#4fe3d8', '#62efe5', '#3fd0c6']);
        for (let i = 0; i < 16; i++) { px(i, 0, '#b5fff9'); px(0, i, '#b5fff9'); px(i, 15, '#1fa59b'); px(15, i, '#1fa59b'); }
        break;
      }
      case 'violet': fillNoise(['#9b59d0', '#b06fe5', '#8447b8', '#c48bf0']); break;
      case 'arcenciel': {
        const cols = ['#e5533d', '#ff9d2e', '#f5c542', '#5faa3c', '#3d7be5', '#9b59d0'];
        for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) px(i, j, cols[Math.floor(j / 16 * 6)]);
        break;
      }
      default: fillNoise(['#9a9a9a']);
    }
    texCache[type] = c.toDataURL();
    return texCache[type];
  }

  window.Pixel = { svg, texture, BLOCKS, SPRITES };
})();
