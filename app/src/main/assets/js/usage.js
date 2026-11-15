/* Temps passé sur l'appli : compté sur chaque appareil, par jour et par enfant, puis envoyé au compte famille.
   Seul le temps « actif » compte : l'appli est à l'écran et l'enfant a touché l'écran ou le clavier dans les 2 dernières minutes.
   Une « connexion » = l'appli est ouverte, ou on y revient après plus de 5 minutes ailleurs.
   Les totaux sont gardés sur l'appareil (30 jours) et envoyés dès qu'un compte est connecté. */
(function () {
  const KEY = 'afterschool.usage', DKEY = 'afterschool.device';
  const IDLE = 120000, TICK = 15000, GAP = 5 * 60000;
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
  const U = read();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(U)); } catch (e) {} };
  let dev = null; try { dev = localStorage.getItem(DKEY); if (!dev) { dev = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); localStorage.setItem(DKEY, dev); } } catch (e) { dev = 'dx'; }
  const ua = navigator.userAgent || '';
  const platform = window.AfterSchoolNative ? 'Appli Android'
    : 'Site web · ' + (/iPad|Macintosh.*Mobile/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'iPad' : /iPhone/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : 'ordinateur');
  const dayKey = (t = Date.now()) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const hm = t => { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  function today() {
    const k = dayKey();
    if (!U[k]) U[k] = { sec: 0, opens: 0, first: null, last: null, profiles: {}, dirty: true };
    // on ne garde que 30 jours
    Object.keys(U).sort().slice(0, -30).forEach(o => delete U[o]);
    return U[k];
  }
  function profile(d) {
    const id = window.Store && Store.currentId ? Store.currentId() : 'p';
    const name = window.Store && Store.data && Store.data.settings ? (Store.data.settings.name || '?') : '?';
    const p = d.profiles[id] || (d.profiles[id] = { name, sec: 0, opens: 0 });
    p.name = name;
    return p;
  }
  let lastInput = Date.now(), lastTick = Date.now(), hiddenAt = 0;
  function open() {
    const d = today(), p = profile(d);
    d.opens++; p.opens = (p.opens || 0) + 1;
    d.first = d.first || hm(Date.now()); d.last = hm(Date.now()); d.dirty = true; save();
  }
  function tick() {
    const now = Date.now(), dt = Math.min(now - lastTick, TICK * 2); lastTick = now;
    if (document.visibilityState !== 'visible' || now - lastInput > IDLE) return;
    const d = today(), p = profile(d), s = Math.round(dt / 1000);
    d.sec += s; p.sec += s; d.last = hm(now); d.dirty = true; save();
  }
  ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(ev => addEventListener(ev, () => { lastInput = Date.now(); }, { passive: true, capture: true }));
  setInterval(tick, TICK);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { tick(); hiddenAt = Date.now(); flush(); }
    else { lastTick = Date.now(); lastInput = Date.now(); if (hiddenAt && Date.now() - hiddenAt > GAP) open(); hiddenAt = 0; }
  });
  // changement d'enfant : nouvelle connexion pour cet enfant
  open();

  /* envoi au compte famille : chaque appareil écrit ses propres totaux (pas de conflit entre appareils) */
  let sending = false;
  async function flush() {
    if (sending || !window.Cloud || !Cloud.user || !Cloud.putUsage) return;
    sending = true;
    try {
      for (const k of Object.keys(U).filter(k => U[k].dirty)) {
        const d = U[k];
        const profiles = {}; Object.entries(d.profiles).forEach(([id, p]) => profiles[id] = { name: p.name, sec: p.sec, opens: p.opens || 0 });
        await Cloud.putUsage(k, { day: k, ts: Date.now(), devices: { [dev]: { platform, sec: d.sec, opens: d.opens, first: d.first, last: d.last, profiles } } });
        d.dirty = false; save();
      }
    } catch (e) { console.warn('usage', e); } finally { sending = false; }
  }
  setInterval(flush, 60000);
  if (window.Cloud && Cloud.onState) Cloud.onState(() => { if (Cloud.user) setTimeout(flush, 3000); });
  window.Usage = { flush, data: U, device: dev, platform };
})();
