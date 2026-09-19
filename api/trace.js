// THE EMOTIONAL TRACE · Begin → Become → Bridge → Bloom.
//
// Giveth's TRACE follows the money. This follows the human energy behind it.
//   Begin   a donor plants a Gratus Seed with their gift: a short note, paired with the project and the tx.
//   Become  the project's steward sees the seeds arrive beside the capital.
//   Bridge  the steward waters a seed: a short reply back, and may pass the flow on to a project they are grateful for.
//   Bloom   the seed in the donor's garden opens into the project's own emoji, and keeps the reply inside it.
//
// Two readings come out of the same document, and neither orders anyone against anyone else:
//   first    a seed that is the first a project ever received (the "I see you" mark)
//   signal   how many seeds a project has received and how faithfully it waters them
//
// One JSON document per project in Vercel Blob: gratus/trace/<slug>.json = { claim, seeds[] }.
// Writes are last-writer-wins, and Blob is not read-after-write consistent (measured: ~5 seconds).
// Nothing here depends on an immediate re-read; per-seed documents are the next size up.
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
const DAY = 86400000;
const CAP_DAY = 240;       // seeds per project per day
const CAP_TOTAL = 500;     // seeds kept per project
const DEDUPE = 300000;     // the same words from the same name inside five minutes

const pub = (s) => ({
  id: s.id, project: s.project, title: s.title, message: s.message, name: s.name, emoji: s.emoji,
  bloom: s.bloom, tx: s.tx || null, confirmed: s.confirmed || null, first: !!s.first,
  at: s.at, status: s.status, water: s.water || null,
});

// the responsiveness reading. It orders nobody against anybody: it is shown to the project itself first.
function signalOf(seeds) {
  const n = seeds.length; if (!n) return null;
  const watered = seeds.filter((s) => s.status === 'bloomed');
  const days = watered.map((s) => (new Date(s.water.at) - new Date(s.at)) / DAY).filter((d) => d >= 0).sort((a, b) => a - b);
  const median = days.length ? days[Math.floor(days.length / 2)] : null;
  return { seeds: n, watered: watered.length, share: Math.round((watered.length / n) * 100), medianDays: median == null ? null : Math.round(median * 10) / 10 };
}

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
      res.status(200).json({ project: slug, claimed: !!doc.claim, signal: signalOf(doc.seeds), seeds: seeds.map(pub) });
      return;
    }
    if (req.method !== 'POST') { res.status(405).json({ error: 'GET or POST' }); return; }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const act = String(body.act || 'plant');
    const slug = slugOf(body.project);
    if (!slug) { res.status(400).json({ error: 'a project' }); return; }
    const doc = await read(slug);
    const now = Date.now();

    if (act === 'plant') {
      const message = clip(body.message, 280);
      if (!message) { res.status(400).json({ error: 'a seed needs a few words' }); return; }
      const name = clip(body.name, 40) || 'someone';
      const today = doc.seeds.filter((s) => now - new Date(s.at).getTime() < DAY).length;
      if (today >= CAP_DAY) { res.status(429).json({ error: 'this project has had a lot of seeds today. Try again tomorrow.' }); return; }
      const twin = doc.seeds.find((s) => s.message === message && s.name === name && now - new Date(s.at).getTime() < DEDUPE);
      if (twin) { res.status(200).json({ seed: pub(twin), note: 'already planted' }); return; }
      // the "I see you" mark: the first seed a project has ever received
      const first = doc.seeds.length === 0;
      const seed = {
        id: id(), project: slug, title: clip(body.title, 120), message, name,
        emoji: clip(body.emoji, 8) || '🌱', bloom: first ? '🫶' : (clip(body.bloom, 8) || '🌻'),
        tx: clip(body.tx, 80) || null, confirmed: null, first,
        at: new Date().toISOString(), status: 'dormant', water: null,
      };
      doc.seeds.push(seed);
      if (doc.seeds.length > CAP_TOTAL) doc.seeds = doc.seeds.slice(-CAP_TOTAL);
      await write(slug, doc);
      res.status(200).json({ seed: pub(seed), first });
      return;
    }
    if (act === 'confirm') {
      const seed = doc.seeds.find((s) => s.id === clip(body.seed, 40));
      if (!seed) { res.status(404).json({ error: 'no such seed' }); return; }
      seed.confirmed = { at: new Date().toISOString(), amount: clip(String(body.amount || ''), 24), currency: clip(body.currency, 12), usd: Number(body.usd) || null };
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
      seed.water = {
        reply, from: clip(body.from, 40) || seed.title || 'the project', at: new Date().toISOString(),
        // the circular flow: a project may pass it on to one it is grateful for
        passTo: slugOf(body.passTo) || null, passWhy: clip(body.passWhy, 140) || null,
      };
      seed.status = 'bloomed';
      await write(slug, doc);
      res.status(200).json({ seed: pub(seed) });
      return;
    }
    res.status(400).json({ error: 'plant, water, confirm or claim' });
  } catch (e) {
    res.status(500).json({ error: 'the trace could not be reached', detail: String(e.message || e).slice(0, 120) });
  }
}
