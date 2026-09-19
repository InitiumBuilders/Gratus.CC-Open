// G15 · THE HIDDEN LAYER IS WIRED.
//
// config/prompts.json -> hidden holds three finished sentences that no line of
// code has ever read. They are the quietest thing in the product and they have
// never once reached a person. This refuses that: each key is read by shipped
// code, and each has a call site that can fire.
//
// Mutant: delete one hidden call site. This must go red.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rd = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + msg); };

const prompts = JSON.parse(rd('config/prompts.json'));
const hidden = prompts.hidden || {};
const keys = Object.keys(hidden);
say(keys.length >= 3, 'prompts.json holds ' + keys.length + ' hidden lines');

const app = rd('assets/js/galaxy.js');
for (const k of keys) {
  const re = new RegExp('hidden\\s*(?:\\.|\\[\\s*[\'"])' + k + '\\b');
  say(re.test(app), 'hidden.' + k + ' is read by shipped code');
}
// reading the string is not firing it; each needs a path that can reach a person
say(/gardenHour/.test(app), 'the garden hour has a condition in the app');
say(/anniversar/i.test(app), 'the anniversary has a condition in the app');
say(/coinHold|holdCore|thirteenSeconds/.test(app), 'the thirteen-second hold has a handler');

console.log('G15 hidden: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
