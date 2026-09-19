// G16 · THE GLYPH IS DETERMINISTIC.
//
// The Gratus Glyph is the one thing a person can show somebody else that is
// theirs and could not exist without the days they put in. So it has to exist,
// be the same drawing every time from the same garden, a different drawing from
// a different garden, and never more than forty strokes.
//
// The determinism checks live in scripts/tests/glyph.test.mjs and run with the
// rest of the suite once the module is there. This gate is what says it has to
// be there at all.
//
// Mutant: make the glyph depend on the clock. The unit test goes red.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = path.join(root, 'engine/glyph.js');
let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + msg); };

say(fs.existsSync(file), 'engine/glyph.js exists');
if (fs.existsSync(file)) {
  const src = fs.readFileSync(file, 'utf8');
  say(!/Date\.now|Math\.random|new Date\(\)/.test(src), 'the glyph does not read the clock or a dice');
  try {
    execSync('node --test scripts/tests/glyph.test.mjs', { cwd: root, stdio: 'pipe' });
    say(true, 'the determinism tests pass');
  } catch (e) { say(false, 'the determinism tests fail'); }
}
console.log('G16 glyph: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
