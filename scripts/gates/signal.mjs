// G54 · A SIGNAL BINDS NO ONE, AND NOBODY SEES WHO CHOSE WHAT.
//
// A signal is a quick read of a Vibe room: one question, two to four choices, one tap per device, open for 1, 3
// or 7 days. This proves that a room holds at most three open signals and a connection opens at most five a
// day, also when the calls arrive together; that a device can change its own tap until the close and no other
// token can change it; that while a signal is open no answer carries a count or how many devices answered, even
// with ten devices on ten networks, and after the close every read carries both, with a token or without one;
// that a closed signal's totals are kept once and read from
// there; that twenty taps sent in the same moment are all counted, and the tap, seat and read limits hold when
// hundreds of calls arrive together; that each signal's limit on devices is its own, so someone who fills it
// cannot read off how many answered before them; that the text rule refuses what it should and keeps an emoji whole, by the
// same helper as the name rule; that a room links only PAXTs that exist, twelve at most even when sent together,
// that it finds them where api/paxt.js keeps them in each environment, and its keeper can take one down; that a
// preview writes only under gratus/preview/; that the room's block in the browser takes the server's answers as
// they come, showing counts only for a closed signal; and that no answer, the error answer included, carries a
// caller, a token, a store path or the salt. Every refusal has a control: the same call with the one wrong thing
// put right, which must be kept.
//
// The store stub refuses a write-once put to a path that exists, as the real store does, so the races here are
// the races the live store settles.
//
//   node --import ./scripts/gates/lib/loader.mjs scripts/gates/signal.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { __MEM as MEM, __failPut, __COUNT, __page } from './lib/blob-stub.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let fails = 0;
const say = (ok, m) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + m); };
function res() {
  const r = { code: 0, body: null, headers: {} };
  r.setHeader = () => {}; r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; }; r.end = () => r;
  return r;
}
// a fresh caller for every call unless one is named, so only the limit checks meet the limits
let n = 0;
const IPS = new Set();
const fresh = () => { n++; return '10.' + ((n >> 16) & 255) + '.' + ((n >> 8) & 255) + '.' + (n & 255); };
const post = (body, ip) => { const a = ip || fresh(); IPS.add(a); return { method: 'POST', headers: { 'x-forwarded-for': a }, query: {}, body }; };
const get = (query, ip) => { const a = ip || fresh(); IPS.add(a); return { method: 'GET', headers: { 'x-forwarded-for': a }, query }; };
const SEEN = [];
const call = async (h, req) => { const r = res(); await h(req, r); SEEN.push(JSON.stringify(r.body)); return r; };
const tally = (rs) => rs.reduce((o, r) => { o[r.code] = (o[r.code] || 0) + 1; return o; }, {});
const keysOf = (o) => (o ? Object.keys(o).sort().join(',') : '');

console.log('G54 - a signal binds no one');
process.env.BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || 'gate-token';
const SALT = process.env.GRATUS_SALT = process.env.GRATUS_SALT || 'a-secret-that-is-not-in-the-store';
delete process.env.VERCEL_ENV;
const SIG = await import(pathToFileURL(path.join(root, 'api/signal.js')).href);
const signal = SIG.default;
const LIMITS = SIG.LIMITS || {};
const WORDS = SIG.WORDS || {};
const vibes = (await import(pathToFileURL(path.join(root, 'api/vibes.js')).href)).default;
// the keyed names the handlers make, so the gate can find a blob or put one where a handler will read it
const hm = (s) => createHmac('sha256', SALT).update(s).digest('hex').slice(0, 32);
// a PAXT record, where api/paxt.js keeps it: under gratus/preview/ off production, which is how this gate runs
const seedPaxt = (id, base = 'gratus/preview/') => MEM.set(base + 'paxt/' + hm('paxt·' + id) + '.json', JSON.stringify({ id }));
// a signal's own limit on devices, worked out here from the secret as api/signal.js does: 500 plus 0 to 249
const capOf = (code, sid) => 500 + parseInt(hm('signal-cap·' + code + '·' + sid).slice(0, 8), 16) % 250;

const DAY = 86400000;
const TOKENS = [];
const device = () => randomBytes(32);
const tokenOf = (secret, sid) => { const t = createHmac('sha256', secret).update(sid).digest('base64url'); TOKENS.push(t); return t; };
const CODES = [];
const KEEPERS = new Map();
async function room() {
  const r = await call(vibes, post({ act: 'make', name: 'Room ' + (CODES.length + 1) }));
  CODES.push(r.body.vibe.code);
  KEEPERS.set(r.body.vibe.code, r.body.keeper);
  return r.body.vibe.code;
}
const Q = 'Tea on Sunday?';
const open = (code, more = {}, ip) => call(signal, post(Object.assign({ act: 'open', code, q: Q, choices: ['Yes', 'No', 'Maybe'], days: 1 }, more), ip));
const tap = (code, sid, token, c, ip) => call(signal, post({ act: 'tap', code, sid, token, c }, ip));
const read = (code, tokens, ip) => call(signal, post({ act: 'read', code, tokens }, ip));
const list = (code, ip) => call(signal, get({ code }, ip));
const attach = (code, id, ip) => call(vibes, post({ act: 'paxt-attach', code, id }, ip));
const detach = (code, id, keeper) => call(vibes, post({ act: 'paxt-detach', code, id, keeper }));
const rowOf = (r, sid) => (r.body && r.body.signals || []).find((s) => s.id === sid);
const realNow = Date.now;
const at = (ms, fn) => async (...a) => { Date.now = () => realNow() + ms; try { return await fn(...a); } finally { Date.now = realNow; } };

// the exact fields of an open row for a device that has answered, of a closed row read with that device's
// token, and of a closed row read with no token. A field such as a count of who has not answered, or a winner,
// turns these red.
const HELD = 'choices,closed,closes,id,mine,opens,q';
const CLOSED_MINE = 'answered,choices,closed,closes,counts,id,mine,opens,q';
const CLOSED_PLAIN = 'answered,choices,closed,closes,counts,id,opens,q';
// any number about an open signal, anywhere in an answer: a counts list or how many answered
const numbers = (body) => /"(counts|answered)"/.test(JSON.stringify(body));

// the store has to be the stub, or every refusal below is a crash wearing a suit
const R1 = await room();
{
  const probe = await open(R1, { days: 1 });
  if (probe.code !== 200) {
    console.log('  the in-memory store is not wired (an open answered ' + probe.code + ')');
    console.log('  run me with:  node --import ./scripts/gates/lib/loader.mjs scripts/gates/signal.mjs');
    console.log('G54 a signal: FAIL - without the store every answer below is an accident');
    process.exit(1);
  }
}

/* ------------------------------------------------------------------ opening */

{
  const listed = await list(R1);
  const s = listed.body.signals[0];
  say(listed.code === 200 && listed.body.signals.length === 1 && keysOf(s) === 'choices,closed,closes,id,opens,q' && /^[A-Za-z0-9_-]{16}$/.test(s.id),
    'a signal opens, and the room lists it with its question, choices and times, and no counts');
  say(listed.body.note === WORDS.room && /small group/.test(WORDS.room) && /binds no one/.test(WORDS.room),
    'the room list carries the room line: a signal binds no one, and in a small group the counts can show a choice');
  const two = await open(R1, { days: 7 }), three = await open(R1, { days: 3 });
  const four = await open(R1, { days: 7 });
  say(two.code === 200 && three.code === 200 && four.code === 409 && LIMITS.CAP_OPEN_ROOM === 3,
    'a room holds three open signals, and the fourth is refused  (' + [two.code, three.code, four.code].join(', ') + ')');
  const later = await at(1.5 * DAY, open)(R1, { days: 7 });
  say(later.code === 200, 'the control: once the one-day signal has closed, the fourth opens  (' + later.code + ')');
  const elsewhere = await open(await room());
  say(elsewhere.code === 200, 'the control: another room opens its first while this one is full  (' + elsewhere.code + ')');
  const ids = new Set([s.id, two.body.signal.id, three.body.signal.id, later.body.signal.id]);
  say(ids.size === 4, 'every signal id is new, and made by the server');
}

{
  // ten opens sent to one room in the same moment
  const R = await room();
  const rs = await Promise.all(Array.from({ length: 10 }, () => open(R, { days: 7 })));
  const t = tally(rs);
  const openNow = (await list(R)).body.signals.filter((x) => !x.closed).length;
  say(t[200] === 3 && t[409] === 7 && openNow === 3, 'ten opens sent at once to one room: three are kept and seven refused  (' + JSON.stringify(t) + ', ' + openNow + ' open)');
  const R2 = await room();
  const ok3 = tally(await Promise.all(Array.from({ length: 3 }, () => open(R2, { days: 7 }))));
  say(ok3[200] === 3, 'the control: three opens sent at once to an empty room are all kept  (' + JSON.stringify(ok3) + ')');
}

{
  const ip = '10.250.0.1';
  const a = await room(), b = await room();
  const codes = [];
  for (let i = 0; i < 3; i++) codes.push((await open(a, {}, ip)).code);
  for (let i = 0; i < 2; i++) codes.push((await open(b, {}, ip)).code);
  const sixth = await open(await room(), {}, ip);
  const other = await open(await room(), {}, '10.250.0.2');
  say(codes.every((c) => c === 200) && sixth.code === 429 && other.code === 200,
    'one connection opens five signals in a day and the sixth answers 429; another connection opens  (' + sixth.code + ', ' + other.code + ')');
  say(/this connection/.test(sixth.body.error) && !/you asked|one person/i.test(sixth.body.error),
    'the refusal says what is counted, a connection, and does not say the caller asked them');
  // twenty opens from one connection sent in the same moment, one to each of twenty rooms
  const rooms = [];
  for (let i = 0; i < 20; i++) rooms.push(await room());
  const t = tally(await Promise.all(rooms.map((c) => open(c, {}, '10.250.0.3'))));
  say(t[200] === 5 && t[429] === 15, 'twenty opens from one connection sent at once: five are kept and fifteen answer 429  (' + JSON.stringify(t) + ')');
}

{
  // each refusal next to its control: the same call with the one thing put right
  const pairs = [
    ['one choice', { choices: ['Yes'] }, { choices: ['Yes', 'No'] }],
    ['five choices', { choices: ['a', 'b', 'c', 'd', 'e'] }, { choices: ['a', 'b', 'c', 'd'] }],
    ['a question of 121 characters', { q: 'q'.repeat(121) }, { q: 'q'.repeat(120) }],
    ['a choice of 41 characters', { choices: ['c'.repeat(41), 'No'] }, { choices: ['c'.repeat(40), 'No'] }],
    ['closing after 2 days', { days: 2 }, { days: 7 }],
    ['two choices the same', { choices: ['Yes', 'yes'] }, { choices: ['Yes', 'No'] }],
    ['two choices that differ by a word joiner', { choices: ['Yes', 'Yes\u2060', 'No'] }, { choices: ['Yes', 'No'] }],
    ['two choices the same once full-width letters are read as plain', { choices: ['Yes', '\uff39\uff45\uff53'] }, { choices: ['Yes', 'No'] }],
    ['two choices that differ by a double space', { choices: ['Not yet', 'Not  yet'] }, { choices: ['Not yet', 'Yes'] }],
    ['two choices that differ by a variation selector, and look the same', { choices: ['Yes', 'Yes\u{FE00}', 'No'] }, { choices: ['Yes', 'No'] }],
    ['two choices that differ by a combining grapheme joiner', { choices: ['No', 'N\u{034F}o', 'Yes'] }, { choices: ['No', 'Yes'] }],
    ['an empty question', { q: '   ' }, { q: Q }],
    ['a choice that is not text', { choices: ['Yes', 4] }, { choices: ['Yes', '4'] }],
  ];
  for (const [what, bad, good] of pairs) {
    const code = await room();
    const no = await open(code, bad), yes = await open(code, good);
    say(no.code === 400 && yes.code === 200, what + ' is refused, and the control opens  (' + no.code + ', ' + yes.code + ')');
  }
  // the text rule: every character it names, in the question and in a choice
  const BAD = ['<', '>', '\u0000', '\u0007', '\u001f', '\u007f', '\u0085', '\u009b', '\u00ad', '\u061c', '\u180e', '\u200b', '\u200d', '\u200f',
    '\u202a', '\u202e', '\u2060', '\u2061', '\u2064', '\u2066', '\u2069', '\u2028', '\u2029', '\ufeff', '\u115f', '\u1160', '\u3164', '\uffa0',
    // hidden but neither control nor format: variation selectors away from an emoji, the combining grapheme joiner,
    // Mongolian variation selectors and a supplementary variation selector (engine/text.js HIDDEN)
    '\u{FE00}', '\u{FE0F}', '\u{034F}', '\u{180B}', '\u{180D}', '\u{E0100}', '\u{E01EF}'];
  const code = await room();
  const missed = [];
  for (const ch of BAD) {
    const inQ = await open(code, { q: 'Tea on' + ch + ' Sunday?' });
    const inC = await open(code, { choices: ['Y' + ch + 'es', 'No'] });
    if (inQ.code !== 400 || inC.code !== 400) missed.push('U+' + ch.codePointAt(0).toString(16).padStart(4, '0'));
  }
  say(!missed.length, 'the text rule refuses ' + BAD.length + ' characters in a question and in a choice' + (missed.length ? '  (let through: ' + missed.join(' ') + ')' : ''));
  const clean = await open(code, { q: 'Tea on Sunday?', choices: ['Yes', 'No'] });
  say(clean.code === 200, 'the control: the same question and choices without the character open  (' + clean.code + ')');
  say(SIG.textOf('Café, ünd 日本 한국어 ✦ 🌱', 40, 'x').text === 'Café, ünd 日本 한국어 ✦ 🌱', 'and letters, accents, other scripts and emoji are kept');

  // Emoji drawn from several characters hold a joiner, a style mark or tags. Inside the emoji those hide
  // nothing, and the rule keeps them; between letters the same characters are hidden text, and it refuses them.
  // The rule is the one names use (engine/text.js asDrawn).
  const ENGLAND = '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}';
  const EMOJI = [['a family', '\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}'], ['a cook', '\u{1F9D1}\u{200D}\u{1F373}'], ['a keycap', '#\u{FE0F}\u{20E3}'], ['England\'s flag', ENGLAND],
    ['a red heart drawn as emoji', '\u{2764}\u{FE0F}']];
  const refused = [];
  for (const [what, e] of EMOJI) {
    const r = await room();
    const inQ = await open(r, { q: 'Who brings ' + e + ' on Sunday?' });
    const inC = await open(r, { choices: [e + ' me', 'No'] });
    const kept = inQ.code === 200 && inC.code === 200 && inQ.body.signal.q.includes(e) && inC.body.signal.choices[0] === e + ' me';
    if (!kept) refused.push(what + ' (' + inQ.code + ', ' + inC.code + ')');
  }
  say(!refused.length, 'a family, a cook, a keycap, England\'s flag and a red heart are kept whole in a question and in a choice' + (refused.length ? '  (refused: ' + refused.join(', ') + ')' : ''));
  const between = [['a joiner between letters', 'Te\u{200D}a'], ['a tag between letters', 'Te\u{E0067}a'], ['flag tags without the black flag', 'Tea' + ENGLAND.slice(2)],
    ['a joiner after an emoji with no emoji after it', '\u{1F9D1}\u{200D} tea'], ['a cook with its joiner moved onto a letter', '\u{1F9D1} \u{200D}\u{1F373}']];
  const slipped = [];
  for (const [what, t] of between) {
    const r = await room();
    const inQ = await open(r, { q: t + ' on Sunday?' });
    const inC = await open(r, { choices: [t, 'No'] });
    if (inQ.code !== 400 || inC.code !== 400) slipped.push(what + ' (' + inQ.code + ', ' + inC.code + ')');
  }
  say(!slipped.length, 'a joiner or a tag outside an emoji is refused in a question and in a choice  (' + between.length + ' cases' + (slipped.length ? '; let through: ' + slipped.join(', ') : '') + ')');
  {
    const N = await import(pathToFileURL(path.join(root, 'engine/paxt.js')).href);
    const T = await import(pathToFileURL(path.join(root, 'engine/text.js')).href);
    const same = [...EMOJI.map((x) => x[1]), ...between.map((x) => x[1])].every((t) => (N.nameProblem(t) === null) === !SIG.textOf(t, 40, 'x').error);
    say(same && typeof T.asDrawn === 'function', 'a name and a signal\'s text agree on every one of these, through the one helper');
    // the name rule, the server's signal rule and the sheet in the browser refuse the same hidden characters, from one list
    const B = await import(pathToFileURL(path.join(root, 'assets/js/signal.js')).href);
    const hidden = ['\u{FE00}', '\u{FE0F}', '\u{034F}', '\u{180B}', '\u{E0100}', '\u{200B}', '\u{2066}', '\u{00AD}'];
    const sheetOk = (t) => B.askProblem({ q: 'Tea?', choices: [t, 'No'], days: 3 }) === null;
    const disagree = [...hidden.map((h) => 'Ye' + h + 's'), ...EMOJI.map((x) => x[1] + ' me'), ...between.map((x) => x[1])]
      .filter((t) => sheetOk(t) !== !SIG.textOf(t, 40, 'x').error || (N.nameProblem(t) === null) !== !SIG.textOf(t, 40, 'x').error);
    say(!disagree.length && T.HIDDEN instanceof RegExp && hidden.every((h) => N.nameProblem('Ye' + h + 's') !== null && SIG.textOf('Ye' + h + 's', 40, 'x').error && !sheetOk('Ye' + h + 's')),
      'the name rule, the signal rule and the sheet refuse the same hidden characters, from one list in engine/text.js  (' + (hidden.length + EMOJI.length + between.length) + ' cases'
      + (disagree.length ? '; disagree on ' + disagree.map((t) => JSON.stringify(t)).join(', ') : '') + ')');
  }
}

/* ------------------------------------------------------------------ an unknown room */

{
  const real = await room();
  const s = (await open(real)).body.signal;
  const t = tokenOf(device(), s.id);
  const nobody = 'ZZZZZZ';
  const r = [await list(nobody), await open(nobody), await tap(nobody, s.id, t, 0), await read(nobody, {})];
  const c = [await list(real), await tap(real, s.id, t, 0), await read(real, {})];
  say(r.every((x) => x.code === 404), 'a room nobody made is refused for every act  (' + r.map((x) => x.code).join(', ') + ')');
  say(c.every((x) => x.code === 200), 'the control: the same calls with the real room are answered  (' + c.map((x) => x.code).join(', ') + ')');
  const other = await room();
  const wrongRoom = await tap(other, s.id, tokenOf(device(), s.id), 0);
  say(wrongRoom.code === 404, 'a signal is found only in its own room  (' + wrongRoom.code + ')');
}

/* ------------------------------------------------------------------ tapping, and who sees the counts */

{
  const R = await room();
  const s = (await open(R, { choices: ['Yes', 'No', 'Maybe'], days: 1 })).body.signal;
  const A = device(), B = device(), C = device();
  const tA = tokenOf(A, s.id), tB = tokenOf(B, s.id), tC = tokenOf(C, s.id);

  const before = rowOf(await read(R, { [s.id]: tA }), s.id);
  say(before && !('counts' in before) && !('answered' in before), 'before a device taps, its read carries no counts');
  const a1 = await tap(R, s.id, tA, 0);
  say(a1.code === 200 && a1.body.signal.mine === 0 && keysOf(a1.body.signal) === HELD && a1.body.note === WORDS.held && !numbers(a1.body),
    'a tap is kept; its answer gives back the device\'s own choice, no count, and says when counts show  (' + a1.code + ')');
  say(WORDS.held === 'Counts show when the signal closes.', 'the held line is word for word: "' + WORDS.held + '"');
  const afterA = rowOf(await read(R, { [s.id]: tA }), s.id);
  say(afterA && keysOf(afterA) === HELD && afterA.mine === 0, 'and a read by that device gives its own choice and no count');

  const bBefore = rowOf(await read(R, { [s.id]: tB }), s.id);
  const nobody = rowOf(await read(R, {}), s.id);
  const plain = rowOf(await list(R), s.id);
  say([bBefore, nobody, plain].every((x) => x && !numbers(x) && !('mine' in x)),
    'while it is open, a device that has not tapped, a read with no token and the room list see no count and no choice');
  const b1 = await tap(R, s.id, tB, 1);
  const aAt2 = rowOf(await read(R, { [s.id]: tA }), s.id);
  say(b1.code === 200 && keysOf(b1.body.signal) === HELD && b1.body.signal.mine === 1 && keysOf(aAt2) === HELD && aAt2.mine === 0,
    'with two devices answered, each sees only its own choice  (' + keysOf(b1.body.signal) + ')');

  // another token cannot change A's tap: it only ever adds its own
  const c1 = await tap(R, s.id, tC, 2);
  say(c1.code === 200 && keysOf(c1.body.signal) === HELD && c1.body.note === WORDS.held && !numbers(c1.body),
    'with three devices answered, the counts are still held  (' + keysOf(c1.body.signal) + ')');
  const aStill = rowOf(await read(R, { [s.id]: tA }), s.id);
  say(keysOf(aStill) === HELD && aStill.mine === 0, 'a tap from another token leaves A\'s own choice alone  (' + aStill.mine + ')');
  const a2 = await tap(R, s.id, tA, 2);
  const aNow = rowOf(await read(R, { [s.id]: tA }), s.id);
  say(a2.code === 200 && keysOf(a2.body.signal) === HELD && a2.body.signal.mine === 2 && aNow.mine === 2,
    'the control: A\'s own token changes A\'s tap  (' + a2.body.signal.mine + ')');

  const late = await at(2 * DAY, tap)(R, s.id, tA, 1);
  const closedAll = rowOf(await at(2 * DAY, read)(R, {}), s.id);
  const closedMine = rowOf(await at(2 * DAY, read)(R, { [s.id]: tA }), s.id);
  const closedOther = rowOf(await at(2 * DAY, read)(R, { [s.id]: tB }), s.id);
  const closedList = rowOf(await at(2 * DAY, list)(R), s.id);
  say(late.code === 409, 'a tap after the close is refused  (' + late.code + ')');
  say(closedAll && closedAll.closed === true && keysOf(closedAll) === CLOSED_PLAIN && closedAll.counts.join(',') === '0,1,2' && closedAll.answered === 3,
    'after the close everyone sees the counts, with no token at all, and nothing was counted twice  (' + (closedAll && closedAll.counts.join(',')) + ')');
  say(closedMine && keysOf(closedMine) === CLOSED_MINE && closedMine.mine === 2 && closedMine.counts.join(',') === '0,1,2' && closedMine.answered === 3
    && closedOther && keysOf(closedOther) === CLOSED_MINE && closedOther.mine === 1 && closedOther.counts.join(',') === '0,1,2',
    'and with a token the same counts come back with that device\'s own choice');
  say(closedList && closedList.closed === true && !('counts' in closedList), 'the room list says it has closed and carries no counts');
  const gone = rowOf(await at(9 * DAY, list)(R), s.id);
  say(!gone, 'a week after its close a signal leaves the room\'s list');
  const inTime = await tap(R, s.id, tA, 1);
  say(inTime.code === 200 && inTime.body.signal.mine === 1, 'the control: that tap, sent before the close, is kept  (' + inTime.code + ')');

  // the shapes a token may not take
  const good = tokenOf(device(), s.id);
  const raw = Buffer.from(good, 'base64url');
  // the 43rd character carries four bits and two that must be zero; the next letter along sets one of those two
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const bent = good.slice(0, 42) + B64[B64.indexOf(good[42]) + 1];
  const shapes = [
    ['42 characters', good.slice(0, 42)], ['44 characters', good + 'A'], ['padded', raw.toString('base64')],
    ['31 bytes', randomBytes(31).toString('base64url')], ['standard base64', raw.toString('base64').replace(/=+$/, '').replace(/[A-Za-z0-9]/, '+')],
    ['a last character that does not decode back to itself', bent], ['not text', 12345],
  ];
  const let_ = [];
  for (const [what, t] of shapes) if (SIG.tokenOk(t) || (await tap(R, s.id, t, 0)).code !== 400) let_.push(what);
  say(!let_.length && !SIG.tokenOk(bent), 'a token of any other shape is refused  (' + shapes.length + ' shapes' + (let_.length ? '; let through: ' + let_.join(', ') : '') + ')');
  const goodTap = await tap(R, s.id, good, 0);
  say(goodTap.code === 200, 'the control: a token of 32 bytes in unpadded base64url is kept  (' + goodTap.code + ')');
  const badRead = await read(R, { [s.id]: good.slice(0, 42) });
  const badSid = await tap(R, 'not a signal', good, 0);
  const noSid = await tap(R, 'AAAAAAAAAAAAAAAA', good, 0);
  const range = await tap(R, s.id, good, 3);
  const half = await tap(R, s.id, good, 1.5);
  say(badRead.code === 400 && badSid.code === 400 && noSid.code === 404 && range.code === 400 && half.code === 400,
    'a bad token in a read, a bad signal id, an unknown one and a choice that is not there are refused  (' + [badRead, badSid, noSid, range, half].map((x) => x.code).join(', ') + ')');
}

/* ------------------------------------------------------------------ counts stay hidden until the close */

{
  // August decided it on 2026-11-25, in his words: "yes do that counts always stay hidden until it closes for
  // everyone." Ten devices answer from ten networks, and while the signal is open no answer carries a count or how
  // many answered: no tap, no read with a token, no read without one, and no room list.
  const R = await room();
  const s = (await open(R, { choices: ['Yes', 'No'], days: 1 })).body.signal;
  const devs = Array.from({ length: 10 }, (_, i) => ({ t: tokenOf(device(), s.id), ip: '10.81.' + (i + 1) + '.1', c: i < 7 ? 0 : 1 }));
  const taps = [];
  for (const d of devs) taps.push(await tap(R, s.id, d.t, d.c, d.ip));
  const reads = [];
  for (const d of devs) reads.push(await read(R, { [s.id]: d.t }, d.ip));
  const all = await read(R, { [s.id]: devs[9].t }, '10.81.99.1');
  const none = await read(R, {}, '10.81.99.2');
  const listed = await list(R, '10.81.99.3');
  const open10 = [...taps, ...reads, all, none, listed];
  say(open10.every((x) => x.code === 200) && !open10.some((x) => numbers(x.body)),
    'ten devices on ten networks: while it is open, none of ' + open10.length + ' answers carries a count or how many answered');
  say(taps.every((x, i) => keysOf(x.body.signal) === HELD && x.body.signal.mine === devs[i].c && x.body.note === WORDS.held)
    && reads.every((x, i) => keysOf(rowOf(x, s.id)) === HELD && rowOf(x, s.id).mine === devs[i].c),
    'each of the ten gets back only its own choice and the held line');
  // after the close: everyone, with a token and without one
  const closedNone = rowOf(await at(DAY + 1000, read)(R, {}, '10.81.99.4'), s.id);
  const closedOne = rowOf(await at(DAY + 1000, read)(R, { [s.id]: devs[8].t }, devs[8].ip), s.id);
  const closedList = rowOf(await at(DAY + 1000, list)(R, '10.81.99.5'), s.id);
  say(closedNone && keysOf(closedNone) === CLOSED_PLAIN && closedNone.counts.join(',') === '7,3' && closedNone.answered === 10,
    'the control: after the close a read with no token carries the counts and how many answered  (' + (closedNone && closedNone.counts.join(',')) + ', ' + (closedNone && closedNone.answered) + ')');
  say(closedOne && keysOf(closedOne) === CLOSED_MINE && closedOne.counts.join(',') === '7,3' && closedOne.answered === 10 && closedOne.mine === 1,
    'and a read with a token carries the same counts and that device\'s own choice');
  say(closedList && closedList.closed === true && !numbers(closedList), 'the room list says it has closed and carries no counts, as before');
  // the words people read say the same
  const privacy = fs.readFileSync(path.join(root, 'privacy.html'), 'utf8');
  const guide = fs.readFileSync(path.join(root, 'docs/guides/your-paxts.md'), 'utf8').replace(/\s+/g, ' ');
  say(/counts show to everyone only when the signal closes/i.test(privacy) && /counts show to everyone only when it closes/i.test(guide)
    && ![privacy, guide, fs.readFileSync(path.join(root, 'api/signal.js'), 'utf8')].some((t) => /three (different )?networks|two networks/.test(t)),
    'the privacy page and the guide say counts show to everyone only at the close, and nothing still describes the old rule about networks');
  say(/500 to 749 answers/.test(privacy) && /fills an open signal with answers of their own/.test(privacy),
    'the privacy page says a signal\'s limit is its own, so filling it tells little about how many answered before');
  // two sentences run together ("choice.The") read as one word on the page
  const seen = privacy.replace(/<[^>]+>/g, ' ');
  const joined = seen.match(/[a-z]{2}[.?!][A-Z][a-z]/g) || [];
  say(!joined.length && /[a-z]{2}[.?!][A-Z][a-z]/.test('the choice.The daily'),
    'every sentence on the privacy page ends before the next begins  (' + (joined.join(', ') || 'none run together') + ')');
  // three people on one home network: the counts wait for the close, and then everyone sees them
  const R2 = await room();
  const s2 = (await open(R2, { choices: ['Yes', 'No'], days: 1 })).body.signal;
  const home = '10.81.1.1';
  const homeTaps = [];
  for (const choice of [0, 0, 1]) homeTaps.push(await tap(R2, s2.id, tokenOf(device(), s2.id), choice, home));
  const closed = rowOf(await at(DAY + 1000, read)(R2, {}), s2.id);
  say(homeTaps.every((x) => x.code === 200 && keysOf(x.body.signal) === HELD) && closed && closed.counts.join(',') === '2,1',
    'three devices on one home network see the counts when it closes, not before  (' + (closed && closed.counts.join(',')) + ')');
}

/* ------------------------------------------------------------------ a closed signal's totals are kept once */

{
  const R = await room();
  const s = (await open(R, { choices: ['Yes', 'No'], days: 1 })).body.signal;
  for (const c of [0, 0, 1]) await tap(R, s.id, tokenOf(device(), s.id), c);
  const tallies = () => [...MEM.keys()].filter((k) => k.includes('/signal/_tally/'));
  const was = tallies().length;
  const early = rowOf(await at(DAY + 10000, read)(R, {}), s.id);
  say(early && early.counts.join(',') === '2,1' && tallies().length === was,
    'in the first minute after the close the counts come from the taps, and no totals are kept yet');
  const settled = rowOf(await at(2 * DAY, read)(R, {}), s.id);
  const kept = tallies().some((k) => MEM.get(k) === JSON.stringify({ counts: [2, 1], answered: 3 }));
  say(settled && settled.counts.join(',') === '2,1' && tallies().length === was + 1 && kept,
    'once the store has settled, the totals are written once, keeping only the counts and how many answered');
  const tapDir = 'gratus/preview/signal/' + hm('signal-taps·' + R + '·' + s.id) + '/';
  for (const k of [...MEM.keys()]) if (k.startsWith(tapDir)) MEM.delete(k);
  const again = rowOf(await at(3 * DAY, read)(R, {}), s.id);
  say(again && again.counts.join(',') === '2,1' && again.answered === 3,
    'the control: with the tap blobs gone, a later read still gives the totals, so it read them from the kept blob');
}

/* ------------------------------------------------------------------ twenty taps in the same moment */

{
  const R = await room();
  const s = (await open(R, { choices: ['Yes', 'No'], days: 3 })).body.signal;
  const devs = Array.from({ length: 20 }, () => device());
  const rs = await Promise.all(devs.map((d, i) => tap(R, s.id, tokenOf(d, s.id), i % 2, '10.77.0.1')));
  const seen = rowOf(await read(R, { [s.id]: tokenOf(devs[0], s.id) }, '10.77.0.1'), s.id);
  const after = rowOf(await at(4 * DAY, read)(R, {}), s.id);
  say(rs.every((r) => r.code === 200) && seen && seen.mine === 0 && !numbers(seen) && after.answered === 20 && after.counts.join(',') === '10,10',
    'twenty taps sent at once are all counted, and the counts show at the close  (' + (after && after.answered) + ' of 20, ' + (after && after.counts.join(',')) + ')');
}

/* ------------------------------------------------------------------ the limits on taps */

{
  const R = await room();
  const s = (await open(R, { choices: ['Yes', 'No'], days: 7 })).body.signal;
  const ip = '10.78.0.1';
  const codes = new Set();
  for (let i = 0; i < 200; i++) codes.add((await tap(R, s.id, tokenOf(device(), s.id), 0, ip)).code);
  const over = await tap(R, s.id, tokenOf(device(), s.id), 0, ip);
  const other = await tap(R, s.id, tokenOf(device(), s.id), 0, '10.78.0.2');
  say(LIMITS.CAP_TAP_CALLER === 200 && codes.size === 1 && codes.has(200) && over.code === 429 && other.code === 200,
    'one connection sends 200 taps in a day and the next answers 429; another connection is answered  (' + over.code + ', ' + other.code + ')');
  const last = device();
  const cap = capOf(R, s.id);
  // 201 are in; cap - 202 more make cap - 1, and `last` is the one that fills it
  for (let i = 0; i < cap - 202; i++) await tap(R, s.id, tokenOf(device(), s.id), 1);
  const atCap = await tap(R, s.id, tokenOf(last, s.id), 1);
  const overCap = await tap(R, s.id, tokenOf(device(), s.id), 1);
  const change = await tap(R, s.id, tokenOf(last, s.id), 0);
  const closed = rowOf(await at(8 * DAY, read)(R, {}), s.id);
  say(atCap.code === 200 && overCap.code === 409 && closed && closed.answered === cap,
    'a signal holds its own number of devices, here ' + cap + ', and the next is refused  (' + atCap.code + ', ' + overCap.code + '; ' + (closed && closed.answered) + ' at the close)');
  say(change.code === 200 && change.body.signal.mine === 0 && closed && closed.counts.join(',') === '202,' + (cap - 202),
    'the control: a device already counted can still change its tap, and is still counted once  (' + change.code + ', ' + (closed && closed.counts.join(',')) + ')');
}

{
  // Someone who fills an open signal with answers of their own cannot read off how many answered before them.
  // Seven devices answer; then fresh tokens from fresh networks tap until the signal is full. Were the limit the
  // same for every signal, the limit minus their successes would be the seven. Each signal's limit is its own,
  // 500 to 749, worked out from the secret, and the refusal names no number.
  const R = await room();
  let s = null;
  // a signal whose limit is not 500, so the old reading (500 minus successes) is wrong on this one
  for (let i = 0; i < 3 && (!s || capOf(R, s.id) === LIMITS.CAP_TAPS); i++) s = (await open(R, { choices: ['Yes', 'No'], days: 7 })).body.signal;
  const cap = capOf(R, s.id);
  for (let i = 0; i < 7; i++) await tap(R, s.id, tokenOf(device(), s.id), i % 2);
  let took = 0, full = null;
  for (let i = 0; i < 800 && !full; i++) {
    const r = await tap(R, s.id, tokenOf(device(), s.id), 0);
    if (r.code === 200) took++; else full = r;
  }
  say(LIMITS.CAP_TAPS === 500 && LIMITS.CAP_TAPS_SPREAD === 250 && took + 7 === cap && cap !== 500 && LIMITS.CAP_TAPS - took !== 7,
    'a probe that fills an open signal takes ' + took + ' seats, so 500 minus that is not the seven who answered; the limit is this signal\'s own  (' + cap + ')');
  say(full && full.code === 409 && !/\d/.test(full.body.error), 'and the refusal names no number  (' + (full && JSON.stringify(full.body)) + ')');
  const caps = Array.from({ length: 40 }, () => capOf(R, randomBytes(12).toString('base64url')));
  say(caps.every((c) => c >= 500 && c < 750) && new Set(caps).size >= 20,
    'the control: across forty signals the limit moves between 500 and 749  (' + new Set(caps).size + ' different)');
}

{
  // the same limits with every call sent in the same moment
  const R = await room();
  const s = (await open(R, { choices: ['Yes', 'No'], days: 7 })).body.signal;
  const t = tally(await Promise.all(Array.from({ length: 450 }, () => tap(R, s.id, tokenOf(device(), s.id), 0, '10.78.1.1'))));
  say(t[200] === 200 && t[429] === 250, '450 taps sent at once from one connection: exactly 200 are kept  (' + JSON.stringify(t) + ')');
  const R2 = await room();
  const s2 = (await open(R2, { choices: ['Yes', 'No'], days: 7 })).body.signal;
  const devs = Array.from({ length: 800 }, () => device());
  const rs = await Promise.all(devs.map((d) => tap(R2, s2.id, tokenOf(d, s2.id), 1)));
  const t2 = tally(rs);
  const inside = devs.find((d, i) => rs[i].code === 200);
  const seen = rowOf(await read(R2, { [s2.id]: tokenOf(inside, s2.id) }), s2.id);
  const change = await tap(R2, s2.id, tokenOf(inside, s2.id), 0);
  const closed = rowOf(await at(8 * DAY, read)(R2, {}), s2.id);
  const cap2 = capOf(R2, s2.id);
  say(t2[200] === cap2 && t2[409] === 800 - cap2 && seen && seen.mine === 1 && closed && closed.answered === cap2,
    '800 taps sent at once to one signal: exactly its limit of ' + cap2 + ' devices are kept  (' + JSON.stringify(t2) + ', ' + (closed && closed.answered) + ' at the close)');
  say(change.code === 200 && change.body.signal.mine === 0 && closed && closed.counts.join(',') === '1,' + (cap2 - 1),
    'the control: a device inside the limit can still change its tap  (' + change.code + ', ' + (closed && closed.counts.join(',')) + ')');
}

{
  const calls = [...MEM.keys()].filter((k) => k.includes('/signal/_calls/'));
  say(calls.length > 0 && !calls.some((k) => /10\.\d+\.\d+\.\d+/.test(k + ' ' + MEM.get(k))) && calls.every((k) => /\/_calls\/\d{4}-\d{2}-\d{2}\/[0-9a-f]{32}\/\d+\.json$/.test(k)),
    'the day\'s markers are keyed names holding no address  (' + calls.length + ')');
}

/* ------------------------------------------------------------------ the limit on reads */

{
  const R = await room();
  await open(R);
  const ip = '10.79.0.1';
  const rs = await Promise.all([...Array.from({ length: 300 }, () => list(R, ip)), ...Array.from({ length: 350 }, () => read(R, {}, ip))]);
  const t = tally(rs);
  const other = await list(R, '10.79.0.2');
  say(LIMITS.CAP_READ_CALLER === 600 && t[200] === 600 && t[429] === 50 && other.code === 200,
    '650 room lists and reads sent at once from one connection: exactly 600 are answered; another connection is answered  (' + JSON.stringify(t) + ', ' + other.code + ')');
}

/* ------------------------------------------------------------------ what the store keeps */

{
  const taps = [...MEM.keys()].filter((k) => k.includes('/signal/') && !k.includes('/s/') && !k.includes('/signal/_'));
  const shapes = new Set(taps.map((k) => Object.keys(JSON.parse(MEM.get(k))).sort().join(',')));
  say(taps.length > 0 && shapes.size === 1 && shapes.has('c'), 'a tap blob keeps the choice and nothing else, not even a time  (' + taps.length + ' taps)');
  const sigs = [...MEM.keys()].filter((k) => k.includes('/signal/') && k.includes('/s/'));
  const sShapes = new Set(sigs.map((k) => Object.keys(JSON.parse(MEM.get(k))).sort().join(',')));
  say(sigs.length > 0 && sShapes.size === 1 && sShapes.has('choices,closes,id,opens,q'), 'a signal blob keeps the question, the choices, its id and its times');
  const markers = [...MEM.keys()].filter((k) => /\/signal\/_(slots|seats|calls)\//.test(k));
  const mShapes = new Set(markers.map((k) => Object.keys(JSON.parse(MEM.get(k))).sort().join(',')));
  say(markers.length > 0 && [...mShapes].every((x) => x === '' || x === 'closes'), 'a limit marker keeps nothing, or a closing time  (' + markers.length + ' markers)');
  const kinds = new Set([...MEM.keys()].filter((k) => k.includes('/signal/_')).map((k) => /\/signal\/(_[a-z]+)\//.exec(k)[1]));
  say([...kinds].every((x) => ['_slots', '_seats', '_calls', '_tally'].includes(x)),
    'the store holds no note of which networks answered, only the limit markers and the kept totals  (' + [...kinds].sort().join(', ') + ')');
  const ids = sigs.map((k) => JSON.parse(MEM.get(k)).id);
  const keys = [...MEM.keys()];
  const leaky = keys.filter((k) => k.includes('/signal/') && (ids.some((i) => k.includes(i)) || CODES.some((c) => k.includes(c)) || TOKENS.some((t) => k.includes(t))));
  say(!leaky.length, 'no signal path holds a room code, a signal id or a token');
}

/* ------------------------------------------------------------------ a room's PAXTs */

{
  const R = await room();
  for (const id of ['tea-on-sundays', ...Array.from({ length: 12 }, (_, i) => 'paxt-number-' + (i + 2))]) seedPaxt(id);
  const first = await attach(R, 'tea-on-sundays');
  say(first.code === 200 && first.body.vibe.paxts.join(',') === 'tea-on-sundays', 'a PAXT is attached to a room  (' + first.code + ')');
  const g = await call(vibes, get({ code: R }));
  say(g.code === 200 && g.body.vibe.paxts.join(',') === 'tea-on-sundays', 'and the room lists it, by id only');
  const again = await attach(R, 'tea-on-sundays');
  const dir = (code) => 'gratus/preview/vibe-paxt/' + hm('vibe-paxt·' + code) + '/';
  const blobs = () => [...MEM.keys()].filter((k) => k.startsWith(dir(R)));
  say(again.code === 200 && again.body.vibe.paxts.length === 1 && blobs().length === 1, 'the same PAXT attached twice is kept once  (' + blobs().length + ' blob)');
  const codes = [];
  for (let i = 2; i <= 12; i++) codes.push((await attach(R, 'paxt-number-' + i)).code);
  const thirteen = await attach(R, 'paxt-number-13');
  const full = await call(vibes, get({ code: R }));
  say(codes.every((c) => c === 200) && thirteen.code === 409 && full.body.vibe.paxts.length === 12 && full.body.vibe.paxts.includes('tea-on-sundays') && !full.body.vibe.paxts.includes('paxt-number-13'),
    'a room holds 12 PAXTs, all listed, and the 13th is refused  (' + thirteen.code + ')');
  const kept = await attach(R, 'paxt-number-5');
  const R2 = await room();
  const elsewhere = await attach(R2, 'paxt-number-13');
  say(kept.code === 200 && kept.body.already === true && elsewhere.code === 200,
    'the control: a full room still answers a PAXT it holds, and the 13th attaches to another room  (' + kept.code + ', ' + elsewhere.code + ')');

  // the keeper takes a link down, and the place it held opens again
  const wrong = await detach(R, 'paxt-number-5', 'not-the-keeper');
  const right = await detach(R, 'paxt-number-5', KEEPERS.get(R));
  const listed = await call(vibes, get({ code: R }));
  const now13 = await attach(R, 'paxt-number-13');
  say(wrong.code === 403 && right.code === 200 && listed.body.vibe.paxts.length === 11 && !listed.body.vibe.paxts.includes('paxt-number-5') && now13.code === 200,
    'a wrong keeper key cannot take a link down; the keeper can, and the 13th then fits  (' + [wrong.code, right.code, now13.code].join(', ') + ')');

  const bad = ['Not An Id', 'a', '-abc', 'abc-', 'x'.repeat(41), 'abc/../x', 123, ''];
  const badCodes = [];
  for (const id of bad) badCodes.push((await attach(R2, id)).code);
  seedPaxt('abc');
  const okId = await attach(R2, 'abc');
  say(badCodes.every((c) => c === 400) && okId.code === 200, 'a bad id is refused, and the control attaches  (' + badCodes.join(',') + '; ' + okId.code + ')');
  const unknown = await attach(R2, 'no-such-paxt');
  const g2 = await call(vibes, get({ code: R2 }));
  seedPaxt('no-such-paxt');
  const known = await attach(R2, 'no-such-paxt');
  say(unknown.code === 404 && !g2.body.vibe.paxts.includes('no-such-paxt') && known.code === 200,
    'an id with no PAXT behind it is refused; the control: once that PAXT exists it attaches  (' + unknown.code + ', ' + known.code + ')');
  const ghost = await attach('ZZZZZZ', 'tea-on-sundays');
  say(ghost.code === 404, 'a room nobody made takes no PAXT  (' + ghost.code + ')');
}

{
  // thirty attaches sent in the same moment, every id a real PAXT
  const R = await room();
  const ids = Array.from({ length: 30 }, (_, i) => 'sent-together-' + i);
  ids.forEach((id) => seedPaxt(id));
  const t = tally(await Promise.all(ids.map((id) => attach(R, id))));
  const g = await call(vibes, get({ code: R }));
  say(t[200] === 12 && t[409] === 18 && g.body.vibe.paxts.length === 12,
    'thirty attaches sent at once: twelve are kept and eighteen refused  (' + JSON.stringify(t) + ', ' + g.body.vibe.paxts.length + ' listed)');
  const made = Array.from({ length: 30 }, (_, i) => 'made-up-' + i);
  const R2 = await room();
  const t2 = tally(await Promise.all(made.map((id) => attach(R2, id))));
  const g2 = await call(vibes, get({ code: R2 }));
  say(t2[404] === 30 && g2.body.vibe.paxts.length === 0, 'thirty made-up ids sent at once are all refused, and the room lists none  (' + JSON.stringify(t2) + ')');
  // the same PAXT sent ten times at once: one link, and the other calls give their places back
  const R3 = await room();
  seedPaxt('one-of-ten');
  const t3 = tally(await Promise.all(Array.from({ length: 10 }, () => attach(R3, 'one-of-ten'))));
  const places = [...MEM.keys()].filter((k) => k.startsWith('gratus/preview/vibe-paxt/_slots/' + hm('vibe-paxt-slots·' + R3) + '/'));
  const links = [...MEM.keys()].filter((k) => k.startsWith('gratus/preview/vibe-paxt/' + hm('vibe-paxt·' + R3) + '/'));
  say(t3[200] === 10 && places.length === 1 && links.length === 1, 'the same PAXT sent ten times at once is one link holding one place  (' + places.length + ' place, ' + links.length + ' link)');
  // one connection tries twelve times in a day, the refused tries too
  const ip = '10.80.0.1';
  const R4 = await room();
  const mine = Array.from({ length: 11 }, (_, i) => 'from-one-net-' + i);
  mine.forEach((id) => seedPaxt(id));
  const codes = [];
  for (const id of mine) codes.push((await attach(R4, id, ip)).code);
  codes.push((await attach(R4, 'not-a-real-one', ip)).code);
  const over = await attach(await room(), mine[0], ip);
  const other = await attach(await room(), mine[0], '10.80.0.2');
  say(codes.slice(0, 11).every((c) => c === 200) && codes[11] === 404 && over.code === 429 && other.code === 200,
    'one connection gets twelve tries a day, a refused one counted too, and the thirteenth answers 429; another connection attaches  (' + over.code + ', ' + other.code + ')');
  // an IPv6 home or phone holds a whole /64, so twelve addresses inside one /64 share one connection's twelve tries
  const R5 = await room();
  const six = Array.from({ length: 12 }, (_, i) => 'from-one-64-' + i);
  six.forEach((id) => seedPaxt(id));
  const sixCodes = [];
  for (let i = 0; i < 12; i++) sixCodes.push((await attach(R5, six[i], '2001:db8:9:9::' + (i + 1).toString(16))).code);
  const sixOver = await attach(await room(), six[0], '2001:db8:9:9:ffff::d');
  const sixOther = await attach(await room(), six[0], '2001:db8:9:a::1');
  say(sixCodes.every((c) => c === 200) && sixOver.code === 429 && sixOther.code === 200,
    'twelve addresses in one IPv6 /64 share one connection\'s twelve tries, and a thirteenth address there answers 429; another /64 attaches  (' + sixOver.code + ', ' + sixOther.code + ')');
  const linkKeys = [...MEM.keys()].filter((k) => k.includes('/vibe-paxt/'));
  say(linkKeys.length > 0 && !linkKeys.some((k) => CODES.some((c) => k.includes(c)) || /tea-on-sundays|paxt-number|sent-together|from-one-net|10\.\d+\.\d+/.test(k)),
    'no link path holds a room code, a PAXT id or an address');
  const posted = await call(vibes, post({ act: 'post', code: R, text: 'glad of the tea', name: 'Ana' }));
  say(posted.code === 200 && JSON.parse(MEM.get('gratus/vibes/' + R + '.json')).posts.length === 1,
    'posting in the room still works and lands where it always did');
}

/* ------------------------------------------------------------------ previews never write into live data */

{
  const made = (fn) => async () => { const was = new Set(MEM.keys()); await fn(); return [...MEM.keys()].filter((k) => !was.has(k)); };
  const R = await room();
  seedPaxt('a-preview-walk');
  seedPaxt('a-preview-walk', 'gratus/');
  const walk = async () => {
    const s = (await open(R, { choices: ['Yes', 'No'], days: 1 })).body.signal;
    await tap(R, s.id, tokenOf(device(), s.id), 0);
    await attach(R, 'a-preview-walk');
    return s;
  };
  process.env.VERCEL_ENV = 'preview';
  let s1;
  const prev = await made(async () => { s1 = await walk(); })();
  process.env.VERCEL_ENV = 'production';
  const liveList = await list(R);
  const liveRoom = await call(vibes, get({ code: R }));
  let s2;
  const live = await made(async () => { s2 = await walk(); })();
  delete process.env.VERCEL_ENV;
  const prevList = await list(R);
  const ours = (ks) => ks.filter((k) => k.includes('signal/') || k.includes('vibe-paxt/'));
  say(ours(prev).length >= 3 && ours(prev).every((k) => k.startsWith('gratus/preview/')),
    'under VERCEL_ENV=preview every signal, tap, link and marker lands under gratus/preview/  (' + ours(prev).length + ' writes)');
  say(ours(live).length >= 3 && ours(live).every((k) => !k.startsWith('gratus/preview/') && (k.startsWith('gratus/signal/') || k.startsWith('gratus/vibe-paxt/'))),
    'the control: under production the same walk lands outside it  (' + ours(live).length + ' writes)');
  say(liveList.body.signals.length === 0 && liveRoom.body.vibe.paxts.length === 0 && prevList.body.signals.some((x) => x.id === s1.id) && !prevList.body.signals.some((x) => x.id === s2.id),
    'and production never reads what a preview wrote, nor a preview what production wrote');
}

/* ------------------------------------------------------------------ a room links the PAXT api/paxt.js keeps */

{
  // The real PAXT handler opens the PAXT, in each environment, and the room links it only where it was opened.
  // api/vibes.js asks api/paxt.js where a record lives (paxtKey), so the two cannot name different paths.
  const PX = await import(pathToFileURL(path.join(root, 'api/paxt.js')).href);
  const N = await import(pathToFileURL(path.join(root, 'engine/paxt.js')).href);
  const doc = (id) => N.template({ id, title: 'Tea on Sundays', threshold: 2, opens: new Date(Date.now() - 60000), closes: new Date(Date.now() + 7 * DAY),
    body: 'Intent: a promise between us, kept by choice. It is not a contract and it moves no money.\n\nWe meet for tea.' });
  const openPaxt = (id) => call(PX.default, post({ act: 'open', doc: doc(id) }));
  delete process.env.VERCEL_ENV;
  const RP = await room();
  const p1 = await openPaxt('opened-in-a-preview');
  const a1 = await attach(RP, 'opened-in-a-preview');
  const prevKey = PX.paxtKey('opened-in-a-preview');
  process.env.VERCEL_ENV = 'production';
  const RL = await room();
  const notLive = await attach(RL, 'opened-in-a-preview');
  const p2 = await openPaxt('opened-live');
  const a2 = await attach(RL, 'opened-live');
  const liveKey = PX.paxtKey('opened-live');
  delete process.env.VERCEL_ENV;
  const notPrev = await attach(RP, 'opened-live');
  say(p1.code === 200 && a1.code === 200 && p2.code === 200 && a2.code === 200,
    'a PAXT opened through api/paxt.js links to a room in a preview and in production  (' + [p1.code, a1.code, p2.code, a2.code].join(', ') + ')');
  say(notLive.code === 404 && notPrev.code === 404,
    'a PAXT opened in a preview is not found by a live room, nor a live one by a preview room  (' + notLive.code + ', ' + notPrev.code + ')');
  say(typeof PX.paxtKey === 'function' && prevKey.startsWith('gratus/preview/paxt/') && MEM.has(prevKey) && liveKey.startsWith('gratus/paxt/') && MEM.has(liveKey),
    'paxtKey names the path api/paxt.js wrote, under gratus/preview/ off production and gratus/ in production');
  const vsrc = fs.readFileSync(path.join(root, 'api/vibes.js'), 'utf8');
  say(/import \{ paxtKey(, netOf)? \} from '\.\/paxt\.js';/.test(vsrc) && !/[(\s]'paxt(\\u00b7|·)'/.test(vsrc) && !/'gratus\/paxt\//.test(vsrc),
    'api/vibes.js takes the record path from api/paxt.js and keeps no copy of it');
}

/* ------------------------------------------------------------------ the room's block meets the server */

{
  // The browser's block (assets/js/signal.js) against real answers from this handler: the token it makes with
  // WebCrypto is one the server takes, an open signal renders no number and shows the server's own line, and
  // counts render only once the signal has closed.
  const B = await import(pathToFileURL(path.join(root, 'assets/js/signal.js')).href);
  const R = await room();
  const s = (await open(R, { choices: ['Yes', 'No'], days: 1 })).body.signal;
  const toks = [];
  for (let i = 0; i < 3; i++) { const t = await B.tokenFor(new Uint8Array(randomBytes(32)), s.id); TOKENS.push(t); toks.push(t); }
  const a = await tap(R, s.id, toks[0], 0);
  const held = B.blockHtml({ signals: [a.body.signal], held: a.body.note, note: WORDS.room });
  say(toks.every(SIG.tokenOk) && a.code === 200, 'a token the block makes with WebCrypto is one the server takes  (' + a.code + ')');
  say(B.HELD_LINE === WORDS.held && a.body.note === WORDS.held && held.includes(WORDS.held) && !held.includes('signal-counts'),
    'with one device answered the block shows the server\'s held line and no count, and its own fallback line is the server\'s word for word');
  await tap(R, s.id, toks[1], 1);
  const c = await tap(R, s.id, toks[2], 1);
  const third = B.blockHtml({ signals: [c.body.signal], held: c.body.note, note: WORDS.room });
  say(!numbers(c.body) && !third.includes('signal-counts') && !/device/.test(third) && third.includes(B.TAP_LINE) && third.includes(WORDS.held),
    'with three answered the block still shows no number: only that this device answered and can change it, and the held line');
  const none = await read(R, {});
  const plain = B.blockHtml({ signals: none.body.signals, note: none.body.note });
  say(!plain.includes('signal-counts') && plain.split(WORDS.room).length === 2,
    'the control: a device that has not answered renders no count, and the room line once  (' + keysOf(rowOf(none, s.id)) + ')');
  const after = await at(DAY + 1000, read)(R, {});
  const closed = B.blockHtml({ signals: after.body.signals, note: after.body.note });
  say(closed.includes(B.CLOSED_LINE) && closed.includes('signal-counts') && closed.includes('3 devices answered. ' + B.MANY_LINE) && !closed.includes('data-sg-c='),
    'after the close the block shows everyone the counts, how many devices answered, and that one person can answer from more than one device, and offers nothing to tap');
  // galaxy.js loads the block and the PAXT strip with import() when a room opens, so the journal does not load them
  const gsrc = fs.readFileSync(path.join(root, 'assets/js/galaxy.js'), 'utf8');
  const statics = gsrc.split('\n').filter((l) => /^\s*import\s/.test(l) && /(signal|pact)\.js/.test(l));
  say(!statics.length && gsrc.split("import('./signal.js").length === 2 && gsrc.split("import('./pact.js").length === 2,
    'galaxy.js names signal.js and pact.js only in one import() each, so the journal never loads them  (' + statics.length + ' static)');
}

/* ------------------------------------------------------------------ a signal the store fails to keep */

{
  // The store takes the room's place for a new signal, then fails to write the signal itself. The place goes back,
  // so the room still has its three.
  const R = await room();
  __failPut((k) => k.includes('/s/'));
  const broke = await open(R, { days: 7 });
  __failPut(null);
  const three = [await open(R, { days: 7 }), await open(R, { days: 7 }), await open(R, { days: 7 })];
  const fourth = await open(R, { days: 7 });
  say(broke.code === 500 && three.every((x) => x.code === 200) && fourth.code === 409,
    'a signal the store fails to write gives its place back: the room then takes three more and refuses a fourth  (' + broke.code + '; ' + three.map((x) => x.code).join(', ') + '; ' + fourth.code + ')');
}

/* ------------------------------------------------------------------ the answer when the store fails */

const BROKE = [];
{
  const R = await room();
  const ctl = [await list(R), await read(R, {})];
  // a blob that is not JSON, at a real signal path; the parse error quotes the start of it, which is the path
  const sid = 'BrokenSignal0001';
  const closes = Date.now() + DAY;
  const at_ = 'gratus/preview/signal/' + hm('signal-room·' + R) + '/s/' + closes + '-' + hm('signal·' + R + '·' + sid) + '.json';
  MEM.set(at_, at_);
  BROKE.push(await list(R), await read(R, {}));
  MEM.delete(at_);
  say(ctl.every((x) => x.code === 200) && BROKE.every((x) => x.code === 500 && keysOf(x.body) === 'error'),
    'a store that answers with a broken blob gets a 500 that carries only an error line; the control: the same room without it answers 200  ('
    + BROKE.map((x) => x.code).join(', ') + '; ' + ctl.map((x) => x.code).join(', ') + ')');
}

/* ------------------------------------------------------------------ what no answer carries */

{
  const hashes = [...IPS].map((ip) => createHash('sha256').update(SIG.netOf(ip) + '·' + SALT).digest('hex').slice(0, 16))
    .concat([...IPS].map((ip) => createHash('sha256').update(ip + '·' + SALT).digest('hex').slice(0, 16)));
  const segments = new Set([...MEM.keys()].filter((k) => k.includes('signal/') || k.includes('vibe-paxt/'))
    .flatMap((k) => k.split(/[/.-]/)).filter((p) => /^[0-9a-f]{32}$/.test(p)));
  const leaks = (text) => {
    const out = [];
    if (text.includes(SALT)) out.push('the salt');
    if (/gratus\//.test(text)) out.push('a path');
    if (TOKENS.some((t) => text.includes(t))) out.push('a token');
    if (hashes.some((h) => text.includes(h))) out.push('a caller hash');
    if ([...segments].some((s) => text.includes(s))) out.push('a keyed name');
    return out;
  };
  const said = SEEN.join('\n');
  const found = leaks(said);
  say(!found.length, 'no answer carries a caller hash, a token, a store path or the salt  (' + SEEN.length + ' answers read' + (found.length ? '; found ' + found.join(', ') : '') + ')');
  const broke = leaks(BROKE.map((x) => JSON.stringify(x.body)).join('\n'));
  say(BROKE.length === 2 && !broke.length, 'the error answers carry none of them either' + (broke.length ? '  (found ' + broke.join(', ') + ')' : ''));
  const anyKey = [...MEM.keys()].find((k) => k.includes('/signal/') && !k.includes('_calls'));
  const ctl = leaks('x ' + TOKENS[0]).length && leaks('x ' + anyKey).length && leaks('x ' + [...segments][0]).length && leaks('x ' + hashes[0]).length;
  say(!!ctl, 'the control: the same check finds a token, a path, a keyed name and a caller hash when one is put in');
}

/* ------------------------------------------------------------------ a day's call markers last a day */

{
  // A day's markers sit beside each tap, so kept for good they would tie one network's answers together across
  // days. The first call of a later day deletes them, and the page people read says what they could show.
  const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10);
  const callsRoot = 'gratus/preview/signal/_calls/';
  const before = [...MEM.keys()].filter((k) => k.startsWith(callsRoot + dayOf(realNow()) + '/')).length;
  const R = await at(DAY, room)();
  const later = await at(DAY, list)(R);
  const left = [...MEM.keys()].filter((k) => k.startsWith(callsRoot) && k.slice(callsRoot.length, callsRoot.length + 10) < dayOf(realNow() + DAY));
  const kept = [...MEM.keys()].filter((k) => k.startsWith(callsRoot + dayOf(realNow() + DAY) + '/'));
  say(before > 0 && later.code === 200 && left.length === 0 && kept.length >= 1,
    'the first call of a later day deletes every earlier day\'s call markers and keeps its own  (' + before + ' from today, ' + left.length + ' left)');
  // a try at adding a PAXT to a room is written beside the room's link, so its marker lasts a day too
  const attachRoot = 'gratus/preview/vibe-paxt/_calls/';
  const AR = await room();
  seedPaxt('markers-link-one');
  const aip = fresh();
  const a0 = await attach(AR, 'markers-link-one', aip);
  const a1 = await at(DAY, attach)(AR, 'markers-link-one', aip);
  const aOld = [...MEM.keys()].filter((k) => k.startsWith(attachRoot) && k.slice(attachRoot.length, attachRoot.length + 10) < dayOf(realNow() + DAY)).length;
  const aNew = [...MEM.keys()].filter((k) => k.startsWith(attachRoot + dayOf(realNow() + DAY) + '/')).length;
  say(a0.code === 200 && a1.code === 200 && aOld === 0 && aNew >= 1,
    'the tries at adding a PAXT to a room go the same way: the first try of a later day deletes every earlier day\'s  (' + aOld + ' left, ' + aNew + ' of the new day)');
  // a busy day, through a store that answers a thousand at a time: the first call is not held up, and the rest go
  __page(1000);
  const busy = dayOf(realNow() + 30 * DAY), next = dayOf(realNow() + 31 * DAY);
  for (let i = 0; i < 25000; i++) MEM.set(callsRoot + busy + '/' + String(i % 40).padStart(32, '0') + '/' + i + '.json', '{}');
  const busyLeft = () => [...MEM.keys()].filter((k) => k.startsWith(callsRoot + busy + '/')).length;
  const was = __COUNT.list;
  const firstLater = await at(31 * DAY, list)(R);
  const lists = __COUNT.list - was;
  let calls = 1;
  while (busyLeft() && calls < 10) { await at(31 * DAY, list)(R); calls++; }
  say(firstLater.code === 200 && lists <= 12 && busyLeft() === 0,
    'after a day of 25,000 markers, the first call of the next day makes ' + lists + ' lists of the store, and the calls after it delete the rest  (' + calls + ' calls, ' + busyLeft() + ' left)');
  __page(null);
  const privacy = fs.readFileSync(path.join(root, 'privacy.html'), 'utf8').replace(/\s+/g, ' ');
  const guide = fs.readFileSync(path.join(root, 'docs/guides/what-leaves-your-device.md'), 'utf8').replace(/\s+/g, ' ');
  const client = fs.readFileSync(path.join(root, 'assets/js/signal.js'), 'utf8');
  say(!/ties your answers on different signals together|names no signal and no choice/.test(privacy) && /one network's markers for a day share a name/.test(privacy)
    && /Markers from earlier days are deleted/.test(privacy) && /tokens for that room together/.test(privacy)
    && /Each try at adding a PAXT to a room leaves a marker for that day's limit[^<]*markers from earlier days are deleted/.test(privacy),
    'the privacy page says what the day\'s markers could tie together, that a read sends a device\'s tokens together, when markers go, and that adding a PAXT to a room leaves one too');
  say(!/Counts only, never who chose what/.test(guide) && /final counts can show how someone chose/.test(guide) && /Markers from earlier days are deleted/.test(guide),
    'the guide no longer promises more than the room, and says when the markers go');
  say(!/cannot tie one answer from this device to another/.test(client), 'the block\'s own notes no longer say the server cannot tie one device\'s answers together');
}

console.log('G54 a signal: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
