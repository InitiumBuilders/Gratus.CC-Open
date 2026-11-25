// G30 · AN ACCOUNT THAT CANNOT READ YOUR JOURNAL.
//
// The whole product says, on every page, that your journal never leaves your device. An
// account makes that a promise somebody could break, so this proves it cannot be: what
// reaches the store is ciphertext, the password is never in it, and a profile carries the
// shape of a garden and never a word from inside it.
//
//   node --import ./scripts/gates/lib/loader.mjs scripts/gates/account.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { __MEM as MEM } from './lib/blob-stub.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let fails = 0;
const say = (ok, m) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + m); };
function res() {
  const r = { code: 0, body: null, headers: {} };
  r.setHeader = () => {}; r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; }; r.end = () => r;
  return r;
}
const post = (body, ip) => ({ method: 'POST', headers: { 'x-forwarded-for': ip || '10.0.0.1' }, query: {}, body });
const get = (query) => ({ method: 'GET', headers: {}, query });
const call = async (h, req) => { const r = res(); await h(req, r); return r; };
const store = () => [...MEM.entries()].map(([k, v]) => k + ' ' + v).join('\n');

console.log('G30 - accounts');
process.env.BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || 'gate-token';
process.env.GRATUS_SALT = process.env.GRATUS_SALT || 'a-secret-that-is-not-in-the-store';
const acct = (await import(path.join(root, 'api/account.js'))).default;

const EMAIL = 'someone@example.org';
const PW = 'a-long-enough-password';

const up = await call(acct, post({ act: 'signup', email: EMAIL, password: PW, handle: 'a-gardener', name: 'A Gardener' }));
say(up.code === 200 && !!up.body.token, 'an account is made  (' + up.code + ')');
const TOKEN = up.body.token;

say(!store().includes(EMAIL), 'the email address itself is never stored');
say(!store().includes(PW), 'and neither is the password');

const dupe = await call(acct, post({ act: 'signup', email: EMAIL, password: PW, handle: 'other-one' }));
say(dupe.code === 409, 'the same address cannot be taken twice  (' + dupe.code + ')');
const taken = await call(acct, post({ act: 'signup', email: 'two@example.org', password: PW, handle: 'a-gardener' }));
say(taken.code === 409, 'and neither can a handle  (' + taken.code + ')');
const short = await call(acct, post({ act: 'signup', email: 'three@example.org', password: 'short', handle: 'three' }));
say(short.code === 400, 'a password under ten characters is refused  (' + short.code + ')');
const reserved = await call(acct, post({ act: 'signup', email: 'four@example.org', password: PW, handle: 'app' }));
say(reserved.code === 400, 'and a handle the app needs for itself  (' + reserved.code + ')');

const wrong = await call(acct, post({ act: 'signin', email: EMAIL, password: 'not-the-password' }, '10.0.0.2'));
say(wrong.code === 401, 'a wrong password does not sign in  (' + wrong.code + ')');
const nobody = await call(acct, post({ act: 'signin', email: 'nobody@example.org', password: PW }, '10.0.0.3'));
say(nobody.code === 401 && nobody.body.error === wrong.body.error,
  'and an address nobody holds answers exactly the same, so this cannot be asked who is here');

const inn = await call(acct, post({ act: 'signin', email: EMAIL, password: PW }, '10.0.0.4'));
say(inn.code === 200 && !!inn.body.token, 'the right password does  (' + inn.code + ')');

// the vault: sealed here, unreadable there
const WORDS = 'THE-WORDS-I-WROTE-TODAY';
const sealed = { ct: Buffer.from('nonsense-that-is-not-' + WORDS).toString('base64'), iv: 'aXY=', kdf: { salt: 'c2FsdA==', iterations: 250000 } };
const saved = await call(acct, post({ act: 'save', token: TOKEN, vault: sealed }));
say(saved.code === 200, 'a sealed vault is kept  (' + saved.code + ')');
const naked = await call(acct, post({ act: 'save', token: TOKEN, vault: { plain: { entries: [WORDS] } } }));
say(naked.code === 400, 'a vault that is not sealed is refused  (' + naked.code + ')');
say(!store().includes(WORDS), 'and nothing anybody wrote is anywhere in the store');

const loaded = await call(acct, post({ act: 'load', token: TOKEN }));
say(loaded.code === 200 && loaded.body.vault.ct === sealed.ct, 'the box comes back exactly as it went in');

const noToken = await call(acct, post({ act: 'load', token: 'made.up.token' }));
say(noToken.code === 401, 'a forged session reads nothing  (' + noToken.code + ')');
const bent = TOKEN.split('.');
const forged = await call(acct, post({ act: 'load', token: bent[0] + '.' + (Date.now() + 99999999) + '.' + bent[2] }));
say(forged.code === 401, 'and a session with its clock moved is refused  (' + forged.code + ')');

// the profile: a shape, never a word
const hidden = await call(acct, get({ handle: 'a-gardener' }));
say(hidden.code === 404, 'a page nobody published is not public  (' + hidden.code + ')');
await call(acct, post({ act: 'profile', token: TOKEN, published: true, name: 'A Gardener', line: 'Still here.',
  garden: { plants: 3, days: 33, ready: 1, faces: ['☕', '❤️'], entries: [WORDS] } }));
const shown = await call(acct, get({ handle: 'a-gardener' }));
say(shown.code === 200 && shown.body.profile.garden.days === 33, 'a published page carries the shape  (' + shown.code + ')');
say(!JSON.stringify(shown.body).includes(WORDS), 'and never a word from inside the garden');
say(!JSON.stringify(shown.body).includes(EMAIL), 'and never the address behind it');

// a handle is public, so the path to its record must not be (v60): anyone who learned the
// store's address could otherwise walk from a handle to the account and its sealed vault
const keys = () => [...MEM.keys()];
say(!keys().some((k) => k.split('/').pop() === 'a-gardener.json'), 'no path in the store is a handle, so a handle leads nowhere without the secret');
const oldUp = await call(acct, post({ act: 'signup', email: 'old@example.org', password: PW, handle: 'old-one' }, '10.0.0.7'));
const nowKey = keys().find((k) => k.startsWith('gratus/handle/') && (JSON.parse(MEM.get(k)) || {}).handle === 'old-one');
if (nowKey) { MEM.set('gratus/handle/old-one.json', MEM.get(nowKey)); MEM.delete(nowKey); }
const ENV = process.env.VERCEL_ENV;
process.env.VERCEL_ENV = 'preview';
const onPreview = await call(acct, post({ act: 'handle-free', handle: 'old-one' }));
say(oldUp.code === 200 && !!nowKey && onPreview.body.free === false, 'a handle kept the old way still counts as taken');
say(MEM.has('gratus/handle/old-one.json') && !MEM.has(nowKey), 'and a preview, which reads the live store, leaves it where it is');
process.env.VERCEL_ENV = 'production';
const inProduction = await call(acct, post({ act: 'handle-free', handle: 'old-one' }));
say(inProduction.body.free === false && !MEM.has('gratus/handle/old-one.json') && !!nowKey && MEM.has(nowKey), 'production reads it, moves it to its hidden path and takes the old one away');
if (ENV === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = ENV;
{
  const src = fs.readFileSync(path.join(root, 'api/account.js'), 'utf8');
  const LINE = "const HANDLE = (h) => 'gratus/handle/' + createHmac('sha256', PEPPER).update('handle·' + h).digest('hex').slice(0, 32) + '.json';";
  const ok = src.split(LINE).length === 2;
  say(ok, 'the hidden-path control has its line to change');
  if (ok) {
    const tmp = path.join(os.tmpdir(), 'gratus-account-control-' + process.pid + '.mjs');
    fs.writeFileSync(tmp, src.replace(LINE, () => "const HANDLE = (h) => 'gratus/handle/' + h + '.json';"));
    const ctl = (await import(pathToFileURL(tmp).href)).default;
    await call(ctl, post({ act: 'signup', email: 'control@example.org', password: PW, handle: 'control-one' }, '10.0.0.8'));
    say(MEM.has('gratus/handle/control-one.json'), 'the control: with the handle as the path, the handle is found in the store');
    fs.unlinkSync(tmp);
  }
}

let refused = 0;
for (let i = 0; i < 26; i++) {
  const r = await call(acct, post({ act: 'signin', email: EMAIL, password: 'wrong-' + i }, '10.9.9.9'));
  if (r.code === 429) { refused = i; break; }
}
say(refused > 0, 'guessing from one place is stopped  (at ' + refused + ')');

console.log('G30 accounts: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
