/* Poney kawaii fait main : géométrie, squelette et animations, exporté en poney1-3.glb (voir export.py).
   Repère : y en haut, le poney regarde vers +z, sol en y = 0. Chaque pièce est rigide (un seul os).
   3 stades : 1 poulain (grosse tête, petit corps, houppette), 2 poney, 3 adulte élancé (longue crinière, rubans, fleurs).
   Les pièces sont dessinées au gabarit du stade 2 puis déformées par groupe d'os (corps, cou, tête, pattes). */
export function buildPony(THREE, { mergeGeometries }, st = 2) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const P = [null,
    { S: [.82, .8, .78], legK: 1.0, legR: .8, HS: 1.42, neck: -.04 },
    { S: [1, 1, 1], legK: 1, legR: 1, HS: 1.2, neck: 0 },
    { S: [1.02, 1, 1.12], legK: 1.22, legR: 1, HS: 1.06, neck: .22 }][st];
  /* déformation du gabarit : corps mis à l'échelle autour de son centre puis posé sur des pattes plus ou moins longues */
  const C = V(0, 1.24, 0), legTop = 1.1 * P.legK, cy = legTop + .14 * P.S[1], dy = cy - C.y;
  const body = v => V(v.x * P.S[0], C.y + (v.y - C.y) * P.S[1] + dy, v.z * P.S[2]);
  const NB = V(0, 1.62, .52), nb = body(NB), nk = 1 + P.neck / .5;
  const neck = v => { const w = body(v); return V(w.x, nb.y + (w.y - nb.y) * nk, w.z); };
  const HP0 = V(0, 2.12, .78), HP1 = neck(HP0);
  const head = v => v.clone().sub(HP0).multiplyScalar(P.HS).add(HP1);
  const leg = (v, x0, z0) => V(x0 * P.S[0] + (v.x - x0) * P.legR, v.y * P.legK, z0 * P.S[2] + (v.z - z0) * P.legR);
  const GROUP = { Body: body, Torso: body, Tail1: body, Tail2: body, Neck1: neck, Head: head, EarL: head, EarR: head };

  /* ---------- squelette ---------- */
  const bones = {};
  const bone = (name, parent, pos) => {
    const b = new THREE.Bone(); b.name = name;
    const wp = pos.clone();
    if (parent) { b.position.copy(wp.clone().sub(bones[parent].userData.wp)); bones[parent].add(b); } else b.position.copy(wp);
    b.userData.wp = wp; bones[name] = b; return b;
  };
  bone('Body', null, body(V(0, 1.22, 0)));
  bone('Torso', 'Body', body(V(0, 1.22, 0)));
  bone('Neck1', 'Torso', body(NB));
  bone('Head', 'Neck1', HP1);
  bone('EarL', 'Head', head(V(.36, 3.08, .62)));
  bone('EarR', 'Head', head(V(-.36, 3.08, .62)));
  bone('LegFL', 'Torso', V(.3 * P.S[0], legTop - .08, .46 * P.S[2]));
  bone('LegFR', 'Torso', V(-.3 * P.S[0], legTop - .08, .46 * P.S[2]));
  bone('LegBL', 'Torso', V(.3 * P.S[0], legTop - .08, -.46 * P.S[2]));
  bone('LegBR', 'Torso', V(-.3 * P.S[0], legTop - .08, -.46 * P.S[2]));
  bone('Tail1', 'Torso', body(V(0, 1.5, -.78)));
  bone('Tail2', 'Tail1', body(V(0, 1.28, -1.12)));
  const order = Object.keys(bones);
  const idx = n => order.indexOf(n);

  /* ---------- pièces ---------- */
  const parts = {}; // matériau -> [géométries]
  const LEGS = { LegFL: [.3, .46], LegFR: [-.3, .46], LegBL: [.3, -.46], LegBR: [-.3, -.46] };
  function put(matName, geo, boneName) {
    const pos = geo.attributes.position, v = V(0, 0, 0), f = LEGS[boneName] ? (w => leg(w, ...LEGS[boneName])) : GROUP[boneName];
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); const w = f(v); pos.setXYZ(i, w.x, w.y, w.z); }
    geo.computeVertexNormals();
    const n = geo.attributes.position.count;
    const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { si[i * 4] = idx(boneName); sw[i * 4] = 1; }
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    // pas de coordonnées de texture (aucune texture)
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'skinIndex', 'skinWeight'].includes(k)) geo.deleteAttribute(k);
    (parts[matName] = parts[matName] || []).push(geo);
  }
  const xf = (geo, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] } = {}) => {
    const m = new THREE.Matrix4().compose(V(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), V(...s));
    geo.applyMatrix4(m); return geo;
  };
  const sph = (r = 1, w = 28, h = 18) => new THREE.SphereGeometry(r, w, h);
  const ell = (p, s, r) => xf(sph(1), { p, s, r });
  /* forme de révolution le long de y, profil [[rayon, y], ...] */
  const lathe = (prof, p, r) => xf(new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 28), { p, r });

  // corps : rond et dodu, poitrail bombé
  put('Main', ell([0, 1.24, -.02], [.66, .6, .86]), 'Torso');
  put('Main', ell([0, 1.3, .38], [.58, .6, .52]), 'Torso');
  put('Main', ell([0, 1.3, -.42], [.6, .58, .52]), 'Torso');
  put('Main_Light', ell([0, 1.02, .02], [.46, .32, .66]), 'Torso'); // ventre plus clair
  // cou court et épais
  put('Main', ell([0, 1.9, .66], [.34, .5, .34], [-.35, 0, 0]), 'Neck1');
  // pattes trapues, chaussettes, sabots
  [['LegFL', .3, .46], ['LegFR', -.3, .46], ['LegBL', .3, -.46], ['LegBR', -.3, -.46]].forEach(([b, x, z]) => {
    put('Main', lathe([[0, 0], [.17, 0], [.19, .2], [.21, .45], [.23, .62], [.2, .75], [0, .8]], [x, .3, z]), b);
    put('Socks', lathe([[.0, 0], [.205, 0], [.215, .08], [.205, .2], [.19, .3], [0, .31]], [x, .1, z]), b);
    put('Hooves', lathe([[0, 0], [.235, 0], [.24, .04], [.225, .14], [.2, .17], [0, .18]], [x, 0, z]), b);
  });
  // tête : grosse et ronde
  put('Main', ell([0, 2.66, .78], [.62, .6, .56]), 'Head');
  put('Main', ell([0, 2.42, 1.0], [.48, .42, .46]), 'Head'); // joues
  put('Muzzle', ell([0, 2.3, 1.3], [.36, .27, .26], [.15, 0, 0]), 'Head');
  put('Blaze', ell([0, 2.78, 1.28], [.13, .36, .08], [-.38, 0, 0]), 'Head');
  // naseaux et sourire
  [.12, -.12].forEach(x => put('Nose', ell([x, 2.36, 1.54], [.055, .04, .03], [-.3, 0, 0]), 'Head'));
  put('Nose', xf(new THREE.TorusGeometry(.1, .016, 8, 20, Math.PI * .7), { p: [0, 2.21, 1.53], r: [-.15, 0, Math.PI * 1.15] }), 'Head');
  // grands yeux brillants
  [1, -1].forEach(s => {
    const c = V(s * .29, 2.74, 1.24), n = V(s * .62, .1, 1).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), n);
    const at = (dx, dy, dz, sc) => { const g = sph(1, 24, 18); g.applyMatrix4(new THREE.Matrix4().compose(V(dx, dy, dz).applyQuaternion(q).add(c), q, V(...sc))); return g; };
    put('Eye_White', at(0, 0, 0, [.185, .23, .09]), 'Head');
    put('Eye_Black', at(0, -.015, .055, [.15, .185, .06]), 'Head');          // iris (couleur par espèce)
    put('Eye_Black_Pupil', at(0, -.03, .085, [.085, .11, .04]), 'Head');
    put('Eye_White', at(-.045 * s, .07, .11, [.045, .05, .02]), 'Head');  // reflet principal
    put('Eye_White', at(.05 * s, -.07, .1, [.02, .022, .012]), 'Head');  // petit reflet
    // cils et sourcil
    const lash = new THREE.TorusGeometry(.19, .018, 6, 18, Math.PI * .75);
    lash.applyMatrix4(new THREE.Matrix4().compose(V(0, .02, .06).applyQuaternion(q).add(c), q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI * .12))), V(.95, 1.1, 1)));
    put('Nose', lash, 'Head');
    put('Nose', at(-.02 * s, .31, .0, [.08, .018, .02]), 'Head');
  });
  // oreilles en feuille
  [['EarL', 1], ['EarR', -1]].forEach(([b, s]) => {
    put('Main', ell([s * .37, 3.24, .6], [.16, .34, .1], [-.15, 0, -s * .4]), b);
    put('Muzzle', ell([s * .36, 3.22, .67], [.09, .24, .04], [-.15, 0, -s * .4]), b);
  });
  // crinière : mèche sur le front, touffes sur le crâne, cascade le long du cou
  const hair = (p, s, r, b = 'Head') => put('Hair', ell(p, s, r), b);
  hair([0, 3.18, .72], [.36, .2, .32]);
  hair([.18, 3.05, 1.0], [.2, .14, .26], [.4, 0, -.6]);
  hair([-.16, 3.0, 1.06], [.18, .12, .24], [.5, 0, .7]);
  hair([.04, 2.98, 1.12], [.16, .1, .2], [.7, 0, 0]);
  hair([.3, 2.95, .55], [.18, .3, .2], [0, 0, -.5]);
  hair([-.3, 2.95, .55], [.18, .3, .2], [0, 0, .5]);
  hair([0, 2.9, .3], [.26, .3, .22], [.3, 0, 0]);
  if (st >= 2) {
    hair([.36, 2.75, .38], [.2, .36, .24], [.2, 0, -.35]);
    hair([-.36, 2.75, .38], [.2, .36, .24], [.2, 0, .35]);
    hair([.42, 2.5, .5], [.15, .32, .2], [.1, 0, -.15]);
    hair([-.42, 2.5, .5], [.15, .32, .2], [.1, 0, .15]);
  }
  hair([.1, 3.15, .95], [.24, .16, .26], [.3, 0, -.3]);
  if (st === 1) { // houppette de poulain
    hair([0, 3.3, .82], [.22, .22, .22]); hair([.12, 3.38, .7], [.14, .16, .14]); hair([-.1, 3.36, .66], [.13, .15, .13]);
  }
  const neckMane = st === 1 ? [[2.55, .22, .24], [2.2, .1, .2]] : [[2.55, .22, .28], [2.2, .1, .26], [1.85, -.02, .24], [1.6, -.12, .2]];
  neckMane.forEach(([y, z, w]) => {
    hair([.16, y, z], [w * .6, .3, w], [.3, 0, -.2], 'Neck1');
    hair([-.16, y, z], [w * .6, .3, w], [.3, 0, .2], 'Neck1');
  });
  if (st === 3) {
    // longue crinière qui retombe sur l'épaule et longue mèche sur le front
    [[2.35, .32, .26], [2.0, .3, .26], [1.65, .28, .24], [1.35, .3, .2]].forEach(([y, z, w], i) => hair([.3 + i * .03, y, z], [w * .55, .34, w * .8], [.15, 0, -.3], 'Neck1'));
    [[2.4, .12, .24], [2.05, .05, .24], [1.7, -.02, .22]].forEach(([y, z, w]) => hair([-.3, y, z], [w * .55, .32, w * .8], [.15, 0, .3], 'Neck1'));
    hair([.12, 2.86, 1.22], [.16, .26, .14], [.5, 0, -.3]);
    // rubans et fleurs dans la crinière
    const bow = (p, b) => { put('Ribbon', ell([p[0] + .1, p[1], p[2]], [.1, .07, .04], [0, .3, -.4]), b); put('Ribbon', ell([p[0] - .1, p[1], p[2]], [.1, .07, .04], [0, -.3, .4]), b); put('Ribbon', ell(p, [.045, .045, .045]), b); };
    bow([-.5, 1.75, .3], 'Neck1'); bow([-.48, 2.9, .62], 'Head');
    const flower = (p, b) => { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; put('Flower', ell([p[0] + Math.cos(a) * .07, p[1] + Math.sin(a) * .07, p[2]], [.055, .055, .03]), b); } put('Ribbon', ell([p[0], p[1], p[2] + .02], [.035, .035, .03]), b); };
    flower([-.24, 3.1, 1.0], 'Head'); flower([-.5, 2.2, .3], 'Neck1'); flower([.3, 3.05, .9], 'Head');
  }
  // queue : pompon (poulain), touffue (poney), jusqu'au sol (adulte)
  const tailA = st === 1 ? [[1.52, -.86, .2], [1.4, -.98, .22]] : [[1.52, -.86, .2], [1.4, -1.0, .24], [1.22, -1.12, .26]];
  tailA.forEach(([y, z, r]) => hair([0, y, z], [r, r * 1.1, r], [0, 0, 0], 'Tail1'));
  const tailB = st === 1 ? [] : st === 2 ? [[1.0, -1.2, .26], [.78, -1.22, .23], [.58, -1.18, .17]] : [[1.0, -1.2, .27], [.78, -1.23, .26], [.56, -1.24, .24], [.36, -1.22, .22], [.2, -1.18, .18]];
  tailB.forEach(([y, z, r]) => hair([0, y, z], [r * 1.05, r * 1.25, r], [0, 0, 0], 'Tail2'));

  /* ---------- maillages ---------- */
  const root = new THREE.Group(); root.name = 'Pony';
  const arm = new THREE.Group(); arm.name = 'PonyArmature'; root.add(arm);
  arm.add(bones.Body);
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(order.map(n => bones[n]));
  const COL = { Main: '#d08a52', Main_Light: '#e9b07c', Main_Dark: '#b06e3a', Socks: '#fff6ea', Hooves: '#6a4a3e', Muzzle: '#f8cfc4', Blaze: '#ffffff', Nose: '#3a2420', Hair: '#7a4528', Eye_White: '#ffffff', Eye_Black: '#5a3420', Eye_Black_Pupil: '#140a08', Ribbon: '#ffc93c', Flower: '#ffffff' };
  for (const [name, geos] of Object.entries(parts)) {
    const geo = mergeGeometries(geos, false);
    const m = new THREE.MeshStandardMaterial({ name, color: COL[name] || '#ffffff', roughness: .6 });
    const sm = new THREE.SkinnedMesh(geo, m); sm.name = 'Pony_' + name;
    arm.add(sm); sm.bind(skeleton);
  }

  /* ---------- animations ---------- */
  const clips = [];
  function clip(name, dur, chans) {
    const tracks = [];
    for (const [target, keys] of Object.entries(chans)) {
      const [bn, prop] = target.split('.');
      const times = keys.map(k => k[0] * dur);
      if (prop === 'pos') {
        const base = bones[bn].position;
        tracks.push(new THREE.VectorKeyframeTrack(bn + '.position', times, keys.flatMap(k => [base.x + (k[1] || 0), base.y + (k[2] || 0), base.z + (k[3] || 0)])));
      } else {
        tracks.push(new THREE.QuaternionKeyframeTrack(bn + '.quaternion', times, keys.flatMap(k => new THREE.Quaternion().setFromEuler(new THREE.Euler(k[1] || 0, k[2] || 0, k[3] || 0)).toArray())));
      }
    }
    clips.push(new THREE.AnimationClip(name, dur, tracks));
  }
  const loop = ks => ks.concat([[1, ...ks[0].slice(1)]]);
  const legsStill = { 'LegFL.rot': [[0]], 'LegFR.rot': [[0]], 'LegBL.rot': [[0]], 'LegBR.rot': [[0]] };
  // respiration, petite tête qui se balance, queue et oreilles vivantes
  clip('Idle', 3.2, Object.assign({}, legsStill, {
    'Body.pos': loop([[0, 0, 0], [.5, 0, .03]]),
    'Torso.rot': loop([[0, 0], [.5, -.015]]),
    'Neck1.rot': loop([[0, -.04], [.5, .02]]),
    'Head.rot': loop([[0, .02, 0, .04], [.25, .0, .06, 0], [.5, .04, 0, -.04], [.75, 0, -.06, 0]]),
    'EarL.rot': loop([[0, 0, 0, 0], [.4, 0, 0, 0], [.45, -.25, 0, -.2], [.52, 0, 0, 0]]),
    'EarR.rot': loop([[0, 0, 0, 0], [.7, 0, 0, 0], [.75, -.25, 0, .2], [.82, 0, 0, 0]]),
    'Tail1.rot': loop([[0, .1, 0, 0], [.25, .1, .25, 0], [.5, .1, 0, 0], [.75, .1, -.25, 0]]),
    'Tail2.rot': loop([[0, .05, 0, 0], [.25, .05, .3, 0], [.5, .05, 0, 0], [.75, .05, -.3, 0]])
  }));
  // tête penchée, curieux
  clip('Idle_2', 3, Object.assign({}, legsStill, {
    'Body.pos': loop([[0, 0, 0], [.5, 0, .02]]),
    'Neck1.rot': loop([[0, 0], [.2, -.08, .15], [.8, -.08, .15]]),
    'Head.rot': loop([[0, 0, 0, 0], [.2, 0, .1, .32], [.45, 0, .1, .28], [.6, 0, .1, .34], [.8, 0, .1, .3]]),
    'EarL.rot': loop([[0, 0], [.25, .2, 0, -.15], [.8, .2, 0, -.15]]),
    'EarR.rot': loop([[0, 0], [.3, -.3, 0, .3], [.8, -.3, 0, .3]]),
    'Tail1.rot': loop([[0, .1, 0, 0], [.3, .1, .4, 0], [.5, .1, -.3, 0], [.7, .1, .3, 0]])
  }));
  // tristounet : tête basse, oreilles tombantes
  clip('Idle_Headlow', 3.6, Object.assign({}, legsStill, {
    'Body.pos': loop([[0, 0, -.02], [.5, 0, 0]]),
    'Neck1.rot': loop([[0, .35], [.5, .38]]),
    'Head.rot': loop([[0, .3], [.5, .34]]),
    'EarL.rot': loop([[0, .5, 0, -.9], [.5, .5, 0, -.95]]),
    'EarR.rot': loop([[0, .5, 0, .9], [.5, .5, 0, .95]]),
    'Tail1.rot': loop([[0, -.15], [.5, -.12]]), 'Tail2.rot': loop([[0, 0], [.5, 0]])
  }));
  // brouter : tête au sol et mâchouille
  clip('Eating', 2, Object.assign({}, legsStill, {
    'Body.pos': loop([[0, 0, 0], [.5, 0, -.02]]),
    'Torso.rot': loop([[0, .06], [.5, .07]]),
    'Neck1.rot': loop([[0, .62], [.5, .64]]),
    'Head.rot': loop([[0, .42], [.15, .32], [.3, .45], [.45, .32], [.6, .45], [.75, .32], [.9, .43]]),
    'EarL.rot': loop([[0, .1, 0, -.2], [.5, .2, 0, -.25]]), 'EarR.rot': loop([[0, .1, 0, .2], [.5, .2, 0, .25]]),
    'Tail1.rot': loop([[0, .1, .3], [.5, .1, -.3]]), 'Tail2.rot': loop([[0, 0, .3], [.5, 0, -.3]])
  }));
  // grand saut : s'accroupit, bondit pattes repliées, atterrit en souplesse
  clip('Gallop_Jump', 1.1, {
    'Body.pos': [[0, 0, 0], [.18, 0, -.18], [.45, 0, .9, .15], [.7, 0, .25, .1], [.82, 0, -.12], [1, 0, 0]],
    'Torso.rot': [[0, 0], [.18, .1], [.4, -.3], [.65, .15], [.82, 0], [1, 0]],
    'Neck1.rot': [[0, 0], [.18, .2], [.45, -.25], [.8, .1], [1, 0]],
    'Head.rot': [[0, 0], [.18, .15], [.45, -.2], [.8, .1], [1, 0]],
    'LegFL.rot': [[0, 0], [.2, .1], [.4, -1.1], [.6, -.6], [.78, .25], [1, 0]],
    'LegFR.rot': [[0, 0], [.2, .1], [.42, -1.0], [.62, -.55], [.8, .25], [1, 0]],
    'LegBL.rot': [[0, 0], [.2, -.2], [.4, .9], [.6, .5], [.8, -.1], [1, 0]],
    'LegBR.rot': [[0, 0], [.2, -.2], [.42, .85], [.62, .45], [.82, -.1], [1, 0]],
    'EarL.rot': [[0, 0], [.4, .5, 0, -.3], [.8, -.2], [1, 0]], 'EarR.rot': [[0, 0], [.4, .5, 0, .3], [.8, -.2], [1, 0]],
    'Tail1.rot': [[0, .1], [.4, -.6], [.7, .4], [1, .1]], 'Tail2.rot': [[0, 0], [.45, -.4], [.75, .4], [1, 0]]
  });
  // joie : deux petits bonds en caracolant
  const hop = (t0, d) => [[t0, 0, 0], [t0 + d * .5, 0, .35], [t0 + d, 0, 0]];
  clip('Jump_toIdle', 1.2, {
    'Body.pos': [...hop(0, .5), ...hop(.5, .5).slice(1), [1, 0, 0]],
    'Torso.rot': [[0, 0], [.25, -.12], [.5, .05], [.75, -.12], [1, 0]],
    'Head.rot': [[0, 0], [.25, -.15, 0, .15], [.5, 0], [.75, -.15, 0, -.15], [1, 0]],
    'LegFL.rot': [[0, 0], [.25, -.7], [.5, 0], [.75, -.7], [1, 0]],
    'LegFR.rot': [[0, 0], [.25, -.5], [.5, 0], [.75, -.5], [1, 0]],
    'LegBL.rot': [[0, 0], [.25, .3], [.5, 0], [.75, .3], [1, 0]],
    'LegBR.rot': [[0, 0], [.25, .25], [.5, 0], [.75, .25], [1, 0]],
    'EarL.rot': [[0, 0], [.25, .3], [.5, 0], [.75, .3], [1, 0]], 'EarR.rot': [[0, 0], [.25, .3], [.5, 0], [.75, .3], [1, 0]],
    'Tail1.rot': [[0, .1], [.25, -.5, .3], [.5, .1], [.75, -.5, -.3], [1, .1]], 'Tail2.rot': [[0, 0], [.25, -.3], [.75, -.3], [1, 0]]
  });
  // s'ébroue comme après le bain
  const shake = n => Array.from({ length: n + 1 }, (_, i) => [i / n * .8 + .1, 0, 0, (i % 2 ? 1 : -1) * .14 * (1 - i / n)]);
  clip('Idle_HitReact1', 1.2, Object.assign({}, legsStill, {
    'Body.pos': [[0, 0, 0], [.1, 0, -.05], [.9, 0, -.02], [1, 0, 0]],
    'Torso.rot': [[0, 0], ...shake(8), [1, 0]],
    'Head.rot': [[0, 0], ...shake(8).map(([t, a, b, c]) => [t, -.1, 0, -c * 1.6]), [1, 0]],
    'EarL.rot': [[0, 0], [.1, .4, 0, -.6], [.9, .4, 0, -.6], [1, 0]], 'EarR.rot': [[0, 0], [.1, .4, 0, .6], [.9, .4, 0, .6], [1, 0]],
    'Tail1.rot': [[0, .1], ...shake(8).map(([t, a, b, c]) => [t, .1, c * 4, 0]), [1, .1]]
  }));
  return { scene: root, clips };
}
