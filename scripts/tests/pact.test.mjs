// The room shows only what this device can check, in words that count keys. These checks hold the room's pure
// parts to that: a broken record is refused whole, the recount file carries the fingerprints the room shows, the
// marks sit above the text, the room says once what a count of keys is and who can see what, a device whose key
// is gone is told so and offered no button that would sign, and a failed join never asks for a new signature.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as P from '../../engine/paxt.js';
import { esc } from '../../assets/js/ui.js';
import {
  checkRecord, recountText, readRecount, roomHtml, fingerprint, isoTime, safariTab, failNote, outgoing,
  keyGoneFor, nextMine, joinSheetHtml, stripHtml, stripRow, roomStrip, mountStrip, wirePact, STRIP_KICKER, STRIP_RULE, STRIP_OFF,
  FINGERPRINT_NOTE, KEYS_NOTE, SEEN_NOTE, SAFARI_NOTE, SAFARI_WIPE, NO_RECORD_PRINT, verifyOnce,
} from '../../assets/js/pact.js';

const subtle = globalThis.crypto.subtle;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const INTENT = 'Intent: a promise between us, kept by choice. It is not a contract and it moves no money.';
const AT = '2026-11-25T12:00:00.000Z';
const NOW = Date.parse('2026-11-26T10:00:00Z');

async function deviceKey() {
  const pair = await subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify']);
  const address = 'did:key:' + P.didKeyAddress('ed25519', new Uint8Array(await subtle.exportKey('raw', pair.publicKey)));
  const sign = async (line) => P.toBase64url(new Uint8Array(await subtle.sign({ name: 'Ed25519' }, pair.privateKey, P.signedBytes(line))));
  return { address, sign };
}

/** a record as the server sends it: { doc, digest, entries, head }, with joins from `names` (one key each) */
async function record(body, names = ['Ana', 'Ben'], over = {}) {
  const id = over.id || 'tea-room';
  const doc = P.template({ id, title: 'Tea & "cake"', threshold: 3, opens: '2026-11-25', closes: '2026-12-02', body: INTENT + '\n\n' + body, ...over });
  const d = await P.digestOf(doc);
  const keys = [];
  const entries = [];
  for (const name of names) {
    const k = await deviceKey(); keys.push(k);
    const line = P.ballotLine({ id, choices: ['join'], digest: d.short });
    entries.push({ address: k.address, line, sig: await k.sign(line), name, at: AT });
  }
  const { head } = await P.chainOf(d.full, entries);
  return { data: { doc, digest: d.full, entries, head }, keys, short: d.short };
}

const count = (s, part) => s.split(part).length - 1;

/* ------------------------------------------------------------------ a broken record is refused whole */

test('a record with a null entry, or a list where an entry should be, is refused and never throws', async () => {
  const { data } = await record('We meet for tea on Sundays.');
  assert.equal((await checkRecord(data, 'tea-room')).ok, true, 'the control: the whole record checks out');
  for (const bad of [null, undefined, 7, 'entry', []]) {
    const broken = { ...data, entries: [...data.entries, bad] };
    assert.deepEqual(await checkRecord(broken, 'tea-room'), { ok: false });
  }
});

test('an entry whose time is not an ISO time is refused, on the page and in a recount file', async () => {
  const { data, short } = await record('We meet for tea on Sundays.');
  for (const at of ['yesterday', '2026-11-25', '2026-11-25 12:00:00', '2026-13-01T00:00:00.000Z', '2026-02-30T00:00:00Z', '', 12]) {
    const e = { ...data.entries[0], at };
    const bent = { ...data, entries: [e, data.entries[1]] };
    assert.equal((await checkRecord(bent, 'tea-room')).ok, false, JSON.stringify(at));
  }
  assert.equal(isoTime('2026-11-25T12:00:00Z'), true, 'without milliseconds is still an ISO time');
  assert.equal(isoTime(AT), true);
  const file = recountText(data.doc, data.entries, data.head, short);
  assert.ok(readRecount(file));
  assert.equal(readRecount(file.replace(AT, 'later')), null, 'a recount row ending in something that is not a time is refused');
});

/* ------------------------------------------------------------------ fingerprints */

test('a fingerprint is the first 32 hex in groups of four, and nothing for anything else', () => {
  assert.equal(fingerprint('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6ffff'), 'a1b2 c3d4 e5f6 a7b8 c9d0 e1f2 a3b4 c5d6');
  assert.equal(fingerprint('A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6'), 'a1b2 c3d4 e5f6 a7b8 c9d0 e1f2 a3b4 c5d6');
  for (const bad of ['', null, 'abc', 'z'.repeat(32), undefined]) assert.equal(fingerprint(bad), '');
});

test('the recount file carries both fingerprints and what a match means, and reads back whole', async () => {
  const { data, short } = await record('We meet for tea on Sundays.');
  const file = recountText(data.doc, data.entries, data.head, short);
  assert.ok(file.endsWith('head ' + data.head + '\ntext fingerprint ' + fingerprint(short) + '\nrecord fingerprint ' + fingerprint(data.head) + '\n' + FINGERPRINT_NOTE + '\n'));
  const back = readRecount(file);
  assert.equal(back.head, data.head);
  assert.deepEqual(back.fingerprints, { text: fingerprint(short), record: fingerprint(data.head) });
  assert.deepEqual(back.entries, data.entries);
  assert.equal(back.doc, data.doc);
  // a file written without the footer still reads
  const bare = recountText(data.doc, data.entries);
  const old = readRecount(bare);
  assert.equal(old.head, null);
  assert.deepEqual(old.fingerprints, { text: null, record: null });
  assert.deepEqual(old.entries, data.entries);
});

/* ------------------------------------------------------------------ the room */

test('the room counts keys, and says once that any key can join and who can see what', async () => {
  const { data } = await record('We meet for tea on Sundays.');
  const rec = await checkRecord(data, 'tea-room');
  const html = roomHtml({ rec, mine: null, canSign: true, busy: '', held: null }, NOW);
  assert.match(html, /Two of the three keys it needs have joined\./);
  assert.equal(count(html, KEYS_NOTE), 1);
  assert.equal(count(html, SEEN_NOTE), 1);
  assert.ok(html.includes('Text fingerprint: <b class="mono pact-hash">' + fingerprint(rec.digest.short) + '</b>'));
  assert.ok(html.includes(fingerprint(rec.head)) && html.includes('Record fingerprint'));
  assert.equal(count(html, FINGERPRINT_NOTE), 1);
  assert.ok(html.includes('Tea &amp; &quot;cake&quot;'), 'the title goes through esc()');
  assert.doesNotMatch(html, /not joined|yet to join|still waiting|missing/i);
});

test('the clerk\'s marks sit above the text, quote their sentence and go through esc(); a clean text has none', async () => {
  const clean = await checkRecord((await record('We meet for tea on Sundays.')).data, 'tea-room');
  assert.ok(!roomHtml({ rec: clean, mine: null, canSign: true, busy: '' }, NOW).includes('pact-marks'));

  const { data } = await record('Bring <b>your</b> seed phrase on Sunday.');
  const rec = await checkRecord(data, 'tea-room');
  const html = roomHtml({ rec, mine: null, canSign: true, busy: '' }, NOW);
  const marksAt = html.indexOf('pact-marks');
  assert.ok(marksAt > 0 && marksAt < html.indexOf('pact-doc'), 'the marks come before the text');
  assert.ok(html.includes('Bring &lt;b&gt;your&lt;/b&gt; seed phrase on Sunday.'));
  assert.ok(!html.includes('<b>your</b>'));
  assert.ok(html.includes('It cannot tell why they were written.'));
});

test('a device whose key is gone is told so, and offered no button that would sign', async () => {
  const { data, keys } = await record('We meet for tea on Sundays.');
  const rec = await checkRecord(data, 'tea-room');
  const mine = keys[0].address;
  const gone = roomHtml({ rec, mine, canSign: true, busy: '', held: false }, NOW);
  assert.ok(gone.includes('its key for this PAXT is gone from this browser. It can no longer leave or change its choice from here.'));
  assert.ok(!gone.includes('id="pact-leave"') && !gone.includes('id="pact-join"'));
  assert.ok(gone.includes('id="pact-share"') && gone.includes('id="pact-recount"'));

  const kept = roomHtml({ rec, mine, canSign: true, busy: '', held: true }, NOW);
  assert.ok(kept.includes('It still holds its key for this PAXT.') && kept.includes('id="pact-leave"'));
  const asking = roomHtml({ rec, mine, canSign: true, busy: '', held: null }, NOW);
  assert.ok(asking.includes('This device has joined.') && asking.includes('id="pact-leave"') && !asking.includes('gone'));
  // while the device is still asking whether it holds the key, Leave cannot be pressed
  assert.ok(asking.includes('id="pact-leave" disabled'), 'Leave waits until the device knows it holds its key');
  assert.ok(!kept.includes('id="pact-leave" disabled'), 'the control: with the key held, Leave can be pressed');
  const unasked = roomHtml({ rec, mine, canSign: true, busy: '', held: 'unknown' }, NOW);
  assert.ok(unasked.includes('id="pact-leave"') && !unasked.includes('id="pact-leave" disabled') && !unasked.includes('still holds'),
    'when the device cannot be asked, Leave is not held back for ever, and nothing is claimed about the key');
  const stranger = roomHtml({ rec, mine: null, canSign: true, busy: '', held: false }, NOW);
  assert.ok(stranger.includes('id="pact-join"') && !stranger.includes('gone'), 'a device that never signed here is not told about a key');
});

test('the Safari note shows only when asked for, and says where the key lives without asking to install', async () => {
  const rec = await checkRecord((await record('We meet for tea on Sundays.')).data, 'tea-room');
  assert.ok(roomHtml({ rec, mine: null, canSign: true, busy: '', safari: true }, NOW).includes(SAFARI_NOTE));
  assert.ok(!roomHtml({ rec, mine: null, canSign: true, busy: '' }, NOW).includes('pact-keynote'));
  assert.doesNotMatch(SAFARI_NOTE, /install|add to|tap|should|must/i);
});

test('safariTab is true in a Safari tab only', () => {
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
  const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
  const crios = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1';
  const chrome = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
  const android = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0 Mobile Safari/537.36';
  assert.equal(safariTab({ userAgent: iphone }), true);
  assert.equal(safariTab({ userAgent: mac }), true);
  assert.equal(safariTab({ userAgent: iphone, standalone: true }), false, 'the Home Screen app keeps its own storage');
  for (const ua of [crios, chrome, android, '']) assert.equal(safariTab({ userAgent: ua }), false, ua);
  assert.equal(safariTab(null), false);
});

test('after a failed join the room says what happened and never asks for a new signature', async () => {
  const notes = [failNote('It could not be sent.', false), failNote('It was not recorded. This closed on 1 December.', false),
    failNote('It could not be sent.', null), failNote('It could not be sent.', true)];
  for (const n of notes) assert.doesNotMatch(n, /sign again|try again|retry|resend|sign it again|press join/i, n);
  assert.match(notes[0], /^It could not be sent\. This is the record as it stands now, fetched again\. Nothing else was signed\.$/);
  assert.match(notes[3], /reached the record after all/);
  const rec = await checkRecord((await record('We meet for tea on Sundays.')).data, 'tea-room');
  const html = roomHtml({ rec, mine: null, canSign: true, busy: '', notice: 'It was not recorded. <b>' + notes[0] }, NOW);
  assert.ok(html.includes('role="status"') && html.includes('&lt;b&gt;') && !html.includes('<b>It'), 'the notice goes through esc()');
});

test('a browser that cannot run the signature check counts nothing, and says so, instead of setting good lines aside', async () => {
  const { data } = await record('We meet for tea on Sundays.');
  assert.equal((await checkRecord(data, 'tea-room')).ok, true, 'the control: with a whole WebCrypto the record checks out');
  // lines this device has never checked (fresh keys), made before the check is broken
  const { data: fresh } = await record('We meet for tea on Mondays.', ['Cy', 'Di']);
  const digest = subtle.digest;
  subtle.digest = function (alg, bytes) {
    if (String((alg && alg.name) || alg).toUpperCase() === 'SHA-512') return Promise.reject(new Error('SHA-512 is not here'));
    return digest.call(subtle, alg, bytes);
  };
  try {
    assert.deepEqual(await checkRecord(fresh, 'tea-room'), { ok: false, cannot: true }, 'new lines it cannot check: nothing is counted, and it says so');
    assert.equal((await checkRecord(data, 'tea-room')).ok, true, 'lines this device already checked still count, from what it remembers');
  } finally {
    subtle.digest = digest;
  }
});

test('a tap whose key is gone stops before a new key is made, and the noted key is never swapped while it is joined', () => {
  const partners = new Set(['did:key:old']);
  // Safari cleared the key but not the note of the join: Leave stops, and so does Join
  assert.equal(keyGoneFor({ choice: 'leave', hadKey: false, remembered: 'did:key:old', partners }), true);
  assert.equal(keyGoneFor({ choice: 'join', hadKey: false, remembered: 'did:key:old', partners }), true);
  // a leave with no key at all makes none
  assert.equal(keyGoneFor({ choice: 'leave', hadKey: false, remembered: null, partners: new Set() }), true);
  // a key handed back that is not the joined one never signs
  assert.equal(keyGoneFor({ choice: 'leave', hadKey: null, remembered: 'did:key:old', partners, address: 'did:key:new' }), true);
  // the controls: a first join, a join after leaving, and the joined key itself all go on
  assert.equal(keyGoneFor({ choice: 'join', hadKey: false, remembered: null, partners: new Set() }), false);
  assert.equal(keyGoneFor({ choice: 'join', hadKey: false, remembered: 'did:key:old', partners: new Set() }), false);
  assert.equal(keyGoneFor({ choice: 'leave', hadKey: true, remembered: 'did:key:old', partners, address: 'did:key:old' }), false);

  const was = { address: 'did:key:old', name: 'Ana', entry: { address: 'did:key:old', line: 'l1' } };
  assert.deepEqual(nextMine(was, 'did:key:new', 'Ana', undefined, partners), was, 'a joined key is not swapped out');
  assert.deepEqual(nextMine(was, 'did:key:new', 'Ana', undefined, new Set()), { address: 'did:key:new', name: 'Ana' }, 'the control: after it left, a new key is noted');
  assert.deepEqual(nextMine(was, 'did:key:old', 'Ana', undefined, partners), was, 'the same key keeps its last line');
  assert.deepEqual(nextMine(null, 'did:key:new', 'Bo', { line: 'l2' }, partners), { address: 'did:key:new', name: 'Bo', entry: { line: 'l2' } });
});

test('in a Safari tab, the Join sheet and the Safari note say a full wipe forgets the join too', () => {
  assert.ok(SAFARI_NOTE.endsWith(SAFARI_WIPE));
  assert.match(SAFARI_WIPE, /forgets its key and that it joined/);
  assert.match(SAFARI_WIPE, /second key/);
  assert.doesNotMatch(SAFARI_WIPE, /install|add to|tap|should|must/i);
  const safari = joinSheetHtml('Tea & cake', 'a'.repeat(32), { safari: true });
  assert.ok(safari.includes(SAFARI_WIPE) && safari.includes('Tea &amp; cake'));
  assert.ok(!joinSheetHtml('Tea', 'a'.repeat(32)).includes(SAFARI_WIPE), 'the control: elsewhere the sheet says nothing about Safari');
  assert.ok(joinSheetHtml('Tea', 'a'.repeat(32)).includes('id="pj-go"'));
});

test('before any line, only the text has a fingerprint, in the room and in the recount file', async () => {
  const { data, short } = await record('We meet for tea on Sundays.', []);
  assert.equal(data.head, data.digest, 'with no line the head is the text’s own hash');
  const rec = await checkRecord(data, 'tea-room');
  const html = roomHtml({ rec, mine: null, canSign: true, busy: '' }, NOW);
  assert.equal(count(html, fingerprint(short)), 1, 'the fingerprint shows once, as the text’s');
  assert.ok(html.includes(NO_RECORD_PRINT) && !html.includes('pact-headhash'));
  const file = recountText(data.doc, data.entries, data.head, short);
  assert.ok(!file.includes('record fingerprint') && file.includes('text fingerprint ' + fingerprint(short)));
  assert.deepEqual(readRecount(file).fingerprints, { text: fingerprint(short), record: null });
  // the control: one line in, the record has a fingerprint of its own
  const one = await record('We meet for tea on Sundays.', ['Ana']);
  const rec1 = await checkRecord(one.data, 'tea-room');
  const html1 = roomHtml({ rec: rec1, mine: null, canSign: true, busy: '' }, NOW);
  assert.ok(html1.includes(fingerprint(one.data.head)) && !html1.includes(NO_RECORD_PRINT));
  assert.ok(recountText(one.data.doc, one.data.entries, one.data.head, one.short).includes('record fingerprint ' + fingerprint(one.data.head)));
});

test('a leave line carries no name, and a join carries the one chosen', () => {
  const base = { address: 'did:key:z6Mk', line: 'paxt1 tea-room leave ' + 'a'.repeat(32) + ' #2', sig: 's' };
  assert.equal(outgoing({ ...base, choice: 'leave', name: 'Ana' }).name, '');
  assert.equal(outgoing({ ...base, choice: 'join', name: 'Ana' }).name, 'Ana');
  assert.deepEqual(Object.keys(outgoing({ ...base, choice: 'join', name: 'Ana' })), ['address', 'line', 'sig', 'name']);
});

/* ------------------------------------------------------------------ PAXTs in a Vibe room */

test('a room strip row is the PAXT title and the clerk count sentence in keys, taken from a record checked here', async () => {
  const { data } = await record('We meet for tea on Sundays.');
  const row = await stripRow(data, 'tea-room', NOW);
  assert.equal(row.title, 'Tea & "cake"');
  assert.match(row.say, /keys/);
  assert.ok(!row.say.includes('Ana') && !row.say.includes('Ben'), 'no names');
  const bent = { ...data, head: 'f'.repeat(64) };
  assert.equal(await stripRow(bent, 'tea-room', NOW), null, 'a record that does not check out gives no row');
  assert.equal(await stripRow(data, 'another-room', NOW), null, 'nor one fetched for another id');
});

test('the strip shows counts only, escapes every string, says the rule once and holds twelve rows at most', () => {
  const rows = Array.from({ length: 14 }, (_, i) => ({ id: 'paxt-number-' + i, title: '<img src=x onerror=alert(1)> ' + i, say: '"><script>x</script>' }));
  const html = stripHtml(rows);
  assert.ok(!/<img|<script/.test(html), html);
  assert.equal(count(html, 'data-paxt-open='), 12);
  assert.equal(count(html, STRIP_KICKER), 1);
  assert.equal(count(html, STRIP_RULE), 1);
  assert.equal(STRIP_RULE, 'Signed lines stay on each PAXT’s own page. This room sees counts.');
  assert.ok(!html.includes('did:key') && !html.includes('paxt1 '), 'no key and no line');
  assert.equal(stripHtml([]), '', 'no row, no strip');
  assert.equal(stripHtml([{ id: 'Not An Id', title: 't', say: 's' }]), '', 'a row with a bad id is left out');
});

test('only the keeper device sees Take it off this room, once on each row', () => {
  const rows = [{ id: 'tea-room', title: 'Tea', say: 'It needs three keys to join.' }, { id: 'dinner-room', title: 'Dinner', say: 'x' }];
  assert.equal(count(stripHtml(rows), STRIP_OFF), 0);
  assert.equal(count(stripHtml(rows, { keeper: true }), STRIP_OFF), 2);
  assert.ok(stripHtml(rows, { keeper: true, busy: 'tea-room' }).includes('data-paxt-off="tea-room" disabled'));
});

test('roomStrip reads each record, leaves out one that does not read without a word, and keeps the room order', async () => {
  const { data } = await record('We meet for tea on Sundays.');
  const asked = [];
  const fetchFn = async (url) => {
    const id = decodeURIComponent(String(url).split('id=')[1]);
    asked.push(id);
    if (id === 'tea-room') return { ok: true, json: async () => data };
    if (id === 'broken-one') return { ok: true, json: async () => ({ ...data, head: '0'.repeat(64) }) };
    return { ok: false, status: 404, json: async () => ({}) };
  };
  const html = await roomStrip(['gone-away', 'tea-room', 'broken-one', 'Not An Id', 'tea-room'], { fetchFn });
  assert.deepEqual(asked.sort(), ['broken-one', 'gone-away', 'tea-room'], 'each good id once, and no bad id');
  assert.equal(count(html, 'data-paxt-open='), 1);
  assert.ok(html.includes('data-paxt-open="tea-room"') && !/gone-away|broken-one|could not|missing/.test(html));
  assert.equal(await roomStrip(['gone-away'], { fetchFn }), '', 'a room whose PAXTs all fail to read shows no strip');
});

test('after a PAXT room reads a newer record, the Vibe room strip under it shows the new count without a fetch of its own', async () => {
  const ID = 'strip-fresh';
  const before = await record('We meet for tea on Sundays.', [], { id: ID });
  const after = await record('We meet for tea on Sundays.', ['Ana'], { id: ID });
  const was = esc((await stripRow(before.data, ID)).say), now = esc((await stripRow(after.data, ID)).say);
  assert.notEqual(was, now, 'the two records read differently');
  // the strip has read the record while no key had joined
  await roomStrip([ID], { fetchFn: async () => ({ ok: true, json: async () => before.data }) });
  const node = (more = {}) => ({ isConnected: true, innerHTML: '', dataset: {}, matches: () => false, querySelector: () => null, querySelectorAll: () => [], ...more });
  const stripHost = node();
  mountStrip(stripHost, { code: 'K7M2QP', ids: [ID] });
  assert.ok(stripHost.innerHTML.includes(was), 'the strip shows the count it read');
  // the PAXT opened over the room: its own room reads the record after one key joined
  const roomHost = node({ matches: (s) => s === '[data-pact]' });
  const asked = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    asked.push(String(url));
    return String(url).includes('id=' + ID) ? { ok: true, status: 200, json: async () => after.data } : { ok: false, status: 404, json: async () => ({}) };
  };
  try { await wirePact(roomHost, ID); } finally { globalThis.fetch = realFetch; }
  assert.ok(roomHost.innerHTML.includes('pact-doc'), 'the PAXT room shows the record');
  assert.equal(asked.length, 1, 'one fetch, by the PAXT room');
  assert.ok(stripHost.innerHTML.includes(now) && !stripHost.innerHTML.includes(was), 'the strip under it now says one key has joined');
});

test('a signed line is checked once on this device, and a refused one is never remembered', async () => {
  const k = await deviceKey();
  const line = 'paxt1 tea-room join 0123456789abcdef0123456789abcdef';
  const sig = await k.sign(line);
  assert.equal(await verifyOnce(k.address, line, sig), true, 'a true signature passes');
  assert.equal(await verifyOnce(k.address, line, sig), true, 'and passes again, from what this device remembers');
  const bad = sig.slice(0, -2) + (sig.endsWith('AA') ? 'AB' : 'AA');
  assert.equal(await verifyOnce(k.address, line, bad), false, 'a changed signature is refused');
  assert.equal(await verifyOnce(k.address, line, bad), false, 'and refused again: a refusal is never remembered as a pass');
  assert.equal(await verifyOnce(k.address, line.replace('join', 'leave'), sig), false, 'the same signature on another line is refused');
});

/* ------------------------------------------------------------------ release fixes */

// a stand-in sheet for the room's own sheets: its fields hold values, and its button keeps the handler it is given
function standInSheet(values) {
  const handlers = {};
  const els = {};
  for (const [sel, value] of Object.entries(values)) els[sel] = { value };
  const go = { disabled: false, textContent: '', addEventListener: (type, fn) => { handlers.go = fn; } };
  els['#pd-go'] = go;
  return { handlers, go, make: () => ({ el: { querySelector: (s) => els[s] || null, querySelectorAll: () => [] }, close() { handlers.closed = true; } }) };
}

test('a new PAXT whose reply was lost opens once: the next press sends the same id and text, and finds it opened', async () => {
  const P2 = await import('../../assets/js/pact.js');
  const toasts = [];
  const was = { document: globalThis.document, fetch: globalThis.fetch };
  globalThis.document = { querySelector: (s) => (s === '#toast' ? { set textContent(t) { toasts.push(t); }, classList: { add() {}, remove() {} } } : null) };
  const opened = new Map();
  const posted = [];
  let drop = true;
  globalThis.fetch = async (url, init) => {
    if (init && init.method === 'POST') {
      const doc = JSON.parse(init.body).doc;
      const id = P.parseDoc(doc).terms.id;
      posted.push(id);
      if (opened.has(id)) return { ok: false, status: 409, json: async () => ({ error: 'that id is taken. Choose another.' }) };
      const d = await P.digestOf(doc);
      opened.set(id, { doc, digest: d.full, entries: [], head: d.full, closed: false });
      // the server kept it, and the reply never arrived
      if (drop) { drop = false; throw new TypeError('Failed to fetch'); }
      return { ok: true, status: 200, json: async () => opened.get(id) };
    }
    const id = new URL(String(url), 'https://gratus.cc').searchParams.get('id');
    return opened.has(id) ? { ok: true, status: 200, json: async () => opened.get(id) } : { ok: false, status: 404, json: async () => ({}) };
  };
  const went = [];
  P2.setGo((p, id) => went.push(id));
  const sh = standInSheet({ '#pd-title': 'Sunday dinners', '#pd-body': INTENT + '\n\nWe cook on Sundays.', '#pd-need': '3', '#pd-close': P2.dayFrom(Date.now(), 14) });
  P2.setSheet(() => sh.make());
  try {
    P2.openDraft();
    await sh.handlers.go();
    assert.equal(opened.size, 1, 'the first press reached the server');
    assert.ok(toasts.includes(P2.LOST_OPEN) && !toasts.some((t) => /Nothing was opened|Failed to fetch/.test(t)), 'it says it may or may not have opened');
    await sh.handlers.go();
    assert.equal(opened.size, 1, 'the second press opened nothing new');
    assert.deepEqual([...new Set(posted)], [...opened.keys()], 'both presses sent the one id');
    assert.deepEqual(went, [...opened.keys()], 'and the room went to that PAXT');
  } finally {
    Object.assign(globalThis, was);
    P2.setSheet(null);
  }
});

test('a failed send never shows the browser\'s own words, and a refusal shows the server\'s', async () => {
  const P2 = await import('../../assets/js/pact.js');
  assert.equal(P2.failWords(new TypeError('Failed to fetch'), 'It was not taken off.'), P2.NOT_SENT);
  assert.equal(P2.failWords(new TypeError('Load failed')), P2.NOT_SENT);
  assert.equal(P2.failWords(Object.assign(new Error('That key does not keep this vibe'), { said: true })), 'That key does not keep this vibe');
  const src = fs.readFileSync(path.join(root, 'assets/js/pact.js'), 'utf8');
  assert.ok(!/toast\(String\(\(e && e\.message\)/.test(src), 'no toast shows an error message as it was thrown');
});

test('the room waits on the key store only so long, then says so', async () => {
  const P2 = await import('../../assets/js/pact.js');
  const never = new Promise(() => {});
  await assert.rejects(P2.inTime(never, 20), (e) => e.late === true, 'a key store that never answers is late');
  assert.equal(await P2.inTime(Promise.resolve(true), 20), true, 'the control: an answer in time comes through');
  assert.ok(/could not reach its keys/.test(P2.KEYS_LATE) && /nothing was signed/.test(P2.KEYS_LATE));
});

test('a room of twelve full PAXTs fits in what this device remembers of checked lines', async () => {
  const P2 = await import('../../assets/js/pact.js');
  assert.ok(P2.PASSED_MAX >= 12 * 500, 'at least twelve PAXTs of five hundred lines  (' + P2.PASSED_MAX + ')');
  const writes = [];
  const was = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => null, setItem: (k, v) => writes.push(k), removeItem() {} };
  try {
    const r = await record('We meet for tea on Sundays.', ['Ana', 'Ben'], { id: 'passed-once' });
    await checkRecord(r.data, 'passed-once');
    const after = writes.length;
    await checkRecord(r.data, 'passed-once');
    assert.equal(writes.length, after, 'a second check that added no pass writes nothing back');
  } finally { globalThis.localStorage = was; }
});

test('sheets opened inside a PAXT room sit above it, and the room leaves its own address alone while open', () => {
  // these read the app's own stylesheet and script; G56 walks the same in a browser
  const css = fs.readFileSync(path.join(root, 'assets/css/galaxy.css'), 'utf8');
  const z = (re) => { const m = re.exec(css); return m ? Number(m[1]) : NaN; };
  const roomZ = z(/\.room-page \{[^}]*z-index: (\d+)/);
  const scrimZ = z(/body\.room \.scrim \{[^}]*z-index: (\d+)/), sheetZ = z(/body\.room \.sheet \{[^}]*z-index: (\d+)/);
  const toastZ = z(/#toast \{[^}]*z-index: (\d+)/), tourZ = z(/#tour \{[^}]*z-index: (\d+)/);
  assert.ok(scrimZ > roomZ && sheetZ > scrimZ && sheetZ < tourZ && sheetZ < toastZ, 'room ' + roomZ + ' < scrim ' + scrimZ + ' < sheet ' + sheetZ + ' < tour ' + tourZ + ', toast ' + toastZ);
  assert.ok(/\.room-page \.rhead button::after/.test(css), 'the room\'s close button reaches 44 px');
  const g = fs.readFileSync(path.join(root, 'assets/js/galaxy.js'), 'utf8');
  const body = (name) => { const i = g.indexOf('function ' + name + '('); return i < 0 ? '' : g.slice(i, g.indexOf('\n}\n', i)); };
  const sync = /\n\s*if \(([^\n]*)\) return;/.exec(body('syncAddress'));
  assert.ok(sync && /pact-room/.test(sync[1]), 'syncAddress stands down while a PAXT room is open');
  const open = body('openPact');
  assert.ok(/const close = [^\n]*settle\(\(\) => \{ if \(\/\^\\\/app\\\/pact\\\/\/\.test/.test(open) && !/!step &&/.test(open),
    'closing the room puts /app back whether it was closed by hand or by the back step');
  assert.ok(/id="px-retry"/.test(body('fillPact')), 'a room whose script failed to load offers Try again');
  assert.ok(/inSharedRoom\(\)/.test(body('tourMaybe')), 'the first-visit tour waits while a shared Vibe room is open');
  assert.ok(/postMessage\('start-over'\)/.test(body('startOverStores')) && /new BroadcastChannel\('gratus-reset'\)/.test(g) && /location\.reload\(\)/.test(g.slice(g.indexOf("new BroadcastChannel('gratus-reset')"), g.indexOf("new BroadcastChannel('gratus-reset')") + 200)),
    'Start over tells every other Gratus tab to reload, so none writes the cleared notes back');
  const sheetSrc = body('pactsSheet');
  assert.ok(/Signed on this device/.test(sheetSrc) && / join \//.test(sheetSrc), 'the list says joined only for PAXTs whose last line from this device is a join');
});

test('the list of checked lines stays small at its ceiling, and a journal save drops it before it says storage is full', async () => {
  // a module of its own, so the list is read from this test's storage and not from an earlier test's
  const P2 = await import('../../assets/js/pact.js?passes-size');
  const old = Array.from({ length: P2.PASSED_MAX }, (_, i) => i.toString(16).padStart(8, '0') + 'a'.repeat(56));
  const writes = {};
  const was = globalThis.localStorage;
  globalThis.localStorage = { getItem: (k) => (k === 'gratus-paxt-passed' ? JSON.stringify(old) : null), setItem: (k, v) => { writes[k] = v; }, removeItem() {} };
  try {
    const r = await record('We meet for tea on Sundays.', ['Ana', 'Ben'], { id: 'passes-size' });
    assert.equal((await P2.checkRecord(r.data, 'passes-size')).ok, true);
  } finally { globalThis.localStorage = was; }
  const kept = writes['gratus-paxt-passed'] || '';
  const list = JSON.parse(kept || '[]');
  assert.equal(list.length, P2.PASSED_MAX, 'the list is full, with the two new passes in it');
  assert.ok(kept.length <= 250000, 'a full list is at most 250,000 characters  (' + kept.length + ')');
  assert.ok(list.every((x) => /^[0-9a-f]{24}$/.test(x)), 'each pass is 24 hex, and a list kept before is read the same way');
  const g = fs.readFileSync(path.join(root, 'assets/js/galaxy.js'), 'utf8');
  const save = g.slice(g.indexOf('function save()'), g.indexOf('\n}\n', g.indexOf('function save()')));
  assert.ok(/removeItem\('gratus-paxt-passed'\)[^\n]*setItem\(KEY/.test(save) && save.indexOf('removeItem') < save.indexOf('Storage is full'),
    'save() drops the list of checked lines and tries again before it says storage is full');
});
