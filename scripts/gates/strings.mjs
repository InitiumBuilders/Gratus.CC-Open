// G21 · NO STRING A PERSON READS LIVES IN CODE.
//
// This repository states its own rule: nothing a person reads lives in a
// template literal, because copy that lives in code cannot be reworded without
// an edit to code. The rule has never been mechanical, so the app drifted: the
// home header, the whole gift journey and the most sacred string in the product
// are all hardcoded today.
//
// This counts the user-facing string literals under assets/js and refuses an
// increase. The baseline is a number in this file, lowered as copy moves into
// config/ and never raised.
//
// Mutant: move a config string back into a template literal. This must go red.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASELINE = Number(process.env.GRATUS_STRINGS_BASELINE || 0) || null;

function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'attic' || e.name === 'node_modules') continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.m?js$/.test(e.name)) out.push(p);
  }
  return out;
}

// A sentence a person reads: three or more words, starting with a letter, not a
// selector, not a class list, not a url, not an id.
const SENTENCE = /(^|[^\w$])(['"])((?:[A-Z][a-z]|[A-Z]{2,}\s|[a-z]+\s)[^'"<>{}]{10,}?)\2/g;
const NOISE = /^[.#\/]|[{}<>]|^https?:|^data:|^[a-z-]+:[^ ]|^\s*$|^[a-z0-9_-]+$|px\b|\bvar\(|^[A-Za-z-]+\s*=\s*/;

let total = 0;
const per = [];
for (const f of walk(path.join(root, 'assets/js'))) {
  const t = fs.readFileSync(f, 'utf8');
  let n = 0;
  for (const m of t.matchAll(SENTENCE)) {
    const s = m[3].trim();
    if (NOISE.test(s)) continue;
    if (!/\s/.test(s)) continue;
    if (s.split(/\s+/).length < 3) continue;
    n++;
  }
  if (n) per.push([path.relative(root, f), n]);
  total += n;
}
per.sort((a, b) => b[1] - a[1]).forEach(([f, n]) => console.log('  ' + String(n).padStart(4) + '  ' + f));
console.log('  total user-facing string literals under assets/js: ' + total);

if (BASELINE === null) {
  console.log('G21 strings: BASELINE NOT SET - record it after the module split, then hold it');
  console.log('  set GRATUS_STRINGS_BASELINE=' + total + ' once the split and the attic move are done');
  process.exit(1);
}
const over = total > BASELINE;
console.log('G21 strings: ' + (over ? 'FAIL - ' + total + ' > ' + BASELINE : 'PASS - ' + total + ' <= ' + BASELINE));
process.exit(over ? 1 : 0);
