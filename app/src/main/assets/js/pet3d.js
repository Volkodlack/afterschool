/* Compagnons en 3D (three.js + modèles animés CC0 de Quaternius).
   - Pet3D.view(hôte, pet)  : scène animée en direct (écran d'accueil), on peut la faire tourner au doigt.
   - Pet3D.snap(pet, pose)  : image fixe (choix du compagnon, boutique, widget Android).
   Si la 3D n'est pas disponible (WebGL absent, modèle introuvable), l'ancien dessin reste affiché. */
(function () {
  const BASE = 'models/pets/';
  /* fichiers, orientation et animations de chaque espèce (clé → nom du clip, null = animation procédurale) */
  const STAGED = ['chat', 'renard', 'lapin', 'slime', 'dragon', 'mouton'];
  const M = {
    /* compagnons faits main (art/pony/critters.js) : un modèle par stade d'évolution */
    ...(() => {
      const o = {}, A = { idle: 'Idle', idle2: 'Idle_2', sad: 'Idle_Headlow', eat: 'Eating', jump: 'Gallop_Jump', happy: 'Jump_toIdle', wash: 'Idle_HitReact1' };
      STAGED.forEach(k => [1, 2, 3].forEach(st => { o[k + st] = { file: k + st, ownEyes: true, neck: { r: 1.1 }, acc: { renard: .82, lapin: .8, mouton: .72, chat: .8, slime: .78, dragon: .8 }[k], yaw: { lapin: .4, slime: .3, dragon: .45 }[k] || .55, anims: A }; }));
      return o;
    })(),
    poney:   { file: 'poney', neck: { r: 1.15 }, acc: 1.15, yaw: .55, ownBlaze: true, ownEyes: true, wing: .62, anims: { idle: 'Idle', idle2: 'Idle_2', sad: 'Idle_Headlow', eat: 'Eating', jump: 'Gallop_Jump', happy: 'Jump_toIdle', wash: 'Idle_HitReact1' } },
  };
  const PONY = ['poney', 'licorne', 'pegase', 'poulain', 'nuit', 'tachete'];
  function modelKey(p) {
    if (PONY.includes(p.species)) return 'poney';
    if (STAGED.includes(p.species)) return p.species + Math.min(3, Math.max(1, p.stage || 1));
    return M[p.species] ? p.species : null;
  }

  /* ---------- chargement paresseux de three.js ---------- */
  let libP = null;
  function lib() {
    if (window.T3) return Promise.resolve(window.T3);
    if (!libP) libP = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = 'js/vendor/three-pet.js';
      s.onload = () => window.T3 ? res(window.T3) : rej(new Error('three')); s.onerror = rej;
      document.head.appendChild(s);
    });
    return libP;
  }
  let glOk = null;
  function supported() {
    if (glOk !== null) return glOk;
    try { const c = document.createElement('canvas'); glOk = !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { glOk = false; }
    if (/[?&]no3d/.test(location.search)) glOk = false;
    return glOk;
  }

  const gltfP = {};
  function loadModel(key) {
    if (!gltfP[key]) gltfP[key] = lib().then(T => new T.GLTFLoader().loadAsync(BASE + M[key].file + '.glb')).then(g => { prep(g, key); return g; });
    return gltfP[key];
  }
  /* lissage : on soude les sommets et on recalcule les normales (rendu « 3D lisse » plutôt que facettes) */
  function prep(g, key) {
    const { THREE, mergeVertices } = window.T3;
    g.scene.traverse(o => {
      if (!o.isMesh) return;
      try {
        let geo = o.geometry.clone();
        geo.deleteAttribute('normal');
        for (const n of Object.keys(geo.attributes)) { const a = geo.attributes[n]; if (a.normalized || a.array.constructor !== Float32Array) geo.setAttribute(n, toFloat(THREE, a)); }
        geo = mergeVertices(geo, 1e-3);
        geo.computeVertexNormals();
        o.geometry = geo;
      } catch (e) { o.geometry.computeVertexNormals(); }
    });
  }
  function toFloat(THREE, a) {
    const n = a.count, s = a.itemSize, out = new Float32Array(n * s);
    const isIdx = a.name === 'skinIndex' || (!a.normalized && a.array.constructor !== Float32Array);
    for (let i = 0; i < n; i++) for (let k = 0; k < s; k++) out[i * s + k] = a.getComponent ? a.getComponent(i, k) : a.array[i * s + k];
    const b = new THREE.BufferAttribute(out, s);
    return isIdx ? new THREE.BufferAttribute(Uint16Array.from(out), s) : b;
  }

  /* ---------- petits outils de géométrie ---------- */
  function mat(color, o) {
    const { THREE } = window.T3;
    return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .55, metalness: 0 }, o || {}));
  }
  const GOLD = () => mat('#f5c542', { metalness: .65, roughness: .3, emissive: '#5a3a00', emissiveIntensity: .25 });
  function mesh(geo, m, pos, rot, scl) {
    const { THREE } = window.T3;
    const x = new THREE.Mesh(geo, m);
    if (pos) x.position.set(...pos); if (rot) x.rotation.set(...rot); if (scl) x.scale.set(...scl);
    return x;
  }
  function group(...kids) { const g = new window.T3.THREE.Group(); kids.forEach(k => k && g.add(k)); return g; }
  function heartShape() {
    const { THREE } = window.T3; const s = new THREE.Shape();
    s.moveTo(0, -.5); s.bezierCurveTo(-.15, -.3, -.55, -.15, -.5, .15); s.bezierCurveTo(-.45, .45, -.08, .45, 0, .2);
    s.bezierCurveTo(.08, .45, .45, .45, .5, .15); s.bezierCurveTo(.55, -.15, .15, -.3, 0, -.5); return s;
  }

  /* ---------- accessoires 3D : repère « tête » (x à droite, y en haut, z vers l'avant), unité = largeur de la tête ---------- */
  function buildAcc(id, slot) {
    const { THREE } = window.T3;
    const S = (r, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h);
    const HEMI = r => new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const CYL = (a, b, h, n = 24, open) => new THREE.CylinderGeometry(a, b, h, n, 1, !!open);
    const CONE = (r, h, n = 20) => new THREE.ConeGeometry(r, h, n);
    const TOR = (r, t, arc) => new THREE.TorusGeometry(r, t, 12, 32, arc || Math.PI * 2);
    switch (id) {
      /* tête */
      case 'bow': { const m = mat(slot === 'pony' ? '#7ec8f5' : '#ff8fb1'); return group(mesh(CONE(.16, .3), m, [.17, 0, 0], [0, 0, Math.PI / 2]), mesh(CONE(.16, .3), m, [-.17, 0, 0], [0, 0, -Math.PI / 2]), mesh(S(.08), m)).translateX(.28).translateY(.02); }
      case 'flower': { const g = group(); const pm = mat('#ff8fb1'); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; g.add(mesh(S(.08), pm, [Math.cos(a) * .1, Math.sin(a) * .1, 0], 0, [1, 1, .5])); } g.add(mesh(S(.07), mat('#f5c542'), [0, 0, .02])); g.position.set(.3, .02, .05); g.rotation.set(-.3, .4, 0); return g; }
      case 'flowers': { const g = group(); const cols = ['#ff8fb1', '#ffffff', '#c49bf0', '#ffe066', '#7ec8f5']; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; g.add(mesh(S(.075), mat(cols[i % 5]), [Math.cos(a) * .36, 0, Math.sin(a) * .36], 0, [1, .7, 1])); g.add(mesh(S(.04), mat('#6cc04a'), [Math.cos(a + .35) * .37, -.02, Math.sin(a + .35) * .37])); } return g; }
      case 'cap': { const m = mat('#3d7be5'); return group(mesh(HEMI(.42), m, 0, 0, [1, .75, 1]), mesh(CYL(.3, .3, .03, 24), m, [0, .01, .36], 0, [1, 1, .9]), mesh(S(.05), mat('#ffffff'), [0, .32, 0])).translateY(-.08); }
      case 'helmet': { const m = mat('#2b2b3a', { roughness: .8 }); return group(mesh(HEMI(.44), m, 0, 0, [1, .85, 1.05]), mesh(CYL(.22, .22, .03, 24, false), m, [0, .02, .38], [.15, 0, 0], [1, 1, .7]), mesh(S(.05), mat('#ff8fb1'), [0, .38, 0])).translateY(-.1); }
      case 'headphones': { const m = mat('#a8a8b4', { metalness: .3 }), c = mat('#e5533d'); return group(mesh(TOR(.5, .05, Math.PI), m, [0, -.1, 0]), mesh(CYL(.15, .15, .12), c, [.5, -.15, 0], [0, 0, Math.PI / 2]), mesh(CYL(.15, .15, .12), c, [-.5, -.15, 0], [0, 0, Math.PI / 2])); }
      case 'santa': { const r = mat('#e5533d'), w = mat('#ffffff', { roughness: .9 }); const tip = group(mesh(CONE(.36, .7), r, [0, .35, 0]), mesh(S(.09), w, [0, .72, 0])); tip.rotation.z = -.35; return group(tip, mesh(TOR(.36, .09), w, [0, 0, 0], [Math.PI / 2, 0, 0])).translateY(-.02); }
      case 'hat': { const k = mat('#1a1a24'); return group(mesh(CYL(.28, .28, .55), k, [0, .3, 0]), mesh(CYL(.5, .5, .04), k, [0, .03, 0]), mesh(CYL(.29, .29, .1), mat('#e5533d'), [0, .1, 0])); }
      case 'bandana': { const m = mat('#e5533d'); const g = group(mesh(HEMI(.43), m, 0, 0, [1, .55, 1.05])); g.add(mesh(S(.08), m, [.2, .05, -.38])); g.add(mesh(CONE(.07, .25), m, [.27, -.05, -.45], [.8, 0, -.6])); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.add(mesh(S(.035), mat('#ffffff'), [Math.cos(a) * .32, .16, Math.sin(a) * .32])); } return g.translateY(-.06); }
      case 'wizard': case 'witch': {
        const m = mat(id === 'wizard' ? '#7b4cc4' : '#ff6fb0'), st = mat('#f5c542', { emissive: '#f5c542', emissiveIntensity: .5 });
        const cone = group(mesh(CONE(.36, .9), m, [0, .45, 0])); cone.rotation.z = -.15;
        return group(cone, mesh(CYL(.6, .6, .04), m, [0, .02, 0]), mesh(new THREE.OctahedronGeometry(.07), st, [.12, .4, .3]), mesh(new THREE.OctahedronGeometry(.05), st, [-.15, .25, .3]));
      }
      case 'viking': { const g = mat('#a8a8b4', { metalness: .5, roughness: .35 }), h = mat('#fff4d6'); const horn = s => { const x = mesh(CONE(.09, .4, 12), h, [s * .42, .15, 0], [0, 0, -s * .9]); return x; }; return group(mesh(HEMI(.42), g, 0, 0, [1, .8, 1]), mesh(TOR(.42, .05), GOLD(), [0, .02, 0], [Math.PI / 2, 0, 0]), horn(1), horn(-1)).translateY(-.06); }
      case 'halo': { const m = mat('#ffe066', { emissive: '#ffd23a', emissiveIntensity: 1.2, metalness: .3 }); return group(mesh(TOR(.32, .05), m, [0, .35, 0], [Math.PI / 2, 0, 0])); }
      case 'crown': case 'diamond': {
        const m = id === 'crown' ? GOLD() : mat('#eef4ff', { metalness: .8, roughness: .15 }); const g = group(mesh(CYL(.3, .27, .2, 24, true), m, [0, .1, 0]));
        g.children[0].material.side = THREE.DoubleSide;
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.add(mesh(CONE(.06, .18, 8), m, [Math.cos(a) * .29, .28, Math.sin(a) * .29])); }
        const gem = id === 'crown' ? mat('#e5533d', { roughness: .15 }) : mat('#7ef0ff', { roughness: .05, metalness: .2, emissive: '#2aa8c8', emissiveIntensity: .4 });
        g.add(mesh(new THREE.OctahedronGeometry(id === 'crown' ? .06 : .09), gem, [0, .12, .3]));
        if (id === 'diamond') { g.add(mesh(new THREE.OctahedronGeometry(.06), gem, [.2, .14, .22])); g.add(mesh(new THREE.OctahedronGeometry(.06), gem, [-.2, .14, .22])); g.add(mesh(new THREE.OctahedronGeometry(.08), gem, [0, .42, 0])); }
        return g.translateY(-.04);
      }
      case 'tiara': { const m = mat('#eef4ff', { metalness: .8, roughness: .15 }); const g = group(mesh(TOR(.34, .025, Math.PI), m, [0, 0, 0], [0, 0, 0])); g.children[0].rotation.set(-Math.PI / 2, 0, 0); g.add(mesh(new THREE.OctahedronGeometry(.08), mat('#ff8fb1', { roughness: .1, emissive: '#ff5c8a', emissiveIntensity: .3 }), [0, .1, .32])); g.add(mesh(new THREE.OctahedronGeometry(.05), mat('#7ef0ff', { roughness: .1 }), [.2, .06, .26])); g.add(mesh(new THREE.OctahedronGeometry(.05), mat('#7ef0ff', { roughness: .1 }), [-.2, .06, .26])); return g; }
      /* yeux : origine entre les yeux, x = demi-écart des yeux */
      case 'glasses': case 'sunglasses': case 'heartglasses': case 'eyepatch': return null; // construits dans buildEyes
      /* cou */
      case 'scarf': { const m = mat('#e5533d', { roughness: .9 }); const g = group(mesh(TOR(.48, .11), m, 0, [Math.PI / 2, 0, 0], [1, 1, .8])); g.add(mesh(new THREE.BoxGeometry(.18, .38, .07), m, [.22, -.22, .46], [.1, 0, .15])); g.add(mesh(TOR(.5, .04), mat('#ffffff'), [0, -.06, 0], [Math.PI / 2, 0, 0])); return g; }
      case 'bowtie': { const m = mat('#e5533d'); return group(mesh(CONE(.14, .26, 4), m, [.14, 0, 0], [0, 0, Math.PI / 2]), mesh(CONE(.14, .26, 4), m, [-.14, 0, 0], [0, 0, -Math.PI / 2]), mesh(S(.07), mat('#ffffff'))).translateZ(.5).translateY(-.04); }
      case 'necklace': { const g = GOLD(); return group(mesh(TOR(.48, .025), g, 0, [Math.PI / 2 + .25, 0, 0]), mesh(CYL(.13, .13, .04), g, [0, -.2, .5], [Math.PI / 2 - .2, 0, 0]), mesh(new THREE.OctahedronGeometry(.05), mat('#e5533d'), [0, -.2, .53])); }
      /* dos (poney) : origine sur le dessus du dos, z = longueur du corps */
      case 'blanket': case 'saddle': {
        const blanket = id === 'blanket';
        const m = mat(blanket ? '#6a5cb8' : '#3d7be5', { side: THREE.DoubleSide, roughness: .8 });
        const g = group(mesh(new THREE.CylinderGeometry(.62, .62, blanket ? 1.1 : .55, 28, 1, true, Math.PI - 1.3, 2.6), m, [0, -.5, 0], [Math.PI / 2, 0, 0]));
        if (blanket) { for (let i = 0; i < 5; i++) g.add(mesh(new THREE.OctahedronGeometry(.06), mat('#ffe066', { emissive: '#ffd23a', emissiveIntensity: .5 }), [(i % 2 ? .3 : -.3) * (i > 2 ? -1 : 1), -.1 - (i % 3) * .08, -.35 + i * .17])); }
        else { g.add(mesh(new THREE.TorusGeometry(.1, .04, 8, 20), mat('#8a5a3c'), [0, .1, -.1], [Math.PI / 2, 0, 0])); g.add(mesh(CYL(.12, .12, .04), mat('#ffe066'), [.6, -.3, 0], [0, 0, Math.PI / 2])); }
        return g;
      }
    }
    return null;
  }
  function buildEyes(id) {
    const { THREE } = window.T3;
    const g = group();
    const frame = mat(id === 'heartglasses' ? '#ff5c8a' : '#1a1a24', { metalness: .2 });
    if (id === 'eyepatch') {
      const k = mat('#1a1a24');
      g.add(mesh(new THREE.CylinderGeometry(.42, .42, .06, 24), k, [1, 0, .05], [Math.PI / 2, 0, 0]));
      g.add(mesh(new THREE.TorusGeometry(1.25, .04, 8, 40), k, [0, .2, -.6], [Math.PI / 2 + .3, 0, 0], [1, 1.2, 1]));
      return g;
    }
    [-1, 1].forEach(s => {
      if (id === 'glasses') g.add(mesh(new THREE.TorusGeometry(.42, .06, 10, 28), frame, [s, 0, .1]));
      if (id === 'sunglasses') { g.add(mesh(new THREE.CylinderGeometry(.45, .45, .06, 28), mat('#1f2238', { roughness: .1, metalness: .4 }), [s, 0, .1], [Math.PI / 2, 0, 0])); }
      if (id === 'heartglasses') g.add(mesh(new THREE.ExtrudeGeometry(heartShape(), { depth: .08, bevelEnabled: false }), mat('#ff5c8a', { roughness: .2 }), [s, 0, .08], 0, [1.1, 1.1, 1]));
    });
    g.add(mesh(new THREE.CylinderGeometry(.05, .05, .9, 8), frame, [0, .05, .12], [0, 0, Math.PI / 2], [1, id === 'glasses' ? .7 : 1, 1]));
    return g;
  }
  function buildHorn() {
    const { THREE } = window.T3;
    const geo = new THREE.ConeGeometry(.12, .62, 24, 8);
    const pos = geo.attributes.position, col = [];
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); const a = Math.atan2(pos.getZ(i), pos.getX(i)); const band = Math.sin(a * 2 + y * 22) > 0; const c = band ? new THREE.Color('#fff2b0') : new THREE.Color('#f5c542'); col.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return mesh(geo, mat('#ffffff', { vertexColors: true, metalness: .35, roughness: .25, emissive: '#6a4a00', emissiveIntensity: .2 }), [0, .3, 0]);
  }
  function buildWings(color) {
    const { THREE } = window.T3;
    const side = s => {
      const w = group(); const m = mat(color || '#ffffff', { roughness: .7 }), m2 = mat('#e8e0f8', { roughness: .7 });
      [[.0, .0, 1.0, .34], [.18, -.1, .85, .26], [.34, -.2, .7, .2]].forEach(([z, y, len, r], i) => {
        w.add(mesh(new THREE.SphereGeometry(.5, 18, 10), i % 2 ? m2 : m, [s * len * .5, y + len * .25, -z], [0, 0, s * .45], [len, r, .32]));
      });
      return w;
    };
    const L = side(-1), R = side(1);
    const g = group(L, R); g.userData.wings = [L, R];
    return g;
  }
  function buildDirt() {
    const { THREE } = window.T3;
    const g = group(); const m = mat('#6b4a2a', { roughness: 1 });
    g.add(mesh(new THREE.SphereGeometry(.5, 12, 8), m, 0, 0, [1, .25, .8]));
    g.add(mesh(new THREE.SphereGeometry(.25, 10, 6), m, [.45, 0, .2], 0, [1, .3, 1]));
    return g;
  }

  /* ---------- analyse d'un modèle : boîtes de la tête, des yeux, du cou, du dos ---------- */
  function analyse(scene, key) {
    const { THREE } = window.T3;
    scene.updateMatrixWorld(true);
    const cfg = M[key];
    const B = () => new THREE.Box3();
    const boxes = { head: B(), eyes: B(), neck: B(), body: B(), all: B(), eb: [B(), B()], ew: [B(), B()] };
    let headBone = null, neckBone = null, bodyBone = null, rootBone = null;
    const bodyVerts = [];
    const v = new THREE.Vector3(), nrm = new THREE.Vector3();
    scene.traverse(o => {
      if (!o.isSkinnedMesh) return;
      const bones = o.skeleton.bones;
      const isHead = b => { for (let x = b; x; x = x.parent) { if (cfg.headBones ? cfg.headBones.includes(x.name) && x === b : /^head$/i.test(x.name)) return !/ear/i.test(b.name); } return false; };
      const cls = bones.map(b => isHead(b) ? 'head' : /neck/i.test(b.name) ? 'neck' : /^(torso\d*|back|body\d*|hips|abdomen|shoulders|spine\d*)$/i.test(b.name) ? 'body' : '');
      bones.forEach(b => { if (!headBone && /^head$/i.test(b.name)) headBone = b; if (!neckBone && /neck/i.test(b.name)) neckBone = b; if (!rootBone) rootBone = b; });
      bones.forEach((b, i) => { if (cls[i] === 'neck' && b !== neckBone) cls[i] = ''; });
      bodyBone = bones.find(b => /^torso2$/i.test(b.name)) || bones.find(b => /^torso$/i.test(b.name)) || bones.find(b => /^body$/i.test(b.name)) || bones.find(b => /back|hips/i.test(b.name)) || bones[0];
      const si = o.geometry.attributes.skinIndex, sw = o.geometry.attributes.skinWeight, nm = o.geometry.attributes.normal;
      const mats = [].concat(o.material); const isEye = /eye/i.test(mats[0].name), eyeB = /eye_black/i.test(mats[0].name), eyeW = /eye_white/i.test(mats[0].name);
      for (let i = 0; i < si.count; i++) {
        o.getVertexPosition(i, v); v.applyMatrix4(o.matrixWorld);
        let best = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; best = si.getComponent(i, k); } }
        const c = cls[best];
        boxes.all.expandByPoint(v);
        if (isEye) boxes.eyes.expandByPoint(v);
        if (eyeB || eyeW) (eyeB ? boxes.eb : boxes.ew)[v.x < 0 ? 0 : 1].expandByPoint(v);
        if (c) boxes[c].expandByPoint(v);
        if (c === 'body' && i % 3 === 0 && nm) { nrm.fromBufferAttribute(nm, i).transformDirection(o.matrixWorld); bodyVerts.push([v.clone(), nrm.clone(), bones[best]]); }
      }
    });
    if (!headBone) headBone = rootBone;
    if (boxes.head.isEmpty()) boxes.head.copy(boxes.all);
    if (cfg.headBones && key === 'slime') { boxes.head.copy(boxes.all); }
    return { boxes, headBone, neckBone: neckBone || headBone, bodyBone: bodyBone || rootBone, bodyVerts };
  }
  /* fixe un objet construit en « repère monde au repos » sur un os, pour qu'il suive l'animation */
  function attach(obj, bone, worldPos, unit) {
    const { THREE } = window.T3;
    bone.updateMatrixWorld(true);
    const q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    bone.matrixWorld.decompose(p, q, s);
    const holder = new THREE.Group();
    holder.position.copy(bone.worldToLocal(worldPos.clone()));
    holder.quaternion.copy(q.invert());
    holder.scale.set(unit / s.x, unit / s.y, unit / s.z);
    holder.add(obj); bone.add(holder);
    return holder;
  }
  function rand(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = s * 16807 % 2147483647) / 2147483647; }

  /* ---------- couleurs des poneys ---------- */
  const PONY_COL = {
    poney:   { Main: '#e8a66b', Main_Dark: '#c9844c', Main_Light: '#f2c08f', Hair: '#ff8fb1', Muzzle: '#f6cfc0', Hooves: '#8a5a4a', Socks: '#fff6ea', Eye_Black: '#6a3a20', blaze: true },
    licorne: { Main: '#ffffff', Main_Dark: '#efe6f2', Main_Light: '#ffffff', Hair: '#ff8fb1', Muzzle: '#ffdbe6', Hooves: '#c49bf0', Socks: '#ffffff', Eye_Black: '#7a52b8', rainbow: true, horn: true },
    pegase:  { Main: '#ece6fa', Main_Dark: '#d2c6ee', Main_Light: '#f6f2ff', Hair: '#7ec8f5', Muzzle: '#f0e0f6', Hooves: '#9c70d0', Socks: '#ffffff', Eye_Black: '#3a72c0', wings: true },
    poulain: { Main: '#c98a5c', Main_Dark: '#a46a40', Main_Light: '#ddb08a', Hair: '#5a3a2a', Muzzle: '#f0c8b4', Hooves: '#5a3a2a', Socks: '#fff1e0', Eye_Black: '#4a2c1a', blaze: true },
    nuit:    { Main: '#4a3a46', Main_Dark: '#33262f', Main_Light: '#6a5866', Hair: '#1e1520', Muzzle: '#b8a0ae', Hooves: '#2b1d26', Socks: '#d8c8d2', Eye_Black: '#8a6ad0', blaze: true },
    tachete: { Main: '#f2d6a8', Main_Dark: '#d9b880', Main_Light: '#fbe8c8', Hair: '#ffffff', Muzzle: '#f8d8c8', Hooves: '#8a5a4a', Socks: '#ffffff', Eye_Black: '#6a3a20', spots: '#8a5a3c' }
  };

  /* ---------- construction d'une instance ---------- */
  async function build(p) {
    const key = modelKey(p); if (!key) throw new Error('espèce ' + p.species);
    const g = await loadModel(key);
    const T = window.T3, { THREE } = T, cfg = M[key];
    const scene = T.SkeletonUtils.clone(g.scene);
    const pc = PONY_COL[p.species];
    const eyeMats = [];
    scene.traverse(o => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      const mats = [].concat(o.material).map(m0 => {
        const m = m0.clone(); m.roughness = .62; m.metalness = 0;
        const want = (pc && pc[m.name]) || (cfg.colors && cfg.colors[m.name]) || (pc && m.name === 'Blaze' && !pc.blaze && pc.Main) || (pc && m.name === 'Socks' && pc.Main_Light);
        if (want) m.color.set(want);
        if (/eye_white/i.test(m.name)) { m.color.set('#ffffff'); m.roughness = .2; eyeMats.push(m); }
        if (/eye_black/i.test(m.name)) { if (!cfg.ownEyes) m.color.set('#141018'); m.roughness = .1; eyeMats.push(m); }
        return m;
      });
      o.material = Array.isArray(o.material) ? mats : mats[0];
      const m = mats[0];
      if (pc && pc.rainbow && m.name === 'Hair') rainbow(o, m);
      if (pc && pc.spots && m.name === 'Main') spots(o, m, pc.spots, pc.Main);
    });
    let skin = null;
    scene.traverse(o => { if (!skin && o.isMesh) { const m = [].concat(o.material)[0]; if (!/eye/i.test(m.name)) skin = m.color.clone(); } });
    const info = analyse(scene, key);
    const hb = info.boxes.head, hs = hb.getSize(new THREE.Vector3()), hc = hb.getCenter(new THREE.Vector3());
    const unit = Math.max(hs.x, hs.y * (cfg.acc ? .62 : 0), .2) * (cfg.acc || 1);
    const wear = (p.wear && typeof p.wear === 'object') ? p.wear : {};
    const accs = Object.values(wear).filter(Boolean);
    if (pc && pc.horn && !accs.includes('horn')) accs.push('horn');
    if (pc && pc.wings && !accs.includes('wings')) accs.push('wings');
    const wings = [];
    const headTop = new THREE.Vector3(hc.x, hb.max.y - hs.y * .12, hc.z - hs.z * .05);
    accs.forEach(id => {
      if (id === 'sparkle' || id === 'rainbow') return;
      if (id === 'horn') { const h = buildHorn(); h.rotation.x = .55; attach(h, info.headBone, new THREE.Vector3(hc.x, hb.max.y - hs.y * .22, hc.z + hs.z * .18), unit * 1.5); return; }
      if (id === 'wings') { const w = buildWings(pc && pc.Main); const bb = info.boxes.body; const bc = bb.getCenter(new THREE.Vector3()); attach(w, info.bodyBone, new THREE.Vector3(bc.x, bb.max.y - (bb.max.y - bb.min.y) * .08, bc.z + (bb.max.z - bb.min.z) * .18), (bb.max.x - bb.min.x) * 1.9 * (cfg.wing || 1)); wings.push(...w.userData.wings); return; }
      if (/glasses|eyepatch/.test(id)) {
        const eb = info.boxes.eyes.isEmpty() ? null : info.boxes.eyes;
        const ec = eb ? eb.getCenter(new THREE.Vector3()) : new THREE.Vector3(hc.x, hc.y + hs.y * .1, hb.max.z - hs.z * .25);
        const half = eb ? Math.max((eb.max.x - eb.min.x) / 2 - (eb.max.y - eb.min.y) * .35, hs.x * .2) : hs.x * .25 * (cfg.acc || 1);
        const front = eb ? eb.max.z : hb.max.z - hs.z * .2;
        attach(buildEyes(id), info.headBone, new THREE.Vector3(ec.x, ec.y, front + .02), half);
        return;
      }
      const obj = buildAcc(id, PONY.includes(p.species) ? 'pony' : 'pixel'); if (!obj) return;
      const slot = ({ scarf: 'neck', bowtie: 'neck', necklace: 'neck', blanket: 'body', saddle: 'body' })[id] || 'head';
      if (slot === 'head') attach(obj, info.headBone, headTop, unit * 1.05);
      else if (slot === 'neck') {
        const nk = cfg.neck || {};
        const nb = info.boxes.neck.isEmpty() || nk.force ? null : info.boxes.neck;
        const anchor = nb ? nb.getCenter(new THREE.Vector3()) : new THREE.Vector3(hc.x, hb.min.y + hs.y * (nk.y || .05), hc.z + hs.z * (nk.z || 0));
        const r = nb ? Math.max(nb.max.x - nb.min.x, Math.min(nb.max.z - nb.min.z, nb.max.y - nb.min.y) * .9) * (nk.r || 1) : hs.x * (nk.r || .9);
        const rr = nb ? r : Math.min(r, hs.x * .95);
        attach(obj, nb ? info.neckBone : info.headBone, anchor, rr);
        if (nb && info.headBone !== info.neckBone) {
          /* l'anneau suit la direction du cou (presque horizontale chez les animaux à quatre pattes) */
          const a = new THREE.Vector3(), b = new THREE.Vector3();
          info.neckBone.getWorldPosition(a); info.headBone.getWorldPosition(b);
          const dir = b.sub(a).normalize();
          if (dir.y < .97) obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        }
      } else {
        const bb = info.boxes.body, bc = bb.getCenter(new THREE.Vector3());
        attach(obj, info.bodyBone, new THREE.Vector3(bc.x, bb.max.y, bc.z + (bb.max.z - bb.min.z) * .05), (bb.max.x - bb.min.x) * .95);
      }
    });
    /* pupilles rondes et brillantes (les monstres d'origine ont des yeux en fente, l'air endormi) */
    if (cfg.roundEyes) {
      scene.traverse(o => { if (o.isMesh && /eye_black/i.test([].concat(o.material)[0].name)) o.visible = false; });
      const pm = mat('#120c16', { roughness: .15 }), hm = mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: .8 });
      [0, 1].forEach(sd => {
        const b = info.boxes.eb[sd]; if (b.isEmpty()) return;
        const c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3());
        const w = info.boxes.ew[sd];
        const n = w.isEmpty() ? new THREE.Vector3(0, 0, 1) : c.clone().sub(w.getCenter(new THREE.Vector3())).normalize();
        if (n.z < .2) n.z = .2; n.normalize();
        const r = Math.max(sz.x, sz.z * .7) * .42 * (cfg.pupil || 1);
        const g = group(mesh(new THREE.SphereGeometry(1, 20, 14), pm, 0, 0, [1, 1.12, .35]), mesh(new THREE.SphereGeometry(.28, 10, 8), hm, [-.32, .38, .3]), mesh(new THREE.SphereGeometry(.13, 8, 6), hm, [.3, -.3, .32]));
        g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
        if (w.isEmpty()) { const sc = mesh(new THREE.SphereGeometry(1, 20, 14), mat('#ffffff', { roughness: .2 }), [0, 0, -.25], 0, [1.45, 1.5, .5]); g.add(sc); eyeMats.push(sc.material); }
        attach(g, info.headBone, c.clone().addScaledVector(n, r * .3), r);
        eyeMats.push(pm, hm);
      });
    }
    if (pc && pc.blaze && !cfg.ownBlaze && !accs.some(a => /glasses|eyepatch/.test(a))) {
      const bl = mesh(new THREE.SphereGeometry(.5, 16, 10), mat('#ffffff'), 0, 0, [.22, .3, .08]);
      attach(bl, info.headBone, new THREE.Vector3(hc.x, hc.y + hs.y * .05, hb.max.z - hs.z * .28), unit);
      bl.parent.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-.9, 0, 0)));
    }
    /* taches de boue posées sur le corps */
    const dirt = [];
    const r = rand(77 + p.species.length * 13);
    const pool = info.bodyVerts.filter(([pt, n]) => n.y > -.2);
    for (let i = 0; i < 4 && pool.length; i++) {
      const [pt, n, bone] = pool[Math.floor(r() * pool.length)];
      const d = buildDirt(); d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
      const h = attach(d, bone, pt, unit * .32); h.visible = false; dirt.push(h);
    }
    /* normalisation : pieds au sol, hauteur 1 */
    const root = new THREE.Group(), spin = new THREE.Group(), norm = new THREE.Group();
    root.add(spin); spin.add(norm); norm.add(scene);
    const all = info.boxes.all, sz = all.getSize(new THREE.Vector3());
    spin.rotation.y = cfg.yaw;
    const ext = Math.max(sz.y, sz.x * (cfg.wide || 1.05), Math.hypot(sz.x, sz.z) * .62);
    const sc = 1 / ext;
    norm.scale.setScalar(sc);
    norm.position.set(-(all.min.x + all.max.x) / 2 * sc, -all.min.y * sc + (cfg.fly ? .06 : 0), -(all.min.z + all.max.z) / 2 * sc);
    const mixer = new THREE.AnimationMixer(scene);
    const clips = {}; g.animations.forEach(c => clips[c.name] = c);
    return { skin, root, spin, scene, mixer, clips, cfg, key, info, eyeMats, wings, dirt, height: sz.y * sc };
  }
  function rainbow(o, m) {
    const { THREE } = window.T3; const g = o.geometry, pos = g.attributes.position; const v = new THREE.Vector3();
    let lo = Infinity, hi = -Infinity; const zs = [];
    for (let i = 0; i < pos.count; i++) { o.getVertexPosition(i, v); const t = v.y - v.z * .6; zs.push(t); lo = Math.min(lo, t); hi = Math.max(hi, t); }
    const col = []; const c = new THREE.Color();
    zs.forEach(t => { c.setHSL(((t - lo) / (hi - lo + 1e-6)) * .8, .85, .68); col.push(c.r, c.g, c.b); });
    o.geometry = g.clone(); o.geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    m.vertexColors = true; m.color.set('#ffffff');
  }
  function spots(o, m, spot, coat) {
    const { THREE } = window.T3; const g = o.geometry, pos = g.attributes.position; const v = new THREE.Vector3();
    const a = new THREE.Color(coat), b = new THREE.Color(spot); const col = [];
    for (let i = 0; i < pos.count; i++) {
      o.getVertexPosition(i, v);
      const n = Math.sin(v.x * 5.1 + 1.3) * Math.sin(v.y * 4.3 + .7) * Math.sin(v.z * 3.7 + 2.1);
      const c = n > .28 ? b : a; col.push(c.r, c.g, c.b);
    }
    o.geometry = g.clone(); o.geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    m.vertexColors = true; m.color.set('#ffffff');
  }

  /* ---------- animation ---------- */
  function Animator(inst) {
    const { THREE } = window.T3;
    const { mixer, clips, cfg } = inst;
    const actions = {};
    const act = name => { const c = name && clips[name]; if (!c) return null; return actions[name] || (actions[name] = mixer.clipAction(c)); };
    let base = null, baseKey = 'idle', one = null, oneEnd = 0, proc = null, procT = 0, sleepy = false, eyesShut = 0, t = 0;
    const st = { sad: 0, sleep: 0, chomp: 0 };
    function fade(to, d = .3) { if (base === to) return; if (to) { to.reset(); to.enabled = true; to.setEffectiveWeight(1); to.play(); if (base) base.crossFadeTo(to, d, false); } else if (base) base.fadeOut(d); base = to; }
    function setBase(k) {
      baseKey = k;
      const name = cfg.anims[k] !== undefined ? cfg.anims[k] : null;
      const a = act(name) || act(cfg.anims.idle);
      if (one) return; // on reprendra après l'animation ponctuelle
      fade(a); if (a) a.timeScale = k === 'sleep' ? .35 : (k === 'sad' && !cfg.anims.sad) ? .6 : 1;
    }
    function play(k) {
      const name = cfg.anims[k];
      const a = act(name);
      if (k === 'eat' && !a) { st.chomp = 1.6; return; }
      if (!a) { proc = k; procT = 0; return; }
      if (k === 'eat') { a.setLoop(THREE.LoopRepeat); fade(a, .2); a.timeScale = 1; one = a; oneEnd = t + Math.max(1.6, a.getClip().duration); return; }
      a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.timeScale = k === 'jump' && cfg.anims.jump === 'Fast_Flying' ? 1.4 : 1;
      a.setEffectiveWeight(1); a.play();
      if (base && base !== a) base.crossFadeTo(a, .18, false);
      base = a; one = a; oneEnd = t + a.getClip().duration / a.timeScale - .12;
      if (k === 'jump' && cfg.anims.jump === 'Fast_Flying') { oneEnd = t + .9; proc = 'hop'; procT = 0; }
    }
    function update(dt) {
      t += dt;
      if (one && t >= oneEnd) { one = null; const b = base; base = b; const k = baseKey; const name = cfg.anims[k] !== undefined && cfg.anims[k] ? cfg.anims[k] : cfg.anims.idle; const a = act(name); if (a && a !== base) { a.reset(); a.play(); base.crossFadeTo(a, .3, false); base = a; } if (a) a.timeScale = k === 'sleep' ? .35 : (k === 'sad' && !cfg.anims.sad) ? .6 : 1; }
      const hb0 = inst.info.headBone;
      if (hb0 && hb0.userData.add) { hb0.rotation.x -= hb0.userData.add; hb0.userData.add = 0; } // retire la retouche de l'image précédente
      mixer.update(dt);
      /* retouches procédurales après le mixeur */
      const want = { sad: baseKey === 'sad' && !cfg.anims.sad ? 1 : 0, sleep: baseKey === 'sleep' ? 1 : 0 };
      for (const k in want) st[k] += (want[k] - st[k]) * Math.min(1, dt * 4);
      const hb = inst.info.headBone;
      if (hb && hb !== inst.info.bodyBone) {
        const dr = cfg.droop == null ? 1 : cfg.droop; let add = (st.sad * .35 + st.sleep * .3) * dr;
        if (st.chomp > 0) { st.chomp -= dt; add += Math.max(0, Math.sin(st.chomp * 14)) * .28 * (cfg.droop == null ? 1 : .4); }
        hb.rotation.x += add; hb.userData.add = add;
      }
      let y = 0, sy = 1, rz = 0;
      if (st.sleep > .01) { sy = 1 - st.sleep * (.08 + Math.sin(t * 1.6) * .025); y -= st.sleep * .04; }
      if (proc) {
        procT += dt;
        if (proc === 'jump' || proc === 'hop' || proc === 'happy') { const d = proc === 'happy' ? .5 : .55; const n = proc === 'happy' ? 2 : 1; const k = procT % d / d; y += Math.sin(k * Math.PI) * (proc === 'hop' ? .12 : .18); sy *= k < .1 ? .92 : 1.02; if (procT > d * n) proc = null; }
        else if (proc === 'wash' || proc === 'no') { rz = Math.sin(procT * 22) * .08 * Math.max(0, 1 - procT / .8); if (procT > .8) proc = null; }
        else proc = null;
      }
      inst.root.position.y = y; inst.root.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy)); inst.root.rotation.z = rz;
      /* yeux fermés (dodo, clignement) : la couleur des yeux prend celle du pelage */
      const shut = st.sleep > .5 || eyesShut > t;
      inst.eyeMats.forEach(m => { if (!m.userData.c0) m.userData.c0 = m.color.clone(); m.color.copy(shut ? (m.userData.skin || (m.userData.skin = skinColor(inst))) : m.userData.c0); });
      inst.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (Math.sin(t * (one ? 14 : 3)) * (one ? .5 : .18) - .1); });
    }
    return { setBase, play, update, blink() { eyesShut = t + .14; }, get t() { return t; }, get baseKey() { return baseKey; } };
  }
  function skinColor(inst) { return inst.skin || new window.T3.THREE.Color('#d9c2a8'); }


  /* ---------- scène, lumières, ombre ---------- */
  function stage(theme) {
    const { THREE } = window.T3;
    const sc = new THREE.Scene();
    const hemi = new THREE.HemisphereLight(theme === 'poney' ? '#fff6fb' : '#f4fbff', theme === 'poney' ? '#9ee0a8' : '#8a6a4a', 1.5); sc.add(hemi);
    const key = new THREE.DirectionalLight('#fff4e0', 2.4); key.position.set(-1.2, 2.2, 2.4); sc.add(key);
    sc.userData.lights = { hemi, key };
    const rim = new THREE.DirectionalLight(theme === 'poney' ? '#ffd1e8' : '#cfe8ff', 1.3); rim.position.set(1.6, 1.2, -2); sc.add(rim);
    const fill = new THREE.DirectionalLight('#ffffff', .5); fill.position.set(2, .5, 2); sc.add(fill);
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
    const gr = c.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(40,20,30,.55)'); gr.addColorStop(1, 'rgba(40,20,30,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.scale.set(.85, .55, 1); sh.position.y = .002; sc.add(sh);
    sc.userData.shadow = sh;
    return sc;
  }
  /* cadre de vue : fenêtre [x0,x1]×[y0,y1] (en unités « hauteur du compagnon ») */
  function camera(aspect, win) {
    const { THREE } = window.T3;
    const fov = 26, h = win.y1 - win.y0, cy = (win.y0 + win.y1) / 2;
    const cam = new THREE.PerspectiveCamera(fov, aspect, .05, 50);
    const d = (h / 2) / Math.tan(fov * Math.PI / 360) + .6;
    const tilt = .22;
    const cx = win.x || 0, cz = win.z || 0;
    cam.position.set(cx, cy + d * Math.sin(tilt), cz + d * Math.cos(tilt));
    cam.lookAt(cx, cy, cz);
    return cam;
  }
  function renderer(canvas, w, h, keep) {
    const { THREE } = window.T3;
    const r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: !!keep, powerPreference: 'low-power' });
    r.setPixelRatio(1); r.setSize(w, h, false);
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    r.setClearColor(0x000000, 0);
    return r;
  }
  function stageOf(p) { const l = 1 + Math.floor((p.xp || 0) / 40); return l < 3 ? 1 : l < 7 ? 2 : 3; }
  function norm(p) { return Object.assign({ stage: p.stage || stageOf(p) }, p); }

  /* ---------- images fixes ---------- */
  let snapR = null, snapCv = null;
  const snapCache = {};
  const queue = []; let busy = false;
  function snap(p0, pose, size) {
    if (!supported()) return Promise.reject(new Error('webgl'));
    const p = norm(p0);
    size = size || 256;
    const key = [p.species, JSON.stringify(p.wear || {}), p.stage, pose && JSON.stringify(pose), size, p.dirty || 0].join('|');
    if (snapCache[key]) return snapCache[key];
    return (snapCache[key] = new Promise((res, rej) => { queue.push({ p, pose: pose || {}, size, res, rej }); pump(); }));
  }
  async function pump() {
    if (busy) return; busy = true;
    while (queue.length) {
      const j = queue.shift();
      try { j.res(await render1(j.p, j.pose, j.size)); } catch (e) { j.rej(e); }
      await new Promise(r => setTimeout(r, 0));
    }
    busy = false;
  }
  async function render1(p, pose, size) {
    await lib();
    const inst = await build(p);
    if (!snapR) { snapCv = document.createElement('canvas'); snapR = renderer(snapCv, size, size, true); }
    snapR.setSize(size, size, false);
    const sc = stage(Theme && Theme.id); sc.add(inst.root);
    const an = Animator(inst);
    an.setBase(pose.base || 'idle');
    if (pose.play) an.play(pose.play);
    const T = pose.t == null ? .4 : pose.t;
    an.update(0); for (let x = 0; x < T; x += 1 / 30) an.update(1 / 30);
    if (pose.shut) inst.eyeMats.forEach(m => m.color.copy(skinColor(inst)));
    inst.dirt.forEach((d, i) => d.visible = i < (p.dirty || 0));
    if (pose.yaw) inst.spin.rotation.y += pose.yaw;
    const sz = inst.height || 1;
    sc.userData.shadow.scale.set(.85, .55, 1);
    let win = { y0: -.04, y1: Math.max(1.06, sz + .06) };
    if (pose.focus === 'head' && inst.info.headBone) {
      inst.root.updateMatrixWorld(true);
      const hp = inst.info.headBone.getWorldPosition(new window.T3.THREE.Vector3());
      const H = .62; win = { y0: hp.y - H * .42, y1: hp.y + H * .58, x: hp.x, z: hp.z };
      if (win.y0 < -.04) { win.y1 += -.04 - win.y0; win.y0 = -.04; }
    }
    const cam = camera(1, win);
    snapR.render(sc, cam);
    const url = snapCv.toDataURL('image/png');
    dispose(sc);
    return url;
  }
  function dispose(sc) { sc.traverse(o => { if (o.geometry && !o.isSkinnedMesh) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => { m.map && m.map.isCanvasTexture && m.map.dispose(); m.dispose(); }); }); }

  /* remplace les <img data-p3> par leur version 3D */
  let hyT = 0;
  function hydrateSoon() { clearTimeout(hyT); hyT = setTimeout(hydrate, 30); }
  function hydrate(root) {
    if (!supported()) return;
    (root || document).querySelectorAll('img[data-p3]:not([data-p3done])').forEach(img => {
      img.setAttribute('data-p3done', '1');
      let d; try { d = JSON.parse(img.getAttribute('data-p3')); } catch (e) { return; }
      snap(d.p, d.pose, d.size).then(u => { img.src = u; img.classList.add('p3'); }).catch(() => {});
    });
  }

  /* ---------- scène en direct ---------- */
  const views = new Set();
  let raf = 0, last = 0;
  function loop(now) {
    raf = 0;
    if (last && now - last < 30) { raf = requestAnimationFrame(loop); return; } // ~30 images/s suffisent et ménagent la batterie
    const dt = Math.min(.08, (now - (last || now)) / 1000); last = now;
    for (const v of views) {
      if (!v.canvas.isConnected) { v.dispose(); continue; }
      if (document.hidden) continue;
      v.frame(dt);
    }
    if (views.size) raf = requestAnimationFrame(loop);
  }
  async function view(host, p0) {
    if (!supported()) throw new Error('webgl');
    await lib();
    const { THREE } = window.T3;
    const p = norm(p0);
    const inst = await build(p);
    const canvas = document.createElement('canvas'); canvas.className = 'p3-canvas';
    host.appendChild(canvas);
    const rect = () => { const r = canvas.getBoundingClientRect(); return [Math.max(64, r.width), Math.max(64, r.height)]; };
    let [w, h] = rect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = renderer(canvas, Math.round(w * dpr), Math.round(h * dpr));
    const sc = stage(Theme && Theme.id); sc.add(inst.root);
    const an = Animator(inst); an.setBase('idle');
    /* la toile déborde du cadre du compagnon (voir CSS) : la fenêtre de vue est agrandie d'autant */
    const camFor = () => { const a = w / h; const H = 1.1 * 1.43; const y0 = -.04 - 1.1 * .08; return camera(a, { y0, y1: y0 + H }); };
    let cam = camFor();
    let yawV = 0, yawOff = 0, dragging = false, lastX = 0, moved = 0, idleT = 0, blinkT = 3;
    canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; moved = 0; });
    window.addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx); if (moved > 8) { yawV = dx * .012; yawOff += dx * .012; idleT = 0; } });
    window.addEventListener('pointerup', () => { dragging = false; });
    const ro = window.ResizeObserver ? new ResizeObserver(() => { [w, h] = rect(); r.setSize(Math.round(w * dpr), Math.round(h * dpr), false); cam = camFor(); }) : null;
    if (ro) ro.observe(canvas);
    const v = {
      canvas,
      frame(dt) {
        an.update(dt);
        if (!dragging) { yawOff += yawV; yawV *= .9; idleT += dt; if (idleT > 2.5) yawOff *= .96; }
        inst.spin.rotation.y = inst.cfg.yaw + yawOff;
        if ((blinkT -= dt) < 0) { blinkT = 2.5 + Math.random() * 3; if (an) an.blink(); }
        r.render(sc, cam);
      },
      dispose() { views.delete(v); if (ro) ro.disconnect(); dispose(sc); r.dispose(); try { r.forceContextLoss(); } catch (e) {} },
      mood(m) {
        if (m === 'blink') return an.blink();
        /* réveillé (touché la nuit) : on quitte la pose de sommeil, sinon il garderait les yeux fermés */
        if ((m === 'eat' || m === 'happy') && an.baseKey === 'sleep') an.setBase('idle');
        if (m === 'eat') return an.play('eat');
        if (m === 'happy') return an.play('happy');
        an.setBase(m === 'sad' ? 'sad' : m === 'sleep' ? 'sleep' : 'idle');
      },
      act(k) { an.play(k); },
      dirt(n) { inst.dirt.forEach((d, i) => d.visible = i < n); },
      wasDrag() { return moved > 8; },
      /* lumière accordée au décor : jour, coucher de soleil, clair de lune */
      light(k) {
        const L = sc.userData.lights;
        if (k === 'bg_night') { L.hemi.intensity = .75; L.hemi.color.set('#9fb4ff'); L.key.intensity = 1.3; L.key.color.set('#b8c8ff'); }
        else if (k === 'bg_eve') { L.hemi.intensity = 1.25; L.hemi.color.set('#ffd9c0'); L.key.intensity = 2.3; L.key.color.set('#ffb070'); }
        else { L.hemi.intensity = 1.5; L.hemi.color.set(Theme.id === 'poney' ? '#fff6fb' : '#f4fbff'); L.key.intensity = 2.4; L.key.color.set('#fff4e0'); }
      }
    };
    views.add(v);
    if (!raf) { last = 0; raf = requestAnimationFrame(loop); }
    return v;
  }

  window.Pet3D = { supported, view, snap, hydrate, hydrateSoon, preload: () => supported() && lib().catch(() => {}), modelKey };
})();
