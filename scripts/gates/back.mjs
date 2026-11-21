// G47 · THE WAY BACK.
//
// Every move inside the app used to change the one step the phone's history held, so its
// back gesture left Gratus from any room. A room is a step now, and so is anything a touch
// opens over the page. This walks in and out on a phone with the phone's own back, and
// checks what must not pile up: the three doors, the journal's tabs, a sheet closed by hand.
//
// One thing is checked on every walk: nothing adds a step while the phone is stepping back.
// A browser reads a page that does that as one holding a person in, and stops honouring its
// steps. The gate's own back stands in for the phone's and cannot be skipped the way a
// phone's can, so this is the only place that shape is seen before a person meets it.
//
// Two controls. One serves the app with a room changing the step instead of adding one,
// which is how it was. The other serves it adding a step while it answers a step back.
//
//   node scripts/gates/back.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, ROOT, PHONE } from './lib/harness.mjs';
import { month } from './lib/garden.mjs';

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + msg); };
const KEY = 'gratus.galaxy.v1';
const Q = '?nosplash=1&notour=1&dev=1';

console.log('G47 - the way back');

// Each control is one edit to the app as it is served to one phone. If the line it edits is
// no longer there the control is void and says so, instead of passing with nothing planted.
const APP = fs.readFileSync(path.join(ROOT, 'assets/js/galaxy.js'), 'utf8');
const FAULTS = {
  flat: ["      history.pushState({ g: 1, d: cur.d + 1, from: here, fy: y }, '', pathOf(t, to));\n",
    "      history.replaceState({ g: 1, d: cur.d, from: cur.from }, '', pathOf(t, to));\n"],
  stray: ["    $$('#sheets .scrim').forEach((s) => s.click());\n", ''],
  trap: ['    if (introOn && introCancel) introCancel();\n',
    "    if (introOn && introCancel) introCancel();\n    if (ours && $('#sheets .sheet:not(.out)')) history.pushState(st, '');\n"],
};
const faulty = {};
for (const [name, [from, to]] of Object.entries(FAULTS)) {
  faulty[name] = APP.split(from).length === 2 ? APP.replace(from, () => to) : null;
  say(!!faulty[name], 'the control "' + name + '" has a line to be planted in');
}

const srv = await serve(4815);
const b = await browser();
let added = 0;   // steps added while the phone was stepping back, across every walk

// A phone that reaches the app from another page, the way a person does, so there is
// somewhere for a step too many to land.
async function phone(first, fault) {
  const ctx = await b.newContext({ ...PHONE, serviceWorkers: 'block' });
  await ctx.route('**/api/**', (route) => {
    const rq = route.request(); const u = new URL(rq.url());
    if (u.pathname === '/api/goals' && rq.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"goals":[]}' });
    if (u.pathname === '/api/billing') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"connected":false}' });
    return route.fulfill({ status: 204, body: '' });
  });
  if (fault) await ctx.route('**/assets/js/galaxy.js*', (route) => route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: faulty[fault] }));
  await ctx.addInitScript(({ key, garden }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(garden));
    // The gate arms this just before its own back or forward. From the moment that step is
    // heard until every listener has answered it, a step added is counted.
    const w = window.__way = { armed: false, hearing: false, added: 0 };
    const push = history.pushState.bind(history);
    history.pushState = (...a) => { if (w.hearing) w.added++; return push(...a); };
    window.addEventListener('popstate', () => { if (!w.armed) return; w.armed = false; w.hearing = true; setTimeout(() => { w.hearing = false; }, 0); }, true);
  }, { key: KEY, garden: month() });
  const page = await ctx.newPage();
  const loud = [];
  page.on('pageerror', (e) => loud.push(String(e.message).slice(0, 100)));
  await page.goto(srv.base + '/privacy.html', { waitUntil: 'domcontentloaded' });
  await page.goto(srv.base + first + Q, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  // the marks a month already earned light on first open; walk past the ones that are held
  for (let i = 0, quiet = 0; i < 60 && quiet < 4; i++) {
    const up = await page.evaluate(() => { const r = document.getElementById('ceremony'); return !!r && !r.hidden; });
    if (up) { quiet = 0; await page.keyboard.press('Escape'); } else quiet++;
    await page.waitForTimeout(260);
  }
  // a step that leaves the app loads another page, and a question asked while it loads is asked again
  const ask = async (fn, arg) => { for (let i = 0; i < 8; i++) { try { return await page.evaluate(fn, arg); } catch (e) { await page.waitForTimeout(350); } } return null; };
  const where = () => ask(() => location.pathname);
  const steps = () => ask(() => history.length);
  const has = (id) => ask((i) => !!document.getElementById(i), id);
  const sheets = () => ask(() => document.querySelectorAll('#sheets .sheet:not(.out)').length);
  // what a step can change: the address, a sheet, a held moment, the laws
  const look = () => ask(() => [location.pathname, document.querySelectorAll('#sheets .sheet:not(.out)').length,
    (document.getElementById('ceremony') || {}).hidden, (document.getElementById('laws') || {}).hidden].join('|'));
  // A tap or a step is waited for by what it changes, with a ceiling, and then given a moment
  // to finish. A busy machine makes it slow, and slow is not wrong.
  const until = async (was, ceiling = 6000) => { for (let t = 0; t < ceiling; t += 150) { if ((await look()) !== was) break; await page.waitForTimeout(150); } await page.waitForTimeout(500); await page.waitForLoadState('domcontentloaded').catch(() => null); };
  const tap = async (sel) => {
    const s = sel.startsWith('#') || sel.startsWith('.') || sel.startsWith('[') ? sel : '#' + sel;
    await ask((q) => { const el = document.querySelector(q); if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' }); }, s);
    const was = await look();
    await page.click(s);
    await until(was, 2400);
  };
  // the phone's own back and forward: a gesture, and not a tap on anything of ours
  const step = async (n) => {
    const was = await look();
    await page.evaluate((k) => { window.__way.armed = true; history.go(k); }, n).catch(() => null);
    await until(was);
    const a = await ask(() => { const w = window.__way; if (!w) return 0; const k = w.added; w.added = 0; return k; });
    added += a || 0;
  };
  const back = () => step(-1);
  const forward = () => step(1);
  // a door at the bottom of the screen; a film may stand in it, and a key passes a film
  const door = async (name) => { await page.click('.tabs button[data-tab="' + name + '"]'); await page.waitForTimeout(350); await page.keyboard.press('Escape'); await page.waitForTimeout(700); };
  return { ctx, page, loud, ask, where, steps, has, sheets, tap, back, forward, door, close: () => ctx.close() };
}

// ══ IN, IN, AND BACK OUT ══
async function trail(fault) {
  const v = await phone('/app', fault);
  const o = { n0: await v.steps() };
  await v.ask(() => document.getElementById('open-together').scrollIntoView({ block: 'center', behavior: 'instant' }));
  o.y0 = await v.ask(() => Math.round(window.scrollY));
  await v.tap('open-together');
  o.room = await v.where(); o.n1 = await v.steps();
  await v.tap('tg-vibes');
  o.vibes = await v.where(); o.n2 = await v.steps();
  await v.back();
  o.back1 = await v.where(); o.painted1 = o.back1 === '/app/goals' && await v.has('tg-vibes');
  if (o.back1 === '/app/goals') {
    await v.back();
    o.back2 = await v.where(); o.painted2 = await v.has('open-together');
    o.y1 = await v.ask(() => Math.round(window.scrollY));
    await v.forward();
    o.fwd = await v.where(); o.painted3 = await v.has('goal-in');
  }
  o.loud = v.loud;
  await v.close();
  return o;
}
{
  const t = await trail(null);
  say(t.room === '/app/goals' && t.n1 === t.n0 + 1, 'walking into a room adds a step  (' + t.n0 + ' to ' + t.n1 + ')');
  say(t.vibes === '/app/vibes' && t.n2 === t.n0 + 2, 'and a room inside it adds another  (' + t.n2 + ')');
  say(t.back1 === '/app/goals' && t.painted1, 'the phone’s back returns to the room before, and the room is drawn  (' + t.back1 + ')');
  say(t.back2 === '/app' && t.painted2, 'and again to the home page  (' + t.back2 + ')');
  say(t.y0 > 100 && Math.abs(t.y1 - t.y0) <= 8, 'which stands where it was left  (' + t.y0 + ' and ' + t.y1 + ')');
  say(t.fwd === '/app/goals' && t.painted3, 'forward walks in again  (' + t.fwd + ')');
  say(t.loud.length === 0, 'the browser threw nothing' + (t.loud.length ? '  (' + t.loud[0] + ')' : ''));
}

// ══ WHAT ADDS NO STEP ══
{
  const v = await phone('/app');
  await v.door('give'); const give = await v.where();
  await v.door('grow'); const grow = await v.where();
  await v.door('gratus'); const home = await v.where();
  say(give === '/app/give' && grow === '/app/grow' && home === '/app', 'the three doors go where they say  (' + [give, grow, home].join(', ') + ')');
  await v.tap('open-journal');
  const book = await v.where();
  await v.tap('[data-book="log"]');
  await v.tap('[data-book="marks"]');
  const marks = await v.where();
  await v.back();
  const out = await v.where();
  say(book === '/app/book' && marks === '/app/marks' && out === '/app', 'one step back leaves the journal, whichever of its tabs was open  (' + marks + ' to ' + out + ')');
  await v.back();
  const gone = await v.where();
  say(gone === '/privacy.html', 'and the three doors added none: the next step leaves the app  (' + gone + ')');
  await v.close();
}

// ══ THE ARROW IN THE CORNER TAKES THE SAME STEP ══
{
  const v = await phone('/app');
  await v.tap('open-together'); await v.tap('tg-vibes');
  await v.tap('top-back');
  const a = await v.where();
  await v.back(); const c = await v.where();
  await v.back(); const d = await v.where();
  say(a === '/app/goals' && c === '/app' && d === '/privacy.html', 'the arrow steps once, as the phone would, and leaves nothing behind it  (' + [a, c, d].join(', ') + ')');
  await v.close();
}

// ══ A ROOM OPENED FROM A LINK ══
{
  const v = await phone('/app/vibes');
  const n0 = await v.steps();
  await v.tap('top-back'); const up1 = await v.where();
  await v.tap('top-back'); const up2 = await v.where();
  const n1 = await v.steps();
  await v.back(); const gone = await v.where();
  say(up1 === '/app/goals' && up2 === '/app', 'with nothing behind it, the arrow goes up to the room it belongs to, then home  (' + up1 + ', ' + up2 + ')');
  say(n1 === n0 && gone === '/privacy.html', 'and adds no step doing it  (' + n0 + ' and ' + n1 + ', then ' + gone + ')');
  await v.close();
}

// ══ A SHEET IS A STEP ══
{
  // over a room, with something half typed under it
  const v = await phone('/app');
  await v.tap('open-together');
  await v.page.fill('#goal-in', 'Write to my');
  await v.tap('top-you');
  const open = await v.sheets();
  await v.back();
  const shut = await v.sheets(); const stay = await v.where();
  const typed = await v.ask(() => (document.getElementById('goal-in') || {}).value);
  await v.back(); const then = await v.where();
  say(open === 1 && shut === 0 && stay === '/app/goals', 'with a sheet open over a room, back closes the sheet and the room stays  (' + stay + ')');
  say(typed === 'Write to my', 'and the room under it did not move: what was half typed is still there  (' + JSON.stringify(typed) + ')');
  say(then === '/app', 'the press after it walks out of the room  (' + then + ')');
  await v.close();

  // on the home page, where there is no room under it at all
  const h = await phone('/app');
  await h.tap('home-menu');
  const up = await h.sheets();
  await h.back();
  const down = await h.sheets(); const still = await h.where();
  await h.back(); const gone = await h.where();
  say(up === 1 && down === 0 && still === '/app', 'on the home page too: back closes the menu and Gratus stays open  (' + still + ')');
  say(gone === '/privacy.html', 'and the press after that leaves, as it always did  (' + gone + ')');
  await h.close();

  // closed by hand, it takes its step with it
  const c = await phone('/app');
  await c.tap('top-you');
  const was = await c.sheets();
  await c.ask(() => { const s = document.querySelectorAll('#sheets .scrim'); if (s.length) s[s.length - 1].click(); });
  await c.page.waitForTimeout(900);
  const now = await c.sheets();
  await c.back(); const out = await c.where();
  say(was === 1 && now === 0 && out === '/privacy.html', 'a sheet closed by hand leaves no step behind: one press leaves the app  (' + out + ')');
  await c.close();

  // a row in the menu closes the sheet and walks into a room, in that order
  const m = await phone('/app');
  await m.tap('home-menu');
  await m.tap('m-log');
  const log = await m.where(); const left = await m.sheets();
  await m.back(); const home = await m.where();
  await m.back(); const away = await m.where();
  say(log === '/app/log' && left === 0 && home === '/app' && away === '/privacy.html', 'a row in the menu walks into its room and leaves one step, the room’s  (' + [log, home, away].join(', ') + ')');
  await m.close();

  // one sheet closing and another opening
  const s = await phone('/app');
  await s.tap('top-you');
  await s.tap('you-account');
  await s.page.waitForTimeout(900);
  const second = await s.sheets();
  await s.back(); const closed = await s.sheets(); const here = await s.where();
  await s.back(); const off = await s.where();
  say(second === 1 && closed === 0 && here === '/app' && off === '/privacy.html', 'a sheet that opens another leaves one step, and back closes what is open  (' + here + ', then ' + off + ')');
  await s.close();
}

// ══ A SHEET NO TOUCH OPENED ══
// It holds no step, because a browser does not honour a step it did not see a person ask
// for. So back walks out of the room under it, and the sheet goes with the room.
async function stray(fault) {
  const v = await phone('/app', fault);
  await v.tap('open-together');
  // Every scripted read here counts as a touch, so the page clicks for itself, later, once the
  // last touch has run out (Chromium keeps one for five seconds), and the gate reads nothing
  // until then.
  await v.ask(() => setTimeout(() => { window.__spent = !(navigator.userActivation && navigator.userActivation.isActive); document.getElementById('top-you').click(); }, 6500));
  await v.page.waitForTimeout(7600);
  const spent = await v.ask(() => window.__spent === true);
  const up = await v.sheets(); const n = await v.steps();
  await v.back();
  const at = await v.where(); const left = await v.sheets();
  await v.close();
  return { up, at, left, spent };
}
{
  const s = await stray(null);
  say(s.spent, 'the last touch has run out before the sheet opens');
  say(s.up === 1 && s.at === '/app' && s.left === 0, 'a sheet a touch did not open holds no step: back leaves the room, and the sheet goes with it  (' + s.at + ', ' + s.left + ' open)');
}

// ══ A HELD MOMENT, AND THE LAWS ══
{
  const v = await phone('/app');
  const held = () => v.ask(() => { const r = document.getElementById('ceremony'); return !!r && !r.hidden; });
  await v.tap('open-together');          // a room first, so a step of ours lies under the day
  await v.door('grow');
  await v.page.click('#write'); await v.page.keyboard.type('The light on the kitchen table.', { delay: 4 });
  const pick = await v.page.$('#pick [data-pick]'); if (pick) { await pick.scrollIntoViewIfNeeded(); await pick.click(); }
  await v.tap('plant');
  await v.page.waitForTimeout(900);
  const up = await held();
  await v.back();
  const still = await held(); const end = await v.where();
  const kept = await v.ask((k) => (JSON.parse(localStorage.getItem(k) || '{}').entries || []).some((e) => /kitchen table/.test(e.text)), KEY);
  await v.back(); const gone = await v.where();
  say(up && !still && end === '/app', 'back walks out of a held moment, and the day ends at home  (' + end + ')');
  say(kept, 'with the day kept');
  say(gone === '/privacy.html', 'and no step left behind it  (' + gone + ')');
  await v.close();

  const w = await phone('/app');
  await w.tap('home-menu');
  await w.tap('m-guides');
  const guides = await w.where();
  await w.tap('gd-laws');
  const lawsUp = await w.ask(() => !document.getElementById('laws').hidden);
  await w.back();
  const lawsDown = await w.ask(() => document.getElementById('laws').hidden);
  const stay = await w.where();
  await w.back(); const home = await w.where();
  say(guides === '/app/guides' && lawsUp && lawsDown && stay === '/app/guides' && home === '/app', 'the twelve laws, opened over a room, close on back and the room stays  (' + stay + ', then ' + home + ')');
  await w.close();
}

// ══ THE DOOR OF THE TAB A ROOM WAS ENTERED FROM ══
{
  const v = await phone('/app');
  await v.tap('open-together');
  await v.door('gratus');
  const home = await v.where(); const drawn = await v.has('open-together');
  await v.back(); const gone = await v.where();
  say(home === '/app' && drawn && gone === '/privacy.html', 'from a room, its own door at the bottom walks back out and leaves no dead step  (' + home + ', then ' + gone + ')');
  await v.close();
}

// ══ A RELOAD KEEPS THE TRAIL ══
{
  const v = await phone('/app');
  await v.tap('open-together'); await v.tap('tg-vibes');
  await v.page.reload({ waitUntil: 'domcontentloaded' }); await v.page.waitForTimeout(1500);
  const here = await v.where();
  await v.tap('top-back');
  const a = await v.where();
  say(here === '/app/vibes' && a === '/app/goals', 'after a reload inside a room, back still returns to the room before  (' + a + ')');
  await v.close();

  // a reload with a sheet open: the sheet is gone, and so is its step
  const r = await phone('/app');
  await r.tap('open-together');
  await r.tap('top-you');
  await r.page.reload({ waitUntil: 'domcontentloaded' }); await r.page.waitForTimeout(2200);
  const at = await r.where(); const open = await r.sheets();
  await r.back(); const one = await r.where();
  await r.back(); const two = await r.where();
  say(at === '/app/goals' && open === 0 && one === '/app' && two === '/privacy.html', 'after a reload with a sheet open, the sheet’s step is gone with it  (' + [at, one, two].join(', ') + ')');
  await r.close();
}

// ══ NOTHING ADDS A STEP WHILE THE PHONE STEPS BACK ══
say(added === 0, 'across every walk above, nothing added a step while the phone was stepping  (' + added + ')');

// ══ THE CONTROLS ══
if (faulty.flat) {
  const c = await trail('flat');
  say(c.vibes === '/app/vibes' && c.n2 === c.n0 && c.back1 !== '/app/goals', 'the control: with a room changing the step instead of adding one, back from Vibes leaves the app, and that is seen  (' + c.back1 + ')');
}
if (faulty.stray) {
  const c = await stray('stray');
  say(c.at === '/app' && c.left === 1, 'the control: without that, the sheet stays open over a page it was not opened on, and that is seen  (' + c.left + ' open)');
}
if (faulty.trap) {
  const before = added;
  const v = await phone('/app', 'trap');
  await v.tap('open-together');
  await v.tap('top-you');
  await v.back();
  await v.close();
  say(added > before, 'the control: an app that adds a step while it answers a step back is seen  (' + (added - before) + ')');
}

await b.close(); await srv.close();
console.log('G47 the way back: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
