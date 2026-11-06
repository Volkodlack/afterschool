/* Service worker de la version web.
   En ligne : on prend toujours la dernière version sur le serveur (réseau d'abord), et on la garde en réserve.
   Hors ligne : on sert la réserve. Une nouvelle version recharge la page une seule fois. */
const VERSION = 'dev';
const CACHE = 'afterschool-' + VERSION;
const PRECACHE = [];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE.concat(['./', './index.html'])).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('afterschool-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  const heavy = u.pathname.includes('/vendor/tesseract/');
  e.respondWith(caches.open(CACHE).then(async c => {
    if (heavy) { const hit = await c.match(e.request); if (hit) return hit; }
    try {
      const r = await fetch(e.request, { cache: 'no-cache' });
      if (r.ok) c.put(e.request, r.clone());
      return r;
    } catch (err) {
      const hit = await c.match(e.request, { ignoreSearch: true });
      return hit || (e.request.mode === 'navigate' ? c.match('./index.html') : Response.error());
    }
  }));
});
