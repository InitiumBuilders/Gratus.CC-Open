// G14 · NOBODY LOSES A GARDEN.
//
// The most dangerous line this repository ever held was in assets/js/galaxy.js:
//
//     if (!S || S.v !== 1) S = fresh();
//
// Strict equality against one version, and a fresh garden for anything else. The
// first time this app wrote `v: 2`, every garden still holding `v: 1` would have
// been deleted on open, silently, with no export and no way back.
//
// This gate loads a whole captured garden at v:1, walks it up the ladder in
// engine/state.js, and asserts that every day of it survived. It also asserts the
// two cases the old line got wrong in the other direction: a garden from a build
// newer than this one is kept rather than reset, and a garden with a version this
// build has never seen is repaired rather than replaced.
//
// Mutant: restore the old line, or make upgrade() call fresh() on a mismatch.
// This gate must go red.
//
//   node scripts/gates/migration.mjs
//   node scripts/gates/migration.mjs --decoy
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATE_V, fresh, upgrade, patch } from '../../engine/state.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FIX = path.join(root, 'scripts/fixtures/garden-v1.json');

let fails = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { console.log('  pass  ' + name + (detail ? '  ' + detail : '')); return true; }
  fails++; console.log('  FAIL  ' + name + (detail ? '  ' + detail : '')); return false;
};
const load = () => JSON.parse(fs.readFileSync(FIX, 'utf8'));

// everything a garden is made of, and what would be lost if a step dropped it
function census(s) {
  return {
    entries: (s.entries || []).length,
    entryWords: (s.entries || []).reduce((n, e) => n + String(e.text || '').split(/\s+/).filter(Boolean).length, 0),
    plants: (s.plants || []).length,
    keptDays: (s.plants || []).reduce((n, p) => n + (p.kept || []).length, 0),
    carried: (s.plants || []).reduce((n, p) => n + (Number(p.carried) || 0), 0),
    given: ((s.gifts || {}).given || []).length,
    received: ((s.gifts || {}).received || []).length,
    seeds: (s.seeds || []).length,
    goals: (s.goals || []).length,
    folders: (s.folders || []).length,
    vibes: (s.vibes || []).length,
    milestones: Object.keys(s.milestones || {}).length,
    alch: Object.keys(s.alch || {}).length,
    made: Object.keys(s.made || {}).length,
    myEmoji: ((s.my || {}).emojis || []).length,
    name: s.name || '',
    opens: Number(s.opens) || 0,
  };
}

console.log('G14 · nobody loses a garden');

// ── 1 · a real v1 garden survives the walk, whole ──────────────────────────
const before = census(load());
const after = census(upgrade(load()));
for (const k of Object.keys(before)) {
  ok('kept ' + k, JSON.stringify(after[k]) === JSON.stringify(before[k]),
    JSON.stringify(before[k]) + (after[k] === before[k] ? '' : ' -> ' + JSON.stringify(after[k])));
}

// ── 2 · the walk actually happened ────────────────────────────────────────
const walked = upgrade(load());
ok('version walked to ' + STATE_V, walked.v === STATE_V, 'got ' + walked.v);
ok('v2 fields added', typeof walked.glyphSeed === 'string' && !!walked.hidden && !!walked.cer,
  'glyphSeed/hidden/cer');

// ── 3 · the deep content is identical, not merely the same count ──────────
const raw = load();
const up = upgrade(load());
ok('first entry text unchanged', up.entries[0].text === raw.entries[0].text);
ok('starred entry still starred', up.entries[0].star === true);
ok('folder id still bound', up.entries[0].folder === 'f_morning');
ok('voice record kept', JSON.stringify(up.entries[1].voice) === JSON.stringify(raw.entries[1].voice));
ok('gift echo kept', up.gifts.given[0].echo === raw.gifts.given[0].echo);
ok('returns seen count kept', up.gifts.given[0].seen === raw.gifts.given[0].seen);
ok('gifted plant keeps its origin', up.plants[2].from === 'Natalie' && up.plants[2].origin === 'gift');
ok('bloomed seed keeps its reply', up.seeds[0].water.reply === raw.seeds[0].water.reply);
ok('seed author key kept', up.seeds[0].mine === raw.seeds[0].mine);

// ── 4 · the two cases the old line got wrong in the other direction ───────
const future = Object.assign(load(), { v: 99, name: 'From a newer build' });
const fu = upgrade(JSON.parse(JSON.stringify(future)));
ok('a newer garden is kept, not reset', fu.name === 'From a newer build' && fu.entries.length === before.entries,
  'v=' + fu.v);
ok('a newer garden keeps its own version', fu.v === 99, 'got ' + fu.v);

const odd = Object.assign(load(), { v: 'banana' });
const od = upgrade(JSON.parse(JSON.stringify(odd)));
ok('an unreadable version is repaired, not wiped', od.entries.length === before.entries && od.plants.length === before.plants);

// ── 5 · only a non-garden gets a fresh one ────────────────────────────────
ok('null gets a fresh garden', upgrade(null).entries.length === 0 && upgrade(null).v === STATE_V);
ok('a string gets a fresh garden', upgrade('nope').v === STATE_V);
ok('an array gets a fresh garden', upgrade([1, 2, 3]).v === STATE_V);

// ── 6 · a garden missing everything is repaired rather than replaced ──────
const bare = { v: 1, name: 'Bare', entries: [{ id: 'x', day: '2026-01-01', text: 'one line' }] };
const br = upgrade(bare);
ok('a sparse garden keeps its words', br.entries.length === 1 && br.entries[0].text === 'one line');
ok('a sparse garden gets its missing shelves', Array.isArray(br.plants) && Array.isArray(br.vibes) && !!br.gifts.given);
ok('patch is idempotent', JSON.stringify(patch(patch(br))) === JSON.stringify(patch(br)));

// ── 7 · fresh() is complete ───────────────────────────────────────────────
const f = fresh();
ok('fresh has every shelf', ['entries', 'plants', 'gifts', 'my', 'wishes', 'goals', 'folders',
  'milestones', 'seeds', 'alch', 'vibes', 'made', 'hidden', 'cer'].every((k) => f[k] !== undefined));

// ── the decoy: prove this gate still bites ────────────────────────────────
if (process.argv.includes('--decoy')) {
  // the old line, exactly as it was
  const wipeOnMismatch = (s) => (!s || s.v !== 1 ? fresh() : s);
  const victim = load();
  victim.v = 2;                                     // the day the app bumps
  const result = wipeOnMismatch(victim);
  const caught = result.entries.length === 0 && victim.entries.length > 0;
  console.log(caught
    ? '  pass  DECOY: the old wipe-on-mismatch line destroys a garden, and this gate is watching for it'
    : '  FAIL  DECOY: the old line no longer destroys anything, so this gate proves nothing');
  if (!caught) fails++;
}

console.log('G14: ' + (fails ? 'FAIL · ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
