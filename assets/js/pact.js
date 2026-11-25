// The room for one PAXT: the text exactly as signed, the clerk reading it, where it stands, who joined, and the
// buttons to join, leave, share and recount. Also the sheet that writes a new one.
//
// The page never takes the server's word for anything. Every record is checked again here before a word of it
// is shown: the text against its hash, the chain from the first entry to the head, and every signature. The
// count shown is the one this device took, so a person sees what their own browser can prove.
//
// A server, or anyone holding its store, could still leave lines out and rebuild a chain that matches. So this
// device remembers every line it has seen in each record, and the last line it sent, and a record that arrives
// without one of them is refused out loud. The check is that each remembered line is still there, not
// that the old head starts the new chain: two lines stamped in the same moment can reach the store in either
// order, and the order of lines never changes a count (the highest revision per key speaks).
//
// Nothing here signs without a tap. A key comes from keys.js only when someone presses Join or Leave, so opening
// a link makes no key. When a join or leave does not go through, the room says what happened, fetches the record
// again and shows it, and leaves the next act to the person. Nothing asks for a new signature: pressed again for
// the same line, the device sends the bytes it already signed.
//
// The lead wires it: pactView(id) gives the first HTML, wirePact(root, id) fetches and fills it, openDraft()
// writes a new one (openDraft({ room }) also links it to a Vibe room), mountStrip(host, ...) shows a Vibe room's
// PAXTs with their counts, setGo(fn) says how to move to a room, and setSheet(fn) can pass the app's own sheet
// so the phone's back step closes it.
import { esc, $, $$, sheet as rawSheet, toast, shareOrCopy } from './ui.js?v=14';
import {
  canon, digestOf, parseGarden, ballotLine, parseLine, entryProblem, template, chainOf, count, partnersOf,
  verifyGarden, sha256hex, nameProblem, MAX_NAME, MAX_DOC_BYTES,
} from '../../engine/paxt.js?v=1';
import { supported, keyFor, has } from './keys.js?v=1';
import { reading, intent, narrate, marks } from './clerk.js?v=1';

// Each signed line is checked once on this device. A line's verdict never changes (the same address, line and
// signature always give the same answer), so a pass is remembered under the hash of the three and no room open
// spends a second check on it. Only passes are kept, at most PASSED_MAX of them: enough for a room's twelve PAXTs at
// five hundred lines each, with room to spare. A line the check cannot run still throws, so the room says it
// cannot check rather than counting it. The list is written back only when a check added a pass.
// It shares this device's storage with the journal, so each pass is kept as the first 24 hex of its hash (96 bits,
// as the seen lines are): a full list is about 216,000 characters. galaxy.js drops the list, which only costs
// checks made again, before it would refuse to save a journal entry for want of space.
export const PASSED_KEY = 'gratus-paxt-passed';
export const PASSED_MAX = 8000;
const PASS_HEX = 24;
let passed = null;
let passedAdded = false;
function passedSet() {
  if (passed) return passed;
  // a list kept before passes were shortened is read as the same 24 hex
  try { const v = JSON.parse(localStorage.getItem(PASSED_KEY) || '[]'); passed = new Set(Array.isArray(v) ? v.filter((x) => typeof x === 'string').map((x) => x.slice(0, PASS_HEX)) : []); } catch (e) { passed = new Set(); }
  return passed;
}
function keepPassed() {
  if (!passedAdded) return;
  passedAdded = false;
  try { localStorage.setItem(PASSED_KEY, JSON.stringify([...passedSet()].slice(-PASSED_MAX))); } catch (e) { /* full or blocked: the memory copy still serves this page */ }
}
/** verifyGarden, asked once per line on this device: (address, line, sig) -> Promise<boolean> */
export async function verifyOnce(address, line, sig) {
  const k = (await sha256hex(String(address) + '\n' + String(line) + '\n' + String(sig))).slice(0, PASS_HEX);
  const set = passedSet();
  if (set.has(k)) return true;
  const ok = await verifyGarden(address, line, sig);
  if (ok === true) { set.add(k); passedAdded = true; }
  return ok;
}


/** The intent line a new PAXT starts with (DESIGN.md, copy rules). */
export const INTENT = 'Intent: a promise between us, kept by choice. It is not a contract and it moves no money.';

const ID = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
const API = '/api/paxt';
const DAY = 86400000;
// how long a room fetched a moment ago is shown again as it is, without asking the server
const FRESH_MS = 15000;
// which PAXTs this device signed, the name it chose and the last line it sent:
// { [id]: { address, name, entry: { address, line, sig, name } } }. Only this device reads it, and none of it is secret:
// the same entry is in the public record.
const MINE_KEY = 'gratus-paxt-mine';
// the lines this device has seen in each record: { [id]: { n, head, seen: [24 hex per line] } }
const SEEN_KEY = 'gratus-paxt-seen';
// how long to wait before asking again when lines are missing, in case the store had not caught up
const RECHECK_MS = 3000;
// set once this device has said where a key made in a Safari tab lives, so it is said only once
const SAFARI_TOLD_KEY = 'gratus-paxt-safari-told';

/** What a matching fingerprint means, said beside every fingerprint and in the recount file. */
export const FINGERPRINT_NOTE = 'A matching text fingerprint means the same text, and nothing more.';
/** What any count in the room is a count of, said once in the room. */
export const KEYS_NOTE = 'Any key can join through the link, and one person can hold many keys. So every count here is a count of keys.';
/** Who can see what, said once in the room. */
export const SEEN_NOTE = 'Anyone with the link can read the text, the count, every signed line and the names people chose. A key says nothing about who holds it.';

/** The most who can be asked to join. The server holds the same ceiling (api/paxt.js LIMITS), set well under
    the 500 lines a record holds so every key can change its mind and the number can still be reached. */
export const THRESHOLD_MAX = 100;

let goFn = (path) => { location.href = path; };
let sheetFn = rawSheet;

/** How to move to a room: fn(path, id). The lead passes the app's router. */
export function setGo(fn) { if (typeof fn === 'function') goFn = fn; }
/** The sheet to open with. The app's own sheet ties a sheet to the phone's back step. */
export function setSheet(fn) { if (typeof fn === 'function') sheetFn = fn; }

/* ------------------------------------------------------------------ pure helpers (Node can run these) */

const first = (s) => { const t = String(s || ''); return t.charAt(0).toUpperCase() + t.slice(1); };

/** Said when a send failed and no server answered, in place of the browser's own words such as "Failed to fetch". */
export const NOT_SENT = 'It could not be sent. Check the connection and try again.';
/** The words for a failed send: a server's refusal as it came (an error made with said set), and plain words for
    anything else. fallback is for a refusal that came with no words. */
export function failWords(e, fallback = NOT_SENT) {
  if (e && e.said === true) return typeof e.message === 'string' && e.message.trim() ? e.message : fallback;
  return NOT_SENT;
}
const refusal = (msg) => Object.assign(new Error(msg), { said: true });

/** A hash as people can read it aloud: its first 32 hex characters in groups of four, "a1b2 c3d4 ...". The text's
    fingerprint is the short hash every signed line carries; the record's is the start of its head. */
export function fingerprint(hex) {
  const h = String(hex || '').toLowerCase();
  if (!/^[0-9a-f]{32,}$/.test(h)) return '';
  return h.slice(0, 32).match(/.{4}/g).join(' ');
}

/** True for a time written as the server writes one: ISO 8601 in UTC, 2026-11-25T12:00:00.000Z (the
    milliseconds may be left out), and a real moment. */
export function isoTime(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(s)) return false;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return false;
  const back = new Date(t).toISOString();
  return back === s || back.replace('.000Z', 'Z') === s;
}

/** True in a Safari tab, and false in Gratus opened from the Home Screen or in any other browser. Safari can
    clear a site's storage, keys included, after seven days of use without a visit, and a Home Screen app keeps
    storage of its own. nav = { userAgent, standalone }, standalone true when the page runs as the Home
    Screen app. */
export function safariTab(nav) {
  const ua = String((nav && nav.userAgent) || '');
  if (!nav || nav.standalone === true) return false;
  if (!/AppleWebKit\//.test(ua) || !/Safari\//.test(ua) || !/Version\//.test(ua)) return false;
  return !/(?:Chrome|Chromium|CriOS|FxiOS|EdgiOS|Edg|OPR|OPiOS|SamsungBrowser|Android|GSA|DuckDuckGo|YaBrowser)\//.test(ua);
}

/** A new id from the title: up to 28 characters of it, then six random ones so two PAXTs with one title never
    meet. random(n) returns n bytes; it is passed in so a test can fix it. */
export function newId(title, random = (n) => crypto.getRandomValues(new Uint8Array(n))) {
  const slug = String(title || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+/, '').slice(0, 28).replace(/-+$/, '');
  const abc = 'abcdefghijkmnpqrstuvwxyz23456789';
  const tail = Array.from(random(6), (b) => abc[b % abc.length]).join('');
  return (slug || 'paxt') + '-' + tail;
}

/** today plus n days, as YYYY-MM-DD in UTC, the zone the header is written in */
export function dayFrom(now, n) {
  return new Date(new Date(now).getTime() + n * DAY).toISOString().slice(0, 10);
}

/** Build a new garden document from the sheet's fields.
    Returns { ok: true, id, doc } or { ok: false, errors } with errors a person can read. */
export function draftDoc({ title, body, threshold, closes, now = Date.now(), id }) {
  const errors = [];
  const t = String(title || '').trim();
  if (!t) errors.push('Give it a title.');
  else if (t.length > 80) errors.push('Keep the title to 80 characters.');
  else if (/[\r\n]/.test(t)) errors.push('Keep the title on one line.');
  const text = canon(body).replace(/\n$/, '');
  if (!intent(text)) errors.push('Keep a line that starts with Intent:, so nobody joins without meaning to.');
  const said = text.split('\n').some((l) => l.trim() && !/^\s*intent:/i.test(l));
  if (!said) errors.push('Write what you are promising each other.');
  const n = Number(threshold);
  if (!Number.isInteger(n) || n < 2 || n > THRESHOLD_MAX) errors.push('How many keys must join is a whole number from 2 to ' + THRESHOLD_MAX + '.');
  const day = String(closes || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day + 'T00:00:00Z'))) errors.push('Choose the day it closes.');
  else if (Date.parse(day + 'T00:00:00Z') <= now) errors.push('It has to close on a day after today.');
  if (errors.length) return { ok: false, errors };
  const pid = id || newId(t);
  let doc;
  try {
    doc = template({ id: pid, title: t, threshold: n, opens: new Date(now), closes: day, body: text });
  } catch (e) {
    return { ok: false, errors: [first(e.message)] };
  }
  const pr = parseGarden(doc);
  if (!pr.ok) {
    const long = new TextEncoder().encode(doc).length > MAX_DOC_BYTES;
    return { ok: false, errors: long ? ['The text is too long. Keep it under ' + MAX_DOC_BYTES + ' bytes.'] : pr.errors };
  }
  return { ok: true, id: pid, doc };
}

/** This key's latest line in a record: { rev, choice } or null when it never signed here. */
export function standing(entries, address) {
  let best = null;
  for (const e of entries || []) {
    if (e.address !== address) continue;
    const p = parseLine(e.line);
    if (p && (!best || p.rev > best.rev)) best = { rev: p.rev, choice: p.choices[0] };
  }
  return best;
}

/** The next line for this key: one revision above its latest, so the newer line is the one counted. */
export function nextLine({ id, short, entries, address, choice }) {
  const s = standing(entries, address);
  return ballotLine({ id, choices: [choice], digest: short, rev: s ? s.rev + 1 : 1 });
}

/** The entry a device sends for one signed line. A join carries the name chosen for it; a leave carries none. */
export function outgoing({ address, line, sig, choice, name }) {
  return { address, line, sig, name: choice === 'join' ? String(name || '') : '' };
}

/** The names of those who joined, in the order their counted join line reached the record. Nothing about
    anyone else. partners is the Set partnersOf returned. Returns [{ name, at }], name '' when none was given. */
export function joinedNames(entries, partners) {
  const counted = new Map();
  (entries || []).forEach((e, i) => {
    if (!partners.has(e.address)) return;
    const p = parseLine(e.line);
    if (!p || p.choices[0] !== 'join') return;
    const cur = counted.get(e.address);
    if (!cur || p.rev > cur.rev) counted.set(e.address, { rev: p.rev, i, name: e.name || '', at: e.at });
  });
  // a name given on an earlier line still belongs to the key when a later line left it empty
  for (const [address, c] of counted) {
    if (c.name) continue;
    for (const e of entries) if (e.address === address && e.name) c.name = e.name;
  }
  return [...counted.values()].sort((a, b) => a.i - b.i).map((c) => ({ name: c.name, at: c.at }));
}

/** The plain-text file anyone can recount from: the document, a line of three dashes, then one entry per line
    as "address line sig name at". Then the head of the chain as "head <hex>", so two people holding the file can
    see at a glance whether they hold the same record, and the two fingerprints exactly as the room shows them,
    with what a match means. digestShort is the text's short hash; without it the text fingerprint is left out.
    With no line yet, the chain's head is the text's own hash, so its fingerprint would read the same as the
    text's under another label: the record fingerprint is left out until the first line. */
export function recountText(doc, entries, head, digestShort) {
  const rows = (entries || []).map((e) => [e.address, e.line, e.sig, e.name || '', e.at].join(' '));
  const foot = [];
  if (head) foot.push('head ' + head);
  if (fingerprint(digestShort)) foot.push('text fingerprint ' + fingerprint(digestShort));
  if (rows.length && fingerprint(head)) foot.push('record fingerprint ' + fingerprint(head));
  if (foot.length > 1) foot.push(FINGERPRINT_NOTE);
  return canon(doc) + '---\n' + rows.map((r) => r + '\n').join('') + foot.map((r) => r + '\n').join('');
}

const FOOT = [
  ['head', /^head ([0-9a-f]{64})$/],
  ['text', /^text fingerprint ((?:[0-9a-f]{4} ){7}[0-9a-f]{4})$/],
  ['record', /^record fingerprint ((?:[0-9a-f]{4} ){7}[0-9a-f]{4})$/],
];

/** Read a recount file back: { doc, entries, head, fingerprints: { text, record } }, or null when it is not one.
    The split is at the LAST line of three dashes, because the document holds one of its own and an entry line
    never is one. head and each fingerprint are null in a file written without them. Every entry must end with
    the time the record kept it, in ISO form; a row that does not is not part of a recount file. The
    fingerprints are for people to read: a recount takes the hashes from the text and the lines again. */
export function readRecount(text) {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  const cut = lines.lastIndexOf('---');
  if (cut < 1) return null;
  const doc = lines.slice(0, cut).join('\n') + '\n';
  const rows = lines.slice(cut + 1).filter(Boolean);
  const got = { head: null, text: null, record: null };
  if (rows.length && rows[rows.length - 1] === FINGERPRINT_NOTE) rows.pop();
  for (let i = FOOT.length - 1; i >= 0; i--) {
    const m = rows.length ? FOOT[i][1].exec(rows[rows.length - 1]) : null;
    if (m) { got[FOOT[i][0]] = m[1]; rows.pop(); }
  }
  const entries = [];
  for (const row of rows) {
    const m = /^(\S+) (paxt1 \S+ \S+ [0-9a-f]{32}(?: #\d{1,3})?) (\S+) (.*) (\S+)$/.exec(row);
    if (!m || !isoTime(m[5])) return null;
    entries.push({ address: m[1], line: m[2], sig: m[3], name: m[4], at: m[5] });
  }
  return { doc, entries, head: got.head, fingerprints: { text: got.text, record: got.record } };
}

/** A short name for one signed line: its key and its line, hashed. The same line always has the same name. */
export async function lineKey(e) {
  return (await sha256hex(String(e.address) + '\n' + String(e.line))).slice(0, 24);
}

/** What this device keeps after a good check: { n, head, seen }. */
export async function memoryOf(rec) {
  const seen = [];
  for (const e of rec.entries) seen.push(await lineKey(e));
  return { n: rec.entries.length, head: rec.head, seen };
}

/** Check a record as the server sent it, and count it here. { ok: true, terms, digest, count, partners, doc,
    entries, head } or { ok: false }. Any part that does not hold refuses the whole record: a count taken from
    part of one would look like the truth.
    mem is what this device remembers of the record, or null: { seen: [lineKey...], head, own: { address, line } }.
    When a remembered line or this device's own last line is missing, the answer is { ok: false, lost, own,
    was }: lost is how many remembered lines are gone, own is true when this device's last line is gone, and
    was is the head this device saw last.
    When this browser cannot run the signature check at all (a WebCrypto missing what it needs), the answer is
    { ok: false, cannot: true }: nothing is counted here, rather than a count with good lines set aside. */
export async function checkRecord(data, id, mem = null) {
  const no = { ok: false };
  if (!data || typeof data.doc !== 'string' || !Array.isArray(data.entries)) return no;
  const doc = data.doc;
  if (canon(doc) !== doc) return no;
  const pr = parseGarden(doc);
  if (!pr.ok || (id && pr.terms.id !== id)) return no;
  const digest = await digestOf(doc);
  if (digest.full !== data.digest) return no;
  // a null or a list where an entry should be makes the whole record a broken one, before anything reads it
  if (data.entries.some((e) => !e || typeof e !== 'object' || Array.isArray(e))) return no;
  const entries = data.entries.map((e) => ({ address: e.address, line: e.line, sig: e.sig, name: e.name, at: e.at }));
  for (const e of entries) {
    if (entryProblem(e) || !isoTime(e.at)) return no;
    if (typeof e.name !== 'string') e.name = '';
  }
  const { head } = await chainOf(digest.full, entries);
  if (head !== data.head) return no;
  if (mem) {
    const have = new Set();
    for (const e of entries) have.add(await lineKey(e));
    const lost = (Array.isArray(mem.seen) ? mem.seen : []).filter((k) => !have.has(k)).length;
    const own = !!(mem.own && !entries.some((e) => e.address === mem.own.address && e.line === mem.own.line));
    if (lost || own) return { ok: false, lost, own, was: typeof mem.head === 'string' ? mem.head : null };
  }
  let c;
  try {
    c = await count({ terms: pr.terms, digestShort: digest.short, ballots: entries, verify: verifyOnce });
    keepPassed();
  } catch (e) {
    return { ok: false, cannot: true };
  }
  if (c.aside.badSignature || c.aside.wrongDocument || c.aside.malformed) return no;
  // every signature held in the count above, so this pass needs no second check
  const partners = await partnersOf({ terms: pr.terms, digestShort: digest.short, ballots: entries });
  return { ok: true, terms: pr.terms, digest, count: c, partners, doc, entries, head };
}

/* ------------------------------------------------------------------ the HTML */

const btn = (id, cls, label, busy) => '<button class="btn ' + cls + '" id="' + id + '"' + (busy ? ' disabled' : '') + '>' + esc(label) + '</button>';

// The clerk's reading and marks of a record, worked out once per record: the room paints several times while one
// join goes through, and a long text should not be read again at every paint.
const READINGS = new WeakMap();
function readingOf(rec) {
  let r = READINGS.get(rec);
  if (!r) { r = { read: reading(rec.doc), marked: marks(rec.doc, rec.terms) }; READINGS.set(rec, r); }
  return r;
}

/** The room's HTML. st = { rec (from checkRecord), mine (this device's address or null), canSign (true, false or
    null while unknown), busy ('', 'join' or 'leave'), held (whether this device still holds its key for this
    PAXT: true, false, null while it is being asked, or 'unknown' when it could not be asked), notice (what
    happened to the last join or leave, or ''), safari (true the one time the room says where a key made in a
    Safari tab lives) }. Every string goes through esc(). */
export function roomHtml(st, now = Date.now()) {
  const { rec } = st;
  const t = rec.terms;
  const open = now >= t.opens && now < t.closes;
  const here = !!(st.mine && rec.partners.has(st.mine));
  // Joined from this device, and the key that signed is gone: nothing here can sign for that key again. This
  // sees only a partial wipe, the key gone and the note of the join kept. When a browser clears the site whole
  // (Safari does, IndexedDB and localStorage together), this device forgets that it joined as well, and nothing
  // can tell; SAFARI_NOTE and the Join sheet say so in words instead.
  const keyGone = here && st.held === false;
  const names = joinedNames(rec.entries, rec.partners);
  const said = intent(t.body);
  const { read, marked } = readingOf(rec);

  let mine = '';
  if (keyGone) mine = 'This device joined, but its key for this PAXT is gone from this browser. It can no longer leave or change its choice from here.';
  else if (here) mine = 'This device has joined.' + (st.held === true ? ' It still holds its key for this PAXT.' : '');
  else if (st.mine && st.held === false) mine = 'This device signed here before, but its key for this PAXT is gone from this browser.';

  let acts = '';
  if (open && st.canSign === false) {
    acts += '<p class="body pact-note">This browser cannot sign yet, so it cannot join from here. Share the link and open it in a newer browser, or on another device.</p>';
  } else if (open && keyGone) {
    // no Leave (there is no key to sign it) and no Join (a new key would count this device twice)
  } else if (open && here) {
    // not pressable until this device knows it still holds the key that would sign the leave
    acts += btn('pact-leave', 'quiet', st.busy === 'leave' ? 'Leaving...' : 'Leave', !!st.busy || st.held == null);
  } else if (open) {
    acts += btn('pact-join', 'mint', st.busy === 'join' ? 'Signing...' : 'Join', !!st.busy || st.canSign == null);
  }
  acts += btn('pact-share', '', 'Share', false);
  acts += btn('pact-recount', 'quiet', 'Recount it yourself', false);

  return '<div class="glass card pact-head">' +
      '<span class="kicker mint">A PAXT</span>' +
      '<h2 class="pact-title">' + esc(t.title) + '</h2>' +
      '<p class="pact-say">' + esc(narrate(t, rec.count, now)) + '</p>' +
      (said ? '<p class="cap pact-intent">' + esc(said) + '</p>'
        : '<p class="cap pact-intent">This text has no intent line. Read it closely before you join.</p>') +
    '</div>' +
    (marked.length
      ? '<div class="glass card pact-marks">' +
          '<span class="kicker">Read these closely before you join</span>' +
          '<ol class="pact-read pact-marklist" role="list">' + marked.map((m) =>
            '<li><span class="pact-n" aria-hidden="true">' + esc(m.n == null ? '' : m.n) + '</span>' +
            '<span><span class="body pact-quote">' + esc(m.quote) + '</span><span class="cap pact-why">' + esc(m.say) + '</span></span></li>').join('') + '</ol>' +
          '<p class="cap">The clerk finds these by plain matching. It cannot tell why they were written.</p>' +
        '</div>'
      : '') +
    '<div class="glass card">' +
      '<span class="kicker">The text, exactly as signed</span>' +
      '<pre class="pact-doc mono" tabindex="0" aria-label="the text of this PAXT">' + esc(rec.doc) + '</pre>' +
      '<p class="cap">Text fingerprint: <b class="mono pact-hash">' + esc(fingerprint(rec.digest.short)) + '</b>. Every signed line names this text by it, so a signature can only mean this text. ' + esc(FINGERPRINT_NOTE) + '</p>' +
    '</div>' +
    '<div class="glass card">' +
      '<span class="kicker">The clerk reads it</span>' +
      (read.length
        ? '<ol class="pact-read" role="list">' + read.map((s) => '<li><span class="pact-n" aria-hidden="true">' + esc(s.n) + '</span><span class="body">' + esc(s.text) + '</span></li>').join('') + '</ol>'
        : '<p class="body">There is nothing below the header to read.</p>') +
      '<p class="cap">The clerk only reads. It holds no key, and it never signs or counts.</p>' +
    '</div>' +
    '<div class="glass card pact-joined">' +
      '<span class="kicker">Joined</span>' +
      (names.length
        ? '<ul class="pact-names" role="list">' + names.map((x) => x.name
          ? '<li>' + esc(x.name) + '</li>'
          : '<li class="pact-anon">Joined without a name</li>').join('') + '</ul>'
        : '<p class="body">No key has joined yet.</p>') +
      (mine ? '<p class="cap pact-you">' + esc(mine) + '</p>' : '') +
      (st.safari ? '<p class="cap pact-keynote">' + esc(SAFARI_NOTE) + '</p>' : '') +
      (st.notice ? '<p class="body pact-notice" role="status">' + esc(st.notice) + '</p>' : '') +
      '<div class="actions pact-acts">' + acts + '</div>' +
      (rec.entries.length
        ? '<p class="cap">Record fingerprint, as this device last checked it: <b class="mono pact-headhash">' + esc(fingerprint(rec.head)) + '</b>. It changes with every new line, and every signature in it was checked on this device.</p>'
        : '<p class="cap">' + esc(NO_RECORD_PRINT) + '</p>') +
      '<p class="cap">' + esc(KEYS_NOTE) + '</p>' +
      '<p class="cap">' + esc(SEEN_NOTE) + '</p>' +
    '</div>';
}

/** What a full wipe does, said in the Safari note and in the Join sheet in a Safari tab. */
export const SAFARI_WIPE = 'If Safari clears this site, this device forgets its key and that it joined, so joining again from here would add a second key.';
/** Said once, the first time a key is made in a Safari tab. */
export const SAFARI_NOTE = 'This key lives in Safari on this device. Safari can clear a site’s storage after seven days of use without a visit, and Gratus on the Home Screen keeps keys of its own. ' + SAFARI_WIPE;
/** Where the record fingerprint goes before any line: with no line, the head is the text's own hash. */
export const NO_RECORD_PRINT = 'Record fingerprint: none yet. It starts with the first signed line and changes with every line after it.';
/** Said when this browser cannot run the signature check at all. */
export const CANNOT_CHECK = 'This browser cannot check the signatures in this record, so it counts nothing from it. Another browser or device may be able to.';

/** The Join sheet's HTML. safari is true in a Safari tab on a device with no memory of this PAXT, where a full
    wipe would leave no trace of a join made here. */
export function joinSheetHtml(title, short, { safari = false } = {}) {
  return '<div class="hero-sm"><span class="orb lg lit"><span>✍️</span></span><h2>Join</h2><span class="kicker mint">' + esc(title) + '</span></div>' +
    '<p class="body">Joining signs one line with a key that stays on this device. The line names this exact text by its hash.</p>' +
    '<p class="cap">Text fingerprint: <b class="mono pact-hash">' + esc(fingerprint(short)) + '</b>. ' + esc(FINGERPRINT_NOTE) + '</p>' +
    (safari ? '<p class="cap pact-keynote">' + esc(SAFARI_WIPE) + '</p>' : '') +
    '<input class="field" id="pj-name" maxlength="' + MAX_NAME + '" autocomplete="nickname" placeholder="the name others see" aria-label="the name others see">' +
    '<button class="btn mint wide" id="pj-go">Join</button>' +
    '<p class="cap">Everyone who opens this PAXT sees the name. Leave it empty to join without one.</p>';
}

/** Whether a tap on Join or Leave must stop before it makes or uses a key, because the key that signed here is
    gone. hadKey is keys.has before the tap (true, false, or null when it could not be asked); remembered is the
    address this device noted when it signed; address, when given, is the key keys.js handed back. Stops when
    there is no key and the tap is a leave (a new key would leave nothing), or when the remembered key is still
    joined and the key at hand is not it (signing would count this device twice). */
export function keyGoneFor({ choice, hadKey, remembered, partners, address = null }) {
  const joined = !!(remembered && partners && partners.has(remembered));
  if (hadKey === false && (choice === 'leave' || joined)) return true;
  return !!(address && joined && address !== remembered);
}

/** What this device notes for a PAXT after a tap: { address, name, entry }. prev is what it noted before. A
    remembered key that is still joined is never swapped for another, so the room keeps saying that key is gone
    instead of offering a second join. */
export function nextMine(prev, address, name, entry, partners) {
  if (prev && typeof prev.address === 'string' && prev.address !== address && partners && partners.has(prev.address)) return prev;
  const was = prev && prev.address === address ? prev.entry : null;
  const keep = entry || was;
  return keep ? { address, name: name || '', entry: keep } : { address, name: name || '' };
}

function waitHtml(msg, retry) {
  return '<div class="glass card pact-wait"><span class="kicker mint">A PAXT</span><p class="body">' + esc(msg) + '</p>' +
    (retry ? '<div class="actions">' + btn('pact-retry', '', 'Try again', false) + '</div>' : '') + '</div>';
}

/* ------------------------------------------------------------------ the room */

// the last room this page saw, so a re-render shows it at once instead of a loading line
let room = null;   // { id, rec, at, busy }
let wiring = 0;
let canSign = null;
let canSignAsk = null;

function signable() {
  canSignAsk ??= supported().then((ok) => { canSign = ok; return ok; }, () => { canSign = false; return false; });
  return canSignAsk;
}

function mineAll() {
  try { const v = JSON.parse(localStorage.getItem(MINE_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
}
function mineOf(id) { const m = mineAll()[id]; return m && typeof m.address === 'string' ? m : null; }
// entry is the line just sent; left out, the line remembered before stays, as long as the key is the same.
// partners is the record's joined keys, so a remembered key still joined is never swapped out (nextMine).
function remember(id, address, name, entry, partners) {
  try {
    const all = mineAll();
    all[id] = nextMine(all[id], address, name, entry, partners);
    localStorage.setItem(MINE_KEY, JSON.stringify(all));
  } catch (e) {}
}

function seenAll() {
  try { const v = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
}
// what this device remembers of one record, ready for checkRecord
function memFor(id) {
  const s = seenAll()[id];
  const m = mineOf(id);
  const own = m && m.entry && typeof m.entry.line === 'string' && m.entry.address === m.address ? { address: m.address, line: m.entry.line } : null;
  const seen = s && Array.isArray(s.seen) ? s.seen.filter((k) => typeof k === 'string') : [];
  return { seen, head: s && typeof s.head === 'string' ? s.head : null, own };
}
async function rememberSeen(id, rec) {
  try { const all = seenAll(); all[id] = await memoryOf(rec); localStorage.setItem(SEEN_KEY, JSON.stringify(all)); } catch (e) {}
}

// What the room says about this device's own key and its last act, kept apart from the record so a fresh fetch
// does not wipe it: { id, held, notice, safari }. held is keys.has(id), asked on this device only.
let says = { id: null, held: null, notice: '', safari: false };
const saysFor = (id) => { if (says.id !== id) says = { id, held: null, notice: '', safari: false }; return says; };

// Whether this device still holds its key for this PAXT, asked without making one. A browser can delete a
// site's storage on its own (Safari does after seven days of use without a visit), so the answer is asked again
// each time the room is wired.
// When it cannot be asked, or gets no answer within KEYS_MS (another tab can hold the key store while Start over
// deletes it), held is 'unknown', so Leave is not held back for ever by a question with no answer.
function checkHeld(host, id) {
  const settle = (v) => { saysFor(id).held = v; if (host.isConnected) paint(host, id); };
  let ask;
  try { ask = has(id); } catch (e) { settle('unknown'); return; }
  inTime(ask, KEYS_MS).then((v) => settle(v === true), () => settle('unknown'));
}

// How long the room waits on this device's key store before it says so. Ordinarily it answers at once.
const KEYS_MS = 4000;
/** A promise that settles as p does, or rejects with { late: true } after ms. */
export function inTime(p, ms) {
  return new Promise((ok, no) => {
    const t = setTimeout(() => no(Object.assign(new Error('no answer in time'), { late: true })), ms);
    Promise.resolve(p).then((v) => { clearTimeout(t); ok(v); }, (e) => { clearTimeout(t); no(e); });
  });
}
/** Said when this device's key store gives no answer, as happens while another tab keeps it open. */
export const KEYS_LATE = 'This device could not reach its keys, so nothing was signed. Close any other Gratus tabs and try again.';

// the signed line this device made and could not get into the record, kept so a second press sends the same
// bytes again instead of signing anew: { [id]: entry }
const unsent = {};

const stateOf = (r) => {
  const s = saysFor(r.id);
  return { rec: r.rec, mine: (mineOf(r.id) || {}).address || null, canSign, busy: r.busy || '', held: s.held, notice: s.notice, safari: s.safari };
};

/** The HTML for /app/pact/<id>. It shows the room at once when this page already holds it, and a quiet
    loading line otherwise; wirePact fills it in. */
export function pactView(id) {
  const inner = room && room.id === id ? roomHtml(stateOf(room)) : waitHtml('Opening it...');
  return '<div class="page pact" data-pact="' + esc(id) + '">' + inner + '</div>';
}

/** Fetch the record, check it, render the room into root and connect its buttons. */
export async function wirePact(root, id) {
  const host = (root && root.matches && root.matches('[data-pact]')) ? root : ($('[data-pact]', root) || root);
  if (!host) return;
  const turn = ++wiring;
  const live = () => turn === wiring && host.isConnected;
  if (!ID.test(String(id || ''))) { host.innerHTML = waitHtml('This link does not name a PAXT.'); return; }
  signable().then(() => { if (live() && room && room.id === id) paint(host, id); });
  checkHeld(host, id);
  if (room && room.id === id) {
    paint(host, id);
    if (Date.now() - room.at < FRESH_MS) return;
  }
  let r, d;
  try {
    r = await fetch(API + '?id=' + encodeURIComponent(id), { cache: 'no-store' });
    d = await r.json().catch(() => ({}));
  } catch (e) {
    if (live() && !(room && room.id === id)) { host.innerHTML = waitHtml('It could not be reached. Check the connection and try again.', true); wireRetry(host, id); }
    return;
  }
  if (!live()) return;
  if (!r.ok) {
    const msg = r.status === 404 ? 'There is no PAXT at this link.'
      : r.status === 409 ? 'This record has been changed outside Gratus, so nothing is counted from it.'
      : r.status === 503 ? 'Agreements are not connected yet.'
      : r.status === 400 ? 'This link does not name a PAXT.'
      : 'It could not be reached. Try again in a moment.';
    room = null;
    host.innerHTML = waitHtml(msg, r.status >= 500 || r.status === 429);
    wireRetry(host, id);
    return;
  }
  await take(host, id, d);
}

// Check what the server sent and paint it, or say plainly that it does not hold. When lines this device saw are
// missing, it first gives the store a fair chance: its own last line is sent again (the same signed bytes, so
// the record keeps it once), or it waits a moment and asks again. Only then does it say the record lost lines.
async function take(host, id, data, tries = 0) {
  const rec = await checkRecord(data, id, memFor(id));
  if (!host.isConnected) return false;
  if (!rec.ok && (rec.lost || rec.own) && tries < 2) {
    // The line is sent again once. A second try waits RECHECK_MS and asks again, so both tries never land inside
    // the few seconds the store's list runs behind a write.
    const again = rec.own && tries === 0 ? await resend(id) : await refetch(id);
    if (again && host.isConnected) return take(host, id, again, tries + 1);
  }
  if (!host.isConnected) return false;
  if (!rec.ok) {
    room = null;
    const lostMsg = 'This record is missing lines this device saw before, so nothing is counted from it.' +
      (fingerprint(rec.was) ? ' When this device last checked, the record fingerprint was ' + fingerprint(rec.was) + '.' : '');
    host.innerHTML = waitHtml(rec.lost || rec.own ? lostMsg : rec.cannot ? CANNOT_CHECK : 'This record does not check out on this device, so nothing is counted from it.', true);
    wireRetry(host, id);
    return false;
  }
  room = { id, rec, at: Date.now(), busy: '' };
  keepStripRow(id, rec);
  await rememberSeen(id, rec);
  paint(host, id);
  return true;
}

// this device's last line, sent again as it was signed; the record it answers with, or null
async function resend(id) {
  const m = mineOf(id);
  if (!m || !m.entry) return null;
  try {
    const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ act: 'sign', id, entry: m.entry }) });
    return r.ok ? await r.json() : null;
  } catch (e) { return null; }
}

async function refetch(id, wait = RECHECK_MS) {
  if (wait) await new Promise((ok) => setTimeout(ok, wait));
  try {
    const r = await fetch(API + '?id=' + encodeURIComponent(id), { cache: 'no-store' });
    return r.ok ? await r.json() : null;
  } catch (e) { return null; }
}

function paint(host, id) {
  if (!room || room.id !== id || !host.isConnected) return;
  host.innerHTML = roomHtml(stateOf(room));
  const on = (sel, fn) => { const b = $(sel, host); if (b) b.addEventListener('click', fn); };
  on('#pact-join', () => join(host, id));
  on('#pact-leave', () => leave(host, id));
  on('#pact-share', () => share(id, room.rec.terms.title));
  on('#pact-recount', () => recount(id));
}

function wireRetry(host, id) {
  const b = $('#pact-retry', host);
  if (b) b.addEventListener('click', () => { host.innerHTML = waitHtml('Opening it...'); wirePact(host, id); });
}

async function share(id, title) {
  const how = await shareOrCopy(title, 'A PAXT to read, and to join if you mean it.', location.origin + '/app/pact/' + id);
  if (how === 'shared') toast('Shared');
  else if (how === 'copied') toast('Link copied');
  else if (how === 'failed') toast('The link could not be copied.');
}

function recount(id) {
  if (!room || room.id !== id) return;
  const text = recountText(room.rec.doc, room.rec.entries, room.rec.head, room.rec.digest.short);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'paxt-' + id + '.txt'; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Downloaded: the text and every signed line.');
}

// The name sheet. It is also the tap that signs: Join inside it is the person's yes. Resolves the name, or
// null when the sheet is closed without joining.
function askName(title, short, safari) {
  return new Promise((resolve) => {
    let done = false;
    const sh = sheetFn(joinSheetHtml(title, short, { safari }),
    { autofocus: true, onClose: () => { if (!done) { done = true; resolve(null); } } });
    $('#pj-go', sh.el).addEventListener('click', () => {
      const name = $('#pj-name', sh.el).value.replace(/\s+/g, ' ').trim();
      // the engine's one rule for names, so the room never sends a name the record would refuse
      const bad = nameProblem(name);
      if (bad) { toast(first(bad)); return; }
      done = true; resolve(name); sh.close();
    });
  });
}

function askLeave(title) {
  return new Promise((resolve) => {
    let done = false;
    const sh = sheetFn('<div class="hero-sm"><h2>Leave this PAXT?</h2><span class="kicker mint">' + esc(title) + '</span></div>' +
      '<p class="body">Leaving signs one more line with this device’s key. The record keeps both lines, so anyone with the link can see that this key has left, and the newer one is the one counted. You can join again until it closes.</p>' +
      '<div class="actions"><button class="btn" id="pl-go">Leave it</button><button class="btn quiet" id="pl-stay">Stay</button></div>',
    { onClose: () => { if (!done) { done = true; resolve(false); } } });
    $('#pl-go', sh.el).addEventListener('click', () => { done = true; resolve(true); sh.close(); });
    $('#pl-stay', sh.el).addEventListener('click', () => sh.close());
  });
}

async function join(host, id) {
  if (!room || room.id !== id || room.busy) return;
  if (!(await signable())) { paint(host, id); return; }
  const was = mineOf(id);
  // this device has no note of the PAXT; in a Safari tab, a full wipe after joining would leave none either
  const name = was ? was.name : await askName(room.rec.terms.title, room.rec.digest.short, inSafariTab());
  if (name === null) return;
  await sign(host, id, 'join', name);
}

async function leave(host, id) {
  if (!room || room.id !== id || room.busy) return;
  if (!(await askLeave(room.rec.terms.title))) return;
  // a leave line carries no name; the name chosen at join is kept on this device for a later join
  await sign(host, id, 'leave', (mineOf(id) || {}).name || '');
}

/** What the room says after a join or leave did not go through. what says what happened; there is whether the
    record fetched again holds the line after all, or null when it could not be fetched. It never asks for a
    new signature: the next act is the person's. */
export function failNote(what, there) {
  if (there === true) return 'It reached the record after all. This is the record as it stands now.';
  if (there === false) return what + ' This is the record as it stands now, fetched again. Nothing else was signed.';
  return what + ' The record could not be fetched again, so this is the record as this device last checked it. Nothing else was signed.';
}

// A join or leave that did not go through: say what happened, fetch the record again, show it, and stop there.
async function failed(host, id, entry, keepName, what) {
  unsent[id] = entry;
  const data = await refetch(id, 0);
  if (data && host.isConnected) {
    const ok = await take(host, id, data);
    // take() said out loud why the record does not check out; that is what the room shows now
    if (!ok) return;
    const there = room.rec.entries.some((e) => e.address === entry.address && e.line === entry.line);
    if (there) { remember(id, entry.address, keepName, entry, room.rec.partners); delete unsent[id]; }
    saysFor(id).notice = failNote(what, there);
    paint(host, id);
    return;
  }
  saysFor(id).notice = failNote(what, null);
  if (room && room.id === id) { room.busy = ''; paint(host, id); }
}

// make the line, sign it on this device, send it, and show the record the server answers with
async function sign(host, id, choice, name) {
  const note = saysFor(id);
  note.notice = '';
  room.busy = choice; paint(host, id);
  const settle = () => { if (room && room.id === id) { room.busy = ''; paint(host, id); } };
  // whether this tap is the one that makes the key, so the room can say once where a Safari key lives
  let hadKey = null;
  try { hadKey = await inTime(has(id), KEYS_MS); } catch (e) {
    if (e && e.late) { toast(KEYS_LATE, 5200); settle(); return; }
    hadKey = null;
  }
  const rec = room.rec;
  const remembered = (mineOf(id) || {}).address || null;
  // The key that signed here is gone: stop before keys.js makes a new one. A new key could not leave for the old
  // one, and joining with it would count this device twice. The room says the key is gone instead.
  const gone = () => {
    note.held = false;
    if (!rec.partners.has(remembered)) toast('This device is not in it.');
    settle();
  };
  if (keyGoneFor({ choice, hadKey, remembered, partners: rec.partners })) { gone(); return; }
  let k;
  try {
    k = await inTime(keyFor(id), 2 * KEYS_MS);
  } catch (e) {
    toast(e && e.late ? KEYS_LATE : 'This device could not make its key. Nothing was signed.', 5200);
    settle(); return;
  }
  if (keyGoneFor({ choice, hadKey, remembered, partners: rec.partners, address: k.address })) { gone(); return; }
  note.held = true;
  if (hadKey === false && shouldTellSafari()) note.safari = true;
  const where = rec.partners.has(k.address) ? 'join' : (standing(rec.entries, k.address) || {}).choice || null;
  // already where they asked to be: nothing to sign
  if (where === choice || (choice === 'leave' && !where)) {
    remember(id, k.address, name, undefined, rec.partners);
    toast(choice === 'join' ? 'This device has already joined.' : 'This device is not in it.');
    settle(); return;
  }
  const line = nextLine({ id, short: rec.digest.short, entries: rec.entries, address: k.address, choice });
  let entry;
  const held = unsent[id];
  if (held && held.address === k.address && held.line === line) {
    // the same line this device already signed and could not send: the same bytes go again, no new signature
    entry = outgoing({ address: held.address, line: held.line, sig: held.sig, choice, name });
  } else {
    try {
      entry = outgoing({ address: k.address, line, sig: await k.sign(line), choice, name });
    } catch (e) {
      toast('This device could not sign. Nothing was sent.');
      settle(); return;
    }
  }
  const bad = entryProblem(entry);
  if (bad) { toast(first(bad)); settle(); return; }
  let r, d;
  try {
    r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ act: 'sign', id, entry }) });
    d = await r.json().catch(() => ({}));
  } catch (e) {
    await failed(host, id, entry, name, 'It could not be sent.');
    return;
  }
  if (!r.ok) {
    const why = d && typeof d.error === 'string' ? first(d.error.trim()) : '';
    await failed(host, id, entry, name, why ? 'It was not recorded. ' + why + (/[.!?]$/.test(why) ? '' : '.') : 'It was not recorded.');
    return;
  }
  delete unsent[id];
  remember(id, k.address, name, entry, rec.partners);
  const ok = await take(host, id, d);
  if (!ok) return;
  if (d.already) toast('That line was already in the record.');
  else toast(choice === 'join' ? 'You joined.' : 'You left. You can join again until it closes.');
}

// true in a Safari tab, false in Gratus from the Home Screen and in any other browser
function inSafariTab() {
  try {
    const nav = globalThis.navigator;
    const standalone = !!(nav && nav.standalone === true) ||
      !!(globalThis.matchMedia && globalThis.matchMedia('(display-mode: standalone)').matches);
    return safariTab({ userAgent: nav && nav.userAgent, standalone });
  } catch (e) { return false; }
}

// true the first time a key is made in a Safari tab on this device, and never again after that
function shouldTellSafari() {
  try {
    if (!inSafariTab()) return false;
    if (localStorage.getItem(SAFARI_TOLD_KEY)) return false;
    localStorage.setItem(SAFARI_TOLD_KEY, '1');
    return true;
  } catch (e) { return false; }
}

/* ------------------------------------------------------------------ PAXTs in a Vibe room */

/** The strip's words (DESIGN-1-5.md, section 4). */
export const STRIP_KICKER = 'PAXTs in this room';
export const STRIP_RULE = 'Signed lines stay on each PAXT’s own page. This room sees counts.';
/** The one quiet act on each row, shown only on the device that holds the room's keeper key. */
export const STRIP_OFF = 'Take it off this room';
const CAP_STRIP = 12;

/** The strip's HTML. rows = [{ id, title, say }] in the room's order, say being the clerk's count sentence.
    keeper is true only on the device that holds the room's keeper key. Counts only: no names, no keys, no
    lines. '' when no row reads. Every string goes through esc(). */
export function stripHtml(rows, { keeper = false, busy = '' } = {}) {
  const ok = (rows || []).filter((r) => r && ID.test(String(r.id)) && typeof r.title === 'string').slice(0, CAP_STRIP);
  if (!ok.length) return '';
  return '<div class="glass card room-paxts"><span class="kicker mint">' + esc(STRIP_KICKER) + '</span><div class="rows">' +
    ok.map((r) => '<div class="room-paxt">' +
      '<button class="glass opt" data-paxt-open="' + esc(r.id) + '"><span class="ico" aria-hidden="true">◈</span>' +
        '<span class="grow"><b>' + esc(r.title) + '</b><span>' + esc(r.say) + '</span></span><span class="arrow" aria-hidden="true">›</span></button>' +
      (keeper ? '<button class="btn sm quiet" data-paxt-off="' + esc(r.id) + '"' + (busy === r.id ? ' disabled' : '') + '>' + esc(STRIP_OFF) + '</button>' : '') +
    '</div>').join('') + '</div>' +
    '<p class="cap">' + esc(STRIP_RULE) + '</p></div>';
}

/** One strip row from a record as /api/paxt sends it, checked on this device first, or null when it does not
    read. The count is the one this device took, as in the PAXT's own room. */
export async function stripRow(data, id, now = Date.now(), mem = null) {
  const rec = await checkRecord(data, id, mem);
  return rec.ok ? { id, title: rec.terms.title, say: narrate(rec.terms, rec.count, now) } : null;
}

// rows read a moment ago, so the app's frequent repaints never fetch a record again: { [id]: { at, row } }
const stripCache = new Map();
async function rowFor(id, fetchFn) {
  const hit = stripCache.get(id);
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.row;
  let row = null;
  try {
    const r = await fetchFn(API + '?id=' + encodeURIComponent(id), { cache: 'no-store' });
    if (r.ok) row = await stripRow(await r.json(), id, Date.now(), memFor(id));
  } catch (e) { row = null; }
  if (stripCache.size >= 200) stripCache.clear();
  stripCache.set(id, { at: Date.now(), row });
  return row;
}
// A record this device has just checked in the PAXT's own room, after a join or a leave too, is the newest word on
// it. The room's strip takes its row from that record, so the strip under the room shows the same count once the
// room is closed. paintStrip does nothing when no strip on screen lists the PAXT.
function keepStripRow(id, rec) {
  if (stripCache.size >= 200) stripCache.clear();
  stripCache.set(id, { at: Date.now(), row: { id, title: rec.terms.title, say: narrate(rec.terms, rec.count, Date.now()) } });
  paintStrip();
}
const stripIds = (ids) => [...new Set((Array.isArray(ids) ? ids : []).filter((id) => ID.test(String(id))))].slice(0, CAP_STRIP);

/** The strip for a room's PAXT ids: each record read from /api/paxt and checked here, twelve at most, and a PAXT
    that does not read left out without a word. Resolves the HTML. */
export async function roomStrip(ids, { keeper = false, fetchFn = globalThis.fetch } = {}) {
  const rows = await Promise.all(stripIds(ids).map((id) => rowFor(id, fetchFn)));
  return stripHtml(rows.filter(Boolean), { keeper });
}

// the strip on screen now: { host, code, ids, keeper, onChange }, and the PAXT being taken off it
let strip = null;
let stripBusy = '';
function paintStrip() {
  if (!strip || !strip.host.isConnected) return;
  const rows = strip.ids.map((id) => { const h = stripCache.get(id); return h ? h.row : null; }).filter(Boolean);
  const html = stripHtml(rows, { keeper: !!strip.keeper, busy: stripBusy });
  if (strip.host.dataset.stripPainted === html) return;
  strip.host.innerHTML = html;
  strip.host.dataset.stripPainted = html;
  const host = strip.host;
  $$('[data-paxt-open]', host).forEach((b) => b.addEventListener('click', () => goFn('/app/pact/' + b.dataset.paxtOpen, b.dataset.paxtOpen)));
  $$('[data-paxt-off]', host).forEach((b) => b.addEventListener('click', () => takeOff(b.dataset.paxtOff)));
}

/** Fill host with a room's strip and connect it. ids are the room's PAXT ids from api/vibes.js; keeper is the
    room's keeper key when this device holds it, and only then does a row offer to take its PAXT off the room.
    onChange(ids) gets the room's ids after one is taken off. The rows this page already holds show at once. */
export function mountStrip(host, { code = '', ids = [], keeper = '', onChange = null } = {}) {
  if (!host) return;
  strip = { host, code, ids: stripIds(ids), keeper: typeof keeper === 'string' ? keeper : '', onChange };
  paintStrip();
  const want = strip.ids.filter((id) => { const h = stripCache.get(id); return !h || Date.now() - h.at >= FRESH_MS; });
  if (!want.length) return;
  const mine = strip;
  Promise.all(want.map((id) => rowFor(id, globalThis.fetch))).then(() => { if (strip && strip.code === mine.code) paintStrip(); });
}

function askTakeOff(title) {
  return new Promise((resolve) => {
    let done = false;
    const sh = sheetFn('<div class="hero-sm"><h2>Take it off this room?</h2><span class="kicker mint">' + esc(title) + '</span></div>' +
      '<p class="body">The PAXT stays open at its own link, with every signed line. This room stops listing it.</p>' +
      '<div class="actions"><button class="btn" id="po-go">Take it off</button><button class="btn quiet" id="po-stay">Keep it</button></div>',
    { onClose: () => { if (!done) { done = true; resolve(false); } } });
    $('#po-go', sh.el).addEventListener('click', () => { done = true; resolve(true); sh.close(); });
    $('#po-stay', sh.el).addEventListener('click', () => sh.close());
  });
}

async function takeOff(id) {
  const s = strip;
  if (!s || !s.keeper || stripBusy || !ID.test(String(id))) return;
  const h = stripCache.get(id);
  if (!(await askTakeOff(h && h.row ? h.row.title : id))) return;
  stripBusy = id; paintStrip();
  try {
    const r = await fetch('/api/vibes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ act: 'paxt-detach', code: s.code, id, keeper: s.keeper }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.vibe) throw refusal(d && typeof d.error === 'string' ? first(d.error.trim()) : 'It was not taken off.');
    const ids = Array.isArray(d.vibe.paxts) ? d.vibe.paxts : s.ids.filter((x) => x !== id);
    s.ids = stripIds(ids);
    toast('Taken off this room. The PAXT is still open at its own link.');
    if (typeof s.onChange === 'function') { try { s.onChange(ids); } catch (e) {} }
  } catch (e) {
    toast(failWords(e, 'It was not taken off.'), 4200);
  }
  stripBusy = '';
  paintStrip();
}

/* ------------------------------------------------------------------ writing a new one */

/** Link a PAXT that has opened to a Vibe room (api/vibes.js paxt-attach). Resolves the room's PAXT ids, or null
    with a toast when it could not be linked. The PAXT itself is open either way. */
async function attachTo(room, id) {
  try {
    const r = await fetch('/api/vibes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ act: 'paxt-attach', code: room, id }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.vibe && Array.isArray(d.vibe.paxts)) return d.vibe.paxts;
    toast('The PAXT is open, but it could not be added to the room.' + (d && typeof d.error === 'string' ? ' ' + first(d.error.trim()) : ''), 4200);
  } catch (e) {
    toast('The PAXT is open, but it could not be added to the room. Check the connection.', 4200);
  }
  return null;
}

/** Said when a new PAXT was sent and no reply came back, so it may or may not have opened. */
export const LOST_OPEN = 'The reply was lost, so it may or may not have opened. Press Open it again: it sends the same text, which never opens twice.';

/** The record at a draft's id when it holds exactly this draft's text, or null. */
async function sameDraftAt(draft, fetchFn = globalThis.fetch) {
  try {
    const r = await fetchFn(API + '?id=' + encodeURIComponent(draft.id), { cache: 'no-store' });
    if (!r.ok) return null;
    const d = await r.json();
    return d && typeof d.doc === 'string' && d.digest === (await digestOf(draft.doc)).full ? d : null;
  } catch (e) { return null; }
}

/** The sheet that writes a new PAXT, opens it on the server and goes to its room. With room (a Vibe room's
    code), the PAXT is linked to that room once it has opened, and onAttach(ids) gets the room's PAXT ids. The
    text never names the room, so the code never enters a signed or public document. */
export function openDraft({ room: roomCode = '', onAttach = null } = {}) {
  const now = Date.now();
  // named roomCode here: `room` is this module's last PAXT room, set below once the new one opens
  const inRoom = typeof roomCode === 'string' && /^[A-Z0-9]{1,12}$/.test(roomCode);
  const sh = sheetFn('<div class="hero-sm"><span class="orb lg lit"><span>✦</span></span><h2>Write a PAXT</h2><span class="kicker mint">One plain text, joined line by line</span></div>' +
    '<input class="field" id="pd-title" maxlength="80" placeholder="name it: Sunday dinners, The shared garden" aria-label="the title">' +
    '<textarea class="field pact-draft" id="pd-body" rows="8" maxlength="18000" aria-label="the text">' + esc(INTENT + '\n\n') + '</textarea>' +
    '<p class="cap">Write what you are promising each other. Keep the intent line, so nobody joins without meaning to.</p>' +
    '<div class="pact-pair"><input class="field" id="pd-need" type="number" inputmode="numeric" min="2" max="' + THRESHOLD_MAX + '" step="1" value="3" aria-label="how many keys must join"><span class="cap">keys must join for it to be in force</span></div>' +
    '<div class="pact-pair"><input class="field" id="pd-close" type="date" min="' + esc(dayFrom(now, 1)) + '" value="' + esc(dayFrom(now, 14)) + '" aria-label="the day it closes"><span class="cap">is the day it closes</span></div>' +
    '<button class="btn mint wide" id="pd-go">Open it</button>' +
    '<p class="cap">Once it is open the text cannot change. Anyone with the link can read it and see the names of those who join. Any key can join, and one person can hold many keys.</p>' +
    (inRoom ? '<p class="cap">Once it opens, this room lists it with its count. The text does not name the room.</p>' : ''),
  { autofocus: true });
  const go = $('#pd-go', sh.el);
  // A draft whose reply was lost: it may have opened. The next press sends the same id and opening time again, so
  // an unchanged text opens once, and the room checks whether the PAXT at that id is this text.
  let lost = null;   // { id, now }
  go.addEventListener('click', async () => {
    const fields = {
      title: $('#pd-title', sh.el).value,
      body: $('#pd-body', sh.el).value,
      threshold: $('#pd-need', sh.el).value,
      closes: $('#pd-close', sh.el).value,
    };
    go.disabled = true; go.textContent = 'Opening...';
    const reset = () => { go.disabled = false; go.textContent = 'Open it'; };
    // one more try with a fresh id if the first is taken; six random characters make that rare
    for (let attempt = 0; attempt < 2; attempt++) {
      const again = attempt === 0 ? lost : null;
      const now = again ? again.now : Date.now();
      const draft = draftDoc(Object.assign({ now }, fields, again ? { id: again.id } : {}));
      if (!draft.ok) { toast(draft.errors[0], 4200); reset(); return; }
      let r, d;
      try {
        r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ act: 'open', doc: draft.doc }) });
        d = await r.json().catch(() => ({}));
      } catch (e) {
        lost = { id: draft.id, now };
        toast(LOST_OPEN, 5200); reset(); return;
      }
      lost = null;
      if (r.status === 409 && again) {
        // the id is taken: by this very text when the lost reply had opened it, and then it is this PAXT
        const there = await sameDraftAt(draft);
        if (there) { r = { ok: true, status: 200 }; d = there; }
      }
      if (r.status === 409 && attempt === 0) continue;
      if (!r.ok) {
        const why = d && Array.isArray(d.problems) && d.problems.length ? d.problems[0] : d && typeof d.error === 'string' ? d.error : 'It was not opened.';
        toast(first(why), 4200); reset(); return;
      }
      const rec = await checkRecord(d, draft.id);
      if (rec.ok) room = { id: draft.id, rec, at: Date.now(), busy: '' };
      if (inRoom) {
        go.textContent = 'Adding it to the room...';
        const ids = await attachTo(roomCode, draft.id);
        if (ids) { stripCache.delete(draft.id); if (typeof onAttach === 'function') { try { onAttach(ids); } catch (e) {} } }
      }
      sh.close();
      goFn('/app/pact/' + draft.id, draft.id);
      return;
    }
    toast('That id is taken. Try again.'); reset();
  });
}
