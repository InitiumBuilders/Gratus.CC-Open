// G8 · WEIGHT. Two budgets, both asserted, neither allowed to hide in the other.
//
// (a) THE PAINT BUDGET, under 1.0 MB. Every byte fetched before the first screen
//     is readable at 375 px on a cold cache: the document, the stylesheets, the
//     scripts, the fonts, and the first images actually painted.
//
// (b) THE VIDEO BUDGET, per file, by name. Nine videos autoplay in this app and
//     two of them fire together on the landing page. A gate that leaves video out
//     is a gate that reports a pass while twenty megabytes download. A gate that
//     folds video into the paint budget is one nobody can ever make green. So
//     both are measured, both are printed, and both have to hold.
//
// Measured on the wire against a local server, not read off disk, because what
// matters is what a phone actually pulls.
//
// Mutant: add a large image to the landing critical path. This must go red.
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, open, ROOT } from './lib/harness.mjs';

const PAINT_BUDGET = 1_000_000;

// per-file ceilings for everything that autoplays, from the prompt
const VIDEO = {
  'explode.mp4': 2_500_000,      // the opening ritual, the only one allowed preload=auto
  'dlong.mp4': 2_000_000,        // the landing scene layer
  'grow-intro.mp4': 1_500_000,
  'give-intro.mp4': 1_500_000,
  'dhold.mp4': 2_000_000,
  'v1.mp4': 2_000_000,
  'v2.mp4': 2_000_000,
  'v3.mp4': 2_000_000,
  'd2.mp4': 2_000_000,
};
const LANDING_VIDEO_BUDGET = 4_500_000;   // the ritual plus the scene layer, together

const kb = (n) => (n / 1024).toFixed(0) + ' KB';
const mb = (n) => (n / 1e6).toFixed(2) + ' MB';

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + msg); };

console.log('G8 - weight');

// ── (b) the video budget, from disk, by name ──────────────────────────────
console.log('\n  video, per file:');
const gfx = path.join(ROOT, 'assets/art/gfx');
let landing = 0;
for (const [name, cap] of Object.entries(VIDEO)) {
  const p = path.join(gfx, name);
  if (!fs.existsSync(p)) { say(false, name.padEnd(18) + 'missing'); continue; }
  const n = fs.statSync(p).size;
  if (name === 'explode.mp4' || name === 'dlong.mp4') landing += n;
  say(n <= cap, name.padEnd(18) + mb(n).padStart(9) + '   ceiling ' + mb(cap));
}
say(landing <= LANDING_VIDEO_BUDGET,
  'landing page video together'.padEnd(18) + mb(landing).padStart(9) + '   ceiling ' + mb(LANDING_VIDEO_BUDGET));

// ── (a) the paint budget, on the wire ─────────────────────────────────────
const server = await serve(4751);
const b = await browser();
const PAINT = /\.(html|css|js|mjs|json|woff2?|webmanifest)$/i;
const IMG = /\.(png|jpe?g|webp|avif|svg)$/i;

for (const [name, route] of [['landing', '/'], ['app', '/app/grow']]) {
  server.reset();
  const v = await open(b, server.base, route, { settle: 2600 });
  // what the first screen actually painted, so an image below the fold is not
  // charged to a budget about the first screen
  const painted = await v.page.evaluate(() => {
    const out = [];
    const vh = innerHeight;
    for (const el of document.querySelectorAll('img, video, [style*="background-image"]')) {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh || r.width < 4 || r.height < 4) continue;
      if (el.tagName === 'IMG' && el.currentSrc) out.push(el.currentSrc);
      if (el.tagName === 'VIDEO') { const s = el.querySelector('source'); if (el.poster) out.push(el.poster); if (s) out.push(s.src); }
      const bg = getComputedStyle(el).backgroundImage.match(/url\(["']?([^"')]+)/);
      if (bg) out.push(bg[1]);
    }
    return out.map((u) => { try { return new URL(u, location.href).pathname; } catch (e) { return u; } });
  });
  await v.close();

  const wanted = new Set(painted);
  let paint = 0;
  const items = [];
  for (const r of server.wire) {
    if (r.status !== 200) continue;
    const isPaint = PAINT.test(r.url);
    const isFirstImage = IMG.test(r.url) && wanted.has(r.url);
    if (!isPaint && !isFirstImage) continue;
    paint += r.bytes;
    items.push([r.url, r.bytes]);
  }
  items.sort((a, c) => c[1] - a[1]);
  console.log('\n  ' + name + ' - to the first screen at 375:');
  items.slice(0, 9).forEach(([u, n]) => console.log('        ' + kb(n).padStart(9) + '  ' + u));
  if (items.length > 9) console.log('        ' + String(items.length - 9).padStart(6) + ' more');
  say(paint <= PAINT_BUDGET, name.padEnd(18) + mb(paint).padStart(9) + '   ceiling ' + mb(PAINT_BUDGET));
}

await b.close();
await server.close();
console.log('\nG8 weight: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
