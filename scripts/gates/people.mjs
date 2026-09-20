// G32 · THE PEOPLE YOU KEEP CLOSE.
//
// Keeping somebody is one-sided on purpose. There is no request to approve, nothing to
// decline and nobody to be turned down by, and keeping somebody tells them nothing. What
// has to be true underneath: a list carries only what a page already published, a private
// page cannot be kept at all, and one session can never read another's list.
//
//   node --import ./scripts/gates/lib/loader.mjs scripts/gates/people.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { __MEM as MEM } from './lib/blob-stub.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let fails = 0;
const say = (ok, m) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + m); };
function res() {
  const r = { code: 0, body: null };
  r.setHeader = () => {}; r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; }; r.end = () => r;
  return r;
}
const post = (body, ip) => ({ method: 'POST', headers: { 'x-forwarded-for': ip || '10.0.0.1' }, query: {}, body });
const call = async (h, req) => { const r = res(); await h(req, r); return r; };
const store = () => [...MEM.entries()].map(([k, v]) => k + ' ' + v).join('\n');

console.log('G32 - your people');
process.env.BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || 'gate-token';
process.env.GRATUS_SALT = process.env.GRATUS_SALT || 'a-secret-that-is-not-in-the-store';
const acct = (await import(path.join(root, 'api/account.js'))).default;

const PW = 'a-long-enough-password';
const WORDS = 'THE-WORDS-I-WROTE-TODAY';
async function born(email, handle, name, ip) {
  const up = await call(acct, post({ act: 'signup', email, password: PW, handle, name }, ip));
  if (up.code !== 200) throw new Error('could not make ' + handle + ': ' + JSON.stringify(up.body));
  return up.body.token;
}
const publish = (tok, on, extra) => call(acct, post(Object.assign({
  act: 'profile', token: tok, published: on,
  garden: { plants: 3, days: 33, ready: 1, faces: ['☕'], entries: [WORDS] },
}, extra || {})));

const AVA = await born('ava@example.org', 'ava', 'Ava', '10.1.0.1');
const BEN = await born('ben@example.org', 'ben', 'Ben', '10.1.0.2');
const CAI = await born('cai@example.org', 'cai', 'Cai', '10.1.0.3');
await publish(AVA, true, { name: 'Ava' });
await publish(BEN, true, { name: 'Ben' });
// Cai stays private on purpose

const mine = (tok) => call(acct, post({ act: 'friends', token: tok }));
const keep = (tok, h) => call(acct, post({ act: 'friend-add', token: tok, handle: h }));
const letGo = (tok, h) => call(acct, post({ act: 'friend-drop', token: tok, handle: h }));

const empty = await mine(AVA);
say(empty.code === 200 && empty.body.friends.length === 0 && empty.body.mine === 'ava',
  'a new list is empty, and it knows whose it is');

const k1 = await keep(AVA, 'ben');
say(k1.code === 200 && k1.body.friends === 1, 'Ava keeps Ben  (' + k1.code + ')');

const a1 = await mine(AVA);
say(a1.body.friends.length === 1 && a1.body.friends[0].handle === 'ben', 'and Ben is on her list');
say(a1.body.friends[0].both === false, 'it does not yet read as together, because Ben has kept nobody');

const b1 = await mine(BEN);
say(b1.body.friends.length === 0, 'and Ben was told nothing: his own list is untouched');

await keep(BEN, 'ava');
const a2 = await mine(AVA);
const b2 = await mine(BEN);
say(a2.body.friends[0].both === true && b2.body.friends[0].both === true,
  'once Ben keeps Ava back, both lists read as together');

// what a list may carry
const shown = JSON.stringify(a2.body);
say(a2.body.friends[0].garden && a2.body.friends[0].garden.days === 33, 'a list carries the shape of a garden');
say(!shown.includes(WORDS), 'and never a word from inside it');
say(!shown.includes('ben@example.org'), 'and never the address behind it');
say(!/password|scrypt|"pw"|hash/i.test(shown), 'and nothing that belongs to signing in');

// what cannot be kept
const twice = await keep(AVA, 'ben');
say(twice.code === 200 && twice.body.friends === 1, 'keeping the same person twice keeps them once');
const ghost = await keep(AVA, 'nobody-at-all');
say(ghost.code === 404, 'a handle nobody holds cannot be kept  (' + ghost.code + ')');
const priv = await keep(AVA, 'cai');
say(priv.code === 404, 'and neither can a page that was never made public  (' + priv.code + ')');
const self = await keep(AVA, 'ava');
say(self.code === 400, 'and you cannot keep yourself  (' + self.code + ')');
const junk = await keep(AVA, 'NOT A HANDLE!!');
say(junk.code === 400, 'and nothing that is not a handle  (' + junk.code + ')');
say(!store().includes('nobody-at-all'), 'a refused name is not written down anywhere');

// a handle is one case underneath, however it was typed
// Somebody reads a handle off a page or a card and types it the way a name is written.
const caps = await keep(AVA, 'BEN');
say(caps.code === 200, 'a handle typed with capitals is accepted  (' + caps.code + ')');
const cased = await mine(AVA);
say(cased.body.friends.length === 1 && cased.body.friends[0].handle === 'ben' && !cased.body.friends[0].gone,
  'and it is the same person, never a second, missing one');

// somebody who goes private again
await publish(BEN, false);
const afterHide = await mine(AVA);
say(afterHide.body.friends[0].gone === true && !afterHide.body.friends[0].garden,
  'when Ben makes his page private, Ava sees that he has gone and nothing else');
await publish(BEN, true, { name: 'Ben' });

// letting go
const lg = await letGo(AVA, 'ben');
say(lg.code === 200 && lg.body.friends === 0, 'letting go removes them  (' + lg.code + ')');
const after = await mine(AVA);
say(after.body.friends.length === 0, 'and the list is empty again');
const still = await mine(BEN);
say(still.body.friends.length === 1, 'while Ben still keeps Ava, because his list was never hers to change');

// no session reads another
const forged = await mine('made.up.token');
say(forged.code === 401, 'a forged session reads nobody  (' + forged.code + ')');
const bent = AVA.split('.');
const moved = await mine(bent[0] + '.' + (Date.now() + 99999999) + '.' + bent[2]);
say(moved.code === 401, 'and a session with its clock moved  (' + moved.code + ')');
const noTok = await call(acct, post({ act: 'friend-add', handle: 'ben' }));
say(noTok.code === 401, 'and keeping somebody with no session at all  (' + noTok.code + ')');

// the count the account panel shows
const me = await call(acct, post({ act: 'me', token: BEN }));
say(me.code === 200 && me.body.friends === 1, 'the account knows how many people it keeps  (' + me.body.friends + ')');

// a list has a ceiling, so one account cannot be made to hold the whole store
const big = await call(acct, post({ act: 'friends', token: CAI }));
say(big.code === 200, 'an account with a private page still has a list of its own');

// The number on /trax said there were no accounts to count. That was true the day it was
// written and false the day accounts shipped, so it is a number now, read off the names of
// the records and never out of one.
const trax = (await import(path.join(root, 'api/trax.js'))).default;
const seen = await call(trax, { method: 'GET', headers: {}, query: {} });
say(seen.code === 200 && seen.body.accounts === 3, 'trax counts the three accounts this gate made  (' + seen.body.accounts + ')');
const saw = JSON.stringify(seen.body);
say(!saw.includes('ava@example.org') && !saw.includes('ava'), 'and never says who any of them are');
say(!/there are no accounts yet/.test(saw), 'and no longer claims there are none');

console.log('G32 your people: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
