// G43 · THE FILMS LET GO.
//
// Taking a <video> off the page stops it playing and not its download. Walked on the live
// site at the speed that was measured there (about 300 kB/s, a phone on a weak signal), the
// doorway film went on downloading after the doorway had closed, and "Plant My Gratus" took
// twenty-six seconds to leave the landing because the navigation queued behind the films.
//
// This throttles the page to that speed and checks the mechanism, because the queue itself
// comes from one congested connection and a local server cannot reproduce it:
//   · a film that leaves the page has no download left open
//   · following a link lets go of every film still arriving, before the next page is asked for
//   · after walking between views, every open film download belongs to a film on the page
//
//   node scripts/gates/films.mjs
import { serve, browser, PHONE } from './lib/harness.mjs';

let fails = 0;
const say = (ok, m) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + m); };
console.log('G43 - the films let go');

const PHONE_SPEED = { offline: false, latency: 60, downloadThroughput: 300 * 1024, uploadThroughput: 90 * 1024 };
const srv = await serve(4775);
const b = await browser();

async function slowPage() {
  const ctx = await b.newContext(PHONE);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', PHONE_SPEED);
  const open = new Map();
  page.on('request', (r) => { if (/\.mp4/.test(r.url())) open.set(r, new URL(r.url()).pathname.split('/').pop()); });
  const shut = (r) => open.delete(r);
  page.on('requestfinished', shut); page.on('requestfailed', shut);
  const films = () => [...open.values()];
  return { ctx, page, films };
}
const onPage = (page) => page.evaluate(() => [...document.querySelectorAll('video')].map((v) => ({
  film: ((v.querySelector('source') || {}).src || v.currentSrc || '').split('/').pop().replace(/#.*/, ''),
  arriving: v.networkState === 2, released: v.dataset.released === '1',
})));

// ── the doorway's film stops when the doorway goes ──
{
  const { ctx, page, films } = await slowPage();
  await page.goto(srv.base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  say(films().includes('explode.mp4'), 'the doorway film is downloading while the doorway is up  (' + films().join(', ') + ')');
  await page.mouse.click(187, 400);
  await page.waitForTimeout(2600);
  say(!films().includes('explode.mp4'), 'and once the doorway has gone, nothing is still pulling it  (' + (films().join(', ') || 'no film downloads open') + ')');

  // ── leaving never waits on the page being left ──
  // The first tap is stopped at the window, after the page has heard it and before the
  // browser acts on it, so the films can be looked at in the moment of leaving. (Holding the
  // next page's answer with a route closed the page under the service worker.) The second
  // tap goes through.
  await page.evaluate(() => { window.__hold = true; window.addEventListener('click', (e) => { if (window.__hold) e.preventDefault(); }); });
  const before = await onPage(page);
  say(before.some((v) => v.arriving), 'the landing is downloading its scene film when the call is tapped');
  await page.click('a.gpill >> text=Plant My Gratus', { noWaitAfter: true });
  await page.waitForTimeout(300);
  const during = await onPage(page);
  const still = during.filter((v) => v.arriving);
  say(still.length === 0, 'tapping it lets go of every film still arriving  (' + (still.map((v) => v.film).join(', ') || 'none left') + ')');
  await page.waitForTimeout(400);
  say(films().length === 0, 'so the navigation has the connection to itself  (' + (films().join(', ') || 'no film downloads open') + ')');
  await page.evaluate(() => { window.__hold = false; });
  await page.click('a.gpill >> text=Plant My Gratus', { noWaitAfter: true });
  await page.waitForURL('**/app/grow**', { timeout: 20000 }).catch(() => null);
  say(new URL(page.url()).pathname === '/app/grow', 'and the tap lands in Grow');
  await ctx.close();
}

// ── walking between views leaves nothing downloading behind ──
{
  const { ctx, page, films } = await slowPage();
  const ever = new Set();
  page.on('request', (r) => { if (/\.mp4/.test(r.url())) ever.add(new URL(r.url()).pathname.split('/').pop()); });
  // Which scene a view opens on turns with the count of opens, so find a view that is
  // downloading a scene film right now rather than trusting the arithmetic. Without a film in
  // flight to leave behind, "nothing left downloading" would be true of an empty room.
  let scene = null, where = null;
  for (const v of ['book', 'world', 'journey', 'galaxy', 'vault', 'earth', 'projects', 'giveth']) {
    await page.goto(srv.base + '/app/' + v + '?nosplash=1&notour=1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1400);
    const f = (await onPage(page)).find((x) => x.arriving && x.film);
    if (f) { scene = f.film; where = v; break; }
  }
  say(!!scene && films().includes(scene), 'a view is downloading its scene film  (' + (where ? where + ': ' + scene : 'none found') + ')');
  if (await page.evaluate(() => { const r = document.getElementById('tour'); return !!r && !r.hidden && !!r.querySelector('#tour-skip'); })) { await page.click('#tour-skip'); await page.waitForTimeout(300); }
  await page.click('.tabs button[data-tab="gratus"]');
  await page.waitForTimeout(2600);   // the old scene's crossfade is 1.6s
  say(!!scene && !films().includes(scene), 'and walking away lets it go  (' + (films().join(', ') || 'no film downloads open') + ')');
  for (const t of ['give', 'grow', 'gratus', 'give']) {
    // a new garden is offered the tour once the address has lost ?notour; decline it as a person would
    if (await page.evaluate(() => { const r = document.getElementById('tour'); return !!r && !r.hidden && !!r.querySelector('#tour-skip'); })) { await page.click('#tour-skip'); await page.waitForTimeout(300); }
    await page.click('.tabs button[data-tab="' + t + '"]');
    await page.waitForTimeout(600);
    // pass the tab film at once, the way an impatient thumb does
    await page.evaluate(() => { const i = document.getElementById('intro'); if (i && !i.hidden && i.onclick) i.onclick(); });
    await page.waitForTimeout(900);
  }
  await page.waitForTimeout(2200);   // the old scene's crossfade is 1.6s
  const here = await onPage(page);
  const mine = here.filter((v) => v.arriving).map((v) => v.film);
  const orphans = films().filter((f) => !mine.includes(f));
  say(ever.has('give-intro.mp4') && ever.has('grow-intro.mp4'), 'the doors played their films on the way  (' + [...ever].join(', ') + ')');
  say(orphans.length === 0, 'and after four doors, every film still downloading is one on the screen  (' + films().length + ' open, ' + mine.length + ' on the page' + (orphans.length ? ': orphans ' + orphans.join(', ') : '') + ')');
  await ctx.close();
}

await b.close(); await srv.close();
console.log('G43 the films let go: ' + (fails ? 'FAIL · ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
