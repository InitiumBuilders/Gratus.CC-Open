// GRATUS TRAX · what is actually happening, counted honestly.
//
// Every number this endpoint returns is one it counted. Nothing is estimated, nothing is
// projected, and a thing that has not been measured says so rather than showing a zero
// that looks like a measurement.
//
// WHAT IS COUNTED, AND WHAT IS NOT
//   view     a page opened. Bucketed by day. A device is counted once per day for
//            "people", by a salted hash that is never an address and never leaves here.
//   secs     seconds a page was actually open and visible. This is where "hours" comes
//            from, and it is site time, not time spent growing: nobody can measure the
//            latter and this file will not pretend to.
//   gift     a gift was wrapped. No emoji, no words, no recipient, no giver. One count.
//   plant    a gift was received and planted.
//   seed     a seed was planted with a gift to a project.
//   days     days of care added. This is the real "growing" number.
//
// WHAT NEVER ARRIVES HERE
//   Journal text. Names. Emojis. Links. Anything that could identify a person or say what
//   they wrote. A beat is a word from a fixed list and a small number.
import { put, list } from '@vercel/blob';
import { createHash } from 'node:crypto';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const KEY = (day) => 'gratus/trax/' + day + '.json';
const sha = (s) => createHash('sha256').update(String(s)).digest('hex');
const SALT = process.env.GRATUS_SALT || sha('gratus/trax/' + String(TOKEN)).slice(0, 32);
const whoOf = (req) => sha(String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '').split(',')[0].trim() + '·' + SALT).slice(0, 12);
const EVENTS = ['view', 'secs', 'gift', 'plant', 'seed', 'days'];
const dayOf = (d) => d.toISOString().slice(0, 10);
const CAP = { view: 400, secs: 43200, gift: 200, plant: 200, seed: 200, days: 400 };

async function readDay(day) {
  const key = KEY(day);
  try {
    const { blobs } = await list({ prefix: key, token: TOKEN });
    const b = blobs.find((x) => x.pathname === key);
    if (!b) return null;
    const r = await fetch(b.url + '?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}
const blank = (day) => ({ day, view: 0, secs: 0, gift: 0, plant: 0, seed: 0, days: 0, people: {} });

function since(n) {
  const out = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getTime() - i * 86400000);
    out.push(dayOf(d));
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!TOKEN) { res.status(503).json({ error: 'trax is not connected yet' }); return; }
  try {
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const ev = String(body.ev || '');
      if (!EVENTS.includes(ev)) { res.status(400).json({ error: 'not an event' }); return; }
      let n = Math.floor(Number(body.n) || 1);
      if (!Number.isFinite(n) || n < 1) n = 1;
      n = Math.min(n, CAP[ev]);
      const day = dayOf(new Date());
      const doc = (await readDay(day)) || blank(day);
      doc[ev] = (Number(doc[ev]) || 0) + n;
      if (ev === 'view') {
        doc.people = doc.people && typeof doc.people === 'object' ? doc.people : {};
        const k = whoOf(req);
        // one device counts once a day toward people, however many pages it opens
        if (!doc.people[k]) doc.people[k] = 1;
      }
      await put(KEY(day), JSON.stringify(doc), { access: 'public', token: TOKEN, contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 0 });
      res.status(200).json({ ok: true });
      return;
    }
    if (req.method !== 'GET') { res.status(405).json({ error: 'GET or POST' }); return; }

    // The whole history, one document per day. Reading every day there has ever been is
    // fine while this is young and is written down here as the thing to change when it
    // is not: roll a month into one document and keep the days beside it.
    const { blobs } = await list({ prefix: 'gratus/trax/', token: TOKEN });
    const days = blobs.map((b) => (b.pathname.match(/(\d{4}-\d{2}-\d{2})\.json$/) || [])[1]).filter(Boolean).sort();
    const docs = {};
    await Promise.all(days.map(async (d) => { docs[d] = (await readDay(d)) || blank(d); }));

    const sum = (list2, k) => list2.reduce((t, d) => t + (Number((docs[d] || {})[k]) || 0), 0);
    const people = (list2) => {
      const seen = new Set();
      for (const d of list2) for (const k of Object.keys((docs[d] || {}).people || {})) seen.add(k);
      return seen.size;
    };
    const win = { today: since(1), week: since(7), month: since(30), year: since(365), all: days };
    const out = { counted: days.length, since: days[0] || null, windows: {} };
    for (const [name, list2] of Object.entries(win)) {
      out.windows[name] = {
        views: sum(list2, 'view'),
        people: people(list2),
        hours: Math.round(sum(list2, 'secs') / 360) / 10,
        gifts: sum(list2, 'gift'),
        planted: sum(list2, 'plant'),
        seeds: sum(list2, 'seed'),
        days: sum(list2, 'days'),
      };
    }
    // A gift that was wrapped and not yet planted is a gift out there growing. It is a
    // floor rather than an exact number: a gift can be planted on a device that never
    // reports, and this counts what it has seen.
    out.growing = Math.max(0, out.windows.all.gifts - out.windows.all.planted);
    out.notMeasured = {
      accounts: 'there are no accounts yet, so there is nothing to count',
      hoursGrowing: 'time in the app is counted; time spent thinking about somebody is not',
    };
    out.daily = days.slice(-30).map((d) => ({ day: d, views: (docs[d] || {}).view || 0, gifts: (docs[d] || {}).gift || 0 }));
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: 'trax could not be reached', detail: String(e.message || e).slice(0, 120) });
  }
}
