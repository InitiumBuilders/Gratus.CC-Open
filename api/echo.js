// THE RETURN · the half of the loop that never existed.
//
// A Gratus Gift travels entirely inside its own link. Nothing is uploaded, which
// is why the journey works with no server at all, and it is also why the person
// who gave it never learned that the thing kept growing. Giving is the deepest
// act in this product and it has always been one way.
//
// ── WHAT TRAVELS BACK, AND WHAT NEVER DOES ──
// A gift link carries a random `echo`, sixteen hex characters, made on the
// giver's device. That id is the only thing the two sides share. When the person
// who received the gift chooses to, they send back one of two things:
//
//   landed   the gift arrived and was kept
//   grew     the plant it became reached a phase
//
// A record holds the kind, the phase, the emoji and the DAY. It holds no name,
// no words, no journal, no address and no clock time. The giver already knows
// who they gave it to, because they typed it themselves, and that name never
// leaves their device. The server only ever holds a phase and an emoji against a
// random number. Nothing here can be read backwards into a person.
//
// Nothing is ever sent automatically. Each return is a tap the receiver chooses,
// once per event, and declining is silent and permanent. This is a gift back,
// not a delivery receipt.
//
// ── WHAT AN ATTACKER CAN DO ──
// Anyone holding a gift link holds its echo, so anyone holding a gift link can
// post a return for it. The worst case is a false kind word arriving at the
// giver, which is why the app says "the gift you gave to Sara reached Bloomed"
// using the giver's own note of who they gave it to, and never claims the
// receiver said anything. Ids are 64 bits of randomness and are not enumerable;
// a read returns only the ids you already hold.
import { put, list } from '@vercel/blob';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const KEY = (id) => 'gratus/echo/' + id + '.json';
const ID = /^[0-9a-f]{16}$/;
const clip = (v, n) => (typeof v === 'string' ? v : '').replace(/[<>]/g, '').trim().slice(0, n);
const DAY = 86400000;
const CAP_NOTES = 8;    // a gift has five phases and a landing; eight is room to spare
const CAP_DAY = 20;     // returns per gift per day
const KINDS = new Set(['landed', 'grew']);

async function read(id) {
  const { blobs } = await list({ prefix: KEY(id), token: TOKEN });
  const b = blobs.find((x) => x.pathname === KEY(id));
  if (!b) return null;
  const r = await fetch(b.url + '?t=' + Date.now(), { cache: 'no-store' });
  if (!r.ok) return null;
  return await r.json();
}
const write = (id, doc) => put(KEY(id), JSON.stringify(doc), {
  access: 'public', token: TOKEN, contentType: 'application/json',
  addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 0,
});

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!TOKEN) { res.status(503).json({ error: 'the return is not connected yet' }); return; }
  try {
    // ── the giver reads the returns for gifts they gave ──
    if (req.method === 'GET') {
      const ids = String(req.query.ids || '').split(',').map((s) => s.trim().toLowerCase()).filter((s) => ID.test(s)).slice(0, 20);
      if (!ids.length) { res.status(400).json({ error: 'ids' }); return; }
      const out = {};
      await Promise.all(ids.map(async (id) => {
        try { const d = await read(id); if (d && d.notes) out[id] = d.notes; } catch (e) {}
      }));
      res.status(200).json({ returns: out });
      return;
    }
    if (req.method !== 'POST') { res.status(405).json({ error: 'GET or POST' }); return; }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const id = clip(body.echo, 40).toLowerCase();
    if (!ID.test(id)) { res.status(400).json({ error: 'an echo' }); return; }
    const kind = clip(body.kind, 10);
    if (!KINDS.has(kind)) { res.status(400).json({ error: 'landed or grew' }); return; }
    const phase = clip(body.phase, 24);
    const emoji = clip(body.emoji, 8);

    const now = Date.now();
    const doc = (await read(id)) || { made: new Date().toISOString().slice(0, 10), notes: [] };
    const today = (doc.notes || []).filter((n) => now - new Date(n.at + 'T00:00:00Z').getTime() < DAY).length;
    if (today >= CAP_DAY) { res.status(429).json({ error: 'that gift has already said plenty today' }); return; }
    // a phase is reached once, so it is reported once; the same for a landing
    const twin = (doc.notes || []).find((n) => n.kind === kind && (n.phase || '') === phase);
    if (twin) { res.status(200).json({ ok: true, note: 'already said' }); return; }
    // the day, never the clock: when someone tapped is their business
    doc.notes = (doc.notes || []).concat([{ kind, phase, emoji, at: new Date().toISOString().slice(0, 10) }]).slice(-CAP_NOTES);
    await write(id, doc);
    res.status(200).json({ ok: true, notes: doc.notes.length });
  } catch (e) {
    res.status(500).json({ error: 'the return could not be reached', detail: String(e.message || e).slice(0, 120) });
  }
}
