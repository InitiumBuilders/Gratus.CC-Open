// GRATUS SIGNAL · a quick read of a room. It binds no one.
//
// Anyone holding a Vibe room's code can ask one question with two to four choices, and it closes after 1, 3 or
// 7 days. A device answers once per signal and can change its answer until the close. It answers with a token
// its browser computes, HMAC-SHA256(a secret kept on the device, the signal id), so each signal sees a
// different token from the same device, and no token or tap blob ties one signal's answer to another's.
// A read sends several of a device's tokens at once. They are used for that read and never kept, and nothing
// here may log a read or tap body.
// What the store does hold for a day is each connection's call markers (_calls below), under one keyed name per
// connection, act and day, written in the same moment as each tap. Matched by time, they tell someone holding the
// store which taps that day came from one network, and someone also holding GRATUS_SALT can work out the network.
// The privacy page says so. The first calls of a new day delete every earlier day's markers (sweepCalls).
//
//   GET  ?code=                                         { signals, note }  open, and closed in the last 7 days, no counts
//   POST { act: 'open', code, q, choices, days }        { signal }
//   POST { act: 'tap', code, sid, token, c }            { signal, note }   the device's own choice, and no count
//   POST { act: 'read', code, tokens: { sid: token } }  { signals, note }  counts only for a closed signal
//
// While a signal is open, no answer carries a number about it: not the count for each choice and not how many
// devices answered, for anyone, the person who asked included. A tap gets back the device's own choice and the
// line that says counts show when the signal closes. A read gets back the caller's own choice for each token it
// sent. Once the signal has closed, every read carries the counts and how many devices answered, with a token or
// without one. Counts seen while a signal is open would let two people each work out the other's choice, and let
// anyone who looks before and after one answer tell what it was. In a small group the final counts can still
// show how someone chose, and the room line and the privacy page say so.
//
// Storage, in Vercel Blob, at paths made with the secret, so neither a room code nor a signal id leads to them:
//   <base>signal/<room>/s/<closes>-<name>.json   the signal, written once: { id, q, choices, opens, closes }
//   <base>signal/<taps>/<name>.json              one blob per token, { c }, rewritten only by that token
//   <base>signal/_slots/<room>/<i>-<gen>.json    the room's three places for open signals, each written once
//   <base>signal/_seats/<taps>/<k>.json          a signal's 500 to 749 seats, one taken at a device's first tap
//   <base>signal/_calls/<day>/<caller>/<n>.json  a connection's numbered calls of the day, each written once, and
//                                                deleted once the day has passed
//   <base>signal/_tally/<name>.json              a closed signal's totals, written once
// One blob per token means two devices answering in the same moment never write over each other. The closing
// time sits in the signal's name, so a room's old signals are passed over without being read.
//
// Every limit stands on the store's write-once create, the one step the store makes atomic: a call takes the
// first free name among N and is refused when it can create none. A list taken before a write is never the test,
// since calls sent together, or within the store's few seconds of list lag, would all pass it.
//
// <base> is gratus/ in production and gratus/preview/ everywhere else, so a walk through a preview leaves
// nothing in the live records.
import { put, list, del } from '@vercel/blob';
import { sweepDays } from './_sweep.js';
import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto';
import { asDrawn, HIDDEN } from '../engine/text.js';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const sha = (s) => createHash('sha256').update(String(s)).digest('hex');
// the same secret the vibes and the PAXTs use, derived the same way
const SALT = process.env.GRATUS_SALT || sha('gratus/vibes/' + String(TOKEN)).slice(0, 32);
const hm = (s) => createHmac('sha256', SALT).update(String(s)).digest('hex').slice(0, 32);

const DAY = 86400000;
const DAYS = [1, 3, 7];
const CAP_Q = 120;            // characters in a question
const CAP_CHOICE = 40;        // characters in a choice
const CAP_OPEN_ROOM = 3;      // signals open in one room at a time
const CAP_OPEN_CALLER = 5;    // signals one connection opens in a day
const CAP_TAP_CALLER = 200;   // taps one connection sends in a day
const CAP_READ_CALLER = 600;  // reads and room lists one connection asks for in a day
const CAP_TAPS = 500;         // devices one signal holds at the least
const CAP_TAPS_SPREAD = 250;  // and the most it can hold on top of that, so a signal holds 500 to 749 (capOf)
const KEEP_CLOSED = 7 * DAY;  // how long a closed signal stays in the room's list
const CAP_LISTED = 40;        // the most signals one answer carries
const CAP_READ = 50;          // the most tokens one read takes
const SETTLE = 60000;         // a closed signal's totals are kept once the store has had this long to settle

/** the limits the gate checks itself against */
export const LIMITS = Object.freeze({ CAP_Q, CAP_CHOICE, CAP_OPEN_ROOM, CAP_OPEN_CALLER, CAP_TAP_CALLER, CAP_READ_CALLER, CAP_TAPS, CAP_TAPS_SPREAD, DAYS });

/** the lines the room shows */
export const WORDS = Object.freeze({
  room: 'A signal binds no one, and the app shows nobody who chose what. In a small group, the counts alone can sometimes show how someone chose.',
  held: 'Counts show when the signal closes.',
});

// read at every call, never at load, so a preview can never fall back to the live paths
const base = () => (process.env.VERCEL_ENV === 'production' ? 'gratus/' : 'gratus/preview/');
const ROOM = (code) => 'gratus/vibes/' + code + '.json';   // the room itself, where api/vibes.js keeps it
const SIGNALS = (code) => base() + 'signal/' + hm('signal-room·' + code) + '/s/';
const signalName = (code, sid) => hm('signal·' + code + '·' + sid);
const signalPath = (code, sid, closes) => SIGNALS(code) + closes + '-' + signalName(code, sid) + '.json';
const TAPS = (code, sid) => base() + 'signal/' + hm('signal-taps·' + code + '·' + sid) + '/';
const tapPath = (code, sid, token) => TAPS(code, sid) + hm('signal-tap·' + code + '·' + sid + '·' + token) + '.json';
const SLOTS = (code) => base() + 'signal/_slots/' + hm('signal-slots·' + code) + '/';
const SEATS = (code, sid) => base() + 'signal/_seats/' + hm('signal-seats·' + code + '·' + sid) + '/';
const TALLY = (code, sid) => base() + 'signal/_tally/' + hm('signal-tally·' + code + '·' + sid) + '.json';
// How many devices one signal holds. Were it the same for every signal, someone could fill an open signal with
// answers of their own, then subtract the seats they got from the limit to find how many had answered before
// them. So each signal has its own limit, 500 to 749, worked out from the secret, and the refusal names no
// number. The probe then learns at most a range 250 wide.
const capOf = (code, sid) => CAP_TAPS + parseInt(hm('signal-cap·' + code + '·' + sid).slice(0, 8), 16) % CAP_TAPS_SPREAD;
const today = () => new Date(Date.now()).toISOString().slice(0, 10);
const CALLS_ROOT = () => base() + 'signal/_calls/';
const CALLS = (req, act) => { const d = today(); return CALLS_ROOT() + d + '/' + hm('signal-calls·' + act + '·' + d + '·' + whoOf(req)) + '/'; };

const clip = (v, n) => (typeof v === 'string' ? v : '').replace(/[<>]/g, '').trim().slice(0, n);
const codeOf = (v) => clip(v, 12).toUpperCase().replace(/[^A-Z0-9]/g, '');
const SID = /^[A-Za-z0-9_-]{16}$/;
const newSid = () => randomBytes(12).toString('base64url');

/** A tap token is 32 bytes in unpadded base64url, 43 characters, in the one spelling that decodes back to it. */
export function tokenOk(t) {
  if (typeof t !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(t)) return false;
  const b = Buffer.from(t, 'base64url');
  return b.length === 32 && b.toString('base64url') === t;
}

// The text rule for a question and its choices. Refused: < and >, every control character (C0, DEL and C1,
// U+0080 to U+009F), every format character (among them the soft hyphen, the Arabic letter mark, U+180E, the
// zero-width marks, bidi embeddings, overrides and isolates, the word joiner and U+2061 to U+2064, and the byte
// order mark), the line and paragraph separators, and every character the name rule refuses as hidden
// (engine/text.js HIDDEN: variation selectors away from an emoji, U+034F, U+180B to U+180F, tag characters,
// the Hangul fillers). Without that last list, "Yes" and "Yes" with a variation selector after it would be two
// choices that look the same.
// The check runs on the text as drawn (engine/text.js, the same helper the name rule uses), so the joiner inside
// a family or a cook and the tags of a subdivision flag are kept, and the same characters anywhere else are not.
// assets/js/signal.js asks the same of the sheet before it sends.
const UNSAFE = /[<>\p{Cc}\p{Cf}\u2028\u2029]/u;
/** the trimmed text, or { error } when it breaks the rule */
export function textOf(v, max, what) {
  if (typeof v !== 'string') return { error: what + ' is missing.' };
  const t = v.trim();
  if (!t) return { error: what + ' is empty.' };
  const drawn = asDrawn(t);
  if (UNSAFE.test(drawn) || HIDDEN.test(drawn)) return { error: what + ' has a character that cannot be kept: < or >, or a hidden control or direction mark.' };
  if ([...t].length > max) return { error: what + ' is longer than ' + max + ' characters.' };
  return { text: t };
}
// two choices that read the same: compared after NFKC, in lower case, with runs of space made one
const sameAs = (t) => t.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ');

/** The network a caller speaks from: an IPv4 address is itself, an IPv6 address is its /64. The same rule as
    api/paxt.js, kept here so this file does not load the PAXT engine. */
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
// a salted hash of the caller, never the caller, and only ever used for the day's limits
const whoOf = (req) => sha(netOf(String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '').split(',')[0]) + '·' + SALT).slice(0, 16);

async function readJson(key) {
  const { blobs } = await list({ prefix: key, token: TOKEN });
  const b = blobs.find((x) => x.pathname === key);
  if (!b) return null;
  const r = await fetch(b.url + '?t=' + Date.now(), { cache: 'no-store' });
  if (!r.ok) throw new Error('a blob could not be read');
  return await r.json();
}
const writeJson = (key, doc, once) => put(key, JSON.stringify(doc), {
  access: 'public', token: TOKEN, contentType: 'application/json',
  addRandomSuffix: false, allowOverwrite: !once, cacheControlMaxAge: 0,
});
// Written once: true when this call made the blob, false when it was already there.
async function claim(key, body = '{}') {
  try {
    await put(key, body, { access: 'public', token: TOKEN, contentType: 'application/json', addRandomSuffix: false, allowOverwrite: false });
    return true;
  } catch (e) {
    if (/exist/i.test(String(e && e.message))) return false;
    throw e;
  }
}
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
// fetch blobs a few at a time, so a full signal does not open five hundred requests at once
async function fetchAll(blobs) {
  const out = new Array(blobs.length);
  let next = 0;
  const worker = async () => {
    while (next < blobs.length) {
      const i = next++;
      const r = await fetch(blobs[i].url, { cache: 'no-store' });
      out[i] = r.ok ? await r.json() : null;
    }
  };
  await Promise.all(Array.from({ length: Math.min(16, blobs.length) }, worker));
  return out;
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Takes one of `cap` numbered names under `dir`, written once. A few names picked at random come first, so a
// quiet day costs one write. After that the list says which names look free, and each is tried in turn, so a
// list that lags only costs extra tries. The call is refused only when no name can be created.
async function claimSlot(dir, cap) {
  const tried = new Set();
  for (let i = 0; i < 3; i++) {
    const n = randomInt(cap);
    if (tried.has(n)) continue;
    tried.add(n);
    if (await claim(dir + n + '.json')) return true;
  }
  const taken = new Set((await listAll(dir)).map((b) => b.pathname.slice(dir.length)));
  for (const n of shuffle([...Array(cap).keys()].filter((k) => !tried.has(k) && !taken.has(k + '.json')))) {
    if (await claim(dir + n + '.json')) return true;
  }
  return false;
}
// A connection's calls of one act today. A call counts once its own fields are well formed, whether or not it
// goes on to be kept.
const allowed = async (req, act, cap) => { await sweepCalls(); return claimSlot(CALLS(req, act), cap); };

// A day's markers are needed only on that day, and kept longer they would tie one network's taps together across
// days. The first calls a warm function takes on a new day delete every earlier day's markers (api/_sweep.js), a
// few pages a call, without listing today's.
const sweepCalls = () => sweepDays(CALLS_ROOT(), today(), TOKEN);

// A room has three places for open signals. Each place holds a run of markers <i>-<gen>, each written once with
// the closing time of the signal it holds. A new signal takes place i by writing marker gen + 1, and only when
// marker gen's signal has closed. Two openers that pick the same place write the same marker, so one fails and
// moves to the next place. A marker that cannot be read keeps its place taken. Returns the marker written, so a
// signal that then fails to be kept can give its place back, or null when every place is taken.
async function takePlace(code, now, closes) {
  const dir = SLOTS(code);
  const top = new Map();
  for (const b of await listAll(dir)) {
    const m = /^(\d)-(\d{1,9})\.json$/.exec(b.pathname.slice(dir.length));
    if (!m || Number(m[1]) >= CAP_OPEN_ROOM) continue;
    const i = Number(m[1]), gen = Number(m[2]);
    if (!top.has(i) || gen > top.get(i).gen) top.set(i, { gen, b });
  }
  for (const i of [...Array(CAP_OPEN_ROOM).keys()]) {
    const t = top.get(i);
    if (t) {
      const [held] = await fetchAll([t.b]);
      if (!held || !Number.isFinite(held.closes) || held.closes > now) continue;
    }
    const marker = dir + i + '-' + (t ? t.gen + 1 : 0) + '.json';
    if (await claim(marker, JSON.stringify({ closes }))) return marker;
  }
  return null;
}

// The room's signals, newest first: those still open, and those closed in the last week. A blob whose name does
// not match the signal inside it was moved in the store, and is passed over.
async function signalsOf(code) {
  const dir = SIGNALS(code);
  const now = Date.now();
  const rows = (await listAll(dir)).map((b) => {
    const m = /^(\d{1,15})-([0-9a-f]{32})\.json$/.exec(b.pathname.slice(dir.length));
    return m ? { b, closes: Number(m[1]), name: m[2] } : null;
  }).filter((x) => x && x.closes > now - KEEP_CLOSED)
    .sort((a, b) => b.closes - a.closes).slice(0, CAP_LISTED);
  const docs = await fetchAll(rows.map((x) => x.b));
  return docs.map((s, i) => (sane(s) && signalName(code, s.id) === rows[i].name && Date.parse(s.closes) === rows[i].closes ? s : null))
    .filter(Boolean).sort((a, b) => (a.opens < b.opens ? 1 : a.opens > b.opens ? -1 : 0));
}
const sane = (s) => !!s && typeof s === 'object' && SID.test(s.id) && typeof s.q === 'string' && Array.isArray(s.choices)
  && s.choices.length >= 2 && s.choices.length <= 4 && typeof s.opens === 'string' && typeof s.closes === 'string';

async function findSignal(code, sid) {
  const end = '-' + signalName(code, sid) + '.json';
  const b = (await listAll(SIGNALS(code))).find((x) => x.pathname.endsWith(end));
  if (!b) return null;
  const [s] = await fetchAll([b]);
  return sane(s) && s.id === sid && b.pathname === signalPath(code, sid, Date.parse(s.closes)) ? s : null;
}

const isClosed = (s) => Date.now() >= Date.parse(s.closes);
// what anyone holding the code sees: the question, the choices and when it closes, never a count
const pub = (s) => ({ id: s.id, q: s.q, choices: s.choices.slice(), opens: s.opens, closes: s.closes, closed: isClosed(s) });
const choiceOf = (t, s) => (t && Number.isInteger(t.c) && t.c >= 0 && t.c < s.choices.length ? t.c : null);

// A closed signal's counts, taken from every tap blob. Only tallyOf calls this, so it never runs while the
// signal is open.
async function countsOf(s, blobs) {
  const counts = s.choices.map(() => 0);
  let answered = 0;
  for (const t of await fetchAll(blobs)) {
    const c = choiceOf(t, s);
    if (c === null) continue;
    counts[c]++;
    answered++;
  }
  return { counts, answered };
}

// A closed signal's totals. They are counted from the taps until the store has settled after the close, then
// written once and read from that blob afterwards, so a closed signal is not recounted at every read.
async function tallyOf(code, s) {
  const key = TALLY(code, s.id);
  const kept = await readJson(key);
  if (kept && Array.isArray(kept.counts) && kept.counts.length === s.choices.length
    && kept.counts.every((x) => Number.isInteger(x) && x >= 0) && Number.isInteger(kept.answered)) {
    return { counts: kept.counts.slice(), answered: kept.answered };
  }
  const { counts, answered } = await countsOf(s, await listAll(TAPS(code, s.id)));
  if (Date.now() >= Date.parse(s.closes) + SETTLE) {
    try { await claim(key, JSON.stringify({ counts, answered })); } catch (e) {}
  }
  return { counts, answered };
}

const NONE = 'There is no Vibe room with that code.';
const READS = 'Signals have been read ' + CAP_READ_CALLER + ' times from this connection today, the most for one day. You can read them again tomorrow.';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!TOKEN) { res.status(503).json({ error: 'Signals are not connected yet.' }); return; }
  try {
    if (req.method === 'GET') {
      const code = codeOf(req.query && req.query.code);
      if (!code) { res.status(400).json({ error: 'A room code.' }); return; }
      if (!(await allowed(req, 'read', CAP_READ_CALLER))) { res.status(429).json({ error: READS }); return; }
      if (!(await readJson(ROOM(code)))) { res.status(404).json({ error: NONE }); return; }
      res.status(200).json({ signals: (await signalsOf(code)).map(pub), note: WORDS.room });
      return;
    }
    if (req.method !== 'POST') { res.status(405).json({ error: 'GET or POST' }); return; }
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body || '{}'); } catch (e) { body = null; } }
    if (!body || typeof body !== 'object') { res.status(400).json({ error: 'Send JSON with an act.' }); return; }
    const act = String(body.act || '');
    if (!['open', 'tap', 'read'].includes(act)) { res.status(400).json({ error: 'open, tap or read' }); return; }
    const code = codeOf(body.code);
    if (!code) { res.status(400).json({ error: 'A room code.' }); return; }
    if (!(await readJson(ROOM(code)))) { res.status(404).json({ error: NONE }); return; }

    if (act === 'open') {
      const q = textOf(body.q, CAP_Q, 'The question');
      if (q.error) { res.status(400).json({ error: q.error }); return; }
      if (!Array.isArray(body.choices) || body.choices.length < 2 || body.choices.length > 4) { res.status(400).json({ error: 'Give two to four choices.' }); return; }
      const choices = [];
      for (const v of body.choices) {
        const c = textOf(v, CAP_CHOICE, 'A choice');
        if (c.error) { res.status(400).json({ error: c.error }); return; }
        choices.push(c.text);
      }
      if (new Set(choices.map(sameAs)).size !== choices.length) { res.status(400).json({ error: 'Two choices are the same.' }); return; }
      const days = Number(body.days);
      if (!DAYS.includes(days)) { res.status(400).json({ error: 'A signal closes after 1, 3 or 7 days.' }); return; }
      if (!(await allowed(req, 'open', CAP_OPEN_CALLER))) {
        res.status(429).json({ error: 'Five signals have been asked from this connection today, the most for one day. You can ask again tomorrow.' });
        return;
      }
      const now = Date.now();
      const closes = now + days * DAY;
      const place = await takePlace(code, now, closes);
      if (!place) { res.status(409).json({ error: 'This room has ' + CAP_OPEN_ROOM + ' open signals. You can ask a new one when one of them closes.' }); return; }
      const s = { id: newSid(), q: q.text, choices, opens: new Date(now).toISOString(), closes: new Date(closes).toISOString() };
      try {
        await writeJson(signalPath(code, s.id, closes), s, true);
      } catch (e) {
        // the signal was not kept, so its place goes back; the marker under it says whether the place is free
        try { await del(place, { token: TOKEN }); } catch (x) {}
        throw e;
      }
      res.status(200).json({ signal: pub(s) });
      return;
    }

    if (act === 'tap') {
      const sid = typeof body.sid === 'string' ? body.sid : '';
      if (!SID.test(sid)) { res.status(400).json({ error: 'That is not a signal id.' }); return; }
      if (!tokenOk(body.token)) { res.status(400).json({ error: 'A tap token is 32 bytes in base64url, 43 characters.' }); return; }
      if (!Number.isInteger(body.c)) { res.status(400).json({ error: 'Choose one of the choices.' }); return; }
      if (!(await allowed(req, 'tap', CAP_TAP_CALLER))) {
        res.status(429).json({ error: CAP_TAP_CALLER + ' answers have been sent from this connection today, the most for one day. You can answer again tomorrow.' });
        return;
      }
      const s = await findSignal(code, sid);
      if (!s) { res.status(404).json({ error: 'There is no signal with that id in this room.' }); return; }
      if (body.c < 0 || body.c >= s.choices.length) { res.status(400).json({ error: 'Choose one of the choices.' }); return; }
      if (isClosed(s)) { res.status(409).json({ error: 'This signal has closed.' }); return; }
      const own = { path: tapPath(code, sid, body.token), c: body.c };
      const blobs = await listAll(TAPS(code, sid));
      // a device's first tap takes a seat; a device the list already shows keeps the one it has
      if (!blobs.some((b) => b.pathname === own.path) && !(await claimSlot(SEATS(code, sid), capOf(code, sid)))) {
        res.status(409).json({ error: 'This signal is full.' });
        return;
      }
      // the choice alone: no count reads a time, and a time kept here would be one more thing to match markers by
      await writeJson(own.path, { c: own.c });
      // the signal is open, so the answer carries this device's own choice and no count
      res.status(200).json({ signal: Object.assign(pub(s), { mine: own.c }), note: WORDS.held });
      return;
    }

    // read: the room's signals, each with the caller's own choice, and the counts once a signal has closed
    const tokens = body.tokens == null ? {} : body.tokens;
    if (typeof tokens !== 'object' || Array.isArray(tokens)) { res.status(400).json({ error: 'Send tokens as { signal id: token }.' }); return; }
    const pairs = Object.entries(tokens);
    if (pairs.length > CAP_READ) { res.status(400).json({ error: 'That is more than ' + CAP_READ + ' signals in one read.' }); return; }
    for (const [sid, t] of pairs) {
      if (!SID.test(sid) || !tokenOk(t)) { res.status(400).json({ error: 'A tap token is 32 bytes in base64url, 43 characters.' }); return; }
    }
    if (!(await allowed(req, 'read', CAP_READ_CALLER))) { res.status(429).json({ error: READS }); return; }
    const out = [];
    for (const s of await signalsOf(code)) {
      const row = pub(s);
      const t = Object.prototype.hasOwnProperty.call(tokens, s.id) ? tokens[s.id] : null;
      const ownPath = t ? tapPath(code, s.id, t) : null;
      if (row.closed) {
        Object.assign(row, await tallyOf(code, s));
        const c = ownPath ? choiceOf(await readJson(ownPath), s) : null;
        if (c !== null) row.mine = c;
      } else if (ownPath) {
        // open: only the caller's own choice, and no number
        const c = choiceOf(await readJson(ownPath), s);
        if (c !== null) row.mine = c;
      }
      out.push(row);
    }
    res.status(200).json({ signals: out, note: WORDS.room });
  } catch (e) {
    // the error stays here: its message could carry a path made with the secret
    res.status(500).json({ error: 'The signals could not be reached. Nothing was recorded.' });
  }
}
