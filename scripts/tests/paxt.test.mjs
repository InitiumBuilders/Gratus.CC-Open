// A PAXT is only worth signing if anyone can read it, check every signature and count again, and get the same
// answer. These checks hold engine/paxt.js to the PAXT 1 reference on a Dash document, and to the Gratus profile
// on a garden one. Signatures come from real device keys, Ed25519 and P-256, made by WebCrypto the way a browser
// makes them, and each kind of tampering must be caught.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as P from '../../engine/paxt.js';
import * as S from '../../engine/vendor/paxt-suites.js';
import { recountText, readRecount } from '../../assets/js/pact.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
// The reference lives beside this repo on the machine it was written on. It is read, never changed; when it is
// not there (a fresh clone), the checks that compare against it are skipped and the rest still run.
const REF = resolve(root, '..', 'dashsupport-team', 'paxt-core.mjs');
// The reference vectors sit in the PAXT folder on that machine. Name the file in PAXT_VECTORS to compare against
// it; a path written here would put a home folder into a public file.
const VECTORS = process.env.PAXT_VECTORS || '';
const hasRef = existsSync(REF);
const hasVectors = !!VECTORS && existsSync(VECTORS);

const subtle = globalThis.crypto.subtle;
// the order of the P-256 group, to write the upper-half twin of a signature
const P256_N = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;
const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
const be32 = (n) => Uint8Array.from(n.toString(16).padStart(64, '0').match(/../g), (h) => parseInt(h, 16));

/** A real device key, made the way keys.js makes one, with the private half kept inside WebCrypto.
    kind is 'ed25519' or 'p256'. raw(line) is WebCrypto's own signature, before any rewriting. */
async function deviceKey(kind = 'ed25519') {
  const ed = kind === 'ed25519';
  const pair = await subtle.generateKey(ed ? { name: 'Ed25519' } : { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
  const raw = new Uint8Array(await subtle.exportKey('raw', pair.publicKey));
  const address = 'did:key:' + (ed ? P.didKeyAddress('ed25519', raw) : P.p256DidKey(raw));
  const alg = ed ? { name: 'Ed25519' } : { name: 'ECDSA', hash: 'SHA-256' };
  const rawSign = async (bytes) => new Uint8Array(await subtle.sign(alg, pair.privateKey, bytes));
  const fix = (sig) => (ed ? sig : P.p256LowS(sig));
  const sign = async (line) => P.toBase64url(fix(await rawSign(P.signedBytes(line))));
  /* the wrong way: the line's bytes with no device prefix in front */
  const signBare = async (line) => P.toBase64url(fix(await rawSign(new TextEncoder().encode(line))));
  return { kind, address, sign, signBare, raw: (line) => rawSign(P.signedBytes(line)) };
}

async function entry(key, line, name = '') {
  return { address: key.address, line, sig: await key.sign(line), name, at: '2026-11-25T12:00:00.000Z' };
}

const GARDEN = {
  id: 'kitchen-table',
  title: 'The kitchen table',
  threshold: 3,
  opens: '2026-11-25',
  closes: '2026-12-01T18:00Z',
  body: 'Intent: a promise between us, kept by choice. It is not a contract and it moves no money.\n\nWe eat together on Sundays.',
};

async function garden(over = {}) {
  const doc = P.template({ ...GARDEN, ...over });
  const parsed = P.parseGarden(doc);
  assert.ok(parsed.ok, JSON.stringify(parsed.errors));
  const digest = await P.digestOf(doc);
  const line = (choice, rev = 1) => P.ballotLine({ id: parsed.terms.id, choices: [choice], digest: digest.short, rev });
  return { doc, terms: parsed.terms, digest, line };
}

const tally = (g, ballots, extra = {}) => P.count({ terms: g.terms, digestShort: g.digest.short, ballots, verify: P.verifyGarden, ...extra });

/* ------------------------------------------------------------------ the reference, on a Dash document */

// Our own Dash-voice document, so the test needs nothing outside this repo to run.
const DASH_DOC = [
  'paxt1',
  'id: dash-quiet-hours',
  'title: Quiet Hours',
  'kind: paxt',
  'voice: voting',
  'opens: 2026-12-01',
  'closes: 2027-01-15',
  'threshold: 5',
  '---',
  'Partners announce upgrades a day ahead.',
  '',
].join('\r\n');

test('a Dash document still reads, exactly as PAXT 1 reads it', async () => {
  const r = P.parseDoc(DASH_DOC);
  assert.ok(r.ok, JSON.stringify(r.errors));
  assert.equal(r.terms.voice, 'voting');
  assert.equal(r.terms.kind, 'paxt');
  assert.equal(r.terms.threshold, 5);
  assert.deepEqual(r.terms.options, ['join', 'leave']);
  assert.equal(r.terms.opens, Date.parse('2026-12-01T00:00:00Z'));
  /* the canonical form drops the CRs and the blank line at the end, and the hash is over that form */
  assert.equal(P.canon(DASH_DOC), DASH_DOC.replace(/\r\n/g, '\n').replace(/\n+$/, '') + '\n');
  assert.equal(P.canon(P.canon(DASH_DOC)), P.canon(DASH_DOC));
  /* Gratus itself opens only garden documents */
  const g = P.parseGarden(DASH_DOC);
  assert.equal(g.ok, false);
  assert.match(g.errors.join(' '), /voice: garden/);
});

test('the reference vectors give the same answers here', { skip: !hasVectors && 'reference vectors not on this machine' }, async () => {
  const v = JSON.parse(readFileSync(VECTORS, 'utf8'));
  const d = await P.digestOf(v.doc);
  assert.equal(d.full, v.digest);
  assert.equal(d.short, v.short);
  assert.equal(P.ballotLine({ id: 'dash-keys-apart', choices: ['join'], digest: d.short }), v.join);
  assert.equal(P.ballotLine({ id: 'dash-keys-apart', choices: ['leave'], digest: d.short }), v.leave);
  assert.equal((await P.digestOf(v.poll)).full, v.pollDigest);
  assert.equal((await P.digestOf(v.election)).full, v.electionDigest);
  for (const doc of [v.doc, v.poll, v.election]) assert.ok(P.parseDoc(doc).ok);
  for (const l of v.lines.good) assert.ok(P.parseLine(l), l);
  for (const l of v.lines.bad) assert.equal(P.parseLine(l), null, l);
});

test('lines read and refuse the way the reference vectors say', () => {
  const good = [
    'paxt1 dash-keys-apart join 4a1a92da01d880fdae75d623c17f3f5a',
    'paxt1 dash-keys-apart join 4a1a92da01d880fdae75d623c17f3f5a #2',
    'paxt1 dash-keys-apart/rotate-yearly yes ef6b7d142e078d908420457431c96acc',
    'paxt1 dash-trust-protectors-2027 ana+chi+hal cbc4f932a4eb48ca96e939af61f3f31a',
  ];
  const bad = [
    'paxt1 x/y b+a 4a1a92da01d880fdae75d623c17f3f5a',
    'paxt1 dash-keys-apart join 4a1a92da01d880fdae75d623c17f3f5a ',
    'PAXT1 DASH-KEYS-APART JOIN 4A1A92DA01D880FDAE75D623C17F3F5A',
    'paxt1 dash-keys-apart join',
    'paxt1 dash-keys-apart join 4a1a92da01d880fdae75d623c17f3f5a #0',
    'paxt1 dash-keys-apart join 4a1a92da01d880fdae75d623c17f3f5a #1000',
  ];
  for (const l of good) assert.ok(P.parseLine(l), l);
  for (const l of bad) assert.equal(P.parseLine(l), null, l);
  assert.deepEqual(P.parseLine(good[1]), { id: 'dash-keys-apart', choices: ['join'], digest: '4a1a92da01d880fdae75d623c17f3f5a', rev: 2 });
  assert.deepEqual(P.parseLine(good[3]).choices, ['ana', 'chi', 'hal']);
  /* ballotLine sorts and removes repeats, so one choice has one spelling */
  assert.equal(P.ballotLine({ id: 'x-y-z', choices: ['hal', 'ana', 'ana'], digest: 'a'.repeat(32), rev: 3 }), 'paxt1 x-y-z ana+hal ' + 'a'.repeat(32) + ' #3');
});

test('on a Dash record the count and the partners match the reference', { skip: !hasRef && 'reference not on this machine' }, async () => {
  const R = await import(pathToFileURL(REF).href);
  const docs = [DASH_DOC, P.template(GARDEN).replace('voice: garden', 'voice: owner'), 'paxt1\nid: x\n---\nhi\n', 'nope'];
  if (hasVectors) { const v = JSON.parse(readFileSync(VECTORS, 'utf8')); docs.push(v.doc, v.poll, v.election); }
  for (const doc of docs) {
    assert.deepEqual(P.parseDoc(doc), R.parseDoc(doc));
    assert.deepEqual(await P.digestOf(doc), await R.digestOf(doc));
    assert.equal(P.canon(doc), R.canon(doc));
  }
  const terms = P.parseDoc(DASH_DOC).terms;
  const { short } = await P.digestOf(DASH_DOC);
  const L = (c, rev) => P.ballotLine({ id: terms.id, choices: [c], digest: short, rev });
  const ballots = [
    { address: 'Xa', line: L('join'), sig: 's' },
    { address: 'Xb', line: L('join'), sig: 's' },
    { address: 'Xb', line: L('leave', 2), sig: 's' },
    { address: 'Xc', line: L('join'), sig: 's' },
    { address: 'Xc', line: L('leave'), sig: 's' },
    { address: 'Xd', line: L('join'), sig: 'bad' },
    { address: 'Xe', line: L('join'), sig: 's' },
    { address: 'Xf', line: 'paxt1 dash-quiet-hours join ' + 'f'.repeat(32), sig: 's' },
    { address: 'Xg', line: 'hello', sig: 's' },
  ];
  const weights = { Xa: 4, Xb: 1, Xc: 1, Xd: 1, Xe: 0, Xf: 1, Xg: 1 };
  const args = { terms, digestShort: short, ballots, weightOf: (a) => weights[a] || 0, total: 9, verify: async (a, l, s) => s === 's' };
  assert.deepEqual(await P.count(args), await R.count(args));
  assert.deepEqual(await P.partnersOf(args), await R.partnersOf(args));
  const mine = await P.count(args);
  assert.equal(mine.joined, 4);
  assert.deepEqual(mine.aside, { malformed: 1, wrongDocument: 1, badSignature: 1, noVoice: 1, replaced: 1, conflicting: 1 });
});

/* ------------------------------------------------------------------ the shared device-key format */

test('signed bytes are the suites\' device prefix, then the line', async () => {
  const g = await garden();
  const line = g.line('join');
  assert.equal(P.DEVICE_PREFIX, S.DEVICE_PREFIX);
  assert.equal(new TextDecoder().decode(P.signedBytes(line)), 'PAXT Signed Line:\n' + line);
  assert.equal('NS' in P, false, 'the old gratus namespace is gone');
});

test('an Ed25519 key and a P-256 key both sign, and the vendored verifyAccount accepts both', async () => {
  const g = await garden();
  const line = g.line('join');
  for (const kind of ['ed25519', 'p256']) {
    const k = await deviceKey(kind);
    assert.match(k.address, kind === 'ed25519' ? /^did:key:z6Mk/ : /^did:key:zDn/);
    assert.equal(await P.canonicalId(k.address), k.address, kind + ': the address is in its one spelling');
    const e = await entry(k, line, 'Ana');
    assert.equal(e.sig.length, 86);
    assert.equal(P.entryProblem(e), null);
    assert.equal(await S.verifyAccount(e.address, e.line, e.sig), true, kind + ': the suites accept it');
    assert.equal(await P.verifyEntry(e), true, kind + ': the engine accepts it');
  }
});

test('a P-256 signature with s in the upper half is refused until p256LowS rewrites it', async () => {
  const g = await garden();
  const line = g.line('join');
  const k = await deviceKey('p256');
  const sig = await k.raw(line);
  const s = BigInt('0x' + hex(sig.slice(32)));
  /* whichever half WebCrypto gave, write the signature with s in the upper half */
  const high = new Uint8Array(64);
  high.set(sig.slice(0, 32));
  high.set(be32(s > P256_N / 2n ? s : P256_N - s), 32);
  const highEntry = { address: k.address, line, sig: P.toBase64url(high), name: '' };
  assert.equal(P.entryProblem(highEntry), null, 'it is shaped right; only the check tells');
  assert.equal(await P.verifyEntry(highEntry), false);
  assert.equal(await S.verifyAccount(k.address, line, highEntry.sig), false);
  const low = P.p256LowS(high);
  assert.ok(BigInt('0x' + hex(low.slice(32))) <= P256_N / 2n);
  assert.equal(await P.verifyEntry({ ...highEntry, sig: P.toBase64url(low) }), true);
  /* and the rewrite leaves a lower-half signature as it is */
  assert.deepEqual(P.p256LowS(low), low);
});

test('a tampered line, signature or address is refused, for both kinds of key', async () => {
  const g = await garden();
  const line = g.line('join');
  const [ed, ed2, ec, ec2] = await Promise.all([deviceKey('ed25519'), deviceKey('ed25519'), deviceKey('p256'), deviceKey('p256')]);
  for (const [k, twin, other] of [[ed, ed2, ec], [ec, ec2, ed]]) {
    const e = await entry(k, line);
    assert.equal(await P.verifyEntry(e), true, 'the control: the entry as signed holds');
    /* the line */
    assert.equal(await P.verifyEntry({ ...e, line: g.line('leave') }), false);
    assert.equal(await P.verifyEntry({ ...e, line: g.line('join', 2) }), false);
    /* the signature */
    const bent = P.fromBase64url(e.sig); bent[10] ^= 1;
    assert.equal(await P.verifyEntry({ ...e, sig: P.toBase64url(bent) }), false);
    assert.equal(await P.verifyEntry({ ...e, sig: e.sig.slice(0, -2) }), false);
    /* the address: another key of the same kind, a key of the other kind, a broken spelling */
    assert.equal(await P.verifyEntry({ ...e, address: twin.address }), false);
    assert.equal(await P.verifyEntry({ ...e, address: other.address }), false);
    assert.equal(await P.verifyEntry({ ...e, address: e.address.slice(0, -1) }), false);
    assert.equal(await P.verifyEntry({ ...e, address: e.address + ' ' }), false);
    assert.equal(await P.verifyEntry({ ...e, address: e.address.slice('did:key:'.length) }), false);
    assert.equal((await tally(g, [{ ...e, address: twin.address }])).aside.badSignature, 1);
  }
  assert.equal(await P.verifyEntry(null), false);
  assert.equal(await P.verifyEntry({ address: ed.address, line: undefined, sig: 'x' }), false);
});

test('a runtime that cannot run the check says so, and never counts a good line as a bad signature', async () => {
  const g = await garden();
  const e = await entry(await deviceKey('ed25519'), g.line('join'));
  assert.equal(await P.verifyEntry(e), true, 'the control: with a whole WebCrypto the line holds');
  // a WebCrypto with no SHA-512, which the Ed25519 check needs
  const digest = subtle.digest;
  subtle.digest = function (alg, data) {
    if (String((alg && alg.name) || alg).toUpperCase() === 'SHA-512') return Promise.reject(new Error('SHA-512 is not here'));
    return digest.call(subtle, alg, data);
  };
  try {
    await assert.rejects(P.verifyEntry(e), /SHA-512 is not here/);
    await assert.rejects(tally(g, [e]), /SHA-512 is not here/, 'the count stops; it does not set the line aside');
    // malformed input is still plainly false, with no crypto needed to say so
    assert.equal(await P.verifyEntry(null), false);
    assert.equal(await P.verifyEntry({ ...e, address: 'did:key:nope' }), false);
    assert.equal(await P.verifyEntry({ ...e, sig: 7 }), false);
  } finally {
    subtle.digest = digest;
  }
  assert.equal(await P.verifyEntry(e), true);
});

test('the garden takes device keys only, not a wallet\'s account', async () => {
  const v = JSON.parse(readFileSync(resolve(root, 'scripts/tests/fixtures/paxt-suites.vectors.json'), 'utf8'));
  const eth = v.suites.eip191[0];
  const id = 'eip155:1:' + eth.account;
  /* the suites themselves accept the wallet's line... */
  assert.equal(await S.verifyAccount(id, v.line, eth.signature), true);
  /* ...and a garden turns it away, by shape and by verify */
  assert.match(P.entryProblem({ address: id, line: v.line, sig: eth.signature }), /device key/);
  assert.equal(await P.verifyEntry({ address: id, line: v.line, sig: eth.signature }), false);
  assert.equal(P.gardenSuite(id), null);
  /* the did:key vectors are taken, in the full id */
  const ed = v.suites['did-key:ed25519'][0], ec = v.suites['did-key:p256'][0];
  assert.equal(P.gardenSuite('did:key:' + ed.account), 'did-key:ed25519');
  assert.equal(P.gardenSuite('did:key:' + ec.account), 'did-key:p256');
  assert.equal(await P.verifyGarden('did:key:' + ed.account, v.line, ed.signature), true);
  assert.equal(await P.verifyGarden('did:key:' + ec.account, v.line, ec.signature), true);
});

/* ------------------------------------------------------------------ the garden profile */

test('a garden document goes round: written, read, signed, counted, recounted from its export', async () => {
  const g = await garden();
  assert.equal(g.doc, P.canon(g.doc));
  assert.ok(g.doc.startsWith('paxt1\nid: kitchen-table\ntitle: The kitchen table\nkind: paxt\nvoice: garden\n'));
  assert.equal(g.terms.threshold, 3);
  assert.equal(g.terms.closes, Date.parse('2026-12-01T18:00:00Z'));
  assert.match(g.terms.body, /^Intent: a promise between us/);
  assert.equal(g.line('join'), 'paxt1 kitchen-table join ' + g.digest.short);

  const keys = await Promise.all([deviceKey(), deviceKey(), deviceKey()]);
  const entries = [await entry(keys[0], g.line('join'), 'Ana'), await entry(keys[1], g.line('join'), 'Ben'), await entry(keys[2], g.line('join'))];
  for (const e of entries) {
    assert.equal(P.entryProblem(e), null);
    assert.equal(await P.verifyEntry(e), true);
  }
  const c = await tally(g, entries);
  assert.equal(c.joined, 3);
  assert.equal(c.inForce, true);
  assert.equal(c.outcome, 'in force');
  const chain = await P.chainOf(g.digest.full, entries);
  assert.equal(chain.hashes.length, 3);
  assert.equal(chain.head, chain.hashes[2]);
  assert.equal(chain.hashes[0], await P.entryHash(g.digest.full, entries[0]));
  assert.equal(chain.hashes[0], await P.sha256hex(g.digest.full + '\n' + entries[0].address + '\n' + entries[0].line + '\n' + entries[0].sig));

  /* a second person, on their own device, starts from only the exported text and gets the same answer */
  const exported = JSON.stringify({ doc: g.doc, entries });
  const back = JSON.parse(exported);
  const terms2 = P.parseGarden(back.doc).terms;
  const d2 = await P.digestOf(back.doc);
  assert.deepEqual(await P.count({ terms: terms2, digestShort: d2.short, ballots: back.entries, verify: P.verifyGarden }), c);
  assert.equal((await P.chainOf(d2.full, back.entries)).head, chain.head);
  assert.deepEqual(await P.partnersOf({ terms: terms2, digestShort: d2.short, ballots: back.entries, verify: P.verifyGarden }), new Set(keys.map((k) => k.address)));
});

test('a record from both kinds of key counts the same on a second recount', async () => {
  const g = await garden({ threshold: 4 });
  const keys = await Promise.all([deviceKey('ed25519'), deviceKey('p256'), deviceKey('ed25519'), deviceKey('p256')]);
  const entries = [
    await entry(keys[0], g.line('join'), 'Ana'),
    await entry(keys[1], g.line('join'), 'Ben'),
    await entry(keys[2], g.line('join'), 'Cy'),
    await entry(keys[3], g.line('join'), 'Dee'),
    await entry(keys[1], g.line('leave', 2), 'Ben'),
    await entry(keys[1], g.line('join', 3), 'Ben'),
  ];
  const first = await tally(g, entries);
  assert.equal(first.joined, 4, 'each key counts once, whatever its kind');
  assert.equal(first.keys, 4);
  assert.equal(first.inForce, true);
  assert.equal(first.aside.replaced, 2);
  assert.equal(first.aside.badSignature, 0);
  const head = (await P.chainOf(g.digest.full, entries)).head;

  /* the recount file, read back on another device, gives the same count and the same head */
  const file = recountText(g.doc, entries, head);
  const back = readRecount(file);
  assert.ok(back, 'the recount file reads back');
  assert.equal(back.head, head);
  const parsed = P.parseGarden(back.doc);
  assert.ok(parsed.ok);
  const d = await P.digestOf(back.doc);
  assert.equal(d.full, g.digest.full);
  const second = await P.count({ terms: parsed.terms, digestShort: d.short, ballots: back.entries, verify: P.verifyGarden });
  assert.deepEqual(second, first);
  assert.equal((await P.chainOf(d.full, back.entries)).head, head);
  assert.deepEqual(await P.partnersOf({ terms: parsed.terms, digestShort: d.short, ballots: back.entries, verify: P.verifyGarden }), new Set(keys.map((k) => k.address)));
  /* and through JSON as well */
  const viaJson = JSON.parse(JSON.stringify(entries));
  assert.deepEqual(await tally(g, viaJson), first);
});

test('a change to the text is caught: every line signed names the old text', async () => {
  const g = await garden();
  const k = await deviceKey();
  const e = await entry(k, g.line('join'));
  const changed = g.doc.replace('Sundays', 'Saturdays');
  const parsed = P.parseGarden(changed);
  assert.ok(parsed.ok);
  const d = await P.digestOf(changed);
  assert.notEqual(d.short, g.digest.short);
  assert.match(P.lineProblem(parsed.terms, d.short, P.parseLine(e.line)), /another text/);
  const c = await P.count({ terms: parsed.terms, digestShort: d.short, ballots: [e], verify: P.verifyGarden });
  assert.equal(c.joined, 0);
  assert.equal(c.aside.wrongDocument, 1);
  /* a stray space at a line end or a CRLF is not a change: the canonical form is the same text */
  assert.equal((await P.digestOf(g.doc.replace(/\n/g, ' \r\n'))).full, g.digest.full);
});

test('a change to a signed line is caught', async () => {
  const g = await garden();
  const k = await deviceKey();
  const e = await entry(k, g.line('join'));
  const swapped = { ...e, line: g.line('leave') };
  assert.equal(await P.verifyEntry(swapped), false);
  const later = { ...e, line: g.line('join', 2) };
  assert.equal(await P.verifyEntry(later), false);
  const c = await tally(g, [swapped, later]);
  assert.equal(c.keys, 0);
  assert.equal(c.aside.badSignature, 2);
});

test('a reordered, removed or changed record entry changes the chain', async () => {
  const g = await garden();
  const keys = await Promise.all([deviceKey(), deviceKey('p256'), deviceKey()]);
  const entries = await Promise.all(keys.map((k) => entry(k, g.line('join'))));
  const head = (await P.chainOf(g.digest.full, entries)).head;
  assert.notEqual((await P.chainOf(g.digest.full, [entries[1], entries[0], entries[2]])).head, head);
  assert.notEqual((await P.chainOf(g.digest.full, [entries[0], entries[2]])).head, head);
  assert.notEqual((await P.chainOf(g.digest.full, [entries[0], entries[1], { ...entries[2], line: g.line('leave') }])).head, head);
  assert.notEqual((await P.chainOf(g.digest.full, [entries[0], entries[1], { ...entries[2], address: keys[0].address }])).head, head);
  /* the chain starts from the document, so the same entries under another text give another head */
  const other = await P.digestOf(g.doc.replace('Sundays', 'Mondays'));
  assert.notEqual((await P.chainOf(other.full, entries)).head, head);
  /* the chain is over address, line and sig: name and at are the record's notes and do not move it */
  assert.equal((await P.chainOf(g.digest.full, entries.map((e) => ({ ...e, name: 'x', at: 'y' })))).head, head);
  assert.equal((await P.chainOf(g.digest.full, [])).head, g.digest.full);
});

test('a change of mind: the highest revision speaks, whatever order it arrives in', async () => {
  const g = await garden({ threshold: 2 });
  const [a, b] = await Promise.all([deviceKey(), deviceKey('p256')]);
  const join1 = await entry(a, g.line('join'));
  const leave2 = await entry(a, g.line('leave', 2));
  const join3 = await entry(a, g.line('join', 3));
  const bJoin = await entry(b, g.line('join'));

  let c = await tally(g, [join1, bJoin, leave2]);
  assert.equal(c.joined, 1);
  assert.equal(c.by.leave, 1);
  assert.equal(c.inForce, false);
  assert.equal(c.aside.replaced, 1);

  c = await tally(g, [leave2, join1, bJoin]);
  assert.equal(c.joined, 1, 'an older line arriving later does not undo the newer one');

  c = await tally(g, [join1, leave2, join3, bJoin]);
  assert.equal(c.joined, 2);
  assert.equal(c.inForce, true);
  assert.deepEqual(await P.partnersOf({ terms: g.terms, digestShort: g.digest.short, ballots: [join1, leave2, bJoin], verify: P.verifyGarden }), new Set([b.address]));

  /* the same line twice is a repeat, not two voices */
  c = await tally(g, [bJoin, bJoin]);
  assert.equal(c.joined, 1);
  assert.equal(c.keys, 1);
  /* a P-256 key signs the same line differently each time; both signatures are still one voice */
  const bJoinAgain = await entry(b, g.line('join'));
  c = await tally(g, [bJoin, bJoinAgain]);
  assert.equal(c.joined, 1);
  assert.equal(c.keys, 1);
});

test('two choices at one revision count for neither', async () => {
  const g = await garden({ threshold: 1 });
  const [a, b] = await Promise.all([deviceKey(), deviceKey('p256')]);
  const ballots = [await entry(a, g.line('join')), await entry(a, g.line('leave')), await entry(b, g.line('join', 2)), await entry(b, g.line('leave', 2))];
  const c = await tally(g, ballots);
  assert.equal(c.joined, 0);
  assert.equal(c.by.leave, 0);
  assert.equal(c.keys, 0);
  assert.equal(c.aside.conflicting, 2);
  assert.deepEqual(await P.partnersOf({ terms: g.terms, digestShort: g.digest.short, ballots, verify: P.verifyGarden }), new Set());
  /* a higher revision afterwards settles it */
  const settled = await tally(g, [...ballots, await entry(a, g.line('join', 2))]);
  assert.equal(settled.joined, 1);
  assert.equal(settled.inForce, true);
});

test('the threshold: in force when enough have joined, and not one sooner', async () => {
  const g = await garden({ threshold: 3 });
  const keys = await Promise.all([deviceKey(), deviceKey(), deviceKey()]);
  const joins = await Promise.all(keys.map((k) => entry(k, g.line('join'))));
  const two = await tally(g, joins.slice(0, 2), { total: 5 });
  assert.equal(two.joined, 2);
  assert.equal(two.inForce, false);
  assert.equal(two.outcome, 'below its threshold');
  assert.equal(two.turnout, 2 / 5);
  const three = await tally(g, joins);
  assert.equal(three.inForce, true);
  /* a leave is counted under leave and never toward the threshold */
  const leaveInstead = await tally(g, [...joins.slice(0, 2), await entry(keys[2], g.line('leave'))]);
  assert.equal(leaveInstead.inForce, false);
});

test('a garden document with a header line it does not know is refused', () => {
  const doc = P.template(GARDEN).replace('threshold: 3\n', 'threshold: 3\ncolour: green\n');
  const r = P.parseGarden(doc);
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /does not know: colour/);
  assert.equal(P.parseDoc(doc).ok, false);
  /* and the other ways a garden document can be wrong */
  assert.equal(P.parseGarden(P.template(GARDEN).replace('kind: paxt\nvoice: garden\nopens: 2026-11-25\ncloses: 2026-12-01T18:00Z\nthreshold: 3', 'kind: poll\nvoice: garden\nopens: 2026-11-25\ncloses: 2026-12-01T18:00Z\noptions: yes, no\nrule: net 10')).ok, false);
  assert.equal(P.parseGarden(P.template({ ...GARDEN, closes: '2026-11-20' })).ok, false);
  assert.equal(P.parseGarden(P.template({ ...GARDEN, threshold: 0 })).ok, false);
  assert.equal(P.parseGarden(P.template({ ...GARDEN, id: 'Kitchen Table' })).ok, false);
  assert.equal(P.parseGarden(P.template({ ...GARDEN, body: '   ' })).ok, false);
  assert.equal(P.parseGarden(P.template(GARDEN).replace('voice: garden', 'voice: forest')).ok, false);
});

test('a signature made without the device prefix is refused', async () => {
  const g = await garden();
  const line = g.line('join');
  for (const kind of ['ed25519', 'p256']) {
    const k = await deviceKey(kind);
    const bare = { address: k.address, line, sig: await k.signBare(line) };
    assert.equal(P.entryProblem(bare), null, 'it is shaped right; only the signature tells');
    assert.equal(await P.verifyEntry(bare), false, kind);
    assert.equal((await tally(g, [bare])).aside.badSignature, 1);
    /* the control: the same key over the prefixed line */
    assert.equal(await P.verifyEntry({ ...bare, sig: await k.sign(line) }), true, kind);
  }
});

test('template keeps every header value on its own line', () => {
  assert.throws(() => P.template({ ...GARDEN, title: 'Tea\nthreshold: 1' }), /one line/);
  assert.throws(() => P.template({ ...GARDEN, id: 'a\r\nb' }), /one line/);
  /* U+2028 and U+2029 break a line in some readers, so they are refused too */
  assert.throws(() => P.template({ ...GARDEN, title: 'Tea\u2028threshold: 1' }), /one line/);
  assert.throws(() => P.template({ ...GARDEN, title: 'Tea\u2029threshold: 1' }), /one line/);
  assert.throws(() => P.template({ ...GARDEN, closes: '2026-12-01\u2028' + 'x' }), /one line/);
  assert.throws(() => P.template({ ...GARDEN, threshold: 'many' }), /whole number/);
  assert.throws(() => P.template({ ...GARDEN, title: '' }), /needed/);
  /* the control: the same title on one line is kept */
  assert.ok(P.parseGarden(P.template({ ...GARDEN, title: 'Tea, threshold one' })).ok);
  const fromDates = P.template({ ...GARDEN, opens: new Date('2026-11-25T09:30:12Z'), closes: new Date('2026-12-02T00:00:00Z') });
  assert.match(fromDates, /\nopens: 2026-11-25T09:30Z\ncloses: 2026-12-02T00:00Z\n/);
  assert.ok(P.parseGarden(fromDates).ok);
});

test('a signature has one spelling, so one signed line is never two', () => {
  const bytes = new Uint8Array(64).map((_, i) => i * 7);
  const s = P.toBase64url(bytes);
  assert.equal(s.length, 86);
  assert.deepEqual(P.fromBase64url(s), bytes);
  assert.equal(P.toBase64url(new Uint8Array([251, 255])), '-_8');
  /* the last character of 64 bytes carries 4 spare bits; any other value of them is another spelling */
  const last = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const twin = s.slice(0, -1) + last[last.indexOf(s.at(-1)) + 1];
  assert.equal(P.fromBase64url(twin), null);
  for (const bad of ['a+b', 'ab=', 'a', 'ab cd', 'ab/c', '', null, 42]) assert.equal(P.fromBase64url(bad), null, String(bad));
});

test('an entry is held to its shape before any crypto is spent on it', async () => {
  const g = await garden();
  const k = await deviceKey();
  const e = await entry(k, g.line('join'), 'Ana');
  assert.equal(P.entryProblem(e), null);
  assert.equal(P.entryProblem({ ...e, name: undefined }), null);
  assert.match(P.entryProblem({ ...e, name: 'x'.repeat(41) }), /40/);
  assert.equal(P.entryProblem({ ...e, name: '🌱'.repeat(40) }), null, 'forty characters, however many bytes');
  assert.match(P.entryProblem({ ...e, name: '<b>Ana</b>' }), /< or >/);
  assert.match(P.entryProblem({ ...e, name: 'Ana\nBen' }), /one plain line/);
  assert.match(P.entryProblem({ ...e, line: 'hello' }), /PAXT line/);
  assert.match(P.entryProblem({ ...e, address: e.address.slice(1) }), /device key/);
  assert.match(P.entryProblem({ ...e, address: 'not a key' }), /device key/);
  assert.match(P.entryProblem({ ...e, address: undefined }), /device key/);
  assert.match(P.entryProblem({ ...e, pub: e.address, address: undefined }), /device key/, 'the old field is not read');
  assert.match(P.entryProblem({ ...e, sig: e.sig + 'AA' }), /64-byte/);
  assert.match(P.entryProblem({ ...e, sig: null }), /64-byte/);
  assert.match(P.entryProblem({ ...e, sig: ' ' + e.sig }), /64-byte/);
  assert.match(P.entryProblem('x'), /object/);
  assert.match(P.entryProblem(null), /object/);
});

test('a name cannot hide characters or turn its text around', () => {
  const hidden = [
    ['U+202A', '\u202a'], ['U+202B', '\u202b'], ['U+202C', '\u202c'], ['U+202D', '\u202d'], ['U+202E', '\u202e'],
    ['U+2066', '\u2066'], ['U+2067', '\u2067'], ['U+2068', '\u2068'], ['U+2069', '\u2069'],
    ['U+200B', '\u200b'], ['U+200C', '\u200c'], ['U+200D', '\u200d'], ['U+200E', '\u200e'], ['U+200F', '\u200f'],
    ['U+FEFF', '\ufeff'],
  ];
  for (const [what, ch] of hidden) {
    assert.match(String(P.nameProblem('Ana' + ch + 'Ben')), /hidden characters/, what);
    assert.match(String(P.nameProblem(ch)), /hidden characters/, what + ' alone');
  }
  for (const [what, ch] of [['U+2028', '\u2028'], ['U+2029', '\u2029']]) assert.match(String(P.nameProblem('Ana' + ch + 'Ben')), /one plain line/, what);
  /* the controls: plain names, accents, scripts that run right to left on their own, and emoji are kept */
  for (const ok of ['Ana', 'Zoë', 'José María', 'محمد', 'שרה', '李华', '🌱 Ana', '', undefined, null]) assert.equal(P.nameProblem(ok), null, String(ok));
});
