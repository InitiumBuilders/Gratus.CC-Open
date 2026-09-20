// G28 · THE HAND. What a thumb can reach, and what happens when it moves.
//
// Everything here is driven rather than inspected. A gesture that is only read in the
// source is a gesture nobody has performed, which is how a press-and-hold shipped in this
// app reading an option name no caller passed and went a whole release without firing
// once, and how a swipe guard that asked whether a hidden dialog existed answered yes
// forever. Both were found by driving them.
//
// Reach is measured the same way. A button forty pixels wide can still be a forty-four
// pixel target if the target is drawn under it, so the question is not how big the box is,
// it is whether the thing under the thumb twenty-one pixels out is still that button.
// Each control is scrolled to the middle of the screen before it is asked, because a
// control further down a page is not out of reach, it is further down a page.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { serve, browser, PHONE, open } from './lib/harness.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = 4496;
const srv = await serve(PORT);
const base = 'http://127.0.0.1:' + PORT;
const b = await browser();
let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + msg); };
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'scripts/fixtures/garden-v1.json'), 'utf8'));

// a garden with something in it, because an empty screen has nothing to test
async function withGarden(route) {
  const ctx = await b.newContext(PHONE);
  await ctx.addInitScript((g) => { try { localStorage.setItem('gratus.galaxy.v1', JSON.stringify(g)); } catch (e) {} }, fixture);
  const page = await ctx.newPage();
  await page.goto(base + route + '?nosplash=1&dev=1', { waitUntil: 'load' });
  await page.waitForTimeout(1600);
  // A garden with days in it can arrive to a ceremony, which is a real modal and is
  // meant to cover the screen. Walk through it before asking what is reachable, or the
  // answer is "nothing", which is correct about the ceremony and useless about the app.
  const shut = () => page.evaluate(() => {
    const c = document.querySelector('#ceremony');
    return !c || c.hidden || getComputedStyle(c).display === 'none';
  });
  for (let i = 0; i < 10 && !(await shut()); i++) {
    await page.evaluate(() => {
      const c = document.querySelector('#ceremony');
      const go = c && (c.querySelector('button, .btn, .cer') || c);
      if (go) go.click();
    });
    await page.waitForTimeout(900);
  }
  // If it is still up after nine seconds of asking, close it here and say so. The
  // question this gate exists to answer is what covers a control when nothing is
  // supposed to be covering it, and a ceremony that will not leave answers a different
  // one. Forcing it is stated rather than silent.
  const forced = !(await shut());
  if (forced) await page.evaluate(() => { const c = document.querySelector('#ceremony'); if (c) { c.hidden = true; c.style.display = 'none'; } });
  await page.waitForTimeout(300);
  return { page, forced, close: () => ctx.close() };
}
function unusedGuard() {}

// A finger, driven through the events the app listens to. It dispatches on the element
// being tested: the handlers are bound there and the event would bubble to them from any
// child anyway, so this asks the handler the question directly.
const FINGER = `(sel, from, to, steps) => {
  const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
  if (!el) return 'no element';
  const fire = (type, x, y) => el.dispatchEvent(new PointerEvent(type, {
    pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0,
    buttons: type === 'pointerup' ? 0 : 1,
    clientX: x, clientY: y, bubbles: true, cancelable: true, composed: true,
  }));
  fire('pointerdown', from[0], from[1]);
  const n = steps || 10;
  for (let i = 1; i <= n; i++) fire('pointermove', from[0] + (to[0] - from[0]) * i / n, from[1] + (to[1] - from[1]) * i / n);
  fire('pointerup', to[0], to[1]);
  return 'ok';
}`;
const drive = (page, sel, from, to, steps) =>
  page.evaluate('(' + FINGER + ')(' + JSON.stringify(sel) + ',' + JSON.stringify(from) + ',' + JSON.stringify(to) + ',' + (steps || 10) + ')');

console.log('G28 - the hand');

// ── 1 · reach ──
for (const route of ['/app', '/app/grow', '/app/give', '/app/giveth', '/app/vibes', '/app/garden']) {
  const o = await withGarden(route);
  const r = await o.page.evaluate(() => {
    const short = [], buried = [];
    const name = (el) => ((el.className || '').toString().split(' ')[0].slice(0, 12)) + '/' +
      (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 16);
    const owns = (el, x, y) => {
      if (x < 1 || y < 1 || x > innerWidth - 1 || y > innerHeight - 1) return true;   // not on screen to judge
      const hit = document.elementFromPoint(x, y);
      return !!hit && (hit === el || el.contains(hit) || hit.contains(el));
    };
    const SEL = 'button, a[href], input, select, textarea, [role="button"]';
    const all = [...document.querySelectorAll(SEL)];
    for (let i = 0; i < all.length; i++) {
      // Scrolling this app re-renders the view, which detaches every element captured
      // before the scroll. Holding a reference across one and then asking whether the
      // thing at those coordinates is still it answers no for a button nothing is
      // covering. Take the list again each time and work by position.
      let el = all[i];
      if (!el || !el.getBoundingClientRect().width) continue;
      el.scrollIntoView({ block: 'center' });
      const now = [...document.querySelectorAll(SEL)];
      if (!el.isConnected) { el = now[i]; if (!el) continue; }
      const b2 = el.getBoundingClientRect();
      if (!b2.width || !b2.height) continue;
      const cx = b2.left + b2.width / 2, cy = b2.top + b2.height / 2;
      if (cx < 1 || cx > innerWidth - 1 || cy < 1 || cy > innerHeight - 1) continue;
      if (!owns(el, cx, cy)) { buried.push(name(el) + ' ' + Math.round(b2.width) + 'x' + Math.round(b2.height)); continue; }
      const wide = b2.width >= 44 || (owns(el, cx - 21, cy) && owns(el, cx + 21, cy));
      const tall = b2.height >= 44 || (owns(el, cx, cy - 21) && owns(el, cx, cy + 21));
      if (!wide || !tall) short.push(name(el) + ' ' + Math.round(b2.width) + 'x' + Math.round(b2.height));
    }
    const c = document.querySelector('#ceremony');
    const modal = c && !c.hidden && getComputedStyle(c).display !== 'none';
    return { short, buried, n: all.length, modal };
  });
  if (o.forced) console.log('        (a ceremony would not leave on its own; the gate closed it to ask the question)');
  if (r.modal) { say(false, route.padEnd(13) + ' a ceremony is still open, so nothing below was really measured'); }
  say(r.short.length === 0, route.padEnd(13) + String(r.n).padStart(3) + ' controls, all reachable at 44' + (r.short.length ? '  short: ' + r.short.slice(0, 4).join(', ') : ''));
  say(r.buried.length === 0, route.padEnd(13) + '     and nothing sits on top of one' + (r.buried.length ? '  covered: ' + r.buried.slice(0, 4).join(', ') : ''));
  await o.close();
}

// ── 2 · across, between the doors ──
{
  const o = await withGarden('/app');
  const where = () => o.page.evaluate(() => location.pathname);
  const before = await where();
  await drive(o.page, '#view', [300, 420], [90, 424]);
  await o.page.waitForTimeout(900);
  const after = await where();
  say(/grow/.test(after), 'a drag to the left steps to the next door  (' + before + ' -> ' + after + ')');

  await drive(o.page, '#view', [90, 420], [300, 424]);
  await o.page.waitForTimeout(900);
  say(await where() === before, 'and a drag to the right steps back  (-> ' + await where() + ')');

  await drive(o.page, '#view', [200, 300], [206, 620]);
  await o.page.waitForTimeout(700);
  say(await where() === before, 'a finger going down the page is reading, not steering');

  await drive(o.page, '#view', [6, 420], [260, 424]);
  await o.page.waitForTimeout(700);
  say(await where() === before, 'a drag from the very edge is left to the phone');

  // a row that scrolls sideways keeps its own gesture
  const hasRow = await o.page.evaluate(() => !!document.querySelector('.chips.row, .pick'));
  if (hasRow) {
    await o.page.evaluate('(' + FINGER + ')(document.querySelector(".chips.row, .pick"), [300, 0], [90, 4], 10)');
    await o.page.waitForTimeout(700);
    say(await where() === before, 'and a drag along a sideways row does not change the door');
  }

  // the far end pushes back rather than falling off
  await o.page.evaluate(() => history.replaceState(null, '', '/app/grow'));
  await drive(o.page, '#view', [300, 420], [80, 424]);
  await o.page.waitForTimeout(900);
  const end = await where();
  say(/grow|app$/.test(end), 'at the last door there is nowhere further to go  (' + end + ')');
  await o.close();
}

// ── 3 · a sheet follows a thumb down ──
{
  const o = await withGarden('/app/grow');
  const opened = await o.page.evaluate(() => {
    const el = document.querySelector('[data-e]');
    if (el) { el.click(); return (el.textContent || '').trim().slice(0, 22); }
    return null;
  });
  await o.page.waitForTimeout(800);
  const geom = await o.page.evaluate(() => {
    const s = document.querySelector('#sheets .sheet');
    if (!s) return null;
    const r = s.getBoundingClientRect();
    return { top: Math.round(r.top), h: Math.round(r.height), mid: Math.round(r.left + r.width / 2) };
  });
  say(!!opened && !!geom, 'a sheet is open to drag  (' + (opened || 'nothing opened it') + ')');
  if (geom) {
    const y = geom.top + 30;
    await drive(o.page, '#sheets .sheet', [geom.mid, y], [geom.mid + 4, y + 40]);
    await o.page.waitForTimeout(600);
    say(await o.page.evaluate(() => !!document.querySelector('#sheets .sheet')), 'a short pull springs it back');
    await drive(o.page, '#sheets .sheet', [geom.mid, y], [geom.mid + 6, y + 230], 14);
    await o.page.waitForTimeout(800);
    say(await o.page.evaluate(() => !document.querySelector('#sheets .sheet')), 'and a long one lets it go');
  }
  await o.close();
}

// ── 4 · the hold that had never fired ──
{
  const o = await withGarden('/app/garden');
  const plants = await o.page.evaluate(() => document.querySelectorAll('[data-p]').length);
  say(plants > 0, 'the fixture garden has something growing in it  (' + plants + ')');
  if (plants) {
    await o.page.evaluate(() => document.querySelector('[data-p]').click());
    await o.page.waitForTimeout(600);
    const afterTap = await o.page.evaluate(() => (document.querySelector('#sheets .sheet') || {}).innerText || '');
    say(afterTap.length > 0, 'a tap opens something');
    say(!/Write today with it/.test(afterTap), 'and what a tap opens is not the quick sheet');
    await o.page.evaluate(() => { const s = document.querySelector('.scrim'); if (s) s.click(); });
    await o.page.waitForTimeout(500);
    await o.page.evaluate(`(() => {
      const el = document.querySelector('[data-p]');
      const r = el.getBoundingClientRect();
      const at = (t) => el.dispatchEvent(new PointerEvent(t, { pointerId: 9, pointerType: 'touch', isPrimary: true, button: 0, buttons: t === 'pointerup' ? 0 : 1, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, cancelable: true }));
      at('pointerdown');
      window.__release = () => at('pointerup');
    })()`);
    await o.page.waitForTimeout(780);
    await o.page.evaluate(() => window.__release && window.__release());
    await o.page.waitForTimeout(600);
    const held = await o.page.evaluate(() => (document.querySelector('#sheets .sheet') || {}).innerText || '');
    say(/Write today with it/.test(held), 'a hold opens the quick sheet' + (held ? '' : '  (nothing opened)'));
  }
  await o.close();
}

// ── 5 · the act you came for is not under the bar ──
// The writing row sat four pixels under the tab bar, and under the star that floats above
// it, for anyone with a garden. An empty garden cleared it by sixteen, which is exactly
// why nobody saw it: the first run was fine and every run after it was not. So this asks
// both, and asks for clearance rather than for a hair.
for (const garden of [false, true]) {
  const o = garden ? await withGarden('/app/grow') : await open(b, base, '/app/grow');
  const r = await o.page.evaluate(() => {
    const bar = document.querySelector('.tabs .bar');
    const tools = document.querySelector('.tools');
    if (!bar || !tools) return null;
    return { barTop: Math.round(bar.getBoundingClientRect().top), toolsBottom: Math.round(tools.getBoundingClientRect().bottom) };
  });
  say(!!r && r.toolsBottom + 24 <= r.barTop,
    'the writing row clears the bar ' + (garden ? 'with a garden' : 'on a first run ') +
    (r ? '  (' + r.toolsBottom + ' then the bar at ' + r.barTop + ')' : '  (nothing to measure)'));
  await o.close();
}

// ── 6 · what a screen reader is told ──
{
  const o = await open(b, base, '/app/grow');
  const r = await o.page.evaluate(() => ({
    current: document.querySelectorAll('.tabs button[aria-current="page"]').length,
    pressed: document.querySelectorAll('#top-sound[aria-pressed]').length,
    literal: document.body.innerHTML.includes("aria-pressed=' +"),
  }));
  say(r.current === 1, 'exactly one door says it is the one you are on  (' + r.current + ')');
  say(r.pressed === 1, 'the song button says whether it is on');
  say(!r.literal, 'and no markup leaked onto the page as text');
  await o.close();
}

// ── 7 · the focus the writing field used to swallow ──
{
  const o = await open(b, base, '/app/grow');
  const r = await o.page.evaluate(() => {
    const inp = document.querySelector('.pillform input');
    if (!inp) return { none: true };
    inp.focus();
    return { shadow: getComputedStyle(inp.closest('.pillform')).boxShadow };
  });
  say(!r.none && r.shadow && r.shadow !== 'none', 'focusing the writing field shows where the focus is');
  await o.close();
}

// ── 8 · the weight a phone carries ──
const BUDGET = { '/': 0.55, '/app': 0.75, '/app/grow': 0.85, '/app/give': 0.75, '/app/giveth': 0.80, '/app/vibes': 0.80, '/app/guides': 0.90 };
for (const [route, cap] of Object.entries(BUDGET)) {
  const ctx = await b.newContext(PHONE);
  const page = await ctx.newPage();
  await page.goto(route === '/' ? base + '/' : base + route + '?nosplash=1&dev=1', { waitUntil: 'load' });
  await page.waitForTimeout(3500);
  const mb = await page.evaluate(() => {
    let t = 0;
    for (const e of performance.getEntriesByType('resource')) t += e.transferSize || e.encodedBodySize || 0;
    const d = performance.getEntriesByType('navigation')[0];
    return (t + ((d && (d.transferSize || d.encodedBodySize)) || 0)) / 1048576;
  });
  say(mb <= cap, route.padEnd(13) + mb.toFixed(2) + ' MB   ceiling ' + cap.toFixed(2));
  await ctx.close();
}

// ── 9 · his pictures are still his ──
{
  const man = JSON.parse(fs.readFileSync(path.join(root, 'config/originals.json'), 'utf8'));
  const changed = [], missing = [];
  for (const [rel, rec] of Object.entries(man.files)) {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) { missing.push(rel); continue; }
    if (crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') !== rec.sha256) changed.push(rel);
    if (!fs.existsSync(path.join(root, rec.rendition))) missing.push(rec.rendition);
  }
  say(changed.length === 0, 'not one of his originals has been edited' + (changed.length ? '  (' + changed.slice(0, 3).join(', ') + ')' : '  (' + Object.keys(man.files).length + ' checked)'));
  say(missing.length === 0, 'every rendition the app asks for exists' + (missing.length ? '  (' + missing.slice(0, 3).join(', ') + ')' : ''));
}

await b.close();
srv.close();
console.log('G28 the hand: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
