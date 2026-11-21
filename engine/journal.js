// THE JOURNAL'S OWN RECORD · pure, deterministic, no DOM, and it never reads a clock.
//
// The garden counts what each plant was given. This counts the journal itself: which days
// hold a line, how many words, and how long a hand was on the page. Every figure comes
// from the entries on the device and from nothing else, so the same journal always reads the same, and a gate can prove it under Node.
//
// Only what was kept is counted. A day with no line is simply not in the list; nothing
// here measures a gap, and nothing here can go down.

export function words(text) { return String(text || '').split(/\s+/).filter(Boolean).length; }

/** Every day that holds at least one line, oldest first. */
export function keptDays(entries) {
  const set = new Set();
  for (const e of entries || []) if (e && e.day) set.add(e.day);
  return Array.from(set).sort();
}

/** How long one entry took, in seconds: the writing clock, or the recording if it ran longer. */
export function secsOf(e) {
  const wrote = Number(e && e.took) || 0;
  const spoke = Number(e && e.voice && e.voice.dur) || 0;
  return Math.max(0, Math.round(Math.max(wrote, spoke)));
}

/** The whole journal in five numbers. `timed` is how many entries carry a time at all. */
export function totals(entries) {
  const days = keptDays(entries);
  let w = 0, s = 0, timed = 0;
  for (const e of entries || []) {
    if (!e) continue;
    w += words(e.text);
    const k = secsOf(e);
    if (k > 0) { s += k; timed++; }
  }
  return { days: days.length, entries: (entries || []).filter(Boolean).length, words: w, secs: s, timed, first: days[0] || null, last: days[days.length - 1] || null };
}

// ── the writing clock ──
// It counts the time a hand was on the page: the gaps between one touch and the next, for
// as long as a gap is short enough to be thinking. A longer gap is time spent somewhere
// else and adds nothing. The caller hands in the time, so the same touches give the same
// answer every run.
export const PAUSE = 90 * 1000;
export const LONGEST = 3 * 60 * 60;   // seconds; nothing written in one sitting is logged as longer
export function clock() { return { ms: 0, last: 0, n: 0 }; }
export function touch(c, now) {
  const t = Number(now) || 0;
  if (!c || !t) return c;
  if (c.last && t > c.last && t - c.last <= PAUSE) c.ms += t - c.last;
  if (t > c.last) c.last = t;
  c.n++;
  return c;
}
/** Seconds on the page, or 0 when the page was never touched. Never less than one second. */
export function took(c) {
  if (!c || !c.n) return 0;
  return Math.min(LONGEST, Math.max(1, Math.round(c.ms / 1000)));
}

/** A length of time the way a person says it: 40 sec, 2 min, 1 h 12 min. */
export function span(secs) {
  const s = Math.max(0, Math.round(Number(secs) || 0));
  if (s < 60) return s + ' sec';
  const m = Math.round(s / 60);
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60), r = m % 60;
  return h + ' h' + (r ? ' ' + r + ' min' : '');
}

/** The same length, short enough to stand over a label: 1 min, 72 min, 2.5 h. */
export function brief(secs) {
  const s = Math.max(0, Math.round(Number(secs) || 0));
  if (!s) return '0 min';
  const m = Math.max(1, Math.round(s / 60));
  return m < 100 ? m + ' min' : (Math.round(m / 6) / 10) + ' h';
}

/** The log: every kept day, newest first, with its entries in the order they were written. */
export function logDays(entries) {
  const by = new Map();
  for (const e of entries || []) {
    if (!e || !e.day) continue;
    if (!by.has(e.day)) by.set(e.day, []);
    by.get(e.day).push(e);
  }
  return Array.from(by.keys()).sort().reverse().map((day) => {
    const items = by.get(day).slice().sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));
    return { day, items, words: items.reduce((t, e) => t + words(e.text), 0), secs: items.reduce((t, e) => t + secsOf(e), 0) };
  });
}

/** The log gathered by month, newest first, each month with its own totals. */
export function logMonths(entries) {
  const out = [];
  for (const d of logDays(entries)) {
    const key = d.day.slice(0, 7);
    let m = out[out.length - 1];
    if (!m || m.key !== key) { m = { key, days: [], entries: 0, words: 0, secs: 0 }; out.push(m); }
    m.days.push(d); m.entries += d.items.length; m.words += d.words; m.secs += d.secs;
  }
  return out;
}
