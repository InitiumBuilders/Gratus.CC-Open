// THE FILMS LET GO.
//
// Taking a <video> off the page stops it playing. It does not stop it downloading. On the
// live site, at phone speed (2.5 Mbps, measured), the doorway film went on pulling six
// megabytes after the doorway had closed, and every view left behind did the same with its
// scene film, all of it spent on nothing anybody would see.
//
// Three rules. A film that leaves the page lets go of its download, however it left. When
// somebody follows a link, every film still downloading lets go, so the next page is not
// sharing the line with it. And films come down a connection of their own, which is the one
// that fixed the wait: letting go on the tap was not enough, because what the edge had
// already written into the shared connection still arrived first.

// FILMS COME DOWN A ROAD OF THEIR OWN.
//
// A browser keeps one connection to a host and sends everything down it in turn. The edge
// writes a film into that connection as fast as it is allowed to, and whatever is asked for
// next waits behind the part already written, cancelled or not. Measured on the live site at
// phone speed, with the films on www.gratus.cc the tap on Plant My Gratus took between 4 and
// 47 seconds to reach the next page. With the same films coming from the other production
// host it took 0.1 seconds, every time, with as many film bytes already arrived.
//
// So on either production host, films come from the other one, down a connection that
// carries nothing else. Its certificate is different, so the browser cannot fold the two
// connections into one. Anywhere else (a preview, this machine) they come from the page's
// own host.
const OTHER = {
  'www.gratus.cc': 'https://gratus-in-motus.vercel.app',
  'gratus.cc': 'https://gratus-in-motus.vercel.app',
  'gratus-in-motus.vercel.app': 'https://www.gratus.cc',
};
export const FILMS_FROM = OTHER[(globalThis.location && globalThis.location.hostname) || ''] || '';
export const film = (name) => FILMS_FROM + '/assets/art/gfx/' + name;

// Emptying the source and asking it to load again is the one thing that ends the fetch.
export function release(v) {
  try {
    v.pause();
    v.querySelectorAll('source').forEach((s) => s.remove());
    v.removeAttribute('src');
    v.load();
    v.dataset.released = '1';
  } catch (e) { /* a film that will not stop is no worse off than before */ }
}

const filmsIn = (n) => (n.nodeType !== 1 ? [] : n.tagName === 'VIDEO' ? [n] : Array.from(n.querySelectorAll('video')));
// NETWORK_LOADING: still arriving. A film already in hand costs nothing to keep.
const arriving = (v) => v.networkState === 2;

let watching = false;
export function letGo() {
  if (watching) return;
  watching = true;
  new MutationObserver((batch) => {
    for (const m of batch) for (const n of m.removedNodes) for (const v of filmsIn(n)) if (!v.isConnected) release(v);
  }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const to = new URL(a.href, location.href);
    if (to.origin === location.origin && to.pathname === location.pathname && to.search === location.search) return;
    document.querySelectorAll('video').forEach((v) => { if (arriving(v)) release(v); });
  });
}
