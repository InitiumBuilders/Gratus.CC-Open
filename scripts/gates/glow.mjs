// G42 · NO GLOW IS CUT SQUARE.
//
// A glow is soft on every side or it is a box. The chosen emoji in Grow wore a square: its
// glow reached 64px, the picker it sits in has to hide its overflow so it can fold to two
// rows, and a container that hides overflow cuts everything at its own straight edges. The
// first orb sits on the picker's corner, so the cut showed as a lit square behind a heart.
// It is not visible in any stylesheet. It is only visible on the screen.
//
// So this measures the screen. For every element that casts a glow (box-shadow or a
// drop-shadow filter), it walks up to every ancestor that clips, and asks how bright the
// glow still is where the ancestor cuts it. A shadow's blur is a Gaussian with a standard
// deviation of half its blur radius, so the brightness left at a distance is computable,
// and a cut is only a defect where there is still light to cut. A faint tail trimmed far
// out is invisible; a bright glow trimmed close is the square.
//
// The page itself is not a clipping ancestor here: a glow meeting the edge of the screen
// looks like the edge of the screen.
//
//   node scripts/gates/glow.mjs
import { serve, browser, open, VIEWS } from './lib/harness.mjs';

let fails = 0;
const say = (ok, m) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + m); };
console.log('G42 - no glow is cut square');

// the brightness at which a hard edge on a dark ground is visible
const SEEN = 0.025;

// Runs in the page. Returns every glow a clipping ancestor cuts while it is still lit.
function cuts(SEEN) {
  const split = (s) => { const out = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; };
  const alphaOf = (s) => {
    let m = s.match(/rgba?\(([^)]*)\)/);
    if (m) { const p = m[1].split(/[\s,\/]+/).filter(Boolean); return p.length > 3 ? Number(p[3]) : 1; }
    m = s.match(/\/\s*([\d.]+%?)\s*\)/);
    if (m) return m[1].endsWith('%') ? Number(m[1].slice(0, -1)) / 100 : Number(m[1]);
    return 1;
  };
  const lens = (s) => (s.replace(/[a-z]+\([^)]*\)/gi, ' ').match(/-?[\d.]+px/g) || []).map((x) => parseFloat(x));
  const shadows = (el) => {
    const c = getComputedStyle(el); const out = [];
    if (c.boxShadow && c.boxShadow !== 'none') for (const layer of split(c.boxShadow)) {
      if (/\binset\b/.test(layer)) continue;
      const [x = 0, y = 0, blur = 0, spread = 0] = lens(layer);
      out.push({ x, y, blur, spread, a: alphaOf(layer), kind: 'box-shadow' });
    }
    if (c.filter && c.filter.includes('drop-shadow')) for (const m of c.filter.matchAll(/drop-shadow\(((?:[^()]|\([^)]*\))*)\)/g)) {
      const [x = 0, y = 0, blur = 0] = lens(m[1]);
      out.push({ x, y, blur, spread: 0, a: alphaOf(m[1]), kind: 'drop-shadow' });
    }
    return out;
  };
  // 1 - Φ(z), the share of a Gaussian beyond z standard deviations
  const tail = (z) => {
    if (z < 0) return 1 - tail(-z);
    const t = 1 / (1 + 0.2316419 * z); const d = 0.3989423 * Math.exp(-z * z / 2);
    return d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  };
  // the light left at a distance from the shape: half at the spread's edge, falling away past it
  const lit = (sh, dist) => sh.a * tail((dist - sh.spread) / Math.max(0.5, sh.blur / 2));
  const name = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + [...el.classList].slice(0, 3).join('.') : '');
  const found = [];
  for (const el of document.querySelectorAll('body *')) {
    const sh = shadows(el); if (!sh.length) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const pc = getComputedStyle(p);
      const clips = pc.overflowX !== 'visible' || pc.overflowY !== 'visible' || /paint|strict|content/.test(pc.contain);
      if (!clips) continue;
      // A clip that follows an edge the container draws (a border, a filled card) makes no
      // new line: the light stops where the frame already is. Only a clip along nothing does.
      const alpha = (c) => { const m = c.match(/rgba?\(([^)]*)\)/); if (!m) return 1; const q = m[1].split(/[\s,\/]+/).filter(Boolean); return q.length > 3 ? Number(q[3]) : 1; };
      const framed = ['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(pc['border' + s + 'Width']) >= 1 && alpha(pc['border' + s + 'Color']) >= 0.05)
        || alpha(pc.backgroundColor) >= 0.3 || pc.backgroundImage !== 'none';
      if (framed) break;
      const pr = p.getBoundingClientRect();
      const box = { l: pr.left + parseFloat(pc.borderLeftWidth), t: pr.top + parseFloat(pc.borderTopWidth), r: pr.right - parseFloat(pc.borderRightWidth), b: pr.bottom - parseFloat(pc.borderBottomWidth) };
      // only what can be seen inside it
      if (r.right < box.l || r.left > box.r || r.bottom < box.t || r.top > box.b) break;
      for (const s of sh) {
        const sides = { left: r.left + s.x - box.l, right: box.r - (r.right + s.x), top: r.top + s.y - box.t, bottom: box.b - (r.bottom + s.y) };
        for (const [side, dist] of Object.entries(sides)) {
          // a side the shape itself runs past is a scroll edge, not a glow cut short
          if (dist < 0) continue;
          const left = lit(s, dist);
          if (left > SEEN) found.push({ el: name(el), by: name(p), side, dist: Math.round(dist), left: Number(left.toFixed(3)), shadow: s.kind + ' ' + s.blur + 'px @' + s.a });
        }
      }
      break;   // the nearest clipping ancestor is the one that cuts
    }
  }
  // one line per element and side
  const seen = new Set();
  return found.filter((f) => { const k = f.el + f.by + f.side; if (seen.has(k)) return false; seen.add(k); return true; });
}

const srv = await serve(4773);
const b = await browser();

// every view at rest, scrolled through so everything lazy has painted
const report = [];
for (const [label, route] of VIEWS) {
  const v = await open(b, srv.base, route, { settle: 1600 });
  await v.page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((ok) => setTimeout(ok, 40)); } window.scrollTo(0, 0); });
  await v.page.waitForTimeout(300);
  const found = await v.page.evaluate(cuts, SEEN);
  found.forEach((f) => report.push(label + ': ' + f.el + ' cut on the ' + f.side + ' by ' + f.by + ' at ' + f.dist + 'px, ' + f.left + ' of its light left  (' + f.shadow + ')'));
  say(found.length === 0, label + ' - ' + (found.length ? found.length + ' glow' + (found.length > 1 ? 's' : '') + ' cut square' : 'every glow soft'));
  await v.close();
}

// the moment it was found: an emoji chosen in Grow
{
  const v = await open(b, srv.base, '/app/grow', { settle: 1600 });
  await v.page.click('#write'); await v.page.keyboard.type('the first light');
  for (const i of [0, 3, 4, 7]) {
    const o = (await v.page.$$('#pick [data-pick]'))[i]; if (!o) continue;
    await o.scrollIntoViewIfNeeded(); await o.click(); await v.page.waitForTimeout(350);
    const found = await v.page.evaluate(cuts, SEEN);
    found.forEach((f) => report.push('grow, emoji ' + (i + 1) + ' chosen: ' + f.el + ' cut on the ' + f.side + ' by ' + f.by + ' at ' + f.dist + 'px, ' + f.left + ' left'));
    say(found.length === 0, 'choosing emoji ' + (i + 1) + ' in Grow lights it softly on every side');
  }
  await v.close();
}

// the control: a detector that finds nothing proves nothing, so plant a known cut and see it
{
  const v = await open(b, srv.base, '/app/grow', { settle: 1200 });
  const n = await v.page.evaluate((SEEN) => {
    const box = document.createElement('div'); box.style.cssText = 'position:fixed;left:40px;top:200px;width:200px;height:100px;overflow:hidden;padding:4px';
    const dot = document.createElement('div'); dot.style.cssText = 'width:56px;height:56px;border-radius:50%;box-shadow:0 0 24px rgba(110,217,192,.35),0 0 64px rgba(110,217,192,.15)';
    box.appendChild(dot); document.body.appendChild(box);
    return 0;
  }, SEEN);
  const found = await v.page.evaluate(cuts, SEEN);
  say(found.some((f) => f.side === 'left' || f.side === 'top'), 'the control: a glow planted in a clipping box is seen cut  (' + found.length + ' sides)');
  await v.close();
}

await b.close(); await srv.close();
report.forEach((r) => console.log('    ' + r));
console.log('G42 no glow cut square: ' + (fails ? 'FAIL · ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
