// GRATUS GOALS · the stream. One shared list on Vercel Blob: what people are growing toward.
// No accounts. A goal is a line, a name, an emoji and a time. Nothing else ever arrives here.
import { put, list } from '@vercel/blob';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const PATH = 'gratus/goals/feed.json';
const clip = (v, n) => (typeof v === 'string' ? v : '').replace(/[<>]/g, '').trim().slice(0, n);
const rand = () => Math.random().toString(36).slice(2, 10);
async function read() {
  const { blobs } = await list({ prefix: PATH, token: TOKEN });
  const b = blobs.find((x) => x.pathname === PATH); if (!b) return [];
  const r = await fetch(b.url + '?t=' + Date.now(), { cache: 'no-store' });
  try { const j = await r.json(); return Array.isArray(j) ? j : []; } catch (e) { return []; }
}
export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (!TOKEN) return res.status(503).json({ ok: false, error: 'no store' });
  if (req.method === 'GET') { const goals = await read(); return res.status(200).json({ ok: true, goals: goals.slice(-80).reverse() }); }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });
  let b = req.body || {}; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  const text = clip(b.text, 160); const name = clip(b.name, 40) || 'Someone'; const emoji = clip(b.emoji, 16) || '🌱';
  if (!text) return res.status(400).json({ ok: false, error: 'empty' });
  const goal = { id: 'goal_' + rand(), text, name, emoji, at: new Date().toISOString() };
  // last writer wins on a busy second; a lost goal stays on the device and posts again next open
  const goals = (await read()).concat([goal]).slice(-500);
  await put(PATH, JSON.stringify(goals), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 0, token: TOKEN });
  return res.status(200).json({ ok: true, goal });
}
