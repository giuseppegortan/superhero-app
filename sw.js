// Offline-first: tutto in cache, aggiornato in background quando c'è rete. Cambia V per forzare il rinnovo.
const V = 'spider-sense-v7';
const ASSETS = ['/', '/sync.js', '/manifest.webmanifest', '/vendor/globe.gl.min.js', '/vendor/earth-night.jpg',
  '/vendor/earth-topology.png', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (e) => e.waitUntil(caches.open(V).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => clients.claim())));

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return; // GDELT: rete diretta
  e.respondWith(caches.open(V).then(async (c) => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then((r) => (r.ok && c.put(e.request, r.clone()), r)).catch(() => hit);
    return hit || net;
  }));
});
