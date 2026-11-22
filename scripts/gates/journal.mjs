// G44 · A DAY LANDS ONCE, WITH WHAT IT GREW AND WHEN IT WAS WRITTEN.
//
// The journal is what this app is for, and until now no gate wrote a day into it and
// watched what came back. Three defects lived in that gap, all of them on the live site:
//
//   A crossing was told twice. Planting showed its card, then the next paint found the
//   mark the same entry had lit and held a second card behind a second film.
//
//   Every entry waited behind the Gate film, an ordinary Tuesday as long as the day a
//   plant bloomed.
//
//   Every paint asked the billing endpoint a question and sent a count, so a search of
//   the journal did both once for each letter typed.
//
// So this writes days the way a person does, with keys and taps on a phone, and reads the
// screen and the device afterwards:
//
//   AN ORDINARY DAY   one card and no film. A seed for every day the plant has been kept,
//                     the newest today's. Home says the day is kept, in the words that
//                     were written.
//   A LONG SITTING    the entry holds how long it took. A stretch away from the page in
//                     the middle is left out of it. The Time Log lists the entry with its
//                     hour and its length.
//   A CROSSING        the Gate opens once, and the card says what was crossed with the
//                     mark it lit beside it. Nothing is said a second time.
//   A GIFT, READY     the day a plant becomes a gift, the card closes on his line.
//   DAY ONE           the first entry ever lands the same way, and the log starts.
//   NOTHING LEAVES    not a word of an entry goes anywhere.
//   NOTHING RUNS      typing in the search asks the network nothing.
//
// Under each of these is a control: the same measurement pointed at a fault planted on
// purpose, which has to be seen. A detector that finds nothing proves nothing.
//
//   node scripts/gates/journal.mjs
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, ROOT, PHONE } from './lib/harness.mjs';
import { month, run, keptDays } from './lib/garden.mjs';
import * as J from '../../engine/journal.js';

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + msg); };
const copy = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/copy.json'), 'utf8'));
const book = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/growth-book.json'), 'utf8'));
const APP = fs.readFileSync(path.join(ROOT, 'assets/js/galaxy.js'), 'utf8');
const KEY = 'gratus.galaxy.v1';
// one word nobody else would send, so anything carrying an entry off the device is found by it
const WORD = 'quince';
const LINE = 'The ' + WORD + ' tree by the gate, heavy this year.';
const WORDS = LINE.split(/\s+/).length;

console.log('G44 - a day lands once');

// ── the engine under it reads no clock and touches no page ──
{
  const src = fs.readFileSync(path.join(ROOT, 'engine/journal.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const reach = ['Date.now(', 'new Date()', 'localStorage', 'document.', 'window.', 'navigator.', 'fetch('].filter((w) => src.includes(w));
  say(reach.length === 0, 'the record is worked out from the entries alone: no clock, no page, no network' + (reach.length ? '  (' + reach.join(' ') + ')' : ''));
}

// ── the faults that get planted ──
// Each is one edit to the app as it is served to one phone. If the line it edits is no
// longer there, the control is void and says so, instead of passing with nothing planted.
const FAULTS = {
  gateAlways: [['}, { gate: loud });', '}, { gate: true });']],
  toldTwice: [['  const lit = lightMilestones();\n  const kept = J.keptDays(S.entries).length;', '  const lit = [];\n  const kept = J.keptDays(S.entries).length;']],
  noLength: [['const secs = J.took(draftClock); if (secs) e.took = secs;', 'const secs = 0;']],
  everyPaint: [
    ["if (here !== viewWas) { viewWas = here; beat('view'); }", "beat('view');"],
    ['if (!again && billAt && Date.now() - billAt < 600000) return;', ''],
    // search draws only the list now, so the fault also puts back a whole page drawn per letter
    ['journalQuery = js.value; redrawList();', "journalQuery = js.value; const v = js.value; render(); const n = $('#j-search'); if (n) { n.focus(); n.setSelectionRange(v.length, v.length); }"],
  ],
  noWishDoor: [["  const gw = $('#give-world'); if (gw) gw.addEventListener('click', () => go('give', 'world'));\n", '']],
  noFolder: [["'<button class=\"chip\" id=\"j-newfolder\">' + esc(T('journal.folder', '')) + '</button></div>'", "'</div>'"]],
};
const faulty = {};
for (const [name, edits] of Object.entries(FAULTS)) {
  let src = APP; let ok = true;
  for (const [from, to] of edits) { if (src.split(from).length !== 2) ok = false; src = src.replace(from, () => to); }
  faulty[name] = ok ? src : null;
  say(ok, 'the control "' + name + '" has a line to be planted in');
}

const srv = await serve(4811);
const b = await browser();

// A phone. Everything it tries to send is written down twice: by the page as it asks, and
// by the browser as it goes. Counting beacons are written down and sent nowhere.
async function phone(seed, o = {}) {
  const ctx = await b.newContext({ ...PHONE, ...(o.viewport ? { viewport: o.viewport } : {}), serviceWorkers: 'block' });
  const wire = [];
  await ctx.route('**/api/**', (route) => {
    const rq = route.request(); const u = new URL(rq.url());
    if (u.pathname === '/api/billing') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"connected":false}' });
    if (u.pathname === '/api/goals' && rq.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"goals":[]}' });
    return route.fulfill({ status: 204, body: '' });
  });
  if (o.fault) await ctx.route('**/assets/js/galaxy.js*', (route) => route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: faulty[o.fault] }));
  await ctx.addInitScript(({ key, garden }) => {
    if (garden && !localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(garden));
    const seen = window.__seen = { film: 0, flash: 0, cards: [], sent: [] };
    const note = (url, body) => {
      const row = { url: String(url), body: '' }; seen.sent.push(row);
      if (typeof body === 'string') row.body = body;
      else if (body && typeof body.text === 'function') body.text().then((t) => { row.body = t; }).catch(() => null);
    };
    navigator.sendBeacon = (url, body) => { note(url, body); return true; };
    const ask = window.fetch.bind(window);
    window.fetch = (input, init) => { note(typeof input === 'string' ? input : (input && input.url) || '', init && init.body); return ask(input, init); };
    new MutationObserver((batch) => {
      for (const m of batch) for (const n of m.addedNodes) {
        if (n.nodeType !== 1 || !n.closest || !n.closest('#ceremony')) continue;
        const has = (sel) => (n.matches(sel) ? n : n.querySelector(sel));
        if (has('video.explode')) seen.film++;
        if (has('.flash')) seen.flash++;
        const c = has('.cer');
        if (c) seen.cards.push((c.classList.contains('dc') ? 'day' : 'card') + ': ' + ((c.querySelector('h2') || {}).textContent || ''));
      }
    }).observe(document, { childList: true, subtree: true });
  }, { key: KEY, garden: seed || null });
  const page = await ctx.newPage();
  page.on('request', (r) => wire.push(r.url() + ' ' + (r.postData() || '')));
  if (o.clock) await page.clock.install();
  const go = async (route, settle = 1300) => { await page.goto(srv.base + route + (route.includes('?') ? '&' : '?') + 'nosplash=1&notour=1&dev=1', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(settle); };
  return { ctx, page, wire, go, close: () => ctx.close() };
}
const state = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), KEY);
const seen = (p) => p.evaluate(() => window.__seen);
const cer = (p) => p.evaluate(() => {
  const r = document.getElementById('ceremony');
  if (!r || r.hidden) return { up: false };
  const c = r.querySelector('.cer');
  return { up: true, film: !!r.querySelector('video.explode'), card: c ? c.className : '' };
});
// to the card, past the Gate by key if it is open (which is also what is being proved)
async function toCard(p) {
  await p.waitForTimeout(700);
  for (let i = 0; i < 24; i++) {
    const c = await cer(p);
    if (c.up && c.card) return c;
    if (c.up && c.film) await p.keyboard.press('Escape');
    await p.waitForTimeout(260);
  }
  return cer(p);
}
async function leave(p) {
  for (let i = 0; i < 10; i++) {
    if (!(await cer(p)).up) return true;
    await p.keyboard.press('Enter');
    await p.waitForTimeout(480);
  }
  return !(await cer(p)).up;
}
const readCard = (p) => p.evaluate(() => {
  const r = document.getElementById('ceremony'); const c = r && !r.hidden ? r.querySelector('.dc') : null;
  if (!c) return null;
  const t = (n) => (n ? n.textContent.replace(/\s+/g, ' ').trim() : '');
  const q = (s) => t(c.querySelector(s));
  const box = c.getBoundingClientRect(); const tap = c.querySelector('.kicker:last-child');
  const toast = document.getElementById('toast');
  return {
    crossed: c.classList.contains('cross'), stamp: q('.dc-stamp'), gold: q('.kicker.gold'), h2: q('h2'), next: q('.dc-next'),
    kept: Number(q('.dc-kept b').replace(/\D/g, '')), keptWords: q('.dc-kept'),
    marks: [...c.querySelectorAll('.dc-mark')].map(t),
    seeds: c.querySelectorAll('.jr-head circle').length, fresh: c.querySelectorAll('.jr-head circle.n').length,
    weekday: new Date().toLocaleDateString(undefined, { weekday: 'long' }),
    inside: box.top >= 0 && box.bottom <= innerHeight + 1 && box.left >= 0 && box.right <= innerWidth + 1,
    tapSeen: !!tap && tap.getBoundingClientRect().bottom <= innerHeight + 1,
    box: Math.round(box.top) + '..' + Math.round(box.bottom) + ' of ' + innerHeight,
    toast: !!toast && toast.classList.contains('on') ? t(toast) : '',
  };
});
// Marks a garden had already earned light the first time it is opened, and the large ones
// are held on the screen. Walk past them once, so a gate starts from a garden at rest.
async function settled(seed) {
  const v = await phone(seed);
  await v.go('/app', 900);
  let quiet = 0;
  for (let i = 0; i < 60 && quiet < 4; i++) {
    const c = await cer(v.page);
    if (c.up) { quiet = 0; await v.page.keyboard.press('Escape'); } else quiet++;
    await v.page.waitForTimeout(260);
  }
  const s = await state(v.page);
  await v.close();
  return s;
}
// write a line the way a person does: the page, the keys, a plant, the button
async function write(v, line, pick, o = {}) {
  if (o.from === 'home') { await v.go('/app'); await v.page.click('#write-today'); await v.page.waitForTimeout(500); }
  else { await v.go('/app/grow'); await v.page.click('#write'); }
  // somebody new is met by the tour on their way in, and can decline it
  if (o.first) { await v.page.waitForTimeout(1100); const skip = await v.page.$('#tour-skip'); if (skip) { await skip.click(); await v.page.waitForTimeout(500); } }
  const at = await v.page.evaluate(() => ({ path: location.pathname, focus: (document.activeElement || {}).id || '', film: (() => { const i = document.getElementById('intro'); return !!i && !i.hidden; })() }));
  if (at.focus !== 'write') await v.page.click('#write');
  const parts = o.parts || [line];
  for (let i = 0; i < parts.length; i++) {
    if (i && o.between) await o.between(i);
    await v.page.keyboard.type(parts[i], { delay: 22 });
  }
  if (pick != null) { const orb = (await v.page.$$('#pick [data-pick]'))[pick]; await orb.scrollIntoViewIfNeeded(); await orb.click(); }
  await v.page.evaluate(() => document.getElementById('plant').scrollIntoView({ block: 'center' }));
  await v.page.click('#plant');
  return at;
}
const home = (p) => p.evaluate(() => {
  const t = (n) => (n ? n.textContent.replace(/\s+/g, ' ').trim() : '');
  return {
    path: location.pathname,
    kept: !!document.querySelector('.hm-kept'), line: t(document.querySelector('.hm-kept .hm-line')), stamp: t(document.querySelector('.hm-kept .kicker')),
    more: t(document.getElementById('hm-more')), write: !!document.getElementById('write-today'),
    days: Number(t(document.querySelector('#open-journal .hm-row b')).replace(/\D/g, '')) || 0,
  };
});

// ══ AN ORDINARY DAY ══
const MONTH = await settled(month());
const before = keptDays(MONTH);
say(Object.keys(MONTH.milestones || {}).length >= 8, 'a month already kept has its marks lit before the gate writes anything  (' + Object.keys(MONTH.milestones || {}).length + ')');
{
  const A = await phone(MONTH);
  await A.go('/app');
  const h0 = await home(A.page);
  say(!h0.kept && h0.write, 'before anything is written today, home offers the page and claims nothing');
  say(h0.days === before, 'the journal door says how many days are kept  (' + h0.days + ' of ' + before + ')');

  const at = await write(A, LINE, 0, { from: 'home' });
  say(at.path === '/app/grow' && !at.film, 'Write Today goes to the page: no film stands in front of it');
  say(at.focus === 'write', 'and the cursor is already in the box  (' + (at.focus || 'nowhere') + ')');
  await A.page.waitForTimeout(450);
  const c = await readCard(A.page); const s1 = await seen(A.page);
  say(!!c, 'the day is answered with a card');
  say(s1.film === 0 && s1.flash === 0, 'at once: on an ordinary day the Gate stays shut  (' + s1.film + ' films, ' + s1.flash + ' flashes)');
  say(c && c.seeds === before + 1 && c.fresh === 1, 'a seed for every day the journal holds, and the newest is today\'s  (' + (c ? c.seeds : '-') + ' of ' + (before + 1) + ')');
  say(c && c.kept === before + 1 && c.keptWords.includes(copy.day.kept), 'the count under it is the same number  (' + (c ? c.keptWords : '-') + ')');
  say(c && !c.crossed && !c.h2 && !c.gold, 'nothing is claimed that did not happen: no phase named, nothing in gold');
  say(c && c.stamp.includes(c.weekday), 'it is stamped with the day and the hour it was written  (' + (c ? c.stamp : '-') + ')');
  say(c && c.inside && c.tapSeen, 'the whole card is on the screen, the way out included  (' + (c ? c.box : '-') + ')');
  say(c && !c.toast, 'and no notice sits on top of it' + (c && c.toast ? '  ("' + c.toast + '")' : ''));
  say(await leave(A.page), 'Enter leaves it');
  await A.page.waitForTimeout(900);
  const h1 = await home(A.page);
  say(h1.path === '/app' && h1.kept && h1.line === LINE, 'home now holds the day, in the words that were written');
  say(h1.stamp.startsWith(copy.home.keptToday), 'under his question it reads "' + copy.home.keptToday + '"  (' + h1.stamp + ')');
  say(h1.days === before + 1, 'and the journal door has counted it  (' + h1.days + ')');
  await A.page.waitForTimeout(1900);
  const s2 = await seen(A.page);
  say(s2.cards.length === 1 && !(await cer(A.page)).up, 'the day is told once  (' + s2.cards.length + ' card' + (s2.cards.length === 1 ? '' : 's') + ')');
  const st = await state(A.page); const e = st.entries[st.entries.length - 1];
  say(st.entries.length === MONTH.entries.length + 1 && e.text === LINE, 'the entry is on the device, as written');
  say(Math.abs(Date.parse(e.at) - Date.now()) < 120000, 'with the moment it was written');
  say(e.took >= 1 && e.took <= 40, 'and how long it took  (' + e.took + ' sec)');
  say(Object.keys(st.milestones).length === Object.keys(MONTH.milestones).length, 'an ordinary day lights no mark it did not earn');

  // a second entry the same day, words with no plant
  await write(A, 'And the light after rain.', null);
  await A.page.waitForTimeout(450);
  const c2 = await readCard(A.page);
  say(c2 && c2.kept === before + 1 && c2.seeds === before + 1 && c2.fresh === 0, 'words with no plant are kept too, and a day counts once: no new seed  (' + (c2 ? c2.keptWords : '-') + ')');
  await leave(A.page); await A.page.waitForTimeout(900);
  const h2 = await home(A.page);
  say(h2.line === 'And the light after rain.' && /1/.test(h2.more) && h2.more.includes(copy.home.more), 'home shows the latest, and says there is another  ("' + h2.more + '")');

  // ── nothing leaves ──
  const all = (await seen(A.page)).sent.map((x) => x.url + ' ' + x.body).concat(A.wire);
  const leaks = all.filter((x) => x.toLowerCase().includes(WORD) || /"took"|[?&]took=/.test(x));
  say(leaks.length === 0, 'not a word of the entry left the device, nor its length  (' + all.length + ' requests read)');
  await A.page.evaluate((w) => fetch('/api/trax', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ev: 'view', n: 1, note: w }) }).catch(() => null), WORD);
  await A.page.waitForTimeout(300);
  const all2 = (await seen(A.page)).sent.map((x) => x.url + ' ' + x.body).concat(A.wire);
  say(all2.some((x) => x.toLowerCase().includes(WORD)), 'the control: a word sent off the device on purpose is seen leaving');

  // ── the same figure stands on Milestones ──
  await A.go('/app/marks');
  const mk = await A.page.evaluate(() => ({ n: Number(((document.querySelector('.ld-words b') || {}).textContent || '').replace(/\D/g, '')), seeds: document.querySelectorAll('.ld .jr-head circle').length, marks: document.querySelectorAll('.miles .mile').length, lit: document.querySelectorAll('.miles .mile.lit').length }));
  say(mk.n === before + 1 && mk.seeds === before + 1, 'Milestones stands on the same figure: the head, and the count  (' + mk.n + ')');
  say(mk.marks > 0 && mk.marks % 3 === 0 && mk.lit === Object.keys(st.milestones).length, 'with every mark under it, three to a row, the lit ones lit  (' + mk.lit + ' of ' + mk.marks + ')');
  await A.close();
}

// ══ A LONG SITTING ══
{
  const B = await phone(MONTH, { clock: true });
  // a minute thinking, twice, and five minutes away from the page in the middle
  const gaps = [60000, 60000, 300000];
  await write(B, LINE, 0, { parts: ['The ' + WORD + ' tree', ' by the gate,', ' heavy this', ' year.'], between: (i) => B.page.clock.fastForward(gaps[i - 1]) });
  await toCard(B.page);
  const st = await state(B.page); const e = st.entries[st.entries.length - 1];
  say(e.took >= 120 && e.took <= 150, 'two minutes of writing with five minutes away in the middle is kept as two minutes  (' + e.took + ' sec)');
  await leave(B.page);
  await B.go('/app/book');
  const card = await B.page.evaluate((id) => { const n = document.querySelector('.entry[data-e="' + id + '"] .kicker'); return n ? n.textContent.replace(/\s+/g, ' ').trim() : ''; }, e.id);
  say(card.includes(J.span(e.took)), 'the journal shows it on the entry  (' + card + ')');
  await B.page.click('[data-book="log"]'); await B.page.waitForTimeout(500);
  const tot = J.totals(st.entries);
  const log = await B.page.evaluate((at) => {
    const t = (n) => (n ? n.textContent.replace(/\s+/g, ' ').trim() : '');
    const row = document.querySelector('.jr-row'); const rows = document.querySelector('.jr-rows');
    return {
      rows: document.querySelectorAll('.jr-row').length,
      first: row ? { id: row.dataset.le, d: t(row.querySelector('.jr-d')), t: t(row.querySelector('.jr-t')), s: t(row.querySelector('.jr-s')), w: t(row.querySelector('.jr-w')) } : null,
      clock: new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
      stats: [...document.querySelectorAll('.page .stats > div')].map((d) => t(d.querySelector('b')) + ' ' + t(d.querySelector('span'))),
      lit: document.querySelectorAll('.cal-d.on').length, today: document.querySelectorAll('button.cal-d.today.on').length, idle: document.querySelectorAll('button.cal-d:not(.on)').length,
      fits: !!rows && rows.scrollWidth <= rows.clientWidth + 1,
    };
  }, e.at);
  say(log.first && log.first.id === e.id, 'the Time Log opens on the newest entry');
  say(log.first && log.first.t === log.clock, 'with the hour it was written  (' + (log.first || {}).t + ')');
  say(log.first && log.first.s === J.span(e.took), 'how long it took  (' + (log.first || {}).s + ')');
  say(log.first && log.first.w.startsWith(String(WORDS) + ' '), 'and how many words  (' + (log.first || {}).w + ')');
  const inMonth = st.entries.filter((x) => x.day.slice(0, 7) === e.day.slice(0, 7));
  say(log.rows === inMonth.length, 'every entry of the month is under the calendar  (' + log.rows + ' of ' + inMonth.length + ')');
  say(log.stats[0] === tot.days + ' ' + copy.log.days && log.stats[1] === tot.entries + ' ' + copy.log.entries, 'the days and the entries are counted from the journal  (' + log.stats.slice(0, 2).join(', ') + ')');
  say(log.stats[2] === J.brief(tot.secs) + ' ' + copy.log.time, 'and the time is the sum of what the entries hold  (' + log.stats[2] + ')');
  const daysInMonth = new Set(inMonth.map((x) => x.day)).size;
  say(log.lit === daysInMonth && log.today === 1 && log.idle === 0, 'the calendar lights each day kept, today among them, and a day with nothing in it is not a button  (' + log.lit + ' of ' + daysInMonth + ')');
  say(log.fits, 'and a row fits the width of a phone');
  await B.page.click('.jr-row'); await B.page.waitForTimeout(600);
  const sheet = await B.page.evaluate(() => { const s = document.querySelector('#sheets .sheet'); return s ? s.textContent.replace(/\s+/g, ' ').trim() : ''; });
  say(sheet.includes(LINE) && sheet.includes(J.span(e.took)), 'a tap on the row opens the entry itself');
  await B.page.keyboard.press('Escape'); await B.page.waitForTimeout(500);
  await B.page.click('button.cal-d.today'); await B.page.waitForTimeout(600);
  const dayText = await B.page.evaluate(() => { const s = document.querySelector('#sheets .sheet'); return s ? s.textContent.replace(/\s+/g, ' ').trim() : ''; });
  say(dayText.includes(LINE), 'and a tap on a kept day opens what was written that day');
  await B.close();

  const X = await phone(MONTH, { clock: true, fault: 'noLength' });
  await write(X, LINE, 0, { parts: ['The ' + WORD + ' tree', ' by the gate.'], between: () => X.page.clock.fastForward(60000) });
  await toCard(X.page);
  const sx = await state(X.page);
  say(sx.entries.length === MONTH.entries.length + 1 && !sx.entries[sx.entries.length - 1].took, 'the control: an entry kept with no length is seen to have none');
  await X.close();
}

// ══ A CROSSING ══
// One plant, eight days kept. The ninth carries it into the fourth phase, and lights the
// mark for the first plant ever to get there.
const EIGHT = await settled(run('🌿', 8));
const crossTo = book.phases.find((p) => p.day === 9);
async function crossing(fault, viewport) {
  const v = await phone(EIGHT, { fault, viewport });
  await write(v, 'The fern again, and the rain on it.', 0);
  const c0 = await toCard(v.page);
  const card = await readCard(v.page);
  const mid = await seen(v.page);
  await leave(v.page);
  await v.page.waitForTimeout(2600);
  // anything held after the day was left is the day being told again: walk it, and count it
  for (let i = 0; i < 8 && (await cer(v.page)).up; i++) { await v.page.keyboard.press('Escape'); await v.page.waitForTimeout(500); }
  const end = await seen(v.page); const st = await state(v.page);
  await v.close();
  return { c0, card, mid, end, st };
}
{
  say(!EIGHT.milestones.bloomed && !!crossTo, 'eight days in, the mark for a plant in ' + (crossTo || {}).name + ' is still unlit');
  const r = await crossing(null);
  say(r.mid.film === 1, 'the Gate opens for a crossing  (' + r.mid.film + ')');
  say(r.card && r.card.crossed && r.card.h2 === crossTo.name, 'and the card names the phase it crossed into  (' + (r.card || {}).h2 + ')');
  say(r.card && r.card.seeds === 9 && r.card.kept === 9, 'over the journal\'s nine days  (' + (r.card || {}).keptWords + ')');
  say(r.card && r.card.next.startsWith(book.phases[4].name), 'with how far the next phase is  ("' + (r.card || {}).next + '")');
  say(r.card && r.card.marks.length === 1 && /Bloomed/.test(r.card.marks[0]), 'the mark it lit is on the same card  (' + ((r.card || {}).marks || []).join(', ') + ')');
  say(!!r.st.milestones.bloomed, 'and is lit on the device');
  say(r.end.film === 1 && r.end.cards.length === 1, 'the crossing is told once: one film, one card  (' + r.end.film + ' and ' + r.end.cards.length + ')');

  const twice = await crossing('toldTwice');
  say(twice.end.cards.length >= 2, 'the control: a crossing told a second time is seen  (' + twice.end.cards.join(' | ') + ')');

  // the tallest card there is, on the smallest phone there is
  const small = await crossing(null, { width: 320, height: 568 });
  say(small.card && small.card.inside && small.card.tapSeen, 'the tallest card fits the smallest phone, the way out included  (' + (small.card || {}).box + ')');

  // the crossing that makes a plant a gift closes on his line
  const TWELVE = await settled(run('❤️', 12));
  const v = await phone(TWELVE);
  await write(v, 'Twelve days, and today.', 0);
  await toCard(v.page);
  const rc = await readCard(v.page);
  say(rc && rc.crossed && rc.h2 === book.phases[4].name && rc.gold === copy.locked.call, 'the day a plant becomes a gift, the card closes on his line, as he wrote it  ("' + (rc || {}).gold + '")');
  await v.close();
}
{
  const g = await phone(MONTH, { fault: 'gateAlways' });
  await write(g, LINE, 0);
  await g.page.waitForTimeout(600);
  say((await seen(g.page)).film >= 1, 'the control: a film in front of an ordinary day is seen');
  await g.close();
}

// ══ DAY ONE ══
{
  const v = await phone(null);
  await v.go('/app/book'); await v.page.click('[data-book="log"]'); await v.page.waitForTimeout(400);
  const empty = await v.page.evaluate(() => ({ text: (document.querySelector('.page') || {}).textContent || '', write: !!document.getElementById('j-write'), rows: document.querySelectorAll('.jr-row').length }));
  say(empty.rows === 0 && empty.write && empty.text.includes(copy.log.empty), 'before the first entry, the log says where it starts and offers the page');
  await write(v, 'The first coffee, before anybody else was awake.', 0, { from: 'home', first: true });
  await toCard(v.page);
  const c = await readCard(v.page); const s = await seen(v.page);
  say(s.film === 1, 'the first word anybody plants opens the Gate');
  say(c && c.crossed && c.h2 === book.phases[0].name, 'and the card says what began  (' + (c || {}).h2 + ')');
  say(c && c.seeds === 1 && c.kept === 1 && c.keptWords.includes(copy.day.keptOne), 'one seed, one day  (' + (c ? c.keptWords : '-') + ')');
  say(c && c.marks.length === 1, 'and the first mark  (' + ((c || {}).marks || []).join(', ') + ')');
  say(c && c.inside && c.tapSeen, 'all of it on the screen  (' + (c || {}).box + ')');
  await leave(v.page); await v.page.waitForTimeout(900);
  const h = await home(v.page);
  say(h.kept && h.days === 1, 'home holds day one');
  await v.go('/app/book'); await v.page.click('[data-book="log"]'); await v.page.waitForTimeout(400);
  const one = await v.page.evaluate(() => ({ rows: document.querySelectorAll('.jr-row').length, lit: document.querySelectorAll('.cal-d.on').length }));
  say(one.rows === 1 && one.lit === 1, 'and the log has started: one row, one light');
  await v.close();
}

// ══ NOTHING RUNS ══
async function typing(fault) {
  const v = await phone(MONTH, { fault });
  await v.go('/app/book');
  const count = async () => { const s = (await seen(v.page)).sent; return { bill: s.filter((x) => x.url.includes('/api/billing')).length, view: s.filter((x) => x.url.includes('/api/trax') && /"ev":"view"/.test(x.body)).length }; };
  await v.page.waitForTimeout(400);
  // the ways of narrowing it stay shut until they are asked for
  const rows0 = await v.page.evaluate(() => document.querySelectorAll('.page .chips.row').length);
  await v.page.click('#j-filters'); await v.page.waitForTimeout(300);
  const rows1 = await v.page.evaluate(() => document.querySelectorAll('.page .chips.row').length);
  await v.page.click('#j-filters'); await v.page.waitForTimeout(300);
  const first = await v.page.evaluate(() => { const p = document.querySelector('.page'); const e = p && p.querySelector('.entry'); return e ? Math.round(e.getBoundingClientRect().top) : 9999; });
  const a = await count();
  await v.page.click('#j-search');
  await v.page.keyboard.type('coffee', { delay: 45 });
  await v.page.waitForTimeout(500);
  const z = await count();
  const box = await v.page.evaluate(() => ({ focus: (document.activeElement || {}).id || '', value: (document.getElementById('j-search') || {}).value || '', shown: [...document.querySelectorAll('.page .entry')].map((n) => n.textContent.toLowerCase()) }));
  await v.close();
  return { bill: z.bill - a.bill, view: z.view - a.view, box, rows0, rows1, first };
}
{
  const t = await typing(null);
  say(t.rows0 === 0 && t.rows1 > 0, 'the journal opens on the words: its filters wait behind one button  (' + t.rows0 + ', then ' + t.rows1 + ' rows)');
  say(t.first < 812, 'and the first entry is on the first screen  (at ' + t.first + ')');
  say(t.box.value === 'coffee' && t.box.focus === 'j-search', 'six letters typed into the search stay typed, and the cursor stays in the box');
  say(t.box.shown.length > 0 && t.box.shown.every((x) => x.includes('coffee')), 'and the journal narrows to them  (' + t.box.shown.length + ' entries)');
  say(t.bill === 0 && t.view === 0, 'without a single question to the network  (' + t.bill + ' billing, ' + t.view + ' counts)');
  const loud = await typing('everyPaint');
  say(loud.bill >= 5 && loud.view >= 5, 'the control: a question on every paint is seen  (' + loud.bill + ' billing, ' + loud.view + ' counts)');
}

// ══ A MARK HAS A WAY TO IT ══
// "First folder" stood on the Milestones page for a day while the button that makes a
// folder was cut from the app. The page listed the mark and nothing could light it. So a
// folder is made here the way a person makes one, and the mark has to light.
async function folder(fault) {
  const v = await phone(MONTH, { fault });
  await v.go('/app/book');
  await v.page.click('#j-filters'); await v.page.waitForTimeout(300);
  const door = await v.page.locator('#j-newfolder').count();
  if (door) {
    await v.page.click('#j-newfolder'); await v.page.waitForTimeout(500);
    await v.page.fill('#nf-name', 'Mornings');
    await v.page.click('#nf-go'); await v.page.waitForTimeout(500);
  }
  const made = ((await state(v.page)).folders || []).map((f) => f.name);
  // the mark lights the next time the garden is opened
  await v.go('/app/marks', 1500);
  for (let i = 0; i < 6 && (await cer(v.page)).up; i++) { await v.page.keyboard.press('Escape'); await v.page.waitForTimeout(400); }
  const st = await state(v.page);
  const lit = await v.page.evaluate(() => [...document.querySelectorAll('.mile.lit')].filter((n) => /folder/i.test(n.textContent)).length);
  const listed = await v.page.evaluate(() => [...document.querySelectorAll('.mile')].filter((n) => /folder/i.test(n.textContent)).length);
  await v.close();
  return { door, made, mark: !!(st.milestones || {})['first-folder'], lit, listed };
}
{
  const f = await folder(null);
  say(f.door === 1 && f.made.join() === 'Mornings', 'a folder can be made from the Filter  (' + (f.made.join(', ') || 'none') + ')');
  say(f.listed === 1 && f.mark && f.lit === 1, 'and the mark that names it lights  (listed ' + f.listed + ', lit ' + f.lit + ')');
  const none = await folder('noFolder');
  say(none.door === 0 && none.listed === 1 && !none.mark && none.lit === 0, 'the control: with the button cut the mark is listed and stays dark, and that is seen');
}

// ══ WHAT SOMEBODY WROTE HAS A WAY TO IT ══
// The second cut took Give to the World off the Give page for a day. It is his option, and
// it is also the only way to the Vault, where a wish somebody wrote is kept on their device.
// So the way is walked: Give, Give to the World, the Vault, and the wish has to be there.
async function wish(fault) {
  const seed = JSON.parse(JSON.stringify(MONTH));
  seed.wishes = [{ id: 'w1', text: 'That the river runs clean again.', scope: 'For Earth', at: '2026-10-02' }];
  const v = await phone(seed, { fault });
  await v.go('/app/give');
  const centre = (id) => v.page.evaluate((i) => { const el = document.getElementById(i); if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' }); return !!el; }, id);
  const doors = { project: await v.page.locator('#give-project').count(), world: await v.page.locator('#give-world').count() };
  let shown = false;
  if (await centre('give-world')) {
    await v.page.click('#give-world'); await v.page.waitForTimeout(1100);
    if (await centre('door-vault')) { await v.page.click('#door-vault'); await v.page.waitForTimeout(1100); }
    shown = await v.page.evaluate(() => document.body.innerText.includes('That the river runs clean again.'));
  }
  const where = new URL(v.page.url()).pathname;
  await v.close();
  return { doors, where, shown };
}
{
  const a = await wish(null);
  say(a.doors.project === 1 && a.doors.world === 1, 'the Give page carries his options: Support a Project and Give to the World');
  say(a.where === '/app/vault' && a.shown, 'and a wish somebody wrote is reached through them, and read  (' + a.where + ')');
  const cut = await wish('noWishDoor');
  say(!cut.shown && cut.where !== '/app/vault', 'the control: with that door dead, the wish has no way to it, and that is seen  (' + cut.where + ')');
}

await b.close(); await srv.close();
console.log('G44 a day lands once: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
