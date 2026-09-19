// G4 · NO DEAD COPY.
//
// Every key under config/copy.json -> locked is read by at least one line of
// shipped code, or it is gone. This is a public repository, so copy that renders
// nowhere is still published copy, and it is the version of the product a
// developer reads first. A fossil in a config file is a sentence the app is
// believed to say and does not.
//
// Mutant: add an unread key back to locked. This must go red.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SKIP = new Set(['node_modules', '.git', '.vercel', 'attic', 'scripts']);
const EXT = new Set(['.js', '.mjs', '.html']);

function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXT.has(path.extname(e.name))) out.push(p);
  }
  return out;
}

const code = walk(root).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const copy = JSON.parse(fs.readFileSync(path.join(root, 'config/copy.json'), 'utf8'));
const locked = copy.locked || {};

let fails = 0;
const dead = [];
for (const key of Object.keys(locked)) {
  // read as C.copy.locked.key, copy.locked[key], locked.key, or by the literal
  // only a real lookup counts: locked.key or locked['key'].  A bare .key would
  // match any property anywhere and call dead copy live.
  const re = new RegExp('locked\\s*(?:\\.|\\[\\s*[\'"])' + key + '\\b');
  if (!re.test(code)) { fails++; dead.push(key); }
}
if (dead.length) console.log('  unread keys in config/copy.json -> locked:  ' + dead.join(', '));
console.log('G4 copy-live: ' + (fails ? 'FAIL - ' + fails + ' unread' : 'PASS - every locked key is read'));
process.exit(fails ? 1 : 0);
