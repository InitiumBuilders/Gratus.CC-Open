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
const clip = (v, n) => (typeof v === 'string' ? v : '').replace(/[<>]/g, '').trim().slice(0, n);
const codeOf = (v) => clip(v, 12).toUpperCase().replace(/[^A-Z0-9]/g, '');
const sha = (s) => createHash('sha256').update(String(s)).digest('hex');
const DAY = 86400000;
const CAP_DAY = 400;     // posts per vibe per day
const CAP_TOTAL = 400;   // posts kept per vibe
const DEDUPE = 120000;

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
      doc.posts = (doc.posts || []).concat([{ id: randomBytes(6).toString('hex'), name, text, emoji: clip(body.emoji, 8) || '✦', at: new Date().toISOString() }]);
      if (doc.posts.length > CAP_TOTAL) doc.posts = doc.posts.slice(-CAP_TOTAL);
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
