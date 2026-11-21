// THE RECORD, DRAWN.
//
// Pure builders: what was kept goes in, markup comes out. Nothing here reads the garden,
// a clock or the page, so every figure it draws is the same on every run and can be
// checked under Node. The app hands in the counts, the words and the way a time is said
// in the reader's own language; this decides only how a record looks.
//
// One figure runs through all of it: a seed for every day kept, set on the golden spiral.
// It is how a sunflower fills its head. A day that was not written is not a seed, so the
// figure only grows.
import { ring } from '../../engine/gratus.js?v=12';
import { secsOf, words, span } from '../../engine/journal.js?v=1';

const SEEDS_DRAWN = 987;   // past this the head is full; the count beside it carries on

/**
 * The seed head. `n` seeds, the first nearest the centre.
 *   fresh    the last seed is today's, and arrives
 *   inner    room left at the centre for a face
 *   still    no arriving at all (a figure that is simply there)
 */
export function seedHead(n, o) {
  o = Object.assign({ box: 240, inner: 56, pad: 10, fresh: false, still: false, label: '' }, o || {});
  const count = Math.max(0, Math.min(SEEDS_DRAWN, Math.floor(Number(n) || 0)));
  const pts = ring(count, o.box, { inner: o.inner, pad: o.pad });
  const reach = o.box / 2 - o.pad - o.inner;
  const gap = count ? Math.min(9.5, reach / Math.sqrt(count)) : 9.5;
  const dot = Math.max(1.15, Math.min(3.4, gap * 0.44));
  // the whole head arrives inside about seven tenths of a second, however many seeds it holds
  const each = count > 1 ? Math.min(16, 700 / count) : 0;
  let s = '';
  pts.forEach((p, i) => {
    const last = i === count - 1;
    const cls = last && o.fresh ? 'n' : 'k';
    // the first day sits nearest the centre, smallest and quietest; the newest is the brightest
    const age = count > 1 ? i / (count - 1) : 1;
    const r = last && o.fresh ? dot * 1.5 : dot * (0.8 + 0.3 * age);
    s += '<circle class="' + cls + '" cx="' + p.x + '" cy="' + p.y + '" r="' + r.toFixed(2) + '"' +
      (cls === 'n' ? '' : ' fill-opacity="' + (0.5 + 0.48 * age).toFixed(2) + '"') +
      (o.still ? '' : ' style="--w:' + Math.round(i * each) + 'ms"') + '/>';
  });
  return '<svg class="jr-head' + (o.still ? ' still' : '') + '" viewBox="0 0 ' + o.box + ' ' + o.box + '" role="img" aria-label="' + o.label + '">' + s + '</svg>';
}

/**
 * The day, landed. One figure and one number: the journal's head, a seed for every day
 * kept, and the count. What the plant did is one line, and only when it did something.
 *   d.face              the plant's emoji, or a star for words kept with no plant
 *   d.kept d.fresh      days in the journal, and whether today is a new one
 *   d.phase d.crossed   the phase, named only on the day the plant crosses into it
 *   d.next              { name, away } or null when the plant is ready
 *   d.call              one line to close the crossing that makes a plant a gift
 *   d.stamp             when it was written, said the reader's way
 *   d.marks             [{ ico, name }] lit by this entry
 */
export function dayCard(d, h) {
  const { esc, T, plural } = h;
  const head = seedHead(d.kept, { fresh: !!d.fresh, label: esc(plural(d.kept, 'day')) });
  const next = d.next ? '<span class="kicker mint dc-next">' + esc(d.next.name + ' ' + T('day.in', 'in') + ' ' + plural(d.next.away, 'day')) + '</span>' : '';
  const marks = (d.marks || []).map((m) => '<span class="dc-mark"><i>' + esc(m.ico) + '</i>' + esc(m.name) + '</span>').join('');
  return '<div class="cer dc' + (d.crossed ? ' cross' : '') + '">' +
    '<span class="kicker mint dc-stamp">' + esc(d.stamp) + '</span>' +
    '<div class="dc-ring">' + head + '<span class="dc-face">' + esc(d.face) + '</span></div>' +
    (d.crossed ? '<h2>' + esc(d.phase) + '</h2>' : '') +
    '<span class="dc-kept"><b>' + Number(d.kept).toLocaleString() + '</b>' + esc(T(d.kept === 1 ? 'day.keptOne' : 'day.kept', '')) + '</span>' +
    (d.crossed && d.call ? '<span class="kicker gold dc-call">' + esc(d.call) + '</span>' : next) +
    (marks ? '<div class="dc-foot">' + marks + '</div>' : '') +
    '<span class="kicker">' + esc(T('ceremony.tap', '')) + '</span></div>';
}

/** Today, kept: the words themselves under the question they answered. */
export function todaySlip(e, stamp, h) {
  const { esc } = h;
  return '<button class="hm-kept" data-e="' + esc(e.id) + '"><span class="hm-face">' + (e.photo ? '<img src="' + e.photo + '" alt="">' : esc(e.emoji || '✦')) + '</span>' +
    '<span class="hm-words"><span class="hm-line">' + esc(e.text || e.emoji || '') + '</span><span class="kicker gold">' + esc(stamp) + '</span></span></button>';
}

/** The journal's standing on a door: the head of every day kept, and the count. */
export function doorDays(kept, h) {
  if (!kept) return '';
  return '<span class="hm-row">' + seedHead(kept, { box: 100, inner: 5, pad: 5, still: true, label: '' }) +
    '<b>' + Number(kept).toLocaleString() + '</b>' + h.esc(h.T(kept === 1 ? 'day.keptOne' : 'day.kept', '')) + '</span>';
}

/** The garden's standing on a door: the plant nearest its next phase, and how near. */
export function doorPlant(x, h) {
  if (!x) return '';
  const { esc, T, plural } = h;
  return '<span class="hm-row"><span class="hm-ring" style="--pct:' + x.pct + '"><span>' + esc(x.face) + '</span></span>' +
    (x.next ? esc(x.next.name + ' ' + T('day.in', 'in') + ' ' + plural(x.next.away, 'day')) : '<em>' + esc(T('day.ready', '')) + '</em>') + '</span>';
}

/** One month of the log: every entry with the hour it was written and how long it took. */
export function logRows(m, h) {
  const { esc, plural, fmt } = h;
  return '<div class="glass jr-month"><div class="jr-rows">' + m.days.map((d) => d.items.map((e, i) => {
    const secs = secsOf(e); const w = words(e.text);
    return '<button class="jr-row" data-le="' + esc(e.id) + '">' +
      '<span class="jr-d">' + (i ? '' : esc(fmt.dayShort(d.day))) + '</span>' +
      '<span class="jr-t">' + (e.at ? esc(fmt.clock(e.at)) : '·') + '</span>' +
      '<span class="jr-e">' + esc(e.emoji || '✦') + '</span>' +
      '<span class="jr-s">' + (secs >= 10 ? esc(span(secs)) : '') + '</span>' +
      '<span class="jr-w">' + (w ? esc(plural(w, 'word')) : '') + '</span></button>';
  }).join('')).join('') + '</div></div>';
}

/** The journal's own figure, standing: the head and the count beside it. */
export function keptCard(kept, h) {
  const { esc, T } = h;
  return '<div class="glass card ld">' + seedHead(kept, { box: 160, inner: 8, pad: 8, still: true, label: '' }) +
    '<span class="ld-words"><b>' + Number(kept).toLocaleString() + '</b><span class="kicker gold">' + esc(T(kept === 1 ? 'day.keptOne' : 'day.kept', '')) + '</span></span></div>';
}
