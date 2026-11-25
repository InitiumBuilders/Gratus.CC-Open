// GRATUS VIBES · the small rooms inside Gratus.
//
// A Vibe is a named group with a code. No accounts: you hold the code, you are in the room.
// People post short gratitudes there with an emoji from their own garden. Nothing else travels:
// a journal entry is a different thing and never leaves the device.
//
// One JSON document per vibe in Vercel Blob: gratus/vibes/<code>.json = { name, about, emoji, made, posts[] }.
// Writes are last-writer-wins, and Blob is not read-after-write consistent (measured: ~5 seconds),
// so nothing here depends on an immediate re-read.
//
// A room can also hold up to 12 PAXTs. Each link is its own blob, written once, under a directory keyed with the
// secret: <base>vibe-paxt/<HMAC(code)>/<sha256(id)>.json = { id, at }. The room code is never in that path, and
// <base> is gratus/ in production and gratus/preview/ everywhere else, so a preview never adds to a live room.
// Only a PAXT that exists can be linked. The 12 are twelve places, <base>vibe-paxt/_slots/<HMAC(code)>/<i>.json,
// each written once, so links sent in the same moment cannot pass twelve. Each connection gets 12 tries a day,
// counted the same way, and the room's keeper key can take a link down.
import { put, list, head, del } from '@vercel/blob';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { paxtKey, netOf } from './paxt.js';
import { sweepDays } from './_sweep.js';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const KEY = (code) => 'gratus/vibes/' + code + '.json';
const PAGE = (code, n) => 'gratus/vibes/' + code + '/p' + n + '.json';
const RATE = () => 'gratus/vibes/_made/' + new Date().toISOString().slice(0, 10) + '.json';
const clip = (v, n) => (typeof v === 'string' ? v : '').replace(/[<>]/g, '').trim().slice(0, n);
const codeOf = (v) => clip(v, 12).toUpperCase().replace(/[^A-Z0-9]/g, '');
const sha = (s) => createHash('sha256').update(String(s)).digest('hex');
const DAY = 86400000;
const CAP_DAY = 400;     // posts per vibe per day
const CAP_PAGE = 400;    // posts kept in the live room before the older ones move to a page
const CAP_CALLER = 30;   // posts one caller may add to one room in a day
const CAP_MAKE = 5;      // rooms one caller may make in a day
const DEDUPE = 120000;

// a salted hash of the caller, never the caller. GRATUS_SALT is a real secret held in
// the environment, so a counter document can never be read back as a list of addresses.
const SALT = process.env.GRATUS_SALT || sha('gratus/vibes/' + String(TOKEN)).slice(0, 32);
const whoOf = (req) => sha(String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '').split(',')[0].trim() + '\u00b7' + SALT).slice(0, 16);

// a room's PAXTs: the id form api/paxt.js takes, and paths read from VERCEL_ENV at every call
const PAXT_ID = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
const CAP_PAXTS = 12;
const base = () => (process.env.VERCEL_ENV === 'production' ? 'gratus/' : 'gratus/preview/');
const keyed = (s) => createHmac('sha256', SALT).update(s).digest('hex').slice(0, 32);
const LINKS = (code) => base() + 'vibe-paxt/' + keyed('vibe-paxt\u00b7' + code) + '/';
const linkPath = (code, id) => LINKS(code) + sha(id) + '.json';
const LINK_SLOTS = (code) => base() + 'vibe-paxt/_slots/' + keyed('vibe-paxt-slots\u00b7' + code) + '/';
const CAP_ATTACH = 12;   // tries one connection may make at linking a PAXT to a room in a day
// Counted by network, as api/paxt.js and api/signal.js count: an IPv6 home or phone holds a whole /64 and can take
// a new address in it for every call, so the /64 is the connection.
const netWho = (req) => sha(netOf(String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '').split(',')[0]) + '\u00b7' + SALT).slice(0, 16);
const dayNow = () => new Date(Date.now()).toISOString().slice(0, 10);
const ATTACHES_ROOT = () => base() + 'vibe-paxt/_calls/';
// Each try is written in the same moment as the link it adds, so a day's tries are kept only for that day: the first
// calls of a new day delete every earlier day's (api/_sweep.js), as api/paxt.js and api/signal.js do with theirs.
const ATTACHES = (req) => { const d = dayNow(); return ATTACHES_ROOT() + d + '/' + keyed('vibe-paxt-calls\u00b7' + d + '\u00b7' + netWho(req)) + '/'; };
// Where a PAXT's record is kept is asked of api/paxt.js itself (paxtKey), so the two files cannot name different
// paths. A preview room links only a PAXT opened in a preview, and a live room only a live one. Read only.

// no ambiguous glyphs: a code is read aloud and typed by hand
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from(randomBytes(6)).map((b) => ALPHABET[b % ALPHABET.length]).join('');

const pubPost = (p) => ({ id: p.id, name: p.name, text: p.text, emoji: p.emoji, at: p.at });
const pubVibe = (d, code) => ({
  code, name: d.name, about: d.about || '', emoji: d.emoji || '✦', made: d.made,
  posts: (d.posts || []).slice(-60).reverse().map(pubPost),
  count: (d.posts || []).length,
  voices: new Set((d.posts || []).map((p) => p.name)).size,
});

async function read(code) {
  const { blobs } = await list({ prefix: KEY(code), token: TOKEN });
  const b = blobs.find((x) => x.pathname === KEY(code));
  if (!b) return null;
  const r = await fetch(b.url + '?t=' + Date.now(), { cache: 'no-store' });
  if (!r.ok) return null;
  return await r.json();
}
// Making a room costs nothing and left no trace, so one script could fill the store
// with empty rooms overnight. A day's making is counted in one small document.
async function made(req) {
  const key = RATE();
  let d = { who: {} };
  try {
    const { blobs } = await list({ prefix: key, token: TOKEN });
    const b = blobs.find((x) => x.pathname === key);
    if (b) { const r = await fetch(b.url + '?t=' + Date.now(), { cache: 'no-store' }); if (r.ok) d = await r.json(); }
  } catch (e) { return true; }
  const k = whoOf(req);
  const mine = Number(d.who && d.who[k]) || 0;
  if (mine >= CAP_MAKE) return false;
  d.who = d.who || {}; d.who[k] = mine + 1;
  try { await put(key, JSON.stringify(d), { access: 'public', token: TOKEN, contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 0 }); } catch (e) {}
  return true;
}

// A room that fills up used to drop its oldest posts to make space, which in a place
// built for gratitude meant deleting the first thing anyone said in it. They move to a
// page of their own now and are kept.
async function rollover(code, doc) {
  if ((doc.posts || []).length <= CAP_PAGE) return;
  const keep = doc.posts.slice(-Math.floor(CAP_PAGE / 2));
  const move = doc.posts.slice(0, doc.posts.length - keep.length);
  if (!move.length) return;
  const n = (doc.pages || 0) + 1;
  await put(PAGE(code, n), JSON.stringify({ page: n, code, posts: move }), { access: 'public', token: TOKEN, contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 0 });
  doc.pages = n;
  doc.archived = (doc.archived || 0) + move.length;
  doc.posts = keep;
}

function allow(doc, who, cap) {
  const day = new Date().toISOString().slice(0, 10);
  const r = doc.rate && typeof doc.rate === 'object' ? doc.rate : {};
  for (const k of Object.keys(r)) if (!r[k] || r[k].day !== day) delete r[k];
  const mine = r[who] && r[who].day === day ? Number(r[who].n) || 0 : 0;
  if (mine >= cap) return false;
  r[who] = { day, n: mine + 1 };
  doc.rate = r;
  return true;
}

const write = (code, doc) => put(KEY(code), JSON.stringify(doc), { access: 'public', token: TOKEN, contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 0 });

// Written once. The store refuses a second write to the same path, so the same link sent twice stays one.
async function writeOnce(key, body) {
  try {
    await put(key, body, { access: 'public', token: TOKEN, contentType: 'application/json', addRandomSuffix: false, allowOverwrite: false });
    return true;
  } catch (e) {
    if (/exist/i.test(String(e && e.message))) return false;
    throw e;
  }
}

// Whether a blob is there. head asks the store for the one blob, so it does not wait out the list's lag.
async function exists(key) {
  try {
    return !!(await head(key, { token: TOKEN }));
  } catch (e) {
    if (/not ?found|does not exist/i.test(String(e && (e.name + ' ' + e.message)))) return false;
    throw e;
  }
}
const pick = (n) => randomBytes(4).readUInt32BE(0) % n;
// Takes one of `cap` numbered names under `dir`, written once with `body`, and gives back its path, or null when
// none can be created. The list only says which names to try first; the write-once create decides.
async function claimSlot(dir, cap, body = '{}') {
  const taken = new Set((await list({ prefix: dir, token: TOKEN })).blobs.map((b) => b.pathname));
  const free = [...Array(cap).keys()].map((n) => dir + n + '.json').filter((p) => !taken.has(p));
  for (let i = free.length - 1; i > 0; i--) { const j = pick(i + 1); [free[i], free[j]] = [free[j], free[i]]; }
  for (const p of free) if (await writeOnce(p, body)) return p;
  return null;
}

// The room's PAXT ids, in the order they were added, twelve at most. A blob whose name does not match the id
// inside it was moved in the store, and is left out.
async function paxtsOf(code) {
  const { blobs } = await list({ prefix: LINKS(code), token: TOKEN });
  const rows = await Promise.all(blobs.slice(0, CAP_PAXTS).map(async (b) => {
    try {
      const r = await fetch(b.url + '?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return null;
      const o = await r.json();
      return o && typeof o.id === 'string' && PAXT_ID.test(o.id) && b.pathname === linkPath(code, o.id) ? o : null;
    } catch (e) { return null; }
  }));
  return rows.filter(Boolean)
    .sort((a, b) => (String(a.at) < String(b.at) ? -1 : String(a.at) > String(b.at) ? 1 : a.id < b.id ? -1 : 1))
    .map((o) => o.id).slice(0, CAP_PAXTS);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!TOKEN) { res.status(503).json({ error: 'the vibes are not connected yet' }); return; }
  try {
    if (req.method === 'GET') {
      const code = codeOf(req.query.code);
      if (!code) { res.status(400).json({ error: 'a code' }); return; }
      const doc = await read(code);
      if (!doc) { res.status(404).json({ error: 'no vibe with that code' }); return; }
      // the room still opens if its PAXT list cannot be read
      let paxts = [];
      try { paxts = await paxtsOf(code); } catch (e) {}
      res.status(200).json({ vibe: Object.assign(pubVibe(doc, code), { paxts }) });
      return;
    }
    if (req.method !== 'POST') { res.status(405).json({ error: 'GET or POST' }); return; }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const act = String(body.act || 'post');

    if (act === 'make') {
      const name = clip(body.name, 40);
      if (!name) { res.status(400).json({ error: 'a name for the vibe' }); return; }
      if (!await made(req)) { res.status(429).json({ error: 'that is as many rooms as one person opens in a day. The ones you have are still there.' }); return; }
      let code = newCode();
      for (let i = 0; i < 4 && await read(code); i++) code = newCode();
      const keeper = randomBytes(9).toString('base64url');
      const doc = { name, about: clip(body.about, 200), emoji: clip(body.emoji, 8) || '✦', made: new Date().toISOString(), keeper: sha(keeper), posts: [] };
      await write(code, doc);
      res.status(200).json({ vibe: pubVibe(doc, code), keeper, note: 'The code lets anyone in. The keeper key is shown once and can take a post down.' });
      return;
    }

    const code = codeOf(body.code);
    if (!code) { res.status(400).json({ error: 'a code' }); return; }
    const doc = await read(code);
    if (!doc) { res.status(404).json({ error: 'no vibe with that code' }); return; }
    const now = Date.now();

    if (act === 'post') {
      const text = clip(body.text, 280);
      if (!text) { res.status(400).json({ error: 'a few words' }); return; }
      const name = clip(body.name, 40) || 'someone';
      const today = (doc.posts || []).filter((p) => now - new Date(p.at).getTime() < DAY).length;
      if (today >= CAP_DAY) { res.status(429).json({ error: 'this vibe has been busy today. Try again tomorrow.' }); return; }
      const twin = (doc.posts || []).find((p) => p.text === text && p.name === name && now - new Date(p.at).getTime() < DEDUPE);
      if (twin) { res.status(200).json({ vibe: pubVibe(doc, code), note: 'already said' }); return; }
      if (!allow(doc, whoOf(req), CAP_CALLER)) { res.status(429).json({ error: 'that is a lot for one day in one room. It opens again tomorrow.' }); return; }
      doc.posts = (doc.posts || []).concat([{ id: randomBytes(6).toString('hex'), name, text, emoji: clip(body.emoji, 8) || '✦', at: new Date().toISOString() }]);
      try { await rollover(code, doc); } catch (e) { /* keep every post; a long room is the lesser fault */ }
      await write(code, doc);
      res.status(200).json({ vibe: pubVibe(doc, code) });
      return;
    }
    if (act === 'take-down') {
      const key = clip(body.keeper, 64);
      if (!doc.keeper || doc.keeper !== sha(key)) { res.status(403).json({ error: 'that key does not keep this vibe' }); return; }
      doc.posts = (doc.posts || []).filter((p) => p.id !== clip(body.post, 40));
      await write(code, doc);
      res.status(200).json({ vibe: pubVibe(doc, code) });
      return;
    }
    if (act === 'paxt-attach') {
      const id = typeof body.id === 'string' ? body.id : '';
      if (!PAXT_ID.test(id)) { res.status(400).json({ error: 'that is not a PAXT id' }); return; }
      try {
        await sweepDays(ATTACHES_ROOT(), dayNow(), TOKEN);
        // every try counts, the refused ones too, so the check below cannot be used to guess PAXT ids
        if (!(await claimSlot(ATTACHES(req), CAP_ATTACH))) {
          res.status(429).json({ error: CAP_ATTACH + ' tries at adding a PAXT to a room have come from this connection today, the most for one day. You can try again tomorrow.' });
          return;
        }
        if (!(await exists(paxtKey(id)))) { res.status(404).json({ error: 'There is no PAXT with that id.' }); return; }
        const at = linkPath(code, id);
        let had = await exists(at);
        if (!had) {
          const place = await claimSlot(LINK_SLOTS(code), CAP_PAXTS, JSON.stringify({ id }));
          if (!place) { res.status(409).json({ error: 'This room is full at ' + CAP_PAXTS + ' PAXTs.' }); return; }
          // the same PAXT sent twice in one moment: one link is kept, and the other call gives its place back
          if (!(await writeOnce(at, JSON.stringify({ id, at: new Date().toISOString() })))) { had = true; await del(place, { token: TOKEN }); }
        }
        const paxts = await paxtsOf(code);
        // the store can be a few seconds behind the write
        if (!paxts.includes(id)) paxts.push(id);
        res.status(200).json(Object.assign({ vibe: Object.assign(pubVibe(doc, code), { paxts }) }, had ? { already: true } : {}));
      } catch (e) {
        // the error stays here: its message could carry a path made with the secret
        res.status(500).json({ error: 'The room could not be reached. Nothing was added.' });
      }
      return;
    }
    if (act === 'paxt-detach') {
      const key = clip(body.keeper, 64);
      if (!doc.keeper || doc.keeper !== sha(key)) { res.status(403).json({ error: 'that key does not keep this vibe' }); return; }
      const id = typeof body.id === 'string' ? body.id : '';
      if (!PAXT_ID.test(id)) { res.status(400).json({ error: 'that is not a PAXT id' }); return; }
      try {
        const at = linkPath(code, id);
        if (!(await exists(at))) { res.status(404).json({ error: 'That PAXT is not in this room.' }); return; }
        // the link goes first: a place left behind only makes the room smaller, never larger than twelve
        await del(at, { token: TOKEN });
        const { blobs } = await list({ prefix: LINK_SLOTS(code), token: TOKEN });
        for (const b of blobs) {
          try {
            const r = await fetch(b.url + '?t=' + Date.now(), { cache: 'no-store' });
            const o = r.ok ? await r.json() : null;
            if (o && o.id === id) await del(b.pathname, { token: TOKEN });
          } catch (e) {}
        }
        res.status(200).json({ vibe: Object.assign(pubVibe(doc, code), { paxts: (await paxtsOf(code)).filter((x) => x !== id) }) });
      } catch (e) {
        res.status(500).json({ error: 'The room could not be reached. Nothing was taken down.' });
      }
      return;
    }
    res.status(400).json({ error: 'make, post, take-down, paxt-attach or paxt-detach' });
  } catch (e) {
    res.status(500).json({ error: 'the vibes could not be reached', detail: String(e.message || e).slice(0, 120) });
  }
}
