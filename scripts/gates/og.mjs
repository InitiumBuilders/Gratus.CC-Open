// G18 · EVERY LINK HAS A FACE.
//
// Six routes are shareable and today they share one picture and one sentence
// between them. A link that arrives in a message with somebody else's title on
// it does not get opened. Each route needs its own title, description and image.
//
// vercel.json rewrites /app, /gift, /p/:slug and /passage to one static file, so
// distinct tags mean those routes render their own shell. This gate states the
// requirement; the work is in Movement V.
//
// Mutant: give two routes the same og:image. This must go red.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ROUTES = ['/', '/app', '/gift', '/p/:slug', '/passage', '/guided'];

// where a route's shell comes from today
function shellFor(route) {
  if (route === '/') return 'index.html';
  const fn = route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/-+$/, '');
  // a route may answer from a function or from a shell of its own; both are shells
  for (const c of ['api/og/' + fn + '.js', fn.replace(/-.*$/, '') + '.html', fn + '.html']) {
    if (fs.existsSync(path.join(root, c))) return c;
  }
  return 'app.html';
}
const tag = (html, prop) => {
  const m = html.match(new RegExp('<meta[^>]+(?:property|name)=["\']' + prop + '["\'][^>]*content=["\']([^"\']+)', 'i'))
    || html.match(new RegExp('<meta[^>]+content=["\']([^"\']+)["\'][^>]*(?:property|name)=["\']' + prop + '["\']', 'i'));
  return m ? m[1] : null;
};

let fails = 0;
const seen = { title: new Map(), image: new Map() };
for (const r of ROUTES) {
  const shell = shellFor(r);
  const p = path.join(root, shell);
  if (!fs.existsSync(p)) { fails++; console.log('  FAIL  ' + r + '  no shell (' + shell + ')'); continue; }
  const html = fs.readFileSync(p, 'utf8');
  const t = tag(html, 'og:title'), d = tag(html, 'og:description'), i = tag(html, 'og:image');
  if (!t || !d || !i) { fails++; console.log('  FAIL  ' + r + '  missing og:' + [!t && 'title', !d && 'description', !i && 'image'].filter(Boolean).join('/')); continue; }
  for (const [k, v] of [['title', t], ['image', i]]) {
    if (seen[k].has(v)) { fails++; console.log('  FAIL  ' + r + '  shares og:' + k + ' with ' + seen[k].get(v)); }
    else seen[k].set(v, r);
  }
  if (!fails) console.log('  pass  ' + r + '  ' + t.slice(0, 44));
}
// The shared pages are app.html with their own face. A page that loads a different app than
// app.html does (an old stamp, an old stylesheet) hands a returning visitor an older build out
// of the offline cache, and the gift page is the one a new person opens first.
const assets = (html) => [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\?v=[^"]+)"/g)].map((m) => m[1]).sort().join(' ');
const drift = (app, shells) => shells.filter(([, html]) => assets(html) !== assets(app)).map(([f]) => f);
const SHELLS = ['gift.html', 'p.html', 'passage.html', 'guided.html'].filter((f) => fs.existsSync(path.join(root, f)));
const appHtml = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const pages = SHELLS.map((f) => [f, fs.readFileSync(path.join(root, f), 'utf8')]);
const off = drift(appHtml, pages);
if (off.length) { fails++; console.log('  FAIL  these pages load a different app than app.html: ' + off.join(', ') + '  (run python3 scripts/shells.py)'); }
else console.log('  pass  the ' + SHELLS.length + ' shared pages load exactly what app.html loads');
// the control: one shared page left on an older stamp has to be seen
const aged = pages.map(([f, h], k) => [f, k === 0 ? h.replace(/galaxy\.js\?v=[0-9a-z]+/, 'galaxy.js?v=1') : h]);
if (drift(appHtml, aged).length !== 1) { fails++; console.log('  FAIL  the control: a shared page on an older stamp went unseen'); }
else console.log('  pass  the control: a shared page on an older stamp is seen');
console.log('G18 og: ' + (fails ? 'FAIL - ' + fails : 'PASS - ' + ROUTES.length + ' routes, ' + ROUTES.length + ' faces'));
process.exit(fails ? 1 : 0);
