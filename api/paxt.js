// GRATUS PAXT · the open record of an agreement.
//
// A PAXT is one plain-text document. People join it by each signing one line with a key made on their own
// device, and the line names the document by its hash, so a signature can only mean the text that was read.
// This file keeps the record: the document, every signed line, and the head of a hash chain over them. It holds
// no key and signs nothing. Anyone can take the record away and count it again.
//
//   GET  ?id=<id>                    { doc, digest, entries, head, count, closed }
//   POST { act: 'open', doc }        keeps a new garden PAXT
//   POST { act: 'sign', id, entry }  adds one signed line: entry = { address, line, sig, name }
//
// Storage, in Vercel Blob, at paths made from the id with a secret, so the store cannot be walked from an id:
//   <base>.json                 the document, written once
//   <base>/e/<sha256>.json      one blob per signed line, named by the hash of its key's address and its line,
//                               written once and never overwritten
// Blob writes are last-writer-wins and a read can be a few seconds stale, so a record kept as one document lost
// a line whenever two people signed in the same moment. A line in its own blob cannot be written over by anyone
// else's line. The record is put together when it is read: the lines in the order the server stamped them (then
// by their hash, so every reader gets the same order), with the chain taken over that order. A line resent is
// the same blob, because the blob is named by the address and the line, not the signature. That matters for
// P-256: it signs the same line differently each time, and the first signature kept is the one that stays.
//
// What the store cannot show is a line blob deleted by someone holding the store token: nothing here remembers
// how many there were. Every device that reads the record remembers the lines it has seen and says so when one
// goes missing (assets/js/pact.js).
//
// Every cap is held by reservations: numbered places, each written once, taken before a line is kept. The store
// refuses a second write to a place, so two requests can never take the same one. Reading a count and writing it
// afterwards would let requests sent at the same moment all pass the check before any of them writes.
//   <base>/n/<i>                  a line's place in the record, 0 to 499
//   <base>/k/<keyed key>/<i>      a key's place among its own lines, 0 to 5
//   <callers>/<keyed network>/slot-<i>   a new key's place among those one connection added, 0 to 11
//   _calls/<day>/<keyed act, day and caller>/<i>   one call in a caller's day. The keyed name is new every day,
//                               and every earlier day is deleted with the first call of a new day (sweepCalls)
// The connection places sit at their own keyed path, never part of what a reader is sent, and hold no network
// address and no key: only how many keys one connection added, so one person cannot fill a PAXT with keys made
// one after another. They are deleted the first time the record is read after it closes.
//
// Every one of these paths starts with gratus/paxt/ in production and gratus/preview/paxt/ everywhere else, so a
// preview neither reads nor writes a live PAXT.
import { put, list, del, head } from '@vercel/blob';
import { sweepDays } from './_sweep.js';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import {
  canon, digestOf, parseGarden, parseLine, lineProblem, count,
  entryProblem, verifyEntry, chainOf, MAX_DOC_BYTES,
} from '../engine/paxt.js';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const sha = (s) => createHash('sha256').update(String(s)).digest('hex');

// the same secret the vibes use, derived the same way, so one GRATUS_SALT keeps every path and counter private
const SALT = process.env.GRATUS_SALT || sha('gratus/vibes/' + String(TOKEN)).slice(0, 32);
const hm = (s) => createHmac('sha256', SALT).update(String(s)).digest('hex');

/** The network a caller speaks from. An IPv4 address is itself. An IPv6 address is its /64, because one home or
    one phone is handed a whole /64 and can take a new address inside it whenever it likes. */
export function netOf(raw) {
  let s = String(raw || '').trim().toLowerCase();
  const v4port = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(s);
  if (v4port) return v4port[1];
  s = s.replace(/^\[([^\]]*)\](?::\d+)?$/, '$1');
  const zone = s.indexOf('%');
  if (zone >= 0) s = s.slice(0, zone);
  if (!s.includes(':')) return s;
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(s);
  if (mapped) return mapped[1];
  const halves = s.split('::');
  if (halves.length > 2) return s;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const fill = halves.length === 2 ? 8 - left.length - right.length : 0;
  if (fill < 0) return s;
  const groups = [...left, ...Array(fill).fill('0'), ...right];
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return s;
  return groups.slice(0, 4).map((g) => parseInt(g, 16).toString(16)).join(':') + '::/64';
}
const callerOf = (req) => netOf(String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '').split(',')[0]);
const whoOf = (req) => sha(callerOf(req) + '·' + SALT).slice(0, 16);

// gratus/ in production and gratus/preview/ everywhere else, read at every call and never at load, so a walk
// through a preview writes no PAXT, line, place or call marker into the live records
const base = () => (process.env.VERCEL_ENV === 'production' ? 'gratus/' : 'gratus/preview/');
// never the id itself: an id travels in links, and the store's address must not lead from one to a record
const KEY = (id) => base() + 'paxt/' + createHmac('sha256', SALT).update('paxt·' + id).digest('hex').slice(0, 32) + '.json';
/** Where a PAXT's record is kept in this environment. api/vibes.js asks it before linking a PAXT to a room, so
    the two files always name the same path. */
export const paxtKey = (id) => KEY(id);
const ENTRIES = (id) => KEY(id).slice(0, -'.json'.length) + '/e/';
const entryPath = (id, e) => ENTRIES(id) + sha(e.address + '\n' + e.line) + '.json';
// the reservations, beside the lines and never under /e/, so a reader never takes one for a line
const LINE_SLOTS = (id) => KEY(id).slice(0, -'.json'.length) + '/n/';
const KEY_SLOTS = (id, address) => KEY(id).slice(0, -'.json'.length) + '/k/' + hm('key·' + id + '·' + address).slice(0, 32) + '/';
// The new keys each connection added to this record. Its own keyed path, never part of what a reader is sent,
// and the names inside are keyed with the record's id too, so the same connection reads as a stranger from one
// PAXT to the next. Inside, only numbered places: nothing that names a key.
const CALLERS = (id) => base() + 'paxt/' + hm('paxt-callers·' + id).slice(0, 32) + '/';
const callerDir = (id, req) => CALLERS(id) + hm('caller·' + id + '·' + callerOf(req)).slice(0, 32) + '/slot-';
const today = () => new Date(Date.now()).toISOString().slice(0, 10);
const CALLS_ROOT = () => base() + 'paxt/_calls/';
// keyed with the day and the act, so one network's markers carry a new name every day and for each act
const CALLS = (act, req) => { const d = today(); return CALLS_ROOT() + d + '/' + hm('paxt-calls·' + act + '·' + d + '·' + whoOf(req)).slice(0, 32) + '/'; };

const ID = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
const CAP_OPEN = 5;          // PAXTs one caller may open in a day
const CAP_SIGN = 60;         // lines one caller may send in a day
const CAP_ENTRIES = 500;     // lines one record holds
const CAP_PER_KEY = 6;       // lines one key may add to one record (a change of mind is a new revision)
// New keys one connection may add to one record. A family on one home network must never be turned away, and
// twelve is the largest group this is built for. Any key can join through the link, so a count of keys is not a
// count of people; this cap only keeps one connection from adding keys without end.
const CAP_KEYS_PER_CALLER = 12;
const THRESHOLD_MIN = 2;
const OPENS_AHEAD = 5 * 60000;   // how far past the server's clock an opening time may be
// Groups here are two to twelve people. The ceiling leaves room under CAP_ENTRIES for every key to change its
// mind more than once, so a threshold the record could never reach cannot be written. pact.js uses the same.
const THRESHOLD_MAX = 100;

/** the limits the room and the gate check themselves against */
export const LIMITS = Object.freeze({ THRESHOLD_MIN, THRESHOLD_MAX, CAP_ENTRIES, CAP_PER_KEY, CAP_KEYS_PER_CALLER });

const day = (ms) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

async function readJson(key) {
  const { blobs } = await list({ prefix: key, token: TOKEN });
  const b = blobs.find((x) => x.pathname === key);
  if (!b) return null;
  const r = await fetch(b.url + '?t=' + Date.now(), { cache: 'no-store' });
  if (!r.ok) throw new Error('the record could not be read');
  return await r.json();
}
// Written once. A second write to the same path is refused by the store, which is how a resent line, or the
// same line sent twice in one moment, stays one line. Returns false when the blob was already there.
async function writeOnce(key, body) {
  try {
    await put(key, body, { access: 'public', token: TOKEN, contentType: 'application/json', addRandomSuffix: false, allowOverwrite: false });
    return true;
  } catch (e) {
    if (/exist/i.test(String(e && e.message))) return false;
    throw e;
  }
}

// every blob under a prefix, across pages
async function listAll(prefix) {
  const out = [];
  let cursor;
  for (let page = 0; page < 20; page++) {
    const r = await list({ prefix, token: TOKEN, cursor, limit: 1000 });
    out.push(...r.blobs);
    if (!r.hasMore || !r.cursor) break;
    cursor = r.cursor;
  }
  return out;
}

// Take a free place in dir, trying dir+from up to dir+(to-1), then (when wrap is set) dir+0 up to dir+(from-1).
// Each place is one blob written once, and the store refuses a second write to it, so two requests can never
// hold the same place. Returns the path taken, or null when every place is taken. `from` is how many this
// request believes are taken; a stale belief only costs a refused write or two. wrap finds a place given back
// by release(); it is used only where the places are few.
async function claim(dir, from, to, wrap = false) {
  const start = Math.min(Math.max(0, from), to);
  const order = [];
  for (let n = start; n < to; n++) order.push(n);
  if (wrap) for (let n = 0; n < start; n++) order.push(n);
  for (const n of order) if (await writeOnce(dir + n, '1')) return dir + n;
  return null;
}
// give places back, when the line they were taken for was not kept
async function release(paths) {
  const ps = paths.filter(Boolean);
  if (ps.length) { try { await del(ps, { token: TOKEN }); } catch (e) {} }
}

// A day's calls from each caller, one place written once per call, under a salted hash of the caller. Every
// attempt counts, the refused ones too, so the limit also stands in front of anyone trying keys or ids one after
// another. Each caller has places of their own, so callers never write over each other's count.
//
// When the store cannot be read or written, the call is let through on purpose. A store that stumbles for a
// moment must not stop a person from joining or leaving, and this counter is only the outer limit: every line is
// still held to its signature, its text and its close, every record still keeps its own caps (CAP_ENTRIES,
// CAP_PER_KEY, CAP_KEYS_PER_CALLER), and a record that cannot be read takes no line at all.
async function allowed(req, act, cap) {
  await sweepCalls();
  const dir = CALLS(act, req);
  try {
    const { blobs } = await list({ prefix: dir, token: TOKEN, limit: 1000 });
    return !!(await claim(dir, blobs.length, cap));
  } catch (e) {
    return true;
  }
}

// A marker is needed only on its own day, and one kept longer would let someone holding the store match one
// network's markers across days. So the first calls a warm function takes on a new day delete every earlier day's
// markers (api/_sweep.js), a few pages a call, without listing today's.
const sweepCalls = () => sweepDays(CALLS_ROOT(), today(), TOKEN);

// A warm function shows a record it checked a moment ago again, instead of reading the store for every request,
// so a page refreshed in a loop costs the store one read every few seconds and not one per request. A sign or an
// open on this instance drops the record from it. GRATUS_PAXT_READ_CACHE_MS sets how long (0 turns it off); it
// stays under the 3 seconds the room waits before it asks again about a missing line.
const READS = new Map();
const readMs = () => { const v = Number(process.env.GRATUS_PAXT_READ_CACHE_MS); return Number.isFinite(v) && v >= 0 ? v : 2500; };
async function readCached(id) {
  const ms = readMs();
  const hit = READS.get(base() + id);
  const age = hit ? Date.now() - hit.at : -1;
  if (ms && hit && age >= 0 && age < ms) return hit.v;
  const v = await verified(id);
  if (ms) { if (READS.size >= 2000) READS.clear(); READS.set(base() + id, { at: Date.now(), v }); }
  return v;
}

// Once a PAXT has closed, no key joins it again, so the connection places have done their work and are deleted.
const SWEPT = new Set();
async function sweepCallers(id) {
  if (SWEPT.has(base() + id)) return;
  try {
    const blobs = await listAll(CALLERS(id));
    if (blobs.length) await del(blobs.map((b) => b.url), { token: TOKEN });
    if (SWEPT.size >= 20000) SWEPT.clear();
    SWEPT.add(base() + id);
  } catch (e) {}
}

// The seals bind what is stored, names and times included, under the secret. Anyone who edits the store can
// rebuild a chain; nobody can rebuild a seal without GRATUS_SALT.
const docSeal = (id, digest, opened) => hm(JSON.stringify(['paxt-doc', id, digest, opened]));
const entrySeal = (id, digest, e) => hm(JSON.stringify(['paxt-entry', id, digest, e.address, e.line, e.sig, e.name, e.at]));
function sameHex(a, b) {
  const x = Buffer.from(String(a || ''), 'utf8'), y = Buffer.from(String(b || ''), 'utf8');
  return x.length === y.length && timingSafeEqual(x, y);
}

// A signature that held once holds for ever, so a warm function remembers the exact triples it has checked
// and a record read twice is not verified twice. The key is the whole triple: any change to it is a new check.
const HELD = new Map();
async function holds(e) {
  const k = e.address + ' ' + e.sig + ' ' + e.line;
  if (HELD.has(k)) return true;
  const ok = await verifyEntry(e);
  if (ok) { if (HELD.size >= 20000) HELD.clear(); HELD.set(k, true); }
  return ok;
}

// A line blob is written once, so a warm function keeps each one it has read, under its path, its upload time and
// its size. A blob written over in the store has a new upload time and is read again. Only the blob as read is
// kept: every check in verified() still runs on it at every read.
const LINES = new Map();
// a blob that does not answer is asked once more before the whole read is given up
async function fetchLine(url) {
  for (let i = 0; i < 2; i++) {
    const r = await fetch(url, { cache: 'no-store' });
    if (r.ok) return await r.json();
  }
  throw new Error('a line could not be read');
}
// read the line blobs, a few at a time, so a full record does not open five hundred requests at once
async function readEntries(id) {
  const blobs = await listAll(ENTRIES(id));
  const out = new Array(blobs.length);
  let next = 0;
  const worker = async () => {
    while (next < blobs.length) {
      const i = next++;
      const b = blobs[i];
      const k = b.pathname + ' ' + String(b.uploadedAt || '') + ' ' + String(b.size ?? '');
      let e = LINES.get(k);
      if (e === undefined) {
        e = await fetchLine(b.url);
        if (LINES.size >= 20000) LINES.clear();
        LINES.set(k, e);
      }
      out[i] = { path: b.pathname, e: e && typeof e === 'object' ? Object.assign({}, e) : e };
    }
  };
  await Promise.all(Array.from({ length: Math.min(16, blobs.length) }, worker));
  return out;
}

// the one order every reader gets: the server's time, then the line's own hash
const byArrival = (a, b) => (a.e.at < b.e.at ? -1 : a.e.at > b.e.at ? 1 : a.path < b.path ? -1 : a.path > b.path ? 1 : 0);

// Every record is checked again each time it is read, before anything is counted from it. A record with any part
// changed outside this file is refused whole: a count taken from part of it would look like the truth.
// Returns null when there is no record, false when it does not hold, and the checked record when it does.
async function verified(id) {
  const rec = await readJson(KEY(id));
  if (!rec) return null;
  if (typeof rec.doc !== 'string' || typeof rec.opened !== 'string') return false;
  if (canon(rec.doc) !== rec.doc) return false;
  const pr = parseGarden(rec.doc);
  if (!pr.ok || pr.terms.id !== id) return false;
  const d = await digestOf(rec.doc);
  if (d.full !== rec.digest) return false;
  if (!sameHex(docSeal(id, d.full, rec.opened), rec.seal)) return false;
  const rows = await readEntries(id);
  for (const { path, e } of rows) {
    if (!e || typeof e !== 'object' || entryProblem(e)) return false;
    if (typeof e.at !== 'string' || typeof e.name !== 'string') return false;
    if (lineProblem(pr.terms, d.short, parseLine(e.line))) return false;
    // a blob moved to another name would be a line in a place it was never written
    if (path !== entryPath(id, e)) return false;
    if (!sameHex(entrySeal(id, d.full, e), e.seal)) return false;
  }
  const entries = rows.map(({ path, e }) => ({ path, e: { address: e.address, line: e.line, sig: e.sig, name: e.name, at: e.at } }))
    .sort(byArrival).map((r) => r.e);
  for (const e of entries) if (!(await holds(e))) return false;
  const { head } = await chainOf(d.full, entries);
  return { doc: rec.doc, terms: pr.terms, digest: d, entries, head };
}

// One line blob read from its own path. head() asks the store for that one blob, so it does not wait out the
// list's lag. Every check verified() makes of a line is made here too. Returns the line, or null when it is not
// there or does not hold.
async function readLine(id, v, path) {
  try {
    const h = await head(path, { token: TOKEN });
    if (!h || !h.url) return null;
    const r = await fetch(h.url + '?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return null;
    const e = await r.json();
    if (!e || typeof e !== 'object' || entryProblem(e) || typeof e.at !== 'string' || typeof e.name !== 'string') return null;
    if (lineProblem(v.terms, v.digest.short, parseLine(e.line)) || path !== entryPath(id, e)) return null;
    if (!sameHex(entrySeal(id, v.digest.full, e), e.seal) || !(await holds(e))) return null;
    return { address: e.address, line: e.line, sig: e.sig, name: e.name, at: e.at };
  } catch (x) {
    return null;
  }
}

// what a reader gets: the record as kept, and the count PAXT 1 takes from it
async function view(v) {
  // every signature was checked in verified(), so the count is taken without checking them a second time
  const c = await count({ terms: v.terms, digestShort: v.digest.short, ballots: v.entries });
  return { doc: v.doc, digest: v.digest.full, entries: v.entries, head: v.head, count: c, closed: Date.now() >= v.terms.closes };
}

const BROKEN = 'This record has been changed outside Gratus, so nothing is counted from it.';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!TOKEN) { res.status(503).json({ error: 'PAXTs are not connected yet.' }); return; }
  try {
    if (req.method === 'GET') {
      const id = String((req.query && req.query.id) || '');
      if (!ID.test(id)) { res.status(400).json({ error: 'that is not a PAXT id' }); return; }
      const v = await readCached(id);
      if (v === null) { res.status(404).json({ error: 'there is no PAXT with that id' }); return; }
      if (!v) { res.status(409).json({ error: BROKEN }); return; }
      if (Date.now() >= v.terms.closes) await sweepCallers(id);
      res.status(200).json(await view(v));
      return;
    }
    if (req.method !== 'POST') { res.status(405).json({ error: 'GET or POST' }); return; }
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body || '{}'); } catch (e) { body = null; } }
    if (!body || typeof body !== 'object') { res.status(400).json({ error: 'send JSON with an act' }); return; }
    const act = String(body.act || '');

    if (act === 'open') {
      if (typeof body.doc !== 'string' || !body.doc.trim()) { res.status(400).json({ error: 'a document to open' }); return; }
      // a cheap look at the size before anything reads it closely
      if (body.doc.length > MAX_DOC_BYTES * 2) { res.status(413).json({ error: 'the document is longer than ' + MAX_DOC_BYTES + ' bytes' }); return; }
      const doc = canon(body.doc);
      const pr = parseGarden(doc);
      if (!pr.ok) { res.status(400).json({ error: 'the document does not read as a garden PAXT', problems: pr.errors.slice(0, 5) }); return; }
      const t = pr.terms;
      if (!(t.threshold >= THRESHOLD_MIN && t.threshold <= THRESHOLD_MAX)) { res.status(400).json({ error: 'threshold must be from ' + THRESHOLD_MIN + ' to ' + THRESHOLD_MAX }); return; }
      if (t.closes <= Date.now()) { res.status(400).json({ error: 'the closing time has already passed' }); return; }
      // The sheet stamps the opening time from the device's clock. A clock running fast would open a PAXT nobody can
      // join until real time caught up, so an opening time more than a few minutes after now is refused.
      if (t.opens > Date.now() + OPENS_AHEAD) { res.status(400).json({ error: 'The opening time is later than the time now. Check the clock on this device and try again.' }); return; }
      if (!(await allowed(req, 'open', CAP_OPEN))) { res.status(429).json({ error: 'Five PAXTs have been opened from this connection today, the most for one day. The ones already opened are still there.' }); return; }
      const key = KEY(t.id);
      if (await readJson(key)) { res.status(409).json({ error: 'that id is taken. Choose another.' }); return; }
      const d = await digestOf(doc);
      const opened = new Date(Date.now()).toISOString();
      const rec = { v: 2, doc, digest: d.full, opened, seal: docSeal(t.id, d.full, opened) };
      if (!(await writeOnce(key, JSON.stringify(rec)))) { res.status(409).json({ error: 'that id is taken. Choose another.' }); return; }
      READS.delete(base() + t.id);
      res.status(200).json(await view({ doc, terms: t, digest: d, entries: [], head: d.full }));
      return;
    }

    if (act === 'sign') {
      const id = String(body.id || '');
      if (!ID.test(id)) { res.status(400).json({ error: 'that is not a PAXT id' }); return; }
      const shape = entryProblem(body.entry);
      if (shape) { res.status(400).json({ error: shape }); return; }
      if (!(await allowed(req, 'sign', CAP_SIGN))) { res.status(429).json({ error: CAP_SIGN + ' lines have been signed from this connection today, the most for one day. You can sign again tomorrow.' }); return; }
      const e = body.entry;
      const v = await verified(id);
      if (v === null) { res.status(404).json({ error: 'there is no PAXT with that id' }); return; }
      if (!v) { res.status(409).json({ error: BROKEN }); return; }
      const parsed = parseLine(e.line);
      const problem = lineProblem(v.terms, v.digest.short, parsed);
      if (problem) { res.status(400).json({ error: problem }); return; }
      const now = Date.now();
      if (now < v.terms.opens) { res.status(409).json({ error: 'This opens on ' + day(v.terms.opens) + '.' }); return; }
      if (now >= v.terms.closes) { await sweepCallers(id); res.status(409).json({ error: 'This closed on ' + day(v.terms.closes) + '.' }); return; }
      if (!(await holds(e))) { res.status(400).json({ error: 'The signature does not match this key and this line.' }); return; }
      const mine = v.entries.filter((x) => x.address === e.address);
      // the same line from the same key is already here: sending it again changes nothing
      if (mine.some((x) => x.line === e.line)) { res.status(200).json(Object.assign(await view(v), { already: true })); return; }
      const PER_KEY = 'This key has signed ' + CAP_PER_KEY + ' lines here, the most one key can. The record keeps its latest.';
      const FULL = 'This record is full. It holds ' + CAP_ENTRIES + ' lines.';
      const MANY = CAP_KEYS_PER_CALLER + ' keys have already joined this PAXT from this connection, the most one connection can add. Another key can still join from another connection, such as mobile data.';
      // the record as read is enough to refuse at once; the reservations below are what holds the caps
      if (mine.length >= CAP_PER_KEY) { res.status(409).json({ error: PER_KEY }); return; }
      if (v.entries.length >= CAP_ENTRIES) { res.status(409).json({ error: FULL }); return; }
      READS.delete(base() + id);
      // A key new to this record takes one of the places its connection has here. A key already in the record
      // can always change its line, within its own six.
      const fresh = mine.length === 0;
      const taken = [];
      const give = async (code, error) => { await release(taken); res.status(code).json({ error }); };
      const keySlot = await claim(KEY_SLOTS(id, e.address), mine.length, CAP_PER_KEY, true);
      if (!keySlot) { await give(409, PER_KEY); return; }
      taken.push(keySlot);
      if (fresh) {
        const dir = callerDir(id, req);
        let held = 0;
        try { held = (await listAll(dir)).length; } catch (x) { held = 0; }
        const callerSlot = await claim(dir, held, CAP_KEYS_PER_CALLER, true);
        if (!callerSlot) { await give(409, MANY); return; }
        taken.push(callerSlot);
      }
      // a line's place is not given back: a record with a place or two empty holds a line or two fewer, which is
      // far better than a record holding more than its cap
      const lineSlot = await claim(LINE_SLOTS(id), v.entries.length, CAP_ENTRIES);
      if (!lineSlot) { await give(409, FULL); return; }
      const entry = { address: e.address, line: e.line, sig: e.sig, name: typeof e.name === 'string' ? e.name.trim() : '', at: new Date(now).toISOString() };
      entry.seal = entrySeal(id, v.digest.full, entry);
      let wrote;
      try { wrote = await writeOnce(entryPath(id, entry), JSON.stringify(entry)); } catch (x) { await release(taken); throw x; }
      // the same line arrived from another request in the same moment and is kept once: its places go back
      if (!wrote) await release(taken);
      READS.delete(base() + id);
      // Read the record again, so the answer holds every line that arrived meanwhile from anyone else. If the
      // store has not caught up with this line yet, it is added to the answer as it was written.
      const after = await verified(id);
      if (!after) { res.status(409).json({ error: BROKEN }); return; }
      // A line that was already there (wrote is false) is read from its own blob, which skips the list's lag, so a
      // line resent a moment after it was kept is never answered with a record that lacks it.
      const here = (x) => x.address === entry.address && x.line === entry.line;
      let kept = null;
      if (!after.entries.some(here)) {
        kept = wrote ? { address: entry.address, line: entry.line, sig: entry.sig, name: entry.name, at: entry.at } : await readLine(id, after, entryPath(id, entry));
      }
      if (kept) {
        after.entries = [...after.entries, kept].map((x) => ({ path: entryPath(id, x), e: x })).sort(byArrival).map((r) => r.e);
        after.head = (await chainOf(after.digest.full, after.entries)).head;
      }
      res.status(200).json(Object.assign(await view(after), wrote ? {} : { already: true }));
      return;
    }

    res.status(400).json({ error: 'open or sign' });
  } catch (e) {
    // the error stays here: its message could carry a path made with the secret
    res.status(500).json({ error: 'the record could not be reached. Nothing was recorded.' });
  }
}
