// Gate 1 — contrast, v4 (Quiet Light). Every ink the app paints against every surface it paints
// on: the ground, the chrome, the raised surfaces, the hue wash and fills, the solid action, and
// gold. Fail < 4.5:1, warn < 7:1. Computed, never eyeballed. Ink is solid; alpha is for surfaces.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const css = fs.readFileSync(path.join(root, 'assets/css/tokens.css'), 'utf8');

function block(sel) { const i = css.indexOf(sel); const j = css.indexOf('\n}', i); return css.slice(i, j); }
function tokens(txt) { const out = {}; for (const m of txt.matchAll(/--([\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim(); return out; }
const t = tokens(block(':root {'));
function parse(c) {
  if (!c) return null; c = c.trim(); let m;
  if ((m = /^#([0-9a-f]{6})$/i.exec(c))) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16), 1];
  if ((m = /^rgba?\(([^)]+)\)$/.exec(c))) { const p = m[1].split(',').map((x) => parseFloat(x)); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
  return null;
}
function over(fg, bg) { const a = fg[3]; return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1]; }
function lum(c) { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); }
function ratio(a, b) { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }

const need = ['ground', 'chrome', 'raise', 'raise-2', 'wash', 'hue-16', 'hue-48', 'action', 'ink', 'ink-2', 'ink-3', 'violet-text', 'gold', 'on-gold'];
for (const k of need) if (!t[k]) { console.log('CONTRAST GATE: missing token --' + k); process.exit(1); }
const g = parse(t.ground);
const surfaces = [['ground', g], ['chrome', over(parse(t.chrome), g)], ['raise', over(parse(t.raise), g)], ['raise-2', over(parse(t['raise-2']), g)], ['wash', over(parse(t.wash), g)], ['hue-16', over(parse(t['hue-16']), g)], ['hue-16/raise', over(parse(t['hue-16']), over(parse(t.raise), g))]];
const pairs = [];
for (const ik of ['ink', 'ink-2', 'ink-3', 'violet-text', 'gold']) for (const [sk, s] of surfaces) pairs.push([ik, parse(t[ik]), sk, s]);
pairs.push(['white', [255, 255, 255, 1], 'action', parse(t.action)]);
pairs.push(['on-gold', parse(t['on-gold']), 'gold', parse(t.gold)]);
pairs.push(['ink', parse(t.ink), 'hue-48', over(parse(t['hue-48']), g)]);
let fails = 0, warns = 0;
for (const [ik, ink, sk, s] of pairs) {
  const r = ratio(ink, s); const tag = r < 4.5 ? 'FAIL' : r < 7 ? 'warn' : 'ok';
  if (r < 4.5) fails++; else if (r < 7) warns++;
  if (tag !== 'ok') console.log(tag.padEnd(4), ik.padEnd(12), 'on', sk.padEnd(14), r.toFixed(2) + ':1');
}
console.log('contrast gate:', pairs.length, 'pairs ·', fails, 'fail ·', warns, 'warn');
if (fails) { console.log('CONTRAST GATE: FAIL'); process.exit(1); }
console.log('CONTRAST GATE: PASS');
