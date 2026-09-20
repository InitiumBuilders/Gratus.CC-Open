import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { __giveth } from './lib/blob-stub.mjs';
import { serve, browser, open } from './lib/harness.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.env.BLOB_READ_WRITE_TOKEN = 'gate-token';
const fix = JSON.parse(fs.readFileSync(path.join(root, 'scripts/gates/fixtures/giveth-stats.json'), 'utf8'));
const M = [['donationsTotalUsdPerDate', 'months'], ['totalDonorsCountPerDate', 'donors'], ['projectsPerDate', 'created'],
  ['filters:[Verified]', 'verified'], ['allProjects(take:1)', 'listed'], ['totalDonationsPerCategory', 'cats'], ['qfRounds', 'qf']];
__giveth((s) => { const q = String(s.query || ''); for (const [n, k] of M) if (q.includes(n)) return fix.answers[k]; return { errors: [{ message: 'no' }] }; });
const h = (await import(path.join(root, 'api/giveth-stats.js'))).default;
const r = { body: null, setHeader() {}, status() { return this; }, json(b) { this.body = b; return this; }, end() { return this; } };
await h({ method: 'GET', headers: {}, query: {} }, r);
const srv = await serve(4763);
const b = await browser();
const { page, close } = await open(b, srv.base, '/app/give', { viewport: { width: 320, height: 720 } });
await page.route('**/api/giveth-stats**', (x) => x.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r.body) }));
await page.goto(srv.base + '/app/giveth?nosplash=1&notour=1&dev=1', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2400);
const out = await page.evaluate(() => {
  const w = innerWidth, bad = [];
  document.querySelectorAll('*').forEach((e) => {
    const r = e.getBoundingClientRect();
    if (r.width === 0) return;
    if (Math.round(r.right) > w + 1 || Math.round(r.left) < -1) {
      bad.push({ tag: e.tagName, cls: String(e.className).slice(0, 34), l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width) });
    }
  });
  return { w, bad: bad.slice(0, 14) };
});
console.log(JSON.stringify(out, null, 1));
await close(); await b.close(); await srv.close();
