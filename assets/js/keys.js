// Device keys for PAXT lines. A person signs with a key that lives on their own device, made by WebCrypto with the
// private half marked non-extractable, so no script (ours included) can read it out. The key is kept in IndexedDB
// so the same key comes back on the next visit.
//
// The key and its signatures follow the device-key format every PAXT app shares (engine/vendor/paxt-suites.js):
//   - Ed25519 wherever WebCrypto can make it: the address is did:key:z6Mk..., the signature its 64 bytes;
//   - otherwise P-256 ECDSA (Safari before 17, for one): the address is did:key:zDn..., the signature r then s,
//     with s moved to the lower half (p256LowS), the one spelling the check accepts.
// Either way a key signs DEVICE_PREFIX + line (signedBytes in engine/paxt.js), and the signature travels as
// unpadded base64url.
//
// One key per PAXT id. A key made for one PAXT never signs a line for another, so two PAXTs cannot be linked by
// the key that joined them.
//
// The storage layer is injectable ({ get, put, del }) so Node tests can pass a Map-backed store. In a browser
// the default is IndexedDB database 'gratus-keys', object store 'paxt', keyed by the PAXT id. A row holds
// { kind, privateKey, publicKey, address }.
import {
  signedBytes, parseLine, toBase64url, didKeyAddress, p256DidKey, p256LowS,
} from '../../engine/paxt.js?v=1';

export const DB_NAME = 'gratus-keys';
export const STORE = 'paxt';
const ED = { name: 'Ed25519' };
const EC = { name: 'ECDSA', namedCurve: 'P-256' };
const EC_SIGN = { name: 'ECDSA', hash: 'SHA-256' };
export const KINDS = Object.freeze(['ed25519', 'p256']);
const MAX_ID = 200;

/* ------------------------------------------------------------------ support */

// Whether this subtle can make a key of either kind. The only honest test is to make one: a browser can expose
// crypto.subtle and still not know a curve.
async function probe(subtle) {
  if (!subtle || typeof subtle.generateKey !== 'function') return false;
  for (const alg of [ED, EC]) {
    try {
      const pair = await subtle.generateKey(alg, false, ['sign', 'verify']);
      if (pair && pair.privateKey && pair.publicKey) return true;
    } catch { /* this curve is missing; try the next */ }
  }
  return false;
}

let askedOnce = null;

/** True when this device can make and keep a signing key: WebCrypto with Ed25519 or P-256, and IndexedDB.
    Async because the test makes a throwaway key pair. The answer cannot change while a page is open, so the
    page asks once: called with no argument, the first answer is kept and handed back after that. Tests pass
    env ({ subtle, indexedDB }) and are asked fresh every time. False means the page should say plainly that
    this device cannot sign. */
export function supported(env) {
  if (env === undefined) return askedOnce ??= check({});
  return check(env);
}

async function check(env) {
  // an explicit undefined means "this device has none", so it must not fall back to the globals
  const subtle = 'subtle' in env ? env.subtle : globalThis.crypto?.subtle;
  const indexedDB = 'indexedDB' in env ? env.indexedDB : globalThis.indexedDB;
  if (!indexedDB || typeof indexedDB.open !== 'function') return false;
  if ((await opens(indexedDB, env.waitMs ?? 3000)) === false) return false;
  return probe(subtle);
}

// Whether the key store opens at all. Some browsers have IndexedDB and refuse to open it (older Firefox private
// windows, Chrome with all site data blocked), and a person should learn that before they type a name and press
// Join. It opens the same database keys.js uses, at the same version, makes its store if it is new, and closes.
// True when it opens, false when the browser refuses it, and null when there is no answer in waitMs or another tab
// holds it. A wait is not a refusal: "Start over" in another tab makes the open wait on its delete, and the page
// keeps its first answer, so a wait read as false would tell a modern browser to find a newer one until a reload.
function opens(idb, waitMs) {
  return new Promise((done) => {
    const t = setTimeout(() => done(null), waitMs);
    const end = (v) => { clearTimeout(t); done(v); };
    let req;
    try { req = idb.open(DB_NAME, 1); } catch (e) { end(false); return; }
    if (!req) { end(false); return; }
    req.onupgradeneeded = () => { try { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); } catch (e) { /* the success or error below decides */ } };
    req.onsuccess = () => { try { req.result.close(); } catch (e) { /* nothing to close */ } end(true); };
    req.onerror = () => end(false);
    req.onblocked = () => end(null);
  });
}

/* ------------------------------------------------------------------ storage */

/** a store backed by a Map, for tests and for anywhere IndexedDB is absent on purpose */
export function mapStore(map = new Map()) {
  return {
    async get(id) { return map.get(id); },
    // add, never overwrite: a key that already exists for this PAXT must win, or a person could lose the key
    // their signature was made with
    async put(id, value) { if (map.has(id)) return false; map.set(id, value); return true; },
    async del(id) { map.delete(id); },
  };
}

/** the browser store: IndexedDB 'gratus-keys' / 'paxt'. CryptoKey objects survive IndexedDB's structured
    clone with their non-extractable flag intact, which is why the pair is stored as is and never exported. */
export function idbStore(idb = globalThis.indexedDB) {
  let opening = null;
  const open = () => opening ??= new Promise((resolve, reject) => {
    const req = idb.open(DB_NAME, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
    req.onsuccess = () => {
      const db = req.result;
      // "Start over" deletes this database, in this tab or another, and a delete waits for every open connection
      // to close. So the connection closes as soon as a delete asks, and the next call opens a fresh one.
      db.onversionchange = () => { try { db.close(); } catch (e) { /* already closed */ } opening = null; };
      resolve(db);
    };
    req.onerror = () => { opening = null; reject(req.error); };
    // another tab holds an older version open: say so rather than leave the caller waiting
    req.onblocked = () => { opening = null; reject(new Error('The key store is held open by another tab.')); };
  });
  const run = async (mode, fn) => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      let value;
      req.onsuccess = () => { value = req.result; };
      tx.oncomplete = () => resolve(value);
      tx.onerror = (ev) => {
        // add() on a taken id: another tab made this PAXT's key first. Not an error, theirs is kept.
        if (req.error && req.error.name === 'ConstraintError') { ev.preventDefault(); resolve(false); return; }
        reject(tx.error || req.error);
      };
      tx.onabort = () => reject(tx.error || req.error);
    });
  };
  return {
    get: (id) => run('readonly', (s) => s.get(id)),
    put: async (id, value) => (await run('readwrite', (s) => s.add(value, id))) !== false,
    del: (id) => run('readwrite', (s) => s.delete(id)),
  };
}

/* ------------------------------------------------------------------ the keyring */

function checkId(paxtId) {
  if (typeof paxtId !== 'string' || !paxtId || paxtId.length > MAX_ID) throw new TypeError('A PAXT id is a short, non-empty string.');
}

/** a stored row this keyring can sign with: { kind, privateKey, publicKey, address } */
function looksLikeKey(v) {
  return !!(v && typeof v === 'object' && KINDS.includes(v.kind) && v.privateKey && v.publicKey
    && typeof v.address === 'string' && v.address.startsWith('did:key:z'));
}

// The browser's own call, made once after the first key: it asks the browser to keep this site's storage when
// space runs short. Never waited on, and its answer is not read: a key works the same either way.
function askToPersist() {
  return globalThis.navigator?.storage?.persist?.();
}

/** A keyring over one store. keyFor, has and forget below use a default one over IndexedDB. */
export function keyring({ store, subtle = globalThis.crypto?.subtle, persist = askToPersist } = {}) {
  let st = store;
  const storeOf = () => st ??= idbStore();
  // a second keyFor for the same id while the first is still making the key waits for it, so one page never
  // makes two keys for one PAXT
  const pending = new Map();
  let persistAsked = false;

  // Ed25519 when this device can make it, otherwise P-256. Both private keys are non-extractable.
  async function make() {
    try {
      const pair = await subtle.generateKey(ED, false, ['sign', 'verify']);
      const raw = new Uint8Array(await subtle.exportKey('raw', pair.publicKey));
      return { kind: 'ed25519', privateKey: pair.privateKey, publicKey: pair.publicKey, address: 'did:key:' + didKeyAddress('ed25519', raw) };
    } catch { /* no Ed25519 here: P-256 below */ }
    const pair = await subtle.generateKey(EC, false, ['sign', 'verify']);
    const point = p256DidKey(new Uint8Array(await subtle.exportKey('raw', pair.publicKey)));
    if (!point) throw new Error('This device made a P-256 key the suites cannot name.');
    return { kind: 'p256', privateKey: pair.privateKey, publicKey: pair.publicKey, address: 'did:key:' + point };
  }

  async function load(paxtId) {
    const s = storeOf();
    let row = await s.get(paxtId);
    if (!looksLikeKey(row)) {
      // a row that is not a whole key (damaged, foreign, or from before keys carried a kind and an address) is
      // cleared and a new key made, never used
      if (row !== undefined) await s.del(paxtId);
      const made = await make();
      const kept = await s.put(paxtId, made);
      if (kept && !persistAsked) {
        persistAsked = true;
        try { Promise.resolve(persist()).catch(() => {}); } catch { /* the browser has no such call */ }
      }
      // read back whatever is stored: if another tab won the race, its key is the one to use
      row = await s.get(paxtId);
      if (!looksLikeKey(row)) throw new Error('The signing key could not be kept on this device.');
    }
    const { kind, privateKey, address } = row;
    async function sign(line) {
      const parsed = typeof line === 'string' ? parseLine(line) : null;
      if (!parsed) throw new TypeError('Only a PAXT line can be signed.');
      if (parsed.id !== paxtId) throw new Error('This key belongs to another PAXT.');
      if (kind === 'ed25519') return toBase64url(new Uint8Array(await subtle.sign(ED, privateKey, signedBytes(line))));
      // WebCrypto hands back either half for s; the shared format takes the lower one only
      return toBase64url(p256LowS(new Uint8Array(await subtle.sign(EC_SIGN, privateKey, signedBytes(line)))));
    }
    return Object.freeze({ kind, address, sign });
  }

  /** this device's key for one PAXT: { kind, address, sign(line) }. Made on first use, the same one after that. */
  function keyFor(paxtId) {
    checkId(paxtId);
    if (!subtle) return Promise.reject(new Error('This device cannot sign.'));
    if (!pending.has(paxtId)) {
      const p = load(paxtId).finally(() => pending.delete(paxtId));
      pending.set(paxtId, p);
    }
    return pending.get(paxtId);
  }

  /** Whether this device still holds a key for one PAXT. It never makes one. A browser can delete a site's
      storage (Safari does after seven days without a visit), so a device that joined can find its key gone. */
  async function has(paxtId) {
    checkId(paxtId);
    return looksLikeKey(await storeOf().get(paxtId));
  }

  /** drop this device's key for one PAXT. Signatures already in a record stay valid; this device just can
      no longer add to them. */
  async function forget(paxtId) {
    checkId(paxtId);
    await storeOf().del(paxtId);
  }

  return { keyFor, has, forget };
}

let shared = null;
const defaultRing = () => shared ??= keyring();

/** this device's key for one PAXT, kept in IndexedDB: Promise<{ kind, address, sign(line) }> */
export function keyFor(paxtId) { return defaultRing().keyFor(paxtId); }

/** whether this device still holds its key for one PAXT, without making one: Promise<boolean> */
export function has(paxtId) { return defaultRing().has(paxtId); }

/** remove this device's key for one PAXT from IndexedDB */
export function forget(paxtId) { return defaultRing().forget(paxtId); }
