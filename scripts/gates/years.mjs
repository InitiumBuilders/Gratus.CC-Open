// G50 · A JOURNAL KEPT FOR YEARS.
//
// The people this is for are the ones who come back every day, and their journals grow. At
// four years (1,500 entries) the journal drew every entry on opening, 13,000 elements, and
// drew the whole page again for each letter typed in search: 6.8 seconds to open and up to
// 2.7 seconds a letter on a phone-speed CPU.
//
// Timings on a shared machine lie, so this checks the shape that made it slow: how much is
// drawn on opening, that earlier days come when asked, that search still reaches the oldest
// entry, and that typing never builds the search box again. The control draws everything.
//
//   node scripts/gates/years.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, ROOT, PHONE } from './lib/harness.mjs';
import { month } from './lib/garden.mjs';

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + msg); };
console.log('G50 - a journal kept for years');

const APP = fs.readFileSync(path.join(ROOT, 'assets/js/galaxy.js'), 'utf8');
const FROM = 'const JOURNAL_PAGE = 40;';
const all = APP.split(FROM).length === 2 ? APP.replace(FROM, () => 'const JOURNAL_PAGE = 1e9;') : null;
say(!!all, 'the control has a line to be planted in');

// four years of a day most days, the oldest carrying one word nobody else uses
const N = 1500; const OLDEST = 'quinceblossom';
const g = month(); const base = g.entries[0];
const words = ['coffee', 'light', 'walk', 'friend', 'rain', 'music', 'kitchen', 'letter', 'garden', 'laugh', 'bread', 'river'];
const faces = [...new Set(g.entries.map((e) => e.emoji))];
g.entries = [];
const noon = new Date(); noon.setHours(12, 0, 0, 0);
for (let i = 0; i < N; i++) {
  const d = new Date(noon.getTime() - Math.floor(i * 0.9) * 86400000);
  const day = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const text = i === N - 1 ? 'The ' + OLDEST + ' outside the first window I wrote from.' : 'Grateful for the ' + words[i % words.length] + ' and the ' + words[(i * 7) % words.length] + ' today.';
  g.entries.push(Object.assign({}, base, { id: 'y' + i, day, at: new Date(d.getTime() - 3600000 * (i % 9)).toISOString(), text, emoji: faces[i % faces.length], tags: [], took: 60 }));
}

const srv = await serve(4821);
const b = await browser();
async function walk(fault) {
  const ctx = await b.newContext({ ...PHONE, serviceWorkers: 'block' });
  await ctx.route('**/api/**', (r) => r.fulfill({ status: 204, body: '' }));
  if (fault) await ctx.route('**/assets/js/galaxy.js*', (r) => r.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: all }));
  await ctx.addInitScript((garden) => { if (!localStorage.getItem('gratus.galaxy.v1')) localStorage.setItem('gratus.galaxy.v1', JSON.stringify(garden)); }, g);
  const page = await ctx.newPage();
  const loud = []; page.on('pageerror', (e) => loud.push(String(e.message).slice(0, 100)));
  await page.goto(srv.base + '/app?nosplash=1&notour=1&dev=1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  for (let i = 0; i < 40; i++) { const up = await page.evaluate(() => { const r = document.getElementById('ceremony'); return !!r && !r.hidden; }); if (!up) break; await page.keyboard.press('Escape'); await page.waitForTimeout(250); }
  await page.goto(srv.base + '/app/book?nosplash=1&notour=1&dev=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('.page .entry').length > 0, null, { timeout: 60000 });
  const o = { loud };
  o.open = await page.evaluate(() => ({ entries: document.querySelectorAll('.page .entry').length, nodes: document.getElementsByTagName('*').length, more: !!document.getElementById('j-more') }));
  if (o.open.more) {
    await page.click('#j-more'); await page.waitForTimeout(500);
    o.more = await page.evaluate(() => document.querySelectorAll('.page .entry').length);
  }
  // typing: the box is the same box after every letter, and the oldest entry is found
  await page.evaluate(() => { window.__box = document.getElementById('j-search'); });
  await page.click('#j-search');
  await page.keyboard.type(OLDEST, { delay: 30 });
  await page.waitForTimeout(500);
  o.typed = await page.evaluate((w) => ({
    same: document.getElementById('j-search') === window.__box,
    focus: (document.activeElement || {}).id,
    value: (document.getElementById('j-search') || {}).value,
    found: [...document.querySelectorAll('.page .entry')].map((n) => n.textContent).filter((t) => t.includes(w)).length,
    shown: document.querySelectorAll('.page .entry').length,
  }), OLDEST);
  await ctx.close();
  return o;
}

const w = await walk(null);
say(w.open.entries > 0 && w.open.entries <= 60, 'four years open on the newest days, not on every entry  (' + w.open.entries + ' of ' + N + ' drawn)');
say(w.open.nodes < 1500, 'the page is small enough to open at once  (' + w.open.nodes + ' elements)');
say(w.open.more && w.more > w.open.entries, 'earlier days come when they are asked for  (' + w.open.entries + ' to ' + w.more + ')');
say(w.typed.found === 1 && w.typed.shown === 1, 'search reaches the oldest entry, which was never drawn until it was asked for  (' + w.typed.found + ' found)');
say(w.typed.same && w.typed.focus === 'j-search' && w.typed.value === OLDEST, 'and every letter lands in the same box, which is never built again while typing');
say(w.loud.length === 0, 'the browser threw nothing' + (w.loud.length ? '  (' + w.loud[0] + ')' : ''));

if (all) {
  const c = await walk('all');
  say(c.open.entries === N && c.open.nodes > 5000, 'the control: a journal that draws everything is seen  (' + c.open.entries + ' drawn, ' + c.open.nodes + ' elements)');
}

await b.close(); await srv.close();
console.log('G50 a journal kept for years: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
