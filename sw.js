// Offline-first shell. Everything lives on the device for now.
const V = 'gratus-1789857029';
const SHELL = ['/app.html', '/assets/css/tokens.css?v=35', '/assets/css/galaxy.css?v=35', '/assets/js/galaxy.js?v=1789857029', '/assets/js/ui.js?v=13', '/assets/js/keep.js?v=13',
  '/engine/gratus.js?v=12', '/engine/emoji.js?v=12', '/engine/rng.js?v=12', '/engine/state.js?v=12',
  '/config/evolutions.json?v=12', '/config/emoji-names.json?v=12', '/config/prompts.json?v=12', '/config/copy.json?v=12', '/config/growth-book.json?v=12', '/config/recipes.json?v=12', '/config/alchemy.json?v=16',
  '/assets/art/gfx/logo.png', '/assets/art/gfx/g11.jpg', '/assets/art/gfx/g08.jpg', '/assets/art/gfx/g13.jpg', '/assets/art/gfx/g15.jpg', '/assets/art/gfx/g20.jpg', '/assets/art/gfx/g22.jpg', '/assets/art/gfx/g27.jpg', '/assets/art/gfx/v3-poster.jpg',
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
