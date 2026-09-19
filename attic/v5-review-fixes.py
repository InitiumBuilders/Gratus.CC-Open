import io, json, re
def load(p): return io.open(p, encoding='utf-8').read()
def save(p, s): io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
def rep(s, old, new, n=1):
    assert s.count(old) == n, ('count', s.count(old), old[:100])
    return s.replace(old, new)

# ── engine/models.js: FE0F-insensitive matching
s = load('engine/models.js')
s = rep(s, """// day → Set of emojis kept that day (entries carry `day` and `emojis`)
export function daySets(entries) {
  const byDay = {};
  for (const e of entries || []) { const s = byDay[e.day] || (byDay[e.day] = new Set()); for (const x of e.emojis || []) s.add(x); }
  return byDay;
}
// the days on which the whole formula was present, sorted
export function formulaDays(byDay, formula) {
  const out = [];
  for (const day in byDay) { const s = byDay[day]; if (formula.every((x) => s.has(x))) out.push(day); }
  return out.sort();
}""",
"""// an emoji with or without its presentation selector is the same emoji
export const key = (e) => String(e || '').replace(/\\uFE0F/g, '');
// day → Set of emoji keys kept that day (entries carry `day` and `emojis`)
export function daySets(entries) {
  const byDay = {};
  for (const e of entries || []) { const s = byDay[e.day] || (byDay[e.day] = new Set()); for (const x of e.emojis || []) s.add(key(x)); }
  return byDay;
}
// the days on which the whole formula was present, sorted
export function formulaDays(byDay, formula) {
  const out = [];
  for (const day in byDay) { const s = byDay[day]; if (formula.every((x) => s.has(key(x)))) out.push(day); }
  return out.sort();
}""")
s = rep(s, """    else if (days.length > 0 || m.formula.filter((x) => have.has(x)).length >= Math.max(1, m.formula.length - 1)) out.near.push(row);""",
           """    else if (days.length > 0 || m.formula.filter((x) => have.has(key(x))).length >= Math.max(1, m.formula.length - 1)) out.near.push(row);""")
save('engine/models.js', s)

# ── state.js: plantFor by key; entries carry seed and face; the body of an entry
s = load('assets/js/state.js')
s = rep(s, """  plantFor(emoji) { return this.data.plants.find((p) => p.emoji === emoji || this.face(p) === emoji); },""",
           """  plantFor(emoji) { const k = String(emoji || '').replace(/\\uFE0F/g, ''); return this.data.plants.find((p) => p.emoji.replace(/\\uFE0F/g, '') === k || this.face(p).replace(/\\uFE0F/g, '') === k); },
  // the emoji as written, in its presentation form when the names know it that way
  canon(emoji) { const n = this.cfg.names || {}; if (n[emoji]) return emoji; const v = emoji + '\\uFE0F'; return n[v] ? v : emoji; },
  // what an entry says, without the question it was answering
  body(e) { if (!e) return ''; if (e.question != null) return e.text || ''; const lines = (e.text || '').split('\\n').filter((l) => l.trim()); return lines.length > 1 ? lines.slice(1).join('\\n') : (lines[0] || ''); },""")
s = rep(s, """  entriesWithEmojis() { return this.data.entries.map((e) => Object.assign({}, e, { emojis: e.emojis && e.emojis.length ? e.emojis : e.plantIds.map((id) => (this.plant(id) || {}).emoji).filter(Boolean) })); },""",
           """  // every entry with the emojis it kept: each plant counts as its seed and as the face it wears now
  entriesWithEmojis() { return this.data.entries.map((e) => { const set = new Set(e.emojis || []); for (const id of e.plantIds || []) { const p = this.plant(id); if (p) { set.add(p.emoji); set.add(this.face(p)); } } return Object.assign({}, e, { emojis: Array.from(set) }); }); },""")
save('assets/js/state.js', s)

# ── journal.js
s = load('assets/js/journal.js')
# hints and carried presets use the face the field shows
s = rep(s, """      const carried = (pre.plantIds || []).map((id) => (S.plant(id) || {}).emoji).filter(Boolean).concat(pre.seeds || [], pre.newEmoji ? [pre.newEmoji] : []);""",
           """      const carried = (pre.plantIds || []).map((id) => S.plant(id) ? S.face(S.plant(id)) : null).filter(Boolean).concat(pre.seeds || [], pre.newEmoji ? [pre.newEmoji] : []);""")
s = rep(s, """      let text = editing ? editing.text : (draft && draft.day === t && !pre.recipeKey ? draft.text : '');""",
           """      let text = editing ? S.body(editing) : (draft && draft.day === t && !pre.recipeKey ? draft.text : '');""")
s = rep(s, """    const plants = S.plantsByCare(); const hints = plants.slice(0, 3).map((p) => p.emoji).concat(c.lineage.starters.filter((e) => !S.plantFor(e))).slice(0, 5);""",
           """    const plants = S.plantsByCare(); const hints = plants.slice(0, 3).map((p) => S.face(p)).concat(c.lineage.starters.filter((e) => !S.plantFor(e))).slice(0, 5);""")
# the sections below the line show only what exists; the hold carries his statement
s = rep(s, """      '<section class="sec"><h2>Days</h2><div class="band">' + days30.map((x) => '<i class="' + (x.lit ? 'lit' : '') + '" style="--h:' + x.hue + '" title="' + esc(fmtDay(x.d)) + '"></i>').join('') + '</div><p class="cap">Thirty days, lit by how they felt. ' + S.gardenDays() + ' written in all.</p><div class="links"><button id="cal">' + (this.showCalendar ? 'Close the calendar' : 'Open the calendar') + '</button><button id="search-open">Search</button></div><div id="calendar"></div></section>' +
      '<section class="sec"><h2>Patterns</h2>' + (ins.length ? '<div>' + ins.map((i) => '<div class="insight"><span class="emoji">' + esc(i.emoji || '◆') + '</span><p>' + esc(i.text) + '</p></div>').join('') + '</div>' : '<p class="body">' + esc(P.journal.empty.patterns) + '</p>') + '</section>' +
      '<section class="sec"><h2>Letters</h2><p class="body">' + esc(P.journal.empty.letters) + '</p><div class="links"><button data-new="future">To future me</button><button data-new="letter">A letter I may never send</button><button data-new="thanksletter">A thank-you to give</button></div>' + this.lettersList() + '</section>' +
      '<section class="sec"><h2>' + esc(c.copy.locked.presence) + '</h2><p class="body">Press and hold. A clock starts. Nothing else happens.</p><div class="hold-wrap"><button class="orb xl hold" id="ground-hold" aria-label="Touch the ground: press and hold">' + MARK + '<span class="ring" aria-hidden="true"></span></button><span class="label">press and hold</span></div></section>';""",
           """      (S.gardenDays() ? '<section class="sec"><h2>Days</h2><div class="band">' + days30.map((x) => '<i class="' + (x.lit ? 'lit' : '') + '" style="--h:' + x.hue + '" title="' + esc(fmtDay(x.d)) + '"></i>').join('') + '</div><p class="cap">Thirty days, lit by how they felt. ' + S.gardenDays() + ' written in all.</p><div class="links"><button id="cal">' + (this.showCalendar ? 'Close the calendar' : 'Open the calendar') + '</button><button id="search-open">Search</button></div><div id="calendar"></div></section>' : '') +
      (ins.length ? '<section class="sec"><h2>Patterns</h2><div>' + ins.map((i) => '<div class="insight"><span class="emoji">' + esc(i.emoji || '◆') + '</span><p>' + esc(i.text) + '</p></div>').join('') + '</div></section>' : '') +
      '<section class="sec"><h2>Letters</h2><div class="links"><button data-new="future">To future me</button><button data-new="letter">A letter I may never send</button><button data-new="thanksletter">A thank-you to give</button></div>' + this.lettersList() + '</section>' +
      '<section class="sec"><h2>' + esc(c.copy.locked.presence) + '</h2><p class="statement">' + esc(P.statements.ground) + '</p><div class="hold-wrap"><button class="orb xl hold" id="ground-hold" aria-label="Touch the ground: press and hold">' + MARK + '<span class="ring" aria-hidden="true"></span></button><span class="label">press and hold</span></div></section>';""")
s = rep(s, """    $('#cal', el).addEventListener('click', () => { this.showCalendar = !this.showCalendar; this.renderHome(el); const cal = $('#calendar', el); if (cal && this.showCalendar) cal.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
    if (this.showCalendar) this.renderDays($('#calendar', el));
    $('#search-open', el).addEventListener('click', () => this.searchSheet());""",
           """    const cal = $('#cal', el); if (cal) cal.addEventListener('click', () => { this.showCalendar = !this.showCalendar; this.renderHome(el); const c2 = $('#calendar', el); if (c2 && this.showCalendar) c2.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
    if (this.showCalendar && $('#calendar', el)) this.renderDays($('#calendar', el));
    const so = $('#search-open', el); if (so) so.addEventListener('click', () => this.searchSheet());""")
# Keep: canonical emojis; editing re-plants; the question is its own field
s = rep(s, """      const found = Array.from(new Set(emojisIn(text))); const chips = [], newEmojis = [];
      for (const e of found) { const p = S.plantFor(e); if (p) { if (!chips.includes(p.id)) chips.push(p.id); } else newEmojis.push(e); }
      let photoId = st.photoId; if (st.photo) { photoId = newId('ph'); const ok = await Photos.put(photoId, st.photo); if (!ok) { photoId = null; toast('The photo could not be kept; the words were'); } }
      if (editing) { editing.text = text; editing.feeling = st.feeling; editing.photoId = photoId; editing.editedAt = S.now().toISOString(); editing.words = Guide.wordCount(text); S.save(); this.preset = null; this.st = null; toast('Kept'); this.renderHome(el); if (this.cb.refreshAll) this.cb.refreshAll(); return; }
      if (text) text = question + '\\n' + text;
      try { localStorage.removeItem('gratus.draft'); } catch (e) {}""",
           """      const found = Array.from(new Set(emojisIn(text).map((e) => S.canon(e)))); const chips = [], newEmojis = [];
      for (const e of found) { const p = S.plantFor(e); if (p) { if (!chips.includes(p.id)) chips.push(p.id); } else newEmojis.push(e); }
      let photoId = st.photoId; if (st.photo) { photoId = newId('ph'); const ok = await Photos.put(photoId, st.photo); if (!ok) { photoId = null; toast('The photo could not be kept; the words were'); } }
      if (editing) {
        editing.text = text; if (editing.question == null) editing.question = question; editing.feeling = st.feeling; editing.photoId = photoId; editing.editedAt = S.now().toISOString(); editing.words = Guide.wordCount(text);
        // emojis written into an edited line grow from that day; emojis removed keep their days
        for (const e of newEmojis) { const p = S.addPlant(e, 'planted'); chips.push(p.id); }
        for (const id of chips) if (!editing.plantIds.includes(id)) { const r = S.tendPlantOn(id, editing.day, editing.feeling, editing.id); if (r) { editing.plantIds.push(id); editing.emojis = (editing.emojis || []).concat([r.after.emoji]); } }
        S.save(); this.preset = null; this.st = null; toast('Kept'); this.renderHome(el); if (this.cb.refreshAll) this.cb.refreshAll(); return; }
      try { localStorage.removeItem('gratus.draft'); } catch (e) {}""")
s = rep(s, """      this.plantEntry({ text, feeling: st.feeling, chips, newEmojis, recipeKey: r ? r.key : null, first, photoId, day, grace: { reflection: grace.reflection, question: grace.question, mind: false } });""",
           """      this.plantEntry({ text, question, feeling: st.feeling, chips, newEmojis, recipeKey: r ? r.key : null, first, photoId, day, grace: { reflection: grace.reflection, question: grace.question, mind: false } });""")
# entryCard, lettersList, data-give, readEntry use the body
s = rep(s, """    const lines = (e.text || '').split('\\n').filter((l) => l.trim()); const body = lines.length > 1 ? lines.slice(1).join('\\n') : lines[0] || '';
    const faces = plants.map((p) => S.face(p)).filter((f) => !body.includes(f));""",
           """    const body = S.body(e);
    const faces = plants.map((p) => S.face(p)).filter((f) => !body.includes(f));""")
s = rep(s, """<span class="cap">' + esc((e.text || '').split('\\n').slice(1).join(' ').slice(0, 70)) + '</span>""",
           """<span class="cap">' + esc(S.body(e).replace(/\\n/g, ' ').slice(0, 70)) + '</span>""")
s = rep(s, """    $$('[data-give]', el).forEach((b) => b.addEventListener('click', () => { const e = S.data.entries.find((x) => x.id === b.dataset.give); const to = (/to:\\s*(.+)/.exec(e.text) || [])[1] || ''; if (this.cb.Gifts) this.cb.Gifts.compose({ kind: 'note', note: e.text.split('\\n').slice(1).join('\\n'), to: to.replace(/^@/, '') }); }));""",
           """    $$('[data-give]', el).forEach((b) => b.addEventListener('click', () => { const e = S.data.entries.find((x) => x.id === b.dataset.give); const to = (/to:\\s*(.+)/.exec(e.text) || [])[1] || ''; if (this.cb.Gifts) this.cb.Gifts.compose({ kind: 'note', note: S.body(e), to: to.replace(/^@/, '') }); }));""")
s = rep(s, """<div id="rd-photo"></div><p class="lead" style="white-space:pre-wrap">' + esc(e.text) + '</p>' +""",
           """<div id="rd-photo"></div>' + (e.question ? '<p class="cap">' + esc(e.question) + '</p>' : '') + '<p class="lead" style="white-space:pre-wrap">' + esc(S.body(e)) + '</p>' +""")
s = rep(s, """    $('#rd-gift', sh.el).addEventListener('click', () => { sh.close(); if (this.cb.Gifts) this.cb.Gifts.compose({ kind: 'note', note: e.text }); });""",
           """    $('#rd-gift', sh.el).addEventListener('click', () => { sh.close(); if (this.cb.Gifts) this.cb.Gifts.compose({ kind: 'note', note: S.body(e) }); });""")
# search over the body
s = rep(s, """const res = Pat.search(S.entriesWithEmojis(), inp.value);""",
           """const res = Pat.search(S.entriesWithEmojis().map((x) => Object.assign({}, x, { text: S.body(x) })), inp.value).map((x) => S.data.entries.find((y) => y.id === x.id) || x);""")
# plantEntry: question field, seed and face recorded, the result marks whether it was given
s = rep(s, """    const entry = { id: newId('e'), day, text: e.text, feeling: e.feeling || null, plantIds: [], emojis: [], recipeKey: e.recipeKey || null, words: Guide.wordCount(e.text), createdAt: S.now().toISOString(), hour: S.hour(), minute: S.now().getMinutes(), photoId: e.photoId || null, grace: e.grace || null };""",
           """    const entry = { id: newId('e'), day, text: e.text, question: e.question || null, feeling: e.feeling || null, plantIds: [], emojis: [], recipeKey: e.recipeKey || null, words: Guide.wordCount(e.text), createdAt: S.now().toISOString(), hour: S.hour(), minute: S.now().getMinutes(), photoId: e.photoId || null, grace: e.grace || null };""")
s = rep(s, """if (r) { entry.plantIds.push(id); entry.emojis.push(r.after.emoji); r.crossed.forEach""",
           """if (r) { entry.plantIds.push(id); entry.emojis.push(r.after.emoji); const face = S.face(r.after); if (face !== r.after.emoji) entry.emojis.push(face); r.crossed.forEach""")
s = rep(s, """    for (const m of made) { S.data.models[m.id] = { at: day }; if (m.result && !S.plantFor(m.result)) { const p = S.addPlant(m.result, 'model'); S.tendPlantOn(p.id, day, entry.feeling, null); } }""",
           """    for (const m of made) { S.data.models[m.id] = { at: day }; m.gave = false; if (m.result && !S.plantFor(m.result)) { const p = S.addPlant(m.result, 'model'); S.tendPlantOn(p.id, day, entry.feeling, null); m.gave = true; } }""")
save('assets/js/journal.js', s)

# ── grow.js
s = load('assets/js/grow.js')
s = rep(s, """  row(m, kind, cats) {
    const f = kind === 'far' ? m.formula.map(() => '·').join('<span>+</span>') : m.formula.map(esc).join('');
    const res = kind === 'made' ? '<span class="res">→ ' + esc(m.result || '') + '</span>' : '<span class="res dim">→ ?</span>';
    const line = kind === 'made' ? esc(m.statement) : kind === 'near' ? (m.days ? m.days + ' of ' + m.need + ' days together' : 'one emoji short') : '';
    return '<button class="model panel ' + kind + '" data-m="' + esc(m.id) + '"><span class="f' + (kind === 'far' ? ' hidden-f' : '') + '">' + f + res + '</span><span class="name">' + esc(m.name) + '</span><span class="cat label">' + esc(cats[m.cat].name) + '</span>' + (line ? '<span class="line">' + line + '</span>' : '') + '</button>';
  },""",
           """  row(m, kind, cats, noCat) {
    const f = kind === 'far' ? m.formula.map(() => '·').join('<span>+</span>') : m.formula.map(esc).join('');
    const res = kind === 'made' ? '<span class="res">→ ' + esc(m.result || '') + '</span>' : '<span class="res dim">→ ?</span>';
    const line = kind === 'made' ? esc(m.statement) : kind === 'near' ? (m.days ? m.days + ' of ' + m.need + ' days together' : 'one emoji short') : '';
    return '<button class="model panel ' + kind + '" data-m="' + esc(m.id) + '"><span class="f' + (kind === 'far' ? ' hidden-f' : '') + '">' + f + res + '</span><span class="name">' + esc(m.name) + '</span>' + (noCat ? '' : '<span class="cat label">' + esc(cats[m.cat].name) + '</span>') + (line ? '<span class="line">' + line + '</span>' : '') + '</button>';
  },""")
s = rep(s, """      '<div class="links"><button id="all-models">All ' + st.total + ' models</button></div>' +
      '<p class="cap">' + st.made.length + ' of ' + st.total + ' made. Every formula is public. The days are yours.</p></section>';""",
           """      '<div class="links"><button id="all-models">All models</button></div>' +
      '<p class="cap">Every formula is open. The days are yours.</p></section>';""")
s = rep(s, """    const html = '<h2>' + st.total + ' models</h2><p class="body">Every formula is public. The result of each is kept until you make it.</p>' + Mo.CATEGORIES.map((k) => '<div class="fam"><h3>' + esc(cats[k].name) + '</h3><p class="cap">' + esc(cats[k].line) + '</p><div class="models">' + c.models.models.filter((m) => m.cat === k).map((m) => { const kd = kind(m); const r = st[kd].find((x) => x.id === m.id) || m; return this.row(r, kd === 'far' ? 'listed' : kd, cats); }).join('') + '</div></div>').join('');""",
           """    const html = '<h2>' + st.total + ' models</h2><p class="body">Every formula is open. Each result shows once you make it.</p>' + Mo.CATEGORIES.map((k) => '<div class="fam"><h3>' + esc(cats[k].name) + '</h3><p class="cap">' + esc(cats[k].line) + '</p><div class="models">' + c.models.models.filter((m) => m.cat === k).map((m) => { const kd = kind(m); const r = st[kd].find((x) => x.id === m.id) || m; return this.row(r, kd === 'far' ? 'listed' : kd, cats, true); }).join('') + '</div></div>').join('');""")
s = rep(s, """ It gave you ' + esc(m.result) + '.'""", """ It gives back ' + esc(m.result) + '.'""")
s = rep(s, """    x.fillStyle = '#E8C46B'; x.fillRect(W / 2 - 24, H * .84, 48, 2);
    x.fillStyle = '#9382FF'; x.font = '500 30px Inter, system-ui, sans-serif'; x.fillText('gratus.cc', W / 2, H * .89);""",
           """    x.fillStyle = '#E8C46B'; x.fillRect(W / 2 - 24, H * .83, 48, 2);
    x.fillStyle = '#ECE7FF'; x.font = '500 34px Sora, Inter, system-ui, sans-serif'; x.fillText('Gratus means honor.', W / 2, H * .875);
    x.fillStyle = '#9382FF'; x.font = '500 30px Inter, system-ui, sans-serif'; x.fillText('gratus.cc', W / 2, H * .915);""")
s = rep(s, """    sheet('<div class="hero"><img src="' + url + '" alt="' + esc(m.name) + '" style="width:min(100%,360px);border-radius:16px"><p class="cap">Press and hold the card to save it, or copy the words.</p></div><div class="actions"><button class="btn" id="sh-copy">Copy the statement</button></div>').el.querySelector('#sh-copy').addEventListener('click', async () => { const r = await shareOrCopy(m.name, m.formula.join(' + ') + ' → ' + m.result + '  ' + m.name + ': ' + m.statement, 'https://www.gratus.cc'); toast(r === 'copied' ? 'Copied' : r === 'shared' ? 'Shared' : 'Could not share'); });""",
           """    sheet('<div class="hero"><img src="' + url + '" alt="' + esc(m.name) + '" style="width:min(100%,360px);border-radius:16px"><p class="cap">Save the card, or copy the words.</p></div><div class="actions"><button class="btn" id="sh-copy">Copy the words</button></div>').el.querySelector('#sh-copy').addEventListener('click', async () => { const r = await shareOrCopy(m.name, m.formula.join(' + ') + ' → ' + m.result + '\\n' + m.name + ': ' + m.statement + '\\nhttps://www.gratus.cc'); toast(r === 'copied' ? 'Copied' : r === 'shared' ? 'Shared' : 'Could not share'); });""")
save('assets/js/grow.js', s)

# ── app.js
s = load('assets/js/app.js')
# the laws answer Back
s = rep(s, """  if (tab === 'laws') { go('give', { silent }); openLaws(); return; }""",
           """  if (tab === 'laws') { go('give', { silent }); openLaws(true); return; }
  const lw = $('#laws'); if (lw && !lw.hidden && closeLaws) closeLaws(true);""")
s = rep(s, """function openLaws() {
  const root = $('#laws'); if (!root) return; const c = S.cfg; const col = c.copy.locked.colophon;""",
           """let closeLaws = null;
function openLaws(routed) {
  const root = $('#laws'); if (!root || !root.hidden) return; const c = S.cfg; const col = c.copy.locked.colophon;
  if (!routed) history.pushState(null, '', '/app/laws');""")
s = rep(s, """  const close = () => { root.hidden = true; root.innerHTML = ''; document.body.classList.remove('laws-open'); if (io) io.disconnect(); if (location.pathname === '/app/laws') history.replaceState(null, '', '/app/give'); };
  $('#laws-x', root).addEventListener('click', close);
  $('#laws-done', root).addEventListener('click', () => { close(); go('ground'); Journal.openEditor({}); });""",
           """  const close = (byRoute) => { if (root.hidden) return; root.hidden = true; root.innerHTML = ''; document.body.classList.remove('laws-open'); if (io) io.disconnect(); closeLaws = null; if (!byRoute && location.pathname === '/app/laws') history.back(); };
  closeLaws = close;
  $('#laws-x', root).addEventListener('click', () => close());
  $('#laws-done', root).addEventListener('click', () => { close(true); go('ground'); Journal.openEditor({}); });""")
# sound and haptics stay quiet; motion follows the system
s = rep(s, """  Sound.on = !!S.data.user.soundOn; Sound.haptics = !!S.data.user.hapticsOn;
  document.documentElement.classList.toggle('rm', S.data.user.reducedMotion === 'on');""",
           """  Sound.on = false; Sound.haptics = false;
  document.documentElement.classList.remove('rm');""")
# Give: one laws link, one code control, the friends input needs a handle
s = rep(s, """    '<div class="links in" style="--i:3;justify-content:center"><button id="gv-laws">The twelve laws</button></div></section>';""",
           """    '</section>';""")
s = rep(s, """<p class="body">A shared plot for two or more. An emoji becomes Common Ground when both plant it and both accept it.</p>""",
           """<p class="body">A shared field for two or more. An emoji becomes Common Ground when both keep it and both accept it.</p>""")
s = rep(s, """'<p class="body">Add a friend by handle, by QR, or through a gift.</p>') + '<div class="two"><input class="field" id="gv-handle" placeholder="Kris.Dash" autocapitalize="none"><button class="btn" id="gv-add">Add</button></div><div class="links"><button id="gv-scan">Scan a code</button><button id="gv-myqr">My code</button></div></section>';""",
           """'<p class="body">Add a friend by handle, by QR, or through a gift.</p>') + (u.handle ? '<div class="two"><input class="field" id="gv-handle" placeholder="Kris.Dash" autocapitalize="none"><button class="btn" id="gv-add">Add</button></div>' : '<p class="cap">A handle lets friends find you.</p>') + '<div class="links"><button id="gv-scan">Scan a code</button><button id="gv-myqr">My code</button></div></section>';""")
s = rep(s, """    '<div class="row-item"><span class="grow"><strong>Your code</strong><span class="cap">a glyph grown from your garden' + (u.handle ? ', and a QR' : '') + '</span></span><button class="chip" id="st-glyph">Show</button></div>' +\n""", "")
s = rep(s, """  $('#gv-laws', root).addEventListener('click', openLaws); $('#col-laws', root).addEventListener('click', openLaws); $('#gv-store', root).addEventListener('click', openStore);""",
           """  $('#col-laws', root).addEventListener('click', () => openLaws()); $('#gv-store', root).addEventListener('click', openStore);""")
s = rep(s, """  $('#gv-add', root).addEventListener('click', async () => { const hnd""",
           """  const ga = $('#gv-add', root); if (ga) ga.addEventListener('click', async () => { const hnd""")
s = rep(s, """toast(r.error === 'unknown' ? 'No garden by that handle' : 'Could not send'); });""",
           """toast(r.error === 'unknown' ? 'No one by that handle' : 'Could not send'); });""")
s = rep(s, """  $('#st-glyph', root).addEventListener('click', glyphSheet);\n""", "")
# ceremony: say what actually happened
s = rep(s, """(m.result ? '<span class="label">' + esc(m.result) + ' is in your field now</span>' : '')""",
           """(m.result ? '<span class="label">' + esc(m.result) + (m.gave ? ' is in your field now' : ' was already in your field') + '</span>' : '')""")
# the emoji sheet: given by, hidden results stay hidden, no duplicates
s = rep(s, """  return 'Planted ' + fmtDay(p.plantedAt) + '. ' + d + ' day' + (d === 1 ? '' : 's') + (fam ? ', mostly ' + fam : '') + '.' + (first ? ' First words: “' + first.slice(0, 90) + '”' : '');""",
           """  const giver = p.origin === 'model' ? (c.models.models || []).find((m) => m.result === p.emoji) : null;
  return (giver ? 'Given by ' + giver.name + ' ' : 'Kept since ') + fmtDay(p.plantedAt) + '. ' + d + ' day' + (d === 1 ? '' : 's') + (fam ? ', mostly ' + fam : '') + '.' + (first ? ' First words: “' + first.slice(0, 90) + '”' : '');""")
s = rep(s, """  const e = S.data.entries.find((x) => x.plantIds.includes(p.id)); const first = e ? (e.text.split('\\n').filter((l) => l.trim())[1] || e.text.split('\\n')[0]) : '';""",
           """  const e = S.data.entries.find((x) => x.plantIds.includes(p.id)); const first = e ? S.body(e).split('\\n')[0] : '';""")
s = rep(s, """  const models = Mo.modelsFor(p.emoji, c.models).concat(face !== p.emoji ? Mo.modelsFor(face, c.models) : []); const st = Grow.state();""",
           """  const st = Grow.state(); const isMade = (m) => st.made.some((x) => x.id === m.id);
  const seen = new Set(); const models = Mo.modelsFor(p.emoji, c.models).concat(face !== p.emoji ? Mo.modelsFor(face, c.models) : []).filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return m.formula.includes(p.emoji) || m.formula.includes(face) || isMade(m); });""")
s = rep(s, """    (models.length ? '<div><span class="label">in these models</span><div class="rows">' + models.slice(0, 5).map((m) => { const made = st.made.some((x) => x.id === m.id); return""",
           """    (models.length ? '<div><span class="label">in these models</span><div class="rows">' + models.slice(0, 5).map((m) => { const made = isMade(m); return""")
s = rep(s, """<span class="grow"><strong>' + esc(m.name) + '</strong><span class="cap">' + (made ? 'made' : esc(m.statement)) + '</span></span></button>'; }).join('') + '</div></div>' : '') +""",
           """<span class="grow"><strong>' + esc(m.name) + '</strong><span class="cap">' + (made ? (m.result === p.emoji || m.result === face ? 'made · it gave you this one' : 'made') : esc(m.statement)) + '</span></span></button>'; }).join('') + '</div></div>' : '') +""")
# friends sheet copy
s = rep(s, """else el.innerHTML = '<p class="cap">' + (r.ok ? 'A private garden.' : 'Could not reach their garden.') + '</p>'; });""",
           """else el.innerHTML = '<p class="cap">' + (r.ok ? 'Their emojis are private.' : 'Could not reach them.') + '</p>'; });""")
s = rep(s, """toast('A shared plot with @' + handle);""", """toast('A shared field with @' + handle);""")
s = rep(s, """el.innerHTML = '<h2>The garden could not open.</h2>""", """el.innerHTML = '<h2>Gratus could not open.</h2>""")
save('assets/js/app.js', s)

# ── app.html: no saved motion pref before boot; the noscript line
h = load('app.html')
h = rep(h, """<script>
  try { var d = JSON.parse(localStorage.getItem('gratus.v1') || 'null'); if (d && d.user && d.user.reducedMotion === 'on') document.documentElement.classList.add('rm'); } catch (e) {}
</script>
""", "")
h = rep(h, """<p class="lead">The garden grows with JavaScript. The public site at <a href="/">gratus.cc</a> reads without it.</p>""",
           """<p class="lead">Gratus needs JavaScript. The public site at <a href="/">gratus.cc</a> reads without it.</p>""")
save('app.html', h)

# ── models.json: statements and results
raw = load('config/models.json')
edits = {
  '"A tenth, planted, becomes a tree you can lean on."': '"A tenth, set aside, becomes what you lean on."',
  '"Plant the same thing, both accept it. That is a team."': '"Keep the same thing, both accept it. That is a team."',
  '"Fuel, then effort, then rest. In that order."': '"Fuel, then effort, then rest."',
  '"Draw it before you build it. Twice as fast."': '"Draw it before you build it."',
  '"Price it plainly. Plain prices sell."': '"Price it plainly."',
  '"Done and shared beats perfect and hidden."': '"Share it before it is perfect."',
  '"Ten conversations beat one plan."': '"Ask ten people before you plan."',
  '"One shared line beats ten private plans."': '"Put the plan in one line everyone sees."',
  '"formula": ["🧭", "🔁"], "result": "🔄"': '"formula": ["🧭", "🔁"], "result": "🎯"',
  '"formula": ["🛠️", "🚀"], "result": "🌍"': '"formula": ["🛠️", "🚀"], "result": "📦"',
  '"formula": ["🤝", "🌱"], "result": "🌏"': '"formula": ["🤝", "🌱"], "result": "🌾"',
}
for a, b in edits.items(): raw = rep(raw, a, b)
save('config/models.json', raw)
names = json.loads(load('config/emoji-names.json'))
for e, n in {'🎯': 'Direct Hit', '📦': 'Package', '🌾': 'Sheaf Of Rice'}.items():
    if e not in names: names[e] = n
save('config/emoji-names.json', json.dumps(names, ensure_ascii=False, indent=2) + '\n')

# ── tests: the evolved face counts; a bare emoji counts
t = load('scripts/tests/models.test.mjs')
t += """test('a formula matches the face a plant wears now, and an emoji without its presentation selector', () => {
  const entries = [E('2026-09-01', ['🤝', '👥', '📝']), E('2026-09-02', ['🤝', '👥', '📝']), E('2026-09-03', ['🤝', '👥', '📝'])];
  const ids = Mo.modelState(entries, cfg, {}).made.map((m) => m.id);
  assert.ok(ids.includes('same-page'), 'Same Page made through the evolved face 👥');
  const bare = [E('2026-09-01', ['\\u2764', '🌱']), E('2026-09-02', ['\\u2764', '🌱']), E('2026-09-03', ['\\u2764\\uFE0F', '🌱'])];
  assert.ok(Mo.modelState(bare, cfg, {}).made.some((m) => m.id === 'tend-the-person'), 'a bare heart and a heart with FE0F are one heart');
});
"""
save('scripts/tests/models.test.mjs', t)
print('review fixes applied')
