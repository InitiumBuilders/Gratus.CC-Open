// THE EMOTIONAL TRACE · Begin → Become → Bridge → Bloom → and then a conversation.
//
// Giveth's TRACE follows the money. This follows the human energy behind it.
//   Begin   a donor plants a Gratus Seed with their gift: a short note, paired with the project and the tx.
//   Become  the project's steward sees the seeds arrive beside the capital.
//   Bridge  the steward waters a seed: a short reply back, and may pass the flow on to a project they are grateful for.
//   Bloom   the seed in the donor's garden opens into the project's own emoji, and keeps the reply inside it.
//   Answer  either side may keep speaking. A seed carries a thread, not a receipt.
//
// WHO CAN READ WHAT
//   A seed is written to be read by that project's steward, and the app says so before anyone writes one.
//   So: an open read returns the project's own reading and only the seeds whose authors chose to publish them.
//   The steward reads everything with the project key. A donor reads their own seeds by id, which are
//   sixteen random hex characters and are not guessable.
//
// WHAT A KEY MAY TRAVEL IN
//   Never a URL. A query string is written to every access log it passes through and is handed to the next
//   site in the referrer, so the steward key and the seed ids moved to the body of a POST. The only thing a
//   GET takes now is the project, which is public anyway.
//
// One JSON document per project in Vercel Blob: gratus/trace/<slug>.json = { claim, seeds[] }.
// Writes are last-writer-wins, and Blob is not read-after-write consistent (measured: ~5 seconds).
import { put, list } from '@vercel/blob';
import { createHash, randomBytes } from 'node:crypto';
import { pageOf, giftOf } from './_giveth.js';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const KEY = (slug) => 'gratus/trace/' + slug + '.json';
const PAGE = (slug, n) => 'gratus/trace/' + slug + '/p' + n + '.json';
const clip = (v, n) => (typeof v === 'string' ? v : '').replace(/[<>]/g, '').trim().slice(0, n);
const asGiveth = (v) => clip(v, 120).replace(/[^A-Za-z0-9:_-]/g, '');   // as Giveth spells it
const slugOf = (v) => asGiveth(v).toLowerCase();                        // as the store files it
const sha = (s) => createHash('sha256').update(String(s)).digest('hex');
const id = () => randomBytes(8).toString('hex');
const DAY = 86400000;
const CAP_DAY = 240;      // seeds this project may receive in a day, whoever sends them
const CAP_CALLER = 12;    // seeds one caller may plant into one project in a day
const CAP_CLAIM = 6;      // claim attempts one caller may make on one project in a day
const CAP_PAGE = 500;     // seeds kept in the live document before the older ones move to a page of their own
const DEDUPE = 300000;
const PROVE_MS = 3600000; // an hour to paste one line into a project description

// The counters below are keyed by a salted hash of the caller's address and never by the
// address. GRATUS_SALT is a real secret held in the environment; the fallback is derived
// from the store token, which is also secret, so the hash is never reversible by anyone
// reading this file. A public constant in a public repository would have made these
// counters a list of the addresses that wrote them.
const SALT = process.env.GRATUS_SALT || sha('gratus/trace/' + String(TOKEN)).slice(0, 32);
const whoOf = (req) => sha(String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '').split(',')[0].trim() + '·' + SALT).slice(0, 16);

// the whole seed, for the person who wrote it and the project it was written to
const full = (s) => ({
  id: s.id, project: s.project, title: s.title, message: s.message, name: s.name, emoji: s.emoji,
  bloom: s.bloom, tx: s.tx || null, confirmed: s.confirmed || null, first: !!s.first, public: !!s.public,
  at: s.at, status: s.status, water: s.water || null, thread: s.thread || [],
});
// the responsiveness reading. It orders nobody against anybody: it is shown to the project itself first.
function signalOf(seeds, archived) {
  const n = seeds.length; if (!n) return null;
  const watered = seeds.filter((s) => s.status === 'bloomed');
  const days = watered.map((s) => (new Date(s.water.at) - new Date(s.at)) / DAY).filter((d) => d >= 0).sort((a, b) => a - b);
  const median = days.length ? days[Math.floor(days.length / 2)] : null;
  const said = seeds.reduce((t, s) => t + ((s.thread || []).length), 0);
  return { seeds: n, kept: n + (archived || 0), watered: watered.length, share: Math.round((watered.length / n) * 100), medianDays: median == null ? null : Math.round(median * 10) / 10, said };
}

async function read(slug) {
  const { blobs } = await list({ prefix: KEY(slug), token: TOKEN });
  const b = blobs.find((x) => x.pathname === KEY(slug));
  if (!b) return { claim: null, seeds: [] };
  const r = await fetch(b.url + '?t=' + Date.now(), { cache: 'no-store' });
  if (!r.ok) return { claim: null, seeds: [] };
  const d = await r.json();
  return {
    claim: d.claim || null, seeds: Array.isArray(d.seeds) ? d.seeds : [],
    pending: Array.isArray(d.pending) ? d.pending : [], rate: d.rate && typeof d.rate === 'object' ? d.rate : {},
    pages: Number(d.pages) || 0, archived: Number(d.archived) || 0,
  };
}
const write = (slug, doc) => put(KEY(slug), JSON.stringify(doc), { access: 'public', token: TOKEN, contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 0 });
const isSteward = (doc, key) => !!(doc.claim && key && doc.claim.hash === sha(key));
const isAuthor = (seed, key) => !!(seed && seed.mine && key && seed.mine === sha(key));

// ── the caps, and the one thing they must never do ──
// Before this, seed 501 deleted seed 1. Somebody's words, and the reply they had been
// answered with, disappeared to make room, and nothing in the app ever said so. In a
// garden where nothing decays, that was the loudest contradiction in the code. The
// overflow now moves to a page of its own and is kept. If that write fails, the document
// is allowed to grow instead: a large document is a smaller problem than a deleted seed.
async function rollover(slug, doc) {
  if (doc.seeds.length <= CAP_PAGE) return;
  const keep = doc.seeds.slice(-Math.floor(CAP_PAGE / 2));
  const move = doc.seeds.slice(0, doc.seeds.length - keep.length);
  if (!move.length) return;
  const n = (doc.pages || 0) + 1;
  await put(PAGE(slug, n), JSON.stringify({ page: n, project: slug, seeds: move }), { access: 'public', token: TOKEN, contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 0 });
  doc.pages = n;
  doc.archived = (doc.archived || 0) + move.length;
  doc.seeds = keep;
}

// One caller's allowance for one project for one day. Yesterday's counters are dropped on
// sight, so the map stays about as large as the number of people who wrote today.
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

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!TOKEN) { res.status(503).json({ error: 'the trace is not connected yet' }); return; }
  try {
    if (req.method === 'GET') {
      const slug = slugOf(req.query.project);
      if (!slug) { res.status(400).json({ error: 'a project' }); return; }
      const doc = await read(slug);
      const open = doc.seeds.slice(-80).reverse();
      res.status(200).json({
        project: slug, claimed: !!doc.claim, signal: signalOf(doc.seeds, doc.archived),
        held: open.filter((s) => !s.public).length,
        seeds: open.filter((s) => s.public).map(full),
      });
      return;
    }
    if (req.method !== 'POST') { res.status(405).json({ error: 'GET or POST' }); return; }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const act = String(body.act || 'plant');
    const given = asGiveth(body.project);
    const slug = given.toLowerCase();
    if (!slug) { res.status(400).json({ error: 'a project' }); return; }
    const doc = await read(slug);
    const now = Date.now();

    // ── the read that carries a key ──
    // A donor asks about the seeds they hold the ids of; a steward asks for everything.
    // Both used to travel in the query string, where a key is written to every log it
    // passes on the way. Now they arrive in a body, which is not logged and is not a referrer.
    if (act === 'read') {
      const key = clip(body.key, 80);
      const ids = (Array.isArray(body.ids) ? body.ids : String(body.ids || '').split(',')).map((s) => clip(s, 40)).filter(Boolean).slice(0, 60);
      const signal = signalOf(doc.seeds, doc.archived);
      if (ids.length) {
        res.status(200).json({ project: slug, claimed: !!doc.claim, signal, seeds: doc.seeds.filter((s) => ids.includes(s.id)).map(full) });
        return;
      }
      if (isSteward(doc, key)) {
        res.status(200).json({ project: slug, claimed: true, steward: true, signal, seeds: doc.seeds.slice(-80).reverse().map(full) });
        return;
      }
      const open = doc.seeds.slice(-80).reverse();
      res.status(200).json({ project: slug, claimed: !!doc.claim, signal, held: open.filter((s) => !s.public).length, seeds: open.filter((s) => s.public).map(full) });
      return;
    }

    if (act === 'plant') {
      const message = clip(body.message, 280);
      if (!message) { res.status(400).json({ error: 'a seed needs a few words' }); return; }
      const name = clip(body.name, 40) || 'someone';
      const twin = doc.seeds.find((s) => s.message === message && s.name === name && now - new Date(s.at).getTime() < DEDUPE);
      if (twin) { res.status(200).json({ seed: full(twin), note: 'already planted' }); return; }
      const today = doc.seeds.filter((s) => now - new Date(s.at).getTime() < DAY).length;
      if (today >= CAP_DAY) { res.status(429).json({ error: 'this project has had a lot of seeds today. Try again tomorrow.' }); return; }
      // A ceiling on the project alone let one sender spend everybody's allowance, and the
      // people it locked out were told the project was busy. The allowance is per sender now.
      if (!allow(doc, whoOf(req), CAP_CALLER)) { res.status(429).json({ error: 'that is as many seeds as one person plants in one project in a day. Tomorrow it opens again.' }); return; }
      const first = doc.seeds.length === 0 && !doc.archived;   // the "I see you" mark
      const mine = randomBytes(9).toString('base64url');       // the author's own key, shown once, kept on their device
      const seed = {
        id: id(), project: slug, title: clip(body.title, 120), message, name,
        emoji: clip(body.emoji, 8) || '🌱', bloom: first ? '🫶' : (clip(body.bloom, 8) || '🌻'),
        tx: clip(body.tx, 80) || null, confirmed: null, first, public: body.public === true,
        mine: sha(mine), at: new Date().toISOString(), status: 'dormant', water: null, thread: [],
      };
      doc.seeds.push(seed);
      try { await rollover(slug, doc); } catch (e) { /* keep every seed; a long document is the lesser fault */ }
      await write(slug, doc);
      res.status(200).json({ seed: full(seed), mine, first });
      return;
    }

    // ── the seed and the capital, linked ──
    // This used to take the amount from whoever sent the request and write it into the
    // document as fact, with nothing asked of them at all. A stranger could stamp any
    // number onto any public seed. Now the person who planted the seed proves it with
    // their own key, and the number is the one Giveth has, read here rather than sent here.
    if (act === 'confirm') {
      const seed = doc.seeds.find((s) => s.id === clip(body.seed, 40));
      if (!seed) { res.status(404).json({ error: 'no such seed' }); return; }
      if (!isAuthor(seed, clip(body.key, 80))) { res.status(403).json({ error: 'only the person who planted this seed can confirm it' }); return; }
      const tx = clip(body.tx, 100).toLowerCase() || seed.tx;
      if (!tx) { res.status(400).json({ error: 'a transaction' }); return; }
      let got;
      try { got = await giftOf(given, tx); }
      catch (e) { res.status(503).json({ error: 'Giveth could not be reached to check that gift. Nothing was written.' }); return; }
      if (!got.confirmed) { res.status(200).json({ confirmed: false, note: got.note }); return; }
      seed.tx = tx;
      seed.confirmed = { at: new Date().toISOString(), amount: got.gift.amount, currency: got.gift.currency, usd: got.gift.usd, by: 'giveth' };
      await write(slug, doc);
      res.status(200).json({ seed: full(seed), confirmed: true });
      return;
    }

    // ── the claim ──
    // Before this, one POST made anyone the steward of any project. They could then read
    // every seed written to it, including the ones whose authors had not published them,
    // and answer as the project in words a donor keeps forever. That is not a data breach.
    // It is an impersonation of gratitude, which in this app is the worse of the two.
    //
    // So a claim is proved the way a domain is proved. Gratus hands out a code and a
    // secret. The code goes into the project's own description on Giveth, which only the
    // project can edit. Gratus then reads that description back from Giveth and looks for
    // the code. The secret never leaves the claimant, so watching the description and
    // copying the code out of it gains a passer-by nothing.
    if (act === 'claim') {
      if (doc.claim) { res.status(409).json({ error: 'this project is already claimed' }); return; }
      if (!allow(doc, whoOf(req), CAP_CLAIM)) { res.status(429).json({ error: 'that is enough claim attempts for one day' }); return; }
      let page;
      try { page = await pageOf(given); }
      catch (e) { res.status(503).json({ error: 'Giveth could not be reached to check that project. Try again shortly.' }); return; }
      if (!page) { res.status(404).json({ error: 'Giveth has no project at that address. It is spelled exactly as it appears in the project’s own link, capitals included.' }); return; }
      const code = 'gratus-' + randomBytes(5).toString('hex');
      const secret = randomBytes(12).toString('base64url');
      doc.pending = (doc.pending || []).filter((p) => now - new Date(p.at).getTime() < PROVE_MS).slice(-4)
        .concat([{ id: id(), code, secret: sha(secret), at: new Date().toISOString() }]);
      await write(slug, doc);
      res.status(200).json({
        step: 'prove', project: page.title, code, secret,
        note: 'Put this code anywhere in the project description on Giveth and save it. Finishing the claim reads the page back and looks for it. The line can go once the claim is through.',
      });
      return;
    }
    if (act === 'claim-prove') {
      if (doc.claim) { res.status(409).json({ error: 'this project is already claimed' }); return; }
      const secret = clip(body.secret, 120);
      const pend = (doc.pending || []).find((p) => p.secret === sha(secret) && now - new Date(p.at).getTime() < PROVE_MS);
      if (!pend) { res.status(403).json({ error: 'that proof has run out. Start the claim again for a fresh code.' }); return; }
      let page;
      try { page = await pageOf(given); }
      catch (e) { res.status(503).json({ error: 'Giveth could not be reached to read that project. Nothing was claimed.' }); return; }
      if (!page) { res.status(404).json({ error: 'Giveth has no project with that address' }); return; }
      const said = (page.title + ' ' + page.description + ' ' + page.summary).toLowerCase();
      if (!said.includes(pend.code)) { res.status(409).json({ error: 'The code is not on the Giveth page yet. Giveth can take a minute to save it.', code: pend.code }); return; }
      const key = randomBytes(9).toString('base64url');
      doc.claim = { hash: sha(key), at: new Date().toISOString(), by: 'giveth-description' };
      doc.pending = [];
      await write(slug, doc);
      res.status(200).json({ key, note: 'This key waters seeds for this project. It is shown once and never stored.' });
      return;
    }

    if (act === 'water') {
      const key = clip(body.key, 80);
      if (!isSteward(doc, key)) { res.status(403).json({ error: 'that key does not water this project' }); return; }
      const seed = doc.seeds.find((s) => s.id === clip(body.seed, 40));
      if (!seed) { res.status(404).json({ error: 'no such seed' }); return; }
      const reply = clip(body.reply, 280);
      if (!reply) { res.status(400).json({ error: 'a reply needs a few words' }); return; }
      seed.water = {
        reply, from: clip(body.from, 40) || seed.title || 'the project', at: new Date().toISOString(),
        passTo: asGiveth(body.passTo) || null, passWhy: clip(body.passWhy, 140) || null,
      };
      seed.status = 'bloomed';
      await write(slug, doc);
      res.status(200).json({ seed: full(seed) });
      return;
    }
    // ── the answer: either side may keep speaking ──
    if (act === 'say') {
      const key = clip(body.key, 80);
      const seed = doc.seeds.find((s) => s.id === clip(body.seed, 40));
      if (!seed) { res.status(404).json({ error: 'no such seed' }); return; }
      const who = isSteward(doc, key) ? 'project' : isAuthor(seed, key) ? 'donor' : null;
      if (!who) { res.status(403).json({ error: 'that key does not speak here' }); return; }
      const text = clip(body.text, 280);
      if (!text) { res.status(400).json({ error: 'a few words' }); return; }
      seed.thread = (seed.thread || []).concat([{ who, text, at: new Date().toISOString() }]).slice(-20);
      await write(slug, doc);
      res.status(200).json({ seed: full(seed) });
      return;
    }
    // ── the author decides whether their words may be shown to anyone ──
    if (act === 'publish') {
      const key = clip(body.key, 80);
      const seed = doc.seeds.find((s) => s.id === clip(body.seed, 40));
      if (!seed) { res.status(404).json({ error: 'no such seed' }); return; }
      if (!isAuthor(seed, key)) { res.status(403).json({ error: 'only the person who wrote it can publish it' }); return; }
      seed.public = body.public === true;
      await write(slug, doc);
      res.status(200).json({ seed: full(seed) });
      return;
    }
    res.status(400).json({ error: 'read, plant, water, say, publish, confirm, claim or claim-prove' });
  } catch (e) {
    res.status(500).json({ error: 'the trace could not be reached', detail: String(e.message || e).slice(0, 120) });
  }
}
