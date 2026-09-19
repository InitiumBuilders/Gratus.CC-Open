// ═══════════════════════════════════════════════════════════════════
// GRATUS.CC — Grow · Gratus · Give. His scenes behind glass, one per screen, another each time the
// app opens. The emoji garden, the entries, the recipes, the Growth Book, and the whole first-gift
// journey. Everything lives on the device for now; the backend comes later. A gift travels inside
// its own link, so the journey works with no server at all.
// ═══════════════════════════════════════════════════════════════════
import * as Gr from '../../engine/gratus.js?v=12';
import * as E from '../../engine/emoji.js?v=12';
import { newId } from '../../engine/rng.js?v=12';
import { esc, $, $$, sheet, toast, fmtDay, longPress, shareOrCopy } from './ui.js?v=12';
import { keepPut, keepGet, keepDel } from './keep.js?v=13';

const KEY = 'gratus.galaxy.v1';
const GFX = (n) => '/assets/art/gfx/' + n;
const LOGO = GFX('logo.png');
let C = {}, S = null, tab = 'gratus', sub = null, room = null, installEvt = null;

// ── his scenes, by screen. A name starting with v is a video (poster beside it). ──
const SCENES = {
  guides: ['g29', 'g30', 'dlong', 'g20', 'g07'], vibes: ['g36', 'g15', 'v2', 'g05', 'g32'],
  home: ['g31', 'g32', 'g37', 'dlong', 'g29', 'g33', 'v2', 'g15', 'g36', 'd2'], grow: ['g37', 'g33', 'v3', 'g08', 'd2', 'v1', 'g06', 'g10', 'g16', 'g09'], give: ['g34', 'g35', 'g13', 'd2', 'g14', 'g30', 'dhold', 'g09', 'g12'],
  book: ['g31', 'v1', 'g16', 'g03', 'g20', 'v3', 'g07', 'g24', 'g26', 'g25', 'g27'], galaxy: ['g36', 'g15', 'v2', 'g05'], vault: ['g17', 'v2', 'g18'], earth: ['g38', 'g23', 'v3', 'g19', 'g21'], world: ['dlong', 'g14', 'g23'], projects: ['g23', 'v1', 'g19'], goals: ['g14', 'g23', 'g04'],
  journey: ['g13', 'dhold', 'g13', 'dlong', 'g20', 'g07', 'g19', 'v2'], ceremony: ['g22', 'g05', 'g03'], garden: ['g33', 'g11', 'g27', 'g24', 'g25'],
  giveth: ['g38', 'g23', 'g35', 'g19', 'g21'], console: ['g36', 'g32', 'g31'], trace: ['g33', 'g37', 'g31']
};
function scene(key, i) { const list = SCENES[key]; if (typeof list === 'string') return list; return list[(((S && S.opens) || 0) + (i || 0)) % list.length]; }
const motionOk = () => !matchMedia('(prefers-reduced-motion: reduce)').matches && !(navigator.connection && navigator.connection.saveData);
function art(name, cls) {
  if (name[0] === 'v' || (name[0] === 'd' && name !== 'dlong-x')) { const poster = GFX(name + '-poster.jpg'); return motionOk() ? '<div class="art' + (cls ? ' ' + cls : '') + '" style="background-image:url(' + poster + ')"><video autoplay muted loop playsinline poster="' + poster + '" aria-hidden="true"><source src="' + GFX(name + '.mp4') + '" type="video/mp4"></video></div>' : '<div class="art' + (cls ? ' ' + cls : '') + '" style="background-image:url(' + poster + ')"></div>'; }
  return '<div class="art' + (cls ? ' ' + cls : '') + '" style="background-image:url(' + GFX(name + '.jpg') + ')"></div>';
}
let sceneNow = null;
function setScene(name) {
  const root = $('#scene'); if (!root || sceneNow === name) return; sceneNow = name;
  const old = Array.from(root.children); const layer = document.createElement('div'); layer.className = 'layer';
  const video = name[0] === 'v' || name[0] === 'd'; const poster = video ? GFX(name + '-poster.jpg') : GFX(name + '.jpg');
  layer.innerHTML = '<div class="back" style="background-image:url(' + poster + ')"></div>' +
    (video && motionOk() ? '<video class="fore" autoplay muted loop playsinline poster="' + poster + '" aria-hidden="true"><source src="' + GFX(name + '.mp4') + '" type="video/mp4"></video>' : '<img class="fore" src="' + poster + '" alt="" aria-hidden="true">');
  root.appendChild(layer); setTimeout(() => layer.classList.add('in'), 40);
  setTimeout(() => old.forEach((o) => o.remove()), 1600);
}
const I = {
  menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  giveth: '<svg viewBox="0 0 24 24"><path d="M12 21c-5-3.5-8-6.7-8-10a4.2 4.2 0 0 1 8-1.6A4.2 4.2 0 0 1 20 11c0 3.3-3 6.5-8 10Z"/><path d="M12 13.5v-3M10.5 12h3"/></svg>',
  feather: '<svg viewBox="0 0 24 24"><path d="M20 4c-6 0-11 4-13 10l-3 6 6-3c6-2 10-7 10-13Z"/><path d="M4 20 14 10"/></svg>',
  giftline: '<svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M3 12h18M12 8v13M12 8c-2 0-4-1-4-3s2-2 4 3c2-5 4-5 4-3s-2 3-4 3"/></svg>',
  user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z"/></svg>',
  gift: '<svg viewBox="0 0 24 24"><path d="M3 11h18v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9Z"/><path d="M2.5 7.5h19v3.5h-19zM12 7.5V21"/><path d="M12 7.5S10.8 3 8.4 3a2.2 2.2 0 0 0 0 4.5H12Zm0 0S13.2 3 15.6 3a2.2 2.2 0 0 1 0 4.5H12Z"/></svg>',
  people: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 19c.6-3 3-5 6-5s5.4 2 6 5M14 18c.4-2 1.8-3.5 3.5-3.5S21 16 21 18"/></svg>',
  globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
  cam: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="14" rx="3"/><circle cx="12" cy="13" r="4"/><path d="M8 6l1.5-2h5L16 6"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  text: '<svg viewBox="0 0 24 24"><path d="M5 6h14M12 6v13M8 19h8"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M4 10v4h3l4 4V6L7 10H4Z"/><path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a8 8 0 0 1 0 11"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M4 10v4h3l4 4V6L7 10H4Z"/><path d="M16 9l5 6M21 9l-5 6"/></svg>'
};

// ── time and state ──
const pad2 = (n) => String(n).padStart(2, '0');
function today() { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function fresh() { return { v: 1, name: '', entries: [], plants: [], gifts: { given: [], received: [] }, my: { emojis: [], recipes: [] }, wishes: [], goals: [], sound: true, made: {}, opens: 0, migrated: false, folders: [], milestones: {}, seeds: [], alch: {}, sun: null, vibes: [] }; }
function load() {
  try { S = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { S = null; }
  if (!S || S.v !== 1) S = fresh();
  if (!Array.isArray(S.goals)) S.goals = []; if (S.sound == null) S.sound = true; if (!Array.isArray(S.folders)) S.folders = []; if (!Array.isArray(S.seeds)) S.seeds = []; if (!Array.isArray(S.vibes)) S.vibes = []; if (!S.alch || typeof S.alch !== 'object') S.alch = {}; if (!S.milestones || typeof S.milestones !== 'object') S.milestones = {};
  if (!S.migrated) { S.migrated = true; try { migrate(); } catch (e) {} }
  S.opens = (S.opens || 0) + 1; save();
}
function migrate() {
  const v1 = JSON.parse(localStorage.getItem('gratus.v1') || 'null');
  if (v1 && Array.isArray(v1.entries) && v1.entries.length) {
    const byId = {}; for (const p of v1.plants || []) byId[p.id] = p;
    for (const e of v1.entries) { const p = byId[(e.plantIds || [])[0]]; const body = e.question != null ? e.text : ((e.text || '').split('\n').filter((l) => l.trim()).slice(1).join('\n') || e.text || ''); S.entries.push({ id: e.id || newId('e'), day: e.day, at: e.createdAt || null, text: body, emoji: p ? p.emoji : null, tags: [], photo: null }); }
    for (const p of v1.plants || []) { const kept = Array.from(new Set(v1.entries.filter((e) => (e.plantIds || []).includes(p.id)).map((e) => e.day))); S.plants.push({ id: p.id || newId('p'), emoji: p.emoji, planted: p.plantedAt || kept[0] || today(), kept, carried: 0, origin: 'planted', from: null }); }
    S.name = (v1.user && v1.user.displayName) || S.name;
  }
  const v2 = JSON.parse(localStorage.getItem('gratus.v2') || 'null');
  if (v2 && Array.isArray(v2.held)) {
    for (const g of v2.held) { const h = g.hands[g.hands.length - 1] || {}; S.plants.push({ id: newId('p'), emoji: g.emoji, planted: g.born, kept: (h.kept || []).slice(), carried: g.hands.slice(0, -1).reduce((n, x) => n + (x.days || 0), 0), origin: g.hands.length > 1 ? 'gift' : 'planted', from: g.hands.length > 1 ? g.hands[g.hands.length - 2].name : null }); }
    for (const l of v2.lines || []) { const g = v2.held.find((x) => x.id === l.gid); S.entries.push({ id: l.id, day: l.day, at: l.at, text: l.text, emoji: g ? g.emoji : null, tags: [], photo: null }); }
    S.name = S.name || v2.name || '';
  }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Storage is full. Export, then start over.'); } }
const daysOf = (p) => (p.kept || []).length + (p.carried || 0);
const face = (p) => E.currentEmoji(p.emoji, daysOf(p), C.evo);
const nameOf = (e) => (C.names || {})[e] || e;
// a count is read by a person: 16846 donors is a number, 16,846 donors is a fact
const plural = (n, w) => (Number(n) || 0).toLocaleString() + ' ' + w + (Number(n) === 1 ? '' : 's');
function phaseOf(d) { let out = C.book.phases[0]; for (const ph of C.book.phases) if (d >= ph.day) out = ph; return out; }
function phaseIndex(d) { return C.book.phases.indexOf(phaseOf(d)); }
function nextPhase(d) { return C.book.phases.find((ph) => ph.day > d) || null; }
function plantFor(emoji) { return S.plants.find((p) => p.emoji === emoji || face(p) === emoji) || null; }
function allRecipes() { return (C.recipes.models || []).concat(S.my.recipes); }
function palette() { const set = []; for (const e of C.book.starters.concat(S.my.emojis, S.plants.map((p) => face(p)))) if (!set.includes(e)) set.push(e); return set; }
function dayEmojis() { const by = {}; for (const e of S.entries) { if (!e.emoji) continue; const s = by[e.day] || (by[e.day] = new Set()); s.add(e.emoji); const p = plantFor(e.emoji); if (p) s.add(face(p)); } return by; }
function sharedDays(a, b) { const by = dayEmojis(); let n = 0; for (const d in by) if (by[d].has(a) && by[d].has(b)) n++; return n; }
function recipeState(r) { const need = r.days || C.recipes.days || 3; const n = sharedDays(r.formula[0], r.formula[1]); return { made: !!S.made[r.id] || n >= need, days: n, need }; }
function choreograph() { const h = document.documentElement; h.classList.remove('landed'); if (motionOk() && !document.hidden) { h.classList.remove('anim'); void h.offsetWidth; h.classList.add('anim'); } clearTimeout(choreograph.t); choreograph.t = setTimeout(() => h.classList.add('landed'), 2400); }
function stars() { const el = $('.stars'); if (!el || el.children.length) return; let s = ''; for (let i = 0; i < 70; i++) s += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 100).toFixed(1) + '%;--tw:' + (3 + Math.random() * 6).toFixed(1) + 's;--d:' + (Math.random() * 6).toFixed(1) + 's;opacity:' + (.2 + Math.random() * .6).toFixed(2) + '"></i>'; el.innerHTML = s; }

// ── shell ──
function topBar(o) {
  const back = o && o.back;
  return '<header class="top">' + (back ? '<button class="back" id="top-back" aria-label="back">‹</button>' : '<span class="left"><img class="mark" src="' + LOGO + '" alt=""><span class="brandname">Gratus.CC</span></span>') + '<span class="right"><button class="sound' + (S.sound ? ' on' : '') + '" id="top-sound" aria-label="' + (S.sound ? 'mute the song' : 'play the song') + '">' + (S.sound ? I.sound : I.mute) + '</button><button class="you" id="top-you" aria-label="you">' + I.user + '</button></span></header>';
}
// a screen's hero: the scene, the title high, the words low
function hero(sceneName, o) {
  setScene(sceneName);
  return '<section class="hero' + (o.cls ? ' ' + o.cls : '') + '">' +
    '<div class="top-words">' + (o.brand ? '<div class="brandrow in" style="--i:0"><img class="mark" src="' + LOGO + '" alt=""><span class="brandname">Gratus.CC</span><span class="kicker">' + esc(o.brand) + '</span></div>' : '') + (o.h1 ? '<h1 class="in" style="--i:0">' + esc(o.h1) + '</h1>' : '') + (o.k1 ? '<span class="kicker mint in" style="--i:1">' + esc(o.k1) + '</span>' : '') + (o.k2 ? '<span class="kicker in" style="--i:1">' + esc(o.k2) + '</span>' : '') + '</div>' +
    '<div class="low">' + (o.low || '') + '</div></section>';
}
const INTROS = { give: { src: 'give-intro', flood: 12.6, hard: 14500 }, grow: { src: 'grow-intro', flood: 9.6, hard: 11500 } };
let booted = false, introOn = false;
function tabIntro(t, then) {
  const el = $('#intro'); const cfg = INTROS[t]; if (!el || !cfg || !motionOk() || introOn) { then(); return; }
  introOn = true; let gone = false, started = false, flooded = false, moved = false, hard = 0, stall = 0;
  const out = () => { if (gone) return; gone = true; introOn = false; clearTimeout(hard); clearTimeout(stall); el.classList.add('out'); setTimeout(() => { el.hidden = true; el.innerHTML = ''; el.classList.remove('out'); }, 1300); if (!started) { started = true; then(); } };
  const flood = () => { if (flooded || gone) return; flooded = true; const w = el.querySelector('.white'); if (w) w.classList.add('on'); setTimeout(out, 1900); };
  el.innerHTML = '<video muted playsinline preload="auto" poster="' + GFX(cfg.src + '-poster.jpg') + '"><source src="' + GFX(cfg.src + '.mp4') + '" type="video/mp4"></video><div class="white"></div><span class="kicker skiphint">tap to enter</span>';
  el.hidden = false; const v = el.querySelector('video');
  v.addEventListener('timeupdate', () => { if (v.currentTime > 0.2) moved = true; if (v.currentTime >= cfg.flood) flood(); });
  v.addEventListener('ended', flood);
  v.addEventListener('error', () => { if (!moved) out(); });
  hard = setTimeout(flood, cfg.hard);
  stall = setTimeout(() => { if (!moved) out(); }, 3200);
  el.onclick = () => out();
  v.muted = true; v.play().catch(() => v.play().catch(() => null));
}
function go(t, s) { if (booted && !s && INTROS[t] && t !== tab) { tabIntro(t, () => goNow(t, s)); return; } goNow(t, s); }
function goNow(t, s) { tab = t; sub = s || null; const path = '/app' + (sub ? '/' + sub : (tab === 'gratus' ? '' : '/' + tab)); if (location.pathname.endsWith('.html')) history.replaceState(null, '', location.pathname + '?tab=' + (sub || tab)); else history.replaceState(null, '', path); render(); window.scrollTo({ top: 0 }); }
function render() {
  checkMilestones(); checkAlchemy();
  const root = $('#view'); let s = '';
  if (sub === 'book') s = topBar({ back: true }) + viewBook();
  else if (sub === 'garden') s = topBar({ back: true }) + viewGarden();
  else if (sub === 'projects') s = topBar({ back: true }) + viewProjects();
  else if (sub === 'world') s = topBar({ back: true }) + viewWorld();
  else if (sub === 'vault') s = topBar({ back: true }) + viewVault();
  else if (sub === 'earth') s = topBar({ back: true }) + viewEarth();
  else if (sub === 'galaxy') s = topBar({ back: true }) + viewGalaxy();
  else if (sub === 'guides') s = topBar({ back: true }) + viewGuides();
  else if (sub === 'vibes') s = topBar({ back: true }) + viewVibes();
  else if (sub === 'giveth') s = topBar({ back: true }) + viewGiveth();
  else if (sub === 'console') s = topBar({ back: true }) + viewConsole();
  else if (tab === 'grow') s = topBar() + viewGrow();
  else if (tab === 'give') s = topBar() + viewGive();
  else s = viewGratus();
  root.innerHTML = s; choreograph(); frameArt(root);
  if (tab === 'gratus' && !sub) { const t = $('.top'); if (t) t.querySelector('.left').style.visibility = 'hidden'; }
  $$('.tabs button[data-tab]').forEach((b) => { b.classList.toggle('on', b.dataset.tab === tab && !sub); });
  const back = $('#top-back'); if (back) back.addEventListener('click', () => go(sub === 'vault' || sub === 'earth' ? 'give' : tab, sub === 'vault' || sub === 'earth' ? 'world' : null));
  $('#top-you').addEventListener('click', youSheet);
  { const ts = $('#top-sound'); if (ts) ts.addEventListener('click', toggleSound); }
  wire();
}

// ══ GRATUS GUIDES · what this is for, and how it works ══════════════════════════════════════
function viewGuides() {
  const ph = C.book.phases;
  const guide = (ico, title, body) => '<div class="glass guide"><span class="g-ico">' + ico + '</span><div><b>' + title + '</b><span class="body">' + body + '</span></div></div>';
  return hero(scene('guides'), { cls: 'room-hero', h1: 'Gratus Guides', k1: 'Why any of this exists.', k2: 'And how to walk it.' }) +
    '<div class="page">' +
    '<div class="glass card creed"><span class="kicker gold">The mission</span>' +
    '<p class="statement">Gratitude, grown daily, and given away.</p>' +
    '<p class="body">Gratitude works and does not stick. People start, feel the lift, and stop, because a list of good things never changes and never points anywhere. Gratus makes gratitude grow, and then lets you give it away, so the practice has somewhere to go.</p></div>' +
    '<div class="glass card creed"><span class="kicker gold">The vision</span>' +
    '<p class="statement">A kinder world grows from here.</p>' +
    '<p class="body">A world where noticing something good is the first move of a chain: you keep it, it grows, you give it, someone receives it, and it grows again in their hands. Gratitude as a thing in motion rather than a feeling that fades by lunchtime.</p></div>' +
    '<div class="eyebrow"><h2>The loop</h2><span class="more">five steps</span></div>' +
    '<div class="loopline">' + [['✍️', 'Write', 'One honest line about today.'], ['🌱', 'Plant', 'An emoji carries it.'], ['↩︎', 'Return', 'It grows on the days you write about it.'], ['✨', 'Make', 'Two threads together make a recipe.'], ['🎁', 'Give', 'When it is ready, it can leave your hands.']].map(([i2, n, l]) => '<div class="loopstep"><span class="ls-ico">' + i2 + '</span><b>' + n + '</b><span>' + l + '</span></div>').join('<i class="ls-join" aria-hidden="true"></i>') + '</div>' +
    '<div class="eyebrow"><h2>How a Gratus grows</h2></div>' +
    '<div class="rows">' + ph.map((p, k) => '<div class="glass phase"><span class="ico' + (k === ph.length - 1 ? ' gold' : '') + '">' + p.icon + '</span><span><b>' + esc(p.name) + '</b><span class="cap">' + esc(p.meaning) + '</span></span><span class="day">day ' + p.day + '</span></div>').join('') + '</div>' +
    '<div class="eyebrow"><h2>What we promise</h2></div>' +
    '<div class="rows">' +
    guide('🔒', 'Your journal never leaves this device.', 'Not to us, not to anyone. The only things that travel are what you choose to give: a gift, a goal, a seed, a vibe.') +
    guide('🫱', 'Nothing to buy, ever.', 'No tiers, no ranks, no upgrade. A gate refuses those words in the code before anything ships.') +
    guide('🌾', 'No one is compared with anyone.', 'Days in a row, marks on your own road. Never a score against another person.') +
    guide('🕯️', 'A quiet day is still a day.', 'Nothing here counts what you did not do, and nothing here asks you to hurry.') +
    guide('📖', 'Open, all of it.', 'Code, art, video, song and words, MIT. Read it, take it, build on it.') +
    '</div>' +
    '<div class="eyebrow"><h2>Where to start</h2></div>' +
    '<div class="rows">' +
    '<button class="glass opt" id="gd-write"><span class="ico">🌱</span><span class="grow"><b>Write today</b><span>One line. It takes a minute and it starts everything.</span></span><span class="arrow">›</span></button>' +
    '<button class="glass opt" id="gd-book"><span class="ico">📖</span><span class="grow"><b>The Growth Book</b><span>Your journal by day, the phases, the emojis, the recipes.</span></span><span class="arrow">›</span></button>' +
    '<button class="glass opt" id="gd-vibes"><span class="ico">✦</span><span class="grow"><b>Gratus Vibes</b><span>The small rooms: a few people, one feed, gratitude out loud.</span></span><span class="arrow">›</span></button>' +
    '<button class="glass opt" id="gd-giveth"><span class="ico gold">🤝</span><span class="grow"><b>Give with Giveth</b><span>Real projects, zero fees. Your words ride with the gift.</span></span><span class="arrow">›</span></button>' +
    '<button class="glass opt" id="gd-laws"><span class="ico">⚖️</span><span class="grow"><b>The twelve laws</b><span>The whole thing, one line at a time.</span></span><span class="arrow">›</span></button>' +
    '</div>' +
    '<p class="statement quiet" style="text-align:center">\u201cGratus means honor.\u201d</p>' +
    '</div>';
}
// ══ GRATUS VIBES · the small rooms ══════════════════════════════════════════════════════════
let vibeNow = null, vibeState = 'idle';
// What a room holds is on the server; what you have read is on your device.
// vibeCounts is the first half, x.seen the second, and the difference is the mark.
// Six rooms at most per look, because this is a courtesy, not a service.
let vibeCounts = null, vibeFresh = 0;
const vibeUnread = (x) => { const n = vibeCounts && vibeCounts[x.code]; return typeof n === 'number' ? Math.max(0, n - (Number(x.seen) || 0)) : 0; };
async function loadVibeCounts() {
  if (!S.vibes.length) return;
  const out = {};
  await Promise.all(S.vibes.slice(-6).map(async (x) => {
    try {
      const r = await fetch('/api/vibes?code=' + encodeURIComponent(x.code), { cache: 'no-store' });
      if (!r.ok) return; const d = await r.json();
      if (d && d.vibe) out[x.code] = Number(d.vibe.count) || 0;
    } catch (e) {}
  }));
  vibeCounts = out; if (sub === 'vibes') render();
}
async function loadVibe(code, quiet) {
  if (!code) return; vibeState = 'loading'; if (!quiet && sub === 'vibes') render();
  try {
    const r = await fetch('/api/vibes?code=' + encodeURIComponent(code), { cache: 'no-store' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.vibe) throw new Error(d.error || 'no answer');
    vibeNow = d.vibe; vibeState = 'live';
    const mine = S.vibes.find((v) => v.code === code);
    const count = Number(d.vibe.count) || 0;
    // the first time you walk in, nothing here is new: it is simply the room
    vibeFresh = mine && typeof mine.seen === 'number' ? Math.max(0, count - mine.seen) : 0;
    if (mine) { mine.name = d.vibe.name; mine.seen = count; save(); }
    if (vibeCounts) vibeCounts[code] = count;
  } catch (e) { vibeState = 'offline'; }
  if (sub === 'vibes') render();
}
const unreadRooms = () => S.vibes.filter((x) => vibeUnread(x) > 0).length;
function viewVibes() {
  const v = vibeNow;
  if (vibeCounts === null && S.vibes.length) loadVibeCounts();
  return hero(scene('vibes'), { cls: 'room-hero', h1: 'Gratus Vibes', k1: 'The small rooms.', k2: 'A few people. One feed. Gratitude out loud.' }) +
    '<div class="page">' +
    (S.vibes.length ? '<div class="chips row">' + S.vibes.map((x) => '<button class="chip' + (v && v.code === x.code ? ' on' : '') + '" data-vopen="' + esc(x.code) + '">' + esc(x.emoji || '✦') + ' ' + esc(x.name || x.code) + (vibeUnread(x) ? '<i class="dot"></i>' : '') + '</button>').join('') + '</div>' : '') +
    (unreadRooms() ? '<p class="vibeline"><i class="vibemark"></i>' + (unreadRooms() === 1 ? 'One of your rooms has words you have not read.' : unreadRooms() + ' of your rooms have words you have not read.') + '</p>' : '') +
    (!v ? '<div class="glass card"><span class="kicker mint">What a Vibe is</span><p class="body">A small room with a name and a code. Anyone holding the code is in it. People post short gratitudes there with an emoji from their own garden, and that is all that travels: your journal stays on your device.</p>' +
      '<div class="two"><input class="field" id="vb-code" maxlength="12" placeholder="e.g. K7M2QP" aria-label="a vibe code"><button class="btn" id="vb-join">Go in</button></div>' +
      '<button class="btn mint wide" id="vb-make">Start a Vibe ✦</button></div>' +
      '<div class="eyebrow"><h2>What a room looks like</h2><span class="more">an example</span></div>' +
      '<div class="rows sample">' + [['🌻', 'Maya', 'Two hours of quiet this morning, and nobody needed anything from me.'],
        ['☕', 'Tomas', 'My sister rang for no reason at all.'],
        ['🌊', 'June', 'Cold water, and the sound it makes.']].map((x) =>
        '<div class="glass vpost"><span class="orb sm"><span>' + x[0] + '</span></span><span class="grow"><span class="kicker">' + x[1] + '</span><b>' + x[2] + '</b></span></div>').join('') + '</div>' +
      '<p class="cap">That is the whole of it. A few people, a few lines, and an emoji each one grew.</p>' : '') +
    (vibeState === 'loading' ? '<p class="cap">Opening the room...</p>' : '') +
    (vibeState === 'offline' && !v ? '<p class="cap">No vibe answered on that code. Check it and try again.</p>' : '') +
    (v ? '<div class="glass card vibehead"><span class="v-ico">' + esc(v.emoji) + '</span><div><b>' + esc(v.name) + '</b>' + (v.about ? '<span class="body">' + esc(v.about) + '</span>' : '') +
        '<span class="cap">' + plural(v.count, 'gratitude') + ' · ' + plural(v.voices, 'voice') + ' · code <b class="mono">' + esc(v.code) + '</b></span></div>' +
        '<div class="actions"><button class="btn sm" id="vb-share">Share the code</button><button class="btn sm quiet" id="vb-leave">Leave this room</button></div></div>' +
      '<div class="glass card"><span class="kicker mint">Say one true thing</span>' +
      '<textarea class="field" id="vb-text" rows="2" maxlength="280" placeholder="What are you grateful for, right now..." aria-label="your gratitude"></textarea>' +
      '<div class="pick">' + palette().slice(0, 8).map((e) => '<button class="orb" data-vpick="' + esc(e) + '" aria-label="' + esc(nameOf(e)) + '"><span>' + esc(e) + '</span></button>').join('') + '</div>' +
      '<button class="btn mint wide" id="vb-post">Say it ✦</button>' +
      '<p class="cap">Everyone with the code can read this. Write what you would say out loud in the room.</p></div>' +
      (vibeFresh ? '<p class="vibeline"><i class="vibemark"></i>' + (vibeFresh === 1 ? 'One new word in the room.' : vibeFresh + ' new words in the room.') + '</p>' : '') +
      (v.posts.length ? '<div class="eyebrow"><h2>The room</h2><span class="more">' + v.posts.length + ' shown' + '</span></div><div class="rows">' +
        v.posts.map((p) => '<div class="glass vpost"><span class="orb sm"><span>' + esc(p.emoji) + '</span></span><span class="grow"><span class="kicker">' + esc(p.name) + ' · ' + esc(fmtDay(String(p.at).slice(0, 10))) + '</span><b>' + esc(p.text) + '</b></span></div>').join('') + '</div>'
        : '<p class="cap">Nobody has said anything here yet. Be the first; it makes the room exist.</p>') : '') +
    '<p class="cap">A Vibe holds what people choose to say in it. It is not your journal, and your journal never comes here.</p>' +
    '</div>';
}
function makeVibeSheet() {
  const sh = sheet('<div class="hero-sm"><span class="orb lg lit"><span>✦</span></span><h2>Start a Vibe</h2><span class="kicker mint">A small room with a name</span></div>' +
    '<input class="field" id="mv-name" maxlength="40" placeholder="name it: Sunday People, The Studio, Mum and me" aria-label="the name">' +
    '<input class="field" id="mv-about" maxlength="200" placeholder="what it is for, in a line" aria-label="what it is for">' +
    '<span class="kicker mint">A mark for the room</span>' +
    '<div class="pick">' + palette().slice(0, 10).map((e) => '<button class="orb" data-mvpick="' + esc(e) + '"><span>' + esc(e) + '</span></button>').join('') + '</div>' +
    '<button class="btn mint wide" id="mv-go">Open the room</button>' +
    '<p class="cap">You get a code. Anyone you give it to can come in and read what is said there, so share it with the people you mean.</p>', { autofocus: true });
  let emoji = '✦';
  $$('[data-mvpick]', sh.el).forEach((b) => b.addEventListener('click', () => { emoji = b.dataset.mvpick; $$('[data-mvpick]', sh.el).forEach((x) => x.classList.toggle('on', x === b)); }));
  $('#mv-go', sh.el).addEventListener('click', async () => {
    const name = $('#mv-name', sh.el).value.trim(); if (!name) { toast('A name for the room.'); return; }
    const b = $('#mv-go', sh.el); b.disabled = true; b.textContent = 'Opening...';
    try {
      const r = await fetch('/api/vibes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ act: 'make', name, about: $('#mv-about', sh.el).value.trim(), emoji }) });
      const d = await r.json().catch(() => ({})); if (!r.ok || !d.vibe) throw new Error(d.error || 'refused');
      S.vibes.push({ code: d.vibe.code, name: d.vibe.name, emoji: d.vibe.emoji, keeper: d.keeper || null }); save();
      vibeNow = d.vibe; vibeState = 'live'; sh.close(); render();
      sheet('<div class="hero-sm"><span class="orb xl lit"><span>' + esc(emoji) + '</span></span><h2>' + esc(name) + '</h2><span class="kicker mint">The room is open</span></div>' +
        '<p class="body">This is the code. Anyone who has it can come in.</p><p class="lead mono" style="font-size:34px;letter-spacing:.14em;text-align:center;background:rgba(5,9,18,.6);padding:16px;border-radius:16px">' + esc(d.vibe.code) + '</p>' +
        '<button class="btn mint wide" id="mv-share">Share the code</button>');
      const s2 = $('#mv-share'); if (s2) s2.addEventListener('click', () => shareOrCopy('Come into ' + name, 'A Gratus Vibe. The code is ' + d.vibe.code, location.origin + '/app/vibes?code=' + d.vibe.code).then((ok) => toast(ok === 'shared' ? 'Shared' : 'Link copied')));
    } catch (e) { b.disabled = false; b.textContent = 'Open the room'; toast(String(e.message || e)); }
  });
}
// ══ THE PASSAGE · what a garden looks like from outside. Never a word of the journal. ══════════
function passageOf() {
  const plants = S.plants.filter((p) => !p.private).slice().sort((a, b) => daysOf(b) - daysOf(a)).slice(0, 40);
  return {
    v: 1, n: (S.name || '').slice(0, 40), at: today(),
    p: plants.map((p) => [face(p), daysOf(p), p.forProject ? p.forProject.title.slice(0, 40) : 0]),
    b: S.seeds.filter((s) => s.status === 'bloomed').slice(-12).map((s) => [s.bloom, s.title.slice(0, 40)]),
    m: MILESTONES.filter(([id]) => S.milestones[id]).map(([, name, ico]) => [ico, name]),
    a: (C.alchemy ? C.alchemy.models : []).filter((x) => S.alch[x.id]).map((x) => [x.result, x.name]),
    c: [new Set(S.entries.map((e) => e.day)).size, S.plants.length, S.gifts.given.length, S.seeds.length],
  };
}
function passageLink() { return location.origin + '/passage#' + encodeGift(passageOf()); }
function passageSheet() {
  const link = passageLink();
  const sh = sheet('<div class="hero-sm"><img src="' + LOGO + '" alt="" style="width:78px;height:78px;filter:drop-shadow(0 0 16px rgba(180,255,120,.5))"><h2>Your Passage</h2><span class="kicker mint">A garden, seen from outside</span></div>' +
    '<p class="body">This link shows what grew: your emojis and their days, the seeds that bloomed, and the marks you have earned. It carries <b>not one word</b> of your journal, and nothing you have not already given away.</p>' +
    '<div class="actions"><button class="btn mint" id="pa-share">Share my Passage</button><button class="btn" id="pa-see">See it first</button></div>' +
    '<p class="cap">The whole page rides inside the link, like a Gratus Gift. Nothing is uploaded, and there is nothing to delete later; the link simply stops being shared.</p>');
  $('#pa-share', sh.el).addEventListener('click', () => shareOrCopy('My Gratus Passage', 'What grew in my garden.', link).then((ok) => toast(ok === 'shared' ? 'Shared' : 'Link copied')));
  $('#pa-see', sh.el).addEventListener('click', () => { sh.close(); openPassage(passageOf(), true); });
}
function openPassage(g, mine) {
  const root = $('#room'); if (!root) return;
  const phase = (d) => phaseOf(d).name;
  root.innerHTML = '<div class="room-page passage">' + art(scene('journey', 3)) +
    '<div class="rhead"><span class="brand"><img src="' + LOGO + '" alt="">Gratus.CC</span><button id="pa-x" aria-label="close">✕</button></div>' +
    '<div class="rbody">' +
    '<span class="kicker mint">A Gratus Passage</span>' +
    '<h1>' + esc(g.n ? g.n + '\u2019s garden' : 'A garden') + '</h1>' +
    '<div class="glass stats"><div><b>' + (g.c[0] || 0) + '</b><span>days written</span></div><div><b>' + (g.c[1] || 0) + '</b><span>plants</span></div><div><b>' + ((g.c[2] || 0) + (g.c[3] || 0)) + '</b><span>given</span></div></div>' +
    (g.p && g.p.length ? '<span class="kicker mint">What grew</span><div class="pgrid">' + g.p.map(([e, d, forp]) => '<div class="pcell"><span class="orb' + (d >= 9 ? ' lit' : '') + '"><span>' + esc(e) + '</span></span><b>' + plural(d, 'day') + '</b><span>' + esc(phase(d)) + (forp ? ' · for ' + esc(String(forp)) : '') + '</span></div>').join('') + '</div>' : '') +
    (g.b && g.b.length ? '<span class="kicker gold">Seeds that bloomed</span><div class="chips">' + g.b.map(([e, t]) => '<span class="chip">' + esc(e) + ' ' + esc(t) + '</span>').join('') + '</div>' : '') +
    (g.a && g.a.length ? '<span class="kicker mint">Marks</span><div class="chips">' + g.a.map(([e, n]) => '<span class="chip">' + esc(e) + ' ' + esc(n) + '</span>').join('') + '</div>' : '') +
    (g.m && g.m.length ? '<div class="chips">' + g.m.map(([e, n]) => '<span class="chip">' + esc(e) + ' ' + esc(n) + '</span>').join('') + '</div>' : '') +
    '<p class="cap">Not one word of a journal is in this page. Only what grew, and what was given.</p>' +
    (mine ? '<button class="btn mint wide" id="pa-share2">Share my Passage</button>' : '<a class="btn mint wide" href="/app">Grow your own Gratus 🌱</a>') +
    '<p class="statement quiet" style="text-align:center">\u201cGratitude Moves Worlds.\u201d</p>' +
    '</div></div>';
  root.hidden = false; document.body.classList.add('room');
  const close = () => { root.hidden = true; root.innerHTML = ''; document.body.classList.remove('room'); if (location.pathname === '/passage') history.replaceState(null, '', '/app'); };
  $('#pa-x', root).addEventListener('click', close);
  const s2 = $('#pa-share2', root); if (s2) s2.addEventListener('click', () => shareOrCopy('My Gratus Passage', 'What grew in my garden.', passageLink()).then((ok) => toast(ok === 'shared' ? 'Shared' : 'Link copied')));
}
// ══ A PROJECT'S OWN PAGE · what a steward can post ══════════════════════════════════════════
async function openProjectPage(slug) {
  const root = $('#room'); if (!root) return;
  root.innerHTML = '<div class="room-page"><div class="rbody"><span class="kicker mint">Reading the trace</span><h1>' + esc(slug) + '</h1></div></div>';
  root.hidden = false; document.body.classList.add('room');
  let p = null, t = null;
  try { const r = await fetch('/api/giveth?q=project&slug=' + encodeURIComponent(slug), { cache: 'no-store' }); const d = await r.json().catch(() => ({})); if (r.ok) p = d.project; } catch (e) {}
  try { const r = await fetch('/api/trace?project=' + encodeURIComponent(slug), { cache: 'no-store' }); t = await r.json().catch(() => null); } catch (e) {}
  const g = t && t.signal;
  root.innerHTML = '<div class="room-page passage">' + art(scene('console')) +
    '<div class="rhead"><span class="brand"><img src="' + LOGO + '" alt="">Gratus.CC</span><button id="pp-x" aria-label="close">✕</button></div>' +
    '<div class="rbody">' +
    '<span class="kicker mint">A Gratus page</span>' +
    '<h1>' + esc((p && p.title) || slug) + '</h1>' +
    (p ? '<p class="body">' + esc(p.summary) + '</p>' : '') +
    (g ? '<span class="kicker gold">How this project answers</span><div class="gv-facts"><div class="gv-fact"><b>' + g.seeds + '</b><span>' + (g.seeds === 1 ? 'seed' : 'seeds') + '</span></div><div class="gv-fact"><b>' + g.share + '%</b><span>watered</span></div><div class="gv-fact"><b>' + (g.medianDays == null ? '—' : g.medianDays) + '</b><span>days to answer</span></div></div>'
      : '<p class="cap">No seeds have been planted for this project yet.</p>') +
    (t && t.seeds && t.seeds.length ? '<span class="kicker mint">What people wrote, and what they were told</span><div class="rows">' + t.seeds.map((s) => '<div class="glass gv-update"><span class="kicker">' + esc(s.name) + ' · ' + esc(fmtDay(String(s.at).slice(0, 10))) + (s.first ? ' · 🫶 the first' : '') + '</span><b>' + esc(s.message) + '</b>' + (s.water ? '<span class="cap">' + esc(s.water.from) + ': ' + esc(s.water.reply) + '</span>' : '<span class="cap">Not watered yet.</span>') + '</div>').join('') + '</div>' : '') +
    (t && t.held ? '<p class="cap">' + plural(t.held, 'other seed') + ' ' + (t.held === 1 ? 'was' : 'were') + ' written to this project and kept between them. Only the person who wrote a seed can publish it.</p>' : '') +
    '<div class="actions">' + (p ? '<a class="btn mint" href="/app/giveth">Give to them with a Gratus Seed</a><a class="btn" href="' + esc(p.url) + '" target="_blank" rel="noopener">The project on Giveth ↗</a>' : '') + '</div>' +
    '<p class="statement quiet" style="text-align:center">\u201cThe capital funds the work. The seed funds the morale.\u201d</p>' +
    '</div></div>';
  $('#pp-x', root).addEventListener('click', () => { root.hidden = true; root.innerHTML = ''; document.body.classList.remove('room'); location.href = '/app/giveth'; });
}
// ══ HARMONIC ALCHEMY · a mark needs both halves: what you gave, and what you tended ══════════
function alchemyState() {
  const days = new Set(S.entries.map((e) => e.day)).size;
  const cats = new Set(); for (const s of S.seeds) for (const c of (s.categories || [])) cats.add(String(c).toLowerCase());
  return {
    entryDays: days,
    gave: S.seeds.length,
    gaveUnseen: S.seeds.filter((s) => s.first).length,
    bloomed: S.seeds.filter((s) => s.status === 'bloomed').length,
    phase: S.plants.reduce((m, p) => Math.max(m, daysOf(p)), 0),
    gifts: S.gifts.given.length,
    goals: S.goals.length,
    folders: S.folders.length,
    voice: S.entries.filter((e) => e.voice).length,
    photo: S.entries.filter((e) => e.photo).length,
    sun: (S.sun && S.sun.sun) || 0,
    cats,
  };
}
function alchemyMet(model, st) {
  for (const [k, want] of Object.entries(model.need || {})) {
    if (k === 'gaveCategory') { if (!st.cats.has(String(want).toLowerCase())) return false; continue; }
    if ((st[k] || 0) < want) return false;
  }
  return true;
}
function alchemyProgress(model, st) {
  const parts = [];
  for (const [k, want] of Object.entries(model.need || {})) {
    if (k === 'gaveCategory') { parts.push((st.cats.has(String(want).toLowerCase()) ? '✓ ' : '') + 'a gift to ' + want); continue; }
    const have = st[k] || 0; const label = { entryDays: 'days written', gave: 'seeds planted', gaveUnseen: 'a first seed', bloomed: 'watered', phase: 'days of care on one plant', gifts: 'Gratus Gifts', goals: 'goals posted', folders: 'folders', voice: 'voice entries', photo: 'photo entries', sun: 'sunlight on Giveth' }[k] || k;
    parts.push((have >= want ? '✓ ' : Math.min(have, want) + ' of ' + want + ' ') + label);
  }
  return parts.join(' · ');
}
function checkAlchemy() {
  if (!C.alchemy || !S) return; const st = alchemyState(); const made = [];
  for (const m of C.alchemy.models) { if (!S.alch[m.id] && alchemyMet(m, st)) { S.alch[m.id] = today(); made.push(m); } }
  if (!made.length) return;
  save();
  playCeremonies(made.map((m) => '<div class="cer"><span class="big">' + esc(m.result) + '</span><h2>' + esc(m.name) + '</h2><p>' + esc(m.line) + '</p><span class="kicker">tap to continue</span></div>'), () => render());
}
function alchemyBlock() {
  if (!C.alchemy) return '';
  const st = alchemyState(); const models = C.alchemy.models;
  const made = models.filter((m) => S.alch[m.id]).length;
  return '<div class="eyebrow"><h2>Harmonic alchemy</h2><span class="more">' + made + ' of ' + models.length + '</span></div>' +
    '<p class="cap">A mark here needs both halves of you: something given, and something tended. Neither one alone will make it.</p>' +
    '<div class="rows">' + models.map((m) => { const on = !!S.alch[m.id];
      return '<div class="glass recipe' + (on ? ' made' : '') + '"><span class="f">' + esc(m.result) + '</span><span class="cat">' + (on ? esc(fmtDay(S.alch[m.id])) : 'not yet') + '</span><span class="name">' + esc(m.name) + '</span><span class="line">' + esc(on ? m.line : alchemyProgress(m, st)) + '</span></div>'; }).join('') + '</div>';
}
// ── sunlight: how much a public Giveth address tends the commons. Read only, never a signature. ──
function sunSheet() {
  const s = S.sun;
  const sh = sheet('<div class="hero-sm"><span class="orb lg lit"><span>🔆</span></span><h2>Sunlight</h2><span class="kicker mint">Your part in the commons</span></div>' +
    '<p class="body">Paste the public address you give with on Giveth. Gratus reads how much you take part there: projects you boost with GIVpower, gifts you have given, projects you have liked. That reading is sunlight, and it feeds the alchemy marks.</p>' +
    '<p class="cap">Read only. Gratus never asks you to connect a wallet, never asks for a key or a seed phrase, and never signs anything. A public address is public.</p>' +
    '<input class="field" id="sun-addr" placeholder="0x..." aria-label="your public address" value="' + esc((s && s.address) || '') + '">' +
    '<button class="btn mint wide" id="sun-go">Read it</button>' +
    (s && s.found ? '<div class="glass stats"><div><b>' + s.boosted + '</b><span>boosted</span></div><div><b>' + s.given + '</b><span>gifts</span></div><div><b>' + s.sun + '</b><span>sunlight</span></div></div>' : ''), { autofocus: true });
  $('#sun-go', sh.el).addEventListener('click', async () => {
    const a = $('#sun-addr', sh.el).value.trim(); if (!/^0x[a-fA-F0-9]{40}$/.test(a)) { toast('A public address, starting 0x.'); return; }
    const b = $('#sun-go', sh.el); b.disabled = true; b.textContent = 'Reading Giveth...';
    try {
      const r = await fetch('/api/giveth?q=sunlight&address=' + encodeURIComponent(a), { cache: 'no-store' });
      const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'no answer');
      if (!d.found) { toast('Giveth has not seen that address yet.'); b.disabled = false; b.textContent = 'Read it'; return; }
      S.sun = Object.assign({ address: a }, d); save(); sh.close();
      toast('Sunlight ' + d.sun + ' of 5 · ' + plural(d.boosted, 'project') + ' boosted');
      checkAlchemy(); render();
    } catch (e) { b.disabled = false; b.textContent = 'Read it'; toast(String(e.message || e)); }
  });
}
// ══ THE EMOTIONAL TRACE · Begin → Become → Bridge → Bloom ══════════════════════
// Giveth's rail moves the capital. This one moves what the capital was for.
let gvLane = 'verified', gvSearch = '', gvList = null, gvState = 'idle', gvTotal = 0, gvCat = '', gvCats = null, gvSkip = 0, gvMore = false;
let conSlug = '', conKey = '', conSeeds = null, conState = 'idle', conSignal = null;
const GVK = 'gratus.giveth.key';

async function loadGiveth(more) {
  if (gvState === 'loading') return; gvState = 'loading'; if (!more) { gvSkip = 0; gvList = null; }
  try {
    const u = '/api/giveth?lane=' + encodeURIComponent(gvLane) + (gvSearch ? '&search=' + encodeURIComponent(gvSearch) : '') +
      (gvCat ? '&cat=' + encodeURIComponent(gvCat) : '') + '&skip=' + gvSkip + '&limit=12';
    const r = await fetch(u, { cache: 'no-store' }); const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.projects) throw new Error(d.error || 'no answer');
    gvList = more && gvList ? gvList.concat(d.projects) : d.projects;
    gvTotal = d.total || gvList.length; gvMore = d.projects.length >= 12 && gvList.length < gvTotal; gvState = 'live';
  } catch (e) { if (!more) gvList = null; gvState = 'offline'; }
  if (sub === 'giveth') render();
  if (!gvCats) loadCats();
}
async function loadCats() {
  try { const r = await fetch('/api/giveth?q=cats', { cache: 'no-store' }); const d = await r.json().catch(() => ({}));
    if (r.ok && d.categories && d.categories.length) { gvCats = d.categories; if (sub === 'giveth') render(); } } catch (e) {}
}
// ── THE FRAME ──
// Sixty real Giveth pictures were measured before this was written: none portrait,
// 10% square logos, 45% between 1.35 and 2.6, a third near 3, a few up to 7:1.
// A fixed band could only ever be wrong for most of them: `cover` cut the subject
// out and `contain` left a black moat. So the BAND TAKES THE PICTURE'S OWN SHAPE,
// clamped to what a card can hold, and then fills it. Between 1.2 and 3.2 that is
// an exact fit: nothing cropped and nothing empty. Outside it, the picture is
// zoomed to the nearest shape the card allows, centred a little above the middle
// because that is where subjects sit.
const AR_MIN = 1.2, AR_MAX = 3.2, AR_DEFAULT = 2.25;
function frameArt(root) {
  $$('.gvp img', root || document).forEach((img) => {
    if (img.dataset.framed) return;
    const set = () => {
      const w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h) return;
      img.dataset.framed = '1';
      const art = img.closest('.gvp-art');
      if (art) art.style.setProperty('--ar', Math.min(AR_MAX, Math.max(AR_MIN, w / h)).toFixed(3));
    };
    if (img.complete) set(); else img.addEventListener('load', set, { once: true });
  });
}

const money = (n) => n >= 1000000 ? '$' + (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? '$' + Math.round(n / 1000) + 'k' : '$' + Math.round(n || 0);
function projectRow(p) {
  return '<button class="glass gvp" data-gv="' + esc(p.slug) + '">' +
    '<span class="gvp-art">' + (p.image ? '<i class="gvp-wash" style="background-image:url(' + JSON.stringify(esc(p.image)) + ')"></i>' : '') +
      '<span class="gvp-none">' + esc(p.bloom) + '</span>' +
      (p.image ? '<img src="' + esc(p.image) + '" alt="" loading="lazy">' : '') + '</span>' +
    '<span class="gvp-words"><b>' + esc(p.title) + '</b>' +
    (p.donors === 0 ? '' : '<span class="gvp-stat"><b>' + money(p.raised) + '</b> raised · <b>' + (Number(p.donors) || 0).toLocaleString() + '</b> ' + (p.donors === 1 ? 'donor' : 'donors') + '</span>') +
    '<span class="gvp-tags">' + (p.givbacks ? '<i class="gvt gold">GIVbacks</i>' : p.verified ? '<i class="gvt">Verified</i>' : '') +
      (p.qf ? '<i class="gvt gold">Matched now</i>' : '') +
      (p.donors === 0 ? '<i class="gvt mint">Nobody yet</i>' : '') +
      (p.categories[0] ? '<i class="gvt">' + esc(p.categories[0]) + '</i>' : '') + '</span>' +
    '<span class="cap">' + esc(p.summary.slice(0, 120)) + '</span></span><span class="arrow">›</span></button>';
}
function viewGiveth() {
  if (gvState === 'idle') loadGiveth();
  const lanes = [['verified', 'GIVbacks'], ['boosted', 'Boosted'], ['unseen', 'Nobody yet'], ['all', 'All']];
  const mine = S.seeds.slice().reverse();
  return hero(scene('giveth'), { cls: 'room-hero', h1: 'Giveth', k1: 'Capital, on chain, zero fees.', k2: 'Gratitude, in your own words.' }) +
    '<div class="page">' +
    '<div class="glass card"><span class="kicker mint">Why the two of us</span>' +
    '<p class="body">Giveth moves the money: every donation goes to the project with no fee taken, on Ethereum, Gnosis, Polygon, Optimism, Base, Celo, Arbitrum, Solana and Stellar. Verified projects are reviewed by their team, and people who give to them earn GIVbacks.</p>' +
    '<p class="body">What the rail cannot carry is why you gave. That is what Gratus adds: a Gratus Seed, in your words, planted with the gift, answered by the people you gave to, and kept growing in your garden.</p>' +
    '<div class="trace3"><span><b>Begin</b>You give, and plant a seed.</span><span><b>Become</b>They read it beside the capital.</span><span><b>Bridge</b>They water it. It blooms here.</span></div>' +
    '<div class="links"><a href="https://giveth.io" target="_blank" rel="noopener">giveth.io</a><a href="https://github.com/Giveth" target="_blank" rel="noopener">their code on GitHub</a><a href="https://docs.giveth.io" target="_blank" rel="noopener">their docs</a><button id="gv-learn">What they built</button></div></div>' +
    (mine.length ? '<div class="eyebrow"><h2>Your seeds</h2><span class="more">' + plural(mine.length, 'seed') + '</span></div><div class="rows">' + mine.slice(0, 4).map(seedRow).join('') + '</div>' : '') +
    '<div class="eyebrow"><h2>Projects</h2>' + (gvState === 'live' ? '<span class="more">' + gvTotal.toLocaleString() + ' on Giveth</span>' : '') + '</div>' +
    '<input class="field" id="gv-search" placeholder="Search Giveth projects..." aria-label="search Giveth projects" value="' + esc(gvSearch) + '">' +
    '<div class="chips row">' + lanes.map(([k, n]) => '<button class="chip' + (gvLane === k ? ' on' : '') + '" data-gvlane="' + k + '">' + n + '</button>').join('') + '</div>' +
    (gvCats ? '<div class="chips row"><button class="chip' + (gvCat ? '' : ' on') + '" data-gvcat="">Everything</button>' + gvCats.map((c) => '<button class="chip' + (gvCat === c.slug ? ' on' : '') + '" data-gvcat="' + esc(c.slug) + '">' + esc(c.title) + '</button>').join('') + '</div>' : '') +
    (gvState === 'loading' ? '<p class="cap">Asking Giveth...</p>' : '') +
    (gvState === 'offline' ? '<p class="cap">Giveth is not answering right now. The projects live on their side; try again in a moment, or open <a href="https://giveth.io/projects" target="_blank" rel="noopener">giveth.io/projects</a>.</p>' : '') +
    (gvList && gvList.length ? '<div class="rows">' + gvList.map(projectRow).join('') + '</div>' : gvState === 'live' ? '<p class="cap">Nothing with those words. Try another lane, or another category.</p>' : '') +
    (gvMore ? '<button class="btn wide" id="gv-more">Show more of the ' + gvTotal.toLocaleString() + '</button>' : '') +
    '<button class="glass opt" id="gv-console"><span class="ico">' + I.people + '</span><span class="grow"><b>I run a project</b><span>Read the seeds people planted with their gifts, and water them.</span></span><span class="arrow">›</span></button>' +
    '<p class="cap">Gratus is not Giveth and holds no money. Giving happens on giveth.io, in your own wallet. A seed is a note, not a payment.</p>' +
    '</div>';
}
function seedRow(s) {
  const b = s.status === 'bloomed';
  return '<button class="glass opt seedrow' + (b ? ' bloomed' : '') + '" data-seed="' + esc(s.id) + '"><span class="ico' + (b ? ' gold' : '') + '">' + esc(b ? s.bloom : '🌱') + '</span><span class="grow"><b>' + esc(s.title) + '</b><span>' + esc(b ? 'Watered · ' + (s.water && s.water.reply ? s.water.reply.slice(0, 60) : 'they wrote back') : 'Planted ' + fmtDay(s.at.slice(0, 10)) + ' · waiting to be watered') + '</span></span><span class="arrow">›</span></button>';
}
function givethLearnSheet() {
  sheet('<h2>What Giveth built</h2>' +
    '<p class="body">Giveth is a community building the future of giving with blockchain. Their code is open on GitHub and most of it is MIT licensed, like this app.</p>' +
    '<div class="rows">' +
    '<div class="glass opt"><span class="ico">💸</span><span class="grow"><b>Zero-fee donations</b><span>100% of a donation reaches the project. Giveth takes nothing.</span></span></div>' +
    '<div class="glass opt"><span class="ico">✅</span><span class="grow"><b>Verified &amp; GIVbacks Eligible</b><span>A project shows action and impact, reputation, and that it is a public good. Reviewed by their team, and the badge lapses after three months of silence.</span></span></div>' +
    '<div class="glass opt"><span class="ico">🎁</span><span class="grow"><b>GIVbacks</b><span>Give to a GIVbacks-eligible project and a share of GIV comes back to you.</span></span></div>' +
    '<div class="glass opt"><span class="ico">⚡</span><span class="grow"><b>GIVpower</b><span>Stake GIV to boost a project: it rises in the ranking and its donors earn more GIVbacks.</span></span></div>' +
    '<div class="glass opt"><span class="ico">🏛️</span><span class="grow"><b>GIVgarden &amp; GIVstream</b><span>Where GIV holders steer the commons, and how GIV keeps flowing to the people who take part.</span></span></div>' +
    '<div class="glass opt"><span class="ico">🧮</span><span class="grow"><b>Quadratic funding rounds</b><span>Many small gifts pull more matching than a few large ones. Their qf-calculator and qf-dashboard are open too.</span></span></div>' +
    '<div class="glass opt"><span class="ico">🕸️</span><span class="grow"><b>impact-graph</b><span>The GraphQL API behind every project page. Gratus reads it live, right here in this room.</span></span></div>' +
    '<div class="glass opt"><span class="ico">🤝</span><span class="grow"><b>DeVouch</b><span>Vouching for projects through on-chain attestations, so verification does not rest on one team.</span></span></div>' +
    '</div>' +
    '<div class="links"><a href="https://github.com/Giveth/impact-graph" target="_blank" rel="noopener">impact-graph</a><a href="https://github.com/Giveth/giveth-dapps-v2" target="_blank" rel="noopener">giveth-dapps-v2</a><a href="https://github.com/Giveth" target="_blank" rel="noopener">all of it</a></div>');
}
async function projectSheet(slug) {
  const sh = sheet('<div class="hero-sm"><span class="orb lg lit"><span>◌</span></span><h2>Opening the project</h2><span class="kicker mint">Reading Giveth</span></div>');
  let p = (gvList || []).find((x) => x.slug === slug) || null;
  try { const r = await fetch('/api/giveth?q=project&slug=' + encodeURIComponent(slug), { cache: 'no-store' }); const d = await r.json().catch(() => ({})); if (r.ok && d.project) p = d.project; } catch (e) {}
  if (!p) { sh.close(); toast('Giveth is not answering right now.'); return; }
  const LINK = { website: '🔗', x: '𝕏', twitter: '𝕏', discord: '💬', telegram: '✈️', instagram: '◎', youtube: '▶', linkedin: 'in', farcaster: '⌘', facebook: 'f', github: '⌥', reddit: '◉' };
  const grown = S.plants.filter((x) => x.forProject && x.forProject.slug === p.slug);
  sh.el.innerHTML = '<div class="grabber" aria-hidden="true"></div>' +
    (p.image ? '<div class="gv-hero"><img src="' + esc(p.image) + '" alt=""></div>' : '') +
    '<h2>' + esc(p.title) + '</h2>' +
    '<div class="gvp-tags">' + (p.givbacks ? '<i class="gvt gold">GIVbacks eligible</i>' : p.verified ? '<i class="gvt">Verified</i>' : '<i class="gvt">Not yet verified</i>') +
      (p.qf ? '<i class="gvt gold">Matched right now</i>' : '') + (p.where ? '<i class="gvt">' + esc(p.where) + '</i>' : '') +
      (p.org ? '<i class="gvt">' + esc(p.org) + '</i>' : '') + '</div>' +
    '<div class="gv-facts"><div class="gv-fact"><b>' + (p.raised ? money(p.raised) : '—') + '</b><span>raised</span></div>' +
      '<div class="gv-fact"><b>' + (p.donors || 0).toLocaleString() + '</b><span>' + (p.donors === 1 ? 'donor' : 'donors') + '</span></div>' +
      '<div class="gv-fact"><b>' + (p.updates || 0) + '</b><span>' + (p.updates === 1 ? 'update' : 'updates') + '</span></div></div>' +
    '<p class="body">' + esc(p.summary) + '</p>' +
    (p.chains && p.chains.length ? '<p class="cap">Accepts gifts on ' + esc(p.chains.join(', ')) + '.</p>' : '') +
    (p.links && p.links.length ? '<span class="kicker mint">Find them</span><div class="gv-links">' + p.links.map((l) => '<a href="' + esc(l.link) + '" target="_blank" rel="noopener">' + (LINK[l.type] || '🔗') + ' ' + esc(l.type === 'x' ? 'X' : l.type.charAt(0).toUpperCase() + l.type.slice(1)) + '</a>').join('') + '</div>' : '') +
    '<div id="gv-signal"></div>' +
    '<div class="actions"><button class="btn mint" id="gv-seed">Plant a Gratus Seed &amp; give ' + esc(p.bloom) + '</button>' +
      '<button class="btn" id="gv-grow">' + (grown.length ? 'Growing ' + plural(grown.length, 'Gratus') + ' for them' : 'Grow a Gratus Gift for them 🌱') + '</button>' +
      '<a class="btn" href="' + esc(p.url) + '" target="_blank" rel="noopener">Read it on Giveth ↗</a></div>' +
    '<p class="cap">Giving happens on giveth.io in your own wallet. Gratus never touches the money.</p>' +
    '<div id="gv-updates"></div><div id="gv-donors"></div>' +
    '<button class="btn" data-similar="' + esc(p.slug) + '">Others like this one</button>';
  $('#gv-seed', sh.el).addEventListener('click', () => { sh.close(); seedSheet(p); });
  $('#gv-grow', sh.el).addEventListener('click', () => { sh.close(); growForSheet(p); });
  $$('[data-similar]', sh.el).forEach((b) => b.addEventListener('click', () => { sh.close(); similarSheet(b.dataset.similar); }));
  // how faithfully this project answers the people who give to it. A reading, never a comparison.
  fetch('/api/trace?project=' + encodeURIComponent(p.slug), { cache: 'no-store' }).then((r) => r.json()).then((d) => {
    const el = $('#gv-signal', sh.el); if (!el || !d || !d.signal) return; const g = d.signal;
    el.innerHTML = '<span class="kicker mint">How this project answers</span><div class="gv-facts"><div class="gv-fact"><b>' + g.seeds + '</b><span>' + (g.seeds === 1 ? 'seed' : 'seeds') + '</span></div><div class="gv-fact"><b>' + g.share + '%</b><span>watered</span></div><div class="gv-fact"><b>' + (g.medianDays == null ? '—' : g.medianDays) + '</b><span>days to answer</span></div></div>';
  }).catch(() => null);
  // what they have told the world
  fetch('/api/giveth?q=updates&slug=' + encodeURIComponent(p.slug), { cache: 'no-store' }).then((r) => r.json()).then((d) => {
    const el = $('#gv-updates', sh.el); if (!el || !d || !d.updates || !d.updates.length) return;
    el.innerHTML = '<div class="eyebrow"><h2>Their updates</h2><span class="more">' + plural(d.updates.length, 'shown') + '</span></div><div class="rows">' +
      d.updates.slice(0, 4).map((u) => '<div class="glass gv-update"><span class="kicker">' + esc(fmtDay(String(u.at).slice(0, 10))) + (u.reactions ? ' · ' + plural(u.reactions, 'like') : '') + '</span><b>' + esc(u.title) + '</b>' + (u.summary ? '<span class="cap">' + esc(u.summary) + '</span>' : '') + '</div>').join('') + '</div>';
  }).catch(() => null);
  // the gifts that arrived
  fetch('/api/giveth?q=donors&slug=' + encodeURIComponent(p.slug), { cache: 'no-store' }).then((r) => r.json()).then((d) => {
    const el = $('#gv-donors', sh.el); if (!el || !d || !d.gifts || !d.gifts.length) return;
    el.innerHTML = '<div class="eyebrow"><h2>Gifts that arrived</h2><span class="more">' + (d.total || 0).toLocaleString() + ' in all</span></div><div class="rows">' +
      d.gifts.slice(0, 6).map((x) => '<div class="glass gv-gift"><span class="orb sm"><span>🎁</span></span><b>' + esc(x.name || 'someone') + '</b><span class="amt">' + (x.usd ? '$' + x.usd.toLocaleString() : esc(x.currency || '')) + '</span></div>').join('') +
      '</div><p class="cap">Read live from Giveth. Names are the ones people chose to show.</p>';
  }).catch(() => null);
}
// ── grow a Gratus Gift for a Giveth project: days of care, then given ──
function growForSheet(p) {
  const ready = S.plants.filter((x) => daysOf(x) >= (C.book.phases[C.book.phases.length - 1] || {}).day);
  const mine = S.plants.filter((x) => x.forProject && x.forProject.slug === p.slug);
  const pal = palette().slice(0, 12);
  const sh = sheet('<div class="hero-sm"><span class="orb lg lit"><span>' + esc(p.bloom) + '</span></span><h2>Grow a Gratus Gift</h2><span class="kicker mint">for ' + esc(p.title) + '</span></div>' +
    '<p class="body">Choose an emoji and dedicate it to this project. Every day you write about it, it grows. At Ready to Give it can be given to them, carrying every day you held it.</p>' +
    (mine.length ? '<span class="kicker gold">Already growing for them</span><div class="rows">' + mine.map((x) => { const d = daysOf(x); const ph = phaseOf(d); return '<div class="glass opt"><span class="ico">' + esc(face(x)) + '</span><span class="grow"><b>' + esc(nameOf(face(x))) + '</b><span>' + esc(ph.name) + ' · ' + plural(d, 'day') + '</span></span></div>'; }).join('') + '</div>' : '') +
    '<span class="kicker mint">Dedicate an emoji</span><div class="pick" id="gf-pick">' + pal.map((e) => '<button class="orb" data-gfpick="' + esc(e) + '" aria-label="' + esc(nameOf(e)) + '"><span>' + esc(e) + '</span></button>').join('') + '</div>' +
    (ready.length ? '<span class="kicker gold">Ready to give now</span><div class="rows">' + ready.map((x) => '<button class="glass opt" data-gfnow="' + esc(x.id) + '"><span class="ico gold">' + esc(face(x)) + '</span><span class="grow"><b>' + esc(nameOf(face(x))) + '</b><span>' + plural(daysOf(x), 'day') + ' · give it to ' + esc(p.title) + '</span></span><span class="arrow">›</span></button>').join('') + '</div>' : '') +
    '<p class="cap">A dedicated plant still lives in your garden. Dedicating one changes nothing about how it grows; it only remembers who it is for.</p>');
  $$('[data-gfpick]', sh.el).forEach((b) => b.addEventListener('click', () => {
    const e = b.dataset.gfpick; let pl = plantFor(e);
    if (!pl) { pl = { id: newId('p'), emoji: e, planted: today(), kept: [], carried: 0, origin: 'planted', from: null }; S.plants.push(pl); }
    pl.forProject = { slug: p.slug, title: p.title, bloom: p.bloom };
    save(); sh.close(); toast(nameOf(e) + ' is growing for ' + p.title);
    draft.emoji = e; go('grow'); setTimeout(() => { const w = $('#write'); if (w) { w.focus(); w.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }, 120);
  }));
  $$('[data-gfnow]', sh.el).forEach((b) => b.addEventListener('click', () => { sh.close(); const pl = S.plants.find((x) => x.id === b.dataset.gfnow); if (pl) giveToProject(pl, p); }));
}
function giveToProject(pl, p) {
  const d = daysOf(pl);
  const sh = sheet('<div class="hero-sm"><span class="orb xl lit"><span>' + esc(face(pl)) + '</span></span><h2>Give it to ' + esc(p.title) + '</h2><span class="kicker mint">' + plural(d, 'day') + ' of care</span></div>' +
    '<p class="body">This Gratus carries ' + plural(d, 'day') + '. Give on Giveth in your own wallet, then plant it here as a seed: your words and the days it took, together.</p>' +
    '<textarea class="field" id="gt-msg" rows="3" maxlength="280" placeholder="What these days were about..." aria-label="your words">' + esc('I grew this for ' + plural(d, 'day') + ' before I gave it.') + '</textarea>' +
    '<div class="actions"><a class="btn mint" href="' + esc(p.donateUrl) + '" target="_blank" rel="noopener">Give on Giveth ↗</a>' +
    '<button class="btn" id="gt-plant">Capital sent · plant this Gratus</button></div>');
  $('#gt-plant', sh.el).addEventListener('click', async () => {
    const message = $('#gt-msg', sh.el).value.trim(); if (!message) { toast('A few words.'); return; }
    const b = $('#gt-plant', sh.el); b.disabled = true; b.textContent = 'Planting...';
    try {
      const r = await fetch('/api/trace', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ act: 'plant', project: p.slug, title: p.title, message, name: S.name || '', emoji: face(pl), bloom: p.bloom }) });
      const dd = await r.json().catch(() => ({})); if (!r.ok || !dd.seed) throw new Error(dd.error || 'the trace refused');
      S.seeds.push(Object.assign({}, dd.seed, { slug: p.slug, image: p.image || null, categories: p.categories || [], days: d, mine: dd.mine || null }));
      pl.given = { to: p.title, slug: p.slug, at: today(), days: d }; save(); sh.close();
      playCeremonies(['<div class="cer"><span class="big">' + esc(p.bloom) + '</span><h2>Given.</h2><p>' + esc(plural(d, 'day')) + ' of care, and your words, are with ' + esc(p.title) + '.</p><span class="kicker">tap to continue</span></div>'], () => { checkMilestones(); checkAlchemy(); render(); });
    } catch (e) { b.disabled = false; b.textContent = 'Capital sent · plant this Gratus'; toast(String(e.message || e)); }
  });
}
// ── Begin: the seed goes in with the gift ──
function seedSheet(p) {
  const sh = sheet('<div class="hero-sm"><span class="orb lg lit"><span>🌱</span></span><h2>Plant a Gratus Seed</h2><span class="kicker mint">' + esc(p.title) + '</span></div>' +
    '<p class="body">Write why you are giving. The people who run this project read it beside the capital, and can write back. When they do, this seed blooms in your garden.</p>' +
    '<textarea class="field" id="sd-msg" rows="3" maxlength="280" placeholder="Why this project, today..." aria-label="your Gratus Seed"></textarea>' +
    '<input class="field" id="sd-name" maxlength="40" placeholder="your name, or leave it empty" aria-label="your name" value="' + esc(S.name || '') + '">' +
    '<div class="actions"><a class="btn mint" id="sd-give" href="' + esc(p.donateUrl) + '" target="_blank" rel="noopener">Give on Giveth ↗</a>' +
    '<button class="btn" id="sd-plant">Capital sent · plant the seed</button></div>' +
    '<input class="field" id="sd-tx" maxlength="80" placeholder="transaction hash (optional)" aria-label="transaction hash">' +
    '<p class="cap">A seed is public to that project. Write what you would say to their face. Your journal stays on this device; only this note travels.</p>', { autofocus: true });
  $('#sd-give', sh.el).addEventListener('click', () => toast('Give on Giveth. The seed is planted here, whenever you are ready.'));
  $('#sd-plant', sh.el).addEventListener('click', async () => {
    const message = $('#sd-msg', sh.el).value.trim(); if (!message) { toast('A few words. They will read them.'); return; }
    const name = $('#sd-name', sh.el).value.trim(); const tx = $('#sd-tx', sh.el).value.trim();
    if (name && name !== S.name) { S.name = name; }
    const btn = $('#sd-plant', sh.el); btn.disabled = true; btn.textContent = 'Planting...';
    try {
      const r = await fetch('/api/trace', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ act: 'plant', project: p.slug, title: p.title, message, name, tx, bloom: p.bloom }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.seed) throw new Error(d.error || 'the trace refused');
      S.seeds.push(Object.assign({}, d.seed, { slug: p.slug, image: p.image || null, categories: p.categories || [], mine: d.mine || null }));
      if (tx) confirmGift(d.seed.id, p.slug, tx);
      save(); sh.close();
      playCeremonies([d.first
        ? '<div class="cer"><span class="big">🫶</span><h2>I see you.</h2><p>Yours is the first seed ' + esc(p.title) + ' has ever received. This one blooms into a mark nobody else can plant twice.</p><span class="kicker">tap to continue</span></div>'
        : '<div class="cer"><span class="big">🌱</span><h2>Capital sent.<br>Seed planted.</h2><p>Your words are with ' + esc(p.title) + '. When they water it, this seed blooms into ' + esc(p.bloom) + ' in your garden.</p><span class="kicker">tap to continue</span></div>'], () => { checkMilestones(); checkAlchemy(); render(); });
    } catch (e) { btn.disabled = false; btn.textContent = 'Capital sent · plant the seed'; toast(String(e.message || e)); }
  });
}
function mySeedSheet(id) {
  const s = S.seeds.find((x) => x.id === id); if (!s) return;
  const b = s.status === 'bloomed';
  const sh = sheet('<div class="hero-sm"><span class="orb xl' + (b ? ' lit' : '') + '"><span>' + esc(b ? s.bloom : '🌱') + '</span></span><h2>' + esc(s.title) + '</h2><span class="kicker mint">' + esc(b ? 'Bloomed' : 'Planted') + ' · ' + esc(fmtDay(s.at.slice(0, 10))) + '</span></div>' +
    '<span class="kicker mint">What you wrote</span><p class="lead" style="white-space:pre-wrap">' + esc(s.message) + '</p>' +
    (b && s.water ? '<span class="kicker gold">What they wrote back</span><p class="lead" style="white-space:pre-wrap">' + esc(s.water.reply) + '</p><span class="cap">' + esc(s.water.from) + ' · ' + esc(fmtDay(s.water.at.slice(0, 10))) + '</span>' : '<p class="cap">Not watered yet. A project answers when it can; some answer in a day, some in a season. The seed keeps either way.</p>') +
    (s.confirmed ? '<span class="kicker mint">Giveth confirms ' + esc(s.confirmed.amount + ' ' + (s.confirmed.currency || '')) + '</span>' : s.tx ? '<span class="cap">tx ' + esc(s.tx.slice(0, 18)) + '… (unconfirmed)</span>' : '') +
    (s.first ? '<p class="cap">🫶 Yours was the first seed this project ever received.</p>' : '') +
    (b && s.water && s.water.passTo ? '<div class="glass card"><span class="kicker gold">They passed it on</span><p class="body">' + esc(s.water.from) + ' is grateful for <b>' + esc(s.water.passTo) + '</b>' + (s.water.passWhy ? ': ' + esc(s.water.passWhy) : '') + '</p><button class="btn mint" data-flow="' + esc(s.water.passTo) + '">Continue the flow ' + esc(s.water.passTo) + ' →</button></div>' : '') +
    ((s.thread || []).length ? '<span class="kicker mint">Since then</span><div class="rows">' + s.thread.map((m) => '<div class="glass gv-update"><span class="kicker">' + (m.who === 'donor' ? 'you' : esc((s.water && s.water.from) || s.title)) + ' · ' + esc(fmtDay(String(m.at).slice(0, 10))) + '</span><b>' + esc(m.text) + '</b></div>').join('') + '</div>' : '') +
    (b && s.mine ? '<div class="two"><input class="field" id="sd-say" maxlength="280" placeholder="Say something back..." aria-label="say something back"><button class="btn" id="sd-send">Send</button></div>' : '') +
    (s.mine ? '<button class="btn sm quiet" id="sd-pub">' + (s.public ? '✓ Your words are shown on their Gratus page' : 'Let them show your words publicly') + '</button>' : '') +
    (b ? '<button class="btn" data-similar="' + esc(s.slug || s.project) + '">Others like this one</button>' : '') +
    '<a class="btn quiet" href="/p/' + esc(s.slug || s.project) + '">Their Gratus page →</a>' +
    '<div class="links"><a href="https://giveth.io/project/' + esc(s.slug || s.project) + '" target="_blank" rel="noopener">The project on Giveth</a></div>');
  const say = $('#sd-send', sh.el); if (say) say.addEventListener('click', async () => {
    const t = $('#sd-say', sh.el).value.trim(); if (!t) { toast('A few words.'); return; }
    say.disabled = true; say.textContent = '...';
    try {
      const r = await fetch('/api/trace', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ act: 'say', project: s.slug || s.project, seed: s.id, text: t, key: s.mine }) });
      const d = await r.json().catch(() => ({})); if (!r.ok || !d.seed) throw new Error(d.error || 'refused');
      s.thread = d.seed.thread; save(); sh.close(); toast('Sent'); mySeedSheet(id);
    } catch (e) { say.disabled = false; say.textContent = 'Send'; toast(String(e.message || e)); }
  });
  const pub = $('#sd-pub', sh.el); if (pub) pub.addEventListener('click', async () => {
    const next = !s.public;
    if (next && !confirm('Show your words on this project\u2019s public Gratus page? Anyone with the link can read them.')) return;
    try {
      const r = await fetch('/api/trace', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ act: 'publish', project: s.slug || s.project, seed: s.id, public: next, key: s.mine }) });
      const d = await r.json().catch(() => ({})); if (!r.ok || !d.seed) throw new Error(d.error || 'refused');
      s.public = d.seed.public; save(); sh.close(); toast(s.public ? 'Shown on their page' : 'Kept between you'); mySeedSheet(id);
    } catch (e) { toast(String(e.message || e)); }
  });
}
// ── the seed and the capital, linked: ask Giveth whether that transaction really arrived ──
async function confirmGift(seedId, slug, tx) {
  try {
    const r = await fetch('/api/giveth?q=confirm&slug=' + encodeURIComponent(slug) + '&tx=' + encodeURIComponent(tx), { cache: 'no-store' });
    const d = await r.json().catch(() => ({})); if (!r.ok || !d.confirmed) return;
    const mine = S.seeds.find((x) => x.id === seedId); if (mine) { mine.confirmed = { at: new Date().toISOString(), amount: d.gift.amount, currency: d.gift.currency, usd: d.gift.usd }; save(); }
    fetch('/api/trace', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ act: 'confirm', project: slug, seed: seedId, amount: String(d.gift.amount), currency: d.gift.currency, usd: d.gift.usd }) }).catch(() => null);
    toast('Giveth confirms it: ' + d.gift.amount + ' ' + d.gift.currency);
    render();
  } catch (e) {}
}
// ── Bridge: has anyone watered what I planted ──
async function checkBloom() {
  const dormant = S.seeds.filter((s) => s.status !== 'bloomed'); if (!dormant.length) return;
  const bySlug = {}; for (const s of dormant) (bySlug[s.slug || s.project] = bySlug[s.slug || s.project] || []).push(s.id);
  const bloomed = [];
  for (const slug of Object.keys(bySlug)) {
    try {
      const r = await fetch('/api/trace?project=' + encodeURIComponent(slug) + '&ids=' + bySlug[slug].join(','), { cache: 'no-store' });
      const d = await r.json().catch(() => ({})); if (!r.ok || !d.seeds) continue;
      for (const got of d.seeds) { const mine = S.seeds.find((x) => x.id === got.id); if (mine && got.status === 'bloomed' && mine.status !== 'bloomed') { mine.status = 'bloomed'; mine.water = got.water; bloomed.push(mine); } }
    } catch (e) {}
  }
  if (!bloomed.length) return;
  save();
  soundBloom();
  playCeremonies(bloomed.map((s) => '<div class="cer"><span class="big">' + esc(s.bloom) + '</span><h2>Your seed bloomed.</h2><p>' + esc((s.water && s.water.from) || s.title) + ' wrote back: “' + esc(((s.water && s.water.reply) || '').slice(0, 140)) + '”</p><span class="kicker">tap to continue</span></div>'), () => { checkMilestones(); checkAlchemy(); render(); });
}
// ── Become: the project's own console ──
function viewConsole() {
  const seeds = conSeeds || [];
  return hero(scene('console'), { cls: 'room-hero', h1: 'Project Console', k1: 'The seeds people planted with their gifts.', k2: 'Read them. Water them.' }) +
    '<div class="page">' +
    '<div class="glass card"><span class="kicker mint">Your project</span>' +
    '<input class="field" id="con-slug" placeholder="your project slug" aria-label="project slug" value="' + esc(conSlug) + '">' +
    '<input class="field" id="con-key" placeholder="your project key" aria-label="project key" value="' + esc(conKey) + '">' +
    '<div class="actions"><button class="btn mint" id="con-open">Open the feed</button><button class="btn" id="con-claim">Claim this project</button></div>' +
    '<p class="cap">The key waters seeds for one project. Claiming shows it once, and only a hash of it is kept. This is a light claim, not verification: real verification lives on Giveth.</p></div>' +
    (conSignal ? '<div class="glass card"><span class="kicker mint">How you answer</span><div class="glass stats"><div><b>' + conSignal.seeds + '</b><span>' + (conSignal.seeds === 1 ? 'seed' : 'seeds') + '</span></div><div><b>' + conSignal.share + '%</b><span>watered</span></div><div><b>' + (conSignal.medianDays == null ? '—' : conSignal.medianDays) + '</b><span>days to answer</span></div></div><p class="cap">This is not a comparison with anyone. It is here so you can see what the people who gave to you are waiting for.</p></div>' : '') +
    (conState === 'loading' ? '<p class="cap">Reading the trace...</p>' : '') +
    (conState === 'live' && !seeds.length ? '<p class="cap">No seeds yet for that project. When someone gives with a Gratus Seed, it arrives here.</p>' : '') +
    (seeds.length ? '<div class="eyebrow"><h2>Seeds</h2><span class="more">' + plural(seeds.length, 'seed') + '</span></div><div class="rows">' + seeds.map((s) => '<div class="glass entry conseed"><span class="thumb">' + esc(s.status === 'bloomed' ? s.bloom : '🌱') + '</span><span style="display:grid;gap:6px;min-width:0"><span class="kicker">' + esc(s.name) + ' · ' + esc(fmtDay(s.at.slice(0, 10))) + (s.tx ? ' · on chain' : '') + '</span><span class="text">' + esc(s.message) + '</span>' + (s.water ? '<span class="cap">You watered it: ' + esc(s.water.reply) + '</span>' : '<button class="btn sm mint" data-water="' + esc(s.id) + '">Water this seed</button>') + '</span></div>').join('') + '</div>' : '') +
    '<p class="cap">Every seed here was written by a person who gave to you. Watering one takes twenty seconds and it lands in their garden as a bloom.</p>' +
    (conSlug ? '<a class="btn" href="/p/' + esc(conSlug) + '">Your public Gratus page →</a><p class="cap">Post that link. It shows how you answer, and the words of anyone who chose to publish theirs.</p>' : '') +
    '</div>';
}
async function conLoad() {
  if (!conSlug) { toast('Your project slug, from its Giveth address.'); return; }
  conState = 'loading'; render();
  try {
    const r = await fetch('/api/trace?project=' + encodeURIComponent(conSlug) + (conKey ? '&key=' + encodeURIComponent(conKey) : ''), { cache: 'no-store' });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'no answer');
    conSeeds = d.seeds || []; conSignal = d.signal || null; conState = 'live';
    try { localStorage.setItem(GVK, JSON.stringify({ slug: conSlug, key: conKey })); } catch (e) {}
  } catch (e) { conSeeds = null; conState = 'idle'; toast(String(e.message || e)); }
  render();
}
async function conClaim() {
  if (!conSlug) { toast('Your project slug first.'); return; }
  if (!confirm('Claim "' + conSlug + '"? The key is shown once. Do this only for a project you run.')) return;
  try {
    const r = await fetch('/api/trace', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ act: 'claim', project: conSlug }) });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'claim refused');
    conKey = d.key; try { localStorage.setItem(GVK, JSON.stringify({ slug: conSlug, key: conKey })); } catch (e) {}
    sheet('<h2>Your project key</h2><p class="body">Keep this. It waters seeds for <b>' + esc(conSlug) + '</b>, and it is shown once.</p><p class="lead mono" style="word-break:break-all;background:rgba(5,9,18,.6);padding:14px;border-radius:14px">' + esc(d.key) + '</p><button class="btn mint" id="ck-copy">Copy it</button>');
    const cc = $('#ck-copy'); if (cc) cc.addEventListener('click', () => { navigator.clipboard.writeText(d.key).then(() => toast('Copied'), () => toast('Copy it by hand')); });
    render();
  } catch (e) { toast(String(e.message || e)); }
}
function waterSheet(seedId) {
  const s = (conSeeds || []).find((x) => x.id === seedId); if (!s) return;
  const sh = sheet('<div class="hero-sm"><span class="orb lg lit"><span>💧</span></span><h2>Water this seed</h2><span class="kicker mint">' + esc(s.name) + ' gave, and wrote this</span></div>' +
    '<p class="lead" style="white-space:pre-wrap">' + esc(s.message) + '</p>' +
    '<span class="kicker mint">Write back</span>' +
    '<textarea class="field" id="wt-msg" rows="3" maxlength="280" placeholder="This means the world to us. We just..." aria-label="your reply"></textarea>' +
    '<input class="field" id="wt-from" maxlength="40" placeholder="your name or the project\'s" aria-label="from" value="' + esc(s.title || conSlug) + '">' +
    '<span class="kicker gold">Pass it on, if you like</span>' +
    '<p class="cap">Name a Giveth project you are grateful for. The person who gave to you sees it, and can carry the flow onward.</p>' +
    '<input class="field" id="wt-pass" maxlength="120" placeholder="their Giveth slug, e.g. earth-commons" aria-label="a project you are grateful for">' +
    '<input class="field" id="wt-why" maxlength="140" placeholder="why them, in a line" aria-label="why">' +
    '<button class="btn mint wide" id="wt-send">Send it · their seed blooms</button>', { autofocus: true });
  $('#wt-send', sh.el).addEventListener('click', async () => {
    const reply = $('#wt-msg', sh.el).value.trim(); if (!reply) { toast('A few words back.'); return; }
    const from = $('#wt-from', sh.el).value.trim();
    const b = $('#wt-send', sh.el); b.disabled = true; b.textContent = 'Sending...';
    try {
      const r = await fetch('/api/trace', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ act: 'water', project: conSlug, seed: seedId, reply, from, key: conKey, passTo: ($('#wt-pass', sh.el) || {}).value, passWhy: ($('#wt-why', sh.el) || {}).value }) });
      const d = await r.json().catch(() => ({})); if (!r.ok || !d.seed) throw new Error(d.error || 'the trace refused');
      const i = conSeeds.findIndex((x) => x.id === seedId); if (i >= 0) conSeeds[i] = d.seed;
      sh.close(); toast('Watered. It blooms in their garden.'); render();
    } catch (e) { b.disabled = false; b.textContent = 'Send it · their seed blooms'; toast(String(e.message || e)); }
  });
}
async function similarSheet(slug) {
  const sh = sheet('<div class="hero-sm"><span class="orb lg lit"><span>♾️</span></span><h2>The flow continues</h2><span class="kicker mint">Reading Giveth</span></div>');
  try {
    const r = await fetch('/api/giveth?q=similar&slug=' + encodeURIComponent(slug), { cache: 'no-store' });
    const d = await r.json().catch(() => ({})); const ps = (d.projects || []).filter((p) => p.slug !== slug);
    sh.el.innerHTML = '<div class="grabber" aria-hidden="true"></div><h2>The flow continues</h2><p class="body">Projects like the one you gave to. Gratitude routed along what it is already near, rather than a fresh start each time.</p>' +
      (ps.length ? '<div class="rows">' + ps.map(projectRow).join('') + '</div>' : '<p class="cap">Giveth has nothing similar to hand right now.</p>');
    $$('[data-gv]', sh.el).forEach((b) => b.addEventListener('click', () => { sh.close(); projectSheet(b.dataset.gv); }));
  } catch (e) { sh.close(); toast('Giveth is not answering right now.'); }
}
function traceBlock() {
  if (!S.seeds.length) return '';
  const b = S.seeds.filter((s) => s.status === 'bloomed').length;
  return '<div class="eyebrow"><h2>The Emotional TRACE</h2><span class="more">' + b + ' of ' + S.seeds.length + ' bloomed</span></div>' +
    '<div class="glass garden trace-garden">' + art(scene('trace')) + S.seeds.slice().reverse().slice(0, 18).map((s, i) => {
      const bl = s.status === 'bloomed'; const r = i ? 34 + Math.min(30, 150 / Math.sqrt(Math.max(1, S.seeds.length))) * Math.sqrt(i) : 0; const a = i * Gr.GOLDEN * Math.PI / 180;
      return '<button class="orb ' + (bl ? 'p4 lit' : 'p1') + '" data-seed="' + esc(s.id) + '" style="left:calc(50% + ' + (r * Math.cos(a)).toFixed(1) + 'px);top:calc(50% + ' + (r * Math.sin(a)).toFixed(1) + 'px);--h:' + (bl ? '#F2C97D' : '#6ED9C0') + '" aria-label="' + esc(s.title) + '"><span>' + esc(bl ? s.bloom : '🌱') + '</span></button>';
    }).join('') + '</div>' +
    '<p class="cap">Every seed is a gift you gave with your words. A bloom is the moment someone wrote back.</p>';
}
// ── GRATUS · the home: his new look, text for text ──
function door(art, title, line, id) {
  return '<button class="hcard door" id="' + id + '"><img class="door-art" src="/assets/art/home/' + art + '.jpg" alt=""><span class="door-words"><b>' + title + '</b><span>' + line + '</span></span><span class="door-go">›</span></button>';
}
function viewGratus() {
  setScene(scene('home'));
  return '<section class="home14">' +
    '<header class="hh"><button class="hbtn" id="home-menu" aria-label="menu">' + I.menu + '</button><div class="hbrand"><img class="hlogo" src="' + LOGO + '" alt=""><span class="hname">Gratus<em>.CC</em></span></div><button class="hbtn" id="top-you" aria-label="you">' + I.user + '</button><p class="htag">Gratus Helps You Grow Gratitude Daily<br>And Empowers You To Give Gratus Gifts.</p></header>' +
    '<div class="hcard hero14"><div class="hero14-top"><h2>Today\'s Gratitude</h2><p>What are you grateful for today?</p></div><img class="hero14-art" src="/assets/art/home/hero-band.jpg" alt=""><button class="gpill" id="write-today">' + I.feather + '<span>Write Today</span><span class="arr">→</span></button></div>' +
    door('journal', 'Gratitude Journal', 'Write and journal every day.', 'open-journal') +
    door('sprout', 'Grow Your Gratus Garden!', 'Grow gratitude every day.', 'open-garden') +
    '<div class="hcard door gifts" id="open-gifts"><img class="door-art" src="/assets/art/home/giftbox.jpg" alt=""><span class="door-words"><b>Give Gratus Gifts</b><span>Send meaningful gifts to friends + family.</span><button class="gpill sm" id="send-gift">' + I.giftline + '<span>Send a Gift</span><span class="arr">→</span></button></span><span class="door-go">›</span></div>' +
    '<div class="together"><h2><i>✦</i>Gratus Gives Together<i>✦</i></h2><p>Set Your Gratus Goals</p></div>' +
    goalsBlock() +
    door('journal', 'Gratus Vibes', 'The small rooms. A few people, one feed.', 'open-vibes') +
    door('sprout', 'Gratus Guides', 'Why any of this exists, and how to walk it.', 'open-guides') +
    '</section>';
}
// ── the garden room: a field with a horizon, the plants in it, the seeds above it ──
let gardenFilter = 'all', gardenView = 'field', gardenSort = 'days';
function gardenField() {
  let plants = S.plants.filter((p) => !p.private);
  if (gardenFilter === 'ready') plants = plants.filter((p) => daysOf(p) >= 13);
  else if (gardenFilter === 'growing') plants = plants.filter((p) => daysOf(p) < 13);
  else if (gardenFilter === 'dedicated') plants = plants.filter((p) => p.forProject);
  plants = plants.slice().sort((a, b) => gardenSort === 'recent' ? String(b.planted).localeCompare(String(a.planted)) : gardenSort === 'name' ? nameOf(face(a)).localeCompare(nameOf(face(b))) : daysOf(b) - daysOf(a));
  const n = plants.length;
  if (!n) return '<div class="glass garden field">' + art(scene('garden')) +
    '<div class="empty-note"><span class="orb lg empty"><span>+</span></span><p class="cap">' + (gardenFilter === 'all' ? 'Moments take root. Gratitude grows. A kinder world blooms.' : 'Nothing here with that filter yet.') + '</p>' + (gardenFilter === 'all' ? '<button class="btn mint" id="first-plant">Plant My Gratus 🌱</button>' : '') + '</div></div>';
  const spread = Math.min(30, 140 / Math.sqrt(Math.max(1, n)));
  const orbs = plants.map((p, i) => {
    const r = i ? 30 + spread * Math.sqrt(i) : 0; const a = i * Gr.GOLDEN * Math.PI / 180; const d = daysOf(p);
    const ph = phaseIndex(d); const nx = nextPhase(d); const prev = (C.book.phases[ph] || {}).day || 0;
    const pct = nx ? Math.round(((d - prev) / (nx.day - prev)) * 100) : 100;
    const kept = d && (p.kept || []).includes(today());
    return '<button class="orb p' + ph + (kept ? ' lit' : '') + (p.forProject ? ' pledged' : '') + '" data-p="' + esc(p.id) + '" style="left:calc(50% + ' + (r * Math.cos(a)).toFixed(1) + 'px);top:calc(50% + ' + (r * Math.sin(a)).toFixed(1) + 'px);--h:' + (ph >= 4 ? '#F2C97D' : '#6ED9C0') + ';--pct:' + pct + '" aria-label="' + esc(nameOf(face(p)) + ', ' + plural(d, 'day') + (nx ? ', ' + nx.name + ' in ' + plural(nx.day - d, 'day') : ', ready to give')) + '"><span>' + esc(face(p)) + '</span></button>';
  }).join('');
  if (gardenView === 'list') {
    return '<div class="rows">' + plants.map((p) => { const d = daysOf(p); const ph = phaseOf(d); const nx = nextPhase(d); const kept = d && (p.kept || []).includes(today());
      return '<button class="glass opt" data-p="' + esc(p.id) + '"><span class="ico' + (d >= 13 ? ' gold' : '') + '">' + esc(face(p)) + '</span><span class="grow"><b>' + esc(nameOf(face(p))) + (p.forProject ? ' ◆' : '') + '</b><span>' + esc(ph.name) + ' · ' + plural(d, 'day') + (nx ? ' · ' + esc(nx.name) + ' in ' + plural(nx.day - d, 'day') : ' · ready to give') + (kept ? ' · tended today' : '') + '</span></span><span class="arrow">›</span></button>'; }).join('') + '</div>';
  }
  return '<div class="glass garden field">' + art(scene('garden')) + '<i class="horizon" aria-hidden="true"></i>' + orbs + '</div>';
}
function viewGarden() {
  const n = S.plants.filter((p) => !p.private).length;
  const care = S.plants.reduce((t, p) => t + daysOf(p), 0);
  const ready = S.plants.filter((p) => daysOf(p) >= 13).length;
  const pledged = S.plants.filter((p) => p.forProject).length;
  const tendedToday = S.plants.filter((p) => (p.kept || []).includes(today())).length;
  const entries = S.entries.slice().reverse();
  const lanes = [['all', 'Everything'], ['growing', 'Growing'], ['ready', 'Ready to give'], ['dedicated', 'For a project']];
  const phases = C.book.phases;
  return hero(scene('garden'), { cls: 'room-hero', h1: 'Your Gratus Garden', k1: 'Grow gratitude every day.', k2: plural(n, 'plant') + ' · ' + plural(care, 'day') + ' of care' }) +
    '<div class="page">' +
    '<div class="glass stats in"><div><b>' + n + '</b><span>' + (n === 1 ? 'plant' : 'plants') + '</span></div><div><b>' + care + '</b><span>' + (care === 1 ? 'day of care' : 'days of care') + '</span></div><div><b>' + ready + '</b><span>ready to give</span></div></div>' +
    (n ? '<div class="chips row">' + lanes.map(([k, t]) => '<button class="chip' + (gardenFilter === k ? ' on' : '') + '" data-gfilter="' + k + '">' + t + (k === 'dedicated' && pledged ? ' · ' + pledged : '') + '</button>').join('') + '</div>' : '') +
    (n ? '<div class="chips row end"><button class="chip' + (gardenView === 'field' ? ' on' : '') + '" data-gview="field">✦ Field</button><button class="chip' + (gardenView === 'list' ? ' on' : '') + '" data-gview="list">☰ List</button><button class="chip' + (gardenSort === 'days' ? ' on' : '') + '" data-gsort="days">Most days</button><button class="chip' + (gardenSort === 'recent' ? ' on' : '') + '" data-gsort="recent">Newest</button><button class="chip' + (gardenSort === 'name' ? ' on' : '') + '" data-gsort="name">By name</button></div>' : '') +
    (n ? '<div class="glass card tended"><span class="kicker mint">Today</span><p class="body"><b>' + tendedToday + '</b> of ' + plural(n, 'plant') + ' tended. ' + (tendedToday >= n ? 'The whole garden has had a word today.' : 'Each one grows on the days you write about it.') + '</p>' + (tendedToday < n ? '<button class="btn mint" id="tend-now">Tend one now 🌱</button>' : '') + '</div>' : '') +
    gardenField() +
    (n ? '<div class="phaseline">' + phases.map((p, i) => '<span class="ph' + (S.plants.some((x) => phaseIndex(daysOf(x)) === i) ? ' on' : '') + '"><i>' + p.icon + '</i>' + esc(p.name) + '</span>').join('') + '</div>' +
      '<p class="cap">Every orb is one emoji and the days you kept it. The ring around it fills as it grows toward its next phase. Tap one to open it.</p>' : '') +
    traceBlock() +
    '<button class="glass opt" id="open-book"><span class="ico">📖</span><span class="grow"><b>The Gratus Growth Book</b><span>Your gratitude journal, by day. The phases, the emojis, the recipes.</span></span><span class="arrow">›</span></button>' +
    (S.gifts.received.length ? '<div class="eyebrow"><h2>Gifts received</h2></div><div class="rows">' + S.gifts.received.slice().reverse().slice(0, 3).map((g) => '<div class="glass opt"><span class="ico">' + esc(g.emoji) + '</span><span class="grow"><b>From ' + esc(g.from || 'someone') + '</b><span>' + esc(plural(g.days, 'day')) + ' · ' + esc(fmtDay(g.at)) + '</span></span></div>').join('') + '</div>' : '') +
    (entries.length ? '<div class="eyebrow"><h2>Entries</h2>' + (entries.length > 4 ? '<button class="more" id="all-entries">All ' + entries.length + '</button>' : '') + '</div><div class="rows">' + entries.slice(0, 4).map(entryCard).join('') + '</div>' : '') +
    '<button class="glass opt" id="open-galaxy"><span class="ico"><img src="' + LOGO + '" alt="" style="width:30px;height:30px"></span><span class="grow"><b>The Gratus Galaxy</b><span>People · Projects · A brighter planet.</span></span><span class="arrow">›</span></button>' +
    '</div>';
}

function menuSheet() {
  const sh = sheet('<div class="hero-sm"><img src="' + LOGO + '" alt="" style="width:72px;height:72px;filter:drop-shadow(0 0 18px rgba(180,255,120,.5))"><h2>Gratus.CC</h2><span class="kicker mint">Grow Gratus Give</span></div>' +
    '<div class="actions"><button class="btn" id="m-book">📖 Gratitude Journal</button><button class="btn" id="m-garden">🌱 Your Gratus Garden</button><button class="btn" id="m-give">🎁 Give Gratus Gifts</button><button class="btn" id="m-guides">✧ Gratus Guides</button><button class="btn" id="m-vibes">✦ Gratus Vibes</button><button class="btn" id="m-passage">✦ Share my Passage</button><button class="btn" id="m-giveth">🤝 Give with Giveth</button><button class="btn" id="m-galaxy">✦ The Gratus Galaxy</button><button class="btn" id="m-laws">The twelve laws</button><button class="btn" id="m-sound">' + (S.sound ? 'Mute the song' : 'Play the song') + '</button><button class="btn" id="m-you">You · export · restore</button></div>');
  const on = (id, fn) => { const b = $(id, sh.el); if (b) b.addEventListener('click', () => { sh.close(); fn(); }); };
  on('#m-book', () => go('gratus', 'book')); on('#m-garden', () => go('gratus', 'garden')); on('#m-give', () => go('give')); on('#m-guides', () => go('gratus', 'guides')); on('#m-vibes', () => go('gratus', 'vibes')); on('#m-passage', passageSheet); on('#m-giveth', () => go('give', 'giveth')); on('#m-galaxy', () => go('gratus', 'galaxy')); on('#m-laws', openLaws); on('#m-sound', toggleSound); on('#m-you', youSheet);
}
function entryCard(e) {
  return '<button class="glass entry" data-e="' + esc(e.id) + '"><span class="thumb">' + (e.photo ? '<img src="' + e.photo + '" alt="">' : esc(e.emoji || '✦')) + '</span><span style="display:grid;gap:6px;min-width:0"><span class="kicker">' + (e.star ? '\u2605 ' : '') + esc(e.day === today() ? 'Today · ' : '') + esc(fmtDay(e.day)) + (e.voice ? ' · 🎙 ' + fmtDur(e.voice.dur) : '') + (e.folder && folderOf(e.folder) ? ' · 📁 ' + esc(folderOf(e.folder).name) : '') + '</span><span class="text">' + esc(e.text || '(an emoji, no words)') + '</span>' + (e.tags && e.tags.length ? '<span class="tags">' + e.tags.map((t) => '<span>' + esc(t) + '</span>').join('') + '</span>' : '') + '</span></button>';
}

// ── GROW · plant today ──
let draft = { text: '', emoji: null, tags: [], photo: null, voice: null, voiceDur: 0 };
// ── THE STANDING ──
// A word written today is not an entry, it is a day of care on something that is
// growing. This says which plant is nearest its next crossing and what one word
// would do to it, so the daily act has a stake. It counts care, never absence:
// it says what a word does, never what not writing did.
function standingBlock() {
  if (!S.plants.length) return '';
  const rows = S.plants.map((p) => { const d = daysOf(p); return { p, d, nx: nextPhase(d), ph: phaseOf(d) }; });
  const moving = rows.filter((x) => x.nx).sort((a, b) => (a.nx.day - a.d) - (b.nx.day - b.d));
  const ready = rows.filter((x) => !x.nx);
  const x = moving[0] || ready[0];
  if (!x) return '';
  const tended = (x.p.kept || []).includes(today());
  const away = x.nx ? x.nx.day - x.d : 0;
  const prev = (C.book.phases[phaseIndex(x.d)] || {}).day || 0;
  const pct = x.nx ? Math.max(6, Math.round(((x.d - prev) / (x.nx.day - prev)) * 100)) : 100;
  const line = !x.nx
    ? esc(nameOf(face(x.p))) + ' is ready to give.'
    : away <= 1
      ? (tended ? esc(nameOf(face(x.p))) + ' crosses into ' + esc(x.nx.name) + ' with tomorrow\u2019s word.'
                : 'One word today and ' + esc(nameOf(face(x.p))) + ' crosses into ' + esc(x.nx.name) + '.')
      : esc(nameOf(face(x.p))) + ' is ' + esc(plural(away, 'day')) + ' from ' + esc(x.nx.name) + '.';
  return '<div class="glass card standing">' +
    '<span class="stand-ring" style="--pct:' + pct + '"><span class="stand-face">' + esc(face(x.p)) + '</span></span>' +
    '<span class="stand-words"><span class="kicker gold">' + esc(x.ph.name) + ' \u00b7 ' + esc(plural(x.d, 'day') + ' of care') + '</span>' +
    '<b>' + line + '</b>' +
    '<span class="cap">' + esc(x.ph.meaning) + '</span></span></div>';
}
function viewGrow() {
  const pal = palette();
  return hero(scene('grow'), { h1: 'Grow', k1: 'Plant Today', k2: 'A Brighter Tomorrow', low: '<p class="statement in" style="--i:2">What are you grateful for today?</p>' }) +
    '<div class="page">' +
    standingBlock() +
    '<div class="glass card">' +
    '<textarea class="field" id="write" rows="3" placeholder="Start your gratitude entry..." aria-label="your gratitude entry">' + esc(draft.text) + '</textarea>' +
    '<div class="tools"><span class="chip on">' + I.text + ' Text</span><label class="chip" id="photo-chip">' + I.cam + ' Photo<input type="file" id="photo" accept="image/*" hidden></label>' + (navigator.mediaDevices && window.MediaRecorder ? '<button class="chip" id="voice">' + I.mic + ' Voice</button>' : '') + '</div>' +
    '<div class="photoprev" id="photoprev" hidden></div>' +
    '<div class="glass voiceprev" id="voiceprev"' + (draft.voice ? '' : ' hidden') + '><span class="kicker mint">Your voice · ' + fmtDur(draft.voiceDur) + '</span><audio controls id="voice-audio"></audio><button class="btn sm quiet" id="voice-drop">Remove the recording</button></div>' +
    '<span class="kicker mint">The emoji you are planting</span>' +
    '<div class="pick" id="pick">' + pal.map((e) => '<button class="orb' + (draft.emoji === e ? ' on' : '') + '" data-pick="' + esc(e) + '" aria-label="' + esc(nameOf(e)) + '"><span>' + esc(e) + '</span></button>').join('') + '<button class="orb empty" id="pick-any" aria-label="any emoji"><span>+</span></button></div>' +
    (pal.length > 8 ? '<button class="btn sm quiet pick-more" id="pick-more">Show every emoji</button>' : '') +
    '<span class="kicker mint">Tags</span><div class="chips" id="tags">' + C.book.tags.concat(draft.tags.filter((t) => !C.book.tags.includes(t))).map((t) => '<button class="chip' + (draft.tags.includes(t) ? ' on' : '') + '" data-tag="' + esc(t) + '">' + esc(t) + '</button>').join('') + '<button class="chip" id="tag-any">+ tag</button></div>' +
    '<button class="btn mint wide" id="plant">Plant My Gratus 🌱</button></div>' +
    '<p class="kicker" style="text-align:center">A small moment. A brighter tomorrow.</p>' +
    goalsBlock() +
    (S.entries.length ? '<div class="eyebrow"><h2>Recent</h2></div><div class="rows">' + S.entries.slice().reverse().slice(0, 2).map(entryCard).join('') + '</div>' : '') +
    '</div>';
}
// ── GRATUS GOALS · what you are growing toward, and the stream of everyone's ──
let feed = null, feedState = 'idle';
const SEED_GOALS = [{ id: 'seed1', text: 'Write one line of thanks every morning this month.', name: 'Augie', emoji: '☕', at: '2026-09-17T08:00:00Z' }, { id: 'seed2', text: 'Give my first Gratus Gift to my sister.', name: 'Kris', emoji: '❤️', at: '2026-09-18T12:00:00Z' }, { id: 'seed3', text: 'Plant a tree with the kids and keep it in the garden here.', name: 'Natalie', emoji: '🌳', at: '2026-09-19T09:00:00Z' }];
function goalRow(g, mine) { const d = new Date(g.at); const when = isNaN(d) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); return '<div class="glass goal' + (mine ? ' mine' : '') + '"><span class="orb"><span>' + esc(g.emoji || '🌱') + '</span></span><span class="grow"><b>' + esc(g.text) + '</b><span>' + esc(g.name || 'Someone') + (when ? ' · ' + esc(when) : '') + (mine && !g.synced ? ' · on this device' : '') + '</span></span>' + (mine ? '<button class="x" data-goal-x="' + esc(g.id) + '" aria-label="remove">×</button>' : '') + '</div>'; }
function goalsBlock() {
  const mine = S.goals.slice().reverse(); const others = (feed || (feedState === 'offline' ? SEED_GOALS : [])).filter((g) => !S.goals.some((m) => m.id === g.id || (m.text === g.text && m.name === g.name)));
  return '<div class="glass stream">' + art(scene('goals')) + '<div class="eyebrow" style="padding-top:0"><h2>Gratus Goals</h2><span class="more">' + (feedState === 'live' ? 'the stream' : feedState === 'offline' ? 'as imagined' : '') + '</span></div>' +
    '<p class="cap">What are you growing toward? Post as many as you like. Everyone here can see them.</p>' +
    '<div class="pillform" style="max-width:none"><input id="goal-in" maxlength="160" placeholder="A goal I am growing toward..." aria-label="a Gratus goal" autocomplete="off"><button class="go" id="goal-post" aria-label="post the goal">→</button></div>' +
    (mine.length ? '<div class="rows">' + mine.map((g) => goalRow(g, true)).join('') + '</div>' : '') +
    (others.length ? '<span class="kicker mint" style="padding-top:6px">The stream</span><div class="rows">' + others.slice(0, 12).map((g) => goalRow(g, false)).join('') + '</div>' : (feedState === 'loading' ? '<p class="cap">Listening for the stream…</p>' : '')) + '</div>';
}
async function loadFeed() {
  if (feedState === 'loading') return; feedState = 'loading';
  try { const r = await fetch('/api/goals', { cache: 'no-store' }); const j = await r.json().catch(() => ({})); if (r.ok && j.ok) { feed = j.goals || []; feedState = 'live'; for (const g of S.goals) if (!g.synced) postGoal(g); } else { feedState = 'offline'; } } catch (e) { feedState = 'offline'; }
  if (tab === 'grow' && !sub) render();
}
async function postGoal(g) {
  try { const r = await fetch('/api/goals', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: g.text, name: g.name, emoji: g.emoji }) }); const j = await r.json().catch(() => ({})); if (r.ok && j.ok) { g.synced = true; if (j.goal) g.id = j.goal.id; save(); } } catch (e) {}
}
function addGoal(text) {
  const p = S.plants.slice().sort((a, b) => daysOf(b) - daysOf(a))[0];
  const g = { id: newId('goal'), text: text.slice(0, 160), name: S.name || 'Someone', emoji: p ? face(p) : '🌱', at: new Date().toISOString(), synced: false };
  S.goals.push(g); save(); render(); toast('Posted to the stream.'); if (feedState === 'live') postGoal(g).then(() => { if (feed) feed.unshift(Object.assign({}, g)); });
}
function plantNow() {
  const text = ($('#write') ? $('#write').value : draft.text).trim(); const emoji = draft.emoji;
  if (!text && !emoji) { toast('A word or an emoji. Either grows.'); return; }
  const t = today(); const e = { id: newId('e'), day: t, at: new Date().toISOString(), text, emoji, tags: draft.tags.slice(), photo: draft.photo, voice: draft.voice ? { mime: draft.voice.type || 'audio/webm', dur: draft.voiceDur } : null, folder: null };
  S.entries.push(e); if (draft.voice) keepPut(e.id, draft.voice).catch(() => toast('The recording could not be kept on this device.'));
  let p = emoji ? plantFor(emoji) : null; let isNew = false; const before = p ? face(p) : null;
  // the phase BEFORE today's word, so a crossing can be told from an ordinary day
  const phPre = p ? phaseIndex(daysOf(p)) : -1;
  if (emoji && !p) { p = { id: newId('p'), emoji, planted: t, kept: [], carried: 0, origin: 'planted', from: null }; S.plants.push(p); isNew = true; }
  if (p && !p.kept.includes(t)) p.kept.push(t);
  const made = [];
  for (const r of allRecipes()) { if (S.made[r.id]) continue; const st = recipeState(r); if (st.made) { S.made[r.id] = t; made.push(r); if (!plantFor(r.result)) S.plants.push({ id: newId('p'), emoji: r.result, planted: t, kept: [t], carried: 0, origin: 'recipe', from: r.name }); } }
  save(); draft = { text: '', emoji: null, tags: [], photo: null, voice: null, voiceDur: 0 };
  const after = p ? face(p) : null; const d = p ? daysOf(p) : 0; const ph = p ? phaseOf(d) : null;
  const phNow = p ? phaseIndex(d) : -1;
  const crossed = p && phNow > phPre;
  const seq = [];
  if (crossed) seq.push({
    html: '<div class="cer cross"><span class="big">' + esc(after) + '</span>' +
      '<span class="kicker gold">' + esc(nameOf(after)) + ' has crossed</span>' +
      '<h2>' + esc(ph.name) + '.</h2>' +
      '<p class="lead">' + esc(ph.meaning) + '</p>' +
      '<span class="kicker mint">' + esc(plural(d, 'day') + ' of care \u00b7 ' + TONE_NAMES[Math.min(phNow, TONE_NAMES.length - 1)]) + '</span>' +
      '<span class="kicker">tap to continue</span></div>',
    on: () => soundPhase(phNow),
  });
  if (p && before && after !== before) seq.push('<div class="cer"><span class="big">' + esc(after) + '</span><span class="kicker mint">' + esc(before + ' → ' + after) + '</span><h2>' + esc(nameOf(after)) + '</h2><p class="lead">' + esc((E.stage(p.emoji, d, C.evo) || {}).line || '') + '</p><span class="kicker">tap to continue</span></div>');
  else if (p) seq.push('<div class="cer"><span class="big">' + esc(after) + '</span><h2>' + esc(isNew ? 'Planted.' : ph.name + '.') + '</h2><p class="lead">' + esc(nameOf(after)) + ' · ' + esc(plural(d, 'day')) + '. ' + esc(ph.meaning) + '</p>' + (nextPhase(d) ? '<span class="kicker mint">' + esc(nextPhase(d).name + ' in ' + plural(nextPhase(d).day - d, 'day')) + '</span>' : '<span class="kicker gold">Ready to give</span>') + '<span class="kicker">tap to continue</span></div>');
  else seq.push({ html: '<div class="cer"><span class="big">✦</span><h2>Kept.</h2><p class="lead">A moment of gratitude has a place now.</p><span class="kicker">tap to continue</span></div>', on: soundKept });
  for (const r of made) seq.push('<div class="cer"><span class="big">' + esc(r.result) + '</span><span class="kicker mint">' + esc(r.formula.join(' + ') + ' → ' + r.result) + '</span><h2>' + esc(r.name) + '</h2><p class="lead">' + esc(r.statement) + '</p><span class="kicker">a recipe came together · tap to continue</span></div>');
  playCeremonies(seq, () => { go('gratus'); });
}
function playCeremonies(list, done) {
  const root = $('#ceremony'); let k = 0; let gate = motionOk();
  const next = () => {
    const item = list.shift(); if (!item) { root.hidden = true; root.innerHTML = ''; if (done) done(); return; }
    // a card may carry its own note: a string is a card with nothing to say aloud
    const html = typeof item === 'string' ? item : item.html;
    const on = typeof item === 'string' ? null : item.on;
    root.hidden = false; root.onclick = null;
    const show = () => { root.innerHTML = art(scene('ceremony', k++)) + '<div class="flash on"></div>' + html.replace(/<div class="cer([ "])/, '<div class="cer reveal$1'); if (on) try { on(); } catch (e) {} let t = 0; const close = () => { clearTimeout(t); root.onclick = null; next(); }; root.onclick = close; t = setTimeout(close, 5600); };
    if (gate) {
      gate = false; root.innerHTML = '<video class="explode" muted playsinline preload="auto" poster="' + GFX('explode-poster.jpg') + '"><source src="' + GFX('explode.mp4') + '#t=17" type="video/mp4"></video><span class="kicker" style="position:absolute;left:0;right:0;bottom:calc(40px + var(--sab));text-align:center;z-index:1;text-shadow:0 1px 10px #000">tap to skip</span>';
      const v = root.querySelector('video'); let fired = false; const fire = () => { if (fired) return; fired = true; clearTimeout(tm); show(); };
      const tm = setTimeout(fire, 9000); v.addEventListener('ended', fire); v.addEventListener('timeupdate', () => { if (v.currentTime >= 24.6) fire(); }); v.addEventListener('error', fire); root.onclick = fire;
      v.currentTime = 17; v.play().catch(fire);
    } else show();
  }; next();
}

// ── GIVE · turn gratitude into impact ──
function viewGive() {
  return hero(scene('give'), { h1: 'Give', k1: 'Turn Gratitude', k2: 'Into Impact', low: '<p class="statement in" style="--i:2">Give the Gift That Keeps On Giving.</p>' }) +
    '<div class="page">' +
    '<div class="glass card"><span class="kicker mint">Choose how to give:</span>' +
    '<button class="glass opt" id="give-gift"><span class="ico gold">' + I.gift + '</span><span class="grow"><b>Give a Gratus Gift</b><span>Turn your gratitude into a gift for someone else.</span></span><span class="arrow">›</span></button>' +
    '<button class="glass opt" id="give-giveth"><span class="ico gold">' + I.giveth + '</span><span class="grow"><b>Give with Giveth</b><span>Real projects, zero fees, on chain. Plant a Gratus Seed with your gift.</span></span><span class="arrow">›</span></button>' +
    '<button class="glass opt" id="give-project"><span class="ico">' + I.people + '</span><span class="grow"><b>Support a Project</b><span>Give to people, places or causes that matter.</span></span><span class="arrow">›</span></button>' +
    '<button class="glass opt" id="give-world"><span class="ico">' + I.globe + '</span><span class="grow"><b>Give to the World</b><span>Be part of a kinder, brighter planet.</span></span><span class="arrow">›</span></button>' +
    '<p class="statement quiet" style="text-align:center">“Give what grows.”</p></div>' +
    partnerCard() +
    (S.gifts.given.length ? '<div class="eyebrow"><h2>Gifts you gave</h2></div><div class="rows">' + S.gifts.given.slice().reverse().slice(0, 4).map((g) => '<button class="glass opt" data-given="' + esc(g.id) + '"><span class="ico">' + esc(g.emoji) + '</span><span class="grow"><b>To ' + esc(g.to || 'someone') + '</b><span>' + esc(plural(g.days, 'day')) + ' · ' + esc(fmtDay(g.at)) + '</span></span><span class="arrow">link</span></button>').join('') + '</div>' : '') +
    '<p class="kicker" style="text-align:center">Give today. A brighter tomorrow.</p></div>';
}
function partnerCard() {
  return '<a class="glass partner" href="https://giveth.io" target="_blank" rel="noopener"><span class="logo">G</span><span class="grow"><b>Giveth.io</b><span class="verified">✓ Verified Partner</span><span class="quote">“Giveth is real. Transparent, community driven, and actually moves resources to where they create the most good.”</span><span class="stars-row">★★★★★ 4.8</span></span><span class="arrow" style="color:var(--violet-text)">›</span></a>';
}
const PROJECTS = [
  { name: 'Reforest Together', line: 'Trees for a thriving tomorrow.', tag: 'Climate', n: '1.2K', art: 'g23' },
  { name: 'Clean Oceans Collective', line: 'Healthier oceans. Brighter futures.', tag: 'Oceans', n: '892', art: 'g21' },
  { name: 'Brighter Minds', line: 'Learning for a kinder world.', tag: 'Education', n: '746', art: 'g19' },
  { name: 'Reforest Communities', line: 'Environment', tag: 'Environment', n: '324 donors', art: 'g10' },
  { name: 'Clean Water Access', line: 'Health', tag: 'Health', n: '211 donors', art: 'g16' },
  { name: 'Open Education', line: 'Education', tag: 'Education', n: '189 donors', art: 'g22' },
  { name: 'Local Food Systems', line: 'Community', tag: 'Community', n: '142 donors', art: 'g03' }
];
let projFilter = 'All';
function viewProjects() {
  const cats = ['All', 'Climate', 'People', 'Education', 'Health', 'Communities', 'Arts'];
  const list = PROJECTS.filter((p) => projFilter === 'All' || p.tag === projFilter || (projFilter === 'People' && p.tag === 'Community'));
  return hero(scene('projects'), { cls: 'room-hero', h1: 'All Projects', k1: 'Give to people, places or causes that matter.' }) +
    '<div class="page">' + partnerCard() +
    '<div class="chips row">' + cats.map((c) => '<button class="chip' + (projFilter === c ? ' on' : '') + '" data-cat="' + c + '">' + c + '</button>').join('') + '</div>' +
    '<div class="projects">' + (list.length ? list.map((p) => '<a class="glass project" href="https://giveth.io/projects" target="_blank" rel="noopener"><span class="pic" style="background-image:url(' + GFX(p.art + '.jpg') + ')"></span><span class="grow"><span class="tag">' + esc(p.tag) + '</span><b>' + esc(p.name) + '</b><span class="cap">' + esc(p.line) + '</span><span class="n">' + esc(p.n) + ' ♡</span></span></a>').join('') : '<p class="cap">Nothing under that yet.</p>') + '</div>' +
    '<p class="cap" style="text-align:center">Projects shown as imagined. Live giving connects when the backend arrives.</p></div>';
}
function viewWorld() {
  return hero(scene('world'), { cls: 'room-hero', h1: 'Give to the World', k1: 'People · Places · Planet · Possibilities' }) +
    '<div class="page">' +
    '<button class="doorcard" id="door-earth">' + art('g23') + '<span class="kicker mint">1. Gratus Earth</span><h3>Heal Places</h3><p class="cap">A living map of real-world restoration projects. People fund, volunteer, and track healing across the planet.</p><p class="statement quiet">“Gratitude in action for a healthier Earth.”</p></button>' +
    '<button class="doorcard" id="door-vault">' + art('g17') + '<span class="kicker mint">2. Gratus Vault</span><h3>A Wish For Tomorrow</h3><p class="cap">A time capsule for humanity. Share your hopes, dreams and messages to future generations.</p><p class="statement quiet">“Different times. Same human heart.”</p></button>' +
    '</div>';
}
let wishScope = 'For Earth';
function viewVault() {
  const wishes = S.wishes.slice().reverse();
  return hero(scene('vault'), { cls: 'room-hero', h1: 'A Wish For Tomorrow', k1: 'Capture humanity\'s hopes for the future', low: '<p class="statement in" style="--i:2">What\'s your wish for the world?</p>' }) +
    '<div class="page"><div class="glass card"><textarea class="field" id="wish" rows="3" placeholder="Write your wish..." aria-label="your wish"></textarea>' +
    '<div class="chips">' + ['For Me', 'For Us', 'For Earth', 'For Future Generations'].map((s) => '<button class="chip' + (wishScope === s ? ' on' : '') + '" data-scope="' + s + '">' + s + '</button>').join('') + '</div>' +
    '<button class="btn gold wide" id="wish-send">Send to Tomorrow</button></div>' +
    '<div class="eyebrow"><h2>Today\'s Wishes</h2></div><div class="rows">' + wishes.map((w) => '<div class="glass wish"><p>“' + esc(w.text) + '”</p><span class="cap">— ' + esc(w.scope) + ' · ' + esc(fmtDay(w.at)) + '</span></div>').join('') + '<div class="glass wish"><p>“A kinder, braver, more connected humanity.”</p><span class="cap">— A wish from Chicago</span></div></div></div>';
}
function viewEarth() {
  return hero(scene('earth'), { cls: 'room-hero', h1: 'Heal Places', k1: 'A global atlas of restoration', low: '<p class="lead in" style="--i:2;text-shadow:0 2px 20px #000">Explore real-world projects restoring nature, communities and hope.</p>' }) +
    '<div class="page"><input class="field" placeholder="Search a place, project or region..." aria-label="search">' +
    '<div class="cats">' + [['🌲', 'Forests'], ['🌊', 'Oceans'], ['🏙️', 'Cities'], ['🦋', 'Wildlife']].map(([i, n]) => '<button><span class="ico">' + i + '</span>' + n + '</button>').join('') + '</div>' +
    '<a class="glass project" href="https://giveth.io/projects" target="_blank" rel="noopener"><span class="pic" style="background-image:url(' + GFX('g11.jpg') + ')"></span><span class="grow"><span class="tag">Featured Project</span><b>Amazon Rewilding</b><span class="n">2,340 supporters</span><span class="btn sm mint" style="justify-self:start">Support</span></span></a>' +
    '<p class="cap" style="text-align:center">The atlas is drawn as imagined. Real projects connect when the backend arrives.</p></div>';
}
function viewGalaxy() {
  return hero(scene('galaxy'), { cls: 'room-hero', h1: 'The Gratus Galaxy', k1: 'People · Projects · A Brighter Planet', low: '<p class="lead in" style="--i:2;text-shadow:0 2px 20px #000">A living constellation of gratitude, restoration and real-world impact.</p>' }) +
    '<div class="page"><div class="galaxy">' + art('g15') + '<img class="core" src="' + LOGO + '" alt="Gratus">' +
    '<button class="node" style="left:26%;top:24%" data-node="give"><span class="ico">👤</span>People</button>' +
    '<button class="node" style="left:78%;top:28%" data-node="earth"><span class="ico">🌳</span>Places</button>' +
    '<button class="node" style="left:22%;top:76%" data-node="projects"><span class="ico">🌱</span>Projects</button>' +
    '<button class="node" style="left:80%;top:78%" data-node="projects"><span class="ico">🤝</span>Partners</button></div>' +
    '<div class="glass stats"><div><b>1,248</b><span>Projects</span></div><div><b>193</b><span>Partners</span></div><div><b>78</b><span>Countries</span></div></div><p class="kicker" style="text-align:center">∞ Possibilities · as imagined · Gratitude connects us all.</p>' +
    '<div class="glass card"><span class="kicker mint">Our Partners</span><div class="chips">' + ['Giveth', 'Ripple Effect', 'Gitcoin', 'Open Source', 'Regen'].map((p) => '<span class="chip">' + p + '</span>').join('') + '</div></div>' +
    '<p class="statement" style="text-align:center;font-style:italic">Gratitude Moves Worlds.</p><p class="kicker" style="text-align:center">Grow what gives.</p></div>';
}

// ── THE GROWTH BOOK ──
let bookTab = 'journal', recipeCat = 'all', qOffset = 0, journalQuery = '';
// ── write where you are standing: the composer as a sheet, so the journal never has to be left ──
function quickWrite(pre) {
  const pal = palette().slice(0, 10); const t = today();
  const dr = { text: (pre && pre.text) || '', emoji: (pre && pre.emoji) || null, tags: [] };
  const pool = Gr.questionPool(C.prompts); const q = Gr.question(pool, t + ':j', qOffset);
  const sh = sheet('<div class="hero-sm"><span class="orb lg lit"><span>🌱</span></span><h2>Today</h2><span class="kicker mint">' + esc(q) + '</span></div>' +
    '<textarea class="field" id="qw-text" rows="4" maxlength="1234" placeholder="What are you grateful for today?" aria-label="your entry">' + esc(dr.text) + '</textarea>' +
    '<span class="kicker mint">The emoji you are planting</span>' +
    '<div class="pick">' + pal.map((e) => '<button class="orb' + (dr.emoji === e ? ' on' : '') + '" data-qwpick="' + esc(e) + '" aria-label="' + esc(nameOf(e)) + '"><span>' + esc(e) + '</span></button>').join('') + '</div>' +
    '<span class="kicker mint">Tags</span><div class="chips">' + C.book.tags.slice(0, 9).map((x) => '<button class="chip" data-qwtag="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div>' +
    '<button class="btn mint wide" id="qw-plant">Plant My Gratus 🌱</button>' +
    '<button class="btn quiet" id="qw-full">Open the full composer</button>', { autofocus: true });
  $$('[data-qwpick]', sh.el).forEach((b) => b.addEventListener('click', () => { dr.emoji = dr.emoji === b.dataset.qwpick ? null : b.dataset.qwpick; $$('[data-qwpick]', sh.el).forEach((x) => x.classList.toggle('on', x.dataset.qwpick === dr.emoji)); }));
  $$('[data-qwtag]', sh.el).forEach((b) => b.addEventListener('click', () => { const x = b.dataset.qwtag; dr.tags = dr.tags.includes(x) ? dr.tags.filter((y) => y !== x) : dr.tags.concat([x]); b.classList.toggle('on', dr.tags.includes(x)); }));
  $('#qw-full', sh.el).addEventListener('click', () => { draft.text = $('#qw-text', sh.el).value; draft.emoji = dr.emoji; draft.tags = dr.tags.slice(); sh.close(); go('grow'); });
  $('#qw-plant', sh.el).addEventListener('click', () => {
    draft.text = $('#qw-text', sh.el).value; draft.emoji = dr.emoji; draft.tags = dr.tags.slice();
    if (!draft.text.trim() && !draft.emoji) { toast('A word or an emoji. Either grows.'); return; }
    sh.close(); plantNow();
  });
}
// ── a day, opened ──
function daySheet(day) {
  const es = S.entries.filter((e) => e.day === day);
  const grew = S.plants.filter((p) => (p.kept || []).includes(day));
  sheet('<div class="hero-sm"><span class="orb lg' + (es.length ? ' lit' : '') + '"><span>' + esc(es.length ? (es[0].emoji || '✦') : '·') + '</span></span><h2>' + esc(day === today() ? 'Today' : fmtDay(day)) + '</h2><span class="kicker mint">' + (es.length ? plural(es.length, 'entry').replace('entrys', 'entries') : 'Nothing written') + (grew.length ? ' · ' + plural(grew.length, 'plant') + ' grew' : '') + '</span></div>' +
    (grew.length ? '<div class="chips">' + grew.map((p) => '<span class="chip">' + esc(face(p)) + ' ' + esc(nameOf(face(p))) + '</span>').join('') + '</div>' : '') +
    (es.length ? '<div class="rows">' + es.map(entryCard).join('') + '</div>' : '<p class="cap">This day has no entry. A day without one is not a failure; it is simply a day.</p>') +
    (day === today() ? '<button class="btn mint wide" id="dy-write">Write today\u2019s entry 🌱</button>' : ''));
  $$('[data-e]').forEach((b) => b.addEventListener('click', () => entrySheet(S.entries.find((x) => x.id === b.dataset.e))));
  const w = $('#dy-write'); if (w) w.addEventListener('click', quickWrite);
}
let jTab = 'entries', jMonth = 0, jDay = '', jEmoji = '', jTag = '', jFolder = '', jStar = false;
const monthKey = (off) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + off); return d.getFullYear() + '-' + pad2(d.getMonth() + 1); };
function monthGrid(off) {
  const key = monthKey(off); const [Y, M] = key.split('-').map(Number);
  const first = new Date(Y, M - 1, 1); const days = new Date(Y, M, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // weeks begin on Monday
  const byDay = {}; for (const e of S.entries) byDay[e.day] = (byDay[e.day] || 0) + 1;
  const t = today();
  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<i class="pad"></i>';
  for (let d = 1; d <= days; d++) {
    const k = key + '-' + pad2(d); const n = byDay[k] || 0; const future = k > t;
    cells += '<button class="cal-d' + (n ? ' on' : '') + (k === t ? ' today' : '') + (k === jDay ? ' sel' : '') + (future ? ' future' : '') + '" data-calday="' + k + '"' + (future ? ' disabled' : '') + '><span>' + d + '</span>' + (n > 1 ? '<i class="dots">' + '•'.repeat(Math.min(3, n)) + '</i>' : n ? '<i class="dots">•</i>' : '') + '</button>';
  }
  const written = Object.keys(byDay).filter((k) => k.startsWith(key)).length;
  const mEntries = S.entries.filter((e) => e.day.startsWith(key));
  const mEmoji = new Set(mEntries.map((e) => e.emoji).filter(Boolean)).size;
  const mWords = mEntries.reduce((n, e) => n + (e.text || '').split(/\s+/).filter(Boolean).length, 0);
  const label = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  return '<div class="glass cal"><div class="cal-head"><button class="cal-nav" data-calmove="-1" aria-label="the month before">‹</button><b>' + esc(label) + '</b><button class="cal-nav" data-calmove="1"' + (off >= 0 ? ' disabled' : '') + ' aria-label="the month after">›</button></div>' +
    '<div class="cal-dow"><i>M</i><i>T</i><i>W</i><i>T</i><i>F</i><i>S</i><i>S</i></div>' +
    '<div class="cal-grid">' + cells + '</div>' +
    '<div class="monthsum"><span><b>' + written + '</b>' + (written === 1 ? 'day' : 'days') + '</span><span><b>' + mEntries.length + '</b>' + (mEntries.length === 1 ? 'entry' : 'entries') + '</span><span><b>' + mEmoji + '</b>' + (mEmoji === 1 ? 'emoji' : 'emojis') + '</span><span><b>' + mWords + '</b>words</span></div>' +
    '<p class="cap">' + (jDay ? 'Showing ' + esc(fmtDay(jDay)) + '. Hold a day to open it.' : 'Tap a day to show it. Hold one to open it.') + '</p></div>';
}
function viewJournal() {
  const t = today(); const pool = Gr.questionPool(C.prompts); const q = Gr.question(pool, t + ':j', qOffset);
  let body = '';
  if (jTab === 'threads') body = viewThreads();
  else if (jTab === 'folders') body = viewFolders();
  else if (jTab === 'milestones') body = viewMilestones();
  else {
    const qq = journalQuery.trim().toLowerCase();
    const list = S.entries.filter((e) => {
      if (jDay && e.day !== jDay) return false;
      if (jEmoji && e.emoji !== jEmoji) return false;
      if (jTag && !(e.tags || []).includes(jTag)) return false;
      if (jFolder && e.folder !== jFolder) return false;
      if (jStar && !e.star) return false;
      if (!qq) return true;
      return (e.text || '').toLowerCase().includes(qq) || (e.tags || []).some((x) => x.toLowerCase().includes(qq)) || (e.emoji || '') === journalQuery.trim();
    }).slice().reverse();
    const byDay = []; for (const e of list) { const last = byDay[byDay.length - 1]; if (last && last.day === e.day) last.items.push(e); else byDay.push({ day: e.day, items: [e] }); }
    const emojis = Array.from(new Set(S.entries.map((e) => e.emoji).filter(Boolean))).slice(0, 14);
    const tags = Array.from(new Set(S.entries.flatMap((e) => e.tags || []))).slice(0, 14);
    const filtering = jDay || jEmoji || jTag || jFolder || jStar || qq;
    body = monthGrid(jMonth) +
      '<input class="field" id="j-search" placeholder="Search your gratitude..." aria-label="search entries" value="' + esc(journalQuery) + '">' +
      (emojis.length ? '<div class="chips row">' + emojis.map((e) => '<button class="chip' + (jEmoji === e ? ' on' : '') + '" data-jemoji="' + esc(e) + '"><span class="emoji">' + esc(e) + '</span> ' + esc(nameOf(e)) + '</button>').join('') + '</div>' : '') +
      (tags.length ? '<div class="chips row">' + tags.map((x) => '<button class="chip' + (jTag === x ? ' on' : '') + '" data-jtag="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div>' : '') +
      (S.folders.length ? '<div class="chips row">' + S.folders.map((f) => '<button class="chip' + (jFolder === f.id ? ' on' : '') + '" data-jfolder="' + esc(f.id) + '">📁 ' + esc(f.name) + '</button>').join('') + '</div>' : '') +
      (S.entries.some((e) => e.star) ? '<button class="chip' + (jStar ? ' on' : '') + '" id="j-star">★ Kept close</button>' : '') +
      (filtering ? '<button class="btn sm quiet" id="j-clear">Clear the filters · ' + plural(list.length, 'entry').replace('entrys', 'entries') + '</button>' : '') +
      (byDay.length ? byDay.map((d) => '<div class="dayhead"><b>' + esc(d.day === t ? 'Today' : fmtDay(d.day)) + '</b><span class="cap">' + plural(d.items.length, 'entry').replace('entrys', 'entries') + '</span></div><div class="rows">' + d.items.map(entryCard).join('') + '</div>').join('')
        : '<p class="cap">' + (filtering ? 'Nothing here with that filter.' : 'Nothing written yet. Every entry you plant lives here, by day.') + '</p>');
  }
  return '<div class="glass card"><span class="kicker mint">Today\'s question</span><h3 class="q"><button id="j-q" aria-label="another question">' + esc(q) + '</button></h3><button class="btn mint" id="j-write">Write today\'s entry 🌱</button></div>' +
    '<div class="glass seg" style="grid-template-columns:repeat(4,1fr)">' + [['entries', 'Entries'], ['threads', 'Threads'], ['folders', 'Folders'], ['milestones', 'Milestones']].map(([k, n]) => '<button class="' + (jTab === k ? 'on' : '') + '" data-jt="' + k + '">' + n + '</button>').join('') + '</div>' + body;
}
function viewBook() {
  const ph = C.book.phases; let body = '';
  if (bookTab === 'journal') body = viewJournal();
  else if (bookTab === 'phases') body = '<div class="rows">' + ph.map((p, i) => '<div class="glass phase"><span class="ico' + (i === ph.length - 1 ? ' gold' : '') + '">' + p.icon + '</span><span><b>' + esc(p.name) + '</b><span class="cap">' + esc(p.meaning) + '</span></span><span class="day">day ' + p.day + (ph[i + 1] ? '<br>' + (ph[i + 1].day - p.day) + ' to next' : '') + '</span></div>').join('') + '</div><p class="cap">A day counts once, on the day you write about that emoji. The evolution arcs below run on their own clock: 0, 3, 8, 21 and 55 days.</p>';
  else if (bookTab === 'emojis') { const pal = palette(); body = '<div class="glass card"><span class="kicker mint">Your palette</span><div class="chips">' + pal.map((e) => '<button class="orb' + (plantFor(e) ? ' lit' : '') + '" data-arc="' + esc(e) + '" aria-label="' + esc(nameOf(e)) + '"><span>' + esc(e) + '</span></button>').join('') + '</div><div class="two"><input class="field" id="new-emoji" placeholder="any emoji" aria-label="a new emoji"><button class="btn" id="add-emoji">Add an emoji</button></div></div>' +
    '<div class="eyebrow"><h2>Arcs</h2><span class="more">' + C.evo.chains.length + ' chains</span></div><div class="rows">' + C.evo.chains.map((ch) => '<button class="glass recipe" data-chain="' + esc(ch.id) + '"><span class="f">' + ch.stages.map((s) => esc(s.emoji)).join('<span class="op">→</span>') + '</span><span class="name">' + esc(ch.arc) + '</span><span class="line">' + esc(ch.stages[0].line) + '</span></button>').join('') + '</div>'; }
  else { const cats = C.recipes.categories; const list = allRecipes().filter((r) => recipeCat === 'all' || r.cat === recipeCat); body = '<div class="chips row"><button class="chip' + (recipeCat === 'all' ? ' on' : '') + '" data-rcat="all">All</button>' + Object.keys(cats).map((k) => '<button class="chip' + (recipeCat === k ? ' on' : '') + '" data-rcat="' + k + '">' + esc(cats[k].name) + '</button>').join('') + '<button class="chip' + (recipeCat === 'mine' ? ' on' : '') + '" data-rcat="mine">Mine</button></div>' +
    alchemyBlock() + '<div class="eyebrow"><h2>Recipes</h2></div><button class="btn wide" id="add-recipe">+ Add a recipe</button><div class="rows">' + list.map((r) => { const st = recipeState(r); return '<button class="glass recipe' + (st.made ? ' made' : '') + '" data-recipe="' + esc(r.id) + '"><span class="f">' + r.formula.map(esc).join('<span class="op">+</span>') + '<span class="op">→</span>' + esc(r.result) + '</span><span class="cat">' + esc(r.cat === 'mine' ? 'Mine' : (cats[r.cat] || {}).name || '') + '</span><span class="name">' + esc(r.name) + '</span><span class="line">' + esc(r.statement) + (st.made ? ' · made' : ' · ' + st.days + ' of ' + st.need + ' days together') + '</span></button>'; }).join('') + '</div>'; }
  return hero(scene('book'), { cls: 'room-hero', h1: 'Growth Book', k1: 'Your Gratitude Journal', k2: 'Journal · Phases · Emojis · Recipes' }) +
    '<div class="page"><div class="glass seg" style="grid-template-columns:repeat(4,1fr)">' + [['journal', 'Journal'], ['phases', 'Phases'], ['emojis', 'Emojis'], ['recipes', 'Recipes']].map(([k, n]) => '<button class="' + (bookTab === k ? 'on' : '') + '" data-book="' + k + '">' + n + '</button>').join('') + '</div>' + body + '</div>';
}
function arcSheet(emoji) {
  const p = plantFor(emoji); const d = p ? daysOf(p) : 0; const seed = p ? p.emoji : emoji; const arc = E.arc(seed, d, C.evo); const sch = E.schedule(C.evo); const ph = phaseOf(d); const nx = nextPhase(d);
  const recipes = allRecipes().filter((r) => r.formula.includes(emoji) || r.result === emoji);
  const forp = p && p.forProject;
  const sh = sheet('<div class="hero-sm"><span class="orb xl' + (p ? ' lit' : '') + '"><span>' + esc(emoji) + '</span></span><h2>' + esc(nameOf(emoji)) + '</h2><span class="kicker mint">' + (p ? esc(ph.name + ' · ' + plural(d, 'day')) + (nx ? ' · ' + esc(nx.name) + ' in ' + plural(nx.day - d, 'day') : '') : 'Not planted yet') + '</span></div>' +
    (p ? '<p class="body">' + esc(ph.meaning) + '</p>' : '') +
    (arc ? '<div><span class="kicker mint">' + esc(arc.chain.arc) + '</span><div class="arc" style="padding-top:8px">' + arc.stages.map((s, i) => (i ? '<span class="arrow">→</span>' : '') + '<span class="' + (s.reached ? '' : 'dim') + '" title="' + esc(s.name) + '">' + esc(s.emoji) + '</span>').join('') + '</div><div class="rows" style="padding-top:8px">' + arc.chain.stages.map((s, i) => '<div class="cap"><b style="color:var(--ink)">' + esc(s.emoji + ' ' + s.name) + '</b> · day ' + (sch[i] != null ? sch[i] : '') + ' · ' + esc(s.line) + '</div>').join('') + '</div></div>' : '<p class="cap">This emoji keeps its shape. The phases are its growth.</p>') +
    (recipes.length ? '<div><span class="kicker mint">In these recipes</span><div class="rows" style="padding-top:8px">' + recipes.slice(0, 6).map((r) => '<div class="cap"><b style="color:var(--ink)">' + esc(r.formula.join(' + ') + ' → ' + r.result) + '</b> · ' + esc(r.name) + '</div>').join('') + '</div></div>' : '') +
    '<div class="actions">' + (p ? '<button class="btn mint" id="as-write">Write about it</button>' + (phaseIndex(d) >= 4 ? '<button class="btn gold" id="as-give">Give it as a Gratus Gift</button>' : '') : '<button class="btn mint" id="as-plant">Plant it</button>') + '</div>');
  const w = $('#as-write', sh.el); if (w) w.addEventListener('click', () => { sh.close(); draft.emoji = emoji; go('grow'); });
  const pl = $('#as-plant', sh.el); if (pl) pl.addEventListener('click', () => { sh.close(); draft.emoji = emoji; go('grow'); });
  const gv = $('#as-give', sh.el); if (gv) gv.addEventListener('click', () => { sh.close(); giveSheet(p); });
}
function recipeSheet(r) {
  const st = recipeState(r); const cats = C.recipes.categories;
  const sh = sheet('<div class="hero-sm"><div class="arc">' + r.formula.map((e) => '<span class="orb lg"><span>' + esc(e) + '</span></span>').join('<span class="arrow">+</span>') + '<span class="arrow">→</span><span class="orb lg' + (st.made ? ' lit' : '') + '" style="--h:#F2C97D"><span>' + esc(st.made ? r.result : '?') + '</span></span></div><span class="kicker mint">' + esc(r.cat === 'mine' ? 'Your recipe' : ((cats[r.cat] || {}).name || '') + ' · ' + ((cats[r.cat] || {}).line || '')) + '</span><h2>' + esc(r.name) + '</h2><p class="lead">' + esc(r.statement) + '</p></div>' +
    '<p class="body">' + (st.made ? 'Made. ' + esc(r.result) + ' is in your garden.' : 'Write about ' + esc(r.formula[0]) + ' and ' + esc(r.formula[1]) + ' on the same day, ' + plural(st.need, 'time') + '. ' + st.days + ' so far.') + '</p>' + (r.loop ? '<p class="cap mono">' + esc(r.loop) + '</p>' : '') +
    '<div class="actions"><button class="btn mint" id="rs-write">Write with these</button>' + (r.cat === 'mine' ? '<button class="btn quiet" id="rs-del">Remove this recipe</button>' : '') + '</div>');
  $('#rs-write', sh.el).addEventListener('click', () => { sh.close(); draft.emoji = r.formula[0]; go('grow'); toast('Plant ' + r.formula[0] + ' today, then ' + r.formula[1] + '.'); });
  const del = $('#rs-del', sh.el); if (del) del.addEventListener('click', () => { S.my.recipes = S.my.recipes.filter((x) => x.id !== r.id); save(); sh.close(); render(); });
}
function addRecipeSheet() {
  const sh = sheet('<h2>Add a recipe</h2><p class="body">Two emojis written about on the same day, a few days over, become a third.</p><div class="two"><input class="field" id="ra" placeholder="☕" aria-label="first emoji"><input class="field" id="rb" placeholder="📖" aria-label="second emoji"></div><input class="field" id="rc" placeholder="→ 🧠 the result" aria-label="the result"><input class="field" id="rn" placeholder="a name" maxlength="40" aria-label="a name"><textarea class="field" id="rm" rows="2" placeholder="what it means, in one line" maxlength="200" aria-label="what it means"></textarea><div class="two"><input class="field" id="rd" type="number" min="1" max="89" value="3" aria-label="days together"><span class="cap" style="align-self:center">days together</span></div><button class="btn mint wide" id="r-save">Add to the book</button>', { autofocus: true });
  $('#r-save', sh.el).addEventListener('click', () => {
    const a = Gr.firstEmoji($('#ra', sh.el).value), b = Gr.firstEmoji($('#rb', sh.el).value), c = Gr.firstEmoji($('#rc', sh.el).value); const name = $('#rn', sh.el).value.trim(); const meaning = $('#rm', sh.el).value.trim(); const days = Math.max(1, Math.min(89, Number($('#rd', sh.el).value) || 3));
    if (!a || !b || !c) { toast('Three emojis: two in, one out.'); return; } if (a === b) { toast('Two different emojis.'); return; } if (!name) { toast('Give it a name.'); return; }
    S.my.recipes.push({ id: newId('r'), cat: 'mine', formula: [a, b], result: c, name, statement: meaning || 'Yours.', days, loop: '' }); for (const e of [a, b, c]) if (!palette().includes(e)) S.my.emojis.push(e); save(); sh.close(); recipeCat = 'mine'; render(); toast('In the book.');
  });
}

// ── GIVING A GRATUS GIFT ──
function encodeGift(g) { const bytes = new TextEncoder().encode(JSON.stringify(g)); let bin = ''; bytes.forEach((b) => { bin += String.fromCharCode(b); }); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function decodeGift(code) { try { const bin = atob(code.replace(/-/g, '+').replace(/_/g, '/')); const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0)); return JSON.parse(new TextDecoder().decode(bytes)); } catch (e) { return null; } }
function buildGift(p, to, from, message) {
  const d = daysOf(p); const kept = (p.kept || []).slice().sort(); const mine = S.entries.filter((e) => e.emoji === p.emoji || e.emoji === face(p));
  const journey = C.book.phases.filter((ph) => ph.day <= d).map((ph) => { const day = kept[Math.min(kept.length - 1, ph.day)] || p.planted; const en = mine.find((e) => e.day === day && e.text); return { phase: ph.name, icon: ph.icon, day, line: en ? en.text.split('\n')[0].slice(0, 90) : null }; });
  const tags = []; for (const e of mine) for (const t of e.tags || []) if (!tags.includes(t)) tags.push(t);
  return { v: 1, id: newId('gift'), emoji: face(p), seed: p.emoji, days: d, from: from || 'Someone', to: to || '', message: message || '', at: today(), journey, reflections: mine.length, acts: tags.length, tags: tags.slice(0, 4) };
}
function giveSheet(pre) {
  const plants = S.plants.slice().sort((a, b) => daysOf(b) - daysOf(a)); if (!plants.length) { toast('Plant something first. A gift is grown.'); go('grow'); return; }
  let chosen = pre || plants[0];
  const sh = sheet('<h2>Give a Gratus Gift</h2><p class="body">Choose what grew. Write why. It travels inside its own link, with the days it took.</p><div class="pick" id="gpick">' + plants.map((p) => '<button class="orb' + (p === chosen ? ' on' : '') + (phaseIndex(daysOf(p)) >= 4 ? ' lit' : '') + '" data-gp="' + esc(p.id) + '" aria-label="' + esc(nameOf(face(p))) + '"><span>' + esc(face(p)) + '</span></button>').join('') + '</div><p class="cap" id="gsub"></p><input class="field" id="g-to" placeholder="for whom" maxlength="40" aria-label="for whom"><textarea class="field" id="g-msg" rows="3" maxlength="600" placeholder="Thank you for..." aria-label="your message"></textarea><input class="field" id="g-from" placeholder="from" maxlength="40" value="' + esc(S.name || '') + '" aria-label="from"><button class="btn gold wide" id="g-wrap">Wrap it 🎁</button>');
  const sub2 = () => { const d = daysOf(chosen); $('#gsub', sh.el).textContent = nameOf(face(chosen)) + ' · ' + plural(d, 'day') + ' · ' + phaseOf(d).name + (phaseIndex(d) < 4 ? ' · gifts grow best at Ready to Give (day ' + C.book.phases[4].day + ')' : ''); }; sub2();
  $$('[data-gp]', sh.el).forEach((b) => b.addEventListener('click', () => { chosen = S.plants.find((p) => p.id === b.dataset.gp); $$('[data-gp]', sh.el).forEach((x) => x.classList.toggle('on', x === b)); sub2(); }));
  $('#g-wrap', sh.el).addEventListener('click', () => {
    const to = $('#g-to', sh.el).value.trim(), msg = $('#g-msg', sh.el).value.trim(), from = $('#g-from', sh.el).value.trim(); if (!msg) { toast('A few words for them.'); return; }
    const g = buildGift(chosen, to, from, msg); const link = location.origin + '/gift#' + encodeGift(g);
    S.gifts.given.push({ id: g.id, emoji: g.emoji, to, at: today(), days: g.days, link }); S.name = from || S.name; save(); soundGiven(); sh.close();
    playCeremonies(['<div class="cer"><span class="big">' + esc(g.emoji) + '</span><h2>Wrapped.</h2><p class="lead">' + esc(plural(g.days, 'day')) + ' of gratitude, for ' + esc(to || 'someone') + '. Share the link; the journey opens on their phone.</p><span class="kicker">tap to share</span></div>'], () => shareSheet(S.gifts.given[S.gifts.given.length - 1]));
  });
}
function shareSheet(g) {
  const text = (S.name || 'Someone') + ' grew you a Gratus Gift. ' + plural(g.days, 'day') + ' of gratitude.';
  const sh = sheet('<div class="hero-sm"><span class="orb lg lit"><span>' + esc(g.emoji) + '</span></span><h2>Share the gift</h2><span class="kicker mint">The whole journey lives inside the link.</span></div><input class="field" id="sh-link" readonly aria-label="the link" value="' + esc(g.link) + '" style="font-size:15px"><div class="actions"><button class="btn gold" id="sh-share">Share</button><button class="btn" id="sh-copy">Copy the link</button><button class="btn quiet" id="sh-preview">Preview the journey</button></div>');
  $('#sh-copy', sh.el).addEventListener('click', async () => { try { await navigator.clipboard.writeText(g.link); toast('Link copied'); } catch (e) { $('#sh-link', sh.el).select(); toast('Select and copy'); } });
  $('#sh-share', sh.el).addEventListener('click', async () => { if (navigator.share) { try { await navigator.share({ title: 'A Gratus Gift', text, url: g.link }); } catch (e) {} } else { try { await navigator.clipboard.writeText(text + ' ' + g.link); toast('Copied'); } catch (e) {} } });
  $('#sh-preview', sh.el).addEventListener('click', () => { sh.close(); const gift = decodeGift(g.link.split('#')[1]); if (gift) openJourney(gift, { preview: true }); });
}

// ── THE GIFT JOURNEY (the receiver's eight pages) ──
const DEMO_GIFT = { v: 1, id: 'demo', emoji: '❤️', seed: '🤍', days: 12, from: 'Augie', to: 'you', message: 'Thank you for always being there. You make life brighter, kinder, and more meaningful. This is my way of saying I see you, I appreciate you, and I\'m grateful for you.', at: '2026-09-17', journey: [{ phase: 'Planted', icon: '❤️', day: '2026-09-05', line: 'I\'m grateful for you.' }, { phase: 'Nurtured', icon: '🌱', day: '2026-09-07', line: 'You always make time.' }, { phase: 'Deepened', icon: '💧', day: '2026-09-10', line: 'You inspire me.' }, { phase: 'Bloomed', icon: '☀️', day: '2026-09-14', line: 'Life is better with you in it.' }, { phase: 'Ready to Give', icon: '💗', day: '2026-09-17', line: 'Gratitude grows love.' }], reflections: 4, acts: 3, tags: ['Love', 'Support', 'Friendship', 'Gratitude'] };
function openJourney(g, o) { o = o || {}; room = { g, i: 0, choice: 'garden', o }; document.body.classList.add('room'); if (!o.routed) history.pushState({ room: 1 }, '', '/gift'); renderJourney(); }
function closeRoom(byRoute) { const r = $('#room'); r.hidden = true; r.innerHTML = ''; document.body.classList.remove('room'); room = null; if (!byRoute && location.pathname === '/gift') history.replaceState(null, '', '/app'); }
function renderJourney() {
  const r = $('#room'); const { g, i } = room; const name = nameOf(g.emoji);
  const page = (body, foot) => '<div class="room-page">' + art(SCENES.journey[i], 'rart') + '<div class="rhead">' + (i ? '<button id="rj-back" aria-label="back">‹</button>' : '<span style="width:40px"></span>') + '<span class="brand"><img src="' + LOGO + '" alt="">Gratus.CC</span><button id="rj-x" aria-label="close">×</button></div><div class="rbody">' + body + '</div><div class="rfoot">' + foot + '</div></div>';
  const emojiHero = '<span class="orb xl lit" style="--h:#F2C97D;font-size:76px;width:150px;height:150px;justify-self:center"><span>' + esc(g.emoji) + '</span></span>';
  let html = '';
  if (i === 0) html = page('<span class="kicker">A kinder world grows here.</span><h1>A Gratus Gift<br>For You</h1><span class="kicker mint">Someone grew this with gratitude.</span>', '<button class="btn mint wide" id="rj-next">Unwrap ›</button><span class="kicker">Gratitude moves worlds.</span>');
  else if (i === 1) html = page('<h1>Unwrapping…</h1><span class="kicker mint">Every gift carries a story.</span><p class="cap">Opening with gratitude…</p><div class="progress"><i></i></div>', '<span class="kicker">🌱</span>');
  else if (i === 2) html = page(emojiHero + '<h1>Your Gratus Gift</h1><span class="kicker mint">A ' + esc(name) + ' that grew</span><p class="statement quiet">“Gratitude turns moments into something eternal.”</p><div class="glass msg">“' + esc(g.message) + '”<span class="from">– ' + esc(g.from) + '</span></div>', '<button class="btn mint wide" id="rj-next">♡ Feel The Love</button>');
  else if (i === 3) html = page('<h1>The Journey</h1><span class="kicker mint">How this gift grew</span><div class="timeline">' + g.journey.map((j, k) => '<div class="tl"><span class="ico' + (k === g.journey.length - 1 ? ' gold' : '') + '">' + esc(j.icon) + '</span><span><b>' + esc(j.phase) + '</b><span class="cap">' + esc(fmtDay(j.day)) + '</span>' + (j.line ? '<q>“' + esc(j.line) + '”</q>' : '') + '</span></div>').join('') + '</div><div class="glass stats"><div><b>' + g.days + '</b><span>Days</span></div><div><b>' + g.reflections + '</b><span>Reflections</span></div><div><b>' + g.acts + '</b><span>Acts of Care</span></div></div>', '<button class="btn mint wide" id="rj-next">Continue ›</button>');
  else if (i === 4) { const n = g.journey.length; const pts = g.journey.map((j, k) => ({ x: 30 + k * (300 / Math.max(1, n - 1)), y: 150 - (k + 1) * (120 / n) })); const d = pts.map((p, k) => (k ? 'L' : 'M') + p.x + ' ' + p.y).join(' '); html = page('<h1>Gratus Graph</h1><span class="kicker mint">A visual story of gratitude</span><svg class="graph" viewBox="0 0 360 180" aria-hidden="true"><path class="line" d="' + d + '"/>' + pts.map((p, k) => '<circle class="pt" cx="' + p.x + '" cy="' + p.y + '" r="4"/><text class="lbl" x="' + p.x + '" y="172" text-anchor="middle">' + esc(g.journey[k].phase.split(' ')[0]) + '</text><text class="lbl" x="' + p.x + '" y="' + (p.y - 10) + '" text-anchor="middle">' + esc(g.journey[k].day.slice(5).replace('-', '/')) + '</text>').join('') + '</svg><p class="statement quiet">“Small moments. Big meaning.”</p><div class="glass card" style="text-align:left"><b>Growth Insights</b><span class="cap">• ' + esc(plural(g.days, 'day') + ' of care') + '<br>• ' + esc(g.reflections + ' gratitude ' + (g.reflections === 1 ? 'entry' : 'entries')) + '<br>• ' + esc(plural(g.acts, 'meaningful action')) + '<br>• 1 beautiful gift</span></div>', '<button class="btn mint wide" id="rj-next">Continue ›</button>'); }
  else if (i === 5) { const arc = E.arc(g.seed, g.days, C.evo); html = page(emojiHero + '<h1>A Closer Look</h1><span class="kicker mint">The ' + esc(name) + '\'s details</span><p class="lead">' + esc(g.emoji + ' ' + name) + '</p>' + (g.seed !== g.emoji ? '<p class="cap">Grown from: ' + esc(nameOf(g.seed)) + '</p>' : '') + (arc ? '<div class="arc" style="justify-content:center">' + arc.stages.map((s, k) => (k ? '<span class="arrow">→</span>' : '') + '<span class="' + (s.reached ? '' : 'dim') + '">' + esc(s.emoji) + '</span>').join('') + '</div>' : '') + '<div class="glass msg" style="text-align:center">“What started as a simple thank you became a symbol of everything you mean to me.”</div>' + (g.tags.length ? '<div class="chips" style="justify-content:center">' + g.tags.map((t) => '<span class="chip">' + esc(t) + '</span>').join('') + '</div>' : ''), '<button class="btn mint wide" id="rj-next">🌱 Add to My Garden</button>'); }
  else if (i === 6) html = page('<h1>Your Choices</h1><span class="kicker mint">Privacy &amp; sharing</span><p class="body">How would you like to keep this gift?</p><div class="rows" style="text-align:left">' + [['private', '🔒', 'Private', 'Keep this gift just for you.'], ['garden', '🌱', 'In My Garden', 'Save it to your garden (default).'], ['share', '👥', 'Share the Story', 'Allow a shared version (no private notes).'], ['pass', '♾️', 'Pass It Forward', 'Re-gift to someone else.']].map(([k, ic, n, l]) => '<button class="glass choice' + (room.choice === k ? ' on' : '') + '" data-choice="' + k + '"><span class="ico">' + ic + '</span><span class="grow"><b>' + n + '</b><span>' + l + '</span></span><span class="radio"></span></button>').join('') + '</div>', '<button class="btn mint wide" id="rj-save">🌱 Save My Gift</button><span class="kicker">Your gratitude. Your choice.</span>');
  else html = page('<h1>Thank You</h1><span class="kicker mint">Gratitude keeps growing</span><p class="lead">You just received a Gratus Gift.<br>A kinder world grows because of people like you.</p><span class="kicker">🌱</span>', '<button class="btn mint wide" id="rj-done">🌿 Keep Growing</button><span class="kicker">Gratitude lives on.</span>');
  r.innerHTML = html; r.hidden = false; r.scrollTop = 0; choreograph();
  const nx = $('#rj-next', r); if (nx) nx.addEventListener('click', () => { room.i++; renderJourney(); });
  const bk = $('#rj-back', r); if (bk) bk.addEventListener('click', () => { room.i = Math.max(0, room.i - 1); renderJourney(); });
  $('#rj-x', r).addEventListener('click', () => { closeRoom(); render(); });
  if (i === 1) setTimeout(() => { if (room && room.i === 1) { room.i = 2; renderJourney(); } }, 2900);
  $$('[data-choice]', r).forEach((b) => b.addEventListener('click', () => { room.choice = b.dataset.choice; $$('[data-choice]', r).forEach((x) => x.classList.toggle('on', x === b)); }));
  const sv = $('#rj-save', r); if (sv) sv.addEventListener('click', () => { saveGift(); room.i = 7; renderJourney(); });
  const dn = $('#rj-done', r); if (dn) dn.addEventListener('click', () => { const pass = room.choice === 'pass'; closeRoom(); go('gratus'); if (pass) setTimeout(() => giveSheet(plantFor(g.seed) || null), 400); });
}
function saveGift() {
  const { g, choice, o } = room; if (o.preview) { toast('This is your own gift, previewed.'); return; }
  if (S.gifts.received.some((x) => x.id === g.id)) return;
  S.gifts.received.push({ id: g.id, emoji: g.emoji, from: g.from, at: today(), days: g.days, message: g.message, choice });
  if (!plantFor(g.seed)) S.plants.push({ id: newId('p'), emoji: g.seed, planted: today(), kept: [today()], carried: g.days, origin: 'gift', from: g.from, private: choice === 'private' });
  save(); toast(choice === 'private' ? 'Kept, privately.' : 'In your garden.');
}

// ── sheets: entries, you, the laws ──
function entrySheet(e) {
  const folders = S.folders.map((f) => '<button class="chip' + (e.folder === f.id ? ' on' : '') + '" data-efold="' + esc(f.id) + '">📁 ' + esc(f.name) + '</button>').join('');
  const sh = sheet('<span class="kicker mint">' + esc(fmtDay(e.day)) + (e.emoji ? ' · ' + esc(e.emoji) + ' ' + esc(nameOf(e.emoji)) : '') + '</span>' +
    (e.photo ? '<img src="' + e.photo + '" alt="" style="border-radius:14px;max-height:280px;width:100%;object-fit:cover">' : '') +
    '<p class="lead" style="white-space:pre-wrap">' + esc(e.text || '(an emoji, no words)') + '</p>' +
    (e.voice ? '<div class="glass voiceprev"><span class="kicker mint">Your voice · ' + fmtDur(e.voice.dur) + '</span><audio controls id="en-audio"></audio></div>' : '') +
    (e.tags && e.tags.length ? '<div class="chips">' + e.tags.map((t) => '<span class="chip">' + esc(t) + '</span>').join('') + '</div>' : '') +
    '<span class="kicker mint">Folder</span><div class="chips">' + folders + '<button class="chip" id="en-newfolder">+ new folder</button></div>' +
    '<div class="actions">' + (e.emoji ? '<button class="btn mint" id="en-thread">Continue this thread ' + esc(e.emoji) + '</button>' : '') + '<button class="btn" id="en-star">' + (e.star ? '★ Kept close' : '☆ Keep this one close') + '</button><button class="btn quiet" id="en-del">Delete this entry</button></div>' +
    '<p class="cap">Deleting an entry never takes a day from an emoji.</p>');
  if (e.voice) keepGet(e.id).then((b) => { const au = $('#en-audio', sh.el); if (!au) return; if (b) au.src = URL.createObjectURL(b); else au.outerHTML = '<p class="cap">The recording is not on this device.</p>'; }).catch(() => null);
  $$('[data-efold]', sh.el).forEach((b) => b.addEventListener('click', () => { e.folder = e.folder === b.dataset.efold ? null : b.dataset.efold; save(); $$('[data-efold]', sh.el).forEach((x) => x.classList.toggle('on', x.dataset.efold === e.folder)); toast(e.folder ? 'Filed in ' + folderOf(e.folder).name : 'Taken out of its folder'); render(); }));
  $('#en-newfolder', sh.el).addEventListener('click', () => { sh.close(); newFolder((f) => { e.folder = f.id; save(); render(); toast('Filed in ' + f.name); }); });
  const th = $('#en-thread', sh.el); if (th) th.addEventListener('click', () => { sh.close(); continueThread(e.emoji); });
  $('#en-star', sh.el).addEventListener('click', () => { e.star = !e.star; save(); sh.close(); render(); toast(e.star ? 'Kept close' : 'Let go'); });
  $('#en-del', sh.el).addEventListener('click', () => { if (!confirm('Delete this entry?')) return; S.entries = S.entries.filter((x) => x.id !== e.id); if (e.voice) keepDel(e.id).catch(() => null); save(); sh.close(); render(); });
}
function folderOf(id) { return S.folders.find((f) => f.id === id) || null; }
function newFolder(then) {
  const sh = sheet('<h2>A new folder</h2><p class="body">A person, a season, a place. Entries you file here stay easy to find.</p><input class="field" id="nf-name" placeholder="name the folder" maxlength="40" aria-label="folder name"><button class="btn mint" id="nf-go">Make the folder</button>', { autofocus: true });
  $('#nf-go', sh.el).addEventListener('click', () => { const name = $('#nf-name', sh.el).value.trim(); if (!name) { toast('A name'); return; } const f = { id: newId('f'), name, made: today() }; S.folders.push(f); save(); sh.close(); if (then) then(f); else render(); });
}
function folderSheet(f) {
  const es = S.entries.filter((e) => e.folder === f.id).slice().reverse();
  const sh = sheet('<div class="hero-sm"><span class="orb lg lit"><span>📁</span></span><h2>' + esc(f.name) + '</h2><span class="kicker mint">' + plural(es.length, 'entry').replace('entrys', 'entries') + ' · since ' + esc(fmtDay(f.made)) + '</span></div>' +
    (es.length ? '<div class="rows">' + es.map(entryCard).join('') + '</div>' : '<p class="cap">Nothing filed here yet. Open any entry and choose this folder.</p>') +
    '<div class="two"><input class="field" id="fo-name" value="' + esc(f.name) + '" maxlength="40" aria-label="folder name"><button class="btn" id="fo-save">Rename</button></div><div class="links"><button id="fo-del">Delete the folder</button></div><p class="cap">Deleting a folder keeps every entry; they simply leave the folder.</p>');
  $$('[data-e]', sh.el).forEach((b) => b.addEventListener('click', () => { sh.close(); entrySheet(S.entries.find((x) => x.id === b.dataset.e)); }));
  $('#fo-save', sh.el).addEventListener('click', () => { const n = $('#fo-name', sh.el).value.trim(); if (!n) return; f.name = n; save(); sh.close(); render(); toast('Renamed'); });
  $('#fo-del', sh.el).addEventListener('click', () => { if (!confirm('Delete the folder "' + f.name + '"? The entries stay.')) return; S.entries.forEach((e) => { if (e.folder === f.id) e.folder = null; }); S.folders = S.folders.filter((x) => x.id !== f.id); save(); sh.close(); render(); });
}
function threadEntries(emoji) { const p = plantFor(emoji); return S.entries.filter((e) => e.emoji === emoji || (p && (e.emoji === p.emoji || e.emoji === face(p)))); }
function threadSheet(emoji) {
  const p = plantFor(emoji); const d = p ? daysOf(p) : 0; const ph = phaseOf(d); const nx = nextPhase(d); const es = threadEntries(emoji).slice().reverse();
  const sh = sheet('<div class="hero-sm"><span class="orb xl' + (p ? ' lit' : '') + '"><span>' + esc(p ? face(p) : emoji) + '</span></span><h2>' + esc(nameOf(emoji)) + '</h2><span class="kicker mint">' + esc(ph.name) + ' · ' + plural(d, 'day') + ' · ' + plural(es.length, 'entry').replace('entrys', 'entries') + (nx ? ' · ' + esc(nx.name) + ' in ' + plural(nx.day - d, 'day') : ' · ready to give') + '</span></div>' +
    '<button class="btn mint wide" id="th-go">Continue this thread ' + esc(emoji) + '</button>' +
    (es.length ? '<div class="rows">' + es.map(entryCard).join('') + '</div>' : '<p class="cap">No words yet on this thread. Write about it today and the day counts.</p>'));
  $('#th-go', sh.el).addEventListener('click', () => { sh.close(); continueThread(emoji); });
  $$('[data-e]', sh.el).forEach((b) => b.addEventListener('click', () => { sh.close(); entrySheet(S.entries.find((x) => x.id === b.dataset.e)); }));
}
function continueThread(emoji) { draft.emoji = emoji; go('grow'); setTimeout(() => { const w = $('#write'); if (w) { w.focus(); w.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }, 80); }
// ── milestones: the journal's own way of marking the road; never a score, never a comparison ──
function daysInRow() {
  const set = new Set(S.entries.map((e) => e.day)); let n = 0; const d = new Date();
  const key = () => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  if (!set.has(key())) d.setDate(d.getDate() - 1);
  while (set.has(key())) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
const careDays = () => S.plants.reduce((n, p) => n + daysOf(p), 0);
const wordCount = () => S.entries.reduce((n, e) => n + (e.text || '').split(/\s+/).filter(Boolean).length, 0);
const MILESTONES = [
  ['first-entry', 'First entry', '✦', () => S.entries.length >= 1],
  ['three-in-row', 'Three days in a row', '🌱', () => daysInRow() >= 3],
  ['seven-in-row', 'Seven days in a row', '🌿', () => daysInRow() >= 7],
  ['thirty-in-row', 'Thirty days in a row', '🌳', () => daysInRow() >= 30],
  ['ten-entries', 'Ten entries', '📖', () => S.entries.length >= 10],
  ['fifty-entries', 'Fifty entries', '📚', () => S.entries.length >= 50],
  ['first-photo', 'A photo kept', '📷', () => S.entries.some((e) => e.photo)],
  ['first-voice', 'Your voice kept', '🎙️', () => S.entries.some((e) => e.voice)],
  ['first-folder', 'First folder', '📁', () => S.folders.length >= 1],
  ['first-goal', 'A goal posted', '🎯', () => S.goals.length >= 1],
  ['nurtured', 'A plant Nurtured', '💧', () => S.plants.some((p) => daysOf(p) >= 2)],
  ['bloomed', 'A plant Bloomed', '🌸', () => S.plants.some((p) => daysOf(p) >= 9)],
  ['ready', 'Ready to Give', '🎁', () => S.plants.some((p) => daysOf(p) >= 13)],
  ['first-recipe', 'First recipe', '✨', () => Object.keys(S.made || {}).length >= 1],
  ['first-gift', 'First gift given', '💝', () => S.gifts.given.length >= 1],
  ['received', 'A gift received', '🌟', () => S.gifts.received.length >= 1],
  ['first-seed', 'A Gratus Seed planted', '🌱', () => S.seeds.length >= 1],
  ['first-bloom', 'A seed watered and bloomed', '🌻', () => S.seeds.some((s) => s.status === 'bloomed')],
  ['care-30', 'Thirty days of care', '🕯️', () => careDays() >= 30],
  ['care-100', 'A hundred days of care', '🔥', () => careDays() >= 100],
];
function checkMilestones() {
  if (!S) return; const now = today(); const lit = [];
  for (const [id, name, ico, test] of MILESTONES) { let ok = false; try { ok = test(); } catch (e) { ok = false; } if (!S.milestones[id] && ok) { S.milestones[id] = now; lit.push({ id, name, ico }); } }
  if (!lit.length) return;
  save();
  const BIG = { 'seven-in-row': 1, 'thirty-in-row': 1, bloomed: 1, ready: 1, 'first-gift': 1, received: 1, 'first-bloom': 1, 'care-100': 1 };
  const big = lit.filter((x) => BIG[x.id]);
  if (big.length) playCeremonies(big.map((x) => '<div class="cer"><span class="big">' + esc(x.ico) + '</span><h2>' + esc(x.name) + '</h2><p>A mark on your own road. Nothing here compares you with anyone.</p><span class="kicker">tap to continue</span></div>'), () => render());
  else setTimeout(() => toast('Milestone · ' + lit[0].name), 600);
}
function viewMilestones() {
  const row = daysInRow(); const lit = MILESTONES.filter(([id]) => S.milestones[id]).length;
  return '<div class="glass stats"><div><b>' + row + '</b><span>' + (row === 1 ? 'day in a row' : 'days in a row') + '</span></div><div><b>' + S.entries.length + '</b><span>' + (S.entries.length === 1 ? 'entry' : 'entries') + '</span></div><div><b>' + careDays() + '</b><span>days of care</span></div></div>' +
    '<div class="glass stats"><div><b>' + wordCount() + '</b><span>words</span></div><div><b>' + S.plants.length + '</b><span>' + (S.plants.length === 1 ? 'plant' : 'plants') + '</span></div><div><b>' + lit + '</b><span>of ' + MILESTONES.length + ' marks</span></div></div>' +
    '<p class="cap">Milestones mark your own road. Nothing here compares you with anyone.</p>' +
    '<div class="miles">' + MILESTONES.map(([id, name, ico]) => { const when = S.milestones[id]; return '<div class="glass mile' + (when ? ' lit' : '') + '"><span class="orb"><span>' + ico + '</span></span><span>' + esc(name) + '</span>' + (when ? '<span class="when">' + esc(fmtDay(when)) + '</span>' : '') + '</div>'; }).join('') + '</div>';
}
function viewThreads() {
  const th = S.plants.slice().sort((a, b) => daysOf(b) - daysOf(a)).map((p) => { const em = face(p); const es = threadEntries(p.emoji); const d = daysOf(p); const ph = phaseOf(d); const nx = nextPhase(d); const last = es[es.length - 1]; const forp = p.forProject ? ' · for ' + p.forProject.title : '';
    return '<button class="glass thread" data-thread="' + esc(p.emoji) + '"><span class="orb' + (d >= 9 ? ' lit' : '') + '"><span>' + esc(em) + '</span></span><span class="grow"><b>' + esc(nameOf(em)) + '</b><span class="cap">' + esc(ph.name) + ' · ' + plural(d, 'day') + ' · ' + plural(es.length, 'entry').replace('entrys', 'entries') + (nx ? ' · ' + esc(nx.name) + ' in ' + plural(nx.day - d, 'day') : ' · ready to give') + esc(forp) + '</span>' + (last && last.text ? '<span class="line">' + esc(last.text) + '</span>' : '') + '</span><span class="arrow">›</span></button>'; }).join('');
  return '<p class="cap">A thread is one emoji, followed through your days. Continue a thread and it grows.</p>' + (th ? '<div class="rows">' + th + '</div>' : '<p class="cap">Plant an emoji and its thread begins here.</p>');
}
function viewFolders() {
  const fl = S.folders.map((f) => { const n = S.entries.filter((e) => e.folder === f.id).length; return '<button class="glass opt" data-folder="' + esc(f.id) + '"><span class="ico">📁</span><span class="grow"><b>' + esc(f.name) + '</b><span>' + plural(n, 'entry').replace('entrys', 'entries') + '</span></span><span class="arrow">›</span></button>'; }).join('');
  return '<button class="btn wide" id="new-folder">+ New folder</button>' + (fl ? '<div class="rows">' + fl + '</div>' : '<p class="cap">Folders hold entries you want to find again: a person, a season, a place. Make one, then file entries into it from any entry.</p>');
}

function youSheet() {
  const col = C.copy.locked.colophon; const d = S.plants.reduce((n, p) => n + daysOf(p), 0);
  const sh = sheet('<div class="hero-sm"><img src="' + LOGO + '" alt="" style="width:88px;height:88px;filter:drop-shadow(0 0 18px rgba(180,255,120,.5))"><h2>' + esc(S.name || 'You') + '</h2><span class="kicker mint">' + esc(S.entries.length + (S.entries.length === 1 ? ' entry' : ' entries') + ' · ' + plural(S.plants.length, 'plant') + ' · ' + plural(d, 'day') + ' of care') + '</span></div>' +
    '<input class="field" id="you-name" placeholder="your name, for the gifts you give" maxlength="40" aria-label="your name" value="' + esc(S.name || '') + '">' +
    '<div class="actions"><button class="btn" id="you-save">Save</button>' + (installEvt || /iphone|ipad|android/i.test(navigator.userAgent) ? '<button class="btn mint" id="you-install">Add Gratus to your phone</button>' : '') + '<button class="btn mint" id="you-passage">Share my Gratus Passage</button><button class="btn" id="you-sun">🔆 Sunlight on Giveth</button><button class="btn" id="you-laws">The twelve laws</button><button class="btn" id="you-export">Export everything</button><label class="btn" id="you-restore">Restore from a file<input type="file" id="you-file" accept="application/json,.json" hidden></label><button class="btn quiet" id="you-reset">Start over on this device</button></div>' +
    '<div class="cap" style="display:grid;gap:4px;padding-top:8px"><b style="color:var(--ink)">' + esc(col.name) + '</b><span>' + esc(col.method) + '</span><span>' + esc(col.date) + ' · <a href="' + esc(col.makerUrl || '#') + '" target="_blank" rel="noopener">' + esc(col.maker) + '</a></span><span style="color:var(--ink-2)">' + esc(col.words) + '</span><span style="color:var(--ink-2)">' + esc(col.close) + '</span><span>Voice recordings stay on this device and are not in the export.</span><span><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></span></div>');
  $('#you-save', sh.el).addEventListener('click', () => { S.name = $('#you-name', sh.el).value.trim(); save(); sh.close(); toast('Saved'); });
  const ins = $('#you-install', sh.el); if (ins) ins.addEventListener('click', () => { sh.close(); promptInstall(); });
  $('#you-laws', sh.el).addEventListener('click', () => { sh.close(); openLaws(); });
  const sn = $('#you-sun', sh.el); if (sn) sn.addEventListener('click', () => { sh.close(); sunSheet(); });
  const pg = $('#you-passage', sh.el); if (pg) pg.addEventListener('click', () => { sh.close(); passageSheet(); });
  $('#you-export', sh.el).addEventListener('click', () => { const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'gratus-' + today() + '.json'; document.body.appendChild(a); a.click(); a.remove(); toast('Exported'); });
  $('#you-file', sh.el).addEventListener('change', (ev) => { const f = ev.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { let o = null; try { o = JSON.parse(rd.result); } catch (e) { o = null; }
    if (!o || o.v !== 1 || !Array.isArray(o.entries) || !Array.isArray(o.plants)) { toast('That file is not a Gratus export.'); return; }
    if (!confirm('Restore ' + o.entries.length + (o.entries.length === 1 ? ' entry' : ' entries') + ' and ' + plural(o.plants.length, 'plant') + '? This replaces what is on this device.')) return;
    const next = Object.assign(fresh(), o, { opens: (S.opens || 0), migrated: true }); for (const k of Object.keys(S)) delete S[k]; Object.assign(S, next); save(); sh.close(); render(); toast('Restored'); };
    rd.readAsText(f); });
  $('#you-reset', sh.el).addEventListener('click', () => { if (confirm('Start over on this device? Everything here will be gone. Export first if you want it.')) { for (const k of Object.keys(localStorage)) if (k.startsWith('gratus.')) localStorage.removeItem(k); location.href = location.pathname.endsWith('.html') ? location.pathname : '/app'; } });
}
function promptInstall() { if (installEvt) { installEvt.prompt(); installEvt = null; return; } const ios = /iphone|ipad|ipod/i.test(navigator.userAgent); sheet('<h2>Add Gratus to your phone</h2><p class="body">' + (ios ? 'In Safari, tap Share, then “Add to Home Screen”.' : 'In Chrome, open the menu (⋮) and choose “Add to Home screen” or “Install app”. Gratus then opens full screen, offline, like any app.') + '</p>'); }
function openLaws() {
  const root = $('#laws'); const laws = Gr.laws(C.prompts.statements); const ord = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  root.innerHTML = '<button class="btn quiet skip" id="laws-x">Close</button>' + laws.map((l, i) => '<section class="law"><span class="kicker mint">' + ord[i] + '</span><h1>' + esc(l) + '</h1></section>').join('') + '<section class="law"><img src="' + LOGO + '" alt="" width="88" height="88"><p class="statement quiet">' + esc(C.copy.locked.colophon.close) + '</p><button class="btn mint" id="laws-done">Keep today</button></section>';
  root.hidden = false; document.body.classList.add('room'); root.scrollTop = 0;
  const close = () => { root.hidden = true; root.innerHTML = ''; document.body.classList.remove('room'); };
  $('#laws-x', root).addEventListener('click', close); $('#laws-done', root).addEventListener('click', () => { close(); go('grow'); });
}
// ═══ THE GRATUS SOUND ═══
//
// Five phases, five notes of one chord: Planted is the root, Nurtured the fifth,
// Deepened the octave, Bloomed the third above it, Ready to Give the fifth above
// it. A plant crossing into a phase sounds its note AND everything underneath it,
// so the chord is built by the growing, not by the app. Giving plays the whole
// chord and lets it fall back to the root alone: what remains after you give.
//
// Nothing here is a recording. It is synthesised, so it costs no bytes, it can be
// tuned by changing a number, and it can never fail to load. It obeys the one
// sound switch the app already has, it is never played on an ordinary tap, and it
// sits under his song rather than over it.
const TONES = [146.83, 220.00, 293.66, 369.99, 440.00]; // D3 · A3 · D4 · F#4 · A4
const TONE_NAMES = ['the root', 'the fifth', 'the octave', 'the third above', 'the fifth above'];
let AC = null;
function audioCtx() {
  if (!S.sound) return null;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext; if (!Ctor) return null;
    if (!AC) AC = new Ctor();
    if (AC.state === 'suspended') AC.resume();
    return AC;
  } catch (e) { return null; }
}
// one struck note with a long tail: a triangle for body, a sine an octave up and
// slightly detuned for shimmer, through a soft lowpass so nothing is ever shrill
function tone(hz, at, dur, peak) {
  const ac = audioCtx(); if (!ac) return;
  const t0 = ac.currentTime + at;
  const o = ac.createOscillator(), o2 = ac.createOscillator();
  const g2 = ac.createGain(), lp = ac.createBiquadFilter(), g = ac.createGain();
  o.type = 'triangle'; o.frequency.value = hz;
  o2.type = 'sine'; o2.frequency.value = hz * 2.004; g2.gain.value = .34;
  lp.type = 'lowpass'; lp.frequency.value = 2100; lp.Q.value = .5;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + .04);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(ac.destination);
  o.start(t0); o2.start(t0); o.stop(t0 + dur + .1); o2.stop(t0 + dur + .1);
}
// the chord as far as this phase: the sound of everything the plant has already been
function soundPhase(i) {
  for (let k = 0; k <= i && k < TONES.length; k++) tone(TONES[k], k * .17, 3.2 - k * .24, .085 - k * .007);
}
function soundNote(i) { if (TONES[i]) tone(TONES[i], 0, 2.4, .085); }
// a word kept: the root alone, quietly
function soundKept() { tone(TONES[0], 0, 1.3, .06); }
// a bloom: root, octave, third — the chord opening
function soundBloom() { [0, 2, 3].forEach((k, i) => tone(TONES[k], i * .13, 3, .075)); }
// given: the chord falls away from the top and the root is what is left
function soundGiven() {
  for (let k = TONES.length - 1; k >= 0; k--) tone(TONES[k], (TONES.length - 1 - k) * .15, 1.5, .06);
  tone(TONES[0], 1.0, 4.2, .095);
}

// the song: his, on every open, one tap to mute. Browsers wait for a touch before sound; the first touch starts it.
function songInit() {
  const a = $('#song'); if (!a) return; a.volume = .55;
  const start = () => { if (!S.sound) return; a.play().catch(() => null); };
  start();
  const once = () => { start(); audioCtx(); document.removeEventListener('pointerdown', once); document.removeEventListener('keydown', once); };
  document.addEventListener('pointerdown', once); document.addEventListener('keydown', once);
  document.addEventListener('visibilitychange', () => { if (document.hidden) a.pause(); else start(); });
}
function toggleSound() { const a = $('#song'); S.sound = !S.sound; save(); if (S.sound) a.play().catch(() => null); else a.pause(); const b = $('#top-sound'); if (b) { b.classList.toggle('on', S.sound); b.innerHTML = S.sound ? I.sound : I.mute; b.setAttribute('aria-label', S.sound ? 'mute the song' : 'play the song'); } toast(S.sound ? 'A Sacred Place, playing' : 'Muted'); }
// the splash: his transition scene, the mark, the name. Once per session, two seconds, tap to pass.
// a kicker that ends a sentence, or asks for a tap, reads as a sentence: bigger, no small caps
const SAY = /[.!?]$|^tap to|· tap to/i;
function sayKickers() { document.querySelectorAll('.kicker:not(.say)').forEach((k) => { if (SAY.test(k.textContent.trim())) k.classList.add('say'); }); }
new MutationObserver(sayKickers).observe(document.body, { childList: true, subtree: true });
// ── the voice: a real recording, kept on the device, and its words through the Gratus voice service ──
let rec = null, recChunks = [], recStart = 0, recTimer = 0, recStream = null;
const fmtDur = (s) => Math.floor((s || 0) / 60) + ':' + pad2((s || 0) % 60);
async function startRec(btn) {
  try { recStream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { toast('Gratus needs the microphone for a voice entry.'); return; }
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
  try { rec = new MediaRecorder(recStream, mime ? { mimeType: mime } : undefined); } catch (e) { toast('Recording is not available here.'); recStream.getTracks().forEach((t) => t.stop()); return; }
  recChunks = []; recStart = Date.now();
  rec.ondataavailable = (ev) => { if (ev.data && ev.data.size) recChunks.push(ev.data); };
  rec.onstop = () => {
    const blob = new Blob(recChunks, { type: rec.mimeType || mime || 'audio/webm' }); const dur = Math.round((Date.now() - recStart) / 1000);
    recStream.getTracks().forEach((t) => t.stop()); rec = null; clearTimeout(recTimer);
    const b = $('#voice'); if (b) { b.classList.remove('on'); b.innerHTML = I.mic + ' Voice'; }
    if (dur < 1 || !blob.size) { toast('Too short to keep.'); return; }
    draft.voice = blob; draft.voiceDur = dur; showVoice(); transcribe(blob);
  };
  rec.start(); btn.classList.add('on'); btn.innerHTML = I.mic + ' Recording · tap to stop'; toast('Listening');
  recTimer = setTimeout(stopRec, 120000);
}
function stopRec() { if (rec && rec.state !== 'inactive') rec.stop(); }
function showVoice() { const v = $('#voiceprev'); if (!v) return; if (!draft.voice) { v.hidden = true; return; } v.hidden = false; const k = $('.kicker', v); if (k) k.textContent = 'Your voice · ' + fmtDur(draft.voiceDur); const a = $('#voice-audio', v); if (a) a.src = URL.createObjectURL(draft.voice); }
async function transcribe(blob) {
  toast('Listening back');
  try {
    const r = await fetch('/api/voice', { method: 'POST', headers: { 'Content-Type': blob.type || 'audio/webm', 'X-Gratus': 'voice' }, body: blob });
    const j = r.ok ? await r.json() : null; const text = j && j.text; if (!text) throw new Error('no words');
    const w = $('#write'); const cur = (w ? w.value : draft.text).trim(); draft.text = (cur + (cur ? ' ' : '') + text).trim(); if (w) w.value = draft.text; toast('Heard you');
  } catch (e) { toast('Kept the recording. The words can come later.'); }
}
function splash(then) {
  const el = $('#splash'); if (!el) { then(); return; }
  let gone = false, started = false;
  const out = () => { if (gone) return; gone = true; el.classList.add('out'); setTimeout(() => { el.hidden = true; el.innerHTML = ''; }, 1500); if (!started) { started = true; then(); } };
  if (!motionOk()) { el.innerHTML = '<div class="brandrow"><img class="mark" src="' + LOGO + '" alt=""><span class="brandname" style="font-size:44px;line-height:48px">Gratus.CC</span><span class="kicker mint">Grow Gratus Give</span></div>'; el.hidden = false; setTimeout(out, 1200); el.addEventListener('click', out); return; }
  el.innerHTML = '<video class="explode" muted playsinline preload="auto" poster="' + GFX('explode-poster.jpg') + '"><source src="' + GFX('explode.mp4') + '#t=11" type="video/mp4"></video><div class="white"></div><div class="brandrow ritual"><img class="mark" src="' + LOGO + '" alt=""><span class="brandname" style="font-size:44px;line-height:48px">Gratus.CC</span><span class="kicker mint">Grow Gratus Give</span></div><span class="kicker skiphint">tap to enter</span>';
  el.hidden = false; const v = el.querySelector('video'); let flooded = false;
  const flood = () => { if (flooded || gone) return; flooded = true; const w = el.querySelector('.white'), r = el.querySelector('.ritual'); if (w) w.classList.add('on'); if (r) r.classList.add('lit'); setTimeout(out, 2600); };
  v.addEventListener('ended', flood); v.addEventListener('timeupdate', () => { if (v.currentTime >= 24.4) flood(); }); v.addEventListener('error', out);
  const hard = setTimeout(flood, 16000);
  el.addEventListener('click', () => { clearTimeout(hard); out(); });
  v.currentTime = 11; v.play().catch(() => setTimeout(out, 1200));
}

// ── wiring per render ──
function wire() {
  $$('[data-p]').forEach((b) => b.addEventListener('click', () => { const p = S.plants.find((x) => x.id === b.dataset.p); if (p) arcSheet(face(p)); }));
  $$('[data-e]').forEach((b) => b.addEventListener('click', () => entrySheet(S.entries.find((x) => x.id === b.dataset.e))));
  const qk = $('#quick'); if (qk) qk.addEventListener('submit', (ev) => { ev.preventDefault(); draft.text = $('#quick-in').value.trim(); go('grow'); setTimeout(() => { const w = $('#write'); if (w) { w.focus(); w.scrollIntoView({ block: 'center' }); } }, 350); });
  const fp = $('#first-plant'); if (fp) fp.addEventListener('click', () => go('grow'));
  const hm = $('#home-menu'); if (hm) hm.addEventListener('click', menuSheet);
  const wt = $('#write-today'); if (wt) wt.addEventListener('click', () => { go('grow'); setTimeout(() => { const w = $('#write'); if (w) { w.focus(); w.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }, 120); });
  const oj = $('#open-journal'); if (oj) oj.addEventListener('click', () => { jTab = 'entries'; go('gratus', 'book'); });
  const ogd = $('#open-garden'); if (ogd) ogd.addEventListener('click', () => go('gratus', 'garden'));
  { const b1 = $('#open-vibes'); if (b1) b1.addEventListener('click', () => go('gratus', 'vibes')); const b2 = $('#open-guides'); if (b2) b2.addEventListener('click', () => go('gratus', 'guides')); }
  const ogf = $('#open-gifts'); if (ogf) ogf.addEventListener('click', (ev) => { if (ev.target.closest('#send-gift')) return; go('give'); });
  const sg = $('#send-gift'); if (sg) sg.addEventListener('click', (ev) => { ev.stopPropagation(); go('give'); setTimeout(() => giveSheet(null), 400); });
  const ob = $('#open-book'); if (ob) ob.addEventListener('click', () => go('gratus', 'book'));
  const og = $('#open-galaxy'); if (og) og.addEventListener('click', () => go('gratus', 'galaxy'));
  const ae = $('#all-entries'); if (ae) ae.addEventListener('click', () => { const sh = sheet('<h2>All entries</h2><div class="rows">' + S.entries.slice().reverse().map(entryCard).join('') + '</div>'); $$('[data-e]', sh.el).forEach((b) => b.addEventListener('click', () => { sh.close(); entrySheet(S.entries.find((x) => x.id === b.dataset.e)); })); });
  const w = $('#write'); if (w) w.addEventListener('input', () => { draft.text = w.value; });
  $$('[data-pick]').forEach((b) => b.addEventListener('click', () => { draft.emoji = draft.emoji === b.dataset.pick ? null : b.dataset.pick; $$('[data-pick]').forEach((x) => x.classList.toggle('on', x.dataset.pick === draft.emoji)); }));
  const pm = $('#pick-more'); if (pm) pm.addEventListener('click', () => { const pk = $('#pick'); if (!pk) return; const open = pk.classList.toggle('open'); pm.textContent = open ? 'Show fewer' : 'Show every emoji'; });
  const pa = $('#pick-any'); if (pa) pa.addEventListener('click', () => { const sh = sheet('<h2>Any emoji</h2><p class="body">Type or paste one. It joins your palette when you plant it.</p><input class="field" id="any-in" placeholder="🌱" aria-label="an emoji"><button class="btn mint" id="any-go">Use it</button>', { autofocus: true }); $('#any-go', sh.el).addEventListener('click', () => { const e = Gr.firstEmoji($('#any-in', sh.el).value); if (!e) { toast('An emoji'); return; } if (!palette().includes(e)) S.my.emojis.push(e); draft.emoji = e; draft.text = $('#write') ? $('#write').value : draft.text; save(); sh.close(); render(); }); });
  $$('[data-tag]').forEach((b) => b.addEventListener('click', () => { const t = b.dataset.tag; draft.tags = draft.tags.includes(t) ? draft.tags.filter((x) => x !== t) : draft.tags.concat([t]); b.classList.toggle('on', draft.tags.includes(t)); }));
  const ta = $('#tag-any'); if (ta) ta.addEventListener('click', () => { const t = prompt('A tag'); if (t && t.trim()) { draft.tags.push(t.trim().slice(0, 24)); draft.text = $('#write') ? $('#write').value : draft.text; render(); } });
  const ph = $('#photo'); if (ph) ph.addEventListener('change', (ev) => { const f = ev.target.files[0]; if (!f) return; const img = new Image(); const url = URL.createObjectURL(f); img.onload = () => { const s = Math.min(1, 360 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); draft.photo = c.toDataURL('image/jpeg', .72); URL.revokeObjectURL(url); const pv = $('#photoprev'); pv.hidden = false; pv.innerHTML = '<img src="' + draft.photo + '" alt=""><button class="chip" id="photo-rm">remove</button>'; $('#photo-rm').addEventListener('click', () => { draft.photo = null; pv.hidden = true; pv.innerHTML = ''; }); }; img.src = url; });
  const vc = $('#voice'); if (vc) vc.addEventListener('click', () => { if (rec) stopRec(); else startRec(vc); });
  const vd = $('#voice-drop'); if (vd) vd.addEventListener('click', () => { draft.voice = null; draft.voiceDur = 0; showVoice(); });
  if (draft.voice) showVoice();
  const pl = $('#plant'); if (pl) pl.addEventListener('click', plantNow);
  const gpst = $('#goal-post'); if (gpst) gpst.addEventListener('click', () => { const t = $('#goal-in').value.trim(); if (!t) { toast('A goal, in your words.'); return; } addGoal(t); });
  const gin = $('#goal-in'); if (gin) gin.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); $('#goal-post').click(); } });
  $$('[data-goal-x]').forEach((b) => b.addEventListener('click', () => { S.goals = S.goals.filter((g) => g.id !== b.dataset.goalX); save(); render(); }));
  if (tab === 'grow' && !sub && feedState === 'idle') loadFeed();
  const jq = $('#j-q'); if (jq) jq.addEventListener('click', () => { qOffset++; render(); });
  const jw = $('#j-write'); if (jw) jw.addEventListener('click', () => { draft.text = draft.text || ''; go('grow'); setTimeout(() => { const w = $('#write'); if (w) { w.focus(); w.scrollIntoView({ block: 'center' }); } }, 350); });
  const js = $('#j-search'); if (js) js.addEventListener('input', () => { journalQuery = js.value; const v = js.value; render(); const n = $('#j-search'); if (n) { n.focus(); n.setSelectionRange(v.length, v.length); } });
  const gg = $('#give-gift'); if (gg) gg.addEventListener('click', () => giveSheet(null));
  const gp = $('#give-project'); if (gp) gp.addEventListener('click', () => go('give', 'projects'));
  const gvd = $('#give-giveth'); if (gvd) gvd.addEventListener('click', () => go('give', 'giveth'));
  $$('[data-gv]').forEach((b) => b.addEventListener('click', () => projectSheet(b.dataset.gv)));
  $$('[data-gvlane]').forEach((b) => b.addEventListener('click', () => { gvLane = b.dataset.gvlane; gvState = 'idle'; gvList = null; render(); }));
  $$('[data-gvcat]').forEach((b) => b.addEventListener('click', () => { gvCat = b.dataset.gvcat; gvState = 'idle'; gvList = null; render(); }));
  const gvm = $('#gv-more'); if (gvm) gvm.addEventListener('click', () => { gvSkip = (gvList || []).length; gvm.textContent = 'Reading Giveth...'; loadGiveth(true); });
  const gvs = $('#gv-search'); if (gvs) { gvs.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { gvSearch = gvs.value.trim(); gvState = 'idle'; gvList = null; render(); } }); gvs.addEventListener('search', () => { gvSearch = gvs.value.trim(); gvState = 'idle'; gvList = null; render(); }); }
  const gvl = $('#gv-learn'); if (gvl) gvl.addEventListener('click', givethLearnSheet);
  const gvc = $('#gv-console'); if (gvc) gvc.addEventListener('click', () => go('give', 'console'));
  $$('[data-seed]').forEach((b) => b.addEventListener('click', () => mySeedSheet(b.dataset.seed)));
  const cs = $('#con-slug'); if (cs) cs.addEventListener('input', () => { conSlug = cs.value.trim().toLowerCase(); });
  const ck = $('#con-key'); if (ck) ck.addEventListener('input', () => { conKey = ck.value.trim(); });
  const co = $('#con-open'); if (co) co.addEventListener('click', conLoad);
  const cl = $('#con-claim'); if (cl) cl.addEventListener('click', conClaim);
  $$('[data-water]').forEach((b) => b.addEventListener('click', () => waterSheet(b.dataset.water)));
  $$('[data-flow]').forEach((b) => b.addEventListener('click', () => { go('give', 'giveth'); setTimeout(() => projectSheet(b.dataset.flow), 300); }));
  $$('[data-similar]').forEach((b) => b.addEventListener('click', () => similarSheet(b.dataset.similar)));
  const gw = $('#give-world'); if (gw) gw.addEventListener('click', () => go('give', 'world'));
  $$('[data-given]').forEach((b) => b.addEventListener('click', () => { const g = S.gifts.given.find((x) => x.id === b.dataset.given); if (g) shareSheet(g); }));
  $$('[data-cat]').forEach((b) => b.addEventListener('click', () => { projFilter = b.dataset.cat; render(); }));
  const de = $('#door-earth'); if (de) de.addEventListener('click', () => go('give', 'earth'));
  const dv = $('#door-vault'); if (dv) dv.addEventListener('click', () => go('give', 'vault'));
  $$('[data-scope]').forEach((b) => b.addEventListener('click', () => { wishScope = b.dataset.scope; $$('[data-scope]').forEach((x) => x.classList.toggle('on', x === b)); }));
  const ws = $('#wish-send'); if (ws) ws.addEventListener('click', () => { const t = $('#wish').value.trim(); if (!t) { toast('A wish, in your words.'); return; } S.wishes.push({ id: newId('w'), text: t.slice(0, 300), scope: wishScope, at: today() }); save(); render(); toast('Sent to tomorrow.'); });
  $$('[data-node]').forEach((b) => b.addEventListener('click', () => { const n = b.dataset.node; if (n === 'give') go('give'); else go('give', n); }));
  $$('[data-book]').forEach((b) => b.addEventListener('click', () => { bookTab = b.dataset.book; render(); }));
  $$('[data-jt]').forEach((b) => b.addEventListener('click', () => { jTab = b.dataset.jt; render(); }));
  $$('[data-calday]').forEach((b) => { b.addEventListener('click', () => { jDay = jDay === b.dataset.calday ? '' : b.dataset.calday; render(); }); longPress(b, { on: () => daySheet(b.dataset.calday) }); });
  $$('[data-calmove]').forEach((b) => b.addEventListener('click', () => { jMonth = Math.min(0, jMonth + Number(b.dataset.calmove)); jDay = ''; render(); }));
  $$('[data-jemoji]').forEach((b) => b.addEventListener('click', () => { jEmoji = jEmoji === b.dataset.jemoji ? '' : b.dataset.jemoji; render(); }));
  $$('[data-jtag]').forEach((b) => b.addEventListener('click', () => { jTag = jTag === b.dataset.jtag ? '' : b.dataset.jtag; render(); }));
  $$('[data-jfolder]').forEach((b) => b.addEventListener('click', () => { jFolder = jFolder === b.dataset.jfolder ? '' : b.dataset.jfolder; render(); }));
  const jc = $('#j-clear'); if (jc) jc.addEventListener('click', () => { jDay = jEmoji = jTag = jFolder = journalQuery = ''; jStar = false; render(); });
  const js2 = $('#j-star'); if (js2) js2.addEventListener('click', () => { jStar = !jStar; render(); });
  $$('[data-gfilter]').forEach((b) => b.addEventListener('click', () => { gardenFilter = b.dataset.gfilter; render(); }));
  { const on = (id, fn) => { const b = $(id); if (b) b.addEventListener('click', fn); };
    on('#gd-write', () => quickWrite()); on('#gd-book', () => go('gratus', 'book')); on('#gd-vibes', () => go('gratus', 'vibes'));
    on('#gd-giveth', () => go('give', 'giveth')); on('#gd-laws', openLaws); }
  $$('[data-vopen]').forEach((b) => b.addEventListener('click', () => loadVibe(b.dataset.vopen)));
  { const mk = $('#vb-make'); if (mk) mk.addEventListener('click', makeVibeSheet);
    const jn = $('#vb-join'); if (jn) jn.addEventListener('click', () => { const c = ($('#vb-code').value || '').trim().toUpperCase(); if (!c) { toast('A code.'); return; } if (!S.vibes.some((x) => x.code === c)) { S.vibes.push({ code: c, name: c, emoji: '✦' }); save(); } loadVibe(c); });
    const sv = $('#vb-share'); if (sv && vibeNow) sv.addEventListener('click', () => shareOrCopy('Come into ' + vibeNow.name, 'A Gratus Vibe. The code is ' + vibeNow.code, location.origin + '/app/vibes?code=' + vibeNow.code).then((ok) => toast(ok === 'shared' ? 'Shared' : 'Link copied')));
    const lv = $('#vb-leave'); if (lv && vibeNow) lv.addEventListener('click', () => { S.vibes = S.vibes.filter((x) => x.code !== vibeNow.code); save(); vibeNow = null; vibeState = 'idle'; render(); toast('Left the room. The code still works.'); });
    let vEmoji = null;
    $$('[data-vpick]').forEach((b) => b.addEventListener('click', () => { vEmoji = vEmoji === b.dataset.vpick ? null : b.dataset.vpick; $$('[data-vpick]').forEach((x) => x.classList.toggle('on', x.dataset.vpick === vEmoji)); }));
    const po = $('#vb-post'); if (po) po.addEventListener('click', async () => {
      const t = ($('#vb-text').value || '').trim(); if (!t) { toast('A few words.'); return; }
      po.disabled = true; po.textContent = 'Saying...';
      try {
        const r = await fetch('/api/vibes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ act: 'post', code: vibeNow.code, text: t, name: S.name || '', emoji: vEmoji || '✦' }) });
        const d = await r.json().catch(() => ({})); if (!r.ok || !d.vibe) throw new Error(d.error || 'refused');
        vibeNow = d.vibe; render(); toast('Said');
      } catch (e) { po.disabled = false; po.textContent = 'Say it ✦'; toast(String(e.message || e)); }
    }); }
  $$('[data-gview]').forEach((b) => b.addEventListener('click', () => { gardenView = b.dataset.gview; render(); }));
  $$('[data-gsort]').forEach((b) => b.addEventListener('click', () => { gardenSort = b.dataset.gsort; render(); }));
  const tn = $('#tend-now'); if (tn) tn.addEventListener('click', () => { const next = S.plants.filter((p) => !(p.kept || []).includes(today())).sort((a, b) => daysOf(b) - daysOf(a))[0]; quickWrite(next ? { emoji: face(next) } : null); });
  $$('[data-thread]').forEach((b) => b.addEventListener('click', () => threadSheet(b.dataset.thread)));
  $$('[data-folder]').forEach((b) => b.addEventListener('click', () => { const f = folderOf(b.dataset.folder); if (f) folderSheet(f); }));
  const nf = $('#new-folder'); if (nf) nf.addEventListener('click', () => newFolder());
  $$('[data-arc]').forEach((b) => b.addEventListener('click', () => arcSheet(b.dataset.arc)));
  $$('[data-chain]').forEach((b) => b.addEventListener('click', () => { const ch = C.evo.chains.find((x) => x.id === b.dataset.chain); arcSheet(ch.stages[0].emoji); }));
  $$('[data-rcat]').forEach((b) => b.addEventListener('click', () => { recipeCat = b.dataset.rcat; render(); }));
  $$('[data-recipe]').forEach((b) => b.addEventListener('click', () => { const r = allRecipes().find((x) => x.id === b.dataset.recipe); if (r) recipeSheet(r); }));
  const ar = $('#add-recipe'); if (ar) ar.addEventListener('click', addRecipeSheet);
  const ae2 = $('#add-emoji'); if (ae2) ae2.addEventListener('click', () => { const e = Gr.firstEmoji($('#new-emoji').value); if (!e) { toast('An emoji'); return; } if (!palette().includes(e)) S.my.emojis.push(e); save(); render(); toast(e + ' is in your palette.'); });
}

// ── boot ──
async function boot() {
  const [evo, names, prompts, copy, book, recipes, alchemy] = await Promise.all(['evolutions', 'emoji-names', 'prompts', 'copy', 'growth-book', 'recipes', 'alchemy'].map((n) => fetch('/config/' + n + '.json?v=16').then((r) => r.json())));
  C = { evo, names, prompts, copy, book, recipes, alchemy }; load(); stars(); songInit();
  if ('serviceWorker' in navigator && !location.search.includes('dev=1')) navigator.serviceWorker.register('/sw.js').catch(() => null);
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; });
  $$('.tabs button[data-tab]').forEach((b) => b.addEventListener('click', () => go(b.dataset.tab)));
  window.addEventListener('popstate', () => { if (room) closeRoom(true); if (!$('#laws').hidden) { $('#laws').hidden = true; document.body.classList.remove('room'); } render(); });
  const q = new URLSearchParams(location.search).get('tab'); const m = /^\/app\/?(\w+)?/.exec(location.pathname); const want = q || (m && m[1]) || 'gratus';
  const SUBS = ['book', 'projects', 'world', 'vault', 'earth', 'galaxy', 'garden', 'giveth', 'console', 'guides', 'vibes'];
  if (SUBS.includes(want)) { tab = ['book', 'galaxy', 'garden', 'guides', 'vibes'].includes(want) ? 'gratus' : 'give'; sub = want; } else if (['grow', 'gratus', 'give'].includes(want)) tab = want;
  const isGift = location.pathname === '/gift' || location.pathname.endsWith('gift.html') || location.hash.startsWith('#gift');
  const isPassage = location.pathname === '/passage';
  const projPage = /^\/p\/([a-z0-9:-]+)/.exec(location.pathname);
  try { const k = JSON.parse(localStorage.getItem(GVK) || 'null'); if (k) { conSlug = k.slug || ''; conKey = k.key || ''; } } catch (e) {}
  const start = () => { render(); booted = true; setTimeout(checkBloom, 1500); setTimeout(checkBloom, 12000);
    if (isPassage) { const c = location.hash.replace(/^#/, ''); const g = c ? decodeGift(c) : null; if (g) { openPassage(g, false); return; } toast('That Passage link is incomplete.'); }
    if (projPage) { openProjectPage(projPage[1]); return; }
    const vc = new URLSearchParams(location.search).get('code');
    if (vc && sub === 'vibes') { const c = vc.trim().toUpperCase(); if (!S.vibes.some((x) => x.code === c)) { S.vibes.push({ code: c, name: c, emoji: '\u2726' }); save(); } loadVibe(c); }
    else if (S.vibes.length && sub === 'vibes') loadVibe(S.vibes[0].code, true); if (isGift) { const code = location.hash.replace(/^#(gift=)?/, ''); const g = code ? decodeGift(code) : null; openJourney(g || DEMO_GIFT, { routed: true, preview: !g }); } };
  if (new URLSearchParams(location.search).has('nosplash')) start(); else splash(start);
}
boot().catch((e) => { console.error(e); const el = document.createElement('div'); el.className = 'noscript'; el.innerHTML = '<h2>Gratus could not open.</h2><p class="lead">' + esc(e && e.message || e) + '</p>'; document.body.appendChild(el); });
