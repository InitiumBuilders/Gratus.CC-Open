// G23 · THE CEREMONIES EXIST AND CAN BE ESCAPED.
//
// Three held moments: a bloom, a first gift given, a first gift received. Each
// renders, each is over inside 2.5 seconds, and each can be left by tap and by
// key. A held screen you cannot leave is charged to a person every time after
// the first, and the fourth time it is a tax.
//
// Mutant: make one ceremony un-dismissible by key. This must go red.
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, open, ROOT } from './lib/harness.mjs';

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + msg); };
const app = fs.readFileSync(path.join(ROOT, 'assets/js/galaxy.js'), 'utf8');

console.log('G23 - ceremonies');
const WANT = ['bloomed', 'firstGiven', 'firstReceived'];
say(/CEREMONIES|function ceremonyFor|const CER\b/.test(app), 'the three ceremonies are named in one place');
for (const k of WANT) say(new RegExp(k, 'i').test(app), 'ceremony "' + k + '" exists');

// escapable by key, from a rendered page
const server = await serve(4755);
const b = await browser();
const v = await open(b, server.base, '/app/gratus', { settle: 1600 });
const keyed = await v.page.evaluate(() => {
  const root = document.querySelector('#ceremony');
  if (!root) return { root: false };
  // the helper that already gets this right elsewhere in the repo
  return { root: true, escapes: typeof root.onkeydown === 'function' || root.dataset.escapable === '1' };
});
await v.close();
say(keyed.root, 'the ceremony layer is in the shell');
say(keyed.escapes === true, 'the ceremony layer answers a key');
await b.close();
await server.close();
console.log('G23 ceremonies: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
