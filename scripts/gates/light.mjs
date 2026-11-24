// G52 · THE LIGHT OF YOUR DAY.
//
// On 2026-11-23 August looked at the app and said "it still all looks kinda ai generated", and asked
// for a few designs to cycle through, chosen by a sign. The rooms used to throw a different
// painting behind themselves on every open, thirty kinds of light with no thread between them.
// Since v56 the world follows the clock of the phone that holds it: Night (8 pm to 5 am), the
// world of his mockups; Golden, the first and last light; Day, the gardens. Each room keeps its
// symbol in each world, and one finish lies over every scene.
//
// This gate reads the worlds from the app itself (the JSON between /*looks*/ and /*end looks*/
// in galaxy.js), checks that every painting they name is on disk and that the one picture that
// is not ours is in none, walks every room in every world and reads the painting that is up,
// moves the clock through the day and reads the world, and reads the finish and the grain.
// It reads the sky (one light for each day kept) and the motion (a painting drifts, the grain
// runs, nothing moves under reduced motion, and on a desk the painting stays centred while it
// drifts). It plants a first day in a new garden and watches the day rise: when the ceremony
// ends, its seed flies to its place in the sky. Six controls must be seen: rooms that ignore the
// world, a clock that never turns, a scene with no finish, lights scattered at random, a drift
// that takes the desk's centring, and a ceremony whose seeds stay behind.
//
//   node scripts/gates/light.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, PHONE, ROOT } from './lib/harness.mjs';
import { month } from './lib/garden.mjs';

let fails = 0;
const say = (ok, m) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + m); };
console.log('G52 - the light of your day');

const APP = fs.readFileSync(path.join(ROOT, 'assets/js/galaxy.js'), 'utf8');
const GAL = fs.readFileSync(path.join(ROOT, 'assets/css/galaxy.css'), 'utf8');
const m = APP.match(/\/\*looks\*\/([\s\S]*?)\/\*end looks\*\//);
let LOOKS = null; try { LOOKS = m && JSON.parse(m[1]); } catch (e) { LOOKS = null; }
say(!!LOOKS, 'the worlds are written where this gate can read them  (' + (LOOKS ? Object.keys(LOOKS).join(', ') : 'none') + ')');
if (!LOOKS) { console.log('G52 the light of your day: FAIL - ' + fails); process.exit(1); }

const missing = [];
for (const [w, rooms] of Object.entries(LOOKS)) for (const [r, list] of Object.entries(rooms)) for (const n of list) {
  const f = /^[vd]/.test(n) ? n + '-poster.webp' : n + '.webp';
  if (!fs.existsSync(path.join(ROOT, 'assets/art/gfx', f))) missing.push(w + '/' + r + '/' + n);
}
say(missing.length === 0, 'every scene each world names is on disk' + (missing.length ? '  (' + missing.slice(0, 4).join(', ') + ')' : ''));
say(!JSON.stringify(LOOKS).includes('"g28"'), 'the one picture that is not ours (g28) is in no world');
const keys = Object.keys(LOOKS.night);
{ let g = ''; try { g = fs.readFileSync(path.join(ROOT, 'assets/css/grain.svg'), 'utf8'); } catch (e) {} say(/feTurbulence/.test(g) && g.length < 600, 'the grain is a drawing of a few hundred bytes, on disk  (' + g.length + ' bytes)'); }
// his gift journey mockup is drawn in the night: a gift opens there at any hour, with no film behind a page
say(['golden', 'day'].every((w) => JSON.stringify(LOOKS[w].journey) === JSON.stringify(LOOKS.night.journey)) && LOOKS.night.journey.length === 8 && !LOOKS.night.journey.some((n) => /^[vd]/.test(n)), 'a gift opens in the night of his drawing in every world, eight pages, no film  (' + LOOKS.night.journey.join(' ') + ')');
say(Object.values(LOOKS).every((w) => keys.every((k) => Array.isArray(w[k]) && w[k].length)), 'every world has a scene for every room  (' + keys.length + ' rooms)');

const ROOMS = [['/app', 'home'], ['/app/grow', 'grow'], ['/app/give', 'give'], ['/app/book', 'book'], ['/app/garden', 'garden'], ['/app/galaxy', 'galaxy'], ['/app/guides', 'guides'], ['/app/vibes', 'vibes'], ['/app/vault', 'vault'], ['/app/earth', 'earth'], ['/app/world', 'world'], ['/app/projects', 'projects'], ['/app/giveth', 'giveth'], ['/app/console', 'console']];
const srv = await serve(4825);
const b = await browser();
async function context(o = {}) {
  const ctx = await b.newContext({ ...PHONE, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await ctx.route('**/api/**', (r) => r.fulfill({ status: 204, body: '' }));
  if (o.js) await ctx.route('**/assets/js/galaxy.js*', (r) => r.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: o.js }));
  if (o.gal) await ctx.route('**/assets/css/galaxy.css*', (r) => r.fulfill({ status: 200, contentType: 'text/css; charset=utf-8', body: o.gal }));
  await ctx.addInitScript((g) => { if (!localStorage.getItem('gratus.galaxy.v1')) localStorage.setItem('gratus.galaxy.v1', JSON.stringify(g)); }, month());
  if (o.hour != null) await ctx.clock.setFixedTime(new Date(2026, 10, 23, o.hour, 30));
  return ctx;
}
const goto = (page, url) => page.goto(srv.base + url, { waitUntil: 'domcontentloaded' }).then(() => true, () => page.goto(srv.base + url, { waitUntil: 'domcontentloaded', timeout: 60000 }).then(() => true, () => false));

// every room, in every world, has a painting of that world up
async function walk(js) {
  const off = [];
  for (const w of Object.keys(LOOKS)) {
    const ctx = await context({ js }); const page = await ctx.newPage();
    for (const [route, key] of ROOMS) {
      await goto(page, route + '?nosplash=1&notour=1&dev=1&look=' + w);
      await page.waitForTimeout(1200);
      const up = await page.evaluate(() => { const ls = document.querySelectorAll('#scene .layer'); return ls.length ? ls[ls.length - 1].dataset.scene || '' : ''; }).catch(() => '');
      if (!LOOKS[w][key].includes(up)) off.push(w + ' ' + route + ' showed ' + (up || 'nothing'));
    }
    await ctx.close();
  }
  return off;
}
const off = await walk();
say(off.length === 0, 'every room shows a painting of its world, in all three worlds  (' + ROOMS.length * Object.keys(LOOKS).length + ' rooms read' + (off.length ? '; ' + off.slice(0, 3).join(' · ') : '') + ')');
const SL = 'function sceneList(key) { const w = LOOKS[look()]; return (w && w[key]) || SCENES[key]; }';
const ignores = APP.split(SL).length === 2 ? APP.replace(SL, () => 'function sceneList(key) { return SCENES[key]; }') : null;
say(!!ignores, 'the world control has its line to change');
if (ignores) { const c = await walk(ignores); say(c.length > 0, 'the control: rooms that ignore the world are seen  (' + c.length + ' rooms off their world)'); }

// the clock turns the world: night from 8 pm to 5 am, golden at first and last light, day between
const HOURS = [[0, 'night'], [4, 'night'], [5, 'golden'], [8, 'golden'], [9, 'day'], [12, 'day'], [16, 'day'], [17, 'golden'], [19, 'golden'], [20, 'night'], [23, 'night']];
async function clock(js) {
  const wrong = [];
  for (const [h, want] of HOURS) {
    const ctx = await context({ js, hour: h }); const page = await ctx.newPage();
    await goto(page, '/app?nosplash=1&notour=1&dev=1&look=auto');
    await page.waitForTimeout(900);
    const got = await page.evaluate(() => document.documentElement.dataset.look || '').catch(() => '');
    if (got !== want) wrong.push(h + ':30 ' + got + ' (not ' + want + ')');
    await ctx.close();
  }
  return wrong;
}
const wrong = await clock();
say(wrong.length === 0, 'the clock turns the world through the day  (' + HOURS.length + ' hours read' + (wrong.length ? '; ' + wrong.slice(0, 3).join(' · ') : '') + ')');
const LA = "function lookAt(h) { return h >= 20 || h < 5 ? 'night' : (h < 9 || h >= 17) ? 'golden' : 'day'; }";
const stuck = APP.split(LA).length === 2 ? APP.replace(LA, () => "function lookAt(h) { return 'day'; }") : null;
say(!!stuck, 'the clock control has its line to change');
if (stuck) { const c = await clock(stuck); say(c.length > 0, 'the control: a clock that never turns is seen  (' + c.length + ' hours wrong)'); }

// the finish and the grain, in each world
const FIN = '#scene .layer { filter: saturate(var(--g-sat, .9)) contrast(var(--g-con, 1.04)) brightness(var(--g-bri, .95)); }\n';
const flat = GAL.split(FIN).length === 2 ? GAL.replace(FIN, () => '') : null;
say(!!flat, 'the finish control has its line to change');
async function finish(gal) {
  const out = [];
  for (const w of Object.keys(LOOKS)) {
    const ctx = await context({ gal }); const page = await ctx.newPage();
    await goto(page, '/app/grow?nosplash=1&notour=1&dev=1&look=' + w);
    await page.waitForTimeout(1200);
    out.push(await page.evaluate((wl) => {
      const l = document.querySelector('#scene .layer'); const sc = document.getElementById('scene');
      return { w: wl, f: l ? getComputedStyle(l).filter : '', grain: /grain\.svg/.test(getComputedStyle(sc, '::before').backgroundImage), accent: getComputedStyle(document.documentElement).getPropertyValue('--violet-text').trim() };
    }, w).catch(() => ({ w, f: '', grain: false, accent: '' })));
    await ctx.close();
  }
  return out;
}
const fin = await finish();
say(fin.every((x) => /saturate/.test(x.f) && x.grain), 'every world lays its finish and its grain over the scene  (' + fin.map((x) => x.w + ' ' + (x.f.match(/saturate\(([^)]*)\)/) || [])[1]).join(' · ') + ')');
say(new Set(fin.map((x) => x.accent.toLowerCase())).size === 3, 'and each world carries its own light for the accent words  (' + fin.map((x) => x.w + ' ' + x.accent).join(' · ') + ')');
if (flat) { const c = await finish(flat); say(c.some((x) => !/saturate/.test(x.f)), 'the control: a scene with no finish is seen  (' + c.map((x) => x.f || 'none').join(' · ') + ')'); }

// your sky: one light for each day kept, in the same place every time, and none before the first day
const KEPT = new Set(month().entries.map((e) => e.day)).size;
async function sky(js, fresh) {
  const ctx = fresh ? await b.newContext({ ...PHONE, reducedMotion: 'reduce', serviceWorkers: 'block' }) : await context({ js });
  if (fresh) await ctx.route('**/api/**', (r) => r.fulfill({ status: 204, body: '' }));
  const page = await ctx.newPage(); const reads = [];
  for (let i = 0; i < 2; i++) {
    await goto(page, '/app/grow?nosplash=1&notour=1&dev=1&look=night');
    await page.waitForTimeout(1200);
    reads.push(await page.evaluate(() => { const ls = [...document.querySelectorAll('.stars i')]; return { n: ls.length, first: ls[0] ? ls[0].style.left + ' ' + ls[0].style.top : '', twinkle: ls.filter((l) => l.classList.contains('lit')).length }; }).catch(() => ({ n: -1, first: '', twinkle: 0 })));
  }
  await ctx.close();
  return reads;
}
{ const r = await sky(); say(r[0].n === Math.min(KEPT, 120) && r[1].n === r[0].n && r[0].first && r[0].first === r[1].first, 'the sky holds one light for each day kept, in the same place on every open  (' + r[0].n + ' lights for ' + KEPT + ' days; ' + r[0].twinkle + ' twinkle)'); }
{ const r = await sky(null, true); say(r[0].n === 0, 'a garden with no day yet has no light of its own  (' + r[0].n + ')'); }
const SK = "  const days = J.keptDays((S && S.entries) || []).slice(-SKY_MAX);\n";
const scattered = APP.split(SK).length === 2 ? APP.replace(SK, () => "  const days = Array.from({ length: 70 }, (x, i) => '2020-01-' + i + '-' + Math.random());\n") : null;
say(!!scattered, 'the sky control has its line to change');
if (scattered) { const r = await sky(scattered); say(r[0].n !== Math.min(KEPT, 120) || r[0].first !== r[1].first, 'the control: seventy lights scattered at random are seen  (' + r[0].n + ')'); }

// the world is alive: a painting drifts and the grain runs; under reduced motion nothing moves; and
// on a desk the painting stays centred while it drifts (the drift is scale and translate, so the
// transform that centres it there is left alone)
async function alive(gal, o = {}) {
  const ctx = await b.newContext({ viewport: o.desk ? { width: 1280, height: 800 } : PHONE.viewport, isMobile: !o.desk, hasTouch: !o.desk, reducedMotion: o.still ? 'reduce' : 'no-preference', serviceWorkers: 'block' });
  await ctx.route('**/api/**', (r) => r.fulfill({ status: 204, body: '' }));
  if (gal) await ctx.route('**/assets/css/galaxy.css*', (r) => r.fulfill({ status: 200, contentType: 'text/css; charset=utf-8', body: gal }));
  await ctx.addInitScript((g) => { if (!localStorage.getItem('gratus.galaxy.v1')) localStorage.setItem('gratus.galaxy.v1', JSON.stringify(g)); }, month());
  const page = await ctx.newPage();
  await goto(page, '/app/grow?nosplash=1&notour=1&dev=1&look=night');
  await page.waitForTimeout(1800);
  const r = await page.evaluate(() => {
    const f = document.querySelector('#scene .layer img.fore'); const sc = document.getElementById('scene');
    if (!f) return { none: true };
    const c = getComputedStyle(f); const box = f.getBoundingClientRect();
    return { drift: c.animationName, grain: getComputedStyle(sc, '::before').animationName, off: Math.round(box.left + box.width / 2 - innerWidth / 2) };
  }).catch(() => ({ none: true }));
  await ctx.close();
  return r;
}
{ const r = await alive(); say(!r.none && r.drift === 'scene-breathe' && r.grain === 'grain-run', 'a painting drifts and the grain runs  (' + r.drift + ', ' + r.grain + ')'); }
{ const r = await alive(null, { still: true }); say(!r.none && r.drift === 'none' && r.grain === 'none', 'under reduced motion the world is still  (' + r.drift + ', ' + r.grain + ')'); }
{ const r = await alive(null, { desk: true }); say(!r.none && r.drift === 'scene-breathe' && Math.abs(r.off) <= 3, 'on a desk the painting stays centred while it drifts  (' + r.off + 'px off centre)'); }
const KF = '@keyframes scene-breathe { from { scale: 1.01; translate: 0 0; } to { scale: 1.07; translate: 0 -1%; } }\n';
const shoved = GAL.split(KF).length === 2 ? GAL.replace(KF, () => '@keyframes scene-breathe { from { transform: scale(1.01); } to { transform: scale(1.07); } }\n') : null;
say(!!shoved, 'the drift control has its line to change');
if (shoved) { const r = await alive(shoved, { desk: true }); say(!r.none && Math.abs(r.off) > 20, 'the control: a drift written as a transform takes the centring away  (' + r.off + 'px off centre)'); }

// the days rise: a first day is planted in a new garden; when its ceremony ends, the seed leaves the
// ring for the sky, the flight clears itself, and the sky holds today's light. Reduced motion: no flight.
async function rise(js, still) {
  const ctx = await b.newContext({ ...PHONE, reducedMotion: still ? 'reduce' : 'no-preference', serviceWorkers: 'block' });
  await ctx.route('**/api/**', (r) => r.fulfill({ status: 204, body: '' }));
  if (js) await ctx.route('**/assets/js/galaxy.js*', (r) => r.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: js }));
  const page = await ctx.newPage();
  await goto(page, '/app/grow?nosplash=1&notour=1&dev=1&look=night');
  await page.waitForTimeout(1500);
  const out = { seen: 0, lights: 0, left: -1, now: 0, planted: false };
  try {
    await page.click('#write'); await page.keyboard.type('The light on the kitchen table this morning.', { delay: 3 });
    await page.evaluate(() => document.getElementById('plant').scrollIntoView({ block: 'center' }));
    await page.click('#plant'); out.planted = true;
    // walk the ceremony to its end, watching for the flight the moment it closes
    for (let i = 0; i < 80; i++) {
      const st = await page.evaluate(() => { const c = document.getElementById('ceremony'); const r = document.querySelector('.stars.rise'); return { up: !!c && !c.hidden, head: !!document.querySelector('#ceremony .jr-head circle'), rise: r ? r.children.length : 0 }; });
      if (st.rise) { out.seen = 1; out.lights = st.rise; break; }
      if (!st.up && i > 6) break;
      if (st.up && st.head) await page.keyboard.press('Escape'); else if (st.up && i % 4 === 3) await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(5200);
    const end = await page.evaluate(() => ({ left: document.querySelectorAll('.stars.rise').length, now: document.querySelectorAll('.stars:not(.rise) i.now').length, wait: document.querySelector('.stars:not(.rise)').classList.contains('wait') }));
    out.left = end.left; out.now = end.now; out.wait = end.wait;
  } catch (e) { out.err = String(e.message).split('\n')[0].slice(0, 90); }
  await ctx.close();
  return out;
}
{ const r = await rise(); say(r.planted && r.seen === 1 && r.lights >= 1 && r.left === 0 && r.now === 1 && !r.wait, 'a first day rises from the ceremony into the sky, and the sky holds it  (' + (r.err || (r.lights + ' light in flight, ' + r.left + ' left after, today lit ' + r.now)) + ')'); }
{ const r = await rise(null, true); say(r.planted && r.seen === 0 && r.now === 1, 'under reduced motion the day is simply in the sky  (' + (r.err || ('flights ' + r.seen + ', today lit ' + r.now)) + ')'); }
const RS = ' if (done) done(); skyRise(seeds); };\n';
const stays = APP.split(RS).length === 2 ? APP.replace(RS, () => ' if (done) done(); };\n') : null;
say(!!stays, 'the rise control has its line to change');
if (stays) { const r = await rise(stays); say(r.planted && r.seen === 0, 'the control: a ceremony whose seeds stay behind is seen  (flights ' + r.seen + ')'); }

await b.close(); await srv.close();
console.log('G52 the light of your day: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
