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

// The clock runs only while the page is on the screen. It used to start again after every
// two-minute report whether or not anybody could see the page, so a tab or an installed app
// left in the background counted two minutes of reading every two minutes, all day.
let open = 0, at = 0;
const seen = () => document.visibilityState === 'visible';
function start() { if (!at && seen()) at = Date.now(); }
function stop() { if (!at) return; open += Math.round((Date.now() - at) / 1000); at = 0; }
export function watchTime() {
  start();
  // A page leaving the screen sends what it counted: a phone often ends a page it has hidden
  // without telling it, and what was not sent by then is never sent.
  const flush = () => { stop(); if (open >= 3) { send('secs', Math.min(43200, open)); open = 0; } };
  addEventListener('visibilitychange', () => (seen() ? start() : flush()));
  addEventListener('pagehide', flush);
  addEventListener('beforeunload', flush);
  // and every two minutes, so a long session is not lost if the page is killed
  setInterval(() => { stop(); if (open >= 30) { send('secs', open); open = 0; } start(); }, 120000);
}
