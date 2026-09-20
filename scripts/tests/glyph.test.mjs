// The Glyph is a promise: your garden draws your figure, the same way, every time, and
// nobody else's garden draws it. These are the checks that hold the promise.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { glyph, glyphSvg, seedOf, MAX_STROKES } from '../../engine/glyph.js';

const garden = (plants, seed) => ({ glyphSeed: seed || 'a', plants });
const P = (emoji, days) => ({ emoji, kept: Array.from({ length: days }, (_, i) => '2026-01-' + String(i + 1).padStart(2, '0')), carried: 0 });

test('the same garden draws the same figure, every time', () => {
  const g = garden([P('☕', 4), P('❤️', 13), P('🌱', 1)]);
  const a = glyph(g);
  for (let i = 0; i < 20; i++) assert.equal(glyph(g).d, a.d);
});

test('the order it is held in does not change the figure', () => {
  const one = garden([P('☕', 4), P('❤️', 13), P('🌱', 1)]);
  const two = garden([P('🌱', 1), P('❤️', 13), P('☕', 4)]);
  assert.equal(glyph(one).d, glyph(two).d);
});

test('a day more is a different figure, even when it is the only thing growing', () => {
  const four = glyph(garden([P('\u2615', 4)]));
  const five = glyph(garden([P('\u2615', 5)]));
  const thirteen = glyph(garden([P('\u2615', 13)]));
  assert.notEqual(four.d, five.d);
  assert.notEqual(five.d, thirteen.d);
});

test('a different garden draws a different figure', () => {
  const a = glyph(garden([P('☕', 4)]));
  const b = glyph(garden([P('☕', 5)]));
  const c = glyph(garden([P('🌱', 4)]));
  const d = glyph(garden([P('☕', 4)], 'somebody-else'));
  assert.notEqual(a.d, b.d, 'a day more is a different figure');
  assert.notEqual(a.d, c.d, 'a different gratitude is a different figure');
  assert.notEqual(a.d, d.d, 'a different garden is a different figure');
});

test('it never draws more than forty strokes', () => {
  const many = Array.from({ length: 300 }, (_, i) => P(String.fromCodePoint(0x1f300 + i), (i % 20) + 1));
  assert.ok(glyph(garden(many)).strokes.length <= MAX_STROKES, 'forty is the ceiling');
});

test('an empty garden is still a figure, and says so', () => {
  const g = glyph(garden([]));
  assert.equal(g.arms, 0);
  assert.ok(g.d.length > 0, 'the ring is drawn even with nothing in it');
  assert.match(glyphSvg(garden([])), /an empty garden/);
});

test('nothing it is given can make it throw', () => {
  for (const bad of [null, undefined, 0, 'x', [], { plants: 'no' }, { plants: [null, {}, { emoji: 1 }] }]) {
    assert.doesNotThrow(() => glyph(bad), String(bad));
  }
});

test('days are counted from what was kept and what was carried', () => {
  const carried = glyph(garden([{ emoji: '☕', kept: ['2026-01-01'], carried: 9 }]));
  assert.equal(carried.days, 10, 'a gift brings its days with it');
});

test('the hash is stable, which is what makes any of the rest true', () => {
  assert.equal(seedOf('☕'), seedOf('☕'));
  assert.notEqual(seedOf('☕'), seedOf('🌱'));
});

test('the svg fits any box it is put in', () => {
  const s = glyphSvg(garden([P('☕', 4)]), { size: 240 });
  assert.match(s, /viewBox="0 0 240 240"/);
  assert.ok(!/<svg[^>]*\swidth="/.test(s), 'no fixed pixel width on the svg itself');
});
