// The shared floor under every gate that has to look at a rendered page.
//
// Four of the last five defects this repository shipped were things the code got
// right and the screen got wrong: a digit that drew as a letter, a word cut in
// half, a mark that could never be seen, a writing box under the fold. None of
// them is visible by reading source. So the gates that matter most here open a
// real browser, render the real page, and measure the pixels.
//
// It fails closed. If there is no browser it says so and exits non-zero, because
// a gate that cannot look is not a gate that passed.
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

// The same rewrites vercel.json declares, so a gate measures the routes people
// actually visit rather than the files they happen to sit in.
function rewrite(p) {
  if (p === '/' || p === '/index.html') return '/index.html';
  if (p === '/app' || p.startsWith('/app/')) return '/app.html';
  if (p === '/gift' || p === '/passage' || p.startsWith('/p/')) return '/app.html';
  if (p === '/privacy') return '/privacy.html';
  if (p === '/terms') return '/terms.html';
  return p;
}

export function serve(port = 4747) {
  const wire = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let rel = rewrite(decodeURIComponent(url.pathname));
    const file = path.join(ROOT, rel.replace(/^\/+/, ''));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      wire.push({ url: url.pathname, status: 404, bytes: 0 });
      res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); return;
    }
    const body = fs.readFileSync(file);
    wire.push({ url: url.pathname, status: 200, bytes: body.length, type: path.extname(file) });
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  });
  return new Promise((ok) => server.listen(port, () => ok({
    base: 'http://127.0.0.1:' + port,
    wire,
    reset: () => { wire.length = 0; },
    close: () => new Promise((d) => server.close(d)),
  })));
}

// Where a chromium might be, found rather than written down. A path with
// somebody's home directory in it is a path that only works on one machine, and
// in a public repository it is also their name. The publish gate caught exactly
// that here, which is what it is for.
function chromiumCandidates() {
  const out = [];
  if (process.env.GRATUS_CHROMIUM) out.push(process.env.GRATUS_CHROMIUM);
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH
    || path.join(os.homedir(), '.cache', 'ms-playwright');
  try {
    for (const dir of fs.readdirSync(cache)) {
      if (!/^chromium(_headless_shell)?-/.test(dir)) continue;
      for (const rel of ['chrome-linux64/chrome', 'chrome-linux/chrome',
        'chrome-headless-shell-linux64/chrome-headless-shell']) {
        out.push(path.join(cache, dir, rel));
      }
    }
  } catch (e) { /* no cache on this machine */ }
  return out.concat(['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']);
}

export async function browser() {
  let pw;
  try { pw = await import('playwright'); } catch (e) {
    console.log('  no browser: playwright is not installed.');
    console.log('  install it with:  npm i -D playwright && npx playwright install chromium');
    console.log('  this gate measures a rendered page and cannot report a pass without one.');
    process.exit(1);
  }
  const errs = [];
  try { return await pw.chromium.launch(); } catch (e) { errs.push(e.message.split('\n')[0]); }
  for (const exe of chromiumCandidates()) {
    if (!fs.existsSync(exe)) continue;
    try { return await pw.chromium.launch({ executablePath: exe }); } catch (e) { errs.push(e.message.split('\n')[0]); }
  }
  console.log('  no browser: playwright is installed but no chromium would start.');
  console.log('  run:  npx playwright install chromium');
  console.log('  or set GRATUS_CHROMIUM to a chromium binary.');
  errs.slice(0, 2).forEach((e) => console.log('    ' + e.slice(0, 120)));
  process.exit(1);
}

// One place that decides what a phone is, so every gate measures the same phone.
export const PHONE = { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
export const WIDTHS = [320, 375, 390];

// The two surfaces that load without a person doing anything, plus the rooms.
// A room is reached by its own URL because vercel.json rewrites all of them to
// app.html and the app reads the path.
export const VIEWS = [
  ['landing', '/'],
  ['gratus', '/app?tab=gratus'],
  ['grow', '/app/grow'],
  ['give', '/app/give'],
  ['book', '/app/book'],
  ['garden', '/app/garden'],
  ['guides', '/app/guides'],
  ['vibes', '/app/vibes'],
  ['giveth', '/app/giveth'],
  ['console', '/app/console'],
  ['galaxy', '/app/galaxy'],
  ['projects', '/app/projects'],
  ['world', '/app/world'],
  ['vault', '/app/vault'],
  ['earth', '/app/earth'],
];

// Open a view with the ritual skipped and the app settled. Gates measure the
// page a person reads, not the doorway they walk through.
export async function open(b, base, route, opts = {}) {
  const ctx = await b.newContext({
    ...PHONE,
    ...(opts.viewport ? { viewport: opts.viewport } : {}),
    ...(opts.reducedMotion ? { reducedMotion: opts.reducedMotion } : {}),
  });
  const page = await ctx.newPage();
  const join = route.includes('?') ? '&' : '?';
  await page.goto(base + route + join + 'nosplash=1&dev=1', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(opts.settle || 1400);
  return { page, ctx, close: () => ctx.close() };
}

export function report(name, fails, notes = []) {
  notes.forEach((n) => console.log('  ' + n));
  console.log(name + ': ' + (fails ? 'FAIL · ' + fails : 'PASS'));
  process.exit(fails ? 1 : 0);
}
