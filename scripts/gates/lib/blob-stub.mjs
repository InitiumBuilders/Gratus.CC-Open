// A Vercel Blob that lives in memory.
//
// The auth gates call the real API handlers and assert what they answer. Without
// this they would need a deployment, a token and a network, and a gate that needs
// those is a gate nobody runs. With it they exercise the handler's own logic and
// nothing leaves the machine.
const MEM = new Map();

// A gate can put a wait in front of every put and list, as a real Blob round trip has, so requests sent at once
// interleave the way they do in production. Off unless a gate asks: __delay(() => ms), or __delay(null).
let DELAY = null;
const pause = async () => { if (DELAY) await new Promise((ok) => setTimeout(ok, DELAY())); };
// how many puts, lists and blob reads the handlers made, for a gate that weighs what a call costs the store
export const __COUNT = { put: 0, list: 0, fetch: 0 };
export function __delay(fn) { DELAY = typeof fn === 'function' ? fn : null; }
// A gate can hide paths from list, as the real store's list lags a few seconds behind a write: __hide(fn), where
// fn(pathname) is true for a path the list should not show yet, or __hide(null). head and reads still find it.
let HIDE = null;
export function __hide(fn) { HIDE = typeof fn === 'function' ? fn : null; }
// A gate can make a put fail, as a store that stumbles does: __failPut(fn), fn(pathname) true for a put that
// throws, or __failPut(null).
let FAIL_PUT = null;
export function __failPut(fn) { FAIL_PUT = typeof fn === 'function' ? fn : null; }

// Like the real store, a blob carries the time it was uploaded, and a blob written over gets a new one. A gate that
// edits MEM directly stands for someone writing over a blob, so a changed body gets a new time too.
const UPLOADED = new Map();
let tick = 0;
const uploadedAt = (k) => {
  const body = MEM.get(k);
  const u = UPLOADED.get(k);
  if (u && u.body === body) return u.at;
  const at = new Date(Date.UTC(2026, 0, 1) + ++tick).toISOString();
  UPLOADED.set(k, { body, at });
  return at;
};

export async function put(pathname, body, opts = {}) {
  await pause();
  __COUNT.put++;
  if (FAIL_PUT && FAIL_PUT(pathname)) throw new Error('Vercel Blob: the store did not answer.');
  // like the real store: a write with allowOverwrite false to a path already taken is refused, in one step
  if (opts.allowOverwrite === false && MEM.has(pathname)) throw new Error('Vercel Blob: This blob already exists, use `allowOverwrite: true` if you want to overwrite it.');
  MEM.set(pathname, String(body));
  UPLOADED.delete(pathname);
  uploadedAt(pathname);
  return { pathname, url: 'memory://' + pathname, downloadUrl: 'memory://' + pathname };
}
// A gate can make list answer in pages, as the real store does (at most 1000 blobs a call, in name order, with a
// cursor for the next page): __page(n) for pages of at most n, or __page(null) for one answer holding everything.
let PAGE = null;
export function __page(n) { PAGE = Number.isFinite(n) && n > 0 ? n : null; }
export async function list({ prefix, limit, cursor, mode } = {}) {
  await pause();
  __COUNT.list++;
  let keys = [...MEM.keys()].filter((k) => (!prefix || k.startsWith(prefix)) && !(HIDE && HIDE(k)));
  // mode 'folded', like the real one: what sits one level down is named as a folder, never listed blob by blob
  let folders;
  if (mode === 'folded') {
    const p = prefix || '';
    const f = new Set();
    keys = keys.filter((k) => { const i = k.indexOf('/', p.length); if (i < 0) return true; f.add(k.slice(0, i + 1)); return false; });
    folders = [...f].sort();
  }
  let hasMore = false, next;
  if (PAGE) {
    keys.sort();
    const from = Number(cursor) || 0;
    const size = Math.min(Number(limit) || 1000, PAGE);
    hasMore = from + size < keys.length;
    next = hasMore ? String(from + size) : undefined;
    keys = keys.slice(from, from + size);
  }
  const blobs = keys.map((k) => ({ pathname: k, url: 'memory://' + k, size: MEM.get(k).length, uploadedAt: uploadedAt(k) }));
  return Object.assign({ blobs }, folders ? { folders } : {}, PAGE ? { hasMore, cursor: next } : {});
}
// like the real one: a URL or a pathname, one or many
export async function del(p) { for (const x of (Array.isArray(p) ? p : [p])) { const k = String(x).replace(/^memory:\/\//, '').split('?')[0]; MEM.delete(k); UPLOADED.delete(k); } }
export async function head(p) { return MEM.has(p) ? { pathname: p, url: 'memory://' + p, size: MEM.get(p).length, uploadedAt: uploadedAt(p) } : null; }
export const __MEM = MEM;

// A gate may lend Giveth a voice, because the claim and the confirm are now decided by
// what Giveth says and a gate that cannot answer for it cannot test either one. Nothing
// is registered by default, so the rule below still holds: no gate reaches the internet.
let GIVETH = null;
export function __giveth(fn) { GIVETH = fn; }

// the handlers read a blob back over fetch, so memory:// has to answer
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.startsWith('memory://')) {
    const key = u.slice('memory://'.length).split('?')[0];
    __COUNT.fetch++;
    if (!MEM.has(key)) return { ok: false, status: 404, json: async () => ({}) };
    const body = MEM.get(key);
    return { ok: true, status: 200, json: async () => JSON.parse(body), text: async () => body };
  }
  if (u.startsWith('https://mainnet.serve.giveth.io')) {
    if (!GIVETH) return { ok: false, status: 599, json: async () => ({ error: 'the gate blocked giveth; register one with __giveth()' }) };
    let sent = {};
    try { sent = JSON.parse((init && init.body) || '{}'); } catch (e) {}
    const out = await GIVETH(sent);
    return { ok: true, status: 200, json: async () => out, text: async () => JSON.stringify(out) };
  }
  // a gate must never reach the internet: anything else is refused out loud
  if (/^https?:/i.test(u)) {
    return { ok: false, status: 599, json: async () => ({ error: 'the gate blocked an outbound request to ' + u.slice(0, 60) }) };
  }
  return realFetch(url, init);
};
