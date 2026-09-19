// GRATUS VOICE · speech to text through ElevenLabs. The key lives in the environment, never in a file, never in the client.
// A recording arrives as the raw request body (audio/webm, audio/mp4 or audio/ogg) and leaves as { text, language }.
// The recording itself is not kept here; it stays on the person's device.
export const config = { api: { bodyParser: false } };

// ── the allowance ──
// Transcription costs real money on a real account, and before v20 this endpoint
// had no ceiling of any kind. One day's counters live in one Blob document:
// gratus/voice/<YYYY-MM-DD>.json = { total, who: { <hash>: n } }. The IP is never
// stored, only a salted hash of it, and the document is a day old at most.
// Known limit: read-modify-write, so requests landing in the same instant can
// undercount. It is a soft ceiling against runaway spend, not an exact meter.
import { put, list } from '@vercel/blob';
import { createHash } from 'node:crypto';
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const PER_DEVICE = 40;   // recordings per device per day
const PER_DAY = 600;     // recordings across everyone per day
const dayDoc = () => 'gratus/voice/' + new Date().toISOString().slice(0, 10) + '.json';
const whoOf = (req) => createHash('sha256')
  .update(String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '').split(',')[0].trim() + '\u00b7gratus-voice')
  .digest('hex').slice(0, 16);

async function readDay() {
  const key = dayDoc();
  const { blobs } = await list({ prefix: key, token: TOKEN });
  const b = blobs.find((x) => x.pathname === key);
  if (!b) return { total: 0, who: {} };
  const r = await fetch(b.url + '?t=' + Date.now(), { cache: 'no-store' });
  if (!r.ok) return { total: 0, who: {} };
  return await r.json();
}
// reserve BEFORE the call to ElevenLabs: a failed transcription costs nothing,
// but a flood of parallel ones would, and a ceiling applied afterwards is not one.
async function reserve(req) {
  if (!TOKEN) return { ok: true, counted: false };
  let d;
  try { d = await readDay(); } catch (e) { return { ok: true, counted: false }; }
  const k = whoOf(req);
  const mine = Number(d.who && d.who[k]) || 0;
  if (Number(d.total) >= PER_DAY) return { ok: false, why: 'Gratus has transcribed a great deal today. Voice comes back tomorrow; your words can still be typed.' };
  if (mine >= PER_DEVICE) return { ok: false, why: 'That is as much voice as one device gets in a day. Type the rest, or come to it tomorrow.' };
  d.total = (Number(d.total) || 0) + 1;
  d.who = d.who || {}; d.who[k] = mine + 1;
  try { await put(dayDoc(), JSON.stringify(d), { access: 'public', token: TOKEN, contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 0 }); }
  catch (e) { return { ok: true, counted: false }; }
  return { ok: true, counted: true };
}

const ORIGINS = ['https://www.gratus.cc', 'https://gratus.cc', 'https://gratus-in-motus.vercel.app', 'https://grow-gratus-cc.vercel.app'];
const MAX = 6_000_000; // about two minutes of opus

function fromGratus(req) {
  const o = req.headers.origin || '';
  const ok = !o || ORIGINS.includes(o) || /^http:\/\/localhost(:\d+)?$/.test(o) || /\.vercel\.app$/.test(o);
  return ok && req.headers['x-gratus'] === 'voice';
}
async function body(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body, 'binary');
  const chunks = []; for await (const c of req) chunks.push(c); return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST a recording' }); return; }
  if (!fromGratus(req)) { res.status(403).json({ error: 'not from Gratus' }); return; }
  const key = process.env.ELEVENLABS_API_KEY; if (!key) { res.status(503).json({ error: 'voice is not configured' }); return; }
  let buf; try { buf = await body(req); } catch (e) { res.status(400).json({ error: 'could not read the recording' }); return; }
  if (!buf || !buf.length) { res.status(400).json({ error: 'no audio' }); return; }
  if (buf.length > MAX) { res.status(413).json({ error: 'too long' }); return; }
  const allow = await reserve(req);
  if (!allow.ok) { res.status(429).json({ error: allow.why }); return; }
  const type = String(req.headers['content-type'] || 'audio/webm').split(';')[0].trim();
  const ext = type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : type.includes('mpeg') ? 'mp3' : type.includes('wav') ? 'wav' : 'webm';
  const fd = new FormData();
  fd.append('model_id', 'scribe_v1');
  fd.append('tag_audio_events', 'false');
  fd.append('file', new Blob([buf], { type }), 'voice.' + ext);
  let r;
  try { r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': key }, body: fd }); }
  catch (e) { res.status(502).json({ error: 'voice service unreachable' }); return; }
  if (!r.ok) { res.status(502).json({ error: 'transcription failed', status: r.status }); return; }
  const j = await r.json();
  res.status(200).json({ text: String(j.text || '').trim(), language: j.language_code || null });
}
