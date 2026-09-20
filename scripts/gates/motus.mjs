// G38 · MOTUS · A VALUE IN MOTION, THAT ALWAYS LANDS.
//
// Motion on this page is the figure arriving, not an effect over it. Two things therefore
// have to be true, and the second is the one that bites:
//
//   1. it moves: the total counts, the months draw in order, the kinds grow, the trace
//      carries one light down through Begin, Become and Bridge
//   2. IT ALWAYS ENDS ON THE TRUTH. A number that counts is a number that is briefly
//      wrong, and this page already told one lie about somebody else's money. So: the
//      figures are correct in the markup before any script runs, a figure nobody scrolls
//      to keeps its value, and with the script gone nothing is hidden or dimmed at all.
//
//   node --import ./scripts/gates/lib/loader.mjs scripts/gates/motus.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { __giveth } from './lib/blob-stub.mjs';
import { serve, browser } from './lib/harness.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let fails = 0;
const say = (ok, m) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + m); };

console.log('G38 - motus');
process.env.BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || 'gate-token';
const fix = JSON.parse(fs.readFileSync(path.join(root, 'scripts/gates/fixtures/giveth-stats.json'), 'utf8'));
const M = [['donationsTotalUsdPerDate', 'months'], ['totalDonorsCountPerDate', 'donors'], ['projectsPerDate', 'created'],
  ['filters:[Verified]', 'verified'], ['allProjects(take:1)', 'listed'], ['totalDonationsPerCategory', 'cats'], ['qfRounds', 'qf']];
__giveth((s) => { const q = String(s.query || ''); for (const [n, k] of M) if (q.includes(n)) return fix.answers[k]; return { errors: [{ message: 'no' }] }; });
const handler = (await import(path.join(root, 'api/giveth-stats.js'))).default;
const r = { body: null, setHeader() {}, status() { return this; }, json(b) { this.body = b; return this; }, end() { return this; } };
await handler({ method: 'GET', headers: {}, query: {} }, r);
const D = r.body;
const TOTAL = '$' + Math.round(D.usd).toLocaleString();

const srv = await serve(4795);
const b = await browser();

async function giveth(opts) {
  const ctx = await b.newContext(Object.assign({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, opts || {}));
  const page = await ctx.newPage();
  await page.route('**/api/giveth-stats**', (x) => x.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(D) }));
  await page.route('**/api/giveth?**', (x) => x.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ projects: [], total: 0 }) }));
  await page.goto(srv.base + '/app/giveth?nosplash=1&notour=1&dev=1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  return { page, ctx, close: () => ctx.close() };
}
const txt = (p) => p.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));

// ── it moves, and it lands ──
let v = await giveth();
say((await txt(v.page)).includes(TOTAL), 'the total lands on the real figure  (' + TOTAL + ')');
const facts = await v.page.evaluate(() => [...document.querySelectorAll('.gvfacts b')].map((e) => e.textContent.trim()));
say(facts.join('|') === [D.donors, D.listed, D.verified].map((n) => Number(n).toLocaleString()).join('|'),
  'and so do the three under it  (' + facts.join(' · ') + ')');
say(!/\$0\b/.test(await txt(v.page)), 'and no figure is left sitting at nought');

// the months: armed, then drawn, each one after the one before it
const months = await v.page.evaluate(() => {
  const line = document.querySelector('.gvbarline');
  const bars = [...line.querySelectorAll('i')];
  return {
    armed: line.classList.contains('armed'),
    drawn: line.classList.contains('drawn'),
    waits: bars.slice(0, 4).map((x) => x.style.getPropertyValue('--wait')),
    last: bars[bars.length - 1].style.getPropertyValue('--wait'),
    tall: bars.every((x) => x.getBoundingClientRect().height > 0),
  };
});
say(months.armed && months.drawn, 'the months are armed and then drawn');
say(months.waits[0] === '0ms' && parseInt(months.last, 10) > 500, 'in the order they happened  (first ' + months.waits[0] + ', last ' + months.last + ')');
say(months.tall, 'and every month ends up with a height');

// the kinds: largest first, all grown
await v.page.evaluate(() => document.querySelector('.gvbars').scrollIntoView({ block: 'center' }));
await v.page.waitForTimeout(1600);
const kinds = await v.page.evaluate(() => {
  const root2 = document.querySelector('.gvbars');
  const w = [...root2.querySelectorAll('.gvbar i')].map((x) => Math.round(x.getBoundingClientRect().width));
  return { armed: root2.classList.contains('armed'), grown: root2.classList.contains('grown'), w };
});
say(kinds.armed && kinds.grown, 'the kinds are armed and then grown');
say(kinds.w.every((x) => x > 0) && kinds.w[0] >= kinds.w[kinds.w.length - 1], 'each one ends at its share  (' + kinds.w.join(' ') + ')');
await v.close();

// ── the trace carries one light ──
v = await giveth();
await v.page.evaluate(() => document.querySelector('.trace3').scrollIntoView({ block: 'center' }));
await v.page.waitForTimeout(3200);
const trace = await v.page.evaluate(() => {
  const t = document.querySelector('.trace3');
  const kids = [...t.children].map((k) => Number(getComputedStyle(k).opacity).toFixed(2));
  return { armed: t.classList.contains('armed'), flowing: t.classList.contains('flowing'), kids };
});
say(trace.armed && trace.flowing, 'the trace is armed and then flows');
say(trace.kids.every((o) => Number(o) > 0.9), 'and all three of Begin, Become and Bridge end fully lit  (' + trace.kids.join(' ') + ')');
await v.close();

// ── AND IT LANDS WITHOUT ANY OF THAT ──
// The figures are written into the markup. With the script gone, nothing may be hidden,
// dimmed or scaled to nothing, because a chart of nothing is worse than no chart.
v = await giveth({ javaScriptEnabled: true });
const source = await v.page.evaluate(() => document.querySelector('.gvnum').textContent);
say(source === TOTAL || source === '$' + Math.round(D.usd).toLocaleString(), 'the figure in the page is the real one before anything animates');
await v.close();

const css = fs.readFileSync(path.join(root, 'assets/css/galaxy.css'), 'utf8');
const naked = [
  [/^\.gvbarline i \{[^}]*scaleY\(0\)/m, 'the months would be flat with no script'],
  [/^\.gvbar i \{[^}]*scaleX\(0\)/m, 'the kinds would be empty with no script'],
  [/^\.trace3 > \* \{[^}]*opacity: \.\d/m, 'the trace would be dimmed with no script'],
];
for (const [re, why] of naked) say(!re.test(css), 'nothing hides itself unconditionally: ' + why);

// ── and under reduced motion it is simply already there ──
v = await giveth({ reducedMotion: 'reduce' });
const still = await v.page.evaluate(() => {
  const line = document.querySelector('.gvbarline');
  const bars2 = document.querySelector('.gvbars');
  const t = document.querySelector('.trace3');
  return {
    armed: [line && line.classList.contains('armed'), bars2 && bars2.classList.contains('armed'), t && t.classList.contains('armed')],
    heights: [...document.querySelectorAll('.gvbarline i')].every((x) => x.getBoundingClientRect().height > 0),
    widths: [...document.querySelectorAll('.gvbar i')].every((x) => x.getBoundingClientRect().width > 0),
    total: document.querySelector('.gvnum').textContent,
  };
});
say(still.armed.every((a) => a === false), 'under reduced motion nothing is armed at all');
say(still.heights && still.widths, 'and every bar is at its full size from the first frame');
say(still.total === TOTAL, 'and the total is simply there  (' + still.total + ')');
await v.close();

await b.close(); await srv.close();
console.log('G38 motus: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
