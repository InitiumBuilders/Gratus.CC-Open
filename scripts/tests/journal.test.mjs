import test from 'node:test';
import assert from 'node:assert/strict';
import * as J from '../../engine/journal.js';

const e = (day, text, more) => Object.assign({ id: day + text, day, at: day + 'T07:00:00.000Z', text, emoji: null }, more || {});

test('a day is kept once, however many lines it holds, and the list is in order', () => {
  const es = [e('2026-11-03', 'b'), e('2026-11-01', 'a'), e('2026-11-03', 'c'), e('2026-11-02', 'd')];
  assert.deepEqual(J.keptDays(es), ['2026-11-01', '2026-11-02', '2026-11-03']);
  assert.deepEqual(J.keptDays([]), []);
  assert.deepEqual(J.keptDays(null), []);
});

test('the totals count what was kept and nothing else', () => {
  const es = [e('2026-11-01', 'one two three', { took: 40 }), e('2026-11-01', 'four', { voice: { dur: 75 } }), e('2026-11-04', 'five six')];
  const t = J.totals(es);
  assert.equal(t.days, 2); assert.equal(t.entries, 3); assert.equal(t.words, 6);
  assert.equal(t.secs, 115); assert.equal(t.timed, 2);
  assert.equal(t.first, '2026-11-01'); assert.equal(t.last, '2026-11-04');
});

test('an entry that was spoken for longer than it was typed is as long as the recording', () => {
  assert.equal(J.secsOf({ took: 12, voice: { dur: 90 } }), 90);
  assert.equal(J.secsOf({ took: 120, voice: { dur: 30 } }), 120);
  assert.equal(J.secsOf({}), 0);
  assert.equal(J.secsOf({ took: -5 }), 0);
});

test('the writing clock counts a hand on the page, and not the time spent away from it', () => {
  const c = J.clock();
  assert.equal(J.took(c), 0, 'a page never touched took no time');
  J.touch(c, 1000); assert.equal(J.took(c), 1, 'one touch is at least a second');
  J.touch(c, 11000); J.touch(c, 31000);
  assert.equal(J.took(c), 30);
  J.touch(c, 31000 + J.PAUSE + 1);          // walked away, came back
  assert.equal(J.took(c), 30, 'a long gap adds nothing');
  J.touch(c, 31000 + J.PAUSE + 1 + 5000);
  assert.equal(J.took(c), 35);
  J.touch(c, 500);                          // a clock that ran backwards changes nothing
  assert.equal(J.took(c), 35);
  const long = J.clock(); for (let t = 0; t <= 5 * 3600 * 1000; t += 60000) J.touch(long, 1 + t);
  assert.equal(J.took(long), J.LONGEST, 'and one sitting is never logged as longer than three hours');
});

test('a length of time reads the way a person says it', () => {
  assert.equal(J.span(0), '0 sec'); assert.equal(J.span(40), '40 sec'); assert.equal(J.span(59), '59 sec');
  assert.equal(J.span(60), '1 min'); assert.equal(J.span(150), '3 min'); assert.equal(J.span(3540), '59 min');
  assert.equal(J.span(3600), '1 h'); assert.equal(J.span(4320), '1 h 12 min');
  assert.equal(J.brief(0), '0 min'); assert.equal(J.brief(20), '1 min'); assert.equal(J.brief(4320), '72 min');
  assert.equal(J.brief(5940), '99 min'); assert.equal(J.brief(9000), '2.5 h'); assert.equal(J.brief(36000), '10 h');
});

test('the log runs newest day first, each day in the order it was written, with its own sums', () => {
  const es = [
    e('2026-11-02', 'late line here', { at: '2026-11-02T21:00:00.000Z', took: 30 }),
    e('2026-11-02', 'early', { at: '2026-11-02T06:00:00.000Z', took: 10 }),
    e('2026-11-01', 'one two', { at: '2026-11-01T08:00:00.000Z' }),
    e('2026-10-30', 'older month', { at: '2026-10-30T08:00:00.000Z', took: 5 }),
  ];
  const log = J.logDays(es);
  assert.deepEqual(log.map((d) => d.day), ['2026-11-02', '2026-11-01', '2026-10-30']);
  assert.deepEqual(log[0].items.map((x) => x.text), ['early', 'late line here']);
  assert.equal(log[0].words, 4); assert.equal(log[0].secs, 40);
  const months = J.logMonths(es);
  assert.deepEqual(months.map((m) => m.key), ['2026-11', '2026-10']);
  assert.equal(months[0].entries, 3); assert.equal(months[0].days.length, 2); assert.equal(months[0].secs, 40);
  assert.equal(months[1].entries, 1); assert.equal(months[1].words, 2);
});

test('nothing in the record can go down when a line is added', () => {
  const es = [];
  let prev = J.totals(es);
  for (let i = 0; i < 60; i++) {
    es.push(e('2026-0' + (1 + (i % 9)) + '-1' + (i % 9), 'word '.repeat(1 + (i % 4)).trim(), { took: i % 3 ? 20 : 0 }));
    const now = J.totals(es);
    for (const k of ['days', 'entries', 'words', 'secs', 'timed']) assert.ok(now[k] >= prev[k], k + ' never falls');
    prev = now;
  }
});
