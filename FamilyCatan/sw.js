/* Family Catan service worker — offline app shell.
   Multiplayer still needs a network connection (PeerJS), but the
   game itself loads and plays offline (same-device mode).
   Strategy: network-first for the app shell (index.html) so updates
   always arrive; cache-first for other same-origin assets. */
const CACHE = 'familycatan-v4';
const CORE = ['./index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
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
  const isShell = e.request.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/FamilyCatan/');
  if (isShell && url.origin === self.location.origin) {
    // app shell: try network first so updates arrive, fall back to cache offline
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'))
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
