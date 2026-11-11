/* Compte parent et synchronisation entre appareils (Firebase : Google ou e-mail, Firestore).
   Un compte = une famille : tous les enfants, leurs mots, progrès, cartes, compagnon, fiches et poésies.
   Les enregistrements de voix restent sur l'appareil. Règle de fusion : pour chaque enfant, la version
   la plus récente gagne (on travaille rarement sur deux appareils en même temps). */
(function () {
  const CFG = window.FIREBASE_CONFIG || {};
  const N = window.AfterSchoolNative || null;
  const AS = window.AS_native;
  const enabled = !!(CFG.apiKey && CFG.projectId && window.FB);
  const io = Store._io;
  const AUDIO = /^(rec_|prec_|airec_)/;
  const UPKEY = 'afterschool.cloud.up';
  const state = { status: enabled ? 'starting' : 'off', email: null, last: +(localStorage.getItem('afterschool.cloud.last') || 0), error: null };
  const listeners = [];
  const emit = () => listeners.forEach(f => { try { f(state); } catch (e) {} });
  let auth = null, db = null, user = null, syncing = null, pushT = 0, globalT = 0;

  const up = (() => { try { return JSON.parse(localStorage.getItem(UPKEY) || '{}'); } catch (e) { return {}; } })();
  const saveUp = () => { try { localStorage.setItem(UPKEY, JSON.stringify(up)); } catch (e) {} };
  const syncable = (id, v) => typeof v === 'string' && !AUDIO.test(id) && v.startsWith('data:');

  const FR_ERR = {
    'auth/invalid-email': 'Adresse e-mail invalide.',
    'auth/missing-password': 'Il manque le mot de passe.',
    'auth/weak-password': 'Mot de passe trop court (6 caractères minimum).',
    'auth/email-already-in-use': 'Un compte existe déjà avec cet e-mail : utilisez « Se connecter ».',
    'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
    'auth/wrong-password': 'E-mail ou mot de passe incorrect.',
    'auth/user-not-found': 'Aucun compte avec cet e-mail.',
    'auth/too-many-requests': 'Trop d\'essais, réessayez dans quelques minutes.',
    'auth/network-request-failed': 'Pas de connexion internet.',
    'auth/popup-closed-by-user': 'Connexion annulée.',
    'auth/popup-blocked': 'La fenêtre de connexion a été bloquée par le navigateur.',
    'auth/operation-not-allowed': 'Cette méthode de connexion n\'est pas activée dans Firebase.',
    'auth/unauthorized-domain': 'Ce site n\'est pas autorisé dans Firebase (Authentication › Paramètres › Domaines autorisés).'
  };
  const msg = e => (e && (FR_ERR[e.code] || e.message)) || 'Erreur inconnue';

  /* ---------- helpers ---------- */
  const uref = (...p) => FB.doc(db, 'users', user.uid, ...p);
  function summaryOf(id) {
    const p = Store.global.profiles.find(x => x.id === id) || {};
    return { name: p.name || '', avatar: p.avatar || 'mascot', theme: p.theme || null, avatarImg: p.avatarImg || null, onboarded: !!p.onboarded };
  }
  function shrink(d) {
    // Firestore: 1 Mo par document. On allège les historiques si besoin.
    let json = JSON.stringify(d);
    if (json.length < 900000) return json;
    const c = JSON.parse(json);
    (c.sheets || []).forEach(s => { s.attempts = (s.attempts || []).slice(-10); s.ai = (s.ai || []).slice(-10); });
    (c.poems || []).forEach(p => { p.recs = (p.recs || []).slice(-10); });
    return JSON.stringify(c);
  }
  /* ---------- quel appareil garde la main : le plus avancé, pas le dernier qui a enregistré ----------
     Avancement = expérience totale (elle ne fait qu'augmenter quand l'enfant joue), puis bonnes réponses,
     puis cartes, et seulement à égalité la date d'enregistrement. */
  function advance(d) {
    const st = (d && d.stats) || {};
    const cards = d && d.cardsT ? Object.values(d.cardsT).reduce((n, t) => n + Object.keys((t && t.owned) || {}).length, 0) : 0;
    return [st.xp || 0, st.totalCorrect || 0, cards, Object.keys(st.words || {}).length];
  }
  function cmpAdvance(a, b) {
    const x = advance(a), y = advance(b);
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i];
    return ((a && a._ts) || 0) - ((b && b._ts) || 0);
  }
  /* ce qui a été créé sur l'autre appareil après la dernière création du gagnant (nouvelle liste, fiche, poésie) est ajouté */
  function mergeNew(win, lose) {
    let added = false;
    for (const k of ['lists', 'sheets', 'poems']) {
      const A = win[k] || [], B = (lose && lose[k]) || [];
      const ids = new Set(A.map(x => x.id));
      const newest = A.reduce((m, x) => Math.max(m, x.createdAt || 0), 0);
      B.forEach(x => { if (x && !ids.has(x.id) && (x.createdAt || 0) > newest) { A.push(x); added = true; } });
      if (added) win[k] = A;
    }
    return added;
  }
  /* local contre distant -> { data, from: 'local' | 'remote', merged } */
  function decide(local, remote) {
    if (!remote) return { data: local, from: 'local', merged: false };
    if (!local) return { data: remote, from: 'remote', merged: false };
    const c = cmpAdvance(local, remote);
    if (c >= 0) { const merged = mergeNew(local, remote); return { data: local, from: 'local', merged }; }
    const merged = mergeNew(remote, local);
    return { data: remote, from: 'remote', merged };
  }
  function adoptRemote(id, d) {
    io.write(io.PKEY(id), d);
    if (id === Store.currentId()) { UI.toast('☁️ Un autre appareil est plus avancé : je reprends sa progression'); setTimeout(() => location.reload(), 900); }
  }
  async function pushProfile(id) {
    if (!user) return;
    let d = io.read(io.PKEY(id)); if (!d) return;
    if (!d._ts) { d._ts = Date.now(); io.write(io.PKEY(id), d); }
    // avant d'écraser le compte, on vérifie qu'il n'est pas plus avancé ailleurs
    try {
      const snap = await FB.getDoc(uref('profiles', id));
      const r0 = snap.exists() ? snap.data() : null;
      if (r0 && !r0.deleted && r0.json) {
        const remote = JSON.parse(r0.json); remote._ts = r0.ts;
        const dec = decide(d, remote);
        if (dec.from === 'remote') {
          dec.data._ts = Math.max(r0.ts || 0, Date.now());
          adoptRemote(id, dec.data);
          if (!dec.merged) return;
          d = dec.data;
        } else if (dec.merged) { d._ts = Date.now(); io.write(io.PKEY(id), d); }
      }
    } catch (e) { console.warn('sync check', e); }
    await FB.setDoc(uref('profiles', id), { json: shrink(d), ts: d._ts, summary: summaryOf(id) });
  }
  async function pushGlobal() {
    if (!user) return;
    const G = Store.global;
    await FB.setDoc(uref(), { pin: G.pin || null, pinTs: G.pinTs || 0, ts: Date.now() }, { merge: true });
  }
  function compress(dataUrl, maxChars = 850000) {
    return new Promise(res => {
      if (dataUrl.length <= maxChars && !/^data:image\/png/.test(dataUrl)) return res(dataUrl);
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth, h = img.naturalHeight, out = dataUrl;
        for (const [max, q] of [[1600, .75], [1280, .7], [1000, .65], [800, .6], [600, .55]]) {
          const k = Math.min(1, max / Math.max(w, h));
          const cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
          const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height);
          out = cv.toDataURL('image/jpeg', q);
          if (out.length <= maxChars) break;
        }
        res(out.length <= maxChars ? out : null);
      };
      img.onerror = () => res(dataUrl.length <= maxChars ? dataUrl : null);
      img.src = dataUrl;
    });
  }
  async function pushBlob(id, v) {
    if (!user || !syncable(id, v)) return;
    const c = await compress(v);
    if (!c) return;
    await FB.setDoc(uref('blobs', id), { v: c, ts: Date.now() });
    up[id] = 1; saveUp();
  }
  Store.Blobs.remoteGet = async (id) => {
    if (!user || AUDIO.test(id)) return null;
    const s = await FB.getDoc(uref('blobs', id));
    return s.exists() ? s.data().v : null;
  };

  /* ---------- full synchronisation ---------- */
  async function fullSync() {
    if (!user) return;
    if (syncing) return syncing;
    syncing = (async () => {
      state.status = 'syncing'; state.error = null; emit();
      try {
        const G = Store.global;
        const [us, ps] = await Promise.all([FB.getDoc(uref()), FB.getDocs(FB.collection(db, 'users', user.uid, 'profiles'))]);
        let reload = false, gChanged = false;
        const remote = {};
        ps.forEach(d => { remote[d.id] = d.data(); });
        const pushes = [];
        for (const [id, r] of Object.entries(remote)) {
          if (r.deleted) {
            if (G.profiles.find(p => p.id === id)) {
              try { localStorage.removeItem(io.PKEY(id)); } catch (e) {}
              G.profiles = G.profiles.filter(p => p.id !== id); gChanged = true;
              if (id === G.current) reload = true;
            }
            continue;
          }
          const local = io.read(io.PKEY(id));
          const remoteD = JSON.parse(r.json); remoteD._ts = r.ts;
          const dec = decide(local, remoteD);
          if (dec.from === 'remote') {
            const d = dec.data;
            const same = local && JSON.stringify(Object.assign({}, local, { _ts: 0 })) === JSON.stringify(Object.assign({}, d, { _ts: 0 }));
            d._ts = Math.max(r.ts || 0, (local && local._ts) || 0);
            io.write(io.PKEY(id), d);
            const i = G.profiles.findIndex(p => p.id === id);
            const sum = Object.assign({ id }, r.summary || {});
            if (i >= 0) G.profiles[i] = Object.assign(G.profiles[i], sum); else G.profiles.push(sum);
            gChanged = true;
            if (id === G.current && !same) reload = true;
            if (dec.merged) pushes.push(pushProfile(id));
          } else if (dec.merged || ((local && local._ts) || 0) !== r.ts || cmpAdvance(local, remoteD) > 0) {
            if (dec.merged) { local._ts = Date.now(); io.write(io.PKEY(id), local); if (id === G.current) reload = true; }
            pushes.push(pushProfile(id));
          }
        }
        for (const p of G.profiles) if (!remote[p.id] && p.onboarded) pushes.push(pushProfile(p.id));
        // un appareil neuf a un profil vide : on le remplace par les enfants du compte
        const cur = G.profiles.find(p => p.id === G.current);
        const real = G.profiles.filter(p => p.onboarded);
        if (real.length && (!cur || !cur.onboarded)) {
          if (cur) { try { localStorage.removeItem(io.PKEY(cur.id)); } catch (e) {} }
          G.profiles = G.profiles.filter(p => p.onboarded);
          G.current = real[0].id; G.justPicked = null;
          gChanged = true; reload = true;
        }
        // code parent
        const ru = us.exists() ? us.data() : {};
        if (ru.pin && (!G.pin || (ru.pinTs || 0) > (G.pinTs || 0))) { if (G.pin !== ru.pin) { G.pin = ru.pin; G.pinTs = ru.pinTs || 0; gChanged = true; } }
        else if (G.pin && (ru.pin !== G.pin)) pushes.push(pushGlobal());
        if (gChanged) io.write(io.GKEY, G);
        await Promise.all(pushes);
        // images pas encore envoyées
        const keys = await Store.Blobs.keys();
        for (const k of keys) {
          if (up[k] || AUDIO.test(k)) continue;
          Store.Blobs._quiet = true;
          let v; try { v = await Store.Blobs.get(k); } finally { Store.Blobs._quiet = false; }
          if (syncable(k, v)) { try { await pushBlob(k, v); } catch (e) { console.warn('blob', k, e); } }
          else { up[k] = 1; saveUp(); }
        }
        state.status = 'ok'; state.last = Date.now();
        try { localStorage.setItem('afterschool.cloud.last', String(state.last)); } catch (e) {}
        emit();
        if (reload) {
          UI.toast('☁️ Données mises à jour depuis le compte');
          setTimeout(() => location.reload(), 700);
        }
      } catch (e) {
        console.warn('sync', e);
        state.status = 'error'; state.error = msg(e); emit();
      } finally { syncing = null; }
    })();
    return syncing;
  }

  /* ---------- envoi au fil de l'eau ---------- */
  function flush() {
    if (!user) return;
    if (pushT) { clearTimeout(pushT); pushT = 0; pushProfile(Store.currentId()).catch(e => console.warn(e)); }
    if (globalT) { clearTimeout(globalT); globalT = 0; pushGlobal().catch(e => console.warn(e)); }
  }
  Store.onChange((what, a, b) => {
    if (!user) return;
    if (what === 'save') { clearTimeout(pushT); pushT = setTimeout(() => { pushT = 0; pushProfile(Store.currentId()).then(() => { state.last = Date.now(); emit(); }).catch(e => console.warn(e)); }, 4000); }
    if (what === 'global') {
      const G = Store.global;
      if (G.pin && G.pin !== G._lastPin) { G.pinTs = Date.now(); G._lastPin = G.pin; io.write(io.GKEY, G); }
      clearTimeout(globalT); globalT = setTimeout(() => { globalT = 0; pushGlobal().catch(e => console.warn(e)); }, 1500);
    }
    if (what === 'profileDel') FB.setDoc(uref('profiles', a), { deleted: true, ts: Date.now() }).catch(e => console.warn(e));
    if (what === 'blobPut') pushBlob(a, b).catch(e => console.warn(e));
    if (what === 'blobDel') { delete up[a]; saveUp(); if (!AUDIO.test(a)) FB.deleteDoc(uref('blobs', a)).catch(() => {}); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
    else if (user && Date.now() - state.last > 20000) fullSync();
  });
  const prevPause = window.AS_pause;
  window.AS_pause = () => { flush(); if (prevPause) prevPause(); };

  /* ---------- connexion ---------- */
  function googleNative() {
    return new Promise((res, rej) => {
      AS.onGoogle = (token, err) => { AS.onGoogle = null; token ? res(token) : rej({ code: err === 'cancel' ? 'auth/popup-closed-by-user' : 'google', message: err === 'cancel' ? 'Connexion annulée.' : 'Connexion Google impossible : ' + (err || '') }); };
      try { N.googleSignIn(CFG.googleWebClientId || ''); } catch (e) { rej(e); }
    });
  }
  const Cloud = {
    enabled, state,
    onState(f) { listeners.push(f); return () => { const i = listeners.indexOf(f); if (i >= 0) listeners.splice(i, 1); }; },
    get user() { return user; },
    async google() {
      if (N && N.googleSignIn) {
        const tok = await googleNative();
        return FB.signInWithCredential(auth, FB.GoogleAuthProvider.credential(tok));
      }
      const p = new FB.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
      return FB.signInWithPopup(auth, p);
    },
    emailIn(e, pw) { return FB.signInWithEmailAndPassword(auth, e.trim(), pw); },
    emailUp(e, pw) { return FB.createUserWithEmailAndPassword(auth, e.trim(), pw); },
    reset(e) { return FB.sendPasswordResetEmail(auth, e.trim()); },
    async signOut() { flush(); await FB.signOut(auth); },
    sync: fullSync,
    msg,

    /* fenêtre de connexion (Google ou e-mail) */
    async loginModal() {
      if (!enabled) { UI.toast('La synchronisation n\'est pas encore configurée'); return false; }
      return new Promise(resolve => {
        const m = UI.modal(UI.html`<h2>☁️ Compte de la famille</h2>
          <p style="margin-top:0">Connectez-vous pour retrouver les enfants et leur progression sur tous vos appareils (tablette, téléphone, iPad…).</p>
          <div class="row center"><button class="pix-btn big wood g-btn" data-a="google"><span class="g-ic">G</span> Continuer avec Google</button></div>
          <div class="or-sep"><span>ou avec une adresse e-mail (Gmail, iCloud, Outlook…)</span></div>
          <div class="field"><input type="email" data-f="email" placeholder="adresse@e-mail.fr" autocomplete="email" autocapitalize="off"></div>
          <div class="field"><input type="password" data-f="pw" placeholder="Mot de passe (6 caractères minimum)" autocomplete="current-password"></div>
          <p class="cloud-err" style="color:#d63a2a;min-height:1.2em;margin:4px 0"></p>
          <div class="row center"><button class="pix-btn green" data-a="in">Se connecter</button><button class="pix-btn gold" data-a="up">Créer un compte</button></div>
          <div class="row center" style="margin-top:6px"><button class="pix-btn small" data-a="reset">Mot de passe oublié</button><button class="pix-btn small red" data-a="close">Annuler</button></div>`, { locked: true });
        const err = m.querySelector('.cloud-err');
        const val = f => m.querySelector(`[data-f=${f}]`).value;
        const busy = on => m.querySelectorAll('button').forEach(b => b.disabled = on);
        const run = async (fn) => {
          err.textContent = ''; busy(true);
          try { await fn(); UI.closeModal(); UI.toast('☁️ Connecté ! Synchronisation…'); resolve(true); }
          catch (e) { err.textContent = msg(e); busy(false); }
        };
        m.querySelector('[data-a=google]').onclick = () => run(() => Cloud.google());
        m.querySelector('[data-a=in]').onclick = () => run(() => Cloud.emailIn(val('email'), val('pw')));
        m.querySelector('[data-a=up]').onclick = () => run(() => Cloud.emailUp(val('email'), val('pw')));
        m.querySelector('[data-a=reset]').onclick = async () => {
          err.textContent = '';
          if (!val('email')) { err.textContent = 'Indiquez d\'abord votre adresse e-mail.'; return; }
          try { await Cloud.reset(val('email')); err.style.color = '#2b8a3e'; err.textContent = 'E-mail envoyé : suivez le lien pour choisir un nouveau mot de passe.'; }
          catch (e) { err.style.color = '#d63a2a'; err.textContent = msg(e); }
        };
        m.querySelector('[data-a=close]').onclick = () => { UI.closeModal(); resolve(false); };
      });
    },
    statusText() {
      if (!enabled) return 'Synchronisation non configurée';
      if (!user) return 'Non connecté : les données restent sur cet appareil';
      const t = state.last ? new Date(state.last).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
      if (state.status === 'syncing') return 'Synchronisation en cours…';
      if (state.status === 'error') return 'Erreur de synchronisation : ' + (state.error || '') ;
      return 'Synchronisé · dernière fois ' + t;
    }
  };
  window.Cloud = Cloud;

  if (enabled) {
    try {
      const app = FB.initializeApp({ apiKey: CFG.apiKey, authDomain: CFG.authDomain, projectId: CFG.projectId, appId: CFG.appId });
      auth = FB.initializeAuth(app, Object.assign({ persistence: [FB.indexedDBLocalPersistence, FB.browserLocalPersistence] }, N ? {} : { popupRedirectResolver: FB.browserPopupRedirectResolver }));
      db = FB.getFirestore(app);
      if (CFG.emulator) { FB.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true }); FB.connectFirestoreEmulator(db, '127.0.0.1', 8080); }
      FB.onAuthStateChanged(auth, u => {
        user = u; state.email = u ? (u.email || 'compte Google') : null;
        state.status = u ? 'ok' : 'signedout'; emit();
        if (u) fullSync();
      });
    } catch (e) { console.warn('firebase', e); state.status = 'error'; state.error = msg(e); }
  }
})();
