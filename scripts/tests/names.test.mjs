// The one name rule (engine/paxt.js nameProblem): names that read as what they hold.
//   node --test scripts/tests/names.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nameProblem } from '../../engine/paxt.js';

const ENGLAND = '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}';

test('emoji drawn from several join, and the name is kept', () => {
  for (const n of ['🧑\u{200D}🍳 Sam', '👨\u{200D}👩\u{200D}👧', '👩🏽\u{200D}💻 Ada', '🏳️\u{200D}🌈', '❤️\u{200D}🔥 June', 'Grace', '', 'Zoë 🌱',
    ENGLAND + ' Ana', '☺️ Bo', '#️⃣ Team', '1️⃣ Cy', '김민지', 'سارة', 'Ana-María O’Neil']) {
    assert.equal(nameProblem(n), null, JSON.stringify(n));
  }
});

test('a joiner anywhere else is a hidden character, and the name is refused', () => {
  for (const n of ['A\u{200D}da', 'Sam\u{200D}🍳', '\u{200D}🍳', '🧑\u{200D}', 'Ad\u{200B}a', 'Gra\u{200C}ce', 'June\u{FEFF}']) {
    assert.notEqual(nameProblem(n), null, JSON.stringify(n));
  }
});

test('text that turns itself around is refused, with or without emoji', () => {
  for (const n of ['\u{202E}ada', 'ada\u{2066}x\u{2069}', '🌱\u{202D}']) assert.notEqual(nameProblem(n), null, JSON.stringify(n));
});

test('every control character, the C1 ones too, is refused as a line break', () => {
  for (const c of ['\u0085', '\u0080', '\u009b', '\u009f', '\u0000', '\u001f', '\u007f', '\u{2028}', '\u{2029}']) {
    assert.equal(nameProblem('Ana' + c + 'Ben'), 'name must be one plain line.', 'U+' + c.codePointAt(0).toString(16));
  }
});

test('every character that hides or turns text around is refused, outside the emoji it belongs to', () => {
  const hidden = ['\u{61C}', '\u{200E}', '\u{200F}', '\u{2060}', '\u{2061}', '\u{2062}', '\u{2063}', '\u{2064}', '\u{AD}', '\u{180E}',
    '͏', '️', '︎', '\u{E0041}', '\u{E0042}', '\u{E007F}', '\u{E0001}'];
  for (const c of hidden) {
    assert.notEqual(nameProblem('Ana' + c + 'Ben'), null, 'U+' + c.codePointAt(0).toString(16));
  }
  // a name that looks empty, or looks like the name beside it
  for (const n of ['ㅤ', 'ﾠ', 'ᅟ', 'ᅠ', 'Ann\u{2060}', 'Ann\u{E0041}\u{E0042}', 'An\u{AD}n']) {
    assert.notEqual(nameProblem(n), null, JSON.stringify(n));
  }
  // tag characters spell a flag only right after U+1F3F4; anywhere else they are hidden text
  assert.equal(nameProblem(ENGLAND), null, 'the control: England’s flag is kept');
  assert.notEqual(nameProblem('Ana' + ENGLAND.slice(2)), null, 'the same tags without the black flag are refused');
  assert.notEqual(nameProblem(ENGLAND.slice(0, -2)), null, 'tags with no closing tag are refused');
});
