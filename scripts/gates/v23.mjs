// Every gate, in one command, with the numbers printed.
//
//   node scripts/gates/v23.mjs            run them all
//   node scripts/gates/v23.mjs --fast     skip the ones that open a browser
//
// A gate is a command that exits 0 or it does not count. This runs each one,
// prints its last line, and exits non-zero if any of them is red.
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FAST = process.argv.includes('--fast');
const L = './scripts/gates/lib/loader.mjs';

const GATES = [
  ['engine', 'node --test scripts/tests/*.test.mjs', false],
  ['G14 migration', 'node scripts/gates/migration.mjs --decoy', false],
  ['G1/G2/G5 banned', 'node scripts/gates/banned.mjs --decoy && node scripts/gates/banned.mjs', false],
  ['G4 copy-live', 'node scripts/gates/copy-live.mjs', false],
  ['G6 integrity', 'node --import ' + L + ' scripts/gates/integrity.mjs', false],
  ['G30 accounts', 'node --import ' + L + ' scripts/gates/account.mjs', false],
  ['G32 your people', 'node --import ' + L + ' scripts/gates/people.mjs', false],
  ['G33 people on screen', 'node scripts/gates/people-ui.mjs', true],
  ['G34 giveth pitch', 'node --import ' + L + ' scripts/gates/giveth-pitch.mjs', true],
  ['G35 front door', 'node --import ' + L + ' scripts/gates/landing.mjs', true],
  ['G7 open-source', 'node scripts/gates/open-source.mjs . --decoy', false],
  ['G9 contrast', 'node scripts/gates/contrast.mjs', false],
  ['slop', 'node scripts/gates/slop.mjs --decoy && node scripts/gates/slop.mjs', false],
  ['G15 hidden', 'node scripts/gates/hidden.mjs', false],
  ['G16 glyph', 'node scripts/gates/glyph.mjs', false],
  ['G17 bridge', 'node scripts/gates/bridge.mjs', false],
  ['G18 og', 'node scripts/gates/og.mjs', false],
  ['G19 docs', 'node scripts/gates/docs.mjs', false],
  ['G20 refs', 'node scripts/gates/refs.mjs', false],
  ['G21 strings', 'node scripts/gates/strings.mjs', false],
  ['G22 families', 'node scripts/gates/families.mjs', false],
  ['G24 guides', 'node scripts/gates/guides.mjs', false],
  ['G25 diagrams', 'node scripts/gates/diagrams.mjs', false],
  ['G26 frontdoor', 'node scripts/gates/frontdoor.mjs', false],
  ['G27 steward', 'node scripts/gates/steward.mjs', true],
  ['G28 the hand', 'node scripts/gates/thehand.mjs', true],
  ['G31 paths', 'node scripts/gates/paths.mjs', true],
  ['G29 arrival', 'node scripts/gates/arrival.mjs', true],
  ['G8 weight', 'node scripts/gates/weight.mjs', true],
  ['G10/G11/G13 a11y', 'node scripts/gates/a11y.mjs', true],
  ['G12 states', 'node scripts/gates/states.mjs', true],
  ['G23 ceremonies', 'node scripts/gates/ceremonies.mjs', true],
  ['overflow', 'node scripts/gates/overflow.mjs', true],
];

let red = 0, green = 0, skipped = 0;
for (const [name, cmd, needsBrowser] of GATES) {
  if (FAST && needsBrowser) { skipped++; console.log('  skip  ' + name.padEnd(20) + '(browser)'); continue; }
  let out = '', code = 0;
  try { out = execSync(cmd, { cwd: root, stdio: 'pipe', timeout: 600000 }).toString(); }
  catch (e) { code = e.status || 1; out = (e.stdout || '').toString() + (e.stderr || '').toString(); }
  const last = out.trim().split('\n').filter(Boolean).pop() || '(no output)';
  if (code) red++; else green++;
  console.log('  ' + (code ? 'RED   ' : 'green ') + name.padEnd(20) + last.slice(0, 92));
}
console.log('\ngates: ' + green + ' green · ' + red + ' red' + (skipped ? ' · ' + skipped + ' skipped' : ''));
process.exit(red ? 1 : 0);
