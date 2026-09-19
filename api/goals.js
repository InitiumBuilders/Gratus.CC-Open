// GRATUS GOALS · the stream. One shared list on Vercel Blob: what people are growing toward.
// No accounts. A goal is a line, a name, an emoji and a time. Nothing else ever arrives here.
//
// The list used to keep its last five hundred lines on every write and drop the rest, so the
// person who posted the five hundred and first erased the first, and the stream quietly ate
// its own beginning. Overflow now moves to a page of its own and is kept.
import { put, list } from '@vercel/blob';
import { createHash } from 'node:crypto';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const PATH = 'gratus/goals/feed.json';
const PAGE = (n) => 'gratus/goals/p' + n + '.json';
const CAP_PAGE = 500;    // lines kept in the live feed before the older ones move to a page
const CAP_CALLER = 8;    // lines one caller may add in a day
const DEDUPE = 300000;
const clip = (v, n) => (typeof v === 'string' ? v : '').replace(/[<>]/g, '').trim().slice(0, n);
const rand = () => Math.random().toString(36).slice(2, 10);
const sha = (s) => createHash('sha256').update(String(s)).digest('hex');
// a salted hash of the caller, never the caller. The salt is a real secret, so this
// document cannot be turned back into the list of addresses that wrote it.
const SALT = process.env.GRATUS_SALT || sha('gratus/goals/' + String(TOKEN)).slice(0, 32);
const whoOf = (req) => sha(String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '').split(',')[0].trim() + '·' + SALT).slice(0, 16);

// The feed began life as a bare array and some of it is stored that way. Both shapes read.
async function read() {
  const { blobs } = await list({ prefix: PATH, token: TOKEN });
  const b = blobs.find((x) => x.pathname === PATH);
  if (!b) return { goals: [], rate: {}, pages: 0, archived: 0 };
  const r = await fetch(b.url + '?t=' + Date.now(), { cache: 'no-store' });
  try {
    const j = await r.json();
    if (Array.isArray(j)) return { goals: j, rate: {}, pages: 0, archived: 0 };
    return {
      goals: Array.isArray(j.goals) ? j.goals : [], rate: j.rate && typeof j.rate === 'object' ? j.rate : {},
      pages: Number(j.pages) || 0, archived: Number(j.archived) || 0,
    };
  } catch (e) { return { goals: [], rate: {}, pages: 0, archived: 0 }; }
}
const save = (doc) => put(PATH, JSON.stringify(doc), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 0, token: TOKEN });

async function rollover(doc) {
  if (doc.goals.length <= CAP_PAGE) return;
  const keep = doc.goals.slice(-Math.floor(CAP_PAGE / 2));
  const move = doc.goals.slice(0, doc.goals.length - keep.length);
  if (!move.length) return;
  const n = (doc.pages || 0) + 1;
  await put(PAGE(n), JSON.stringify({ page: n, goals: move }), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 0, token: TOKEN });
  doc.pages = n;
  doc.archived = (doc.archived || 0) + move.length;
  doc.goals = keep;
}

function allow(doc, who) {
  const day = new Date().toISOString().slice(0, 10);
  const r = doc.rate || {};
  for (const k of Object.keys(r)) if (!r[k] || r[k].day !== day) delete r[k];
  const mine = r[who] && r[who].day === day ? Number(r[who].n) || 0 : 0;
  if (mine >= CAP_CALLER) return false;
  r[who] = { day, n: mine + 1 };
  doc.rate = r;
  return true;
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (!TOKEN) return res.status(503).json({ ok: false, error: 'no store' });
  if (req.method === 'GET') { const doc = await read(); return res.status(200).json({ ok: true, goals: doc.goals.slice(-80).reverse(), kept: doc.goals.length + (doc.archived || 0) }); }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });
  let b = req.body || {}; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  const text = clip(b.text, 160); const name = clip(b.name, 40) || 'Someone'; const emoji = clip(b.emoji, 16) || '🌱';
  if (!text) return res.status(400).json({ ok: false, error: 'empty' });
  const doc = await read();
  const now = Date.now();
  const twin = doc.goals.find((g) => g.text === text && g.name === name && now - new Date(g.at).getTime() < DEDUPE);
  if (twin) return res.status(200).json({ ok: true, goal: twin, note: 'already said' });
  if (!allow(doc, whoOf(req))) return res.status(429).json({ ok: false, error: 'that is as many as one person adds to the stream in a day. Tomorrow it opens again.' });
  const goal = { id: 'goal_' + rand(), text, name, emoji, at: new Date().toISOString() };
  // last writer wins on a busy second; a lost goal stays on the device and posts again next open
  doc.goals = doc.goals.concat([goal]);
  try { await rollover(doc); } catch (e) { /* keep every line; a long feed is the lesser fault */ }
  await save(doc);
  return res.status(200).json({ ok: true, goal });
}
