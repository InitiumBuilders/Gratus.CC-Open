// GRATUS VIBES · the small rooms inside Gratus.
//
// A Vibe is a named group with a code. No accounts: you hold the code, you are in the room.
// People post short gratitudes there with an emoji from their own garden. Nothing else travels:
// a journal entry is a different thing and never leaves the device.
//
// One JSON document per vibe in Vercel Blob: gratus/vibes/<code>.json = { name, about, emoji, made, posts[] }.
// Writes are last-writer-wins, and Blob is not read-after-write consistent (measured: ~5 seconds),
// so nothing here depends on an immediate re-read.
import { put, list } from '@vercel/blob';
import { createHash, randomBytes } from 'node:crypto';

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

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!TOKEN) { res.status(503).json({ error: 'the vibes are not connected yet' }); return; }
  try {
    if (req.method === 'GET') {
      const code = codeOf(req.query.code);
      if (!code) { res.status(400).json({ error: 'a code' }); return; }
      const doc = await read(code);
      if (!doc) { res.status(404).json({ error: 'no vibe with that code' }); return; }
      res.status(200).json({ vibe: pubVibe(doc, code) });
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
    res.status(400).json({ error: 'make, post or take-down' });
  } catch (e) {
    res.status(500).json({ error: 'the vibes could not be reached', detail: String(e.message || e).slice(0, 120) });
  }
}
