// G49 · THE WORDS ARE KEPT.
//
// Two ways the words somebody wrote could be lost, both found on 2026-11-21 by reading the
// code, and neither walked by any gate until now:
//
//   - Restore refused every export made since the journal passed version 1. Export writes the
//     version the journal is at (5); restore accepted only 1. The guides tell people to export
//     before they change phones.
//   - The words being written lived in memory only, so a phone that ended the page mid-entry
//     (it does, to a page left in the background) lost them.
//
// This writes half an entry and reloads; exports a month and restores it into an empty phone;
// and restores a file from the first version. Two controls serve the app as it was.
//
//   node scripts/gates/kept.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { serve, browser, ROOT, PHONE } from './lib/harness.mjs';
import { month } from './lib/garden.mjs';

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + msg); };
console.log('G49 - the words are kept');

const APP = fs.readFileSync(path.join(ROOT, 'assets/js/galaxy.js'), 'utf8');
const FAULTS = {
  forget: ["  const w = $('#write'); if (w) w.addEventListener('input', () => { draft.text = w.value; pageTouched(); keepDraft(); });\n",
    "  const w = $('#write'); if (w) w.addEventListener('input', () => { draft.text = w.value; pageTouched(); });\n"],
  refuse: ["!(Number(o.v) >= 1)", 'o.v !== 1'],
};
const faulty = {};
for (const [name, [from, to]] of Object.entries(FAULTS)) {
  faulty[name] = APP.split(from).length === 2 ? APP.replace(from, () => to) : null;
  say(!!faulty[name], 'the control "' + name + '" has a line to be planted in');
}

const KEY = 'gratus.galaxy.v1';
const LINE = 'The neighbour who shovelled both driveways before anyone woke.';
const srv = await serve(4819);
const b = await browser();
const Q = '?nosplash=1&notour=1&dev=1';

async function phone(seed, fault) {
  const ctx = await b.newContext({ ...PHONE, serviceWorkers: 'block', acceptDownloads: true });
  await ctx.route('**/api/**', (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === '/api/billing') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"connected":false}' });
    if (u.pathname === '/api/goals' && route.request().method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"goals":[]}' });
    return route.fulfill({ status: 204, body: '' });
  });
  if (fault) await ctx.route('**/assets/js/galaxy.js*', (route) => route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: faulty[fault] }));
  if (seed) await ctx.addInitScript(({ key, garden }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(garden)); }, { key: KEY, garden: seed });
  const page = await ctx.newPage();
  const loud = [];
  page.on('pageerror', (e) => loud.push(String(e.message).slice(0, 100)));
  page.on('dialog', (d) => d.accept());   // the restore asks before it replaces anything
  const calm = async () => { for (let i = 0, q = 0; i < 60 && q < 4; i++) { const up = await page.evaluate(() => { const r = document.getElementById('ceremony'); return !!r && !r.hidden; }).catch(() => false); if (up) { q = 0; await page.keyboard.press('Escape'); } else q++; await page.waitForTimeout(220); } };
  const go = async (route) => { await page.goto(srv.base + route + Q, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => !!document.querySelector('#view > *'), null, { timeout: 10000 }).catch(() => null); await page.waitForTimeout(600); await calm(); };
  const state = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), KEY);
  const you = async () => { await page.click('#top-you'); await page.waitForSelector('#you-file', { state: 'attached', timeout: 5000 }); await page.waitForTimeout(300); };
  return { ctx, page, loud, go, state, you, close: () => ctx.close() };
}

// ══ HALF AN ENTRY, AND THE PHONE ENDS THE PAGE ══
async function half(fault) {
  const v = await phone(month(), fault);
  await v.go('/app/grow');
  const read = () => v.page.evaluate(() => ({ text: (document.getElementById('write') || {}).value || '', on: ((document.querySelector('#pick .orb.on') || {}).dataset || {}).pick || null }));
  // typing alone, then the page ends
  await v.page.click('#write'); await v.page.keyboard.type(LINE.slice(0, 30), { delay: 5 });
  await v.page.reload({ waitUntil: 'domcontentloaded' }); await v.page.waitForTimeout(1500);
  const typed = await read();
  // an emoji chosen, then the page ends again
  const pick = await v.page.$('#pick [data-pick]'); const emoji = pick ? await pick.getAttribute('data-pick') : null;
  if (pick) { await pick.scrollIntoViewIfNeeded(); await pick.click(); }
  await v.page.reload({ waitUntil: 'domcontentloaded' }); await v.page.waitForTimeout(1500);
  const back = await read();
  let after = null;
  if (!fault) {
    await v.page.click('#write'); await v.page.keyboard.press('End'); await v.page.keyboard.type(LINE.slice(30), { delay: 5 });
    await v.page.evaluate(() => document.getElementById('plant').scrollIntoView({ block: 'center', behavior: 'instant' }));
    await v.page.click('#plant'); await v.page.waitForTimeout(1200);
    for (let i = 0; i < 10; i++) { const up = await v.page.evaluate(() => { const r = document.getElementById('ceremony'); return !!r && !r.hidden; }); if (!up) break; await v.page.keyboard.press('Escape'); await v.page.waitForTimeout(400); }
    const kept = (await v.state()).entries.filter((e) => e.text === LINE).length;
    await v.go('/app/grow');
    after = { kept, box: await v.page.evaluate(() => (document.getElementById('write') || {}).value || ''), left: await v.page.evaluate(() => localStorage.getItem('gratus.draft')) };
  }
  const loud = v.loud;
  await v.close();
  return { emoji, typed, back, after, loud };
}
{
  const h = await half(null);
  say(h.typed.text === LINE.slice(0, 30), 'half an entry is still in the box after the page is ended and opened again  (' + JSON.stringify(h.typed.text) + ')');
  say(!!h.emoji && h.back.on === h.emoji && h.back.text === LINE.slice(0, 30), 'and so is the emoji chosen after it  (' + h.back.on + ')');
  say(h.after && h.after.kept === 1, 'finished and planted, it is kept once, word for word');
  say(h.after && h.after.box === '' && h.after.left === null, 'and the box is empty again: nothing of it waits as a draft  (' + JSON.stringify(h.after && h.after.box) + ')');
  say(h.loud.length === 0, 'the browser threw nothing' + (h.loud.length ? '  (' + h.loud[0] + ')' : ''));
}

// ══ EXPORT ON ONE PHONE, RESTORE ON ANOTHER ══
const MONTH = month();
let file = null;
{
  const v = await phone(MONTH);
  await v.go('/app');
  await v.you();
  const [dl] = await Promise.all([v.page.waitForEvent('download', { timeout: 10000 }), v.page.click('#you-export')]);
  file = path.join(os.tmpdir(), 'g49-' + process.pid + '-' + (dl.suggestedFilename() || 'gratus.json'));
  await dl.saveAs(file);
  const exported = JSON.parse(fs.readFileSync(file, 'utf8'));
  say(Number(exported.v) > 1 && exported.entries.length === MONTH.entries.length, 'export writes the whole journal, at the version it is  (v' + exported.v + ', ' + exported.entries.length + ' entries)');
  await v.close();
}
async function restore(path_, fault) {
  const v = await phone(null, fault);
  await v.go('/app');
  await v.you();
  await v.page.setInputFiles('#you-file', path_);
  await v.page.waitForTimeout(1500);
  const st = await v.state();
  await v.go('/app/book');
  const shown = await v.page.evaluate(() => document.querySelectorAll('.page .entry').length);
  await v.close();
  return { entries: (st.entries || []).length, plants: (st.plants || []).length, v: st.v, shown };
}
{
  const r = await restore(file, null);
  say(r.entries === MONTH.entries.length && r.plants === MONTH.plants.length, 'restored into an empty phone, every entry and every plant comes back  (' + r.entries + ' entries, ' + r.plants + ' plants)');
  say(r.shown > 0, 'and the journal shows them  (' + r.shown + ' on the page)');
  const old = await restore(path.join(ROOT, 'scripts/fixtures/garden-v1.json'), null);
  const v1 = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/fixtures/garden-v1.json'), 'utf8'));
  say(old.entries === v1.entries.length && old.v > 1, 'a file from the first version comes back too, brought up to this one  (v1 to v' + old.v + ', ' + old.entries + ' entries)');
}

// ══ THE CONTROLS ══
if (faulty.forget) {
  const c = await half('forget');
  say(c.typed.text === '', 'the control: with typing not kept, the half entry is gone after the page ends, and that is seen');
}
if (faulty.refuse) {
  const c = await restore(file, 'refuse');
  say(c.entries === 0, 'the control: with restore accepting the first version only, a real export is refused, and that is seen  (' + c.entries + ' restored)');
}

try { fs.unlinkSync(file); } catch (e) {}
await b.close(); await srv.close();
console.log('G49 the words are kept: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
