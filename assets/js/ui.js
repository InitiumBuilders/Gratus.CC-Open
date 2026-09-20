// Small UI helpers: sheets, toasts, press-and-hold, and the gestures. No rules live here.
export function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
export function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
export function $(sel, root) { return (root || document).querySelector(sel); }
export function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── the sense that has no sound ──
// A phone can answer a hand. It is the same permission as the song, because both are the
// app making itself felt, and one switch for both is one switch to find. iOS does not
// support this at all, so it is a gift where it lands and silence where it does not.
let feelAllowed = () => false;
export function setFeel(fn) { feelAllowed = typeof fn === 'function' ? fn : () => false; }
const PATTERNS = { tap: 8, lift: 6, commit: 14, hold: [10, 30, 16], phase: [14, 44, 22], given: [18, 60, 30, 60, 52], refuse: [24, 40, 24] };
export function feel(kind) {
  if (!feelAllowed() || !navigator.vibrate) return;
  try { navigator.vibrate(PATTERNS[kind] || PATTERNS.tap); } catch (e) {}
}

let toastTimer = 0;
export function toast(msg, ms) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), ms || 2600);
}

// a prism-glass sheet rises (dip, rise, settle). Returns { el, close }.
export function sheet(html, opts) {
  const o = opts || {};
  const root = $('#sheets');
  const scrim = h('<div class="scrim" role="presentation"></div>');
  const el = h('<div class="sheet glass" role="dialog" aria-modal="true"><div class="grabber" aria-hidden="true"></div>' + html + '</div>');
  root.appendChild(scrim); root.appendChild(el);
  let closed = false;
  const close = (result) => {
    if (closed) return; closed = true;
    el.classList.add('out'); scrim.style.opacity = '0'; scrim.style.transition = 'opacity .25s';
    setTimeout(() => { scrim.remove(); el.remove(); }, 300);
    document.removeEventListener('keydown', onKey);
    if (o.onClose) o.onClose(result);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  if (!o.sticky) scrim.addEventListener('click', () => close());
  const focusable = el.querySelector('input,textarea,button');
  if (focusable && o.autofocus) setTimeout(() => focusable.focus(), 350);
  if (!o.sticky) dragDown(el, scrim, close);
  return { el, close, scrim };
}

// ── a sheet follows the thumb down and lets go ──
// The grabber was drawn from the first day and never did anything, which is a handle
// painted on a door. It only takes the gesture when the sheet is already scrolled to its
// top, so reading a long sheet still scrolls the way reading scrolls.
function dragDown(el, scrim, close) {
  let y0 = 0, dy = 0, t0 = 0, on = false, locked = false, id = null;
  const reset = () => {
    el.style.transition = 'transform .28s cubic-bezier(.22,1,.36,1)';
    el.style.transform = ''; scrim.style.opacity = '';
    setTimeout(() => { el.style.transition = ''; }, 300);
  };
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || el.scrollTop > 0) return;
    if (e.target.closest('input, textarea, select, [contenteditable]')) return;
    on = true; locked = false; dy = 0; id = e.pointerId; y0 = e.clientY; t0 = performance.now();
  });
  el.addEventListener('pointermove', (e) => {
    if (!on || e.pointerId !== id) return;
    const d = e.clientY - y0;
    if (!locked) {
      if (Math.abs(d) < 9) return;
      if (d < 0) { on = false; return; }        // they are reaching up into the sheet
      locked = true; el.style.transition = 'none';
    }
    dy = Math.max(0, d);
    el.style.transform = 'translateY(' + (still() ? 0 : dy) + 'px)';
    scrim.style.opacity = String(Math.max(0, 1 - dy / 460));
  });
  const up = (e) => {
    if (!on || (id != null && e.pointerId !== id)) return;
    on = false; if (!locked) return;
    const v = dy / Math.max(1, performance.now() - t0);
    if (dy > 112 || (dy > 44 && v > 0.55)) { feel('lift'); el.style.transition = ''; close(); }
    else reset();
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
}

// ── across, between the three doors ──
// A horizontal drag moves between Give, Gratus and Grow. It gives the gesture up the
// moment the finger is going down the page instead of across it, so a page still scrolls
// the way a page scrolls. It never takes one that starts at the very edge of the glass,
// because that one belongs to the phone and taking it would break going back.
export function swipe(el, opts) {
  const o = Object.assign({ threshold: 62, edge: 28, can: () => true, onDrag: null, onEnd: null }, opts || {});
  let x0 = 0, y0 = 0, t0 = 0, on = false, axis = '', id = null;
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!o.can()) return;
    if (e.clientX < o.edge || e.clientX > innerWidth - o.edge) return;
    if (e.target.closest('input, textarea, select, [contenteditable], .chips, .pick, .phaseline, .sheet, [data-noswipe]')) return;
    on = true; axis = ''; id = e.pointerId; x0 = e.clientX; y0 = e.clientY; t0 = performance.now();
  });
  el.addEventListener('pointermove', (e) => {
    if (!on || e.pointerId !== id) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (!axis) {
      if (Math.abs(dx) < 11 && Math.abs(dy) < 11) return;
      axis = Math.abs(dx) > Math.abs(dy) * 1.25 ? 'x' : 'y';
      if (axis === 'y') { on = false; return; }
    }
    if (o.onDrag) o.onDrag(dx);
  });
  const up = (e) => {
    if (!on || (id != null && e.pointerId !== id)) return;
    on = false;
    if (axis !== 'x') return;
    const dx = e.clientX - x0;
    const v = Math.abs(dx) / Math.max(1, performance.now() - t0);
    const go = Math.abs(dx) > o.threshold || v > 0.42;
    if (o.onEnd) o.onEnd(go ? (dx < 0 ? 1 : -1) : 0, dx);
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', (e) => { if (on) { on = false; if (o.onEnd) o.onEnd(0, 0); } });
}

// press-and-hold: a Ring fills under the thumb; release completes it.
export function hold(el, opts) {
  const o = Object.assign({ ms: 900, onProgress: null, onDone: null, onCancel: null }, opts || {});
  let t0 = 0, raf = 0, timer = 0, active = false, done = false;
  const ring = el.querySelector('.ring');
  const setP = (p) => { el.style.setProperty('--p', String(Math.round(p * 100))); if (o.onProgress) o.onProgress(p); };
  // the clock decides; the frame only draws (a throttled frame must never hold the act hostage)
  const finish = () => { if (!active) return; done = true; active = false; cancelAnimationFrame(raf); setP(1); el.classList.remove('holding'); el.classList.add('performed'); setTimeout(() => el.classList.remove('performed'), 400); feel('commit'); if (o.onDone) o.onDone(); };
  const tick = () => { if (!active) return; setP(Math.min(1, (performance.now() - t0) / o.ms)); raf = requestAnimationFrame(tick); };
  const begin = () => { done = false; active = true; t0 = performance.now(); el.classList.add('holding'); setP(0); raf = requestAnimationFrame(tick); clearTimeout(timer); timer = setTimeout(finish, o.ms); };
  const start = (e) => { if (e.button != null && e.button !== 0) return; if (e.cancelable) e.preventDefault(); begin(); try { el.setPointerCapture(e.pointerId); } catch (x) {} };
  const stop = () => { if (!active) return; active = false; clearTimeout(timer); cancelAnimationFrame(raf); el.classList.remove('holding'); setP(0); if (!done && o.onCancel) o.onCancel(); };
  el.addEventListener('pointerdown', start);
  el.addEventListener('pointerup', stop); el.addEventListener('pointercancel', stop); el.addEventListener('pointerleave', stop);
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!active) begin(); } });
  el.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') stop(); });
  void ring;
  return { cancel: stop };
}

// A long press without the ring.
//
// It read opts.onLong and the one place in the app that used it passed opts.on, so from
// the day it was written until today it had never once fired. The names both work now,
// and a press that has fired swallows the click that the browser sends after it, which
// is what stopped a hold from also counting as a tap.
export function longPress(el, opts) {
  const o = Object.assign({ ms: 520, move: 12 }, opts || {});
  const act = o.onLong || o.on || o.onHold || null;
  let timer = 0, fired = false, x0 = 0, y0 = 0;
  const cancel = () => clearTimeout(timer);
  el.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;
    fired = false; x0 = e.clientX; y0 = e.clientY;
    cancel();
    timer = setTimeout(() => { fired = true; feel('hold'); if (act) act(e); }, o.ms);
  });
  el.addEventListener('pointermove', (e) => {
    if (!timer) return;
    if (Math.abs(e.clientX - x0) > o.move || Math.abs(e.clientY - y0) > o.move) cancel();
  });
  el.addEventListener('pointerup', (e) => { cancel(); if (!fired && o.onTap) o.onTap(e); });
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('pointerleave', cancel);
  el.addEventListener('click', (e) => { if (fired) { e.preventDefault(); e.stopPropagation(); fired = false; } }, true);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function fmtDay(day) {
  try { const d = new Date(day + 'T12:00:00'); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return day; }
}
export function monthName(ym) { try { return new Date(ym + '-15T12:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' }); } catch (e) { return ym; } }
export function pad2(n) { return String(n).padStart(2, '0'); }
export function copyText(t) { try { return navigator.clipboard.writeText(t).then(() => true, () => false); } catch (e) { return Promise.resolve(false); } }
export async function shareOrCopy(title, text, url) {
  if (navigator.share) { try { await navigator.share({ title, text, url }); return 'shared'; } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; } }
  const ok = await copyText(url || text); return ok ? 'copied' : 'failed';
}
