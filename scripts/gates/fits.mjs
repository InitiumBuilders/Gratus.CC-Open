// G37 · NO WORD IS WIDER THAN THE THING HOLDING IT.
//
// He photographed the Giveth page on his phone and sent it to me: "Environment",
// "Community", "Education" and "Health" printed on top of one another, each word spilling
// out of the pill it was supposed to sit in.
//
// I did that. Making the short chips wide enough to tap, I wrote `min-width: 52px` on a
// row that is a nowrap flex scroller. A flex item's implicit `min-width: auto` is the only
// thing stopping it shrinking below its own content, and writing ANY min-width replaces
// it. Every long chip became free to shrink to fifty-two pixels.
//
// The overflow gate was green throughout, because the page never spilled sideways: the
// words spilled inside it. So this gate asks a different question of every pill, tab and
// button on every view: is the thing inside it actually inside it?
//
//   node scripts/gates/fits.mjs
import { serve, browser, open, VIEWS } from './lib/harness.mjs';

let fails = 0;
const say = (ok, m) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + m); };

console.log('G37 - no word is wider than the thing holding it');
const srv = await serve(4793);
const b = await browser();

// Every width he might hold: the narrowest phone still sold, his, and a large one.
for (const w of [320, 375, 430]) {
  let bad = [];
  for (const [name, route] of VIEWS) {
    const v = await open(b, srv.base, route, { viewport: { width: w, height: 800 } });
    const spills = await v.page.evaluate(() => {
      const out = [];
      document.querySelectorAll('.chip, .seg button, .tabs2 button, .pill, .gpill, .btn').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        // the text's own box against the box that is meant to hold it
        const over = Math.round(el.scrollWidth - el.clientWidth);
        if (over > 1) out.push({ t: (el.textContent || '').trim().slice(0, 18), over, w: Math.round(r.width) });
      });
      return out;
    });
    // and no two of them may sit on top of each other
    const stacked = await v.page.evaluate(() => {
      const rows = [...document.querySelectorAll('.chips .chip')].map((e) => e.getBoundingClientRect());
      let hits = 0;
      for (let i = 0; i < rows.length; i++) {
        for (let j = i + 1; j < rows.length; j++) {
          const a = rows[i], c = rows[j];
          const over = Math.min(a.right, c.right) - Math.max(a.left, c.left);
          const down = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
          if (over > 2 && down > 2) hits++;
        }
      }
      return hits;
    });
    if (spills.length) bad.push(name + ': ' + spills.map((s) => JSON.stringify(s.t) + ' over by ' + s.over).join(', '));
    if (stacked) bad.push(name + ': ' + stacked + ' chips overlapping');
    await v.close();
  }
  say(bad.length === 0, VIEWS.length + ' views at ' + w + ', every word inside its own pill'
    + (bad.length ? '\n        ' + bad.slice(0, 6).join('\n        ') : ''));
}

await b.close(); await srv.close();
console.log('G37 everything fits: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
