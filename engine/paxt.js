// PAXT 1, the Gratus profile.
//
// A PAXT is an agreement written as one plain-text document. People join it by each signing ONE line that names
// the document by its hash, so a signature can only mean the exact text that was read. Anyone can check every
// signature and count again. PAXT and its names are August's (2026-11-12).
//
// The document, the line and the count below are ported from the PAXT 1 reference implementation
// (~/dashsupport-team/paxt-core.mjs), so a Dash document and a Dash line read here exactly as they read there.
// Gratus adds its own profile on top:
//   - voice `garden`: a signer is a device key named with did:key (Ed25519, or P-256 where a browser has no
//     Ed25519), and each key that joins carries weight 1;
//   - what a key signs is the bytes of DEVICE_PREFIX + line, the device-key format every PAXT app shares, so a
//     signature can never be replayed as anything else;
//   - a record entry is { address, line, sig, name, at }, and the chain is taken over address.
//
// Signatures are checked by the shared suites (./vendor/paxt-suites.js, a byte-for-byte copy kept by the
// owners of the PAXT voices), never by code of our own, so every app that counts a record agrees on it.
// Pure functions for the browser and Node 18 or later. It imports the suites file and ./text.js, and neither of
// those imports anything.
// Only verifyEntry touches crypto, and it never sees a private key.
import {
  DEVICE_PREFIX, accountId, suite, verifyAccount,
} from './vendor/paxt-suites.js';
import { asDrawn, HIDDEN } from './text.js';

// keys.js makes keys and signatures in the suites' own spelling, through these
export {
  DEVICE_PREFIX, canonicalId, verifyAccount, didKeyAddress, p256DidKey, p256LowS, toBase64url, fromBase64url,
} from './vendor/paxt-suites.js';

export const VERSION = 'paxt1';
export const GARDEN = 'garden';
// Dash's voices stay valid so a Dash document still parses; Gratus itself only opens garden documents.
export const VOICES = ['voting', 'owner', 'collateral', GARDEN];
export const KINDS = ['paxt', 'poll', 'election'];
export const MAX_DOC_BYTES = 20000;
export const MAX_REVISION = 999;

export const MAX_NAME = 40;
// For the garden voice, only device keys are accepted. A wallet's line is a good PAXT line elsewhere, but a
// garden counts keys made on a person's own device.
export const GARDEN_SUITES = Object.freeze(['did-key:ed25519', 'did-key:p256']);

const ID = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
const SUB = /^[a-z0-9](?:[a-z0-9-]{0,22}[a-z0-9])?$/;
const OPTION = SUB;
// a byte-order mark some editors put at the start of a file; never part of a document
const BOM = String.fromCharCode(0xFEFF);
const WHEN = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}Z)?$/;

/** the one line a key signs: paxt1 <id> <choice[+choice]> <32 hex of the document's hash> [#revision] */
export const LINE = /^paxt1 ([a-z0-9-]+(?:\/[a-z0-9-]+)?) ([a-z0-9-]+(?:\+[a-z0-9-]+)*) ([0-9a-f]{32})(?: #([1-9][0-9]{0,2}))?$/;

/* ------------------------------------------------------------------ the document */

/** The document in its one true form: LF line ends, no trailing spaces, no blank lines at either end, one final LF.
    The hash is taken over exactly these bytes, and this is the file a person downloads and reads. */
export function canon(doc) {
  const lines = String(doc ?? '').split(BOM).join('').replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+$/, ''));
  while (lines.length && !lines[0]) lines.shift();
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  return lines.join('\n') + '\n';
}

export async function sha256hex(text) {
  const bytes = new TextEncoder().encode(text);
  const out = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
  return [...out].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** { full, short }: the document's sha256, and the 32 hex characters (128 bits) a line carries */
export async function digestOf(doc) {
  const full = await sha256hex(canon(doc));
  return { full, short: full.slice(0, 32) };
}

function instant(s) {
  if (!WHEN.test(s)) return NaN;
  return Date.parse(s.length === 10 ? s + 'T00:00:00Z' : s.replace('Z', ':00Z'));
}

/** Read a document. The header is the only source of the terms: what a person reads is what the count obeys.
    Returns { ok: true, terms } or { ok: false, errors }. */
export function parseDoc(doc) {
  const text = canon(doc);
  const errors = [];
  if (new TextEncoder().encode(text).length > MAX_DOC_BYTES) errors.push('The document is longer than ' + MAX_DOC_BYTES + ' bytes.');
  const cut = text.indexOf('\n---\n');
  if (cut < 0) return { ok: false, errors: ['The header must end with a line holding only three dashes.'] };
  const head = text.slice(0, cut).split('\n');
  const body = text.slice(cut + 5).replace(/\n$/, '');
  if (head[0] !== VERSION) errors.push('The first line must be ' + VERSION + '.');
  const f = {};
  for (const line of head.slice(1)) {
    const m = /^([a-z]+): (.+)$/.exec(line);
    if (!m) { errors.push('Not a header line: ' + JSON.stringify(line.slice(0, 60))); continue; }
    if (m[1] in f) errors.push('The header names ' + m[1] + ' twice.');
    f[m[1]] = m[2];
  }
  const need = (k) => { if (!(k in f)) { errors.push('The header needs ' + k + '.'); return ''; } return f[k]; };
  const idRaw = need('id');
  const [id, sub, extra] = idRaw.split('/');
  if (!ID.test(id || '') || extra !== undefined || (sub !== undefined && !SUB.test(sub))) errors.push('id must be 3 to 40 lower-case letters, digits or dashes, with at most one /part for a poll inside a PAXT.');
  const kind = need('kind');
  if (kind && !KINDS.includes(kind)) errors.push('kind must be one of: ' + KINDS.join(', ') + '.');
  const voice = need('voice');
  if (voice && !VOICES.includes(voice)) errors.push('voice must be one of: ' + VOICES.join(', ') + '.');
  const title = need('title');
  if (title.length > 80) errors.push('title must be 80 characters or fewer.');
  const opens = instant(need('opens')), closes = instant(need('closes'));
  if (Number.isNaN(opens) || Number.isNaN(closes)) errors.push('opens and closes must be dates like 2026-12-01 or 2026-12-01T18:00Z (UTC).');
  else if (closes <= opens) errors.push('closes must come after opens.');
  if (!body.trim()) errors.push('The document needs a body below the dashes.');

  const terms = { id: idRaw, parent: sub !== undefined ? id : null, title, kind, voice, opens, closes, body };
  const known = new Set(['id', 'title', 'kind', 'voice', 'opens', 'closes']);
  const int = (k, lo, hi) => { known.add(k); const v = need(k); const n = /^\d{1,6}$/.test(v) ? Number(v) : NaN; if (!(n >= lo && n <= hi)) errors.push(k + ' must be a whole number from ' + lo + ' to ' + hi + '.'); return n; };
  const list = (k) => { known.add(k); const xs = need(k).split(',').map((x) => x.trim()).filter(Boolean); if (xs.length < 2 || xs.length > 40 || xs.some((x) => !OPTION.test(x)) || new Set(xs).size !== xs.length) errors.push(k + ' must be 2 to 40 different names of lower-case letters, digits or dashes, separated by commas.'); return xs; };

  if (kind === 'paxt') {
    if (sub !== undefined) errors.push('A PAXT has a plain id; only a poll or an election sits inside one.');
    terms.threshold = int('threshold', 1, 100000);
    terms.options = ['join', 'leave'];
    terms.pick = 1;
  } else if (kind === 'poll') {
    terms.options = list('options');
    terms.pick = 1;
    known.add('rule');
    const rule = need('rule');
    const net = /^net (\d{1,2})$/.exec(rule), maj = /^majority (\d{1,6})$/.exec(rule);
    if (net) {
      terms.rule = { type: 'net', percent: Number(net[1]) };
      if (!(terms.rule.percent >= 1 && terms.rule.percent <= 99)) errors.push('rule net takes a percent from 1 to 99.');
      if (!terms.options.includes('yes') || !terms.options.includes('no')) errors.push('rule net needs the options yes and no.');
    } else if (maj) terms.rule = { type: 'majority', quorum: Number(maj[1]) };
    else errors.push('rule must be "net <percent>" or "majority <quorum>".');
  } else if (kind === 'election') {
    terms.options = list('options');
    terms.seats = int('seats', 1, 39);
    terms.pick = int('pick', 1, 40);
    if (terms.options.length && terms.seats >= terms.options.length) errors.push('seats must be fewer than the candidates.');
    if (terms.options.length && terms.pick > terms.options.length) errors.push('pick cannot be more than the candidates.');
  }
  if (kind === 'poll' || kind === 'election') {
    known.add('electorate');
    terms.electorate = f.electorate || 'list';
    if (!['list', 'partners'].includes(terms.electorate)) errors.push('electorate must be list (every masternode) or partners (the keys that joined the PAXT this sits inside).');
    if (terms.electorate === 'partners' && sub === undefined) errors.push('electorate partners needs an id of the form <paxt>/<name>.');
  }
  for (const k of Object.keys(f)) if (!known.has(k)) errors.push('The header has a line this version does not know: ' + k + '.');
  return errors.length ? { ok: false, errors } : { ok: true, terms };
}

/** Read a document the way Gratus opens one: parseDoc first, then the wave 1 profile (voice garden, kind paxt).
    A Dash document is a good PAXT 1 document and is still refused here, so nothing Gratus counts is weighed
    by a list it cannot read. */
export function parseGarden(doc) {
  const r = parseDoc(doc);
  if (!r.ok) return r;
  const errors = [];
  if (r.terms.voice !== GARDEN) errors.push('Gratus opens only documents with voice: ' + GARDEN + '.');
  if (r.terms.kind !== 'paxt') errors.push('Gratus opens only documents with kind: paxt for now.');
  if (unseen(r.terms.title, false)) errors.push('The title has a hidden or control character, or one that turns text around.');
  if (unseen(r.terms.body, true)) errors.push('The text has a hidden or control character, or one that turns text around.');
  return errors.length ? { ok: false, errors } : r;
}

// What a person reads must be what they sign. A character nobody can see could hide a sentence from the clerk's
// marks, one that turns text around could make the screen read differently from the signed bytes, and a control
// character could travel into a recount file and rewrite a terminal. So a garden title or body refuses every
// control and format character, the line and paragraph separators, and the hidden list the name rule uses, all
// tested on the text as drawn so an emoji stays whole. The body keeps its tabs and line breaks. This is the garden
// profile's rule: a Dash document still parses with parseDoc as before.
const UNSEEN = /[\p{Cc}\p{Cf}\u{2028}\u{2029}]/u;
function unseen(text, body) {
  const drawn = asDrawn(text);
  return HIDDEN.test(drawn) || UNSEEN.test(body ? drawn.replace(/[\t\n]/g, '') : drawn);
}

/** A new garden document in its canonical form. A header value holding a line break is refused, because it would
    write a header line of its own. That includes U+2028 and U+2029, which some readers show as a new line. */
export function template({ id, title, threshold, opens, closes, body }) {
  const one = (k, v) => {
    const s = String(v ?? '').trim();
    if (/[\r\n\u2028\u2029]/.test(s)) throw new Error(k + ' must be one line.');
    if (!s) throw new Error(k + ' is needed.');
    return s;
  };
  const when = (k, v) => (v instanceof Date ? stamp(v) : one(k, v));
  const n = Number(threshold);
  if (!Number.isInteger(n)) throw new Error('threshold must be a whole number.');
  const text = [
    VERSION,
    'id: ' + one('id', id),
    'title: ' + one('title', title),
    'kind: paxt',
    'voice: ' + GARDEN,
    'opens: ' + when('opens', opens),
    'closes: ' + when('closes', closes),
    'threshold: ' + n,
    '---',
    String(body ?? ''),
  ].join('\n');
  return canon(text);
}

// A Date as the header writes a moment: minutes, UTC, no seconds.
function stamp(d) {
  return d.toISOString().slice(0, 16) + 'Z';
}

/* ------------------------------------------------------------------ the line */

export function ballotLine({ id, choices, digest, rev = 1 }) {
  const cs = [...new Set(choices)].sort();
  return VERSION + ' ' + id + ' ' + cs.join('+') + ' ' + digest + (rev > 1 ? ' #' + rev : '');
}

export function parseLine(line) {
  const m = LINE.exec(String(line ?? ''));
  if (!m) return null;
  const choices = m[2].split('+');
  if (new Set(choices).size !== choices.length) return null;
  if ([...choices].sort().join('+') !== m[2]) return null;
  return { id: m[1], choices, digest: m[3], rev: m[4] ? Number(m[4]) : 1 };
}

/** why this line does not belong to this document, or null when it does */
export function lineProblem(terms, digestShort, parsed) {
  if (!parsed) return 'This is not a PAXT line.';
  if (parsed.id !== terms.id) return 'This line is for another document (' + parsed.id + ').';
  if (parsed.digest !== digestShort) return 'This line names another text. The document has changed or was copied wrongly.';
  if (parsed.choices.length > terms.pick) return 'This ballot names more choices than the document allows (' + terms.pick + ').';
  for (const c of parsed.choices) if (!terms.options.includes(c)) return 'The document has no choice named ' + c + '.';
  return null;
}

/** the exact bytes a device key signs for a line: UTF-8 of the suites' DEVICE_PREFIX, then the line */
export function signedBytes(line) {
  return new TextEncoder().encode(DEVICE_PREFIX + String(line ?? ''));
}

/* ------------------------------------------------------------------ the entry */

/** The suite that checks a garden address, or null. The address is the whole did:key id in its one spelling, and
    only the two device-key suites are taken. Shape only: whether the key is a sound point is part of the verify,
    which the suites run (a full point check here would cost a scalar multiplication per entry on every read). */
export function gardenSuite(address) {
  if (typeof address !== 'string') return null;
  const a = accountId(address);
  if (!a || a.chain !== 'did:key' || !GARDEN_SUITES.includes(a.suite)) return null;
  return 'did:key:' + a.address === address ? a.suite : null;
}

// Control characters, C0 and C1 alike (U+0085 is a line break to many readers), and the two Unicode line breaks.
// A name holding one would break a recount file's row in two for some tools.
const NAME_LINE = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;
// Characters a name cannot hold: every one Unicode marks as turning text around (Bidi_Control: U+061C, U+200E,
// U+200F, U+202A to U+202E, U+2066 to U+2069) and every one it says to draw as nothing (Default_Ignorable_Code_Point:
// zero-width characters, U+00AD, U+180E, U+2060 to U+2064, U+FEFF, variation selectors, tag characters and the
// Hangul fillers, named here too because a name of one looks empty). Either kind makes a name read as something
// it is not.
// The parts that hold an emoji together hide nothing, so asDrawn (./text.js) takes them out before the check
// above, and they are allowed nowhere else. The list lives in ./text.js (HIDDEN), and the signal's text rule
// refuses the same list through the same helper.
const NAME_HIDDEN = HIDDEN;

/** Why a chosen name cannot be kept, or null. The one rule for names, for the server, the room and the tests.
    No name (undefined, null or '') is fine. */
export function nameProblem(name) {
  if (name === undefined || name === null) return null;
  if (typeof name !== 'string' || [...name].length > MAX_NAME) return 'name must be ' + MAX_NAME + ' characters or fewer.';
  if (/[<>]/.test(name)) return 'name cannot hold < or >.';
  if (NAME_LINE.test(name)) return 'name must be one plain line.';
  if (NAME_HIDDEN.test(asDrawn(name))) return 'name cannot hold hidden characters or ones that turn text around.';
  return null;
}

/** Why an entry is not shaped like a Gratus record entry, or null. This checks the form only (no crypto), so a
    server or a page can turn a wrong shape away before it spends a verify on it. */
export function entryProblem(e) {
  if (!e || typeof e !== 'object') return 'An entry is an object.';
  const kind = gardenSuite(e.address);
  if (!kind) return 'address must be a device key: did:key with an Ed25519 or P-256 key.';
  if (typeof e.sig !== 'string' || suite(kind).signature(e.sig) !== e.sig) return 'sig must be a 64-byte signature in base64url, 86 characters.';
  if (typeof e.line !== 'string' || !parseLine(e.line)) return 'line must be a PAXT line.';
  return nameProblem(e.name);
}

/** True only when sig is the signature of address's key over signedBytes(line), as the shared suites' verifyAccount
    says, and the address is a garden device key. Anything malformed is simply false: a record is read by
    strangers, and a bad entry must never stop the count of the good ones.
    An error from the runtime itself (a WebCrypto that cannot do what the check needs) is thrown, not turned into
    false. A phone and a server must never count one record two ways, so a record this runtime cannot check is
    not counted here at all. */
export async function verifyEntry(entry) {
  if (!entry || typeof entry !== 'object' || !gardenSuite(entry.address)) return false;
  if (typeof entry.line !== 'string' || typeof entry.sig !== 'string') return false;
  return (await verifyAccount(entry.address, entry.line, entry.sig)) === true;
}

/** the verify a count takes for garden entries: (address, line, sig) -> Promise<boolean> */
export function verifyGarden(address, line, sig) {
  return verifyEntry({ address, line, sig });
}

/* ------------------------------------------------------------------ the record */

/** each entry in the open record names the one before it, so a removed or reordered entry shows */
export async function entryHash(prev, e) {
  return sha256hex(prev + '\n' + e.address + '\n' + e.line + '\n' + e.sig);
}

/** the hash after each entry and the head, starting from the document's full hash */
export async function chainOf(digestFull, entries) {
  let prev = digestFull;
  const hashes = [];
  for (const e of entries) { prev = await entryHash(prev, e); hashes.push(prev); }
  return { hashes, head: prev };
}

/* ------------------------------------------------------------------ the count */

// Who an entry speaks for: its address, in a Gratus entry and a Dash ballot alike, so the count is the
// reference's own on either record.
const speaker = (b) => b.address;
// In a garden every key carries one voice; a Dash count passes its electorate's weights.
const weightOne = () => 1;

/** Count a record, as PAXT 1 counts it.
      terms, digestShort   from parseDoc and digestOf
      ballots              [{ address, line, sig }] in the order received
      weightOf(who)        the weight that key carries (0: no voice). Leave it out for a garden: every key is 1.
      total                the whole weight that could speak, when known (turnout is 0 without it)
      verify(who, line, sig)   true when the signature holds. For a garden pass verifyGarden. Leave it out only
                           when every entry was already checked.
    The highest revision per key speaks; two choices at one revision count for neither. */
export async function count({ terms, digestShort, ballots, weightOf = weightOne, total = 0, verify }) {
  const aside = { malformed: 0, wrongDocument: 0, badSignature: 0, noVoice: 0, replaced: 0, conflicting: 0 };
  const best = new Map();
  for (const b of ballots) {
    const who = speaker(b);
    const parsed = parseLine(b.line);
    if (!parsed) { aside.malformed++; continue; }
    if (lineProblem(terms, digestShort, parsed)) { aside.wrongDocument++; continue; }
    if (verify && !(await verify(who, b.line, b.sig))) { aside.badSignature++; continue; }
    const w = weightOf(who) || 0;
    if (w <= 0) { aside.noVoice++; continue; }
    const key = parsed.choices.join('+');
    const cur = best.get(who);
    if (!cur) { best.set(who, { rev: parsed.rev, key, choices: parsed.choices, w, void: false }); continue; }
    if (parsed.rev > cur.rev) { aside.replaced++; best.set(who, { rev: parsed.rev, key, choices: parsed.choices, w, void: false }); continue; }
    if (parsed.rev < cur.rev) { aside.replaced++; continue; }
    // the same revision signed twice: once with the same choice is a repeat, with another choice it is a conflict
    if (key !== cur.key) cur.void = true;
  }
  const by = Object.fromEntries(terms.options.map((o) => [o, 0]));
  let spoke = 0, keys = 0;
  for (const v of best.values()) {
    if (v.void) { aside.conflicting++; continue; }
    keys++; spoke += v.w;
    for (const c of v.choices) by[c] += v.w;
  }
  const out = { by, keys, spoke, total, turnout: total ? spoke / total : 0, aside };
  if (terms.kind === 'paxt') {
    out.joined = by.join;
    out.inForce = by.join >= terms.threshold;
    out.outcome = out.inForce ? 'in force' : 'below its threshold';
  } else if (terms.kind === 'poll' && terms.rule.type === 'net') {
    // Dash's own rule, as Dash Core counts it: yes minus no must reach the whole-number part of that share of the list
    const needed = Math.max(1, Math.floor((terms.rule.percent / 100) * total));
    out.net = by.yes - by.no; out.needed = needed;
    out.passes = total > 0 && out.net >= needed;
    out.outcome = out.passes ? 'passes' : 'does not pass';
  } else if (terms.kind === 'poll') {
    const ordered = Object.entries(by).sort((a, b) => b[1] - a[1]);
    const quorate = spoke >= terms.rule.quorum;
    const clear = ordered.length > 1 && ordered[0][1] > ordered[1][1];
    out.quorate = quorate; out.leader = clear ? ordered[0][0] : null;
    out.outcome = !quorate ? 'below its quorum' : clear ? ordered[0][0] : 'tied';
  } else {
    const ordered = Object.entries(by).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
    const last = ordered[terms.seats - 1][1], next = ordered[terms.seats][1];
    // a tie across the last seat is reported, never broken silently
    out.tieAtLastSeat = last === next;
    out.elected = ordered.filter((r) => r[1] > next).slice(0, terms.seats).map((r) => r[0]);
    out.tied = out.tieAtLastSeat ? ordered.filter((r) => r[1] === last).map((r) => r[0]) : [];
    out.outcome = out.tieAtLastSeat ? 'tied at the last seat' : 'elected';
  }
  return out;
}

/** the keys whose counted choice in a PAXT record is join */
export async function partnersOf({ terms, digestShort, ballots, weightOf = weightOne, verify }) {
  const best = new Map();
  for (const b of ballots) {
    const who = speaker(b);
    const parsed = parseLine(b.line);
    if (!parsed || lineProblem(terms, digestShort, parsed)) continue;
    if (verify && !(await verify(who, b.line, b.sig))) continue;
    if ((weightOf(who) || 0) <= 0) continue;
    const cur = best.get(who);
    if (!cur || parsed.rev > cur.rev) best.set(who, { rev: parsed.rev, c: parsed.choices[0], void: false });
    else if (parsed.rev === cur.rev && parsed.choices[0] !== cur.c) cur.void = true;
  }
  return new Set([...best.entries()].filter(([, v]) => !v.void && v.c === 'join').map(([a]) => a));
}
