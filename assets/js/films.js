// THE FILMS LET GO.
//
// Taking a <video> off the page stops it playing. It does not stop it downloading. On the
// live site, at phone speed (2.5 Mbps, measured), the doorway film went on pulling six
// megabytes after the doorway had closed, and every view left behind did the same with its
// scene film. A tap on a link starts a navigation that queues behind all of that: the tap on
// Plant My Gratus took twenty-six seconds to leave the landing.
//
// Two rules. A film that leaves the page lets go of its download, however it left. And when
// somebody follows a link, every film still downloading lets go first, so leaving never
// waits on the page being left.

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
