// THE EMOTIONAL TRACE · Begin → Become → Bridge → Bloom.
//
// Giveth's TRACE follows the money. This follows the human energy behind it.
//   Begin   a donor plants a Gratus Seed with their gift: a short note, paired with the project and the tx.
//   Become  the project's steward sees the seeds arrive beside the capital.
//   Bridge  the steward waters a seed: a short reply back.
//   Bloom   the seed in the donor's garden opens into the project's own emoji, and keeps the reply inside it.
//
// One JSON document per project in Vercel Blob: gratus/trace/<slug>.json = { claim, seeds[] }.
// Writes are last-writer-wins, which is the right size while the stream is small; per-seed documents
// are the next size up and are named in Gratus-Next-Moves.MD.
//
// A seed's note is written to be read by that project's steward. It is not private, and the app says so
// before anyone writes one. No wallet is ever asked for; a tx hash is optional and public on chain anyway.
import { put, list } from '@vercel/blob';
import { createHash, randomBytes } from 'node:crypto';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const KEY = (slug) => 'gratus/trace/' + slug + '.json';
const clip = (v, n) => (typeof v === 'string' ? v : '').replace(/[<>]/g, '').trim().slice(0, n);
const slugOf = (v) => clip(v, 120).toLowerCase().replace(/[^a-z0-9:-]/g, '');
const sha = (s) => createHash('sha256').update(String(s)).digest('hex');
const id = () => randomBytes(8).toString('hex');
const pub = (s) => ({ id: s.id, project: s.project, title: s.title, message: s.message, name: s.name, emoji: s.emoji, bloom: s.bloom, tx: s.tx || null, at: s.at, status: s.status, water: s.water || null });

async function read(slug) {
  const { blobs } = await list({ prefix: KEY(slug), token: TOKEN });
  const b = blobs.find((x) => x.pathname === KEY(slug));
  if (!b) return { claim: null, seeds: [] };
  const r = await fetch(b.url + '?t=' + Date.now(), { cache: 'no-store' });
  if (!r.ok) return { claim: null, seeds: [] };
  const d = await r.json();
  return { claim: d.claim || null, seeds: Array.isArray(d.seeds) ? d.seeds : [] };
}
const write = (slug, doc) => put(KEY(slug), JSON.stringify(doc), { access: 'public', token: TOKEN, contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 0 });

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!TOKEN) { res.status(503).json({ error: 'the trace is not connected yet' }); return; }
  try {
    if (req.method === 'GET') {
      const slug = slugOf(req.query.project);
      if (!slug) { res.status(400).json({ error: 'a project' }); return; }
      const doc = await read(slug);
      const ids = String(req.query.ids || '').split(',').map((s) => s.trim()).filter(Boolean);
      const seeds = (ids.length ? doc.seeds.filter((s) => ids.includes(s.id)) : doc.seeds).slice(-80).reverse();
      res.status(200).json({ project: slug, claimed: !!doc.claim, seeds: seeds.map(pub) });
      return;
    }
    if (req.method !== 'POST') { res.status(405).json({ error: 'GET or POST' }); return; }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const act = String(body.act || 'plant');
    const slug = slugOf(body.project);
    if (!slug) { res.status(400).json({ error: 'a project' }); return; }
    const doc = await read(slug);

    if (act === 'plant') {
      const message = clip(body.message, 280);
      if (!message) { res.status(400).json({ error: 'a seed needs a few words' }); return; }
      const seed = {
        id: id(), project: slug, title: clip(body.title, 120), message, name: clip(body.name, 40) || 'someone',
        emoji: clip(body.emoji, 8) || '🌱', bloom: clip(body.bloom, 8) || '🌻', tx: clip(body.tx, 80) || null,
        at: new Date().toISOString(), status: 'dormant', water: null,
      };
      doc.seeds.push(seed);
      if (doc.seeds.length > 500) doc.seeds = doc.seeds.slice(-500);
      await write(slug, doc);
      res.status(200).json({ seed: pub(seed) });
      return;
    }
    if (act === 'claim') {
      if (doc.claim) { res.status(409).json({ error: 'this project is already claimed' }); return; }
      const key = randomBytes(9).toString('base64url');
      doc.claim = { hash: sha(key), at: new Date().toISOString() };
      await write(slug, doc);
      res.status(200).json({ key, note: 'This key waters seeds for this project. It is shown once and never stored.' });
      return;
    }
    if (act === 'water') {
      const key = clip(body.key, 64);
      if (!doc.claim || doc.claim.hash !== sha(key)) { res.status(403).json({ error: 'that key does not water this project' }); return; }
      const seed = doc.seeds.find((s) => s.id === clip(body.seed, 40));
      if (!seed) { res.status(404).json({ error: 'no such seed' }); return; }
      const reply = clip(body.reply, 280);
      if (!reply) { res.status(400).json({ error: 'a reply needs a few words' }); return; }
      seed.water = { reply, from: clip(body.from, 40) || seed.title || 'the project', at: new Date().toISOString() };
      seed.status = 'bloomed';
      await write(slug, doc);
      res.status(200).json({ seed: pub(seed) });
      return;
    }
    res.status(400).json({ error: 'plant, water or claim' });
  } catch (e) {
    res.status(500).json({ error: 'the trace could not be reached', detail: String(e.message || e).slice(0, 120) });
  }
}
