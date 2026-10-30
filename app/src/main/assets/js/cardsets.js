/* Second card collection of each theme: vehicles (pixel art) and equestrian gear (kawaii). */
(function () {
  const R = (n, k) => ({ n, k });

  /* =========================================================
     PIXEL : VÉHICULES
     ========================================================= */
  Object.assign(Pixel.SPRITES, {
    el_route: ['...kkkk...', '..kwwwwk..', '.kkkkkkkk.', 'kbbbbbbbbk', 'kybbbbbbrk', 'kkkkkkkkkk', '.kSk..kSk.', '..k....k..'].map(r => r.replace(/b/g, 'r').replace(/y/g, 'y')),
    el_chantier: ['....k.....', '...kyk....', '...kyk....', '..kwwwk...', '..kyyyk...', '.kwwwwwk..', '.kyyyyyk..', 'kkkkkkkkk.'],
    el_rail: ['.kkkkkkk..', '.knwnnwnk.', '.knnnnnnk.', '.knnnnnnk.', '.kyknnkyk.', '.kkkkkkkk.', '..kk..kk..', 'kkkkkkkkkk'],
    el_mer: ['....k.....', '...kwk....', '...kwwk...', '...kwwwk..', '...k......', 'kkkkkkkkk.', '.kbbbbbk..', '..kkkkk...'].map(r => r.replace(/b/g, 'n')),
    el_ciel: ['....k.....', '...kwk....', 'k..kwk..k.', 'kkkkwkkkk.', 'kwwwwwwwk.', '.kkkwkkk..', '...kwk....', '..kkkkk...'],
    el_espace: ['....k....', '...kwk...', '..kwwwk..', '..kwnwk..', '..kwwwk..', '.kkwwwkk.', 'kk.kok.kk', '...kyk...'],
    el_course: ['kkkkkkkk', 'kwkwkwkk', 'kkwkwkwk', 'kwkwkwkk', 'kkkkkkkk', 'k.......', 'k.......', 'k.......'],
    el_secours: ['..kkkk..', '.krrnnk.', 'kkkkkkkk', 'kwwwwwwk', 'kwwrwwwk', 'kwrrrwwk', 'kwwrwwwk', 'kkkkkkkk']
  });

  const VEH = {
    EL: {
      route:    { name: 'Route', frame: '#e5533d', frame2: '#a3321f', bg: '#ffe6df', h: [0, 360], s: 70, l: 52,
                  atk: ['Klaxon', 'Petit tour', 'Marche arrière', 'Créneau'], txt: ['Il connaît toutes les routes.', 'Il adore les embouteillages… non, pas vraiment !', 'Il fait vroum vroum.'] },
      chantier: { name: 'Chantier', frame: '#f5c542', frame2: '#c8921c', bg: '#fff6d6', h: [42, 50], s: 90, l: 55,
                  atk: ['Gros trou', 'Pelleteuse', 'Bulldozer', 'Béton'], txt: ['Il construit des maisons.', 'Il creuse plus vite que dix taupes.', 'Il ne se lave jamais.'] },
      rail:     { name: 'Rail', frame: '#3d7be5', frame2: '#2552a8', bg: '#e3edff', h: [200, 240], s: 55, l: 50,
                  atk: ['Tchou-tchou', 'Grand voyage', 'Tunnel', 'Aiguillage'], txt: ['Il est toujours à l\'heure.', 'Il fait le tour du pays.', 'Il aime les ponts.'] },
      mer:      { name: 'Mer', frame: '#36c9bf', frame2: '#1fa59b', bg: '#e0fbf8', h: [180, 220], s: 60, l: 50,
                  atk: ['Grosse vague', 'Jeter l\'ancre', 'Plongée', 'Corne de brume'], txt: ['Il n\'a jamais le mal de mer.', 'Il parle aux dauphins.', 'Il navigue jour et nuit.'] },
      ciel:     { name: 'Ciel', frame: '#7ec8f5', frame2: '#3d8fc0', bg: '#eaf6ff', h: [190, 360], s: 65, l: 58,
                  atk: ['Décollage', 'Looping', 'Atterrissage', 'Vol plané'], txt: ['Il chatouille les nuages.', 'Il voit tout d\'en haut.', 'Il fait la course avec les oiseaux.'] },
      espace:   { name: 'Espace', frame: '#9b59d0', frame2: '#6b3398', bg: '#eee4fa', h: [250, 320], s: 45, l: 55,
                  atk: ['Compte à rebours', 'Orbite', 'Hyper-vitesse', 'Alunissage'], txt: ['Il est allé sur la Lune.', 'Il compte les étoiles.', 'Il n\'a pas besoin de route.'] },
      course:   { name: 'Course', frame: '#5faa3c', frame2: '#3f7f27', bg: '#e9f7df', h: [0, 360], s: 80, l: 50,
                  atk: ['Turbo', 'Dérapage', 'Ligne droite', 'Sprint final'], txt: ['Il ne s\'arrête jamais.', 'Il a gagné plein de coupes.', 'Il va super vite.'] },
      secours:  { name: 'Secours', frame: '#ff8a72', frame2: '#d0402a', bg: '#fff0ec', h: [0, 8], s: 75, l: 50,
                  atk: ['Sirène', 'Sauvetage', 'Gyrophare', 'Grande échelle'], txt: ['Il arrive toujours à temps.', 'Il aide tout le monde.', 'Il fait pin-pon !'] }
    },
    NAMES: {
      route: [R('Titine', 'car'), R('Fourgonnette', 'van'), R('Taxi Jaune', 'taxi'), R('Minibus', 'bus'), R('Petite Jeep', 'jeep'), R('Cabriolet', 'sport'),
              R('Bus Scolaire', 'bus'), R('Camping-Car', 'van'), R('Limousine', 'limo'), R('Super Coupé', 'sport'), R('Voiture Électrique', 'car'), R('Méga-Limousine', 'limo')],
      chantier: [R('Pelleteuse', 'excavator'), R('Bulldozer', 'bulldozer'), R('Benne', 'dump'), R('Tracteur', 'tractor'), R('Bétonnière', 'mixer'), R('Rouleau', 'roller'),
                 R('Grue', 'crane'), R('Chargeuse', 'bulldozer'), R('Camion-Benne', 'dump'), R('Moissonneuse', 'tractor'), R('Super Pelleteuse', 'excavator'), R('Méga-Grue', 'crane')],
      rail: [R('Locomotive', 'steam'), R('Petit Train', 'train'), R('Tramway', 'tram'), R('Métro', 'train'), R('Train Vapeur', 'steam'), R('Wagon Fret', 'train'),
             R('TGV', 'highspeed'), R('Monorail', 'tram'), R('Train de Nuit', 'train'), R('Express', 'highspeed'), R('Orient-Express', 'steam'), R('Train Fusée', 'highspeed')],
      mer: [R('Barque', 'boat'), R('Voilier', 'sail'), R('Pédalo', 'boat'), R('Hors-Bord', 'speedboat'), R('Remorqueur', 'boat'), R('Chalutier', 'boat'),
            R('Sous-Marin', 'sub'), R('Catamaran', 'sail'), R('Paquebot', 'liner'), R('Jet-Ski', 'speedboat'), R('Brise-Glace', 'liner'), R('Sous-Marin Géant', 'sub')],
      ciel: [R('Avionnette', 'plane'), R('Hélico', 'heli'), R('Montgolfière', 'balloon'), R('Planeur', 'plane'), R('Biplan', 'plane'), R('Dirigeable', 'blimp'),
             R('Hydravion', 'plane'), R('Jet', 'jet'), R('Hélico Rouge', 'heli'), R('Avion-Cargo', 'jet'), R('Supersonique', 'jet'), R('Montgolfière Royale', 'balloon')],
      espace: [R('Fusée', 'rocket'), R('Soucoupe', 'ufo'), R('Satellite', 'satellite'), R('Rover Lunaire', 'rover'), R('Capsule', 'rocket'), R('Petite Sonde', 'satellite'),
               R('Navette', 'rocket'), R('Ovni Vert', 'ufo'), R('Rover Martien', 'rover'), R('Station Spatiale', 'satellite'), R('Croiseur Galactique', 'ufo'), R('Méga-Fusée', 'rocket')],
      course: [R('Kart', 'kart'), R('Moto Cross', 'moto'), R('Rallye', 'car'), R('Scooter', 'moto'), R('Buggy', 'jeep'), R('Quad', 'kart'),
               R('Formule 1', 'racecar'), R('Dragster', 'racecar'), R('Monster Truck', 'monster'), R('Moto GP', 'moto'), R('Bolide', 'racecar'), R('Super Monster', 'monster')],
      secours: [R('Ambulance', 'ambulance'), R('Police', 'police'), R('Pompiers', 'fire'), R('Dépanneuse', 'tow'), R('Moto Police', 'moto'), R('Camion-Citerne', 'tank'),
                R('Chasse-Neige', 'bulldozer'), R('Grande Échelle', 'fire'), R('Hélico Secours', 'heli'), R('Bateau Sauveteur', 'speedboat'), R('Super Ambulance', 'ambulance'), R('Méga Pompiers', 'fire')]
    },
    LEGENDS: [[R('Fusée d\'Or', 'rocket'), 'espace'], [R('Locomotive d\'Or', 'steam'), 'rail'], [R('Bolide Royal', 'racecar'), 'course'], [R('Galion Doré', 'sail'), 'mer']],
    label: 'VIT', setName: 'Véhicules', legendTxt: 'Un véhicule de légende que très peu de pilotes ont vu.'
  };

  /* ---------- pixel vehicle drawing ---------- */
  function vehicleArt(card, rng) {
    const W = 32, H = 24;
    const r = rng('veh-' + card.name);
    const g = Array.from({ length: H }, () => new Array(W).fill(0));
    const P = (x, y, v) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = v; };
    const rect = (x, y, w, h, v) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) P(x + i, y + j, v); };
    const circ = (cx, cy, rr, v) => { for (let y = Math.floor(cy - rr - 1); y <= cy + rr + 1; y++) for (let x = Math.floor(cx - rr - 1); x <= cx + rr + 1; x++) if ((x + .5 - cx) ** 2 + (y + .5 - cy) ** 2 <= rr * rr) P(x, y, v); };
    const ell = (cx, cy, rx, ry, v) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1) P(x, y, v); };
    const poly = (pts, v) => {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let c = false; const X = x + .5, Y = y + .5;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if (((yi > Y) !== (yj > Y)) && (X < (xj - xi) * (Y - yi) / (yj - yi) + xi)) c = !c;
        }
        if (c) P(x, y, v);
      }
    };
    const line = (x0, y0, x1, y1, v) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) P(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, v); };
    const wheel = (cx, cy, rr = 3) => { circ(cx, cy, rr, 3); circ(cx, cy, Math.max(1, rr - 1.8), 4); };
    // codes: 1 body 2 window 3 tire 4 hub 5 light 6 accent 7 metal 8 red 11 white 12 blue 13 flame
    const k = card.k;
    switch (k) {
      case 'car': case 'taxi': case 'police': case 'sport': case 'limo': {
        if (k === 'sport') { poly([[2, 18], [2, 14], [10, 12], [14, 9], [21, 9], [25, 12], [30, 13], [30, 18]], 1); rect(15, 10, 6, 2, 2); rect(2, 11, 3, 1, 6); rect(3, 12, 1, 2, 6); rect(5, 15, 23, 1, 6); }
        else if (k === 'limo') { rect(1, 12, 30, 6, 1); rect(6, 8, 20, 4, 1); [7, 12, 17, 22].forEach(x => rect(x, 9, 3, 2, 2)); }
        else { rect(3, 12, 26, 6, 1); poly([[8, 12], [11, 7], [21, 7], [24, 12]], 1); rect(11, 8, 4, 3, 2); rect(17, 8, 4, 3, 2); }
        if (k === 'taxi') { rect(14, 5, 4, 2, 5); }
        if (k === 'police') { rect(13, 5, 3, 2, 8); rect(16, 5, 3, 2, 12); rect(4, 14, 24, 1, 11); }
        P(29, 13, 5); P(29, 14, 5); P(2, 13, 8);
        wheel(8, 18); wheel(24, 18);
        break;
      }
      case 'van': case 'ambulance': {
        rect(3, 7, 26, 11, 1); rect(23, 8, 5, 4, 2); rect(5, 8, 4, 3, 2); rect(11, 8, 4, 3, 2);
        if (k === 'ambulance') { rect(14, 11, 6, 2, 8); rect(16, 9, 2, 6, 8); rect(12, 5, 4, 2, 12); rect(3, 15, 26, 1, 8); }
        P(28, 14, 5); wheel(8, 18); wheel(24, 18);
        break;
      }
      case 'bus': {
        rect(2, 5, 28, 13, 1); for (let x = 4; x < 26; x += 5) rect(x, 7, 4, 4, 2); rect(26, 7, 3, 6, 2); rect(2, 13, 28, 1, 6);
        P(29, 15, 5); wheel(7, 18); wheel(25, 18);
        break;
      }
      case 'jeep': case 'monster': {
        const big = k === 'monster' ? 5 : 3.6, y0 = k === 'monster' ? 9 : 11;
        rect(4, y0, 24, 6, 1); rect(10, y0 - 5, 1, 5, 7); rect(21, y0 - 5, 1, 5, 7); rect(10, y0 - 5, 12, 1, 7); rect(22, y0 - 4, 5, 3, 2);
        P(27, y0 + 1, 5); rect(4, y0 + 3, 24, 1, 6);
        wheel(9, 24 - big - 1, big); wheel(23, 24 - big - 1, big);
        break;
      }
      case 'fire': case 'tow': case 'tank': case 'dump': case 'mixer': {
        rect(22, 8, 8, 10, 1); rect(24, 9, 5, 4, 2); P(29, 15, 5);
        if (k === 'fire') { rect(2, 9, 20, 9, 1); rect(3, 6, 18, 1, 7); for (let x = 4; x < 21; x += 3) rect(x, 5, 1, 2, 7); rect(23, 6, 3, 2, 12); rect(2, 14, 28, 1, 11); }
        if (k === 'tow') { rect(2, 13, 20, 5, 1); line(6, 13, 14, 5, 7); line(14, 5, 16, 5, 7); line(16, 5, 16, 9, 7); P(16, 10, 7); P(15, 10, 7); rect(23, 6, 4, 2, 5); }
        if (k === 'tank') { ell(11, 12, 10, 5, 6); rect(2, 16, 20, 2, 7); }
        if (k === 'dump') { poly([[1, 6], [21, 9], [21, 17], [4, 17]], 6); rect(2, 16, 20, 2, 7); }
        if (k === 'mixer') { ell(11, 11, 9, 6, 6); line(4, 8, 17, 15, 7); line(6, 6, 19, 13, 7); rect(2, 16, 20, 2, 7); }
        wheel(7, 19); wheel(17, 19); wheel(26, 19);
        break;
      }
      case 'excavator': case 'bulldozer': case 'roller': case 'crane': {
        rect(3, 17, 20, 5, 3); [6, 11, 16, 20].forEach(x => circ(x, 19.5, 1.2, 4));
        rect(5, 11, 15, 6, 1); rect(12, 5, 7, 7, 1); rect(13, 6, 5, 4, 2);
        if (k === 'excavator') { line(19, 10, 25, 4, 6); line(19, 11, 26, 5, 6); line(25, 4, 29, 9, 6); line(26, 5, 30, 10, 6); poly([[27, 10], [31, 10], [31, 14], [28, 13]], 7); }
        if (k === 'bulldozer') { rect(24, 10, 3, 11, 7); line(20, 15, 24, 15, 7); }
        if (k === 'roller') { circ(27, 18, 4, 7); rect(20, 13, 6, 2, 1); }
        if (k === 'crane') { for (let i = 0; i < 12; i++) { P(17 + i, 4 - Math.floor(i / 4), 6); P(17 + i, 5 - Math.floor(i / 4), 6); } line(28, 2, 28, 12, 7); rect(27, 12, 3, 2, 7); }
        P(5, 10, 7); P(5, 9, 7);
        break;
      }
      case 'tractor': {
        circ(9, 16, 6, 3); circ(9, 16, 3, 4); wheel(25, 19, 3);
        rect(14, 11, 14, 5, 1); rect(6, 4, 8, 8, 1); rect(7, 5, 6, 4, 2); rect(24, 6, 1, 5, 7); P(28, 12, 5);
        break;
      }
      case 'steam': case 'train': case 'highspeed': case 'tram': {
        if (k === 'steam') { rect(10, 9, 17, 8, 1); rect(3, 5, 9, 12, 1); rect(5, 7, 5, 4, 2); rect(21, 3, 3, 6, 7); rect(20, 2, 5, 1, 7); poly([[27, 13], [31, 18], [27, 18]], 7); rect(10, 12, 17, 1, 6); P(27, 10, 5); }
        else if (k === 'highspeed') { poly([[1, 17], [1, 8], [20, 8], [31, 15], [31, 17]], 1); for (let x = 3; x < 19; x += 4) rect(x, 10, 3, 2, 2); poly([[21, 9], [26, 12], [21, 12]], 2); rect(1, 14, 29, 1, 6); }
        else { rect(2, 7, 28, 10, 1); for (let x = 4; x < 27; x += 5) rect(x, 9, 3, 3, 2); rect(2, 14, 28, 1, 6); P(29, 15, 5); if (k === 'tram') { line(12, 7, 15, 3, 7); line(18, 7, 15, 3, 7); rect(11, 2, 9, 1, 7); } }
        [7, 13, 20, 26].forEach(x => wheel(x, 19, 2.4));
        rect(0, 22, 32, 1, 7);
        break;
      }
      case 'boat': case 'sail': case 'liner': case 'speedboat': {
        if (k === 'liner') { poly([[1, 13], [31, 13], [28, 20], [4, 20]], 1); rect(5, 8, 20, 5, 11); for (let x = 6; x < 24; x += 3) P(x, 10, 2); rect(9, 3, 3, 5, 8); rect(16, 3, 3, 5, 8); }
        else if (k === 'speedboat') { poly([[2, 15], [31, 15], [27, 19], [5, 19]], 1); poly([[13, 15], [16, 11], [21, 11], [22, 15]], 2); rect(2, 16, 25, 1, 6); }
        else { poly([[3, 14], [29, 14], [25, 19], [7, 19]], 1); rect(4, 16, 22, 1, 6); }
        if (k === 'sail') { rect(15, 2, 1, 12, 7); poly([[16, 3], [26, 12], [16, 12]], 11); poly([[14, 4], [14, 12], [7, 12]], 11); P(15, 1, 8); }
        if (k === 'boat') { rect(12, 10, 8, 4, 11); rect(14, 11, 4, 2, 2); rect(17, 6, 1, 4, 7); }
        for (let x = 0; x < 32; x++) P(x, 21 + (x % 4 === 0 ? 0 : 1), 12);
        break;
      }
      case 'sub': {
        ell(16, 14, 14, 5, 1); rect(13, 6, 6, 5, 1); rect(16, 3, 1, 3, 7); rect(16, 3, 3, 1, 7); [9, 15, 21].forEach(x => circ(x, 14, 1.6, 2)); poly([[2, 10], [5, 14], [2, 18]], 6);
        break;
      }
      case 'plane': case 'jet': {
        if (k === 'jet') { poly([[2, 12], [24, 10], [31, 12], [24, 14], [2, 14]], 1); poly([[12, 12], [18, 12], [10, 21], [7, 21]], 6); poly([[3, 12], [7, 12], [4, 5], [2, 5]], 6); poly([[25, 10], [29, 11], [25, 12]], 2); }
        else { rect(3, 10, 24, 5, 1); poly([[27, 10], [31, 12], [27, 15]], 1); rect(8, 12, 12, 1, 2); poly([[11, 12], [17, 12], [14, 20], [11, 20]], 6); poly([[3, 10], [7, 10], [5, 4], [3, 4]], 6); circ(29.5, 12.5, 1.2, 7); line(31, 9, 31, 16, 7); }
        break;
      }
      case 'heli': {
        ell(17, 13, 8, 5, 1); rect(3, 11, 10, 3, 1); rect(2, 8, 2, 6, 6); circ(21, 12, 2.6, 2); rect(15, 6, 2, 3, 7); rect(5, 5, 24, 1, 7); rect(10, 19, 16, 1, 7); rect(13, 17, 1, 2, 7); rect(21, 17, 1, 2, 7);
        break;
      }
      case 'balloon': {
        ell(16, 9, 10, 9, 1); for (let x = 9; x < 24; x += 5) rect(x, 1, 2, 16, 6); line(9, 15, 13, 19, 7); line(23, 15, 19, 19, 7); rect(13, 19, 6, 4, 6);
        break;
      }
      case 'blimp': {
        ell(16, 10, 14, 6, 1); rect(4, 9, 24, 1, 6); poly([[2, 5], [6, 9], [2, 14]], 6); rect(12, 16, 8, 3, 6); rect(13, 17, 2, 1, 2); rect(17, 17, 2, 1, 2);
        break;
      }
      case 'rocket': {
        rect(13, 5, 7, 14, 1); poly([[13, 5], [16.5, 0], [20, 5]], 8); circ(16.5, 9, 2, 2); poly([[13, 13], [9, 19], [13, 19]], 6); poly([[20, 13], [24, 19], [20, 19]], 6); rect(15, 19, 3, 1, 7);
        rect(14, 20, 5, 1, 5); rect(15, 21, 3, 1, 13); P(16, 22, 5);
        break;
      }
      case 'ufo': {
        ell(16, 8, 6, 5, 2); ell(16, 13, 14, 4, 1); rect(3, 13, 26, 1, 6); [7, 12, 16, 20, 25].forEach(x => P(x, 15, 5)); line(10, 17, 8, 21, 5); line(22, 17, 24, 21, 5);
        break;
      }
      case 'satellite': {
        rect(13, 8, 6, 8, 1); rect(2, 10, 10, 4, 12); rect(20, 10, 10, 4, 12); for (let x = 4; x < 12; x += 3) rect(x, 10, 1, 4, 11); for (let x = 22; x < 30; x += 3) rect(x, 10, 1, 4, 11); rect(15, 4, 2, 4, 7); circ(16, 3, 2, 7); P(16, 17, 5);
        break;
      }
      case 'rover': {
        rect(6, 10, 20, 6, 1); rect(9, 6, 6, 4, 2); line(22, 10, 25, 4, 7); circ(25, 3, 1.6, 7); [7, 16, 25].forEach(x => wheel(x, 19, 2.8)); rect(6, 16, 20, 1, 7);
        break;
      }
      case 'kart': case 'racecar': {
        if (k === 'racecar') { poly([[1, 16], [3, 12], [22, 13], [31, 15], [31, 17], [1, 17]], 1); rect(13, 10, 5, 3, 2); rect(1, 9, 4, 2, 6); rect(2, 11, 1, 2, 7); rect(28, 15, 4, 2, 6); rect(4, 14, 24, 1, 6); wheel(7, 18, 3.4); wheel(25, 18, 3.4); }
        else { rect(6, 14, 20, 4, 1); rect(12, 10, 4, 4, 7); circ(15, 9, 2, 6); rect(24, 12, 2, 2, 7); wheel(8, 19, 3); wheel(24, 19, 3); }
        break;
      }
      case 'moto': {
        wheel(7, 18, 4); wheel(25, 18, 4); poly([[9, 17], [12, 11], [21, 11], [24, 17]], 1); rect(12, 9, 7, 2, 6); line(21, 11, 24, 6, 7); rect(23, 5, 3, 1, 7); P(25, 8, 5);
        break;
      }
      default: rect(4, 8, 24, 10, 1); wheel(9, 18); wheel(23, 18);
    }
    // extras by rarity
    const rank = { c: 0, pc: 1, r: 2, ur: 3, or: 4 }[card.rar];
    if (rank >= 2 && !['rocket', 'balloon', 'sail', 'boat', 'liner', 'sub', 'satellite', 'ufo', 'blimp'].includes(k)) { P(0, 14, 13); P(1, 14, 5); P(0, 15, 5); P(1, 13, 13); }
    if (rank >= 4) { [[2, 2], [29, 3], [27, 20]].forEach(([x, y]) => { P(x, y, 5); P(x + 1, y, 11); P(x - 1, y, 11); P(x, y + 1, 11); P(x, y - 1, 11); }); }
    // outline
    const o = g.map(row => row.slice());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (g[y][x]) continue;
      if ((g[y - 1] && g[y - 1][x] && g[y - 1][x] !== 12) || (g[y + 1] && g[y + 1][x] && g[y + 1][x] !== 12) || (g[y][x - 1] && g[y][x - 1] !== 12) || (g[y][x + 1] && g[y][x + 1] !== 12)) o[y][x] = 9;
    }
    const E = VEH.EL[card.el];
    let h = E.h[0] + r() * (E.h[1] - E.h[0]);
    let s = E.s, l = E.l;
    if (k === 'ambulance' || k === 'police') { s = 5; l = 92; }
    if (k === 'taxi') { h = 48; s = 90; l = 55; }
    if (k === 'fire') { h = 4; s = 80; l = 50; }
    const gold = rank >= 4;
    const body = gold ? '#f5c542' : `hsl(${h},${s}%,${l}%)`, dark = gold ? '#c8921c' : `hsl(${h},${s}%,${l - 15}%)`, light = gold ? '#fff2a8' : `hsl(${h},${s}%,${Math.min(95, l + 15)}%)`;
    const acc = gold ? '#ffffff' : `hsl(${(h + 180 + r() * 60) % 360},70%,${55 + r() * 10}%)`;
    const col = { 2: '#9fd8ff', 3: '#2b2b33', 4: '#b9b9c4', 5: '#ffe14d', 6: acc, 7: '#8c8c99', 8: '#e5533d', 9: '#2b1d12', 11: '#ffffff', 12: '#3d7be5', 13: '#ff8a1e' };
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = o[y][x];
      if (!v) continue;
      let c = col[v];
      if (v === 1) {
        const up = !(o[y - 1] && o[y - 1][x] && o[y - 1][x] !== 9);
        const down = !(o[y + 1] && o[y + 1][x] && o[y + 1][x] !== 9);
        c = up ? light : down ? dark : body;
      }
      if (v === 2 && (x + y) % 5 === 0) c = '#e6f6ff';
      ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1);
    }
    return cv.toDataURL();
  }

  /* =========================================================
     KAWAII : ÉQUIPEMENT ÉQUESTRE
     ========================================================= */
  const OL = '#6b4a5a';
  const S = `stroke="${OL}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  const face = (x, y, sc = 1) => `<g transform="translate(${x} ${y}) scale(${sc})"><ellipse cx="-7" cy="0" rx="2.6" ry="3.2" fill="#3b2541"/><ellipse cx="7" cy="0" rx="2.6" ry="3.2" fill="#3b2541"/><circle cx="-6.2" cy="-1.2" r="1" fill="#fff"/><circle cx="7.8" cy="-1.2" r="1" fill="#fff"/><path d="M-3 4 q3 3 6 0" fill="none" stroke="#3b2541" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="-11" cy="4" rx="3" ry="1.8" fill="#ff8fb1" opacity=".6"/><ellipse cx="11" cy="4" rx="3" ry="1.8" fill="#ff8fb1" opacity=".6"/></g>`;
  const shine = (x, y, w = 8, hgt = 4) => `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${hgt}" fill="#fff" opacity=".55" transform="rotate(-25 ${x} ${y})"/>`;
  const KAWAII = {
    horseshoe: c => `<path d="M28 82 C14 60 18 22 50 20 C82 22 86 60 72 82" fill="none" stroke="${OL}" stroke-width="22" stroke-linecap="round"/><path d="M28 82 C14 60 18 22 50 20 C82 22 86 60 72 82" fill="none" stroke="${c.a}" stroke-width="15" stroke-linecap="round"/>${[[25, 66], [22, 48], [30, 32], [75, 66], [78, 48], [70, 32]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="${c.b}"/>`).join('')}${face(50, 50, .9)}`,
    carrot: c => `<path d="M58 22 C64 10 76 10 74 20 C84 18 86 30 74 30" fill="#7bd389" ${S}/><path d="M60 26 C80 34 70 52 54 66 C40 78 22 86 18 82 C14 78 22 60 34 46 C44 34 50 22 60 26Z" fill="${c.a}" ${S}/><path d="M40 48l6 4M32 60l6 3M50 40l5 4" stroke="${c.b}" stroke-width="2.5" stroke-linecap="round"/>${face(44, 56, .85)}`,
    apple: c => `<path d="M50 30 C34 18 14 30 18 54 C22 78 40 88 50 82 C60 88 78 78 82 54 C86 30 66 18 50 30Z" fill="${c.a}" ${S}/><path d="M50 30 C50 22 52 16 56 12" fill="none" ${S}/><path d="M54 20 C62 10 74 14 72 22 C64 26 58 24 54 20Z" fill="#7bd389" ${S}/>${shine(32, 42)}${face(50, 58)}`,
    sugar: c => `<path d="M22 38 L50 26 L78 38 L78 70 L50 82 L22 70Z" fill="${c.a}" ${S}/><path d="M22 38 L50 50 L78 38 M50 50 L50 82" fill="none" ${S}/><path d="M26 40 L50 30 L74 40 L50 48Z" fill="#fff" opacity=".7"/>${face(36, 64, .6)}`,
    cookie: c => `<circle cx="50" cy="52" r="32" fill="${c.a}" ${S}/>${[[34, 36], [64, 38], [70, 62], [36, 70], [56, 72]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4" ry="3" fill="${c.b}"/>`).join('')}${face(50, 52)}`,
    candy: c => `<path d="M18 36 L32 46 L32 58 L18 68 Z M82 36 L68 46 L68 58 L82 68Z" fill="${c.b}" ${S}/><circle cx="50" cy="52" r="20" fill="${c.a}" ${S}/><path d="M38 40 Q50 52 62 64 M42 36 Q56 48 66 56" stroke="#fff" stroke-width="4" fill="none" opacity=".7"/>${face(50, 52, .8)}`,
    cupcake: c => `<path d="M26 54 L32 84 L68 84 L74 54Z" fill="${c.b}" ${S}/><path d="M36 56v26M50 56v26M64 56v26" stroke="${OL}" stroke-width="1.6" opacity=".4"/><path d="M22 56 C16 38 34 30 40 34 C42 20 60 20 62 32 C72 28 86 40 78 56Z" fill="${c.a}" ${S}/><circle cx="50" cy="22" r="6" fill="#e5533d" ${S}/>${face(50, 46, .8)}`,
    hay: c => `<rect x="16" y="30" width="68" height="50" rx="10" fill="${c.a}" ${S}/><path d="M16 46h68M16 64h68" stroke="${c.b}" stroke-width="5"/><path d="M30 30v50M70 30v50" stroke="#e5533d" stroke-width="5"/><path d="M22 30l-4-8M40 30l-2-9M60 30l2-9M78 30l4-8" stroke="${c.b}" stroke-width="3" stroke-linecap="round"/>${face(50, 55)}`,
    bucket: c => `<path d="M24 34 C34 18 66 18 76 34" fill="none" stroke="${OL}" stroke-width="5"/><path d="M20 36 L28 84 L72 84 L80 36Z" fill="${c.a}" ${S}/><ellipse cx="50" cy="36" rx="30" ry="7" fill="${c.b}" ${S}/>${shine(32, 50, 4, 8)}${face(50, 62)}`,
    wheelbarrow: c => `<path d="M14 40 L72 40 L62 66 L24 66Z" fill="${c.a}" ${S}/><path d="M72 46 L90 30" stroke="${OL}" stroke-width="5" stroke-linecap="round"/><path d="M30 66 L28 80M56 66 L62 72" stroke="${OL}" stroke-width="4"/><circle cx="66" cy="76" r="9" fill="${c.b}" ${S}/>${face(43, 52, .8)}`,
    fork: c => `<rect x="46" y="38" width="8" height="52" rx="4" fill="${c.b}" ${S}/><path d="M28 14 v22 q0 8 8 8 h28 q8 0 8-8 v-22" fill="none" stroke="${OL}" stroke-width="9" stroke-linecap="round"/><path d="M28 14 v22 q0 8 8 8 h28 q8 0 8-8 v-22 M50 14 v28" fill="none" stroke="${c.a}" stroke-width="5" stroke-linecap="round"/>${face(50, 66, .7)}`,
    lantern: c => `<path d="M40 18 h20 M50 10 v8" ${S}/><rect x="28" y="24" width="44" height="58" rx="10" fill="${c.a}" ${S}/><rect x="36" y="32" width="28" height="42" rx="6" fill="#fff6b0"/><circle cx="50" cy="53" r="12" fill="#ffd54f" opacity=".7"/>${face(50, 54, .7)}`,
    brush: c => `<rect x="18" y="30" width="64" height="30" rx="14" fill="${c.a}" ${S}/><path d="M24 60 v16 M32 60 v18 M40 60 v18 M48 60 v18 M56 60 v18 M64 60 v18 M72 60 v16" stroke="${c.b}" stroke-width="4" stroke-linecap="round"/>${shine(32, 38, 8, 3)}${face(50, 45, .85)}`,
    comb: c => `<rect x="16" y="28" width="68" height="22" rx="10" fill="${c.a}" ${S}/><path d="M24 50 v26 M33 50 v26 M42 50 v26 M51 50 v26 M60 50 v26 M69 50 v26 M77 50 v22" stroke="${OL}" stroke-width="6" stroke-linecap="round"/><path d="M24 50 v26 M33 50 v26 M42 50 v26 M51 50 v26 M60 50 v26 M69 50 v26 M77 50 v22" stroke="${c.b}" stroke-width="3" stroke-linecap="round"/>${face(50, 39, .75)}`,
    sponge: c => `<rect x="18" y="28" width="64" height="48" rx="16" fill="${c.a}" ${S}/>${[[30, 40], [68, 44], [34, 66], [66, 66], [50, 34]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="${c.b}"/>`).join('')}<circle cx="82" cy="24" r="6" fill="#cfeaff" ${S}/><circle cx="18" cy="20" r="4" fill="#cfeaff" ${S}/>${face(50, 54)}`,
    saddle: c => `<path d="M14 52 C20 30 36 36 50 40 C64 36 80 30 86 52 C76 60 24 60 14 52Z" fill="${c.a}" ${S}/><path d="M30 56 C30 70 36 76 44 76 L56 76 C64 76 70 70 70 56" fill="${c.b}" ${S}/><path d="M50 58 v28" stroke="${OL}" stroke-width="3"/><rect x="44" y="84" width="12" height="6" rx="3" fill="#ffd54f" ${S}/>${face(50, 46, .75)}`,
    halter: c => `<path d="M30 20 C14 40 20 76 50 82 C80 76 86 40 70 20" fill="none" stroke="${OL}" stroke-width="12" stroke-linecap="round"/><path d="M30 20 C14 40 20 76 50 82 C80 76 86 40 70 20" fill="none" stroke="${c.a}" stroke-width="7" stroke-linecap="round"/><path d="M22 52 h56" stroke="${OL}" stroke-width="12" stroke-linecap="round"/><path d="M22 52 h56" stroke="${c.b}" stroke-width="7" stroke-linecap="round"/><circle cx="22" cy="52" r="6" fill="#ffd54f" ${S}/><circle cx="78" cy="52" r="6" fill="#ffd54f" ${S}/>${face(50, 66, .65)}`,
    stirrup: c => `<rect x="44" y="8" width="12" height="24" rx="4" fill="${c.b}" ${S}/><path d="M50 30 C24 32 22 72 26 82 L74 82 C78 72 76 32 50 30Z" fill="none" stroke="${OL}" stroke-width="14"/><path d="M50 30 C24 32 22 72 26 82 L74 82 C78 72 76 32 50 30Z" fill="none" stroke="${c.a}" stroke-width="8"/><rect x="24" y="78" width="52" height="10" rx="5" fill="${c.a}" ${S}/>${face(50, 58, .7)}`,
    blanket: c => `<path d="M16 28 Q50 18 84 28 L80 80 Q50 88 20 80Z" fill="${c.a}" ${S}/><path d="M22 70 Q50 78 78 70" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="5 4"/>${[[32, 38], [66, 36], [72, 60], [28, 60]].map(([x, y]) => `<path d="M${x} ${y - 4} l1.3 2.7 3 .4-2.2 2 .5 3-2.6-1.4-2.6 1.4.5-3-2.2-2 3-.4z" fill="${c.b}"/>`).join('')}${face(50, 50)}`,
    helmet: c => `<path d="M16 62 C14 30 34 18 50 18 C66 18 86 30 84 62Z" fill="${c.a}" ${S}/><path d="M50 18 v44" stroke="${c.b}" stroke-width="4"/><path d="M80 60 L94 64 L82 70 L16 66 L16 62Z" fill="${c.b}" ${S}/><circle cx="50" cy="20" r="5" fill="${c.b}" ${S}/>${shine(30, 34)}${face(36, 46, .7)}`,
    boot: c => `<path d="M30 12 L62 12 L62 58 C78 58 88 66 88 80 L88 86 L30 86Z" fill="${c.a}" ${S}/><rect x="28" y="80" width="62" height="8" rx="3" fill="${OL}"/><path d="M30 22 h32" stroke="${c.b}" stroke-width="5"/>${shine(40, 36, 4, 9)}${face(46, 52, .75)}`,
    glove: c => `<path d="M28 86 L28 46 C28 40 36 40 36 46 L36 22 C36 16 44 16 44 22 L44 18 C44 12 52 12 52 18 L52 22 C52 16 60 16 60 22 L60 44 C64 34 76 38 72 48 L64 70 C62 80 58 86 50 86Z" fill="${c.a}" ${S}/><rect x="26" y="78" width="38" height="10" rx="4" fill="${c.b}" ${S}/>${face(45, 58, .7)}`,
    rosette: c => `<path d="M40 60 L30 92 L40 86 L46 94 L50 64 M60 60 L70 92 L60 86 L54 94 L50 64" fill="${c.b}" ${S}/>${[...Array(12)].map((_, i) => `<circle cx="${(50 + Math.cos(i * .5236) * 26).toFixed(1)}" cy="${(42 + Math.sin(i * .5236) * 26).toFixed(1)}" r="9" fill="${c.a}" ${S}/>`).join('')}<circle cx="50" cy="42" r="22" fill="${c.a}"/><circle cx="50" cy="42" r="17" fill="#fff6d6" ${S}/>${face(50, 44, .75)}`,
    trophy: c => `<path d="M30 20 C14 20 14 44 32 48 M70 20 C86 20 86 44 68 48" fill="none" stroke="${OL}" stroke-width="7"/><path d="M30 20 C14 20 14 44 32 48 M70 20 C86 20 86 44 68 48" fill="none" stroke="${c.a}" stroke-width="3"/><path d="M28 16 h44 v18 c0 18 -10 26 -22 26 c-12 0 -22 -8 -22 -26Z" fill="${c.a}" ${S}/><rect x="44" y="60" width="12" height="12" fill="${c.a}" ${S}/><rect x="30" y="72" width="40" height="14" rx="4" fill="${c.b}" ${S}/>${shine(38, 26, 4, 7)}${face(50, 36, .75)}`,
    medal: c => `<path d="M32 8 L44 44 L56 44 L68 8 L56 8 L50 26 L44 8Z" fill="${c.b}" ${S}/><circle cx="50" cy="62" r="24" fill="${c.a}" ${S}/><circle cx="50" cy="62" r="17" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/>${face(50, 63, .75)}`,
    jump: c => `<rect x="14" y="30" width="8" height="56" rx="3" fill="#fff" ${S}/><rect x="78" y="30" width="8" height="56" rx="3" fill="#fff" ${S}/><rect x="10" y="42" width="80" height="10" rx="4" fill="${c.a}" ${S}/><rect x="10" y="62" width="80" height="10" rx="4" fill="${c.b}" ${S}/><path d="M26 42v10M42 42v10M58 42v10M74 42v10" stroke="#fff" stroke-width="5"/>${face(50, 82, .6)}`,
    star: c => `<path d="M50 10 L61 36 L89 38 L67 56 L74 84 L50 69 L26 84 L33 56 L11 38 L39 36Z" fill="${c.a}" ${S}/>${shine(40, 34, 5, 3)}${face(50, 54, .85)}`,
    heart: c => `<path d="M50 86 C50 86 12 64 12 38 C12 24 22 16 34 16 C42 16 48 22 50 28 C52 22 58 16 66 16 C78 16 88 24 88 38 C88 64 50 86 50 86Z" fill="${c.a}" ${S}/>${shine(30, 34)}${face(50, 48)}`,
    rainbow: c => `${['#ff8fb1', '#ffb36b', '#ffe066', '#8fe0a0', '#7ec8f5', '#c49bf0'].map((col, i) => `<path d="M${12 + i * 5} 72 A${38 - i * 5} ${38 - i * 5} 0 0 1 ${88 - i * 5} 72" fill="none" stroke="${col}" stroke-width="5.5"/>`).join('')}<path d="M10 72 A40 40 0 0 1 90 72" fill="none" ${S}/><circle cx="18" cy="74" r="12" fill="#fff" ${S}/><circle cx="82" cy="74" r="12" fill="#fff" ${S}/>${face(50, 60, .7)}`,
    crown: c => `<path d="M14 76 L18 30 L36 50 L50 20 L64 50 L82 30 L86 76Z" fill="${c.a}" ${S}/><rect x="14" y="70" width="72" height="12" rx="4" fill="${c.b}" ${S}/><circle cx="50" cy="20" r="5" fill="#ff8fb1" ${S}/><circle cx="18" cy="30" r="4" fill="#7ec8f5" ${S}/><circle cx="82" cy="30" r="4" fill="#7ec8f5" ${S}/>${face(50, 56, .75)}`,
    wand: c => `<path d="M24 86 L58 42" stroke="${OL}" stroke-width="10" stroke-linecap="round"/><path d="M24 86 L58 42" stroke="${c.b}" stroke-width="5" stroke-linecap="round"/><path d="M64 10 L71 26 L88 28 L75 39 L79 56 L64 47 L49 56 L53 39 L40 28 L57 26Z" fill="${c.a}" ${S}/>${face(64, 34, .55)}<circle cx="24" cy="30" r="3" fill="${c.a}"/><circle cx="86" cy="70" r="3" fill="${c.a}"/>`,
    bow: c => `<path d="M50 50 C36 30 12 30 14 50 C12 70 36 70 50 50 C64 70 88 70 86 50 C88 30 64 30 50 50Z" fill="${c.a}" ${S}/><path d="M44 56 L34 86 L44 80 L50 88 M56 56 L66 86 L56 80 L50 88" fill="${c.b}" ${S}/><circle cx="50" cy="50" r="10" fill="${c.b}" ${S}/>${face(50, 51, .45)}`,
    hoofpick: c => `<rect x="20" y="40" width="40" height="18" rx="9" fill="${c.a}" ${S}/><path d="M58 49 L80 49 C88 49 88 62 80 66" fill="none" stroke="${OL}" stroke-width="8" stroke-linecap="round"/><path d="M58 49 L80 49 C88 49 88 62 80 66" fill="none" stroke="#c9c9d6" stroke-width="4" stroke-linecap="round"/>${face(40, 49, .6)}`
  };
  const KPAL = [['#ff9cc6', '#e86a9e'], ['#8fc4f5', '#5f9ee0'], ['#c49bf0', '#9c70d0'], ['#8fe0a0', '#5fae6e'], ['#ffd966', '#e8bd45'], ['#ffb38f', '#e8916a'], ['#8fe0d8', '#5cc0b6'], ['#ffffff', '#ffc2dc']];
  const FIXED = { carrot: ['#ffa24d', '#e07a20'], apple: ['#ff6f7d', '#d94a58'], sugar: ['#ffffff', '#f0e6f0'], cookie: ['#e8b77a', '#8a5a3c'], hay: ['#f2d06b', '#d9a93a'] };

  const GEAR = {
    EL: {
      ecurie:    { name: 'Écurie', frame: '#e8c0a0', frame2: '#b88a66', bg: '#fff4ea', atk: ['Rangement', 'Nettoyage', 'Litière fraîche', 'Bonne nuit'], txt: ['Il garde l\'écurie bien propre.', 'Il sent bon la paille.', 'Il aide tous les matins.'] },
      pansage:   { name: 'Pansage', frame: '#ffb3d1', frame2: '#e07aa8', bg: '#fff0f7', atk: ['Brossage', 'Coup d\'éponge', 'Crinière douce', 'Poils brillants'], txt: ['Il rend les poneys tout doux.', 'Il adore les crinières emmêlées.', 'Il fait briller les sabots.'] },
      sellerie:  { name: 'Sellerie', frame: '#d9a066', frame2: '#a0663f', bg: '#fff3e6', atk: ['Bien attaché', 'Confort', 'En selle !', 'Grande balade'], txt: ['Il est en cuir tout doux.', 'Il part en promenade.', 'Il est toujours bien réglé.'] },
      friandises:{ name: 'Friandises', frame: '#ffb36b', frame2: '#e07a20', bg: '#fff4e6', atk: ['Miam miam', 'Croc !', 'Surprise sucrée', 'Récompense'], txt: ['Les poneys en raffolent.', 'Il sent super bon.', 'Juste une, pas plus !'] },
      concours:  { name: 'Concours', frame: '#8fb3f5', frame2: '#5577cc', bg: '#eef3ff', atk: ['Sans faute', 'Podium', 'Tour d\'honneur', 'Victoire'], txt: ['Il brille au soleil.', 'Il a vu plein de champions.', 'Il porte bonheur.'] },
      cavalier:  { name: 'Cavalier', frame: '#c49bf0', frame2: '#9c70d0', bg: '#f6efff', atk: ['Protection', 'Bien équipé', 'Prêt à partir', 'Style'], txt: ['Indispensable pour monter.', 'Toujours à la bonne taille.', 'Il aime les flaques.'] },
      deco:      { name: 'Accessoires', frame: '#8fe0d8', frame2: '#5cc0b6', bg: '#ecfbf9', atk: ['Joli nœud', 'Tout chaud', 'Porte-bonheur', 'Élégance'], txt: ['Il rend les poneys élégants.', 'Il tient bien chaud l\'hiver.', 'Il porte bonheur.'] },
      magie:     { name: 'Magie', frame: '#d0a8f5', frame2: '#9c6fd0', bg: '#f8f0ff', atk: ['Paillettes', 'Vœu magique', 'Arc-en-ciel', 'Étincelles'], txt: ['Il brille la nuit.', 'Il exauce les petits vœux.', 'Il sent la barbe à papa.'] }
    },
    NAMES: {
      ecurie: [R('Seau Rigolo', 'bucket'), R('Botte de Foin', 'hay'), R('Brouette', 'wheelbarrow'), R('Fourche', 'fork'), R('Lanterne', 'lantern'), R('Paille Douce', 'hay'),
               R('Abreuvoir', 'bucket'), R('Pelle à Crottin', 'fork'), R('Râtelier', 'hay'), R('Lampe de Nuit', 'lantern'), R('Grande Brouette', 'wheelbarrow'), R('Lanterne Magique', 'lantern')],
      pansage: [R('Brosse Douce', 'brush'), R('Étrille', 'comb'), R('Cure-Pied', 'hoofpick'), R('Éponge', 'sponge'), R('Peigne', 'comb'), R('Bouchon', 'brush'),
                R('Savon Bulle', 'sponge'), R('Peigne à Crinière', 'comb'), R('Brosse à Paillettes', 'brush'), R('Cure-Pied Brillant', 'hoofpick'), R('Brosse Arc-en-ciel', 'brush'), R('Peigne Doré', 'comb')],
      sellerie: [R('Selle', 'saddle'), R('Étrier', 'stirrup'), R('Licol', 'halter'), R('Tapis de Selle', 'blanket'), R('Filet', 'halter'), R('Étriers Brillants', 'stirrup'),
                 R('Selle Western', 'saddle'), R('Bridon', 'halter'), R('Tapis Étoilé', 'blanket'), R('Selle de Fée', 'saddle'), R('Licol Paillettes', 'halter'), R('Selle de Princesse', 'saddle')],
      friandises: [R('Carotte', 'carrot'), R('Pomme', 'apple'), R('Sucre', 'sugar'), R('Biscuit', 'cookie'), R('Bonbon', 'candy'), R('Petit Gâteau', 'cupcake'),
                   R('Pomme d\'Amour', 'apple'), R('Carotte Géante', 'carrot'), R('Sucre d\'Orge', 'candy'), R('Cookie Choco', 'cookie'), R('Gâteau de Fête', 'cupcake'), R('Carotte Arc-en-ciel', 'carrot')],
      concours: [R('Flot Bleu', 'rosette'), R('Médaille', 'medal'), R('Petite Coupe', 'trophy'), R('Obstacle', 'jump'), R('Flot Rouge', 'rosette'), R('Plaque', 'medal'),
                 R('Barre Rayée', 'jump'), R('Coupe d\'Argent', 'trophy'), R('Grand Flot', 'rosette'), R('Médaille d\'Or', 'medal'), R('Oxer Arc-en-ciel', 'jump'), R('Coupe Géante', 'trophy')],
      cavalier: [R('Bombe', 'helmet'), R('Bottes', 'boot'), R('Gants', 'glove'), R('Bombe Fleurie', 'helmet'), R('Bottines', 'boot'), R('Mitaines', 'glove'),
                 R('Bottes de Pluie', 'boot'), R('Bombe Étoilée', 'helmet'), R('Gants Doux', 'glove'), R('Bottes Vernies', 'boot'), R('Bombe Licorne', 'helmet'), R('Gants Magiques', 'glove')],
      deco: [R('Couverture', 'blanket'), R('Nœud', 'bow'), R('Fer Porte-Bonheur', 'horseshoe'), R('Ruban', 'bow'), R('Couverture Polaire', 'blanket'), R('Fer Brillant', 'horseshoe'),
             R('Grand Nœud', 'bow'), R('Plaid Étoilé', 'blanket'), R('Fer Arc-en-ciel', 'horseshoe'), R('Nœud Royal', 'bow'), R('Couverture Royale', 'blanket'), R('Fer Magique', 'horseshoe')],
      magie: [R('Étoile', 'star'), R('Cœur', 'heart'), R('Arc-en-ciel', 'rainbow'), R('Baguette', 'wand'), R('Petite Couronne', 'crown'), R('Étoile Filante', 'star'),
              R('Cœur Brillant', 'heart'), R('Arc Magique', 'rainbow'), R('Baguette de Fée', 'wand'), R('Diadème', 'crown'), R('Super Étoile', 'star'), R('Couronne de Licorne', 'crown')]
    },
    LEGENDS: [[R('Fer à Cheval d\'Or', 'horseshoe'), 'deco'], [R('Coupe des Champions', 'trophy'), 'concours'], [R('Selle Royale', 'saddle'), 'sellerie'], [R('Couronne Arc-en-ciel', 'crown'), 'magie']],
    label: '★', setName: 'Équipement', legendTxt: 'Un trésor de légende que très peu de cavaliers ont vu.'
  };

  function gearSVG(kind, colors, extra = '') {
    const body = (KAWAII[kind] || KAWAII.star)(colors);
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${body}${extra}</svg>`;
  }
  function gearArt(card, rng) {
    const r = rng('gear-' + card.name);
    const rank = { c: 0, pc: 1, r: 2, ur: 3, or: 4 }[card.rar];
    let [a, b] = FIXED[card.k] && rank < 3 ? FIXED[card.k] : KPAL[Math.floor(r() * KPAL.length)];
    if (rank >= 4) { a = '#ffd54f'; b = '#e0a81c'; }
    let extra = '';
    if (rank >= 2) extra += [[12, 14], [88, 18], [86, 86]].map(([x, y]) => `<path d="M${x} ${y - 6} Q${x} ${y} ${x + 6} ${y} Q${x} ${y} ${x} ${y + 6} Q${x} ${y} ${x - 6} ${y} Q${x} ${y} ${x} ${y - 6}Z" fill="#fff6b0" stroke="#f5c542" stroke-width="1"/>`).join('');
    if (rank === 3) extra = `<defs><linearGradient id="rb${card.id}" x1="0" x2="1"><stop offset="0" stop-color="#ff9cc6"/><stop offset=".5" stop-color="#ffe066"/><stop offset="1" stop-color="#8fc4f5"/></linearGradient></defs>` + extra;
    const svg = gearSVG(card.k, { a: rank === 3 ? `url(#rb${card.id})` : a, b }, extra);
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* icons for gear categories (kawaii theme) */
  const GEAR_ICON = { ecurie: ['hay', FIXED.hay], pansage: ['brush', ['#ff9cc6', '#e86a9e']], sellerie: ['saddle', ['#d9a066', '#a0663f']], friandises: ['carrot', FIXED.carrot],
    concours: ['rosette', ['#8fc4f5', '#5f9ee0']], cavalier: ['helmet', ['#c49bf0', '#9c70d0']], deco: ['horseshoe', ['#8fe0d8', '#5cc0b6']], magie: ['star', ['#ffd966', '#e8bd45']] };

  window.CardSets = {
    pixel: { key: 'vehicules', ...VEH, art: vehicleArt, icon: k => Pixel.svg('el_' + k) },
    poney: { key: 'equipement', ...GEAR, art: gearArt, icon: k => { const [kind, [a, b]] = GEAR_ICON[k]; return gearSVG(kind, { a, b }); } },
    KAWAII, gearSVG
  };
})();
