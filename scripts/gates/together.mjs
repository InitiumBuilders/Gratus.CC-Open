// G46 · THE ROOM BEHIND THE DOOR.
//
// Gratus Goals, Vibes and your people moved off the home page into one room. For a day the
// room's repaint was still tied to the home page: the stream arrived and the room never
// showed it. No gate opened that room.
//
// This one walks it on a phone. The door on the home page, the stream arriving while a
// goal is half typed, the goal posted, the three doors inside, and the way back. The control
// serves the app with the repaint tied to the home page again, and it has to be seen.
//
//   node scripts/gates/together.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, ROOT, PHONE } from './lib/harness.mjs';
import { month } from './lib/garden.mjs';

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + msg); };
const KEY = 'gratus.galaxy.v1';
const THEIRS = { id: 'g-ben', text: 'Call my brother every Sunday.', name: 'Ben', emoji: '☕', at: '2026-11-19T08:00:00.000Z' };
const MINE = 'Write to my sister every week.';
const HALF = MINE.slice(0, 12);

console.log('G46 - the room behind the door');

// One edit to the app as it is served to one phone. If the line is no longer there the
// control is void and says so, instead of passing with nothing planted.
const APP = fs.readFileSync(path.join(ROOT, 'assets/js/galaxy.js'), 'utf8');
const FROM = "if (tab === 'gratus' && sub === 'goals') { const gi = $('#goal-in');";
const planted = APP.split(FROM).length === 2 ? APP.replace(FROM, () => "if (tab === 'gratus' && !sub) { const gi = $('#goal-in');") : null;
say(!!planted, 'the control has a line to be planted in');

const srv = await serve(4813);
const b = await browser();

async function walk(fault) {
  const ctx = await b.newContext({ ...PHONE, serviceWorkers: 'block' });
  const posts = [];
  await ctx.route('**/api/**', async (route) => {
    const rq = route.request(); const u = new URL(rq.url());
    if (u.pathname === '/api/goals' && rq.method() === 'GET') {
      // slow enough that the room is painted, and somebody is typing, before it answers
      await new Promise((r) => setTimeout(r, 900));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, goals: [THEIRS] }) });
    }
    if (u.pathname === '/api/goals') { posts.push(rq.postData() || ''); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, goal: { id: 'g-new' } }) }); }
    if (u.pathname === '/api/billing') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"connected":false}' });
    return route.fulfill({ status: 204, body: '' });
  });
  if (fault) await ctx.route('**/assets/js/galaxy.js*', (route) => route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: planted }));
  await ctx.addInitScript(({ key, garden }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(garden)); }, { key: KEY, garden: month() });
  const page = await ctx.newPage();
  const loud = [];
  page.on('pageerror', (e) => loud.push(String(e.message).slice(0, 100)));
  await page.goto(srv.base + '/app?nosplash=1&notour=1&dev=1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  // the marks a month already earned light on first open; walk past the ones that are held
  for (let i = 0, quiet = 0; i < 60 && quiet < 4; i++) {
    const up = await page.evaluate(() => { const r = document.getElementById('ceremony'); return !!r && !r.hidden; });
    if (up) { quiet = 0; await page.keyboard.press('Escape'); } else quiet++;
    await page.waitForTimeout(260);
  }
  const centre = (id) => page.evaluate((i) => { const el = document.getElementById(i); if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' }); }, id);
  const read = () => page.evaluate(() => ({
    path: location.pathname,
    text: (document.querySelector('.page') || document.body).innerText.replace(/\s+/g, ' '),
    field: (document.getElementById('goal-in') || {}).value,
    vibes: !!document.getElementById('tg-vibes'),
    people: !!document.getElementById('tg-people'),
    galaxy: !!document.getElementById('tg-galaxy'),
  }));
  // the way back is waited for by where it lands, with a ceiling: a busy machine is slow, and slow is not wrong
  const home = async () => { await page.waitForFunction(() => location.pathname === '/app/goals', null, { timeout: 8000 }).catch(() => null); await page.waitForTimeout(500); };
  const out = { loud, posts };
  out.home = await page.evaluate(() => ({ door: !!document.getElementById('open-together'), field: !!document.getElementById('goal-in') }));
  await centre('open-together');
  await page.click('#open-together');
  await page.waitForTimeout(350);
  await page.fill('#goal-in', HALF);
  out.early = await read();
  await page.waitForTimeout(1600);
  out.late = await read();
  if (!fault) {
    await page.fill('#goal-in', MINE);
    await page.click('#goal-post');
    await page.waitForTimeout(700);
    out.posted = await read();
    out.kept = ((await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), KEY)).goals || []).map((g) => g.text);
    await centre('tg-vibes');
    await page.click('#tg-vibes'); await page.waitForTimeout(700);
    out.vibes = new URL(page.url()).pathname;
    // the app's own way back: a room entered from this one returns to this one
    await page.click('#top-back'); await home();
    out.back = await read();
    await centre('tg-galaxy');
    await page.click('#tg-galaxy'); await page.waitForTimeout(800);
    out.galaxy = new URL(page.url()).pathname;
    await page.click('#top-back'); await home();
    out.back2 = (await read()).path;
    await centre('tg-people');
    await page.click('#tg-people'); await page.waitForTimeout(700);
    out.sheet = await page.evaluate(() => { const s = document.querySelectorAll('#sheets .sheet'); return s.length ? s[s.length - 1].innerText.replace(/\s+/g, ' ') : ''; });
  }
  await ctx.close();
  return out;
}

const w = await walk(false);
say(w.home.door && !w.home.field, 'the home page carries the door, and the goal field has left it');
say(w.early.path === '/app/goals' && w.early.vibes && w.early.people && w.early.galaxy, 'the door opens a room with an address, and three doors inside  (' + w.early.path + ')');
say(!w.early.text.includes(THEIRS.text), 'before the stream answers, the room does not pretend to have it');
say(w.late.text.includes(THEIRS.text), 'when the stream arrives, the room shows it');
say(w.late.field === HALF, 'and what was being typed is still in the field  (' + JSON.stringify(w.late.field) + ')');
say(w.posted.text.includes(MINE) && w.kept.join() === MINE, 'a goal posted is on the screen and kept on the device');
let sent = null;
try { sent = JSON.parse(w.posts[0]); } catch (e) { sent = null; }
say(w.posts.length === 1 && !!sent && Object.keys(sent).sort().join() === 'emoji,name,text' && sent.text === MINE,
  'and one line goes to the stream: the words, a name and an emoji  (' + (sent ? Object.keys(sent).sort().join(', ') : 'nothing') + ')');
say(w.vibes === '/app/vibes', 'the first door inside goes to Vibes  (' + w.vibes + ')');
say(w.back.path === '/app/goals' && w.back.text.includes(THEIRS.text), 'and back returns to the room, with the stream still in it');
say(w.galaxy === '/app/galaxy' && w.back2 === '/app/goals', 'the Galaxy is behind another, and back returns from it too  (' + w.galaxy + ')');
say(/Keep your garden|Gratus account/.test(w.sheet), 'your people, with no account, opens on making one  (' + w.sheet.slice(0, 36) + ')');
say(w.loud.length === 0, 'the browser threw nothing' + (w.loud.length ? '  (' + w.loud[0] + ')' : ''));

if (planted) {
  const c = await walk(true);
  say(c.early.path === '/app/goals' && !c.late.text.includes(THEIRS.text), 'the control: with the repaint tied to the home page, the stream never shows, and that is seen');
}

await b.close(); await srv.close();
console.log('G46 the room behind the door: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
