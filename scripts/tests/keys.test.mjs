// keys.js keeps one signing key per PAXT on the device. These checks run it over a Map-backed store, since Node
// has no IndexedDB, and prove what a person relies on: the key is made once and comes back, each PAXT gets its
// own, what it signs passes the shared suites' verifyAccount (Ed25519, and P-256 where a device has no Ed25519),
// forget removes it, has() answers without making a key, and a device with neither curve says so.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../../engine/paxt.js';
import * as S from '../../engine/vendor/paxt-suites.js';
import { keyring, mapStore, supported, idbStore } from '../../assets/js/keys.js';

const DIGEST = 'a'.repeat(32);
const line = (id, choice = 'join', rev = 1) => P.ballotLine({ id, choices: [choice], digest: DIGEST, rev });
const real = globalThis.crypto.subtle;

/** WebCrypto as a device without Ed25519 has it (Safari before 17): every Ed25519 call fails */
function noEd25519(counts = {}) {
  const refuse = (alg) => {
    const name = typeof alg === 'string' ? alg : alg && alg.name;
    if (name === 'Ed25519') throw new DOMException('Unrecognized name.', 'NotSupportedError');
  };
  return {
    async generateKey(alg, ...rest) { counts.generate = (counts.generate || 0) + 1; refuse(alg); return real.generateKey(alg, ...rest); },
    exportKey: (...a) => real.exportKey(...a),
    async sign(alg, ...rest) { refuse(alg); return real.sign(alg, ...rest); },
  };
}

/** An IndexedDB stand-in with one database: it opens (or refuses, or never answers), keeps rows in a Map, and
    records each connection so a test can play a delete from another tab (onversionchange). */
function fakeIdb({ refuse = false, silent = false, blocked = false } = {}) {
  const rows = new Map();
  const log = { opens: 0, closed: 0, dbs: [] };
  const idb = {
    open() {
      log.opens++;
      const req = {};
      if (silent) return req;
      if (blocked) { setTimeout(() => { if (req.onblocked) req.onblocked(); }); return req; }
      setTimeout(() => {
        if (refuse) { req.error = new DOMException('denied', 'InvalidStateError'); if (req.onerror) req.onerror(); return; }
        const db = {
          closed: false,
          objectStoreNames: { contains: () => true },
          createObjectStore() {},
          close() { if (!db.closed) { db.closed = true; log.closed++; } },
          transaction() {
            if (db.closed) throw new DOMException('The database connection is closing.', 'InvalidStateError');
            const tx = {};
            const done = (r, v) => setTimeout(() => { r.result = v; if (r.onsuccess) r.onsuccess(); if (tx.oncomplete) tx.oncomplete(); });
            tx.objectStore = () => ({
              get(id) { const r = {}; done(r, rows.get(id)); return r; },
              add(v, id) { const r = {}; rows.set(id, v); done(r, id); return r; },
              delete(id) { const r = {}; rows.delete(id); done(r, undefined); return r; },
            });
            return tx;
          },
        };
        log.dbs.push(db);
        req.result = db;
        if (req.onsuccess) req.onsuccess();
      });
      return req;
    },
  };
  return { idb, log, rows };
}

function fresh(opts = {}) {
  const map = new Map();
  return { map, ring: keyring({ store: mapStore(map), persist: () => {}, ...opts }) };
}

test('a key is made once and the same one returns', async () => {
  const { map, ring } = fresh();
  const a = await ring.keyFor('tea-on-sunday');
  assert.equal(map.size, 1);
  const b = await ring.keyFor('tea-on-sunday');
  assert.equal(a.address, b.address);
  assert.equal(map.size, 1);
  // a new keyring over the same store stands in for the next visit
  const again = await keyring({ store: mapStore(map) }).keyFor('tea-on-sunday');
  assert.equal(again.address, a.address);
});

test('two calls at once still make one key', async () => {
  const { map, ring } = fresh();
  const [a, b] = await Promise.all([ring.keyFor('p1'), ring.keyFor('p1')]);
  assert.equal(a.address, b.address);
  assert.equal(map.size, 1);
});

test('the private key cannot be read out, for either kind', async () => {
  for (const opts of [{}, { subtle: noEd25519() }]) {
    const { map, ring } = fresh(opts);
    await ring.keyFor('p1');
    const row = map.get('p1');
    assert.equal(row.privateKey.extractable, false, row.kind);
    await assert.rejects(real.exportKey('pkcs8', row.privateKey));
  }
});

test('two PAXT ids get two different keys', async () => {
  const { map, ring } = fresh();
  const a = await ring.keyFor('p1');
  const b = await ring.keyFor('p2');
  assert.notEqual(a.address, b.address);
  assert.equal(map.size, 2);
});

test('the stored row is { kind, privateKey, publicKey, address }', async () => {
  const { map, ring } = fresh();
  const k = await ring.keyFor('p1');
  const row = map.get('p1');
  assert.deepEqual(Object.keys(row).sort(), ['address', 'kind', 'privateKey', 'publicKey']);
  assert.equal(row.address, k.address);
  assert.equal(row.kind, k.kind);
});

test('an Ed25519 key signs through keys.js and the vendored verifyAccount accepts it', async () => {
  const { ring } = fresh();
  const k = await ring.keyFor('p1');
  assert.equal(k.kind, 'ed25519');
  assert.match(k.address, /^did:key:z6Mk/);
  assert.equal(await S.canonicalId(k.address), k.address);
  const l = line('p1');
  const sig = await k.sign(l);
  assert.equal(sig.length, 86);
  assert.equal(await S.verifyAccount(k.address, l, sig), true);
  const entry = { address: k.address, line: l, sig, name: 'Ana' };
  assert.equal(P.entryProblem(entry), null);
  assert.equal(await P.verifyEntry(entry), true);
  // the same signature does not carry over to another line
  assert.equal(await S.verifyAccount(k.address, line('p1', 'leave', 2), sig), false);
});

test('without Ed25519 the key is P-256, signs through keys.js, and the vendored verifyAccount accepts it', async () => {
  const { map, ring } = fresh({ subtle: noEd25519() });
  const k = await ring.keyFor('p1');
  assert.equal(k.kind, 'p256');
  assert.equal(map.get('p1').kind, 'p256');
  assert.match(k.address, /^did:key:zDn/);
  assert.equal(await S.canonicalId(k.address), k.address);
  // WebCrypto picks either half for s at random, so sign enough lines to meet both; every one must pass
  for (let rev = 1; rev <= 16; rev++) {
    const l = line('p1', rev % 2 ? 'join' : 'leave', rev);
    const sig = await k.sign(l);
    assert.equal(sig.length, 86);
    const raw = S.fromBase64url(sig);
    assert.deepEqual(S.p256LowS(raw), raw, 'the signature already has s in the lower half');
    assert.equal(await S.verifyAccount(k.address, l, sig), true, 'line ' + rev);
    assert.equal(await P.verifyEntry({ address: k.address, line: l, sig }), true);
  }
});

test('signed entries from both kinds of key count through the engine, one voice each', async () => {
  const id = 'tea-on-sunday';
  const doc = P.template({ id, title: 'Tea on Sunday', threshold: 3, opens: '2026-11-25', closes: '2026-12-01', body: 'We meet for tea.' });
  const parsed = P.parseGarden(doc);
  assert.ok(parsed.ok, JSON.stringify(parsed.errors));
  const { short } = await P.digestOf(doc);
  const entries = [];
  for (const person of [fresh(), fresh({ subtle: noEd25519() }), fresh()]) {
    const k = await person.ring.keyFor(id);
    const l = P.ballotLine({ id, choices: ['join'], digest: short });
    entries.push({ address: k.address, line: l, sig: await k.sign(l) });
  }
  assert.deepEqual(entries.map((e) => e.address.slice(0, 11)), ['did:key:z6M', 'did:key:zDn', 'did:key:z6M']);
  const c = await P.count({ terms: parsed.terms, digestShort: short, ballots: entries, verify: P.verifyGarden });
  assert.equal(c.joined, 3);
  assert.equal(c.inForce, true);
});

test('a key will not sign a line for another PAXT, or anything that is not a line', async () => {
  const { ring } = fresh();
  const k = await ring.keyFor('p1');
  await assert.rejects(k.sign(line('p2')), /another PAXT/);
  await assert.rejects(k.sign('hello'), /PAXT line/);
  await assert.rejects(k.sign(undefined), /PAXT line/);
});

test('forget() removes the key, and the next one is new', async () => {
  const { map, ring } = fresh();
  const a = await ring.keyFor('p1');
  await ring.keyFor('p2');
  await ring.forget('p1');
  assert.equal(map.has('p1'), false);
  assert.equal(map.has('p2'), true);
  const b = await ring.keyFor('p1');
  assert.notEqual(a.address, b.address);
});

test('has() says whether this device still holds a key, and never makes one', async () => {
  const { map, ring } = fresh();
  assert.equal(await ring.has('p1'), false);
  assert.equal(map.size, 0, 'asking made no key');
  await ring.keyFor('p1');
  assert.equal(await ring.has('p1'), true);
  assert.equal(await ring.has('p2'), false);
  // the browser cleared the site's storage, as Safari does after seven days without a visit
  map.clear();
  assert.equal(await ring.has('p1'), false);
  // a row that is not a whole key is not a key this device can sign with
  map.set('p3', { privateKey: {}, publicKey: {} });
  assert.equal(await ring.has('p3'), false);
  assert.equal(map.get('p3').kind, undefined, 'has() leaves the row alone');
  await assert.rejects(ring.has(''), TypeError);
});

test('the browser is asked once to keep storage, after the first key, without waiting on it', async () => {
  const map = new Map();
  let asked = 0;
  // an answer that never comes, and one that fails: neither may hold up or break making a key
  const ring = keyring({ store: mapStore(map), persist: () => { asked++; return asked === 1 ? new Promise(() => {}) : Promise.reject(new Error('no')); } });
  assert.equal(await ring.has('p1'), false);
  assert.equal(asked, 0, 'asking about a key is not making one');
  await ring.keyFor('p1');
  assert.equal(asked, 1);
  await ring.keyFor('p1');
  await ring.keyFor('p2');
  assert.equal(asked, 1, 'only once');
  // a browser without the call, or whose call throws, still makes keys
  for (const persist of [() => undefined, () => { throw new Error('no storage manager'); }]) {
    const k = await keyring({ store: mapStore(new Map()), persist }).keyFor('p1');
    assert.match(k.address, /^did:key:/);
  }
});

test('an empty or odd PAXT id is refused', async () => {
  const { ring } = fresh();
  assert.throws(() => ring.keyFor(''), TypeError);
  assert.throws(() => ring.keyFor(42), TypeError);
  await assert.rejects(ring.forget(''), TypeError);
});

test('a stored row without a kind and an address is deleted and remade, not used', async () => {
  const old = await real.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify']);
  // a junk row, and a key pair as wave 1 stored it (no kind, no address)
  for (const row of [{ junk: true }, { privateKey: old.privateKey, publicKey: old.publicKey }, { kind: 'rsa', privateKey: old.privateKey, publicKey: old.publicKey, address: 'did:key:z6Mk' }]) {
    const map = new Map([['p1', row]]);
    const k = await keyring({ store: mapStore(map), persist: () => {} }).keyFor('p1');
    assert.equal(await S.canonicalId(k.address), k.address);
    const kept = map.get('p1');
    assert.notEqual(kept, row);
    assert.equal(kept.address, k.address);
    assert.ok(['ed25519', 'p256'].includes(kept.kind));
  }
});

test('supported() is true with Ed25519 and IndexedDB', async () => {
  const indexedDB = fakeIdb().idb;
  assert.equal(await supported({ subtle: real, indexedDB }), true);
});

test('supported() is true with P-256 alone, and false with neither curve', async () => {
  const indexedDB = fakeIdb().idb;
  assert.equal(await supported({ subtle: noEd25519(), indexedDB }), true);
  const noCurve = { generateKey: async () => { throw new DOMException('Unrecognized name.', 'NotSupportedError'); } };
  assert.equal(await supported({ subtle: noCurve, indexedDB }), false);
  assert.equal(await supported({ subtle: undefined, indexedDB }), false);
});

test('supported() is false without IndexedDB', async () => {
  assert.equal(await supported({ subtle: real, indexedDB: undefined }), false);
});

test('supported() asks once per page', async () => {
  // Node has no IndexedDB, so the page-wide answer is false here; what matters is that it is one answer
  const a = supported();
  const b = supported();
  assert.equal(a, b, 'the same promise both times');
  assert.equal(await a, false);
  // a test that passes its own env is asked fresh
  const counts = {};
  await supported({ subtle: noEd25519(counts), indexedDB: fakeIdb().idb });
  await supported({ subtle: noEd25519(counts), indexedDB: fakeIdb().idb });
  assert.equal(counts.generate, 4, 'two probes, each trying Ed25519 then P-256');
});

test('supported() is false when IndexedDB is there but will not open, so the room says so before Join', async () => {
  assert.equal(await supported({ subtle: real, indexedDB: fakeIdb({ refuse: true }).idb }), false, 'a store that refuses to open');
  const ok = fakeIdb();
  assert.equal(await supported({ subtle: real, indexedDB: ok.idb }), true, 'the control: a store that opens');
  assert.equal(ok.log.closed, ok.log.opens, 'and the test closes what it opened');
});

test('the key store closes its connection when Start over deletes it, and the next call opens a fresh one', async () => {
  const { idb, log } = fakeIdb();
  const store = idbStore(idb);
  assert.equal(await store.get('tea'), undefined);
  assert.equal(log.opens, 1);
  const db = log.dbs[0];
  assert.equal(typeof db.onversionchange, 'function', 'the connection answers a delete');
  db.onversionchange();
  assert.equal(db.closed, true, 'a delete from any tab closes it, so the delete is not blocked');
  assert.equal(await store.get('tea'), undefined, 'the next call still answers');
  assert.equal(log.opens, 2, 'from a fresh connection');
});

test('a key store that only waits is not a refusal, so a Start over in another tab never tells this one to find a newer browser', async () => {
  // the page keeps its first answer, so a wait read as false would stay on screen until a reload
  assert.equal(await supported({ subtle: real, indexedDB: fakeIdb({ silent: true }).idb, waitMs: 30 }), true, 'an open still waiting (on another tab\x27s delete) after the wait');
  assert.equal(await supported({ subtle: real, indexedDB: fakeIdb({ blocked: true }).idb, waitMs: 30 }), true, 'an open another tab holds up');
  assert.equal(await supported({ subtle: undefined, indexedDB: fakeIdb({ silent: true }).idb, waitMs: 30 }), false, 'the control: with no WebCrypto the answer is still false');
});
