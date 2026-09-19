// G6 · NO STRANGER TAKES A PROJECT, AND NO STRANGER WRITES THE MONEY.
//
// api/trace.js dispatches six actions. Three check a key. Three do not, and each
// of the three is a way for somebody with nothing but a slug to do real harm:
//
//   claim    first come, no proof of owning the project. A stranger who claims a
//            slug reads every donor's unpublished words and answers in the voice
//            of the project. That is not a data breach; it is an impersonation
//            of gratitude.
//   confirm  writes whatever amount the caller sends, with no check against the
//            chain or against Giveth, into a product whose whole trust model is
//            that a real gift happened.
//   plant    open by design and rate limited, which is correct, but the limit is
//            per project rather than per caller, so one actor can lock out a day.
//
// The handler is called directly with the store stubbed, so this gate needs no
// deployment and no vercel dev. It asserts behaviour, not the shape of the source.
//
// Mutants: delete the claim guard; let confirm take a client amount. Both red.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// the same module instance the loader hands to the handler
import { __MEM as MEM } from './lib/blob-stub.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + msg); };

// Run me through the loader so @vercel/blob is the in-memory stub:
//   node --import ./scripts/gates/lib/loader.mjs scripts/gates/trace-auth.mjs

function res() {
  const r = { code: 0, body: null, headers: {} };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.end = () => r;
  return r;
}
const post = (body) => ({ method: 'POST', headers: {}, query: {}, body });
const get = (query) => ({ method: 'GET', headers: {}, query });

console.log('G6 - trace auth');

process.env.BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || 'gate-token';
let handler;
try {
  handler = (await import(path.join(root, 'api/trace.js'))).default;
} catch (e) {
  console.log('  could not load api/trace.js: ' + String(e.message).slice(0, 140));
  console.log('G6 trace-auth: FAIL - the handler did not load');
  process.exit(1);
}
// prove the stub is in place, or every answer below is an accident
{
  const probe = res();
  await handler(post({ act: 'plant', project: 'stub-probe', message: 'a word', bloom: '\u2726' }), probe);
  const wired = probe.code < 500;
  say(wired, 'the in-memory store is wired  (a plant answered ' + probe.code + ')');
  if (!wired) {
    console.log('  run me with:  node --import ./scripts/gates/lib/loader.mjs scripts/gates/trace-auth.mjs');
    console.log('G6 trace-auth: FAIL - without the store every answer below is a crash, not a refusal');
    process.exit(1);
  }
}

const SLUG = 'gate-test-' + Math.random().toString(36).slice(2, 8);

// 1 · a stranger cannot become the steward
const claim = res();
await handler(post({ act: 'claim', project: SLUG }), claim);
say([401, 403, 422].includes(claim.code), 'an unproven claim is refused  (got ' + claim.code + ')');

// 2 · a stranger cannot state the money.
// Plant a real seed first. Confirming a seed that does not exist answers 404 for
// the wrong reason, and an assertion that passes on an empty project is a
// sentence about nothing.
const planted = res();
await handler(post({ act: 'plant', project: SLUG, message: 'why I gave', bloom: '\u2726', name: 'a donor' }), planted);
const pb = planted.body || {};
const seedId = (pb.seed && pb.seed.id) || (Array.isArray(pb.seeds) && pb.seeds[0] && pb.seeds[0].id) || pb.id || null;
say(planted.code === 200 && !!seedId, 'a seed exists to forge against  (plant answered ' + planted.code + ')');
if (seedId) {
  const confirm = res();
  await handler(post({ act: 'confirm', project: SLUG, seed: seedId, amount: '1000000', currency: 'USD', usd: 1000000 }), confirm);
  say(confirm.code >= 400 && confirm.code < 500,
    'a confirm with a client-stated amount is refused  (got ' + confirm.code + ')');
  // the open read hides a held seed, so asking it whether the forgery landed
  // answers a different question. Read what was actually stored.
  const stored = [...MEM.entries()].filter(([k]) => k.includes(SLUG)).map(([, v]) => v).join('');
  say(!stored.includes('1000000'), 'the forged amount was not written to the document');
}

// 3 · an unauthenticated read never returns a held seed's words
const read = res();
await handler(get({ project: SLUG }), read);
const leaked = JSON.stringify(read.body || {}).match(/"message"\s*:\s*"[^"]{3,}/);
say(!leaked, 'an open read carries no unpublished words');

console.log('G6 trace-auth: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
