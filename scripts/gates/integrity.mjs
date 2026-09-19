// G-II · INTEGRITY. What a stranger with nothing but a slug can do.
//
// Everything below was possible on the live site before this gate was written, and each
// line is the thing itself rather than the shape of the source that does it. The handlers
// are called directly with the store held in memory and Giveth answered by a stub, so the
// gate needs no deployment, no token and no network.
//
//   the claim    one POST made anyone the steward of any project. They then read every
//                seed written to it, including the words whose authors had held them
//                back, and answered in the project's own voice. Now a key is only given
//                to somebody who can edit what the project says about itself on Giveth.
//   the confirm  wrote whatever number the caller sent into a document whose whole point
//                is that a real gift happened. Now the author proves the seed is theirs
//                and the number is read from Giveth rather than accepted from a browser.
//   the caps     seed 501 deleted seed 1, silently, in a garden where nothing decays.
//   the keys     travelled in query strings, which are written to every log they pass.
//
// Run me through the loader so @vercel/blob is the in-memory stub:
//   node --import ./scripts/gates/lib/loader.mjs scripts/gates/integrity.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { __MEM as MEM, __giveth } from './lib/blob-stub.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + msg); };

function res() {
  const r = { code: 0, body: null, headers: {} };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.end = () => r;
  return r;
}
const post = (body, ip) => ({ method: 'POST', headers: ip ? { 'x-forwarded-for': ip } : {}, query: {}, body });
const get = (query) => ({ method: 'GET', headers: {}, query });
const call = async (h, req) => { const r = res(); await h(req, r); return r; };
const store = (needle) => [...MEM.entries()].filter(([k]) => k.includes(needle)).map(([k, v]) => k + ' ' + v).join('\n');

console.log('G-II - integrity');
process.env.BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || 'gate-token';

let trace, goals, vibes;
try {
  trace = (await import(path.join(root, 'api/trace.js'))).default;
  goals = (await import(path.join(root, 'api/goals.js'))).default;
  vibes = (await import(path.join(root, 'api/vibes.js'))).default;
} catch (e) {
  console.log('  could not load a handler: ' + String(e.message).slice(0, 160));
  console.log('G-II integrity: FAIL - nothing was tested');
  process.exit(1);
}

// Giveth's voice for this run. description is what a claim is proved against; the one
// donation is what a confirm is allowed to write.
let DESCRIPTION = 'We plant trees.';
const DONATION = { transactionId: '0xabc123', amount: 5, currency: 'USDC', valueUsd: 5.02, createdAt: '2026-09-01T00:00:00.000Z' };
let reached = 0;
__giveth((sent) => {
  reached++;
  const q = String(sent.query || '');
  if (q.includes('projectBySlug')) return { data: { projectBySlug: { id: '77', title: 'Tree Project', slug: 'tree', description: DESCRIPTION, descriptionSummary: '' } } };
  if (q.includes('donationsByProjectId')) return { data: { donationsByProjectId: { donations: [DONATION] } } };
  return { data: {} };
});

// the store has to be the stub, or every refusal below is a crash wearing a suit
{
  const probe = await call(trace, post({ act: 'plant', project: 'stub-probe', message: 'a word' }, '10.0.0.1'));
  if (probe.code !== 200) {
    console.log('  the in-memory store is not wired (a plant answered ' + probe.code + ')');
    console.log('  run me with:  node --import ./scripts/gates/lib/loader.mjs scripts/gates/integrity.mjs');
    console.log('G-II integrity: FAIL - without the store every answer below is an accident');
    process.exit(1);
  }
}

// ── 1 · the claim ──
const SLUG = 'gate-claim-' + Math.random().toString(36).slice(2, 8);
const c1 = await call(trace, post({ act: 'claim', project: SLUG }, '10.0.0.2'));
say(c1.code === 200 && !c1.body.key && !!c1.body.code, 'a claim hands back a code to prove, never a key  (got ' + c1.code + ')');
say(!store(SLUG).includes('"claim":{'), 'no steward was written by asking');

const guessKey = 'not-the-key';
const readGuess = await call(trace, post({ act: 'read', project: SLUG, key: guessKey }, '10.0.0.2'));
say(!readGuess.body.steward, 'a guessed key does not read as the project');

const c2 = await call(trace, post({ act: 'claim-prove', project: SLUG, secret: 'made-up' }, '10.0.0.2'));
say(c2.code === 403 && !c2.body.key, 'a proof with the wrong secret is refused  (got ' + c2.code + ')');

const c3 = await call(trace, post({ act: 'claim-prove', project: SLUG, secret: c1.body.secret }, '10.0.0.2'));
say(c3.code === 409 && !c3.body.key, 'the right secret is still refused while the code is not on the page  (got ' + c3.code + ')');

// somebody watching the description and copying the code out of it gains nothing
DESCRIPTION = 'We plant trees. ' + c1.body.code;
const c4 = await call(trace, post({ act: 'claim-prove', project: SLUG, secret: 'made-up' }, '10.9.9.9'));
say(c4.code === 403 && !c4.body.key, 'reading the code off the page is not enough to claim  (got ' + c4.code + ')');

const c5 = await call(trace, post({ act: 'claim-prove', project: SLUG, secret: c1.body.secret }, '10.0.0.2'));
say(c5.code === 200 && !!c5.body.key, 'the code on the project page finishes the claim  (got ' + c5.code + ')');
const STEWARD = c5.body.key;

const c6 = await call(trace, post({ act: 'claim', project: SLUG }, '10.0.0.3'));
say(c6.code === 409, 'a claimed project cannot be claimed again  (got ' + c6.code + ')');

// ── 2 · the words a donor held back ──
const held = await call(trace, post({ act: 'plant', project: SLUG, message: 'the private reason I gave', name: 'a donor' }, '10.0.0.4'));
const SEED = held.body.seed.id;
const MINE = held.body.mine;
const openRead = await call(trace, get({ project: SLUG }));
say(!JSON.stringify(openRead.body).includes('the private reason'), 'an open read carries no unpublished words');
const strangerRead = await call(trace, post({ act: 'read', project: SLUG, key: 'still-not-the-key' }, '10.0.0.5'));
say(!JSON.stringify(strangerRead.body).includes('the private reason'), 'a stranger with a key that is wrong reads nothing either');
const stewardRead = await call(trace, post({ act: 'read', project: SLUG, key: STEWARD }, '10.0.0.2'));
say(JSON.stringify(stewardRead.body).includes('the private reason'), 'the proved steward does read it');

// ── 3 · the money ──
const forged = await call(trace, post({ act: 'confirm', project: SLUG, seed: SEED, amount: '1000000', currency: 'USD', usd: 1000000, tx: '0xabc123' }, '10.0.0.6'));
say(forged.code === 403, 'a confirm without the author key is refused  (got ' + forged.code + ')');
say(!store(SLUG).includes('1000000'), 'the forged amount was not written');

const wrongTx = await call(trace, post({ act: 'confirm', project: SLUG, seed: SEED, tx: '0xnotagift', key: MINE }, '10.0.0.4'));
say(wrongTx.code === 200 && wrongTx.body.confirmed === false, 'a transaction Giveth does not have confirms nothing  (got ' + wrongTx.code + ')');

const real = await call(trace, post({ act: 'confirm', project: SLUG, seed: SEED, amount: '1000000', usd: 1000000, tx: '0xabc123', key: MINE }, '10.0.0.4'));
say(real.code === 200 && real.body.confirmed === true, 'the author confirms a real gift  (got ' + real.code + ')');
say(real.body.seed.confirmed && Number(real.body.seed.confirmed.usd) === 5.02, 'the amount written is the one Giveth holds, not the one sent  (' + JSON.stringify(real.body.seed.confirmed && real.body.seed.confirmed.usd) + ')');
say(!store(SLUG).includes('1000000'), 'the amount the caller sent never reached the document');

// a confirm cannot be written while Giveth is unreachable
const HAD = reached;
__giveth(null);
const blind = await call(trace, post({ act: 'confirm', project: SLUG, seed: SEED, tx: '0xdeadbeef', key: MINE }, '10.0.0.4'));
say(blind.code === 503, 'with Giveth unreachable a confirm writes nothing  (got ' + blind.code + ')');
say(!store(SLUG).includes('0xdeadbeef'), 'and the unverified transaction is not in the document');
__giveth((sent) => {
  reached++;
  const q = String(sent.query || '');
  if (q.includes('projectBySlug')) return { data: { projectBySlug: { id: '77', title: 'Tree Project', slug: 'tree', description: DESCRIPTION, descriptionSummary: '' } } };
  if (q.includes('donationsByProjectId')) return { data: { donationsByProjectId: { donations: [DONATION] } } };
  return { data: {} };
});
say(reached > 0 && HAD > 0, 'Giveth was actually asked  (' + HAD + ' calls before the blind test)');

// ── 4 · one caller cannot spend everybody's allowance ──
const RS = 'gate-rate-' + Math.random().toString(36).slice(2, 8);
let refusedAt = 0;
for (let i = 0; i < 20 && !refusedAt; i++) {
  const r = await call(trace, post({ act: 'plant', project: RS, message: 'seed number ' + i, name: 'one person' }, '10.1.1.1'));
  if (r.code === 429) refusedAt = i;
}
say(refusedAt > 0 && refusedAt < 20, 'one caller is stopped before the day is  (at ' + refusedAt + ')');
const other = await call(trace, post({ act: 'plant', project: RS, message: 'someone else entirely', name: 'another' }, '10.2.2.2'));
say(other.code === 200, 'and the next person can still plant  (got ' + other.code + ')');

// ── 5 · nothing anyone wrote is deleted to make room ──
const OS = 'gate-full-' + Math.random().toString(36).slice(2, 8);
const many = [];
for (let i = 0; i < 500; i++) {
  many.push({ id: 'old' + i, project: OS, title: 't', message: i === 0 ? 'THE VERY FIRST WORDS' : 'seed ' + i, name: 'n', emoji: '🌱', bloom: '🌻', tx: null, confirmed: null, first: i === 0, public: false, mine: 'x', at: new Date(Date.now() - (500 - i) * 3600000).toISOString(), status: 'dormant', water: null, thread: [] });
}
MEM.set('gratus/trace/' + OS + '.json', JSON.stringify({ claim: null, seeds: many }));
const over = await call(trace, post({ act: 'plant', project: OS, message: 'the five hundred and first', name: 'last' }, '10.3.3.3'));
say(over.code === 200, 'the five hundred and first seed is accepted  (got ' + over.code + ')');
const live = MEM.get('gratus/trace/' + OS + '.json') || '';
say(!live.includes('THE VERY FIRST WORDS'), 'the live document rolled over');
say(store(OS).includes('THE VERY FIRST WORDS'), 'and the first words are still in the store, on a page of their own');

// the same for the public stream
const gmany = [];
for (let i = 0; i < 500; i++) gmany.push({ id: 'g' + i, text: i === 0 ? 'THE FIRST THING ANYONE GREW TOWARD' : 'goal ' + i, name: 'n', emoji: '🌱', at: new Date(Date.now() - (500 - i) * 3600000).toISOString() });
MEM.set('gratus/goals/feed.json', JSON.stringify({ goals: gmany }));
const gover = await call(goals, post({ text: 'one more', name: 'last' }, '10.4.4.4'));
say(gover.code === 200, 'the stream takes the five hundred and first line  (got ' + gover.code + ')');
say(!(MEM.get('gratus/goals/feed.json') || '').includes('THE FIRST THING ANYONE GREW'), 'the live feed rolled over');
say(store('gratus/goals/').includes('THE FIRST THING ANYONE GREW'), 'and the first line is still in the store');

// ── 6 · rooms cannot be minted all day ──
let madeRefused = 0;
for (let i = 0; i < 12 && !madeRefused; i++) {
  const r = await call(vibes, post({ act: 'make', name: 'room ' + i }, '10.5.5.5'));
  if (r.code === 429) madeRefused = i;
}
say(madeRefused > 0 && madeRefused < 12, 'one caller stops being able to open rooms  (at ' + madeRefused + ')');

// ── 7 · what the source must not do ──
const traceSrc = rd('api/trace.js');
say(!/req\.query\.(key|secret|ids)/.test(traceSrc), 'no key, secret or seed id is read out of a query string');
const anyQueryKey = ['api/trace.js', 'api/vibes.js', 'api/voice.js', 'api/goals.js']
  .filter((f) => /req\.query\.(key|secret|keeper|mine)/.test(rd(f)));
say(!anyQueryKey.length, 'no handler takes a secret in a URL' + (anyQueryKey.length ? ' (' + anyQueryKey.join(', ') + ')' : ''));

const sw = rd('sw.js');
say(/pathname\.startsWith\('\/api\//.test(sw), 'the service worker leaves the API alone');

const voiceSrc = rd('api/voice.js');
say(/process\.env\.GRATUS_SALT/.test(voiceSrc), 'the voice counters are salted from the environment');
say(!/gratus-voice'\)/.test(voiceSrc), 'and not from a constant written in a public file');
const saltless = ['api/trace.js', 'api/goals.js', 'api/vibes.js', 'api/voice.js'].filter((f) => /whoOf/.test(rd(f)) && !/GRATUS_SALT/.test(rd(f)));
say(!saltless.length, 'every counter that hashes a caller uses the secret salt' + (saltless.length ? ' (' + saltless.join(', ') + ')' : ''));

say(/&#39;/.test(rd('assets/js/ui.js')), 'esc escapes the single quote as well as the double');

const vj = JSON.parse(rd('vercel.json'));
const all = (vj.headers || []).find((h) => h.source === '/(.*)');
const csp = ((all && all.headers) || []).find((h) => h.key === 'Content-Security-Policy');
say(!!csp, 'there is a content policy');
say(!!csp && /script-src 'self'(;|$)/.test(csp.value), "and scripts come from this origin only");
say(!!csp && /object-src 'none'/.test(csp.value) && /base-uri 'self'/.test(csp.value), 'and the old escapes are closed');
const inline = ['index.html', 'app.html', 'privacy.html', 'terms.html']
  .filter((f) => fs.existsSync(path.join(root, f)) && /<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?\S/.test(rd(f)));
say(!inline.length, 'no page carries an inline script' + (inline.length ? ' (' + inline.join(', ') + ')' : ''));

// ── 8 · the friendly branch that could never run ──
const gv = rd('api/_giveth.js');
say(/if \(!data/.test(gv) && !/if \(j\.errors\) throw/.test(gv), 'an answer carrying both errors and data is still an answer');

console.log('G-II integrity: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
