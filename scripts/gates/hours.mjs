// G48 · HONEST HOURS.
//
// The public /trax page said 494 hours this month from ten opens by three people. The time
// counter restarted its clock after every two-minute report whether or not the page was on
// the screen, so a page left in the background counted all day.
//
// This runs the app on a faked clock: five minutes on the screen, half an hour hidden, two
// more on the screen. Only the seven minutes may be counted. The control serves the counter
// with its clock blind to the screen, which is how it was, and the half hour has to show.
//
//   node scripts/gates/hours.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, ROOT, PHONE } from './lib/harness.mjs';
import { month } from './lib/garden.mjs';

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + msg); };
console.log('G48 - honest hours');

const SRC = fs.readFileSync(path.join(ROOT, 'assets/js/trax.js'), 'utf8');
const FROM = "const seen = () => document.visibilityState === 'visible';";
const blind = SRC.split(FROM).length === 2 ? SRC.replace(FROM, () => 'const seen = () => true;') : null;
say(!!blind, 'the control has a line to be planted in');

const srv = await serve(4817);
const b = await browser();
const MIN = 60000;

async function day(fault) {
  const ctx = await b.newContext({ ...PHONE, serviceWorkers: 'block' });
  await ctx.route('**/api/**', (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === '/api/billing') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"connected":false}' });
    if (u.pathname === '/api/goals' && route.request().method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"goals":[]}' });
    return route.fulfill({ status: 204, body: '' });   // the counter itself is answered here and sent nowhere
  });
  if (fault) await ctx.route('**/assets/js/trax.js*', (route) => route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: blind }));
  await ctx.addInitScript((garden) => {
    if (!localStorage.getItem('gratus.galaxy.v1')) localStorage.setItem('gratus.galaxy.v1', JSON.stringify(garden));
    // the screen, as the page sees it, under the gate's hand
    let state = 'visible';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => state !== 'visible' });
    // a real visibilitychange bubbles from the document to the window, where listeners may be
    window.__screen = (s) => { state = s; document.dispatchEvent(new Event('visibilitychange', { bubbles: true })); };
    // every report is written down in the page, with the phase it was sent in
    window.__phase = 'on'; window.__beats = [];
    // a report's words are kept as it is made, so reading them never waits on the blob
    const RealBlob = window.Blob;
    window.Blob = class extends RealBlob { constructor(parts, opts) { super(parts, opts); this.__told = Array.isArray(parts) ? parts.map((x) => (typeof x === 'string' ? x : '')).join('') : ''; } };
    const real = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url, body) => {
      const rec = { phase: window.__phase, ev: '', n: 0 }; window.__beats.push(rec);
      const told = body && typeof body.__told === 'string' ? body.__told : typeof body === 'string' ? body : '';
      try { const j = JSON.parse(told); rec.ev = j.ev; rec.n = Number(j.n) || 0; } catch (e) {}
      return real(url, body);
    };
  }, month());
  const page = await ctx.newPage();
  await page.clock.install();
  await page.goto(srv.base + '/app?nosplash=1&notour=1&dev=1', { waitUntil: 'domcontentloaded' });
  // The faked clock moves only when the gate moves it, but the app starts in real time. Until the
  // home is drawn the counter is not running yet, and minutes moved before then are not the app's.
  let up = false;
  for (let i = 0; i < 150 && !up; i++) { up = await page.evaluate(() => !!document.getElementById('write-today')).catch(() => false); if (!up) await new Promise((r) => setTimeout(r, 100)); }
  if (!up) { await ctx.close(); return { up: false, on: 0, hidden: 0, back: 0, all: 0, beats: 0 }; }
  await page.clock.runFor(3000);
  await page.clock.runFor(5 * MIN);
  await page.evaluate(() => { window.__phase = 'hiding'; window.__screen('hidden'); window.__phase = 'hidden'; });
  await page.clock.runFor(30 * MIN);
  await page.evaluate(() => { window.__phase = 'back'; window.__screen('visible'); });
  await page.clock.runFor(2 * MIN + 1000);
  await page.evaluate(() => { window.__phase = 'leaving'; window.dispatchEvent(new Event('pagehide')); });
  await page.waitForTimeout(500);
  const beats = (await page.evaluate(() => window.__beats)).filter((x) => x.ev === 'secs');
  await ctx.close();
  const sum = (p) => beats.filter((x) => p.includes(x.phase)).reduce((t, x) => t + x.n, 0);
  return { up: true, on: sum(['on', 'hiding']), hidden: sum(['hidden']), back: sum(['back', 'leaving']), all: sum(['on', 'hiding', 'hidden', 'back', 'leaving']), beats: beats.length };
}

const d = await day(null);
say(d.up, 'the app started before the clock was moved');
say(Math.abs(d.on - 303) <= 15, 'five minutes on the screen are counted, sent the moment the page left it  (' + d.on + ' s)');
say(d.hidden === 0, 'half an hour hidden counts nothing  (' + d.hidden + ' s)');
say(Math.abs(d.back - 121) <= 15, 'and the two minutes back on the screen are counted  (' + d.back + ' s)');
say(Math.abs(d.all - 424) <= 25, 'seven minutes in all, in ' + d.beats + ' reports  (' + d.all + ' s)');

if (blind) {
  const c = await day('blind');
  say(c.hidden >= 25 * 60, 'the control: a clock blind to the screen counts the hidden half hour, and that is seen  (' + c.hidden + ' s hidden)');
}

await b.close(); await srv.close();
console.log('G48 honest hours: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
