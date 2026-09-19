// G26 · THE FRONT DOOR IS OPEN.
//
// A public MIT repository with no way to report a fault, no stated rules and no
// example environment file is open in licence only. Each of these has to exist
// and carry something; an empty file is a closed door with a sign on it.
//
// Mutant: empty SECURITY.md. This must go red.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NEED = [
  ['CONTRIBUTING.md', 400], ['CODE_OF_CONDUCT.md', 400], ['SECURITY.md', 400],
  ['GOVERNANCE.md', 300], ['.env.example', 60],
  ['.github/pull_request_template.md', 150],
  ['.github/ISSUE_TEMPLATE/bug.md', 100],
  ['.github/ISSUE_TEMPLATE/guide-is-wrong.md', 100],
  ['.github/ISSUE_TEMPLATE/a-word-i-could-not-read.md', 100],
];
let fails = 0;
for (const [f, min] of NEED) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) { fails++; console.log('  ABSENT  ' + f); continue; }
  const n = fs.readFileSync(p, 'utf8').trim().length;
  if (n < min) { fails++; console.log('  THIN    ' + f + '  ' + n + ' chars, wants ' + min); }
}
console.log('G26 frontdoor: ' + (fails ? 'FAIL - ' + fails : 'PASS - ' + NEED.length + ' doors open'));
process.exit(fails ? 1 : 0);
