// Deterministic randomness for the engine and the flora.
// Pure. No React, no DOM. Same seed → same garden, same sigil, same asymmetry.

export function hash32(str) {
  let h = 2166136261 >>> 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

// mulberry32: small, fast, good enough for petals and sigils
export function rng(seed) {
  let a = (typeof seed === 'number' ? seed : hash32(seed)) >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(list, r) { return list[Math.floor(r() * list.length)]; }
export function between(min, max, r) { return min + (max - min) * r(); }
export function newId(prefix, r) {
  const rr = r || Math.random;
  let s = '';
  for (let i = 0; i < 12; i++) s += 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(rr() * 31)];
  return (prefix ? prefix + '_' : '') + s;
}
