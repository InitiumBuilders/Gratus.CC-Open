// G41 · ONE DOORWAY PER ARRIVAL, AND EVERY DOOR OPENS FROM THE KEYBOARD.
//
// The doorway plays every time the app is opened, and that stays. What it may not do is
// play twice on one arrival: the landing and the app are two pages with a doorway each, and
// a stranger who walked through the first and tapped "Plant My Gratus" was put in front of
// the same film again before a word could be written.
//
// And a door that only a pointer can open is locked for everybody else. Walked on the live
// site, Escape was pressed three times at the tour and it stayed.
//
// Every "it did not show" below has a positive control: the same detector, on a fresh open,
// has to see the doorway. A detector that sees nothing makes every absence pass.
//
//   node scripts/gates/doorway.mjs
import { serve, browser, PHONE } from './lib/harness.mjs';

let fails = 0;
const say = (ok, m) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + m); };
console.log('G41 - one doorway per arrival');

// Watches for the doorway from before the page exists, and holds every film still, so no
// door closes by itself while a key is being tested (a film that cannot start lets the
// door go after a second, and that would pass for a key that did nothing).
const WATCH = () => {
  window.__shown = false;
  new MutationObserver(() => {
    const s = document.getElementById('splash');
    if (s && !s.hidden && s.innerHTML.trim()) window.__shown = true;
  }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'] });
  HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
};
const srv = await serve(4771);
const b = await browser();
const fresh = async () => { const ctx = await b.newContext(PHONE); await ctx.addInitScript(WATCH); return ctx; };
const shown = (p) => p.evaluate(() => window.__shown === true);
const leaving = (p, id) => p.evaluate((i) => { const s = document.getElementById(i); return !!s && (s.hidden || s.classList.contains('out')); }, id);
const crossed = (p) => p.evaluate(() => { try { return Number(sessionStorage.getItem('gratus.crossed') || 0); } catch (e) { return -1; } });
// The tab bar is written into app.html, so it is there before anything runs. The view is
// what the app builds when it starts.
const started = (p) => p.evaluate(() => { const v = document.getElementById('view'); return !!v && v.children.length > 0; });

// ── a stranger: the landing's doorway, then the app ──
{
  const ctx = await fresh(); const page = await ctx.newPage();
  await page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  say(await shown(page), 'the landing opens on its doorway');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(120);
  say(await leaving(page, 'splash'), 'and Escape walks through it, the way a tap does');
  say(await crossed(page) > 0, 'the crossing is remembered for this visit');
  await page.waitForTimeout(1600);
  await page.click('a.gpill >> text=Plant My Gratus');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1600);
  say(new URL(page.url()).pathname === '/app/grow', 'Plant My Gratus lands in Grow  (' + new URL(page.url()).pathname + ')');
  say(!(await shown(page)), 'and the app does not stand them in front of the doorway a second time');
  say(await started(page), 'the app is simply there');
  await ctx.close();
}

// ── a fresh open of the app still gets its doorway, and Enter passes it ──
{
  const ctx = await fresh(); const page = await ctx.newPage();
  await page.goto(srv.base + '/app?notour=1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  say(await shown(page), 'opening the app cold plays the doorway  (the positive control for every absence here)');
  say(!(await started(page)), 'and nothing is built behind it yet');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(120);
  say(await leaving(page, 'splash'), 'Enter walks through it');
  await page.waitForTimeout(900);
  say(await started(page), 'and the app is there after it');

  // the same visit, reloaded: no second doorway
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  say(!(await shown(page)), 'a reload in the same visit goes straight in');

  // the landing, after the app: its doorway is spent too, and its film comes straight in
  await page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  say(!(await shown(page)), 'walking back to the landing does not replay it');
  const film = await page.evaluate(() => !!document.querySelector('#scene video.fore'));
  say(film, 'and the landing brings its scene in at once, with nothing in front of it');

  // half an hour on, it is a new arrival
  await page.evaluate(() => sessionStorage.setItem('gratus.crossed', String(Date.now() - 31 * 60 * 1000)));
  await page.goto(srv.base + '/app?notour=1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  say(await shown(page), 'half an hour later the doorway is back');

  // a second tab is a second open, as a launch from the home screen is
  const other = await ctx.newPage();
  await other.goto(srv.base + '/app?notour=1', { waitUntil: 'domcontentloaded' });
  await other.waitForTimeout(700);
  say(await shown(other), 'and a new tab, like a launch from the home screen, gets its own');
  await ctx.close();
}

// ── the tour lets go on Escape, from its first card and from inside it ──
{
  const ctx = await fresh(); const page = await ctx.newPage();
  await page.goto(srv.base + '/app?nosplash=1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const up = () => page.evaluate(() => { const t = document.getElementById('tour'); return !!t && !t.hidden && !!t.querySelector('.tourcard'); });
  say(await up(), 'a new garden is offered the tour');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  say(!(await up()), 'Escape lets it go');
  const seen = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('gratus.galaxy.v1')).tour; } catch (e) { return null; } });
  say(seen === 'seen', 'and it counts as seen, so it does not come back on the next open  (' + seen + ')');

  // from inside a step: the tour is in the menu again for anybody who wants it
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('gratus.galaxy.v1')); s.tour = ''; localStorage.setItem('gratus.galaxy.v1', JSON.stringify(s)); });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.click('#tour-go');
  await page.waitForTimeout(1400);
  const step = await page.evaluate(() => !!document.querySelector('#tour .tourcard.near'));
  say(step, 'Walk me through it lights the first step');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  say(!(await up()), 'and Escape lets go from inside a step too');
  const lit = await page.evaluate(() => document.body.classList.contains('touring'));
  say(!lit, 'the page scrolls again once it has gone');
  await ctx.close();
}

// ── the tab films pass on a key ──
{
  const ctx = await fresh(); const page = await ctx.newPage();
  await page.goto(srv.base + '/app?nosplash=1&notour=1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1400);
  await page.click('.tabs button[data-tab="give"]');
  await page.waitForTimeout(400);
  const on = await page.evaluate(() => { const i = document.getElementById('intro'); return !!i && !i.hidden && !!i.querySelector('video'); });
  say(on, 'tapping Give plays its film');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(120);
  say(await leaving(page, 'intro'), 'and Escape walks through it');
  await page.waitForTimeout(1600);
  say(new URL(page.url()).pathname === '/app/give', 'into Give  (' + new URL(page.url()).pathname + ')');
  await ctx.close();
}

await b.close(); await srv.close();
console.log('G41 one doorway: ' + (fails ? 'FAIL · ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
