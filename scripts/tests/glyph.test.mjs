// G16 · THE GLYPH IS DETERMINISTIC.
//
// The Gratus Glyph is the one thing a person can show somebody else that is
// theirs and could not exist without the days they put in. So it has to be the
// same drawing every time from the same garden, a different drawing from a
// different garden, and never more than forty strokes.
//
// Mutant: make the glyph depend on the clock. This must go red.
import { test } from 'node:test';
import assert from 'node:assert/strict';

let glyph = null;
try { glyph = await import('../../engine/glyph.js'); } catch (e) { /* not built yet */ }

// whether it must exist is scripts/gates/glyph.mjs, which is red until
// Movement IV builds it. This file only tests the thing once it is there.
test('engine/glyph.js is present', { skip: !glyph }, () => {
  assert.ok(typeof glyph.draw === 'function', 'glyph.draw is not a function');
});

test('same garden in, byte-identical svg out', { skip: !glyph }, () => {
  const g = { glyphSeed: 'a1b2c3d4e5f60718', plants: [
    { emoji: '☕', kept: ['a', 'b', 'c'], carried: 0 },
    { emoji: '❤️', kept: ['a'], carried: 0 }] };
  assert.equal(glyph.draw(g), glyph.draw(g));
  assert.equal(glyph.draw(JSON.parse(JSON.stringify(g))), glyph.draw(g));
});

test('two gardens, two glyphs', { skip: !glyph }, () => {
  const a = { glyphSeed: 'aaaaaaaaaaaaaaaa', plants: [{ emoji: '☕', kept: ['a'], carried: 0 }] };
  const b = { glyphSeed: 'bbbbbbbbbbbbbbbb', plants: [{ emoji: '☕', kept: ['a'], carried: 0 }] };
  assert.notEqual(glyph.draw(a), glyph.draw(b));
});

test('never more than forty strokes', { skip: !glyph }, () => {
  const many = { glyphSeed: 'c'.repeat(16), plants: Array.from({ length: 40 }, (_, i) => ({
    emoji: '☕', kept: Array.from({ length: i + 1 }, (_, k) => 'd' + k), carried: 0 })) };
  const svg = glyph.draw(many);
  const strokes = (svg.match(/<(path|circle|line|ellipse|polyline)\b/g) || []).length;
  assert.ok(strokes <= 40, strokes + ' strokes, the ceiling is 40');
});
