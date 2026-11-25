// PAXT · the open record keeps only what was signed, and shows when it has been touched.
//
// A PAXT comes into force when enough people have each signed one line with their own key. The record is
// where those lines are kept, so this proves the record keeps only lines that belong: the right text, a
// signature that holds, before the close, within the caps. It proves lines sent in the same moment are all
// kept, that one connection cannot add more than twelve keys to one PAXT, that a record changed in the store is
// caught the next time it is read (and a deleted line by any device that saw it), that the store's paths
// never carry an id, and that a preview writes only under gratus/preview/. Every refusal has a control: the
// same call with the one wrong thing put right, which must be kept.
// The caps are also tried with requests sent all at once through a store that answers after a short wait, as a
// real one does, so a cap that only holds one request at a time fails here.
//
//   node --import ./scripts/gates/lib/loader.mjs scripts/gates/paxt.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash, createHmac } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { __MEM as MEM, __delay, __COUNT, __hide, __page } from './lib/blob-stub.mjs';

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
const fresh = () => { n++; return '10.' + ((n >> 16) & 255) + '.' + ((n >> 8) & 255) + '.' + (n & 255); };
const post = (body, ip) => ({ method: 'POST', headers: { 'x-forwarded-for': ip || fresh() }, query: {}, body });
const get = (query) => ({ method: 'GET', headers: { 'x-forwarded-for': fresh() }, query });
const SEEN = [];
const call = async (h, req) => { const r = res(); await h(req, r); SEEN.push(JSON.stringify(r.body)); return r; };

console.log('PAXT - the open record');
process.env.BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || 'gate-token';
const SALT = process.env.GRATUS_SALT = process.env.GRATUS_SALT || 'a-secret-that-is-not-in-the-store';
// every read goes to the store, so a change made in the store shows at once; the read cache has its own check
process.env.GRATUS_PAXT_READ_CACHE_MS = '0';
// the live paths: every check reads gratus/paxt/ until the preview checks near the end, which ask for both
process.env.VERCEL_ENV = 'production';
// a store that answers like a real one, a few tens of milliseconds later, for the checks that send at once
const slow = () => __delay(() => 20 + Math.random() * 30);
const quick = () => __delay(null);
const callersOf = (x) => 'gratus/paxt/' + createHmac('sha256', SALT).update('paxt-callers·' + x).digest('hex').slice(0, 32) + '/';
const P = await import(pathToFileURL(path.join(root, 'engine/paxt.js')).href);
const API = await import(pathToFileURL(path.join(root, 'api/paxt.js')).href);
const paxt = API.default;
const LIMITS = API.LIMITS || {};
const ROOM = await import(pathToFileURL(path.join(root, 'assets/js/pact.js')).href);

/* ------------------------------------------------------------------ keys and documents */

const subtle = globalThis.crypto.subtle;
// a device key in the shared format: Ed25519 by default, P-256 as a browser without Ed25519 makes one
async function newKey(kind = 'ed25519') {
  const ed = kind === 'ed25519';
  const kp = await subtle.generateKey(ed ? { name: 'Ed25519' } : { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
  const raw = new Uint8Array(await subtle.exportKey('raw', kp.publicKey));
  const address = 'did:key:' + (ed ? P.didKeyAddress('ed25519', raw) : P.p256DidKey(raw));
  const rawSign = async (bytes) => new Uint8Array(await subtle.sign(ed ? { name: 'Ed25519' } : { name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, bytes));
  const sign = async (line) => P.toBase64url(ed ? await rawSign(P.signedBytes(line)) : P.p256LowS(await rawSign(P.signedBytes(line))));
  return { kind, address, sign, rawSign };
}
async function entryFor(key, doc, choice, rev = 1, name = '') {
  const t = P.parseDoc(doc).terms, d = await P.digestOf(doc);
  const line = P.ballotLine({ id: t.id, choices: [choice], digest: d.short, rev });
  return { address: key.address, line, sig: await key.sign(line), name };
}
const MIN = 60000, DAY = 86400000;
const INTENT = 'Intent: a promise between us, kept by choice. It is not a contract and it moves no money.';
const garden = (id, more = {}) => P.template(Object.assign({
  id, title: 'Tea on Sundays', threshold: 2,
  opens: new Date(Date.now() - MIN), closes: new Date(Date.now() + 7 * DAY),
  body: INTENT + '\n\nWe meet for tea on Sundays and bring one thing we are glad of.',
}, more));
const open = (doc, ip) => call(paxt, post({ act: 'open', doc }, ip));
const sign = (id, entry, ip) => call(paxt, post({ act: 'sign', id, entry }, ip));
const read = (id) => call(paxt, get({ id }));
const recordKey = (id) => [...MEM.keys()].find((k) => k.startsWith('gratus/paxt/') && !k.includes('/_calls/') && (() => {
  try { return P.parseDoc(JSON.parse(MEM.get(k)).doc).terms.id === id; } catch (e) { return false; }
})());

/* ------------------------------------------------------------------ opening */

const DOC = garden('tea-on-sundays');
const opened = await open(DOC);
say(opened.code === 200 && opened.body.entries.length === 0 && opened.body.head === opened.body.digest && opened.body.count.joined === 0,
  'a garden PAXT opens with an empty record whose head is the document hash  (' + opened.code + ')');
say(opened.body.digest === (await P.digestOf(DOC)).full && opened.body.doc === DOC, 'and it keeps the text exactly as it was written');

const twice = await open(DOC);
say(twice.code === 409, 'the same id cannot be opened twice  (' + twice.code + ')');
// kept, so later checks sign this exact text: garden() reads the clock, and a run that crosses a minute
// would otherwise write a different text with a different hash
const TEA = garden('tea-on-mondays');
const otherId = await open(TEA);
say(otherId.code === 200, 'the control: the same text under a free id opens  (' + otherId.code + ')');

const dash = DOC.replace('id: tea-on-sundays', 'id: owner-voice-one').replace('voice: garden', 'voice: owner');
say(P.parseDoc(dash).ok, 'a document with a Dash voice is still a good PAXT 1 document');
const dashOpen = await open(dash);
say(dashOpen.code === 400, 'and Gratus will not open it  (' + dashOpen.code + ')');
const dashFixed = await open(dash.replace('voice: owner', 'voice: garden'));
say(dashFixed.code === 200, 'the control: the same document with voice garden opens  (' + dashFixed.code + ')');

const poll = P.canon(['paxt1', 'id: a-poll-here', 'title: Which day', 'kind: poll', 'voice: garden',
  'opens: ' + new Date(Date.now() - MIN).toISOString().slice(0, 16) + 'Z', 'closes: ' + new Date(Date.now() + DAY).toISOString().slice(0, 16) + 'Z',
  'options: monday,sunday', 'rule: majority 2', '---', INTENT].join('\n'));
say(P.parseDoc(poll).ok, 'a poll is a good PAXT 1 document');
const pollOpen = await open(poll);
say(pollOpen.code === 400, 'and Gratus does not open polls yet  (' + pollOpen.code + ')');
const pollFixed = await open(poll.replace('kind: poll', 'kind: paxt').replace('options: monday,sunday\nrule: majority 2', 'threshold: 2'));
say(pollFixed.code === 200, 'the control: the same text as a paxt opens  (' + pollFixed.code + ')');

const one = await open(garden('just-one-person', { threshold: 1 }));
const two = await open(garden('just-one-person', { threshold: 2 }));
say(one.code === 400 && two.code === 200, 'a threshold of one is refused and two is kept  (' + one.code + ', ' + two.code + ')');
const past = await open(garden('already-over', { opens: new Date(Date.now() - 2 * DAY), closes: new Date(Date.now() - DAY) }));
const future = await open(garden('already-over', { opens: new Date(Date.now() - 2 * DAY), closes: new Date(Date.now() + DAY) }));
say(past.code === 400 && future.code === 200, 'a closing time in the past is refused, one in the future is kept  (' + past.code + ', ' + future.code + ')');
{
  // A threshold the record can never reach is a promise that cannot be kept. The ceiling sits well under the
  // lines a record holds, so every key that joins can still change its mind more than once.
  const high = await open(garden('a-big-group', { threshold: (LIMITS.THRESHOLD_MAX || 1000) + 1 }));
  const top = await open(garden('a-big-group', { threshold: LIMITS.THRESHOLD_MAX || 1000 }));
  const old = await open(garden('nine-hundred-asked', { threshold: 900 }));
  say(LIMITS.THRESHOLD_MAX > 0 && LIMITS.THRESHOLD_MAX * 2 <= LIMITS.CAP_ENTRIES,
    'the highest threshold leaves room in the record for every key to change its mind  (' + LIMITS.THRESHOLD_MAX + ' of ' + LIMITS.CAP_ENTRIES + ' lines)');
  say(high.code === 400 && old.code === 400 && top.code === 200,
    'a threshold above the ceiling is refused (900 too), and the ceiling itself is kept  (' + high.code + ', ' + old.code + ', ' + top.code + ')');
  const draft = (n) => ROOM.draftDoc({ title: 'Big group', body: INTENT + '\n\nWe meet.', threshold: n, closes: new Date(Date.now() + 7 * DAY).toISOString().slice(0, 10) });
  const src = fs.readFileSync(path.join(root, 'assets/js/pact.js'), 'utf8');
  say(ROOM.THRESHOLD_MAX === LIMITS.THRESHOLD_MAX && !draft(LIMITS.THRESHOLD_MAX + 1).ok && draft(LIMITS.THRESHOLD_MAX).ok && !/\b1000\b/.test(src),
    'the room asks for the same ceiling: the sheet refuses one more and takes the ceiling, and no 1000 is left in it');
}

const extra = DOC.replace('id: tea-on-sundays', 'id: one-line-more').replace('threshold: 2', 'threshold: 2\ncolour: green');
const extraOpen = await open(extra);
const extraFixed = await open(extra.replace('\ncolour: green', ''));
say(extraOpen.code === 400 && extraFixed.code === 200, 'a header line this version does not know is refused, and the same document without it opens  (' + extraOpen.code + ', ' + extraFixed.code + ')');

/* ------------------------------------------------------------------ signing */

const ana = await newKey(), ben = await newKey(), cy = await newKey();
const a1 = await sign('tea-on-sundays', await entryFor(ana, DOC, 'join', 1, 'Ana'));
say(a1.code === 200 && a1.body.count.joined === 1 && !a1.body.count.inForce, 'a line signed by a real key is kept and the count moves to one  (' + a1.code + ')');
const b1 = await sign('tea-on-sundays', await entryFor(ben, DOC, 'join', 1, 'Ben'));
say(b1.code === 200 && b1.body.count.joined === 2 && b1.body.count.inForce, 'a second key joins and the PAXT is in force  (' + b1.code + ')');
say(b1.body.entries.map((e) => e.name).join(',') === 'Ana,Ben' && b1.body.entries.every((e) => typeof e.at === 'string'),
  'the record shows the names they chose and when each line arrived');
const again = await sign('tea-on-sundays', await entryFor(ana, DOC, 'join', 1, 'Ana'));
say(again.code === 200 && again.body.already === true && again.body.entries.length === 2, 'the same line sent twice is kept once  (' + again.code + ')');

const OTHER = garden('tea-on-sundays', { title: 'Tea on Sundays, and cake' });
const wrongText = await sign('tea-on-sundays', await entryFor(cy, OTHER, 'join'));
say(wrongText.code === 400, 'a line that names another text is refused  (' + wrongText.code + ')');
const rightText = await sign('tea-on-sundays', await entryFor(cy, DOC, 'join', 1, 'Cy'));
say(rightText.code === 200 && rightText.body.count.joined === 3, 'the control: the same key, with the hash of the text it was given, is kept  (' + rightText.code + ')');

const dee = await newKey();
const good = await entryFor(dee, DOC, 'join', 1, 'Dee');
const forged = Object.assign({}, good, { sig: (await entryFor(ana, DOC, 'join')).sig });
const badSig = await sign('tea-on-sundays', forged);
say(badSig.code === 400, 'a signature made by another key is refused  (' + badSig.code + ')');
const flipped = P.fromBase64url(good.sig); flipped[10] ^= 1;
const badSig2 = await sign('tea-on-sundays', Object.assign({}, good, { sig: P.toBase64url(flipped) }));
say(badSig2.code === 400, 'and so is a signature with one bit changed  (' + badSig2.code + ')');
{
  // a key that signs the bare line, as a key used somewhere else might have
  const k = await newKey();
  const line = (await entryFor(dee, DOC, 'join')).line;
  const bare = await sign('tea-on-sundays', { address: k.address, line, sig: P.toBase64url(await k.rawSign(new TextEncoder().encode(line))), name: '' });
  const named = await sign('tea-on-sundays', { address: k.address, line, sig: await k.sign(line), name: '' });
  say(bare.code === 400 && named.code === 200, 'a signature over the bare line, without the PAXT device prefix, is refused; the same key over the prefixed line is kept  (' + bare.code + ', ' + named.code + ')');
}
{
  // a P-256 key, as a browser without Ed25519 makes one. Its signature in the upper half is refused; the same
  // signature with s moved to the lower half (p256LowS) is kept.
  const N = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;
  const k = await newKey('p256');
  const line = (await entryFor(k, DOC, 'join')).line;
  const raw = await k.rawSign(P.signedBytes(line));
  const s = BigInt('0x' + [...raw.slice(32)].map((b) => b.toString(16).padStart(2, '0')).join(''));
  const hi = s > N / 2n ? s : N - s;
  const high = new Uint8Array(64); high.set(raw.slice(0, 32));
  high.set(Uint8Array.from(hi.toString(16).padStart(64, '0').match(/../g), (h) => parseInt(h, 16)), 32);
  const upper = await sign('tea-on-sundays', { address: k.address, line, sig: P.toBase64url(high), name: 'Pat' });
  const lower = await sign('tea-on-sundays', { address: k.address, line, sig: P.toBase64url(P.p256LowS(high)), name: 'Pat' });
  say(upper.code === 400 && lower.code === 200 && lower.body.entries.some((e) => e.address === k.address && /^did:key:zDn/.test(e.address)),
    'a P-256 signature with s in the upper half is refused, and the same one rewritten by p256LowS is kept  (' + upper.code + ', ' + lower.code + ')');
  // a wallet's account is a good PAXT signer elsewhere, but a garden takes device keys only
  const wallet = await sign('tea-on-sundays', { address: 'eip155:1:0x7e5f4552091a69125d5dfcb7b8c2659029395bdf', line, sig: '0x' + 'ab'.repeat(65), name: '' });
  say(wallet.code === 400, 'an address that is not a did:key device key is refused  (' + wallet.code + ')');
}
const goodSig = await sign('tea-on-sundays', good);
say(goodSig.code === 200 && goodSig.body.count.joined === 6, 'the control: the signature Dee made for that line is kept  (' + goodSig.code + ')');

const aLeave = await sign('tea-on-sundays', await entryFor(ana, DOC, 'leave', 2, 'Ana'));
say(aLeave.code === 200 && aLeave.body.count.joined === 5 && aLeave.body.count.by.leave === 1, 'a later revision is a change of mind, and the count follows it  (' + aLeave.code + ')');

const angle = await sign('tea-on-sundays', Object.assign(await entryFor(await newKey(), DOC, 'join'), { name: '<b>hi</b>' }));
const plain = await sign('tea-on-sundays', Object.assign(await entryFor(await newKey(), DOC, 'join'), { name: 'b hi b' }));
say(angle.code === 400 && plain.code === 200, 'a name with < or > is refused, the same name without them is kept  (' + angle.code + ', ' + plain.code + ')');

// anyone can count again: the record as served, recounted here with every signature checked
{
  const r = await read('tea-on-sundays');
  const t = P.parseDoc(r.body.doc).terms, d = await P.digestOf(r.body.doc);
  const mine = await P.count({ terms: t, digestShort: d.short, ballots: r.body.entries, verify: P.verifyGarden });
  const chain = await P.chainOf(d.full, r.body.entries);
  say(r.code === 200 && JSON.stringify(mine) === JSON.stringify(r.body.count) && chain.head === r.body.head && r.body.closed === false,
    'a stranger recounting the record gets the same count and the same head');
  say(Object.keys(r.body).sort().join(',') === 'closed,count,digest,doc,entries,head', 'and a read answers with the record and nothing more');
}

/* ------------------------------------------------------------------ the close */

const SOON = garden('closes-tomorrow', { closes: new Date(Date.now() + DAY) });
await open(SOON);
const before = await sign('closes-tomorrow', await entryFor(ana, SOON, 'join'));
say(before.code === 200, 'before its close a PAXT takes lines  (' + before.code + ')');
const placesOpen = [...MEM.keys()].filter((k) => k.startsWith(callersOf('closes-tomorrow'))).length;
const late = await entryFor(ben, SOON, 'join');
const realNow = Date.now;
Date.now = () => realNow() + 2 * DAY;
const closedRead = await read('closes-tomorrow');
const placesClosed = [...MEM.keys()].filter((k) => k.startsWith(callersOf('closes-tomorrow'))).length;
const after = await sign('closes-tomorrow', late);
Date.now = realNow;
say(after.code === 409, 'after its close the same kind of line is refused  (' + after.code + ')');
say(closedRead.code === 200 && closedRead.body.closed === true && closedRead.body.count.joined === 1, 'and a read after the close says closed and keeps the count it had');
say(placesOpen === 1 && placesClosed === 0,
  'what the record kept about the connections that added keys is deleted the first time it is read after it closes  (' + placesOpen + ' before, ' + placesClosed + ' after)');
const inTime = await sign('closes-tomorrow', late);
say(inTime.code === 200 && inTime.body.count.joined === 2, 'the control: that exact line, sent before the close, is kept  (' + inTime.code + ')');

// opened by a server whose clock reads next week, so its opening time is not ahead of the server's clock
const LATER = garden('opens-next-week', { opens: new Date(Date.now() + 7 * DAY), closes: new Date(Date.now() + 14 * DAY) });
Date.now = () => realNow() + 7 * DAY;
const laterOpen = await open(LATER);
Date.now = realNow;
say(laterOpen.code === 200, 'a PAXT whose opening time is the server\'s own time opens  (' + laterOpen.code + ')');
const early = await entryFor(ana, LATER, 'join');
const tooEarly = await sign('opens-next-week', early);
Date.now = () => realNow() + 8 * DAY;
const onTime = await sign('opens-next-week', early);
Date.now = realNow;
say(tooEarly.code === 409 && onTime.code === 200, 'a line sent before a PAXT opens is refused, and kept once it has opened  (' + tooEarly.code + ', ' + onTime.code + ')');
{
  // A device whose clock runs an hour fast stamps an opening time an hour ahead, and nobody could join until then.
  const fast = await open(garden('a-fast-clock', { opens: new Date(Date.now() + 60 * MIN), closes: new Date(Date.now() + 7 * DAY) }));
  const near = await open(garden('a-fast-clock', { opens: new Date(Date.now() + 2 * MIN), closes: new Date(Date.now() + 7 * DAY) }));
  say(fast.code === 400 && /clock on this device/.test(fast.body.error) && near.code === 200,
    'an opening time an hour after the server\'s clock is refused with words about the device\'s clock; two minutes after is kept  (' + fast.code + ', ' + near.code + ')');
}

/* ------------------------------------------------------------------ the caps */

{
  const DOCK = garden('one-key-many-minds');
  await open(DOCK);
  const k = await newKey();
  let last = null;
  for (let rev = 1; rev <= 6; rev++) last = await sign('one-key-many-minds', await entryFor(k, DOCK, rev % 2 ? 'join' : 'leave', rev));
  const seventh = await sign('one-key-many-minds', await entryFor(k, DOCK, 'join', 7));
  say(last.code === 200 && seventh.code === 409, 'one key may change its line six times and the seventh is refused  (' + last.code + ', ' + seventh.code + ')');
  say(/^This key has signed 6 lines here, the most one key can\./.test(seventh.body.error) && !/changed its line/.test(seventh.body.error),
    'the refusal counts the lines the key signed, not the changes  (' + JSON.stringify(seventh.body.error) + ')');
}

{
  // the same cap with ten changes of mind sent at once, through a store that answers a moment later
  const DOCK = garden('ten-minds-at-once');
  await open(DOCK);
  const k = await newKey();
  const es = await Promise.all(Array.from({ length: 10 }, (_, i) => entryFor(k, DOCK, i % 2 ? 'leave' : 'join', i + 1)));
  slow();
  const rs = await Promise.all(es.map((e) => sign('ten-minds-at-once', e, '8.8.8.8')));
  quick();
  const r = await read('ten-minds-at-once');
  const kept = r.body.entries.filter((e) => e.address === k.address).length;
  say(rs.filter((x) => x.code === 200).length === 6 && rs.filter((x) => x.code === 409).length === 4 && kept === 6,
    'ten lines from one key sent at once: six are kept and four refused, as when sent one by one  (' + kept + ' kept)');
}

{
  const FULL = garden('a-full-record', { threshold: LIMITS.THRESHOLD_MAX || 100 });
  await open(FULL);
  const t0 = Date.now();
  let codes = new Set(), at490 = null;
  for (let i = 1; i <= 490; i++) {
    const r = await sign('a-full-record', await entryFor(await newKey(), FULL, 'join'));
    codes.add(r.code);
    if (i === 490) at490 = r;
  }
  // the last twenty sent at once, each from its own connection: exactly ten fit
  const last = await Promise.all(Array.from({ length: 20 }, async () => entryFor(await newKey(), FULL, 'join')));
  slow();
  const rs = await Promise.all(last.map((e) => sign('a-full-record', e)));
  quick();
  const at500 = await read('a-full-record');
  say(codes.size === 1 && codes.has(200) && at490.body.entries.length === 490,
    'the control: a record takes lines one by one up to its four hundred and ninetieth  (' + ((Date.now() - t0) / 1000).toFixed(1) + 's)');
  say(rs.filter((x) => x.code === 200).length === 10 && rs.filter((x) => x.code === 409 && /full/.test(x.body.error)).length === 10 && at500.body.entries.length === 500,
    'twenty more sent at once fill it to exactly five hundred, and the other ten are told it is full  (' + at500.body.entries.length + ' lines)');
  const k501 = await newKey();
  const over = await sign('a-full-record', await entryFor(k501, FULL, 'join'));
  say(over.code === 409, 'and the five hundred and first is refused  (' + over.code + ')');
  const elsewhere = await sign('tea-on-sundays', await entryFor(k501, DOC, 'join'));
  say(elsewhere.code === 200, 'the control: the same key signing into a record with room is kept  (' + elsewhere.code + ')');
}

/* ------------------------------------------------------------------ two people signing in the same moment */

{
  // The link goes into a group chat and five people tap Join within a second. Every one of them was told they
  // joined, so every one of their lines must be in the record afterwards.
  const RACE = garden('five-at-once', { threshold: 5 });
  await open(RACE);
  const ks = await Promise.all([1, 2, 3, 4, 5].map(() => newKey()));
  const es = await Promise.all(ks.map((k, i) => entryFor(k, RACE, 'join', 1, 'Friend ' + i)));
  const rs = await Promise.all(es.map((e) => sign('five-at-once', e)));
  const r = await read('five-at-once');
  const there = es.filter((e) => r.body.entries.some((x) => x.address === e.address && x.line === e.line)).length;
  say(rs.every((x) => x.code === 200) && there === 5 && r.body.count.joined === 5 && r.body.count.inForce,
    'five joins sent in the same moment are all kept, and the PAXT is in force  (' + there + ' of 5 kept)');
  // and a leave sent alongside a join is not lost either, so someone who left is never counted as joined again
  const [l, j] = await Promise.all([
    sign('five-at-once', await entryFor(ks[0], RACE, 'leave', 2, 'Friend 0')),
    sign('five-at-once', await entryFor(await newKey(), RACE, 'join', 1, 'Friend 5')),
  ]);
  const r2 = await read('five-at-once');
  say(l.code === 200 && j.code === 200 && r2.body.count.by.leave === 1 && r2.body.count.joined === 5,
    'a leave and a join sent in the same moment are both kept  (' + r2.body.count.joined + ' joined, ' + r2.body.count.by.leave + ' left)');
  const resent = await sign('five-at-once', es[1]);
  const r3 = await read('five-at-once');
  say(resent.code === 200 && resent.body.already === true && r3.body.entries.length === r2.body.entries.length,
    'the control: the same signed line sent again is kept once  (' + r3.body.entries.length + ' lines)');
  // The store's list runs a few seconds behind a write. A line kept a moment ago and sent again inside that lag
  // (a reload, a second tab) is answered with a record that holds it.
  const late = await entryFor(await newKey(), RACE, 'join', 1, 'Friend 6');
  const kept = await sign('five-at-once', late);
  const where = '/e/' + createHash('sha256').update(late.address + '\n' + late.line).digest('hex') + '.json';
  __hide((k) => k.endsWith(where));
  const lag = await sign('five-at-once', late);
  const lag2 = await sign('five-at-once', late);
  __hide(null);
  const holds = (r) => r.code === 200 && r.body.entries.some((e) => e.address === late.address && e.line === late.line);
  say(kept.code === 200 && holds(lag) && lag.body.already === true && holds(lag2) && lag.body.count.joined === kept.body.count.joined,
    'a line sent again while the list has not caught up is answered with the line in the record  (' + lag.code + ', ' + lag.body.entries.length + ' lines)');
}

/* ------------------------------------------------------------------ one person, many keys */

{
  // A new key is one click away (a private window, a second browser), so the record weighs every key a
  // connection adds to one PAXT. Twelve are allowed: a family on one home network must never be turned away,
  // and twelve is the largest group this is built for. One key past that is refused.
  const CAP = 12;
  const id = 'one-person-many-keys';
  const DOCP = garden(id, { threshold: 20 });
  await open(DOCP);
  const ip = '9.9.9.9';
  const ks = [], codes = [];
  for (let i = 0; i < CAP + 2; i++) {
    const k = await newKey(i % 3 ? 'ed25519' : 'p256'); ks.push(k);
    codes.push((await sign(id, await entryFor(k, DOCP, 'join', 1, 'Friend ' + i), ip)).code);
  }
  const refused = await sign(id, await entryFor(await newKey(), DOCP, 'join', 1, 'One more'), ip);
  const r = await read(id);
  say(LIMITS.CAP_KEYS_PER_CALLER === CAP && codes.slice(0, CAP).every((c) => c === 200) && codes.slice(CAP).every((c) => c === 409) && r.body.count.joined === CAP && !r.body.count.inForce,
    'one connection adds twelve keys to a PAXT, and its thirteenth and fourteenth are refused  (' + codes.slice(CAP - 1).join(', ') + ')');
  say(refused.code === 409 && /^12 keys have already joined/.test(refused.body.error) && /another connection/.test(refused.body.error) && !/\bTwo\b/.test(refused.body.error),
    'the refusal says how many keys, and that another connection can still join  (' + JSON.stringify(refused.body.error) + ')');
  const other = await sign(id, await entryFor(await newKey(), DOCP, 'join', 1, 'Someone'), '9.9.9.10');
  say(other.code === 200, 'the control: a key from another connection joins  (' + other.code + ')');
  const change = await sign(id, await entryFor(ks[0], DOCP, 'leave', 2, 'Friend 0'), ip);
  const back = await sign(id, await entryFor(ks[0], DOCP, 'join', 3, 'Friend 0'), ip);
  say(change.code === 200 && back.code === 200 && back.body.count.joined === CAP + 1,
    'a key that connection already added can still change its line  (' + change.code + ', ' + back.code + ')');
  const elsewhere = await sign('tea-on-mondays', await entryFor(await newKey(), TEA, 'join'), ip);
  say(elsewhere.code === 200, 'the control: the same connection adds a key to another PAXT  (' + elsewhere.code + ')');

  // an IPv6 home or phone is handed a whole /64, so a new address inside it is the same connection
  const id6 = 'six-on-one-network';
  const DOC6 = garden(id6, { threshold: 20 });
  await open(DOC6);
  const inside = ['2001:db8:1:2::a', '2001:db8:1:2:ffff:0:0:b', '2001:0db8:0001:0002:0000:0000:0000:00cc, 10.0.0.1'];
  const six = [];
  for (let i = 0; i < CAP + 1; i++) six.push((await sign(id6, await entryFor(await newKey(), DOC6, 'join'), inside[i % 3])).code);
  const s4 = await sign(id6, await entryFor(await newKey(), DOC6, 'join'), '2001:db8:1:3::a');
  say(six.slice(0, CAP).every((c) => c === 200) && six[CAP] === 409 && s4.code === 200,
    'three addresses in one IPv6 /64 are one connection, and its thirteenth key is refused; another /64 joins  (' + six[CAP] + ', ' + s4.code + ')');
  say(API.netOf && API.netOf('::ffff:9.9.9.9') === '9.9.9.9' && API.netOf('9.9.9.9:5555') === '9.9.9.9' && API.netOf('[2001:db8:1:2::1]:443') === '2001:db8:1:2::/64',
    'an IPv4 address written inside IPv6, or with a port, is still the same connection');

  // nothing kept for this links a key to an address, and none of it reaches a reader
  const sideways = [...MEM.keys()].filter((k) => k.startsWith(callersOf(id)) || k.startsWith(callersOf(id6)));
  const kept = sideways.map((k) => k + ' ' + MEM.get(k)).join('\n');
  const addresses = ks.flatMap((k) => [k.address, k.address.slice('did:key:'.length)]);
  say(sideways.length === 2 * (CAP + 1) && !/9\.9\.9\.|2001:db8|2001:0db8/.test(kept) && !addresses.some((p) => kept.includes(p)),
    'what the record keeps about connections holds no network address and no key  (' + sideways.length + ' places, one per key)');
  // not even a keyed name for a key: a numbered place says how many keys a connection added, and nothing
  // matches it to which ones
  const keyed = (a) => createHmac('sha256', SALT).update('key·' + id + '·' + a).digest('hex').slice(0, 32);
  say(sideways.every((k) => /\/slot-\d{1,2}$/.test(k) && MEM.get(k) === '1') && !ks.some((k) => kept.includes(keyed(k.address))),
    'each of those is a numbered place holding nothing, never a name made from a key');
  const answer = JSON.stringify(r.body);
  say(!/9\.9\.9\./.test(answer) && !sideways.some((k) => answer.includes(k.split('/')[2])), 'and a read of the record carries none of it');
  say(r.body.entries.filter((e) => /^Friend /.test(e.name)).length === CAP, 'every counted key is its own line in the record, so a person can see one name many times');

  // Twenty keys from one connection sent all at once, through a store that answers a moment later, as one
  // browser could send them. The cap holds: twelve are kept.
  const idr = 'twenty-keys-at-once';
  const DOCR = garden(idr, { threshold: 50 });
  await open(DOCR);
  const rk = await Promise.all(Array.from({ length: 20 }, async (_, i) => entryFor(await newKey(i % 4 ? 'ed25519' : 'p256'), DOCR, 'join', 1, 'Key ' + i)));
  slow();
  const rr = await Promise.all(rk.map((e) => sign(idr, e, '7.7.7.7')));
  quick();
  const rread = await read(idr);
  say(rr.filter((x) => x.code === 200).length === CAP && rr.filter((x) => x.code === 409 && /^12 keys/.test(x.body.error)).length === 20 - CAP && rread.body.count.joined === CAP,
    'twenty keys sent at once from one connection: twelve are kept and eight refused  (' + rread.body.count.joined + ' joined)');
}

/* ------------------------------------------------------------------ a record changed in the store */

{
  const id = 'tea-on-sundays';
  const key = recordKey(id);
  const base = key.slice(0, -'.json'.length);
  const paths = () => [...MEM.keys()].filter((k) => k === key || k.startsWith(base + '/'));
  const snap = () => new Map(paths().map((k) => [k, MEM.get(k)]));
  const putBack = (s) => { for (const k of paths()) if (!s.has(k)) MEM.delete(k); for (const [k, v] of s) MEM.set(k, v); };
  const lineOf = (name) => paths().find((k) => k.includes('/e/') && JSON.parse(MEM.get(k)).name === name);
  const pathFor = (e) => base + '/e/' + createHash('sha256').update(e.address + '\n' + e.line).digest('hex') + '.json';
  const sealWith = (e, digest) => createHmac('sha256', SALT).update(JSON.stringify(['paxt-entry', id, digest, e.address, e.line, e.sig, e.name, e.at])).digest('hex');
  const kept = snap();
  const first = await read(id);
  say(!!key && first.code === 200 && !!lineOf('Ben'), 'the record reads and counts before anything touches it');
  const edit = (k, fn) => { const o = JSON.parse(MEM.get(k)); fn(o); MEM.set(k, JSON.stringify(o)); return o; };
  const tamper = async (what, fn) => {
    await fn();
    const r = await read(id);
    const s = await sign(id, await entryFor(await newKey(), DOC, 'join'));
    putBack(kept);
    say(r.code === 409 && !('count' in (r.body || {})) && s.code === 409, what + ' is caught on read, nothing is counted and nothing is added  (' + r.code + ', ' + s.code + ')');
  };

  await tamper('a line turned from join to leave', () => { edit(lineOf('Ben'), (e) => { e.line = e.line.replace(' join ', ' leave '); }); });
  await tamper('a line turned from join to leave and moved to the name its new line would have', () => {
    const k = lineOf('Ben');
    const e = edit(k, (o) => { o.line = o.line.replace(' join ', ' leave '); });
    MEM.delete(k); MEM.set(pathFor(e), JSON.stringify(e));
  });
  await tamper('a name changed', () => { edit(lineOf('Ben'), (e) => { e.name = 'Someone else'; }); });
  await tamper('an arrival time changed, which would move a line in the order', () => { edit(lineOf('Ben'), (e) => { e.at = '2000-01-01T00:00:00.000Z'; }); });
  await tamper('a line copied to another name in the store', () => { MEM.set(base + '/e/' + 'f'.repeat(64) + '.json', MEM.get(lineOf('Ben'))); });
  await tamper('the document changed', () => { edit(key, (r) => { r.doc = r.doc.replace('Tea on Sundays', 'Tea on Fridays'); }); });
  await tamper('the document changed with its hash rewritten', async () => {
    const d = (await P.digestOf(DOC.replace('Tea on Sundays', 'Tea on Fridays'))).full;
    edit(key, (r) => { r.doc = r.doc.replace('Tea on Sundays', 'Tea on Fridays'); r.digest = d; });
  });
  // even someone holding the secret cannot add a line nobody signed: the signatures are checked again
  const digest = JSON.parse(MEM.get(key)).digest;
  await tamper('a forged line with its seal made by someone holding the secret', async () => {
    const e = await entryFor(await newKey(), DOC, 'join', 1, 'Nobody');
    const bent = P.fromBase64url(e.sig); bent[0] ^= 1; e.sig = P.toBase64url(bent);
    e.at = new Date().toISOString(); e.seal = sealWith(e, digest);
    MEM.set(pathFor(e), JSON.stringify(e));
  });
  {
    const e = await entryFor(await newKey(), DOC, 'join', 1, 'Somebody');
    e.at = new Date().toISOString(); e.seal = sealWith(e, digest);
    MEM.set(pathFor(e), JSON.stringify(e));
    const r = await read(id);
    putBack(kept);
    say(r.code === 200 && r.body.count.joined === first.body.count.joined + 1,
      'the control: the same line with a real signature reads, so the forged one was caught by its signature  (' + r.code + ')');
  }
  const restored = await read(id);
  say(restored.code === 200 && JSON.stringify(restored.body) === JSON.stringify(first.body), 'the control: the record put back as it was reads and counts as before');

  /* -------------------------------------------- a line deleted from the store, seen from a device */

  // The store cannot tell that a whole line blob was deleted: nothing in it remembers how many there were. Each
  // device does. It keeps every line it has seen, and its own last line, and refuses a record without them.
  const room = await ROOM.checkRecord(first.body, id);
  const mem = await ROOM.memoryOf(room);
  const benKey = lineOf('Ben');
  const ben = JSON.parse(MEM.get(benKey));
  MEM.delete(benKey);
  const dropped = await read(id);
  putBack(kept);
  const blind = await ROOM.checkRecord(dropped.body, id);
  const seen = await ROOM.checkRecord(dropped.body, id, mem);
  say(dropped.code === 200 && dropped.body.entries.length === first.body.entries.length - 1 && blind.ok,
    'a line deleted from the store still reads on the server, and a device that never saw the record accepts it');
  say(seen.ok === false && seen.lost === 1 && seen.was === first.body.head,
    'a device that saw the record before says a line is missing, and which record it saw  (' + seen.lost + ' missing)');
  const mine = await ROOM.checkRecord(dropped.body, id, { seen: [], own: { address: ben.address, line: ben.line } });
  say(mine.ok === false && mine.own === true, 'and the device that signed that line sees its own line is gone');
  const whole = await ROOM.checkRecord(first.body, id, Object.assign({}, mem, { own: { address: ben.address, line: ben.line } }));
  await sign(id, await entryFor(await newKey(), DOC, 'join', 1, 'Eve'));
  const later = await read(id);
  const grown = await ROOM.checkRecord(later.body, id, mem);
  say(whole.ok && grown.ok && whole.head === first.body.head, 'the control: the whole record, and the same record grown, check out on that device');
  // anyone holding the store could also rebuild a record with the line gone and hand it over as the answer
  const rebuilt = JSON.parse(JSON.stringify(first.body));
  rebuilt.entries = rebuilt.entries.filter((e) => !(e.address === ben.address && e.line === ben.line));
  rebuilt.head = (await P.chainOf(rebuilt.digest, rebuilt.entries)).head;
  const re = await ROOM.checkRecord(rebuilt, id, mem);
  say((await ROOM.checkRecord(rebuilt, id)).ok && re.ok === false && re.lost === 1, 'a record with a line left out and its chain rebuilt is refused by a device that saw the line');
  const short = first.body.digest.slice(0, 32);
  const text = ROOM.recountText(first.body.doc, first.body.entries, first.body.head, short);
  const back = ROOM.readRecount(text);
  say(text.includes('\nhead ' + first.body.head + '\n') && back && back.head === first.body.head && back.entries.length === first.body.entries.length
    && back.fingerprints.text === ROOM.fingerprint(short) && back.fingerprints.record === ROOM.fingerprint(first.body.head),
    'the recount file carries the record\'s hash and both fingerprints, so two people can compare, and reads back whole');
  const html = ROOM.roomHtml({ rec: room, mine: null, canSign: true, busy: '' });
  say(html.includes(ROOM.fingerprint(first.body.head)) && html.includes(ROOM.fingerprint(short)) && text.includes(ROOM.fingerprint(short)),
    'the room shows the text and record fingerprints, the same as the recount file  (' + ROOM.fingerprint(short) + ')');
  const keysSaid = html.split(ROOM.KEYS_NOTE).length - 1;
  say(keysSaid === 1 && html.split(ROOM.SEEN_NOTE).length === 2 && /keys/.test(html.split('pact-say">')[1].split('<')[0]),
    'the room counts keys, and says once that any key can join and who can see what');
}

/* ------------------------------------------------------------------ the store's paths */

{
  const IDS = ['tea-on-sundays', 'tea-on-mondays', 'closes-tomorrow', 'a-full-record', 'one-key-many-minds'];
  const keys = [...MEM.keys()].filter((k) => k.startsWith('gratus/paxt/'));
  say(keys.length > 0 && !keys.some((k) => IDS.some((id) => k.includes(id))), 'no path in the store holds a PAXT id');
  const hidden = 'gratus/paxt/' + createHmac('sha256', SALT).update('paxt·tea-on-sundays').digest('hex').slice(0, 32) + '.json';
  say(MEM.has(hidden) && recordKey('tea-on-sundays') === hidden, 'the record sits at the keyed hash of its id, which needs the secret to find');
  // the control: the same file with the id as its path puts the id in the store, so the scan above can see one
  const src = fs.readFileSync(path.join(root, 'api/paxt.js'), 'utf8');
  const LINE = "const KEY = (id) => base() + 'paxt/' + createHmac('sha256', SALT).update('paxt·' + id).digest('hex').slice(0, 32) + '.json';";
  const IMPORT = "from '../engine/paxt.js';";
  const ok = src.split(LINE).length === 2 && src.split(IMPORT).length === 2;
  say(ok, 'the hidden-path control has its line to change');
  if (ok) {
    const tmp = path.join(os.tmpdir(), 'gratus-paxt-control-' + process.pid + '.mjs');
    fs.writeFileSync(tmp, src.replace(LINE, () => "const KEY = (id) => base() + 'paxt/' + id + '.json';")
      .replace(IMPORT, () => 'from ' + JSON.stringify(pathToFileURL(path.join(root, 'engine/paxt.js')).href) + ';')
      .replace("from './_sweep.js';", () => 'from ' + JSON.stringify(pathToFileURL(path.join(root, 'api/_sweep.js')).href) + ';'));
    try {
      const ctl = (await import(pathToFileURL(tmp).href)).default;
      const r = await call(ctl, post({ act: 'open', doc: garden('control-one') }));
      say(r.code === 200 && MEM.has('gratus/paxt/control-one.json'), 'the control: with the id as the path, the id is found in the store');
      MEM.delete('gratus/paxt/control-one.json');
    } finally { fs.unlinkSync(tmp); }
  }
}

/* ------------------------------------------------------------------ limits per caller */

{
  const ip = '10.200.0.1';
  const codes = [];
  for (let i = 1; i <= 5; i++) codes.push((await open(garden('limit-open-' + i), ip)).code);
  const sixth = await open(garden('limit-open-6'), ip);
  say(codes.every((c) => c === 200) && sixth.code === 429, 'one caller opens five in a day and the sixth answers 429  (' + sixth.code + ')');
  const elsewhere = await open(garden('limit-open-6'), '10.200.0.2');
  say(elsewhere.code === 200, 'the control: the same document from another caller opens  (' + elsewhere.code + ')');
  const ipv = '10.200.0.3';
  const same = await entryFor(ana, DOC, 'leave', 2, 'Ana');
  const signs = [];
  for (let i = 1; i <= 60; i++) signs.push((await sign('tea-on-sundays', same, ipv)).code);
  const sixty1 = await sign('tea-on-sundays', same, ipv);
  say(signs.every((c) => c === 200) && sixty1.code === 429, 'one caller sends sixty lines in a day and the next answers 429  (' + sixty1.code + ')');
  const other = await sign('tea-on-sundays', same, '10.200.0.4');
  say(other.code === 200, 'the control: the same line from another caller is answered  (' + other.code + ')');
  say(/^Five PAXTs have been opened from this connection today/.test(sixth.body.error) && /^60 lines have been signed from this connection today/.test(sixty1.body.error)
    && ![sixth.body.error, sixty1.body.error].some((t) => /one person|It opens again/.test(t)),
    'the two daily refusals name the connection, not a person, and say plainly when to try again');
  const calls = [...MEM.keys()].filter((k) => k.includes('/_calls/')).map((k) => k + ' ' + MEM.get(k)).join('\n');
  say(calls.length > 0 && !/10\.200\.0\./.test(calls), 'the counter for the day holds salted hashes and no address');

  // the same limits with every call sent at once, through a store that answers a moment later
  const flood = '10.201.0.1';
  const docs = Array.from({ length: 20 }, (_, i) => garden('flood-open-' + i));
  slow();
  const opens = await Promise.all(docs.map((d) => open(d, flood)));
  quick();
  say(opens.filter((x) => x.code === 200).length === 5 && opens.filter((x) => x.code === 429).length === 15,
    'twenty opens sent at once by one caller: five open and fifteen answer 429  (' + opens.filter((x) => x.code === 200).length + ' opened)');
  const many = '10.201.0.2';
  const line = await entryFor(ana, DOC, 'leave', 2, 'Ana');
  slow();
  const burst = await Promise.all(Array.from({ length: 70 }, () => sign('tea-on-sundays', line, many)));
  quick();
  say(burst.filter((x) => x.code !== 429).length === 60 && burst.filter((x) => x.code === 429).length === 10,
    'seventy lines sent at once by one caller: sixty are answered and ten answer 429  (' + burst.filter((x) => x.code !== 429).length + ' answered)');
  const neighbour = await open(garden('flood-open-neighbour'), '10.201.0.3');
  say(neighbour.code === 200, 'the control: a caller sending at the same time as others keeps a count of their own  (' + neighbour.code + ')');
}

/* ------------------------------------------------------------------ what a read costs the store */

{
  // A page refreshed in a loop must not turn into a read of the whole record each time. A record read a moment
  // ago on the same function is shown again without touching the store, until a line is signed there.
  process.env.GRATUS_PAXT_READ_CACHE_MS = '5000';
  const first = await read('tea-on-mondays');
  __COUNT.list = 0; __COUNT.put = 0;
  const again = await read('tea-on-mondays');
  const cost = __COUNT.list + __COUNT.put;
  await sign('tea-on-mondays', await entryFor(await newKey(), TEA, 'join', 1, 'Fresh'));
  __COUNT.list = 0;
  const fresh = await read('tea-on-mondays');
  const freshLists = __COUNT.list;
  process.env.GRATUS_PAXT_READ_CACHE_MS = '0';
  say(first.code === 200 && again.code === 200 && JSON.stringify(again.body) === JSON.stringify(first.body) && cost === 0,
    'a second read a moment later is answered without touching the store  (' + cost + ' store calls)');
  say(fresh.code === 200 && freshLists > 0 && fresh.body.entries.length === first.body.entries.length + 1,
    'and a line signed on the same function makes the next read go to the store and show it  (' + freshLists + ' lists)');
  // Past the read cache, a line blob already read on this function is not fetched again: it was written once.
  await read('tea-on-sundays');
  __COUNT.fetch = 0;
  const past = await read('tea-on-sundays');
  const fetched = __COUNT.fetch;
  say(past.code === 200 && past.body.entries.length >= 5 && fetched === 1,
    'a record read again past the cache fetches its document and none of its ' + past.body.entries.length + ' line blobs again  (' + fetched + ' fetch)');
}

/* ------------------------------------------------------------------ the privacy page says what is kept */

{
  const page = fs.readFileSync(path.join(root, 'privacy.html'), 'utf8').replace(/\s+/g, ' ');
  say(/PAXT[^<]*how many keys each network added/.test(page) && /deleted the first time the PAXT is opened after it closes/.test(page),
    'the privacy page says the server keeps how many keys each network added to a PAXT, and when that goes');
  say(/count grows by one in the same moment a new key's first line is kept/.test(page) && /which keys and names in that PAXT came from one network, on any day it was open/.test(page),
    'and that the count is written beside each new key\'s first line, so until it goes it can tie one network\'s keys and names together across days');
  say(/daily limits on opening and signing a PAXT/.test(page), 'and it names the daily PAXT limits among the counts kept as salted hashes');
  say(/marker[^<]*salted hash of the network/.test(page) && /holding both our store and our secret/.test(page) && /Markers from earlier days are deleted/.test(page),
    'and it says each call leaves a marker for the day, what someone holding the store and the secret could learn from it, and when it goes');
  say(/lost if you clear the browser's site data or use “Start over”/.test(page), 'and it says "Start over" deletes the PAXT keys too');
  const guide = fs.readFileSync(path.join(root, 'docs/guides/your-paxts.md'), 'utf8').replace(/\s+/g, ' ');
  say(/press Start over, the key goes with it/.test(guide) && /every count is a count of keys, and the page says so/.test(guide)
    && !/usually the same as people/.test(guide) && /can also clear a site's storage after seven days of use without a visit/.test(guide),
    'the PAXT guide says Start over takes the key, every count is of keys, and Safari can clear storage after seven days of use');
}

/* ------------------------------------------------------------------ previews never write into live data */

{
  // A browser walk on a preview reads and writes the live store. Every PAXT, line, place and call marker it makes
  // goes under gratus/preview/, and production never reads it; the control is the same walk under production,
  // which writes under gratus/paxt/ only.
  const id = 'a-preview-walk';
  const D = garden(id);
  const k = await newKey();
  const walk = async () => {
    const was = new Set(MEM.keys());
    const o = await open(D);
    const s = await sign(id, await entryFor(k, D, 'join', 1, 'Pat'));
    const r = await read(id);
    return { o, s, r, wrote: [...MEM.keys()].filter((x) => !was.has(x)) };
  };
  const keyed = 'paxt/' + createHmac('sha256', SALT).update('paxt·' + id).digest('hex').slice(0, 32) + '.json';
  delete process.env.VERCEL_ENV;
  const prev = await walk();
  const prevKey = API.paxtKey && API.paxtKey(id);
  process.env.VERCEL_ENV = 'production';
  const liveBefore = await read(id);
  const live = await walk();
  const liveKey = API.paxtKey && API.paxtKey(id);
  process.env.VERCEL_ENV = 'preview';
  const prevAgain = await read(id);
  process.env.VERCEL_ENV = 'production';
  const kinds = (ks) => ['/e/', '/n/', '/k/', '/slot-', '/_calls/'].filter((x) => ks.some((y) => y.includes(x))).length;
  say(prev.o.code === 200 && prev.s.code === 200 && prev.r.code === 200 && prev.r.body.count.joined === 1,
    'off production a PAXT opens, takes a line and reads  (' + [prev.o.code, prev.s.code, prev.r.code].join(', ') + ')');
  say(prev.wrote.length >= 6 && kinds(prev.wrote) === 5 && prev.wrote.every((x) => x.startsWith('gratus/preview/paxt/')),
    'and every blob it wrote (record, line, places, connection place, call markers) sits under gratus/preview/paxt/  (' + prev.wrote.length + ' blobs)');
  say(liveBefore.code === 404 && live.o.code === 200 && live.r.body.count.joined === 1 && kinds(live.wrote) === 5
    && live.wrote.every((x) => x.startsWith('gratus/paxt/')),
    'the control: production does not see the preview PAXT, and the same walk under production writes only under gratus/paxt/  (' + liveBefore.code + ', ' + live.wrote.length + ' blobs)');
  say(prevAgain.code === 200 && prevAgain.body.entries.length === 1 && prevAgain.body.digest === prev.r.body.digest,
    'and a preview still reads its own record, untouched by the live one');
  say(prevKey === 'gratus/preview/' + keyed && liveKey === 'gratus/' + keyed && MEM.has(prevKey) && MEM.has(liveKey),
    'paxtKey, the path api/vibes.js asks for, names the record in each environment');
}

/* ------------------------------------------------------------------ plain refusals */

{
  const nobody = await read('nobody-opened-this');
  const badId = await read('Not An Id');
  const what = await call(paxt, post({ act: 'vote', id: 'tea-on-sundays' }));
  const junk = await call(paxt, post('{not json'));
  const put = await call(paxt, { method: 'PUT', headers: {}, query: {}, body: {} });
  const noShape = await sign('tea-on-sundays', { address: "abc", line: "hello", sig: "x" });
  say(nobody.code === 404 && badId.code === 400 && what.code === 400 && junk.code === 400 && put.code === 405 && noShape.code === 400,
    'an unknown id, a bad id, an unknown act, broken JSON, another method and a malformed entry each get a plain refusal');
}

/* ------------------------------------------------------------------ a day's call markers last a day */

{
  // One network opening a PAXT today and another tomorrow must not leave markers under one name, or anyone holding
  // the store could tie its keys and names together across days. And a day's markers go once the day has passed.
  const ip = '10.220.0.7';
  const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10);
  const made = async (shift, id) => {
    const was = new Set(MEM.keys());
    Date.now = () => realNow() + shift;
    try { await open(garden(id), ip); } finally { Date.now = realNow; }
    return [...MEM.keys()].filter((k) => !was.has(k) && k.startsWith('gratus/paxt/_calls/'));
  };
  const dirOf = (k) => k.split('/').slice(0, -1).join('/') + '/';
  const d0 = await made(0, 'markers-day-one');
  const before = [...MEM.keys()].filter((k) => k.startsWith('gratus/paxt/_calls/' + dayOf(realNow()) + '/')).length;
  const d1 = await made(DAY, 'markers-day-two');
  const name = (ks) => (ks[0] ? ks[0].split('/')[4] : '');
  say(d0.length === 1 && d1.length === 1 && dirOf(d0[0]).includes('/' + dayOf(realNow()) + '/') && name(d0) !== name(d1) && !d0[0].includes('/open/'),
    'one network\'s call markers carry a different keyed name on each day, with no act in the path  (' + name(d0).slice(0, 8) + ' then ' + name(d1).slice(0, 8) + ')');
  const left = [...MEM.keys()].filter((k) => k.startsWith('gratus/paxt/_calls/') && k.split('/')[3] < dayOf(realNow() + DAY));
  say(before > 1 && left.length === 0 && MEM.has(d1[0]),
    'the first call of a later day deletes every earlier day\'s markers and keeps its own  (' + before + ' from today, ' + left.length + ' left)');
}

{
  // A busy day can leave more markers than one list of the store holds. Through a store that answers a thousand at a
  // time, as the real one does, the first call of a later day must not wait on listing all of them (today's least of
  // all), and the calls after it must finish the job on the same function.
  __page(1000);
  const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10);
  const root = 'gratus/paxt/_calls/';
  const busy = dayOf(realNow() + 30 * DAY), next = dayOf(realNow() + 31 * DAY);
  for (let i = 0; i < 25000; i++) MEM.set(root + busy + '/' + String(i % 40).padStart(32, '0') + '/' + i, '1');
  for (let i = 0; i < 3000; i++) MEM.set(root + next + '/' + String(i % 10).padStart(32, 'f') + '/' + i, '1');
  const left = () => [...MEM.keys()].filter((k) => k.startsWith(root + busy + '/')).length;
  const one = async (k) => { Date.now = () => realNow() + 31 * DAY; try { return await open(garden('busy-day-' + k)); } finally { Date.now = realNow; } };
  const was = __COUNT.list;
  const first = await one(0);
  const lists = __COUNT.list - was;
  let calls = 1;
  while (left() && calls < 10) await one(calls++);
  const today = [...MEM.keys()].filter((k) => k.startsWith(root + next + '/')).length;
  say(first.code === 200 && lists <= 12 && left() === 0 && today >= 3000,
    'after a day of 25,000 markers, the first call of the next day makes ' + lists + ' lists of the store, and the calls after it delete the rest  (' + calls + ' calls, ' + left() + ' left, ' + today + ' of the new day kept)');
  __page(null);
}

const said = SEEN.join('\n');
say(!said.includes(SALT) && !said.includes('gratus/paxt/') && !said.includes('gratus/preview/'), 'no answer carries the secret or a path in the store');

console.log('PAXT open record: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
