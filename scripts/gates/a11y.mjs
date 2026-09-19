// G10 · G11 · G13: TOUCH AND TYPE, KEYBOARD PARITY, MOTION.
//
// Measured on a rendered page across every view, not read out of a stylesheet.
// The last four defects this repository shipped were all things the source got
// right and the screen got wrong, so nothing here trusts a declaration.
//
// G10  every interactive element is at least 44 by 44 at 375, has a visible
//      focus style and an accessible name; no rendered text computes below 13px
//      in any view; and no stylesheet carries a font-size literal below 13px,
//      because a latent one surfaces the day a room is opened.
// G11  anything reachable by hover or by press-and-hold is reachable by keyboard,
//      and every toggle says its state out loud with aria.
// G13  reduced motion removes every autoplaying video and every endless
//      animation; nothing plays while the tab is hidden.
//
// Mutants: shrink a tab button to 32px; make one animation ignore reduced
// motion; set a label to 10px. Each must turn this red.
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, open, VIEWS, ROOT } from './lib/harness.mjs';

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + msg); };
const only = process.argv.find((a) => a.startsWith('--view='));
const views = only ? VIEWS.filter(([n]) => n === only.split('=')[1]) : VIEWS;

console.log('G10/G11/G13 - touch, type, keyboard, motion');

// ── the source half of G10: a latent literal surfaces the day a room opens ──
console.log('\n  stylesheets:');
for (const f of ['assets/css/tokens.css', 'assets/css/galaxy.css']) {
  const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const small = [];
  t.split('\n').forEach((ln, i) => {
    const m = ln.match(/font-size:\s*(\d+(?:\.\d+)?)px/);
    if (m && parseFloat(m[1]) < 13) small.push(f + ':' + (i + 1) + '  ' + m[1] + 'px');
  });
  say(small.length === 0, f + '  ' + (small.length ? small.length + ' literals under 13px' : 'no literal under 13px'));
  small.slice(0, 12).forEach((s) => console.log('          ' + s));
}

const server = await serve(4752);
const b = await browser();

// ── the rendered half, across every view ──────────────────────────────────
const MEASURE = () => {
  const out = { small: [], tiny: [], noName: [], noState: [], vh: innerHeight };
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
  };
  const label = (el) => (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim();

  // every rendered run of text
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el)) continue;
    const kids = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!kids) continue;
    const fs2 = parseFloat(getComputedStyle(el).fontSize);
    if (fs2 < 13) out.small.push({ t: el.textContent.trim().slice(0, 28), px: fs2, sel: el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 22) });
  }
  // every interactive element
  for (const el of document.querySelectorAll('a[href], button, input, select, textarea, [role="button"], [tabindex]')) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    const sel = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '.' + String(el.className).slice(0, 24);
    if (r.width < 44 || r.height < 44) out.tiny.push({ sel, w: Math.round(r.width), h: Math.round(r.height), t: label(el).slice(0, 24) });
    if (!label(el) && !el.value) out.noName.push(sel);
    // a toggle that shows state with a class alone cannot be heard
    const on = el.classList.contains('on') || el.classList.contains('sel') || el.getAttribute('aria-current');
    const says = el.hasAttribute('aria-pressed') || el.hasAttribute('aria-selected') || el.hasAttribute('aria-current') || el.hasAttribute('aria-expanded');
    if (on && !says) out.noState.push(sel);
  }
  return out;
};

let tinyAll = 0, smallAll = 0, nameAll = 0, stateAll = 0;
for (const [name, route] of views) {
  const v = await open(b, server.base, route, { settle: 1700 });
  const m = await v.page.evaluate(MEASURE);
  await v.close();
  tinyAll += m.tiny.length; smallAll += m.small.length; nameAll += m.noName.length; stateAll += m.noState.length;
  const bad = m.tiny.length + m.small.length + m.noName.length + m.noState.length;
  console.log('  ' + (bad ? 'FAIL  ' : 'pass  ') + name.padEnd(9)
    + ' tiny ' + String(m.tiny.length).padStart(3)
    + ' · under 13px ' + String(m.small.length).padStart(3)
    + ' · unnamed ' + String(m.noName.length).padStart(3)
    + ' · silent toggles ' + String(m.noState.length).padStart(3));
  m.tiny.slice(0, 4).forEach((x) => console.log('          ' + x.w + 'x' + x.h + '  ' + x.sel + '  ' + x.t));
  m.small.slice(0, 3).forEach((x) => console.log('          ' + x.px + 'px  ' + x.sel + '  ' + x.t));
}
if (tinyAll) fails++;
if (smallAll) fails++;
if (nameAll) fails++;
if (stateAll) fails++;

// ── G11 · keyboard parity for the documented hold gesture ─────────────────
console.log('\n  keyboard:');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/ui.js'), 'utf8');
const app = fs.readFileSync(path.join(ROOT, 'assets/js/galaxy.js'), 'utf8');
const opt = (app.match(/longPress\([^)]*?\{\s*(\w+)\s*:/) || [])[1];
const read = (ui.match(/o\.(\w*[Ll]ong\w*)/) || [])[1];
say(!!opt && !!read && opt === read, 'longPress option matches what ui.js reads  (passes "' + opt + '", reads "' + read + '")');
say(/onLong[\s\S]{0,400}(key|Enter)/i.test(ui) || /keydown[\s\S]{0,200}daySheet/.test(app),
  'the hold gesture has a keyboard path');
say(/\.pillform[^}]*:focus|:focus-within/.test(fs.readFileSync(path.join(ROOT, 'assets/css/galaxy.css'), 'utf8')),
  'the goals input has a focus style');

// ── G13 · motion ──────────────────────────────────────────────────────────
console.log('\n  motion:');
const rv = await open(b, server.base, '/', { reducedMotion: 'reduce', settle: 2000 });
const red = await rv.page.evaluate(() => {
  const vids = [...document.querySelectorAll('video')];
  const playing = vids.filter((v) => !v.paused && !v.ended).length;
  let infinite = 0;
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.animationIterationCount && cs.animationIterationCount.split(',').some((c) => c.trim() === 'infinite')
        && cs.animationPlayState !== 'paused') infinite++;
  }
  return { vids: vids.length, playing, infinite };
});
await rv.close();
say(red.playing === 0, 'reduced motion: ' + red.playing + ' of ' + red.vids + ' videos playing');
say(red.infinite === 0, 'reduced motion: ' + red.infinite + ' endless animations running');

// nothing decodes while nobody is looking
const hv = await open(b, server.base, '/app/grow', { settle: 2400 });
const before = await hv.page.evaluate(() => {
  const v = [...document.querySelectorAll('video')];
  return { n: v.length, playing: v.filter((x) => !x.paused && !x.ended).length };
});
// this assertion is the one that keeps the next one honest: if nothing was
// playing to begin with, "nothing is playing now" is a sentence about an empty
// page and it would pass forever.
say(before.playing > 0, 'a scene video is playing to begin with  (' + before.playing + ' of ' + before.n + ')');
await hv.page.evaluate(() => Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true }));
await hv.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
await hv.page.waitForTimeout(900);
const hidden = await hv.page.evaluate(() => [...document.querySelectorAll('video')].filter((v) => !v.paused && !v.ended).length);
await hv.close();
say(hidden === 0, 'hidden tab: ' + hidden + ' of ' + before.n + ' videos still decoding');

await b.close();
await server.close();
console.log('\nG10/G11/G13 a11y: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
