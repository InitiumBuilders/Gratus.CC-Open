// Offline-first shell. Everything lives on the device for now.
const V = 'gratus-1789870073';
const SHELL = ['/app.html', '/assets/css/tokens.css?v=36', '/assets/css/galaxy.css?v=36', '/assets/js/galaxy.js?v=1789870073', '/assets/js/ui.js?v=14', '/assets/js/views.js?v=17', '/assets/js/tour.js?v=18', '/assets/js/trax.js?v=18', '/assets/js/keep.js?v=13',
  '/engine/gratus.js?v=12', '/engine/emoji.js?v=12', '/engine/rng.js?v=12', '/engine/state.js?v=14', '/engine/glyph.js?v=17',
  '/config/evolutions.json?v=17', '/config/emoji-names.json?v=17', '/config/prompts.json?v=17', '/config/copy.json?v=17', '/config/growth-book.json?v=17', '/config/recipes.json?v=17', '/config/alchemy.json?v=17', '/config/families.json?v=18', '/config/partners.json?v=18',
  '/assets/art/gfx/logo.webp', '/assets/art/gfx/g11.webp', '/assets/art/gfx/g08.webp', '/assets/art/gfx/g13.webp', '/assets/art/gfx/g15.webp', '/assets/art/gfx/g20.webp', '/assets/art/gfx/g22.webp', '/assets/art/gfx/g27.webp', '/assets/art/gfx/v3-poster.webp',
  '/assets/brand/gratus-logo-original.webp', '/assets/brand/icon-192.png', '/manifest.webmanifest'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL).catch(() => null)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return;   // the network, always, and never a copy on disk
  if (url.pathname.startsWith('/app') || url.pathname === '/gift') { e.respondWith(fetch(e.request).catch(() => caches.match('/app.html'))); return; }
  e.respondWith(caches.match(e.request).then((hit) => {
    const net = fetch(e.request).then((res) => { if (res && res.ok) caches.open(V).then((c) => c.put(e.request, res.clone())); return res; }).catch(() => hit);
    return hit || net;
  }));
});
