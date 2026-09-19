// G20 · EVERY SHIPPED REFERENCE RESOLVES.
//
// Every src= and href= in every shipped HTML file, every url() in every
// stylesheet, and every asset path the service worker precaches, points at a
// file that is on disk. A page that asks for a file that is not there shows a
// broken frame to a stranger and nothing in the build says a word about it.
//
// Mutant: rename a file an HTML page points at. This must go red.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const HTML = ['index.html', 'app.html', 'privacy.html', 'terms.html'];
const CSS = ['assets/css/tokens.css', 'assets/css/galaxy.css'];

const strip = (u) => u.split('#')[0].split('?')[0].trim();
// vercel.json rewrites these to a real file; a link to one is a link to a page,
// not a missing asset. Read them from vercel.json so the gate cannot drift from
// what is actually deployed.
const routes = (() => {
  const vj = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  return (vj.rewrites || []).map((r) => new RegExp('^' + String(r.source)
    .replace(/:[a-zA-Z]+\*/g, '.*').replace(/:[a-zA-Z]+/g, '[^/]+') + '$'));
})();
const isRoute = (u) => routes.some((re) => re.test(u));
const external = (u) => /^(https?:|data:|mailto:|tel:|blob:|\/\/)/i.test(u) || u === '' || u.startsWith('#');

let fails = 0;
const miss = [];
function check(from, url) {
  const u = strip(url);
  if (external(u) || isRoute(u)) return;
  const rel = u.startsWith('/') ? u.slice(1) : path.join(path.dirname(from), u);
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) { fails++; miss.push(from + '  ->  ' + url); }
}

for (const f of HTML) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) { fails++; miss.push('missing html file: ' + f); continue; }
  const t = fs.readFileSync(p, 'utf8');
  for (const m of t.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)) check(f, m[1]);
  for (const m of t.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) check(f, m[1]);
}
for (const f of CSS) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) { fails++; miss.push('missing stylesheet: ' + f); continue; }
  const t = fs.readFileSync(p, 'utf8');
  for (const m of t.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) check(f, m[1]);
}
// the worker promises these offline; a promise about a file that is gone is worse
// than no promise at all
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
for (const m of sw.matchAll(/'(\/[^']+)'/g)) {
  const u = strip(m[1]);
  if (u.startsWith('/api') || u === '/' || isRoute(u)) continue;
  const file = path.join(root, u.slice(1));
  if (!fs.existsSync(file)) { fails++; miss.push('sw.js precache  ->  ' + m[1]); }
}

miss.forEach((m) => console.log('  MISSING  ' + m));
console.log('G20 refs: ' + (fails ? 'FAIL - ' + fails + ' unresolved' : 'PASS'));
process.exit(fails ? 1 : 0);
