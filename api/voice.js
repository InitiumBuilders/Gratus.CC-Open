// GRATUS VOICE · speech to text through ElevenLabs. The key lives in the environment, never in a file, never in the client.
// A recording arrives as the raw request body (audio/webm, audio/mp4 or audio/ogg) and leaves as { text, language }.
// The recording itself is not kept here; it stays on the person's device.
export const config = { api: { bodyParser: false } };

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
