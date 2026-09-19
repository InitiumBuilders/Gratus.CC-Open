// G24 · THE MANUAL WAS ACTUALLY WRITTEN.
//
// A gate that proves the docs do not lie proves nothing about docs that were
// never written. This counts them: twenty-four guides, each a file with complete
// front matter, and every one listed at /guided.
//
// Mutant: delete one guide file. This must go red.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(root, 'docs/guides');
const WANT = 24;
const FRONT = ['title', 'audience', 'time', 'updated', 'verified-against'];

let fails = 0;
if (!fs.existsSync(DIR)) {
  console.log('  ABSENT  docs/guides/ does not exist');
  console.log('G24 guides: FAIL - 0 of ' + WANT);
  process.exit(1);
}
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.md')).sort();
for (const f of files) {
  const t = fs.readFileSync(path.join(DIR, f), 'utf8');
  const m = t.match(/^---\n([\s\S]*?)\n---/);
  if (!m) { fails++; console.log('  FAIL  ' + f + '  no front matter'); continue; }
  const missing = FRONT.filter((k) => !new RegExp('^' + k + ':\\s*\\S', 'm').test(m[1]));
  if (missing.length) { fails++; console.log('  FAIL  ' + f + '  front matter missing: ' + missing.join(', ')); continue; }
  if (t.replace(m[0], '').trim().length < 400) { fails++; console.log('  FAIL  ' + f + '  too thin to be a guide'); }
}
if (files.length < WANT) { fails++; console.log('  FAIL  ' + files.length + ' guides, wants ' + WANT); }

const index = path.join(root, 'guided.html');
if (!fs.existsSync(index)) { fails++; console.log('  FAIL  no /guided surface (guided.html)'); }
else {
  const html = fs.readFileSync(index, 'utf8');
  const unlisted = files.filter((f) => !html.includes(f.replace(/\.md$/, '')));
  if (unlisted.length) { fails++; console.log('  FAIL  not listed at /guided: ' + unlisted.join(', ')); }
}
console.log('G24 guides: ' + (fails ? 'FAIL - ' + fails : 'PASS - ' + files.length + ' guides'));
process.exit(fails ? 1 : 0);
