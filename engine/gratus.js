// A GRATUS IS A GIFT MADE OF DAYS. Pure, deterministic, tested.
// One emoji. Every day someone keeps a line for it is a day. It can be given: it leaves one
// person and arrives with another, carrying every hand that held it. The lines stay where they
// were written. Nothing here is scored; days are counted, and only presence counts one.

export const GOLDEN = 137.50776405003785;

export function days(g) { return ((g && g.hands) || []).reduce((n, h) => n + (h.days || 0), 0); }
export function hand(g) { const hs = (g && g.hands) || []; return hs[hs.length - 1] || null; }
export function handsOf(g) { return ((g && g.hands) || []).length; }

// a new Gratus, held by the person who started it
export function born(emoji, name, day, id) {
  return { id: id || null, emoji, born: day, hands: [{ name: name || '', days: 0, since: day, until: null, line: null, kept: [] }], status: 'held', link: null, to: null, sentAt: null, opensAt: null };
}
// keeping a line counts the day once, however many lines are written that day
export function keep(g, day) {
  const h = hand(g); if (!h || g.status !== 'held') return false;
  h.kept = h.kept || []; if (h.kept.includes(day)) return false;
  h.kept.push(day); h.days = h.kept.length; return true;
}
// what travels: the emoji, the birth, every hand with its days and its line. Never the kept dates, never the lines.
export function toSend(g, from, line, day, opensAt) {
  const h = hand(g);
  return { emoji: g.emoji, born: g.born, opensAt: opensAt || null, hands: (g.hands || []).map((x) => ({ name: x === h ? (from || x.name || '') : (x.name || ''), days: x.days || 0, since: x.since || null, until: x === h ? day : (x.until || null), line: x === h ? (line || null) : (x.line || null) })) };
}
// what arrives: the same object with a new hand at the end, the receiver's
export function receive(sent, name, day) {
  return { id: sent.id || null, emoji: sent.emoji, born: sent.born || day, hands: (sent.hands || []).map((x) => Object.assign({}, x)).concat([{ name: name || '', days: 0, since: day, until: null, line: null, kept: [] }]), status: 'held', link: null, to: null, sentAt: null, opensAt: null };
}

// the ring of days: one dot per day on the sunflower spiral, the first day nearest the centre.
// size is the box in px; inner leaves room for the emoji at the centre.
export function ring(n, size, opts) {
  const o = Object.assign({ inner: 54, pad: 8 }, opts || {});
  const out = []; if (!(n > 0)) return out;
  const R = size / 2 - o.pad; const c = Math.min(9.5, (R - o.inner) / Math.sqrt(n));
  const dot = n > 1500 ? 1.4 : n > 600 ? 2 : n > 240 ? 2.6 : 3.2;
  for (let i = 0; i < n; i++) {
    const k = i + 1; const r = o.inner + c * Math.sqrt(k); const a = k * GOLDEN * Math.PI / 180;
    out.push({ x: +(size / 2 + r * Math.cos(a)).toFixed(2), y: +(size / 2 + r * Math.sin(a)).toFixed(2), r: dot });
  }
  return out;
}
// which hand each dot belongs to, in ring order: the first hand's days sit nearest the centre
export function tints(g) { const out = []; ((g && g.hands) || []).forEach((h, j) => { for (let i = 0; i < (h.days || 0); i++) out.push(j); }); return out; }

// the twelve laws: the owner's statements, in order, verbatim, honor first
export const LAW_KEYS = ['honor', 'first', 'poolLong', 'harvest', 'spiral', 'truth', 'gift', 'moving', 'common', 'ground', 'presence', 'ancient'];
export function laws(statements) { return LAW_KEYS.map((k) => (k === 'honor' ? 'Gratus means honor.' : (statements || {})[k])).filter(Boolean); }

// a question for the day: the same one all day, another on a tap
export function questionPool(prompts) {
  const out = []; const pr = (prompts && prompts.practices) || {};
  for (const k of Object.keys(pr)) for (const q of (pr[k] && pr[k].none) || []) if (!out.includes(q)) out.push(q);
  return out;
}
export function hash32(str) { let h = 2166136261 >>> 0; const s = String(str); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
export function question(pool, seed, offset) { if (!pool.length) return ''; return pool[(hash32(seed) + (offset || 0)) % pool.length]; }

// the earlier app kept a garden; its days and its lines come along as one Gratus
export function migrateV1(v1, today) {
  if (!v1 || !Array.isArray(v1.entries) || !v1.entries.length) return null;
  const body = (e) => { if (e.question != null) return e.text || ''; const ls = (e.text || '').split('\n').filter((l) => l.trim()); return ls.length > 1 ? ls.slice(1).join('\n') : (ls[0] || ''); };
  const plants = (v1.plants || []).slice().sort((a, b) => (b.daysTended || 0) - (a.daysTended || 0));
  const emoji = (plants[0] && plants[0].emoji) || '🌱';
  const dayset = Array.from(new Set(v1.entries.map((e) => e.day))).sort();
  const name = (v1.user && v1.user.displayName) || '';
  const g = born(emoji, name, dayset[0] || today, 'v1');
  g.hands[0].kept = dayset.slice(); g.hands[0].days = dayset.length;
  const lines = v1.entries.map((e) => ({ id: e.id, gid: 'v1', day: e.day, text: body(e), at: e.createdAt || null })).filter((l) => l.text);
  return { gratus: g, lines, name };
}
// the first emoji in a string, whole: skin tone, joiners, flags and keycaps included
export function firstEmoji(str) {
  const s = String(str || ''); let parts;
  try { parts = Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)).map((x) => x.segment); } catch (e) { parts = Array.from(s); }
  return parts.find((g) => /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u.test(g)) || null;
}
