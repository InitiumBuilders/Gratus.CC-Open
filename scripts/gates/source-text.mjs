// G55 · NO HIDDEN TEXT IN THE SOURCE.
//
// A character that turns text around (a bidi control) or hides it (a zero-width space, a soft hyphen, an invisible
// operator) makes source read differently from what it does: the Trojan Source pattern (CVE-2021-42574). This
// release teaches the clerk to distrust hidden text, so its own source carries none. Every text file is read as
// drawn (engine/text.js asDrawn takes out only the parts that hold an emoji together), and any hidden character
// left over is a defect: write it as a braced escape such as \u{200D} instead. (A four-digit escape typed through
// some editing tools arrives as the real character, which is how the first ones got in.) The vendored folder is
// someone else's code, held by its hash, and attic/ is not served; both are skipped.
//
// The control plants a right-to-left override and a zero-width space, which must be found, beside an emoji family
// and a flag, which must pass.
//
//   node scripts/gates/source-text.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { asDrawn } from '../../engine/text.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const EXT = new Set(['.js', '.mjs', '.cjs', '.css', '.html', '.json', '.md', '.webmanifest', '.svg', '.txt', '.py', '.sh']);
const SKIP = new Set(['node_modules', '.git', '.vercel', 'attic', 'vendor']);
const HIDDEN = /[\p{Cc}\p{Cf}\u{2028}\u{2029}]/u;

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (EXT.has(path.extname(e.name))) out.push(p);
  }
  return out;
}

/** every hidden character left once a line is read as drawn: [{ line, code }] */
export function hiddenIn(text) {
  const out = [];
  String(text).split('\n').forEach((line, i) => {
    for (const c of asDrawn(line)) {
      if (c === '\t' || c === '\r') continue;
      if (HIDDEN.test(c)) out.push({ line: i + 1, code: 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0') });
    }
  });
  return out;
}

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + msg); };
console.log('G55 - no hidden text in the source');

const files = walk(root, []);
const found = [];
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  for (const h of hiddenIn(text)) found.push(path.relative(root, f).replace(/\\/g, '/') + ':' + h.line + ' ' + h.code);
}
found.slice(0, 20).forEach((x) => console.log('        ' + x));
if (found.length > 20) console.log('        ... and ' + (found.length - 20) + ' more');
say(found.length === 0, 'no file holds a hidden or text-turning character outside an emoji  (' + files.length + ' files read)');

const planted = hiddenIn('const a = "ok\u{202E}kd";\nconst b = "x\u{200B}y";');
const kept = hiddenIn('a family \u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467} and a flag \u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}');
say(planted.length === 2 && kept.length === 0, 'the control: a planted override and zero-width space are found, an emoji family and a flag pass  (' + planted.length + ', ' + kept.length + ')');

console.log('G55 the source text: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
