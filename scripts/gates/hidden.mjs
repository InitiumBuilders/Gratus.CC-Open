// G15 · NOTHING IS WATCHING YOU.
//
// This gate used to do the opposite. It held three finished sentences in config and
// refused to let them sit unread, so it made me wire them into the app: one of them
// learned the hour somebody usually opened Gratus, waited for them to arrive in it, and
// told them the soil had noticed. He read it and said stop.
//
// A gate that enforces a feature is only ever as right as the feature. This one enforces
// the promise instead, which cannot go out of date: the app does not study you, and it
// does not talk like something that has been watching.
//
//   node scripts/gates/hidden.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rd = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let fails = 0;
const say = (ok, m) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + m); };

console.log('G15 - nothing is watching you');

// ── the lines are gone from config, and kept where retired words are kept ──
const prompts = JSON.parse(rd('config/prompts.json'));
say(!prompts.hidden, 'config/prompts.json carries no hidden layer');
const his = JSON.parse(rd('config/his-words.json'));
say(!!(his.retired && his.retired.hiddenLayer && his.retired.hiddenLayer.lines),
  'and the removed lines are retired rather than destroyed');

// ── nothing shipped records when you show up ──
const shipped = [];
for (const dir of ['assets/js', 'engine', 'api']) {
  for (const f of fs.readdirSync(path.join(root, dir))) {
    if (f.endsWith('.js') || f.endsWith('.mjs')) shipped.push(dir + '/' + f);
  }
}
// A line that deletes the field is the opposite of a line that keeps one, so the
// deletions come out before the question is asked.
const noDeletes = (t) => t.replace(/delete\s+[A-Za-z0-9_.$[\]'"]+\s*;/g, '');
const writesHour = shipped.filter((f) => /gardenHour\s*=|\.gardenHour\b|\.coinHold\b/.test(noDeletes(rd(f))));
say(writesHour.length === 0, 'no shipped file records the hour somebody arrives' + (writesHour.length ? '  (' + writesHour.join(', ') + ')' : ''));

// ── and a garden that already carries one loses it, which is the part that matters ──
const { upgrade, STATE_V } = await import(path.join(root, 'engine/state.js'));
const watched = { v: 4, entries: [], plants: [], gardenHour: 21, cer: { gardenHour: '2026-09-18' }, hidden: { coinHold: 1 } };
const after = upgrade(watched);
say(after.v === STATE_V, 'a garden from before this comes up to ' + STATE_V + '  (' + after.v + ')');
say(after.gardenHour === undefined, 'and the hour it had been keeping is gone from it');
say(!after.cer.gardenHour && !after.hidden.coinHold, 'along with everything that was counting on it');
say(JSON.stringify(after).indexOf('gardenHour') === -1, 'the words are not anywhere in what comes back');

// ── the app does not speak like something that has been watching ──
const CREEPY = [
  [/\bthe soil (noticed|remembers|knows|saw)\b/i, 'the soil noticed you'],
  [/\bwe (noticed|have noticed|see you)\b/i, 'we noticed'],
  [/\b(I|we|Gratus) (have been|has been) (watching|waiting for you)\b/i, 'it has been waiting'],
  [/\byou (always|usually) (come|arrive|open)\b/i, 'it knows your habits'],
  [/\byour usual (hour|time)\b/i, 'your usual hour'],
  [/\bat the garden hour\b/i, 'the garden hour'],
];
const surfaces = shipped.concat(fs.readdirSync(root).filter((f) => f.endsWith('.html')))
  .concat(['config/prompts.json', 'config/copy.json']);
let creepy = 0;
for (const f of surfaces) {
  const t = rd(f);
  for (const [re, what] of CREEPY) {
    const m = t.match(re);
    if (m) { creepy++; console.log('  FAIL  ' + f + ' says ' + JSON.stringify(m[0]) + '  (' + what + ')'); }
  }
}
say(creepy === 0, surfaces.length + ' surfaces, none of them talking like something that has been watching');

// ── the one line worth keeping is still reachable ──
const app = rd('assets/js/galaxy.js');
say(/function anniversaryOf\(/.test(app) && /anniversaryOf\(p\)/.test(app),
  'a plant that comes round to its own date still says so, on itself');

console.log('G15 nothing is watching: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
