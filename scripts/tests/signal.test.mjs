// The signal block's pure parts (assets/js/signal.js): the token a device sends, the secret it keeps, and the
// HTML, which shows counts only for a closed signal, as the server sent them, and puts every string through esc().
//   node --test scripts/tests/signal.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac, randomBytes } from 'node:crypto';
import {
  tokenFor, deviceSecret, toB64url, fromB64url, blockHtml, signalHtml, askProblem, askSheetHtml,
  mountSignals, forgetRoom, forgetDevice,
  SECRET_KEY, SHEET_LINE, TAP_LINE, CLOSED_LINE, MANY_LINE, HELD_LINE, MAYBE_LINE, CAP_Q, CAP_CHOICE,
} from '../../assets/js/signal.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TAPPED = 'gratus-signal-tapped';

const SID = 'AbCdEfGhIjKlMn01';
const SID2 = 'zyxwvutsrqponm-_';
const NOW = Date.parse('2026-11-25T12:00:00Z');
const count = (s, part) => s.split(part).length - 1;
// a storage that behaves like localStorage, or one that refuses every call, as a locked-down browser can
const memory = (seed = {}) => { const m = new Map(Object.entries(seed)); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };
const refusing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };

/* ------------------------------------------------------------------ the token */

test('a token is HMAC-SHA256 of the signal id under the device secret, 43 characters of unpadded base64url', async () => {
  const secret = new Uint8Array(randomBytes(32));
  const t = await tokenFor(secret, SID);
  assert.match(t, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(t, createHmac('sha256', Buffer.from(secret)).update(SID).digest('base64url'), 'the same token Node computes');
  const raw = fromB64url(t);
  assert.equal(raw && raw.length, 32, 'it decodes back to 32 bytes, in the one spelling the server accepts');
  assert.equal(toB64url(raw), t);
});

test('one device sends the same token for one signal and a different one for every other signal', async () => {
  const secret = new Uint8Array(randomBytes(32));
  assert.equal(await tokenFor(secret, SID), await tokenFor(secret, SID));
  assert.notEqual(await tokenFor(secret, SID), await tokenFor(secret, SID2));
  assert.notEqual(await tokenFor(secret, SID), await tokenFor(new Uint8Array(randomBytes(32)), SID), 'another device, another token');
});

test('base64url that is padded, standard or not the one spelling of its bytes is not read back', () => {
  const good = toB64url(new Uint8Array(randomBytes(32)));
  assert.ok(fromB64url(good));
  for (const bad of [good + '=', good.replace(/[A-Za-z0-9]/, '+'), 'a', null, 7]) assert.equal(fromB64url(bad), null, String(bad));
});

/* ------------------------------------------------------------------ the secret */

test('the device secret is 32 random bytes, made once and kept under gratus-signal-secret', () => {
  const store = memory();
  const a = deviceSecret(store);
  assert.equal(a.length, 32);
  assert.match(store.getItem(SECRET_KEY), /^[A-Za-z0-9_-]{43}$/);
  assert.deepEqual(deviceSecret(store), a, 'the same secret comes back');
  assert.equal(SECRET_KEY, 'gratus-signal-secret');
});

test('a kept secret that is not 32 bytes is replaced, and storage that refuses gives one secret for the page', () => {
  for (const bad of ['short', toB64url(new Uint8Array(31)), toB64url(new Uint8Array(33)) + '=']) {
    const store = memory({ [SECRET_KEY]: bad });
    const s = deviceSecret(store);
    assert.equal(s.length, 32, bad);
    assert.notEqual(store.getItem(SECRET_KEY), bad);
  }
  const once = deviceSecret(refusing);
  assert.equal(once.length, 32);
  assert.deepEqual(deviceSecret(refusing), once, 'the page keeps answering with the same one');
});

/* ------------------------------------------------------------------ the HTML */

const HOSTILE = '<img src=x onerror=alert(1)>"\'&';
const row = (more = {}) => ({ id: SID, q: 'Tea on Sunday?', choices: ['Yes', 'No', 'Maybe'], opens: '2026-11-25T10:00:00.000Z', closes: '2026-11-28T10:00:00.000Z', closed: false, ...more });

test('hostile text in a question, a choice, the note and the held line comes out escaped', () => {
  const html = blockHtml({ signals: [row({ q: HOSTILE, choices: [HOSTILE, '"><script>x</script>'], mine: 0, counts: [1, 2], answered: 3 })], note: HOSTILE, held: HOSTILE }, NOW);
  assert.ok(!/<img|<script|onerror=alert\(1\)>/.test(html), html);
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;&quot;&#39;&amp;'));
  assert.ok(html.includes('&quot;&gt;&lt;script&gt;'));
  const held = blockHtml({ signals: [row({ mine: 1, answered: 1 })], held: HOSTILE }, NOW);
  assert.ok(!held.includes('<img') && held.includes('&lt;img'), 'the held line too');
});

test('a row with an id that is not a signal id, or with no choices, is left out', () => {
  for (const bad of [row({ id: '"><b>x</b>' }), row({ id: 'short' }), row({ choices: 'Yes' }), null, 'row']) {
    assert.equal(signalHtml(bad, { now: NOW }), '', JSON.stringify(bad));
  }
  assert.notEqual(signalHtml(row(), { now: NOW }), '', 'the control: a good row renders');
});

test('before this device taps, an open signal shows its question, its choices and when it closes, and no count', () => {
  const html = signalHtml(row(), { now: NOW });
  assert.equal(count(html, 'data-sg-c='), 3);
  assert.ok(html.includes('Closes on 28 November at 10:00 UTC.'));
  assert.ok(!html.includes('signal-counts') && !html.includes('answered') && !html.includes(TAP_LINE));
});

test('after a tap on an open signal, the device sees its own choice, that it can change it, and the held line', () => {
  const html = signalHtml(row({ mine: 2 }), { held: 'The server says when counts show.', now: NOW });
  assert.ok(html.includes('aria-pressed="true"') && count(html, 'aria-pressed="true"') === 1);
  assert.ok(html.includes(TAP_LINE) && html.includes('The server says when counts show.'));
  assert.ok(!html.includes('signal-counts'), 'no counts while it is open');
  assert.ok(signalHtml(row({ mine: 0 }), { now: NOW }).includes(HELD_LINE), 'with no line from the server, the plain one');
  assert.equal(HELD_LINE, 'Counts show when the signal closes.');
});

test('an open signal shows no number, even when a row carries counts and how many answered', () => {
  const html = signalHtml(row({ mine: 0, counts: [1, 5, 2], answered: 8 }), { now: NOW });
  assert.ok(!html.includes('signal-counts') && !/device|answered\./.test(html.replace(TAP_LINE, '')), html);
  assert.ok(!/<b>\d+<\/b>/.test(html), 'no count in the markup');
  assert.ok(html.includes(TAP_LINE) && html.includes(HELD_LINE), 'only the tap line and the held line');
  // an open row draws the same whatever counts it carries, so no number gets through, in markup or as plain text
  assert.equal(html, signalHtml(row({ mine: 0 }), { now: NOW }), 'an answered open row does not depend on counts');
  assert.equal(signalHtml(row({ counts: [1, 5, 2], answered: 8 }), { now: NOW }), signalHtml(row(), { now: NOW }), 'nor does an unanswered one');
});

test('once closed, counts show as the server sent them, in the order the choices were written, with how many devices answered', () => {
  const html = signalHtml(row({ closed: true, mine: 0, counts: [1, 5, 2], answered: 8 }), { now: NOW });
  assert.ok(html.includes('signal-counts'));
  const order = [...html.matchAll(/<li[^>]*><span>([^<]*)<\/span><b>(\d+)<\/b><\/li>/g)].map((m) => m[1] + '=' + m[2]);
  assert.deepEqual(order, ['Yes=1', 'No=5', 'Maybe=2'], 'no choice is moved up for having more');
  assert.ok(html.includes('8 devices answered. ' + MANY_LINE));
  assert.ok(signalHtml(row({ closed: true, mine: 0, counts: [1, 0, 0], answered: 1 }), { now: NOW }).includes('1 device answered.'));
  for (const bad of [[1, 2], [1, -1, 0], [1, 1.5, 0], 'three']) {
    assert.ok(!signalHtml(row({ closed: true, mine: 0, counts: bad }), { now: NOW }).includes('signal-counts'), JSON.stringify(bad));
  }
});

test('a closed signal says so, offers no choice to tap, and shows the counts the server sent to everyone', () => {
  const html = signalHtml(row({ closed: true, counts: [3, 1, 0], answered: 4 }), { now: NOW });
  assert.ok(html.includes(CLOSED_LINE) && !html.includes('data-sg-c=') && !html.includes('Closes on'));
  assert.ok(html.includes('4 devices answered.'));
});

test('the room line is said once, from the server when it sent one', () => {
  const server = 'A signal binds no one, and the app shows nobody who chose what.';
  const html = blockHtml({ signals: [row(), row({ id: SID2 })], note: server }, NOW);
  assert.equal(count(html, server), 1);
  assert.equal(count(blockHtml({ signals: [] }, NOW), SHEET_LINE), 1, 'without one, the sheet line stands in, once');
  assert.ok(blockHtml({ signals: [] }, NOW).includes('Nobody has asked this room anything yet.'));
  assert.ok(blockHtml({ failed: true, signals: [] }, NOW).includes('data-sg-retry'));
});

test('the signals sit together in one list inside the room card, each a well of its own and not a second card', () => {
  const html = blockHtml({ signals: [row(), row({ id: SID2 })], note: 'n' }, NOW);
  assert.equal(count(html, 'class="signals"'), 1);
  assert.equal(count(html, 'class="signal"'), 2);
  assert.ok(!html.includes('glass card'), html);
  assert.ok(!blockHtml({ signals: [] }, NOW).includes('class="signals"'), 'no list when there is no signal');
});

test('nothing in the block names a person or counts who has not answered', () => {
  const html = blockHtml({ signals: [row({ mine: 0, counts: [2, 1, 0], answered: 3 }), row({ id: SID2, closed: true, counts: [0, 0, 0], answered: 0 })], note: 'n' }, NOW);
  assert.ok(!/not answered|has not|haven.t|yet to|reminder|winner|won\b|missed|streak|score|rank/i.test(html), html);
});

/* ------------------------------------------------------------------ the sheet */

test('the sheet says what a signal is, and its fields take a text at the limit even when it is all emoji', () => {
  const html = askSheetHtml();
  assert.ok(html.includes(SHEET_LINE));
  assert.equal(count(html, 'data-sg-days='), 3);
  // a browser counts maxlength in UTF-16 units; the limits count characters, and an emoji takes two units
  const q = Number((/id="sg-q" maxlength="(\d+)"/.exec(html) || [])[1]);
  const cs = [...html.matchAll(/data-sg-choice="\d" maxlength="(\d+)"/g)].map((m) => Number(m[1]));
  const sprouts = (n) => '\u{1F331}'.repeat(n);
  assert.equal(cs.length, 4);
  assert.ok(sprouts(CAP_Q).length <= q, 'a question of ' + CAP_Q + ' emoji fits its field (' + sprouts(CAP_Q).length + ' units, maxlength ' + q + ')');
  assert.ok(cs.every((m) => sprouts(CAP_CHOICE).length <= m), 'a choice of ' + CAP_CHOICE + ' emoji fits its field (maxlength ' + cs.join(', ') + ')');
  assert.equal(askProblem({ q: sprouts(CAP_Q), choices: [sprouts(CAP_CHOICE), 'No'], days: 3 }), null, 'and the sheet sends it');
  assert.notEqual(askProblem({ q: 'Tea?', choices: [sprouts(CAP_CHOICE + 1), 'No'], days: 3 }), null, 'the control: one emoji more is refused in words');
});

test('a question needs words, two to four different choices of 40 characters or fewer, and 1, 3 or 7 days', () => {
  const ok = { q: 'Tea on Sunday?', choices: ['Yes', 'No'], days: 3 };
  assert.equal(askProblem(ok), null);
  assert.equal(askProblem({ ...ok, choices: ['Yes', 'No', '', '  '] }), null, 'empty fields are left out');
  const bad = [
    { ...ok, q: '  ' }, { ...ok, q: 'q'.repeat(121) }, { ...ok, choices: ['Yes'] }, { ...ok, choices: ['a', 'b', 'c', 'd', 'e'] },
    { ...ok, choices: ['c'.repeat(41), 'No'] }, { ...ok, choices: ['Yes', 'yes'] }, { ...ok, choices: ['Not yet', 'Not  yet'] }, { ...ok, days: 2 },
  ];
  for (const b of bad) assert.notEqual(askProblem(b), null, JSON.stringify(b));
  assert.equal(askProblem({ ...ok, q: 'q'.repeat(120), choices: ['c'.repeat(40), '👨‍👩‍👧'] }), null, 'the control: at the limits, and an emoji family, it passes');
});

test('the sheet refuses the hidden characters the server refuses, so two different choices cannot look the same', () => {
  const ok = { q: 'Tea on Sunday?', choices: ['Yes', 'No'], days: 3 };
  // a variation selector away from an emoji, the combining grapheme joiner, a Mongolian variation selector, a
  // supplementary variation selector, a tag, a zero-width space and a direction mark
  const HIDDEN = ['\u{FE00}', '\u{FE0F}', '\u{034F}', '\u{180B}', '\u{E0100}', '\u{E0067}', '\u{200B}', '\u{202E}', '<'];
  for (const ch of HIDDEN) {
    const name = 'U+' + ch.codePointAt(0).toString(16).toUpperCase();
    assert.notEqual(askProblem({ ...ok, choices: ['Yes' + ch, 'No'] }), null, name + ' in a choice');
    assert.notEqual(askProblem({ ...ok, q: 'Tea' + ch + ' on Sunday?' }), null, name + ' in the question');
  }
  assert.notEqual(askProblem({ ...ok, choices: ['Yes', 'Yes\u{FE00}', 'No'] }), null, 'a pair that looks the same is refused');
  // the controls: emoji that hold a joiner, a style mark, a keycap or flag tags are kept whole
  const ENGLAND = '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}';
  for (const e of ['\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}', '\u{2764}\u{FE0F}', '#\u{FE0F}\u{20E3}', ENGLAND, '\u{1F9D1}\u{200D}\u{1F373}']) {
    assert.equal(askProblem({ ...ok, q: 'Who brings ' + e + '?', choices: [e + ' me', 'No'] }), null, JSON.stringify(e));
  }
});

/* ------------------------------------------------------------------ what this device forgets */

test('leaving a room forgets which signals this device answered there, and keeps the rest', () => {
  const store = memory({ [TAPPED]: JSON.stringify({ K7M2QP: [SID], ROOM22: [SID2] }), [SECRET_KEY]: toB64url(new Uint8Array(32)) });
  forgetRoom('K7M2QP', store);
  assert.deepEqual(JSON.parse(store.getItem(TAPPED)), { ROOM22: [SID2] });
  assert.ok(store.getItem(SECRET_KEY), 'the secret stays, for the rooms it is still in');
  forgetRoom('ROOM22', store);
  assert.equal(store.getItem(TAPPED), null, 'with no room left the list goes');
  forgetRoom('NOROOM', store);
  assert.equal(store.getItem(TAPPED), null, 'a room it was never in changes nothing');
  forgetDevice(store);
  assert.equal(store.getItem(SECRET_KEY), null, 'forgetting the device takes the secret too');
});

test('the room\'s Leave forgets its signals, and Start over removes every key the signal block and the PAXT room keep', () => {
  const gsrc = fs.readFileSync(path.join(root, 'assets/js/galaxy.js'), 'utf8');
  const leave = gsrc.split('\n').find((l) => l.includes("$('#vb-leave')"));
  assert.ok(leave && /forgetRoom\(/.test(leave), 'Leave this room calls forgetRoom');
  // the reset's own test of a key, run over every localStorage key the app names
  const m = /Object\.keys\(localStorage\)\) if \((.+?)\) localStorage\.removeItem\(k\)/.exec(gsrc);
  assert.ok(m, 'the reset loop is where it was');
  const removes = new Function('k', 'return ' + m[1]);
  const keys = new Set();
  for (const dir of ['assets/js', 'engine']) {
    for (const f of fs.readdirSync(path.join(root, dir)).filter((x) => x.endsWith('.js'))) {
      for (const line of fs.readFileSync(path.join(root, dir, f), 'utf8').split('\n')) {
        if (!/localStorage|_KEY\b|\bKEY\b/.test(line)) continue;
        for (const k of line.matchAll(/'(gratus[.-][A-Za-z0-9.-]+)'/g)) keys.add(k[1]);
      }
    }
  }
  for (const k of ['gratus-signal-secret', 'gratus-signal-tapped', 'gratus-paxt-mine', 'gratus-paxt-seen']) assert.ok(keys.has(k), 'the scan finds ' + k);
  const kept = [...keys].filter((k) => !removes(k));
  assert.deepEqual(kept, [], 'Start over removes every one of ' + keys.size + ' keys');
  assert.equal(removes('another-app.key'), false, 'the control: a key that is not the app\'s stays');
});

/* ------------------------------------------------------------------ an answer whose reply is lost */

// a stand-in for the block's slot: it keeps the HTML painted into it, and hands out its choice buttons
function slot() {
  let chips = [];
  const host = {
    isConnected: true, innerHTML: '', dataset: {},
    querySelector: () => null,
    querySelectorAll(sel) {
      if (sel !== '[data-sg-sid]') return [];
      chips = [];
      return [...host.innerHTML.matchAll(/data-sg-sid="([^"]+)" data-sg-c="(\d+)"/g)].map((m) => ({
        dataset: { sgSid: m[1], sgC: m[2] },
        addEventListener: (type, fn) => chips.push({ c: Number(m[2]), click: fn }),
      }));
    },
    chips: () => chips,
  };
  return host;
}
const until = async (ok, ms = 3000) => { const end = Date.now() + ms; while (!ok() && Date.now() < end) await new Promise((r) => setTimeout(r, 5)); return ok(); };

test('an answer whose reply is lost is still noted, and the room is read again with its token, which shows it', async () => {
  const was = { localStorage: globalThis.localStorage, document: globalThis.document, fetch: globalThis.fetch };
  const store = memory();
  const toasts = [];
  globalThis.localStorage = store;
  globalThis.document = { querySelector: (s) => (s === '#toast' ? { set textContent(t) { toasts.push(t); }, classList: { add() {}, remove() {} } } : null) };
  const sent = [];
  let tapped = null;
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    sent.push(body);
    // the tap reaches the server and is written, and then the connection drops before the reply
    if (body.act === 'tap') { tapped = body; throw new TypeError('the connection dropped'); }
    const mine = tapped && body.tokens && body.tokens[SID] === tapped.token ? { mine: tapped.c, answered: 1 } : {};
    return { ok: true, status: 200, json: async () => ({ signals: [row(mine)], note: 'n' }) };
  };
  try {
    const host = slot();
    mountSignals(host, { code: 'LOSTRP' });
    assert.ok(await until(() => host.chips().length === 3), 'the block shows the signal with its three choices');
    await host.chips().find((x) => x.c === 1).click();
    const reads = () => sent.filter((b) => b.act === 'read');
    assert.ok(await until(() => reads().length === 2 && host.innerHTML.includes(TAP_LINE)), 'the room is read again after the lost reply');
    assert.equal(reads()[1].tokens[SID], tapped.token, 'that read sends the token the tap used');
    assert.ok(host.innerHTML.includes('aria-pressed="true"') && host.innerHTML.includes(TAP_LINE), 'and the block shows the answer as given');
    assert.deepEqual(JSON.parse(store.getItem(TAPPED)).LOSTRP, [SID], 'the device noted the signal it answered');
    assert.ok(toasts.includes(MAYBE_LINE) && !toasts.some((t) => /could not be sent/.test(t)), 'it says the answer may not have arrived, not that it was not sent');
  } finally {
    Object.assign(globalThis, was);
  }
});

/* ------------------------------------------------------------------ the words for a send that failed */

test('a failed send shows the server\'s refusal as it came, and plain words for the browser\'s own errors', async () => {
  const S = await import('../../assets/js/signal.js');
  const said = Object.assign(new Error('This room has 3 open signals.'), { said: true });
  assert.equal(S.failWords(said, 'x'), 'This room has 3 open signals.');
  for (const raw of ['Failed to fetch', 'Load failed', 'NetworkError when attempting to fetch resource.']) {
    assert.equal(S.failWords(new TypeError(raw)), S.NOT_SENT, 'the browser\'s words never reach the toast: ' + raw);
  }
  assert.equal(S.failWords(null, 'It was not asked.'), 'It was not asked.');
  const src = fs.readFileSync(path.join(root, 'assets/js/signal.js'), 'utf8');
  assert.ok(!/toast\(String\(\(e && e\.message\)/.test(src), 'no toast shows an error message as it was thrown');
});

test('after a lost reply the sheet knows its own question in the room, and only an open one with the same choices', async () => {
  const S = await import('../../assets/js/signal.js');
  const s = row();
  assert.equal(S.askedAlready(s, ' Tea on Sunday? ', ['Yes', ' No', 'Maybe']), true);
  assert.equal(S.askedAlready(s, 'Tea on Sunday?', ['Yes', 'No']), false, 'other choices are another question');
  assert.equal(S.askedAlready(row({ closed: true }), 'Tea on Sunday?', ['Yes', 'No', 'Maybe']), false, 'a closed one is not this ask');
  assert.equal(S.askedAlready(s, 'Tea on Monday?', ['Yes', 'No', 'Maybe']), false);
});

test('when this browser cannot keep the secret, the block says the answer cannot be seen or changed after the page closes', async () => {
  const S = await import('../../assets/js/signal.js');
  S.deviceSecret(refusing);
  assert.equal(S.secretKept(), false, 'a secret storage refused is not kept');
  const lost = signalHtml(row({ mine: 1 }), { now: NOW, kept: false });
  assert.ok(lost.includes(S.UNKEPT_LINE) && !lost.includes(TAP_LINE), 'it does not promise the answer can be changed');
  assert.ok(blockHtml({ signals: [row({ mine: 1 })], kept: false }, NOW).includes(S.UNKEPT_LINE), 'and the block passes that on');
  S.deviceSecret(memory());
  assert.equal(S.secretKept(), true, 'the control: a secret storage keeps is kept');
  const kept = signalHtml(row({ mine: 1 }), { now: NOW });
  assert.ok(kept.includes(TAP_LINE) && !kept.includes(S.UNKEPT_LINE), 'and the usual line shows');
});
