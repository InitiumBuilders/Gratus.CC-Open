// G23 · THE THREE HELD MOMENTS HAPPEN, AND CAN BE LEFT.
//
// This gate used to grep for three names and look for a keydown handler. It could not tell
// whether any of the moments ever played, and two of them did not exist. Now it walks a
// real gift between two people:
//
//   ONE PERSON grows something, wraps a gift, and sends it. The first time, the gift is
//   held in the middle of the screen and leaves from there, launching out of the top. The
//   second time it goes from the bar, because a first happens once.
//
//   ANOTHER PERSON opens the link on their own device, walks the journey, and keeps it.
//   The first time, it opens in front of them: the wrap dissolves into light and the thing
//   inside rises out. The second time, a toast.
//
// And every held moment can be left by a key, because a held screen you cannot leave is
// charged to a person every time after the first.
//
//   node scripts/gates/ceremonies.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, ROOT } from './lib/harness.mjs';

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + msg); };
const app = fs.readFileSync(path.join(ROOT, 'assets/js/galaxy.js'), 'utf8');
const copy = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/copy.json'), 'utf8'));

console.log('G23 - the three held moments');

// ── named in one place ──
const block = (app.match(/const CEREMONIES = \{[\s\S]*?\n\};/) || [''])[0];
say(!!block, 'the three moments are named in one place');
for (const k of ['bloomed', 'firstGiven', 'firstReceived']) say(new RegExp('\\n  ' + k + '\\(').test(block), '  ' + k);
say(/CEREMONIES\.bloomed\(/.test(app), 'a crossing plays the bloom through it');

const srv = await serve(4803);
const b = await browser();
const DAY = 86400000;
const today = new Date().toISOString().slice(0, 10);
const back = (n) => new Date(Date.parse(today + 'T12:00:00Z') - n * DAY).toISOString().slice(0, 10);
const kept = (f) => { const o = []; for (let i = f; i >= 1; i--) o.push(back(i)); return o; };
const garden = (plants) => ({
  v: 5, feel: false, tour: 'seen', name: '', entries: [], plants, sound: false,
  gifts: { given: [], received: [] }, my: { emojis: [], recipes: [] },
  wishes: [], goals: [], made: {}, opens: 1, migrated: true,
  folders: [], milestones: { first: back(30) }, seeds: [], alch: {}, sun: null, vibes: [], glyphSeed: '', hidden: {}, cer: {},
});

async function phone(seed) {
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.route('**/api/billing**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"connected":false}' }));
  await page.route('**/api/trax**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.goto(srv.base + '/app?nosplash=1&notour=1&dev=1', { waitUntil: 'domcontentloaded' });
  await page.evaluate((g) => { localStorage.setItem('gratus.galaxy.v1', JSON.stringify(g)); localStorage.setItem('gratus.firstOpen', String(Date.now())); }, seed);
  return { page, ctx, close: () => ctx.close() };
}
const state = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('gratus.galaxy.v1') || '{}'));
const cer = (p) => p.evaluate(() => {
  const r = document.getElementById('ceremony');
  if (!r || r.hidden) return { up: false };
  return {
    up: true,
    film: !!r.querySelector('video.explode'),
    kind: r.querySelector('.first-given') ? 'firstGiven' : r.querySelector('.first-received') ? 'firstReceived' : (r.querySelector('.cer') ? 'other' : 'film'),
    text: (r.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 140),
  };
});
// Step past the doorway film if a ceremony opens with one: by KEY, because that is also
// what is being proved.
async function pastFilm(p) {
  for (let i = 0; i < 6; i++) {
    const c = await cer(p);
    if (!c.up || !c.film) return c;
    await p.keyboard.press('Escape');
    await p.waitForTimeout(700);
  }
  return cer(p);
}

async function wrapAndSend(p, to) {
  await p.goto(srv.base + '/app/give?nosplash=1&notour=1&dev=1', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2200);
  await p.click('#give-gift');
  await p.waitForTimeout(700);
  await p.fill('#g-to', to);
  await p.fill('#g-msg', 'For the mornings.');
  await p.fill('#g-from', 'Ava');
  await p.click('#g-wrap');
  await p.waitForTimeout(900);
  let c = await pastFilm(p);
  const wrappedUp = c.up && /Wrapped/.test(c.text);
  // leave "Wrapped." by key: Enter
  await p.keyboard.press('Enter');
  await p.waitForTimeout(900);
  const shareOpen = await p.evaluate(() => !!document.querySelector('#sh-copy'));
  await p.click('#sh-copy');
  await p.waitForTimeout(900);
  c = await pastFilm(p);
  return { wrappedUp, shareOpen, after: c };
}

// ══ ONE PERSON, SENDING ══
const A = await phone(garden([{ id: 'p1', emoji: '☕', planted: back(21), kept: kept(21), carried: 0, origin: 'planted', from: null }]));

let r1 = await wrapAndSend(A.page, 'Nat');
say(r1.wrappedUp, 'wrapping a gift holds "Wrapped." on the screen');
say(r1.shareOpen, 'and Enter leaves it for the share sheet');
say(r1.after.up && r1.after.kind === 'firstGiven', 'the first gift ever sent is held in the middle of the screen  (' + (r1.after.kind || 'nothing') + ')');
say(/On its way to Nat\./.test(r1.after.text || ''), 'it says who it is on its way to');
say((r1.after.text || '').includes(copy.locked.promise), 'and closes on his line, as he wrote it  ("' + copy.locked.promise + '")');

const mark = await A.page.evaluate(() => {
  const m = document.querySelector('#ceremony .cer-mark');
  if (!m) return null;
  const r = m.getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), loaded: m.naturalWidth > 0 };
});
say(mark && mark.loaded, 'the gift standing there is his graphic, and it loaded');
await A.page.keyboard.press('Enter');
await A.page.waitForTimeout(160);
const lift = await A.page.evaluate(() => {
  const s = document.querySelector('.launch');
  if (!s) return null;
  const cs = getComputedStyle(s);
  return { x: parseInt(cs.getPropertyValue('--x'), 10), y: parseInt(cs.getPropertyValue('--y'), 10), d: parseInt(cs.getPropertyValue('--d'), 10) };
});
say(!!lift, 'pressing Enter does not close it: it launches');
say(lift && mark && Math.abs(lift.x - mark.x) < 12 && Math.abs(lift.y - mark.y) < 12,
  'from where the gift was standing, not from the bar  (' + (lift ? lift.x + ',' + lift.y : '-') + ' vs ' + (mark ? mark.x + ',' + mark.y : '-') + ')');
say(lift && mark && Math.abs(lift.d - mark.w) <= mark.w * 0.08, 'and at the size it was standing at  (' + (lift || {}).d + 'px of ' + (mark || {}).w + ')');
// ONE gift. The one that flies is a copy, so the one it was copied from has to be gone for
// as long as the copy is in the air. It was not: an entrance animation that holds its last
// frame outranks a plain opacity: 0, and the gift stood in the middle of the screen while
// its twin flew out of the top. Nobody measured that. It was seen, in a filmstrip.
await A.page.waitForTimeout(900);
const twin = await A.page.evaluate(() => {
  const m = document.querySelector('#ceremony .cer-mark');
  return m ? Number(getComputedStyle(m).opacity) : null;
});
say(twin !== null && twin < 0.1, 'and it leaves: the place it stood is empty while it flies  (opacity ' + (twin === null ? '-' : twin.toFixed(2)) + ')');
await A.page.waitForTimeout(2600);
const afterFirst = await cer(A.page);
say(!afterFirst.up, 'the moment ends when the gift is gone');
let s = await state(A.page);
say(!!(s.cer && s.cer.firstGiven) && !!s.gaveAt, 'and it is written down that it happened, so it cannot happen twice');

// the second gift goes from the bar
let r2 = await wrapAndSend(A.page, 'Ben');
say(!(r2.after.up && r2.after.kind === 'firstGiven'), 'the second gift is not held: a first happens once');
const bar = await A.page.evaluate(() => {
  const s2 = document.querySelector('.launch');
  const core = document.querySelector('.tabs .star .core');
  if (!s2 || !core) return null;
  const r = core.getBoundingClientRect();
  return { y: parseInt(getComputedStyle(s2).getPropertyValue('--y'), 10), core: Math.round(r.top + r.height / 2) };
});
say(!!bar && Math.abs(bar.y - bar.core) < 40, 'it leaves from the bar instead  (' + (bar ? bar.y + ' vs core ' + bar.core : 'no launch') + ')');
await A.page.waitForTimeout(2600);
s = await state(A.page);
const links = (s.gifts && s.gifts.given || []).map((x) => x.link).filter(Boolean);
// a gift carries the face its plant had grown into by then, not the seed it started as
const sent = (s.gifts && s.gifts.given || []).map((x) => x.emoji);
say(links.length === 2, 'two gifts, two links  (' + links.length + ')');
await A.close();

// ══ ANOTHER PERSON, RECEIVING ══
// Two gift links differ only after the #, and a goto that changes only the hash is not a
// navigation: the app reads the gift once at boot and never saw the second one, and the
// "second keep is not a first" check passed in a room where nothing had happened.
let visits = 0;
async function keep(p, link) {
  const code = link.split('#')[1];
  visits++;
  await p.goto(srv.base + '/gift?nosplash=1&notour=1&dev=1&visit=' + visits + '#' + code, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2400);
  for (let i = 0; i < 12; i++) {
    const has = await p.evaluate(() => ({ save: !!document.querySelector('#rj-save'), next: !!document.querySelector('#rj-next') }));
    if (has.save) { await p.click('#rj-save'); break; }
    if (has.next) await p.click('#rj-next');
    await p.waitForTimeout(1100);
  }
  await p.waitForTimeout(600);
  return pastFilm(p);
}

const B = await phone(garden([]));
if (links[0]) {
  const k1 = await keep(B.page, links[0]);
  say(k1.up && k1.kind === 'firstReceived', 'the first gift anybody keeps opens in front of them  (' + (k1.kind || 'nothing') + ')');
  say(/Ava grew this for/.test(k1.text || ''), 'it says who grew it, and for how long');
  say((k1.text || '').includes(copy.locked.tagline), 'and closes on his tagline, as he wrote it');
  await B.page.waitForTimeout(2500);
  const open = await B.page.evaluate(() => {
    const w = document.querySelector('#ceremony .opening .wrapped');
    const i = document.querySelector('#ceremony .opening .inside');
    return w && i ? { wrap: Number(getComputedStyle(w).opacity), inside: Number(getComputedStyle(i).opacity), emoji: i.textContent } : null;
  });
  say(open && open.wrap < 0.1 && open.inside > 0.9, 'the wrap has dissolved and what was inside it has risen  (wrap ' + (open ? open.wrap.toFixed(2) : '-') + ', inside ' + (open ? open.inside.toFixed(2) : '-') + ')');
  say(open && open.emoji === sent[0], 'and what was inside is the thing Ava sent, as it had grown  (' + (open || {}).emoji + ' = ' + sent[0] + ')');
  await B.page.keyboard.press('Escape');
  await B.page.waitForTimeout(700);
  say(!(await cer(B.page)).up, 'Escape leaves it');
}
if (links[1]) {
  const k2 = await keep(B.page, links[1]);
  const mid = await state(B.page);
  const got = (mid.gifts && mid.gifts.received || []).length;
  say(got === 2, 'the second gift was really kept  (' + got + ' in the garden)');
  say(!(k2.up && k2.kind === 'firstReceived'), 'and it is a good day, not a first');
  const s2 = await state(B.page);
  say((s2.gifts && s2.gifts.received || []).length === 2 && !!(s2.cer && s2.cer.firstReceived), 'both are in the garden, and the first is remembered as the first');
}
await B.close();

await b.close(); await srv.close();
console.log('G23 the three held moments: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
