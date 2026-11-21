// A journal somebody has kept for a month, made the same way every run. The newest day in
// it is yesterday, so "nothing written yet today" is where every gate starts and a gate
// writes the day's entry itself.
//
// It is a fixture, and it says so: the lines in it were written for the gates. Nothing in
// it is anybody's journal.
const DAY = 86400000;
const pad = (n) => String(n).padStart(2, '0');
// The app names a day by the reader's own calendar, so the fixture does too. Counted from
// noon, so a clock change in the night cannot move a day.
const NOON = new Date(); NOON.setHours(12, 0, 0, 0);
export const day = (n) => { const d = new Date(NOON.getTime() - n * DAY); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };

const LINES = {
  '☕': ['The first coffee, before anyone was awake.', 'Coffee on the step. Cold air, warm cup.', 'Made two cups without being asked.', 'The good beans arrived.'],
  '❤️': ['She laughed at the thing about the cat.', 'A note left in my bag.', 'We cooked without a plan and it worked.'],
  '🌿': ['Walked the long way home.', 'The fern put out a new frond.', 'Rain on the window all afternoon.'],
  '🎵': ['Music on and the window open.', 'Found the old playlist.'],
  '🙏': ['A friend called for no reason at all.', 'The neighbour brought soup.'],
};
// which days each plant was written on, counted back from today
export const MONTH = {
  '☕': [29, 28, 27, 26, 24, 23, 22, 21, 20, 19, 18, 17, 15, 14, 13, 12, 11, 9, 8, 7, 5, 4, 2, 1],
  '❤️': [20, 18, 16, 14, 12, 10, 8, 6, 5, 3, 2, 1],
  '🌿': [15, 13, 11, 9, 7, 5, 3, 1],
  '🎵': [9, 6, 4, 2],
  '🙏': [4, 1],
};
const HOURS = [7, 7, 6, 8, 21, 7, 22, 7, 12, 7, 6, 20];

/** `{ emoji: [days ago, ...] }` in, a whole saved garden out. `opts` is laid over it. */
export function garden(plantsAndDays, opts = {}) {
  const entries = []; const plants = []; let n = 0;
  for (const emoji of Object.keys(plantsAndDays)) {
    const days = plantsAndDays[emoji].slice().sort((a, b) => b - a);
    if (!days.length) continue;
    plants.push({ id: 'p' + plants.length, emoji, planted: day(days[0]), kept: days.map(day), carried: 0, origin: 'planted', from: null });
    days.forEach((d, i) => {
      const [y, m, dd] = day(d).split('-').map(Number);
      const at = new Date(y, m - 1, dd, HOURS[n % HOURS.length], (n * 7) % 60).toISOString();
      const lines = LINES[emoji] || ['A line.'];
      entries.push({ id: 'e' + n, day: day(d), at, text: lines[i % lines.length], emoji, tags: [], photo: null, voice: null, folder: null, took: 40 + ((n * 37) % 260) });
      n++;
    });
  }
  entries.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  return Object.assign({
    v: 5, feel: false, tour: 'seen', name: 'A', entries, plants,
    gifts: { given: [], received: [] }, my: { emojis: [], recipes: [] }, wishes: [], goals: [], sound: false, made: {}, opens: 3, migrated: true,
    folders: [], milestones: {}, seeds: [], alch: {}, sun: null, vibes: [], glyphSeed: '', hidden: {}, cer: {},
  }, opts);
}
/** A month in: five plants, fifty entries, nothing written yet today. */
export const month = (opts) => garden(MONTH, opts);
/** One plant kept every day for `n` days, the last of them yesterday. */
export const run = (emoji, n, opts) => garden({ [emoji]: Array.from({ length: n }, (_, i) => i + 1) }, opts);
/** How many different days a garden has an entry on. */
export const keptDays = (g) => new Set(g.entries.map((e) => e.day)).size;
