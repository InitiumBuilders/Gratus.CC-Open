// THE STATE LIFECYCLE · pure, deterministic, no DOM, no imports.
//
// This module exists because of one line that used to live in assets/js/galaxy.js:
//
//     if (!S || S.v !== 1) S = fresh();
//
// Strict equality against a single version number, with no ladder behind it. The
// day this app wrote `v: 2`, every garden still holding `v: 1` would have been
// deleted the next time its person opened the door. A garden is days of somebody's
// attention and it is the only copy. A person who loses one does not return,
// and they should not.
//
// What replaces it:
//
//   · A garden is never wiped for having the wrong version. It is walked up the
//     ladder, one step at a time, from whatever version it holds.
//   · A version the ladder does not recognise is KEPT, not discarded. A garden
//     from a newer build is still somebody's garden, and `patch()` repairs any
//     field it is missing.
//   · Only something that is not an object at all gets a fresh garden.
//
// It lives in engine/ so a gate can load it under Node and prove all of that
// without a browser. scripts/gates/migration.mjs does exactly that, against a
// captured fixture, and the mutant that restores the old line turns it red.

export const STATE_V = 3;

export function fresh() {
  return {
    v: STATE_V,
    feel: true,
    name: '', entries: [], plants: [],
    gifts: { given: [], received: [] },
    my: { emojis: [], recipes: [] },
    wishes: [], goals: [], sound: true, made: {}, opens: 0, migrated: false,
    folders: [], milestones: {}, seeds: [], alch: {}, sun: null, vibes: [],
    // added in v2
    glyphSeed: '', hidden: {}, cer: {}, gardenHour: null,
  };
}

// Every step takes a garden at version N and returns it at version N+1. A step
// only ever adds; nothing here may drop a field a person's garden already holds.
export const LADDER = {
  1: (s) => {
    if (typeof s.glyphSeed !== 'string') s.glyphSeed = '';
    if (!s.hidden || typeof s.hidden !== 'object') s.hidden = {};
    if (!s.cer || typeof s.cer !== 'object') s.cer = {};
    if (s.gardenHour === undefined) s.gardenHour = null;
    s.v = 2;
    return s;
  },
  2: (s) => {
    // The touch answer is on unless somebody turns it off, and it is its own switch
    // rather than the song's. Muting the song is the commonest thing anyone does here,
    // and it should not also take away the quietest feedback in the app.
    if (typeof s.feel !== 'boolean') s.feel = true;
    s.v = 3;
    return s;
  },
};

// Backfill. Runs after the ladder on every load, including on a garden from a
// version this build has never heard of, which is the case the ladder cannot
// cover and the old line used to answer by deleting it.
export function patch(s) {
  if (typeof s.feel !== 'boolean') s.feel = true;
  const arr = ['entries', 'plants', 'wishes', 'goals', 'folders', 'seeds', 'vibes'];
  for (const k of arr) if (!Array.isArray(s[k])) s[k] = [];
  const obj = ['made', 'milestones', 'alch', 'hidden', 'cer'];
  for (const k of obj) if (!s[k] || typeof s[k] !== 'object' || Array.isArray(s[k])) s[k] = {};
  if (!s.gifts || typeof s.gifts !== 'object') s.gifts = { given: [], received: [] };
  if (!Array.isArray(s.gifts.given)) s.gifts.given = [];
  if (!Array.isArray(s.gifts.received)) s.gifts.received = [];
  if (!s.my || typeof s.my !== 'object') s.my = { emojis: [], recipes: [] };
  if (!Array.isArray(s.my.emojis)) s.my.emojis = [];
  if (!Array.isArray(s.my.recipes)) s.my.recipes = [];
  if (typeof s.name !== 'string') s.name = '';
  if (typeof s.glyphSeed !== 'string') s.glyphSeed = '';
  if (s.sound == null) s.sound = true;
  if (s.sun === undefined) s.sun = null;
  if (s.gardenHour === undefined) s.gardenHour = null;
  if (typeof s.opens !== 'number') s.opens = 0;
  return s;
}

export function upgrade(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return fresh();
  let v = Number(s.v);
  if (!Number.isFinite(v) || v < 1) v = 1;
  let guard = 0;
  while (v < STATE_V && LADDER[v] && guard++ < 50) {
    s = LADDER[v](s) || s;
    const next = Number(s.v);
    if (!Number.isFinite(next) || next <= v) { v = v + 1; s.v = v; } else { v = next; }
  }
  // a garden from a newer build keeps its own version; it is not ours to lower
  if (!Number.isFinite(Number(s.v))) s.v = v;
  return patch(s);
}
