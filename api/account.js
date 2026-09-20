// GRATUS ACCOUNTS · an account that cannot read your journal.
//
// Everything this app has printed on every page since the beginning says the same thing:
// your journal never leaves your device. An account that uploaded it would make that a
// lie, so this one does not upload it. It uploads a box nobody here has the key to.
//
// HOW IT WORKS
//   The password does two separate jobs and never the same one twice.
//     1. On the server, scrypt(password, per-account salt, pepper) is the login check.
//        The pepper is GRATUS_SALT, which lives in the environment and never in the store,
//        so a leaked record cannot be attacked offline without also stealing the secret.
//     2. On the device, PBKDF2 over the same password derives an AES-GCM key that never
//        leaves the browser. The garden is encrypted there and arrives here as ciphertext.
//        This file cannot decrypt it. Neither can anybody who reads the store.
//
// WHAT IS KEPT
//   A salted hash of the email, never the email. We cannot write to you, and we say so:
//   there is no password reset, because a reset we could perform is a door we could be
//   made to open. Losing the password loses the vault, and the app says that at signup.
//
// WHAT IS PUBLIC
//   Only a profile somebody chose to publish: a handle, a name, a line, and the shape of
//   their garden. Never an entry, never an email, never a day of anybody's writing.
import { put, list } from '@vercel/blob';
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const sha = (s) => createHash('sha256').update(String(s)).digest('hex');
const PEPPER = process.env.GRATUS_SALT || sha('gratus/acct/' + String(TOKEN)).slice(0, 32);

const ACCT = (id) => 'gratus/acct/' + id + '.json';
const VAULT = (id) => 'gratus/vault/' + id + '.json';
const HANDLE = (h) => 'gratus/handle/' + h + '.json';
const RATE = () => 'gratus/acct/_tries/' + new Date().toISOString().slice(0, 10) + '.json';

const clip = (v, n) => (typeof v === 'string' ? v : '').replace(/[<>]/g, '').trim().slice(0, n);
const emailOk = (e) => /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(e) && e.length <= 160;
const handleOk = (h) => /^[a-z0-9][a-z0-9-]{2,23}$/.test(h);
const idOf = (email) => sha(String(email).toLowerCase().trim() + '·' + PEPPER).slice(0, 40);
const whoOf = (req) => sha(String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '').split(',')[0].trim() + '·' + PEPPER).slice(0, 16);

// handles nobody gets to take
const RESERVED = new Set(['app', 'api', 'docs', 'admin', 'gratus', 'about', 'help', 'support',
  'trax', 'gift', 'give', 'grow', 'story', 'the-story', 'give-and-grow', 'passage', 'guided',
  'privacy', 'terms', 'security', 'login', 'signin', 'signup', 'account', 'settings', 'you', 'gg']);

async function readJson(key) {
  try {
    const { blobs } = await list({ prefix: key, token: TOKEN });
    const b = blobs.find((x) => x.pathname === key);
    if (!b) return null;
    const r = await fetch(b.url + '?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}
const writeJson = (key, doc) => put(key, JSON.stringify(doc), {
  access: 'public', token: TOKEN, contentType: 'application/json',
  addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 0,
});

const hashPw = (pw, salt) => scryptSync(String(pw) + '·' + PEPPER, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
function samePw(pw, rec) {
  try {
    const a = Buffer.from(hashPw(pw, rec.salt), 'hex');
    const b = Buffer.from(String(rec.pw), 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  } catch (e) { return false; }
}

// A session is a signed sentence, not a secret to look up: id, when it expires, and an
// HMAC over both. Nothing about a session is stored, so nothing about one can leak.
const SESSION_MS = 30 * 86400000;
function mint(id) {
  const exp = Date.now() + SESSION_MS;
  const body = id + '.' + exp;
  return body + '.' + createHmac('sha256', PEPPER).update(body).digest('hex').slice(0, 32);
}
function readToken(t) {
  const parts = String(t || '').split('.');
  if (parts.length !== 3) return null;
  const [id, exp, mac] = parts;
  const want = createHmac('sha256', PEPPER).update(id + '.' + exp).digest('hex').slice(0, 32);
  if (mac.length !== want.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return null;
  if (Number(exp) < Date.now()) return null;
  return id;
}

// Guessing a password is expensive here on purpose, and guessing a lot of them from one
// place is refused outright.
async function tries(req, add) {
  const key = RATE();
  const d = (await readJson(key)) || { who: {} };
  const k = whoOf(req);
  const n = Number(d.who[k]) || 0;
  if (n >= 20) return false;
  if (add) { d.who[k] = n + 1; try { await writeJson(key, d); } catch (e) {} }
  return true;
}

const publicProfile = (rec) => ({
  handle: rec.handle, name: rec.profile && rec.profile.name ? rec.profile.name : rec.handle,
  line: (rec.profile && rec.profile.line) || '', garden: (rec.profile && rec.profile.garden) || null,
  since: rec.made ? String(rec.made).slice(0, 10) : null,
});

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!TOKEN) { res.status(503).json({ error: 'accounts are not connected yet' }); return; }
  try {
    // a public profile, by handle. The only thing here anybody can read without a session.
    if (req.method === 'GET') {
      const h = clip(req.query.handle, 24).toLowerCase();
      if (!handleOk(h)) { res.status(400).json({ error: 'not a handle' }); return; }
      const map = await readJson(HANDLE(h));
      if (!map || !map.id) { res.status(404).json({ error: 'no such profile' }); return; }
      const rec = await readJson(ACCT(map.id));
      if (!rec || !rec.profile || rec.profile.published !== true) { res.status(404).json({ error: 'no such profile' }); return; }
      res.status(200).json({ profile: publicProfile(rec) });
      return;
    }
    if (req.method !== 'POST') { res.status(405).json({ error: 'GET or POST' }); return; }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const act = String(body.act || '');

    if (act === 'handle-free') {
      const h = clip(body.handle, 24).toLowerCase();
      if (!handleOk(h)) { res.status(200).json({ free: false, why: 'Three to twenty-four letters, numbers or hyphens.' }); return; }
      if (RESERVED.has(h)) { res.status(200).json({ free: false, why: 'That one is spoken for.' }); return; }
      res.status(200).json({ free: !(await readJson(HANDLE(h))) });
      return;
    }

    if (act === 'signup') {
      if (!(await tries(req, true))) { res.status(429).json({ error: 'too many attempts from here today' }); return; }
      const email = clip(body.email, 160).toLowerCase();
      const pw = String(body.password || '');
      const h = clip(body.handle, 24).toLowerCase();
      if (!emailOk(email)) { res.status(400).json({ error: 'that does not look like an email address' }); return; }
      if (pw.length < 10) { res.status(400).json({ error: 'a password of at least ten characters' }); return; }
      if (!handleOk(h) || RESERVED.has(h)) { res.status(400).json({ error: 'that handle is not available' }); return; }
      const id = idOf(email);
      if (await readJson(ACCT(id))) { res.status(409).json({ error: 'there is already an account for that address' }); return; }
      if (await readJson(HANDLE(h))) { res.status(409).json({ error: 'that handle is taken' }); return; }
      const salt = randomBytes(16).toString('hex');
      const rec = {
        id, salt, pw: hashPw(pw, salt), handle: h, made: new Date().toISOString(),
        profile: { name: clip(body.name, 40) || h, line: '', published: false, garden: null },
      };
      await writeJson(ACCT(id), rec);
      await writeJson(HANDLE(h), { id, handle: h });
      res.status(200).json({ token: mint(id), handle: h, profile: publicProfile(rec) });
      return;
    }

    if (act === 'signin') {
      if (!(await tries(req, true))) { res.status(429).json({ error: 'too many attempts from here today' }); return; }
      const email = clip(body.email, 160).toLowerCase();
      const pw = String(body.password || '');
      const rec = emailOk(email) ? await readJson(ACCT(idOf(email))) : null;
      // the same answer either way, so this cannot be used to ask whether somebody is here
      if (!rec || !samePw(pw, rec)) { res.status(401).json({ error: 'that address and password do not match' }); return; }
      res.status(200).json({ token: mint(rec.id), handle: rec.handle, profile: publicProfile(rec) });
      return;
    }

    const id = readToken(body.token);
    if (!id) { res.status(401).json({ error: 'sign in again' }); return; }
    const rec = await readJson(ACCT(id));
    if (!rec) { res.status(401).json({ error: 'sign in again' }); return; }

    if (act === 'save') {
      // ciphertext only. If this ever receives something that is not a sealed box, it is
      // a bug in the client and refusing it here is the last place to catch it.
      const v = body.vault || {};
      if (typeof v.ct !== 'string' || typeof v.iv !== 'string' || typeof v.kdf !== 'object') {
        res.status(400).json({ error: 'a vault arrives sealed or it does not arrive' }); return;
      }
      if (v.ct.length > 4_000_000) { res.status(413).json({ error: 'that garden is larger than the vault holds' }); return; }
      await writeJson(VAULT(id), { ct: v.ct, iv: v.iv, kdf: v.kdf, at: new Date().toISOString() });
      res.status(200).json({ ok: true, at: new Date().toISOString() });
      return;
    }
    if (act === 'load') {
      const v = await readJson(VAULT(id));
      if (!v) { res.status(404).json({ error: 'nothing saved yet' }); return; }
      res.status(200).json({ vault: v });
      return;
    }
    if (act === 'profile') {
      rec.profile = rec.profile || {};
      if (typeof body.name === 'string') rec.profile.name = clip(body.name, 40) || rec.handle;
      if (typeof body.line === 'string') rec.profile.line = clip(body.line, 140);
      if (typeof body.published === 'boolean') rec.profile.published = body.published;
      // the shape of a garden, never its words
      if (body.garden && typeof body.garden === 'object') {
        rec.profile.garden = {
          plants: Math.max(0, Math.min(9999, Math.floor(Number(body.garden.plants) || 0))),
          days: Math.max(0, Math.min(999999, Math.floor(Number(body.garden.days) || 0))),
          ready: Math.max(0, Math.min(9999, Math.floor(Number(body.garden.ready) || 0))),
          faces: Array.isArray(body.garden.faces) ? body.garden.faces.slice(0, 12).map((x) => clip(x, 8)) : [],
        };
      }
      await writeJson(ACCT(id), rec);
      res.status(200).json({ profile: publicProfile(rec) });
      return;
    }
    if (act === 'me') { res.status(200).json({ handle: rec.handle, profile: publicProfile(rec), published: !!(rec.profile && rec.profile.published) }); return; }

    res.status(400).json({ error: 'signup, signin, save, load, profile, me or handle-free' });
  } catch (e) {
    res.status(500).json({ error: 'accounts could not be reached', detail: String(e.message || e).slice(0, 120) });
  }
}
