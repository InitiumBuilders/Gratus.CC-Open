// G39 · A WEEK CANNOT END WITHOUT A RAIL.
//
// The paywall is a sticky sheet: no scrim, no drag, and a phone has no Escape key. Built
// before Stripe was switched on, it would have locked every person who reached day eight
// behind a button that threw "Card payments are not switched on yet", under a sentence
// promising that nothing is held hostage. The server had answered `connected: false` the
// whole time. The app read the state and never the connection.
//
// So this walks every combination that matters, in a real browser:
//
//   rail off, rail unreachable        → no wall and no warning, however long ago the week ended
//   rail on, week over                → the wall, and on it the way out it promises
//   rail on, one day left             → the warning; rail off, one day left → silence
//   somebody else's gift              → never a wall, whatever the rail says
//
//   node scripts/gates/rail.mjs
import fs from 'node:fs';
import { serve, browser } from './lib/harness.mjs';

let fails = 0;
const say = (ok, m) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + m); };
console.log('G39 - a week cannot end without a rail');

const DAY = 86400000;
const srv = await serve(4799);
const b = await browser();

const GARDEN = {
  v: 5, feel: false, tour: 'seen', name: 'A', entries: [{ id: 'e1', day: '2026-09-01', text: 'THE-LINE-THEY-WROTE', emoji: '☕', tags: [] }],
  plants: [{ id: 'p1', emoji: '☕', planted: '2026-09-01', kept: ['2026-09-01'], carried: 0, origin: 'planted', from: null }],
  gifts: { given: [], received: [] }, my: { emojis: [], recipes: [] }, sound: false,
  wishes: [], goals: [], made: {}, opens: 3, migrated: true,
  folders: [], milestones: { first: '2026-09-01' }, seeds: [], alch: {}, sun: null, vibes: [], glyphSeed: '', hidden: {}, cer: {},
};

// railGet: what GET /api/billing answers. statusPost: what the signed-in status answers.
async function visit({ railGet, daysAgo, route, signedIn, statusPost }) {
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.route('**/api/billing**', (r) => {
    if (r.request().method() === 'GET') {
      if (railGet === 'down') return r.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ connected: railGet === 'on' }) });
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(statusPost || {}) });
  });
  await page.goto(srv.base + '/app?nosplash=1&notour=1&dev=1', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ g, first, tk }) => {
    localStorage.setItem('gratus.galaxy.v1', JSON.stringify(g));
    localStorage.setItem('gratus.firstOpen', String(first));
    if (tk) localStorage.setItem('gratus.account.token', tk); else localStorage.removeItem('gratus.account.token');
  }, { g: GARDEN, first: Date.now() - daysAgo * DAY, tk: signedIn ? 'a.b.c' : '' });
  // THE TOAST IS ONE ELEMENT, #toast, whose words change and which wears `on` while it is
  // showing. Two detectors failed here before this one. The first watched for new `.toast`
  // nodes and saw none, ever, so "no warning" passed in a room where no warning could have
  // been seen. The second observed documentElement from an init script, which runs before
  // there is a documentElement, threw, and saw nothing either. This one asks from outside,
  // every quarter second, which cannot fail silently. The rail-on case is its positive
  // control: if it does not see that warning, none of the silences above it mean anything.
  const toasts = [];
  await page.goto(srv.base + (route || '/app') + (route && route.includes('?') ? '&' : '?') + 'nosplash=1&notour=1&dev=1', { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 22; i++) {
    await page.waitForTimeout(250);
    const said = await page.evaluate(() => { const t = document.getElementById('toast'); return t && t.classList.contains('on') ? (t.textContent || '').trim() : ''; });
    if (said && !toasts.includes(said)) toasts.push(said);
  }
  const wall = await page.evaluate(() => {
    const s = [...document.querySelectorAll('#sheets .sheet')].find((x) => /free week is up/i.test(x.textContent || ''));
    return s ? { up: true, keep: !!s.querySelector('#pw-keep'), text: s.textContent.replace(/\s+/g, ' ').slice(0, 60) } : { up: false };
  });
  return { page, ctx, wall, toasts, close: () => ctx.close() };
}

// ── the rail is off: nobody's week ends ──
let v = await visit({ railGet: 'off', daysAgo: 30 });
say(!v.wall.up, 'rail off, no account, thirty days in: no wall');
say(!v.toasts.some((t) => /free week/i.test(t)), 'and no warning about a week that cannot end');
const usable = await v.page.evaluate(() => { const t = document.querySelector('.tabs button[data-tab="grow"]'); if (!t) return false; const r = t.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!(hit && t.contains(hit)); });
say(usable, 'and the app is there to use, nothing standing in front of it');
await v.close();

v = await visit({ railGet: 'off', daysAgo: 30, signedIn: true, statusPost: { state: 'ended', connected: false } });
say(!v.wall.up, 'rail off, signed in, the account says ended: still no wall');
await v.close();

v = await visit({ railGet: 'down', daysAgo: 30 });
say(!v.wall.up, 'the rail cannot be reached at all: no wall, because an unanswered question is a no');
await v.close();

v = await visit({ railGet: 'off', daysAgo: 6 });
say(!v.toasts.some((t) => /free week/i.test(t)), 'rail off, one day left: silence  (' + (v.toasts.join(' | ') || 'none') + ')');
await v.close();

// ── the rail is on: the price is real, and so is the way out ──
v = await visit({ railGet: 'on', daysAgo: 30 });
say(v.wall.up, 'rail on, thirty days in: the wall  (' + (v.wall.text || '') + ')');
say(v.wall.keep, 'and on it, the way to take your garden with you');
if (v.wall.keep) {
  const [dl] = await Promise.all([
    v.page.waitForEvent('download', { timeout: 6000 }).catch(() => null),
    v.page.click('#pw-keep'),
  ]);
  say(!!dl, 'pressing it hands you a file');
  if (dl) {
    const p = await dl.path();
    const body = p ? fs.readFileSync(p, 'utf8') : '';
    say(/gratus-\d{4}-\d{2}-\d{2}\.json/.test(dl.suggestedFilename()), 'named for the day  (' + dl.suggestedFilename() + ')');
    say(body.includes('THE-LINE-THEY-WROTE'), 'and it is their whole garden, including what they wrote');
  }
}
await v.close();

v = await visit({ railGet: 'on', daysAgo: 6 });
say(v.toasts.some((t) => /free week ends in/i.test(t)), 'rail on, one day left: the warning comes  (' + (v.toasts.join(' | ') || 'none') + ')');
say(!v.wall.up, 'and it is a warning, not a wall');
await v.close();

// ── somebody else's gift is never behind a wall ──
v = await visit({ railGet: 'on', daysAgo: 30, route: '/gift' });
say(!v.wall.up, 'rail on, week over, holding somebody’s gift: no wall');
await v.close();

await b.close(); await srv.close();
console.log('G39 the rail: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
