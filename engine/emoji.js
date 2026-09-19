// THE EMOJI ENGINE: evolutions, the forge, the trove. Pure, deterministic, tested.
// In the Gratus Garden the thing that grows IS the emoji. Days tended move it through the
// Fibonacci forms (garden.js). Some emojis also TRANSITION: at the schedule's days they become
// the next emoji of their chain, each with a name and a line. Two emojis tended on the same day
// enough times can be FORGED into a third. Everything reached this way is kept in the trove,
// where the person gives it their own name and their own context. Nothing here is scored.

export function schedule(evo) { return (evo && evo.schedule) || [0, 3, 8, 21, 55]; }

// where an emoji sits: { chain, index } or null if it is not on any chain
export function chainOf(emoji, evo) {
  for (const ch of (evo && evo.chains) || []) {
    const i = ch.stages.findIndex((s) => s.emoji === emoji);
    if (i >= 0) return { chain: ch, index: i };
  }
  return null;
}

// the stage index reached by days tended. A seed planted mid-chain starts at its own index.
export function stageIndex(seedEmoji, days, evo) {
  const c = chainOf(seedEmoji, evo); if (!c) return 0;
  const sch = schedule(evo); let k = 0;
  for (let i = 0; i < sch.length; i++) if (days >= sch[i]) k = i;
  return Math.min(c.chain.stages.length - 1, c.index + k);
}
export function stage(seedEmoji, days, evo) { const c = chainOf(seedEmoji, evo); if (!c) return null; return c.chain.stages[stageIndex(seedEmoji, days, evo)]; }
export function currentEmoji(seedEmoji, days, evo) { const s = stage(seedEmoji, days, evo); return s ? s.emoji : seedEmoji; }

// what comes next, and in how many days: null at the end of a chain or off any chain
export function nextStage(seedEmoji, days, evo) {
  const c = chainOf(seedEmoji, evo); if (!c) return null;
  const i = stageIndex(seedEmoji, days, evo); if (i >= c.chain.stages.length - 1) return null;
  const at = schedule(evo)[i - c.index + 1]; if (at == null) return null;
  return { at, in: Math.max(0, at - days), stage: c.chain.stages[i + 1], index: i + 1 };
}

// stages crossed between two day counts (for ceremonies)
export function evolutionsCrossed(seedEmoji, prevDays, days, evo) {
  const c = chainOf(seedEmoji, evo); if (!c) return [];
  const a = stageIndex(seedEmoji, prevDays, evo), b = stageIndex(seedEmoji, days, evo); const out = [];
  for (let i = a + 1; i <= b; i++) out.push({ from: c.chain.stages[i - 1], to: c.chain.stages[i], index: i, chain: c.chain });
  return out;
}

// the whole arc with what is reached: [{ emoji, name, line, reached, at }]
export function arc(seedEmoji, days, evo) {
  const c = chainOf(seedEmoji, evo); if (!c) return null;
  const i = stageIndex(seedEmoji, days, evo); const sch = schedule(evo);
  return { chain: c.chain, reached: i, stages: c.chain.stages.map((s, k) => Object.assign({}, s, { reached: k <= i, at: k <= c.index ? 0 : (sch[k - c.index] == null ? null : sch[k - c.index]) })) };
}

// the light around a growing emoji: glow 0..1, rings 0..3, scale
export function aura(days) {
  const d = Math.max(0, days || 0);
  return { glow: Math.min(1, .38 + .62 * Math.log(1 + d) / Math.log(56)), rings: d >= 21 ? 3 : d >= 8 ? 2 : d >= 3 ? 1 : 0, scale: d >= 55 ? 1.34 : d >= 21 ? 1.24 : d >= 8 ? 1.14 : d >= 3 ? 1.06 : 1 };
}

// ── the forge: two seeds that share tended days
export function pairKey(a, b) { return [a, b].sort().join('+'); }
// map pairKey → Set(days), from entries that carry `day` and `emojis`
export function sharedDays(entries) {
  const byDay = {};
  for (const e of entries || []) { const s = byDay[e.day] || (byDay[e.day] = new Set()); for (const x of e.emojis || []) s.add(x); }
  const m = {};
  for (const day in byDay) { const es = Array.from(byDay[day]); for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) { const k = pairKey(es[i], es[j]); (m[k] = m[k] || new Set()).add(day); } }
  return m;
}
// ready (enough shared days, not yet forged) · growing (some shared days) · found (forged) · hinted (one ingredient known)
export function forgeState(entries, forge, forgedKeys) {
  const need = (forge && forge.days) || 3; const shared = sharedDays(entries);
  const have = new Set(); for (const e of entries || []) for (const x of e.emojis || []) have.add(x);
  const done = new Set(forgedKeys || []); const ready = [], growing = [], found = [], hinted = [];
  for (const p of (forge && forge.pairs) || []) {
    const k = pairKey(p.a, p.b); const days = shared[k] ? shared[k].size : 0; const row = Object.assign({}, p, { key: k, days, need });
    if (done.has(k)) found.push(row); else if (days >= need) ready.push(row); else if (days > 0) growing.push(row); else if (have.has(p.a) || have.has(p.b)) hinted.push(row);
  }
  growing.sort((x, y) => y.days - x.days);
  return { ready, growing, found, hinted, need, total: ((forge && forge.pairs) || []).length };
}
export function recipesFor(emoji, forge) { return ((forge && forge.pairs) || []).filter((p) => p.a === emoji || p.b === emoji); }

// ── the trove: every emoji the person has reached, with how
export function trove(data, evo, names) {
  const out = new Map();
  const put = (emoji, origin, at, via) => { if (!emoji) return; const cur = out.get(emoji); if (!cur) out.set(emoji, { emoji, origin, at: at || null, via: via || null }); else if (at && (!cur.at || at < cur.at)) { cur.at = at; cur.origin = origin; cur.via = via || null; } };
  for (const p of (data && data.plants) || []) {
    put(p.emoji, p.origin === 'gift' ? 'gift' : 'planted', p.plantedAt, p.giver || null);
    const a = arc(p.emoji, p.daysTended || 0, evo);
    if (a) for (const s of a.stages) if (s.reached && s.emoji !== p.emoji) put(s.emoji, 'evolved', null, p.emoji);
  }
  for (const u of (data && data.unlocks) || []) put(u.emoji, u.via && u.via.indexOf('+') >= 0 ? 'forged' : 'unlocked', u.unlockedAt, u.via);
  const own = (data && data.trove) || {};
  return Array.from(out.values()).map((t) => Object.assign(t, { std: (names && names[t.emoji]) || '', own: own[t.emoji] || null }));
}
// how many distinct emojis the world holds (chains + forge results)
export function worldSize(evo, forge) {
  const s = new Set();
  for (const ch of (evo && evo.chains) || []) for (const st of ch.stages) s.add(st.emoji);
  for (const p of (forge && forge.pairs) || []) s.add(p.result);
  return s.size;
}
