/* Compagnons kawaii faits main pour le monde des blocs : renard, lapin et mouton, chacun en 3 stades
   (bébé, jeune, adulte). Même principe que pony.js : pièces rigides sur un petit squelette commun
   (Body, Torso, Neck1, Head, EarL/R, LegFL/FR/BL/BR, Tail1/2) et les mêmes 7 animations.
   Repère : y en haut, regard vers +z, sol en y = 0. Exporté par export.py en <espèce><stade>.glb. */

function kit(THREE, { mergeGeometries }) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const bones = {}, order = [], parts = {};
  const bone = (name, parent, p) => {
    const b = new THREE.Bone(); b.name = name; const wp = V(...p);
    if (parent) { b.position.copy(wp.clone().sub(bones[parent].userData.wp)); bones[parent].add(b); } else b.position.copy(wp);
    b.userData.wp = wp; bones[name] = b; order.push(name); return b;
  };
  const xf = (geo, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0]) =>
    geo.applyMatrix4(new THREE.Matrix4().compose(V(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), V(...s)));
  const sph = (big) => new THREE.SphereGeometry(1, big ? 28 : 18, big ? 18 : 12);
  function put(mat, geo, b) {
    if (!geo.index) geo.setIndex([...Array(geo.attributes.position.count).keys()]); // les polyèdres n'ont pas d'index
    const n = geo.attributes.position.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { si[i * 4] = order.indexOf(b); sw[i * 4] = 1; }
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'skinIndex', 'skinWeight'].includes(k)) geo.deleteAttribute(k);
    (parts[mat] = parts[mat] || []).push(geo);
  }
  const ell = (mat, b, p, s, r, big) => put(mat, xf(sph(big), p, s, r || [0, 0, 0]), b);
  const cone = (mat, b, p, rad, h, r, s = [1, 1, 1]) => put(mat, xf(new THREE.ConeGeometry(rad, h, 16, 3), p, s, r), b);
  const lathe = (mat, b, prof, p, r = [0, 0, 0]) => put(mat, xf(new THREE.LatheGeometry(prof.map(([a, c]) => new THREE.Vector2(a, c)), 20), p, [1, 1, 1], r), b);
  const torus = (mat, b, p, R, t, arc, r, s = [1, 1, 1]) => put(mat, xf(new THREE.TorusGeometry(R, t, 10, 28, arc), p, s, r), b);
  /* grands yeux brillants posés sur une tête sphérique (centre hc, rayon hr) */
  function eyes(hc, hr, { spread = .42, dy = .05, size = 1, lashes = true, iris = 'Eye_Black' } = {}) {
    [1, -1].forEach(s => {
      const n = V(s * Math.sin(spread), dy, Math.cos(spread)).normalize();
      const c = V(...hc).addScaledVector(n, hr * .9);
      const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), n);
      const at = (dx, dy2, dz, sc) => { const g = sph(false); g.applyMatrix4(new THREE.Matrix4().compose(V(dx, dy2, dz).multiplyScalar(size).applyQuaternion(q).add(c), q, V(...sc).multiplyScalar(size))); return g; };
      put('Eye_White', at(0, 0, 0, [.19, .23, .09]), 'Head');
      put(iris, at(0, -.015, .055, [.155, .19, .06]), 'Head');
      put('Eye_Black_Pupil', at(0, -.03, .085, [.09, .115, .04]), 'Head');
      put('Eye_White', at(-.05 * s, .075, .115, [.048, .055, .02]), 'Head');
      put('Eye_White', at(.05 * s, -.075, .105, [.022, .024, .012]), 'Head');
      if (lashes) {
        const l = new THREE.TorusGeometry(.2 * size, .018 * size, 6, 18, Math.PI * .75);
        l.applyMatrix4(new THREE.Matrix4().compose(V(0, .02, .06).multiplyScalar(size).applyQuaternion(q).add(c), q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI * .12))), V(.95, 1.1, 1)));
        put('Nose', l, 'Head');
      }
    });
  }
  /* petit sourire en « w » */
  function smile(p, w = .1) {
    [1, -1].forEach(s => torus('Nose', 'Head', [p[0] + s * w * .5, p[1], p[2]], w * .5, w * .09, Math.PI, [0, 0, Math.PI], [1, .9, 1]));
  }

  function finish(name, colors, H) {
    const root = new THREE.Group(); root.name = name;
    const arm = new THREE.Group(); arm.name = name + 'Armature'; root.add(arm);
    arm.add(bones.Body); root.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton(order.map(n => bones[n]));
    for (const [m, geos] of Object.entries(parts)) {
      const mat = new THREE.MeshStandardMaterial({ name: m, color: colors[m] || '#ffffff', roughness: .6 });
      const sm = new THREE.SkinnedMesh(mergeGeometries(geos, false), mat); sm.name = name + '_' + m;
      arm.add(sm); sm.bind(skeleton);
    }
    return { scene: root, clips: clips(H) };
  }

  /* les 7 animations communes (H = hauteur approximative, pour doser les sauts) */
  function clips(H) {
    const out = [], k = H / 3.4;
    function clip(name, dur, chans) {
      const tracks = [];
      for (const [target, keys] of Object.entries(chans)) {
        const [bn, prop] = target.split('.'); if (!bones[bn]) continue;
        const times = keys.map(x => x[0] * dur);
        if (prop === 'pos') { const b = bones[bn].position; tracks.push(new THREE.VectorKeyframeTrack(bn + '.position', times, keys.flatMap(x => [b.x + (x[1] || 0) * k, b.y + (x[2] || 0) * k, b.z + (x[3] || 0) * k]))); }
        else tracks.push(new THREE.QuaternionKeyframeTrack(bn + '.quaternion', times, keys.flatMap(x => new THREE.Quaternion().setFromEuler(new THREE.Euler(x[1] || 0, x[2] || 0, x[3] || 0)).toArray())));
      }
      out.push(new THREE.AnimationClip(name, dur, tracks));
    }
    const loop = ks => ks.concat([[1, ...ks[0].slice(1)]]);
    const still = { 'LegFL.rot': [[0]], 'LegFR.rot': [[0]], 'LegBL.rot': [[0]], 'LegBR.rot': [[0]] };
    clip('Idle', 3.2, Object.assign({}, still, {
      'Body.pos': loop([[0, 0, 0], [.5, 0, .03]]), 'Torso.rot': loop([[0, 0], [.5, -.015]]), 'Neck1.rot': loop([[0, -.04], [.5, .02]]),
      'Head.rot': loop([[0, .02, 0, .04], [.25, 0, .06, 0], [.5, .04, 0, -.04], [.75, 0, -.06, 0]]),
      'EarL.rot': loop([[0, 0], [.4, 0], [.45, -.25, 0, -.2], [.52, 0]]), 'EarR.rot': loop([[0, 0], [.7, 0], [.75, -.25, 0, .2], [.82, 0]]),
      'Tail1.rot': loop([[0, .1, 0], [.25, .1, .25], [.5, .1, 0], [.75, .1, -.25]]), 'Tail2.rot': loop([[0, .05, 0], [.25, .05, .3], [.5, .05, 0], [.75, .05, -.3]])
    }));
    clip('Idle_2', 3, Object.assign({}, still, {
      'Body.pos': loop([[0, 0, 0], [.5, 0, .02]]), 'Neck1.rot': loop([[0, 0], [.2, -.08, .15], [.8, -.08, .15]]),
      'Head.rot': loop([[0, 0, 0, 0], [.2, 0, .1, .32], [.45, 0, .1, .28], [.6, 0, .1, .34], [.8, 0, .1, .3]]),
      'EarL.rot': loop([[0, 0], [.25, .2, 0, -.15], [.8, .2, 0, -.15]]), 'EarR.rot': loop([[0, 0], [.3, -.3, 0, .3], [.8, -.3, 0, .3]]),
      'Tail1.rot': loop([[0, .1, 0], [.3, .1, .4], [.5, .1, -.3], [.7, .1, .3]])
    }));
    clip('Idle_Headlow', 3.6, Object.assign({}, still, {
      'Body.pos': loop([[0, 0, -.02], [.5, 0, 0]]), 'Neck1.rot': loop([[0, .3], [.5, .33]]), 'Head.rot': loop([[0, .28], [.5, .32]]),
      'EarL.rot': loop([[0, .5, 0, -.8], [.5, .5, 0, -.85]]), 'EarR.rot': loop([[0, .5, 0, .8], [.5, .5, 0, .85]]),
      'Tail1.rot': loop([[0, -.15], [.5, -.12]]), 'Tail2.rot': loop([[0, 0], [.5, 0]])
    }));
    clip('Eating', 2, Object.assign({}, still, {
      'Body.pos': loop([[0, 0, 0], [.5, 0, -.02]]), 'Torso.rot': loop([[0, .06], [.5, .07]]), 'Neck1.rot': loop([[0, .5], [.5, .52]]),
      'Head.rot': loop([[0, .38], [.15, .28], [.3, .4], [.45, .28], [.6, .4], [.75, .28], [.9, .38]]),
      'EarL.rot': loop([[0, .1, 0, -.2], [.5, .2, 0, -.25]]), 'EarR.rot': loop([[0, .1, 0, .2], [.5, .2, 0, .25]]),
      'Tail1.rot': loop([[0, .1, .3], [.5, .1, -.3]]), 'Tail2.rot': loop([[0, 0, .3], [.5, 0, -.3]])
    }));
    clip('Gallop_Jump', 1.1, {
      'Body.pos': [[0, 0, 0], [.18, 0, -.15], [.45, 0, .8, .1], [.7, 0, .22, .05], [.82, 0, -.1], [1, 0, 0]],
      'Torso.rot': [[0, 0], [.18, .1], [.4, -.25], [.65, .12], [.82, 0], [1, 0]],
      'Neck1.rot': [[0, 0], [.18, .15], [.45, -.2], [.8, .08], [1, 0]], 'Head.rot': [[0, 0], [.18, .12], [.45, -.15], [.8, .08], [1, 0]],
      'LegFL.rot': [[0, 0], [.2, .1], [.4, -1], [.6, -.5], [.78, .2], [1, 0]], 'LegFR.rot': [[0, 0], [.2, .1], [.42, -.9], [.62, -.45], [.8, .2], [1, 0]],
      'LegBL.rot': [[0, 0], [.2, -.2], [.4, .8], [.6, .4], [.8, -.1], [1, 0]], 'LegBR.rot': [[0, 0], [.2, -.2], [.42, .75], [.62, .4], [.82, -.1], [1, 0]],
      'EarL.rot': [[0, 0], [.4, .5, 0, -.3], [.8, -.2], [1, 0]], 'EarR.rot': [[0, 0], [.4, .5, 0, .3], [.8, -.2], [1, 0]],
      'Tail1.rot': [[0, .1], [.4, -.6], [.7, .4], [1, .1]], 'Tail2.rot': [[0, 0], [.45, -.4], [.75, .4], [1, 0]]
    });
    const hop = (t0, d) => [[t0, 0, 0], [t0 + d * .5, 0, .35], [t0 + d, 0, 0]];
    clip('Jump_toIdle', 1.2, {
      'Body.pos': [...hop(0, .5), ...hop(.5, .5).slice(1), [1, 0, 0]], 'Torso.rot': [[0, 0], [.25, -.12], [.5, .05], [.75, -.12], [1, 0]],
      'Head.rot': [[0, 0], [.25, -.15, 0, .15], [.5, 0], [.75, -.15, 0, -.15], [1, 0]],
      'LegFL.rot': [[0, 0], [.25, -.7], [.5, 0], [.75, -.7], [1, 0]], 'LegFR.rot': [[0, 0], [.25, -.5], [.5, 0], [.75, -.5], [1, 0]],
      'LegBL.rot': [[0, 0], [.25, .3], [.5, 0], [.75, .3], [1, 0]], 'LegBR.rot': [[0, 0], [.25, .25], [.5, 0], [.75, .25], [1, 0]],
      'EarL.rot': [[0, 0], [.25, .3], [.5, 0], [.75, .3], [1, 0]], 'EarR.rot': [[0, 0], [.25, .3], [.5, 0], [.75, .3], [1, 0]],
      'Tail1.rot': [[0, .1], [.25, -.5, .3], [.5, .1], [.75, -.5, -.3], [1, .1]], 'Tail2.rot': [[0, 0], [.25, -.3], [.75, -.3], [1, 0]]
    });
    const shake = n => Array.from({ length: n + 1 }, (_, i) => [i / n * .8 + .1, 0, 0, (i % 2 ? 1 : -1) * .14 * (1 - i / n)]);
    clip('Idle_HitReact1', 1.2, Object.assign({}, still, {
      'Body.pos': [[0, 0, 0], [.1, 0, -.05], [.9, 0, -.02], [1, 0, 0]], 'Torso.rot': [[0, 0], ...shake(8), [1, 0]],
      'Head.rot': [[0, 0], ...shake(8).map(([t, a, b, c]) => [t, -.1, 0, -c * 1.6]), [1, 0]],
      'EarL.rot': [[0, 0], [.1, .4, 0, -.6], [.9, .4, 0, -.6], [1, 0]], 'EarR.rot': [[0, 0], [.1, .4, 0, .6], [.9, .4, 0, .6], [1, 0]],
      'Tail1.rot': [[0, .1], ...shake(8).map(([t, a, b, c]) => [t, .1, c * 4, 0]), [1, .1]]
    }));
    return out;
  }
  return { V, bone, put, ell, cone, lathe, torus, eyes, smile, finish, sph, xf };
}

/* ---------------- renard : boule de poils → jeune renard → renard à trois queues ---------------- */
export function fox(THREE, U, st) {
  const K = kit(THREE, U); const { bone, ell, cone, lathe, eyes, smile } = K;
  const L = [.3, .45, .55][st - 1];              // longueur des pattes
  const B = [[.62, .58, .66], [.6, .55, .8], [.64, .58, .88]][st - 1]; // rayons du corps
  const hr = [.68, .66, .66][st - 1];            // rayon de la tête
  const by = L + B[1] * .8;
  const hc = [0, by + B[1] + hr * .55, B[2] * .62];
  bone('Body', null, [0, by, 0]); bone('Torso', 'Body', [0, by, 0]);
  bone('Neck1', 'Torso', [0, by + B[1] * .5, B[2] * .45]); bone('Head', 'Neck1', [0, hc[1] - hr * .6, hc[2]]);
  bone('EarL', 'Head', [hr * .55, hc[1] + hr * .75, hc[2] - .05]); bone('EarR', 'Head', [-hr * .55, hc[1] + hr * .75, hc[2] - .05]);
  const lx = B[0] * .55, lz = B[2] * .55;
  [['LegFL', lx, lz], ['LegFR', -lx, lz], ['LegBL', lx, -lz], ['LegBR', -lx, -lz]].forEach(([n, x, z]) => bone(n, 'Torso', [x, L + .1, z]));
  bone('Tail1', 'Torso', [0, by + .05, -B[2] * .9]); bone('Tail2', 'Tail1', [0, by + .45, -B[2] - .5]);
  // tête : ronde avec joues blanches en pointe et museau
  ell('Main', 'Head', hc, [hr, hr * .92, hr * .9], 0, true);
  [1, -1].forEach(s => ell('Main_Light', 'Head', [s * hr * .62, hc[1] - hr * .35, hc[2] + hr * .3], [hr * .42, hr * .3, hr * .32], [0, 0, s * .5]));
  ell('Main_Light', 'Head', [0, hc[1] - hr * .3, hc[2] + hr * .72], [hr * .36, hr * .26, hr * .34]);
  ell('Nose', 'Head', [0, hc[1] - hr * .18, hc[2] + hr * 1.02], [hr * .1, hr * .075, hr * .07]);
  smile([0, hc[1] - hr * .42, hc[2] + hr * .98], hr * .16);
  eyes(hc, hr, { spread: .5, dy: .12, size: hr / .62, iris: 'Eye_Black' });
  // oreilles pointues
  [['EarL', 1], ['EarR', -1]].forEach(([b, s]) => {
    const p = [s * hr * .55, hc[1] + hr * 1.05, hc[2] - .05];
    cone('Main', b, p, hr * .3, hr * .7, [-.1, 0, -s * .35], [1, 1, .55]);
    cone('Inner', b, [p[0] + s * -.01, p[1] - .04, p[2] + .07], hr * .2, hr * .5, [-.1, 0, -s * .35], [1, 1, .4]);
    cone('Socks', b, [p[0] + s * hr * .1, p[1] + hr * .27, p[2]], hr * .13, hr * .2, [-.1, 0, -s * .35], [1, 1, .6]);
  });
  // corps, plastron blanc
  ell('Main', 'Torso', [0, by, 0], B, 0, true);
  ell('Main_Light', 'Torso', [0, by - .02, B[2] * .55], [B[0] * .62, B[1] * .78, B[2] * .5]);
  ell('Main', 'Neck1', [0, by + B[1] * .7, B[2] * .55], [B[0] * .55, B[1] * .6, B[2] * .45]);
  // pattes noires
  [['LegFL', lx, lz], ['LegFR', -lx, lz], ['LegBL', lx, -lz], ['LegBR', -lx, -lz]].forEach(([b, x, z]) => {
    lathe('Main', b, [[0, 0], [.17, 0], [.18, L * .5], [.2, L + .2], [0, L + .25]], [x, 0, z]);
    lathe('Socks', b, [[0, 0], [.19, 0], [.2, .06], [.185, L * .55], [0, L * .56]], [x, 0, z]);
  });
  // queue(s) en panache, bout blanc (doré pour l'adulte)
  const tails = st === 3 ? [-.55, 0, .55] : [0];
  const tz = -B[2] - .1, ty = by + .2;
  tails.forEach(a => {
    const sz = st === 1 ? 1.05 : st === 2 ? 1.15 : 1.12;
    const ax = Math.sin(a) * (st === 3 ? 1.1 : .5), up = st === 3 ? 1.25 : 1;
    ell('Main', 'Tail1', [ax * .3, ty, tz], [.3 * sz, .3 * sz, .38 * sz], [.6, 0, -a * .5]);
    ell('Main', 'Tail2', [ax * .75, ty + .42 * sz * up, tz - .3 * sz], [.34 * sz, .38 * sz, .36 * sz], [.9, 0, -a * .7]);
    ell('Main_Light', 'Tail2', [ax * 1.05, ty + .85 * sz * up, tz - .42 * sz], [.25 * sz, .28 * sz, .25 * sz], [1, 0, -a * .8]);
  });
  if (st === 3) { // marques magiques sur le front
    ell('Mark', 'Head', [0, hc[1] + hr * .6, hc[2] + hr * .72], [.06, .12, .035], [-.8, 0, 0]);
    [1, -1].forEach(s => ell('Mark', 'Head', [s * hr * .62, hc[1] + hr * .18, hc[2] + hr * .7], [.03, .09, .025], [-.4, s * .7, -s * .9]));
  }
  return K.finish('Renard' + st, { Main: '#f2843a', Main_Light: '#fff4ea', Socks: '#3d2a26', Inner: '#ffd2bd', Nose: '#2a1a18',
    Eye_White: '#ffffff', Eye_Black: st === 3 ? '#d99a1c' : '#6a3a1a', Eye_Black_Pupil: '#140a08', Gold: '#ffd45a', Mark: '#e8433a' }, hc[1] + hr * 1.6);
}

/* ---------------- lapin : boule → jeune lapin → lapin magicien ---------------- */
export function bunny(THREE, U, st) {
  const K = kit(THREE, U); const { bone, ell, torus, eyes, smile, put, xf, V } = K;
  const B = [[.58, .55, .55], [.56, .66, .5], [.6, .72, .54]][st - 1];
  const by = B[1] * .95;
  const hr = [.66, .64, .64][st - 1];
  const hc = [0, by + B[1] * .85 + hr * .62, .08];
  bone('Body', null, [0, by, 0]); bone('Torso', 'Body', [0, by, 0]);
  bone('Neck1', 'Torso', [0, by + B[1] * .7, .02]); bone('Head', 'Neck1', [0, hc[1] - hr * .7, hc[2]]);
  bone('EarL', 'Head', [hr * .38, hc[1] + hr * .8, hc[2] - .05]); bone('EarR', 'Head', [-hr * .38, hc[1] + hr * .8, hc[2] - .05]);
  bone('LegFL', 'Torso', [B[0] * .62, by + B[1] * .35, B[2] * .6]); bone('LegFR', 'Torso', [-B[0] * .62, by + B[1] * .35, B[2] * .6]);
  bone('LegBL', 'Torso', [B[0] * .55, .3, 0]); bone('LegBR', 'Torso', [-B[0] * .55, .3, 0]);
  bone('Tail1', 'Torso', [0, by - B[1] * .3, -B[2] * .95]); bone('Tail2', 'Tail1', [0, by - B[1] * .3, -B[2] - .2]);
  // tête, joues roses, museau
  ell('Main', 'Head', hc, [hr, hr * .9, hr * .88], 0, true);
  [1, -1].forEach(s => ell('Blush', 'Head', [s * hr * .55, hc[1] - hr * .3, hc[2] + hr * .66], [hr * .17, hr * .1, hr * .06], [0, s * .6, 0]));
  ell('Main_Light', 'Head', [0, hc[1] - hr * .32, hc[2] + hr * .76], [hr * .32, hr * .22, hr * .2]);
  ell('Inner', 'Head', [0, hc[1] - hr * .2, hc[2] + hr * .93], [hr * .09, hr * .065, hr * .05]);
  ell('Teeth', 'Head', [0, hc[1] - hr * .47, hc[2] + hr * .88], [hr * .07, hr * .06, hr * .03]);
  smile([0, hc[1] - hr * .36, hc[2] + hr * .94], hr * .14);
  eyes(hc, hr, { spread: .48, dy: .02, size: hr / .62, iris: 'Eye_Black' });
  // oreilles : tombantes pour le bébé, dressées ensuite
  [['EarL', 1], ['EarR', -1]].forEach(([b, s]) => {
    const len = [.62, .8, .88][st - 1] * hr / .64;
    const up = st === 1 ? [0, 0, -s * 1.9] : [-.12, 0, -s * .22];
    const p = st === 1 ? [s * (hr * .62 + len * .5), hc[1] + hr * .45, hc[2] - .05] : [s * hr * .44, hc[1] + hr * .75 + len * .5, hc[2] - .05];
    ell('Main', b, p, [len * .26, len * .5, len * .16], up);
    put('Inner', xf(K.sph(false), [p[0], p[1], p[2] + (st === 1 ? .06 : .09)], [len * .15, len * .4, len * .06], up), b);
  });
  // corps en poire, ventre clair, pattes avant, gros pieds, pompon
  ell('Main', 'Torso', [0, by, 0], B, 0, true);
  ell('Main_Light', 'Torso', [0, by - .05, B[2] * .5], [B[0] * .66, B[1] * .7, B[2] * .52]);
  [['LegFL', 1], ['LegFR', -1]].forEach(([b, s]) => ell('Main', b, [s * B[0] * .62, by + B[1] * .05, B[2] * .78], [.15, .24, .15], [.4, 0, 0]));
  [['LegBL', 1], ['LegBR', -1]].forEach(([b, s]) => {
    const f = [1, 1.15, 1.2][st - 1];
    ell('Main', b, [s * B[0] * .58, .13, .18], [.2 * f, .14, .34 * f]);
    ell('Inner', b, [s * B[0] * .58, .09, .5 * f], [.1 * f, .06, .03]);
    ell('Main', b, [s * B[0] * .62, .32, -.02], [.24, .26, .3]);
  });
  ell('Main_Light', 'Tail1', [0, by - B[1] * .3, -B[2] - .08], [.2, .2, .2]);
  if (st === 3) { // cape étoilée et petite étoile sur le front
    // cape : coque arrondie dans le dos qui dépasse sur les côtés, doublure dorée
    ell('Cape', 'Torso', [0, by - .02, -B[2] * .42], [B[0] * 1.18, B[1] * 1.02, B[2] * .62], 0, true);
    ell('Gold', 'Torso', [0, by - B[1] * .92, -B[2] * .42], [B[0] * 1.05, .05, B[2] * .55]);
    torus('Gold', 'Torso', [0, by + B[1] * .74, 0], B[0] * .62, .045, Math.PI * 2, [Math.PI / 2, 0, 0], [1, 1, .85]);
    const star = (p, s) => put('Gold', xf(new THREE.OctahedronGeometry(1, 0), p, [s, s, s * .4]), 'Torso');
    [[.4, by + .25, -B[2] * .95], [-.45, by - .2, -B[2] * .9], [.1, by - .45, -B[2] - .03], [-.15, by + .4, -B[2] - .02], [B[0] * 1.15, by, -.1], [-B[0] * 1.15, by + .2, -.15]].forEach(p => star(p, .075));
    put('Gold', xf(new THREE.OctahedronGeometry(1, 0), [0, hc[1] + hr * .62, hc[2] + hr * .62], [.08, .08, .03], [-.6, 0, 0]), 'Head');
  }
  return K.finish('Lapin' + st, { Main: '#f7f2ee', Main_Light: '#ffffff', Inner: '#ffb8cc', Blush: '#ffb0c4', Teeth: '#ffffff', Nose: '#3a2420',
    Eye_White: '#ffffff', Eye_Black: st === 3 ? '#6a4ac0' : '#4a2c22', Eye_Black_Pupil: '#140a08', Cape: '#6a4cc4', Gold: '#ffd45a' }, hc[1] + hr * 1.8);
}

/* ---------------- mouton : agneau → mouton → bélier aux cornes d'or ---------------- */
export function sheep(THREE, U, st) {
  const K = kit(THREE, U); const { bone, ell, lathe, torus, eyes, smile } = K;
  const L = [.32, .4, .48][st - 1];
  const B = [[.66, .58, .72], [.74, .62, .84], [.82, .68, .92]][st - 1];
  const hr = [.56, .54, .56][st - 1];
  const by = L + B[1] * .82;
  const hc = [0, by + B[1] * .7 + hr * .4, B[2] * .78];
  bone('Body', null, [0, by, 0]); bone('Torso', 'Body', [0, by, 0]);
  bone('Neck1', 'Torso', [0, by + B[1] * .4, B[2] * .5]); bone('Head', 'Neck1', [0, hc[1] - hr * .6, hc[2]]);
  bone('EarL', 'Head', [hr * .85, hc[1] + hr * .25, hc[2] - .05]); bone('EarR', 'Head', [-hr * .85, hc[1] + hr * .25, hc[2] - .05]);
  const lx = B[0] * .5, lz = B[2] * .55;
  [['LegFL', lx, lz], ['LegFR', -lx, lz], ['LegBL', lx, -lz], ['LegBR', -lx, -lz]].forEach(([n, x, z]) => bone(n, 'Torso', [x, L + .1, z]));
  bone('Tail1', 'Torso', [0, by + .1, -B[2] * .95]); bone('Tail2', 'Tail1', [0, by + .1, -B[2] - .2]);
  // tête crème, toupet de laine
  ell('Main', 'Head', hc, [hr, hr * .92, hr * .9], 0, true);
  ell('Main', 'Head', [0, hc[1] - hr * .3, hc[2] + hr * .5], [hr * .62, hr * .5, hr * .55]);
  ell('Blush', 'Head', [hr * .55, hc[1] - hr * .28, hc[2] + hr * .62], [hr * .15, hr * .09, hr * .05], [0, .6, 0]);
  ell('Blush', 'Head', [-hr * .55, hc[1] - hr * .28, hc[2] + hr * .62], [hr * .15, hr * .09, hr * .05], [0, -.6, 0]);
  [1, -1].forEach(s => ell('Nose', 'Head', [s * hr * .12, hc[1] - hr * .2, hc[2] + hr * 1.02], [hr * .06, hr * .04, hr * .03], [-.3, 0, 0]));
  smile([0, hc[1] - hr * .42, hc[2] + hr * .98], hr * .14);
  eyes(hc, hr, { spread: .5, dy: .1, size: hr / .6, iris: 'Eye_Black' });
  const tuft = [[0, .8, .1, .34], [.3, .7, .05, .26], [-.3, .7, .05, .26], [.15, .85, -.25, .26], [-.15, .85, -.25, .26], [0, .62, .45, .22]];
  tuft.forEach(([x, y, z, r]) => ell('Wool', 'Head', [hc[0] + x * hr, hc[1] + y * hr, hc[2] + z * hr], [r, r * .9, r]));
  // oreilles à l'horizontale
  [['EarL', 1], ['EarR', -1]].forEach(([b, s]) => {
    ell('Main', b, [s * hr * 1.1, hc[1] + hr * .2, hc[2] - .05], [hr * .36, hr * .14, hr * .2], [0, 0, -s * .35]);
    ell('Inner', b, [s * hr * 1.12, hc[1] + hr * .2, hc[2] + .02], [hr * .26, hr * .08, hr * .1], [0, 0, -s * .35]);
  });
  // cornes : petites bosses (jeune), grandes cornes enroulées dorées (adulte)
  if (st >= 2) [1, -1].forEach(s => {
    if (st === 2) ell('Horn', 'Head', [s * hr * .62, hc[1] + hr * .6, hc[2] + hr * .05], [.13, .11, .13]);
    else {
      const c = [s * hr * 1.02, hc[1] + hr * .2, hc[2] + hr * .05];
      torus('Gold', 'Head', c, hr * .42, hr * .15, Math.PI * 1.55, [0, s * Math.PI / 2, -1.2]);
      ell('Gold', 'Head', [c[0] + s * .02, c[1], c[2]], [hr * .2, hr * .2, hr * .12], [0, s * Math.PI / 2, 0]);
    }
  });
  // corps en nuage de laine
  ell('Wool', 'Torso', [0, by, 0], [B[0] * .9, B[1] * .9, B[2] * .9], 0, true);
  const ring = (y, k, rr, sc) => { for (let i = 0; i < k; i++) { const a = (i + .5) / k * Math.PI * 2; ell('Wool', 'Torso', [Math.sin(a) * B[0] * sc, by + y * B[1], Math.cos(a) * B[2] * sc], [rr, rr * .9, rr]); } };
  ring(.45, 8, .3, .78); ring(0, 10, .32, .95); ring(-.45, 8, .28, .8);
  ell('Wool', 'Torso', [0, by + B[1] * .82, 0], [B[0] * .55, .26, B[2] * .6]);
  ell('Wool', 'Neck1', [0, by + B[1] * .55, B[2] * .62], [B[0] * .55, B[1] * .55, B[2] * .38]);
  // pattes sombres avec un peu de laine en haut
  [['LegFL', lx, lz], ['LegFR', -lx, lz], ['LegBL', lx, -lz], ['LegBR', -lx, -lz]].forEach(([b, x, z]) => {
    lathe('Legs', b, [[0, 0], [.15, 0], [.15, .06], [.13, L * .7], [.15, L + .2], [0, L + .25]], [x, 0, z]);
    lathe('Hooves', b, [[0, 0], [.165, 0], [.165, .1], [.14, .13], [0, .14]], [x, 0, z]);
  });
  ell('Wool', 'Tail1', [0, by + .1, -B[2] - .1], [.18, .18, .16]);
  if (st === 3) ell('Gold', 'Head', [0, hc[1] + hr * .98, hc[2] + hr * .1], [.06, .06, .06]); // petite perle d'or dans le toupet
  return K.finish('Mouton' + st, { Main: '#f6ddcc', Wool: '#fbf7f0', Inner: '#f2b7a8', Blush: '#ffb6b0', Nose: '#4a2c28', Legs: '#5a4038', Hooves: '#3a2622',
    Eye_White: '#ffffff', Eye_Black: '#4a2c22', Eye_Black_Pupil: '#140a08', Horn: '#e8d4b0', Gold: '#ffcf4a' }, hc[1] + hr * 1.4);
}

export const CRITTERS = { renard: fox, lapin: bunny, mouton: sheep };
