// G35 · THE FRONT DOOR TELLS THE TRUTH.
//
// The front page is the one page most people will ever see, and for a while it said, in
// plain type, "There are no accounts and nothing to buy." Accounts had shipped. So had a
// price. Nothing in the build noticed, because nothing was reading the front page for
// claims about the product.
//
// This does. It also proves the plates are photographs of the app rather than drawings of
// it, and that a figure about somebody else's work never renders as a zero.
//
//   node --import ./scripts/gates/lib/loader.mjs scripts/gates/landing.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, browser } from './lib/harness.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let fails = 0;
const say = (ok, m) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + m); };
const rd = (f) => fs.readFileSync(path.join(root, f), 'utf8');

console.log('G35 - the front door');
const html = rd('index.html');

// ── what it claims about itself ──
const LIES = [
  [/there are no accounts/i, 'accounts shipped'],
  [/nothing to buy/i, 'a price shipped'],
  [/free for ?ever\b(?![^.]*gift)/i, 'the app is not free for ever; receiving a gift is'],
];
for (const [re, why] of LIES) {
  const m = html.match(re);
  say(!m, 'the page does not say ' + JSON.stringify(re.source.slice(0, 26)) + (m ? '  is ' + why + ': ' + JSON.stringify(m[0]) : ''));
}
say(/\$24 a month/.test(html), 'and it does say what it costs');
say(/free, for ever, with no account/.test(html), 'and that opening a gift somebody sends you is free');

// ── the plates are the app, not a drawing of it ──
say(!/art\/mock\//.test(html), 'no mockup is on the front page');
const shots = [...html.matchAll(/art\/shots\/([a-z]+)\.webp/g)].map((m) => m[1]);
say(shots.length >= 3, 'it shows at least three photographs of the app  (' + shots.join(', ') + ')');
for (const s of new Set(shots)) {
  say(fs.existsSync(path.join(root, 'assets/art/shots/' + s + '.webp')), '  ' + s + '.webp is on disk');
}
say(fs.existsSync(path.join(root, 'reference.html')), 'and his mockups kept a page of their own');
say(/art\/mock\//.test(rd('reference.html')), '  which is where they are shown');

// ── and it renders ──
const srv = await serve(4767);
const b = await browser();
const STATS = { at: new Date().toISOString(), usd: 7177892, donors: 29335, listed: 7736, verified: 4464, months: [{ d: '2021/2', usd: 77 }], since: '2021/2', categories: [], qf: { rounds: 19, matching: 1235540, live: [] }, age: 0 };

async function look(quiet) {
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const loud = [];
  page.on('pageerror', (e) => loud.push(String(e.message).slice(0, 80)));
  await page.route('**/api/giveth-stats**', (r) => (quiet
    ? r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'quiet' }) })
    : r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(STATS) })));
  await page.goto(srv.base + '/?nosplash=1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  await page.evaluate(() => {
    document.querySelectorAll('.act, .foot').forEach((e) => e.classList.add('on'));
    document.querySelectorAll('img[loading=lazy]').forEach((i) => { i.loading = 'eager'; i.src = i.src; });
  });
  await page.waitForTimeout(2000);
  return { page, ctx, loud };
}

const live = await look(false);
const text = (await live.page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
say(text.includes('$7,177,892'), 'the front page fills with the live figure');
say(/29,335 people/.test(text) && /7,736 projects/.test(text), 'and says who gave it and to how many projects');
const imgs = await live.page.evaluate(() => [...document.querySelectorAll('.screen img')].map((i) => ({ s: i.getAttribute('src'), w: i.naturalWidth })));
say(imgs.length >= 3 && imgs.every((i) => i.w > 0), 'every photograph of the app loads  (' + imgs.map((i) => i.w).join(', ') + ')');
say(live.loud.length === 0, 'nothing thrown' + (live.loud.length ? '  (' + live.loud[0] + ')' : ''));
for (const w of [320, 375, 390]) {
  await live.page.setViewportSize({ width: w, height: 800 });
  await live.page.waitForTimeout(350);
  const spill = await live.page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
  say(spill === 0, 'nothing pushes the page sideways at ' + w + '  (' + spill + 'px)');
}
await live.ctx.close();

// ── and when Giveth says nothing, the page does not invent a zero ──
const dark = await look(true);
const t2 = (await dark.page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
say(!/\$0\b/.test(t2), 'a quiet Giveth never becomes $0');
say(/Giveth is not answering/.test(t2), 'it says nobody answered');
say(!/\$7,177,892/.test(t2), 'and no figure is left standing from a page that failed to read one');
await dark.ctx.close();

await b.close(); await srv.close();
console.log('G35 the front door: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
