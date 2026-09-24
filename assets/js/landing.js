// THE LANDING · the arrival choreography, and nothing else.
// It lived inside index.html until the content policy said scripts come from files.
const GFX = (n) => '/assets/art/gfx/' + n; const h = document.documentElement;
const conn = navigator.connection || {};
const slow = conn.saveData === true || /^(slow-)?2g$|^3g$/.test(String(conn.effectiveType || ''));
const ok = !matchMedia('(prefers-reduced-motion: reduce)').matches && !slow;
if (ok && !document.hidden) h.classList.add('anim');
// THE SCENE WAITS FOR THE DOORWAY.
//
// Two films used to start downloading at the same instant: the doorway ceremony, which is
// the only thing on screen, and the scene behind it, which nobody can see until the
// ceremony ends. Measured together they are twenty megabytes, and half of that was being
// pulled to sit behind a full-screen video.
//
// The poster goes up immediately, so the page is never empty. The film arrives after the
// doorway lets go, or at once when there is no doorway.
const scene = document.getElementById('scene'); const layer = document.createElement('div'); layer.className = 'layer in';
layer.innerHTML = '<div class="back" style="background-image:url(' + GFX('dlong-poster.webp') + ')"></div>'
  + (ok ? '' : '<img class="fore" src="' + GFX('dlong-poster.webp') + '" alt="">');
scene.appendChild(layer);
let scenePlaced = false;
function placeScene() {
  if (scenePlaced || !ok) return;
  scenePlaced = true;
  const v = document.createElement('video');
  v.className = 'fore'; v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
  v.setAttribute('poster', GFX('dlong-poster.webp'));
  v.setAttribute('aria-hidden', 'true');
  v.innerHTML = '<source src="' + GFX('dlong.mp4') + '" type="video/mp4">';
  layer.appendChild(v);
  v.play().catch(() => null);
}
// ── one doorway per arrival ──
// Remembered for the visit only, so every fresh open of the app still gets its doorway.
// Anything that goes wrong with storage falls back to playing it, which is the old way.
const CROSSED = 'gratus.crossed';
const crossedNow = () => { try { sessionStorage.setItem(CROSSED, String(Date.now())); } catch (e) {} };
const crossedAlready = () => {
  try { const t = Number(sessionStorage.getItem(CROSSED) || 0); return t > 0 && Date.now() - t < 30 * 60 * 1000; }
  catch (e) { return false; }
};

// the opening ritual, every time: the doorway, the light, a held white, then the page
const sp = document.getElementById('splash');
if (ok && !location.search.includes('nosplash') && !crossedAlready()) {
  sp.innerHTML = '<video class="explode" muted playsinline preload="none" poster="' + GFX('explode-poster.webp') + '"><source src="' + GFX('explode.mp4') + '#t=11" type="video/mp4"></video><div class="white"></div><div class="brandrow ritual"><img class="mark" src="' + GFX('logo.webp') + '" alt=""><span class="brandname" style="font-size:44px;line-height:48px">Gratus.CC</span><span class="kicker mint">Grow Gratus Give</span></div><span class="kicker skiphint">tap to enter</span>';
  sp.hidden = false; const v = sp.querySelector('video'); let gone = false, flooded = false, moved = false;
  const out = () => { if (gone) return; gone = true; crossedNow(); document.removeEventListener('keydown', onKey); sp.classList.add('out'); placeScene(); setTimeout(() => { sp.hidden = true; sp.innerHTML = ''; }, 1500); };
  const flood = () => { if (flooded || gone) return; flooded = true; const w = sp.querySelector('.white'); if (w) w.classList.add('on'); const r = sp.querySelector('.ritual'); if (r) r.classList.add('lit'); setTimeout(out, 2600); };
  v.addEventListener('timeupdate', () => { if (v.currentTime > 11.2) moved = true; if (v.currentTime >= 24.4) flood(); });
  v.addEventListener('ended', flood); v.addEventListener('error', () => { if (!moved) out(); });
  const hard = setTimeout(flood, 16000); setTimeout(() => { if (!moved) out(); }, 4000);
  sp.onclick = () => { clearTimeout(hard); out(); };
  // Escape, Enter and the space bar pass the doorway too: a door only a pointer can open is locked
  function onKey(e) { if (!gone && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar')) { e.preventDefault(); sp.onclick(); } }
  document.addEventListener('keydown', onKey);
  v.currentTime = 11; v.play().catch(() => v.play().catch(() => null));
}
// No doorway on this open, so nothing is in front of the scene: bring it now. And however
// the doorway ends, the scene is never left as a still for longer than a few seconds.
if (!ok || location.search.includes('nosplash') || crossedAlready()) placeScene();
setTimeout(placeScene, 6000);

const acts = Array.from(document.querySelectorAll('.act, .foot'));
if ('IntersectionObserver' in window) { const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) e.target.classList.add('on'); }), { threshold: .25 }); acts.forEach((s) => io.observe(s)); }
setTimeout(() => acts.forEach((s) => s.classList.add('on')), 1400);
// a kicker that ends a sentence reads as a sentence
document.querySelectorAll('.kicker').forEach((k) => { if (/[.!?]$/.test(k.textContent.trim())) k.classList.add('say'); });
const st = document.querySelector('.stars'); let s = '';
for (let i = 0; i < 90; i++) s += '<i style="left:' + (1 + Math.random() * 97).toFixed(1) + '%;top:' + (1 + Math.random() * 97).toFixed(1) + '%;--tw:' + (3 + Math.random() * 6).toFixed(1) + 's;--d:' + (Math.random() * 6).toFixed(1) + 's;opacity:' + (.2 + Math.random() * .6).toFixed(2) + '"></i>';
st.innerHTML = s;

// The figure on the Giveth act is read from Giveth, every time this page opens, and it is
// never written down here. Not one sentence below is authored in this file either: the
// words live in index.html, and this moves a number into them or reveals the line that
// says nobody answered. A number nobody could reach is not a zero, and this one is a claim
// about somebody else's work.
const total = document.getElementById('gv-total');
if (total) {
  const said = document.getElementById('gv-said');
  const quiet = document.getElementById('gv-quiet');
  const shape = document.getElementById('gv-shape');
  fetch('/api/giveth-stats', { cache: 'no-store' }).then((r) => r.json()).then((d) => {
    if (d.error || d.usd == null || !(d.usd > 0)) throw new Error('quiet');
    total.textContent = '$' + Math.round(d.usd).toLocaleString();
    total.classList.remove('waiting');
    if (said && shape && d.donors && d.listed) {
      said.textContent = shape.content.textContent
        .replace('{people}', Number(d.donors).toLocaleString())
        .replace('{projects}', Number(d.listed).toLocaleString());
    }
  }).catch(() => {
    total.hidden = true;
    if (said) said.hidden = true;
    if (quiet) quiet.hidden = false;
  });
}

// THE PASSING, on the front page too.
//
// Twice a day, for four minutes, every Gratus on earth wraps its mark at the same instant.
// The window comes out of the date itself, so this page agrees with the app and with every
// other device without anybody's server being asked and without anybody being watched.
import { paintMarks, passingNow } from './giftmark.js?v=39';
const passing = () => paintMarks(!!passingNow(new Date()));
passing();
setInterval(passing, 30000);
