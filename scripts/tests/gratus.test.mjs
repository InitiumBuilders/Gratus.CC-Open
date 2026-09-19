import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as Gr from '../../engine/gratus.js';

const prompts = JSON.parse(readFileSync(new URL('../../config/prompts.json', import.meta.url), 'utf8'));
const names = JSON.parse(readFileSync(new URL('../../config/emoji-names.json', import.meta.url), 'utf8'));

test('a day counts once, however many lines are kept that day', () => {
  const g = Gr.born('🕯️', 'August', '2026-09-01');
  assert.equal(Gr.days(g), 0);
  assert.equal(Gr.keep(g, '2026-09-01'), true); assert.equal(Gr.keep(g, '2026-09-01'), false); assert.equal(Gr.keep(g, '2026-09-02'), true);
  assert.equal(Gr.days(g), 2); assert.equal(Gr.handsOf(g), 1);
});
test('what travels carries the hands and the sent line, never the kept dates; what arrives adds a hand', () => {
  const g = Gr.born('🕯️', 'August', '2026-06-01'); for (let d = 1; d <= 9; d++) Gr.keep(g, '2026-06-0' + d);
  const sent = Gr.toSend(g, 'August', 'Kept through a hard June.', '2026-09-10', null);
  assert.equal(sent.hands.length, 1); assert.equal(sent.hands[0].days, 9); assert.equal(sent.hands[0].line, 'Kept through a hard June.'); assert.equal(sent.hands[0].until, '2026-09-10');
  assert.equal(JSON.stringify(sent).includes('kept'), false, 'no kept dates travel');
  const mine = Gr.receive(Object.assign({ id: 'gabc' }, sent), 'Kris', '2026-09-11');
  assert.equal(Gr.handsOf(mine), 2); assert.equal(Gr.days(mine), 9); assert.equal(Gr.hand(mine).name, 'Kris'); assert.equal(mine.status, 'held');
  assert.equal(Gr.keep(mine, '2026-09-11'), true); assert.equal(Gr.days(mine), 10);
  assert.deepEqual(Gr.tints(mine), [0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 'the first hand sits nearest the centre, the new day last');
});
test('a given Gratus takes no more days', () => {
  const g = Gr.born('🌱', '', '2026-09-01'); g.status = 'moving'; assert.equal(Gr.keep(g, '2026-09-02'), false);
});
test('the ring keeps every day inside the box and outside the centre, at any count', () => {
  for (const n of [1, 3, 21, 89, 412, 1500, 3650]) {
    const pts = Gr.ring(n, 300); assert.equal(pts.length, n);
    for (const p of pts) { const d = Math.hypot(p.x - 150, p.y - 150); assert.ok(d >= 54 - 0.01, n + ' inside the centre: ' + d); assert.ok(d + p.r <= 150, n + ' outside the box: ' + d); }
  }
  assert.deepEqual(Gr.ring(0, 300), []);
});
test('the twelve laws are twelve, verbatim, honor first', () => {
  const l = Gr.laws(prompts.statements); assert.equal(l.length, 12); assert.equal(l[0], 'Gratus means honor.');
  for (const k of Gr.LAW_KEYS.slice(1)) assert.ok(l.includes(prompts.statements[k]), k);
});
test('the question holds for a day and moves on a tap', () => {
  const pool = Gr.questionPool(prompts); assert.ok(pool.length >= 8);
  assert.equal(Gr.question(pool, '2026-09-19:g1'), Gr.question(pool, '2026-09-19:g1'));
  assert.notEqual(Gr.question(pool, '2026-09-19:g1'), Gr.question(pool, '2026-09-19:g1', 1));
});
test('the earlier garden arrives as one Gratus with its days and its lines', () => {
  const v1 = { user: { displayName: 'August' }, plants: [{ emoji: '☕', daysTended: 6 }, { emoji: '📖', daysTended: 4 }], entries: [{ id: 'e1', day: '2026-09-01', text: 'What matters?\nCoffee first.', createdAt: 'x' }, { id: 'e2', day: '2026-09-01', question: 'Q', text: 'And a chapter.' }, { id: 'e3', day: '2026-09-03', text: 'Rain.' }] };
  const m = Gr.migrateV1(v1, '2026-09-19');
  assert.equal(m.gratus.emoji, '☕'); assert.equal(Gr.days(m.gratus), 2); assert.equal(m.gratus.born, '2026-09-01');
  assert.deepEqual(m.lines.map((l) => l.text), ['Coffee first.', 'And a chapter.', 'Rain.']);
  assert.equal(Gr.migrateV1(null, '2026-09-19'), null); assert.equal(Gr.migrateV1({ entries: [] }, '2026-09-19'), null);
});
test('every evolution stage has a name', () => {
  const evo = JSON.parse(readFileSync(new URL('../../config/evolutions.json', import.meta.url), 'utf8'));
  for (const ch of evo.chains) for (const s of ch.stages) assert.ok(names[s.emoji] || s.name, s.emoji);
});
test('the first emoji is taken whole', () => {
  assert.equal(Gr.firstEmoji('a \u{1F44D}\u{1F3FD} day'), '\u{1F44D}\u{1F3FD}', 'skin tone kept');
  assert.equal(Gr.firstEmoji('\u{1F469}\u{1F3FD}‍\u{1F4BB}'), '\u{1F469}\u{1F3FD}‍\u{1F4BB}', 'joiner sequence kept');
  assert.equal(Gr.firstEmoji('\u{1F1FA}\u{1F1F8}'), '\u{1F1FA}\u{1F1F8}', 'flag kept');
  assert.equal(Gr.firstEmoji('no emoji here'), null);
});
