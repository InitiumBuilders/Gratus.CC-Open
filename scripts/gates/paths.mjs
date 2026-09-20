// G31 · PATHWAYS, THE ACCOUNT DOOR, AND THE WEEK.
//
// Driven in a browser rather than read. A pathway nobody can reach is a file, an account
// door nobody can find is not a door, and a paywall that walls a gift link is the one
// mistake this product must never make.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { serve, browser, PHONE, open } from './lib/harness.mjs';
// screenshots land in the machine's own temp directory, because a path with somebody's
// home in it is a path that works once and a name everywhere else
const OUT = path.join(os.tmpdir(), 'gratus-paths');
fs.mkdirSync(OUT, { recursive: true });
const srv = await serve(4530);
const base = 'http://127.0.0.1:4530';
const b = await browser();
let bad = 0;
const say = (ok, m) => { if (!ok) bad++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + m); };

// ── pathways ──
{
  const o = await open(b, base, '/app/book');
  await o.page.evaluate(() => {
    const t = [...document.querySelectorAll('[data-book]')].find((x) => x.dataset.book === 'paths');
    if (t) t.click();
  });
  await o.page.waitForTimeout(800);
  const r = await o.page.evaluate(() => ({
    tab: !!document.querySelector('[data-book="paths"]'),
    rows: document.querySelectorAll('[data-path]').length,
    first: (document.querySelector('[data-path]') || {}).innerText || '',
  }));
  say(r.tab, 'the Growth Book has a Pathways tab');
  say(r.rows >= 10, 'and it lists the pathways  (' + r.rows + ')');
  if (r.rows) {
    await o.page.screenshot({ path: OUT + '/p-list.png' });
    await o.page.evaluate(() => document.querySelector('[data-path]').click());
    await o.page.waitForTimeout(800);
    const sheet = await o.page.evaluate(() => (document.querySelector('#sheets .sheet') || {}).innerText || '');
    say(/day \d|Start it now/.test(sheet), 'and a pathway opens with its days in it');
    await o.page.screenshot({ path: OUT + '/p-one.png' });
  }
  await o.close();
}

// ── the account sheet, reachable and rendering ──
{
  const o = await open(b, base, '/app');
  const found = await o.page.evaluate(() => {
    const m = [...document.querySelectorAll('button, a')].find((x) => /menu|you/i.test(x.getAttribute('aria-label') || ''));
    if (m) m.click();
    return !!m;
  });
  await o.page.waitForTimeout(700);
  const opened = await o.page.evaluate(() => {
    const el = [...document.querySelectorAll('button')].find((x) => /Gratus account/i.test(x.textContent || ''));
    if (el) { el.click(); return true; }
    return false;
  });
  await o.page.waitForTimeout(900);
  const sheet = await o.page.evaluate(() => (document.querySelector('#sheets .sheet') || {}).innerText || '');
  say(found && opened, 'the account door is in the menu');
  say(/Keep your garden|Create one|password/i.test(sheet), 'and it opens the sign-up sheet');
  if (/password/i.test(sheet)) await o.page.screenshot({ path: OUT + '/a-signup.png' });
  await o.close();
}

// ── the paywall, when the week is over ──
{
  const ctx = await b.newContext(PHONE);
  await ctx.addInitScript(() => {
    try { localStorage.setItem('gratus.firstOpen', String(Date.now() - 9 * 86400000)); } catch (e) {}
  });
  const page = await ctx.newPage();
  await page.goto(base + '/app?nosplash=1&notour=1&dev=1', { waitUntil: 'load' });
  await page.waitForTimeout(3200);
  const t = await page.evaluate(() => (document.querySelector('#sheets .sheet') || {}).innerText || '');
  say(/free week is up|\$24/i.test(t), 'a week-old device is asked to subscribe  (' + JSON.stringify(t.slice(0, 40)) + ')');
  say(/Receiving a gift is always free/i.test(t), 'and is told receiving a gift stays free');
  if (/free week/i.test(t)) await page.screenshot({ path: OUT + '/a-wall.png' });
  await ctx.close();
}

// ── and a gift link is never walled ──
{
  const ctx = await b.newContext(PHONE);
  await ctx.addInitScript(() => { try { localStorage.setItem('gratus.firstOpen', String(Date.now() - 40 * 86400000)); } catch (e) {} });
  const page = await ctx.newPage();
  await page.goto(base + '/gift', { waitUntil: 'load' });
  await page.waitForTimeout(3200);
  const t = await page.evaluate(() => (document.querySelector('#sheets .sheet') || {}).innerText || '');
  say(!/free week is up/i.test(t), 'a gift link is open to anybody, however old the device is');
  await ctx.close();
}

await b.close();
srv.close();
console.log('G31 paths: ' + (bad ? 'FAIL - ' + bad : 'PASS'));
process.exit(bad ? 1 : 0);
