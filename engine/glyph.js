// THE GRATUS GLYPH · pure, deterministic, no DOM, no clock, no dice.
//
// It is the one thing a person can show somebody else that is theirs and could not exist
// without the days they put in. Two people cannot arrive at the same drawing by accident,
// and the same garden draws the same figure every time it is asked, on any device, in any
// year. That is the whole promise, so nothing in this file may read the time or a random
// number, and a gate refuses the file if it does.
//
// The shape: one closed ring for the garden, and one arm for each growing thing. An arm's
// angle comes from the emoji it grew from, so the same gratitude always points the same
// way. Its length comes from the days, so the arms are the attention. Its weight comes
// from the phase. Nothing decays, so nothing ever shortens.
//
// Forty strokes is the ceiling. A figure a person cannot take in at a glance is a diagram.

export const MAX_STROKES = 40;
const TAU = Math.PI * 2;
const GOLDEN = 137.50776405003785;

// a small, stable hash. Same string, same number, forever, everywhere.
export function seedOf(s) {
  let h = 2166136261;
  for (const ch of String(s || '')) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

const r2 = (n) => Math.round(n * 100) / 100;

// The phases, by day, as the growth book has them. Passed in rather than imported so this
// module stays free of everything.
const PHASES = [0, 2, 5, 9, 13];
function phaseOf(days) {
  let i = 0;
  for (let k = 0; k < PHASES.length; k++) if (days >= PHASES[k]) i = k;
  return i;
}

/**
 * Draw a garden.
 * @param {{plants?: Array<{emoji?: string, kept?: string[], carried?: number}>, glyphSeed?: string}} garden
 * @param {{size?: number}} [opts]
 * @returns {{size:number, seed:number, strokes:Array, arms:number, days:number, d:string}}
 */
export function glyph(garden, opts) {
  const size = (opts && opts.size) || 240;
  const g = garden && typeof garden === 'object' ? garden : {};
  const plants = Array.isArray(g.plants) ? g.plants : [];
  const cx = size / 2;
  const cy = size / 2;

  // Every garden gets its own turn of the wheel, so two gardens holding the same emoji do
  // not draw the same arm in the same place.
  const rows = plants
    .map((p) => {
      const emoji = String((p && p.emoji) || '');
      const days = (Array.isArray(p && p.kept) ? p.kept.length : 0) + (Number(p && p.carried) || 0);
      return { emoji, days, key: seedOf(emoji) };
    })
    // a fixed order, so the same garden draws the same figure whatever order it is held in
    .sort((a, b) => (a.key - b.key) || a.emoji.localeCompare(b.emoji))
    .slice(0, MAX_STROKES - 1);

  // The garden's own turn of the wheel, taken from the settled order rather than the
  // order it happened to be handed over in. A garden is not a different garden for having
  // been sorted.
  const seed = seedOf(String(g.glyphSeed || '') + '|' + rows.length + '|' +
    rows.map((r) => r.emoji + ':' + r.days).join(','));
  const turn = (seed % 3600) / 3600 * TAU;

  const totalDays = rows.reduce((t, r) => t + r.days, 0);
  const outer = size * 0.42;
  const inner = size * 0.13;
  const strokes = [];

  // the ring: the garden itself, drawn once, whatever is in it
  strokes.push({ kind: 'ring', cx: r2(cx), cy: r2(cy), r: r2(inner), w: 1.5 });

  rows.forEach((row, i) => {
    // The angle is the gratitude: the same emoji always points the same way in a given
    // garden. The golden step spreads arms that would otherwise land on each other.
    const a = turn + ((row.key % 3600) / 3600) * TAU + (i * GOLDEN * Math.PI) / 180;
    // thirteen days is the far edge, and a garden kept longer than that keeps reaching,
    // slower and slower, because nothing here decays and nothing here finishes either
    const grown = row.days <= 13 ? Math.sqrt(row.days / 13) : 1 + Math.log10(row.days / 13) * 0.18;
    const reach = inner + (outer - inner) * Math.min(1.12, grown);
    const ph = phaseOf(row.days);
    strokes.push({
      kind: 'arm',
      x1: r2(cx + Math.cos(a) * inner), y1: r2(cy + Math.sin(a) * inner),
      x2: r2(cx + Math.cos(a) * reach), y2: r2(cy + Math.sin(a) * reach),
      w: r2(1 + ph * 0.6),
      tip: ph >= 4 ? r2(2.6 + ph * 0.2) : 0,     // ready to give carries a head
      a: r2(a), days: row.days, phase: ph,
    });
  });

  const d = strokes.map((s) => s.kind === 'ring'
    ? 'M ' + r2(s.cx - s.r) + ' ' + s.cy + ' a ' + s.r + ' ' + s.r + ' 0 1 0 ' + r2(s.r * 2) + ' 0 a ' + s.r + ' ' + s.r + ' 0 1 0 ' + r2(-s.r * 2) + ' 0'
    : 'M ' + s.x1 + ' ' + s.y1 + ' L ' + s.x2 + ' ' + s.y2).join(' ');

  return { size, seed, strokes, arms: rows.length, days: totalDays, d };
}

/** The same figure as an SVG string. Still pure: it is a function of the garden alone. */
export function glyphSvg(garden, opts) {
  const fig = glyph(garden, opts);
  const parts = fig.strokes.map((s) => s.kind === 'ring'
    ? '<circle cx="' + s.cx + '" cy="' + s.cy + '" r="' + s.r + '" fill="none" stroke="currentColor" stroke-width="' + s.w + '" stroke-opacity=".55"/>'
    : '<line x1="' + s.x1 + '" y1="' + s.y1 + '" x2="' + s.x2 + '" y2="' + s.y2 + '" stroke="currentColor" stroke-width="' + s.w + '" stroke-linecap="round"' + (s.tip ? ' stroke-opacity="1"' : ' stroke-opacity=".8"') + '/>' +
      (s.tip ? '<circle cx="' + s.x2 + '" cy="' + s.y2 + '" r="' + s.tip + '" fill="currentColor"/>' : ''));
  return '<svg viewBox="0 0 ' + fig.size + ' ' + fig.size + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' +
    (fig.arms ? fig.arms + ' growing, ' + fig.days + ' days of care' : 'an empty garden') + '">' + parts.join('') + '</svg>';
}
