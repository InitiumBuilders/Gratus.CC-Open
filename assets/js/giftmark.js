// THE MARK THAT KNOWS YOU ARE HOLDING SOMETHING.
//
// Gratus has one mark: four petals of light. When there is a gift in your hands the mark
// is wrapped, gold ribbon and a heart in the lock, and it stays wrapped until the gift
// leaves you. It is the same mark. It is just carrying something.
//
// Four reasons it wraps, in order of who wins:
//
//   sending   the gift is leaving right now, and the mark leaves with it
//   giving    you are standing in Give, or holding somebody else's gift open
//   ready     something in your garden has reached Ready to Give, or a gift arrived
//   visit     THE PASSING. See below.
//
// THE PASSING. Twice a day, for four minutes, every Gratus on earth wraps its mark at the
// same instant. Nobody is told when. The window is worked out from the date itself, so
// every device agrees without anybody's server being asked and without anybody being
// watched: the same day gives the same two minutes to a phone in Lagos and a phone in
// Lisbon. It is not a notification and it asks for nothing. It is the app saying that
// somewhere out there, right now, somebody is giving something away.

export const PLAIN = '/assets/art/gfx/logo.webp';
export const WRAPPED = '/assets/art/gfx/giftmark.webp';

// ── the passing, from the date and nothing else ──
// A small deterministic hash so the two minutes of a day cannot be guessed from the two
// minutes of the day before, and cannot drift between one device and another.
function seedOf(y, m, d) {
  let h = 2166136261;
  for (const n of [y, m + 1, d]) {
    h ^= n; h = Math.imul(h, 16777619) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export const PASSING_MINUTES = 4;

// The two windows of a UTC day, as minutes past midnight. Exported whole because a gate
// can then read every day of a year and check they never sit on top of each other.
export function passingsOn(date) {
  const s = seedOf(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const a = s % 1440;
  // the second is at least a quarter of a day from the first, so they are two moments
  const b = (a + 360 + ((s >>> 11) % 720)) % 1440;
  return [a, b].sort((x, y) => x - y);
}

// Is this instant inside one of them? Returns the seconds left, or 0.
export function passingNow(now) {
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  const secs = mins * 60 + now.getUTCSeconds();
  for (const start of passingsOn(now)) {
    const from = start * 60;
    if (secs >= from && secs < from + PASSING_MINUTES * 60) return from + PASSING_MINUTES * 60 - secs;
  }
  return 0;
}

// ── painting it ──
// Every mark on the page at once, so the app never shows two different marks in two
// corners of the same screen.
export function paintMarks(wrapped, root) {
  const src = wrapped ? WRAPPED : PLAIN;
  const marks = (root || document).querySelectorAll(
    '.tabs .star .core img, .top .left img.mark, .brandrow img.mark, .nav .brand img, img.mark, .hbrand .hlogo');
  marks.forEach((img) => {
    if (img.getAttribute('src') === src) return;
    img.setAttribute('src', src);
    img.classList.add('mark-turn');
    setTimeout(() => img.classList.remove('mark-turn'), 700);
  });
  document.documentElement.classList.toggle('wrapped', !!wrapped);
  const link = document.querySelector('link[rel="icon"][sizes="192x192"]');
  if (link) link.setAttribute('href', wrapped ? WRAPPED : '/assets/brand/icon-192.png');
}

// ── the launch ──
//
// A gift does not fade out. It gathers, it charges, and it goes: the waves pull inward
// first, because a thing that is about to leave the ground presses down on it, and then
// the mark accelerates out through the top of the screen and keeps accelerating after it
// has gone. Nothing rotates. Nothing here is a highlight; every ring is a glow.
//
// It runs on transform and opacity only, above everything, and it cannot be tapped.
export function launch(fromEl, opts) {
  const o = opts || {};
  const done = o.onDone || (() => {});
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const box = fromEl && fromEl.getBoundingClientRect();
  if (!box || !box.width || still) { done(); return null; }

  // The gift that flies is a copy, so for as long as it is in the air the original has to
  // be gone from the bar. Watching a second gift leave while the first one sits there is
  // watching a trick. The light around it stays: the glow is the socket, not the gift.
  fromEl.classList.add('lifted');

  const stage = document.createElement('div');
  stage.className = 'launch';
  stage.setAttribute('aria-hidden', 'true');
  stage.style.setProperty('--x', Math.round(box.left + box.width / 2) + 'px');
  stage.style.setProperty('--y', Math.round(box.top + box.height / 2) + 'px');
  stage.style.setProperty('--d', Math.round(box.width) + 'px');
  stage.innerHTML = '<i class="wv w1"></i><i class="wv w2"></i><i class="wv w3"></i>'
    + '<img class="flier" src="' + WRAPPED + '" alt="">';
  document.body.appendChild(stage);

  // one frame on the ground, so the first thing anybody sees is the mark where it was
  requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add('go')));
  // opts.hold leaves the stage standing so the launch can be stepped frame by frame and
  // looked at. Nothing in the app passes it; the thing that films this does.
  const land = () => { fromEl.classList.remove('lifted'); stage.remove(); };
  const t = o.hold ? 0 : setTimeout(() => { land(); done(); }, 2150);
  return () => { if (t) clearTimeout(t); land(); };
}
