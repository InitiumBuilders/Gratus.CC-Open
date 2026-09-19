// OVERFLOW · the headless port of scripts/audit/overflow.js.
//
// The original says, on its first line, "paste this into the console". Under Node
// it throws, it is in no ship, and the reading is repeatable only by a person who
// remembers to paste it. This runs it in a real browser at three widths across
// every view, so the reading happens whether anyone remembers or not.
//
// The console version stays, for reading a page by hand.
//
// Mutant: remove a min-width: 0 from a grid child that holds text. This must go red.
import { serve, browser, open, VIEWS, WIDTHS } from './lib/harness.mjs';

let fails = 0;
const server = await serve(4754);
const b = await browser();

console.log('overflow - every view at ' + WIDTHS.join(' / '));
for (const [name, route] of VIEWS) {
  const line = [];
  for (const w of WIDTHS) {
    const v = await open(b, server.base, route, { viewport: { width: w, height: 812 }, settle: 1500 });
    const m = await v.page.evaluate(() => {
      const d = document.documentElement, vw = d.clientWidth, out = [];
      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed' || cs.display === 'none') continue;
        const r = el.getBoundingClientRect();
        if (r.right <= vw + 1 && r.left >= -1) continue;
        const p = el.parentElement;
        if (!p || p.getBoundingClientRect().right > vw + 1) continue;
        if (/auto|scroll|hidden|clip/.test(getComputedStyle(p).overflowX)) continue;
        out.push(el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 26) + ' right=' + Math.round(r.right));
      }
      return { sw: d.scrollWidth, cw: vw, culprits: out };
    });
    await v.close();
    const bad = m.sw > m.cw || m.culprits.length;
    if (bad) { fails++; m.culprits.slice(0, 3).forEach((c) => console.log('          ' + w + '  ' + c)); }
    line.push(w + ':' + (bad ? 'OVER' : 'ok'));
  }
  console.log('  ' + (line.some((l) => l.includes('OVER')) ? 'FAIL  ' : 'pass  ') + name.padEnd(9) + line.join('  '));
}
await b.close();
await server.close();
console.log('overflow: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
