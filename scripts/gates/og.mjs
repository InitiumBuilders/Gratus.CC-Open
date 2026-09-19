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
  for (const c of ['api/og/' + fn + '.js', 'api/render' + route.replace(/[^a-z0-9]/gi, '') + '.js']) {
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
console.log('G18 og: ' + (fails ? 'FAIL - ' + fails : 'PASS - ' + ROUTES.length + ' routes, ' + ROUTES.length + ' faces'));
process.exit(fails ? 1 : 0);
