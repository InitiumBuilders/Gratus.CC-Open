// G25 · DIAGRAMS FIT A PHONE.
//
// There is a known failure behind this one: a systems map that rendered two
// thirds off the side of a phone. So every diagram is authored at 375 first, has
// a viewBox and no fixed pixel width, carries no text under 13px at rendered
// size, and has a text equivalent beneath it that says the same thing.
//
// Mutant: set an SVG label to 10px. This must go red.
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, open, ROOT } from './lib/harness.mjs';

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + msg); };
const DIR = path.join(ROOT, 'docs/diagrams');

console.log('G25 - diagrams');
if (!fs.existsSync(DIR)) {
  console.log('  ABSENT  docs/diagrams/ does not exist');
  console.log('G25 diagrams: FAIL - no diagrams');
  process.exit(1);
}
const svgs = fs.readdirSync(DIR).filter((f) => f.endsWith('.svg'));
for (const f of svgs) {
  const t = fs.readFileSync(path.join(DIR, f), 'utf8');
  say(/viewBox=/.test(t), f + ' has a viewBox');
  say(!/<svg[^>]+width="\d+(px)?"/.test(t), f + ' has no fixed pixel width');
  const small = [...t.matchAll(/font-size[:=]["']?\s*(\d+(?:\.\d+)?)/g)].map((m) => parseFloat(m[1])).filter((n) => n < 13);
  say(small.length === 0, f + ' has no text under 13px' + (small.length ? '  (' + small.join(', ') + ')' : ''));
  const txt = path.join(DIR, f.replace(/\.svg$/, '.md'));
  say(fs.existsSync(txt), f + ' has a text equivalent beside it');
}
console.log('G25 diagrams: ' + (fails ? 'FAIL - ' + fails : 'PASS - ' + svgs.length + ' diagrams'));
process.exit(fails ? 1 : 0);
