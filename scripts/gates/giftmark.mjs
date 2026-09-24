// G36 · THE MARK THAT KNOWS YOU ARE HOLDING SOMETHING.
//
// Two halves. The passing is pure arithmetic over a date, so it can be checked for a
// thousand days at once: every device on earth has to land on the same four minutes
// without ever asking anybody, and the windows must be rare enough to stay a surprise.
// The rest is a real browser: the mark wraps when a garden holds something ready, the
// gift leaves through the top of the screen when it is shared, and the bar is plain again
// when it lands somewhere else.
//
//   node scripts/gates/giftmark.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, browser, open } from './lib/harness.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let fails = 0;
const say = (ok, m) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + m); };

console.log('G36 - the wrapped mark');

// ── his graphic, exactly as he made it ──
const PNG = 'assets/art/gfx/giftmark.png';
const WEBP = 'assets/art/gfx/giftmark.webp';
say(fs.existsSync(path.join(root, PNG)), 'his graphic is in the tree');
say(fs.existsSync(path.join(root, WEBP)), 'and has a rendition the wire can carry');
const originals = JSON.parse(fs.readFileSync(path.join(root, 'config/originals.json'), 'utf8'));
say(!!(originals.files && originals.files[PNG]), 'and the original is written into the ledger, so nothing may quietly replace it');
const kb = Math.round(fs.statSync(path.join(root, WEBP)).size / 1024);
say(kb < 120, 'the rendition is small enough to swap in without a wait  (' + kb + ' kB)');

// ── the passing: the same four minutes, everywhere, without asking anybody ──
const { passingsOn, passingNow, PASSING_MINUTES, PLAIN, WRAPPED } = await import(path.join(root, 'assets/js/giftmark.js'));
const day = (n) => new Date(Date.UTC(2026, 0, 1 + n, 12, 0, 0));
let same = true, tooClose = 0, seen = new Set();
for (let n = 0; n < 1000; n++) {
  const d = day(n);
  const a = passingsOn(d);
  const b = passingsOn(new Date(d.getTime()));
  if (a[0] !== b[0] || a[1] !== b[1]) same = false;
  if (a[1] - a[0] < 180) tooClose++;
  seen.add(a[0]); seen.add(a[1]);
}
say(same, 'a day always gives the same two minutes, so two devices never disagree');
say(tooClose === 0, 'and the two are never less than three hours apart  (' + tooClose + ' of 1000 days)');
say(seen.size > 800, 'across a thousand days they land all over the clock  (' + seen.size + ' distinct minutes)');

// it is rare: eight minutes out of every 1440
const minutes = 2 * PASSING_MINUTES;
say(minutes <= 10, 'it is ' + minutes + ' minutes of a day, so it stays a surprise');

// and it is actually on, when it is on
const d0 = day(7);
const [first] = passingsOn(d0);
const inside = new Date(Date.UTC(2026, 0, 8, 0, 0, 0) + (first * 60 + 30) * 1000);
const outside = new Date(Date.UTC(2026, 0, 8, 0, 0, 0) + (first * 60 + PASSING_MINUTES * 60 + 30) * 1000);
say(passingNow(inside) > 0, 'inside the window the mark is wrapped  (' + passingNow(inside) + 's left)');
say(passingNow(outside) === 0, 'and a half minute after it, it is not');

// ── the browser half ──
const srv = await serve(4769);
const b = await browser();
const DAY = 86400000;
const today = new Date().toISOString().slice(0, 10);
const back = (n) => new Date(Date.parse(today + 'T12:00:00Z') - n * DAY).toISOString().slice(0, 10);
const kept = (from) => { const o = []; for (let i = from; i >= 0; i--) o.push(back(i)); return o; };
const READY = {
  v: 5, feel: false, tour: 'seen', name: 'A', entries: [], sound: false,
  plants: [{ id: 'p1', emoji: '☕', planted: back(21), kept: kept(21), carried: 0, origin: 'planted', from: null }],
  gifts: { given: [], received: [] }, my: { emojis: [], recipes: [] },
  wishes: [], goals: [], made: {}, opens: 0, migrated: true,
  folders: [], milestones: {}, seeds: [], alch: {}, sun: null, vibes: [], glyphSeed: '', hidden: {}, cer: {},
};
const BARE = Object.assign({}, READY, { plants: [] });

async function withGarden(garden, route) {
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(srv.base + '/app?nosplash=1&notour=1&dev=1', { waitUntil: 'domcontentloaded' });
  await page.evaluate((g) => localStorage.setItem('gratus.galaxy.v1', JSON.stringify(g)), garden);
  await page.goto(srv.base + (route || '/app') + '?nosplash=1&notour=1&dev=1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2400);
  return { page, ctx, close: () => ctx.close() };
}
const coreSrc = (p) => p.evaluate(() => {
  const i = document.querySelector('.tabs .star .core img');
  return i ? i.getAttribute('src') : null;
});

// nothing ready: the plain mark, unless the world happens to be passing right now
let v = await withGarden(BARE);
const bare = await coreSrc(v.page);
const passing = passingNow(new Date()) > 0;
say(bare === (passing ? WRAPPED : PLAIN), 'an empty garden shows the plain mark  (' + bare + (passing ? ', and the world is passing' : '') + ')');
await v.close();

// something ready to give: wrapped
v = await withGarden(READY);
say(await coreSrc(v.page) === WRAPPED, 'a garden holding something ready shows the wrapped mark');
const gold = await v.page.evaluate(() => document.documentElement.classList.contains('wrapped'));
say(gold, 'and the core burns gold while it is carrying');
await v.close();

// standing in Give: wrapped, whatever the garden holds
v = await withGarden(BARE, '/app/give');
say(await coreSrc(v.page) === WRAPPED, 'standing in Give wraps it, even with nothing grown');
await v.close();

// holding somebody else's gift: wrapped
v = await withGarden(BARE, '/gift');
say(await coreSrc(v.page) === WRAPPED, 'and so does holding somebody else’s gift open');
await v.close();

// ── the launch ──
v = await withGarden(READY);
const flight = await v.page.evaluate(async () => {
  const m = await import('/assets/js/giftmark.js?v=39');
  const from = document.querySelector('.tabs .star .core img');
  const seen = [];
  m.launch(from, {});
  const stage = document.querySelector('.launch');
  if (!stage) return { made: false };
  const flier = stage.querySelector('.flier');
  const read = () => { const r = flier.getBoundingClientRect(); seen.push({ t: Math.round(performance.now()), y: Math.round(r.top + r.height / 2), s: Math.round(r.width) }); };
  read();
  await new Promise((ok) => setTimeout(ok, 500)); read();
  await new Promise((ok) => setTimeout(ok, 700)); read();
  // the handover waits half a second, for the gather, then fades; by now it is done
  const socketOpacity = Number(getComputedStyle(from).opacity);
  await new Promise((ok) => setTimeout(ok, 700)); read();
  // Wait on the animation rather than on a clock. Reading 450ms later caught the stage
  // already removed, and a detached node reports a rectangle of zeros, which reads exactly
  // like a gift that stopped level with the top of the screen.
  const anim = flier.getAnimations()[0];
  if (anim) { try { await anim.finished; } catch (e) {} }
  const gone = { top: Math.round(flier.getBoundingClientRect().bottom), waves: stage.querySelectorAll('.wv').length, src: flier.getAttribute('src') };
  await new Promise((ok) => setTimeout(ok, 500));
  return { made: true, seen, gone, cleared: !document.querySelector('.launch'), socketEmpty: socketOpacity < 0.1, socketOpacity: socketOpacity.toFixed(2) };
});
say(flight.made, 'sharing a gift builds the launch');
say(flight.gone && flight.gone.waves === 3, 'with three waves of gravity  (' + (flight.gone || {}).waves + ')');
say(flight.gone && flight.gone.src && flight.gone.src.includes('giftmark'), 'and it is his graphic that flies');
say(flight.socketEmpty === true, 'and the bar it left from is empty while it flies, so there is one gift, not two  (' + flight.socketOpacity + ')');
const ys = (flight.seen || []).map((x) => x.y);
say(ys.length === 4 && ys[3] < ys[0] - 200, 'it travels upward and keeps going  (' + ys.join(' → ') + ')');
say(flight.gone && flight.gone.top < 0, 'and leaves through the top of the screen  (bottom edge at ' + (flight.gone || {}).top + ')');
say(flight.cleared, 'then takes itself off the page');
const blocks = await v.page.evaluate(() => {
  const s = document.createElement('div'); s.className = 'launch'; document.body.appendChild(s);
  const hit = document.elementFromPoint(188, 400);
  const bad = !!(hit && hit.closest && hit.closest('.launch'));
  s.remove();
  return bad;
});
say(!blocks, 'and nothing it draws can be tapped by accident');
await v.close();

// after it has gone, the mark rests: a gift that just left must not re-wrap the bar
const RESTED = Object.assign({}, READY, { gaveAt: new Date().toISOString() });
v = await withGarden(RESTED);
say(await coreSrc(v.page) === (passingNow(new Date()) > 0 ? WRAPPED : PLAIN),
  'once a gift has gone, the mark rests rather than asking again');
await v.close();

await b.close(); await srv.close();
console.log('G36 the wrapped mark: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
