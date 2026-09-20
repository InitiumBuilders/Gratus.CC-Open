// THE LANDING · the arrival choreography, and nothing else.
// It lived inside index.html until the content policy said scripts come from files.
const GFX = (n) => '/assets/art/gfx/' + n; const h = document.documentElement;
const conn = navigator.connection || {};
const slow = conn.saveData === true || /^(slow-)?2g$|^3g$/.test(String(conn.effectiveType || ''));
const ok = !matchMedia('(prefers-reduced-motion: reduce)').matches && !slow;
if (ok && !document.hidden) h.classList.add('anim');
// the scene is the screen: the Gate zooming out, forward and back, forever
const scene = document.getElementById('scene'); const layer = document.createElement('div'); layer.className = 'layer in';
layer.innerHTML = '<div class="back" style="background-image:url(' + GFX('dlong-poster.webp') + ')"></div>' + (ok ? '<video class="fore" autoplay muted loop playsinline poster="' + GFX('dlong-poster.webp') + '" aria-hidden="true"><source src="' + GFX('dlong.mp4') + '" type="video/mp4"></video>' : '<img class="fore" src="' + GFX('dlong-poster.webp') + '" alt="">');
scene.appendChild(layer);
// the opening ritual, every time: the doorway, the light, a held white, then the page
const sp = document.getElementById('splash');
if (ok && !location.search.includes('nosplash')) {
  sp.innerHTML = '<video class="explode" muted playsinline preload="none" poster="' + GFX('explode-poster.webp') + '"><source src="' + GFX('explode.mp4') + '#t=11" type="video/mp4"></video><div class="white"></div><div class="brandrow ritual"><img class="mark" src="' + GFX('logo.webp') + '" alt=""><span class="brandname" style="font-size:44px;line-height:48px">Gratus.CC</span><span class="kicker mint">Grow Gratus Give</span></div><span class="kicker skiphint">tap to enter</span>';
  sp.hidden = false; const v = sp.querySelector('video'); let gone = false, flooded = false, moved = false;
  const out = () => { if (gone) return; gone = true; sp.classList.add('out'); setTimeout(() => { sp.hidden = true; sp.innerHTML = ''; }, 1500); };
  const flood = () => { if (flooded || gone) return; flooded = true; const w = sp.querySelector('.white'); if (w) w.classList.add('on'); const r = sp.querySelector('.ritual'); if (r) r.classList.add('lit'); setTimeout(out, 2600); };
  v.addEventListener('timeupdate', () => { if (v.currentTime > 11.2) moved = true; if (v.currentTime >= 24.4) flood(); });
  v.addEventListener('ended', flood); v.addEventListener('error', () => { if (!moved) out(); });
  const hard = setTimeout(flood, 16000); setTimeout(() => { if (!moved) out(); }, 4000);
  sp.onclick = () => { clearTimeout(hard); out(); }; v.currentTime = 11; v.play().catch(() => v.play().catch(() => null));
}
const acts = Array.from(document.querySelectorAll('.act, .foot'));
if ('IntersectionObserver' in window) { const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) e.target.classList.add('on'); }), { threshold: .25 }); acts.forEach((s) => io.observe(s)); }
setTimeout(() => acts.forEach((s) => s.classList.add('on')), 1400);
// a kicker that ends a sentence reads as a sentence
document.querySelectorAll('.kicker').forEach((k) => { if (/[.!?]$/.test(k.textContent.trim())) k.classList.add('say'); });
const st = document.querySelector('.stars'); let s = '';
for (let i = 0; i < 90; i++) s += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 100).toFixed(1) + '%;--tw:' + (3 + Math.random() * 6).toFixed(1) + 's;--d:' + (Math.random() * 6).toFixed(1) + 's;opacity:' + (.2 + Math.random() * .6).toFixed(2) + '"></i>';
st.innerHTML = s;
