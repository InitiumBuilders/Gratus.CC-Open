// G34 · THE GIVETH PITCH IS MADE OF GIVETH'S OWN NUMBERS.
//
// The claim on this page is about somebody else's work, so it has to be built out of what
// they publish rather than out of anything typed here. Two halves:
//
//   1. no Giveth figure is written down in this repository, anywhere
//   2. given Giveth's real answers, the endpoint and the page carry them through intact
//
// A gate here never reaches the internet, so the second half replays a RECORDING of the
// live API (scripts/gates/fixtures/giveth-stats.json), captured by hand and refreshable.
// That makes this repeatable and offline; the live numbers are checked against the
// deployed site after every ship, which is the only place they can honestly be checked.
//
//   node --import ./scripts/gates/lib/loader.mjs scripts/gates/giveth-pitch.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { __giveth } from './lib/blob-stub.mjs';
import { serve, browser, open } from './lib/harness.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let fails = 0;
const say = (ok, m) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + m); };

console.log('G34 - the Giveth pitch');
process.env.BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || 'gate-token';

// ── half one: nothing about Giveth is typed into this repository ──
const shipped = ['assets/js/galaxy.js', 'api/giveth-stats.js', 'api/giveth.js', 'api/_giveth.js']
  .filter((f) => fs.existsSync(path.join(root, f)));
const typed = [];
for (const f of shipped) {
  fs.readFileSync(path.join(root, f), 'utf8').split('\n').forEach((ln, i) => {
    const t = ln.trim();
    if (t.startsWith('//') || t.startsWith('*')) return;
    if (/\$\s?\d[\d,.]{3,}|['"]\d{1,3}(,\d{3})+['"]/.test(ln)) typed.push(f + ':' + (i + 1) + '  ' + t.slice(0, 56));
  });
}
say(typed.length === 0, shipped.length + ' files, no Giveth figure typed into any of them'
  + (typed.length ? '\n        ' + typed.join('\n        ') : ''));

// ── half two: replay what Giveth really said ──
const fix = JSON.parse(fs.readFileSync(path.join(root, 'scripts/gates/fixtures/giveth-stats.json'), 'utf8'));
const MATCH = [
  ['donationsTotalUsdPerDate', 'months'], ['totalDonorsCountPerDate', 'donors'],
  ['projectsPerDate', 'created'], ['filters:[Verified]', 'verified'],
  ['allProjects(take:1)', 'listed'], ['totalDonationsPerCategory', 'cats'], ['qfRounds', 'qf'],
];
let asked = 0;
__giveth((sent) => {
  asked++;
  const q = String(sent.query || '');
  for (const [needle, key] of MATCH) if (q.includes(needle)) return fix.answers[key];
  return { errors: [{ message: 'the recording has no answer for that question' }] };
});

const handler = (await import(path.join(root, 'api/giveth-stats.js'))).default;
const res = () => {
  const r = { code: 0, body: null };
  r.setHeader = () => {}; r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; }; r.end = () => r;
  return r;
};
const call = async () => { const r = res(); await handler({ method: 'GET', headers: {}, query: {} }, r); return r; };

const r1 = await call();
const d = r1.body;
say(r1.code === 200, 'the endpoint answers  (' + r1.code + (d && d.why ? ' ' + JSON.stringify(d.why) : '') + ')');
say(asked === 7, 'and it asked all seven questions  (' + asked + ')');
say(d.usd > 1e6, 'the total comes through: $' + Math.round(d.usd || 0).toLocaleString());
say(d.donors > 1000, 'the donors come through: ' + (d.donors || 0).toLocaleString());
say(d.listed > 100 && d.verified > 10, 'the projects come through: ' + d.listed + ' listed, ' + d.verified + ' verified');
say((d.months || []).length > 24, 'and more than two years of months  (' + (d.months || []).length + ')');
say((d.categories || []).length > 5, 'and the money split by kind  (' + (d.categories || []).length + ')');
say(d.categories[0].usd >= d.categories[d.categories.length - 1].usd, 'largest kind first');
say(d.qf && d.qf.rounds > 0 && d.qf.matching > 0, 'and the matching pooled across ' + (d.qf || {}).rounds + ' rounds');

// the cache: a second ask does not ask Giveth again
const before = asked;
const r2 = await call();
say(r2.code === 200 && r2.body.usd === d.usd, 'asking twice gives the same answer');
say(asked === before, 'and the second one asks Giveth nothing  (' + (asked - before) + ' new questions)');

// a refresh where Giveth half answers must not empty the page
__giveth((sent) => {
  const q = String(sent.query || '');
  if (q.includes('totalDonorsCountPerDate')) return { errors: [{ message: 'timeout' }] };
  for (const [needle, key] of MATCH) if (q.includes(needle)) return fix.answers[key];
  return { errors: [{ message: 'no' }] };
});
const { __MEM } = await import('./lib/blob-stub.mjs');
const key = [...__MEM.keys()].find((k) => k.includes('giveth'));
const doc = JSON.parse(__MEM.get(key));
doc.at = new Date(Date.now() - 45 * 60 * 1000).toISOString();     // stale enough to refresh
__MEM.set(key, JSON.stringify(doc));
await call();
await new Promise((ok) => setTimeout(ok, 3000));
const after = JSON.parse(__MEM.get(key));
say(after.donors === d.donors, 'when one question fails, that figure keeps its last good value  (' + after.donors + ')');
say(after.usd != null, 'and the rest of the page is refreshed around it');

// ── and it renders ──
const srv = await serve(4759);
const b = await browser();
const { page, close } = await open(b, srv.base, '/app/give');
const loud = [];
page.on('pageerror', (e) => loud.push(String(e.message).slice(0, 80)));
await page.route('**/api/giveth-stats**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(d) }));
await page.goto(srv.base + '/app/giveth?nosplash=1&notour=1&dev=1', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2600);

const text = (await page.evaluate(() => document.body.innerText || '')).replace(/\s+/g, ' ');
const money = '$' + Math.round(d.usd).toLocaleString();
say(text.includes(money), 'the page shows the total in full, not rounded  (' + money + ')');
say(text.includes((d.donors || 0).toLocaleString()), 'and the people who gave');
say(/Every month since/.test(text), 'and the months since the first gift');
say(/Where it went/.test(text), 'and where the money went');
say(loud.length === 0, 'nothing thrown' + (loud.length ? '  (' + loud[0] + ')' : ''));

const bars = await page.evaluate(() => document.querySelectorAll('.gvbarline i').length);
say(bars === (d.months || []).length, 'one bar for each month  (' + bars + ')');
const drawn = await page.evaluate(() => [...document.querySelectorAll('.gvbarline i')].every((x) => x.getBoundingClientRect().height > 0));
say(drawn, 'and every bar is drawn rather than implied');

const edge = await page.evaluate(() => {
  const n = document.querySelector('.gvnum');
  return n ? Math.round(n.getBoundingClientRect().right) : 0;
});
say(edge > 0 && edge <= 375, 'the big number fits a phone  (right edge ' + edge + ' of 375)');

// THE FOLD. The first version put the figure and the three facts under the tab bar, where
// nobody would have found them without scrolling, and a full-page screenshot could not
// show it because a fixed bar lies in one. Measured, at rest, before any scrolling.
const fold = await page.evaluate(() => {
  const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { t: Math.round(b.top), b: Math.round(b.bottom) }; };
  const f = document.querySelector('.gvfacts');
  const box = f && f.getBoundingClientRect();
  return {
    bar: r('.tabs'), num: r('.gvnum'), facts: r('.gvfacts'), view: innerHeight,
    onTop: box ? (document.elementFromPoint(Math.round(box.left + box.width / 2), Math.round(box.top + box.height / 2)) || {}).className : null,
  };
});
const barTop = fold.bar ? fold.bar.t : fold.view;
say(fold.num && fold.num.b <= barTop, 'the figure sits clear of the tab bar  (ends ' + (fold.num || {}).b + ', bar starts ' + barTop + ')');
say(fold.facts && fold.facts.b <= barTop, 'and so do the three facts under it  (ends ' + (fold.facts || {}).b + ')');
say(!/tabs|scrim|art\b/.test(String(fold.onTop || '')), 'and nothing is painted over them  (' + fold.onTop + ')');
const spill = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
say(spill === 0, 'and nothing on the page pushes it sideways  (' + spill + 'px)');

// LAST, because it scrolls: the kinds arrive when somebody reaches them, and everything
// above this point had to read the page as it sits before anybody touches it.
await page.evaluate(() => document.querySelector('.gvbars').scrollIntoView({ block: 'center' }));
await page.waitForTimeout(1700);
const catBars = await page.evaluate(() => [...document.querySelectorAll('.gvbar i')].map((x) => Math.round(x.getBoundingClientRect().width)));
say(catBars.length >= 5 && catBars[0] >= catBars[catBars.length - 1] && catBars[catBars.length - 1] > 0,
  'the category bars fall from largest to smallest and none is invisible  (' + catBars.join(' ') + ')');

await close(); await b.close(); await srv.close();
console.log('G34 the Giveth pitch: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
