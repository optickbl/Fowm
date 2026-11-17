/* Fowm Plan service worker: works offline after the first visit. */
const VERSION = 'fowm-v3';
const SHELL = [
  './', 'index.html', 'styles.css?v=3', 'app.js?v=3', 'manifest.webmanifest?v=3',
  'icons/icon-192.png?v=1', 'icons/icon-512.png?v=1', 'icons/apple-touch-icon.png?v=1',
  'img/mascot.png', 'img/mascot-sm.png',
  'fonts/fredoka-latin-wght-normal.woff2', 'fonts/fredoka-latin-ext-wght-normal.woff2',
  'fonts/figtree-latin-wght-normal.woff2', 'fonts/figtree-latin-ext-wght-normal.woff2'
];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    // Fresh page when online, cached page when offline.
    event.respondWith(fetch(req, { cache: 'no-store' }).then((res) => {
      const copy = res.clone(); caches.open(VERSION).then((c) => c.put('./', copy)); return res;
    }).catch(() => caches.match('./').then((r) => r || caches.match('index.html'))));
    return;
  }
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  })));
});
