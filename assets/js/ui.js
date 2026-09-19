// Small UI helpers: sheets, toasts, press-and-hold. No rules live here.
export function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
export function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
export function $(sel, root) { return (root || document).querySelector(sel); }
export function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

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
  return { el, close, scrim };
}

// press-and-hold: a Ring fills under the thumb; release completes it.
export function hold(el, opts) {
  const o = Object.assign({ ms: 900, onProgress: null, onDone: null, onCancel: null }, opts || {});
  let t0 = 0, raf = 0, timer = 0, active = false, done = false;
  const ring = el.querySelector('.ring');
  const setP = (p) => { el.style.setProperty('--p', String(Math.round(p * 100))); if (o.onProgress) o.onProgress(p); };
  // the clock decides; the frame only draws (a throttled frame must never hold the act hostage)
  const finish = () => { if (!active) return; done = true; active = false; cancelAnimationFrame(raf); setP(1); el.classList.remove('holding'); el.classList.add('performed'); setTimeout(() => el.classList.remove('performed'), 400); if (o.onDone) o.onDone(); };
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

// a long-press without the ring (quick capture on the Seed Mark)
export function longPress(el, opts) {
  const o = Object.assign({ ms: 600 }, opts || {});
  let timer = 0, fired = false;
  el.addEventListener('pointerdown', (e) => { if (e.button != null && e.button !== 0) return; fired = false; timer = setTimeout(() => { fired = true; if (o.onLong) o.onLong(e); }, o.ms); });
  const end = (e) => { clearTimeout(timer); if (!fired && e.type === 'pointerup' && o.onTap) o.onTap(e); };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('pointerleave', () => clearTimeout(timer));
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
