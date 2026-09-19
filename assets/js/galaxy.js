// ═══════════════════════════════════════════════════════════════════
// GRATUS.CC — Grow · Gratus · Give. His scenes behind glass, one per screen, another each time the
// app opens. The emoji garden, the entries, the recipes, the Growth Book, and the whole first-gift
// journey. Everything lives on the device for now; the backend comes later. A gift travels inside
// its own link, so the journey works with no server at all.
// ═══════════════════════════════════════════════════════════════════
import * as Gr from '../../engine/gratus.js?v=12';
import * as E from '../../engine/emoji.js?v=12';
import { newId } from '../../engine/rng.js?v=12';
import { esc, $, $$, sheet, toast, fmtDay } from './ui.js?v=12';

const KEY = 'gratus.galaxy.v1';
const GFX = (n) => '/assets/art/gfx/' + n;
const LOGO = GFX('logo.png');
let C = {}, S = null, tab = 'gratus', sub = null, room = null, installEvt = null;

// ── his scenes, by screen. A name starting with v is a video (poster beside it). ──
const SCENES = {
  home: ['dlong', 'dhold', 'g29', 'v2', 'g15', 'd2', 'g11', 'v1', 'g12', 'g05'], grow: ['v3', 'g08', 'd2', 'v1', 'g06', 'g10', 'g16', 'g09'], give: ['g13', 'd2', 'g14', 'g30', 'dhold', 'g09', 'g12'],
  book: ['v1', 'g16', 'g03', 'g20', 'v3', 'g07', 'g24', 'g26', 'g25', 'g27'], galaxy: ['g15', 'v2', 'g05'], vault: ['g17', 'v2', 'g18'], earth: ['g23', 'v3', 'g19', 'g21'], world: ['dlong', 'g14', 'g23'], projects: ['g23', 'v1', 'g19'], goals: ['g14', 'g23', 'g04'],
  journey: ['g13', 'dhold', 'g13', 'dlong', 'g20', 'g07', 'g19', 'v2'], ceremony: ['g22', 'g05', 'g03'], garden: ['g11', 'g27', 'g24', 'g25']
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
  if (name[0] === 'v' || name[0] === 'd') { const poster = GFX(name + '-poster.jpg'); layer.style.backgroundImage = 'url(' + poster + ')'; if (motionOk()) layer.innerHTML = '<video autoplay muted loop playsinline poster="' + poster + '" aria-hidden="true"><source src="' + GFX(name + '.mp4') + '" type="video/mp4"></video>'; }
  else layer.style.backgroundImage = 'url(' + GFX(name + '.jpg') + ')';
  root.appendChild(layer); setTimeout(() => layer.classList.add('in'), 40);
  setTimeout(() => old.forEach((o) => o.remove()), 1600);
}
const I = {
  user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z"/></svg>',
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
function fresh() { return { v: 1, name: '', entries: [], plants: [], gifts: { given: [], received: [] }, my: { emojis: [], recipes: [] }, wishes: [], goals: [], sound: true, made: {}, opens: 0, migrated: false }; }
function load() {
  try { S = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { S = null; }
  if (!S || S.v !== 1) S = fresh();
  if (!Array.isArray(S.goals)) S.goals = []; if (S.sound == null) S.sound = true;
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
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
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
function go(t, s) { tab = t; sub = s || null; const path = '/app' + (sub ? '/' + sub : (tab === 'gratus' ? '' : '/' + tab)); if (location.pathname.endsWith('.html')) history.replaceState(null, '', location.pathname + '?tab=' + (sub || tab)); else history.replaceState(null, '', path); render(); window.scrollTo({ top: 0 }); }
function render() {
  const root = $('#view'); let s = '';
  if (sub === 'book') s = topBar({ back: true }) + viewBook();
  else if (sub === 'projects') s = topBar({ back: true }) + viewProjects();
  else if (sub === 'world') s = topBar({ back: true }) + viewWorld();
  else if (sub === 'vault') s = topBar({ back: true }) + viewVault();
  else if (sub === 'earth') s = topBar({ back: true }) + viewEarth();
  else if (sub === 'galaxy') s = topBar({ back: true }) + viewGalaxy();
  else if (tab === 'grow') s = topBar() + viewGrow();
  else if (tab === 'give') s = topBar() + viewGive();
  else s = topBar({ home: true }) + viewGratus();
  root.innerHTML = s; choreograph();
  if (tab === 'gratus' && !sub) { const t = $('.top'); if (t) t.querySelector('.left').style.visibility = 'hidden'; }
  $$('.tabs button[data-tab]').forEach((b) => { b.classList.toggle('on', b.dataset.tab === tab && !sub); });
  const back = $('#top-back'); if (back) back.addEventListener('click', () => go(sub === 'vault' || sub === 'earth' ? 'give' : tab, sub === 'vault' || sub === 'earth' ? 'world' : null));
  $('#top-you').addEventListener('click', youSheet);
  $('#top-sound').addEventListener('click', toggleSound);
  wire();
}

// ── GRATUS · the home: his mock, then the garden ──
function viewGratus() {
  const plants = S.plants.filter((p) => !p.private).slice().sort((a, b) => daysOf(b) - daysOf(a));
  const n = plants.length; const c = Math.min(30, 150 / Math.sqrt(Math.max(1, n)));
  const orbs = plants.map((p, i) => { const r = i ? 34 + c * Math.sqrt(i) : 0; const a = i * Gr.GOLDEN * Math.PI / 180; const d = daysOf(p); return '<button class="orb p' + phaseIndex(d) + (d && (p.kept || []).includes(today()) ? ' lit' : '') + '" data-p="' + esc(p.id) + '" style="left:calc(50% + ' + (r * Math.cos(a)).toFixed(1) + 'px);top:calc(50% + ' + (r * Math.sin(a)).toFixed(1) + 'px);--h:' + (phaseIndex(d) >= 4 ? '#F2C97D' : '#6ED9C0') + '" aria-label="' + esc(nameOf(face(p)) + ', ' + plural(d, 'day')) + '"><span>' + esc(face(p)) + '</span></button>'; }).join('');
  const entries = S.entries.slice().reverse();
  const low = '<p class="statement in" style="--i:2">Gratitude Changes Everything.</p>' +
    '<form class="pillform in" style="--i:3" id="quick"><input id="quick-in" placeholder="What are you grateful for today?" aria-label="What are you grateful for today?" autocomplete="off"><button class="go" type="submit" aria-label="plant it">→</button></form>' +
    '<span class="kicker in" style="--i:4">A small moment.</span><span class="kicker in" style="--i:4">A brighter tomorrow.</span>';
  return hero(scene('home'), { cls: 'home', brand: 'A kinder world grows from here.', low }) +
    '<div class="page">' +
    '<div class="glass stats in"><div><b>' + S.entries.length + '</b><span>Entries</span></div><div><b>' + S.plants.length + '</b><span>Plants</span></div><div><b>' + (S.gifts.given.length + S.gifts.received.length) + '</b><span>Gifts</span></div></div>' +
    '<div class="eyebrow"><h2>Your Gratitude Garden</h2>' + (n ? '<span class="more">' + plural(n, 'plant') + '</span>' : '') + '</div>' +
    '<div class="glass garden">' + art(scene('garden')) + (n ? orbs : '<div class="empty-note"><span class="orb lg empty"><span>+</span></span><p class="cap">Moments take root. Gratitude grows. A kinder world blooms.</p><button class="btn mint" id="first-plant">Plant My Gratus 🌱</button></div>') + '</div>' +
    (n ? '<p class="kicker" style="text-align:center">Gratitude turns moments into movement.</p>' : '') +
    '<button class="glass opt" id="open-book"><span class="ico">📖</span><span class="grow"><b>The Gratus Growth Book</b><span>Your gratitude journal, by day. The phases, the emojis, the recipes.</span></span><span class="arrow">›</span></button>' +
    (S.gifts.received.length ? '<div class="eyebrow"><h2>Gifts received</h2></div><div class="rows">' + S.gifts.received.slice().reverse().slice(0, 3).map((g) => '<div class="glass opt"><span class="ico">' + esc(g.emoji) + '</span><span class="grow"><b>From ' + esc(g.from || 'someone') + '</b><span>' + esc(plural(g.days, 'day')) + ' · ' + esc(fmtDay(g.at)) + '</span></span></div>').join('') + '</div>' : '') +
    (entries.length ? '<div class="eyebrow"><h2>Entries</h2>' + (entries.length > 4 ? '<button class="more" id="all-entries">All ' + entries.length + '</button>' : '') + '</div><div class="rows">' + entries.slice(0, 4).map(entryCard).join('') + '</div>' : '') +
    '<button class="glass opt" id="open-galaxy"><span class="ico"><img src="' + LOGO + '" alt="" style="width:30px;height:30px"></span><span class="grow"><b>The Gratus Galaxy</b><span>People · Projects · A brighter planet.</span></span><span class="arrow">›</span></button>' +
    '</div>';
}
function entryCard(e) {
  return '<button class="glass entry" data-e="' + esc(e.id) + '"><span class="thumb">' + (e.photo ? '<img src="' + e.photo + '" alt="">' : esc(e.emoji || '✦')) + '</span><span style="display:grid;gap:6px;min-width:0"><span class="kicker">' + esc(e.day === today() ? 'Today · ' : '') + esc(fmtDay(e.day)) + '</span><span class="text">' + esc(e.text || '(an emoji, no words)') + '</span>' + (e.tags && e.tags.length ? '<span class="tags">' + e.tags.map((t) => '<span>' + esc(t) + '</span>').join('') + '</span>' : '') + '</span></button>';
}

// ── GROW · plant today ──
let draft = { text: '', emoji: null, tags: [], photo: null };
function viewGrow() {
  const pal = palette();
  return hero(scene('grow'), { h1: 'Grow', k1: 'Plant Today', k2: 'A Brighter Tomorrow', low: '<p class="statement in" style="--i:2">What are you grateful for today?</p>' }) +
    '<div class="page">' +
    '<div class="glass card">' +
    '<textarea class="field" id="write" rows="3" placeholder="Start your gratitude entry..." aria-label="your gratitude entry">' + esc(draft.text) + '</textarea>' +
    '<div class="tools"><span class="chip on">' + I.text + ' Text</span><label class="chip" id="photo-chip">' + I.cam + ' Photo<input type="file" id="photo" accept="image/*" hidden></label>' + ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window ? '<button class="chip" id="voice">' + I.mic + ' Voice</button>' : '') + '</div>' +
    '<div class="photoprev" id="photoprev" hidden></div>' +
    '<span class="kicker mint">The emoji you are planting</span>' +
    '<div class="pick" id="pick">' + pal.map((e) => '<button class="orb' + (draft.emoji === e ? ' on' : '') + '" data-pick="' + esc(e) + '" aria-label="' + esc(nameOf(e)) + '"><span>' + esc(e) + '</span></button>').join('') + '<button class="orb empty" id="pick-any" aria-label="any emoji"><span>+</span></button></div>' +
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
  const t = today(); const e = { id: newId('e'), day: t, at: new Date().toISOString(), text, emoji, tags: draft.tags.slice(), photo: draft.photo };
  S.entries.push(e);
  let p = emoji ? plantFor(emoji) : null; let isNew = false; const before = p ? face(p) : null;
  if (emoji && !p) { p = { id: newId('p'), emoji, planted: t, kept: [], carried: 0, origin: 'planted', from: null }; S.plants.push(p); isNew = true; }
  if (p && !p.kept.includes(t)) p.kept.push(t);
  const made = [];
  for (const r of allRecipes()) { if (S.made[r.id]) continue; const st = recipeState(r); if (st.made) { S.made[r.id] = t; made.push(r); if (!plantFor(r.result)) S.plants.push({ id: newId('p'), emoji: r.result, planted: t, kept: [t], carried: 0, origin: 'recipe', from: r.name }); } }
  save(); draft = { text: '', emoji: null, tags: [], photo: null };
  const after = p ? face(p) : null; const d = p ? daysOf(p) : 0; const ph = p ? phaseOf(d) : null;
  const seq = [];
  if (p && before && after !== before) seq.push('<div class="cer"><span class="big">' + esc(after) + '</span><span class="kicker mint">' + esc(before + ' → ' + after) + '</span><h2>' + esc(nameOf(after)) + '</h2><p class="lead">' + esc((E.stage(p.emoji, d, C.evo) || {}).line || '') + '</p><span class="kicker">tap to continue</span></div>');
  else if (p) seq.push('<div class="cer"><span class="big">' + esc(after) + '</span><h2>' + esc(isNew ? 'Planted.' : ph.name + '.') + '</h2><p class="lead">' + esc(nameOf(after)) + ' · ' + esc(plural(d, 'day')) + '. ' + esc(ph.meaning) + '</p>' + (nextPhase(d) ? '<span class="kicker mint">' + esc(nextPhase(d).name + ' in ' + plural(nextPhase(d).day - d, 'day')) + '</span>' : '<span class="kicker gold">Ready to give</span>') + '<span class="kicker">tap to continue</span></div>');
  else seq.push('<div class="cer"><span class="big">✦</span><h2>Kept.</h2><p class="lead">A moment of gratitude has a place now.</p><span class="kicker">tap to continue</span></div>');
  for (const r of made) seq.push('<div class="cer"><span class="big">' + esc(r.result) + '</span><span class="kicker mint">' + esc(r.formula.join(' + ') + ' → ' + r.result) + '</span><h2>' + esc(r.name) + '</h2><p class="lead">' + esc(r.statement) + '</p><span class="kicker">a recipe came together · tap to continue</span></div>');
  playCeremonies(seq, () => { go('gratus'); });
}
function playCeremonies(list, done) {
  const root = $('#ceremony'); let k = 0; let gate = motionOk();
  const next = () => {
    const html = list.shift(); if (!html) { root.hidden = true; root.innerHTML = ''; if (done) done(); return; }
    root.hidden = false; root.onclick = null;
    const show = () => { root.innerHTML = art(scene('ceremony', k++)) + '<div class="flash on"></div>' + html.replace('<div class="cer">', '<div class="cer reveal">'); let t = 0; const close = () => { clearTimeout(t); root.onclick = null; next(); }; root.onclick = close; t = setTimeout(close, 5600); };
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
    '<button class="glass opt" id="give-gift"><span class="ico gold">' + I.heart + '</span><span class="grow"><b>Give a Gratus Gift</b><span>Turn your gratitude into a gift for someone else.</span></span><span class="arrow">›</span></button>' +
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
function viewJournal() {
  const t = today(); const pool = Gr.questionPool(C.prompts); const q = Gr.question(pool, t + ':j', qOffset);
  const days = new Set(S.entries.map((e) => e.day)); const band = []; for (let i = 29; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); band.push('<i class="' + (days.has(k) ? (k === t ? 'gold' : 'lit') : '') + '" title="' + k + '"></i>'); }
  const qq = journalQuery.trim().toLowerCase(); const list = S.entries.filter((e) => !qq || (e.text || '').toLowerCase().includes(qq) || (e.tags || []).some((x) => x.toLowerCase().includes(qq)) || (e.emoji || '') === journalQuery.trim()).slice().reverse();
  const byDay = []; for (const e of list) { const last = byDay[byDay.length - 1]; if (last && last.day === e.day) last.items.push(e); else byDay.push({ day: e.day, items: [e] }); }
  return '<div class="glass card"><span class="kicker mint">Today\'s question</span><h3 class="q"><button id="j-q" aria-label="another question">' + esc(q) + '</button></h3><button class="btn mint" id="j-write">Write today\'s entry 🌱</button></div>' +
    '<div class="glass card"><div class="dayhead"><b>' + plural(days.size, 'day') + ' written</b><span class="cap">the last thirty</span></div><div class="band">' + band.join('') + '</div></div>' +
    '<input class="field" id="j-search" placeholder="Search your gratitude..." aria-label="search entries" value="' + esc(journalQuery) + '">' +
    (byDay.length ? byDay.map((d) => '<div class="dayhead"><b>' + esc(d.day === t ? 'Today' : fmtDay(d.day)) + '</b><span class="cap">' + plural(d.items.length, 'entry').replace('entrys', 'entries') + '</span></div><div class="rows">' + d.items.map(entryCard).join('') + '</div>').join('') : '<p class="cap">' + (qq ? 'Nothing with those words.' : 'Nothing written yet. Every entry you plant lives here, by day.') + '</p>');
}
function viewBook() {
  const ph = C.book.phases; let body = '';
  if (bookTab === 'journal') body = viewJournal();
  else if (bookTab === 'phases') body = '<div class="rows">' + ph.map((p, i) => '<div class="glass phase"><span class="ico' + (i === ph.length - 1 ? ' gold' : '') + '">' + p.icon + '</span><span><b>' + esc(p.name) + '</b><span class="cap">' + esc(p.meaning) + '</span></span><span class="day">day ' + p.day + (ph[i + 1] ? '<br>' + (ph[i + 1].day - p.day) + ' to next' : '') + '</span></div>').join('') + '</div><p class="cap">A day counts once, on the day you write about that emoji. The evolution arcs below run on their own clock: 0, 3, 8, 21 and 55 days.</p>';
  else if (bookTab === 'emojis') { const pal = palette(); body = '<div class="glass card"><span class="kicker mint">Your palette</span><div class="chips">' + pal.map((e) => '<button class="orb' + (plantFor(e) ? ' lit' : '') + '" data-arc="' + esc(e) + '" aria-label="' + esc(nameOf(e)) + '"><span>' + esc(e) + '</span></button>').join('') + '</div><div class="two"><input class="field" id="new-emoji" placeholder="any emoji" aria-label="a new emoji"><button class="btn" id="add-emoji">Add an emoji</button></div></div>' +
    '<div class="eyebrow"><h2>Arcs</h2><span class="more">' + C.evo.chains.length + ' chains</span></div><div class="rows">' + C.evo.chains.map((ch) => '<button class="glass recipe" data-chain="' + esc(ch.id) + '"><span class="f">' + ch.stages.map((s) => esc(s.emoji)).join('<span class="op">→</span>') + '</span><span class="name">' + esc(ch.arc) + '</span><span class="line">' + esc(ch.stages[0].line) + '</span></button>').join('') + '</div>'; }
  else { const cats = C.recipes.categories; const list = allRecipes().filter((r) => recipeCat === 'all' || r.cat === recipeCat); body = '<div class="chips row"><button class="chip' + (recipeCat === 'all' ? ' on' : '') + '" data-rcat="all">All</button>' + Object.keys(cats).map((k) => '<button class="chip' + (recipeCat === k ? ' on' : '') + '" data-rcat="' + k + '">' + esc(cats[k].name) + '</button>').join('') + '<button class="chip' + (recipeCat === 'mine' ? ' on' : '') + '" data-rcat="mine">Mine</button></div>' +
    '<button class="btn wide" id="add-recipe">+ Add a recipe</button><div class="rows">' + list.map((r) => { const st = recipeState(r); return '<button class="glass recipe' + (st.made ? ' made' : '') + '" data-recipe="' + esc(r.id) + '"><span class="f">' + r.formula.map(esc).join('<span class="op">+</span>') + '<span class="op">→</span>' + esc(r.result) + '</span><span class="cat">' + esc(r.cat === 'mine' ? 'Mine' : (cats[r.cat] || {}).name || '') + '</span><span class="name">' + esc(r.name) + '</span><span class="line">' + esc(r.statement) + (st.made ? ' · made' : ' · ' + st.days + ' of ' + st.need + ' days together') + '</span></button>'; }).join('') + '</div>'; }
  return hero(scene('book'), { cls: 'room-hero', h1: 'Growth Book', k1: 'Your Gratitude Journal', k2: 'Journal · Phases · Emojis · Recipes' }) +
    '<div class="page"><div class="glass seg" style="grid-template-columns:repeat(4,1fr)">' + [['journal', 'Journal'], ['phases', 'Phases'], ['emojis', 'Emojis'], ['recipes', 'Recipes']].map(([k, n]) => '<button class="' + (bookTab === k ? 'on' : '') + '" data-book="' + k + '">' + n + '</button>').join('') + '</div>' + body + '</div>';
}
function arcSheet(emoji) {
  const p = plantFor(emoji); const d = p ? daysOf(p) : 0; const seed = p ? p.emoji : emoji; const arc = E.arc(seed, d, C.evo); const sch = E.schedule(C.evo); const ph = phaseOf(d); const nx = nextPhase(d);
  const recipes = allRecipes().filter((r) => r.formula.includes(emoji) || r.result === emoji);
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
    S.gifts.given.push({ id: g.id, emoji: g.emoji, to, at: today(), days: g.days, link }); S.name = from || S.name; save(); sh.close();
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
  const sh = sheet('<span class="kicker mint">' + esc(fmtDay(e.day)) + (e.emoji ? ' · ' + esc(e.emoji) : '') + '</span>' + (e.photo ? '<img src="' + e.photo + '" alt="" style="border-radius:14px;max-height:280px;width:100%;object-fit:cover">' : '') + '<p class="lead" style="white-space:pre-wrap">' + esc(e.text) + '</p>' + (e.tags && e.tags.length ? '<div class="chips">' + e.tags.map((t) => '<span class="chip">' + esc(t) + '</span>').join('') + '</div>' : '') + '<div class="links"><button id="en-del">Delete</button></div><p class="cap">Deleting an entry never takes a day from an emoji.</p>');
  $('#en-del', sh.el).addEventListener('click', () => { if (!confirm('Delete this entry?')) return; S.entries = S.entries.filter((x) => x.id !== e.id); save(); sh.close(); render(); });
}
function youSheet() {
  const col = C.copy.locked.colophon; const d = S.plants.reduce((n, p) => n + daysOf(p), 0);
  const sh = sheet('<div class="hero-sm"><img src="' + LOGO + '" alt="" style="width:88px;height:88px;filter:drop-shadow(0 0 18px rgba(180,255,120,.5))"><h2>' + esc(S.name || 'You') + '</h2><span class="kicker mint">' + esc(S.entries.length + (S.entries.length === 1 ? ' entry' : ' entries') + ' · ' + plural(S.plants.length, 'plant') + ' · ' + plural(d, 'day') + ' of care') + '</span></div>' +
    '<input class="field" id="you-name" placeholder="your name, for the gifts you give" maxlength="40" aria-label="your name" value="' + esc(S.name || '') + '">' +
    '<div class="actions"><button class="btn" id="you-save">Save</button>' + (installEvt || /iphone|ipad|android/i.test(navigator.userAgent) ? '<button class="btn mint" id="you-install">Add Gratus to your phone</button>' : '') + '<button class="btn" id="you-laws">The twelve laws</button><button class="btn" id="you-export">Export everything</button><button class="btn quiet" id="you-reset">Start over on this device</button></div>' +
    '<div class="cap" style="display:grid;gap:4px;padding-top:8px"><b style="color:var(--ink)">' + esc(col.name) + '</b><span>' + esc(col.method) + '</span><span>' + esc(col.date) + ' · ' + esc(col.maker) + '</span><span style="color:var(--ink-2)">' + esc(col.words) + '</span><span style="color:var(--ink-2)">' + esc(col.close) + '</span><span><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></span></div>');
  $('#you-save', sh.el).addEventListener('click', () => { S.name = $('#you-name', sh.el).value.trim(); save(); sh.close(); toast('Saved'); });
  const ins = $('#you-install', sh.el); if (ins) ins.addEventListener('click', () => { sh.close(); promptInstall(); });
  $('#you-laws', sh.el).addEventListener('click', () => { sh.close(); openLaws(); });
  $('#you-export', sh.el).addEventListener('click', () => { const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'gratus-' + today() + '.json'; document.body.appendChild(a); a.click(); a.remove(); toast('Exported'); });
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
// the song: his, on every open, one tap to mute. Browsers wait for a touch before sound; the first touch starts it.
function songInit() {
  const a = $('#song'); if (!a) return; a.volume = .55;
  const start = () => { if (!S.sound) return; a.play().catch(() => null); };
  start();
  const once = () => { start(); document.removeEventListener('pointerdown', once); document.removeEventListener('keydown', once); };
  document.addEventListener('pointerdown', once); document.addEventListener('keydown', once);
  document.addEventListener('visibilitychange', () => { if (document.hidden) a.pause(); else start(); });
}
function toggleSound() { const a = $('#song'); S.sound = !S.sound; save(); if (S.sound) a.play().catch(() => null); else a.pause(); const b = $('#top-sound'); if (b) { b.classList.toggle('on', S.sound); b.innerHTML = S.sound ? I.sound : I.mute; b.setAttribute('aria-label', S.sound ? 'mute the song' : 'play the song'); } toast(S.sound ? 'A Sacred Place, playing' : 'Muted'); }
// the splash: his transition scene, the mark, the name. Once per session, two seconds, tap to pass.
// a kicker that ends a sentence, or asks for a tap, reads as a sentence: bigger, no small caps
const SAY = /[.!?]$|^tap to|· tap to/i;
function sayKickers() { document.querySelectorAll('.kicker:not(.say)').forEach((k) => { if (SAY.test(k.textContent.trim())) k.classList.add('say'); }); }
new MutationObserver(sayKickers).observe(document.body, { childList: true, subtree: true });
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
  const ob = $('#open-book'); if (ob) ob.addEventListener('click', () => go('gratus', 'book'));
  const og = $('#open-galaxy'); if (og) og.addEventListener('click', () => go('gratus', 'galaxy'));
  const ae = $('#all-entries'); if (ae) ae.addEventListener('click', () => { const sh = sheet('<h2>All entries</h2><div class="rows">' + S.entries.slice().reverse().map(entryCard).join('') + '</div>'); $$('[data-e]', sh.el).forEach((b) => b.addEventListener('click', () => { sh.close(); entrySheet(S.entries.find((x) => x.id === b.dataset.e)); })); });
  const w = $('#write'); if (w) w.addEventListener('input', () => { draft.text = w.value; });
  $$('[data-pick]').forEach((b) => b.addEventListener('click', () => { draft.emoji = draft.emoji === b.dataset.pick ? null : b.dataset.pick; $$('[data-pick]').forEach((x) => x.classList.toggle('on', x.dataset.pick === draft.emoji)); }));
  const pa = $('#pick-any'); if (pa) pa.addEventListener('click', () => { const sh = sheet('<h2>Any emoji</h2><p class="body">Type or paste one. It joins your palette when you plant it.</p><input class="field" id="any-in" placeholder="🌱" aria-label="an emoji"><button class="btn mint" id="any-go">Use it</button>', { autofocus: true }); $('#any-go', sh.el).addEventListener('click', () => { const e = Gr.firstEmoji($('#any-in', sh.el).value); if (!e) { toast('An emoji'); return; } if (!palette().includes(e)) S.my.emojis.push(e); draft.emoji = e; draft.text = $('#write') ? $('#write').value : draft.text; save(); sh.close(); render(); }); });
  $$('[data-tag]').forEach((b) => b.addEventListener('click', () => { const t = b.dataset.tag; draft.tags = draft.tags.includes(t) ? draft.tags.filter((x) => x !== t) : draft.tags.concat([t]); b.classList.toggle('on', draft.tags.includes(t)); }));
  const ta = $('#tag-any'); if (ta) ta.addEventListener('click', () => { const t = prompt('A tag'); if (t && t.trim()) { draft.tags.push(t.trim().slice(0, 24)); draft.text = $('#write') ? $('#write').value : draft.text; render(); } });
  const ph = $('#photo'); if (ph) ph.addEventListener('change', (ev) => { const f = ev.target.files[0]; if (!f) return; const img = new Image(); const url = URL.createObjectURL(f); img.onload = () => { const s = Math.min(1, 360 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); draft.photo = c.toDataURL('image/jpeg', .72); URL.revokeObjectURL(url); const pv = $('#photoprev'); pv.hidden = false; pv.innerHTML = '<img src="' + draft.photo + '" alt=""><button class="chip" id="photo-rm">remove</button>'; $('#photo-rm').addEventListener('click', () => { draft.photo = null; pv.hidden = true; pv.innerHTML = ''; }); }; img.src = url; });
  const vc = $('#voice'); if (vc) vc.addEventListener('click', () => { const SR = window.SpeechRecognition || window.webkitSpeechRecognition; const rec = new SR(); vc.classList.add('on'); rec.onresult = (ev) => { const s = Array.from(ev.results).map((x) => x[0].transcript).join(' '); const tw = $('#write'); tw.value = (tw.value ? tw.value + ' ' : '') + s; draft.text = tw.value; }; rec.onend = () => vc.classList.remove('on'); rec.onerror = () => vc.classList.remove('on'); try { rec.start(); } catch (e) { vc.classList.remove('on'); } });
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
  const gw = $('#give-world'); if (gw) gw.addEventListener('click', () => go('give', 'world'));
  $$('[data-given]').forEach((b) => b.addEventListener('click', () => { const g = S.gifts.given.find((x) => x.id === b.dataset.given); if (g) shareSheet(g); }));
  $$('[data-cat]').forEach((b) => b.addEventListener('click', () => { projFilter = b.dataset.cat; render(); }));
  const de = $('#door-earth'); if (de) de.addEventListener('click', () => go('give', 'earth'));
  const dv = $('#door-vault'); if (dv) dv.addEventListener('click', () => go('give', 'vault'));
  $$('[data-scope]').forEach((b) => b.addEventListener('click', () => { wishScope = b.dataset.scope; $$('[data-scope]').forEach((x) => x.classList.toggle('on', x === b)); }));
  const ws = $('#wish-send'); if (ws) ws.addEventListener('click', () => { const t = $('#wish').value.trim(); if (!t) { toast('A wish, in your words.'); return; } S.wishes.push({ id: newId('w'), text: t.slice(0, 300), scope: wishScope, at: today() }); save(); render(); toast('Sent to tomorrow.'); });
  $$('[data-node]').forEach((b) => b.addEventListener('click', () => { const n = b.dataset.node; if (n === 'give') go('give'); else go('give', n); }));
  $$('[data-book]').forEach((b) => b.addEventListener('click', () => { bookTab = b.dataset.book; render(); }));
  $$('[data-arc]').forEach((b) => b.addEventListener('click', () => arcSheet(b.dataset.arc)));
  $$('[data-chain]').forEach((b) => b.addEventListener('click', () => { const ch = C.evo.chains.find((x) => x.id === b.dataset.chain); arcSheet(ch.stages[0].emoji); }));
  $$('[data-rcat]').forEach((b) => b.addEventListener('click', () => { recipeCat = b.dataset.rcat; render(); }));
  $$('[data-recipe]').forEach((b) => b.addEventListener('click', () => { const r = allRecipes().find((x) => x.id === b.dataset.recipe); if (r) recipeSheet(r); }));
  const ar = $('#add-recipe'); if (ar) ar.addEventListener('click', addRecipeSheet);
  const ae2 = $('#add-emoji'); if (ae2) ae2.addEventListener('click', () => { const e = Gr.firstEmoji($('#new-emoji').value); if (!e) { toast('An emoji'); return; } if (!palette().includes(e)) S.my.emojis.push(e); save(); render(); toast(e + ' is in your palette.'); });
}

// ── boot ──
async function boot() {
  const [evo, names, prompts, copy, book, recipes] = await Promise.all(['evolutions', 'emoji-names', 'prompts', 'copy', 'growth-book', 'recipes'].map((n) => fetch('/config/' + n + '.json?v=12').then((r) => r.json())));
  C = { evo, names, prompts, copy, book, recipes }; load(); stars(); songInit();
  if ('serviceWorker' in navigator && !location.search.includes('dev=1')) navigator.serviceWorker.register('/sw.js').catch(() => null);
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; });
  $$('.tabs button[data-tab]').forEach((b) => b.addEventListener('click', () => go(b.dataset.tab)));
  window.addEventListener('popstate', () => { if (room) closeRoom(true); if (!$('#laws').hidden) { $('#laws').hidden = true; document.body.classList.remove('room'); } render(); });
  const q = new URLSearchParams(location.search).get('tab'); const m = /^\/app\/?(\w+)?/.exec(location.pathname); const want = q || (m && m[1]) || 'gratus';
  const SUBS = ['book', 'projects', 'world', 'vault', 'earth', 'galaxy'];
  if (SUBS.includes(want)) { tab = want === 'book' || want === 'galaxy' ? 'gratus' : 'give'; sub = want; } else if (['grow', 'gratus', 'give'].includes(want)) tab = want;
  const isGift = location.pathname === '/gift' || location.pathname.endsWith('gift.html') || location.hash.startsWith('#gift');
  const start = () => { render(); if (isGift) { const code = location.hash.replace(/^#(gift=)?/, ''); const g = code ? decodeGift(code) : null; openJourney(g || DEMO_GIFT, { routed: true, preview: !g }); } };
  if (new URLSearchParams(location.search).has('nosplash')) start(); else splash(start);
}
boot().catch((e) => { console.error(e); const el = document.createElement('div'); el.className = 'noscript'; el.innerHTML = '<h2>Gratus could not open.</h2><p class="lead">' + esc(e && e.message || e) + '</p>'; document.body.appendChild(el); });
