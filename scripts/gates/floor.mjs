// G40 · THE LAST WORD ON EVERY PAGE CAN BE READ.
//
// The tab bar is fixed to the bottom of the screen and owns its last 112 pixels. Anything
// under it at rest is fine, because a page scrolls. What is not fine is a page whose last
// sentence is still under the bar when you have scrolled as far as it goes: that sentence
// can never be read, by anybody, on any phone.
//
// So on every view, at every width that matters, this scrolls to the very bottom and asks
// whether the last thing on the page has come clear of the bar.
//
//   node scripts/gates/floor.mjs
import { serve, browser, open, VIEWS } from './lib/harness.mjs';

let fails = 0;
const say = (ok, m) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + m); };
console.log('G40 - the last word on every page can be read');
const srv = await serve(4809);
const b = await browser();

for (const [w, h] of [[375, 812], [390, 844], [412, 915]]) {
  const bad = [];
  for (const [name, route] of VIEWS) {
    if (name === 'landing') continue;          // the front page has no tab bar
    const v = await open(b, srv.base, route, { viewport: { width: w, height: h } });
    const r = await v.page.evaluate(async () => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      await new Promise((ok) => setTimeout(ok, 350));
      const bar = document.querySelector('.tabs');
      if (!bar) return { skip: true };
      const barTop = bar.getBoundingClientRect().top;
      // the lowest piece of real content: text, a control, an image, a card
      let lowest = null, low = -1;
      document.querySelectorAll('#view p, #view h1, #view h2, #view h3, #view button, #view a, #view .glass, #view img, #view .cap, #view .kicker').forEach((e) => {
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const cs = getComputedStyle(e);
        if (cs.visibility === 'hidden' || Number(cs.opacity) === 0 || cs.position === 'fixed') return;
        if (r.bottom > low) { low = r.bottom; lowest = (e.tagName + '.' + String(e.className).split(' ')[0] + ' "' + (e.textContent || '').trim().slice(0, 28) + '"'); }
      });
      return { barTop: Math.round(barTop), low: Math.round(low), lowest };
    });
    await v.close();
    if (r.skip) continue;
    if (r.low > r.barTop + 1) bad.push(name + ': ' + r.lowest + ' ends at ' + r.low + ', bar at ' + r.barTop);
  }
  say(bad.length === 0, 'every view at ' + w + 'x' + h + ' scrolls its last word clear of the bar'
    + (bad.length ? '\n        ' + bad.join('\n        ') : ''));
}

await b.close(); await srv.close();
console.log('G40 the floor: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
