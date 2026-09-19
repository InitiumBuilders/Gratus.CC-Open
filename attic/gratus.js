// ═══════════════════════════════════════════════════════════════════
// GRATUS.CC: one screen. A Gratus is a gift made of days.
// You keep one line a day and the Gratus gains a day. You can give it: it leaves you and
// arrives with whoever opens the link, carrying every hand that held it. Your lines stay here.
// No accounts. No feed. Nothing to buy. Days are the only thing that counts, and only presence counts one.
// ═══════════════════════════════════════════════════════════════════
import * as Gr from '../../engine/gratus.js?v=8';
import * as E from '../../engine/emoji.js?v=8';
import { newId } from '../../engine/rng.js?v=8';
import { esc, $, $$, sheet, hold, toast, fmtDay } from './ui.js?v=8';
import { API } from './api.js?v=8';

const KEY = 'gratus.v2';
const DEV = new URLSearchParams(location.search).get('dev') === '1' && !/gratus\.cc$/.test(location.hostname);
const MARK = '/assets/brand/gratus-logo-original.webp';
let C = {}, S = null, pool = [], qOffset = 0, installEvt = null, closeLaws = null;

// ── time, state ──
const pad2 = (n) => String(n).padStart(2, '0');
function today() { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function tomorrow() { const d = new Date(); d.setDate(d.getDate() + 1); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function longDate(day) { try { return new Date(day + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }); } catch (e) { return day; } }
function emojisIn(str) { try { return Array.from(String(str).matchAll(/\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*/gu)).map((m) => m[0]); } catch (e) { return []; } }
function fresh() { return { v: 2, name: '', cur: null, held: [], given: [], lines: [], installAsked: false, migrated: false }; }
function load() {
  try { S = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { S = null; }
  if (!S || S.v !== 2) S = fresh();
  if (!S.migrated) { S.migrated = true; try { const v1 = JSON.parse(localStorage.getItem('gratus.v1') || 'null'); const m = Gr.migrateV1(v1, today()); if (m) { m.gratus.id = newId('g'); for (const l of m.lines) l.gid = m.gratus.id; S.held.push(m.gratus); S.lines = S.lines.concat(m.lines); S.name = S.name || m.name; S.cur = m.gratus.id; } } catch (e) {} save(); }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function current() { return S.held.find((g) => g.id === S.cur) || S.held[0] || null; }
function face(g) { return E.currentEmoji(g.emoji, Gr.days(g), C.evo); }
function nameOf(emoji) { return (C.names || {})[emoji] || emoji; }
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

// ── motion: choreography only while visible; everything lands regardless ──
function choreograph() {
  const h = document.documentElement; const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  h.classList.remove('landed'); if (!document.hidden && !reduced) { h.classList.remove('anim'); void h.offsetWidth; h.classList.add('anim'); }
  clearTimeout(choreograph.t); choreograph.t = setTimeout(() => h.classList.add('landed'), 2200);
}

// ── the ring: one dot per day, each hand in its own light, today in gold ──
function ringSVG(g, opts) {
  const o = opts || {}; const n = Gr.days(g); const pts = Gr.ring(n, 300); const tint = Gr.tints(g); const mine = o.mine == null ? g.hands.length - 1 : o.mine;
  const step = Math.min(8, 1600 / Math.max(1, n)).toFixed(1);
  const dots = pts.map((p, i) => { const last = o.today && i === n - 1; const cls = 'd' + (tint[i] === mine ? ' mine' : '') + (last ? ' today' : ''); return (last ? '<circle class="halo" cx="' + p.x + '" cy="' + p.y + '" r="' + (p.r + 7) + '" style="--i:' + i + '"/>' : '') + '<circle class="' + cls + '" cx="' + p.x + '" cy="' + p.y + '" r="' + p.r + '" style="--i:' + i + '"/>'; }).join('');
  return '<div class="ringbox' + (o.cls ? ' ' + o.cls : '') + '" style="--step:' + step + 'ms" id="' + (o.id || 'ring') + '"><svg viewBox="0 0 300 300" aria-hidden="true">' + dots + '</svg><button class="orb center" id="face" aria-label="' + esc(nameOf(face(g))) + '"><span>' + esc(face(g)) + '</span></button></div>';
}
function facts(g) { return plural(Gr.days(g), 'day') + ' · ' + plural(g.hands.length, 'hand'); }

// ── home ──
function render() {
  const root = $('#home'); const g = current(); const t = today(); const col = C.copy.locked.colophon; const st = C.prompts.statements;
  let s = '';
  if (g) {
    const h = Gr.hand(g); const keptToday = (h.kept || []).includes(t);
    const q = Gr.question(pool, t + ':' + g.id, qOffset);
    s += '<section class="act"><div class="fig-horizon"></div>' +
      '<div class="eyebrow in" style="--i:0"><span class="label">' + esc(longDate(t)) + '</span></div>' +
      (S.held.length > 1 ? '<div class="held in" style="--i:0">' + S.held.map((x) => '<button data-g="' + esc(x.id) + '" aria-label="' + esc(nameOf(face(x))) + '"><span class="orb sm' + (x.id === g.id ? ' on' : '') + '"><span>' + esc(face(x)) + '</span></span><span class="cap">' + Gr.days(x) + '</span></button>').join('') + '</div>' : '') +
      '<div class="in" style="--i:1">' + ringSVG(g, { today: keptToday }) + '</div>' +
      '<div class="facts in" style="--i:2"><h2>' + esc(nameOf(face(g))) + '</h2><span class="label">' + esc(facts(g)) + '</span></div>' +
      '<h1 class="q in" style="--i:3"><button id="q-line" aria-label="another question">' + esc(q) + '</button></h1>' +
      '<textarea class="field write in" id="write" style="--i:4" rows="3" placeholder="One line for today."></textarea>' +
      '<div class="keep-row in" style="--i:5"><button class="btn gold" id="keep">Keep</button><span class="label">' + (keptToday ? 'today is kept' : esc(C.copy.labels.private)) + '</span></div></section>';
    s += '<section class="sec"><h2>Hands</h2><div class="rows">' + g.hands.map((x, j) => { const me = j === g.hands.length - 1; return '<div class="row-item' + (me ? ' mine' : '') + '"><i class="hdot' + (me ? ' mine' : '') + '"></i><span class="grow"><strong>' + esc(me ? (x.name ? x.name + ', you' : 'You') : (x.name || 'Someone')) + '</strong><span class="cap">' + plural(x.days, 'day') + (x.since ? ' · ' + (me ? 'since ' : 'from ') + esc(fmtDay(x.since)) : '') + (!me && x.until ? ' to ' + esc(fmtDay(x.until)) : '') + '</span>' + (x.line ? '<span class="cap wrap">“' + esc(x.line) + '”</span>' : '') + '</span></div>'; }).join('') + '</div><p class="statement">' + esc(st.ancient) + '</p></section>';
    s += '<section class="sec"><h2>Give</h2><p class="statement">' + esc(st.gift) + '</p><button class="btn" id="give">Give this Gratus</button><p class="cap">It leaves you and arrives with whoever opens the link first. Your lines stay here.</p><div class="links"><button id="start-another">Start another</button></div></section>';
  } else {
    s += '<section class="act"><div class="fig-horizon"></div>' +
      '<div class="in" style="--i:0"><div class="ringbox"><svg viewBox="0 0 300 300" aria-hidden="true"></svg><span class="orb center empty"><span>+</span></span></div></div>' +
      '<h1 class="in" style="--i:1">' + esc(st.first) + '</h1>' +
      '<p class="lead in" style="--i:2">One emoji. It grows with every day you keep a line for it.</p>' +
      '<div class="two in" style="--i:3"><input class="field emoji" id="seed" placeholder="🌱" maxlength="8" autocomplete="off" style="font-size:28px;text-align:center"><button class="btn gold" id="begin">Begin</button></div></section>';
  }
  if (S.given.length) s += '<section class="sec"><h2>Given</h2><div class="rows">' + S.given.slice().reverse().map((x) => '<button class="row-item" data-given="' + esc(x.id) + '"><span class="emoji">' + esc(face(x)) + '</span><span class="grow"><strong>' + esc(nameOf(face(x))) + '</strong><span class="cap">' + esc(facts(x)) + ' · ' + (x.status === 'arrived' ? 'arrived with ' + esc((x.to && x.to.name) || 'someone') + (x.to && x.to.at ? ' · ' + esc(fmtDay(x.to.at)) : '') : x.opensAt ? 'opens ' + esc(fmtDay(x.opensAt)) : 'in motion since ' + esc(fmtDay(x.sentAt.slice(0, 10)))) + '</span></span><span class="end">' + (x.status === 'arrived' ? '' : 'link') + '</span></button>').join('') + '</div><p class="statement">' + esc(st.moving) + '</p></section>';
  const lines = S.lines.filter((l) => !g || l.gid === g.id).slice().reverse();
  if (lines.length) s += '<section class="sec"><h2>Lines</h2><div class="rows">' + lines.slice(0, 5).map((l) => '<button class="row-item" data-l="' + esc(l.id) + '"><span class="grow"><span class="label">' + esc(fmtDay(l.day)) + '</span><span class="cap wrap">' + esc(l.text.length > 140 ? l.text.slice(0, 140) + '…' : l.text) + '</span></span></button>').join('') + '</div>' + (lines.length > 5 ? '<div class="links"><button id="all-lines">All ' + lines.length + ' lines</button></div>' : '') + '<p class="cap">Yours. They never leave this device.</p></section>';
  s += '<footer class="colophon"><p class="statement">' + esc(col.name) + '</p><p>' + esc(col.method) + '</p><p>' + esc(col.date) + ' · ' + esc(col.maker) + '</p><p class="statement">' + esc(col.words) + '</p><p class="statement">' + esc(col.close) + '</p><div class="links"><button id="laws-open">The twelve laws</button><button id="export">Export</button>' + (installEvt ? '<button id="install">Keep Gratus on your phone</button>' : '') + '<button id="reset">Start over</button></div></footer>';
  root.innerHTML = s; choreograph();
  // wiring
  if (g) {
    $('#keep').addEventListener('click', keepLine);
    $('#q-line').addEventListener('click', () => { qOffset++; render(); });
    $('#face').addEventListener('click', () => openFace(g));
    $('#give').addEventListener('click', () => openGive(g));
    $('#start-another').addEventListener('click', startSheet);
    $$('[data-g]').forEach((b) => b.addEventListener('click', () => { S.cur = b.dataset.g; qOffset = 0; save(); render(); }));
    const ta = $('#write'); const draft = (() => { try { return JSON.parse(localStorage.getItem('gratus.draft') || 'null'); } catch (e) { return null; } })(); if (draft && draft.day === t && draft.gid === g.id) ta.value = draft.text;
    ta.addEventListener('input', () => { try { localStorage.setItem('gratus.draft', JSON.stringify({ day: t, gid: g.id, text: ta.value })); } catch (e) {} });
  } else {
    $('#begin').addEventListener('click', () => { const e = emojisIn($('#seed').value)[0]; if (!e) { toast('One emoji to begin.'); return; } begin(e); });
    $('#seed').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') $('#begin').click(); });
  }
  $$('[data-given]').forEach((b) => b.addEventListener('click', () => { const x = S.given.find((y) => y.id === b.dataset.given); if (x && x.status !== 'arrived') shareSheet(x); else if (x) toast('Arrived with ' + ((x.to && x.to.name) || 'someone') + '.'); }));
  $$('[data-l]').forEach((b) => b.addEventListener('click', () => readLine(S.lines.find((l) => l.id === b.dataset.l))));
  const al = $('#all-lines'); if (al) al.addEventListener('click', () => allLines(lines));
  $('#laws-open').addEventListener('click', () => openLaws());
  $('#export').addEventListener('click', exportAll);
  const ins = $('#install'); if (ins) ins.addEventListener('click', promptInstall);
  $('#reset').addEventListener('click', () => { if (confirm('Start over on this device? Your lines and your Gratus here will be gone. Export first if you want them.')) { try { localStorage.removeItem(KEY); localStorage.removeItem('gratus.draft'); } catch (e) {} location.href = '/app'; } });
}

// ── the acts ──
function begin(emoji, name) {
  const g = Gr.born(emoji, name != null ? name : S.name, today(), newId('g')); S.held.push(g); S.cur = g.id; if (name) S.name = name; save(); qOffset = 0; render(); window.scrollTo({ top: 0 });
}
function keepLine() {
  const g = current(); const ta = $('#write'); const text = ta.value.trim(); if (!g) return;
  if (!text) { toast('A word is enough.'); return; }
  const t = today(); const before = face(g); const newDay = Gr.keep(g, t);
  S.lines.push({ id: newId('l'), gid: g.id, day: t, text, at: new Date().toISOString() }); save();
  try { localStorage.removeItem('gratus.draft'); } catch (e) {}
  const after = face(g); render(); window.scrollTo({ top: 0 });
  if (after !== before) ceremony('<div class="cer"><div class="morph"><span class="from">' + esc(before) + '</span><span class="to">' + esc(after) + '</span></div><span class="label">' + esc(plural(Gr.days(g), 'day')) + '</span><h2>' + esc(nameOf(after)) + '</h2><p class="lead">' + esc((E.stage(g.emoji, Gr.days(g), C.evo) || {}).line || '') + '</p><span class="label">tap to continue</span></div>', 5200);
  else if (newDay && Gr.days(g) === 1) ceremony('<div class="cer"><span class="big">' + esc(after) + '</span><h2>Day one.</h2><p class="lead">One line a day is a day. Every day kept is a dot on the ring.</p><span class="label">tap to continue</span></div>', 4200);
  else toast(newDay ? 'Kept · day ' + Gr.days(g) : 'Kept');
  maybeAskInstall();
}
function ceremony(html, ms, then) {
  const root = $('#ceremony'); root.innerHTML = html; root.hidden = false; let timer = 0;
  const close = () => { clearTimeout(timer); root.onclick = null; root.hidden = true; root.innerHTML = ''; if (then) then(); };
  root.onclick = close; timer = setTimeout(close, ms || 4800);
}
function openFace(g) {
  const n = Gr.days(g); const arc = E.arc(g.emoji, n, C.evo); const nx = E.nextStage(g.emoji, n, C.evo); const stg = E.stage(g.emoji, n, C.evo);
  sheet('<div class="hero"><span class="orb xl"><span>' + esc(face(g)) + '</span></span><h2>' + esc(nameOf(face(g))) + '</h2><span class="label">' + esc(facts(g)) + ' · since ' + esc(fmtDay(g.born)) + '</span></div>' +
    (arc ? '<div><span class="label">' + esc(arc.chain.arc) + (nx ? ' · ' + esc(nx.stage.emoji) + ' in ' + plural(nx.in, 'day') : '') + '</span><div class="chips" style="font-family:var(--emoji);font-size:24px;gap:10px;padding-top:8px">' + arc.stages.map((s2) => '<span style="opacity:' + (s2.reached ? 1 : .35) + '" title="' + esc(s2.name) + '">' + esc(s2.emoji) + '</span>').join('') + '</div>' + (stg && stg.line ? '<p class="cap" style="padding-top:8px">' + esc(stg.line) + '</p>' : '') + '</div>' : '<p class="body">This one keeps its shape. The days are the growth.</p>'));
}
function startSheet() {
  const sh = sheet('<h2>' + esc(C.prompts.statements.first) + '</h2><p class="body">You can hold more than one. Each keeps its own days.</p><input class="field emoji" id="st-seed" placeholder="🌱" maxlength="8" autocomplete="off" style="font-size:28px;text-align:center"><button class="btn gold" id="st-go">Begin</button>', { autofocus: true });
  $('#st-go', sh.el).addEventListener('click', () => { const e = emojisIn($('#st-seed', sh.el).value)[0]; if (!e) { toast('One emoji to begin.'); return; } sh.close(); begin(e); });
}

// ── giving ──
function openGive(g) {
  let when = 'now';
  const sh = sheet('<div class="hero"><span class="orb lg"><span>' + esc(face(g)) + '</span></span><h2>Give ' + esc(nameOf(face(g))) + '</h2><span class="label">' + esc(facts(g)) + '</span></div>' +
    '<p class="body">It leaves you and arrives with whoever opens the link first. They see every hand and every line sent with it. Your own lines stay here.</p>' +
    '<div><span class="label">sign it</span><input class="field" id="gv-name" maxlength="40" placeholder="your name" value="' + esc(S.name || Gr.hand(g).name || '') + '"></div>' +
    '<div><span class="label">a line to send with it</span><textarea class="field" id="gv-line" rows="2" maxlength="400" placeholder="optional"></textarea></div>' +
    '<div><span class="label">when</span><div class="chips" style="padding-top:6px"><button class="chip on" data-when="now">Now</button><button class="chip" data-when="date">On a date</button></div><input class="field" type="date" id="gv-date" min="' + tomorrow() + '" hidden style="margin-top:8px"></div>' +
    '<button class="btn gold hold wide" id="gv-hold"><span>Press and hold to give</span></button><p class="cap">A Gratus on a date stays sealed until then. It can be left to someone.</p>');
  $$('[data-when]', sh.el).forEach((b) => b.addEventListener('click', () => { when = b.dataset.when; $$('[data-when]', sh.el).forEach((x) => x.classList.toggle('on', x === b)); $('#gv-date', sh.el).hidden = when !== 'date'; }));
  hold($('#gv-hold', sh.el), { ms: 1100, onDone: async () => {
    const name = $('#gv-name', sh.el).value.trim(); const line = $('#gv-line', sh.el).value.trim(); const date = when === 'date' ? $('#gv-date', sh.el).value : '';
    if (!name) { toast('Sign it first.'); return; }
    if (when === 'date' && !(date && date >= tomorrow())) { toast('A date after today.'); return; }
    const btn = $('#gv-hold', sh.el); btn.querySelector('span').textContent = 'Giving…';
    const r = await API.post('gratus', { action: 'send', gratus: Gr.toSend(g, name, line, today(), date || null) });
    if (!r.ok) { btn.querySelector('span').textContent = 'Press and hold to give'; toast(r.offline ? 'Giving needs a connection.' : 'Could not give right now.'); return; }
    const h = Gr.hand(g); h.name = name; h.line = line || null; h.until = today();
    g.status = 'moving'; g.rid = r.id; g.link = location.origin + '/gratus/' + r.id; g.sentAt = new Date().toISOString(); g.opensAt = date || null;
    S.held = S.held.filter((x) => x.id !== g.id); S.given.push(g); S.name = name; if (S.cur === g.id) S.cur = S.held[0] ? S.held[0].id : null; save();
    sh.close();
    const rb = $('#ring'); if (rb) rb.classList.add('disperse');
    setTimeout(() => { render(); ceremony('<div class="cer"><span class="big">' + esc(face(g)) + '</span><h2>It’s moving.</h2><p class="lead">' + esc(facts(g)) + '. Whoever opens the link first receives it.</p><span class="label">tap to share the link</span></div>', 5000, () => shareSheet(g)); }, 950);
  } });
}
function shareSheet(g) {
  const days = Gr.days(g); const text = (Gr.hand(g).name || 'Someone') + ' gave you a Gratus. ' + plural(days, 'day') + ', ' + plural(g.hands.length, 'hand') + '.';
  const sh = sheet('<div class="hero"><span class="orb lg"><span>' + esc(face(g)) + '</span></span><h2>Share the link</h2><span class="label">' + (g.opensAt ? 'sealed until ' + esc(fmtDay(g.opensAt)) : 'whoever opens it first receives it') + '</span></div><div class="linkbox"><input class="field mono" id="sh-link" readonly value="' + esc(g.link) + '"><button class="btn" id="sh-copy">Copy</button></div><button class="btn gold wide" id="sh-share">Share</button>');
  $('#sh-copy', sh.el).addEventListener('click', async () => { try { await navigator.clipboard.writeText(g.link); toast('Link copied'); } catch (e) { $('#sh-link', sh.el).select(); toast('Select and copy'); } });
  $('#sh-share', sh.el).addEventListener('click', async () => { if (navigator.share) { try { await navigator.share({ title: 'A Gratus', text, url: g.link }); } catch (e) {} } else { try { await navigator.clipboard.writeText(text + ' ' + g.link); toast('Copied'); } catch (e) { toast('Copy the link above'); } } });
}
async function pollGiven() {
  let changed = false;
  for (const g of S.given) { if (g.status !== 'moving' || !g.rid) continue; const r = await API.get('gratus?id=' + encodeURIComponent(g.rid)); if (r.ok && r.gratus && r.gratus.status === 'arrived') { g.status = 'arrived'; g.to = r.gratus.to; changed = true; } }
  if (changed) { save(); render(); }
}

// ── the arrival: one line, one room, then the door ──
function arrival(o) {
  const root = $('#arrival'); root.hidden = false; const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; const gift = o && o.gift;
  const mark = (px) => '<img class="mark" src="' + MARK + '" alt="" width="' + px + '" height="' + px + '" style="width:' + px + 'px;height:' + px + 'px">';
  let acts, door;
  if (gift) {
    const sent = { emoji: gift.emoji, hands: gift.handsList || [] }; const from = gift.from || 'Someone'; const sentLine = (sent.hands[sent.hands.length - 1] || {}).line;
    acts = [[mark(96), 1000], ['<h1>' + esc(from) + ' gave you a Gratus.</h1>', 1700], ['<div>' + ringSVG(sent, { mine: -1, id: 'arr-ring' }) + '</div><span class="label">' + esc(plural(gift.days, 'day') + ' · ' + plural(gift.hands, 'hand')) + '</span>', 3400]]
      .concat(sentLine ? [['<p class="lead">“' + esc(sentLine) + '”</p><span class="label">' + esc(from) + '</span>', 2800]] : [])
      .concat([['<h1>' + esc(C.prompts.statements.moving) + '</h1>', 1800]]);
    door = () => {
      root.innerHTML = '<div class="arr"><span class="orb xl"><span>' + esc(E.currentEmoji(sent.emoji, gift.days, C.evo)) + '</span></span><span class="label">' + esc(plural(gift.days, 'day') + ' · ' + plural(gift.hands, 'hand')) + '</span><div class="door"><input class="field" id="ob-name" maxlength="40" placeholder="your name" value="' + esc(S.name || '') + '" autocomplete="off"><p class="cap">So the next hands know whose days these were.</p><button class="btn gold wide" id="ob-take">Receive</button><p class="cap" id="ob-msg"></p></div></div>';
      $('#ob-take', root).addEventListener('click', async () => {
        const name = $('#ob-name', root).value.trim(); if (!name) { $('#ob-msg', root).textContent = 'A name, so the next hands know whose days these were.'; return; }
        $('#ob-msg', root).textContent = 'Receiving…';
        const r = await API.post('gratus', { action: 'claim', id: o.id, name });
        if (!r.ok) { $('#ob-msg', root).textContent = r.status === 409 ? 'It already arrived with ' + esc((r.data && r.data.gratus && r.data.gratus.to && r.data.gratus.to.name) || 'someone') + '.' : r.status === 425 ? 'It opens on ' + esc(fmtDay((r.data && r.data.gratus && r.data.gratus.opensAt) || '')) + '.' : r.offline ? 'Receiving needs a connection.' : 'Could not receive it.'; return; }
        const mine = Gr.receive({ id: o.id, emoji: r.gratus.emoji, born: r.gratus.born, hands: r.gratus.handsList || sent.hands }, name, today()); mine.id = newId('g'); mine.rid = o.id;
        S.held.push(mine); S.cur = mine.id; S.name = name; save();
        root.hidden = true; root.innerHTML = ''; history.replaceState(null, '', '/app'); qOffset = 0; render(); toast('Yours to keep.');
      });
    };
  } else if (o && o.message) {
    acts = [[mark(96), 900]];
    door = () => { root.innerHTML = '<div class="arr">' + mark(72) + '<h1>' + esc(o.message) + '</h1><div class="door"><button class="btn gold wide" id="ob-own">' + esc(C.prompts.statements.first) + '</button></div></div>'; $('#ob-own', root).addEventListener('click', () => { root.hidden = true; root.innerHTML = ''; history.replaceState(null, '', '/app'); if (S.held.length || S.lines.length) render(); else arrival(); }); };
  } else {
    acts = [[mark(96), 1100], ['<h1>Gratus means honor.</h1>', 1500], ['<h1>' + esc(C.prompts.statements.first) + '</h1>', 1300]];
    door = () => {
      root.innerHTML = '<div class="arr">' + mark(72) + '<h1>' + esc(C.prompts.statements.first) + '</h1><div class="door"><input class="field big" id="ob-emoji" placeholder="🌱" maxlength="8" autocomplete="off" aria-label="one emoji"><input class="field" id="ob-name" maxlength="40" placeholder="your name" autocomplete="off"><p class="cap">The emoji grows with every day you keep a line for it. The name travels with it when you give it.</p><button class="btn gold wide" id="ob-go">Begin</button></div></div>';
      $('#ob-go', root).addEventListener('click', () => { const e = emojisIn($('#ob-emoji', root).value)[0]; if (!e) { toast('One emoji to begin.'); $('#ob-emoji', root).focus(); return; } const nm = $('#ob-name', root).value.trim(); root.hidden = true; root.innerHTML = ''; begin(e, nm); });
      setTimeout(() => $('#ob-emoji', root).focus(), 300);
    };
  }
  let i = 0, timer = 0, opened = false;
  const open = () => { if (opened) return; opened = true; clearTimeout(timer); door(); };
  const step = () => { if (opened) return; if (i >= acts.length) { open(); return; } const [html, ms] = acts[i++]; root.innerHTML = '<div class="arr">' + html + '</div><button class="btn quiet skip" id="arr-skip">Skip</button>'; choreograph(); $('#arr-skip', root).addEventListener('click', open); timer = setTimeout(step, ms); };
  root.addEventListener('click', (e) => { if (!opened && !e.target.closest('.skip')) { clearTimeout(timer); step(); } });
  if (reduced) open(); else step();
}
async function arriveGift(id) {
  history.replaceState(null, '', '/app');
  if (S.given.some((x) => x.rid === id)) { render(); toast('You gave this one. It’s on its way.'); return; }
  const r = await API.get('gratus?id=' + encodeURIComponent(id));
  if (!r.ok) { arrival({ message: r.status === 404 ? 'No Gratus at this link.' : 'The link could not be read. Try again with a connection.' }); return; }
  const g = r.gratus;
  if (g.status !== 'moving') { arrival({ message: 'This Gratus already arrived' + (g.to && g.to.name ? ' with ' + g.to.name : '') + '.' }); return; }
  if (g.sealed) { arrival({ message: 'This Gratus opens on ' + fmtDay(g.opensAt) + '.' }); return; }
  arrival({ gift: g, id });
}

// ── the twelve laws: his words, one per room ──
function openLaws(routed) {
  const root = $('#laws'); if (!root || !root.hidden) return; const col = C.copy.locked.colophon;
  if (!routed) history.pushState(null, '', '/app/laws');
  const laws = Gr.laws(C.prompts.statements); const ord = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  root.innerHTML = '<button class="btn quiet skip" id="laws-x">Close</button>' + laws.map((l, i) => '<section class="law"><span class="label">' + ord[i] + '</span><h1>' + esc(l) + '</h1></section>').join('') +
    '<section class="law last"><img class="mark" src="' + MARK + '" alt="" width="72" height="72"><p class="statement">' + esc(col.close) + '</p><button class="btn gold" id="laws-done">Keep today</button></section>';
  root.hidden = false; root.scrollTop = 0;
  let io = null; const acts = $$('.law', root);
  const close = (byRoute) => { if (root.hidden) return; root.hidden = true; root.innerHTML = ''; if (io) io.disconnect(); closeLaws = null; if (!byRoute && location.pathname === '/app/laws') history.back(); };
  closeLaws = close;
  $('#laws-x', root).addEventListener('click', () => close());
  $('#laws-done', root).addEventListener('click', () => { close(true); history.replaceState(null, '', '/app'); window.scrollTo({ top: 0 }); const w = $('#write'); if (w) w.focus(); });
  if ('IntersectionObserver' in window) { io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) e.target.classList.add('on'); }), { root, threshold: .5 }); acts.forEach((a) => io.observe(a)); }
  setTimeout(() => acts.forEach((a) => a.classList.add('on')), 900);
}

// ── lines ──
function readLine(l) {
  if (!l) return;
  const sh = sheet('<span class="label">' + esc(fmtDay(l.day)) + '</span><p class="lead" style="white-space:pre-wrap">' + esc(l.text) + '</p><div class="links"><button id="rl-del">Delete</button></div><p class="cap">Deleting a line never takes a day.</p>');
  $('#rl-del', sh.el).addEventListener('click', () => { if (!confirm('Delete this line?')) return; S.lines = S.lines.filter((x) => x.id !== l.id); save(); sh.close(); render(); });
}
function allLines(lines) {
  const sh = sheet('<h2>' + plural(lines.length, 'line') + '</h2><div class="rows">' + lines.map((l) => '<button class="row-item" data-l="' + esc(l.id) + '"><span class="grow"><span class="label">' + esc(fmtDay(l.day)) + '</span><span class="cap wrap">' + esc(l.text.length > 140 ? l.text.slice(0, 140) + '…' : l.text) + '</span></span></button>').join('') + '</div>');
  $$('[data-l]', sh.el).forEach((b) => b.addEventListener('click', () => { sh.close(); readLine(S.lines.find((l) => l.id === b.dataset.l)); }));
}
function exportAll() {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), name: S.name, held: S.held, given: S.given, lines: S.lines }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'gratus-' + today() + '.json'; document.body.appendChild(a); a.click(); a.remove(); toast('Exported');
}

// ── install ──
function promptInstall() { if (installEvt) { installEvt.prompt(); installEvt = null; render(); return; } const ios = /iphone|ipad|ipod/i.test(navigator.userAgent); sheet('<h2>Keep Gratus on your phone</h2><p class="body">' + (ios ? 'In Safari, tap Share, then “Add to Home Screen”.' : 'In your browser menu, choose “Install app” or “Add to Home screen”.') + '</p>'); }
function maybeAskInstall() {
  const g = current(); if (S.installAsked || !g || Gr.days(g) < 3) return; if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) return;
  S.installAsked = true; save();
  setTimeout(() => { const sh = sheet('<h2>Keep Gratus on your phone</h2><p class="lead">Three days kept. It can live on your home screen now, full screen and offline.</p><div class="actions"><button class="btn gold" id="in-go">Keep it there</button><button class="btn quiet" id="in-no">Not now</button></div>'); $('#in-go', sh.el).addEventListener('click', () => { sh.close(); promptInstall(); }); $('#in-no', sh.el).addEventListener('click', () => sh.close()); }, 1400);
}

// ── dev (never on gratus.cc) ──
function devPanel() {
  const d = $('#dev'); d.hidden = false;
  d.innerHTML = '<span class="label" id="dv-t">dev</span><button id="dv-days">+ 30 days</button><button id="dv-hand">+ an earlier hand</button><button id="dv-reset">reset</button>';
  $('#dv-t').onclick = () => d.classList.toggle('open');
  $('#dv-days').onclick = () => { const g = current(); if (!g) return; const h = Gr.hand(g); h.kept = h.kept || []; for (let i = 1; i <= 30; i++) { const dt = new Date(); dt.setDate(dt.getDate() - 400 - h.kept.length - i); const day = dt.toISOString().slice(0, 10); if (!h.kept.includes(day)) h.kept.push(day); } h.days = h.kept.length; save(); render(); };
  $('#dv-hand').onclick = () => { const g = current(); if (!g) return; const n = g.hands.length; g.hands.unshift({ name: ['Kris', 'Natalie', 'Sam'][n % 3], days: 21 + n * 8, since: '2026-01-0' + (1 + n), until: '2026-03-0' + (1 + n), line: ['Kept it through winter.', 'For the mornings.', null][n % 3] }); save(); render(); };
  $('#dv-reset').onclick = () => { localStorage.removeItem(KEY); localStorage.removeItem('gratus.draft'); location.href = '/app.html?dev=1'; };
}

// ── boot ──
async function boot() {
  const [evo, names, prompts, copy] = await Promise.all(['evolutions', 'emoji-names', 'prompts', 'copy'].map((n) => fetch('/config/' + n + '.json?v=8').then((r) => r.json())));
  C = { evo, names, prompts, copy }; pool = Gr.questionPool(prompts); load();
  if ('serviceWorker' in navigator && !DEV) navigator.serviceWorker.register('/sw.js').catch(() => null);
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; const c = $('#install'); if (!c && $('#home').innerHTML) render(); });
  window.addEventListener('popstate', () => { if (closeLaws) closeLaws(true); if (location.pathname === '/app/laws') openLaws(true); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { pollGiven(); } });
  const m = /^\/gratus\/([A-Za-z0-9_-]+)/.exec(location.pathname);
  if (m) { render(); await arriveGift(m[1]); }
  else if (!S.held.length && !S.given.length && !S.lines.length) { render(); arrival(); }
  else { render(); if (location.pathname === '/app/give' && current()) { history.replaceState(null, '', '/app'); openGive(current()); } if (location.pathname === '/app/laws') openLaws(true); }
  pollGiven();
  if (DEV) devPanel();
}
boot().catch((e) => { console.error(e); const el = document.createElement('div'); el.className = 'noscript'; el.innerHTML = '<h2>Gratus could not open.</h2><p class="lead">' + esc(e && e.message || e) + '</p>'; document.body.appendChild(el); });
