// THE FRONT PAGE SHOWS THE REAL THING.
//
// It used to show his mockups, which were drawn before the app existed. The app exists
// now, so the plates on the front page are photographs of it: a real garden, seeded here
// with a handful of plants and days, rendered by the real code in a real browser at a real
// phone size, and written out as files.
//
// His mockups are not deleted. They are his, they are where we are aiming, and they have
// their own page at /reference.
//
//   node scripts/shots.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, browser } from './gates/lib/harness.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'assets/art/shots');
fs.mkdirSync(OUT, { recursive: true });

// A garden somebody has actually kept. The days are counted back from a fixed point so the
// same command makes the same picture, rather than a different one every afternoon.
const DAY = 86400000;
// The last kept day is TODAY, so the garden in the picture is one somebody tended this
// morning rather than one they walked away from a week ago. It makes the shot move with
// the calendar, which is correct: these are photographs, retaken whenever the app changes.
const END = Date.parse(new Date().toISOString().slice(0, 10) + 'T12:00:00Z');
const day = (n) => new Date(END - n * DAY).toISOString().slice(0, 10);
const kept = (from, to) => { const out = []; for (let i = from; i >= to; i--) out.push(day(i)); return out; };

const GARDEN = {
  v: 5, feel: true, tour: 'seen', name: 'August',
  entries: [
    { id: 'e1', day: day(0), text: 'The first coffee, before anyone was awake. The whole house still.', emoji: '☕', tags: [], feel: 'calm' },
    { id: 'e2', day: day(1), text: 'Nat laughed at the thing I said about the cat. Kept laughing.', emoji: '❤️', tags: [], feel: 'joy' },
    { id: 'e3', day: day(2), text: 'Walked the long way home. The light through the trees on the hill.', emoji: '🌿', tags: [], feel: 'calm' },
    { id: 'e4', day: day(3), text: 'Hard day, and it still ended with music on and the window open.', emoji: '🎵', tags: [], feel: 'tired' },
    { id: 'e5', day: day(5), text: 'A friend called for no reason at all.', emoji: '🤝', tags: [], feel: 'love' },
  ],
  plants: [
    { id: 'p1', emoji: '☕', planted: day(21), kept: kept(21, 0), carried: 0, origin: 'planted', from: null },
    { id: 'p2', emoji: '❤️', planted: day(14), kept: kept(14, 1), carried: 0, origin: 'planted', from: null },
    { id: 'p3', emoji: '🌿', planted: day(9), kept: kept(9, 2), carried: 0, origin: 'planted', from: null },
    { id: 'p4', emoji: '🎵', planted: day(5), kept: kept(5, 3), carried: 0, origin: 'planted', from: null },
    { id: 'p5', emoji: '🤝', planted: day(2), kept: kept(2, 0), carried: 0, origin: 'planted', from: null },
  ],
  gifts: { given: [], received: [] },
  my: { emojis: [], recipes: [] },
  wishes: [], goals: [], sound: false, made: {}, opens: 9, migrated: true,
  folders: [], milestones: {}, seeds: [], alch: {}, sun: null, vibes: [],
  glyphSeed: '', hidden: {}, cer: {},
};

// A tab carries its own opening ceremony, and the first run photographed that instead of
// the app: a beautiful doorway with "tap to skip" across it. Reduced motion turns every
// ceremony off, which is exactly what a still photograph wants.
//
// The second number is how far down to scroll. A hero fills the first screen by design, so
// the thing being photographed is usually just under it.
const SHOTS = [
  ['write', '/app/grow', 0, 'the writing screen'],
  ['garden', '/app/garden', 500, 'five things growing'],
  ['journal', '/app/book', 690, 'the journal, by day'],
];

const srv = await serve(4771);
const b = await browser();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
const page = await ctx.newPage();

// seed once, on the origin, before the app boots
await page.goto(srv.base + '/app?nosplash=1&notour=1&dev=1', { waitUntil: 'domcontentloaded' });
await page.evaluate((g) => localStorage.setItem('gratus.galaxy.v1', JSON.stringify(g)), GARDEN);

for (const [name, route, down, what] of SHOTS) {
  await page.goto(srv.base + route + '?nosplash=1&notour=1&dev=1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  if (down) { await page.evaluate((y) => window.scrollTo(0, y), down); await page.waitForTimeout(900); }
  const file = path.join(OUT, name + '.png');
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 390, height: 844 } });
  console.log('  ' + name.padEnd(8) + Math.round(fs.statSync(file).size / 1024) + 'kB  ' + what);
}
await ctx.close(); await b.close(); await srv.close();
console.log('shots written to assets/art/shots/  (run scripts/renditions.py to make the webp)');
