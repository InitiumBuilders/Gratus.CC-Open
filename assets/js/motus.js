// MOTUS · A VALUE IN MOTION.
//
// Nothing here is decoration. Every movement on this page is the thing itself arriving:
//
//   the total      counts up, because that is seven million dollars being given, one gift
//                  at a time, and a number that is simply printed has already happened to
//                  somebody else
//   the months     draw left to right, because five years happened in that order
//   the kinds      grow from nothing, largest first, because that is where it went
//   the trace      carries one light down through Begin, Become and Bridge, because a
//                  seed travels and comes back
//
// Each movement happens once, when what it belongs to comes on screen, and never again.
// Under reduced motion every value is there from the first frame, which is this page
// without the arriving.

const STILL = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = (t) => 1 - Math.pow(1 - t, 3);

// ── a number, arriving ──
// It lands on exactly what it was given. A count that ends near the figure is a lie told
// slowly, so the last frame is always the real one.
export function countUp(el, to, opts) {
  const o = opts || {};
  const ms = o.ms || 1500;
  const fmt = o.fmt || ((n) => Math.round(n).toLocaleString());
  if (STILL() || !to) { el.textContent = fmt(to); return; }
  const from = Number(o.from) || 0;
  let raf = 0, t0 = 0;
  const step = (now) => {
    if (!t0) t0 = now;
    const p = Math.min(1, (now - t0) / ms);
    el.textContent = fmt(from + (to - from) * ease(p));
    if (p < 1) raf = requestAnimationFrame(step); else el.textContent = fmt(to);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

// ── things arrive when they are looked at, and only the first time ──
export function onSeen(el, then, ratio) {
  if (!el) return;
  if (!('IntersectionObserver' in window)) { then(el); return; }
  const io = new IntersectionObserver((rows) => {
    rows.forEach((r) => {
      if (!r.isIntersecting) return;
      io.unobserve(r.target);
      then(r.target);
    });
  }, { threshold: ratio == null ? 0.35 : ratio });
  io.observe(el);
}

// ── the months, drawing themselves in the order they happened ──
export function armMonths(line) { if (line && !STILL() && line.querySelector('i')) line.classList.add('armed'); }
export function drawMonths(line) {
  if (!line) return;
  const bars = [...line.querySelectorAll('i')];
  if (!bars.length) return;
  if (STILL()) return;
  // 900ms across sixty-eight months is fourteen milliseconds a month: fast enough to read
  // as one gesture, slow enough that you can see it is a sequence.
  const span = 900 / bars.length;
  bars.forEach((b, i) => { b.style.setProperty('--wait', Math.round(i * span) + 'ms'); });
  requestAnimationFrame(() => line.classList.add('drawn'));
}

// ── where it went, growing from nothing, largest first ──
export function armBars(root) { if (root && !STILL() && root.querySelector('.gvbar')) root.classList.add('armed'); }
export function growBars(root) {
  if (!root) return;
  const bars = [...root.querySelectorAll('.gvbar')];
  if (STILL()) return;
  bars.forEach((b, i) => { b.style.setProperty('--wait', (i * 70) + 'ms'); });
  requestAnimationFrame(() => root.classList.add('grown'));
}

// the trace arms the same way: dimmed only because something is coming to undim it
export function armTrace(el) { if (el && !STILL()) el.classList.add('armed'); }
export const stillness = STILL;
