// The beat. It reports a word from a fixed list and a small number, nothing else: no
// journal text, no names, no emojis, no links, nothing that could say who anybody is or
// what they wrote. It never blocks a render and it never retries: a lost beat is a lost
// beat and a person's screen is worth more than a count.
const send = (ev, n) => {
  try {
    const body = JSON.stringify({ ev, n: n || 1 });
    if (navigator.sendBeacon) { navigator.sendBeacon('/api/trax', new Blob([body], { type: 'application/json' })); return; }
    fetch('/api/trax', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => null);
  } catch (e) { /* a count is never worth an error on somebody's screen */ }
};
export function beat(ev, n) { send(ev, n); }

let open = 0, at = 0;
function start() { if (!at) at = Date.now(); }
function stop() { if (!at) return; open += Math.round((Date.now() - at) / 1000); at = 0; }
export function watchTime() {
  start();
  addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  const flush = () => { stop(); if (open >= 3) { send('secs', Math.min(43200, open)); open = 0; } };
  addEventListener('pagehide', flush);
  addEventListener('beforeunload', flush);
  // and every two minutes, so a long session is not lost if the page is killed
  setInterval(() => { stop(); if (open >= 30) { send('secs', open); open = 0; } start(); }, 120000);
}
