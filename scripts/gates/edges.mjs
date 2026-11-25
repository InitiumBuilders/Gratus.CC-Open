// G51 · NO LINE IS DRAWN.
//
// August's standard is "no borders ever for anything", and on 2026-11-21 he asked for
// "Feathered edges for everything so its super smooth and magical." Every surface used to end
// in a one-pixel line: 111 kinds of them across the views. A surface ends where its light ends
// now, so this walks every view and looks for any border or outline a person can see at rest.
// It also checks that the wash over each room's picture lets go before the page begins (it
// used to stop at full strength, which drew a line across the screen), that a keyboard focus
// ring leaves a button its own shape (the old focus rule squared every pill's corners), and that
// a press gives under the finger and springs back, and changes nothing under reduced motion.
// Since v52 it also checks that a room arrives: its first blocks rise into place as it opens.
// Each check has a control that puts the old line back and must be seen.
//
//   node scripts/gates/edges.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, ROOT, VIEWS } from './lib/harness.mjs';
import { month } from './lib/garden.mjs';

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + msg); };
console.log('G51 - no line is drawn');

const GAL = fs.readFileSync(path.join(ROOT, 'assets/css/galaxy.css'), 'utf8');
const TOK = fs.readFileSync(path.join(ROOT, 'assets/css/tokens.css'), 'utf8');
const APP = fs.readFileSync(path.join(ROOT, 'assets/js/galaxy.js'), 'utf8');
const CALL = 'if (was) arrive();';
const LAW = '*, *::before, *::after { border-color: transparent !important; }';
const ORIGIN = '*, *::before, *::after { background-origin: border-box !important; }\n';
const FOCUS = 'outline: 2px solid var(--violet-text); outline-offset: 3px; }';
const PRESS = ':is(.opt, .together, .jr-row, .doorcard, .entry, button.hcard, .hm-kept):active { scale: .985; }';
const WASH = /\.hero::before \{ -webkit-mask-image: linear-gradient\(180deg, #000 calc\(100% - 72px\), transparent\); mask-image: linear-gradient\(180deg, #000 calc\(100% - 72px\), transparent\); \}\n/;
const once = (s, part) => s.split(part).length === 2;
const controls = {
  lines: once(GAL, LAW) ? GAL.replace(LAW, () => '') : null,
  under: once(GAL, ORIGIN) ? GAL.replace(ORIGIN, () => '') : null,
  square: once(TOK, FOCUS) ? TOK.replace(FOCUS, () => 'outline: 2px solid var(--violet-text); outline-offset: 3px; border-radius: var(--r-6); }') : null,
  still: once(GAL, PRESS) ? GAL.replace(PRESS, () => '') : null,
  seam: WASH.test(GAL) ? GAL.replace(WASH, () => '') : null,
  appears: once(APP, CALL) ? APP.replace(CALL, () => '') : null,
};
for (const [k, v] of Object.entries(controls)) say(!!v, 'the ' + k + ' control has its line to change');

const srv = await serve(4851);
const b = await browser();
async function context(o = {}) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: !o.mouse, hasTouch: !o.mouse, reducedMotion: o.motion || 'reduce', serviceWorkers: 'block' });
  await ctx.route('**/api/**', (r) => r.fulfill({ status: 204, body: '' }));
  if (o.gal) await ctx.route('**/assets/css/galaxy.css*', (r) => r.fulfill({ status: 200, contentType: 'text/css; charset=utf-8', body: o.gal }));
  if (o.tok) await ctx.route('**/assets/css/tokens.css*', (r) => r.fulfill({ status: 200, contentType: 'text/css; charset=utf-8', body: o.tok }));
  if (o.js) await ctx.route('**/assets/js/galaxy.js*', (r) => r.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: o.js }));
  await ctx.addInitScript((g) => { if (!localStorage.getItem('gratus.galaxy.v1')) localStorage.setItem('gratus.galaxy.v1', JSON.stringify(g)); }, month());
  return ctx;
}
async function arrive(page, route) {
  const url = srv.base + route + (route.includes('?') ? '&' : '?') + 'nosplash=1&notour=1&dev=1';
  // a page that has not parsed in time on a busy machine is opened once more before anything is read from it
  const late = await page.goto(url, { waitUntil: 'domcontentloaded' }).then(() => false, () => true);
  if (late) await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null);
  await page.waitForTimeout(1600);
  for (let i = 0; i < 30; i++) { const up = await page.evaluate(() => { const r = document.getElementById('ceremony'); return !!r && !r.hidden; }).catch(() => false); if (!up) break; await page.keyboard.press('Escape'); await page.waitForTimeout(200); }
}
// every border or outline on the page with a colour a person can see
function lines() {
  const seen = (c) => c && c !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(c);
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    for (const ps of [null, '::before', '::after']) {
      const c = getComputedStyle(el, ps);
      if (ps && (c.content === 'none' || c.content === 'normal')) continue;
      if (!ps && (c.visibility === 'hidden' || c.display === 'none')) continue;
      let hit = '';
      for (const s of ['Top', 'Right', 'Bottom', 'Left']) {
        if (parseFloat(c['border' + s + 'Width']) > 0 && !/none|hidden/.test(c['border' + s + 'Style']) && seen(c['border' + s + 'Color'])) { hit = 'border ' + c['border' + s + 'Color']; break; }
      }
      if (!hit && parseFloat(c.outlineWidth) > 0 && c.outlineStyle !== 'none' && seen(c.outlineColor)) hit = 'outline ' + c.outlineColor;
      if (hit) out.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '.' + String(el.className).split(' ').filter(Boolean).slice(0, 2).join('.') + (ps || '') + ' ' + hit);
    }
  }
  return out;
}
async function linesOn(routes, gal) {
  const ctx = await context({ gal }); const all = [];
  for (const [name, route] of routes) {
    const page = await ctx.newPage(); await arrive(page, route);
    for (const l of await page.evaluate(lines).catch(() => [])) all.push(name + ': ' + l);
    await page.close();
  }
  await ctx.close();
  return all;
}

// 1 · every view, at rest
const routes = VIEWS.concat([['gift', '/gift']]);
const found = await linesOn(routes);
say(found.length === 0, 'no view draws a border or an outline at rest  (' + routes.length + ' views' + (found.length ? '; ' + found.slice(0, 3).join(' · ') : '') + ')');
if (controls.lines) {
  const c = await linesOn([['give', '/app/give'], ['grow', '/app/grow']], controls.lines);
  say(c.length > 10, 'the control: without the law, the lines are seen  (' + c.length + ')');
}

// 1b · no background starts again under a border. A border has width and no colour; a gradient
// that starts at the padding edge repeats underneath it, and its first colour draws a one-pixel
// line along the bottom edge that no border check can see. Walked on 2026-11-24 it was on thirteen
// kinds of surface. The control takes the rule away and must find them again.
function seams() {
  const out = []; const stops = (bg) => (bg.match(/rgba?\([^)]*\)/g) || []);
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    for (const ps of [null, '::before', '::after']) {
      const c = getComputedStyle(el, ps);
      if (ps && (c.content === 'none' || c.content === 'normal')) continue;
      if (c.visibility === 'hidden' || c.display === 'none') continue;
      if (!Math.max(parseFloat(c.borderTopWidth) || 0, parseFloat(c.borderBottomWidth) || 0) || !/linear-gradient/.test(c.backgroundImage)) continue;
      if (!/padding-box/.test(c.backgroundOrigin) || !/border-box/.test(c.backgroundClip) || /^no-repeat/.test(c.backgroundRepeat)) continue;
      const st = stops(c.backgroundImage.split('gradient(')[1] || ''); if (st.length < 2 || st[0] === st[st.length - 1]) continue;
      out.push(el.tagName.toLowerCase() + '.' + String(el.className).split(' ').filter(Boolean).slice(0, 2).join('.') + (ps || ''));
    }
  }
  return out;
}
async function seamsOn(routes, gal) {
  const ctx = await context({ gal }); const kinds = new Set();
  for (const [, route] of routes) {
    const page = await ctx.newPage(); await arrive(page, route);
    for (const k of await page.evaluate(seams).catch(() => [])) kinds.add(k);
    await page.close();
  }
  await ctx.close();
  return [...kinds];
}
{ const k = await seamsOn(routes); say(k.length === 0, 'no background starts again under a border  (' + routes.length + ' views' + (k.length ? '; ' + k.slice(0, 4).join(' · ') : '') + ')'); }
if (controls.under) { const k = await seamsOn([['home', '/app'], ['grow', '/app/grow'], ['book', '/app/book']], controls.under); say(k.length >= 3, 'the control: without the rule, the lines under the edges are found  (' + k.length + ' kinds)'); }

// 2 · the wash over a room's picture lets go where the page begins
async function wash(gal) {
  const ctx = await context({ gal }); const page = await ctx.newPage(); await arrive(page, '/app/grow');
  const m = await page.evaluate(() => { const c = getComputedStyle(document.querySelector('.hero'), '::before'); return c.webkitMaskImage || c.maskImage || ''; });
  await ctx.close();
  return /linear-gradient/.test(m) && /transparent|rgba\(0, 0, 0, 0\)/.test(m);
}
say(await wash(), 'the wash over a room\'s picture fades out before the page begins');
if (controls.seam) say(!(await wash(controls.seam)), 'the control: a wash that stops at full strength is seen');

// 3 · a keyboard focus ring leaves a button its own shape
async function shape(tok) {
  const ctx = await context({ tok, mouse: true }); const page = await ctx.newPage(); await arrive(page, '/app');
  const r = await page.evaluate(() => {
    const el = document.getElementById('write-today'); if (!el) return { none: true };
    const before = getComputedStyle(el).borderRadius;
    return { before };
  });
  // a keyboard reaches it the way a keyboard does, so :focus-visible is the real one
  let after = '';
  for (let i = 0; i < 40 && !r.none; i++) {
    await page.keyboard.press('Tab');
    const at = await page.evaluate(() => { const a = document.activeElement; return a && a.id === 'write-today' ? getComputedStyle(a).borderRadius : ''; });
    if (at) { after = at; break; }
  }
  await ctx.close();
  return { ...r, after };
}
const s1 = await shape();
say(!s1.none && s1.after && s1.after === s1.before, 'a keyboard focus ring leaves Write Today its own shape  (' + s1.before + ', focused ' + (s1.after || 'never reached') + ')');
if (controls.square) { const s2 = await shape(controls.square); say(s2.after && s2.after !== s2.before, 'the control: a focus rule that squares the corners is seen  (' + s2.before + ' to ' + s2.after + ')'); }

// 4 · a press gives under the finger and springs back; under reduced motion it changes nothing
async function press(motion, gal) {
  const ctx = await context({ motion, gal, mouse: true }); const page = await ctx.newPage(); await arrive(page, '/app/give');
  await page.waitForTimeout(400);
  const box = await page.locator('#give-gift').boundingBox();
  if (!box) { await ctx.close(); return { none: true }; }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.waitForTimeout(260);
  const held = await page.evaluate(() => getComputedStyle(document.getElementById('give-gift')).scale);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height + 300); await page.mouse.up();
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => getComputedStyle(document.getElementById('give-gift')).scale);
  await ctx.close();
  return { held, after };
}
const p1 = await press('no-preference');
say(p1.held === '0.985' && p1.after === 'none', 'holding a Give option gives under the finger and springs back  (' + p1.held + ', then ' + p1.after + ')');
const p2 = await press('reduce');
say(p2.held === 'none' && p2.after === 'none', 'under reduced motion a press changes nothing  (' + p2.held + ')');
if (controls.still) { const p3 = await press('no-preference', controls.still); say(p3.held === 'none', 'the control: a press that does nothing is seen  (' + p3.held + ')'); }

// 5 · a room arrives: its first blocks rise into place as it opens, then let go of the motion
async function arriving(motion, js) {
  const ctx = await context({ motion, js, mouse: true }); const page = await ctx.newPage(); await arrive(page, '/app');
  await page.evaluate(() => { const d = document.getElementById('open-journal'); if (d) d.scrollIntoView({ block: 'center', behavior: 'instant' }); });
  await page.waitForTimeout(400);
  await page.click('#open-journal');
  const at = await page.evaluate(() => { const a = document.querySelectorAll('#view .arrive'); return { n: a.length, anim: a[0] ? getComputedStyle(a[0]).animationName : 'none', path: location.pathname }; });
  await page.waitForTimeout(1300);
  const after = await page.evaluate(() => document.querySelectorAll('#view .arrive').length);
  await ctx.close();
  return { ...at, after };
}
const a1 = await arriving('no-preference');
say(a1.path === '/app/book' && a1.n >= 3 && a1.anim === 'room-in' && a1.after === 0, 'opening the journal, its first blocks rise into place and then let go  (' + a1.n + ' blocks, ' + a1.anim + ', ' + a1.after + ' left after)');
const a2 = await arriving('reduce');
say(a2.anim === 'none', 'under reduced motion a room simply appears  (' + a2.anim + ')');
if (controls.appears) { const a3 = await arriving('no-preference', controls.appears); say(a3.n === 0, 'the control: a room that appears all at once is seen  (' + a3.n + ' blocks)'); }

await b.close(); await srv.close();
console.log('G51 no line is drawn: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
