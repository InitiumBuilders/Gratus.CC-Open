// G45 · THE PRIVACY PAGE SAYS WHAT THE SERVER DOES.
//
// The page said "The app has no accounts and no server that receives them" and "We do not
// run analytics" for two months after accounts, rooms and the counters had shipped. Each
// sentence was true the day it was written. Nothing had a reason to look at it again.
//
// This looks. Every server function that keeps or sends something about a person has a
// word the privacy page must say for as long as that function exists, and the sentences
// that were true once may not come back. The terms state the price while there is one.
//
// The control is the page as it stood on the live site until 2026-11-20. It has to fail.
//
//   node scripts/gates/policy.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const has = (f) => fs.existsSync(path.join(root, f));
const words = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

// [the server function, what the page has to name, how the page names it]
const NAMED = [
  ['api/account.js', 'that there are accounts, and what one keeps', /\baccount/i],
  ['api/billing.js', 'who takes a payment', /\bStripe\b/],
  ['api/voice.js', 'where a voice entry is sent', /\bElevenLabs\b/],
  ['api/trax.js', 'what is counted', /\bcount/i],
  ['api/vibes.js', 'that a room keeps what is posted in it', /\bVibe\b/],
  ['api/goals.js', 'that a goal is public', /\bgoal\b/i],
  ['api/trace.js', 'who can read a seed', /\bSeed\b/],
  ['api/echo.js', 'what the person who receives a gift can send back', /\barrived\b/i],
  ['api/giveth.js', 'that Giveth is read', /\bGiveth\b/],
];
// true once, and not since
const AGED = [/\bno accounts\b/i, /\bno server\b/i, /do not run analytics/i, /when a backend arrives/i, /free,? while it is being built/i, /shown as imagined/i];

function judge(privacy, terms) {
  const out = [];
  for (const [file, what, re] of NAMED) if (has(file) && !re.test(privacy)) out.push('privacy.html does not say ' + what + '  (' + file + ' is in the tree)');
  for (const re of AGED) {
    if (re.test(privacy)) out.push('privacy.html still says ' + re.source.replace(/\\b/g, ''));
    if (re.test(terms)) out.push('terms.html still says ' + re.source.replace(/\\b/g, ''));
  }
  if (has('api/billing.js') && !/\$\s?24\b/.test(terms)) out.push('terms.html does not state the price  (api/billing.js is in the tree)');
  if (!/device/i.test(privacy)) out.push('privacy.html does not say what stays on the device');
  return out;
}

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + msg); };
console.log('G45 - the privacy page says what the server does');
const found = judge(words('privacy.html'), words('terms.html'));
found.forEach((f) => console.log('        ' + f));
say(found.length === 0, 'privacy and terms match the tree  (' + NAMED.filter(([f]) => has(f)).length + ' server functions named)');

const WAS = 'Your gratitude entries are stored in your browser on your device. The app has no accounts and no server that receives them. '
  + 'We do not run analytics, ads or trackers. When a backend arrives, this page will change before it does.';
const control = judge(WAS, 'It is offered as is, free, while it is being built. Project and partner cards are shown as imagined.');
say(control.length >= 10, 'the control: the pages as they stood until 2026-11-20 are refused  (' + control.length + ' findings)');

console.log('G45 the policy: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
