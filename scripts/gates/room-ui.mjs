// G56 · A PAXT ROOM AND A SIGNAL, ON THE SCREEN, AGAINST THE REAL HANDLERS.
//
// G53 and G54 prove the server; G33 shows a room over a faked store. This opens the real app in a real browser and
// answers its calls to /api/vibes, /api/paxt and /api/signal with the real handlers over the gates' blob stub, so
// nothing reaches a live store. A room is made; a PAXT written from inside it shows in the room's strip, counted in
// keys; a signal is asked and answered; its counts stay held at one answer and at three, and once the server's
// clock is past the close they show, with the line that one person can answer from more than one device. Every
// other call is held back.
//
//   node --import ./scripts/gates/lib/loader.mjs scripts/gates/room-ui.mjs [--pics=<dir>]   (keeps pictures there)
import path from 'node:path';
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { serve, browser, PHONE } from './lib/harness.mjs';
import { month } from './lib/garden.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.env.BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || 'gate-token';
process.env.GRATUS_SALT = process.env.GRATUS_SALT || 'a-secret-that-is-not-in-the-store';
process.env.GRATUS_PAXT_READ_CACHE_MS = '0';
process.env.VERCEL_ENV = 'production';
const load = async (f) => (await import(pathToFileURL(path.join(root, f)).href)).default;
const H = { vibes: await load('api/vibes.js'), paxt: await load('api/paxt.js'), signal: await load('api/signal.js') };
const SIG = await import(pathToFileURL(path.join(root, 'assets/js/signal.js')).href);
const PICS = (process.argv.find((a) => a.startsWith('--pics=')) || '').slice('--pics='.length);
if (PICS) fs.mkdirSync(PICS, { recursive: true });

let fails = 0;
const say = (ok, m) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + m); };
function res() {
  const r = { code: 200, body: null };
  r.setHeader = () => {}; r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; }; r.end = () => r;
  return r;
}
// How far ahead of the real clock the handlers run, as G54's at() does. Date.now is moved only while a handler
// runs, and put back when the last one running ends, so calls that overlap all see the same time and the browser
// driver never sees a moved clock between calls.
const DAY = 86400000;
const realNow = Date.now;
let ahead = 0, running = 0;
const call = async (name, method, body, query = {}, ip = '10.9.0.1') => {
  const r = res();
  const shift = ahead;
  if (shift && running++ === 0) Date.now = () => realNow() + shift;
  try {
    await H[name]({ method, headers: { 'x-forwarded-for': ip }, query, body }, r);
  } finally {
    if (shift && --running === 0) Date.now = realNow;
  }
  return r;
};
const token = () => randomBytes(32).toString('base64url');

console.log('G56 - a PAXT room and a signal, on the screen');
const made = await call('vibes', 'POST', { act: 'make', name: 'The Kitchen Table', emoji: '\u{2615}' });
const code = made.body && made.body.vibe && made.body.vibe.code;
say(made.code === 200 && !!code, 'a room is made through the real handler  (' + (code || made.code) + ')');

const srv = await serve(4758);
const b = await browser();
const ctx = await b.newContext({ ...PHONE });
const page = await ctx.newPage();
const loud = [];
page.on('pageerror', (e) => loud.push(String(e.message).slice(0, 120)));
page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) loud.push(m.text().slice(0, 120)); });
// the signal reads the server has answered, so a check can wait for a read made after the state it checks
let reads = 0;
// the app's own calls, answered by the real handlers as one phone on one connection
await page.route('**/api/**', async (route) => {
  const rq = route.request();
  const u = new URL(rq.url());
  const name = u.pathname.replace(/^\/api\//, '').replace(/\.js$/, '');
  if (!H[name]) return route.fulfill({ status: 204, body: '' });
  let body = {};
  try { body = rq.postDataJSON() || {}; } catch (e) { body = {}; }
  const r = await call(name, rq.method(), body, Object.fromEntries(u.searchParams), '10.9.0.2');
  await route.fulfill({ status: r.code || 200, contentType: 'application/json', body: JSON.stringify(r.body ?? {}) });
  if (name === 'signal' && body.act === 'read') reads++;
});
// opens the room again and waits until the block has painted a signal read the server answered after this call
const intoFresh = async () => {
  const was = reads;
  await into();
  for (let i = 0; i < 40 && reads === was; i++) await page.waitForTimeout(250);
  await page.waitForTimeout(400);
  return reads > was;
};
// a month-old garden, seeded once per tab (sessionStorage outlives "Start over", which must not be undone by a reseed)
await ctx.addInitScript((g) => {
  if (sessionStorage.getItem('g56-seeded')) return;
  sessionStorage.setItem('g56-seeded', '1');
  if (!localStorage.getItem('gratus.galaxy.v1')) localStorage.setItem('gratus.galaxy.v1', JSON.stringify(g));
}, month());
const into = async () => {
  await page.goto(srv.base + '/app/vibes?code=' + code + '&nosplash=1&notour=1&dev=1', { waitUntil: 'domcontentloaded', timeout: 20000 });
  for (let i = 0; i < 40; i++) { if (await page.$('#vb-ask')) break; await page.waitForTimeout(250); }
  await page.waitForTimeout(800);
};
const text = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ') : ''; }, sel);
const tap = async (sel, settle = 900) => { await page.locator(sel).first().scrollIntoViewIfNeeded().catch(() => null); await page.click(sel); await page.waitForTimeout(settle); };

await into();
say(!!(await page.$('#vb-paxt-new')) && !!(await page.$('#vb-ask')), 'the room carries "Write a PAXT for this room" and "Ask the room"');

// a PAXT written from inside the room shows in its strip, counted in keys
await tap('#vb-paxt-new', 1400);
const pre = await page.evaluate(() => document.getElementById('pd-body')?.value || '');
await page.fill('#pd-title', 'Sunday dinners');
await page.fill('#pd-body', pre.trimEnd() + '\n\nWe cook for each other on Sundays.');
await page.fill('#pd-need', '2');
await tap('#pd-go', 2500);
const opened = await page.evaluate(() => (/^\/app\/pact\/([a-z0-9-]+)/.exec(location.pathname) || [])[1] || '');
say(!!opened, 'the PAXT opens in its own room  (' + opened + ')');
// The room's own sheets sit above it. Join on a device with no note of this PAXT opens the name sheet, and its Join
// button is the thing under a finger at its centre, not the room behind it.
await tap('#pact-join', 1200);
const onTop = await page.evaluate(() => {
  const b = document.querySelector('#pj-go'); if (!b) return false;
  const r = b.getBoundingClientRect();
  return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === b;
});
say(onTop, 'Join inside the PAXT room opens the name sheet above the room, where its Join button can be pressed');
// a covered Join cannot be pressed: a click would wait out its timeout and end the gate before the checks below
if (onTop) {
  await page.fill('#pj-name', 'Robin');
  await tap('#pj-go', 2500);
}
let joinedNow = '';
for (let i = 0; i < 20 && !/Robin/.test(joinedNow); i++) { joinedNow = await text('.pact-joined'); await page.waitForTimeout(300); }
const stillHere = await page.evaluate(() => location.pathname);
say(/Robin/.test(joinedNow) && stillHere.startsWith('/app/pact/'),
  'the name sheet joins, the room lists the name, and the address still names the PAXT after the sheet closes  (' + stillHere + ')');
await into();
let strip = '';
for (let i = 0; i < 20 && !/Sunday dinners/.test(strip); i++) { strip = await text('#vb-paxts'); await page.waitForTimeout(400); }
say(/Sunday dinners/.test(strip) && /key/i.test(strip), 'the room\'s strip shows it, counted in keys  (' + strip.slice(0, 80) + ')');
if (PICS) await page.screenshot({ path: path.join(PICS, 'g56-room-strip.png'), fullPage: true });

// a signal: asked, answered, counts held at one answer
await tap('#vb-ask', 1200);
await page.fill('#sg-q', 'Which day suits us?');
await page.fill('[data-sg-choice="0"]', 'Saturday');
await page.fill('[data-sg-choice="1"]', 'Sunday');
await tap('[data-sg-days="1"]', 300);
await tap('#sg-go', 2000);
let sid = '';
for (let i = 0; i < 20 && !sid; i++) { sid = await page.evaluate(() => document.querySelector('[data-sg]')?.getAttribute('data-sg') || ''); await page.waitForTimeout(300); }
say(!!sid, 'the signal shows in the room with its choices');
await tap('[data-sg-c="0"]', 1800);
let block = await text('#vb-signals');
const heldNow = !(await page.$('#vb-signals .signal-counts')) && block.includes(SIG.HELD_LINE);
say(heldNow, 'at one answer the counts are held, and the room says when they show');
if (PICS) await page.screenshot({ path: path.join(PICS, 'g56-signal-held.png'), fullPage: true });

// two more devices answer (their own tokens and connections); the counts stay held while the signal is open
const t2 = await call('signal', 'POST', { act: 'tap', code, sid, c: 1, token: token() }, {}, '10.9.1.1');
const t3 = await call('signal', 'POST', { act: 'tap', code, sid, c: 0, token: token() }, {}, '10.9.1.2');
say(t2.code === 200 && t3.code === 200, 'two more devices answer through the real handler  (' + t2.code + ', ' + t3.code + ')');
// a read made after the two taps, so the block shows what the server says at three answers and not the page as it was
const freshAt3 = await intoFresh();
for (let i = 0; i < 20; i++) { if ((await text('#vb-signals')).includes(SIG.HELD_LINE)) break; await page.waitForTimeout(400); }
block = await text('#vb-signals');
say(freshAt3 && !(await page.$('#vb-signals .signal-counts')) && block.includes(SIG.TAP_LINE) && block.includes(SIG.HELD_LINE) && !/device/i.test(block),
  'at three answers, in a read made after them, the counts are still held: the room shows this device\'s answer and when counts show, and no number  (fresh read: ' + freshAt3 + ')');
if (PICS) await page.screenshot({ path: path.join(PICS, 'g56-signal-held-three.png'), fullPage: true });

// the server's clock moves past the one-day close (and the minute the totals wait for); the room is read again
ahead = 2 * DAY;
const freshClosed = await intoFresh();
for (let i = 0; i < 20; i++) { if (await page.$('#vb-signals .signal-counts')) break; await page.waitForTimeout(400); }
block = await text('#vb-signals');
const counts = await page.evaluate(() => [...document.querySelectorAll('#vb-signals .signal-counts li b')].map((x) => Number(x.textContent)));
say(freshClosed && counts.length === 2 && counts[0] === 2 && counts[1] === 1, 'after the close, in a fresh read, the counts show  (' + counts.join(', ') + ')');
say(block.includes(SIG.MANY_LINE) && block.includes(SIG.CLOSED_LINE), 'with the line that one person can answer from more than one device, and that it has closed');
say(!/didn.t answer|not answered|has not|haven.t/i.test(block), 'nothing names or counts who did not answer');
if (PICS) await page.screenshot({ path: path.join(PICS, 'g56-signal-counts.png'), fullPage: true });
ahead = 0;

// "Start over" keeps its word: the voice recordings and the PAXT keys live in IndexedDB, and they go too
await page.evaluate(() => Promise.all([['gratus-keep', 'voice'], ['gratus-keys', 'paxt']].map(([n, s]) => new Promise((ok) => {
  const r = indexedDB.open(n, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(s);
  r.onsuccess = () => { r.result.close(); ok(); }; r.onerror = () => ok();
}))));
const dbs = () => page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name).filter((n) => /^gratus-/.test(n)).sort().join(','));
const before = await dbs();
page.once('dialog', (d) => d.accept());
await tap('#top-you', 1200);
await tap('#you-reset', 2600);
await page.waitForLoadState('domcontentloaded').catch(() => null);
await page.waitForTimeout(1500);
const after = await dbs();
const left = await page.evaluate(() => {
  const g = JSON.parse(localStorage.getItem('gratus.galaxy.v1') || '{}');
  return { entries: (g.entries || []).length, keys: ['gratus-signal-secret', 'gratus-signal-tapped', 'gratus-paxt-mine', 'gratus-paxt-passed'].filter((k) => localStorage.getItem(k) !== null) };
});
say(before === 'gratus-keep,gratus-keys' && after === '' && left.entries === 0 && left.keys.length === 0,
  '"Start over" leaves nothing behind: both IndexedDB stores, the garden and the PAXT and signal keys are gone  (' + before + ' -> ' + (after || 'none') + '; ' + left.entries + ' entries; ' + (left.keys.join(',') || 'no keys') + ')');

say(loud.length === 0, 'no page error' + (loud.length ? '  (' + loud.slice(0, 3).join(' | ') + ')' : ''));
await b.close();
srv.close && srv.close();
console.log('G56 a PAXT room and a signal: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
