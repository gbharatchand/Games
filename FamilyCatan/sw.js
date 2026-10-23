/* Family Catan service worker — offline app shell.
   Multiplayer still needs a network connection (PeerJS), but the
   game itself loads and plays offline (same-device mode).
   Strategy: network-first for the app shell (index.html) so updates
   always arrive; cache-first for other same-origin assets. */
const CACHE = 'familycatan-v26';
const CORE = ['./index.html', './game.js', './manifest.webmanifest', './icon.svg', './icon-512.png'];

self.addEventListener('install', e => {
  // no-store everywhere: Pages serves files with a ~10 min HTTP cache, and a plain
  // fetch inside that window hands back the PREVIOUS build — that is how clients
  // ended up running mixed old/new versions after a deploy.
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'no-store' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isShell = e.request.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/FamilyCatan/') || url.pathname.endsWith('/game.js');
  if (isShell && url.origin === self.location.origin) {
    // app shell: try network first so updates arrive, fall back to cache offline
    const cacheKey = url.pathname.endsWith('/game.js') ? './game.js' : './index.html';
    e.respondWith(
      fetch(e.request.url, { cache: 'no-store' }).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(cacheKey, copy));
        }
        return res;
      }).catch(() => caches.match(cacheKey))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: false }).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => { throw new Error('offline'); });
    })
  );
});
